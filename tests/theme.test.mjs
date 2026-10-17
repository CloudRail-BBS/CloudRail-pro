import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')

async function importSourceModule(path) {
  const source = await readRepoFile(path)
  const encoded = Buffer.from(source, 'utf8').toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}

test('theme modes normalize to system, light, or dark', async () => {
  const { normalizeThemeMode, normalizeSystemTheme, resolveEffectiveTheme } =
    await importSourceModule('common/themeCore.js')

  assert.equal(normalizeThemeMode(null), 'system')
  assert.equal(normalizeThemeMode('system'), 'system')
  assert.equal(normalizeThemeMode('light'), 'light')
  assert.equal(normalizeThemeMode('dark'), 'dark')
  assert.equal(normalizeThemeMode('sepia'), 'system')
  assert.equal(normalizeSystemTheme('dark'), 'dark')
  assert.equal(normalizeSystemTheme('sepia'), 'light')
  assert.equal(resolveEffectiveTheme('dark', 'light'), 'dark')
  assert.equal(resolveEffectiveTheme('light', 'dark'), 'light')
  assert.equal(resolveEffectiveTheme('system', 'dark'), 'dark')
  assert.equal(resolveEffectiveTheme('system', 'sepia'), 'light')
})

test('light and dark palettes expose the semantic colors used by pages', async () => {
  const { THEME_PALETTES } = await importSourceModule('common/themeCore.js')

  assert.deepEqual(THEME_PALETTES, {
    light: {
      canvas: '#fafafa', surface: '#ffffff', surfaceAlt: '#f2f2f2',
      selected: '#ebebeb', hover: '#f2f2f2', text: '#171717', textMuted: '#666666',
      border: '#e0e0e0', borderStrong: '#c9c9c9', navRgb: '255, 255, 255',
      action: '#000000', actionText: '#ffffff', danger: '#da2f35', success: '#297c3b'
    },
    dark: {
      canvas: '#0a0a0a', surface: '#111111', surfaceAlt: '#1a1a1a',
      selected: '#1f1f1f', hover: '#111111', text: '#ededed', textMuted: '#a1a1a1',
      border: '#2e2e2e', borderStrong: '#454545', navRgb: '17, 17, 17',
      action: '#ffffff', actionText: '#000000', danger: '#ff6166', success: '#62c073'
    }
  })
})

test('initialization reads the saved preference and is idempotent', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  let subscribeCalls = 0
  let systemListener
  const controller = createThemeController({
    readPreference: () => 'dark',
    writePreference: () => {},
    readSystemTheme: () => 'light',
    subscribeSystemTheme: (listener) => {
      subscribeCalls += 1
      systemListener = listener
      return () => { systemListener = undefined }
    }
  })

  assert.deepEqual(controller.initialize(), {
    mode: 'dark', systemTheme: 'light', effectiveTheme: 'dark'
  })
  assert.deepEqual(controller.initialize(), {
    mode: 'dark', systemTheme: 'light', effectiveTheme: 'dark'
  })
  assert.equal(subscribeCalls, 1)
  assert.equal(typeof systemListener, 'function')
})

test('invalid preferences and system values fall back to system and light', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  const controller = createThemeController({
    readPreference: () => 'sepia',
    writePreference: () => {},
    readSystemTheme: () => 'sepia',
    subscribeSystemTheme: () => () => {}
  })

  assert.deepEqual(controller.initialize(), {
    mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
  })
})

test('system events update the effective theme only when system mode is selected', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  let systemListener
  const controller = createThemeController({
    readPreference: () => 'system',
    writePreference: () => {},
    readSystemTheme: () => 'light',
    subscribeSystemTheme: (listener) => { systemListener = listener; return () => {} }
  })
  controller.initialize()

  assert.deepEqual(controller.getSnapshot(), {
    mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
  })
  systemListener('dark')
  assert.deepEqual(controller.getSnapshot(), {
    mode: 'system', systemTheme: 'dark', effectiveTheme: 'dark'
  })

  controller.setMode('light')
  systemListener('light')
  assert.deepEqual(controller.getSnapshot(), {
    mode: 'light', systemTheme: 'light', effectiveTheme: 'light'
  })
})

test('manual mode changes save the normalized preference and override system appearance', async () => {
  const { THEME_MODE_KEY, createThemeController } = await importSourceModule('common/themeCore.js')
  let systemListener
  const writes = []
  const controller = createThemeController({
    readPreference: () => 'system',
    writePreference: (value) => { writes.push(value) },
    readSystemTheme: () => 'dark',
    subscribeSystemTheme: (listener) => { systemListener = listener; return () => {} }
  })
  controller.initialize()

  assert.equal(THEME_MODE_KEY, 'cloudrail_theme_mode')
  assert.deepEqual(controller.setMode('light'), {
    mode: 'light', systemTheme: 'dark', effectiveTheme: 'light'
  })
  systemListener('dark')
  assert.deepEqual(controller.setMode('dark'), {
    mode: 'dark', systemTheme: 'dark', effectiveTheme: 'dark'
  })
  assert.deepEqual(controller.setMode('sepia'), {
    mode: 'system', systemTheme: 'dark', effectiveTheme: 'dark'
  })
  assert.deepEqual(writes, ['light', 'dark', 'system'])
})

test('subscriptions receive copied snapshots immediately and only after state changes', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  let systemListener
  const controller = createThemeController({
    readPreference: () => 'system',
    writePreference: () => {},
    readSystemTheme: () => 'light',
    subscribeSystemTheme: (listener) => { systemListener = listener; return () => {} }
  })
  controller.initialize()
  const observed = []
  const stop = controller.subscribe((snapshot) => observed.push(snapshot))

  assert.deepEqual(observed, [
    { mode: 'system', systemTheme: 'light', effectiveTheme: 'light' }
  ])
  assert.notEqual(observed[0], controller.getSnapshot())
  controller.setMode('system')
  systemListener('light')
  assert.equal(observed.length, 1)

  controller.setMode('dark')
  assert.deepEqual(observed.at(-1), {
    mode: 'dark', systemTheme: 'light', effectiveTheme: 'dark'
  })
  assert.equal(observed.length, 2)
  stop()
  controller.setMode('light')
  assert.equal(observed.length, 2)
})

test('refreshSystemTheme rereads system appearance without changing the preference', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  let currentSystemTheme = 'light'
  let savedPreference = 'system'
  const controller = createThemeController({
    readPreference: () => savedPreference,
    writePreference: (value) => { savedPreference = value },
    readSystemTheme: () => currentSystemTheme,
    subscribeSystemTheme: () => () => {}
  })
  controller.initialize()

  currentSystemTheme = 'dark'
  assert.deepEqual(controller.refreshSystemTheme(), {
    mode: 'system', systemTheme: 'dark', effectiveTheme: 'dark'
  })
  assert.equal(savedPreference, 'system')

  controller.setMode('light')
  currentSystemTheme = 'light'
  assert.deepEqual(controller.refreshSystemTheme(), {
    mode: 'light', systemTheme: 'light', effectiveTheme: 'light'
  })
  assert.equal(savedPreference, 'light')
})

test('storage and platform dependency failures do not interrupt switching', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  let failSystemRead = true
  let failWrite = false
  const controller = createThemeController({
    readPreference: () => { throw new Error('storage unavailable') },
    writePreference: () => {
      if (failWrite) throw new Error('storage unavailable')
    },
    readSystemTheme: () => {
      if (failSystemRead) throw new Error('platform unavailable')
      return 'dark'
    },
    subscribeSystemTheme: () => { throw new Error('platform unavailable') }
  })

  assert.deepEqual(controller.initialize(), {
    mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
  })
  failWrite = true
  assert.deepEqual(controller.setMode('dark'), {
    mode: 'dark', systemTheme: 'light', effectiveTheme: 'dark'
  })

  failSystemRead = false
  assert.deepEqual(controller.refreshSystemTheme(), {
    mode: 'dark', systemTheme: 'dark', effectiveTheme: 'dark'
  })
})

test('destroy unsubscribes safely and permits initialization again', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  let systemListener
  let unsubscribeCalls = 0
  const controller = createThemeController({
    readPreference: () => 'system',
    writePreference: () => {},
    readSystemTheme: () => 'light',
    subscribeSystemTheme: (listener) => {
      systemListener = listener
      return () => { unsubscribeCalls += 1 }
    }
  })
  controller.initialize()
  controller.destroy()
  controller.destroy()
  assert.equal(unsubscribeCalls, 1)

  assert.deepEqual(controller.initialize(), {
    mode: 'system', systemTheme: 'light', effectiveTheme: 'light'
  })
  systemListener('dark')
  assert.deepEqual(controller.getSnapshot(), {
    mode: 'system', systemTheme: 'dark', effectiveTheme: 'dark'
  })
})
