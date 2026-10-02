/**
 * 互相关注好友「上线提醒」
 * ------------------------------------------------------------------
 * 数据来源：common/presence.js 里的 presence_changed 事件（服务端 WS 每秒
 * 检测连接，有人上线/下线立刻广播，见 ws-server/server.php 的 broadcastPresence）。
 *
 * 逻辑：
 *   1. 先拉一次互相关注列表（user.php 的 mutual action）作为白名单，缓存 5 分钟
 *   2. 只有白名单里的好友「离线 → 在线」才提醒
 *   3. 握手时的完整名单(full=true)只用来打底，不提醒
 *      —— 否则一进 App 就会把当前所有在线的互关好友刷一遍
 *   4. 同一个好友 30 分钟内只提醒一次，避免网络抖动重复弹
 *   5. 命中后 uni.$emit('online_notify_show', {uid, nickname, avatar})，
 *      由 components/OnlineNotifyCard.vue 负责展示
 */
import { request } from './request.js'

const MUTUAL_TTL      = 5 * 60 * 1000    // 互关名单缓存 5 分钟
const NOTIFY_COOLDOWN = 30 * 60 * 1000   // 同一个好友 30 分钟内只提醒一次

let started = false
let mutualMap = {}          // uid -> { uid, nickname, avatar }
let mutualExp = 0
let mutualLoading = null
const lastNotify = {}       // uid -> 上次提醒时间戳

/**
 * 拉取互相关注好友名单（带缓存）
 * @param {boolean} force 是否强制刷新
 */
function loadMutual(force) {
  const now = Date.now()
  if (!force && mutualExp > now && Object.keys(mutualMap).length) {
    return Promise.resolve(mutualMap)
  }
  if (mutualLoading) return mutualLoading

  mutualLoading = request('user.php', { action: 'mutual' }, 'GET')
    .then(res => {
      mutualLoading = null
      const list = (res && res.code === 0 && res.data && res.data.list) || []
      const map = {}
      list.forEach(u => {
        const uid = String((u && u.uid) || '')
        if (!uid) return
        map[uid] = {
          uid,
          nickname: u.nickname || u.name || u.username || '好友',
          /* user.php 的 userPublic() 里头像已过 fullUrl()，是绝对地址，直接用 */
          avatar: u.avatar || ''
        }
      })
      mutualMap = map
      mutualExp = Date.now() + MUTUAL_TTL
      return map
    })
    .catch(() => {
      mutualLoading = null
      return mutualMap
    })

  return mutualLoading
}

/** presence_changed 回调：{ list: {uid: true|false}, full?: boolean } */
function onPresence(payload) {
  if (!started) return
  const data = payload || {}
  if (data.full) return          // 握手快照只打底，不提醒

  const list = data.list || {}
  const onlineUids = Object.keys(list).filter(u => list[u])
  if (!onlineUids.length) return

  loadMutual().then(map => {
    const now = Date.now()
    onlineUids.forEach(uid => {
      uid = String(uid)
      const f = map[uid]
      if (!f) return
      if (now - (lastNotify[uid] || 0) < NOTIFY_COOLDOWN) return
      lastNotify[uid] = now
      uni.$emit('online_notify_show', f)
    })
  })
}

/**
 * 启动上线提醒（幂等，App.vue 的 onShow 可反复调用）
 */
export function startOnlineNotify() {
  loadMutual()
  if (started) return
  started = true
  uni.$on('presence_changed', onPresence)
}

export default { startOnlineNotify }