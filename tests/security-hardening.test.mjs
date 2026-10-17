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

test('search highlight returns only text segments, including hostile markup as plain text', async () => {
  const { splitHighlightedText } = await importSourceModule('common/textHighlight.js')
  const value = '<img src=x onerror=alert(1)>Club'

  assert.deepEqual(splitHighlightedText(value, 'club'), [
    { text: '<img src=x onerror=alert(1)>', highlighted: false },
    { text: 'Club', highlighted: true }
  ])
  assert.deepEqual(splitHighlightedText('No match', 'absent'), [
    { text: 'No match', highlighted: false }
  ])
  assert.deepEqual(splitHighlightedText('<svg onload=alert(1)>A&B</svg>', '<svg'), [
    { text: '<svg', highlighted: true },
    { text: ' onload=alert(1)>A&B</svg>', highlighted: false }
  ])
  assert.deepEqual(splitHighlightedText('x.*[y]', '.*['), [
    { text: 'x', highlighted: false },
    { text: '.*[', highlighted: true },
    { text: 'y]', highlighted: false }
  ])
})

test('search result templates do not use HTML sinks', async () => {
  const source = await readRepoFile('pages/search/search.vue')
  assert.doesNotMatch(source, /\bv-html\s*=/)
  assert.match(source, /splitHighlightedText/)
})

test('H5 OAuth state is random, one-time, and bound to session storage', async () => {
  const { createOAuthState, consumeOAuthState, consumeTokenLoginCallback, parseOauthCallbackUrl, stripOauthCallbackParams } = await importSourceModule('common/oauthCallback.js')
  const data = new Map()
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key)
  }
  const cryptoApi = { getRandomValues: (bytes) => bytes.fill(0xAB) }
  const state = createOAuthState(storage, cryptoApi, 10_000)

  assert.match(state, /^[a-f0-9]{64}$/)
  assert.equal(consumeOAuthState('attacker-state', storage, 10_001), false)
  assert.equal(consumeOAuthState(state, storage, 10_001), true)
  assert.equal(consumeOAuthState(state, storage, 10_002), false)

  const expiredState = createOAuthState(storage, cryptoApi, 20_000)
  assert.equal(consumeOAuthState(expiredState, storage, 20_000 + 10 * 60 * 1000 + 1), false)
  const callback = parseOauthCallbackUrl('https://app.test/#/pages/login/login?token=t&loginSuccess=1&state=' + state)
  assert.equal(callback.state, state)
  assert.equal(callback.loginSuccess, true)
  assert.equal(consumeTokenLoginCallback({ ...callback, state: 'attacker' }, storage, 10_003), false)

  const validState = createOAuthState(storage, cryptoApi, 30_000)
  const validCallback = { token: 'token-value', loginSuccess: true, state: validState }
  assert.equal(consumeTokenLoginCallback({ ...validCallback, loginSuccess: false }, storage, 30_001), false)
  assert.equal(consumeTokenLoginCallback(validCallback, storage, 30_001), true)
  assert.equal(consumeTokenLoginCallback(validCallback, storage, 30_002), false)

  const missingSuccessState = createOAuthState(storage, cryptoApi, 40_000)
  assert.equal(consumeTokenLoginCallback({ token: 'token-value', loginSuccess: '1', state: missingSuccessState }, storage, 40_001), false)
  assert.equal(consumeTokenLoginCallback({ token: 'token-value', loginSuccess: true }, storage, 40_001), false)
  assert.equal(
    stripOauthCallbackParams('https://app.test/?keep=1&token=t&loginSuccess=1#/pages/login/login?state=s&tab=2'),
    'https://app.test/?keep=1#/pages/login/login?tab=2'
  )
  assert.equal(
    stripOauthCallbackParams('https://app.test/callback?TOKEN=t&LoginSuccess=1&STATE=s&keep=1'),
    'https://app.test/callback?keep=1',
    'callback cleanup must match the parser’s case-insensitive parameter handling'
  )
  assert.equal(
    parseOauthCallbackUrl('https://app.test/callback?%74oken=encoded-name-token')?.token,
    'encoded-name-token',
    'encoded token parameter names must still be recognized and rejected'
  )
})

test('OAuth callback URLs require HTTPS and use the configured site base', async () => {
  const { buildSecureOAuthCallbackUrl } = await importSourceModule('common/oauthCallback.js')
  assert.equal(buildSecureOAuthCallbackUrl('https://community.example/app/', 'session id'), 'https://community.example/app/oauth_callback.php?sid=session%20id')
  assert.equal(buildSecureOAuthCallbackUrl('http://community.example/', 'sid'), '')
  assert.equal(buildSecureOAuthCallbackUrl('https://community.example/?next=http://evil.test', 'sid'), '')

  const loginPage = await readRepoFile('pages/login/login.vue')
  assert.doesNotMatch(loginPage, /http:\/\/your-domain\.com\/oauth_callback\.php/)
  assert.match(loginPage, /buildSecureOAuthCallbackUrl\(WEB_BASE/)
  assert.match(loginPage, /_pinhaoFallbackWebview\(APPID, sid, apiBase\)/)
  assert.match(loginPage, /const authUrl = oauthBase \+ '\/oauth\/authorize\.php'/)
  assert.doesNotMatch(loginPage, /const authUrl = 'https:\/\/oauth\.your-domain\.com\/oauth\/authorize\.php'/)
})

test('token callback handling is gated at every frontend entry point', async () => {
  const app = await readRepoFile('App.vue')
  const loginPage = await readRepoFile('pages/login/login.vue')
  const webview = await readRepoFile('pages/webview/webview.vue')
  assert.ok(/consumeTokenLoginCallback\(/.test(app), 'H5 callbacks must consume one-time state')
  assert.ok(/stateValidated\s*!==\s*true/.test(app), 'other token entry points must be rejected')
  assert.ok(!/options\.token\s*&&\s*options\.loginSuccess/.test(loginPage), 'login query must not bypass App validation')
  assert.ok(!/options\.token\s*&&\s*!options\.loginSuccess/.test(loginPage), 'legacy token query must not bypass App validation')
  assert.ok(!/setStorageSync\(['"]token['"],\s*token\)/.test(webview), 'webview callback must not store raw tokens')
  assert.ok(!/handleTokenLogin\(token\)/.test(webview), 'webview callback must not forward raw tokens')
  assert.ok(!/this\._pinhaoH5Finish\(options\.pinhao_sid\)/.test(loginPage), 'unbound Pinhao session IDs must not trigger login')
})

test('login WebView blocks raw-token callbacks before loading them', async () => {
  const source = await readRepoFile('pages/webview/webview.vue')
  assert.match(source, /overrideUrlLoading\(\{\s*mode:\s*['"]reject['"]/)
  const patternMatch = source.match(/const tokenParamPattern = '([^']+)'/)
  assert.ok(patternMatch, 'login WebView must configure an explicit token query pattern')
  const tokenParamPattern = new RegExp(patternMatch[1])
  for (const callbackUrl of [
    'https://example.test/callback?token=secret',
    'https://example.test/callback?TOKEN=secret',
    'https://example.test/callback?%74oken=secret',
    'https://example.test/callback?%74%6f%6b%65%6e=secret',
    'https://example.test/callback?next=1&token=secret'
  ]) {
    assert.match(callbackUrl, tokenParamPattern, `token callback should be rejected: ${callbackUrl}`)
  }
  assert.doesNotMatch('https://example.test/page?tab=login', tokenParamPattern)
  assert.doesNotMatch(source, /overrideUrlLoading\(\{\s*mode:\s*['"]allow['"]\s*\}/)

  const parseIndex = source.indexOf('parseOauthCallbackUrl(targetUrl)')
  const queueIndex = source.indexOf('this.pendingLoginUrl = targetUrl')
  const installIndex = source.indexOf('overrideUrlLoading({ mode: \'reject\'')
  const assignIndex = source.indexOf('if (targetUrl) this.url = targetUrl')
  assert.ok(parseIndex >= 0 && queueIndex > parseIndex, 'the initial login URL must be checked before queuing it')
  assert.ok(installIndex >= 0 && assignIndex > installIndex, 'the login URL must not load until navigation interception is installed')
})

test('OAuth diagnostics never log full token responses or user objects', async () => {
  const source = await readRepoFile('utils/lyb-auth-uni.js')
  const loginPage = await readRepoFile('pages/login/login.vue')
  assert.ok(!/console\.(?:log|error)\([^\n]*(?:JSON\.stringify\(res\)|postData|userInfo|res\.info\.code|\bcode\s*:\s*code|webAuthUrl)/.test(source), 'OAuth SDK must not log credential-bearing data')
  assert.ok(!/console\.(?:log|error)\([^\n]*(?:登录成功:[^\n]*res|拿到code[^\n]*res\.code)/.test(loginPage), 'login page must not log callback credentials')
})

test('API diagnostics never log request data, response bodies, URLs, or errors', async () => {
  const source = await readRepoFile('common/request.js')
  assert.doesNotMatch(source, /console\.(?:log|error)\s*\(/, 'request and upload flows must not print potentially sensitive values')
  assert.doesNotMatch(source, /\[Upload响应\]|\[API响应\]/, 'response bodies must not be logged')
})

test('WebSocket diagnostics do not print raw errors, payloads, or callback exceptions', async () => {
  const source = await readRepoFile('common/ws.js')
  assert.doesNotMatch(source, /console\.(?:log|warn|error)\s*\([^)]*,\s*(?:err|res|e|rawMsg|res\.data)\s*[),]/i)
})

test('security documentation never tells maintainers to add frontend secrets', async () => {
  const docs = await readRepoFile('开发文档.md')
  assert.doesNotMatch(docs, /把[^\n]*(?:真实域名|密钥|API Key)[^\n]*替换为示例值/)
  assert.doesNotMatch(docs, /AppID[^\n]*(?:属敏感|脱敏)/)
  assert.match(docs, /不要把服务器私钥、第三方供应商密钥/)
})

test('AI frontend does not embed or send a provider secret', async () => {
  const source = await readRepoFile('common/doubao.js')
  assert.doesNotMatch(source, /SILICONFLOW_API_KEY|sk-[A-Za-z0-9_-]{8,}/)
  assert.doesNotMatch(source, /api\.siliconflow\.cn|Authorization['"]\s*:/)
})

test('mini-program third-party OAuth fails closed without a callback route', async () => {
  const source = await readRepoFile('utils/lyb-auth-uni.js')
  const loginPage = await readRepoFile('pages/login/login.vue')

  assert.match(source, /_mpLogin: function \(\) \{[\s\S]*?小程序暂不支持第三方账号登录/)
  assert.doesNotMatch(source, /pages\/lyb-webview\/lyb-webview/)
  assert.doesNotMatch(source, /Math\.random\(\)/)
  assert.doesNotMatch(loginPage, /const state\s*=\s*Math\.random\(\)/)
  assert.match(loginPage, /const state\s*=\s*String\(sid\s*\|\|\s*''\)/)
})
