import { computed, reactive } from 'vue'
import { createThemeController, THEME_MODE_KEY, THEME_PALETTES } from './themeCore.js'

export const themeState = reactive({
  mode: 'system',
  systemTheme: 'light',
  effectiveTheme: 'light'
})

export const themeClass = computed(() => `theme-${themeState.effectiveTheme}`)
export const themeTokens = computed(() => THEME_PALETTES[themeState.effectiveTheme])

function getUniApi() {
  return typeof uni !== 'undefined' ? uni : null
}

function getSystemInfo() {
  const uniApi = getUniApi()
  if (!uniApi || typeof uniApi.getSystemInfoSync !== 'function') return null

  try {
    return uniApi.getSystemInfoSync() || null
  } catch {
    return null
  }
}

function getPlatform(systemInfo = getSystemInfo()) {
  return String((systemInfo && systemInfo.uniPlatform) || '').toLowerCase()
}

function readH5SystemTheme() {
  try {
    const browserWindow = typeof window !== 'undefined' ? window : null
    if (!browserWindow || typeof browserWindow.matchMedia !== 'function') return 'light'
    const mediaQuery = browserWindow.matchMedia('(prefers-color-scheme: dark)')
    return mediaQuery && mediaQuery.matches === true ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function readSystemTheme() {
  const systemInfo = getSystemInfo()
  const platform = getPlatform(systemInfo)

  if (platform === 'web' || platform === 'h5') return readH5SystemTheme()
  if (platform === 'app' || platform === 'mp-weixin' || platform === 'mp-alipay' ||
      platform === 'mp-baidu' || platform === 'mp-toutiao') {
    return systemInfo && systemInfo.theme === 'dark' ? 'dark' : 'light'
  }

  return 'light'
}

function subscribeH5SystemTheme(listener) {
  try {
    const browserWindow = typeof window !== 'undefined' ? window : null
    if (!browserWindow || typeof browserWindow.matchMedia !== 'function') return undefined

    const mediaQuery = browserWindow.matchMedia('(prefers-color-scheme: dark)')
    if (!mediaQuery) return undefined
    const handleChange = (event) => {
      const matches = event && typeof event.matches === 'boolean'
        ? event.matches
        : mediaQuery.matches === true
      listener(matches ? 'dark' : 'light')
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handleChange)
        }
      }
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange)
      return () => {
        if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(handleChange)
        }
      }
    }
  } catch {
    return undefined
  }

  return undefined
}

function subscribeSystemTheme(listener) {
  const platform = getPlatform()
  if (platform === 'web' || platform === 'h5') {
    return subscribeH5SystemTheme(listener)
  }

  if (platform !== 'app' && platform !== 'mp-weixin') return undefined

  const uniApi = getUniApi()
  if (!uniApi || typeof uniApi.onThemeChange !== 'function') return undefined

  const handleChange = (event) => listener(event && event.theme)
  uniApi.onThemeChange(handleChange)
  return () => {
    if (typeof uniApi.offThemeChange === 'function') {
      uniApi.offThemeChange(handleChange)
    }
  }
}

function readPreference() {
  const uniApi = getUniApi()
  if (!uniApi || typeof uniApi.getStorageSync !== 'function') return null
  return uniApi.getStorageSync(THEME_MODE_KEY)
}

function writePreference(mode) {
  const uniApi = getUniApi()
  if (uniApi && typeof uniApi.setStorageSync === 'function') {
    uniApi.setStorageSync(THEME_MODE_KEY, mode)
  }
}

function syncNavigationBar(snapshot) {
  const uniApi = getUniApi()
  if (!uniApi || typeof uniApi.setNavigationBarColor !== 'function') return

  const palette = THEME_PALETTES[snapshot.effectiveTheme]
  try {
    uniApi.setNavigationBarColor({
      frontColor: snapshot.effectiveTheme === 'dark' ? '#ffffff' : '#000000',
      backgroundColor: palette.surface,
      animation: { duration: 0 },
      fail: () => {}
    })
  } catch {
    // Native navigation styling is best-effort; page styling follows themeClass.
  }
}

const controller = createThemeController({
  readPreference,
  writePreference,
  readSystemTheme,
  subscribeSystemTheme
})

controller.subscribe((snapshot) => {
  Object.assign(themeState, snapshot)
  syncNavigationBar(snapshot)
})

export function initTheme() {
  return controller.initialize()
}

export function setThemeMode(mode) {
  controller.initialize()
  return controller.setMode(mode)
}

export function refreshSystemTheme() {
  controller.initialize()
  return controller.refreshSystemTheme()
}
