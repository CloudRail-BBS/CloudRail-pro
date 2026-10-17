/**
 * 语音通话（前端统一入口）
 * ------------------------------------------------------------------
 * 设计：
 *   - 信令走 HTTP（call.php），实时提醒走现有 WS 网关推送的事件
 *   - 声音本身由 callpage（后端直出的 HTML）里的 WebRTC 负责
 *   - 通话界面不再跳页面，而是作为一个「悬浮窗」挂上去：
 *       App：plus.webview 创建的原生子窗体，append 到当前页面
 *       H5 ：append 到 document.body 的 iframe（SPA 里能跨页面一直浮着）
 *     这样「缩小」时把浮窗缩到右下角，就能一边通话一边继续用 App，
 *     点小窗再把通话界面放大回全屏。
 *
 * 注意：这里刻意不走 common/request.js —— 它自带 2 秒请求缓存，
 * 通话轮询会被缓存吃掉、连续两次拨打还会拿到上一次的 call_id。
 */
import ws from '@/common/ws.js'
import { API_BASE } from '@/common/config.js'

// Public client identifier only; never place a server secret in this bundle.
export const API_KEY = 'YOUR-CALL-API-KEY'

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
let overlay = null      // App: plus webview 对象；H5: iframe DOM
let overlayCallId = ''
let lastSigAll = 0      // 轮询已读到的信令最大 id
let watchTimer = null

export function currentCall() { return current }
export function clearCurrentCall() { current = null }
export function isBusy() { return !!current }

/** 组装通话引擎页地址（后端直出 HTML） */
function buildCallUrl(opts) {
  let token = ''
  let myName = ''
  try {
    token = uni.getStorageSync('token') || ''
    const u = uni.getStorageSync('userInfo') || {}
    myName = u.nickname || u.name || ''
  } catch (e) {}
  const q = [
    'api=' + encodeURIComponent(API_BASE),
    'api_key=' + encodeURIComponent(API_KEY),
    'call_id=' + encodeURIComponent(opts.callId),
    'token=' + encodeURIComponent(token),
    'role=' + encodeURIComponent(opts.role === 'callee' ? 'callee' : 'caller'),
    'peer_name=' + encodeURIComponent((opts.peer && opts.peer.name) || '对方'),
    'peer_avatar=' + encodeURIComponent((opts.peer && opts.peer.avatar) || ''),
    'my_name=' + encodeURIComponent(myName)
  ].join('&')
  return API_BASE + 'callpage?' + q
}

/** 挂上通话浮窗。成功返回 true（失败则调用方兜底走通话页） */
function openCallWindow(url, callId) {
  closeCallWindow()
  overlayCallId = callId
  lastSigAll = 0

  // #ifdef APP-PLUS
  try {
    const wv = plus.webview.create(url, 'qixi-call-win', {
      top: '0px',
      left: '0px',
      width: '100%',
      height: '100%',
      background: 'transparent',
      scalable: false,
      titleNView: false,
      bounce: 'none',
      popGesture: 'none'
    })
    /* 必须 append 到当前页面 webview，才能跟着页面一起显示 / 关闭 */
    try {
      const pages = getCurrentPages()
      const cur = pages && pages.length ? pages[pages.length - 1] : null
      const pv = cur && cur.$getAppWebview ? cur.$getAppWebview() : null
      if (pv && pv.append) pv.append(wv)
    } catch (e) {}
    wv.show()
    overlay = wv
    startWatch()
    return true
  } catch (e) {
    overlay = null
  }
  // #endif

  // #ifdef H5
  try {
    const f = document.createElement('iframe')
    /* 关键：allow 里必须有 microphone，否则 iframe 内 getUserMedia 会被权限策略直接拦掉 */
    f.setAttribute('allow', 'microphone; autoplay; camera; display-capture; fullscreen')
    f.setAttribute('allowfullscreen', 'true')
    f.setAttribute('frameborder', '0')
    f.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;border:0;background:#101219;z-index:99999'
    f.src = url
    document.body.appendChild(f)
    overlay = f
    startWatch()
    return true
  } catch (e) {
    overlay = null
  }
  // #endif

  return false
}

/** 关掉通话浮窗 */
export function closeCallWindow() {
  stopWatch()
  // #ifdef APP-PLUS
  try { if (overlay && overlay.close) overlay.close() } catch (e) {}
  // #endif
  // #ifdef H5
  try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay) } catch (e) {}
  // #endif
  overlay = null
  overlayCallId = ''
  lastSigAll = 0
  /* 通知聊天页补拉消息，把「通话记录」卡片显示出来 */
  try { uni.$emit('call_ended') } catch (e) {}
}

/* 通话结束（任一方挂断 / 未接 / 拒接）后自动把浮窗收掉 */
function startWatch() {
  stopWatch()
  watchTimer = setInterval(async () => {
    if (!overlayCallId) return
    try {
      const res = await callApi('poll', { call_id: overlayCallId, after: lastSigAll })
      if (!res || res.code !== 0 || !res.data) return
      const list = res.data.signals || []
      for (let i = 0; i < list.length; i++) {
        const s = list[i]
        const sid = Number(s.id) || 0
        if (sid > lastSigAll) lastSigAll = sid
      }
      if (Number(res.data.status) >= 2) {
        closeCallWindow()
        current = null
      }
    } catch (e) {
      /* 网络抖动忽略，下一轮再试 */
    }
  }, 700)
}

function stopWatch() {
  if (watchTimer) { clearInterval(watchTimer); watchTimer = null }
}

/** 打开通话界面：优先浮窗，创建失败才退回原来的通话页 */
function openCall(opts) {
  const url = buildCallUrl(opts)
  if (openCallWindow(url, opts.callId)) return
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
      openCall({ callId: res.data.call_id, role: 'caller', peer: target })
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
  const c = current
  if (!c) { closeCallWindow(); return }
  try { await callApi('end', { call_id: c.callId }) } catch (e) {}
  current = null
  closeCallWindow()
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
            openCall({ callId: d.call_id, role: 'callee', peer: from })
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
  if (overlayCallId && String(d.call_id) === String(overlayCallId)) closeCallWindow()
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

export default {
  callApi,
  initCall,
  startVoiceCall,
  hangupCurrent,
  currentCall,
  clearCurrentCall,
  isBusy,
  closeCallWindow
}
