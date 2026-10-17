<template>
  <view class="publish-modal" :class="[themeClass, { show: visible }]" @click="onMaskClick">
    <view class="modal-mask" :class="{ show: visible }"></view>
    <view class="modal-content" :class="{ show: visible }" @click.stop>
      <view class="close-btn" @click="close">
        <text class="close-icon">×</text>
      </view>
      <view class="header-section">
        <text class="main-title">让生活有迹可循</text>
        <text class="sub-title">频繁的记录是为了让幸福可以翻阅，今天记录了嘛&gt;QAQ&lt;</text>
      </view>

      <view class="options-section">
        <view class="option-card primary" @click="onOptionClick('post')">
          <view class="option-info">
            <text class="option-title">发帖子</text>
            <text class="option-desc">发个帖子 分享趣事</text>
          </view>
          <view class="option-arrow">›</view>
        </view>
        <view class="divider"></view>
        <view class="option-card primary" @click="onOptionClick('dynamic')">
          <view class="option-info">
            <text class="option-title">发动态</text>
            <text class="option-desc">分享生活 记录此刻</text>
          </view>
          <view class="option-arrow">›</view>
        </view>
        <view class="divider"></view>
        <view class="options-grid">
          <view class="option-item" @click="onOptionClick('product')">
            <view class="option-icon-wrap small">
              <image src="/static/icon/shop.png" class="option-icon-sm" mode="aspectFit"></image>
            </view>
            <text class="item-title">发闲置</text>
            <text class="item-desc">快速发布商品</text>
          </view>
          <view class="option-item" @click="onOptionClick('software')">
            <view class="option-icon-wrap small">
              <image src="/static/icon/rw.png" class="option-icon-sm" mode="aspectFit"></image>
            </view>
            <text class="item-title">发软件</text>
            <text class="item-desc">发布到软件库</text>
          </view>
        </view>
      </view>

      <view class="footer-section">
        <text class="footer-text">&gt;QAQ&lt;</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'PublishModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    visible(val) {
      if (typeof document === 'undefined' || !document.body) return
      document.body.style.overflow = val ? 'hidden' : ''
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    onMaskClick() {
      this.close()
    },
    onOptionClick(type) {
      let url = ''
      switch (type) {
        case 'post':
          url = '/pages/publish/publish'
          break
        case 'dynamic':
          url = '/pages/dynamic/publish'
          break
        case 'product':
          url = '/pages/market/publish'
          break
        case 'software':
          url = '/pages/software/publish'
          break
        default:
          url = '/pages/publish/publish'
      }

      this.$emit('select', { type, url })
      this.close()
      setTimeout(() => {
        uni.navigateTo({ url })
      }, 300)
    }
  }
}
</script>

<style scoped>
.publish-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.publish-modal.show {
  pointer-events: auto;
  opacity: 1;
}

.modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.modal-mask.show {
  opacity: 1;
}

.modal-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #fff0f2 0%, #ffffff 30%);
  border-radius: 40rpx 40rpx 0 0;
  padding: 40rpx;
  padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  max-height: 85vh;
  overflow-y: auto;
}

.modal-content.show {
  transform: translateY(0);
}

.close-btn {
  position: absolute;
  top: 30rpx;
  right: 30rpx;
  width: 60rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
}

.close-btn:active {
  background: var(--cr-surface-alt);
  transform: scale(0.95);
}

.close-icon {
  font-size: 40rpx;
  color: #ff6b81;
  line-height: 1;
  margin-top: -2rpx;
}

.header-section {
  text-align: left;
  margin-bottom: 40rpx;
  padding: 0 10rpx;
}

.main-title {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: var(--cr-text);
  margin-bottom: 12rpx;
  letter-spacing: 1rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
}

.sub-title {
  display: block;
  font-size: 24rpx;
  color: var(--cr-text-muted);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
}

.options-section {
  margin-bottom: 40rpx;
}

.divider {
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
  margin: 30rpx 0;
}

.option-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: linear-gradient(135deg, #ff6b81 0%, #ff2442 100%);
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 107, 129, 0.2);
  transition: all 0.2s;
}

.option-card.secondary {
  background: var(--cr-surface-alt);
  box-shadow: none;
  border: 1rpx solid var(--cr-border);
}

.option-card.secondary .option-title {
  color: var(--cr-text);
}

.option-card.secondary .option-desc {
  color: var(--cr-text-muted);
}

.option-card.secondary .option-arrow {
  color: rgba(0, 0, 0, 0.3);
}

.option-card:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(255, 107, 129, 0.15);
}

.option-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.option-icon-wrap.small {
  width: 72rpx;
  height: 72rpx;
  background: var(--cr-surface);
  border-radius: 16rpx;
  margin-right: 0;
  margin-bottom: 12rpx;
}

.option-icon {
  width: 48rpx;
  height: 48rpx;
}

.option-icon-sm {
  width: 40rpx;
  height: 40rpx;
}

.option-info {
  flex: 1;
}

.option-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8rpx;
}

.option-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

.option-arrow {
  font-size: 48rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.option-item {
  background: var(--cr-surface-alt);
  border-radius: 20rpx;
  padding: 28rpx 20rpx;
  text-align: center;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 140rpx;
}

.option-item:active {
  background: var(--cr-surface-alt);
  transform: scale(0.98);
}

.item-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--cr-text);
  margin-bottom: 6rpx;
}

.item-desc {
  display: block;
  font-size: 22rpx;
  color: var(--cr-text-muted);
}

.footer-section {
  text-align: center;
  padding-top: 20rpx;
}

.footer-text {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}
</style>
