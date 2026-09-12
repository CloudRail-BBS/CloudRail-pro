<template>
  <view v-if="show" class="mask" :class="{ 'is-center': placement === 'center' }" @tap="onMask">
    <view class="panel" :class="{ 'is-center': placement === 'center' }" @tap.stop>
      <view class="hd">
        <text class="title">{{ title }}</text>
      </view>

      <view class="bd">
        <slot />
      </view>

      <view v-if="!hideFooter" class="ft">
        <button class="btn ghost" @tap="onCancel">{{ cancelText }}</button>
        <button class="btn primary" @tap="onConfirm">{{ okText }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '提示' },
  okText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  closeOnMask: { type: Boolean, default: true },
  hideFooter: { type: Boolean, default: false },
  placement: { type: String, default: 'bottom' }
})

const emit = defineEmits(['update:show', 'confirm', 'cancel'])

function onCancel() {
  emit('update:show', false)
  emit('cancel')
}

function onConfirm() {
  emit('confirm')
}

function onMask() {
  if (!props.closeOnMask) return
  onCancel()
}
</script>

<style scoped>
.mask{
  position:fixed; left:0; top:0; right:0; bottom:0;
  background:rgba(0,0,0,.45);
  display:flex; align-items:flex-end;
  z-index:9999;
  animation: fadeIn 0.3s ease-out;
}
.mask.is-center{
  align-items:center;
  justify-content:center;
  padding: 32rpx;
  box-sizing: border-box;
}
.panel{
  width:100%;
  background:#fff;
  border-top-left-radius:18px;
  border-top-right-radius:18px;
  padding:14px;
  animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.panel.is-center{
  width: 100%;
  max-width: 620rpx;
  border-radius: 28rpx;
  box-shadow: 0 24rpx 80rpx rgba(17, 24, 39, 0.2);
  animation: popIn 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.hd{ padding:6px 4px 12px; }
.title{ font-size:16px; font-weight:900; color:#111; }
.bd{ padding:0 4px; }
.ft{ display:flex; gap:10px; padding-top:12px; }
.btn{ flex:1; border-radius:12px; font-size:15px; font-weight:600; }
.btn.primary{ background:#ff2442; color:#fff; border: none; }
.btn.ghost{ background:#fff; color:#333; border: 1rpx solid #e5e7eb; }
</style>
