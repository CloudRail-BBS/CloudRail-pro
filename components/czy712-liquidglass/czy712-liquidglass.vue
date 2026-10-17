<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
// #ifdef H5
import { createGlassRefraction } from './refraction.h5'
// #endif

interface Props {
  /** 数字使用 px，也支持 rpx、百分比等 CSS 长度。 */
  width?: number | string
  height?: number | string
  radius?: number | string
  padding?: number | string
  /** 背景模糊半径，单位 px。 */
  blur?: number
  /** 材质填充的不透明度，0–1，不影响插槽内容。 */
  opacity?: number
  saturation?: number
  /** H5 折射位移，单位 px；0 关闭，小程序忽略。 */
  refraction?: number
  tone?: 'light' | 'dark'
  /** 作为单个按钮使用。插槽包含表单、按钮等交互内容时保持 false。 */
  interactive?: boolean
  disabled?: boolean
  reducedMotion?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: 'auto',
  radius: 24,
  padding: '32rpx',
  blur: 12,
  opacity: 0.12,
  saturation: 1.5,
  refraction: 28,
  tone: 'light',
  interactive: false,
  disabled: false,
  reducedMotion: false,
  ariaLabel: '',
})

const emit = defineEmits<{ click: [] }>()
const pressed = ref(false)
const bouncing = ref(false)
let bounceTimer: ReturnType<typeof setTimeout> | undefined

function length(value: string | number) {
  return typeof value === 'number' ? `${value}px` : value
}

const frameStyle = computed(() => ({
  width: length(props.width),
  height: length(props.height),
  borderRadius: length(props.radius),
}))
const materialStyle = computed(() => {
  const filter = `blur(${props.blur}px) saturate(${props.saturation})`
  const color = props.tone === 'dark' ? '13, 23, 39' : '255, 255, 255'
  return {
    'backgroundColor': `rgba(${color}, ${props.opacity})`,
    'backdropFilter': filter,
    '-webkit-backdrop-filter': filter,
  }
})

function resetPress() {
  pressed.value = false
}

function stopBounce() {
  clearTimeout(bounceTimer)
  bouncing.value = false
}

function press() {
  if (props.disabled || props.reducedMotion)
    return
  stopBounce()
  pressed.value = true
}

function activate() {
  resetPress()
  if (props.disabled)
    return
  stopBounce()
  if (!props.reducedMotion) {
    bouncing.value = true
    bounceTimer = setTimeout(stopBounce, 650)
  }
  emit('click')
}

watch(() => [props.disabled, props.interactive, props.reducedMotion], () => {
  resetPress()
  stopBounce()
})
onBeforeUnmount(stopBounce)

// 所有 DOM、Canvas、SVG、ResizeObserver 操作仅进入 H5 产物。
// #ifdef H5
const glassRoot = ref<{ $el: HTMLElement }>()
const refractionLayer = ref<{ $el: HTMLElement }>()
let optics: ReturnType<typeof createGlassRefraction> | undefined
onMounted(() => {
  optics = createGlassRefraction(glassRoot.value!.$el, refractionLayer.value!.$el)
  optics.update(props.refraction)
})
watch(() => [props.refraction, props.radius], () => optics?.update(props.refraction), { flush: 'post' })
onBeforeUnmount(() => optics?.dispose())
// #endif
</script>

<template>
  <view
    ref="glassRoot"
    class="fg-glass"
    :class="[themeClass, {
      'fg-glass--pressed': pressed,
      'fg-glass--bouncing': bouncing,
      'fg-glass--disabled': interactive && disabled,
      'fg-glass--still': reducedMotion,
    }]"
    :style="frameStyle"
  >
    <!-- 单独的透明折射层：不支持 SVG 背景滤镜时不会破坏基础模糊。 -->
    <!-- #ifdef H5 -->
    <view ref="refractionLayer" class="fg-glass__layer" aria-hidden="true" />
    <!-- #endif -->
    <view class="fg-glass__layer fg-glass__material" :style="materialStyle" aria-hidden="true" />
    <view class="fg-glass__layer fg-glass__shine" aria-hidden="true" />
    <view class="fg-glass__content" :style="{ padding: length(padding) }">
      <slot />
    </view>
    <button
      v-if="interactive"
      class="fg-glass__button"
      hover-class="none"
      role="button"
      :tabindex="disabled ? -1 : 0"
      :disabled="disabled"
      :aria-label="ariaLabel || '玻璃按钮'"
      @touchstart="press"
      @touchend="resetPress"
      @touchcancel="resetPress"
      @touchmove="resetPress"
      @mousedown="press"
      @mouseup="resetPress"
      @mouseleave="resetPress"
      @blur="resetPress"
      @keydown.enter.prevent="activate"
      @keydown.space.prevent="activate"
      @click="activate"
    />
  </view>
</template>

<style scoped>
.fg-glass {
  position: relative;
  box-sizing: border-box;
  max-width: 100%;
  box-shadow:
    0 12px 36px -16px rgba(0, 8, 24, 0.5),
    0 1px 4px rgba(0, 0, 0, 0.08);
  transition: transform 480ms cubic-bezier(0.2, 1.5, 0.35, 1);
}

.fg-glass__layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.fg-glass__material {
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.13), transparent 42%, rgba(255, 255, 255, 0.03));
}

.fg-glass__shine {
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.8),
    inset 1px 0 1px rgba(255, 255, 255, 0.2),
    inset 0 -1px 1px rgba(190, 222, 255, 0.28);
}

/* #ifdef APP-PLUS */
/* 真机禁用 backdrop-filter：毛玻璃每帧重算导致拖动/点击卡顿，改用伪玻璃（半透明渐变）保证流畅 */
.fg-glass__material {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 42%, rgba(255, 255, 255, 0.06));
}
/* #endif */

.fg-glass__content {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
}

.fg-glass__button {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
}

.fg-glass__button::after {
  border: 0;
}

.fg-glass__button[disabled] {
  background: transparent;
  cursor: default;
}

.fg-glass__button:focus-visible {
  outline: 3px solid #7bdcff;
  outline-offset: 4px;
}

.fg-glass--pressed {
  transform: scale(0.94, 0.97);
  transition-duration: 120ms;
}

.fg-glass--bouncing {
  animation: glass-bounce 650ms both;
}

.fg-glass--disabled .fg-glass__content {
  opacity: 0.45;
}

@keyframes glass-bounce {
  0% {
    transform: scale(0.94, 0.97);
  }
  36% {
    transform: scale(1.035, 1.02);
  }
  62% {
    transform: scale(0.985, 0.99);
  }
  82% {
    transform: scale(1.008, 1.005);
  }
  100% {
    transform: scale(1);
  }
}

.fg-glass--still {
  animation: none;
  transform: none;
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .fg-glass {
    animation: none;
    transform: none;
    transition: none;
  }
}
</style>
