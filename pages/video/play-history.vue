<template>
  <view class="play-history-page" :class="themeClass">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-title">
        <text>播放记录</text>
      </view>
      <view class="nav-right">
        <text class="clear-btn" @click="clearAllHistory" v-if="playHistoryList.length > 0">清空</text>
      </view>
    </view>

    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <scroll-view class="content-scroll" scroll-y="true" :style="{ height: scrollHeight + 'px' }">
      <!-- 空状态 -->
      <view v-if="playHistoryList.length === 0" class="empty-state">
        <image src="/static/icon/record.svg" class="empty-icon" mode="aspectFit"></image>
        <text class="empty-text">暂无播放记录</text>
        <text class="empty-hint">快去观看喜欢的影片吧</text>
      </view>

      <!-- 播放记录列表 -->
      <view v-else class="history-list">
        <view 
          class="history-item" 
          v-for="(item, index) in playHistoryList" 
          :key="index"
          @click="playHistoryItem(item)"
        >
          <image class="history-cover" :src="getVideoImageUrl(item.vod_pic)" mode="aspectFill"></image>
          <view class="history-info">
            <text class="history-name">{{ item.vod_name }}</text>
            <text class="history-actors">{{ item.vod_actor || '暂无演员' }}</text>
            <view class="history-progress">
              <text class="progress-text">看到: {{ item.lastPlayEpisode || '第1集' }}</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: (item.progress || 0) + '%' }"></view>
              </view>
              <text class="progress-percent">{{ item.progress || 0 }}%</text>
            </view>
            <text class="history-time">{{ item.lastPlayTime }}</text>
          </view>
          <text class="history-delete" @click.stop="deleteHistoryItem(index)">删除</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getCmsUrl } from '@/common/request.js'

export default {
  data() {
    return {
      // CMS 接口地址（从后端动态获取，启动时填充）
      cmsUrl: '',
      statusBarHeight: 20,
      scrollHeight: 0,
      playHistoryList: []
    }
  },

  onLoad() {
    this.initData()
  },

  onShow() {
    this.loadPlayHistory()
  },

  methods: {
    async initData() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 20
      const navHeight = 44 + this.statusBarHeight
      this.scrollHeight = systemInfo.windowHeight - navHeight
      // 先获取动态 CMS 接口地址
      this.cmsUrl = await getCmsUrl()
    },

    loadPlayHistory() {
      try {
        const history = uni.getStorageSync('playHistory')
        if (history && history.length > 0) {
          this.playHistoryList = history
        } else {
          this.playHistoryList = []
        }
      } catch (e) {
        this.playHistoryList = []
      }
    },

    getVideoImageUrl(url) {
      if (!url) return '/static/logo.png'
      if (url.startsWith('http')) return url
      return this.cmsUrl + url
    },

    goBack() {
      uni.navigateBack()
    },

    playHistoryItem(item) {
      // 跳转到详情页
      uni.navigateTo({
        url: '/pages/video/detail?id=' + item.vod_id
      })
    },

    deleteHistoryItem(index) {
      uni.showModal({
        title: '提示',
        content: '确定删除这条播放记录？',
        success: (res) => {
          if (res.confirm) {
            this.playHistoryList.splice(index, 1)
            this.savePlayHistory()
            uni.showToast({ title: '已删除', icon: 'none' })
          }
        }
      })
    },

    clearAllHistory() {
      uni.showModal({
        title: '提示',
        content: '确定清空所有播放记录？',
        success: (res) => {
          if (res.confirm) {
            this.playHistoryList = []
            this.savePlayHistory()
            uni.showToast({ title: '已清空', icon: 'none' })
          }
        }
      })
    },

    savePlayHistory() {
      try {
        uni.setStorageSync('playHistory', this.playHistoryList)
      } catch (e) {
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.play-history-page {
  min-height: 100vh;
  background-color: var(--cr-surface-alt);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  background-color: var(--cr-surface);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  z-index: 999;
}

.nav-left {
  width: 60rpx;
  height: 44px;
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 48rpx;
  color: var(--cr-text);
  font-weight: 300;
}

.nav-title {
  flex: 1;
  text-align: center;
}

.nav-title text {
  font-size: 34rpx;
  color: var(--cr-text);
  font-weight: bold;
}

.nav-right {
  width: 100rpx;
  display: flex;
  justify-content: flex-end;
}

.clear-btn {
  font-size: 28rpx;
  color: #ff4d4f;
}

.content-scroll {
  width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 32rpx;
  color: var(--cr-text-muted);
  margin-top: 30rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: var(--cr-border-strong);
  margin-top: 16rpx;
}

.history-list {
  padding: 20rpx 30rpx;
}

.history-item {
  display: flex;
  background-color: var(--cr-surface);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  gap: 24rpx;
}

.history-cover {
  width: 160rpx;
  height: 210rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background-color: var(--cr-surface-alt);
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.history-name {
  font-size: 30rpx;
  color: var(--cr-text);
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-actors {
  font-size: 24rpx;
  color: var(--cr-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-progress {
  margin-top: 10rpx;
}

.progress-text {
  font-size: 22rpx;
  color: var(--cr-text-muted);
}

.progress-bar {
  height: 8rpx;
  background-color: #eee;
  border-radius: 4rpx;
  margin-top: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4d4f, #ff7875);
  border-radius: 4rpx;
  transition: width 0.3s;
}

.progress-percent {
  font-size: 20rpx;
  color: #ff4d4f;
  margin-top: 4rpx;
}

.history-time {
  font-size: 22rpx;
  color: var(--cr-border-strong);
  margin-top: auto;
}

.history-delete {
  font-size: 26rpx;
  color: #ff4d4f;
  padding: 10rpx 20rpx;
  flex-shrink: 0;
  align-self: flex-start;
}
</style>
