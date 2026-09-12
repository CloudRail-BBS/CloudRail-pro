<template>
  <view class="nav-wrap">
    <view
      class="custom-nav"
      :style="{
        height: navTotalHeight + 'px',
        paddingTop: statusBarHeight + 'px',
        background: background
      }"
    >
      <view class="nav-left" @click="goBack">
        <image
          v-if="showBack"
          src="/static/icon/fanhui.png"
          class="back-icon-img"
          mode="aspectFit"
        ></image>
      </view>

      <view class="nav-center">
        <text class="nav-title">{{ title }}</text>
      </view>

      <view class="nav-right">
        <slot name="right"></slot>
      </view>
    </view>
    <view
      v-if="needPlaceholder"
      class="nav-placeholder"
      :style="{ height: navTotalHeight + 'px' }"
    ></view>
  </view>
</template>

<script>
export default {
  name: 'CustomTopNavSafe',
  props: {
    title: {
      type: String,
      default: ''
    },
    showBack: {
      type: Boolean,
      default: true
    },
    needPlaceholder: {
      type: Boolean,
      default: true
    },
    background: {
      type: String,
      default: 'rgba(255,255,255,0.98)'
    }
  },
  data() {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      navTotalHeight: 64
    };
  },
  mounted() {
    this.initNav();
  },
  methods: {
    initNav() {
      const sys = uni.getSystemInfoSync();
      this.statusBarHeight = sys.statusBarHeight || 20;

      // 小程序胶囊适配
      // #ifdef MP-WEIXIN
      const menu = uni.getMenuButtonBoundingClientRect();
      this.navBarHeight = (menu.top - this.statusBarHeight) * 2 + menu.height;
      // #endif

      // APP / H5
      // #ifdef APP-PLUS || H5
      this.navBarHeight = 44;
      // #endif

      this.navTotalHeight = this.statusBarHeight + this.navBarHeight;

      this.$emit('init', {
        statusBarHeight: this.statusBarHeight,
        navBarHeight: this.navBarHeight,
        navTotalHeight: this.navTotalHeight
      });
    },
    goBack() {
      this.$emit('back');
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({
          url: '/pages/index/index'
        });
      }
    }
  }
};
</script>

<style scoped>
.custom-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  box-shadow: 0 1rpx 0 rgba(0, 0, 0, 0.05);
}

.nav-left,
.nav-right {
  width: 88rpx;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-center {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon-img {
  width: 40rpx;
  height: 40rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.nav-placeholder {
  width: 100%;
}
</style>
