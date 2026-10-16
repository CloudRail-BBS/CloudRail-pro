<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-side left" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="nav-title">我的二维码</view>
        <view class="nav-side"></view>
      </view>
    </view>

    <view :style="{ height: navPlaceholderHeight + 'px' }"></view>

    <scroll-view scroll-y class="page-scroll" :show-scrollbar="false">
      <view class="content">
        <view class="user-card">
          <view class="avatar-shell">
            <image
              class="avatar"
              :src="displayAvatar"
              mode="aspectFill"
              lazy-load
            ></image>
            <image
              v-if="currentFrameUrl"
              :src="currentFrameUrl"
              class="avatar-frame"
              mode="aspectFit"
            ></image>
          </view>

          <text class="user-name">{{ displayName }}</text>
          <text class="user-bio">{{ displaySignature }}</text>
        </view>

        <view class="qr-card">
          <view class="qrcode-box">
            <image
              v-if="qrcodeUrl"
              class="qrcode"
              :src="qrcodeUrl"
              mode="aspectFit"
              show-menu-by-longpress
              lazy-load
            ></image>

            <view v-else class="qrcode-placeholder">
              <text class="qrcode-placeholder-text">二维码生成中...</text>
            </view>

            <view class="qrcode-center">
              <image class="logo-image" src="/static/logo.png" mode="aspectFit"></image>
            </view>
          </view>

          <text class="qrcode-tip">扫一扫上面的二维码图案，加我为朋友。</text>
        </view>

        <view class="action-bar">
          <view class="action-btn" @click="scanQRCode">
            <text class="action-btn-text">扫一扫</text>
          </view>
          <view class="action-btn primary" @click="saveImage">
            <text class="action-btn-text primary-text">保存图片</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="toast" :class="{ show: toast.show }">
      <text class="toast-text">{{ toast.text }}</text>
    </view>

    <XhsHUD :show="hud.show" :type="hud.type" :text="hud.text" />
  </view>
</template>

<script>
import { webBaseUrl } from '../../common/request.js'
import XhsHUD from '../../components/XhsHUD.vue'

const DEFAULT_AVATAR = 'https://y.sgyunp.cn/f/6eXTL/IMG_5336.jpeg'

export default {
  components: {
    XhsHUD
  },
  data() {
    return {
      statusBarHeight: 20,
      navPlaceholderHeight: 64,

      userInfo: null,
      currentFrameUrl: '',
      qrcodeUrl: '',

      toast: {
        show: false,
        text: ''
      },
      toastTimer: null,

      hud: {
        show: false,
        type: 'loading',
        text: '加载中...'
      }
    }
  },

  computed: {
    displayAvatar() {
      return (this.userInfo && this.userInfo.avatar) || DEFAULT_AVATAR
    },
    displayName() {
      if (!this.userInfo) return '未命名用户'
      return this.userInfo.name || this.userInfo.username || '未命名用户'
    },
    displaySignature() {
      if (!this.userInfo) return '这个人很懒，什么都没留下'
      return this.userInfo.personal_signature || '这个人很懒，什么都没留下'
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.navPlaceholderHeight = this.statusBarHeight + 44
    this.initPage()
  },

  onUnload() {
    this.clearToastTimer()
  },

  methods: {
    initPage() {
      const userInfo = uni.getStorageSync('userInfo')
      const token = uni.getStorageSync('token')

      if (!userInfo || !token) {
        uni.navigateBack()
        return
      }

      this.userInfo = userInfo
      this.currentFrameUrl = userInfo.current_frame_img || ''
      this.buildQRCode()
    },

    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },

    buildQRCode() {
      if (!this.userInfo || !this.userInfo.id) return

      this.hud.show = true
      this.hud.type = 'loading'
      this.hud.text = '生成二维码中...'

      const userId = this.userInfo.id
      const qrData = `${webBaseUrl}/#/pages/user/profile?userId=${userId}`

      this.qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&ecc=H&margin=8&data=${encodeURIComponent(qrData)}`

      setTimeout(() => {
        this.hud.show = false
      }, 400)
    },

    scanQRCode() {
      uni.scanCode({
        success: (res) => {
          const result = res && res.result ? String(res.result) : ''
          if (!result) {
            this.showToast('未识别到内容')
            return
          }

          const match = result.match(/userId=([^&\s]+)/)
          if (match && match[1]) {
            uni.navigateTo({
              url: `/pages/user/profile?userId=${match[1]}`
            })
          } else {
            this.showToast('不是有效的用户二维码')
          }
        },
        fail: () => {
          this.showToast('扫码失败')
        }
      })
    },

    saveImage() {
      if (!this.qrcodeUrl) {
        this.showToast('二维码还未生成')
        return
      }

      this.hud.show = true
      this.hud.type = 'loading'
      this.hud.text = '保存中...'

      uni.downloadFile({
        url: this.qrcodeUrl,
        success: (res) => {
          if (res.statusCode !== 200) {
            this.hud.show = false
            this.showToast('下载失败')
            return
          }

          uni.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              this.hud.show = false
              this.showToast('已保存到相册')
            },
            fail: () => {
              this.hud.show = false
              this.showToast('保存失败，请检查权限')
            }
          })
        },
        fail: () => {
          this.hud.show = false
          this.showToast('下载失败')
        }
      })
    },

    showToast(text) {
      this.toast.text = text
      this.toast.show = true
      this.clearToastTimer()
      this.toastTimer = setTimeout(() => {
        this.toast.show = false
      }, 1800)
    },

    clearToastTimer() {
      if (this.toastTimer) {
        clearTimeout(this.toastTimer)
        this.toastTimer = null
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-inner {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
}

.nav-side {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-side.left {
  justify-content: flex-start;
}

.back-icon {
  font-size: 32px;
  color: #111111;
  font-weight: 300;
  line-height: 1;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 19px;
  font-weight: 700;
  color: #111111;
  letter-spacing: 0.5px;
}

.page-scroll {
  height: calc(100vh - 44px);
}

.content {
  padding: 28rpx 44rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.user-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 24rpx;
  margin-bottom: 40rpx;
}

.avatar-shell {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: block;
  background: #f5f5f5;
  z-index: 1;
}

.avatar-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.user-name {
  font-size: 52rpx;
  line-height: 1.2;
  color: #111111;
  font-weight: 500;
  margin-bottom: 16rpx;
  text-align: center;
}

.user-bio {
  max-width: 92%;
  font-size: 32rpx;
  line-height: 1.7;
  color: #666666;
  text-align: center;
  word-break: break-all;
}

.qr-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8rpx;
}

.qrcode-box {
  width: 520rpx;
  height: 520rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
  background: #fff;
}

.qrcode {
  width: 520rpx;
  height: 520rpx;
  display: block;
}

.qrcode-placeholder {
  width: 520rpx;
  height: 520rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f7f7;
}

.qrcode-placeholder-text {
  color: #999;
  font-size: 28rpx;
}

.qrcode-center {
  position: absolute;
  width: 108rpx;
  height: 108rpx;
  border-radius: 22rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  z-index: 3;
}

.logo-image {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
}

.qrcode-tip {
  font-size: 30rpx;
  line-height: 1.6;
  color: #b2b2b2;
  text-align: center;
  margin-top: 12rpx;
}

.action-bar {
  margin-top: 54rpx;
  width: 100%;
  display: flex;
  gap: 24rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background: #111111;
}

.action-btn-text {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
}

.primary-text {
  color: #ffffff;
}

.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(0.94);
  background: rgba(0, 0, 0, 0.76);
  border-radius: 20rpx;
  padding: 20rpx 32rpx;
  opacity: 0;
  z-index: 9999;
  transition: all 0.2s ease;
  pointer-events: none;
}

.toast.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.toast-text {
  color: #ffffff;
  font-size: 28rpx;
  line-height: 1.4;
}

@media screen and (min-width: 768px) {
  .content {
    max-width: 680rpx;
    margin: 0 auto;
  }
}
</style>
