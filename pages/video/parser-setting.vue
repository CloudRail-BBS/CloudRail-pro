<template>
  <view class="parser-setting-page" :class="themeClass">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-title">
        <text>解析接口设置</text>
      </view>
      <view class="nav-right"></view>
    </view>

    <scroll-view class="content-scroll" scroll-y="true" :style="{ height: scrollHeight + 'px' }">
      <!-- 设置说明 -->
      <view class="tip-section">
        <view class="tip-title">使用说明</view>
        <view class="tip-text">
          <text>1. 请输入完整的视频解析接口地址</text>
        </view>
        <view class="tip-text">
          <text>2. 格式示例: https://example.com/api/?url=</text>
        </view>
        <view class="tip-text">
          <text>3. 设置后会自动保存到本地</text>
        </view>
      </view>

      <!-- 接口输入框 -->
      <view class="input-section">
        <view class="input-title">接口地址</view>
        <view class="input-box">
          <input
            class="url-input"
            v-model="parserUrl"
            placeholder="请输入视频解析接口"
            placeholder-class="input-placeholder"
          />
        </view>

        <!-- 保存按钮 -->
        <view class="save-btn" @click="saveSetting">
          <text>保存设置</text>
        </view>
      </view>

      <!-- 常用接口 -->
      <view class="preset-section" v-if="false">
        <view class="section-title">
          <text>常用接口 (点击使用)</text>
        </view>

        <view class="preset-list">
          <view
            class="preset-item"
            v-for="(item, index) in presetUrls"
            :key="index"
            @click="usePreset(item)"
          >
            <text class="preset-name">{{ item.name }}</text>
            <text class="preset-url">{{ item.url }}</text>
          </view>
        </view>
      </view>

      <!-- 当前状态 -->
      <view class="status-section">
        <view class="section-title">
          <text>当前状态</text>
        </view>

        <view class="status-item">
          <view class="status-label">接口状态:</view>
          <view class="status-value" :class="{ active: hasSavedUrl }">
            <text>{{ hasSavedUrl ? '已配置' : '未配置' }}</text>
          </view>
        </view>

        <view class="status-item" v-if="hasSavedUrl">
          <view class="status-label">当前接口:</view>
          <view class="status-value url">
            <text>{{ savedUrl }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      scrollHeight: 0,
      parserUrl: '',
      savedUrl: '',
      hasSavedUrl: false,
      presetUrls: []
    }
  },

  onLoad() {
    this.initData()
  },

  methods: {
    initData() {
      const systemInfo = uni.getSystemInfoSync()
      const navHeight = 44 + (systemInfo.statusBarHeight || 0)
      this.scrollHeight = systemInfo.windowHeight - navHeight

      this.loadSetting()
    },

    loadSetting() {
      try {
        const saved = uni.getStorageSync('video_parser_url')
        if (saved) {
          this.savedUrl = saved
          this.parserUrl = saved
          this.hasSavedUrl = true
        } else {
          this.savedUrl = ''
          this.parserUrl = ''
          this.hasSavedUrl = false
        }
      } catch (e) {
        this.savedUrl = ''
        this.parserUrl = ''
        this.hasSavedUrl = false
      }
    },

    saveSetting() {
      if (!this.parserUrl.trim()) {
        uni.showToast({ title: '请输入接口地址', icon: 'none' })
        return
      }

      try {
        uni.setStorageSync('video_parser_url', this.parserUrl.trim())
        this.savedUrl = this.parserUrl.trim()
        this.hasSavedUrl = true

        uni.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              uni.navigateBack()
            }, 1500)
          }
        })
      } catch (e) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    },

    usePreset(item) {
      this.parserUrl = item.url
    },

    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.parser-setting-page {
  min-height: 100vh;
  background-color: var(--cr-surface-alt);
}

.nav-bar {
  display: flex;
  align-items: center;
  padding-top: var(--status-bar-height);
  height: calc(44px + var(--status-bar-height));
  background-color: var(--cr-surface);
  position: sticky;
  top: 0;
  z-index: 99;
}

.nav-back {
  width: 80rpx;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 56rpx;
  color: var(--cr-text);
  font-weight: 300;
  line-height: 1;
}

.nav-title {
  flex: 1;
  text-align: center;
}

.nav-title text {
  font-size: 32rpx;
  color: var(--cr-text);
  font-weight: 500;
}

.nav-right {
  width: 80rpx;
}

.content-scroll {
  width: 100%;
}

.tip-section {
  background-color: var(--cr-surface);
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.tip-title {
  font-size: 30rpx;
  color: var(--cr-text);
  font-weight: bold;
  margin-bottom: 20rpx;
}

.tip-text {
  font-size: 26rpx;
  color: var(--cr-text-muted);
  line-height: 1.6;
  margin-bottom: 10rpx;
}

.input-section {
  background-color: var(--cr-surface);
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.input-title {
  font-size: 28rpx;
  color: var(--cr-text);
  margin-bottom: 20rpx;
}

.input-box {
  width: 100%;
  background-color: var(--cr-surface-alt);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}

.url-input {
  width: 100%;
  font-size: 28rpx;
  color: var(--cr-text);
  line-height: 1.6;
  word-break: break-all;
}

.input-placeholder {
  color: var(--cr-border-strong);
}

.save-btn {
  width: 100%;
  height: 88rpx;
  background-color: #e53935;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn text {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}

.preset-section {
  background-color: var(--cr-surface);
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  color: var(--cr-text);
  font-weight: bold;
  margin-bottom: 20rpx;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.preset-item {
  background-color: var(--cr-surface-alt);
  border-radius: 12rpx;
  padding: 20rpx;
}

.preset-name {
  display: block;
  font-size: 28rpx;
  color: var(--cr-text);
  font-weight: 500;
  margin-bottom: 8rpx;
}

.preset-url {
  display: block;
  font-size: 24rpx;
  color: var(--cr-text-muted);
  word-break: break-all;
}

.status-section {
  background-color: var(--cr-surface);
  padding: 30rpx;
}

.status-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  width: 150rpx;
  font-size: 28rpx;
  color: var(--cr-text-muted);
}

.status-value {
  flex: 1;
  font-size: 28rpx;
  color: var(--cr-text-muted);
}

.status-value.active {
  color: #07c160;
  font-weight: 500;
}

.status-value.url {
  word-break: break-all;
  line-height: 1.6;
}
</style>