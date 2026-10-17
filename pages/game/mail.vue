<template>
  <view class="pg" :class="themeClass">
    <view class="pg-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pg-nav-bar">
        <view class="pg-back" @click="goBack">‹</view>
        <text class="pg-title">游戏邮箱</text>
        <view class="pg-pts">{{ points }}</view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="pg-body">
      <view v-if="!loading && list.length === 0" class="pg-empty"><text>暂无邮件</text></view>

      <view v-for="m in list" :key="m.id" class="card" :class="{ claimed: m.status === 'claimed' }">
        <view class="card-top">
          <text class="card-title">{{ m.title }}</text>
          <text v-if="Number(m.amount) > 0" class="card-amount">+{{ m.amount }}</text>
        </view>
        <text class="card-content">{{ m.content }}</text>
        <view class="card-bot">
          <text class="card-time">{{ m.time_ago }}</text>
          <view v-if="m.status === 'claimed'" class="card-state">已领取</view>
          <view v-else-if="m.status === 'frozen'" class="card-state frozen">已冻结</view>
          <view v-else-if="Number(m.amount) > 0" class="card-btn" @click="claim(m)">领取 {{ m.amount }} 积分</view>
          <view v-else class="card-state">已读</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'

export default {
  name: 'GameMail',
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
        const res = await request('game_center.php', { action: 'mail_list' }, 'GET')
        if (res && res.code === 0 && res.data) {
          this.list = res.data.list || []
          this.points = Number(res.data.points || 0)
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '加载失败', icon: 'none' })
      }
      this.loading = false
    },
    async claim(m) {
      try {
        const res = await request('game_center.php', { action: 'mail_claim', id: m.id }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: '已领取 ' + Number(m.amount) + ' 积分', icon: 'none' })
          this.load()
        } else {
          uni.showToast({ title: (res && res.msg) || '领取失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '领取失败', icon: 'none' })
      }
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
.card.claimed { opacity: .6; }
.card-top { display: flex; align-items: center; justify-content: space-between; }
.card-title { font-size: 27rpx; font-weight: 700; color: #fff; }
.card-amount { font-size: 28rpx; font-weight: 800; color: #ffd77a; }
.card-content { display: block; margin-top: 12rpx; font-size: 22rpx; color: #9ba0ba; line-height: 1.8; }
.card-bot { margin-top: 18rpx; display: flex; align-items: center; justify-content: space-between; }
.card-time { font-size: 20rpx; color: #6d718a; }
.card-state { font-size: 22rpx; color: #6d718a; }
.card-state.frozen { color: #ffcf80; }
.card-btn { padding: 10rpx 28rpx; border-radius: 999rpx; background: linear-gradient(135deg, #ff3b5c, #ff6a3d); color: #fff; font-size: 23rpx; font-weight: 600; }
</style>
