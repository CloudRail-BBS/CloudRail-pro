<template>
  <view class="redpacket-overlay" :class="themeClass" v-if="visible" @touchmove.stop.prevent>
    <view class="redpacket-container">
      <view class="redpacket-close" @click="close">×</view>
      
      <!-- 红包未拆开状态 -->
      <view class="redpacket-main" v-if="!claimed">
        <!-- 红包上半部分 -->
        <view class="redpacket-top-part">
          <view class="redpacket-sender">
            <view class="sender-avatar">
              <image class="avatar-image" :src="siteLogo || currentPacket?.site_logo || currentPacket?.avatar || '/static/logo.png'" mode="aspectFill" />
            </view>
            <text class="sender-name">来自 {{ siteName || currentPacket?.site_name || currentPacket?.sender_name || '社区' }}的红包</text>
          </view>
          
          <view class="redpacket-greeting">{{ currentPacket?.message || '恭喜发财，大吉大利' }}</view>
        </view>
        
        <!-- 红包开口 -->
        <view class="redpacket-opener">
          <view class="opener-curve"></view>
        </view>
        
        <!-- 红包下半部分 -->
        <view class="redpacket-bottom-part">
          <view class="open-btn" :class="{ rotating: isRotating, loading: isClaiming }" @click="claim">
            <text class="open-text">開</text>
          </view>
        </view>
      </view>
      
      <!-- 领取结果 -->
      <view class="redpacket-result" v-else>
        <view class="result-card">
          <view class="result-header">
            <view class="result-icon">
              <image v-if="isCompensation" src="/static/icon/gift-white.svg" class="result-icon-img" mode="aspectFit"></image>
              <image v-else-if="claimSuccess" src="/static/icon/gift-white.svg" class="result-icon-img" mode="aspectFit"></image>
              <image v-else src="/static/icon/x-circle-white.svg" class="result-icon-img" mode="aspectFit"></image>
            </view>
            <view class="result-title">{{ isCompensation ? '补偿积分' : (claimSuccess ? '恭喜你成功领取了红包' : '很遗憾') }}</view>
          </view>

          <!-- 正常领取成功 -->
          <view class="result-body" v-if="claimSuccess && !isCompensation">
            <view class="result-amount">
              <text class="amount-symbol">¥</text>
              <text class="amount-value">{{ formatAmount(claimAmount) }}</text>
            </view>
            <view class="result-desc">已存入你的余额</view>
          </view>

          <!-- 积分补偿 -->
          <view class="result-body" v-else-if="isCompensation">
            <view class="result-amount">
              <image src="/static/icon/gift-orange.svg" class="amount-symbol-img" mode="aspectFit"></image>
              <text class="amount-value" style="color:#ff9800;">{{ compensationPoints }}</text>
            </view>
            <view class="result-desc" style="color:#ff9800;">积分已存入你的账户</view>
            <view class="result-desc" style="margin-top:12rpx;font-size:24rpx;color:#999;">{{ resultText }}</view>
          </view>

          <!-- 领取失败 -->
          <view class="result-body" v-else>
            <view class="result-desc">{{ resultText }}</view>
          </view>

          <view class="result-footer">
            <view class="result-btn" @click="close">
              <text>收下</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../common/request.js'

export default {
  name: 'RedPacketModal',
  props: {
    userId: {
      type: [Number, String],
      default: 0
    },
    username: {
      type: String,
      default: ''
    }
  },
  
  data() {
    return {
      visible: false,
      currentPacket: null,
      isClaiming: false,
      isRotating: false,
      claimed: false,
      claimSuccess: false,
      isCompensation: false,
      claimAmount: 0,
      compensationPoints: 0,
      resultText: '',
      // 与应用基本配置一致：优先从 settings 接口读取 site_name/site_logo，避免硬编码"CloudRail-pro/logo.png"
      siteName: '',
      siteLogo: ''
    }
  },

  mounted() {
    this.loadSiteConfig()
    if (this.userId && this.username) {
      this.checkRedPackets()
    }
  },

  watch: {
    userId(newVal) {
      if (newVal && this.username && !this.visible && !this.claimed) {
        this.checkRedPackets()
      }
    },
    username(newVal) {
      if (newVal && this.userId && !this.visible && !this.claimed) {
        this.checkRedPackets()
      }
    }
  },

  methods: {
    async loadSiteConfig() {
      try {
        // 统一走 system/settings：和用户后台"应用基本配置"同源，保证名字/头像一致
        const res = await request('system.php', { action: 'settings' }, 'GET')
        if (res && res.code === 0 && res.data) {
          this.siteName = res.data.site_name || ''
          this.siteLogo = res.data.site_logo || ''
          // 强制同步注入 currentPacket，避免红包数据自身的 site_name/avatar 覆盖应用基本配置
          if (this.currentPacket) {
            if (this.siteName) this.currentPacket.site_name = this.siteName
            if (this.siteName) this.currentPacket.sender_name = this.siteName
            if (this.siteLogo) this.currentPacket.site_logo = this.siteLogo
            if (this.siteLogo) this.currentPacket.avatar = this.siteLogo
          }
        }
      } catch (e) {
        // 配置加载失败不影响领红包流程, 继续使用默认值
      }
    },
    formatAmount(amount) {
      return parseFloat(amount || 0).toFixed(2)
    },

    async checkRedPackets() {
      if (!this.userId || !this.username) return

      try {
        const res = await request('extensions/redpacket.php', {
          action: 'available',
          user_id: this.userId,
          username: this.username
        }, 'GET')

        if (res.code === 0 && res.data && res.data.packets && res.data.packets.length > 0) {
          const pkt = res.data.packets[0] || {}
          // 应用基本配置的站点名/头像优先显示，不被红包的 sender_name/avatar 覆盖
          if (this.siteName) { pkt.site_name = this.siteName; pkt.sender_name = this.siteName }
          if (this.siteLogo) { pkt.site_logo = this.siteLogo; pkt.avatar = this.siteLogo }
          this.currentPacket = pkt
          this.visible = true
        }
      } catch (e) {
        console.log('[红包] 检查可领取红包失败:', e && e.msg ? e.msg : e)
      }
    },
    
    async claim() {
      if (!this.currentPacket || this.isClaiming) return
      
      // 先播放旋转动画
      this.isRotating = true
      
      // 等待旋转动画完成（2秒）
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      this.isRotating = false
      this.isClaiming = true
      
      try {
        const res = await request('extensions/redpacket.php', {
          action: 'claim',
          id: this.currentPacket.id,
          packet_id: this.currentPacket.id,
          user_id: this.userId,
          username: this.username
        }, 'POST')
        
        if (res.code === 0) {
          // 检查是否为积分补偿
          if (res.data && res.data.is_compensation) {
            this.isCompensation = true
            this.claimSuccess = true
            this.compensationPoints = res.data.points || 0
            this.resultText = res.msg || '当前红包金额已被抢完啦！下次再来吧！'
          } else {
            this.isCompensation = false
            this.claimSuccess = true
            this.claimAmount = res.data.amount
            this.resultText = '红包已被抢完'
          }
        } else {
          this.claimSuccess = false
          this.isCompensation = false
          this.resultText = res.msg || '领取失败'
        }

        this.claimed = true
      } catch (e) {
        this.claimSuccess = false
        this.resultText = '领取失败，请重试'
        this.claimed = true
      } finally {
        this.isClaiming = false
      }
    },
    
    close() {
      this.visible = false
      this.claimed = false
      this.claimSuccess = false
      this.isCompensation = false
      this.claimAmount = 0
      this.compensationPoints = 0
      this.resultText = ''
      this.currentPacket = null
    }
  }
}
</script>

<style scoped>
.redpacket-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  box-sizing: border-box;
}

.redpacket-container {
  width: calc(100% - 80rpx);
  max-width: 560rpx;
  position: relative;
  margin: 0 auto;
}

.redpacket-close {
  position: absolute;
  top: -80rpx;
  right: 0;
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: var(--cr-text-muted);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  z-index: 10;
}

/* 红包主体 */
.redpacket-main {
  background: #e83a3a;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(232, 58, 58, 0.5);
  margin: 0 auto;
  width: 100%;
  min-height: 800rpx;
  display: flex;
  flex-direction: column;
}

/* 红包上半部分 */
.redpacket-top-part {
  padding: 60rpx 32rpx 32rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.redpacket-sender {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.sender-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: var(--cr-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.5);
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-icon {
  font-size: 40rpx;
}

.sender-name {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.redpacket-greeting {
  font-size: 36rpx;
  color: #fff;
  font-weight: bold;
  letter-spacing: 4rpx;
}

/* 红包开口 */
.redpacket-opener {
  height: 32rpx;
  position: relative;
  overflow: hidden;
}

.opener-curve {
  position: absolute;
  top: -24rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 120%;
  height: 60rpx;
  background: #d43232;
  border-radius: 50%;
}

/* 红包下半部分 */
.redpacket-bottom-part {
  padding: 48rpx 32rpx 80rpx;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  flex: 1;
}

.open-btn {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #f7d16a 0%, #e6b82a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.open-btn.loading {
  background: #ccc;
}

.open-btn.rotating {
  animation: coinFlip 0.5s linear infinite;
  transform-style: preserve-3d;
}

@keyframes coinFlip {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(180deg);
  }
  100% {
    transform: rotateY(360deg);
  }
}

.open-text {
  font-size: 56rpx;
  font-weight: bold;
  color: #8b4513;
  font-family: 'STKaiti', 'KaiTi', serif;
}

.open-btn.loading .open-text {
  color: var(--cr-text-muted);
}

/* 领取结果 */
.redpacket-result {
  animation: resultAppear 0.3s ease-out;
}

@keyframes resultAppear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.result-card {
  background: var(--cr-surface);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
  min-height: 800rpx;
  display: flex;
  flex-direction: column;
}

.result-header {
  background: linear-gradient(180deg, #e83a3a 0%, #c91f1f 100%);
  padding: 48rpx 32rpx 32rpx;
  text-align: center;
}

.result-icon {
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.result-icon-img {
  width: 80rpx;
  height: 80rpx;
}

.result-title {
  font-size: 32rpx;
  color: #fff;
}

.result-body {
  padding: 100rpx 32rpx 48rpx;
  text-align: center;
}

.result-amount {
  margin-bottom: 16rpx;
}

.amount-symbol {
  font-size: 48rpx;
  font-weight: bold;
  color: #e83a3a;
}
.amount-symbol-img {
  width: 48rpx;
  height: 48rpx;
  margin-right: 4rpx;
}

.amount-value {
  font-size: 88rpx;
  font-weight: bold;
  color: #e83a3a;
  line-height: 1;
}

.result-desc {
  font-size: 28rpx;
  color: var(--cr-text-muted);
}

.result-footer {
  padding: 0 32rpx 80rpx;
  margin-top: auto;
}

.result-btn {
  background: linear-gradient(180deg, #e83a3a 0%, #c91f1f 100%);
  padding: 28rpx;
  border-radius: 60rpx;
  text-align: center;
}

.result-btn text {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
}
</style>