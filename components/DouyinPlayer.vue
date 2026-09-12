<template>
  <view v-if="show" class="douyin-player-mask" @tap="handleClose">
    <view class="douyin-player-container" @tap.stop>
      <!-- 顶部关闭按钮 -->
      <view class="douyin-player-header">
        <view class="close-btn" @tap="handleClose">
          <text class="close-icon">×</text>
        </view>
        <text class="player-title">{{ postTitle || '视频播放' }}</text>
        <view class="placeholder"></view>
      </view>

      <!-- 视频区域 - 全屏原生播放器 -->
      <video
        :id="'douyin-video-' + currentIndex"
        :src="currentVideo.url"
        :poster="currentVideo.cover"
        class="douyin-video-full"
        mode="aspectFill"
        :autoplay="true"
        :loop="true"
        :controls="true"
        :show-center-play-btn="true"
        :enable-play-gesture="true"
        @play="onVideoPlay"
        @pause="onVideoPause"
        @ended="onVideoEnded"
        @error="onVideoError"
      ></video>

      <!-- 右侧操作栏 -->
      <view class="right-action-bar" v-if="currentVideo.url && currentVideo.url !== '0'">
        <!-- 头像 -->
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
        
        <!-- 点赞按钮 -->
        <view class="action-item" @tap="handleLike">
          <image 
            class="action-icon-img" 
            :src="currentVideo.isLiked ? '/static/post/xih1.png' : '/static/post/xih0.png'"
            mode="aspectFit"
          ></image>
          <text class="action-text">{{ currentVideo.likeCount || 0 }}</text>
        </view>
        
        <!-- 评论按钮 -->
        <view class="action-item" @tap="showCommentModal = true">
          <image 
            class="action-icon-img comment-icon" 
            src="/static/post/pl.png"
            mode="aspectFit"
          ></image>
          <text class="action-text">{{ currentVideo.commentCount || 0 }}</text>
        </view>
        
        <!-- 打赏按钮 -->
        <view class="action-item" @tap="showRewardModal = true">
          <view class="reward-icon-wrapper">
            <text class="reward-icon-text">赏</text>
          </view>
        </view>
      </view>

      <!-- 底部信息栏 -->
      <view class="video-info-bar" v-if="currentVideo.url && currentVideo.url !== '0'">
        <view 
          class="video-author-name" 
          @tap="handleAvatarClick"
        >{{ currentVideo.author || '抖音用户' }}</view>
        <view class="video-title">{{ postTitle || currentVideo.title || '抖音视频' }}</view>
      </view>
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
    return {
      currentIndex: 0,
      videoPlaying: false,
      statusBarHeight: 44,
      
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
  },
  watch: {
    show: function(val) {
      if (val) {
        this.currentIndex = this.initialIndex
        this.loadVideoComments()
      }
    }
  },
  computed: {
    currentVideo() {
      return this.videoList[this.currentIndex] || {}
    }
  },
  methods: {
    handleClose() {
      this.$emit('update:show', false)
    },
    
    onVideoPlay() {
      this.videoPlaying = true
    },
    
    onVideoPause() {
      this.videoPlaying = false
    },
    
    onVideoEnded() {
      this.videoPlaying = false
    },
    
    onVideoError() {
      uni.showToast({ title: '视频加载失败', icon: 'none' })
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
        this.$set(this.videoList[index], 'likeCount', 
          liked ? (this.videoList[index].likeCount || 0) + 1 : 
                  Math.max(0, (this.videoList[index].likeCount || 0) - 1)
        )
      }
      this.$emit('like', {
        video: this.currentVideo,
        index: this.currentIndex,
        liked
      })
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
      
      const actualAmount = this.isCustomReward ? (parseInt(this.customRewardAmount) || 0) : this.rewardAmount
      
      if (actualAmount < 100) {
        uni.showToast({ title: '最低打赏100积分', icon: 'none' })
        return
      }
      
      const balance = Number(this.userInfo && this.userInfo.jifen || 0)
      
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24rpx;
  padding-right: 24rpx;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0));
  z-index: 9999;
  pointer-events: auto;
}

.close-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
}

.close-icon {
  color: #fff;
  font-size: 40rpx;
  font-weight: bold;
}

.player-title {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}

.placeholder {
  width: 64rpx;
}

.douyin-video-full {
  width: 100%;
  height: 100%;
}

.right-action-bar {
  position: fixed;
  right: 24rpx;
  bottom: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 9999;
  pointer-events: auto;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 20rpx;
}

.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.5);
}

.follow-btn {
  position: absolute;
  bottom: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 44rpx;
  height: 44rpx;
  background: linear-gradient(135deg, #ff2c55, #ff0050);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fff;
}

.follow-icon {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  margin-top: 32rpx;
}

.action-item:first-child {
  margin-top: 36rpx;
}

.action-icon-img {
  width: 64rpx;
  height: 64rpx;
}

.comment-icon {
  filter: invert(1);
}

.action-text {
  color: #fff;
  font-size: 24rpx;
}

.video-info-bar {
  position: fixed;
  left: 24rpx;
  right: 140rpx;
  bottom: 180rpx;
  z-index: 9999;
  pointer-events: auto;
}

.video-author-name {
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.5);
}

.video-author-name:active {
  opacity: 0.7;
}

.video-title {
  color: #fff;
  font-size: 28rpx;
  line-height: 1.5;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.5);
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
  background: rgba(0,0,0,0.7);
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
  background: rgba(0,0,0,0.7);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
  background: linear-gradient(135deg, rgba(255,44,85,0.1), rgba(255,44,85,0.05));
  box-shadow: 0 0 0 4rpx rgba(255,44,85,0.1);
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
