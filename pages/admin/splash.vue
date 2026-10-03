<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">返回</view>
        <text class="nav-title">开屏广告</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>
    <view :style="{ height: statusBarHeight + 56 + 'px' }"></view>

    <view class="card">
      <view class="card-header">
        <text class="card-title">开屏广告设置</text>
      </view>
      <text class="card-desc">开启后，用户打开 App 会先全屏展示这张广告图；右下角显示剩余秒数和「跳过」，点跳过立刻关闭，倒计时结束也会自动关闭。</text>

      <view class="form-row">
        <text class="form-label">是否开启</text>
        <view class="switch-row" @click="form.enabled = form.enabled === 1 ? 0 : 1">
          <view class="switch-box" :class="{ on: form.enabled === 1 }">
            <view class="switch-dot" :class="{ on: form.enabled === 1 }"></view>
          </view>
          <text class="switch-text" :class="{ on: form.enabled === 1 }">{{ form.enabled === 1 ? '已开启' : '已关闭' }}</text>
        </view>
      </view>

      <view class="form-row">
        <text class="form-label">广告图片地址</text>
        <input class="wm-input" v-model="form.image" placeholder="https://... 或 /uploads/ad.png" />
        <view class="preview-box" v-if="previewSrc">
          <image class="preview-img" :src="previewSrc" mode="aspectFit" />
        </view>
      </view>

      <view class="form-row">
        <text class="form-label">点击跳转链接（留空则点击不跳转）</text>
        <input class="wm-input" v-model="form.link" placeholder="https://..." />
      </view>

      <view class="form-row">
        <text class="form-label">展示时长（秒，1~30）</text>
        <input class="wm-input" type="number" v-model="form.seconds" placeholder="5" />
      </view>

      <view class="save-btn" :class="{ disabled: saving }" @click="save">
        <text>{{ saving ? '保存中...' : '保存开屏广告' }}</text>
      </view>

      <view class="tip-box">
        <text class="tip-title">说明</text>
        <text class="tip-text">1. 图片建议用竖屏比例（如 1080×1920），会自动铺满全屏。&#10;2. 时长填 3~5 秒体验最好，最长 30 秒。&#10;3. 跳转链接支持 http/https，会在应用内打开；也可以填站内路径（如 /pages/vip/index）。&#10;4. 关掉开关或图片地址留空，用户打开 App 就不再展示广告。&#10;5. 保存后需重启 App 才会展示新广告（启动时读取配置）。</text>
      </view>
    </view>
  </view>
</template>

<script>
/* 注意：这里走的是主后端接口（system/splash、system/splash_save），
   不再走外部管理后台的 settings.php —— 那台后台有键名白名单，
   会把新键名默默丢掉，表现为"保存了但刷新就没了"。 */
import { request } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      saving: false,
      form: { enabled: 0, image: '', link: '', seconds: 5 }
    }
  },
  computed: {
    // 预览地址：相对路径补上域名
    previewSrc() {
      const v = (this.form.image || '').trim()
      if (!v) return ''
      if (/^https?:\/\//i.test(v) || v.indexOf('/static/') === 0) return v
      const base = (uni.getStorageSync('apiBase') || '').toString().replace(/\/api\/index\.php\/?$/i, '')
      return base + (v.charAt(0) === '/' ? v : '/' + v)
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
        const res = await request('system.php', { action: 'splash' }, 'GET')
        const d = (res && res.code === 0) ? (res.data || {}) : null
        if (!d) return
        this.form.enabled = d.enabled ? 1 : 0
        // raw_image 是后台原始值（不补域名），编辑时用它
        this.form.image = d.raw_image || d.image || ''
        this.form.link = d.link || ''
        const sec = parseInt(d.seconds, 10)
        this.form.seconds = (sec >= 1 && sec <= 30) ? sec : 5
      } catch (e) {}
    },
    async save() {
      if (this.saving) return
      let sec = parseInt(this.form.seconds, 10)
      if (!sec || sec < 1) sec = 5
      if (sec > 30) sec = 30
      this.form.seconds = sec
      const image = (this.form.image || '').trim()
      if (this.form.enabled === 1 && !image) {
        uni.showToast({ title: '开启时必须填图片地址', icon: 'none' })
        return
      }
      this.saving = true
      try {
        const res = await request('system.php', {
          action: 'splash_save',
          enabled: this.form.enabled,
          image: image,
          link: (this.form.link || '').trim(),
          seconds: sec
        }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: '已保存', icon: 'success' })
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '保存失败', icon: 'none' })
        }
      } catch (e) {
        /* 把后端真实原因显示出来：403 通常是"不是管理员"，
           500 是后端报错，别一律说成网络问题 */
        const code = (e && e.res && e.res.statusCode) ? ('HTTP ' + e.res.statusCode + ' ') : ''
        const msg = (e && (e.msg || e.message)) || (e && e.data && (e.data.msg || e.data.message)) || '请求失败'
        uni.showToast({ title: code + msg, icon: 'none', duration: 3000 })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #fff; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06); }
.nav-bar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 28rpx; }
.nav-back { width: 120rpx; font-size: 28rpx; color: #667eea; font-weight: 500; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #333; letter-spacing: 2rpx; }
.nav-placeholder { width: 120rpx; }

.card { margin: 24rpx; background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04); }
.card-header { margin-bottom: 12rpx; }
.card-title { font-size: 32rpx; font-weight: 700; color: #222; }
.card-desc { display: block; font-size: 26rpx; color: #888; line-height: 1.6; margin-bottom: 32rpx; }

.form-row { margin-bottom: 32rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 14rpx; font-weight: 500; }
.wm-input { width: 100%; height: 88rpx; background: #f6f6f8; border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; color: #333; box-sizing: border-box; }

.preview-box { margin-top: 16rpx; width: 200rpx; height: 320rpx; border-radius: 16rpx; overflow: hidden; background: #f0f0f2; }
.preview-img { width: 100%; height: 100%; }

.switch-row { display: flex; align-items: center; gap: 18rpx; }
.switch-box { width: 92rpx; height: 52rpx; border-radius: 999rpx; background: #dcdfe6; padding: 4rpx; box-sizing: border-box; transition: background 0.2s ease; }
.switch-box.on { background: #ff2442; }
.switch-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15); transition: transform 0.2s ease; }
.switch-dot.on { transform: translateX(40rpx); }
.switch-text { font-size: 28rpx; color: #999; }
.switch-text.on { color: #ff2442; font-weight: 600; }

.save-btn { height: 88rpx; border-radius: 44rpx; background: linear-gradient(135deg, #ff3b5c 0%, #ff6a3d 100%); box-shadow: 0 8rpx 24rpx rgba(255,54,92,0.3); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.save-btn:active { transform: translateY(2rpx); filter: brightness(0.95); }
.save-btn text { color: #fff; font-size: 30rpx; font-weight: 700; letter-spacing: 2rpx; }
.save-btn.disabled { opacity: 0.7; }

.tip-box { margin-top: 32rpx; background: #f8f9fc; border-radius: 16rpx; padding: 24rpx; border-left: 6rpx solid #ff2442; }
.tip-title { display: block; font-size: 26rpx; font-weight: 700; color: #ff2442; margin-bottom: 10rpx; }
.tip-text { display: block; font-size: 24rpx; color: #777; line-height: 1.8; white-space: pre-wrap; }
</style>