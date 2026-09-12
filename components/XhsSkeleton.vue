<template>
  <view v-if="loading" class="sk">
 
    <view v-if="type==='list'" class="sk-list">
      <view v-for="i in rows" :key="i" class="sk-item">
        <view v-if="avatar" class="sk-ava shimmer"></view>
        <view class="sk-body">
          <view class="sk-line l1 shimmer"></view>
          <view class="sk-line l2 shimmer"></view>
        </view>
        <view v-if="rightDot" class="sk-dot shimmer"></view>
      </view>
    </view>

    <view v-else-if="type==='card'" class="sk-card">
      <view class="sk-cardTop">
        <view class="sk-ava big shimmer"></view>
        <view class="sk-body">
          <view class="sk-line l1 shimmer"></view>
          <view class="sk-line l2 shimmer"></view>
        </view>
      </view>
      <view class="sk-line l3 shimmer"></view>
      <view class="sk-line l4 shimmer"></view>
    </view>

    <view v-else class="sk-text">
      <view v-for="i in rows" :key="i" class="sk-line shimmer"></view>
    </view>
  </view>

  <slot v-else />
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  type: { type: String, default: 'list' }, // list | card | text
  rows: { type: Number, default: 8 },
  avatar: { type: Boolean, default: true },
  rightDot: { type: Boolean, default: false } 
})
</script>

<style scoped>
.sk{ padding: 0 12px; }

/* shimmer */
.shimmer{
  background: linear-gradient(90deg, #f2f2f2 0%, #e9e9e9 35%, #f2f2f2 70%);
  background-size: 200% 100%;
  animation: sk 1.2s ease-in-out infinite;
}
@keyframes sk{
  0%{ background-position: 0% 0; }
  100%{ background-position: -200% 0; }
}

/* list */
.sk-list{ padding: 6px 0; }
.sk-item{
  height: 68px;
  display:flex;
  align-items:center;
  gap: 10px;
  border-bottom: 1px solid #f2f2f2;
}
.sk-ava{
  width: 44px; height: 44px;
  border-radius: 16px;
  flex-shrink:0;
}
.sk-ava.big{ width:56px; height:56px; border-radius:16px; }
.sk-body{ flex:1; min-width:0; }
.sk-line{
  height: 12px;
  border-radius: 8px;
}
.sk-line.l1{ width: 42%; }
.sk-line.l2{ width: 26%; margin-top: 10px; }
.sk-dot{
  width: 18px; height: 18px;
  border-radius: 999px;
  flex-shrink:0;
}

.sk-card{ padding: 12px; border: 1px solid #f2f2f2; border-radius: 16px; margin-top: 12px; }
.sk-cardTop{ display:flex; gap: 12px; align-items:center; margin-bottom: 12px; }
.sk-line.l3{ width: 88%; margin-top: 10px; }
.sk-line.l4{ width: 68%; margin-top: 10px; }

.sk-text{ padding: 12px 0; }
.sk-text .sk-line{ margin-top: 10px; width: 100%; }
</style>
