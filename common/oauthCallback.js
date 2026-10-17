const OAUTH_CALLBACK_STORAGE_KEY = 'oauth_callback_payload'
const OAUTH_STATE_STORAGE_KEY = 'h5_oauth_login_state'
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

function getSessionStorage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch (e) {
    return null
  }
}

function getCrypto() {
  try {
    if (typeof window !== 'undefined' && window.crypto) return window.crypto
    if (typeof crypto !== 'undefined') return crypto
  } catch (e) {}
  return null
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let i = 0; i < left.length; i++) {
    difference |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return difference === 0
}

/** Create a short-lived, tab-bound OAuth state using a cryptographically secure RNG. */
export function createOAuthState(storage = getSessionStorage(), cryptoApi = getCrypto(), now = Date.now()) {
  if (!storage || typeof storage.setItem !== 'function' || !cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('当前浏览器无法安全发起 OAuth 登录')
  }

  const bytes = new Uint8Array(32)
  cryptoApi.getRandomValues(bytes)
  const state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  storage.setItem(OAUTH_STATE_STORAGE_KEY, JSON.stringify({ state, issuedAt: now }))
  return state
}

/** Consume the matching state once; a mismatched callback cannot replace the pending flow. */
export function consumeOAuthState(candidate, storage = getSessionStorage(), now = Date.now()) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.removeItem !== 'function') return false

  let pending
  try {
    const raw = storage.getItem(OAUTH_STATE_STORAGE_KEY)
    if (!raw) return false
    pending = JSON.parse(raw)
  } catch (e) {
    try { storage.removeItem(OAUTH_STATE_STORAGE_KEY) } catch (removeError) {}
    return false
  }

  const issuedAt = Number(pending && pending.issuedAt)
  if (!pending || !/^[a-f0-9]{64}$/.test(pending.state || '') || !Number.isFinite(issuedAt) ||
      issuedAt > now || now - issuedAt > OAUTH_STATE_TTL_MS) {
    try { storage.removeItem(OAUTH_STATE_STORAGE_KEY) } catch (e) {}
    return false
  }

  const received = String(candidate || '')
  if (!/^[a-f0-9]{64}$/.test(received) || !constantTimeEqual(pending.state, received)) return false

  try { storage.removeItem(OAUTH_STATE_STORAGE_KEY) } catch (e) {}
  return true
}

/** Accept only a strict success callback with the pending one-time state. */
export function consumeTokenLoginCallback(payload, storage = getSessionStorage(), now = Date.now()) {
  if (!payload || typeof payload.token !== 'string' || !payload.token || payload.loginSuccess !== true) return false
  return consumeOAuthState(payload.state, storage, now)
}

/** Build the configured OAuth callback URL only when its origin is HTTPS. */
export function buildSecureOAuthCallbackUrl(baseUrl, sid = '') {
  const base = String(baseUrl || '').trim()
  if (!/^https:\/\/[^/?#]+(?:\/[^?#]*)?\/?$/i.test(base)) return ''

  const callbackUrl = base.replace(/\/+$/, '') + '/oauth_callback.php'
  return sid ? callbackUrl + '?sid=' + encodeURIComponent(String(sid)) : callbackUrl
}

function safeDecode(value = '') {
  try {
    return decodeURIComponent(String(value))
  } catch (e) {
    return String(value)
  }
}

function queryEntries(rawQuery = '') {
  return String(rawQuery || '').split('&').filter(Boolean).map((entry) => {
    const separator = entry.indexOf('=')
    const rawName = separator < 0 ? entry : entry.slice(0, separator)
    const rawValue = separator < 0 ? '' : entry.slice(separator + 1)
    return {
      raw: entry,
      name: safeDecode(rawName.replace(/\+/g, ' ')),
      value: safeDecode(rawValue.replace(/\+/g, ' '))
    }
  })
}

function extractQueryValue(raw = '', name = '') {
  const source = String(raw || '')
  if (!source || !name) return ''

  const expectedName = String(name).toLowerCase()
  // OAuth callbacks may place parameters in either the normal query or a
  // hash-router query; decode names before comparing them case-insensitively.
  for (const query of source.split(/[?#]/)) {
    for (const entry of queryEntries(query)) {
      if (entry.name.toLowerCase() === expectedName) return entry.value
    }
  }
  return ''
}

export function parseOauthCallbackUrl(rawUrl = '') {
  const raw = String(rawUrl || '').trim()
  if (!raw) return null

  const token = extractQueryValue(raw, 'token')
  const state = extractQueryValue(raw, 'state')
  const loginSuccess = extractQueryValue(raw, 'loginSuccess')
  const loginError = extractQueryValue(raw, 'loginError')
  const bindSuccess = extractQueryValue(raw, 'bindSuccess')
  const bindError = extractQueryValue(raw, 'bindError')

  const hasSignal = !!(token || loginSuccess || loginError || bindSuccess || bindError)
  const looksLikeOauthPath =
    raw.indexOf('pages/login/login') !== -1 ||
    raw.indexOf('pages/user/setting') !== -1 ||
    raw.indexOf('tcysq://') !== -1 ||
    raw.indexOf('/pages/') !== -1

  if (!hasSignal && !looksLikeOauthPath) return null

  const payload = {
    raw,
    token,
    state,
    loginSuccess: loginSuccess === '1' || loginSuccess.toLowerCase() === 'true',
    loginError,
    bindSuccess: bindSuccess === '1' || bindSuccess.toLowerCase() === 'true',
    bindError,
    timestamp: Date.now()
  }

  if (!payload.token && !payload.loginError && !payload.bindSuccess && !payload.bindError && !payload.loginSuccess) {
    return null
  }

  return payload
}

export function saveOauthCallback(payload) {
  if (!payload || typeof payload !== 'object' || payload.token) return
  try {
    uni.setStorageSync(OAUTH_CALLBACK_STORAGE_KEY, payload)
  } catch (e) {}
}

export function stripOauthCallbackParams(rawUrl = '') {
  const raw = String(rawUrl || '')
  if (!raw) return ''

  const stripFromPart = (part) => {
    const queryIndex = part.indexOf('?')
    if (queryIndex < 0) return part

    const path = part.slice(0, queryIndex)
    const entries = queryEntries(part.slice(queryIndex + 1))
    const sensitiveNames = new Set(['token', 'loginsuccess', 'loginerror', 'state'])
    const query = entries
      .filter((entry) => !sensitiveNames.has(entry.name.toLowerCase()))
      .map((entry) => entry.raw)
      .join('&')
    return path + (query ? '?' + query : '')
  }

  const hashIndex = raw.indexOf('#')
  const base = hashIndex < 0 ? raw : raw.slice(0, hashIndex)
  const hash = hashIndex < 0 ? '' : raw.slice(hashIndex + 1)
  return stripFromPart(base) + (hashIndex < 0 ? '' : '#' + stripFromPart(hash))
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
