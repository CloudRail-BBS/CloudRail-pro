<template>
  <view class="topic-page" :class="themeClass">
    <!-- 自定义导航栏 -->
    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <view class="nav-title-wrap">
        <text class="nav-title">#{{ topicName }}</text>
      </view>
      <view class="nav-right"></view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'dynamic' }"
        @click="switchTab('dynamic')"
      >
        <text class="tab-text">动态</text>
        <view class="tab-underline" v-if="activeTab === 'dynamic'"></view>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'post' }"
        @click="switchTab('post')"
      >
        <text class="tab-text">帖子</text>
        <view class="tab-underline" v-if="activeTab === 'post'"></view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="topic-scroll"
      :show-scrollbar="false"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :lower-threshold="120"
    >
      <view class="topic-body">
        <!-- 动态 Tab -->
        <DynamicFeed v-if="activeTab === 'dynamic'" ref="topicFeed" :topic="topicName" />

        <!-- 帖子 Tab -->
        <view v-else class="post-list">
          <view v-if="postLoading && postList.length === 0" class="empty-data">加载中...</view>
          <view v-else-if="postList.length === 0" class="empty-data">暂无相关帖子</view>
          <block v-else>
            <view
              class="post-card"
              v-for="p in postList"
              :key="'p-'+p.id"
              @click="goPostDetail(p.id)"
            >
              <view class="post-author-row">
                <image :src="p.avatar || '/static/logo.png'" class="post-avatar" mode="aspectFill"></image>
                <text class="post-author-name">{{ p.name || p.username || '用户' }}</text>
                <text class="post-time">{{ formatPostTime(p.create_time) }}</text>
              </view>
              <text class="post-title" v-if="p.title">{{ p.title }}</text>
              <text class="post-content" v-if="p.content">{{ p.content }}</text>
              <view class="post-images" v-if="parseImages(p.images).length > 0">
                <image
                  v-for="(img, idx) in parseImages(p.images).slice(0, 3)"
                  :key="idx"
                  :src="img"
                  class="post-thumb"
                  mode="aspectFill"
                ></image>
              </view>
              <view class="post-stats-row">
                <text class="post-stat">{{ p.comment_count }} 评论</text>
                <text class="post-stat">{{ p.view_count }} 浏览</text>
              </view>
            </view>
          </block>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import DynamicFeed from '../../components/DynamicFeed.vue'
import { request } from '../../common/request.js'

export default {
  components: { DynamicFeed },
  data() {
    return {
      statusBarHeight: 20,
      topicName: '',
      isRefreshing: false,
      activeTab: 'dynamic',
      postList: [],
      postLoading: false,
      postLoaded: false
    }
  },
  onLoad(opt) {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
    this.topicName = decodeURIComponent(opt.name || '')
    if (!this.topicName) {
      uni.showToast({ title: '话题不存在', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1000)
    }
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },
    switchTab(tab) {
      if (this.activeTab === tab) return
      this.activeTab = tab
      if (tab === 'post' && !this.postLoaded) {
        this.loadPosts()
      }
    },
    loadMore() {
      if (this.activeTab === 'dynamic') {
        if (this.$refs.topicFeed) this.$refs.topicFeed.loadMore()
      }
    },
    async onRefresh() {
      this.isRefreshing = true
      try {
        if (this.activeTab === 'dynamic') {
          if (this.$refs.topicFeed) await this.$refs.topicFeed.onRefresh()
        } else {
          await this.loadPosts(true)
        }
      } finally {
        this.isRefreshing = false
      }
    },
    async loadPosts(isRefresh = false) {
      if (!this.topicName) return
      this.postLoading = true
      try {
        const res = await request('post.php', { action: 'search', topic: this.topicName }, 'GET')
        if (res.code === 0) {
          this.postList = Array.isArray(res.data) ? res.data : []
          this.postLoaded = true
        } else {
          if (isRefresh) this.postList = []
        }
      } catch (e) {
      } finally {
        this.postLoading = false
      }
    },
    parseImages(images) {
      if (!images) return []
      if (Array.isArray(images)) return images
      const text = String(images).trim()
      if (!text) return []
      if (text.startsWith('[')) {
        try {
          const arr = JSON.parse(text)
          return Array.isArray(arr) ? arr : []
        } catch (e) {}
      }
      return text.split(',').map(s => s.trim()).filter(Boolean)
    },
    formatPostTime(t) {
      if (!t) return ''
      const d = new Date(String(t).replace(/-/g, '/'))
      if (isNaN(d.getTime())) return ''
      const now = new Date()
      const diff = (now - d) / 1000
      if (diff < 60) return '刚刚'
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
      if (diff < 86400 * 30) return Math.floor(diff / 86400) + '天前'
      const mm = (d.getMonth() + 1).toString().padStart(2, '0')
      const dd = d.getDate().toString().padStart(2, '0')
      return `${mm}-${dd}`
    },
    goPostDetail(id) {
      uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${id}` })
    }
  }
}
</script>

<style scoped>
.topic-page {
  min-height: 100vh;
  background: var(--cr-canvas);
}
.custom-nav-bar {
  position: fixed; top: 0; left: 0; width: 100%;
  z-index: 100;
  background: var(--cr-surface);
  border-bottom: 1rpx solid var(--cr-border);
  display: flex;
  align-items: center;
  height: 88rpx;
}
.nav-back {
  width: 80rpx; height: 88rpx;
  display: flex; align-items: center; justify-content: center;
}
.nav-back-icon {
  font-size: 56rpx; color: var(--cr-text); line-height: 1;
  margin-left: 10rpx;
}
.nav-title-wrap {
  flex: 1; display: flex; align-items: center; justify-content: center;
}
.nav-title {
  font-size: 32rpx; font-weight: 700; color: #2b6cb0;
  max-width: 400rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nav-right { width: 80rpx; }

.tab-bar {
  display: flex;
  background: var(--cr-surface);
  border-bottom: 1rpx solid var(--cr-border);
  position: sticky;
  top: 88rpx;
  z-index: 90;
}
.tab-item {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.tab-text {
  font-size: 28rpx;
  color: var(--cr-text-muted);
}
.tab-item.active .tab-text {
  color: #2b6cb0;
  font-weight: 600;
  font-size: 30rpx;
}
.tab-underline {
  position: absolute;
  bottom: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #2b6cb0;
}

.topic-scroll {
  height: calc(100vh - 88rpx - 80rpx);
}
.topic-body { padding: 20rpx 24rpx 0; }

/* 帖子卡片 */
.post-card {
  background: var(--cr-surface);
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}
.post-author-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.post-avatar {
  width: 56rpx; height: 56rpx;
  border-radius: 50%;
  background: var(--cr-surface-alt);
  margin-right: 16rpx;
  flex-shrink: 0;
}
.post-author-name {
  font-size: 26rpx;
  color: var(--cr-text);
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post-time {
  font-size: 22rpx;
  color: var(--cr-text-muted);
}
.post-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  margin-bottom: 12rpx;
}
.post-content {
  display: block;
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.post-images {
  display: flex;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.post-thumb {
  width: 200rpx;
  height: 200rpx;
  border-radius: 10rpx;
  background: #f3f4f6;
  flex-shrink: 0;
}
.post-stats-row {
  display: flex;
  gap: 24rpx;
}
.post-stat {
  font-size: 22rpx;
  color: var(--cr-text-muted);
}

.empty-data {
  text-align: center;
  padding: 100rpx 40rpx;
  color: var(--cr-text-muted);
  font-size: 26rpx;
}
</style>
