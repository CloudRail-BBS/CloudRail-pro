/**
 * 语音通话（前端统一入口）
 * ------------------------------------------------------------------
 * 设计：
 *   - 信令走 HTTP（call.php），实时提醒走现有 WS 网关推送的事件
 *   - 声音本身由 call.html 里的 WebRTC 负责（App 端用 web-view 打开它）
 *
 * 注意：这里刻意不走 common/request.js —— 它自带 2 秒请求缓存，
 * 通话轮询会被缓存吃掉、连续两次拨打还会拿到上一次的 call_id。
 */
import ws from '@/common/ws.js'
import { API_BASE } from '@/common/config.js'

export const API_KEY = 'YOUR-API-KEY'

/** 直接打后端（带 token / api key），不做缓存、不进并发队列 */
export function callApi(action, data = {}) {
  let token = ''
  try { token = uni.getStorageSync('token') || '' } catch (e) {}
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE + 'call/' + action,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        token: token,
        Authorization: token ? 'Bearer ' + token : '',
        'X-Api-Key': API_KEY
      },
      data: Object.assign({ token: token }, data),
      success: (res) => resolve(res.data || {}),
      fail: (err) => reject(err)
    })
  })
}

function myInfo() {
  try { return uni.getStorageSync('userInfo') || {} } catch (e) { return {} }
}

let inited = false
let current = null      // { callId, peer:{uid,name,avatar}, role }
let inviting = false

export function currentCall() { return current }
export function clearCurrentCall() { current = null }
export function isBusy() { return !!current }

function openCallPage(opts) {
  const q = [
    'call_id=' + encodeURIComponent(opts.callId),
    'role=' + (opts.role === 'callee' ? 'callee' : 'caller'),
    'peer_name=' + encodeURIComponent((opts.peer && opts.peer.name) || '对方'),
    'peer_avatar=' + encodeURIComponent((opts.peer && opts.peer.avatar) || '')
  ].join('&')
  uni.navigateTo({ url: '/pages/message/call?' + q })
}

/** 发起语音通话 */
export async function startVoiceCall(peer) {
  if (!peer || !peer.uid) return
  if (current || inviting) {
    uni.showToast({ title: '正在通话中', icon: 'none' })
    return
  }
  const me = myInfo()
  if (String(peer.uid) === String(me.uid || me.id || '')) {
    uni.showToast({ title: '不能给自己打电话', icon: 'none' })
    return
  }
  inviting = true
  uni.showLoading({ title: '正在呼叫…' })
  try {
    const res = await callApi('invite', { toUid: peer.uid })
    uni.hideLoading()
    if (res && res.code === 0 && res.data && res.data.call_id) {
      const target = {
        uid: String(peer.uid),
        name: peer.name || (res.data && res.data.to_name) || '对方',
        avatar: peer.avatar || ''
      }
      current = { callId: res.data.call_id, peer: target, role: 'caller' }
      openCallPage({ callId: res.data.call_id, role: 'caller', peer: target })
    } else {
      uni.showToast({ title: (res && (res.msg || res.message)) || '呼叫失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '呼叫失败，请稍后重试', icon: 'none' })
  }
  inviting = false
}

/** 挂断当前这通（页面里也能挂，这里是兜底） */
export async function hangupCurrent() {
  if (!current) return
  const c = current
  const action = c.connected ? 'end' : 'cancel'
  try { await callApi(action, { call_id: c.callId }) } catch (e) {}
  current = null
}

/** 收到来电 */
function onInvite(d) {
  if (!d || !d.call_id) return
  const from = {
    uid: String(d.from_uid || ''),
    name: d.from_name || '好友',
    avatar: d.from_avatar || ''
  }
  /* 已经在通话中：直接帮对方拒掉，别让两边铃声打架 */
  if (current) {
    callApi('answer', { call_id: d.call_id, accept: 0 }).catch(() => {})
    return
  }

  uni.showModal({
    title: '语音通话',
    content: from.name + ' 邀请你语音通话',
    confirmText: '接听',
    cancelText: '拒接',
    success: async (r) => {
      if (r.confirm) {
        try {
          const res = await callApi('answer', { call_id: d.call_id, accept: 1 })
          if (res && res.code === 0) {
            current = { callId: d.call_id, peer: from, role: 'callee' }
            openCallPage({ callId: d.call_id, role: 'callee', peer: from })
          } else {
            uni.showToast({ title: (res && (res.msg || res.message)) || '接听失败', icon: 'none' })
          }
        } catch (e) {
          uni.showToast({ title: '接听失败，请稍后重试', icon: 'none' })
        }
        return
      }
      try { await callApi('answer', { call_id: d.call_id, accept: 0 }) } catch (e) {}
    }
  })
}

/** 对方挂断 / 取消 / 拒接 */
function onPeerEnd(d) {
  if (!d) return
  if (current && String(d.call_id) === String(current.callId)) current = null
}

/** 初始化（App.vue onLaunch 里调一次即可） */
export function initCall() {
  if (inited) return
  inited = true
  try {
    ws.on('call_invite', onInvite)
    ws.on('call_end', onPeerEnd)
  } catch (e) {}
}

export default { callApi, initCall, startVoiceCall, hangupCurrent, currentCall, clearCurrentCall, isBusy }
