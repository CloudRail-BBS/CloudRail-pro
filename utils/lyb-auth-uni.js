/**
 * lyb-auth-uni.js - 多平台 OAuth 登录 SDK（v2.0.0）
 * 支持：林屿社区 + 拼好社
 * 
 * 功能：第三方应用通过「林屿社区」或「拼好社」账号一键登录
 * 
 * 作者：挽星 | 拼好社定制版
 */

// ===== 错误码 =====
var ERR = {
  NO_CONFIG: 'NO_CONFIG',
  TOKEN_FAIL: 'TOKEN_FAIL',
  STATE_MISMATCH: 'STATE_MISMATCH',
  DENIED: 'DENIED',
  SESSION_FAIL: 'SESSION_FAIL',
  POLL_TIMEOUT: 'POLL_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN'
}

// ===== 内部状态 =====
var _config = null
var _sid = ''
var _pollTimer = null
var _pollCount = 0
var _MAX_POLL = 200
var _appAuthorizing = false
var _restoredApiBase = null
var _OAUTH_SESSION_KEY = 'lyb_oauth_pending'

// ===== 平台配置 =====
var PLATFORMS = {
  linyu: {
    name: '林屿社区',
    scheme: 'linyu://',
    icon: '林',
    apiBase: 'https://wwww.wancikeji.cn',
    createSession: '/api.php?s=api/qr_login_create',
    checkSession: '/api.php?s=api/qr_login_check',
    exchangeCode: '/api.php?s=api/oauth_code',
    clientIdField: 'client_id'     // 林屿社区 API 使用 client_id
  },
  pinhao: {
    name: '拼好社',
    scheme: 'pinhao://',
    icon: '拼',
    apiBase: 'https://example.com',
    createSession: '/api.php?s=api/qr_login_create',
    checkSession: '/api.php?s=api/qr_login_check',
    exchangeCode: '/api.php?s=api/oauth_code',
    clientIdField: 'appid'         // 拼好社 API 使用 appid
  }
}

/**
 * 解析 URL 查询参数
 */
function parseQuery(str) {
  var out = {}
  if (!str) return out
  var q = str.indexOf('?') === 0 ? str.slice(1) : str
  var arr = q.split('&')
  for (var i = 0; i < arr.length; i++) {
    var kv = arr[i].split('=')
    if (kv[0]) {
      try {
        out[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '))
      } catch (e) {
        out[kv[0]] = kv[1] || ''
      }
    }
  }
  return out
}

/**
 * 生成随机 state
 */
function randomState(prefix) {
  return (prefix || 'lyb') + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
}

/**
 * 触发错误回调
 */
function emitError(code, msg) {
  if (_config && typeof _config.onError === 'function') {
    _config.onError(code, msg || '')
  }
}

/**
 * 会话暂存区（跨端）
 * sessionStorage 只在 H5 存在，App / 小程序端直接访问会抛 ReferenceError，
 * 导致"恢复挂起的 OAuth 会话"失效。这里统一封装：H5 仍用 sessionStorage（按标签页隔离），
 * 其他端回落到 uni 同步存储。
 */
var _hasSessionStorage = (function () {
  try { return typeof sessionStorage !== 'undefined' && !!sessionStorage } catch (e) { return false }
})()

function ssGet(key) {
  if (_hasSessionStorage) { try { return sessionStorage.getItem(key) } catch (e) { return null } }
  try {
    var v = uni.getStorageSync(key)
    return (v === '' || v === null || v === undefined) ? null : String(v)
  } catch (e) { return null }
}

function ssSet(key, val) {
  if (_hasSessionStorage) { try { sessionStorage.setItem(key, val); return } catch (e) {} }
  try { uni.setStorageSync(key, val) } catch (e) {}
}

function ssDel(key) {
  if (_hasSessionStorage) { try { sessionStorage.removeItem(key); return } catch (e) {} }
  try { uni.removeStorageSync(key) } catch (e) {}
}

/**
 * 发起 HTTP 请求
 */
function request(url, opts) {
  opts = opts || {}
  return new Promise(function (resolve, reject) {
    uni.request({
      url: url,
      method: opts.method || 'GET',
      data: opts.data || {},
      header: opts.headers || { 'Content-Type': 'application/json' },
      dataType: 'json',
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error('HTTP ' + res.statusCode))
        }
      },
      fail: function (err) {
        reject(err)
      }
    })
  })
}

/**
 * 获取当前平台
 */
function getPlatform() {
  // #ifdef APP-PLUS
  return 'app'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
  // #ifdef MP-WEIXIN
  return 'mp'
  // #endif
  // #ifdef MP-ALIPAY
  return 'mp'
  // #endif
  // #ifdef MP-BAIDU
  return 'mp'
  // #endif
  // #ifdef MP-TOUTIAO
  return 'mp'
  // #endif
  // #ifdef MP-QQ
  return 'mp'
  // #endif
  return 'h5'
}

/**
 * 从 token_url 推导 API 基础地址
 */
function getApiBase(url) {
  var m = url.match(/^(https?:\/\/[^\/]+)/i)
  return m ? m[1] : ''
}

// ================================================================
// 核心 API
// ================================================================

var LYBAuth = {
  version: '2.0.0',
  ERR: ERR,
  PLATFORMS: PLATFORMS,

  /**
   * 初始化插件（支持指定平台）
   * @param {object} opts
   * @param {string} opts.platform     'linyu' | 'pinhao'（默认 linyu）
   * @param {string} opts.client_id    必填
   * @param {string} opts.authorize_url 必填
   * @param {string} opts.token_url    必填
   * @param {string} [opts.redirect_uri] 可选
   * @param {string} [opts.app_name]   可选
   * @param {function} [opts.onLogin]  可选
   * @param {function} [opts.onError]  可选
   */
  init: function (opts) {
    opts = opts || {}
    var platform = opts.platform || 'linyu'
    var platformConfig = PLATFORMS[platform] || PLATFORMS.linyu

    // ★★★ 如果有正在授权的会话，不取消轮询，只更新回调 ★★★
    if (_appAuthorizing && _sid) {
      console.log('[SDK] 检测到正在授权，保留轮询，更新回调, platform:', platform)
      // 只更新回调，不覆盖 _config（保留轮询使用的配置）
      if (_config) {
        _config.onLogin = typeof opts.onLogin === 'function' ? opts.onLogin : _config.onLogin
        _config.onError = typeof opts.onError === 'function' ? opts.onError : _config.onError
        _config.redirect_uri = opts.redirect_uri || _config.redirect_uri
        _config.authorize_url = opts.authorize_url || _config.authorize_url
        _config.token_url = opts.token_url || _config.token_url
      }
      // ★★★ 回调设置好后，再启动轮询（避免 _resumePendingSession 提前启动导致回调丢失）★★★
      if (_restoredApiBase && !_pollTimer) {
        console.log('[SDK] 恢复的会话已就绪，启动轮询:', _restoredApiBase)
        this._startPolling(_restoredApiBase)
        _restoredApiBase = null
      }
      this._checkCallback()
      return this
    }

    // ★★★ 停止旧轮询，防止前一次登录的定时器影响本次登录 ★★★
    this.cancel()

    _config = {
      platform: platform,
      platformName: platformConfig.name,
      platformScheme: platformConfig.scheme,
      client_id: opts.client_id || '',
      redirect_uri: opts.redirect_uri || '',
      authorize_url: opts.authorize_url || '',
      token_url: opts.token_url || '',
      app_name: opts.app_name || platformConfig.name,
      onLogin: typeof opts.onLogin === 'function' ? opts.onLogin : null,
      onError: typeof opts.onError === 'function' ? opts.onError : null
    }

    // H5 平台自动检测回调参数
    this._checkCallback()

    // ★★★ 从 sessionStorage 恢复挂起的 OAuth 会话（页面刷新后自动恢复轮询）★★★
    this._resumePendingSession()

    return this
  },

  /**
   * 发起登录
   */
  login: function () {
    if (!_config) {
      emitError(ERR.NO_CONFIG, '请先调用 init() 初始化')
      return
    }
    if (!_config.client_id) {
      emitError(ERR.NO_CONFIG, '缺少 client_id')
      return
    }
    if (!_config.authorize_url) {
      emitError(ERR.NO_CONFIG, '缺少 authorize_url')
      return
    }
    if (!_config.token_url) {
      emitError(ERR.NO_CONFIG, '缺少 token_url')
      return
    }

    // ★★★ 如果有旧的 pending session，先取消再创建新的，避免卡在旧会话上 ★★★
    if (_appAuthorizing && _sid) {
      console.log('[SDK] 取消旧的授权会话，创建新会话, old_sid:', _sid)
      this.cancel()
    }

    var platform = getPlatform()

    if (platform === 'app') {
      this._appLogin()
    } else if (platform === 'h5') {
      this._h5Login()
    } else {
      this._mpLogin()
    }
  },

  /**
   * 取消登录
   */
  _clearPendingSession: function () {
    ssDel(_OAUTH_SESSION_KEY)
  },

  _resumePendingSession: function () {
    try {
      var pending = ssGet(_OAUTH_SESSION_KEY)
      if (!pending) return
      var data = JSON.parse(pending)
      if (!data || !data.sid || !data.apiBase) return
      console.log('[SDK] 恢复挂起的 OAuth 会话:', data.sid, '(等待 init 设置回调后启动轮询)')
      _sid = data.sid
      _appAuthorizing = true
      _pollCount = 0
      // ★★★ 保存 apiBase 供 init() 启动轮询使用 ★★★
      _restoredApiBase = data.apiBase
      // ★★★ 只保存配置，不启动轮询 ★★★
      // 轮询在 init() 中设置好回调后再启动，避免回调丢失
      var tempPlatform = data.platform || 'pinhao'
      var tempPlatformConfig = PLATFORMS[tempPlatform] || PLATFORMS.pinhao
      _config = {
        platform: tempPlatform,
        platformName: tempPlatformConfig.name,
        platformScheme: tempPlatformConfig.scheme,
        client_id: data.clientId || '',
        redirect_uri: data.redirect_uri || '',
        authorize_url: data.authorize_url || '',
        token_url: data.token_url || '',
        app_name: data.app_name || tempPlatformConfig.name,
        onLogin: null,
        onError: null
      }
    } catch (e) {
      console.log('[SDK] 恢复会话失败:', e)
    }
  },

  cancel: function () {
    this._clearPendingSession()
    if (_pollTimer) {
      clearInterval(_pollTimer)
      _pollTimer = null
    }
    _appAuthorizing = false
    _sid = ''
    _restoredApiBase = null
  },

  /**
   * 获取当前授权状态
   */
  getStatus: function () {
    return {
      isAuthorizing: _appAuthorizing || _pollTimer !== null,
      sid: _sid,
      platform: getPlatform(),
      config: _config
    }
  },

  /**
   * 获取 sessionStorage 中挂起的会话信息（不恢复轮询）
   * @returns {object|null} { sid, platform, clientId, app_name }
   */
  getPendingSession: function () {
    try {
      var pending = ssGet(_OAUTH_SESSION_KEY)
      if (!pending) return null
      var data = JSON.parse(pending)
      if (!data || !data.sid || !data.apiBase) return null
      return {
        sid: data.sid,
        platform: data.platform || 'pinhao',
        clientId: data.clientId || '',
        app_name: data.app_name || ''
      }
    } catch (e) {
      return null
    }
  },

  // ================================================================
  // 私有方法
  // ================================================================

  /**
   * 获取平台配置
   */
  _getPlatformConfig: function () {
    return PLATFORMS[_config.platform] || PLATFORMS.linyu
  },

  /**
   * App 平台登录
   */
  _appLogin: function () {
    var self = this
    var apiBase = getApiBase(_config.token_url)
    if (!apiBase) {
      emitError(ERR.NO_CONFIG, '无法解析 token_url 的域名')
      return
    }

    var platformConfig = self._getPlatformConfig()
    var createUrl = apiBase + platformConfig.createSession

    // 1. 创建登录会话
    request(createUrl, {
      method: 'POST',
      data: {
        appid: _config.client_id,
        app: _config.app_name
      }
    }).then(function (res) {
      if (!res || res.error !== true || !res.info || !res.info.sid) {
        emitError(ERR.SESSION_FAIL, (res && res.info) || '创建登录会话失败')
        return
      }
      _sid = res.info.sid
      _appAuthorizing = true
      _pollCount = 0

      // 2. 唤起对应 App
      var appScheme = platformConfig.scheme + 'authorize?sid=' + _sid +
        '&appid=' + _config.client_id +
        '&app=' + encodeURIComponent(_config.app_name)

      // ★★★ 所有平台统一：scheme 唤起外部 App ★★★
      // #ifdef APP-PLUS
      plus.runtime.openURL(appScheme, function (err) {
        console.log('[SDK] 唤起 ' + platformConfig.name + ' App 失败：' + (err || '未安装'))
        // App 未安装：降级到前端授权页（Session 模式），与 H5 一致
        var authUrl = '/pages/oauth/authorize?sid=' + encodeURIComponent(_sid) +
          '&appid=' + encodeURIComponent(_config.client_id) +
          '&app=' + encodeURIComponent(_config.app_name) +
          '&apiBase=' + encodeURIComponent(apiBase) +
          '&platform=' + encodeURIComponent(_config.platform)
        console.log('[SDK] 降级到前端授权页:', authUrl);
        uni.navigateTo({ url: authUrl })
      })
      // #endif

      // 3. 轮询授权结果
      self._startPolling(apiBase)
    }).catch(function (err) {
      emitError(ERR.NETWORK_ERROR, '网络错误: ' + (err.message || err))
    })
  },

  /**
   * 开始轮询授权状态
   */
  _startPolling: function (apiBase) {
    var self = this
    var platformConfig = self._getPlatformConfig()

    if (_pollTimer) {
      clearInterval(_pollTimer)
      _pollTimer = null
    }

    _pollTimer = setInterval(function () {
      _pollCount++
      if (_pollCount > _MAX_POLL) {
        clearInterval(_pollTimer)
        _pollTimer = null
        _appAuthorizing = false
        emitError(ERR.POLL_TIMEOUT, '授权超时，请重新发起登录')
        return
      }
      if (!_sid) return

      // ★★★ checkSession 已含 ?，追加参数用 & ★★★
      var checkUrl = apiBase + platformConfig.checkSession +
        '&sid=' + _sid +
        '&appid=' + _config.client_id +
        '&oauth=1'

      request(checkUrl, { method: 'GET' }).then(function (res) {
        console.log('[SDK] 轮询结果:', JSON.stringify(res), 'sid:', _sid)
        if (!res || res.error !== true || !res.info) return
        if (res.info.status === 2) {
          clearInterval(_pollTimer)
          _pollTimer = null
          _appAuthorizing = false
          self._clearPendingSession()
          self._exchangeCode(apiBase)
        } else if (res.info.status === -1) {
          clearInterval(_pollTimer)
          _pollTimer = null
          _appAuthorizing = false
          self._clearPendingSession()
          emitError(ERR.SESSION_FAIL, '登录会话已过期，请重新发起')
        }
      }).catch(function () {})
    }, 1500)
  },

  /**
   * 用 sid 换取授权码
   */
  _exchangeCode: function (apiBase) {
    var self = this
    var platformConfig = self._getPlatformConfig()
    var codeUrl = apiBase + platformConfig.exchangeCode
    var redirectUri = 'lybauth://callback?sid=' + _sid

    // ★★★ 使用平台对应的 clientIdField（林屿：client_id，拼好社：appid）★★★
    var codeData = {}
    codeData['sid'] = _sid
    codeData[platformConfig.clientIdField] = _config.client_id
    codeData['redirect_uri'] = redirectUri

    request(codeUrl, {
      method: 'POST',
      data: codeData
    }).then(function (res) {
      if (res && res.error === true && res.info && res.info.code) {
        self._clearPendingSession()
        console.log('[SDK] 换取授权码成功:', res.info.code)
        // ★★★ 不自己换token了，直接把code传给页面，让后端去换 ★★★
        if (_config && typeof _config.onLogin === 'function') {
          _config.onLogin({ code: res.info.code })
        }
      } else {
        emitError(ERR.TOKEN_FAIL, '换取授权码失败: ' + ((res && res.info) || '未知错误'))
      }
    }).catch(function (err) {
      emitError(ERR.NETWORK_ERROR, '网络错误: ' + (err.message || err))
    })
  },

  /**
   * 用授权码换取 token
   */
  _exchangeToken: function (code, redirectUri) {
    if (!_config || !_config.token_url) {
      emitError(ERR.NO_CONFIG, '未配置 token_url')
      return
    }

    // ★★★ token.php 只接受 JSON body: {client_id, code, redirect_uri} ★★★
    //     曾经用 form-urlencoded 的 appid/secret/code/grant_type，服务端只会回「缺少必要参数」
    var postData = {
      client_id: _config.client_id,
      code: code,
      redirect_uri: redirectUri
    }
    console.log('[SDK] 换token请求参数:', postData)

    request(_config.token_url, {
      method: 'POST',
      data: postData,
      headers: { 'Content-Type': 'application/json' }
    }).then(function (res) {
      console.log('[SDK] token 换取完整结果:', JSON.stringify(res))

      var userInfo = null
      var infoObj = (res && res.info && typeof res.info === 'object') ? res.info : null

      // 格式1: 拼好社返回 {error:false, info:{uid,username,avatar,access_token}}
      // 注: 该接口家族 error 字段并不严谨(授权码接口成功时也回 error:true)，因此按 info 内容判断
      if (infoObj && (infoObj.uid || infoObj.access_token || infoObj.username)) {
        userInfo = infoObj
      }
      // 格式2: {code:200, data:{access_token:...}}
      else if (res && res.code === 200 && res.data && res.data.access_token) {
        userInfo = res.data
      }
      // 格式3: 直接返回 {access_token:...}
      else if (res && res.access_token) {
        userInfo = res
      }
      
      if (userInfo) {
        console.log('[SDK] token 换取成功, 触发 onLogin:', userInfo)
        if (_config && typeof _config.onLogin === 'function') {
          _config.onLogin(userInfo)
        }
      } else {
        var errMsg = '换取登录凭证失败'
        if (res && typeof res.info === 'string') {
          errMsg = res.info
        } else if (res && res.info && typeof res.info === 'object') {
          errMsg = res.info.message || res.info.msg || res.info.info || errMsg
        } else if (res && res.message) {
          errMsg = res.message
        }
        console.error('[SDK] token 换取失败:', errMsg, res)
        emitError(ERR.TOKEN_FAIL, errMsg)
      }
    }).catch(function (err) {
      console.error('[SDK] token 网络错误:', err)
      emitError(ERR.NETWORK_ERROR, '网络错误: ' + (err.message || err))
    })
  },

  /**
   * H5 登录
   */
  _h5Login: function () {
    var self = this
    var apiBase = getApiBase(_config.token_url)
    if (!apiBase) {
      emitError(ERR.NO_CONFIG, '无法解析 token_url 的域名')
      return
    }

    var platformConfig = self._getPlatformConfig()
    var createUrl = apiBase + platformConfig.createSession

    // 1. 创建登录会话（与 App 模式相同）
    request(createUrl, {
      method: 'POST',
      data: {
        appid: _config.client_id,
        app: _config.app_name
      }
    }).then(function (res) {
      if (!res || res.error !== true || !res.info || !res.info.sid) {
        emitError(ERR.SESSION_FAIL, (res && res.info) || '创建登录会话失败')
        return
      }
      _sid = res.info.sid
      _appAuthorizing = true
      _pollCount = 0

      // ★★★ 保存会话信息（页面刷新/重启后自动恢复轮询）★★★
      ssSet(_OAUTH_SESSION_KEY, JSON.stringify({
        sid: _sid,
        apiBase: apiBase,
        clientId: _config.client_id,
        platform: _config.platform,
        redirect_uri: _config.redirect_uri || '',
        authorize_url: _config.authorize_url || '',
        token_url: _config.token_url || '',
        app_name: _config.app_name || ''
      }))

      // 2. 跳转到 PHP Web 授权页（传统 OAuth 授权码模式）
      //    使用新窗口打开，原窗口保持轮询检测授权结果
      var state = 'h5_' + Math.random().toString(36).substring(2, 15)
      // 回调地址指向 PHP index.php，并携带 sid 用于 PHP 端更新会话状态
      var callbackUrl = apiBase + '/index.php?sid=' + encodeURIComponent(_sid)
      var webAuthUrl = _config.authorize_url +
        '?client_id=' + encodeURIComponent(_config.client_id) +
        '&redirect_uri=' + encodeURIComponent(callbackUrl) +
        '&response_type=code' +
        '&state=' + encodeURIComponent(state) +
        '&app_name=' + encodeURIComponent(_config.app_name)

      console.log('[SDK] 打开 Web 授权页:', webAuthUrl)
      window.open(webAuthUrl, '_blank')

      // 3. 原窗口开始轮询授权结果（PHP 授权完成后会更新会话状态）
      self._startPolling(apiBase)
    }).catch(function (err) {
      emitError(ERR.NETWORK_ERROR, '网络错误: ' + (err.message || err))
    })
  },

  /**
   * 小程序登录
   */
  _mpLogin: function () {
    var redirectUri = _config.redirect_uri
    if (!redirectUri) {
      emitError(ERR.NO_CONFIG, '小程序平台请配置 redirect_uri 参数')
      return
    }

    var state = randomState(_config.platform)
    try { uni.setStorageSync('lyb_oauth_state', state) } catch (e) {}

    var sep = _config.authorize_url.indexOf('?') === -1 ? '?' : '&'
    var url = _config.authorize_url + sep +
      'client_id=' + encodeURIComponent(_config.client_id) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=code' +
      '&state=' + encodeURIComponent(state) +
      '&app_name=' + encodeURIComponent(_config.app_name)

    uni.navigateTo({
      url: '/pages/lyb-webview/lyb-webview?url=' + encodeURIComponent(url)
    })
  },

  /**
   * 检查回调（H5 自动检测）
   */
  _checkCallback: function () {
    if (getPlatform() !== 'h5') return

    var qs = parseQuery(window.location.search || window.location.hash.replace(/^#/, ''))

    if (qs.error) {
      emitError(ERR.DENIED, qs.error_description || '用户拒绝了授权')
      this._cleanUrl()
      return
    }

    if (!qs.code) return

    // state 校验
    var savedState = null
    try { savedState = uni.getStorageSync('lyb_oauth_state') } catch (e) {}

    if (savedState && qs.state && qs.state !== savedState) {
      emitError(ERR.STATE_MISMATCH, '回调 state 校验失败')
      this._cleanUrl()
      return
    }

    try { uni.removeStorageSync('lyb_oauth_state') } catch (e) {}

    this._exchangeToken(qs.code, _config.redirect_uri || window.location.origin + window.location.pathname)
    this._cleanUrl()
  },

  /**
   * 清理 URL 参数
   */
  _cleanUrl: function () {
    // #ifdef H5
    try {
      if (window.history && window.history.replaceState) {
        var cleanUrl = window.location.origin + window.location.pathname
        window.history.replaceState({}, document.title, cleanUrl)
      }
    } catch (e) {}
    // #endif
  }
}

// ================================================================
// 导出
// ================================================================

// #ifdef H5
if (typeof document !== 'undefined') {
  ;(function () {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        LYBAuth._checkCallback()
        LYBAuth._resumePendingSession()
      })
    } else {
      LYBAuth._checkCallback()
      LYBAuth._resumePendingSession()
    }
  })()
}
// #endif

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LYBAuth
} else if (typeof exports !== 'undefined') {
  exports.LYBAuth = LYBAuth
} else if (typeof uni !== 'undefined') {
  uni.LYBAuth = LYBAuth
}

export default LYBAuth





















