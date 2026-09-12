<template>
  <view class="publish-container">
    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="handleCancel">
        <text class="nav-text">取消</text>
      </view>
      <view class="nav-title-wrap">
        <text class="nav-title">{{ isEdit ? '编辑动态' : '发动态' }}</text>
      </view>
      <view class="nav-right"></view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view v-if="!isLogin" class="login-auth-wrap">
      <image src="/static/logo.png" mode="aspectFit" class="auth-logo animate-float"></image>
      <text class="auth-title">登录后分享你的精彩生活</text>
      <button class="auth-btn login" @click="goLogin">立即登录</button>
    </view>

    <view v-else class="editor-main">
      <view class="author-row">
        <image :src="loginUser.avatar || '/static/logo.png'" class="author-avatar" mode="aspectFill"></image>
        <view class="author-meta">
          <text class="author-name">{{ loginUser.name || loginUser.username || '用户' }}</text>
          <text class="author-hint">分享此刻生活</text>
        </view>
      </view>

      <view class="title-block">
        <input
          v-model="title"
          placeholder="标题（选填）"
          placeholder-class="placeholder-title"
          maxlength="50"
          class="editor-title"
        />
      </view>

      <view class="content-block">
        <textarea
          v-model="content"
          :placeholder="contentPlaceholder"
          placeholder-class="placeholder-content"
          maxlength="500"
          class="editor-content"
          auto-height
          :show-confirm-bar="false"
          :disable-default-padding="true"
        />
        <text class="counter">{{ content.length }} / 500</text>
      </view>

      <view class="tags-display-area" v-if="parsedTopics.length > 0">
        <view class="tag-badge custom-tag" v-for="(topic, tagIndex) in parsedTopics" :key="'topic-'+tagIndex">
          <text>#{{ topic }}</text>
        </view>
      </view>

      <view class="image-section">
        <view class="image-grid">
          <view class="image-item" v-for="(img, idx) in imageList" :key="idx">
            <image :src="img" class="preview-img" mode="aspectFill"></image>
            <view class="remove-btn" @click="removeImage(idx)">
              <text class="remove-icon">×</text>
            </view>
          </view>
          <view class="add-image-btn" v-if="imageList.length < 9" @click="chooseImage">
            <text class="add-icon">+</text>
            <text class="add-text">{{ imageList.length }}/9</text>
          </view>
        </view>
      </view>
    </view>

    <view class="floating-submit-bar" v-if="isLogin">
      <button class="submit-btn" :class="{ disabled: !canPublish }" @click="handlePublish" hover-class="btn-hover-active">
        <text class="btn-text">{{ publishing ? '发布中...' : (isEdit ? '保存' : '发布') }}</text>
        <view v-if="publishing" class="btn-loading-spinner"></view>
      </button>
    </view>

    <view class="toast" :class="{ show: toast.show }">
      <text>{{ toast.msg }}</text>
    </view>

    <!-- 上传进度遮罩 -->
    <view class="progress-mask" v-if="isUploading">
      <view class="progress-box">
        <text class="progress-percent">{{ uploadProgress }}<text class="percent-symbol">%</text></text>
        <text class="progress-note">上传中，请稍等...</text>
        <view class="progress-bar-bg">
          <view class="progress-bar-fill" :style="{ width: uploadProgress + '%' }"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request, uploadFile } from '../../common/request.js'
import { getScreenMetrics } from '../../common/screen.js'
import { invalidate, CACHE_KEYS } from '../../common/cache.js'

export default {
  data() {
    return {
      statusBarHeight: 0,
      title: '',
      content: '',
      imageList: [],
      topicList: [],
      isLogin: false,
      loginUser: null,
      publishing: false,
      isEdit: false,
      editDynamicId: 0,
      isUploading: false,
      uploadProgress: 0,
      toast: { show: false, msg: '' },
      toastTimer: null
    }
  },
  computed: {
    canPublish() {
      return (this.title.trim() || this.content.trim() || this.imageList.length > 0) && !this.publishing
    },
    // 从内容中解析 #话题
    parsedTopics() {
      const text = this.content || ''
      if (!text) return []
      // 匹配 #后跟随中文/英文/数字，遇到空白或结尾结束
      const matches = text.match(/#([^\s#]{1,12})/g) || []
      const seen = new Set()
      const result = []
      matches.forEach(m => {
        const name = m.substring(1).trim()
        if (name && !seen.has(name)) {
          seen.add(name)
          result.push(name)
        }
      })
      return result
    },
    contentPlaceholder() {
      return '这一刻的想法... 用 # 标记话题，如：今天吃饭了吗#吃饭'
    }
  },
  onLoad(options) {
    const metrics = getScreenMetrics()
    this.statusBarHeight = metrics.statusBarHeight

    const u = uni.getStorageSync('userInfo')
    const token = uni.getStorageSync('token')
    if (u && token) {
      this.isLogin = true
      this.loginUser = u
    } else {
      this.isLogin = false
    }

    if (options && options.edit === '1') {
      this.isEdit = true
      this.loadEditData()
    }
  },
  onUnload() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
  },
  methods: {
    loadEditData() {
      const raw = uni.getStorageSync('editDynamic')
      if (!raw) return
      let data
      try { data = JSON.parse(raw) } catch (e) { return }
      uni.removeStorageSync('editDynamic')

      this.editDynamicId = data.id || 0
      this.title = data.title || ''
      this.content = data.content || ''
      this.imageList = Array.isArray(data.images) ? [...data.images] : []
    },

    handleCancel() {
      if (this.title.trim() || this.content.trim() || this.imageList.length > 0) {
        uni.showModal({
          title: '提示',
          content: '确定放弃编辑吗？',
          success: (res) => {
            if (res.confirm) uni.navigateBack()
          }
        })
      } else {
        uni.navigateBack()
      }
    },

    async handlePublish() {
      if (!this.canPublish) return
      this.publishing = true

      // 从内容中提取话题
      const topicsArr = this.parsedTopics.map(name => ({ name }))

      try {
        const payload = {
          title: this.title.trim(),
          content: this.content.trim(),
          images: JSON.stringify(this.imageList),
          topics: JSON.stringify(topicsArr)
        }

        let res
        if (this.isEdit && this.editDynamicId) {
          payload.dynamic_id = this.editDynamicId
          res = await request('dynamic.php', {
            action: 'update',
            ...payload
          }, 'POST')
        } else {
          res = await request('dynamic.php', {
            action: 'publish',
            ...payload
          }, 'POST')
        }

        if (res.code === 0) {
          // 发布/更新成功后失效动态列表缓存，下次进入立即拉取最新
          invalidate(CACHE_KEYS.DYNAMIC_LIST)
          invalidate(CACHE_KEYS.DYNAMIC_FOLLOW)
          this.showToast(this.isEdit ? '更新成功' : '发布成功')
          setTimeout(() => {
            // 发布/更新成功后跳转到动态页面（circle 页含动态列表）
            uni.reLaunch({ url: '/pages/circle/circle' })
          }, 800)
        } else {
          this.showToast(res.msg || (this.isEdit ? '更新失败' : '发布失败'))
        }
      } catch (e) {
        this.showToast('网络异常')
      } finally {
        this.publishing = false
      }
    },

    chooseImage() {
      const remaining = 9 - this.imageList.length
      if (remaining <= 0) return
      uni.chooseImage({
        count: remaining,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempPaths = (res.tempFilePaths || []).slice(0, remaining)
          if (!tempPaths || tempPaths.length === 0) return
          this.doUploadImages(tempPaths)
        },
        fail: (err) => {
        }
      })
    },

    async doUploadImages(tempPaths) {
      const startIndex = this.imageList.length
      this.imageList.push(...tempPaths)
      this.isUploading = true
      this.uploadProgress = 0

      for (let i = 0; i < tempPaths.length; i++) {
        const localPath = tempPaths[i]
        const currentIndex = startIndex + i
        try {
          const up = await uploadFile(localPath, {
            type: 'post',
            current_count: currentIndex
          })
          const serverUrl = (up && typeof up === 'object')
            ? (up.url || up.path || '')
            : String(up || '')
          if (serverUrl && this.imageList[currentIndex] === localPath) {
            this.imageList.splice(currentIndex, 1, serverUrl)
          } else if (this.imageList[currentIndex] === localPath) {
            this.imageList.splice(currentIndex, 1)
            this.showToast('上传返回异常')
          }
        } catch (e) {
          if (this.imageList[currentIndex] === localPath) {
            this.imageList.splice(currentIndex, 1)
          }
          this.showToast(e.msg || '图片上传失败')
        }

        // 更新上传进度
        this.uploadProgress = Math.floor(((i + 1) / tempPaths.length) * 100)
      }

      this.isUploading = false
      this.uploadProgress = 0
    },

    removeImage(idx) {
      this.imageList.splice(idx, 1)
    },

    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' })
    },

    showToast(msg) {
      this.toast.msg = msg
      this.toast.show = true
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast.show = false }, 1800)
    }
  }
}
</script>

<style scoped>
.publish-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.custom-nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: #fff;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
  box-shadow: 0 1rpx 0 rgba(0,0,0,0.05);
}
.nav-left, .nav-right {
  width: 120rpx;
  display: flex;
  align-items: center;
}
.nav-right { justify-content: flex-end; }
.nav-text { font-size: 30rpx; color: #666; }
.nav-title-wrap { flex: 1; text-align: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #333; }

.login-auth-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}
.auth-logo { width: 120rpx; height: 120rpx; margin-bottom: 32rpx; }
.auth-title { font-size: 30rpx; color: #999; margin-bottom: 48rpx; }
.auth-btn.login {
  background: linear-gradient(135deg, #4A7FE0, #3A6FD0);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  padding: 20rpx 80rpx;
  border: none;
}
.animate-float { animation: float 3s ease-in-out infinite; }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12rpx); } }

.editor-main {
  background: #fff;
  margin: 16rpx;
  border-radius: 24rpx;
  padding: 32rpx 24rpx;
}

.author-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f5f5f5;
}
.author-meta {
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.author-name { font-size: 28rpx; font-weight: 600; color: #333; }
.author-hint { font-size: 22rpx; color: #999; margin-top: 4rpx; }

.title-block {
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.editor-title {
  width: 100%;
  height: 72rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.placeholder-title { color: #ccc; font-weight: 400; }

.content-block {
  margin-bottom: 24rpx;
  position: relative;
}
.editor-content {
  width: 100%;
  min-height: 200rpx;
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
}
.placeholder-content { color: #ccc; }
.counter {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 22rpx;
  color: #ccc;
}

/* Topic Setting Row */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  margin-bottom: 16rpx;
}
.setting-label {
  display: flex;
  align-items: center;
}
.setting-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}
.setting-dot.topic { background: #4A7FE0; }
.setting-title {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}
.setting-value {
  display: flex;
  align-items: center;
}
.setting-text {
  font-size: 28rpx;
  color: #333;
}
.setting-text.placeholder { color: #999; }
.setting-arrow {
  font-size: 32rpx;
  color: #ccc;
  margin-left: 8rpx;
}

/* Selected Tags Display */
.tags-display-area {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 4rpx 0 20rpx;
}
.tag-badge {
  height: 52rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  border: 1rpx solid transparent;
}
.tag-badge.topic-tag {
  color: #4A7FE0;
  background: #EBF2FF;
}
.tag-badge.custom-tag {
  color: #4A7FE0;
  background: #EBF2FF;
}
.badge-close {
  margin-left: 10rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: rgba(74,127,224,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #4A7FE0;
}

/* Image Section */
.image-section { margin-top: 16rpx; }
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.image-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
}
.preview-img {
  width: 100%;
  height: 100%;
}
.remove-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 0 12rpx 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.remove-icon { color: #fff; font-size: 28rpx; }
.add-image-btn {
  width: 200rpx;
  height: 200rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #ddd;
}
.add-icon { font-size: 56rpx; color: #ccc; line-height: 1; }
.add-text { font-size: 22rpx; color: #999; margin-top: 8rpx; }

/* Toast */
.toast {
  position: fixed; left: 50%; top: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  background: rgba(0,0,0,0.8);
  border-radius: 999rpx;
  padding: 22rpx 40rpx;
  z-index: 9999;
  opacity: 0;
  transition: all 0.22s ease;
  pointer-events: none;
}
.toast text { color: #fff; font-size: 26rpx; }
.toast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }

/* 底部悬浮发布按钮 */
.editor-main {
  padding-bottom: 200rpx;
}
.floating-submit-bar {
  position: fixed;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  left: 24rpx;
  right: 24rpx;
  z-index: 99;
}
.submit-btn {
  border-radius: 48rpx;
  height: 96rpx;
  background: #1a1a1a;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.18);
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  transition: all 0.25s;
}
.submit-btn.disabled {
  opacity: 0.45;
  box-shadow: none;
}
.btn-hover-active { transform: scale(0.98); opacity: 0.92; }
.btn-text { color: #fff; }
.btn-loading-spinner {
  width: 32rpx; height: 32rpx;
  border: 4rpx solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 上传进度遮罩 */
.progress-mask {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.progress-box {
  width: 60%;
  text-align: center;
}
.progress-percent {
  font-size: 96rpx;
  font-weight: 800;
  color: #333;
  line-height: 1.2;
  font-family: 'DIN Alternate', 'SF Pro Display', sans-serif;
  letter-spacing: 2rpx;
}
.percent-symbol {
  font-size: 40rpx;
  margin-left: 6rpx;
  font-weight: 500;
  color: #666;
}
.progress-note {
  display: block;
  margin-top: 14rpx;
  color: #999;
  font-size: 24rpx;
  letter-spacing: 1rpx;
}
.progress-bar-bg {
  margin-top: 24rpx;
  width: 100%;
  height: 6rpx;
  background: #e5e5e5;
  border-radius: 3rpx;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: #333;
  border-radius: 3rpx;
  transition: width 0.25s ease-out;
}
</style>
