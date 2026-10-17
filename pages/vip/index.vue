<template>
  <view class="vip-page" :class="themeClass">
    <!-- 顶部导航 -->
    <view class="page-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-left" @click="goBack">
        <image src="/static/icon/arrow-left-dark.svg" class="back-icon" mode="aspectFit"></image>
      </view>
      <view class="header-title">VIP特权中心</view>
      <view class="header-right"></view>
    </view>

    <!-- 主内容 -->
    <scroll-view class="main-content" scroll-y :style="{ paddingTop: (statusBarHeight + 50) + 'px' }">

      <!-- 当前VIP状态 -->
      <view class="vip-status-card" :class="{ 'is-vip': isAnyVip }">
        <view class="status-content">
          <view class="user-avatar-wrap">
            <image class="user-avatar" :src="userInfo.avatar || '/static/avatar.png'" mode="aspectFill" />
            <view class="vip-badge-mini" v-if="isAnyVip">VIP</view>
          </view>
          <view class="user-status-info">
            <text class="user-name">{{ userInfo.name || userInfo.username || '用户' }}</text>
            <text class="status-desc" v-if="isPermanentVip">永久会员</text>
            <text class="status-desc" v-else-if="isTimeVip">时限会员 · 有效期至 {{ formatExpireTime(vipInfo.expire_time) }}</text>
            <text class="status-desc" v-else>您还不是VIP会员</text>
          </view>
        </view>
      </view>

      <!-- 永久会员提示 -->
      <view v-if="isPermanentVip" class="permanent-notice">
        <text class="permanent-notice-text">您已是永久会员，无需再次购买</text>
      </view>

      <!-- 价格卡片（横排） - 永久会员隐藏 -->
      <view class="price-section" v-if="!isPermanentVip">
        <view class="price-row">
          <view
            v-for="(price, idx) in vipPrices"
            :key="price.type"
            :class="['price-card', { active: selectedType === price.type, first: idx === 0 }]"
            @click="selectedType = price.type"
          >
            <!-- 推荐角标 -->
            <view class="rec-tag" v-if="idx === 0 && !selectedType || selectedType === price.type && idx === 0">
              <text>推荐</text>
            </view>
            <text class="price-name">{{ price.name }}</text>
            <view class="price-main">
              <text class="price-value">{{ price.price }}</text>
              <text class="price-unit">元</text>
            </view>
            <text class="price-duration">{{ price.duration }}</text>
          </view>
        </view>
      </view>

      <!-- 权益对比 -->
      <view class="compare-section">
        <view class="compare-title">权益对比</view>
        <view class="compare-table">
          <view class="compare-row compare-head">
            <view class="col-left"><text>普通用户</text></view>
            <view class="col-right"><image src="/static/icon/crown-gold.svg" class="crown-icon" mode="aspectFit"></image><text class="col-right-text">会员专属权益</text></view>
          </view>
          <view class="compare-row">
            <view class="col-left"><text class="dim">昵称样式</text></view>
            <view class="col-right highlight"><text class="hl-title">炫彩昵称</text><text class="hl-desc">昵称显示彩虹渐变效果</text></view>
          </view>
          <view class="compare-row">
            <view class="col-left"><text class="dim">评论样式</text></view>
            <view class="col-right highlight"><text class="hl-title">炫彩评论</text><text class="hl-desc">评论内容彩色显示</text></view>
          </view>
          <view class="compare-row">
            <view class="col-left"><text class="dim">头像边框</text></view>
            <view class="col-right highlight"><text class="hl-title">专属头像框</text><text class="hl-desc">VIP身份标识装饰</text></view>
          </view>
          <view class="compare-row">
            <view class="col-left"><text class="dim">徽章</text></view>
            <view class="col-right highlight"><text class="hl-title">VIP徽章</text><text class="hl-desc">独特身份标识</text></view>
          </view>
          <view class="compare-row">
            <view class="col-left"><text class="dim">评论可见帖子</text></view>
            <view class="col-right highlight"><text class="hl-title">免评论查看</text><text class="hl-desc">无需评论即可查看全文</text></view>
          </view>
          <view class="compare-row">
            <view class="col-left"><text class="dim">圈子进入</text></view>
            <view class="col-right highlight"><text class="hl-title">无限制进入</text><text class="hl-desc">无视等级限制进入所有圈子</text></view>
          </view>
        </view>
      </view>

      <!-- 购买按钮 - 永久会员隐藏 -->
      <view class="buy-action-wrap" v-if="!isPermanentVip">
        <view class="balance-line">
          <text class="balance-label">当前余额：</text>
          <text class="balance-val">{{ userBalance }} 元</text>
        </view>
        <view class="buy-btn" @click="buyVip">
          <text>{{ isTimeVip ? '立即续费' : '立即开通' }} ({{ getSelectedPrice }}元)</text>
        </view>
      </view>

      <!-- 卡密兑换 -->
      <view class="redeem-section">
        <view class="redeem-header">
          <text class="redeem-title">卡密兑换</text>
        </view>
        <view class="redeem-form">
          <input
            v-model="redeemCode"
            class="redeem-input"
            placeholder="请输入VIP卡密"
            maxlength="32"
          />
          <view class="redeem-btn" @click="redeemCard">
            <text>兑换</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { request } from '@/common/request.js'

export default {
  name: 'VipPage',
  data() {
    return {
      vipInfo: {
        is_vip: 0,
        vip: 0,
        vip_type: null,
        expire_time: null
      },
      vipPrices: [],
      selectedType: 'month',
      redeemCode: '',
      userBalance: 0,
      userInfo: null,
      statusBarHeight: 0
    }
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 0

    this.userInfo = uni.getStorageSync('userInfo') || {}
    this.loadVipInfo()
    this.loadPrices()
    this.loadWallet()
  },
  computed: {
    getSelectedPrice() {
      const price = this.vipPrices.find(p => p.type === this.selectedType)
      return price ? price.price : 0
    },
    // 永久会员：vip_type 为 permanent，或到期时间为 2099-12-31
    isPermanentVip() {
      if (this.vipInfo.vip_type === 'permanent') return true
      if (this.vipInfo.expire_time && String(this.vipInfo.expire_time).indexOf('2099-12-31') === 0) return true
      return false
    },
    // 时限会员：是VIP但非永久，且到期时间未过期
    isTimeVip() {
      if (this.isPermanentVip) return false
      if (!this.vipInfo.is_vip && this.vipInfo.vip !== 1) return false
      const expire = this.vipInfo.expire_time
      if (!expire) return false
      const expireDate = this.parseDate(expire)
      if (!expireDate) return false
      return expireDate.getTime() > Date.now()
    },
    // 任意会员状态
    isAnyVip() {
      return this.isPermanentVip || this.isTimeVip
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async loadVipInfo() {
      if (!this.userInfo || !this.userInfo.id) return
      try {
        const res = await request('extensions/vip_card.php', {
          action: 'user_vip',
          user_id: this.userInfo.id
        }, 'GET')
        if (res.code === 0 && res.data) {
          this.vipInfo = {
            is_vip: res.data.is_vip === true || res.data.is_vip === 1,
            vip: res.data.vip || 0,
            vip_type: res.data.vip_type || '',
            expire_time: res.data.vip_expire_time || res.data.expire_time || null
          }
        }
      } catch (e) {
      }
    },
    async loadPrices() {
      try {
        const res = await request('extensions/vip_card.php', { action: 'prices' }, 'GET')
        if (res.code === 0) {
          this.vipPrices = res.data
        }
      } catch (e) {
      }
    },
    async loadWallet() {
      if (!this.userInfo || !this.userInfo.id) return
      try {
        const res = await request('wallet.php', { action: 'get_wallet' }, 'POST')
        if (res.code === 0 && res.data) {
          this.userBalance = res.data.balance || 0
          if (this.userInfo) {
            this.userInfo.balance = this.userBalance
            uni.setStorageSync('userInfo', this.userInfo)
          }
        }
      } catch (e) {
      } finally {
        if (this.userInfo && this.userInfo.balance !== undefined) {
          this.userBalance = Number(this.userInfo.balance) || 0
        }
      }
    },
    async buyVip() {
      if (!this.userInfo || !this.userInfo.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 永久会员不可购买
      if (this.isPermanentVip) {
        uni.showToast({ title: '您已是永久会员，无需购买', icon: 'none' })
        return
      }

      if (this.userBalance < this.getSelectedPrice) {
        uni.showToast({ title: '余额不足', icon: 'none' })
        return
      }

      try {
        const res = await request('extensions/vip_card.php', {
          action: 'buy',
          user_id: this.userInfo.id,
          type: this.selectedType
        }, 'GET')

        if (res.code === 0) {
          uni.showToast({ title: '购买成功', icon: 'success' })
          this.loadVipInfo()
          this.loadWallet()
        } else {
          uni.showToast({ title: res.msg, icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '购买失败', icon: 'none' })
      }
    },
    async redeemCard() {
      if (!this.userInfo || !this.userInfo.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      if (!this.redeemCode.trim()) {
        uni.showToast({ title: '请输入卡密', icon: 'none' })
        return
      }

      try {
        const res = await request('extensions/vip_card.php', {
          action: 'redeem',
          user_id: this.userInfo.id,
          code: this.redeemCode.trim()
        }, 'GET')

        if (res.code === 0) {
          uni.showToast({ title: '兑换成功', icon: 'success' })
          this.redeemCode = ''
          this.loadVipInfo()
        } else {
          uni.showToast({ title: res.msg, icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '兑换失败', icon: 'none' })
      }
    },
    getVipTypeName(type) {
      const types = { month: '月卡', year: '年卡', permanent: '永久卡', time: '时间卡' }
      return types[type] || type
    },
    formatExpireTime(time) {
      if (!time) return ''
      const d = this.parseDate(time)
      if (!d) return ''
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    parseDate(time) {
      if (!time) return null
      try {
        let s = String(time)
        // 兼容 ISO 8601 格式 "2026-07-10T01:57:29+08:00"
        if (s.indexOf('T') !== -1) {
          s = s.replace('T', ' ').replace(/(\+|-)\d{2}:\d{2}$/, '')
        }
        // 兼容旧 iOS，把 - 替换为 /
        s = s.replace(/-/g, '/')
        const d = new Date(s)
        return isNaN(d.getTime()) ? null : d
      } catch (e) {
        return null
      }
    }
  }
}
</script>

<style scoped>
/* ====== 页面框架 ====== */
.vip-page {
  min-height: 100vh;
  background: var(--cr-surface-alt);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 0 24rpx;
  background: var(--cr-surface);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-sizing: border-box;
}

.header-left {
  width: 80rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  width: 40rpx;
  height: 40rpx;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--cr-text);
}

.header-right {
  width: 80rpx;
}

.main-content {
  padding-bottom: 60rpx;
  min-height: 100vh;
}

/* ====== 状态卡片 ====== */
.vip-status-card {
  margin: 20rpx 28rpx;
  border-radius: 24rpx;
  background: var(--cr-surface);
  padding: 28rpx 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(100, 120, 200, 0.08);
}

.vip-status-card.is-vip {
  background: linear-gradient(135deg, #f8f0ff, #fff5f8);
  box-shadow: 0 4rpx 24rpx rgba(140, 80, 220, 0.1);
}

.status-content {
  display: flex;
  align-items: center;
}

.user-avatar-wrap {
  position: relative;
  margin-right: 22rpx;
  flex-shrink: 0;
}

.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 3rpx solid #e0d4ff;
}

.vip-badge-mini {
  position: absolute;
  bottom: -4rpx;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #7c6fff, #a78bfa);
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  padding: 2rpx 14rpx;
  border-radius: 10rpx;
  white-space: nowrap;
}

.user-status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.user-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--cr-text);
}

.status-desc {
  font-size: 22rpx;
  color: var(--cr-text-muted);
}

/* ====== 价格卡片（横排） ====== */
.price-section {
  padding: 0 28rpx;
}

/* ====== 永久会员提示 ====== */
.permanent-notice {
  margin: 20rpx 28rpx;
  padding: 28rpx 32rpx;
  background: linear-gradient(135deg, #fff8e1, #fff3cd);
  border-radius: 20rpx;
  border: 1rpx solid #ffe082;
  display: flex;
  align-items: center;
  justify-content: center;
}
.permanent-notice-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #b8860b;
}

.price-row {
  display: flex;
  gap: 18rpx;
}

.price-card {
  flex: 1;
  background: var(--cr-surface);
  border-radius: 20rpx;
  padding: 28rpx 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  border: 2rpx solid var(--cr-border);
  transition: all 0.25s ease;
  overflow: visible;
}

.price-card.active {
  border-color: #7c6fff;
  background: linear-gradient(180deg, #f5f0ff 0%, #faf5ff 100%);
  box-shadow: 0 8rpx 30rpx rgba(124, 111, 255, 0.15);
  transform: translateY(-4rpx);
}

/* 推荐角标 */
.rec-tag {
  position: absolute;
  top: -10rpx;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff6b81, #ff4757);
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  padding: 4rpx 20rpx;
  border-radius: 0 0 16rpx 16rpx;
  white-space: nowrap;
  z-index: 2;
}

.price-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #555;
  margin-bottom: 12rpx;
}

.price-card.active .price-name {
  color: #7c6fff;
}

.price-main {
  display: flex;
  align-items: baseline;
  margin-bottom: 6rpx;
}

.price-value {
  font-size: 52rpx;
  font-weight: 800;
  color: #ff4757;
  line-height: 1;
}

.price-unit {
  font-size: 24rpx;
  color: var(--cr-text-muted);
  margin-left: 4rpx;
}

.price-duration {
  font-size: 20rpx;
  color: var(--cr-text-muted);
}

/* ====== 权益对比 ====== */
.compare-section {
  margin: 36rpx 28rpx 0;
}

.compare-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--cr-text);
  margin-bottom: 20rpx;
}

.compare-table {
  background: var(--cr-surface);
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(100, 120, 200, 0.06);
}

.compare-row {
  display: flex;
  min-height: 110rpx;
}

.compare-row + .compare-row {
  border-top: 1rpx solid #f2f3f8;
}

.compare-head {
  min-height: 88rpx;
  background: #fafafe;
}

.col-left {
  width: 35%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 16rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--cr-text-muted);
  box-sizing: border-box;
  border-right: 1rpx solid #f2f3f8;
}

.col-right {
  width: 65%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 16rpx;
  box-sizing: border-box;
}

.compare-head .col-right {
  flex-direction: row;
  gap: 8rpx;
  background: linear-gradient(135deg, #ede7ff, #f0eaff);
}

.crown-icon {
  width: 28rpx;
  height: 28rpx;
}

.col-right-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #7c6fff;
}

/* 普通用户列灰色文字 */
.dim {
  color: var(--cr-border-strong);
  font-size: 24rpx;
}

/* 权益高亮列 */
.highlight {
  background: linear-gradient(180deg, #f8f4ff 0%, #fcf8ff 100%);
}

.hl-title {
  font-size: 25rpx;
  font-weight: 600;
  color: #7c6fff;
  display: block;
  margin-bottom: 4rpx;
}

.hl-desc {
  font-size: 20rpx;
  color: var(--cr-text-muted);
  display: block;
  text-align: center;
}

/* ====== 购买按钮区 ====== */
.buy-action-wrap {
  margin: 36rpx 28rpx 0;
  padding: 28rpx 32rpx;
  background: var(--cr-surface);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(100, 120, 200, 0.06);
}

.balance-line {
  margin-bottom: 20rpx;
}

.balance-label {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}

.balance-val {
  font-size: 26rpx;
  font-weight: 600;
  color: #ff4757;
}

.buy-btn {
  height: 90rpx;
  background: linear-gradient(135deg, #7c6fff, #a78bfa);
  border-radius: 45rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(124, 111, 255, 0.35);
}

.buy-btn text {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 2rpx;
}

.buy-btn:active {
  transform: scale(0.97);
  opacity: 0.92;
}

/* ====== 卡密兑换 ====== */
.redeem-section {
  margin: 28rpx 28rpx 0;
  background: var(--cr-surface);
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(100, 120, 200, 0.06);
}

.redeem-header {
  margin-bottom: 18rpx;
}

.redeem-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--cr-text);
}

.redeem-form {
  display: flex;
  gap: 16rpx;
}

.redeem-input {
  flex: 1;
  height: 80rpx;
  padding: 0 28rpx;
  border: 2rpx solid var(--cr-border);
  border-radius: 40rpx;
  font-size: 27rpx;
  color: var(--cr-text);
  background: var(--cr-canvas);
}

.redeem-input::placeholder {
  color: var(--cr-border-strong);
}

.redeem-btn {
  width: 150rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #7c6fff, #a78bfa);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.redeem-btn text {
  font-size: 27rpx;
  font-weight: 600;
  color: #fff;
}
</style>
