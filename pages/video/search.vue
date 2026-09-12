<template>
  <view class="video-search-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="search-box">
        <image src="/static/icon/sss.png" class="search-icon" mode="aspectFit"></image>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索影片"
          placeholder-class="search-placeholder"
          confirm-type="search"
          @confirm="doSearch"
        />
      </view>
      <view class="search-btn" @click="doSearch">
        <text>搜索</text>
      </view>
    </view>

    <!-- 搜索结果 -->
    <scroll-view class="content-scroll" scroll-y="true" :style="{ height: scrollHeight + 'px' }">
      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-state">
        <text>搜索中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!keyword && !searchHistory.length" class="empty-state">
        <image src="/static/video/search_empty.png" class="empty-icon" mode="aspectFit"></image>
        <text class="empty-text">输入关键词搜索</text>
      </view>

      <!-- 搜索历史 -->
      <view v-else-if="!keyword && searchHistory.length" class="history-section">
        <view class="history-header">
          <text class="history-title">搜索历史</text>
          <text class="clear-history" @click="clearHistory">清空</text>
        </view>
        <view class="history-list">
          <view
            class="history-item"
            v-for="(item, index) in searchHistory"
            :key="index"
            @click="searchHistoryItem(item)"
          >
            <text>{{ item }}</text>
          </view>
        </view>
      </view>

      <!-- 搜索结果列表 -->
      <view v-else-if="resultList.length > 0" class="result-section">
        <view class="result-grid">
          <view class="result-card" v-for="(item, index) in resultList" :key="index" @click="goToDetail(item)">
            <view class="result-cover">
              <image :src="getVideoImageUrl(item.vod_pic)" mode="aspectFill" class="result-img"></image>
              <view class="result-remark" v-if="item.vod_remarks">{{ item.vod_remarks }}</view>
            </view>
            <view class="result-info">
              <text class="result-name">{{ item.vod_name }}</text>
              <text class="result-actor">{{ item.vod_actor || '暂无演员' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 无结果 -->
      <view v-else class="no-result">
        <image src="/static/video/no_result.png" class="empty-icon" mode="aspectFit"></image>
        <text class="empty-text">未找到相关影片</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { baseUrl, getCmsUrl } from '@/common/request.js'

export default {
  data() {
    return {
      // CMS 接口地址（从后端动态获取，启动时填充）
      cmsUrl: '',
      keyword: '',
      isLoading: false,
      searchHistory: [],
      resultList: [],
      scrollHeight: 0
    }
  },

  onLoad() {
    this.initData()
  },

  methods: {
    async initData() {
      const systemInfo = uni.getSystemInfoSync()
      const navHeight = 44 + (systemInfo.statusBarHeight || 0)
      this.scrollHeight = systemInfo.windowHeight - navHeight
      // 先获取动态 CMS 接口地址
      this.cmsUrl = await getCmsUrl()

      this.loadHistory()
    },

    loadHistory() {
      try {
        const history = uni.getStorageSync('video_search_history')
        if (history && Array.isArray(history)) {
          this.searchHistory = history.slice(0, 20)
        }
      } catch (e) {
        this.searchHistory = []
      }
    },

    saveHistory(keyword) {
      if (!keyword) return

      let history = []
      try {
        const saved = uni.getStorageSync('video_search_history')
        if (saved && Array.isArray(saved)) {
          history = saved.filter(item => item !== keyword)
        }
      } catch (e) {}

      history.unshift(keyword)
      this.searchHistory = history.slice(0, 20)

      try {
        uni.setStorageSync('video_search_history', this.searchHistory)
      } catch (e) {}
    },

    clearHistory() {
      uni.showModal({
        title: '提示',
        content: '确定清空搜索历史吗?',
        success: (res) => {
          if (res.confirm) {
            this.searchHistory = []
            try {
              uni.removeStorageSync('video_search_history')
            } catch (e) {}
          }
        }
      })
    },

    getVideoImageUrl(url) {
      if (!url) return '/static/logo.png'
      if (url.startsWith('http')) return url
      return this.cmsUrl + url
    },

    doSearch() {
      if (!this.keyword.trim()) {
        this.resultList = []
        return
      }

      this.saveHistory(this.keyword.trim())
      this.isLoading = true
      this.resultList = []

      // 统一走后端代理，避免 H5 跨域和 APP 直连不稳定
      const url = baseUrl + 'public/video/proxy?url=' + encodeURIComponent(this.cmsUrl + '/api.php/provide/vod/?ac=list&wd=' + encodeURIComponent(this.keyword.trim()))

      uni.request({
        url: url,
        method: 'GET',
        timeout: 20000,
        success: (res) => {
          this.isLoading = false
          if (res.statusCode === 200 && res.data && res.data.code === 1) {
            // 列表接口已返回 vod_pic，无需再调 detail 补封面（避免触发 CMS 429 限流）
            this.resultList = res.data.list || []
          } else {
            const errMsg = (res.data && res.data.msg) ? res.data.msg : '搜索失败'
            uni.showToast({ title: errMsg, icon: 'none', duration: 3000 })
          }
        },
        fail: () => {
          this.isLoading = false
          uni.showToast({ title: '搜索失败', icon: 'none' })
        }
      })
    },

    fetchVideoPics() {
      // 已废弃：列表接口 ac=list 默认返回 vod_pic，无需再调 detail 补封面
      // 保留空方法避免其他地方调用报错
    },

    searchHistoryItem(keyword) {
      this.keyword = keyword
      this.doSearch()
    },

    goToDetail(item) {
      uni.navigateTo({
        url: '/pages/video/detail?id=' + item.vod_id
      })
    },

    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.video-search-page {
  min-height: 100vh;
  background-color: #fff;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 10rpx 20rpx;
  padding-top: calc(10rpx + var(--status-bar-height));
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 99;
}

.nav-back {
  width: 80rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 56rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  height: 60rpx;
  background-color: #f5f5f5;
  border-radius: 30rpx;
  padding: 0 20rpx;
  margin: 0 20rpx;
}

.search-icon {
  width: 32rpx !important;
  height: 32rpx !important;
  margin-right: 10rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  height: 100%;
  line-height: 60rpx;
}

.search-placeholder {
  color: #999;
}

.search-btn {
  width: 80rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn text {
  font-size: 28rpx;
  color: #e53935;
}

.content-scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.loading-state,
.empty-state,
.no-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 150rpx 0;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-state text {
  font-size: 28rpx;
  color: #999;
}

.history-section {
  padding: 30rpx;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.history-title {
  font-size: 30rpx;
  color: #333;
  font-weight: bold;
}

.clear-history {
  font-size: 26rpx;
  color: #999;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.history-item {
  padding: 14rpx 28rpx;
  background-color: #f5f5f5;
  border-radius: 40rpx;
}

.history-item text {
  font-size: 26rpx;
  color: #666;
}

.result-section {
  padding: 20rpx;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

.result-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.result-cover {
  position: relative;
  width: 100%;
  padding-bottom: 135%;
  border-radius: 8rpx;
  overflow: hidden;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.result-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-remark {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
  background-color: rgba(0,0,0,0.7);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
}

.result-info {
  margin-top: 12rpx;
  padding: 0 4rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.result-name {
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-actor {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>