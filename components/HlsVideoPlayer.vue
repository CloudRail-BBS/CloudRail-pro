<template>
  <view class="hls-video-player-container" :class="themeClass" ref="containerRef">
    <!-- 原生video标签 -->
    <view class="video-wrapper">
      <video
        class="video-element"
        :poster="poster"
        @error="onVideoError"
        @loadedmetadata="onLoadedMetadata"
        @canplay="onCanPlay"
        @timeupdate="onTimeUpdate"
        @ended="onVideoEnded"
        @pause="onVideoPause"
        @play="onVideoPlay"
      ></video>
    </view>

    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="isLoading && !hasError">
      <view class="loading-spinner"></view>
      <text class="loading-text">{{ loadingText }}</text>
    </view>

    <!-- 错误提示 -->
    <view class="error-overlay" v-if="hasError">
      <image src="/static/icon/error-red.svg" class="error-icon" mode="aspectFit"></image>
      <text class="error-text">{{ errorMessage }}</text>
      <view class="retry-btn" @click="retryPlay">
        <text>重试播放</text>
      </view>
    </view>

    <!-- 播放按钮覆盖层 -->
    <view class="play-overlay" v-if="showPlayButton && !isLoading && !hasError" @click="togglePlay">
      <view class="play-btn-circle">
        <text class="play-icon">{{ isPlaying ? '⏸' : '▶' }}</text>
      </view>
    </view>

    <!-- 控制栏 -->
    <view class="controls-bar" v-if="controls && showControls && !isFullscreen">
      <view class="progress-container" @click="seekTo">
        <view class="progress-track">
          <view class="progress-filled" :style="{ width: progressPercent + '%' }"></view>
          <view class="progress-buffered" :style="{ width: bufferedPercent + '%' }"></view>
        </view>
        <view class="progress-thumb" :style="{ left: progressPercent + '%' }"></view>
      </view>
      <view class="controls-row">
        <view class="control-left">
          <text class="time-text">{{ formatTime(currentTime) }}</text>
        </view>
        <view class="control-center">
          <view class="control-btn" @click="togglePlay">
            <image v-if="isPlaying" src="/static/icon/pause-white.svg" class="control-btn-img" mode="aspectFit"></image>
            <image v-else src="/static/icon/play-white.svg" class="control-btn-img" mode="aspectFit"></image>
          </view>
          <view class="control-btn" @click="toggleMute">
            <image v-if="isMuted" src="/static/icon/volume-mute-white.svg" class="control-btn-img" mode="aspectFit"></image>
            <image v-else src="/static/icon/volume-up-white.svg" class="control-btn-img" mode="aspectFit"></image>
          </view>
          <view class="control-btn" @click="toggleFullscreen">
            <image v-if="isFullscreen" src="/static/icon/fullscreen-exit-white.svg" class="control-btn-img" mode="aspectFit"></image>
            <image v-else src="/static/icon/fullscreen-white.svg" class="control-btn-img" mode="aspectFit"></image>
          </view>
        </view>
        <view class="control-right">
          <text class="time-text">{{ formatTime(duration) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'HlsVideoPlayer',
  props: {
    src: {
      type: String,
      default: ''
    },
    poster: {
      type: String,
      default: ''
    },
    autoplay: {
      type: Boolean,
      default: false
    },
    controls: {
      type: Boolean,
      default: true
    },
    loop: {
      type: Boolean,
      default: false
    },
    muted: {
      type: Boolean,
      default: false
    },
    volume: {
      type: Number,
      default: 1
    },
    playbackRate: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      videoElement: null,
      hlsInstance: null,
      isLoading: false,
      hasError: false,
      errorMessage: '',
      showPlayButton: true,
      showControls: true,
      isPlaying: false,
      isMuted: false,
      isFullscreen: false,
      currentTime: 0,
      duration: 0,
      loadingText: '加载中...'
    }
  },
  computed: {
    progressPercent() {
      if (this.duration === 0) return 0
      return (this.currentTime / this.duration) * 100
    },
    bufferedPercent() {
      if (!this.videoElement || this.duration === 0) return 0
      const buffered = this.videoElement.buffered
      if (buffered.length === 0) return 0
      return (buffered.end(buffered.length - 1) / this.duration) * 100
    }
  },
  watch: {
    src(newVal) {
      if (newVal) {
        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
          this.loadVideo(newVal)
        }, 100)
      }
    }
  },
  mounted() {
    console.log('HlsVideoPlayer: mounted')
    
    // 使用setTimeout确保DOM完全渲染
    setTimeout(() => {
      this.initPlayer()
    }, 200)
  },
  beforeDestroy() {
    this.destroyHls()
    if (this.videoElement) {
      this.videoElement.pause()
      this.videoElement.src = ''
    }
  },
  methods: {
    initPlayer() {
      console.log('HlsVideoPlayer: initPlayer')
      
      // 多种方式尝试获取video元素
      let videoElement = null
      
      // 方式1: 通过querySelector查找
      videoElement = document.querySelector('.video-element')
      console.log('HlsVideoPlayer: querySelector result:', videoElement)
      
      // 方式2: 如果方式1失败，尝试getElementsByClassName
      if (!videoElement) {
        const videos = document.getElementsByClassName('video-element')
        if (videos.length > 0) {
          videoElement = videos[0]
        }
        console.log('HlsVideoPlayer: getElementsByClassName result:', videoElement)
      }
      
      // 方式3: 如果还是失败，尝试getElementsByTagName
      if (!videoElement) {
        const videos = document.getElementsByTagName('video')
        if (videos.length > 0) {
          videoElement = videos[0]
        }
        console.log('HlsVideoPlayer: getElementsByTagName result:', videoElement)
      }
      
      this.videoElement = videoElement
      
      if (!this.videoElement) {
        console.error('HlsVideoPlayer: videoElement not found')
        this.hasError = true
        this.errorMessage = '播放器初始化失败'
        return
      }

      console.log('HlsVideoPlayer: videoElement found:', this.videoElement)

      // 设置初始属性
      this.isMuted = this.muted
      this.videoElement.volume = this.volume
      this.videoElement.playbackRate = this.playbackRate

      // 加载视频
      if (this.src) {
        this.loadVideo(this.src)
      }
    },

    async loadVideo(url) {
      if (!url) {
        console.log('HlsVideoPlayer: no url provided')
        return
      }

      console.log('HlsVideoPlayer: loading video:', url)

      // 重置状态
      this.hasError = false
      this.errorMessage = ''
      this.isLoading = true
      this.showPlayButton = false

      // 清理之前的HLS实例和视频
      await this.destroyHls()

      // 检查是否是m3u8
      const isM3u8 = url.includes('.m3u8') || url.includes('m3u8') || url.includes('.m3u8?')

      console.log('HlsVideoPlayer: isM3u8:', isM3u8)

      if (isM3u8) {
        await this.loadHlsVideo(url)
      } else {
        this.loadNativeVideo(url)
      }
    },

    async loadHlsVideo(url) {
      try {
        console.log('HlsVideoPlayer: loadHlsVideo')

        // 确保HLS.js加载
        await this.ensureHlsLoaded()

        if (!window.Hls) {
          throw new Error('HLS播放器未加载')
        }

        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 3,
          maxBufferLength: 30,
          maxBufferSize: 60 * 1024 * 1024,
          maxBufferHole: 0.5,
          manifestLoadingTimeOut: 15000,
          levelLoadingTimeOut: 15000,
          fragLoadingTimeOut: 15000,
        })

        this.hlsInstance = hls

        hls.loadSource(url)
        hls.attachMedia(this.videoElement)

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          console.log('HlsVideoPlayer: HLS manifest parsed successfully')
          this.isLoading = false
          this.showPlayButton = true

          if (this.autoplay) {
            this.videoElement.play().catch(e => {
              console.log('HlsVideoPlayer: Autoplay blocked:', e)
              this.showPlayButton = true
            })
          }
        })

        hls.on(window.Hls.Events.ERROR, (event, data) => {
          console.error('HlsVideoPlayer: HLS error:', data)

          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                console.log('HlsVideoPlayer: Network error, trying to recover')
                hls.startLoad()
                break
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                console.log('HlsVideoPlayer: Media error, trying to recover')
                hls.recoverMediaError()
                break
              default:
                console.log('HlsVideoPlayer: Fatal error, switching to native')
                this.switchToNative(url)
                break
            }
          }
        })

      } catch (error) {
        console.error('HlsVideoPlayer: Failed to load HLS video:', error)
        this.switchToNative(url)
      }
    },

    switchToNative(url) {
      console.log('HlsVideoPlayer: switching to native video')
      this.destroyHls()
      this.loadNativeVideo(url)
    },

    loadNativeVideo(url) {
      try {
        console.log('HlsVideoPlayer: loadNativeVideo:', url)

        // 确保videoElement存在
        if (!this.videoElement) {
          console.error('HlsVideoPlayer: videoElement is null in loadNativeVideo')
          throw new Error('播放器元素不存在')
        }

        // 重置video元素
        this.videoElement.pause()
        this.videoElement.src = ''

        // 创建source元素
        const source = document.createElement('source')
        source.src = url

        // 尝试检测视频类型
        if (url.includes('.mp4')) {
          source.type = 'video/mp4'
        } else if (url.includes('.m3u8')) {
          source.type = 'application/x-mpegURL'
        }

        // 清空现有source
        while (this.videoElement.firstChild) {
          this.videoElement.removeChild(this.videoElement.firstChild)
        }

        // 添加新source
        this.videoElement.appendChild(source)
        this.videoElement.load()

        // 设置自动播放
        if (this.autoplay) {
          this.videoElement.play().catch(e => {
            console.log('HlsVideoPlayer: Autoplay blocked:', e)
            this.showPlayButton = true
          })
        }

        this.isLoading = false
        this.showPlayButton = true
        console.log('HlsVideoPlayer: native video loaded')

      } catch (error) {
        console.error('HlsVideoPlayer: Failed to load native video:', error)
        this.isLoading = false
        this.errorMessage = '视频加载失败，请检查网络或重试'
        this.hasError = true
      }
    },

    async ensureHlsLoaded() {
      return new Promise((resolve) => {
        if (window.Hls) {
          console.log('HlsVideoPlayer: HLS is already loaded')
          resolve()
          return
        }

        console.log('HlsVideoPlayer: Loading HLS.js...')

        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js'
        script.onload = () => {
          console.log('HlsVideoPlayer: HLS.js loaded successfully')
          resolve()
        }
        script.onerror = () => {
          console.error('HlsVideoPlayer: Failed to load HLS.js')
          resolve()
        }
        script.async = true
        document.head.appendChild(script)
      })
    },

    destroyHls() {
      return new Promise((resolve) => {
        if (this.hlsInstance) {
          try {
            this.hlsInstance.destroy()
          } catch (e) {
            console.log('HlsVideoPlayer: Error destroying HLS instance:', e)
          }
          this.hlsInstance = null
        }
        resolve()
      })
    },

    togglePlay() {
      if (!this.videoElement) return

      if (this.isPlaying) {
        this.videoElement.pause()
      } else {
        this.videoElement.play().catch(e => {
          console.log('HlsVideoPlayer: Play failed:', e)
        })
      }
    },

    toggleMute() {
      if (!this.videoElement) return
      this.isMuted = !this.isMuted
      this.videoElement.muted = this.isMuted
    },

    toggleFullscreen() {
      if (!this.videoElement) return

      if (!document.fullscreenElement) {
        this.videoElement.requestFullscreen().catch(e => {
          console.log('HlsVideoPlayer: Fullscreen request failed:', e)
        })
      } else {
        document.exitFullscreen()
      }
    },

    seekTo(e) {
      if (!this.videoElement || this.duration === 0) return

      const track = e.currentTarget.querySelector('.progress-track')
      if (!track) return

      const rect = track.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      const time = percent * this.duration

      this.videoElement.currentTime = Math.max(0, Math.min(time, this.duration))
    },

    onVideoError(e) {
      console.error('HlsVideoPlayer: Video error:', e)
      this.isLoading = false

      // 如果有HLS实例，尝试切换到原生播放
      if (this.hlsInstance) {
        console.log('HlsVideoPlayer: video error, trying native fallback')
        this.switchToNative(this.src)
        return
      }

      this.errorMessage = '视频播放失败，请重试'
      this.hasError = true
      this.$emit('error', e)
    },

    onLoadedMetadata() {
      if (!this.videoElement) return
      console.log('HlsVideoPlayer: loadedmetadata, duration:', this.videoElement.duration)
      this.duration = this.videoElement.duration
      this.$emit('loadedmetadata')
    },

    onCanPlay() {
      console.log('HlsVideoPlayer: canplay')
      this.isLoading = false
      this.showPlayButton = true
    },

    onTimeUpdate() {
      if (!this.videoElement) return
      this.currentTime = this.videoElement.currentTime
      this.isPlaying = !this.videoElement.paused
      this.$emit('timeupdate', this.currentTime)
    },

    onVideoPause() {
      this.isPlaying = false
      this.showPlayButton = true
    },

    onVideoPlay() {
      this.isPlaying = true
      this.showPlayButton = false
    },

    onVideoEnded() {
      console.log('HlsVideoPlayer: video ended')
      this.isPlaying = false
      this.showPlayButton = true

      if (this.loop && this.videoElement) {
        this.videoElement.currentTime = 0
        this.videoElement.play()
      }

      this.$emit('ended')
    },

    retryPlay() {
      console.log('HlsVideoPlayer: retry play')
      if (this.src) {
        this.loadVideo(this.src)
      }
    },

    formatTime(seconds) {
      if (isNaN(seconds)) return '00:00'

      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = Math.floor(seconds % 60)

      if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      }
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
  }
}
</script>

<style lang="scss" scoped>
.hls-video-player-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;
}

.video-wrapper {
  width: 100%;
  height: 100%;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 10;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 16px;
  color: #fff;
  font-size: 28rpx;
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 10;
}

.error-icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 20rpx;
}

.error-text {
  color: #fff;
  font-size: 28rpx;
  margin-bottom: 30rpx;
  text-align: center;
  padding: 0 40rpx;
}

.retry-btn {
  padding: 16rpx 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 5;
}

.play-btn-circle {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-icon {
  font-size: 40rpx;
  color: #000;
  margin-left: 6rpx;
}

.controls-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  z-index: 5;
}

.progress-container {
  position: relative;
  height: 40rpx;
  display: flex;
  align-items: center;
}

.progress-track {
  width: 100%;
  height: 6rpx;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3rpx;
  position: relative;
  overflow: hidden;
}

.progress-buffered {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 3rpx;
}

.progress-filled {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--cr-surface);
  border-radius: 3rpx;
  z-index: 1;
}

.progress-thumb {
  position: absolute;
  width: 20rpx;
  height: 20rpx;
  background-color: var(--cr-surface);
  border-radius: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.control-left,
.control-right {
  flex: 1;
}

.time-text {
  color: #fff;
  font-size: 24rpx;
}

.control-center {
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.control-btn {
  color: #fff;
  font-size: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
}
.control-btn-img {
  width: 36rpx;
  height: 36rpx;
}
</style>