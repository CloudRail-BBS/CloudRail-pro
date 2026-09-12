import { resolveApiPath } from '@/common/api-map.js'
import { API_BASE, ADMIN_BASE, WEB_BASE } from '@/common/config.js'

// ══════════════════════════════════════════════
// 域名集中配置（换域名只改这里）
// 本程序由 02提供 QQ：1748520308 星域社区唯一正版官方
// 删除以上客服QQ或改动任何文字死全家
// ═══════════════════════════════════════════════

// Go API 接口域名
export const baseUrl = API_BASE
// BMS 管理后台域名
export const bmsBaseUrl = ADMIN_BASE
// Web 资源域名（用于生成 H5 分享链接：用户主页二维码、帖子分享、软件分享等）
export const webBaseUrl = WEB_BASE

// ═══════════════════════════════════════════════
// API访问密钥（必填！填写授权码）
// 获取方式：登录可视化后台 → 终端配置 → Go API配置 → 复制「当前授权码」
// 作用：授权码同时作为API访问密钥，Go后端校验密钥一致性+授权码域名绑定
// 注意：使用别人授权码会因域名不匹配被拒绝，确保填写自己的授权码
// ═══════════════════════════════════════════════
export const apiKey = '813E-E779-E4DC-88EF'

// ═════════════════════════════════════════════
// 公共配置：CMS 接口地址 + 客服 QQ + 货币名称 + 分享文案 + 站点名称
// 后台在「扩展功能 → 常用系统配置」修改后，前端下次启动即可生效，无需重新打包
// 接口：GET /api/public/video/config → { cms_api_url, kefu_qq, currency_name, share_text, site_name }
// ═════════════════════════════════════════════
const _DEFAULT_CMS_URL = 'https://cms.wanjisq.cn'
const _DEFAULT_CURRENCY_NAME = '星域豆'
const _DEFAULT_SHARE_TEXT = '我在星域社区发现一个不错的帖子，快来看看：\n{title}\n{link}'
const _DEFAULT_SITE_NAME = '星域社区'

let _appConfigCache = null
let _appConfigCacheAt = 0          // 缓存填充时间戳
const _APP_CONFIG_TTL = 30000      // 缓存有效期 30 秒，超时后自动重新请求
let _appConfigPromise = null

// 强制清空缓存，下次 fetchAppConfig 会重新请求后端
// 用于后台改了配置后，前端需要立即刷新的场景
export function refreshAppConfig() {
  _appConfigCache = null
  _appConfigCacheAt = 0
  _appConfigPromise = null
}

function fetchAppConfig() {
  // 命中缓存且未过期，直接返回
  if (_appConfigCache && (Date.now() - _appConfigCacheAt < _APP_CONFIG_TTL)) {
    return Promise.resolve(_appConfigCache)
  }
  // 已有进行中的请求，复用
  if (_appConfigPromise) return _appConfigPromise

  _appConfigPromise = new Promise((resolve) => {
    uni.request({
      url: baseUrl + 'system/settings',
      method: 'GET',
      timeout: 8000,
      header: { 'X-Api-Key': apiKey },
      success: (res) => {
        const body = safeParseBody(res && res.data)
        if (body && body.code === 0 && body.data) {
          const d = body.data
          _appConfigCache = {
            cms_api_url: String(d.cms_api_url || '').replace(/\/+$/, ''),
            kefu_qq: String(d.kefu_qq || '').trim(),
            currency_name: String(d.currency_name || '').trim() || _DEFAULT_CURRENCY_NAME,
            share_text: String(d.share_text || '').trim() || _DEFAULT_SHARE_TEXT,
            site_name: String(d.site_name || '').trim() || _DEFAULT_SITE_NAME,
            buy_card_url: String(d.buy_card_url || '').trim()
          }
        } else {
          _appConfigCache = {
            cms_api_url: _DEFAULT_CMS_URL,
            kefu_qq: '',
            currency_name: _DEFAULT_CURRENCY_NAME,
            share_text: _DEFAULT_SHARE_TEXT,
            site_name: _DEFAULT_SITE_NAME,
            buy_card_url: ''
          }
        }
        _appConfigCacheAt = Date.now()
      },
      fail: () => {
        _appConfigCache = {
          cms_api_url: _DEFAULT_CMS_URL,
          kefu_qq: '',
          currency_name: _DEFAULT_CURRENCY_NAME,
          share_text: _DEFAULT_SHARE_TEXT,
          site_name: _DEFAULT_SITE_NAME,
          buy_card_url: ''
        }
        _appConfigCacheAt = Date.now()
      },
      complete: () => {
        _appConfigPromise = null
        resolve(_appConfigCache)
      }
    })
  })

  return _appConfigPromise
}

// 获取 CMS 接口地址（异步，带缓存）
export async function getCmsUrl() {
  const cfg = await fetchAppConfig()
  return cfg.cms_api_url || _DEFAULT_CMS_URL
}

// 获取客服 QQ 号（异步，带缓存）
export async function getKefuQQ() {
  const cfg = await fetchAppConfig()
  return cfg.kefu_qq || ''
}

// 获取货币名称（异步，带缓存）
export async function getCurrencyName() {
  const cfg = await fetchAppConfig()
  return cfg.currency_name || _DEFAULT_CURRENCY_NAME
}

// 获取帖子分享文案模板（异步，带缓存）
// 模板支持 {title} {link} 占位符，调用方自行替换
export async function getShareText() {
  const cfg = await fetchAppConfig()
  return cfg.share_text || _DEFAULT_SHARE_TEXT
}

// 获取站点名称（异步，带缓存）
export async function getSiteName() {
  const cfg = await fetchAppConfig()
  return cfg.site_name || _DEFAULT_SITE_NAME
}

// 获取购买卡密链接（异步，带缓存）
export async function getBuyCardUrl() {
  const cfg = await fetchAppConfig()
  return cfg.buy_card_url || ''
}

// ═════════════════════════════════════════════
// 调试日志（H5测试时设为true，上线前改回false）
// ═══════════════════════════════════════════════
const DEBUG = false

const _log = {
  request(url, method, data) {
    if (!DEBUG) return
    try { console.log('[API请求]', url, method, data) } catch(e) {}
  },
  response(url, statusCode, body) {
    if (!DEBUG) return
    try { console.log('[API响应]', url, 'Status:', statusCode, 'Body:', JSON.stringify(body, null, 2)) } catch(e) {}
  },
  error(url, err) {
    if (!DEBUG) return
    try { console.error('[API错误]', url, err) } catch(e) {}
  },
  finalUrl(url) {
    if (!DEBUG) return
    try { console.log('[最终URL]', url) } catch(e) {}
  }
}

// PHP 原地址（备用，可切换）
// export const baseUrl = 'https://bbs.wanjisq.cn/API/'

// 优化：添加请求队列和并发控制
const requestQueue = []
const MAX_CONCURRENT_REQUESTS = 3 // 最大并发请求数
let activeRequests = 0

// 请求去重缓存
const requestCache = new Map()
const CACHE_DURATION = 2000 // 缓存2秒

// 获取客服跳转链接（异步）
// 后台配置客服 QQ 后，返回 QQ 临时会话链接：https://wpa.qq.com/msgrd?v=3&uin=xxx
// 后台未配置时返回空字符串，调用方应提示「客服未配置」
export async function getKefuUrl() {
  const qq = await getKefuQQ()
  if (!qq) return ''
  return 'https://wpa.qq.com/msgrd?v=3&uin=' + encodeURIComponent(qq) + '&Site=qq&Menu=yes'
}

export const getUserInfo = () => uni.getStorageSync('userInfo')

export const getToken = () => {
  const token = uni.getStorageSync('token')
  if (token) return token
  const userInfo = uni.getStorageSync('userInfo') || {}
  return userInfo.token || ''
}

export const clearAuth = () => {
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('token')
  uni.removeStorageSync('guest_mode')
}

let forceLogoutPending = false

const messageRules = [
  { pattern: /鐧诲綍鐘舵€佸凡澶辨晥|鐧诲綍宸茶繃鏈?|娌℃湁鐧诲綍鏉冮檺|No login permission|寮哄埗涓嬬嚎|璐﹀彿鐘舵€佸紓甯?/g, value: '登录已过期' },
  { pattern: /缃戠粶杩炴帴澶辫触|缃戠粶寮傚父/g, value: '网络连接失败' },
  { pattern: /鍝嶅簲鏍煎紡寮傚父/g, value: '响应格式异常' },
  { pattern: /涓婁紶鍝嶅簲鏍煎紡寮傚父/g, value: '上传响应格式异常' },
  { pattern: /涓婁紶澶辫触/g, value: '上传失败' },
  { pattern: /鐧诲綍鎴愬姛/g, value: '登录成功' },
  { pattern: /鐧诲綍澶辫触/g, value: '登录失败' },
  { pattern: /缁戝畾鎴愬姛/g, value: '绑定成功' },
  { pattern: /缁戝畾澶辫触/g, value: '绑定失败' },
  { pattern: /鏁版嵁搴撹繛鎺ュ紓甯?/g, value: '数据库连接异常' },
  { pattern: /鏆傛棤鏇存柊/g, value: '暂无更新' },
  { pattern: /鐗堟湰鏌ヨ澶辫触/g, value: '版本查询失败' },
  { pattern: /鏈煡鎿嶄綔/g, value: '未知操作' }
]

export function normalizeServerMessage(msg, fallback = '') {
  let text = String(msg || '').trim()
  if (!text) return fallback

  messageRules.forEach((rule) => {
    text = text.replace(rule.pattern, rule.value)
  })

  text = text.replace(/\?+$/g, '').trim()
  return text || fallback
}

function shouldForceLogout(body = {}) {
  const code = Number(body.code)
  const msg = normalizeServerMessage(body.msg || '')

  if (code === -2) return true
  if (code !== -1) return false

  return [
    '封禁',
    '禁用',
    '没有登录权限',
    '登录已过期',
    '强制下线',
    '账号状态异常'
  ].some(keyword => msg.includes(keyword))
}

function forceLogoutClient(msg = '登录状态已失效') {
  clearAuth()
  if (forceLogoutPending) return
  forceLogoutPending = true

  try {
    uni.showToast({
      title: normalizeServerMessage(msg, '登录状态已失效').slice(0, 20),
      icon: 'none'
    })
  } catch (e) {}

  setTimeout(() => {
    try {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      const currentRoute = pages.length ? String(pages[pages.length - 1].route || '') : ''
      if (currentRoute !== 'pages/login/login') {
        uni.reLaunch({ url: '/pages/login/login' })
      }
    } catch (e) {
      try {
        uni.reLaunch({ url: '/pages/login/login' })
      } catch (err) {}
    } finally {
      setTimeout(() => {
        forceLogoutPending = false
      }, 500)
    }
  }, 120)
}

export function appendFileVersion(url, version = '') {
  const finalUrl = String(url || '').trim()
  if (!finalUrl) return ''

  const finalVersion = String(version || '').trim()
  if (!finalVersion) return finalUrl

  return finalUrl + (finalUrl.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(finalVersion)
}

// 把 /uploads/ 开头的相对路径转成完整 URL
// 上传文件存放在 PHP 后台站点（ht.aiu6.cn），通过该域名访问
// bmsBaseUrl = 'https://ht.aiu6.cn/'
const _uploadOrigin = (() => {
  try {
    return String(bmsBaseUrl).replace(/\/+$/, '') || ''
  } catch (e) {
    return ''
  }
})()

export function resolveFileUrl(url) {
  if (!url) return ''
  const str = String(url)
  if (str.startsWith('http://') || str.startsWith('https://')) return str
  if (str.startsWith('/uploads/')) {
    return _uploadOrigin + str
  }
  return str
}

function safeParseBody(raw) {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    // strip leading BOM so JSON.parse does not fail on server responses
    let text = raw.replace(/^\uFEFF/, '').trim()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch (e) {
      return null
    }
  }
  return null
}

function normalizeApiBody(body) {
  if (!body || typeof body !== 'object') {
    return {
      code: -99,
      msg: '响应格式异常',
      data: null
    }
  }

  const data = body.data

  if (Array.isArray(data)) {
    return {
      ...body,
      msg: normalizeServerMessage(body.msg !== undefined ? body.msg : (body.message || ''), ''),
      data
    }
  }

  const safeData = data && typeof data === 'object' ? data : {}

  return {
    ...body,
    msg: normalizeServerMessage(body.msg !== undefined ? body.msg : (body.message || ''), ''),
    data,
    url: resolveFileUrl(body.url || safeData.url || ''),
    path: resolveFileUrl(body.path || safeData.path || ''),
    cover: resolveFileUrl(body.cover || safeData.cover || ''),
    cover_path: resolveFileUrl(body.cover_path || safeData.cover_path || ''),
    cover_err: body.cover_err || safeData.cover_err || ''
  }
}

export const request = async (url, data = {}, options = {}) => {
  // 优化：请求去重，避免短时间内重复请求
  const cacheKey = `${url}_${JSON.stringify(data)}_${options.method || 'POST'}`
  const now = Date.now()
  
  if (requestCache.has(cacheKey)) {
    const cached = requestCache.get(cacheKey)
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.promise
    }
    requestCache.delete(cacheKey)
  }

  // 创建请求Promise
  const requestPromise = (async () => {
    // 失败时立即清除缓存，避免后续请求拿到 rejected promise
    const cleanupOnFail = () => {
      if (requestCache.has(cacheKey) && requestCache.get(cacheKey).promise === requestPromise) {
        requestCache.delete(cacheKey)
      }
    }
    // 优化：并发控制
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      await new Promise(resolve => {
        requestQueue.push(resolve)
      })
    }

    activeRequests++

    try {
      const token = getToken() || ''
      const sendData = { ...data }

      if (token && !sendData.token) sendData.token = token
      if (!sendData.client_caps) sendData.client_caps = 'rich_v2'
      if (!sendData.client_version) sendData.client_version = '1.0.0'

      // 通过映射表解析Go API路径和方法
      const mapping = resolveApiPath(url, sendData)
      const method = (mapping ? mapping.method : options.method) || 'POST'
      const customBaseUrl = options.baseURL !== undefined ? options.baseURL : baseUrl

      const header = {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: token ? 'Bearer ' + token : '',
        token,
        'Client-Caps': 'rich_v2',
        'Client-Version': '1.0.0',
        'X-Api-Key': apiKey
      }

      // 映射命中时用映射路径（已含路由组前缀），否则回退到旧URL
      const finalUrl = mapping ? (baseUrl + mapping.path) : (customBaseUrl + url)

      _log.request(url, method, sendData)
      _log.finalUrl(finalUrl)

      return new Promise((resolve, reject) => {
        uni.request({
          url: finalUrl,
          method,
          data: sendData,
          header,
          timeout: 30000,
          success: (res) => {
            const body = safeParseBody(res.data)
            _log.response(url, res.statusCode, body)

            if (res.statusCode !== 200) {
              cleanupOnFail()
              const errBody = safeParseBody(res.data)
              const serverMsg = (errBody && (errBody.message || errBody.msg)) || ('HTTP Error ' + res.statusCode)
              return reject({ code: -99, msg: serverMsg, res })
            }

            if (!body || typeof body !== 'object') {
              cleanupOnFail()
              return reject({ code: -99, msg: '响应格式异常', body: res.data })
            }

            const finalBody = normalizeApiBody(body)

            if (shouldForceLogout(finalBody) && !String(finalBody.msg || '').includes('未注册')) {
              if (url !== 'user.php' || sendData.action !== 'register') {
                cleanupOnFail()
                forceLogoutClient(finalBody.msg || '登录状态已失效')
                return reject(finalBody)
              }
            }

            if (finalBody.code === -2 && !String(finalBody.msg || '').includes('未注册')) {
              if (url !== 'user.php' || sendData.action !== 'register') {
                cleanupOnFail()
                clearAuth()
                return reject(finalBody)
              }
            }

            resolve(finalBody)
          },
          fail: (err) => {
            _log.error(url, err)
            cleanupOnFail()
            reject({ code: -99, msg: '网络连接失败', err })
          }
        })
      })
    } finally {
      activeRequests--
      // 处理队列中的下一个请求
      if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
        const nextResolve = requestQueue.shift()
        nextResolve()
      }
    }
  })()

  // 缓存请求Promise
  requestCache.set(cacheKey, {
    promise: requestPromise,
    timestamp: now
  })

  // 清理过期缓存
  setTimeout(() => {
    if (requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey)
      if (now - cached.timestamp >= CACHE_DURATION) {
        requestCache.delete(cacheKey)
      }
    }
  }, CACHE_DURATION)

  return requestPromise
}

function resolveAppFilePath(filePath) {
  return new Promise((resolve, reject) => {
    try {
      if (!filePath) return reject(new Error('empty filePath'))

      const finalPath = String(filePath)

      if (finalPath.startsWith('file://')) return resolve(finalPath)

      if (finalPath.startsWith('content://')) {
        plus.io.resolveLocalFileSystemURL(
          finalPath,
          entry => resolve(entry.toLocalURL()),
          err => reject(err)
        )
        return
      }

      resolve(plus.io.convertLocalFileSystemURL(finalPath))
    } catch (e) {
      reject(e)
    }
  })
}

export const uploadSigned = async ({
  filePath,
  type = 'post',
  group_id = 0,
  extraFormData = {}
}) => {
  const token = getToken() || ''

  const formData = { type, group_id, ...(extraFormData || {}) }
  if (token && !formData.token) formData.token = token
  if (!formData.client_caps) formData.client_caps = 'rich_v2'
  if (!formData.client_version) formData.client_version = '1.0.0'

  const header = {
    Authorization: token ? 'Bearer ' + token : '',
    token,
    'Client-Caps': 'rich_v2',
    'Client-Version': '1.0.0',
    'X-Api-Key': apiKey
  }

  if (!filePath || typeof filePath !== 'string') {
    throw { code: -99, msg: '上传失败，文件路径无效', filePath }
  }

  let finalFilePath = filePath

  // #ifdef APP-PLUS
  try {
    finalFilePath = await resolveAppFilePath(filePath)
  } catch (e) {
    throw { code: -99, msg: '上传失败，无法读取本地文件', err: e, filePath }
  }
  // #endif

  return new Promise((resolve, reject) => {
    const _typeMap = { post: 'post_img', avatar: 'avatar', background: 'background', chat: 'chat_img', software: 'software_img', software_file: 'software_file', disk: 'disk' }
    const uploadUrl = baseUrl + 'upload/' + (_typeMap[type] || 'image')
    console.log('%c[Upload]', 'color:#FF5722;font-weight:bold', 'URL:', uploadUrl, 'Type:', type)

    uni.uploadFile({
      url: uploadUrl,
      filePath: finalFilePath,
      name: 'file',
      formData,
      header,
      timeout: 120000,
      success: (res) => {
        let body = safeParseBody(res.data)
        console.log('%c[Upload响应]', body && body.code === 0 ? 'color:#4CAF50' : 'color:#FF9800', 'Status:', res.statusCode, 'Body:', body)

        if (!body || typeof body !== 'object') {
          return reject({
            code: -99,
            msg: '上传响应格式异常',
            raw: res.data,
            res
          })
        }

        body = normalizeApiBody(body)

        if (body.code !== 0) {
          return reject(body)
        }

        resolve(body)
      },
      fail: (err) => {
        console.error('%c[Upload错误]', 'color:#f44336', err)
        reject({ code: -99, msg: normalizeServerMessage(err?.errMsg || '', '上传失败'), err })
      }
    })
  })
}

export const uploadFile = (arg1, arg2 = {}) => {
  if (typeof arg1 === 'string') {
    const opts = arg2 || {}
    const { type = 'post', group_id = 0, ...rest } = opts
    return uploadSigned({
      filePath: arg1,
      type,
      group_id,
      extraFormData: rest
    })
  }

  const payload = arg1 || {}
  const { extraFormData, ...rest } = payload
  return uploadSigned({
    ...rest,
    extraFormData: extraFormData || {}
  })
}

export const uploadAvatar = async (filePath) => {
  const res = await uploadSigned({ filePath, type: 'avatar', group_id: 0 })
  return res?.url || res?.path || ''
}

export const uploadBackgroundImage = async (filePath) => {
  const res = await uploadSigned({ filePath, type: 'background', group_id: 0 })
  return res?.url || res?.path || ''
}
