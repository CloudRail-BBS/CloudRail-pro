<template>
  <view v-if="show" class="douyin-player-mask" @tap="handleClose">
    <view class="douyin-player-container" @tap.stop>
      <!-- #ifndef APP-PLUS -->
      <!-- 顶部栏（非 App：video 不是原生组件，普通 view 就能覆盖） -->
      <view class="douyin-player-header">
        <view class="close-btn" @tap="handleClose">
          <text class="close-icon">×</text>
        </view>
        <text class="player-title">{{ postTitle || '视频播放' }}</text>
      </view>
      <!-- #endif -->

      <!-- 视频：竖向 swiper，可上下滑动切换。
           写法参考《仿抖音视频流》里能跑通的那份：video 带 x5-*/playsinline，放在 swiper-item 里 -->
      <swiper
        class="dy-swiper"
        :vertical="true"
        :current="currentIndex"
        :duration="200"
        @change="onSwiperChange"
      >
        <swiper-item v-for="(v, i) in videoList" :key="'vd-' + i">
          <video
            class="dy-video"
            :id="'douyin-video-' + i"
            :src="v.url"
            :poster="v.cover"
            :autoplay="i === currentIndex"
            :loop="true"
            :muted="isMuted"
            :controls="false"
            :show-center-play-btn="false"
            :show-play-btn="false"
            :show-fullscreen-btn="false"
            :enable-progress-gesture="false"
            preload="auto"
            object-fit="contain"
            x5-playsinline=""
            playsinline="true"
            webkit-playsinline="true"
            x-webkit-airplay="allow"
            x5-video-player-type="h5"
            x5-video-player-fullscreen=""
            x5-video-orientation="portraint"
            @click="togglePlay"
          ></video>
        </swiper-item>
      </swiper>
      <view v-if="videoLoading" class="video-loading">
        <text class="video-loading-text">加载中...</text>
      </view>

      <!-- #ifdef APP-PLUS -->
      <!-- App 端覆盖层，照抄《仿抖音视频流》的可用写法：
           ① 与 swiper 同级（不是塞进 video 里）
           ② CSS 用 position: fixed + z-index: 100
           ③ 事件绑 @click（不是 @tap）
           ④ cover-view / cover-image 设 display: inline-block -->
      <cover-view>
        <cover-view class="cv-close" @click="handleClose">
          <cover-view class="cv-close-x">×</cover-view>
        </cover-view>

        <cover-view class="cv-avatar-wrap" @click="handleAvatarClick">
          <cover-image class="cv-avatar" :src="currentVideo.avatar || postAuthorAvatar || '/static/logo.png'" mode="aspectFill"></cover-image>
        </cover-view>

        <cover-view class="cv-follow" @click="handleFollow">
          <cover-view class="cv-follow-plus">+</cover-view>
        </cover-view>

        <cover-view class="cv-item cv-pos-like" @click="handleLike">
          <cover-image class="cv-icon" :src="currentVideo.isLiked ? '/static/post/xih1.png' : '/static/post/xih0.png'" mode="aspectFit"></cover-image>
          <cover-view class="cv-text">{{ currentVideo.likeCount || 0 }}</cover-view>
        </cover-view>

        <cover-view class="cv-item cv-pos-comment" @click="openComment">
          <cover-image class="cv-icon" src="/static/post/pl.png" mode="aspectFit"></cover-image>
          <cover-view class="cv-text">{{ currentVideo.commentCount || 0 }}</cover-view>
        </cover-view>

        <cover-view class="cv-item cv-pos-collect" @click="handleCollect">
          <cover-image class="cv-icon" :src="currentVideo.isCollected ? '/static/icon/star-gold.svg' : '/static/icon/star-white.svg'" mode="aspectFit"></cover-image>
          <cover-view class="cv-text">收藏</cover-view>
        </cover-view>

        <cover-view class="cv-item cv-pos-share" @click="handleShare">
          <cover-image class="cv-icon" src="/static/icon/share-blue.svg" mode="aspectFit"></cover-image>
          <cover-view class="cv-text">分享</cover-view>
        </cover-view>

        <cover-view class="cv-item cv-pos-reward" @click="openReward">
          <cover-image class="cv-icon" src="/static/icon/gift-white.svg" mode="aspectFit"></cover-image>
          <cover-view class="cv-text">打赏</cover-view>
        </cover-view>

        <cover-view class="cv-info-bar">
          <cover-view class="cv-info-name">{{ currentVideo.author || '用户' }}</cover-view>
          <cover-view class="cv-info-title">{{ postTitle || currentVideo.title || '视频' }}</cover-view>
        </cover-view>
      </cover-view>
      <!-- #endif -->

      <!-- #ifndef APP-PLUS -->
      <!-- 顶部/底部渐变遮罩：让白色文字在任意画面上都看得清，且不挡点击 -->
      <view class="top-shade"></view>
      <view class="bottom-shade"></view>
      <!-- 右侧操作栏 -->
      <view class="right-action-bar" v-if="currentVideo.url && currentVideo.url !== '0'">
        <view class="avatar-wrapper" @tap="handleAvatarClick">
          <image
            :src="currentVideo.avatar || postAuthorAvatar || '/static/logo.png'"
            class="user-avatar"
            mode="aspectFill"
          ></image>
          <view class="follow-btn" @tap.stop="handleFollow">
            <text class="follow-icon">+</text>
          </view>
        </view>
        <view class="action-item" @tap="handleLike">
          <image
            class="action-icon-img"
            :src="currentVideo.isLiked ? '/static/post/xih1.png' : '/static/post/xih0.png'"
            mode="aspectFit"
          ></image>
          <text class="action-text">{{ currentVideo.likeCount || 0 }}</text>
        </view>
        <view class="action-item" @tap="showCommentModal = true">
          <image class="action-icon-img comment-icon" src="/static/post/pl.png" mode="aspectFit"></image>
          <text class="action-text">{{ currentVideo.commentCount || 0 }}</text>
        </view>
        <view class="action-item" @tap="handleCollect">
          <image class="action-icon-img" :class="{ collected: currentVideo.isCollected }" src="/static/icon/star-white.svg" mode="aspectFit"></image>
          <text class="action-text">收藏</text>
        </view>
        <view class="action-item" @tap="handleShare">
          <image class="action-icon-img share-icon" src="/static/icon/share-blue.svg" mode="aspectFit"></image>
          <text class="action-text">分享</text>
        </view>
        <view class="action-item" @tap="showRewardModal = true">
          <view class="reward-icon-wrapper">
            <text class="reward-icon-text">赏</text>
          </view>
          <text class="action-text">打赏</text>
        </view>
      </view>
      <!-- 底部信息栏 -->
      <view class="video-info-bar" v-if="currentVideo.url && currentVideo.url !== '0'">
        <view class="video-author-name" @tap="handleAvatarClick">{{ currentVideo.author || '抖音用户' }}</view>
        <view class="video-title">{{ postTitle || currentVideo.title || '抖音视频' }}</view>
      </view>
      <!-- #endif -->

    </view>
    <!-- 评论弹窗 -->
    <view class="comment-modal-mask" v-if="showCommentModal" @touchmove.stop.prevent @tap="showCommentModal = false">
      <view class="comment-modal-box" @tap="safeStop">
        <view class="comment-modal-header">
          <text class="comment-modal-title">评论</text>
          <view class="comment-modal-close" @tap="showCommentModal = false">
            <text class="close-icon">×</text>
          </view>
        </view>
        <scroll-view class="comment-modal-list" scroll-y>
          <view v-for="(comment, idx) in comments" :key="idx" class="comment-item">
            <image :src="comment.avatar || '/static/logo.png'" class="comment-avatar" mode="aspectFill"></image>
            <view class="comment-content">
              <text class="comment-name">{{ comment.name || '匿名' }}</text>
              <text class="comment-text">{{ comment.content }}</text>
            </view>
          </view>
          <view v-if="comments.length === 0" class="comment-empty">
            <text>暂无评论</text>
          </view>
        </scroll-view>
        <view class="comment-input-area">
          <input
            type="text"
            v-model="commentInput"
            placeholder="发表评论..."
            placeholder-class="comment-placeholder"
            class="comment-input"
            @confirm="submitComment"
          />
          <view class="comment-submit" :class="{ disabled: !commentInput.trim() }" @tap="submitComment">
            <text>发送</text>
          </view>
        </view>
      </view>
    </view>
    <!-- 打赏弹窗 -->
    <view class="reward-modal-mask" v-if="showRewardModal" @touchmove.stop.prevent @tap="showRewardModal = false">
      <view class="reward-modal-box" @tap="safeStop">
        <view class="reward-modal-header">
          <view class="reward-modal-icon">
            <image src="/static/icon/gift-white.svg" class="reward-modal-icon-img" mode="aspectFit"></image>
          </view>
          <text class="reward-modal-title">打赏作者</text>
          <text class="reward-modal-author">打赏给：{{ currentVideo.author || '抖音用户' }}</text>
        </view>
        <view class="reward-amount-grid" @tap.stop>
          <view
            v-for="amount in [100, 200, 500, 1000]"
            :key="amount"
            class="reward-amount-chip"
            :class="{ active: rewardAmount === amount && !isCustomReward }"
            @tap.stop="selectRewardAmount(amount)"
          >
            <text>{{ amount }} 积分</text>
          </view>
          <view
            class="reward-amount-chip custom-chip"
            :class="{ active: isCustomReward }"
            @tap.stop="selectCustomReward"
          >
            <input
              type="digit"
              v-model="customRewardAmount"
              placeholder="自定义"
              placeholder-class="reward-chip-ph"
              class="custom-reward-input"
              @focus.stop="selectCustomReward"
              @input.stop="onCustomRewardInput"
              @blur.stop="safeStop"
            />
          </view>
        </view>
        <view class="reward-balance">
          <text>当前积分：<text class="balance-num">{{ userInfo && userInfo.jifen || 0 }}</text></text>
        </view>
        <view class="reward-btns">
          <view class="reward-cancel" @tap="showRewardModal = false"><text>取消</text></view>
          <view class="reward-confirm" :class="{ disabled: rewardLock }" @tap="handleReward"><text>确认打赏</text></view>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
import { baseUrl, webBaseUrl } from '../common/request.js'

export default {
  name: 'DouyinPlayer',
  props: {
    show: { type: Boolean, default: false },
    videoList: { type: Array, default: () => [] },
    initialIndex: { type: Number, default: 0 },
    userInfo: { type: Object, default: null },
    postTitle: { type: String, default: '' },
    postAuthorAvatar: { type: String, default: '' }
  },
  data() {
    /* H5 浏览器禁止“带声音的自动播放”，只能先静音、点一下再出声；
       App 端没有这个限制，直接出声（跟抖音一致）。 */
    let startMuted = false
    // #ifdef H5
    startMuted = true
    // #endif
    return {
      currentIndex: 0,
      videoPlaying: false,
      statusBarHeight: 44,
      isMuted: startMuted,
      videoLoading: true,
      // 评论弹窗
      showCommentModal: false,
      comments: [],
      commentInput: '',
      // 打赏弹窗
      showRewardModal: false,
      rewardAmount: 100,
      isCustomReward: false,
      customRewardAmount: '',
      rewardLock: false
    }
  },
  mounted() {
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight || 44
    /* 监听宿主要求关闭：宿主页面的 onBackPress 会发这个事件，
       这样按系统返回键先退出播放器，而不是直接退出应用 */
    this._onHostClose = () => { try { this.handleClose() } catch (e) {} }
    uni.$on('qixi_douyin_close', this._onHostClose)
  },
  beforeDestroy() {
    try { uni.$off('qixi_douyin_close', this._onHostClose) } catch (e) {}
    try { uni.$emit('qixi_douyin_open', false) } catch (e) {}
  },
  watch: {
    show: function (val) {
      /* 通知宿主页面“播放器开着/关了”，宿主据此决定返回键行为 */
      try { uni.$emit('qixi_douyin_open', !!val) } catch (e) {}
      if (val) {
        this.currentIndex = this.initialIndex
        this.loadVideoComments()
        this.videoLoading = true
      } else {
        /* 关闭时停掉播放，别在后台继续出声 */
        try { const c = uni.createVideoContext('douyin-video-' + this.currentIndex); if (c) c.pause() } catch (e) {}
      }
    },
    'currentVideo.url': function () {
      this.videoLoading = true
    }
  },
  computed: {
    currentVideo() {
      return this.videoList[this.currentIndex] || {}
    }
  },
  methods: {
    handleClose() {
      try { const c = uni.createVideoContext('douyin-video-' + this.currentIndex); if (c) c.pause() } catch (e) {}
      this.$emit('update:show', false)
    },
    /* 上/下滑切换视频：暂停上一个、播放当前，避免多个原生视频同时出声 */
    onSwiperChange(e) {
      const idx = (e && e.detail && e.detail.current) || 0
      const prev = this.currentIndex
      if (idx === prev) return
      this.currentIndex = idx
      this.videoLoading = true
      try { const p = uni.createVideoContext('douyin-video-' + prev); if (p) p.pause() } catch (er) {}
      this.$nextTick(() => {
        try { const c = uni.createVideoContext('douyin-video-' + idx); if (c) c.play() } catch (er) {}
      })
    },
    onVideoPlay() {
      this.videoPlaying = true
      this.videoLoading = false
    },
    onVideoPause() {
      this.videoPlaying = false
    },
    onVideoEnded() {
      this.videoPlaying = false
    },
    onVideoError() {
      /* 直链失效/被防盗链拦截 → 自动切分享链接代理兜底(重新解析出最新直链) */
      try {
        const cur = this.currentVideo || {}
        const ori = this.pickLink(cur.originalUrl || '')
        let fallback = ''
        if (ori && cur.url && cur.url.indexOf('video/proxy') === -1) {
          fallback = this.buildProxyUrl(ori)
        }
        if (!fallback && cur.url) {
          const du = this.pickLink(cur.url)
          if (du && (du.includes('kuaishou.com') || du.includes('douyin.com') || du.includes('iesdouyin.com'))) {
            fallback = this.buildProxyUrl(du)
          }
        }
        if (fallback) {
          const index = this.currentIndex
          if (this.videoList[index]) {
            this.$set(this.videoList[index], 'url', fallback)
            this.videoLoading = true
            this.$nextTick(() => {
              try {
                const ctx = uni.createVideoContext('douyin-video-' + this.currentIndex)
                if (ctx) ctx.play()
              } catch (e) {}
            })
          }
          return
        }
      } catch (e) {}
      uni.showToast({ title: '视频加载失败', icon: 'none' })
      this.videoLoading = false
    },
    togglePlay() {
      const videoContext = uni.createVideoContext('douyin-video-' + this.currentIndex)
      if (!videoContext) return
      /* 第一次点击: 取消静音(用户手势允许带声音播放, 像抖音点一下出声) */
      if (this.isMuted) {
        this.isMuted = false
        this.$nextTick(() => {
          try {
            videoContext.play()
          } catch (e) {}
        })
        return
      }
      if (this.videoPlaying) {
        videoContext.pause()
      } else {
        videoContext.play()
      }
    },
    loadVideoComments() {
      // 暂时不加载评论，避免404错误
      // this.$emit('loadComments', this.currentIndex)
    },
    safeStop() {
      // 阻止事件冒泡
    },
    handleLike() {
      const liked = !this.currentVideo.isLiked
      const index = this.currentIndex
      if (this.videoList[index]) {
        this.$set(this.videoList[index], 'isLiked', liked)
        this.$set(
          this.videoList[index],
          'likeCount',
          liked
            ? (this.videoList[index].likeCount || 0) + 1
            : Math.max(0, (this.videoList[index].likeCount || 0) - 1)
        )
      }
      this.$emit('like', {
        video: this.currentVideo,
        index: this.currentIndex,
        liked
      })
    },
    handleCollect() {
      const collected = !this.currentVideo.isCollected
      const index = this.currentIndex
      if (this.videoList[index]) this.$set(this.videoList[index], 'isCollected', collected)
      this.$emit('collect', {
        video: this.currentVideo,
        index,
        collected
      })
    },
    handleShare() {
      const v = this.currentVideo || {}
      let link = ''
      try {
        const base = String(webBaseUrl || '').replace(/\/+$/, '')
        link = base + '/#/pages/post-detail/post-detail?id=' + (v.id || '')
      } catch (e) {}
      try {
        if (link) {
          uni.setClipboardData({
            data: link,
            success: () => { uni.showToast({ title: '链接已复制，去粘贴分享吧', icon: 'none' }) }
          })
        } else {
          uni.showToast({ title: '暂无可分享的链接', icon: 'none' })
        }
      } catch (e) {}
      this.$emit('share', { video: v })
    },
    /* App 端原生视频会盖住普通弹窗，所以开弹窗前先把视频藏起来
       （视频上绑的是 v-show="!showCommentModal && !showRewardModal"） */
    openComment() {
      this.showCommentModal = true
    },
    openReward() {
      this.showRewardModal = true
    },
    submitComment() {
      if (!this.commentInput.trim()) return
      const content = this.commentInput.trim()
      this.commentInput = ''
      this.showCommentModal = false
      this.$emit('comment', {
        video: this.currentVideo,
        content
      })
    },
    selectRewardAmount(amount) {
      this.rewardAmount = amount
      this.isCustomReward = false
    },
    selectCustomReward() {
      this.isCustomReward = true
    },
    onCustomRewardInput() {
      const val = parseInt(this.customRewardAmount) || 0
      this.rewardAmount = val
    },
    handleReward() {
      if (this.rewardLock) {
        uni.showToast({ title: '请稍候...', icon: 'none' })
        return
      }
      const actualAmount = this.isCustomReward
        ? parseInt(this.customRewardAmount) || 0
        : this.rewardAmount
      if (actualAmount < 100) {
        uni.showToast({ title: '最低打赏100积分', icon: 'none' })
        return
      }
      const balance = Number((this.userInfo && this.userInfo.jifen) || 0)
      if (balance < actualAmount) {
        uni.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      this.rewardLock = true
      this.showRewardModal = false
      this.$emit('reward', {
        video: this.currentVideo,
        amount: actualAmount
      })
      uni.showToast({
        title: '打赏成功！',
        icon: 'success',
        duration: 2000
      })
      setTimeout(() => {
        this.rewardLock = false
      }, 2000)
    },
    handleFollow() {
      this.$emit('follow', this.currentVideo)
    },
    handleAvatarClick() {
      uni.showToast({ title: '查看用户主页', icon: 'none' })
    },
    /* 拼代理地址(分享链接 → 后端重新解析出最新直链) */
    buildProxyUrl(url) {
      try {
        const base = String(baseUrl || '').replace(/\/+$/, '')
        return base + '/video/proxy?url=' + encodeURIComponent(url)
      } catch (e) {
        return ''
      }
    },
    /* 通用链接提取(兼容快手/抖音/西瓜分享链接) */
    pickLink(text) {
      if (!text) return ''
      const m = String(text).match(/https?:\/\/[^\s"'<>]+/)
      return m ? m[0].replace(/[.,;:!?，。、；：]+$/, '').trim() : ''
    }
  }
}
</script>
<style lang="scss" scoped>
.douyin-player-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}
.douyin-player-container {
  width: 100%;
  height: 100%;
  position: relative;
}
.douyin-player-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  z-index: 20;
  pointer-events: auto;
}
.close-btn {
  position: absolute;
  top: 24rpx;
  left: 24rpx;
  width: 64rpx;
  height: 64rpx;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  text-align: center;
}
.close-icon {
  color: #fff;
  font-size: 40rpx;
  font-weight: bold;
  line-height: 64rpx;
}
.player-title {
  position: absolute;
  top: 32rpx;
  left: 120rpx;
  right: 30rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.video-stage {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  background: #000;
}
.douyin-video-full {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  object-fit: contain;
}
/* 顶部/底部渐变遮罩：白色文字压在任意画面上都清晰，且不拦截点击 */
.top-shade {
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 220rpx;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(0,0,0,.55), rgba(0,0,0,0));
}
.bottom-shade {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 440rpx;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0));
}
/* 视频舞台里的 swiper：上下滑动切换视频 */
.video-swiper {
  width: 100%;
  height: 100%;
}

/* ================= App 端 cover-view 覆盖层（压在原生视频之上） =================
   样式写法参照 post-detail.vue 里已验证可用的 cv-* 规则 */
/* ===== 视频 swiper（参考《仿抖音视频流》能跑通的写法） ===== */
.dy-swiper {
  width: 100%;
  height: 100vh;
}
.dy-video {
  width: 100%;
  height: 100vh;
}

/* ===== App 端 cover-view 覆盖层：照抄参考里的可用写法 =====
   关键三点：position 用 fixed（不是 absolute）、给高 z-index、cover-view/cover-image 设 display:inline-block */
cover-view,
cover-image {
  display: inline-block;
}
.cv-close { position: fixed; left: 24rpx; top: 60rpx; width: 64rpx; height: 64rpx; border-radius: 50%; background-color: rgba(0,0,0,0.42); z-index: 100; }
.cv-close-x { color: #fff; font-size: 42rpx; text-align: center; line-height: 58rpx; }
.cv-avatar-wrap { position: fixed; right: 20rpx; bottom: 56vh; width: 88rpx; height: 88rpx; z-index: 100; }
.cv-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; border: 3px solid #fff; }
.cv-follow { position: fixed; right: 42rpx; bottom: 52vh; width: 34rpx; height: 34rpx; border-radius: 50%; background-color: #ff2442; z-index: 101; }
.cv-follow-plus { color: #fff; font-size: 26rpx; text-align: center; line-height: 34rpx; }
.cv-item { position: fixed; right: 22rpx; z-index: 100; }
.cv-pos-like { bottom: 43vh; }
.cv-pos-comment { bottom: 32vh; }
.cv-pos-collect { bottom: 21vh; }
.cv-pos-share { bottom: 10vh; }
.cv-pos-reward { bottom: 1vh; }
.cv-icon { width: 56rpx; height: 56rpx; }
.cv-text { color: #fff; font-size: 24rpx; text-align: center; margin-top: 6rpx; }
.cv-info-bar { position: fixed; left: 24rpx; right: 170rpx; bottom: 40rpx; z-index: 100; }
.cv-info-name { color: #fff; font-size: 30rpx; font-weight: bold; margin-bottom: 8rpx; }
.cv-info-title { color: #fff; font-size: 26rpx; }
.video-loading {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
}
.video-loading-text {
  color: #fff;
  font-size: 26rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 999rpx;
  padding: 12rpx 32rpx;
}
.right-action-bar {
  position: absolute;
  right: 12rpx;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  width: 110rpx;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
}
.avatar-wrapper {
  position: relative;
  margin-bottom: 28rpx;
}
.user-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.6);
}
.follow-btn {
  position: absolute;
  bottom: -10rpx;
  left: 28rpx;
  width: 44rpx;
  height: 44rpx;
  background: linear-gradient(135deg, #ff2c55, #ff0050);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fff;
  box-sizing: border-box;
}
.follow-icon {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
  line-height: 36rpx;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  margin-top: 36rpx;
}
.action-icon-img {
  width: 64rpx;
  height: 64rpx;
}
/* 分享图标原本是蓝色，统一染成白色以适配深色视频背景 */
.share-icon {
  filter: brightness(0) invert(1);
}
/* 已收藏：星标染成金色 */
.action-icon-img.collected {
  filter: sepia(1) saturate(8) hue-rotate(-8deg) brightness(1.05);
}
.comment-icon {
  filter: invert(1);
}
.action-text {
  color: #fff;
  font-size: 24rpx;
}
.video-info-bar {
  position: absolute;
  left: 24rpx;
  right: 150rpx;
  bottom: calc(36rpx + env(safe-area-inset-bottom));
  z-index: 10;
  pointer-events: auto;
}
.video-author-name {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.5);
}
.video-author-name:active {
  opacity: 0.7;
}
.video-title {
  color: #fff;
  font-size: 28rpx;
  line-height: 1.5;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.5);
}
.reward-icon-wrapper {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  display: flex;
  align-items: center;
  justify-content: center;
}
.reward-icon-text {
  font-size: 24rpx;
  font-weight: 800;
  color: #fff;
}
/* 评论弹窗样式 */
.comment-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
}
.comment-modal-box {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.comment-modal-header {
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2rpx solid #eee;
}
.comment-modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.comment-modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.comment-modal-list {
  flex: 1;
  padding: 24rpx;
  max-height: 50vh;
}
.comment-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
}
.comment-content {
  flex: 1;
}
.comment-name {
  font-size: 26rpx;
  color: #666;
  margin-right: 16rpx;
}
.comment-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}
.comment-empty {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}
.comment-input-area {
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 20rpx;
  border-top: 2rpx solid #eee;
  background: #fafafa;
}
.comment-input {
  flex: 1;
  height: 72rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
}
.comment-placeholder {
  color: #ccc;
}
.comment-submit {
  width: 100rpx;
  height: 72rpx;
  background: #ff2c55;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.comment-submit text {
  color: #fff;
  font-size: 28rpx;
}
.comment-submit.disabled {
  background: #ccc;
}
/* 打赏弹窗样式 */
.reward-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.reward-modal-box {
  width: 620rpx;
  background: linear-gradient(135deg, #fff 0%, #fef5f5 100%);
  border-radius: 40rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(255, 44, 85, 0.2);
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.reward-modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}
.reward-modal-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 30rpx rgba(255, 215, 0, 0.4);
}
.reward-modal-icon-img {
  width: 56rpx;
  height: 56rpx;
}
.reward-modal-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  display: block;
  margin-bottom: 12rpx;
}
.reward-modal-author {
  font-size: 28rpx;
  color: #666;
  text-align: center;
  display: block;
}
.reward-amount-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  margin-bottom: 32rpx;
  justify-content: space-between;
}
.reward-amount-chip {
  width: calc(50% - 12rpx);
  max-width: 260rpx;
  height: 96rpx;
  border-radius: 48rpx;
  border: 3rpx solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.3s ease;
}
.reward-amount-chip:active {
  transform: scale(0.95);
}
.reward-amount-chip text {
  font-size: 30rpx;
  color: #555;
  font-weight: 500;
}
.reward-amount-chip.active {
  border-color: #ff2c55;
  background: linear-gradient(135deg, rgba(255, 44, 85, 0.1), rgba(255, 44, 85, 0.05));
  box-shadow: 0 0 0 4rpx rgba(255, 44, 85, 0.1);
}
.reward-amount-chip.active text {
  color: #ff2c55;
  font-weight: 600;
}
.custom-chip {
  border-style: dashed;
  border-color: #ddd;
}
.custom-chip.active {
  border-color: #ff2c55;
  border-style: solid;
}
.custom-reward-input {
  width: 100%;
  height: 100%;
  text-align: center;
  font-size: 30rpx;
  color: #ff2c55;
  font-weight: 600;
}
.reward-chip-ph {
  color: #ccc;
}
.reward-balance {
  text-align: center;
  margin-bottom: 40rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, #fff8f8, #fff);
  border-radius: 16rpx;
  border: 2rpx solid #ffeaea;
}
.reward-balance text {
  font-size: 28rpx;
  color: #999;
}
.reward-balance text .balance-num {
  color: #ff2c55;
  font-weight: 600;
  font-size: 32rpx;
  margin: 0 8rpx;
}
.reward-btns {
  display: flex;
  gap: 24rpx;
}
.reward-cancel {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.3s ease;
}
.reward-cancel:active {
  background: #f5f5f5;
}
.reward-cancel text {
  font-size: 32rpx;
  color: #666;
  font-weight: 500;
}
.reward-confirm {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #ff2c55, #ff0050);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 44, 85, 0.4);
  transition: all 0.3s ease;
}
.reward-confirm:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 12rpx rgba(255, 44, 85, 0.4);
}
.reward-confirm text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}
.reward-confirm.disabled {
  opacity: 0.5;
  box-shadow: none;
}
</style>
