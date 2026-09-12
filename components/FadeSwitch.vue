<template>
  <view v-if="mounted" :class="['fade-wrap', show ? 'in' : 'out']" @animationend="onAniEnd">
    <slot />
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: true }
})

const mounted = ref(props.show)

watch(() => props.show, (v) => {
  if (v) mounted.value = true
})

function onAniEnd() {
  if (!props.show) mounted.value = false
}
</script>

<style scoped>
.fade-wrap.in { animation: fadeIn .18s ease both; }
.fade-wrap.out { animation: fadeOut .18s ease both; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(6px); } }
</style>
