<template>
  <view class="bh-page">
    <!-- 固定导航 -->
    <view class="bh-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="bh-nav-inner">
        <view class="bh-nav-btn" @click="goBack">
          <image class="bh-nav-icon" src="/static/icon/arrow-left-dark.svg" mode="aspectFit"></image>
        </view>
        <text class="bh-nav-title">小黑屋</text>
        <view class="bh-nav-btn"></view>
      </view>
    </view>

    <scroll-view
      class="bh-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      refresher-default-style="none"
      refresher-background="transparent"
      :refresher-threshold="60"
      :lower-threshold="160"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view :style="{ height: navTotalHeight + 'px' }"></view>

      <!-- 顶部说明卡 -->
      <view class="bh-hero">
        <view class="bh-hero-glow"></view>
        <text class="bh-hero-title">社区违规公示</text>
        <text class="bh-hero-sub">以下用户因违反社区规范被封禁，欢迎大家共同监督</text>
        <view class="bh-hero-stats">
          <view class="bh-stat">
            <text class="bh-stat-num">{{ total }}</text>
            <text class="bh-stat-label">当前封禁</text>
          </view>
          <view class="bh-stat-divider"></view>
          <view class="bh-stat">
            <text class="bh-stat-num">{{ permanentCount }}</text>
            <text class="bh-stat-label">永久封禁</text>
          </view>
        </view>
      </view>

      <!-- 封禁名单(简略) -->
      <view class="bh-list">
        <view class="bh-card" v-for="item in list" :key="item.uid" @click="openDetail(item)">
          <image class="bh-avatar" :src="item.avatar || '/static/logo.png'" mode="aspectFill"></image>

          <view class="bh-info">
            <text class="bh-name">{{ item.nickname || '未知用户' }}</text>
            <text class="bh-brief">{{ item.ban_reason || '该账号已被限制登录' }}</text>
          </view>

          <view class="bh-right">
            <view class="bh-chip" :class="item.ban_state || (item.is_permanent ? 'permanent' : 'temp')">
              {{ item.ban_expire_text }}
            </view>
            <text class="bh-detail-btn">查看详情 ›</text>
          </view>
        </view>

        <view class="bh-empty" v-if="!loading && list.length === 0">
          <text class="bh-empty-title">小黑屋空空如也</text>
          <text class="bh-empty-sub">当前没有被封禁的用户，社区很健康</text>
        </view>

        <view class="bh-loading" v-if="loading">
          <text>加载中...</text>
        </view>
        <view class="bh-nomore" v-else-if="list.length > 0 && !hasMore">
          <text>- 已显示全部 -</text>
        </view>
      </view>

      <view class="bh-footer-space"></view>
    </scroll-view>

    <!-- 详情弹窗 -->
    <view class="bh-modal" v-if="showDetail">
      <view class="bh-mask" @click="closeDetail"></view>
      <view class="bh-sheet" @click.stop>
        <view class="bh-sheet-head">
          <text class="bh-sheet-title">违规详情</text>
          <view class="bh-sheet-close" @click="closeDetail">
            <image class="bh-sheet-close-icon" src="/static/icon/x-light-gray.svg" mode="aspectFit"></image>
          </view>
        </view>

        <scroll-view class="bh-sheet-body" scroll-y>
          <!-- 用户 -->
          <view class="bh-d-user">
            <image class="bh-d-avatar" :src="(selected && selected.avatar) || '/static/logo.png'" mode="aspectFill"></image>
            <view class="bh-d-user-info">
              <text class="bh-d-name">{{ (selected && selected.nickname) || '未知用户' }}</text>
              <text class="bh-d-uid">ID: {{ (selected && selected.uid) || '-' }}</text>
            </view>
            <view
              class="bh-chip"
              :class="(selected && (selected.ban_state || (selected.is_permanent ? 'permanent' : 'temp'))) || 'temp'"
            >
              {{ (selected && selected.ban_expire_text) || '-' }}
            </view>
          </view>

          <view class="bh-d-rows">
            <view class="bh-d-row">
              <text class="bh-d-label">封禁原因</text>
              <text class="bh-d-value">{{ (selected && selected.ban_reason) || '未填写具体原因' }}</text>
            </view>
            <view class="bh-d-row" v-if="selected && selected.reporter_name">
              <text class="bh-d-label">举报人</text>
              <view class="bh-d-value-row">
                <image
                  class="bh-mini-avatar"
                  v-if="selected.reporter_avatar"
                  :src="selected.reporter_avatar"
                  mode="aspectFill"
                ></image>
                <text class="bh-d-value">{{ selected.reporter_name }}</text>
              </view>
            </view>
            <view class="bh-d-row" v-if="selected && selected.report_reason">
              <text class="bh-d-label">举报原因</text>
              <text class="bh-d-value red">{{ selected.report_reason }}</text>
            </view>
            <view class="bh-d-row" v-if="selected && selected.report_target_name">
              <text class="bh-d-label">举报对象</text>
              <text class="bh-d-value">{{ selected.report_target_name }}</text>
            </view>
            <view class="bh-d-row" v-if="selected && selected.result">
              <text class="bh-d-label">处理结果</text>
              <text class="bh-d-value">{{ selected.result }}</text>
            </view>
            <view class="bh-d-row" v-if="selected && selected.handle_time">
              <text class="bh-d-label">处理时间</text>
              <text class="bh-d-value">{{ formatTime(selected.handle_time) }}</text>
            </view>
          </view>

          <view class="bh-d-reply" v-if="selected && selected.reply">
            <view class="bh-d-reply-head">
              <text class="bh-d-reply-title">管理员回复</text>
              <text class="bh-d-reply-time" v-if="selected.reply_at">{{ formatTime(selected.reply_at) }}</text>
            </view>
            <text class="bh-d-reply-text">{{ selected.reply }}</text>
          </view>

          <text class="bh-d-tip" v-if="selected && !selected.reporter_name && !selected.report_reason">
            该账号因违规行为被限制登录，无关联举报记录。
          </text>
        </scroll-view>

        <view class="bh-sheet-foot">
          <view class="bh-sheet-btn" @click="closeDetail">关闭</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import { getScreenMetrics } from '../../common/screen.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      navTotalHeight: 64,
      refreshing: false,
      loading: false,
      page: 1,
      hasMore: true,
      total: 0,
      permanentCount: 0,
      list: [],
      showDetail: false,
      selected: null
    }
  },
  onLoad() {
    const metrics = getScreenMetrics()
    this.statusBarHeight = metrics.statusBarHeight
    this.navTotalHeight = metrics.statusBarHeight + 44
    this.loadList(true)
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    },
    openDetail(item) {
      this.selected = item
      this.showDetail = true
    },
    closeDetail() {
      this.showDetail = false
      this.selected = null
    },
    onRefresh() {
      this.refreshing = true
      this.loadList(true).then(() => {
        this.refreshing = false
      })
    },
    loadMore() {
      if (this.hasMore && !this.loading) this.loadList(false)
    },
    async loadList(reset) {
      if (this.loading) return
      if (reset) {
        this.page = 1
        this.hasMore = true
      }
      if (!this.hasMore) return
      this.loading = true
      try {
        const res = await request('report.php', {
          action: 'blacklist',
          page: this.page,
          size: 20
        }, { method: 'GET' })

        if (res && (res.code === 0 || res.status === 'success') && res.data) {
          /* 后端出错时会带回 error, 弹出便于排查 */
          if (res.data.error) {
            uni.showToast({ title: String(res.data.error), icon: 'none', duration: 5000 })
          }
          const rows = res.data.list || []
          this.list = reset ? rows : this.list.concat(rows)
          this.total = Number(res.data.total) || 0
          this.permanentCount = Number(res.data.permanent_count) || 0
          if (rows.length < 20) this.hasMore = false
          if (this.hasMore) this.page += 1
        } else {
          this.hasMore = false
          if (reset) {
            uni.showToast({
              title: (res && (res.msg || res.message)) || '加载失败，请稍后再试',
              icon: 'none'
            })
          }
        }
      } catch (e) {
        this.hasMore = false
        if (reset) {
          uni.showToast({
            title: (e && (e.msg || e.message)) || '网络异常，请稍后再试',
            icon: 'none'
          })
        }
      }
      this.loading = false
    },
    formatTime(time) {
      if (!time) return ''
      const date = new Date(String(time).replace(/-/g, '/'))
      if (isNaN(date.getTime())) return String(time)
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const hh = String(date.getHours()).padStart(2, '0')
      const mm = String(date.getMinutes()).padStart(2, '0')
      return `${date.getFullYear()}-${m}-${d} ${hh}:${mm}`
    }
  }
}
</script>

<style scoped>
.bh-page {
  min-height: 100vh;
  background: #f4f5f7;
}

/* 顶部导航 */
.bh-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 998;
  background: #ffffff;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}
.bh-nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
}
.bh-nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bh-nav-icon {
  width: 40rpx;
  height: 40rpx;
}
.bh-nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.bh-scroll {
  height: 100vh;
  box-sizing: border-box;
}

/* 顶部说明卡 */
.bh-hero {
  position: relative;
  margin: 20rpx 24rpx 0;
  padding: 36rpx 32rpx 32rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #3f4654 0%, #1f2530 100%);
  box-shadow: 0 10rpx 30rpx rgba(31, 37, 48, 0.28);
}
.bh-hero-glow {
  position: absolute;
  top: -90rpx;
  right: -60rpx;
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 36, 66, 0.45) 0%, rgba(255, 36, 66, 0) 70%);
}
.bh-hero-title {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2rpx;
}
.bh-hero-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}
.bh-hero-stats {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 20rpx 0;
}
.bh-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bh-stat-num {
  font-size: 42rpx;
  font-weight: 800;
  color: #ffffff;
}
.bh-stat-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.62);
}
.bh-stat-divider {
  width: 1rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.16);
}

/* 名单(简略行) */
.bh-list {
  padding: 24rpx 24rpx 0;
}
.bh-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 18rpx rgba(0, 0, 0, 0.04);
}
.bh-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: #eceef2;
  flex-shrink: 0;
}
.bh-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}
.bh-name {
  display: block;
  font-size: 29rpx;
  font-weight: 700;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bh-brief {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9aa0aa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bh-right {
  flex-shrink: 0;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.bh-detail-btn {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #ff2442;
  font-weight: 600;
}

/* 封禁状态标签 */
.bh-chip {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 21rpx;
  font-weight: 700;
  white-space: nowrap;
}
.bh-chip.permanent {
  color: #ffffff;
  background: linear-gradient(135deg, #ff4d6a 0%, #ff2442 100%);
}
.bh-chip.temp {
  color: #d46b08;
  background: #fff7e6;
}
.bh-chip.released {
  color: #6b7280;
  background: #f1f2f4;
}

.bh-empty {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bh-empty-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #666b75;
}
.bh-empty-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9aa0aa;
}
.bh-loading,
.bh-nomore {
  padding: 30rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #9aa0aa;
}
.bh-footer-space {
  height: 60rpx;
}

/* 详情弹窗 */
.bh-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1200;
}
.bh-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
}
.bh-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 78vh;
  height: auto;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 28rpx 28rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}
.bh-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 28rpx 20rpx;
  border-bottom: 1rpx solid #f2f3f5;
}
.bh-sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.bh-sheet-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bh-sheet-close-icon {
  width: 34rpx;
  height: 34rpx;
}
.bh-sheet-body {
  flex: 1;
  min-height: 0;
  height: 0;
  padding: 24rpx 28rpx;
  box-sizing: border-box;
  overflow-y: auto;
}
.bh-sheet-foot {
  padding: 16rpx 28rpx 24rpx;
  border-top: 1rpx solid #f2f3f5;
}
.bh-sheet-btn {
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  background: #f2f3f5;
  color: #333333;
  font-size: 29rpx;
  font-weight: 600;
}

/* 详情内容 */
.bh-d-user {
  display: flex;
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f2f3f5;
}
.bh-d-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #eceef2;
  flex-shrink: 0;
}
.bh-d-user-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}
.bh-d-name {
  display: block;
  font-size: 31rpx;
  font-weight: 700;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bh-d-uid {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #9aa0aa;
}
.bh-d-rows {
  padding-top: 12rpx;
}
.bh-d-row {
  display: flex;
  align-items: flex-start;
  padding: 18rpx 0;
}
.bh-d-label {
  width: 140rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #9aa0aa;
}
.bh-d-value-row {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}
.bh-d-value {
  flex: 1;
  font-size: 27rpx;
  line-height: 1.6;
  color: #333333;
  word-break: break-all;
}
.bh-d-value.red {
  color: #ff2442;
  font-weight: 600;
}
.bh-mini-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  flex-shrink: 0;
  background: #eceef2;
}
.bh-d-reply {
  margin-top: 12rpx;
  padding: 20rpx 22rpx;
  border-radius: 16rpx;
  background: #f2f6ff;
  border-left: 6rpx solid #2f6fed;
}
.bh-d-reply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bh-d-reply-title {
  font-size: 23rpx;
  font-weight: 700;
  color: #2f6fed;
}
.bh-d-reply-time {
  font-size: 21rpx;
  color: #9aa0aa;
}
.bh-d-reply-text {
  display: block;
  margin-top: 10rpx;
  font-size: 27rpx;
  line-height: 1.6;
  color: #37507f;
}
.bh-d-tip {
  display: block;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #9aa0aa;
}
</style>
