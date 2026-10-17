<template>
  <view class="pg" :class="themeClass">
    <view class="pg-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pg-nav-bar">
        <view class="pg-back" @click="goBack">‹</view>
        <text class="pg-title">对局记录</text>
        <view class="pg-pts">{{ points }}</view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="pg-body">
      <view v-if="!loading && list.length === 0" class="pg-empty"><text>暂无对局记录</text></view>

      <view v-for="it in list" :key="it.id" class="card">
        <view class="card-top">
          <text class="card-room">{{ it.room_name || it.type_name }}</text>
          <text class="card-res" :class="resClass(it)">{{ resText(it) }}</text>
        </view>
        <view class="card-meta">
          <text>{{ it.type_name }}</text>
          <text>入门 {{ it.entry_fee }}</text>
          <text>时长 {{ it.duration || 0 }}s</text>
          <text>{{ it.time_ago }}</text>
        </view>
        <view class="card-bot">
          <text class="card-net" :class="{ up: Number(it.net) > 0, down: Number(it.net) < 0 }">
            {{ Number(it.net) > 0 ? '+' : '' }}{{ it.net }} 积分
          </text>
          <view v-if="it.replay_id" class="card-btn" @click="openReplay(it)">查看回放</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'

export default {
  name: 'GameRecords',
  data() {
    return { statusBarHeight: 20, list: [], points: 0, loading: true }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.load()
  },
  methods: {
    goBack() { uni.navigateBack() },
    async load() {
      this.loading = true
      try {
        const res = await request('game_center.php', { action: 'my_sessions' }, 'GET')
        if (res && res.code === 0 && res.data) {
          this.list = res.data.list || []
          this.points = Number(res.data.points || 0)
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '加载失败', icon: 'none' })
      }
      this.loading = false
    },
    resText(it) {
      if (it.result === 'win') return '胜'
      if (it.result === 'lose') return '负'
      if (it.result === 'abandon') return '放弃'
      return '—'
    },
    resClass(it) {
      return { win: it.result === 'win', lose: it.result === 'lose' }
    },
    openReplay(it) {
      uni.navigateTo({ url: '/pages/game/replay?id=' + it.replay_id })
    }
  }
}
</script>

<style scoped>
.pg { min-height: 100vh; background: #0f1220; }
.pg-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 99; background: rgba(15,18,32,.94); }
.pg-nav-bar { height: 44px; display: flex; align-items: center; padding: 0 20rpx; }
.pg-back { width: 56rpx; font-size: 46rpx; color: #fff; line-height: 1; }
.pg-title { flex: 1; font-size: 32rpx; font-weight: 700; color: #fff; }
.pg-pts { width: 160rpx; text-align: right; font-size: 24rpx; color: #ffd77a; font-weight: 700; }
.pg-body { padding: 20rpx 24rpx 60rpx; }
.pg-empty { padding: 160rpx 0; text-align: center; }
.pg-empty text { font-size: 26rpx; color: #6d718a; }
.card { padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); margin-bottom: 16rpx; }
.card-top { display: flex; align-items: center; justify-content: space-between; }
.card-room { font-size: 28rpx; font-weight: 700; color: #fff; }
.card-res { font-size: 24rpx; font-weight: 700; color: #9ba0ba; }
.card-res.win { color: #52d17c; }
.card-res.lose { color: #ff6a8a; }
.card-meta { margin-top: 12rpx; display: flex; flex-wrap: wrap; gap: 8rpx 18rpx; }
.card-meta text { font-size: 21rpx; color: #9ba0ba; }
.card-bot { margin-top: 16rpx; display: flex; align-items: center; justify-content: space-between; }
.card-net { font-size: 26rpx; font-weight: 700; color: #c3c7dc; }
.card-net.up { color: #52d17c; }
.card-net.down { color: #ff6a8a; }
.card-btn { padding: 10rpx 26rpx; border-radius: 999rpx; background: rgba(124,92,255,.25); color: #d9d0ff; font-size: 23rpx; }
</style>
