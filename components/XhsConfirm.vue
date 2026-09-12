<template>
  <view class="confirm-overlay" v-if="visible" @touchmove.stop.prevent @click="handleOverlayClick">
    <view class="confirm-box" @click.stop>
      <view class="confirm-body">
        <text v-if="title" class="confirm-title">{{ title }}</text>
        <text class="confirm-msg" :class="{ 'no-title': !title }">{{ message }}</text>
      </view>
      <view class="confirm-divider"></view>
      <view class="confirm-actions">
        <view class="confirm-btn cancel" @click="handleCancel">
          <text class="btn-text cancel-text">{{ cancelText }}</text>
        </view>
        <view class="confirm-btn-divider"></view>
        <view class="confirm-btn ok" @click="handleConfirm">
          <text class="btn-text ok-text">{{ confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'XhsConfirm',
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    confirmText: { type: String, default: '确定' },
    cancelText: { type: String, default: '取消' },
    maskClosable: { type: Boolean, default: true }
  },
  methods: {
    handleConfirm() { this.$emit('confirm'); },
    handleCancel() { this.$emit('cancel'); },
    handleOverlayClick() { if (this.maskClosable) this.$emit('cancel'); }
  }
};
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  animation: overlay-in 0.2s ease;
}

.confirm-box {
  width: 560rpx;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 24rpx 80rpx rgba(0, 0, 0, 0.18);
  animation: box-in 0.22s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.confirm-body {
  padding: 52rpx 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.confirm-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111;
  text-align: center;
  letter-spacing: 0.5rpx;
}

.confirm-msg {
  font-size: 28rpx;
  color: #888;
  line-height: 1.65;
  text-align: center;
}

.confirm-msg.no-title {
  font-size: 32rpx;
  color: #333;
  padding-top: 8rpx;
}

.confirm-divider {
  height: 1rpx;
  background: #f0f0f0;
}

.confirm-actions {
  display: flex;
  height: 100rpx;
}

.confirm-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-btn:active {
  background: #f7f7f7;
}

.confirm-btn-divider {
  width: 1rpx;
  background: #f0f0f0;
  align-self: stretch;
}

.btn-text {
  font-size: 32rpx;
}

.cancel-text {
  color: #999;
  font-weight: 400;
}

.ok-text {
  color: #ff2442;
  font-weight: 600;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes box-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
</style>
