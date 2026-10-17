<template>
  <view v-if="show" class="ios-hud-mask" :class="themeClass" @touchmove.stop.prevent>
    <view class="ios-hud-box" @tap.stop>
      <view v-if="mode === 'loading'" class="ios-spinner"></view>
      <view v-else-if="mode === 'success'" class="ios-success-icon">
        <view class="ios-checkmark"></view>
      </view>
      <view v-else-if="mode === 'error'" class="ios-error-icon">
        <view class="ios-error-mark"></view>
      </view>
      <text class="ios-hud-text" v-if="text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup>
import { themeClass } from '../common/theme.js'
const props = defineProps({
  show: { type: Boolean, default: false },
  text: { type: String, default: '' },
  // loading | success | error
  mode: { type: String, default: 'loading' }
})
</script>

<style scoped>
.ios-hud-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.ios-hud-box {
  min-width: 220rpx;
  min-height: 220rpx;
  background: rgba(30, 30, 30, 0.75);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
}

.ios-hud-text {
  font-size: 28rpx;
  color: #fff;
  margin-top: 24rpx;
  text-align: center;
  max-width: 360rpx;
  line-height: 1.4;
}

.ios-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  border-top: 6rpx solid #fff;
  border-radius: 50%;
  animation: iosRotate 0.8s linear infinite;
}

@keyframes iosRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ios-success-icon {
  width: 64rpx;
  height: 64rpx;
  position: relative;
}

.ios-checkmark {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3rpx solid #fff;
  position: relative;
}

.ios-checkmark::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20rpx;
  height: 36rpx;
  border-bottom: 5rpx solid #fff;
  border-right: 5rpx solid #fff;
  transform: translate(-50%, -60%) rotate(45deg);
}

.ios-error-icon {
  width: 64rpx;
  height: 64rpx;
  position: relative;
}

.ios-error-mark {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3rpx solid #fff;
  position: relative;
}

.ios-error-mark::before,
.ios-error-mark::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 36rpx;
  height: 5rpx;
  background: var(--cr-surface);
  transform-origin: center;
}

.ios-error-mark::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.ios-error-mark::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}
</style>
