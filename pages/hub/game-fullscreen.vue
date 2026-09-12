<template>
  <view class="game-fullscreen-page">
    <!-- #ifdef APP-PLUS -->
    <web-view :src="gameUrl" class="game-webview" allow-file-access="true" allow-pull-down-refresh="false"></web-view>
    <!-- #endif -->

    <!-- #ifndef APP-PLUS -->
    <view class="h5-game-container">
      <web-view :src="gameUrl" class="game-webview"></web-view>
    </view>
    <!-- #endif -->

    <!-- 返回按钮 -->
    <view class="back-btn" @click="goBack">
      <text class="back-icon">‹</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      gameUrl: ''
    }
  },

  onLoad(options) {
    if (options.url) {
      this.gameUrl = decodeURIComponent(options.url)
    }
  },

  methods: {
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.game-fullscreen-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
}

.game-webview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.h5-game-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.back-btn {
  position: fixed;
  top: 60rpx;
  left: 30rpx;
  width: 70rpx;
  height: 70rpx;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.back-icon {
  font-size: 48rpx;
  color: #fff;
  font-weight: bold;
}
</style>
