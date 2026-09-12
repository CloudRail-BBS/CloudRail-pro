<template>
  <view class="software-section" :style="{ height: sectionHeight + 'px' }">
    <view class="main-content">
      <!-- 左侧分类列表 - 固定不动 -->
      <view class="category-sidebar">
        <!-- 顶部类型选择器 -->
        <view class="type-selector">
          <view class="type-track">
            <view class="type-slider" :class="{ right: activeType === 1 }"></view>
          </view>
          <view class="type-items">
            <view
              class="type-item"
              :class="{ active: activeType === 0 }"
              @click="switchType(0)"
            >应用</view>
            <view
              class="type-item"
              :class="{ active: activeType === 1 }"
              @click="switchType(1)"
            >游戏</view>
          </view>
        </view>

        <!-- 标签列表 -->
        <scroll-view scroll-y class="tags-scroll" :style="{ height: (sectionHeight - typeSelectorHeight) + 'px' }">
          <view class="tags-section">
            <view class="tags-list">
              <view
                class="tag-item"
                :class="{ active: activeTag === 0 }"
                @click="switchTag(0)"
              >
                <text>{{ activeType === 0 ? '全部应用' : '全部游戏' }}</text>
              </view>
              <view
                v-for="tag in filteredTags"
                :key="'tag-' + tag.id"
                class="tag-item"
                :class="{ active: activeTag === tag.id }"
                @click="switchTag(tag.id)"
              >
                <text>{{ tag.name }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 右侧软件列表 - 独立滚动 -->
      <scroll-view scroll-y class="software-content" :style="{ height: sectionHeight + 'px' }">
        <view v-if="list.length > 0" class="software-list">
          <view class="software-card" v-for="item in list" :key="item.id" @click="goDetail(item.id)">
              <image :src="item.logo || '/static/logo.png'" class="software-logo" mode="aspectFill"></image>
              <view class="software-info">
                <text class="software-name">{{ item.name || '未命名软件' }}</text>
                <view class="rating-version-row">
                  <view class="rating">
                    <image src="/static/icon/star-gold.svg" class="star" mode="aspectFit"></image>
                    <text class="rating-value">{{ item.rating || 0 }}</text>
                  </view>
                  <text class="version">v{{ item.version || '-' }}</text>
                </view>
                <view class="software-meta">
                  <text v-if="item.channel_name" class="channel">{{ item.channel_name }}</text>
                  <text class="download-count">{{ formatCount(item.download_count) }} 下载</text>
                </view>
              </view>
            </view>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <text>暂无{{ activeType === 0 ? '应用' : '游戏' }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { request } from '../common/request.js'

export default {
  name: 'SoftwareLibrarySection',
  props: {
    embedded: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      list: [],
      tags: [],
      activeTag: 0,
      activeType: 0,
      loading: false,
      sectionHeight: 600,       // JS计算出的可用高度(px)
      typeSelectorHeight: 48    // 类型选择器高度(px)，96rpx ≈ 48px
    }
  },
  computed: {
    filteredTags() {
      return this.tags.filter(tag => Number(tag.type) === this.activeType)
    }
  },
  mounted() {
    this.calcHeight()
    // 优化：并行加载标签和列表，减少等待时间
    Promise.allSettled([this.loadTags(), this.getList()])
  },
  methods: {
    calcHeight() {
      const sys = uni.getSystemInfoSync()
      // 父页面导航栏高度 = statusBarHeight + 88px
      let navBarHeight = 108 // 默认值：statusBar(20) + 导航栏(88)
      
      // #ifdef H5
      // H5环境下直接使用系统状态栏高度
      navBarHeight = (sys.statusBarHeight || 0) + 88
      // #endif
      
      // #ifndef H5
      // APP和小程序环境下尝试从页面实例获取
      try {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        if (currentPage && currentPage.$vm && currentPage.$vm.statusBarHeight != null) {
          navBarHeight = currentPage.$vm.statusBarHeight + 88
        } else {
          navBarHeight = (sys.statusBarHeight || 20) + 88
        }
      } catch (e) {
        navBarHeight = (sys.statusBarHeight || 20) + 88
      }
      // #endif
      
      this.sectionHeight = sys.windowHeight - navBarHeight
    },
    async loadTags() {
      try {
        const res = await request('software.php', { action: 'get_tags' })
        if (res.code === 0) {
          this.tags = Array.isArray(res.data) ? res.data : []
        }
      } catch (e) {
      }
    },
    async getList() {
      this.loading = true
      try {
        const data = { action: 'get_list' }
        if (this.activeTag > 0) data.tag_id = this.activeTag
        if (this.activeType >= 0) data.type = this.activeType
        const res = await request('software.php', data)
        if (res.code === 0) {
          this.list = Array.isArray(res.data) ? res.data : []
        } else {
          this.list = []
        }
      } catch (e) {
        this.list = []
      } finally {
        this.loading = false
      }
    },
    switchType(type) {
      const next = Number(type || 0)
      if (next === this.activeType) return
      this.activeType = next
      this.activeTag = 0
      this.getList()
    },
    switchTag(tagId) {
      const next = Number(tagId || 0)
      if (next === this.activeTag) return
      this.activeTag = next
      this.getList()
    },
    formatCount(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return 0
      if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
      return num
    },
    handleDownload(item) {
      if (!item.id) return
      uni.showToast({ title: '开始下载...', icon: 'none' })
      request('software.php', { action: 'download', id: item.id }).then(res => {
        if (res.code === 0 && res.data?.download_url) {
          uni.setClipboardData({
            data: res.data.download_url,
            success: () => {
              uni.showToast({ title: '下载链接已复制', icon: 'success' })
            }
          })
        } else {
          uni.showToast({ title: res.msg || '获取链接失败', icon: 'none' })
        }
      }).catch(() => {
        uni.showToast({ title: '网络异常', icon: 'none' })
      })
    },
    goDetail(id) {
      if (!id) return
      uni.navigateTo({ url: '/pages/software/detail?id=' + id })
    }
  }
}
</script>

<style scoped>
.software-section {
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
}

/* 主内容区域 */
.main-content {
  display: flex;
  height: 100%;
  background: #ffffff;
}

/* 左侧分类侧边栏 - 固定不动 */
.category-sidebar {
  width: 280rpx;
  background: #ffffff;
  border-right: 1rpx solid #f0f0f0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 类型选择器 - 固定在顶部 */
.type-selector {
  height: 96rpx;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
  position: relative;
}

.type-track {
  position: absolute;
  top: 20rpx;
  left: 24rpx;
  right: 24rpx;
  height: 64rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
}

.type-slider {
  position: absolute;
  top: 0rpx;
  left: 0rpx;
  width: calc(50% + 10rpx);
  height: 64rpx;
  background: #ffffff;
  border-radius: 32rpx;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.type-slider.right {
  transform: translateX(calc(100% - 20rpx));
}

.type-items {
  position: relative;
  z-index: 1;
  display: flex;
  height: 64rpx;
  justify-content: space-around;
}

.type-item {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 500;
  color: #999999;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.type-item.active {
  color: #000000;
  font-weight: 600;
}

/* 标签滚动容器 - 高度由JS动态计算 */
.tags-scroll {
}

/* 标签区域 */
.tags-section {
  padding: 12rpx 0;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tag-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22rpx 20rpx;
  font-size: 30rpx;
  color: #666666;
  font-weight: 400;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0 32rpx 32rpx 0;
  margin-left: 8rpx;
}

.tag-item.active {
  background: #3b82f6;
  color: #ffffff;
  font-weight: 500;
}

.tag-item:active {
  transform: scale(0.96);
}

/* 右侧软件内容 - 高度由JS动态计算 */
.software-content {
  flex: 1;
  min-width: 0;
  width: 0;
  background: #fafafa;
  /* 确保底部留出空间，不被tabbar遮挡 */
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* 软件列表 */
.software-list {
  padding: 20rpx 24rpx 20rpx 16rpx;
}

.software-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04),
              0 1rpx 3rpx rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1rpx solid #f8fafc;
}

.software-card:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.06),
              0 1rpx 2rpx rgba(0, 0, 0, 0.04);
  border-color: #e2e8f0;
}

.software-card:hover {
  box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.08),
              0 2rpx 6rpx rgba(0, 0, 0, 0.06);
}

.software-logo {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  flex-shrink: 0;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
}

.software-card:active .software-logo {
  transform: scale(0.95);
}

.software-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.software-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 10rpx;
}

.software-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 26rpx;
  color: #64748b;
  margin-bottom: 8rpx;
  overflow: hidden;
  white-space: nowrap;
  flex-wrap: nowrap;
}

.rating-version-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.rating .star {
  width: 26rpx;
  height: 26rpx;
  display: inline-block;
  vertical-align: middle;
}

.rating .rating-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #f59e0b;
}

.version {
  font-size: 26rpx;
  font-weight: 500;
  color: #94a3b8;
}

.channel {
  color: #3b82f6;
  font-weight: 500;
  padding: 4rpx 12rpx;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8rpx;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.size {
  color: #94a3b8;
  padding: 4rpx 12rpx;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 8rpx;
}

.download-count {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  font-weight: 500;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 30rpx;
}

.empty-state::before {
  content: '';
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 50%;
  position: absolute;
  opacity: 0.5;
}

/* 嵌入模式样式 */
.software-section.embedded {
  padding-bottom: 28rpx;
}

.software-section.embedded .main-content {
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

.software-section.embedded .type-selector {
  padding: 4rpx;
  height: 76rpx;
}

.software-section.embedded .type-track {
  top: 4rpx;
  left: 4rpx;
  right: 4rpx;
  height: 68rpx;
  border-radius: 38rpx;
}

.software-section.embedded .type-slider {
  border-radius: 34rpx;
  width: 50%;
  left: 0;
  top: 0;
  height: 68rpx;
}

.software-section.embedded .type-slider.right {
  transform: translateX(100%);
}

.software-section.embedded .type-items {
  height: 68rpx;
  justify-content: stretch;
  gap: 0;
}

.software-section.embedded .type-item {
  height: 68rpx;
  flex: 1;
  font-size: 28rpx;
  font-weight: 400;
}

.software-section.embedded .type-item.active {
  font-weight: 500;
}

.software-section.embedded .category-sidebar {
  width: 230rpx;
  padding: 0;
}

.software-section.embedded .category-item {
  padding: 20rpx 20rpx;
  font-size: 32rpx;
  border-radius: 0 56rpx 56rpx 0;
}

.software-section.embedded .software-card {
  padding: 20rpx;
  margin-bottom: 16rpx;
  gap: 20rpx;
}

.software-section.embedded .software-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
}

.software-section.embedded .software-name {
  font-size: 30rpx;
  margin-bottom: 8rpx;
}

.software-section.embedded .software-meta {
  font-size: 24rpx;
  gap: 12rpx;
}

</style>
