<template>
  <view class="hub-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left" @click="goBack">
          <image class="nav-left-svg-img" src="/static/icon/arrow-left-dark.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">聚合应用</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="hub-banner">
      <view class="banner-glow"></view>
      <view class="banner-content">
        <text class="banner-title">应用 · 游戏 · 工具箱</text>
        <text class="banner-desc">海量精品应用游戏，一触即达</text>
      </view>
    </view>

    <view class="section-card" v-for="section in sections" :key="section.title">
      <view class="section-header">
        <view class="section-title-row">
          <view class="section-dot" :class="section.dotClass"></view>
          <text class="section-title">{{ section.title }}</text>
        </view>
        <text class="section-sub">{{ section.subtitle }}</text>
      </view>

      <view class="app-grid">
        <view
          class="app-card"
          v-for="item in section.items"
          :key="item.id"
          @click="openApp(item)"
        >
          <view class="app-icon-wrap" :class="item.iconBg">
            <view class="app-icon-svg">
              <image v-if="item.icon === 'gamepad'" class="app-icon-img" src="/static/icon/gamepad-white.svg" mode="aspectFit" />
              <image v-else-if="item.icon === 'tv'" class="app-icon-img" src="/static/icon/tv-white.svg" mode="aspectFit" />
              <image v-else-if="item.icon === 'video-download'" class="app-icon-img" src="/static/icon/download-white.svg" mode="aspectFit" />
              <image v-else class="app-icon-img" src="/static/icon/info-white.svg" mode="aspectFit" />
            </view>
          </view>
          <view class="app-info">
            <text class="app-name">{{ item.name }}</text>
            <text class="app-desc">{{ item.desc }}</text>
          </view>
          <image class="app-arrow-img" src="/static/icon/chevron-right-gray.svg" mode="aspectFit" />
        </view>
      </view>

      <view v-if="section.items.length === 0" class="empty-row">
        <text class="empty-text">{{ section.emptyText }}</text>
      </view>
    </view>

    <view class="visit-counter">
      <text class="visit-counter-text">本页面使用次数：{{ visitCount }}</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      statusBarHeight: 20,
      visitCount: 1,
      sections: [
        {
          title: '热门游戏',
          subtitle: '休闲娱乐，快乐无限',
          dotClass: 'game',
          emptyText: '精彩游戏即将上线，敬请期待...',
          items: [
            {
              id: 'game-fc',
              icon: 'gamepad',
              name: '小霸王游戏',
              desc: '经典FC游戏，重温童年回忆',
              iconBg: 'orange',
              url: 'https://www.yikm.net/'
            }
          ]
        },
        {
          title: '实用工具',
          subtitle: '让生活更便捷',
          dotClass: 'tool',
          emptyText: '实用工具即将上线，敬请期待...',
          items: [
            {
              id: 'tool-video',
              icon: 'tv',
              name: '全网影视',
              desc: '海量影视资源，免费在线观看',
              iconBg: 'pink',
              url: '/pages/video/video'
            },
            {
              id: 'tool-short-video',
              icon: 'video-download',
              name: '短视频解析',
              desc: '短视频去水印，一键解析下载',
              iconBg: 'blue',
              url: 'https://shuiying.nxux.cn/index.html'
            }
          ]
        }
      ]
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.countVisit()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    countVisit() {
      const key = 'hub_visit_count'
      try {
        let count = uni.getStorageSync(key) || 0
        count = Number(count) + 1
        uni.setStorageSync(key, count)
        this.visitCount = count
      } catch (e) {
        this.visitCount = 1
      }
    },
    openApp(item) {
      if (!item.url) {
        uni.showToast({ title: '即将上线，敬请期待', icon: 'none' })
        return
      }

      // 小霸王游戏跳转原生全屏webview（无导航栏）
      if (item.id === 'game-fc') {
        // #ifdef APP-PLUS
        this.openExternalWebview(item.url, item.name)
        // #endif
        // #ifdef H5
        window.open(item.url, '_blank')
        // #endif
        // #ifdef MP-WEIXIN
        // 小程序不支持外部链接，提示用户
        uni.showToast({ title: '小程序暂不支持外部链接', icon: 'none' })
        // #endif
        return
      }

      if (item.url.startsWith('http')) {
        // #ifdef APP-PLUS
        this.openExternalWebview(item.url, item.name)
        // #endif
        // #ifdef H5
        window.open(item.url, '_blank')
        // #endif
        // #ifdef MP-WEIXIN
        // 小程序使用webview组件打开
        uni.navigateTo({ url: '/pages/webview/webview?url=' + encodeURIComponent(item.url) + '&title=' + encodeURIComponent(item.name || '外部链接') })
        // #endif
        return
      }
      uni.navigateTo({ url: item.url })
    },

    openExternalWebview(url, name) {
      // #ifdef APP-PLUS
      this.destroyGameWebview()
      const webview = plus.webview.create(
        url,
        'hub-external-game',
        {
          top: '0px',
          left: '0px',
          width: '100%',
          height: '100%',
          scalable: true,
          bounce: 'none',
          progress: { color: '#667eea' },
          titleNView: false
        }
      )
      webview.show('slide-in-right', 300)
      this.externalWebview = webview
      // #endif
    },

    destroyGameWebview() {
      // #ifdef APP-PLUS
      if (this.externalWebview) {
        try { this.externalWebview.close() } catch (e) {}
        this.externalWebview = null
      }
      // #endif
    }
  }
}
</script>

<style scoped>
.hub-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 60rpx;
}

/* ── 顶部导航 ── */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  background: rgba(255,255,255,0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1rpx solid rgba(0,0,0,0.04);
}
.nav-content {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
}
.nav-left {
  width: 72rpx;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-left-svg {
  width: 40rpx;
  height: 40rpx;
  color: #111;
}
.nav-left-svg-img { width: 40rpx; height: 40rpx; }
.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111;
  letter-spacing: 0.5rpx;
}
.nav-right {
  width: 72rpx;
}

/* ── 顶部 Banner ── */
.hub-banner {
  margin: 24rpx 24rpx 28rpx;
  padding: 56rpx 40rpx;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 28rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12rpx 32rpx rgba(15, 52, 96, 0.18);
}
.banner-glow {
  position: absolute;
  top: -60rpx;
  right: -60rpx;
  width: 260rpx;
  height: 260rpx;
  background: radial-gradient(circle, rgba(255,107,107,0.35) 0%, rgba(255,107,107,0) 70%);
  border-radius: 50%;
}
.banner-glow::after {
  content: '';
  position: absolute;
  bottom: -80rpx;
  left: -100rpx;
  width: 220rpx;
  height: 220rpx;
  background: radial-gradient(circle, rgba(78,205,196,0.3) 0%, rgba(78,205,196,0) 70%);
  border-radius: 50%;
}
.banner-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.banner-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12rpx;
  text-align: center;
  letter-spacing: 1rpx;
}
.banner-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
  text-align: center;
  letter-spacing: 0.5rpx;
}

/* ── 分组卡片 ── */
.section-card {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx 12rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03);
}
.section-header {
  margin-bottom: 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.section-title-row {
  display: flex;
  align-items: center;
}
.section-dot {
  width: 8rpx;
  height: 28rpx;
  border-radius: 4rpx;
  margin-right: 14rpx;
}
.section-dot.game { background: linear-gradient(180deg, #ff6b6b, #ff8e8e); }
.section-dot.tool { background: linear-gradient(180deg, #4ecdc4, #6ed4cc); }
.section-dot.app { background: linear-gradient(180deg, #667eea, #8a9bf0); }
.section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #111;
  letter-spacing: 0.5rpx;
}
.section-sub {
  font-size: 22rpx;
  color: #b1b3ba;
}

/* ── 应用列表 ── */
.app-grid {
  display: flex;
  flex-direction: column;
}
.app-card {
  display: flex;
  align-items: center;
  padding: 22rpx 8rpx;
  border-radius: 16rpx;
  transition: background 0.15s;
}
.app-card:active {
  background: #f7f7f9;
}
.app-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
/* 柔和的纯色背景 + 微渐变 */
.app-icon-wrap.purple { background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); }
.app-icon-wrap.blue   { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); }
.app-icon-wrap.green  { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); }
.app-icon-wrap.orange { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); }
.app-icon-wrap.pink   { background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%); }
.app-icon-wrap.teal   { background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%); }

/* 微光泽叠加层 */
.app-icon-wrap::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%);
  pointer-events: none;
}

.app-icon-svg {
  width: 48rpx;
  height: 48rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2rpx 4rpx rgba(0,0,0,0.15));
}
.app-icon-svg .app-icon-img {
  width: 100%;
  height: 100%;
}

.app-info {
  flex: 1;
  margin-left: 24rpx;
  min-width: 0;
}
.app-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 6rpx;
  letter-spacing: 0.3rpx;
}
.app-desc {
  display: block;
  font-size: 23rpx;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.app-arrow-img {
  width: 32rpx;
  height: 32rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.empty-row {
  padding: 60rpx 0;
  text-align: center;
}
.empty-text {
  font-size: 24rpx;
  color: #c0c2c8;
}

.visit-counter {
  display: flex;
  justify-content: center;
  padding: 32rpx 0 8rpx;
}
.visit-counter-text {
  font-size: 22rpx;
  color: #c0c2c8;
  letter-spacing: 0.5rpx;
}
</style>
