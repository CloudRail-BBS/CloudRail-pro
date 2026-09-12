<template>
  <view class="app-detail-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">
        <image src="/static/icon/arrow-left-blue.svg" class="back-icon" mode="aspectFit"></image>
      </view>
      <text class="nav-title">应用详情</text>
      <view class="nav-share" @click="shareApp">
        <image src="/static/icon/share-blue.svg" class="share-icon" mode="aspectFit"></image>
      </view>
    </view>
    <view class="app-header">
      <image :src="appInfo.icon" class="app-icon" mode="aspectFill"></image>
      <view class="app-basic-info">
        <text class="app-name">{{ appInfo.name }}</text>
        <text class="app-slogan">{{ appInfo.slogan }}</text>
        <view class="app-meta">
          <text class="app-category">{{ appInfo.category }}</text>
          <text class="app-size">{{ appInfo.size }}</text>
        </view>
        <view class="app-rating">
          <image src="/static/icon/stars-5-gold.svg" class="stars" mode="aspectFit"></image>
          <text class="rating-score">{{ appInfo.rating }}</text>
          <text class="rating-count">({{ appInfo.ratingCount }}个评分)</text>
        </view>
      </view>
    </view>

    <!-- 下载按钮区域 -->
    <view class="download-section">
      <view class="download-info">
        <text class="download-count">{{ appInfo.downloads }}次下载</text>
        <text class="app-version">版本 {{ appInfo.version }}</text>
      </view>
      <button 
        class="download-btn" 
        :class="{ downloaded: isDownloaded, downloading: isDownloading }"
        @click="handleDownload"
        :disabled="isDownloading"
      >
        <text v-if="isDownloading">{{ downloadProgress }}%</text>
        <text v-else-if="isDownloaded">打开</text>
        <text v-else>获取</text>
      </button>
    </view>

    <view class="screenshots-section">
      <text class="section-title">预览</text>
      <scroll-view scroll-x class="screenshots-scroll" :show-scrollbar="false">
        <view class="screenshots-list">
          <image 
            v-for="(screenshot, index) in appInfo.screenshots" 
            :key="index"
            :src="screenshot" 
            class="screenshot-item" 
            mode="aspectFill"
            @click="previewScreenshot(index)"
          ></image>
        </view>
      </scroll-view>
    </view>

    <view class="description-section">
      <text class="section-title">应用介绍</text>
      <view class="description-content" :class="{ expanded: isDescExpanded }">
        <text class="description-text">{{ appInfo.description }}</text>
      </view>
      <text class="expand-btn" @click="isDescExpanded = !isDescExpanded">
        {{ isDescExpanded ? '收起' : '展开' }}
      </text>
    </view>
    <view class="info-section">
      <text class="section-title">信息</text>
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">开发者</text>
          <text class="info-value">{{ appInfo.developer }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">大小</text>
          <text class="info-value">{{ appInfo.size }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">类别</text>
          <text class="info-value">{{ appInfo.category }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">兼容性</text>
          <text class="info-value">{{ appInfo.compatibility }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">语言</text>
          <text class="info-value">{{ appInfo.language }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">年龄分级</text>
          <text class="info-value">{{ appInfo.ageRating }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">Copyright</text>
          <text class="info-value">{{ appInfo.copyright }}</text>
        </view>
      </view>
    </view>

    <view class="reviews-section">
      <view class="reviews-header">
        <text class="section-title">评价</text>
        <text class="reviews-count">{{ appInfo.ratingCount }}个评分</text>
      </view>
      <view class="rating-overview">
        <view class="rating-big">
          <text class="big-score">{{ appInfo.rating }}</text>
          <image src="/static/icon/stars-5-gold.svg" class="big-stars" mode="aspectFit"></image>
        </view>
        <view class="rating-bars">
          <view class="rating-bar" v-for="i in 5" :key="i">
            <text class="bar-label">{{ 6 - i }}星</text>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: getRatingBarWidth(6 - i) + '%' }"></view>
            </view>
          </view>
        </view>
      </view>
      
      <view class="reviews-list">
        <view class="review-item" v-for="(review, index) in reviews" :key="index">
          <view class="review-header">
            <image :src="review.avatar" class="reviewer-avatar" mode="aspectFill"></image>
            <view class="reviewer-info">
              <text class="reviewer-name">{{ review.name }}</text>
              <view class="review-rating">
                <image src="/static/icon/stars-5-gold.svg" class="review-stars" mode="aspectFit"></image>
                <text class="review-date">{{ review.date }}</text>
              </view>
            </view>
          </view>
          <text class="review-title">{{ review.title }}</text>
          <text class="review-content">{{ review.content }}</text>
          <view class="review-actions">
            <text class="review-helpful">{{ review.helpful }}人觉得有用</text>
            <view class="review-btns">
              <image src="/static/icon/thumbs-up-gray.svg" class="review-btn-icon" @click="likeReview(index)" mode="aspectFit"></image>
              <text class="review-btn" @click="reportReview(index)">举报</text>
            </view>
          </view>
        </view>
      </view>
      
      <button class="more-reviews-btn" @click="showMoreReviews">查看全部评价</button>
    </view>

    <!-- 类似应用 -->
    <view class="similar-section">
      <text class="section-title">类似应用</text>
      <view class="similar-list">
        <view class="similar-item" v-for="(app, index) in similarApps" :key="index" @click="goAppDetail(app.id)">
          <image :src="app.icon" class="similar-icon" mode="aspectFill"></image>
          <view class="similar-info">
            <text class="similar-name">{{ app.name }}</text>
            <text class="similar-category">{{ app.category }}</text>
            <view class="similar-rating">
              <image src="/static/icon/stars-5-gold.svg" class="similar-stars" mode="aspectFit"></image>
              <text class="similar-score">{{ app.rating }}</text>
            </view>
          </view>
          <button class="similar-btn" :class="{ downloaded: app.isDownloaded }" @click.stop="downloadSimilarApp(app)">
            {{ app.isDownloaded ? '打开' : '获取' }}
          </button>
        </view>
      </view>
    </view>

    <view style="height: 40rpx;"></view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      statusBarHeight: 44,
      isDownloaded: false,
      isDownloading: false,
      downloadProgress: 0,
      isDescExpanded: false,
      appInfo: {
        id: 1,
        name: '时光社',
        slogan: '记录美好生活，分享精彩瞬间',
        icon: '/static/logo.png',
        category: '社交',
        size: '156.8 MB',
        rating: '4.9',
        ratingCount: '12.8万',
        downloads: '2,580万',
        version: '3.2.1',
        developer: '时光科技有限公司',
        compatibility: 'iOS 12.0 或更高版本',
        language: '简体中文、繁体中文、英文',
        ageRating: '12+',
        copyright: '© 2024 时光科技',
        description: '时光社是一款专注于记录和分享生活的社交应用。在这里，你可以：\n\n• 发布图文、视频动态，记录生活点滴\n• 发现有趣的内容和志同道合的朋友\n• 参与话题讨论，分享你的观点和故事\n• 创建和加入兴趣圈子，找到你的同好\n• 使用丰富的滤镜和编辑工具，让内容更精彩\n\n我们致力于打造一个温暖、真实、有趣的社区，让每个人都能找到属于自己的时光。',
        screenshots: [
          '/static/app/screen1.jpg',
          '/static/app/screen2.jpg',
          '/static/app/screen3.jpg',
          '/static/app/screen4.jpg',
          '/static/app/screen5.jpg'
        ]
      },
      reviews: [
        {
          name: '小明同学',
          avatar: '/static/avatar1.jpg',
          rating: 5,
          date: '2024-01-15',
          title: '非常好用的社交应用！',
          content: '界面设计很清新，功能也很实用。特别喜欢圈子功能，认识了很多志同道合的朋友。强烈推荐！',
          helpful: 234
        },
        {
          name: '摄影爱好者',
          avatar: '/static/avatar2.jpg',
          rating: 5,
          date: '2024-01-12',
          title: '滤镜效果很棒',
          content: '作为一个摄影爱好者，这里的滤镜和编辑工具真的很专业。发布照片后获得了很多点赞和评论，很有成就感。',
          helpful: 189
        },
        {
          name: '旅行达人',
          avatar: '/static/avatar3.jpg',
          rating: 4,
          date: '2024-01-10',
          title: '不错的记录工具',
          content: '用来记录旅行点滴很方便，界面简洁易用。希望后续能增加更多地图和定位相关的功能。',
          helpful: 156
        }
      ],
      similarApps: [
        {
          id: 2,
          name: '小红书',
          category: '社交',
          icon: '/static/app/xhs.png',
          rating: '4.9',
          isDownloaded: true
        },
        {
          id: 3,
          name: '抖音',
          category: '娱乐',
          icon: '/static/app/douyin.png',
          rating: '4.8',
          isDownloaded: false
        },
        {
          id: 4,
          name: '微博',
          category: '社交',
          icon: '/static/app/weibo.png',
          rating: '4.6',
          isDownloaded: true
        },
        {
          id: 5,
          name: '豆瓣',
          category: '社交',
          icon: '/static/app/douban.png',
          rating: '4.7',
          isDownloaded: false
        }
      ]
    }
  },
  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight

    if (options.id) {
   
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    shareApp() {
      uni.showActionSheet({
        itemList: ['分享给好友', '分享到朋友圈', '复制链接'],
        success: (res) => {
          uni.showToast({
            title: '分享成功',
            icon: 'success'
          })
        }
      })
    },
    handleDownload() {
      if (this.isDownloaded) {
        uni.showToast({
          title: '正在打开应用...',
          icon: 'none'
        })
      } else if (!this.isDownloading) {
        this.isDownloading = true
        this.downloadProgress = 0
        
        // 模拟下载进度
        const timer = setInterval(() => {
          this.downloadProgress += Math.floor(Math.random() * 15) + 5
          if (this.downloadProgress >= 100) {
            this.downloadProgress = 100
            clearInterval(timer)
            setTimeout(() => {
              this.isDownloading = false
              this.isDownloaded = true
              uni.showToast({
                title: '下载完成',
                icon: 'success'
              })
            }, 500)
          }
        }, 200)
      }
    },
    previewScreenshot(index) {
      uni.previewImage({
        current: this.appInfo.screenshots[index],
        urls: this.appInfo.screenshots
      })
    },
    getRatingBarWidth(star) {
      // 模拟评分分布数据
      const distribution = {
        5: 75,
        4: 15,
        3: 6,
        2: 3,
        1: 1
      }
      return distribution[star] || 0
    },
    likeReview(index) {
      uni.showToast({
        title: '点赞成功',
        icon: 'none'
      })
    },
    reportReview(index) {
      uni.showActionSheet({
        itemList: ['垃圾广告', '不当内容', '虚假评价', '其他原因'],
        success: (res) => {
          uni.showToast({
            title: '举报成功',
            icon: 'success'
          })
        }
      })
    },
    showMoreReviews() {
      uni.showToast({
        title: '查看更多评价',
        icon: 'none'
      })
    },
    goAppDetail(id) {
      uni.navigateTo({
        url: `/pages/app-detail/app-detail?id=${id}`
      })
    },
    downloadSimilarApp(app) {
      if (app.isDownloaded) {
        uni.showToast({
          title: '打开应用',
          icon: 'none'
        })
      } else {
        uni.showLoading({ title: '下载中...' })
        setTimeout(() => {
          uni.hideLoading()
          app.isDownloaded = true
          uni.showToast({
            title: '下载完成',
            icon: 'success'
          })
        }, 1500)
      }
    }
  }
}
</script>

<style scoped>
.app-detail-page {
  background: #f5f5f7;
  min-height: 100vh;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx 20rpx;
  background: #fff;
}

.nav-back, .nav-share {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon, .share-icon {
  width: 40rpx;
  height: 40rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #000;
}

/* 应用头部信息 */
.app-header {
  display: flex;
  padding: 30rpx;
  background: #fff;
  gap: 30rpx;
}

.app-icon {
  width: 180rpx;
  height: 180rpx;
  border-radius: 40rpx;
  flex-shrink: 0;
}

.app-basic-info {
  flex: 1;
  min-width: 0;
}

.app-name {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #000;
  margin-bottom: 8rpx;
}

.app-slogan {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.app-meta {
  display: flex;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.app-category, .app-size {
  font-size: 22rpx;
  color: #999;
}

.app-rating {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stars {
  width: 120rpx;
  height: 24rpx;
}

.rating-score {
  font-size: 26rpx;
  font-weight: 600;
  color: #000;
}

.rating-count {
  font-size: 22rpx;
  color: #999;
}

/* 下载区域 */
.download-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx 30rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.download-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.download-count {
  font-size: 24rpx;
  color: #666;
}

.app-version {
  font-size: 22rpx;
  color: #999;
}

.download-btn {
  width: 160rpx;
  height: 64rpx;
  line-height: 64rpx;
  background: #007AFF;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 32rpx;
  padding: 0;
  margin: 0;
  border: none;
}

.download-btn.downloaded {
  background: #f5f5f7;
  color: #007AFF;
}

.download-btn.downloading {
  background: #E3F2FD;
  color: #007AFF;
}

/* 截图区域 */
.screenshots-section {
  background: #fff;
  padding: 30rpx 0;
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #000;
  padding: 0 30rpx;
  margin-bottom: 20rpx;
}

.screenshots-scroll {
  white-space: nowrap;
}

.screenshots-list {
  display: flex;
  padding: 0 30rpx;
  gap: 16rpx;
}

.screenshot-item {
  width: 280rpx;
  height: 560rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: #f5f5f7;
}

/* 应用介绍 */
.description-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.description-content {
  max-height: 200rpx;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.description-content.expanded {
  max-height: none;
}

.description-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
  white-space: pre-line;
}

.expand-btn {
  display: block;
  font-size: 24rpx;
  color: #007AFF;
  margin-top: 16rpx;
}

/* 应用信息 */
.info-section {
  background: #fff;
  padding: 30rpx 0;
  margin-bottom: 20rpx;
}

.info-list {
  padding: 0 30rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f7;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 24rpx;
  color: #666;
}

.info-value {
  font-size: 24rpx;
  color: #333;
  max-width: 400rpx;
  text-align: right;
}

/* 评价区域 */
.reviews-section {
  background: #fff;
  padding: 30rpx 0;
  margin-bottom: 20rpx;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30rpx;
  margin-bottom: 20rpx;
}

.reviews-count {
  font-size: 24rpx;
  color: #999;
}

.rating-overview {
  display: flex;
  padding: 0 30rpx 30rpx;
  gap: 40rpx;
  border-bottom: 1rpx solid #f5f5f7;
}

.rating-big {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.big-score {
  font-size: 72rpx;
  font-weight: bold;
  color: #000;
}

.big-stars {
  width: 140rpx;
  height: 28rpx;
}

.rating-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.rating-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.bar-label {
  font-size: 20rpx;
  color: #999;
  width: 40rpx;
}

.bar-track {
  flex: 1;
  height: 8rpx;
  background: #f5f5f7;
  border-radius: 4rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #FFB800;
  border-radius: 4rpx;
}

/* 评论列表 */
.reviews-list {
  padding: 0 30rpx;
}

.review-item {
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f5f5f7;
}

.review-item:last-child {
  border-bottom: none;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.reviewer-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
}

.reviewer-info {
  flex: 1;
}

.reviewer-name {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #000;
  margin-bottom: 4rpx;
}

.review-rating {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.review-stars {
  width: 100rpx;
  height: 20rpx;
}

.review-date {
  font-size: 20rpx;
  color: #999;
}

.review-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #000;
  margin-bottom: 8rpx;
}

.review-content {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.review-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.review-helpful {
  font-size: 22rpx;
  color: #999;
}

.review-btns {
  display: flex;
  gap: 24rpx;
}

.review-btn {
  font-size: 24rpx;
  color: #666;
}

.more-reviews-btn {
  margin: 30rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #f5f5f7;
  color: #007AFF;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
}

/* 类似应用 */
.similar-section {
  background: #fff;
  padding: 30rpx 0;
}

.similar-list {
  padding: 0 30rpx;
}

.similar-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f7;
}

.similar-item:last-child {
  border-bottom: none;
}

.similar-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.similar-info {
  flex: 1;
  min-width: 0;
}

.similar-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #000;
  margin-bottom: 4rpx;
}

.similar-category {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.similar-rating {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.similar-stars {
  width: 100rpx;
  height: 20rpx;
}

.similar-score {
  font-size: 20rpx;
  color: #999;
}

.similar-btn {
  width: 100rpx;
  height: 52rpx;
  line-height: 52rpx;
  background: #007AFF;
  color: #fff;
  font-size: 24rpx;
  border-radius: 26rpx;
  padding: 0;
  margin: 0;
  margin-left: 20rpx;
  border: none;
}

.similar-btn.downloaded {
  background: #f5f5f7;
  color: #007AFF;
}
</style>