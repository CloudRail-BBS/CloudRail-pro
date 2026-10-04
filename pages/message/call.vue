<template>
  <view class="call-page">
    <!-- App：web-view 加载通话引擎页 -->
    <!-- #ifdef APP-PLUS -->
    <web-view v-if="url" :src="url"></web-view>
    <!-- #endif -->

    <!-- H5：自己建 iframe（必须带 allow="microphone"，否则浏览器连麦克风授权都不给弹） -->
    <view v-if="url" class="call-holder"></view>

    <view v-if="!url" class="call-loading">
      <text>正在准备通话…</text>
    </view>
  </view>
</template>

<script>
import { API_BASE } from '../../common/config.js'
import { callApi, clearCurrentCall, API_KEY } from '../../common/call.js'

export default {
  data() {
    return {
      url: '',
      callId: '',
      pollTimer: null,
      closing: false
    }
  },
  onLoad(opt = {}) {
    this.callId = opt.call_id || ''
    if (!this.callId) {
      uni.showToast({ title: '通话参数缺失', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 800)
      return
    }

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
      'call_id=' + encodeURIComponent(this.callId),
      'token=' + encodeURIComponent(token),
      'role=' + encodeURIComponent(opt.role === 'callee' ? 'callee' : 'caller'),
      'peer_name=' + encodeURIComponent(decodeURIComponent(opt.peer_name || '')),
      'peer_avatar=' + encodeURIComponent(decodeURIComponent(opt.peer_avatar || '')),
      'my_name=' + encodeURIComponent(myName)
    ].join('&')
    /* 通话页由后端直接输出：<API_BASE>callpage */
    this.url = API_BASE + 'callpage?' + q

    // #ifdef H5
    this.$nextTick(() => this.mountH5Frame())
    // #endif

    this.watchEnd()
  },
  onUnload() {
    // #ifdef H5
    this.unmountH5Frame()
    // #endif
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    clearCurrentCall()
  },
  methods: {
    /* H5：手动挂一个允许麦克风的 iframe */
    mountH5Frame() {
      // #ifdef H5
      if (this._iframe || !this.url) return
      try {
        const f = document.createElement('iframe')
        /* 关键：allow 里必须有 microphone，否则 iframe 内 getUserMedia 会被权限策略直接拦掉 */
        f.setAttribute('allow', 'microphone; autoplay; camera; display-capture; fullscreen')
        f.setAttribute('allowfullscreen', 'true')
        f.setAttribute('frameborder', '0')
        f.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;border:0;background:#101219;z-index:1'
        f.src = this.url
        document.body.appendChild(f)
        this._iframe = f
      } catch (e) {
        uni.showToast({ title: '通话页加载失败', icon: 'none' })
      }
      // #endif
    },
    unmountH5Frame() {
      // #ifdef H5
      try {
        if (this._iframe && this._iframe.parentNode) this._iframe.parentNode.removeChild(this._iframe)
      } catch (e) {}
      this._iframe = null
      // #endif
    },
    /* 通话页跑在 iframe/web-view 里，组件内拿不到它的状态，
       这里轮询一次通话状态，结束后自动关掉本页 */
    watchEnd() {
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = setInterval(async () => {
        if (this.closing) return
        try {
          const res = await callApi('poll', { call_id: this.callId, after: 0 })
          if (res && res.code === 0 && res.data && Number(res.data.status) >= 2) {
            this.closePage()
          }
        } catch (e) {
          /* 网络抖动忽略，下一轮再试 */
        }
      }, 1500)
    },
    closePage() {
      if (this.closing) return
      this.closing = true
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      clearCurrentCall()
      setTimeout(() => {
        uni.navigateBack({
          fail: () => {
            uni.switchTab({ url: '/pages/message/message' })
          }
        })
      }, 900)
    }
  }
}
</script>

<style scoped>
.call-page {
  width: 100%;
  height: 100vh;
  background: #101219;
}
.call-holder {
  width: 100%;
  height: 100vh;
}
.call-loading {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa1b2;
  font-size: 28rpx;
  background: #101219;
}
</style>
