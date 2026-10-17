<template>
  <view
    v-if="mounted"
    class="online-notify"
    :class="[themeClass, { show: visible }]"
    :style="{ top: topPx }"
    @click="goChat"
  >
    <view class="on-avatar-wrap">
      <image class="on-avatar" :src="cur.avatar || defaultAvatar" mode="aspectFill"></image>
      <view class="on-dot"></view>
    </view>
    <view class="on-body">
      <view class="on-name">{{ cur.nickname || '好友' }}</view>
      <view class="on-desc">上线了，快去和他聊天吧</view>
    </view>
    <view class="on-btn" @click.stop="goChat">去聊天</view>
    <view class="on-close" @click.stop="hide">×</view>
  </view>
</template>

<script>
/**
 * 互关好友上线提醒卡片（全局顶部浮层）
 * 由 common/online-notify.js 通过 uni.$emit('online_notify_show', {...}) 触发。
 * 挂在首页 / 圈子 / 消息 / 我的 / 私聊 5 个页面上，任何页面都能弹。
 */
const AUTO_HIDE_MS = 6000     // 6 秒后自动收起
const SLIDE_MS = 320          // 滑入滑出动画时长，需与样式里的 transition 一致

export default {
  name: 'OnlineNotifyCard',
  data() {
    return {
      mounted: false,
      visible: false,
      cur: {},
      defaultAvatar: '/static/user/user.png',
      topPx: '80px',
      queue: [],
      showTimer: null,
      hideTimer: null,
      closeTimer: null
    }
  },
  created() {
    const info = uni.getSystemInfoSync()
    const sb = info.statusBarHeight || 0
    this.topPx = (sb + 8) + 'px'
    uni.$on('online_notify_show', this.onNotify)
  },
  beforeDestroy() {
    uni.$off('online_notify_show', this.onNotify)
    this.clearTimers()
  },
  methods: {
    onNotify(item) {
      if (!item || !item.uid) return
      const uid = String(item.uid)

      // 同一个人正在展示 → 刷新内容并重新计时，不排队
      if (this.mounted && this.cur.uid === uid) {
        this.cur = { ...item, uid }
        this.restartTimer()
        return
      }
      this.queue.push({ ...item, uid })
      if (!this.mounted) this.showNext()
    },

    showNext() {
      const item = this.queue.shift()
      if (!item) {
        this.mounted = false
        this.visible = false
        return
      }
      this.clearTimers()
      this.cur = item
      this.mounted = true
      this.visible = false
      // 先渲染再切换到 show，保证滑入过渡能触发
      this.showTimer = setTimeout(() => {
        this.showTimer = null
        this.visible = true
      }, 30)
      this.restartTimer()
    },

    restartTimer() {
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null }
      this.hideTimer = setTimeout(() => this.hide(), AUTO_HIDE_MS)
    },

    clearTimers() {
      if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null }
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null }
      if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null }
    },

    hide() {
      if (!this.mounted) return
      this.clearTimers()
      this.visible = false
      this.closeTimer = setTimeout(() => {
        this.closeTimer = null
        this.mounted = false
        if (this.queue.length) setTimeout(() => this.showNext(), 40)
      }, SLIDE_MS)
    },

    goChat() {
      const uid = this.cur.uid
      const name = this.cur.nickname || ''
      const avatar = this.cur.avatar || ''
      this.hide()
      if (!uid) return
      /* 把昵称/头像一起带过去：聊天页是从 URL 参数读对方资料的，
         只传 targetId 会导致顶部昵称/头像和消息头像空白 */
      uni.navigateTo({
        url: '/pages/message/chat?targetId=' + uid +
          '&name=' + encodeURIComponent(name) +
          '&avatar=' + encodeURIComponent(avatar)
      })
    }
  }
}
</script>

<style scoped>
.online-notify {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  z-index: 99999;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 20rpx 22rpx;
  background: var(--cr-surface);
  border-radius: 20rpx;
  box-shadow: 0 10rpx 34rpx rgba(0, 0, 0, 0.14);
  transform: translateY(-200%);
  opacity: 0;
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.32s ease;
}
.online-notify.show {
  transform: translateY(0);
  opacity: 1;
}

.on-avatar-wrap {
  position: relative;
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  margin-right: 18rpx;
}
.on-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: var(--cr-surface-alt);
}
.on-dot {
  position: absolute;
  right: -2rpx;
  bottom: 0;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #07c160;
  border: 3rpx solid #ffffff;
}

.on-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.on-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--cr-text);
  line-height: 38rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.on-desc {
  margin-top: 2rpx;
  font-size: 24rpx;
  color: var(--cr-text-muted);
  line-height: 34rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.on-btn {
  flex-shrink: 0;
  margin-left: 14rpx;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #ff2d55, #ff5c3a);
}
.on-close {
  flex-shrink: 0;
  width: 46rpx;
  height: 46rpx;
  margin-left: 4rpx;
  text-align: center;
  line-height: 42rpx;
  font-size: 36rpx;
  color: #c2c2c2;
}
</style>