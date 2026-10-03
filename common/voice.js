/**
 * 语音消息公共工具：录音 / 上传 / 播放
 *
 * 平台差异：
 * - App 端用 uni.getRecorderManager()，输出 mp3（后端白名单里有 mp3，兼容性也最好）
 * - H5 端 uni.getRecorderManager 不存在，改用浏览器 MediaRecorder，输出 webm/opus
 *   （H5 无法直接录 mp3，故 H5 走 webm；两种格式后端都放行）
 *
 * 对外接口保持一致：startRecord / stopRecord / uploadVoice / playVoice / stopVoice
 */
import { uploadFile, baseUrl, apiKey, getToken } from './request.js'

/* ---------------- 录音 ---------------- */
let recorder = null      // App：RecorderManager
let h5Rec = null         // H5：MediaRecorder
let h5Stream = null
let h5Chunks = []
let h5OnStop = null
let h5OnError = null

function getRecorder() {
  if (recorder) return recorder
  try { recorder = uni.getRecorderManager() } catch (e) { recorder = null }
  return recorder
}

function cleanupH5() {
  try { if (h5Stream) h5Stream.getTracks().forEach(t => t.stop()) } catch (e) {}
  h5Rec = null
  h5Stream = null
  h5Chunks = []
}

async function doStartH5() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw { errMsg: '当前浏览器不支持录音，或页面不是 HTTPS' }
    }
    h5Stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    let mime = ''
    for (const t of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) { mime = t; break }
    }
    h5Chunks = []
    const h5Opts = { audioBitsPerSecond: 128000 }
    if (mime) h5Opts.mimeType = mime
    h5Rec = new MediaRecorder(h5Stream, h5Opts)
    h5Rec.ondataavailable = (e) => { if (e.data && e.data.size) h5Chunks.push(e.data) }
    h5Rec.onstop = () => {
      const type = (h5Rec && h5Rec.mimeType) || 'audio/webm'
      const blob = new Blob(h5Chunks, { type: type })
      const url = URL.createObjectURL(blob)
      const fn = h5OnStop
      h5OnStop = null
      h5OnError = null
      cleanupH5()
      fn && fn({ tempFilePath: url, duration: 0, h5: true, mime: type })
    }
    h5Rec.onerror = () => {
      const fn = h5OnError
      h5OnStop = null
      h5OnError = null
      cleanupH5()
      fn && fn({ errMsg: '录音出错' })
    }
    h5Rec.start()
  } catch (e) {
    const fn = h5OnError
    h5OnStop = null
    h5OnError = null
    cleanupH5()
    fn && fn(e)
  }
}

/**
 * 开始录音（同步返回是否已启动；H5 端权限被拒等情况会走 onError）
 * opts: { maxDuration, onStop(res), onError(err) }
 * onStop 回调：App 端有 res.duration（毫秒）；H5 端 duration 为 0，需页面用计时器算
 */
export function startRecord(opts = {}) {
  // #ifdef H5
  h5OnStop = opts.onStop || null
  h5OnError = opts.onError || null
  doStartH5()
  return true
  // #endif
  // #ifndef H5
  const r = getRecorder()
  if (!r) {
    opts.onError && opts.onError({ errMsg: '当前环境不支持录音' })
    return false
  }
  /* RecorderManager 是单例且没有 offXxx，每次都重新挂回调，避免旧页面残留的回调被触发 */
  r.onStop((res) => { opts.onStop && opts.onStop(res) })
  r.onError((err) => { opts.onError && opts.onError(err) })
  try {
    r.start({
      duration: Math.max(1000, Math.min(60000, opts.maxDuration || 60000)),
      /* 采样率和码率尽量贴近手机自带录音的音质：
         16k/48kbps 是"电话音质"，听起来发闷、底噪重；
         44.1k/128kbps 才像正常录音 */
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 128000,
      format: 'mp3'
    })
    return true
  } catch (e) {
    opts.onError && opts.onError(e)
    return false
  }
  // #endif
}

/** 停止录音（正常结束，会触发 onStop） */
export function stopRecord() {
  // #ifdef H5
  try { if (h5Rec && h5Rec.state !== 'inactive') h5Rec.stop() } catch (e) {}
  return
  // #endif
  // #ifndef H5
  try { const r = getRecorder(); r && r.stop() } catch (e) {}
  // #endif
}

/** 页面销毁时清理未结束的 H5 录音 */
export function abortRecord() {
  // #ifdef H5
  try { if (h5Rec && h5Rec.state !== 'inactive') h5Rec.stop() } catch (e) {}
  cleanupH5()
  // #endif
}

/* ---------------- 上传 ---------------- */
/** H5：blob 地址 → FormData 直传（uni.uploadFile 对 blob 的文件名不可控） */
async function uploadVoiceH5(blobUrl, mime) {
  const ext = /mp4/.test(mime || '') ? 'm4a' : (/ogg/.test(mime || '') ? 'ogg' : 'webm')
  const resp = await fetch(blobUrl)
  const blob = await resp.blob()
  const fd = new FormData()
  const token = getToken() || ''
  fd.append('type', 'chat')
  fd.append('group_id', '0')
  if (token) fd.append('token', token)
  fd.append('client_caps', 'rich_v2')
  fd.append('client_version', '1.0.0')
  fd.append('file', blob, 'voice.' + ext)
  const res = await fetch(baseUrl + 'upload/chat_img', {
    method: 'POST',
    headers: {
      Authorization: token ? 'Bearer ' + token : '',
      token: token,
      'Client-Caps': 'rich_v2',
      'Client-Version': '1.0.0',
      'X-Api-Key': apiKey
    },
    body: fd
  })
  const body = await res.json().catch(() => null)
  if (!body || body.code !== 0) {
    throw { msg: (body && (body.msg || body.message)) || '语音上传失败' }
  }
  const d = body.data || {}
  return d.url || d.path || ''
}

/** 上传录音，返回完整 URL；失败抛错 */
export async function uploadVoice(tempFilePath, mime) {
  // #ifdef H5
  return await uploadVoiceH5(tempFilePath, mime)
  // #endif
  // #ifndef H5
  const res = await uploadFile(tempFilePath, { type: 'chat' })
  return (res && (res.url || res.path)) || ''
  // #endif
}

/* ---------------- 播放 ---------------- */
let audio = null
let audioKey = null

/** 播放某条语音。key 用来让页面判断"哪一条在播" */
export function playVoice(url, key, onEnd) {
  stopVoice()
  if (!url) return false
  try {
    const ac = uni.createInnerAudioContext()
    audio = ac
    audioKey = key
    ac.onEnded(() => finish(ac, onEnd))
    ac.onError(() => finish(ac, onEnd))
    ac.src = url
    ac.play()
    return true
  } catch (e) {
    audio = null
    audioKey = null
    return false
  }
}

function finish(ac, onEnd) {
  if (audio === ac) { audio = null; audioKey = null }
  try { ac.destroy() } catch (e) {}
  onEnd && onEnd()
}

/** 停止当前播放 */
export function stopVoice() {
  if (!audio) return
  const ac = audio
  audio = null
  audioKey = null
  try { ac.stop() } catch (e) {}
  try { ac.destroy() } catch (e) {}
}

/* ---------------- 展示相关 ---------------- */
/** 毫秒 → 秒（1~60） */
export function voiceSeconds(durationMs) {
  const s = Math.round(Number(durationMs || 0) / 1000)
  return Math.max(1, Math.min(60, s))
}

/** 语音气泡宽度（rpx）：越长的语音气泡越宽，1 秒最窄、60 秒封顶 */
export function voiceBubbleWidth(durationMs) {
  const s = voiceSeconds(durationMs)
  return Math.min(460, Math.round(160 + (s - 1) * 6))
}
