<template>
  <view class="video-detail-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-title">
        <text>{{ videoTitle }}</text>
      </view>
      <view class="nav-right" @click="goToSetting">
        <image src="/static/icon/settings-dark.svg" class="nav-setting-btn" mode="aspectFit"></image>
      </view>
    </view>

    <!-- 内容区域（包含播放器） -->
    <scroll-view class="content-scroll" scroll-y="true" :style="{ height: scrollHeight + 'px' }">
      <!-- 播放器区域 -->
      <view class="player-wrapper" :class="{ 'fullscreen-mode': isFullscreen }" v-if="playUrl">
        <!-- #ifdef APP-PLUS -->
        <!-- App端：使用原生video组件（直接播放m3u8直链） -->
        <video
          id="videoPlayer"
          class="video-player"
          :src="playUrl"
          :controls="true"
          :autoplay="true"
          :enable-progress-gesture="true"
          :enable-play-gesture="true"
          :show-center-play-btn="true"
          :show-fullscreen-btn="true"
          :show-play-btn="false"
          :show-mute-btn="false"
          :show-playback-rate-btn="false"
          :page-gesture="true"
          object-fit="contain"
          @error="onVideoError"
        ></video>
        <!-- #endif -->

        <!-- #ifdef H5 -->
        <!-- H5端：使用原生video标签配合HLS.js播放m3u8 -->
        <video
          id="h5VideoPlayer"
          class="video-player"
          :src="playUrl"
          :poster="videoDetail.vod_pic ? getVideoImageUrl(videoDetail.vod_pic) : ''"
          controls
          autoplay
          playsinline
          webkit-playsinline
          x5-playsinline
          x5-video-player-type="h5"
          x5-video-orientation="landscape"
          object-fit="contain"
          @error="onVideoError"
          @loadedmetadata="onH5VideoLoaded"
        ></video>
        <!-- #endif -->
      </view>

      <!-- 没有播放地址时显示占位图 -->
      <view class="player-wrapper" v-else>
        <view class="player-container">
          <view class="player-placeholder">
            <image src="/static/icon/film-gray.svg" class="placeholder-icon" mode="aspectFit"></image>
            <text class="placeholder-text">点击播放按钮开始观看</text>
          </view>
        </view>
      </view>

      <!-- 影片信息 -->
      <view class="video-info-section" v-if="videoDetail.vod_id">
        <view class="title-row">
          <text class="video-title">{{ videoDetail.vod_name }}</text>
          <view class="play-btn" @click="startPlay">
            <text class="play-icon">▶</text>
            <text class="play-text">点我播放</text>
          </view>
        </view>

        <view class="tags-row">
          <view class="tag-item" v-if="videoDetail.type_name">
            <text>{{ videoDetail.type_name }}</text>
          </view>
          <view class="tag-item">
            <text>推荐</text>
          </view>
        </view>

        <view class="desc-section" v-if="videoDetail.vod_content">
          <view class="desc-text" :class="{ collapsed: isCollapsed }">
            <text>{{ pureContent }}</text>
          </view>
          <view class="expand-btn" v-if="needExpand" @click="toggleExpand">
            <text>{{ isCollapsed ? '展开' : '收起' }}</text>
          </view>
        </view>
      </view>

      <!-- 选集区域 -->
      <view class="episodes-section" v-if="episodes.length > 0">
        <!-- 免责声明滚动文字 -->
        <view class="disclaimer-scroll">
          <view class="disclaimer-text">所有资源均来自于互联网收集，本站不储存任何视频资源，不提供任何接口，仅供学习测试使用，测试完自行退出本页面。</view>
        </view>

        <view class="section-title">
          <text>选集</text>
          <text class="ep-count">{{ currentEpisodeIndex + 1 }}/{{ episodes.length }}</text>
        </view>

        <view class="episodes-scroll">
          <view class="episodes-list">
            <view
              class="episode-item"
              :class="{ active: currentEpisodeIndex === index }"
              v-for="(ep, index) in visibleEpisodes"
              :key="index"
              @click="selectEpisode(index)"
            >
              <text>{{ ep.name }}</text>
            </view>
          </view>
        </view>

        <view class="episodes-toggle" v-if="episodes.length > 20" @click="episodesExpanded = !episodesExpanded">
           <text>{{ episodesExpanded ? '收起' : '展开全部 (' + episodes.length + '集)' }}</text>
         </view>
      </view>

      <!-- 没有剧集时显示提示 -->
      <view class="no-episodes-tip" v-else-if="videoDetail.vod_id">
        <text class="tip-text">暂无剧集信息</text>
        <text class="tip-hint">数据字段: {{ episodesInfo }}</text>
      </view>

      <!-- 相关推荐 -->
      <view class="related-section" v-if="relatedList.length > 0">
        <view class="section-title">
          <text>相关推荐</text>
        </view>

        <view class="related-grid">
          <view class="related-card" v-for="(item, index) in relatedList" :key="index" @click="goToDetail(item)">
            <view class="related-cover">
              <image :src="getVideoImageUrl(item.vod_pic)" mode="aspectFill" class="related-img"></image>
              <view class="related-remark" v-if="item.vod_remarks">{{ item.vod_remarks }}</view>
            </view>
            <view class="related-info">
              <text class="related-name">{{ item.vod_name }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import HlsVideoPlayer from '@/components/HlsVideoPlayer.vue'
import { baseUrl, getCmsUrl } from '@/common/request.js'

export default {
  components: {
    HlsVideoPlayer
  },
  data() {
    return {
      // CMS 接口地址（从后端动态获取，启动时填充）
      cmsUrl: '',
      vodId: 0,
      videoTitle: '',
      scrollHeight: 0,
      videoDetail: {},
      episodes: [],
      currentEpisodeIndex: 0,
      playUrl: '',
      parserUrl: 'https://wsyzy.top/m3u8/?url=',
      showPlayer: false,
      isFullscreen: false,
      autoPlay: false,
      isCollected: false,
      relatedList: [],
      isCollapsed: true,
      needExpand: false,
      maxCollapsedLength: 100,
      episodesInfo: '',
      episodesExpanded: false,
      hlsInstance: null
    }
  },

  computed: {
    pureContent() {
      if (!this.videoDetail.vod_content) return ''
      let text = this.videoDetail.vod_content.replace(/<[^>]+>/g, '')
      text = text.replace(/&nbsp;/g, ' ')
      text = text.replace(/&lt;/g, '<')
      text = text.replace(/&gt;/g, '>')
      text = text.replace(/&amp;/g, '&')
      text = text.replace(/&quot;/g, '"')
      text = text.replace(/\s+/g, ' ').trim()
      return text
    },
    visibleEpisodes() {
      if (this.episodes.length > 30 && !this.episodesExpanded) {
        return this.episodes.slice(0, 30)
      }
      return this.episodes
    }
  },

  onLoad(options) {
    if (options.id) {
      this.vodId = parseInt(options.id)
    }
    
    // #ifdef H5
    // 动态加载HLS.js库
    this.loadHlsJs()
    // #endif
    
    this.initData()
  },

  onShow() {
    this.checkParserSetting()
  },

  methods: {
    // #ifdef H5
    loadHlsJs() {
      if (window.Hls) {
        console.log('HLS.js is already loaded')
        return
      }
      
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js'
      script.onload = () => {
        console.log('HLS.js loaded successfully')
      }
      script.onerror = () => {
        console.error('Failed to load HLS.js')
      }
      script.async = true
      document.head.appendChild(script)
    },
    // #endif
    async initData() {
      const systemInfo = uni.getSystemInfoSync()
      const navHeight = 44 + (systemInfo.statusBarHeight || 0)
      this.scrollHeight = systemInfo.windowHeight - navHeight

      // 先获取动态 CMS 接口地址，再加载视频详情
      this.cmsUrl = await getCmsUrl()

      this.loadVideoDetail()
    },

    checkParserSetting() {
      const saved = uni.getStorageSync('video_parser_url')
      if (saved) {
        this.parserUrl = saved
      } else {
        uni.showModal({
          title: '提示',
          content: '首次使用请先配置视频解析接口',
          showCancel: false,
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: '/pages/video/parser-setting'
              })
            }
          }
        })
      }
    },

    getVideoImageUrl(url) {
      if (!url) return '/static/logo.png'
      if (url.startsWith('http')) return url
      return this.cmsUrl + url
    },

    loadVideoDetail() {
      uni.showLoading({ title: '加载中...' })

      const url = baseUrl + 'public/video/proxy?url=' + encodeURIComponent(this.cmsUrl + '/api.php/provide/vod/?ac=detail&ids=' + this.vodId)

      uni.request({
        url: url,
        method: 'GET',
        timeout: 20000,
        success: (res) => {
          uni.hideLoading()
          if (res.statusCode === 200 && res.data && res.data.code === 1) {
            const list = res.data.list || []
            if (list.length > 0) {
              this.videoDetail = list[0]
              this.videoTitle = this.videoDetail.vod_name || '影片详情'

              this.parseEpisodes()
              this.loadRelated()

              this.checkNeedExpand()

              // 保存播放记录
              this.savePlayHistory()
            }
          } else {
            uni.showToast({ title: '加载失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      })
    },

    parseEpisodes() {
      this.episodes = []

      const fields = []
      if (this.videoDetail.vod_play_from) fields.push(`vod_play_from=${this.videoDetail.vod_play_from}`)
      if (this.videoDetail.vod_play_url) fields.push('vod_play_url')
      if (this.videoDetail.vod_total) fields.push(`vod_total=${this.videoDetail.vod_total}`)
      this.episodesInfo = fields.join(', ') || '无播放字段'

      let playUrl = this.videoDetail.vod_play_url

      if (!playUrl) {
        uni.showToast({
          title: '暂无播放数据',
          icon: 'none',
          duration: 2000
        })
        return
      }

      const sources = playUrl.split('$$$')

      for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
        const source = sources[sourceIndex].trim()

        if (!source) continue

        const episodesArray = source.split('#')

        episodesArray.forEach((episodeStr, idx) => {
          if (!episodeStr || !episodeStr.trim()) return

          const parts = episodeStr.split('$')

          if (parts.length >= 2) {
            const name = parts[0].trim()
            let url = parts[1].trim()
            url = url.replace(/\s+/g, '')

            const isM3u8 = url.includes('.m3u8') || url.includes('m3u8')

            this.episodes.push({
              name: name,
              url: url,
              isM3u8: isM3u8,
              sourceIndex: sourceIndex
            })
          } else if (parts.length === 1 && parts[0].trim()) {
            let url = parts[0].trim()
            url = url.replace(/\s+/g, '')

            const isM3u8 = url.includes('.m3u8') || url.includes('m3u8')

            this.episodes.push({
              name: `第${this.episodes.length + 1}集`,
              url: url,
              isM3u8: isM3u8,
              sourceIndex: sourceIndex
            })
          }
        })

        if (this.episodes.length > 0) {
          break
        }
      }

      if (this.episodes.length === 0) {
        uni.showToast({
          title: '未解析到剧集信息',
          icon: 'none',
          duration: 2000
        })
      }
    },

    loadRelated() {
      let url = baseUrl + 'public/video/proxy?url=' + encodeURIComponent(this.cmsUrl + '/api.php/provide/vod/?ac=list&order=desc&by=time&pg=1')

      uni.request({
        url: url,
        method: 'GET',
        timeout: 20000,
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.code === 1) {
            const list = res.data.list || []
            // ac=list 已返回 vod_pic，无需再调 fetchRelatedPics 补封面（避免触发 CMS 429 限流）
            this.relatedList = list.filter(item => item.vod_id !== this.vodId).slice(0, 6)
          }
        }
      })
    },

    fetchRelatedPics() {
      // 已废弃：列表接口 ac=list 默认返回 vod_pic，无需再调 detail 补封面
    },

    selectEpisode(index) {
      if (this.episodes.length === 0) {
        uni.showToast({ title: '暂无剧集信息', icon: 'none' })
        return
      }

      this.currentEpisodeIndex = index
      const ep = this.episodes[index]

      if (!ep || !ep.url) {
        uni.showToast({ title: '该集暂无播放地址', icon: 'none' })
        return
      }

      uni.showToast({
        title: '已选择: ' + ep.name,
        icon: 'success',
        duration: 1500
      })
    },

    startPlay() {
      if (this.episodes.length === 0) {
        uni.showToast({ title: '暂无剧集信息', icon: 'none' })
        return
      }

      this.playEpisode(this.currentEpisodeIndex)
    },

    playFullscreen() {
      if (this.episodes.length === 0) {
        uni.showToast({ title: '暂无剧集信息', icon: 'none' })
        return
      }

      const ep = this.episodes[this.currentEpisodeIndex]

      if (!ep || !ep.url) {
        uni.showToast({ title: '该集暂无播放地址', icon: 'none' })
        return
      }

      this.isFullscreen = true

      // #ifdef APP-PLUS
      plus.screen.lockOrientation('landscape')
      // #endif

      uni.showToast({
        title: `正在全屏播放：${ep.name}`,
        icon: 'none',
        duration: 1500
      })
    },

    async playEpisode(index) {
      if (this.episodes.length === 0) {
        uni.showToast({ title: '暂无剧集信息', icon: 'none' })
        return
      }

      this.currentEpisodeIndex = index
      const ep = this.episodes[index]

      if (!ep || !ep.url) {
        uni.showToast({ title: '该集暂无播放地址', icon: 'none' })
        return
      }

      uni.showLoading({
        title: '正在播放，请耐心等待...',
        mask: true
      })

      setTimeout(() => {
        uni.hideLoading()

        // #ifdef H5
        // H5端：使用HLS.js播放m3u8视频
        this.playUrl = ep.url // 设置playUrl使播放器区域显示
        setTimeout(() => {
          this.playH5Video(ep.url)
        }, 100)
        // #endif

        // #ifdef APP-PLUS
        // APP端：直接使用原URL
        this.playUrl = ep.url
        // #endif

        uni.showToast({
          title: '正在播放: ' + ep.name,
          icon: 'success',
          duration: 1500
        })

        // 播放时保存记录
        this.savePlayHistory()
      }, 2000)
    },

    onVideoError(e) {
      uni.showToast({
        title: '视频加载失败',
        icon: 'none',
        duration: 2000
      })
    },

    // #ifdef H5
    onH5VideoLoaded() {
      const videoElement = document.getElementById('h5VideoPlayer')
      if (!videoElement || typeof videoElement.play !== 'function') {
        console.error('Invalid video element')
        return
      }
      
      // 检查是否是m3u8格式且需要HLS.js
      if (this.playUrl.includes('.m3u8') || this.playUrl.includes('m3u8') || this.playUrl.includes('.m3u8?')) {
        if (window.Hls) {
          // 销毁之前的HLS实例
          if (this.hlsInstance) {
            this.hlsInstance.destroy()
            this.hlsInstance = null
          }

          const hls = new window.Hls({
            enableWorker: true,
            lowLatencyMode: true,
            manifestLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 3,
            fragLoadingMaxRetry: 3,
            manifestLoadingTimeOut: 15000,
            levelLoadingTimeOut: 15000,
            fragLoadingTimeOut: 15000,
          })

          hls.loadSource(this.playUrl)
          hls.attachMedia(videoElement)

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest parsed successfully')
            // 使用setTimeout确保视频元素仍有效
            setTimeout(() => {
              const player = document.getElementById('h5VideoPlayer')
              if (player && typeof player.play === 'function') {
                player.play().then(() => {
                  console.log('Video played successfully')
                }).catch(e => {
                  console.log('Autoplay blocked, user interaction required:', e)
                })
              }
            }, 100)
          })

          hls.on(window.Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data)
            if (data.fatal) {
              hls.destroy()
            }
          })

          this.hlsInstance = hls
        }
      }
    },

    playH5Video(url) {
      // H5端现在使用video标签的src属性直接设置视频源
      // HLS初始化在onH5VideoLoaded中处理
      console.log('H5 video play triggered:', url)
    },
    // #endif

    onWebViewMessage(e) {
    },

    onVideoEnded() {
      if (this.currentEpisodeIndex < this.episodes.length - 1) {
        this.playEpisode(this.currentEpisodeIndex + 1)
      }
    },

    goBack() {
      // #ifdef APP-PLUS
      plus.screen.lockOrientation('portrait-primary')
      this.isFullscreen = false
      // #endif

      uni.navigateBack()
    },

    goToSetting() {
      uni.navigateTo({
        url: '/pages/video/parser-setting'
      })
    },

    goToDetail(item) {
      uni.redirectTo({
        url: '/pages/video/detail?id=' + item.vod_id
      })
    },

    toggleCollect() {
      this.isCollected = !this.isCollected
      uni.showToast({
        title: this.isCollected ? '收藏成功' : '取消收藏',
        icon: 'none'
      })
    },

    checkNeedExpand() {
      this.needExpand = this.pureContent.length > this.maxCollapsedLength
    },

    toggleExpand() {
      this.isCollapsed = !this.isCollapsed
    },

    savePlayHistory() {
      if (!this.videoDetail || !this.videoDetail.vod_id) return

      try {
        let history = uni.getStorageSync('playHistory') || []
        const detail = this.videoDetail

        // 查找是否已存在该记录
        const existingIndex = history.findIndex(h => h.vod_id === detail.vod_id)

        // 获取当前播放的集数名称
        const currentEpisode = this.episodes[this.currentEpisodeIndex]
        const episodeName = currentEpisode ? currentEpisode.name : '第1集'

        // 计算播放进度（百分比）
        const totalEpisodes = this.episodes.length
        const progress = totalEpisodes > 0 ? Math.round(((this.currentEpisodeIndex + 1) / totalEpisodes) * 100) : 0

        const now = new Date()
        const playTime = now.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })

        if (existingIndex !== -1) {
          // 更新现有记录
          history[existingIndex] = {
            vod_id: detail.vod_id,
            vod_name: detail.vod_name,
            vod_actor: detail.vod_actor,
            vod_pic: detail.vod_pic,
            lastPlayTime: playTime,
            lastPlayEpisode: episodeName,
            totalEpisodes: totalEpisodes,
            currentEpisodeIndex: this.currentEpisodeIndex,
            progress: progress
          }
        } else {
          // 添加新记录，最多保存20条
          history.unshift({
            vod_id: detail.vod_id,
            vod_name: detail.vod_name,
            vod_actor: detail.vod_actor,
            vod_pic: detail.vod_pic,
            lastPlayTime: playTime,
            lastPlayEpisode: episodeName,
            totalEpisodes: totalEpisodes,
            currentEpisodeIndex: this.currentEpisodeIndex,
            progress: progress
          })

          if (history.length > 20) {
            history.pop()
          }
        }

        uni.setStorageSync('playHistory', history)
      } catch (e) {
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.video-detail-page {
  min-height: 100vh;
  background-color: #fff;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding-top: var(--status-bar-height);
  height: calc(44px + var(--status-bar-height));
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 99;
}

.nav-back {
  width: 80rpx;
  height: 44px;
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

.nav-title {
  flex: 1;
  text-align: center;
}

.nav-title text {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.nav-right {
  width: 80rpx;
}

.content-scroll {
  width: 100%;
}

.player-wrapper {
  width: 100%;
  height: 420rpx;
  position: relative;
  background-color: #000;
}

.player-wrapper.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  height: 100vh;
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.player-webview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.webview-player {
  width: 100%;
  height: 100%;
}

.player-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
}

.player-placeholder {
  text-align: center;
  color: #fff;
}

.nav-setting-btn {
  width: 40rpx;
  height: 40rpx;
}
.placeholder-icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 20rpx;
}

.placeholder-text {
  font-size: 28rpx;
  opacity: 0.7;
}

.video-info-section {
  padding: 30rpx;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.video-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 40rpx;
  flex-shrink: 0;
}

.play-icon {
  font-size: 28rpx;
  color: #fff;
  line-height: 1;
}

.play-text {
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
}

.tags-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.tag-item {
  padding: 6rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #666;
}

.desc-section {
  margin-bottom: 30rpx;
}

.desc-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}

.desc-text.collapsed {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.expand-btn {
  margin-top: 16rpx;
  text-align: center;
  color: #667eea;
  font-size: 26rpx;
}

.episodes-section {
  margin-bottom: 30rpx;
}

.disclaimer-scroll {
  background-color: #fff3cd;
  padding: 20rpx;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.disclaimer-text {
  font-size: 22rpx;
  color: #ff0000;
  line-height: 1.5;
  white-space: nowrap;
  display: inline-block;
  animation: scrollText 10s linear infinite;
}

@keyframes scrollText {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.ep-count {
  font-size: 24rpx;
  color: #999;
}

.episodes-scroll {
  width: 100%;
}

.episodes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120rpx, 1fr));
  gap: 12rpx;
}

.episode-item {
  padding: 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.episode-item.active {
  background-color: #667eea;
  color: #fff;
}

.episodes-toggle {
  margin-top: 16rpx;
  text-align: center;
  padding: 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #667eea;
}

.no-episodes-tip {
  text-align: center;
  padding: 40rpx 0;
}

.tip-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.tip-hint {
  font-size: 22rpx;
  color: #ccc;
}

.related-section {
  margin-bottom: 30rpx;
  padding: 0 24rpx;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  /* 防止 grid 子项内容撑宽列 */
  width: 100%;
  overflow: hidden;
}

.related-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  /* 关键：允许收缩，防止文本撑宽 grid 列 */
  min-width: 0;
  overflow: hidden;
}

.related-cover {
  position: relative;
  width: 100%;
  height: 280rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background-color: #f5f5f5;
}

.related-img {
  width: 100%;
  height: 280rpx;
  display: block;
}

.related-remark {
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

.related-info {
  padding: 8rpx 4rpx 0;
  min-width: 0;
  overflow: hidden;
}

.related-name {
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
