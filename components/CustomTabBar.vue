<template>
  <view class="custom-tab-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
    <view class="tab-bar-wrapper">
      <view class="tab-bar-panel" :class="{ 'tab-bar-panel--dark': isDarkMode }">
        <view class="tab-bar-content">
          <!-- 首页 -->
          <view
            class="tab-item"
            :class="{ active: current === 0 }"
            @tap="switchTab(0)"
          >
            <view class="tab-icon-wrap">
              <view class="icon-house" :class="{ 'icon-house--active': current === 0 }">
                <view class="house-roof"></view>
                <view class="house-body"></view>
              </view>
            </view>
            <text class="tab-text" :class="{ active: current === 0 }">首页</text>
          </view>

          <!-- 圈子 -->
          <view
            class="tab-item"
            :class="{ active: current === 1 }"
            @tap="switchTab(1)"
          >
            <view class="tab-icon-wrap">
              <view class="icon-circle" :class="{ 'icon-circle--active': current === 1 }">
                <view class="circle-ring"></view>
                <view class="circle-dot"></view>
              </view>
            </view>
            <text class="tab-text" :class="{ active: current === 1 }">圈子</text>
          </view>

          <!-- 中间发布按钮 -->
          <view
            class="tab-item center-item"
            @click="onPublishClick"
            @touchstart="onPublishPress"
            @touchend="onPublishRelease"
            @touchcancel="onPublishRelease"
          >
            <view class="publish-button" :class="{ 'publish-pressed': publishPressed }">
              <view class="publish-glow"></view>
              <view class="publish-inner">
                <view class="publish-plus">
                  <view class="plus-h"></view>
                  <view class="plus-v"></view>
                </view>
              </view>
            </view>
          </view>

          <!-- 消息 -->
          <view
            class="tab-item"
            :class="{ active: current === 2 }"
            @tap="switchTab(2)"
          >
            <view class="tab-icon-wrap">
              <view class="icon-message" :class="{ 'icon-message--active': current === 2 }">
                <view class="msg-bubble">
                  <view class="msg-eye eye-l"></view>
                  <view class="msg-eye eye-r"></view>
                </view>
                <view class="msg-tail"></view>
              </view>
              <view v-if="displayUnreadCount > 0" class="badge">{{ displayUnreadCount > 99 ? '99+' : displayUnreadCount }}</view>
            </view>
            <text class="tab-text" :class="{ active: current === 2 }">消息</text>
          </view>

          <!-- 我的 -->
          <view
            class="tab-item"
            :class="{ active: current === 3 }"
            @tap="switchTab(3)"
          >
            <view class="tab-icon-wrap">
              <view class="icon-user" :class="{ 'icon-user--active': current === 3 }">
                <view class="user-head"></view>
                <view class="user-body"></view>
              </view>
            </view>
            <text class="tab-text" :class="{ active: current === 3 }">我的</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomTabBar',
  props: {
    current: { type: Number, default: 0 },
    unreadCount: { type: Number, default: 0 }
  },
  data() {
    return {
      safeAreaBottom: 0,
      localUnreadCount: 0,
      // 默认亮色；仅在真正深色环境才为 true
      isDarkMode: false,
      publishPressed: false
    };
  },
  computed: {
    displayUnreadCount() {
      return this.unreadCount > 0 ? this.unreadCount : this.localUnreadCount;
    }
  },
  mounted() {
    const sysInfo = uni.getSystemInfoSync();
    this.safeAreaBottom = sysInfo.safeAreaInsets?.bottom || 0;
    this.checkDarkMode(sysInfo);
    this.updateUnreadCount();
    uni.$on('message_unread_updated', this.updateUnreadCount);
  },
  beforeDestroy() {
    uni.$off('message_unread_updated', this.updateUnreadCount);
    this.removeDarkModeListener();
  },
  methods: {
    checkDarkMode(sysInfo) {
      // #ifdef H5
      try {
        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this._darkModeHandler = (e) => { this.isDarkMode = e.matches; };
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this._darkModeHandler);
      } catch (e) {
        this.isDarkMode = false;
      }
      // #endif

      // #ifdef APP-PLUS
      // 修复：原逻辑把安卓误判为深色模式，导致底栏变黑。
      // 正确做法：读取系统主题设置，只有系统真正处于深色时才启用。
      try {
        const sys = sysInfo || uni.getSystemInfoSync();
        // 优先使用系统返回的 theme 字段（iOS/Android 均支持）
        // 值为 'dark' 时才是深色，其余（'light' / undefined）一律亮色
        this.isDarkMode = String(sys.theme || '').toLowerCase() === 'dark';
      } catch (e) {
        this.isDarkMode = false;
      }
      // #endif

      // #ifdef MP-WEIXIN
      try {
        const sys = sysInfo || uni.getSystemInfoSync();
        this.isDarkMode = String(sys.theme || '').toLowerCase() === 'dark';
      } catch (e) {
        this.isDarkMode = false;
      }
      // #endif
    },
    removeDarkModeListener() {
      // #ifdef H5
      if (this._darkModeHandler) {
        try {
          window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this._darkModeHandler);
        } catch (e) {}
      }
      // #endif
    },
    updateUnreadCount() {
      const globalUnread = uni.getStorageSync('global_message_unread') || 0;
      this.localUnreadCount = Number(globalUnread);
    },
    onPublishPress() {
      this.publishPressed = true;
    },
    onPublishRelease() {
      this.publishPressed = false;
    },
    switchTab(index) {
      if (this.current === index) return;
      if (index >= 2) {
        const token = uni.getStorageSync('token');
        if (!token) {
          uni.showToast({ title: '请先登录', icon: 'none' });
          setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 800);
          return;
        }
      }
      const pages = ['/pages/index/index', '/pages/circle/circle', '/pages/message/message', '/pages/mine/mine'];
      uni.setStorageSync('last_tab_index', index);
      uni.switchTab({
        url: pages[index],
        fail: () => uni.reLaunch({ url: pages[index] })
      });
      this.$emit('change', index);
    },
    onPublishClick() {
      const token = uni.getStorageSync('token');
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 800);
        return;
      }
      this.$emit('publish');
    }
  }
};
</script>

<style scoped>
.custom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
}

.tab-bar-wrapper {
  margin: 0 16rpx;
  padding-bottom: 10rpx;
}

/* 亮色（默认）：纯白面板 */
.tab-bar-panel {
  width: 100%;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.07);
}

/* 深色：仅当系统真正深色时启用 */
.tab-bar-panel--dark {
  background: #1c1c1e;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.45);
}

.tab-bar-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-around;
  min-height: 76rpx;
  padding: 8rpx 2rpx;
  -webkit-touch-callout: none;
}

/* ========== Tab 项 ========== */
.tab-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 6rpx 0;
  user-select: none;
  -webkit-user-select: none;
}

.center-item {
  flex: 0 0 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0;
}

.tab-icon-wrap {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ========== 纯 CSS 图标 - 首页(房子) ========== */
.icon-house {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.house-roof {
  position: absolute;
  top: 2rpx;
  width: 0;
  height: 0;
  border-left: 18rpx solid transparent;
  border-right: 18rpx solid transparent;
  border-bottom: 16rpx solid #8a8a8a;
  transition: border-bottom-color 0.15s ease;
}
.house-body {
  position: absolute;
  bottom: 2rpx;
  width: 28rpx;
  height: 22rpx;
  border: 3rpx solid #8a8a8a;
  border-top: none;
  border-radius: 0 0 4rpx 4rpx;
  transition: border-color 0.15s ease;
}
.icon-house--active .house-roof {
  border-bottom-color: #ff2442;
}
.icon-house--active .house-body {
  border-color: #ff2442;
}

/* ========== 纯 CSS 图标 - 圈子(双圆环) ========== */
.icon-circle {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.circle-ring {
  position: absolute;
  width: 30rpx;
  height: 30rpx;
  border: 3rpx solid #8a8a8a;
  border-radius: 50%;
  transition: border-color 0.15s ease;
}
.circle-dot {
  position: absolute;
  width: 8rpx;
  height: 8rpx;
  background: #8a8a8a;
  border-radius: 50%;
  transition: background 0.15s ease;
}
.icon-circle--active .circle-ring {
  border-color: #ff2442;
}
.icon-circle--active .circle-dot {
  background: #ff2442;
}

/* ========== 纯 CSS 图标 - 消息(气泡) ========== */
.icon-message {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.msg-bubble {
  width: 34rpx;
  height: 24rpx;
  background: #8a8a8a;
  border-radius: 8rpx;
  position: relative;
  transition: background 0.15s ease;
}

.msg-eye {
  position: absolute;
  width: 4rpx;
  height: 4rpx;
  background: #fff;
  border-radius: 50%;
  top: 10rpx;
}
.msg-eye.eye-l { left: 9rpx; }
.msg-eye.eye-r { left: 21rpx; }

.msg-tail {
  position: absolute;
  bottom: 6rpx;
  left: 9rpx;
  width: 0;
  height: 0;
  border-left: 5rpx solid transparent;
  border-right: 5rpx solid transparent;
  border-top: 7rpx solid #8a8a8a;
  transition: border-top-color 0.15s ease;
}

.icon-message--active .msg-bubble {
  background: #ff2442;
}
.icon-message--active .msg-tail {
  border-top-color: #ff2442;
}

/* ========== 纯 CSS 图标 - 我的(人形) ========== */
.icon-user {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
}
.user-head {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  border: 3rpx solid #8a8a8a;
  transition: border-color 0.15s ease;
}
.user-body {
  width: 26rpx;
  height: 16rpx;
  border: 3rpx solid #8a8a8a;
  border-bottom: none;
  border-radius: 12rpx 12rpx 0 0;
  transition: border-color 0.15s ease;
}
.icon-user--active .user-head {
  border-color: #ff2442;
}
.icon-user--active .user-body {
  border-color: #ff2442;
}

/* ========== 文字 ========== */
.tab-text {
  font-size: 18rpx;
  color: #8a8a8a;
  margin-top: 4rpx;
  font-weight: 500;
  transition: color 0.15s ease;
}

.tab-text.active {
  color: #ff2442;
  font-weight: 700;
}

/* ========== 发布按钮 ========== */
.publish-button {
  width: 88rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #ff8a9f 0%, #ff2442 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 8rpx 20rpx rgba(255, 36, 66, 0.4),
    0 0 0 2rpx rgba(255,255,255,0.2),
    inset 0 1rpx 0 rgba(255,255,255,0.5);
  transition: transform 0.2s ease;
}

.publish-button.publish-pressed {
  transform: scale(0.88);
}

.publish-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, transparent 55%);
  border-radius: 50%;
}

.publish-inner {
  position: relative;
  width: 38rpx;
  height: 38rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.publish-plus {
  position: relative;
  width: 26rpx;
  height: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-h {
  position: absolute;
  width: 24rpx;
  height: 4rpx;
  background: #fff;
  border-radius: 2rpx;
}

.plus-v {
  position: absolute;
  width: 4rpx;
  height: 24rpx;
  background: #fff;
  border-radius: 2rpx;
}

/* ========== 消息角标 ========== */
.badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 28rpx;
  height: 28rpx;
  background: #ff2442;
  color: #fff;
  font-size: 16rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  font-weight: 700;
}

@media screen and (min-width: 769px) {
  .custom-tab-bar {
    max-width: 600px;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* 深色模式：只有系统真正深色时才会命中 */
@media (prefers-color-scheme: dark) {
  .tab-bar-panel {
    background: #1c1c1e;
  }
  .tab-text {
    color: rgba(255,255,255,0.45);
  }
  .tab-text.active {
    color: #ff8a9f;
  }
  .house-roof {
    border-bottom-color: rgba(255,255,255,0.5);
  }
  .house-body {
    border-color: rgba(255,255,255,0.5);
  }
  .icon-house--active .house-roof {
    border-bottom-color: #ff8a9f;
  }
  .icon-house--active .house-body {
    border-color: #ff8a9f;
  }
  .circle-ring {
    border-color: rgba(255,255,255,0.5);
  }
  .circle-dot {
    background: rgba(255,255,255,0.5);
  }
  .icon-circle--active .circle-ring {
    border-color: #ff8a9f;
  }
  .icon-circle--active .circle-dot {
    background: #ff8a9f;
  }
  .msg-bubble {
    background: rgba(255,255,255,0.5);
  }
  .msg-tail {
    border-top-color: rgba(255,255,255,0.5);
  }
  .icon-message--active .msg-bubble {
    background: #ff8a9f;
  }
  .icon-message--active .msg-tail {
    border-top-color: #ff8a9f;
  }
  .user-head {
    border-color: rgba(255,255,255,0.5);
  }
  .user-body {
    border-color: rgba(255,255,255,0.5);
  }
  .icon-user--active .user-head {
    border-color: #ff8a9f;
  }
  .icon-user--active .user-body {
    border-color: #ff8a9f;
  }
}
</style>
<style>
/* 全局隐藏原生 tabBar */
uni-tabbar,
.uni-tabbar,
#tabbar,
.uniTabBar {
  display: none !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>