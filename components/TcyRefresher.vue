<template>
  <view class="wrap" :class="themeClass"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
  >
    <scroll-view
      class="sv"
      scroll-y
      :lower-threshold="lowerThreshold"
      @scroll="onScroll"
      @scrolltolower="$emit('scrolltolower')"

      <!-- #ifndef H5 -->
      refresher-enabled
      refresher-default-style="none"
      refresher-background="transparent"
      :refresher-triggered="innerTriggered"
      :refresher-threshold="threshold"
      @refresherpulling="onPullingNative"
      @refresherrefresh="onRefreshNative"
      @refresherrestore="onRestoreNative"
      @refresherabort="onAbortNative"
      <!-- #endif -->
    >
      <!-- #ifndef H5 -->
      <template #refresher>
        <view class="refresher">
          <view class="r-inner" :style="{ transform: `translateY(${Math.min(dy, threshold)}px)` }">
            <view class="r-badge" :class="{ spinning: state === 3 }">
              <text class="r-logo">TCY</text>
            </view>
            <view class="r-texts">
              <text class="r-main">{{ stateText }}</text>
              <text class="r-sub" v-if="state === 3">正在为你刷新…</text>
            </view>
            <view class="r-progress" v-if="state !== 3">
              <view class="r-bar">
                <view class="r-bar-fill" :style="{ width: progress + '%' }"></view>
              </view>
            </view>
          </view>
        </view>
      </template>
      <!-- #endif -->

      <!-- #ifdef H5 -->
      <view class="h5-head" :style="{ height: headHeight + 'px' }">
        <view class="r-inner" :style="{ transform: `translateY(${Math.min(h5Dy, threshold)}px)` }">
          <view class="r-badge" :class="{ spinning: h5Refreshing }">
            <text class="r-logo">TCY</text>
          </view>
          <view class="r-texts">
            <text class="r-main">{{ h5Text }}</text>
            <text class="r-sub" v-if="h5Refreshing">正在为你刷新…</text>
          </view>
          <view class="r-progress" v-if="!h5Refreshing">
            <view class="r-bar">
              <view class="r-bar-fill" :style="{ width: h5Progress + '%' }"></view>
            </view>
          </view>
        </view>
      </view>
      <!-- #endif -->

      <slot></slot>

      <view v-if="bottomSpace > 0" :style="{ height: bottomSpace + 'px' }"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { themeClass } from '../common/theme.js'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  triggered: { type: Boolean, default: false }, // v-model
  threshold: { type: Number, default: 60 },
  lowerThreshold: { type: Number, default: 500 },
  bottomSpace: { type: Number, default: 0 }
})

const emit = defineEmits(['update:triggered', 'refresh', 'scrolltolower', 'scroll'])

const innerTriggered = ref(false)
watch(() => props.triggered, (v) => {
  innerTriggered.value = !!v
  if (v) state.value = 3
  if (!v && state.value === 3) state.value = 0
})

const state = ref(0) 
const dy = ref(0)

const progress = computed(() => Math.max(0, Math.min(100, Math.floor((Math.min(dy.value, props.threshold) / props.threshold) * 100))))
const stateText = computed(() => {
  if (state.value === 3) return '推荐中...'
  if (state.value === 2) return '松开刷新'
  if (state.value === 1) return '下拉刷新'
  return '下拉刷新'
})

function onPullingNative(e) {
  dy.value = Number(e?.detail?.dy || 0)
  if (dy.value <= 0) state.value = 0
  else if (dy.value < props.threshold) state.value = 1
  else state.value = 2
}
function onRefreshNative() {
  state.value = 3
  emit('update:triggered', true)
  emit('refresh')
}
function onRestoreNative() { dy.value = 0; if (!props.triggered) state.value = 0 }
function onAbortNative() { dy.value = 0; if (!props.triggered) state.value = 0 }


const scrollTop = ref(0)

const startY = ref(0)
const touching = ref(false)
const h5Dy = ref(0)
const h5Refreshing = ref(false)

const headHeight = computed(() => Math.max(0, h5Dy.value)) // 头部撑开高度
const h5Progress = computed(() => Math.max(0, Math.min(100, Math.floor((Math.min(h5Dy.value, props.threshold) / props.threshold) * 100))))
const h5Text = computed(() => {
  if (h5Refreshing.value) return '推荐中...'
  if (h5Dy.value >= props.threshold) return '松开刷新'
  if (h5Dy.value > 0) return '下拉刷新'
  return '下拉刷新'
})

watch(() => props.triggered, (v) => {
  // 外部控制结束刷新
  if (!v && h5Refreshing.value) {
    h5Refreshing.value = false
    h5Dy.value = 0
  }
})

function onScroll(e) {
  scrollTop.value = Number(e?.detail?.scrollTop || 0)
  emit('scroll', e)
}

function onTouchStart(e) {
  // 只有在滚动到顶部才允许下拉
  if (scrollTop.value > 0) return
  touching.value = true
  startY.value = e.touches?.[0]?.clientY || 0
}

function onTouchMove(e) {
  // H5 手势只在顶部生效
  if (!touching.value) return
  if (scrollTop.value > 0) return

  const y = e.touches?.[0]?.clientY || 0
  let d = y - startY.value
  if (d <= 0) {
    h5Dy.value = 0
    return
  }

  // 阻尼（越拉越难）
  d = Math.sqrt(d) * 10
  h5Dy.value = Math.min(140, d)
}

function onTouchEnd() {
  if (!touching.value) return
  touching.value = false

  if (h5Refreshing.value) return

  if (h5Dy.value >= props.threshold) {
    h5Refreshing.value = true
    h5Dy.value = props.threshold
    emit('update:triggered', true)
    emit('refresh')
  } else {
    h5Dy.value = 0
  }
}
</script>

<style scoped>
.wrap{
  flex: 1;
  min-height: 0;
}
.sv{
  height: 100%;
}

/* App/小程序 refresher */
.refresher{
  height: 120px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: none;
}

/* H5 头部 */
.h5-head{
  width: 100%;
  overflow: hidden;
}

.r-inner{
  width: 92%;
  margin: 10px auto 0;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(0,0,0,0.04);
  border-radius: 16px;
  padding: 10px 12px;
  box-shadow: 0 10px 26px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 12px;
}

.r-badge{
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ff2442, #ff6b81);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.r-badge.spinning{
  animation: spin 0.9s linear infinite;
}
.r-logo{
  color: #fff;
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 1px;
}

.r-texts{
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.r-main{
  font-size: 14px;
  font-weight: 900;
  color: #111;
}
.r-sub{
  margin-top: 2px;
  font-size: 12px;
  color: var(--cr-text-muted);
}

.r-progress{ width: 86px; }
.r-bar{
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(0,0,0,0.06);
  overflow: hidden;
}
.r-bar-fill{
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #ff2442, #ff6b81);
  border-radius: 999px;
  transition: width 0.08s ease;
}

@keyframes spin{ to{ transform: rotate(360deg); } }
</style>
