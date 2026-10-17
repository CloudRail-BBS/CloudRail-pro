import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')
let moduleSequence = 0

const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`

function stripUniConditionals(source) {
  const activeParents = []
  let active = true
  const lines = []

  for (const line of source.split(/\r?\n/)) {
    const start = line.match(/^\s*\/\/ #(ifdef|ifndef) ([^\s]+)/)
    if (start) {
      activeParents.push(active)
      active = active && start[2] === 'VUE3'
      continue
    }
    if (/^\s*\/\/ #endif\b/.test(line)) {
      active = activeParents.pop() ?? active
      continue
    }
    if (active) lines.push(line)
  }

  return lines.join('\n')
}

async function loadThemeModule() {
  const [source, coreSource] = await Promise.all([
    readRepoFile('common/theme.js'),
    readRepoFile('common/themeCore.js')
  ])
  const vueSource = `
    export const reactive = (value) => value
    export const computed = (getter) => Object.defineProperty({}, 'value', { get: getter })
  `
  const themeSource = source
    .replace("from 'vue'", `from '${dataUrl(vueSource)}'`)
    .replace("from './themeCore.js'", `from '${dataUrl(coreSource)}'`)

  const controllerExport = themeSource.includes('const controller = createThemeController')
    ? '\nexport { controller as __testController }'
    : ''
  return import(dataUrl(`${themeSource}${controllerExport}\n// instance ${moduleSequence++}`))
}

async function loadVue3Main() {
  const source = await readRepoFile('main.js')
  const blockStart = source.indexOf('// #ifdef VUE3')
  assert.notEqual(blockStart, -1)
  const vue3Source = source.slice(blockStart)
    .replace(/^\/\/ #ifdef VUE3\s*/m, '')
    .replace(/^\/\/ #endif\s*$/m, '')
    .replace("import { createSSRApp } from 'vue'", '')
    .replace("import { themeState, themeClass, themeTokens } from './common/theme.js'", '')
  const stubs = `
    const App = { name: 'TestApp' }
    const themeState = { mode: 'dark', effectiveTheme: 'dark' }
    const themeClass = { value: 'theme-dark' }
    const themeTokens = { value: { canvas: '#0a0a0a' } }
    const createSSRApp = (component) => ({
      component,
      mixins: [],
      mixin(value) { this.mixins.push(value) }
    })
  `

  return import(dataUrl(`${stubs}\n${vue3Source}\n// instance ${moduleSequence++}`))
}

async function loadAppHooks() {
  const source = await readRepoFile('App.vue')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script, 'App.vue must contain its application script')
  const executableScript = stripUniConditionals(script)
    .replace(/^import\s+(?:\{[\s\S]*?\}|[^\r\n]+?)\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace('export default {', 'globalThis.__themeTestApp = {')
  const stubs = `
    const initTheme = () => globalThis.__themeTestEvents.push('initTheme')
    const refreshSystemTheme = () => globalThis.__themeTestEvents.push('refreshSystemTheme')
    const ensureCustomBubbleCss = () => globalThis.__themeTestEvents.push('ensureCustomBubbleCss')
    const initCall = () => globalThis.__themeTestEvents.push('initCall')
    const isLoggedIn = () => false
  `
  await import(dataUrl(`${stubs}\n${executableScript}\n// instance ${moduleSequence++}`))
  return globalThis.__themeTestApp
}

async function withGlobals(values, callback) {
  const previous = new Map()
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    })
  }

  try {
    return await callback()
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

test('runtime module exports the application theme API', async () => {
  const theme = await loadThemeModule()

  assert.equal(typeof theme.initTheme, 'function')
  assert.equal(typeof theme.setThemeMode, 'function')
  assert.equal(typeof theme.refreshSystemTheme, 'function')
  assert.equal(typeof theme.themeClass.value, 'string')
  assert.equal(typeof theme.themeTokens.value, 'object')
})

test('Vue 3 app installs the theme state and computed values as a global mixin', async () => {
  const { createApp } = await loadVue3Main()
  const { app } = createApp()

  assert.equal(app.component.name, 'TestApp')
  assert.equal(app.mixins.length, 1)
  const computed = app.mixins[0].computed
  assert.equal(computed.themeState().mode, 'dark')
  assert.equal(computed.themeClass(), 'theme-dark')
  assert.equal(computed.themeTokens().canvas, '#0a0a0a')
})

test('App initializes the theme before startup UI work and refreshes it on foreground', async () => {
  const events = []
  const uniApi = {
    $off: () => events.push('removeUnreadListener'),
    $on: () => events.push('addUnreadListener')
  }

  await withGlobals({ __themeTestEvents: events, uni: uniApi }, async () => {
    const app = await loadAppHooks()
    const context = {
      hideNativeTabBar: () => events.push('hideNativeTabBar'),
      syncRuntimeConfig: (force) => events.push(`syncRuntimeConfig:${Boolean(force)}`),
      setupPushListener: () => events.push('setupPushListener')
    }

    app.onLaunch.call(context)
    assert.deepEqual(events.slice(0, 4), [
      'initTheme', 'hideNativeTabBar', 'ensureCustomBubbleCss', 'initCall'
    ])
    assert.deepEqual(events.slice(4), ['syncRuntimeConfig:true', 'setupPushListener'])

    events.length = 0
    app.onShow.call(context)
    assert.deepEqual(events, [
      'refreshSystemTheme', 'hideNativeTabBar', 'syncRuntimeConfig:false',
      'removeUnreadListener', 'addUnreadListener'
    ])
  })
})

test('App root binds the globally provided theme class', async () => {
  const source = await readRepoFile('App.vue')
  const rootNode = source.match(/<view\b[^>]*>/)?.[0]

  assert.ok(rootNode)
  assert.match(rootNode, /:class="themeClass"/)
})

test('runtime state follows saved preference, H5 media changes, and palette bindings', async () => {
  let currentSystemTheme = 'light'
  let mediaListener
  let removedListener
  const media = {
    get matches() { return currentSystemTheme === 'dark' },
    addEventListener(type, listener) {
      assert.equal(type, 'change')
      mediaListener = listener
    },
    removeEventListener(type, listener) {
      assert.equal(type, 'change')
      removedListener = listener
    }
  }
  const writes = []
  const navigationCalls = []
  const uniApi = {
    getSystemInfoSync: () => ({ uniPlatform: 'web' }),
    getStorageSync: (key) => key === 'cloudrail_theme_mode' ? 'dark' : undefined,
    setStorageSync: (key, value) => writes.push([key, value]),
    setNavigationBarColor: (options) => navigationCalls.push(options)
  }
  const browser = {
    matchMedia: (query) => {
      assert.equal(query, '(prefers-color-scheme: dark)')
      return media
    }
  }

  await withGlobals({ uni: uniApi, window: browser }, async () => {
    const theme = await loadThemeModule()
    navigationCalls.length = 0

    assert.deepEqual(theme.initTheme(), {
      mode: 'dark', systemTheme: 'light', effectiveTheme: 'dark'
    })
    assert.equal(theme.themeClass.value, 'theme-dark')
    assert.equal(theme.themeTokens.value.canvas, '#0a0a0a')
    assert.equal(typeof mediaListener, 'function')

    assert.deepEqual(theme.setThemeMode('system'), {
      mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
    })
    assert.deepEqual(writes, [['cloudrail_theme_mode', 'system']])
    assert.equal(theme.themeClass.value, 'theme-light')

    currentSystemTheme = 'dark'
    mediaListener({ matches: true })
    assert.deepEqual({ ...theme.themeState }, {
      mode: 'system', systemTheme: 'dark', effectiveTheme: 'dark'
    })
    assert.equal(theme.themeTokens.value.canvas, '#0a0a0a')
    const navigationCall = navigationCalls.at(-1)
    assert.equal(navigationCall.frontColor, '#ffffff')
    assert.equal(navigationCall.backgroundColor, '#111111')
    assert.deepEqual(navigationCall.animation, { duration: 0 })
    assert.equal(typeof navigationCall.fail, 'function')

    theme.__testController.destroy()
    assert.equal(removedListener, mediaListener)
  })
})

test('H5 uses legacy media query listeners when modern listener methods are absent', async () => {
  let listener
  let removedListener
  const media = {
    matches: false,
    addListener(callback) { listener = callback },
    removeListener(callback) { removedListener = callback }
  }
  const uniApi = {
    getSystemInfoSync: () => ({ uniPlatform: 'web' }),
    getStorageSync: () => 'system',
    setNavigationBarColor: () => {}
  }

  await withGlobals({ uni: uniApi, window: { matchMedia: () => media } }, async () => {
    const theme = await loadThemeModule()
    theme.initTheme()
    assert.equal(theme.themeClass.value, 'theme-light')

    media.matches = true
    listener({ matches: true })
    assert.equal(theme.themeClass.value, 'theme-dark')

    theme.__testController.destroy()
    assert.equal(removedListener, listener)
  })
})

test('App and WeChat theme events update state and unregister with the controller', async () => {
  for (const platform of ['app', 'mp-weixin']) {
    let themeListener
    let removedListener
    const systemInfo = { uniPlatform: platform, theme: 'light' }
    const uniApi = {
      getSystemInfoSync: () => systemInfo,
      getStorageSync: () => 'system',
      setNavigationBarColor: () => {},
      onThemeChange: (listener) => { themeListener = listener },
      offThemeChange: (listener) => { removedListener = listener }
    }

    await withGlobals({ uni: uniApi }, async () => {
      const theme = await loadThemeModule()
      theme.initTheme()
      assert.equal(theme.themeClass.value, 'theme-light')

      themeListener({ theme: 'dark' })
      assert.equal(theme.themeClass.value, 'theme-dark')
      assert.equal(theme.themeState.systemTheme, 'dark')

      theme.__testController.destroy()
      assert.equal(removedListener, themeListener)
    })
  }
})

test('AliPay, Baidu, and Toutiao refresh rereads system info without touching browser globals', async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    get() { throw new Error('browser globals must not be read on mini programs') }
  })
  try {
    for (const platform of ['mp-alipay', 'mp-baidu', 'mp-toutiao']) {
      let currentSystemTheme = 'dark'
      let reads = 0
      const uniApi = {
        getSystemInfoSync: () => {
          reads += 1
          return { uniPlatform: platform, theme: currentSystemTheme }
        },
        getStorageSync: () => 'system',
        setNavigationBarColor: () => {}
      }

      await withGlobals({ uni: uniApi }, async () => {
        const theme = await loadThemeModule()
        assert.deepEqual(theme.initTheme(), {
          mode: 'system', systemTheme: 'dark', effectiveTheme: 'dark'
        })
        const readsAfterInitialization = reads

        currentSystemTheme = 'light'
        assert.deepEqual(theme.refreshSystemTheme(), {
          mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
        })
        assert.equal(reads, readsAfterInitialization + 1)
      })
    }
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor)
    else delete globalThis.window
  }
})

test('missing platform APIs fall back to light and navigation failures stay non-blocking', async () => {
  await withGlobals({
    uni: {
      getStorageSync: () => 'system',
      setNavigationBarColor: () => { throw new Error('navigation styling unavailable') }
    }
  }, async () => {
    const theme = await loadThemeModule()

    assert.deepEqual(theme.initTheme(), {
      mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
    })
    assert.deepEqual(theme.refreshSystemTheme(), {
      mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
    })
    assert.deepEqual(theme.setThemeMode('dark'), {
      mode: 'dark', systemTheme: 'light', effectiveTheme: 'dark'
    })
  })
})
