<template>
  <view class="container">
    <video
      id="playerVideo"
      class="video"
      :src="videoUrl"
      :autoplay="true"
      :loop="true"
      :controls="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :show-fullscreen-btn="false"
      :enable-progress-gesture="false"
      object-fit="cover"
      @play="onPlay"
      @pause="onPause"
      @click="onVideoClick"
    ></video>
  </view>
</template>

<script>
const API_BASE = 'http://sq.baige.icu/api/index.php/'

export default {
  data() {
    return {
      postId: '',
      videoUrl: '',
      isPlaying: false,
      videoCtx: null,
      postInfo: null
    }
  },
  onLoad(options) {
    this.postId = options.id || ''
    this.loadPostDetail()
    uni.$on('togglePlay', this.togglePlay)
    uni.$on('goBack', this.goBack)
  },
  onUnload() {
    uni.$off('togglePlay', this.togglePlay)
    uni.$off('goBack', this.goBack)
    const subNVue = uni.getSubNVueById('overlay')
    if (subNVue) subNVue.hide()
  },
  onReady() {
    this.videoCtx = uni.createVideoContext('playerVideo', this)
    const subNVue = uni.getSubNVueById('overlay')
    if (subNVue) {
      subNVue.setStyle({
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        position: 'absolute',
        background: 'transparent'
      })
      subNVue.show()
    }
  },
  methods: {
    async loadPostDetail() {
      try {
        const res = await uni.request({
          url: API_BASE + 'post/detail?id=' + this.postId,
          method: 'GET'
        })
        const data = res[0] && res[0].data ? res[0].data : {}
        if (data.code === 0) {
          this.postInfo = data.data || {}
          this.videoUrl = this.postInfo.video || this.postInfo.douyin_url || ''
          // 存storage兜底, 确保subNVue能拿到真实数据
          uni.setStorageSync('currentVideoPost', this.postInfo)
          // 延迟发送, 给subNVue注册监听的时间
          setTimeout(() => {
            uni.$emit('postInfo', this.postInfo)
          }, 200)
          setTimeout(() => {
            uni.$emit('postInfo', this.postInfo)
          }, 600)
        } else {
          uni.showToast({ title: data.msg || '加载失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    onPlay() {
      this.isPlaying = true
      uni.$emit('playState', true)
    },
    onPause() {
      this.isPlaying = false
      uni.$emit('playState', false)
    },
    onVideoClick() {
      uni.$emit('videoClick')
    },
    togglePlay() {
      if (this.isPlaying) {
        this.videoCtx && this.videoCtx.pause()
      } else {
        this.videoCtx && this.videoCtx.play()
      }
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style>
.container {
  flex: 1;
  background-color: #000000;
}
.video {
  width: 100%;
  height: 100%;
}
</style>
