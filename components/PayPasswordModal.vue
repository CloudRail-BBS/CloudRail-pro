<template>
  <view v-if="visible" class="ppm-mask" @touchmove.stop.prevent @click.self="onCancel">
    <view class="ppm-sheet" :class="{ show: visible }">
      <view class="ppm-header">
        <text class="ppm-title">输入支付密码</text>
        <view class="ppm-close" @click="onCancel">
          <view class="close-line line1"></view>
          <view class="close-line line2"></view>
        </view>
      </view>
      <text class="ppm-desc">{{ desc || '请输入6位支付密码以确认操作' }}</text>

      <view class="pin-field" @click="focusPin">
        <view class="ppm-pin-row">
          <view
            v-for="i in 6" :key="i"
            class="ppm-cell"
            :class="{ filled: pwd.length >= i, active: pinFocused && pwd.length === i - 1 }"
          >
            <view v-if="pwd.length >= i" class="ppm-dot"></view>
          </view>
        </view>
        <input
          class="pin-real-input"
          type="number"
          :value="pwd"
          maxlength="6"
          :focus="pinFocused"
          :adjust-position="true"
          @input="onInput"
          @blur="pinFocused = false"
        />
      </view>

      <text v-if="errMsg" class="ppm-error">{{ errMsg }}</text>
      <text v-if="loading" class="ppm-loading">验证中...</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'PayPasswordModal',
  props: {
    visible: { type: Boolean, default: false },
    desc:    { type: String,  default: '' }
  },
  data() {
    return { pwd: '', errMsg: '', loading: false, pinFocused: false };
  },
  watch: {
    visible(v) {
      if (v) {
        this.pwd = '';
        this.errMsg = '';
        this.loading = false;
        this.pinFocused = false;
        this.$nextTick(() => { this.pinFocused = true; });
      } else {
        this.pinFocused = false;
      }
    }
  },
  methods: {
    focusPin() {
      this.pinFocused = false;
      this.$nextTick(() => { this.pinFocused = true; });
    },
    onInput(e) {
      this.pwd = (e.detail.value || '').replace(/[^0-9]/g, '').slice(0, 6);
      this.errMsg = '';
      if (this.pwd.length === 6) {
        this.pinFocused = false;
        this.$emit('confirm', this.pwd, this.setError.bind(this), this.setLoading.bind(this));
      }
    },
    setError(msg) { this.loading = false; this.errMsg = msg; this.pwd = ''; this.$nextTick(() => { this.pinFocused = true; }); },
    setLoading(v) { this.loading = v; },
    onCancel() { this.pinFocused = false; this.$emit('cancel'); this.pwd = ''; this.errMsg = ''; }
  }
};
</script>

<style scoped>
.ppm-mask { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; }
.ppm-sheet {
  width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0;
  padding: 40rpx 36rpx calc(40rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ppm-sheet.show { transform: translateY(0); }

.ppm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.ppm-title { font-size: 34rpx; font-weight: 700; color: #111; }
.ppm-close { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; position: relative; }
.close-line { position: absolute; width: 28rpx; height: 2.5rpx; background: #999; border-radius: 2rpx; }
.line1 { transform: rotate(45deg); }
.line2 { transform: rotate(-45deg); }

.ppm-desc { font-size: 24rpx; color: #999; display: block; margin-bottom: 40rpx; }

/* PIN 输入 */
.pin-field { position: relative; }
.ppm-pin-row { display: flex; gap: 16rpx; }
.ppm-cell {
  flex: 1; height: 100rpx; border-radius: 16rpx;
  background: #f8f8f8; border: 1.5rpx solid #e5e7eb;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.15s;
}
.ppm-cell.active { border-color: #111; background: #fff; }
.ppm-cell.filled { border-color: #111; background: #fff; }
.ppm-dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: #111; }

.pin-real-input {
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100rpx;
  opacity: 0;
  z-index: 2;
  -webkit-appearance: none;
}

.ppm-error { display: block; text-align: center; font-size: 24rpx; color: #ff2442; margin-top: 20rpx; }
.ppm-loading { display: block; text-align: center; font-size: 24rpx; color: #999; margin-top: 20rpx; }
</style>
