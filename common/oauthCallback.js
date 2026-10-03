const OAUTH_CALLBACK_STORAGE_KEY = 'oauth_callback_payload'

function safeDecode(value = '') {
  try {
    return decodeURIComponent(String(value))
  } catch (e) {
    return String(value)
  }
}

function extractQueryValue(raw = '', name = '') {
  const source = String(raw || '')
  if (!source || !name) return ''

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reg = new RegExp('(?:[?&]|^)' + escaped + '=([^&#]*)', 'i')
  const match = source.match(reg)
  return match ? safeDecode(match[1]) : ''
}

export function parseOauthCallbackUrl(rawUrl = '') {
  const raw = String(rawUrl || '').trim()
  if (!raw) return null

  const token = extractQueryValue(raw, 'token')
  const loginSuccess = extractQueryValue(raw, 'loginSuccess')
  const loginError = extractQueryValue(raw, 'loginError')
  const bindSuccess = extractQueryValue(raw, 'bindSuccess')
  const bindError = extractQueryValue(raw, 'bindError')

  const hasSignal = !!(token || loginSuccess || loginError || bindSuccess || bindError || code)
  const looksLikeOauthPath =
    raw.indexOf('pages/login/login') !== -1 ||
    raw.indexOf('pages/user/setting') !== -1 ||
    raw.indexOf('tcysq://') !== -1 ||
    raw.indexOf('/pages/') !== -1

  if (!hasSignal && !looksLikeOauthPath) return null

  const payload = {
    raw,
    token,
    loginSuccess: loginSuccess === '1' || loginSuccess.toLowerCase() === 'true',
    loginError,
    bindSuccess: bindSuccess === '1' || bindSuccess.toLowerCase() === 'true',
    bindError,
    code,
    timestamp: Date.now()
  }

    return null
  }

  return payload
}

export function saveOauthCallback(payload) {
  if (!payload || typeof payload !== 'object') return
  try {
    uni.setStorageSync(OAUTH_CALLBACK_STORAGE_KEY, payload)
  } catch (e) {}
}

export function readOauthCallback() {
  try {
    const payload = uni.getStorageSync(OAUTH_CALLBACK_STORAGE_KEY)
    return payload && typeof payload === 'object' ? payload : null
  } catch (e) {
    return null
  }
}

export function clearOauthCallback() {
  try {
    uni.removeStorageSync(OAUTH_CALLBACK_STORAGE_KEY)
  } catch (e) {}
}
