export const THEME_MODE_KEY = 'cloudrail_theme_mode'

export const THEME_PALETTES = {
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
}

export function normalizeThemeMode(value) {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function normalizeSystemTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

export function resolveEffectiveTheme(mode, systemTheme) {
  if (mode === 'light' || mode === 'dark') return mode
  return normalizeSystemTheme(systemTheme)
}

export function createThemeController(dependencies) {
  const listeners = new Set()
  let mode = 'system'
  let systemTheme = 'light'
  let initialized = false
  let systemUnsubscribe
  let suppressNotifications = false

  const getSnapshot = () => ({
    mode,
    systemTheme,
    effectiveTheme: resolveEffectiveTheme(mode, systemTheme)
  })

  const snapshotsDiffer = (left, right) =>
    left.mode !== right.mode ||
    left.systemTheme !== right.systemTheme ||
    left.effectiveTheme !== right.effectiveTheme

  const notifyIfChanged = (previous) => {
    if (suppressNotifications || !snapshotsDiffer(previous, getSnapshot())) return
    for (const listener of [...listeners]) {
      try {
        listener(getSnapshot())
      } catch {
        // A consumer listener must not prevent the controller updating other listeners.
      }
    }
  }

  const updateSystemTheme = (value) => {
    const previous = getSnapshot()
    systemTheme = normalizeSystemTheme(value)
    notifyIfChanged(previous)
    return getSnapshot()
  }

  const handleSystemTheme = (value) => {
    if (initialized) updateSystemTheme(value)
  }

  const initialize = () => {
    if (initialized) return getSnapshot()

    const previous = getSnapshot()
    suppressNotifications = true
    try {
      let storedPreference
      try {
        storedPreference = dependencies.readPreference()
      } catch {
        storedPreference = null
      }
      mode = normalizeThemeMode(storedPreference)

      let currentSystemTheme
      try {
        currentSystemTheme = dependencies.readSystemTheme()
      } catch {
        currentSystemTheme = 'light'
      }
      systemTheme = normalizeSystemTheme(currentSystemTheme)
      initialized = true

      try {
        const unsubscribe = dependencies.subscribeSystemTheme(handleSystemTheme)
        systemUnsubscribe = typeof unsubscribe === 'function' ? unsubscribe : undefined
      } catch {
        systemUnsubscribe = undefined
      }
    } finally {
      suppressNotifications = false
    }
    notifyIfChanged(previous)
    return getSnapshot()
  }

  const setMode = (value) => {
    const previous = getSnapshot()
    mode = normalizeThemeMode(value)
    try {
      dependencies.writePreference(mode)
    } catch {
      // Keep the in-memory selection even when persistent storage is unavailable.
    }
    notifyIfChanged(previous)
    return getSnapshot()
  }

  const refreshSystemTheme = () => {
    let currentSystemTheme
    try {
      currentSystemTheme = dependencies.readSystemTheme()
    } catch {
      currentSystemTheme = 'light'
    }
    return updateSystemTheme(currentSystemTheme)
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function')
    listeners.add(listener)
    listener(getSnapshot())
    return () => listeners.delete(listener)
  }

  const destroy = () => {
    initialized = false
    const unsubscribe = systemUnsubscribe
    systemUnsubscribe = undefined
    if (unsubscribe) {
      try {
        unsubscribe()
      } catch {
        // Cleanup failures must not prevent later reinitialization.
      }
    }
  }

  return { initialize, setMode, refreshSystemTheme, getSnapshot, subscribe, destroy }
}
