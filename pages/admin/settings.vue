<template>
  <view class="page" :class="themeClass">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">返回</view>
        <text class="nav-title">系统设置</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>
    <view :style="{ height: statusBarHeight + 56 + 'px' }"></view>

    <view class="card">
      <view class="card-header">
        <text class="card-title">图片水印设置</text>
      </view>
      <text class="card-desc">用户发布帖子/动态上传图片时，会自动在图片右下角添加水印文字。留空则关闭水印。</text>

      <view class="form-row">
        <text class="form-label">水印文字</text>
        <input class="wm-input" v-model="watermarkText" placeholder="例如：某某社区" maxlength="30" />
      </view>

      <view class="save-btn" :class="{ disabled: saving }" @click="save">
        <text>{{ saving ? '保存中...' : '保存设置' }}</text>
      </view>

      <view class="tip-box">
        <text class="tip-title">说明</text>
        <text class="tip-text">1. 水印自动显示在图片右下角，黑底白字。&#10;2. 水印需要服务器装有中文字体，否则自动跳过（不影响上传）。可上传任意中文字体到服务器项目根目录 fonts/watermark.ttf。&#10;3. 修改后，之后新上传的图片才会带上新水印，已上传的图片不会变化。</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request, bmsBaseUrl } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      watermarkText: '',
      saving: false
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.load()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async load() {
      try {
        const res = await request('settings.php', { action: 'get_all' }, { method: 'GET', baseURL: bmsBaseUrl })
        if ((res.code === 0 || res.status === 'success') && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.list || [])
          const item = list.find(s => s.k === 'watermark_text')
          if (item) this.watermarkText = item.value || ''
        }
      } catch (e) {}
    },
    async save() {
      if (this.saving) return
      this.saving = true
      try {
        // items 显式转 JSON 字符串, 规避不同端对象序列化差异; 后端 settings/update 已兼容字符串解析
        // 真机 App 中 GET 通道更稳定(POST 易被明文/跨域拦截), 改用 GET 传递 items
        // 后端 settings/update 经 input() 合并 GET/POST 参数, 可直接读取
        const itemsStr = JSON.stringify({ watermark_text: this.watermarkText.trim() })
        const res = await request('settings.php', { action: 'save', items: itemsStr }, { method: 'GET', baseURL: bmsBaseUrl })
        console.log('[水印保存响应]', JSON.stringify(res))
        if (res.code === 0 || res.status === 'success') {
          uni.showToast({ title: '保存成功', icon: 'success' })
        } else {
          const msg = (res && (res.msg || res.message)) || '保存失败'
          console.error('[水印保存失败]', msg)
          uni.showToast({ title: msg, icon: 'none' })
        }
      } catch (e) {
        const msg = (e && (e.msg || e.message)) || (e && e.res ? ('HTTP ' + e.res.statusCode) : '保存失败')
        // 打印底层错误与完整请求响应, 便于定位 CORS/路由/后端问题
        console.error('[水印保存异常-msg]', msg)
        console.error('[水印保存异常-err底层]', JSON.stringify(e && e.err))
        console.error('[水印保存异常-完整对象]', e)
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--cr-surface-alt);
}

.nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 999;
  background: var(--cr-surface);
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06);
}
.nav-bar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
}
.nav-back {
  width: 120rpx;
  font-size: 28rpx;
  color: #667eea;
  font-weight: 500;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--cr-text);
  letter-spacing: 2rpx;
}
.nav-placeholder { width: 120rpx; }

.card {
  margin: 24rpx;
  background: var(--cr-surface);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.card-header { margin-bottom: 12rpx; }
.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--cr-text);
}
.card-desc {
  display: block;
  font-size: 26rpx;
  color: var(--cr-text-muted);
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.form-row { margin-bottom: 32rpx; }
.form-label {
  display: block;
  font-size: 26rpx;
  color: var(--cr-text-muted);
  margin-bottom: 14rpx;
  font-weight: 500;
}
.wm-input {
  width: 100%;
  height: 88rpx;
  background: #f6f6f8;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: var(--cr-text);
  box-sizing: border-box;
}

.save-btn {
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #d4af37 0%, #f0d488 50%, #c9a227 100%);
  box-shadow: 0 8rpx 24rpx rgba(201, 162, 39, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.save-btn:active {
  transform: translateY(2rpx);
  filter: brightness(0.95);
}
.save-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
.save-btn.disabled { opacity: 0.7; }

.tip-box {
  margin-top: 32rpx;
  background: #f8f9fc;
  border-radius: 16rpx;
  padding: 24rpx;
  border-left: 6rpx solid #667eea;
}
.tip-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 10rpx;
}
.tip-text {
  display: block;
  font-size: 24rpx;
  color: #777;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>