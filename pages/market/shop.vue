<template>
  <view class="page-container">
    <view class="nav-bar-fixed">
      <view :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content">
        <view class="nav-left" @click="goBack">
          <image src="/static/icon/fanhui.png" class="nav-icon"></image>
        </view>
        <view class="nav-center">
          <text class="nav-title">社区集市</text>
        </view>
        <view class="nav-right"></view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 88) + 'px' }"></view>

    <MarketShopSection />
  </view>
</template>

<script>
import MarketShopSection from '../../components/MarketShopSection.vue'

export default {
  components: {
    MarketShopSection
  },
  data() {
    return {
      statusBarHeight: 20
    }
  },
  onLoad() {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
  },
  methods: {
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.nav-bar-fixed {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: #fff;
  z-index: 999;
  border-bottom: 1rpx solid #f5f5f5;
}

.nav-content {
  height: 88rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
}

.nav-left,
.nav-right {
  z-index: 10;
  display: flex;
  align-items: center;
  width: 60rpx;
}

.nav-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.nav-icon {
  width: 44rpx;
  height: 44rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1d1d1f;
}
</style>
