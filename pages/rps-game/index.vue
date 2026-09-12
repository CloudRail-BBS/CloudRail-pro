<template>
  <view class="rps-page">
    <!-- 顶部导航 -->
    <view class="page-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-left" @click="goBack">
        <image src="/static/icon/arrow-left-white.svg" class="back-icon" mode="aspectFit"></image>
      </view>
      <view class="header-title">猜猜石头剪刀布</view>
      <view class="header-right">
        <view class="score-badge">
          <image src="/static/icon/star-fill-white.svg" class="score-icon" mode="aspectFit"></image>
          <text class="score-num">{{ userScore }}</text>
        </view>
      </view>
    </view>

    <!-- 主内容区 -->
    <scroll-view class="main-content" scroll-y :style="{ paddingTop: (statusBarHeight + 50) + 'px' }">
      <!-- 当前回合信息 -->
      <view class="round-info" v-if="currentRound">
        <view class="round-header">
          <text class="round-no">第 {{ currentRound.id }} 期</text>
          <view class="countdown" :class="{ urgent: countdown <= 10 }">
            <text class="countdown-label">剩余时间</text>
            <text class="countdown-num">{{ countdown }}秒</text>
          </view>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
      </view>

      <!-- 游戏区域 -->
      <view class="game-area">
        <text class="game-tip">请选择你的手势</text>
        
        <view class="choices">
          <view
            class="choice-item"
            :class="{ selected: selectedChoice === 'rock', disabled: hasBet || countdown <= 0 }"
            @click="selectChoice('rock')"
          >
            <image src="/static/icon/hand-rock-cyan.svg" class="choice-emoji" mode="aspectFit"></image>
            <text class="choice-name">石头</text>
            <text class="choice-odds">赔率 {{ settings.rock_odds }}x</text>
          </view>

          <view
            class="choice-item"
            :class="{ selected: selectedChoice === 'scissors', disabled: hasBet || countdown <= 0 }"
            @click="selectChoice('scissors')"
          >
            <image src="/static/icon/hand-scissors-purple.svg" class="choice-emoji" mode="aspectFit"></image>
            <text class="choice-name">剪刀</text>
            <text class="choice-odds">赔率 {{ settings.scissors_odds }}x</text>
          </view>

          <view
            class="choice-item"
            :class="{ selected: selectedChoice === 'paper', disabled: hasBet || countdown <= 0 }"
            @click="selectChoice('paper')"
          >
            <image src="/static/icon/hand-paper-pink.svg" class="choice-emoji" mode="aspectFit"></image>
            <text class="choice-name">布</text>
            <text class="choice-odds">赔率 {{ settings.paper_odds }}x</text>
          </view>
        </view>

        <!-- 下注区域 -->
        <view class="bet-area" v-if="selectedChoice && !hasBet && countdown > 0">
          <text class="bet-label">下注积分</text>
          <view class="bet-input-wrap">
            <input 
              v-model="betAmount" 
              type="number" 
              class="bet-input" 
              :placeholder="`最小${settings.min_bet} 最大${settings.max_bet}`"
            />
          </view>
          <view class="bet-quick">
            <text class="quick-btn" @click="setBet(10)">10</text>
            <text class="quick-btn" @click="setBet(50)">50</text>
            <text class="quick-btn" @click="setBet(100)">100</text>
            <text class="quick-btn" @click="setBet(500)">500</text>
          </view>
          <view class="bet-action">
            <text class="bet-btn" @click="placeBet">确认下注</text>
          </view>
        </view>

        <!-- 已下注提示 -->
        <view class="bet-result" v-if="hasBet">
          <text class="result-text">你已选择 {{ choiceName }}，下注 {{ betAmount }} 积分</text>
          <text class="result-wait">等待开奖...</text>
        </view>
      </view>

      <!-- 参与者列表 -->
      <view class="players-section">
        <view class="section-header">
          <text class="section-title">参与者</text>
          <text class="section-count">{{ players.length }}人</text>
        </view>
        <view class="players-avatars">
          <image 
            v-for="(player, index) in players.slice(0, 5)" 
            :key="index" 
            :src="player.avatar || '/static/user/default.png'"
            class="player-avatar-img"
            mode="aspectFill"
          />
          <view v-if="players.length > 5" class="player-more">
            <text>+{{ players.length - 5 }}</text>
          </view>
        </view>
      </view>

      <!-- 历史记录 -->
      <view class="history-section">
        <view class="section-header">
          <text class="section-title">最近开奖</text>
          <text class="expand-btn" v-if="history.length > 1" @click="showAllHistory = !showAllHistory">
            {{ showAllHistory ? '收起' : '展开' }}
          </text>
        </view>
        <view class="history-list" v-if="history.length > 0">
          <view v-for="(item, index) in displayHistory" :key="index" class="history-item">
            <text class="history-round">第{{ item.id }}期</text>
            <view class="history-result">
              <image v-if="item.result === 'rock'" src="/static/icon/hand-rock-cyan.svg" class="result-emoji" mode="aspectFit"></image>
              <image v-else-if="item.result === 'scissors'" src="/static/icon/hand-scissors-purple.svg" class="result-emoji" mode="aspectFit"></image>
              <image v-else src="/static/icon/hand-paper-pink.svg" class="result-emoji" mode="aspectFit"></image>
              <text class="result-name">{{ item.result === 'rock' ? '石头' : item.result === 'scissors' ? '剪刀' : '布' }}</text>
            </view>
            <text class="history-time">{{ formatTime(item.result_time) }}</text>
          </view>
        </view>
        <view class="empty-history" v-else>
          <text class="empty-text">暂无开奖记录</text>
        </view>
      </view>

      <!-- 我的下注记录 -->
      <view class="my-bets-section">
        <view class="section-header">
          <text class="section-title">我的下注记录</text>
          <text class="expand-btn" v-if="myBets.length > 1" @click="showAllBets = !showAllBets">
            {{ showAllBets ? '收起' : '展开' }}
          </text>
        </view>
        <view class="my-bets-list" v-if="myBets.length > 0">
          <view v-for="(item, index) in displayBets" :key="index" class="my-bet-item">
            <view class="my-bet-left">
              <text class="my-bet-round">第{{ item.round_id }}期</text>
              <view class="my-bet-choice">
                <image v-if="item.choice === 'rock'" src="/static/icon/hand-rock-cyan.svg" class="choice-emoji" mode="aspectFit"></image>
                <image v-else-if="item.choice === 'scissors'" src="/static/icon/hand-scissors-purple.svg" class="choice-emoji" mode="aspectFit"></image>
                <image v-else src="/static/icon/hand-paper-pink.svg" class="choice-emoji" mode="aspectFit"></image>
                <text class="choice-name">{{ item.choice === 'rock' ? '石头' : item.choice === 'scissors' ? '剪刀' : '布' }}</text>
              </view>
            </view>
            <view class="my-bet-right">
              <text class="my-bet-amount">{{ item.bet_amount }}积分</text>
              <view class="my-bet-result" :class="{ win: item.win_amount > 0, lose: item.round_result && item.win_amount == 0 }">
                <text v-if="item.win_amount > 0">+{{ item.win_amount }}积分</text>
                <text v-else-if="item.round_result && item.win_amount == 0">未中奖</text>
                <text v-else>等待开奖</text>
              </view>
            </view>
          </view>
        </view>
        <view class="empty-bets" v-else>
          <text class="empty-text">暂无下注记录</text>
        </view>
      </view>

      <!-- 底部用户积分 -->
      <view class="user-score-footer">
        <view class="score-info">
          <text class="score-label">我的积分</text>
          <text class="score-value">{{ userScore }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'

export default {
  name: 'RpsGamePage',
  data() {
    return {
      userScore: 0,
      userInfo: null,
      currentRound: null,
      selectedChoice: '',
      betAmount: '',
      hasBet: false,
      countdown: 0,
      countdownTimer: null,
      players: [],
      history: [],
      myBets: [],
      showAllHistory: false,
      showAllBets: false,
      statusBarHeight: 0,
      settings: {
        min_bet: 10,
        max_bet: 1000,
        rock_odds: 2.0,
        scissors_odds: 2.0,
        paper_odds: 2.0
      }
    }
  },
  computed: {
    choiceName() {
      const names = { rock: '石头', scissors: '剪刀', paper: '布' }
      return names[this.selectedChoice] || ''
    },
    displayHistory() {
      return this.showAllHistory ? this.history : this.history.slice(0, 1)
    },
    displayBets() {
      return this.showAllBets ? this.myBets.slice(0, 5) : this.myBets.slice(0, 1)
    },
    progressPercent() {
      if (!this.currentRound) return 0
      const total = 120 // 2分钟 = 120秒
      return Math.max(0, (this.countdown / total) * 100)
    }
  },
  onLoad() {
    // 获取状态栏高度
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 0
    
    this.userInfo = uni.getStorageSync('userInfo') || {}
    this.loadCurrentRound()
    this.loadHistory()
    this.loadMyBets()
    this.loadUserScore()
    // 每5秒刷新一次积分
    this.scoreTimer = setInterval(() => {
      this.loadUserScore()
    }, 5000)
  },
  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
    if (this.scoreTimer) {
      clearInterval(this.scoreTimer)
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    // 简化时间显示：刚刚 / x分钟前 / 今天 HH:MM / 昨天 HH:MM / 前天 HH:MM / MM-DD HH:MM
    // 兼容多种后端格式：MySQL "2026-07-19 15:30:00" / RFC3339 "2026-07-19T15:30:00+08:00"
    formatTime(timeStr) {
      if (!timeStr) return ''
      const str = String(timeStr)
      // 直接从字符串提取数字，避免 new Date() 在不同端解析差异
      const m = str.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})\D(\d{1,2}):(\d{1,2})/)
      if (!m) return str
      const y = parseInt(m[1])
      const mo = parseInt(m[2])
      const d = parseInt(m[3])
      const h = parseInt(m[4])
      const mi = parseInt(m[5])
      const pad = (n) => (n < 10 ? '0' + n : '' + n)
      const hh = pad(h)
      const mm = pad(mi)
      // 用本地时区构造时间戳计算差值
      const target = new Date(y, mo - 1, d, h, mi, 0).getTime()
      if (isNaN(target)) return str
      const now = Date.now()
      const diff = Math.floor((now - target) / 1000)
      if (diff < 60) return '刚刚'
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
      // 计算日期差（按本地日期 0 点为界）
      const today0 = new Date()
      today0.setHours(0, 0, 0, 0)
      const target0 = new Date(y, mo - 1, d)
      const dayDiff = Math.floor((today0.getTime() - target0.getTime()) / 86400000)
      if (dayDiff === 0) return '今天 ' + hh + ':' + mm
      if (dayDiff === 1) return '昨天 ' + hh + ':' + mm
      if (dayDiff === 2) return '前天 ' + hh + ':' + mm
      return mo + '-' + d + ' ' + hh + ':' + mm
    },
    async loadUserScore() {
      try {
        const res = await request('extensions/rps_game.php', {
          action: 'get_user_score',
          user_id: this.userInfo.id
        }, 'GET')
        if (res.code === 0) {
          this.userScore = res.data.score
          // 更新本地存储
          this.userInfo.score = this.userScore
          uni.setStorageSync('userInfo', this.userInfo)
        }
      } catch (e) {
      }
    },
    async loadMyBets() {
      if (!this.userInfo || !this.userInfo.id) return
      try {
        const res = await request('extensions/rps_game.php', {
          action: 'my_history',
          user_id: this.userInfo.id,
          limit: 10
        }, 'GET')
        if (res.code === 0) {
          this.myBets = res.data || []
          this.checkUserBet()
        }
      } catch (e) {
      }
    },
    async loadCurrentRound() {
      try {
        const res = await request('extensions/rps_game.php', { action: 'current_round' }, 'GET')
        if (res.code === 0) {
          this.currentRound = res.data.round
          this.players = res.data.players || []
          this.settings = res.data.settings
          
          // 检查用户是否已下注
          this.checkUserBet()
          
          // 启动倒计时
          this.startCountdown()
        }
      } catch (e) {
      }
    },
    checkUserBet() {
      if (!this.userInfo || !this.userInfo.id) return
      // 检查当前回合是否已下注
      if (this.currentRound) {
        const userBet = this.myBets.find(b => b.round_id === this.currentRound.id)
        if (userBet) {
          this.hasBet = true
          this.selectedChoice = userBet.choice
          this.betAmount = userBet.bet_amount
        }
      }
    },
    startCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer)
      }
      
      if (!this.currentRound) return
      
      const endTime = new Date(this.currentRound.end_time).getTime()
      
      this.countdownTimer = setInterval(() => {
        const now = Date.now()
        const diff = Math.floor((endTime - now) / 1000)
        
        if (diff <= 0) {
          this.countdown = 0
          clearInterval(this.countdownTimer)
        } else {
          this.countdown = diff
        }
      }, 1000)
      
      // 立即计算一次
      const now = Date.now()
      this.countdown = Math.max(0, Math.floor((endTime - now) / 1000))
    },
    async loadHistory() {
      try {
        const res = await request('extensions/rps_game.php', { action: 'history', limit: 5 }, 'GET')
        if (res.code === 0) {
          this.history = res.data || []
        }
      } catch (e) {
      }
    },
    selectChoice(choice) {
      if (this.hasBet || this.countdown <= 0) return
      this.selectedChoice = choice
    },
    setBet(amount) {
      this.betAmount = String(amount)
    },
    async placeBet() {
      if (!this.selectedChoice) {
        uni.showToast({ title: '请先选择手势', icon: 'none' })
        return
      }
      
      // 先获取最新积分
      try {
        const scoreRes = await request('extensions/rps_game.php', {
          action: 'get_user_score',
          user_id: this.userInfo.id
        }, 'GET')
        if (scoreRes.code === 0) {
          this.userScore = scoreRes.data.score
        }
      } catch (e) {
        // 获取积分失败
      }
      
      const amount = parseInt(this.betAmount)
      if (!amount || amount < this.settings.min_bet || amount > this.settings.max_bet) {
        uni.showToast({ title: `下注金额必须在 ${this.settings.min_bet}-${this.settings.max_bet} 之间`, icon: 'none' })
        return
      }
      
      if (amount > this.userScore) {
        uni.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      
      try {
        const res = await request('extensions/rps_game.php', {
          action: 'bet',
          user_id: this.userInfo.id,
          choice: this.selectedChoice,
          bet_amount: amount
        }, 'POST')
        
        if (res.code === 0) {
          uni.showToast({ title: '下注成功', icon: 'success' })
          this.hasBet = true
          this.userScore -= amount
          // 更新本地存储的积分
          this.userInfo.score = this.userScore
          uni.setStorageSync('userInfo', this.userInfo)
          // 刷新参与者列表
          this.loadCurrentRound()
        } else {
          uni.showToast({ title: res.msg || '下注失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '下注失败', icon: 'none' })
      }
    }
  }
}
</script>

<style>
.rps-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
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
  font-weight: bold;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}

.header-right {
  width: 120rpx;
  display: flex;
  justify-content: flex-end;
}

.score-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.25);
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
}

.score-icon {
  width: 24rpx;
  height: 24rpx;
}

.score-num {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.main-content {
  padding-bottom: 40rpx;
  min-height: 100vh;
  box-sizing: border-box;
}

.round-info {
  background: #fff;
  margin: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.round-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.round-no {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.countdown-label {
  font-size: 22rpx;
  color: #999;
}

.countdown-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #FF6B6B;
}

.countdown.urgent .countdown-num {
  color: #ff0000;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.progress-bar {
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF6B6B, #FF8E53);
  border-radius: 4rpx;
  transition: width 1s linear;
}

.game-area {
  background: #fff;
  margin: 0 24rpx 24rpx;
  padding: 40rpx 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.game-tip {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 40rpx;
}

.choices {
  display: flex;
  justify-content: space-around;
  margin-bottom: 40rpx;
}

.choice-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 24rpx;
  border-radius: 24rpx;
  background: #f8f8f8;
  border: 4rpx solid transparent;
  transition: all 0.3s;
}

.choice-item.selected {
  background: #fff5f5;
  border-color: #FF6B6B;
  transform: scale(1.05);
}

.choice-item.disabled {
  opacity: 0.5;
}

.choice-emoji {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 16rpx;
}

.choice-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.choice-odds {
  font-size: 24rpx;
  color: #FF6B6B;
  font-weight: 600;
}

.bet-area {
  border-top: 2rpx solid #f0f0f0;
  padding-top: 32rpx;
}

.bet-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.bet-input-wrap {
  background: #f8f8f8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
}

.bet-input {
  font-size: 32rpx;
  color: #333;
  width: 100%;
}

.bet-quick {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.quick-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  background: #f0f0f0;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #666;
  font-weight: 600;
}

.bet-action {
  display: flex;
  justify-content: center;
}

.bet-btn {
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  padding: 24rpx 80rpx;
  border-radius: 48rpx;
}

.bet-result {
  text-align: center;
  padding: 40rpx 0;
}

.result-text {
  display: block;
  font-size: 30rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.result-wait {
  display: block;
  font-size: 28rpx;
  color: #FF6B6B;
  font-weight: 600;
}

.players-section {
  background: #fff;
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
}

.section-count {
  font-size: 26rpx;
  color: #999;
}

.expand-btn {
  font-size: 26rpx;
  color: #FF6B6B;
  font-weight: 600;
  cursor: pointer;
}

.players-avatars {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.player-avatar-img {
  width: 72rpx;
  height: 72rpx;
  border-radius: 36rpx;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.player-more {
  width: 72rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
}

.history-section {
  background: #fff;
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  background: #f8f8f8;
  border-radius: 16rpx;
}

.history-round {
  font-size: 26rpx;
  color: #666;
  width: 180rpx;
}

.history-result {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.result-emoji {
  width: 40rpx;
  height: 40rpx;
}

.result-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.history-time {
  font-size: 24rpx;
  color: #999;
}

.user-score-footer {
  position: sticky;
  bottom: 0;
  background: #fff;
  border-top: 2rpx solid #f0f0f0;
  padding: 24rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.score-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
}

.score-label {
  font-size: 28rpx;
  color: #fff;
  opacity: 0.9;
}

.score-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
}

.my-bets-section {
  background: #fff;
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.my-bets-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.my-bet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 16rpx;
}

.my-bet-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.my-bet-round {
  font-size: 24rpx;
  color: #999;
}

.my-bet-choice {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.my-bet-choice .choice-emoji {
  width: 32rpx;
  height: 32rpx;
}

.my-bet-choice .choice-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.my-bet-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.my-bet-amount {
  font-size: 26rpx;
  font-weight: 600;
  color: #666;
}

.my-bet-result {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.my-bet-result.win {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: #fff;
}

.my-bet-result.lose {
  background: #f5f5f5;
  color: #999;
}

.my-bet-result:not(.win):not(.lose) {
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  color: #fff;
}

.empty-bets {
  text-align: center;
  padding: 60rpx 0;
}

.empty-bets .empty-text {
  font-size: 26rpx;
  color: #999;
}
</style>
