<template>
  <view class="video-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-title">
        <text>影视</text>
      </view>
      <view class="nav-right" @click="goParserSetting">
        <image src="/static/icon/szbai.png" class="nav-setting-icon" mode="aspectFit" style="width: 44rpx; height: 44rpx;"></image>
      </view>
    </view>

    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <scroll-view class="content-scroll" scroll-y="true" refresher-enabled :refresher-triggered="isRefreshing" @refresherrefresh="onRefresh" :style="{ height: scrollHeight + 'px' }">
      <!-- 搜索栏和播放记录 -->
      <view class="search-bar-row">
        <!-- 搜索栏 -->
        <view class="video-search-bar" @click="goSearch">
          <view class="search-input-box">
            <image src="/static/icon/sss.png" class="search-icon" mode="aspectFit"></image>
            <text class="search-placeholder">输入剧名开始吧</text>
          </view>
        </view>
        <!-- 播放记录图标 -->
        <view class="history-icon-wrapper" @click="goPlayHistory">
          <image src="/static/icon/record.svg" class="right-icon" mode="aspectFit"></image>
          <text class="history-label">播放记录</text>
        </view>
      </view>

      <!-- 分类标签 -->
      <scroll-view class="video-tabs-scroll" scroll-x="true" show-scrollbar="false">
        <view class="video-tabs">
          <view
            class="video-tab-item"
            :class="{ active: currentVideoTab === index }"
            v-for="(tab, index) in videoTabs"
            :key="index"
            @click="switchVideoTab(index)"
          >
            <text>{{ tab.label }}</text>
            <view v-if="currentVideoTab === index" class="video-tab-line"></view>
          </view>
        </view>
      </scroll-view>

      <!-- 子分类筛选 -->
      <view class="sub-filter-section" v-if="showSubFilter">
        <!-- 类型筛选 -->
        <view class="filter-row" v-if="classList.length > 0">
          <view class="filter-label">类型:</view>
          <scroll-view class="filter-scroll" scroll-x="true" show-scrollbar="false">
            <view class="filter-list">
              <view
                class="filter-item"
                :class="{ active: currentClass === item.type_id }"
                v-for="item in classList"
                :key="item.type_id"
                @click="selectClass(item.type_id)"
              >
                <text>{{ item.type_name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 年份筛选 -->
        <view class="filter-row" v-if="yearList.length > 0">
          <view class="filter-label">年份:</view>
          <scroll-view class="filter-scroll" scroll-x="true" show-scrollbar="false">
            <view class="filter-list">
              <view
                class="filter-item"
                :class="{ active: currentYear === '' }"
                @click="selectYear('')"
              >
                <text>全部</text>
              </view>
              <view
                class="filter-item"
                :class="{ active: currentYear === year }"
                v-for="year in yearList"
                :key="year"
                @click="selectYear(year)"
              >
                <text>{{ year }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 影视列表 -->
      <view class="video-content">
        <view v-if="isVideoLoading" class="video-loading">
          <text>加载中...</text>
        </view>
        <view v-else-if="videoList.length === 0" class="video-empty">
          <text>暂无影视内容</text>
        </view>
        <view v-else class="video-grid">
          <view class="video-card" v-for="(item, index) in videoList" :key="index" @click="goToDetail(item)">
            <view class="video-cover-box">
              <image class="video-cover" :src="getVideoImageUrl(item.vod_pic)" mode="aspectFill"></image>
              <view v-if="item.vod_remarks" class="video-remarks">{{ item.vod_remarks }}</view>
            </view>
            <view class="video-info">
              <text class="video-name">{{ item.vod_name || '未知影片' }}</text>
              <text class="video-actors">{{ item.vod_actor || '暂无演员' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore && !isVideoLoading">
        <text>上拉加载更多</text>
      </view>
      <view class="no-more" v-if="!hasMore && videoList.length > 0">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { baseUrl, getCmsUrl, apiKey } from '@/common/request.js'

export default {
  data() {
    return {
      // CMS 接口地址（从后端动态获取，启动时填充）
      cmsUrl: '',
      statusBarHeight: 20,
      scrollHeight: 0,
      isRefreshing: false,
      isVideoLoading: true,
      hasMore: true,
      currentPage: 1,
      pageSize: 30,

      // 分类数据
      videoTabs: [
        { label: '推荐', type: '' },
        { label: '电视剧', type: '2' },
        { label: '电影', type: '1' },
        { label: '动漫', type: '4' },
        { label: '综艺', type: '3' }
      ],
      currentVideoTab: 0,
      showSubFilter: false,

      // 子分类
      classList: [],
      areaList: ['大陆','香港','台湾','美国','韩国','日本','英国','法国','德国','泰国','印度','其他'],
      yearList: [],

      currentClass: '',
      currentArea: '',
      currentYear: '',

      videoList: []
    }
  },

  onLoad() {
    this.initData()
  },

  onPullDownRefresh() {
    this.onRefresh()
  },

  onReachBottom() {
    this.loadMore()
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },
    async initData() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 20
      const navHeight = 44 + this.statusBarHeight
      this.scrollHeight = systemInfo.windowHeight - navHeight

      // 先获取动态 CMS 接口地址，再加载视频数据
      this.cmsUrl = await getCmsUrl()

      this.loadClassList()

      this.$nextTick(() => {
        setTimeout(() => {
          this.switchVideoTab(0)
        }, 100)
      })
    },

    loadClassList() {
      const tab = this.videoTabs[this.currentVideoTab]
      const mainType = tab.type || ''

      // 如果是推荐tab，不显示筛选
      if (mainType === '') {
        this.classList = []
        this.yearList = []
        return
      }

      // 从苹果CMS API动态获取分类列表（用小分页避免 CMS 限流）
      uni.request({
        url: baseUrl + 'public/video/proxy?url=' + encodeURIComponent(this.cmsUrl + '/api.php/provide/vod/?ac=list&t=' + mainType + '&pagesize=30'),
        method: 'GET',
        header: { 'X-Api-Key': apiKey },
        timeout: 20000,
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.code === 1) {
            if (res.data.class && res.data.class.length > 0) {
              const allowedCategories = ['动作片', '喜剧片', '爱情片', '科幻片', '剧情片', '战争片']
              this.classList = res.data.class.filter(item => {
                return allowedCategories.includes(item.type_name)
              })
            } else {
              this.classList = []
            }

            if (res.data.list && res.data.list.length > 0) {
              this.extractYearList(res.data.list)
            } else {
              this.yearList = []
            }
          } else {
            this.classList = []
            this.yearList = []
          }
        },
        fail: () => {
          this.classList = []
          this.yearList = []
        }
      })
    },

    extractYearList(list) {
      const yearSet = new Set()
      
      list.forEach(item => {
        let year = item.vod_year || item.vod_pubdate || ''
        
        if (!year && item.vod_time) {
          const date = new Date(item.vod_time * 1000)
          year = date.getFullYear().toString()
        }
        
        if (!year && item.vod_pubdate) {
          year = item.vod_pubdate.substring(0, 4)
        }
        
        if (year && year.trim() !== '' && year.length >= 4) {
          year = year.substring(0, 4)
          yearSet.add(year)
        }
      })

      this.yearList = Array.from(yearSet).sort((a, b) => {
        return parseInt(b) - parseInt(a)
      })
    },

    getVideoImageUrl(url) {
      if (!url) return '/static/logo.png'
      if (url.startsWith('http')) return url
      return this.cmsUrl + url
    },

    switchVideoTab(index) {
      this.currentVideoTab = index
      this.currentClass = ''
      this.currentYear = ''
      this.currentPage = 1
      this.videoList = []
      this.hasMore = true
      this.isVideoLoading = true

      // 显示筛选器：除推荐tab外都显示
      this.showSubFilter = (index !== 0)

      // 如果有子分类筛选，先加载分类列表
      if (this.showSubFilter) {
        this.loadClassList()
      } else {
        this.classList = []
      }

      this.loadVideoList()
    },

    selectClass(typeId) {
      this.currentClass = typeId
      this.currentPage = 1
      this.videoList = []
      this.isVideoLoading = true
      this.loadVideoList()
    },

    selectYear(year) {
      this.currentYear = year
      this.currentPage = 1
      this.videoList = []
      this.isVideoLoading = true
      this.loadVideoList()
    },

    loadVideoList() {
      this.isVideoLoading = true

      const tab = this.videoTabs[this.currentVideoTab]
      let cmsBase = this.cmsUrl + '/api.php/provide/vod/?ac=list'

      if (this.currentClass) {
        cmsBase += '&t=' + this.currentClass
      } else if (tab.type === '') {
        cmsBase += '&t=' + ''
      } else if (this.classList && this.classList.length > 0) {
        const allSubtypeIds = this.classList.map(item => item.type_id)
        this.loadMultipleTypes(allSubtypeIds)
        return
      } else if (tab.type) {
        cmsBase += '&t=' + tab.type
      }

      if (this.currentYear) {
        cmsBase += '&year=' + this.currentYear
      }

      cmsBase += '&pg=' + this.currentPage
      cmsBase += '&pagesize=' + this.pageSize

      let url = baseUrl + 'public/video/proxy?url=' + encodeURIComponent(cmsBase)

      uni.request({
        url: url,
        method: 'GET',
        header: { 'X-Api-Key': apiKey },
        timeout: 20000,
        success: (res) => {
          this.isVideoLoading = false
          this.isRefreshing = false
          uni.stopPullDownRefresh()

          if (res.statusCode === 200 && res.data && res.data.code === 1) {
            const list = res.data.list || []

            if (list.length === 0 && this.currentYear) {
              this.loadVideoListWithoutYear()
              return
            }

            if (this.currentPage === 1) {
              this.videoList = list
            } else {
              this.videoList = this.videoList.concat(list)
            }

            this.hasMore = list.length >= this.pageSize

            // 列表接口已返回 vod_pic，无需再调 detail 补封面（避免触发 CMS 429 限流）
            this.$forceUpdate()
          } else {
            const errMsg = (res.data && res.data.msg) ? res.data.msg : '获取失败'
            uni.showToast({ title: errMsg, icon: 'none', duration: 3000 })
            console.log('VideoProxy响应异常:', JSON.stringify(res.data))
          }
        },
        fail: () => {
          this.isVideoLoading = false
          this.isRefreshing = false
          uni.stopPullDownRefresh()
          uni.showToast({ title: '加载失败', icon: 'none' })
        }
      })
    },

    loadVideoListWithoutYear() {
      const tab = this.videoTabs[this.currentVideoTab]
      let cmsBase = this.cmsUrl + '/api.php/provide/vod/?ac=list'

      if (this.currentClass) {
        cmsBase += '&t=' + this.currentClass
      } else if (tab.type) {
        cmsBase += '&t=' + tab.type
      }

      cmsBase += '&pg=' + this.currentPage
      cmsBase += '&pagesize=' + this.pageSize

      let url = baseUrl + 'public/video/proxy?url=' + encodeURIComponent(cmsBase)

      uni.request({
        url: url,
        method: 'GET',
        header: { 'X-Api-Key': apiKey },
        timeout: 20000,
        success: (res) => {
          this.isVideoLoading = false
          this.isRefreshing = false

          if (res.statusCode === 200 && res.data && res.data.code === 1) {
            const list = res.data.list || []

            if (this.currentPage === 1) {
              this.videoList = list
            } else {
              this.videoList = this.videoList.concat(list)
            }

            this.hasMore = list.length >= this.pageSize
            // 列表接口已返回 vod_pic，无需再调 detail 补封面

            if (list.length === 0) {
              uni.showToast({ title: '该年份暂无数据', icon: 'none' })
            }
          }
        },
        fail: () => {
          this.isVideoLoading = false
          this.isRefreshing = false
        }
      })
    },

    loadMultipleTypes(typeIds) {
      this.isVideoLoading = true

      // 串行请求每个子分类，避免并发触发 CMS 429 限流
      const fetchOne = (idx, acc) => {
        if (idx >= typeIds.length) {
          // 全部完成
          this.isVideoLoading = false
          this.isRefreshing = false
          uni.stopPullDownRefresh()

          let allVideos = acc
          const seen = new Set()
          allVideos = allVideos.filter(item => {
            if (seen.has(item.vod_id)) {
              return false
            }
            seen.add(item.vod_id)
            return true
          })

          if (this.currentPage === 1) {
            this.$set(this, 'videoList', allVideos)
          } else {
            this.videoList = this.videoList.concat(allVideos)
          }

          this.hasMore = allVideos.length >= this.pageSize
          this.$forceUpdate()
          return
        }

        const typeId = typeIds[idx]
        let cmsUrl = this.cmsUrl + '/api.php/provide/vod/?ac=list&t=' + typeId
        if (this.currentYear) {
          cmsUrl += '&year=' + this.currentYear
        }
        cmsUrl += '&pg=' + this.currentPage
        cmsUrl += '&pagesize=' + this.pageSize

        const proxyUrl = baseUrl + 'public/video/proxy?url=' + encodeURIComponent(cmsUrl)

        uni.request({
          url: proxyUrl,
          method: 'GET',
          header: { 'X-Api-Key': apiKey },
          timeout: 20000,
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.code === 1) {
              acc = acc.concat(res.data.list || [])
            }
            // 串行下一个，间隔 300ms 降低 CMS 压力
            setTimeout(() => { fetchOne(idx + 1, acc) }, 300)
          },
          fail: () => {
            setTimeout(() => { fetchOne(idx + 1, acc) }, 500)
          }
        })
      }

      fetchOne(0, [])
    },

    loadMore() {
      if (!this.hasMore || this.isVideoLoading) return
      this.currentPage++
      this.loadVideoList()
    },

    onRefresh() {
      this.isRefreshing = true
      this.currentPage = 1
      this.videoList = []
      this.hasMore = true
      this.isVideoLoading = true
      this.loadVideoList()
    },

    goSearch() {
      uni.navigateTo({
        url: '/pages/video/search'
      })
    },

    goParserSetting() {
      uni.navigateTo({
        url: '/pages/video/parser-setting'
      })
    },

    goToDetail(item) {
      uni.navigateTo({
        url: '/pages/video/detail?id=' + item.vod_id
      })
    },

    // 播放记录相关方法
    goPlayHistory() {
      uni.navigateTo({
        url: '/pages/video/play-history'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.video-page {
  min-height: 100vh;
  background-color: #fff;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  background-color: #fff;
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
  flex-shrink: 0;
}

.back-icon {
  font-size: 48rpx;
  color: #333;
  font-weight: 300;
}

.nav-title {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.nav-title text {
  font-size: 34rpx;
  color: #333;
  font-weight: bold;
}

.nav-right {
  width: 80rpx;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.nav-setting-icon {
  width: 44rpx !important;
  height: 44rpx !important;
}

.content-scroll {
  width: 100%;
}

.search-bar-row {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #fff;
  gap: 16rpx;
}

.video-search-bar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-sizing: border-box;
  margin-top: 0;
}

.search-input-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background-color: #f5f7fa;
  border-radius: 36rpx;
  padding: 14rpx 20rpx;
  gap: 10rpx;
}

.search-icon {
  width: 32rpx !important;
  height: 32rpx !important;
  flex-shrink: 0;
}

.search-placeholder {
  font-size: 26rpx;
  color: #999;
}

.search-right-icons {
  display: flex;
  gap: 20rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
  z-index: 100;
  position: relative;
}

.right-icon {
  width: 44rpx !important;
  height: 44rpx !important;
  flex-shrink: 0;
  opacity: 1 !important;
}

.history-icon-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.history-label {
  font-size: 18rpx;
  color: #666;
}

.video-tabs-scroll {
  width: 100%;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.video-tabs {
  display: flex;
  gap: 28rpx;
  padding: 0 30rpx;
}

.video-tab-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14rpx 0;
  cursor: pointer;
  flex-shrink: 0;
  min-width: auto;
}

.video-tab-item text {
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.video-tab-item.active text {
  font-size: 28rpx;
  color: #e53935;
  font-weight: bold;
}

.video-tab-line {
  width: 28rpx;
  height: 5rpx;
  background-color: #e53935;
  border-radius: 3rpx;
  margin-top: 5rpx;
}

.sub-filter-section {
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 16rpx solid #f5f5f5;
  width: 100%;
  box-sizing: border-box;
}

.filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-label {
  width: 80rpx;
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
}

.filter-scroll {
  flex: 1;
}

.filter-list {
  display: flex;
  gap: 16rpx;
  padding-right: 30rpx;
}

.filter-item {
  padding: 8rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-item text {
  font-size: 24rpx;
  color: #666;
}

.filter-item.active {
  background-color: #ffe9ea;
}

.filter-item.active text {
  color: #e53935;
}

.video-content {
  padding: 30rpx;
}

.video-loading,
.video-empty {
  text-align: center;
  padding: 150rpx 0;
  color: #999;
  font-size: 28rpx;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  width: 100%;
  box-sizing: border-box;
  padding: 16rpx;
}

.video-card {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.video-cover-box {
  position: relative;
  width: 100%;
  padding-bottom: 135%;
  border-radius: 8rpx;
  overflow: hidden;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.video-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-remarks {
  position: absolute;
  right: 4rpx;
  bottom: 4rpx;
  background-color: rgba(0,0,0,0.7);
  color: #fff;
  font-size: 16rpx;
  padding: 2rpx 6rpx;
  border-radius: 2rpx;
  white-space: nowrap;
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  padding: 8rpx 2rpx 0;
  width: 100%;
  box-sizing: border-box;
}

.video-name {
  font-size: 20rpx;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.video-actors {
  font-size: 16rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.load-more,
.no-more {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
  font-size: 26rpx;
}

/* 播放记录弹窗样式 */
.play-history-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-content {
  width: 90%;
  max-height: 70vh;
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.history-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.history-close {
  font-size: 40rpx;
  color: #999;
  padding: 10rpx 20rpx;
}

.history-list {
  max-height: 60vh;
  padding: 0 20rpx;
}

.history-empty {
  text-align: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 20rpx;
}

.history-cover {
  width: 120rpx;
  height: 160rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background-color: #f5f5f5;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.history-name {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-actors {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 22rpx;
  color: #ccc;
}

.history-delete {
  font-size: 24rpx;
  color: #ff4d4f;
  padding: 10rpx 20rpx;
  flex-shrink: 0;
}
</style>
