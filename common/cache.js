/**
 * SWR (Stale-While-Revalidate) 缓存工具
 *
 * 策略：
 * 1. 命中缓存立即返回（秒开，无 loading 闪烁）
 * 2. 缓存过期则后台静默请求最新数据，到达后通过回调更新 UI
 * 3. 支持事件总线强制失效缓存（发布/登录后立即拉新）
 *
 * 双层缓存：内存缓存（页面切换秒开）+ localStorage 持久化（App 重启秒开）
 */

// 内存缓存
const _memoryCache = new Map()

// 持久化缓存前缀
const _STORAGE_PREFIX = 'swr_cache_'

// 事件总线：key 失效监听
const _listeners = new Map()

// 正在进行的请求（去重，避免并发重复请求同一 key）
const _pendingRequests = new Map()

/**
 * 读取缓存（不触发请求）
 * @param {string} key 缓存 key
 * @returns {{ data: any, timestamp: number } | null}
 */
export function getCache(key) {
  // 1. 内存缓存优先
  if (_memoryCache.has(key)) {
    return _memoryCache.get(key)
  }
  // 2. 回退到持久化缓存
  try {
    const raw = uni.getStorageSync(_STORAGE_PREFIX + key)
    if (raw && raw.timestamp) {
      _memoryCache.set(key, raw)  // 回填内存
      return raw
    }
  } catch (e) {}
  return null
}

/**
 * 写入缓存（内存 + 持久化）
 */
function setCache(key, data) {
  const entry = { data, timestamp: Date.now() }
  _memoryCache.set(key, entry)
  try {
    uni.setStorageSync(_STORAGE_PREFIX + key, entry)
  } catch (e) {}
}

/**
 * SWR 核心：先返回缓存，后台静默刷新
 *
 * @param {string} key 缓存 key（唯一标识一个资源）
 * @param {() => Promise} fetcher 数据获取函数，返回 { code, data, ... }
 * @param {object} options
 * @param {number} options.ttl 缓存有效期（毫秒），默认 30000（30秒）
 * @param {boolean} options.persist 是否持久化到 localStorage，默认 true
 * @param {function} options.onRefresh 后台刷新成功后的回调 (newData) => void
 * @returns {Promise<{ data: any, fromCache: boolean, stale: boolean }>}
 */
export async function swr(key, fetcher, options = {}) {
  const {
    ttl = 30000,
    persist = true,
    onRefresh
  } = options

  const cached = getCache(key)
  const now = Date.now()

  // 情况1：无缓存 → 必须请求
  if (!cached) {
    const result = await fetcher()
    if (result && result.code === 0 && result.data !== undefined) {
      if (persist) setCache(key, result.data)
      else _memoryCache.set(key, { data: result.data, timestamp: now })
    }
    return { data: result && result.data, fromCache: false, stale: false }
  }

  // 情况2：缓存未过期 → 直接返回，不刷新
  if (now - cached.timestamp < ttl) {
    return { data: cached.data, fromCache: true, stale: false }
  }

  // 情况3：缓存已过期 → 先返回旧数据（stale），后台静默刷新
  // 去重：同一 key 同时只允许一个刷新请求
  if (!_pendingRequests.has(key)) {
    const refreshPromise = (async () => {
      try {
        const result = await fetcher()
        if (result && result.code === 0 && result.data !== undefined) {
          if (persist) setCache(key, result.data)
          else _memoryCache.set(key, { data: result.data, timestamp: Date.now() })
          // 触发刷新回调（用于更新 UI）
          if (typeof onRefresh === 'function') {
            try { onRefresh(result.data) } catch (e) {}
          }
          // 触发事件总线监听器
          if (_listeners.has(key)) {
            _listeners.get(key).forEach(cb => {
              try { cb(result.data) } catch (e) {}
            })
          }
        }
      } catch (e) {
        // 刷新失败保持旧数据，不打扰用户
        console.log('[swr] refresh failed:', key, e)
      } finally {
        _pendingRequests.delete(key)
      }
    })()
    _pendingRequests.set(key, refreshPromise)
  }

  return { data: cached.data, fromCache: true, stale: true }
}

/**
 * 强制失效缓存（发布/登录/删除等场景调用）
 * 下次 swr() 调用会立即请求最新数据
 *
 * @param {string} key 缓存 key，支持通配符 '*' 失效所有
 * @param {boolean} triggerRefresh 是否立即触发一次刷新（默认 false）
 */
export function invalidate(key, triggerRefresh = false) {
  if (key === '*') {
    _memoryCache.clear()
    // 清除所有持久化缓存
    try {
      const info = uni.getStorageInfoSync()
      const keys = info.keys || []
      keys.forEach(k => {
        if (k.startsWith(_STORAGE_PREFIX)) uni.removeStorageSync(k)
      })
    } catch (e) {}
    return
  }

  _memoryCache.delete(key)
  try { uni.removeStorageSync(_STORAGE_PREFIX + key) } catch (e) {}

  if (triggerRefresh) {
    // 标记下次访问必须刷新（通过设置 timestamp=0 实现）
    _memoryCache.set(key, { data: null, timestamp: 0 })
  }
}

/**
 * 订阅某个 key 的刷新事件
 * @param {string} key
 * @param {(newData) => void} callback
 * @returns {() => void} 取消订阅函数
 */
export function subscribe(key, callback) {
  if (!_listeners.has(key)) _listeners.set(key, new Set())
  _listeners.get(key).add(callback)
  return () => {
    const set = _listeners.get(key)
    if (set) {
      set.delete(callback)
      if (set.size === 0) _listeners.delete(key)
    }
  }
}

/**
 * 预热缓存（在 App 启动或空闲时调用）
 * @param {string} key
 * @param {() => Promise} fetcher
 */
export async function prefetch(key, fetcher, options = {}) {
  const cached = getCache(key)
  if (cached) return cached.data
  try {
    const result = await fetcher()
    if (result && result.code === 0 && result.data !== undefined) {
      if (options.persist !== false) setCache(key, result.data)
      else _memoryCache.set(key, { data: result.data, timestamp: Date.now() })
      return result.data
    }
  } catch (e) {}
  return null
}

// 预定义的缓存 key（统一管理，避免拼写错误）
export const CACHE_KEYS = {
  DYNAMIC_LIST: 'dynamic_list',           // 动态列表（全部）
  DYNAMIC_FOLLOW: 'dynamic_follow',       // 动态列表（关注）
  MESSAGE_LIST: 'message_list',           // 消息列表
  USER_INFO: 'user_info',                 // 我的页面用户信息
  HOME_POST_LIST: 'home_post_list',       // 首页帖子列表
  BANNER_LIST: 'banner_list',             // 轮播图
  CIRCLE_LIST: 'circle_list'              // 圈子列表
}
