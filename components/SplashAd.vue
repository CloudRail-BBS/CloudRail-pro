<template>
  <view v-if="visible" class="splash-ad" :class="themeClass">
    <image
      v-if="imgSrc"
      class="splash-img"
      :class="{ ready: imgReady }"
      :src="imgSrc"
      mode="aspectFit"
      @load="onImgLoad"
      @error="onImgError"
      @click="onClickAd"
    />
    <view class="splash-skip" @click="close">
      <text class="skip-text">{{ left }}s</text>
      <view class="skip-divider"></view>
      <text class="skip-text">跳过</text>
    </view>
    <view class="splash-brand">
      <text class="brand-name">CloudRail-pro</text>
      <text class="brand-slogan">年轻人的社交社区</text>
    </view>
  </view>
</template>

<script>
/**
 * 开屏广告（带本地缓存）
 * ------------------------------------------------------------
 * 解决"服务器慢 → 每次打开都要重新下载图片 → 黑屏等半天"的问题：
 *
 *   第一次打开：拉配置 → 下载图片存到手机本地 → 展示
 *   以后每次  ：直接读手机里的本地图片，秒开，不走网络
 *
 * 另外每次启动都会在后台静默刷新一次配置：
 *   - 图片没变 → 什么都不做
 *   - 图片变了 → 后台下载新图，下次启动就换成新的
 *
 * 只在每次启动时展示一次（shownOnce 为模块级变量，App 重启才复位）。
 */
import { request } from '../common/request.js'

const K_CFG = 'splash_ad_cfg'          // 广告配置缓存
const K_LOCAL = 'splash_ad_local'      // 本地图片路径
const K_LOCAL_URL = 'splash_ad_local_url' // 本地文件对应的远程地址

let shownOnce = false

export default {
  name: 'SplashAd',
  data() {
    return {
      visible: false,
      ad: {},
      imgSrc: '',
      imgReady: false,
      left: 0,
      timer: null
    }
  },
  mounted() {
    this.init()
  },
  beforeDestroy() {
    this.clearTimer()
  },
  methods: {
    clearTimer() {
      if (this.timer) { clearInterval(this.timer); this.timer = null }
    },

    async init() {
      if (shownOnce) return
      const cfg = uni.getStorageSync(K_CFG) || null
      const localPath = uni.getStorageSync(K_LOCAL) || ''
      const localUrl = uni.getStorageSync(K_LOCAL_URL) || ''

      /* 1. 有缓存 → 立刻用本地图片播，不走网络（秒开） */
      if (cfg && cfg.enabled && cfg.image) {
        const src = (localPath && localUrl === cfg.image) ? localPath : cfg.image
        this.show({ ...cfg, image: src })
      }

      /* 2. 后台静默刷新配置 + 预下载，供下次启动使用 */
      this.refresh()
    },

    async refresh() {
      try {
        const res = await request('system.php', { action: 'splash' }, 'GET')
        const d = (res && res.code === 0) ? (res.data || null) : null
        if (!d || !d.enabled || !d.image) {
          uni.removeStorageSync(K_CFG)
          return
        }
        uni.setStorageSync(K_CFG, d)

        const localUrl = uni.getStorageSync(K_LOCAL_URL) || ''
        const localPath = uni.getStorageSync(K_LOCAL) || ''
        // 图片没变且本地已有 → 不用重复下载
        if (localPath && localUrl === d.image) return

        this.preloadImage(d.image)

        /* 情况：首次进来时还没有缓存，配置这次才拿到 → 现在补播一次 */
        if (!shownOnce) this.show(d)
      } catch (e) {
        /* 刷新失败沿用旧缓存，不影响使用 */
      }
    },

    /** 把图片下载到本地并持久化，下次直接用本地文件 */
    preloadImage(url) {
      if (!url) return
      uni.downloadFile({
        url,
        success: (r) => {
          if (!r || r.statusCode !== 200 || !r.tempFilePath) return
          // #ifdef APP-PLUS || MP || MP-WEIXIN
          uni.saveFile({
            tempFilePath: r.tempFilePath,
            success: (s) => {
              if (s && s.savedFilePath) {
                uni.setStorageSync(K_LOCAL, s.savedFilePath)
                uni.setStorageSync(K_LOCAL_URL, url)
              }
            },
            fail: () => {
              // 保存失败就退回用临时文件，至少本次会话可用
              uni.setStorageSync(K_LOCAL, r.tempFilePath)
              uni.setStorageSync(K_LOCAL_URL, url)
            }
          })
          // #endif
          // #ifdef H5
          /* H5 没有持久文件系统，靠浏览器 HTTP 缓存：
             这里用 Image 预热一次，第二次打开就走磁盘缓存了 */
          try { const im = new Image(); im.src = url } catch (e) {}
          // #endif
        },
        fail: () => {}
      })
    },

    show(ad) {
      if (!ad || !ad.enabled || !ad.image) return
      if (shownOnce) return
      shownOnce = true
      this.ad = ad
      this.imgSrc = ad.image
      this.imgReady = false
      let sec = parseInt(ad.seconds, 10)
      if (!sec || sec < 1) sec = 5
      if (sec > 30) sec = 30
      this.left = sec
      this.visible = true
      this.clearTimer()
      this.timer = setInterval(() => {
        this.left -= 1
        if (this.left <= 0) this.close()
      }, 1000)
    },

    onImgLoad() {
      this.imgReady = true
    },
    onImgError() {
      /* 图片加载失败：不显示黑屏，直接关掉，别耽误用户 */
      this.close()
    },

    close() {
      this.clearTimer()
      this.visible = false
    },

    onClickAd() {
      const link = (this.ad && this.ad.link) || ''
      if (!link) return
      this.close()
      if (/^https?:\/\//i.test(link)) {
        uni.navigateTo({
          url: '/pages/webview/webview?url=' + encodeURIComponent(link),
          fail: () => {
            // #ifdef APP-PLUS
            plus.runtime.openURL(link)
            // #endif
            // #ifdef H5
            window.open(link, '_blank')
            // #endif
          }
        })
      } else {
        uni.navigateTo({ url: link })
      }
    }
  }
}
</script>

<style scoped>
/* 背景用深色渐变而不是纯黑：图片还没出来时也不会像"死黑屏" */
.splash-ad {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  z-index: 99999;
  overflow: hidden;
  background: linear-gradient(160deg, #23262d 0%, #101114 100%);
}
.splash-img {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.splash-img.ready { opacity: 1; }

.splash-skip {
  position: absolute; right: 32rpx; bottom: 180rpx; z-index: 2;
  display: flex; align-items: center; height: 64rpx; padding: 0 26rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.42);
  border: 1rpx solid rgba(255, 255, 255, 0.28);
}
.skip-text { font-size: 26rpx; color: #ffffff; font-weight: 600; line-height: 1; }
.skip-divider { width: 1rpx; height: 24rpx; margin: 0 16rpx; background: rgba(255, 255, 255, 0.35); }

.splash-brand {
  position: absolute; left: 0; right: 0; bottom: 72rpx; z-index: 2;
  display: flex; flex-direction: column; align-items: center;
}
.brand-name { font-size: 34rpx; color: #ffffff; font-weight: 700; letter-spacing: 4rpx; }
.brand-slogan { margin-top: 10rpx; font-size: 22rpx; color: rgba(255, 255, 255, 0.6); letter-spacing: 2rpx; }
</style>
