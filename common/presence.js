/**
 * 在线状态工具（实时版）
 * 私聊窗口 / 个人主页 / 会话列表 / 群成员列表 共用
 *
 * 两条数据来源：
 * 1. WebSocket 实时推送（主）：服务端每秒检测一次连接，有人上线/下线立刻广播，
 *    收到后立即写缓存并通知页面，做到秒级更新，不依赖轮询。
 * 2. HTTP 轮询（兜底）：WS 断开时用 chat/online 接口批量查。
 */
import { request } from './request.js'
import ws from './ws.js'

/* 缓存有效期：比各页面的兜底轮询间隔短一点，保证轮询能拿到最新值 */
const CACHE_TTL = 5000

const cache = {}          // uid -> { online, exp }

function setCache(uid, online) {
  uid = String(uid)
  if (!uid) return
  cache[uid] = { online: !!online, exp: Date.now() + CACHE_TTL }
}

/**
 * 处理服务端推来的在线状态
 * @param {Object} data { list: {uid: true|false}, full: 是否为完整在线名单 }
 */
function applyPresence(data) {
  const list = (data && data.list) || {}
  const full = !!(data && data.full)

  Object.keys(list).forEach(u => setCache(u, list[u]))

  if (full) {
    /* 完整名单：没在里面的一律算离线，避免残留旧的「在线」 */
    Object.keys(cache).forEach(u => {
      if (!(u in list)) setCache(u, false)
    })
  }

  uni.$emit('presence_changed', { list, full })
}

/* 服务端广播的 {type:'presence'} 消息 */
ws.on('presence', applyPresence)

/* WS 重连成功后要做两件事：
   1. 清缓存 —— 握手的完整名单会重新打底
   2. 重新发一次 watch —— 服务端在连接断开时就丢掉了关注关系，
      不重发的话重连之后在线状态就不再实时了 */
ws.on('open', () => {
  clearCache()
  resendWatch()
})

/* ---------------- 关注订阅 ----------------
   服务端不再把"谁上线了"广播给所有人（那是 O(n) 的单次事件，量一大必崩），
   只推给显式"关注"了这些人的连接。
   页面调用 fetchOnline(uids) 时会顺便订阅，四个页面不用改代码。 */
const watchSet = {}

function sendWatch(uids) {
  if (!uids.length) return
  ws.send({ type: 'watch', data: { uids } })
}

/** 把新的一批 uid 加进订阅并同步给服务端 */
export function watch(uids) {
  const add = []
  ;(uids || []).forEach(u => {
    u = String(u)
    if (!u || watchSet[u]) return
    watchSet[u] = true
    add.push(u)
  })
  if (!add.length) return
  sendWatch(add)
}

/** 重连后把订阅过的 uid 全部重发一遍 */
function resendWatch() {
  const all = Object.keys(watchSet)
  if (!all.length) return
  /* 分批发，避免一帧太大 */
  for (let i = 0; i < all.length; i += 100) {
    sendWatch(all.slice(i, i + 100))
  }
}

/**
 * 批量查询在线状态（优先用缓存，缺的才发请求）
 *
 * 注意：查询失败时"抛错"，绝不把状态写成离线。
 * 之前失败会走 map={} 的分支，把所有查不到的人都记成 false 并缓存 5 秒，
 * 网络抖一下（或者接口超时）就会把明明在线的人显示成离线 —— 这就是
 * "我明明在线却显示不在线"的根源。调用方 catch 后保留上一次的状态即可。
 *
 * @param {Array<string>} uids
 * @returns {Promise<Object>} { uid: true|false }
 */
export async function fetchOnline(uids) {
  const list = (uids || []).map(u => String(u)).filter(u => u !== '')
  if (!list.length) return {}

  /* 顺便订阅：以后这些人的在线变化服务端会主动推过来 */
  watch(list)

  const now = Date.now()
  const result = {}
  const miss = []
  list.forEach(u => {
    if (cache[u] && cache[u].exp > now) result[u] = cache[u].online
    else miss.push(u)
  })
  if (!miss.length) return result

  const res = await request('message.php', { action: 'getUserOnlineBatch', uids: miss.join(',') }, 'GET').catch(() => null)
  if (!res || res.code !== 0 || !res.data || !res.data.list) {
    throw new Error('online_query_failed')
  }

  const map = res.data.list
  miss.forEach(u => {
    setCache(u, map[u])
    result[u] = !!map[u]
  })
  return result
}

/**
 * 只读本地缓存，不发请求。页面收到 presence_changed 时用它秒改 UI
 * @returns {boolean|null} null 表示本地还不知道
 */
export function getCached(uid) {
  const c = cache[String(uid)]
  return c ? c.online : null
}

/**
 * 查询单个用户是否在线（查询失败时退回本地缓存，不谎报离线）
 */
export async function isOnline(uid) {
  if (!uid) return false
  try {
    const map = await fetchOnline([uid])
    return !!map[String(uid)]
  } catch (e) {
    const c = getCached(uid)
    return c === null ? false : c
  }
}

/**
 * 清空缓存（不传 uid 则全部清空）
 */
export function clearCache(uid) {
  if (uid) delete cache[String(uid)]
  else Object.keys(cache).forEach(k => delete cache[k])
}

export default { fetchOnline, isOnline, getCached, clearCache, watch }