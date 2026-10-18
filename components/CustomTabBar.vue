<template>
  <view class="custom-tab-bar" :class="themeClass" :style="{ paddingBottom: safeAreaBottom + 'px' }">
    <view class="tab-bar-wrapper">
      <view class="tab-bar-panel" :class="{ 'tab-bar-panel--dark': isDarkMode }">
        <view class="tab-bar-content">
          <!-- 首页 -->
          <view
            class="tab-item tab-item-text"
            :class="{ active: current === 0 }"
            @tap="switchTab(0)"
          >
            <text class="tab-text tab-text-large" :class="{ active: current === 0 }">首页</text>
          </view>

          <!-- 圈子 -->
          <view
            class="tab-item tab-item-text"
            :class="{ active: current === 1 }"
            @tap="switchTab(1)"
          >
            <text class="tab-text tab-text-large" :class="{ active: current === 1 }">圈子</text>
          </view>

          <!-- 发布 -->
          <view class="tab-item tab-item-publish" @tap="onPublishClick">
            <view class="publish-btn">
              <text class="publish-plus">+</text>
            </view>
          </view>

          <!-- 消息 -->
          <view
            class="tab-item tab-item-text"
            :class="{ active: current === 2 }"
            @tap="switchTab(2)"
          >
            <view class="text-badge-wrap">
              <text class="tab-text tab-text-large" :class="{ active: current === 2 }">消息</text>
              <view v-if="displayUnreadCount > 0" class="badge-text">{{ displayUnreadCount > 99 ? '99+' : displayUnreadCount }}</view>
            </view>
          </view>

          <!-- 我的 -->
          <view
            class="tab-item tab-item-text"
            :class="{ active: current === 3 }"
            @tap="switchTab(3)"
          >
            <text class="tab-text tab-text-large" :class="{ active: current === 3 }">我</text>
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
      const pages = ['/pages/index/index', '/pages/circle/circle', '/pages/message/message', '/pages/mine/mine'];
      const url = pages[index];
      if (!url) return;
      
      if (index >= 2) {
        const token = uni.getStorageSync('token');
        if (!token) {
          uni.showToast({ title: '请先登录', icon: 'none' });
          setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 800);
          return;
        }
      }
      uni.setStorageSync('last_tab_index', index);
      uni.switchTab({
        url: url,
        fail: () => uni.reLaunch({ url: url })
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
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  min-height: auto;
  max-height: none;
  box-sizing: border-box;
  transform: none;
  z-index: 999;
  /* #ifdef H5 */
  position: fixed;
  /* #endif */
  /* #ifndef H5 */
  position: absolute;
  /* #endif */
}
.tab-bar-wrapper {
  width: 100%;
}
.tab-bar-panel {
  background: var(--cr-glass);
  border-top: 1rpx solid var(--cr-border);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.035);
}
.tab-bar-content {
  display: flex;
  height: 94rpx;
  align-items: center;
  padding: 0 10rpx;
  box-sizing: border-box;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.tab-item-text {
  justify-content: center;
}
.tab-text-large {
  font-size: 28rpx;
  color: var(--cr-text-muted);
  font-weight: 600;
  transition: color 180ms ease, transform 180ms ease;
}
.tab-text-large.active {
  color: var(--cr-text);
  font-weight: 800;
  transform: scale(1.06);
}
.text-badge-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge-text {
  position: absolute;
  top: -10rpx;
  right: -24rpx;
  min-width: 28rpx;
  height: 28rpx;
  background: var(--cr-danger);
  color: #fff;
  font-size: 18rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  font-weight: 700;
}
.tab-item-publish {
  flex: 1;
}
.publish-btn {
  width: 84rpx;
  height: 54rpx;
  background: var(--cr-action);
  border-radius: 18rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.publish-plus {
  color: var(--cr-on-action);
  font-size: 40rpx;
  font-weight: 300;
  line-height: 1;
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