<template>
  <view class="easy-scancode" :class="themeClass" v-if="visible">
    <!-- H5 扫码容器 -->
    <!-- #ifdef H5 -->
    <view class="reader" :id="domId"></view>

    <view class="scan-tip-overlay">
      <view class="scan-tip">
        {{ tipText }}
      </view>
    </view>
    <!-- #endif -->

    <!-- 非H5：提示即可 -->
    <!-- #ifndef H5 -->
    <view class="fallback">
      <view class="scan-tip">将调用系统扫码...</view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>
export default {
  name: 'easy-scancode',
  props: {
    visible: { type: Boolean, default: false },
    fps: { type: Number, default: 10 },
    boxSizeRatio: { type: Number, default: 0.7 }, // 扫码框占屏幕较短边的比例
    facingMode: { type: String, default: 'environment' } // environment/user
  },
  data() {
    return {
      domId: 'reader_' + Math.random().toString(36).slice(2),
      tipText: '请将二维码放入框内',
      scanner: null,
      running: false
    }
  },
  watch: {
    visible(v) {
      if (v) this.start()
      else this.stop()
    }
  },
  mounted() {
    if (this.visible) this.start()
  },
  beforeDestroy() {
    this.stop()
  },
  methods: {
    async start() {
      // #ifndef H5
      // 非H5：直接系统扫码
      uni.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode'],
        success: (res) => {
          const code = String(res.result || '').trim()
          if (!code) return this.$emit('error', { msg: '未识别到内容' })
          this.$emit('success', { result: code, raw: res })
        },
        fail: (e) => this.$emit('cancel', e)
      })
      return
      // #endif

      // #ifdef H5
      if (this.running) return
      this.tipText = '启动摄像头中...'

      try {
        // 动态import，避免依赖问题导致编译挂
        const mod = await import('html5-qrcode')
        const Html5Qrcode = mod.Html5Qrcode || (mod.default && mod.default.Html5Qrcode)
        if (!Html5Qrcode) throw new Error('html5-qrcode 未正确导出 Html5Qrcode')

        // 先确保旧实例停止
        await this.stop()

        // 先触发权限弹窗（如果浏览器允许）
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach(t => t.stop())
        } else {
          throw new Error('当前浏览器不支持摄像头访问')
        }

        const win = uni.getWindowInfo ? uni.getWindowInfo() : { windowWidth: 375, windowHeight: 667 }
        const width = Number(win.windowWidth || 375)
        const height = Number(win.windowHeight || 667)
        const qrboxSize = Math.floor(Math.min(width, height) * this.boxSizeRatio)

        this.scanner = new Html5Qrcode(this.domId)

        await this.scanner.start(
          { facingMode: this.facingMode },
          {
            fps: this.fps,
            qrbox: { width: qrboxSize, height: qrboxSize }
          },
          (decodedText) => {
            const code = String(decodedText || '').trim()
            if (!code) return
            this.$emit('success', { result: code })
            this.stop()
          },
          () => {}
        )

        this.running = true
        this.tipText = '扫描中...'
      } catch (e) {
        this.running = false
        const msg = e && e.message ? e.message : '扫码启动失败'

        let pretty = msg
        if (msg.includes('NotAllowedError')) pretty = '未授权摄像头权限：请在浏览器地址栏/设置里允许摄像头后重试'
        if (msg.includes('NotFoundError')) pretty = '未检测到摄像头设备'
        if (msg.includes('SecurityError') || msg.includes('secure')) pretty = '需要 HTTPS 或 localhost 才能使用摄像头'

        this.tipText = pretty
        this.$emit('error', { msg: pretty, err: e })
      }
      // #endif
    },

    async stop() {
      // #ifdef H5
      try {
        if (this.scanner && this.running) await this.scanner.stop()
      } catch (e) {}
      try {
        if (this.scanner) await this.scanner.clear()
      } catch (e) {}
      // #endif

      this.scanner = null
      this.running = false
      this.tipText = '请将二维码放入框内'
    }
  }
}
</script>

<style scoped>
.easy-scancode {
  width: 100vw;
  height: 100vh;
  position: fixed;
  z-index: 10000;
  top: 0;
  left: 0;
  background-color: #000;
}
.reader {
  width: 100vw;
  height: 100vh;
}
.scan-tip-overlay{
  position:absolute;
  top:0;left:0;right:0;bottom:0;
  pointer-events:none;
}
.scan-tip{
  position:absolute;
  left:50%;
  top:74%;
  transform:translateX(-50%);
  color:#fff;
  font-size:16px;
  background:rgba(0,0,0,.5);
  padding:10px 20px;
  border-radius:8px;
}
.fallback{
  width:100%;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
}
</style>
