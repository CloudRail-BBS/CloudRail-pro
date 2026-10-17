<template>
  <view class="zjh-page" :class="themeClass">
    <!-- 顶部栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">返回</view>
        <text class="nav-title">炸金花</text>
        <view class="nav-right">
          <text class="my-score">{{ myScore }} 积分</text>
        </view>
      </view>
    </view>
    <view :style="{ height: statusBarHeight + 44 + 'px' }"></view>

    <!-- 牌桌 -->
    <view class="table-area">
      <!-- 底池 -->
      <view class="pot-box">
        <text class="pot-label">底池</text>
        <text class="pot-num">{{ pot }}</text>
        <text class="pot-unit">积分</text>
      </view>

      <!-- 两个机器人 -->
      <view class="ai-row">
        <view
          v-for="p in aiPlayers"
          :key="p.seat"
          class="ai-seat"
          :class="{ folded: p.folded, active: turn === p.seat && status === 1 }"
        >
          <image class="ai-avatar" :src="p.avatar" mode="aspectFill"></image>
          <text class="ai-name">{{ p.name }}</text>
          <view class="ai-cards">
            <view v-for="(c, i) in p.cards" :key="i" class="mini-card" :class="{ back: !p.seen || p.folded }">
              <text v-if="p.seen && !p.folded" class="mini-txt">{{ cardText(c) }}</text>
            </view>
          </view>
          <text class="ai-bet">{{ p.folded ? '已弃牌' : ('已下 ' + p.bet) }}</text>
        </view>
      </view>

      <!-- 轮次提示 -->
      <view class="turn-tip">
        <text v-if="status === 0">点「开始游戏」发牌开局</text>
        <text v-else-if="status === 2">{{ resultText }}</text>
        <text v-else>{{ turnName }} 行动中…</text>
      </view>

      <!-- 我的座位 -->
      <view class="me-seat" :class="{ active: turn === 0 && status === 1 }">
        <view class="me-head">
          <image class="me-avatar" :src="myAvatar" mode="aspectFill"></image>
          <view class="me-info">
            <text class="me-name">我</text>
            <text class="me-bet">本局已下 {{ myPlayer.bet || 0 }}</text>
          </view>
          <view class="me-cards">
            <view v-for="(c, i) in myCards" :key="i" class="big-card" :class="{ back: !mySeen }">
              <text v-if="mySeen" class="big-txt" :class="cardColor(c)">{{ cardText(c) }}</text>
            </view>
          </view>
        </view>
        <view class="hand-tip" v-if="mySeen && myCards.length === 3">
          <text>当前牌型：{{ myHandName }}</text>
        </view>
      </view>

      <!-- 日志 -->
      <scroll-view class="log-box" scroll-y :scroll-top="logScroll">
        <view v-for="(t, i) in logs" :key="i" class="log-line">
          <text>{{ t }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 操作栏 -->
    <view class="action-bar" :style="{ paddingBottom: safeBottom + 'px' }">
      <view v-if="status === 0" class="btn primary" @click="startGame">
        <text>开始游戏（底注 {{ baseScore }} 积分）</text>
      </view>

      <view v-else-if="status === 2" class="btn primary" @click="startGame">
        <text>再来一局</text>
      </view>

      <template v-else>
        <view class="btn ghost" :class="{ disabled: !canAct }" @click="act('see')">
          <text>{{ mySeen ? '已看牌' : '看牌' }}</text>
        </view>
        <view class="btn" :class="{ disabled: !canAct }" @click="act('call')">
          <text>跟注 {{ callCost }}</text>
        </view>
        <view class="btn" :class="{ disabled: !canAct }" @click="act('raise')">
          <text>加注 +{{ baseScore }}</text>
        </view>
        <view class="btn danger" :class="{ disabled: !canAct }" @click="act('fold')">
          <text>弃牌</text>
        </view>
      </template>
    </view>

    <!-- 结算弹窗 -->
    <view v-if="showResult" class="mask" @click="closeResult">
      <view class="result-box" @click.stop>
        <text class="result-title">{{ result.win > 0 ? '这局赢了' : (result.win < 0 ? '这局输了' : '平局') }}</text>
        <text class="result-num" :class="result.win > 0 ? 'up' : (result.win < 0 ? 'down' : '')">
          {{ result.win > 0 ? '+' : '' }}{{ result.win }}
        </text>
        <text class="result-detail">{{ resultText }}</text>
        <view class="btn primary" @click="closeResult"><text>知道了</text></view>
      </view>
    </view>
  </view>
</template>

<script>
/* ============================================================
   炸金花（单机版）
   游戏逻辑全部在本页完成，对手是 2 个 AI 机器人。
   后端只做一件事：把每一局的输赢记账（扣/加积分 + 存战绩）。
   ============================================================ */
import { request } from '../../../common/request.js'

const SUITS = ['♠', '♥', '♣', '♦']
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const LEVEL_NAMES = ['单张', '对子', '顺子', '金花', '同花顺', '豹子']
const MAX_ROUND = 5

export default {
  data() {
    return {
      statusBarHeight: 20,
      safeBottom: 0,
      baseScore: 10,
      status: 0,          // 0 未开始 / 1 进行中 / 2 已结束
      pot: 0,
      round: 1,
      roundBet: 10,       // 当前跟注额
      turn: 0,
      players: [],
      logs: [],
      logScroll: 0,
      mySeen: false,
      showResult: false,
      result: { win: 0, text: '' },
      resultText: '',
      myScore: 0,
      myAvatar: '/static/user/default.png'
    }
  },
  computed: {
    aiPlayers() {
      return this.players.filter(p => !p.isMe)
    },
    myPlayer() {
      return this.players.find(p => p.isMe) || {}
    },
    myCards() {
      return this.myPlayer.cards || []
    },
    myHandName() {
      if (this.myCards.length !== 3) return ''
      return LEVEL_NAMES[this.handKey(this.myCards)[0]]
    },
    canAct() {
      return this.status === 1 && this.turn === 0 && !this.myPlayer.folded
    },
    callCost() {
      const my = this.myPlayer
      if (!my) return this.roundBet
      return Math.max(0, this.roundBet - (my.bet || 0))
    },
    turnName() {
      const p = this.players[this.turn]
      if (!p) return ''
      return p.isMe ? '我' : p.name
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
    const u = uni.getStorageSync('userInfo') || {}
    this.myAvatar = u.avatar || '/static/user/default.png'
    this.myScore = Number(u.points || 0) || 0
    this.resetTable()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },

    /* ---------------- 牌与牌型 ---------------- */
    buildDeck() {
      const deck = []
      for (let s = 0; s < 4; s++) {
        for (let v = 1; v <= 13; v++) deck.push({ v, s })
      }
      // 洗牌
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = deck[i]; deck[i] = deck[j]; deck[j] = t
      }
      return deck
    },
    cardText(c) {
      if (!c) return ''
      return SUITS[c.s] + VALUES[c.v - 1]
    },
    cardColor(c) {
      if (!c) return ''
      return (c.s === 1 || c.s === 3) ? 'red' : 'black'
    },
    /* 牌型判定：返回 [等级, 比较码1, 比较码2, 比较码3]，按数组字典序比大小 */
    handKey(cards) {
      const vs = cards.map(c => c.v).sort((a, b) => a - b)
      const flush = cards[0].s === cards[1].s && cards[1].s === cards[2].s
      const triple = vs[0] === vs[1] && vs[1] === vs[2]
      let straight = (vs[1] === vs[0] + 1 && vs[2] === vs[1] + 1)
      // A23 / QKA 特例
      if (vs[0] === 1 && vs[1] === 2 && vs[2] === 3) straight = true
      if (vs[0] === 1 && vs[1] === 12 && vs[2] === 13) straight = true

      let level = 0
      if (triple) level = 5
      else if (flush && straight) level = 4
      else if (flush) level = 3
      else if (straight) level = 2
      else if (vs[0] === vs[1] || vs[1] === vs[2]) level = 1

      let key = vs.slice().reverse()   // 默认降序
      if (level === 5) key = [vs[2]]
      else if (level === 2 || level === 4) {
        // 顺子按最大牌，A23 视为 3 最大
        key = (vs[0] === 1 && vs[1] === 2) ? [3] : [vs[2]]
      } else if (level === 1) {
        const pair = (vs[0] === vs[1]) ? vs[0] : vs[1]
        const single = (vs[0] === vs[1]) ? vs[2] : vs[0]
        key = [pair, single]
      }
      return [level].concat(key)
    },
    compareHands(a, b) {
      const ka = this.handKey(a)
      const kb = this.handKey(b)
      const len = Math.max(ka.length, kb.length)
      for (let i = 0; i < len; i++) {
        const x = ka[i] || 0
        const y = kb[i] || 0
        if (x !== y) return x > y ? 1 : -1
      }
      return 0
    },

    /* ---------------- 开局 ---------------- */
    resetTable() {
      this.status = 0
      this.pot = 0
      this.round = 1
      this.roundBet = this.baseScore
      this.turn = 0
      this.logs = []
      this.mySeen = false
      this.showResult = false
      this.resultText = ''
      this.players = [
        { seat: 0, isMe: true, isAI: false, name: '我', avatar: this.myAvatar, cards: [], seen: true, bet: 0, folded: false, alive: true },
        { seat: 1, isMe: false, isAI: true, name: '机器人·小明', avatar: '/static/logo.png', cards: [], seen: false, bet: 0, folded: false, alive: true },
        { seat: 2, isMe: false, isAI: true, name: '机器人·小红', avatar: '/static/logo.png', cards: [], seen: false, bet: 0, folded: false, alive: true }
      ]
    },
    startGame() {
      if (this.myScore < this.baseScore) {
        uni.showToast({ title: '积分不足，至少需要 ' + this.baseScore, icon: 'none' })
        return
      }
      this.resetTable()
      const deck = this.buildDeck()
      this.players.forEach((p, i) => {
        p.cards = [deck[i * 3], deck[i * 3 + 1], deck[i * 3 + 2]]
        p.seen = p.isMe
        p.bet = this.baseScore
        p.folded = false
        p.alive = true
      })
      this.pot = this.baseScore * 3
      this.roundBet = this.baseScore
      this.status = 1
      this.round = 1
      this.turn = 0
      this.mySeen = true
      this.pushLog('开局！每人下底注 ' + this.baseScore + '，底池 ' + this.pot)
      this.pushLog('请操作：看牌 / 跟注 / 加注 / 弃牌')
    },
    pushLog(t) {
      this.logs.push(t)
      this.$nextTick(() => { this.logScroll = 999999 })
    },

    /* ---------------- 行动 ---------------- */
    act(type) {
      if (!this.canAct) return
      const me = this.myPlayer
      if (type === 'see') {
        if (this.mySeen) return
        this.mySeen = true
        this.pushLog('我看牌了：' + this.myHandName)
        return
      }
      if (type === 'fold') {
        me.folded = true
        me.alive = false
        this.pushLog('我弃牌了')
        this.nextTurn()
        return
      }
      if (type === 'call') {
        const cost = this.callCost
        if (cost > 0) {
          if (this.myScore < cost) return uni.showToast({ title: '积分不足', icon: 'none' })
          me.bet += cost
          this.pot += cost
        }
        this.pushLog('我跟注 ' + cost)
        this.nextTurn()
        return
      }
      if (type === 'raise') {
        const cost = this.callCost + this.baseScore
        if (this.myScore < cost) return uni.showToast({ title: '积分不足', icon: 'none' })
        me.bet += cost
        this.pot += cost
        this.roundBet += this.baseScore
        this.pushLog('我加注，当前跟注额 ' + this.roundBet)
        this.nextTurn()
        return
      }
    },

    /* 轮到下一位；处理 AI 与结算 */
    nextTurn() {
      const alive = this.players.filter(p => p.alive)
      if (alive.length <= 1) {
        this.settle(alive)
        return
      }
      let next = this.turn
      for (let i = 0; i < this.players.length; i++) {
        next = (next + 1) % this.players.length
        if (this.players[next].alive) break
      }
      // 所有人都行动过一轮 → 轮次 +1
      if (next <= this.turn) {
        this.round++
        if (this.round > MAX_ROUND) {
          this.settle(alive)
          return
        }
        this.pushLog('—— 第 ' + this.round + ' 轮 ——')
      }
      this.turn = next
      const p = this.players[next]
      if (p && p.isAI) {
        setTimeout(() => this.aiAct(next), 900)
      }
    },

    /* AI 决策（看牌后按牌力决定） */
    aiAct(seat) {
      if (this.status !== 1) return
      const p = this.players[seat]
      if (!p || !p.alive) return
      if (!p.seen) {
        // 未看牌：多半跟注，偶尔看牌
        if (Math.random() < 0.3) {
          p.seen = true
          this.pushLog(p.name + ' 看牌了')
          setTimeout(() => this.aiAct(seat), 600)
          return
        }
      }
      const key = this.handKey(p.cards)
      const level = key[0]
      const cost = Math.max(0, this.roundBet - p.bet)
      // 牌力评估
      if (level >= 3) {
        // 金花以上：加注
        const add = cost + this.baseScore
        p.bet += add
        this.pot += add
        this.roundBet += this.baseScore
        this.pushLog(p.name + ' 加注，跟注额 ' + this.roundBet)
      } else if (level === 2 || (level === 1 && key[1] >= 8)) {
        // 顺子 / 大对子：跟注
        p.bet += cost
        this.pot += cost
        this.pushLog(p.name + ' 跟注 ' + cost)
      } else {
        // 小牌：有一定概率弃牌
        if (Math.random() < 0.45) {
          p.folded = true
          p.alive = false
          this.pushLog(p.name + ' 弃牌')
        } else {
          p.bet += cost
          this.pot += cost
          this.pushLog(p.name + ' 跟注 ' + cost)
        }
      }
      this.nextTurn()
    },

    /* ---------------- 结算 ---------------- */
    settle(alive) {
      this.status = 2
      const me = this.myPlayer
      let winner
      if (alive.length === 1) {
        winner = alive[0]
      } else {
        winner = alive[0]
        for (let i = 1; i < alive.length; i++) {
          if (this.compareHands(alive[i].cards, winner.cards) > 0) winner = alive[i]
        }
      }
      const myBet = me.bet || 0
      const win = (winner.isMe ? (this.pot - myBet) : -myBet)
      this.result = { win, text: '' }

      const winName = winner.isMe ? '我' : winner.name
      let detail = ''
      if (alive.length > 1) {
        detail = winName + ' 以「' + LEVEL_NAMES[this.handKey(winner.cards)[0]] + '」胜出'
      } else {
        detail = winName + ' 因其他人弃牌胜出'
      }
      this.resultText = detail + '，本局' + (win > 0 ? '赢 ' + win : (win < 0 ? '输 ' + (-win) : '平')) + ' 积分'
      this.pushLog('本局结束：' + detail)
      this.showResult = true

      this.recordSettle(myBet, win, winner.isMe ? 'win' : 'lose', detail)
    },
    closeResult() {
      this.showResult = false
      this.status = 0
      this.pot = 0
    },
    /* 把本局结果交给后端记账（后端只改积分 + 存记录；失败也不影响玩） */
    async recordSettle(bet, win, result, detail) {
      try {
        const res = await request('zjh.php', {
          action: 'settle',
          bet: bet,
          win: win,
          result: result,
          detail: detail
        }, 'POST')
        if (res && res.code === 0 && res.data && typeof res.data.points !== 'undefined') {
          this.myScore = Number(res.data.points) || this.myScore
          const u = uni.getStorageSync('userInfo') || {}
          u.points = this.myScore
          u.score = this.myScore
          u.jifen = this.myScore
          uni.setStorageSync('userInfo', u)
        }
      } catch (e) {
        /* 记账失败不打断游戏体验 */
      }
    }
  }
}
</script>

<style scoped>
.zjh-page {
  min-height: 100vh;
  background: radial-gradient(120% 80% at 50% 0%, #1f5d3a 0%, #0d3a24 55%, #062316 100%);
}

/* 顶栏 */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 99; background: rgba(6, 35, 22, 0.92); }
.nav-bar { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 26rpx; }
.nav-back { width: 120rpx; font-size: 28rpx; color: #bff0d4; }
.nav-title { font-size: 32rpx; font-weight: 700; color: #fff; letter-spacing: 2rpx; }
.nav-right { width: 200rpx; text-align: right; }
.my-score { font-size: 24rpx; color: #ffd77a; font-weight: 600; }

.table-area { padding: 24rpx 26rpx 260rpx; }

/* 底池 */
.pot-box { display: flex; align-items: baseline; justify-content: center; gap: 8rpx; margin-bottom: 24rpx; }
.pot-label { font-size: 24rpx; color: rgba(255,255,255,0.6); }
.pot-num { font-size: 46rpx; font-weight: 800; color: #ffd77a; }
.pot-unit { font-size: 22rpx; color: rgba(255,255,255,0.6); }

/* AI 座位 */
.ai-row { display: flex; justify-content: space-between; gap: 20rpx; }
.ai-seat {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  padding: 20rpx 12rpx; border-radius: 24rpx;
  background: rgba(255,255,255,0.06);
  border: 1rpx solid rgba(255,255,255,0.08);
  transition: all 0.2s ease;
}
.ai-seat.active { border-color: #ffd77a; box-shadow: 0 0 0 2rpx rgba(255,215,122,0.35); }
.ai-seat.folded { opacity: 0.4; }
.ai-avatar { width: 84rpx; height: 84rpx; border-radius: 50%; background: rgba(255,255,255,0.1); }
.ai-name { font-size: 22rpx; color: rgba(255,255,255,0.85); }
.ai-cards { display: flex; gap: 6rpx; }
.mini-card {
  width: 44rpx; height: 62rpx; border-radius: 8rpx;
  background: var(--cr-surface); display: flex; align-items: center; justify-content: center;
}
.mini-card.back { background: linear-gradient(135deg, #2b6fd6, #17407f); }
.mini-txt { font-size: 18rpx; color: #111; font-weight: 700; }
.ai-bet { font-size: 20rpx; color: rgba(255,255,255,0.55); }

/* 轮次提示 */
.turn-tip { margin: 26rpx 0; text-align: center; }
.turn-tip text { font-size: 26rpx; color: #bff0d4; }

/* 我的座位 */
.me-seat {
  padding: 20rpx 22rpx; border-radius: 24rpx;
  background: rgba(255,255,255,0.1);
  border: 1rpx solid rgba(255,255,255,0.14);
  transition: all 0.2s ease;
}
.me-seat.active { border-color: #ffd77a; box-shadow: 0 0 0 2rpx rgba(255,215,122,0.35); }
.me-head { display: flex; align-items: center; gap: 18rpx; }
.me-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: rgba(255,255,255,0.1); }
.me-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.me-name { font-size: 28rpx; color: #fff; font-weight: 700; }
.me-bet { font-size: 22rpx; color: rgba(255,255,255,0.6); }
.me-cards { display: flex; gap: 10rpx; }
.big-card {
  width: 76rpx; height: 108rpx; border-radius: 10rpx;
  background: var(--cr-surface); display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.3);
}
.big-card.back { background: linear-gradient(135deg, #2b6fd6, #17407f); }
.big-txt { font-size: 30rpx; font-weight: 800; }
.big-txt.red { color: #e63b3b; }
.big-txt.black { color: #1a1a1a; }
.hand-tip { margin-top: 16rpx; }
.hand-tip text { font-size: 24rpx; color: #ffd77a; }

/* 日志 */
.log-box { height: 180rpx; margin-top: 22rpx; padding: 16rpx 20rpx; border-radius: 20rpx; background: rgba(0,0,0,0.25); }
.log-line { padding: 4rpx 0; }
.log-line text { font-size: 22rpx; color: rgba(255,255,255,0.68); line-height: 1.6; }

/* 操作栏 */
.action-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 99;
  display: flex; gap: 16rpx; padding: 20rpx 26rpx;
  background: rgba(6, 35, 22, 0.96);
  border-top: 1rpx solid rgba(255,255,255,0.08);
}
.btn {
  flex: 1; height: 88rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.14);
}
.btn text { font-size: 27rpx; color: #fff; font-weight: 600; }
.btn.primary { background: linear-gradient(135deg, #ff3b5c, #ff6a3d); }
.btn.ghost { background: rgba(255,255,255,0.1); }
.btn.danger { background: rgba(230,59,59,0.85); }
.btn.disabled { opacity: 0.45; }

/* 结算弹窗 */
.mask { position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
.result-box {
  width: 560rpx; padding: 48rpx 40rpx; border-radius: 32rpx;
  background: var(--cr-surface); display: flex; flex-direction: column; align-items: center; gap: 18rpx;
}
.result-title { font-size: 32rpx; color: var(--cr-text); font-weight: 700; }
.result-num { font-size: 64rpx; font-weight: 800; color: var(--cr-text-muted); }
.result-num.up { color: #ff3b5c; }
.result-num.down { color: #4a90e2; }
.result-detail { font-size: 24rpx; color: var(--cr-text-muted); text-align: center; line-height: 1.6; }
</style>
