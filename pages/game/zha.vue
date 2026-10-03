<template>
  <view class="tb">
    <view class="tb-bg"></view>

    <!-- 顶栏 -->
    <view class="tb-top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tb-top-bar">
        <view class="tb-exit" @click="onExit">退出</view>
        <view class="tb-top-mid">
          <text class="tb-room">{{ cfg.room_name }}</text>
          <text class="tb-sub">{{ cfg.match_mode === 'real' ? '真人对局' : 'AI 对局' }} · 入门费 {{ cfg.entry }} 积分 · 底分 {{ cfg.base_score }}</text>
        </view>
        <view class="tb-pts">{{ points }}</view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="tb-table" v-if="ready">
      <!-- AI 座位 -->
      <view class="tb-ai-row">
        <view v-for="p in aiSeats" :key="p.seat" class="tb-seat" :class="{ active: turn === p.seat && isPlaying, folded: p.folded }">
          <image v-if="p.avatar" class="tb-av" :src="p.avatar" mode="aspectFill"></image>
          <view v-else class="tb-av tb-av-ai">AI</view>
          <text class="tb-name">{{ p.name }}</text>
          <view class="tb-cards">
            <view v-for="(c, i) in p.hand" :key="i" class="pc sm" :class="{ back: !(p.seen || p.reveal) || p.folded }">
              <block v-if="p.seen || p.reveal">
                <text class="pc-lb" :class="{ red: isRed(c) }">{{ rankText(c.rank) }}{{ suitSym(c.suit) }}</text>
              </block>
            </view>
          </view>
          <text class="tb-status">{{ p.folded ? '已弃牌' : ((p.seen ? '看牌' : '闷牌') + ' · ' + p.stack + ' 筹码') }}</text>
        </view>
      </view>

      <!-- 中央奖池 -->
      <view class="tb-center">
        <text class="tb-pot-label">奖池</text>
        <text class="tb-pot">{{ pot }}</text>
        <text class="tb-cmsg">{{ cmsg }}</text>
      </view>

      <!-- 我的座位 -->
      <view class="tb-me" :class="{ active: turn === 0 && isPlaying }">
        <image v-if="myAvatar" class="tb-av big" :src="myAvatar" mode="aspectFill"></image>
        <view v-else class="tb-av big tb-av-ph">我</view>
        <view class="tb-me-info">
          <text class="tb-name">我</text>
          <text class="tb-status">{{ me.folded ? '已弃牌' : ((me.seen ? '看牌' : '闷牌') + ' · ' + me.stack + ' 筹码 · 已下 ' + me.bet) }}</text>
        </view>
        <view class="tb-cards">
          <view v-for="(c, i) in me.hand" :key="i" class="pc" :class="{ back: !me.seen }">
            <block v-if="me.seen">
              <text class="pc-lb" :class="{ red: isRed(c) }">{{ rankText(c.rank) }}{{ suitSym(c.suit) }}</text>
              <text class="pc-ctr" :class="{ red: isRed(c) }">{{ suitSym(c.suit) }}</text>
            </block>
          </view>
        </view>
      </view>

      <view v-if="me.seen && me.hand.length === 3" class="tb-hand-tip">当前牌型：{{ catName(handCat) }}</view>

      <scroll-view class="tb-log" scroll-y :scroll-top="logScroll">
        <view v-for="(t, i) in logs" :key="i" class="tb-log-line"><text>{{ t }}</text></view>
      </scroll-view>
    </view>

    <view v-else class="tb-loading"><text>正在进入牌桌…</text></view>

    <!-- 操作栏 -->
    <view class="tb-ctrl" :style="{ paddingBottom: safeBottom + 'px' }">
      <block v-if="isPlaying && turn === 0 && !me.folded">
        <view v-if="!me.seen" class="tbtn ghost" @click="choose('see')">看牌</view>
        <view class="tbtn" @click="choose('call')">闷跟 {{ unit }}</view>
        <view class="tbtn ghost" :class="{ dis: raiseMaxed }" @click="choose('raise')">{{ raiseMaxed ? '注码封顶' : '加注' }}</view>
        <view class="tbtn danger" @click="choose('fold')">弃牌</view>
      </block>
      <block v-else-if="isPlaying && me.seen && turn === 0">
        <view class="tbtn" @click="choose('call')">跟注 {{ unit * 2 }}</view>
        <view class="tbtn ghost" :class="{ dis: raiseMaxed }" @click="choose('raise')">{{ raiseMaxed ? '注码封顶' : '加注' }}</view>
        <view class="tbtn ghost" :class="{ dis: !canCompare }" @click="openCompare">比牌 {{ unit * 2 }}</view>
        <view class="tbtn danger" @click="choose('fold')">弃牌</view>
      </block>
      <view v-else-if="isPlaying" class="tb-wait">等待其他玩家行动…</view>
      <view v-else class="tb-wait">{{ finished ? '本局已结束' : '准备中…' }}</view>
    </view>

    <!-- 比牌选择 -->
    <view v-if="showCompare" class="tb-mask" @click="showCompare = false">
      <view class="tb-sheet" @click.stop>
        <text class="tb-sheet-t">选择比牌对手（支付 {{ unit * 2 }} 筹码）</text>
        <view v-for="p in compareTargets" :key="p.seat" class="tb-cmp" @click="doCompareChoose(p.seat)">{{ p.name }}</view>
        <view class="tbtn ghost" @click="showCompare = false">取消</view>
      </view>
    </view>

    <!-- 结算 -->
    <view v-if="showResult" class="tb-mask">
      <view class="tb-sheet" @click.stop>
        <text class="tb-res-emoji">{{ result.win ? '🏆' : '💔' }}</text>
        <text class="tb-res-title">{{ result.win ? '恭喜获胜！' : '本局未获胜' }}</text>
        <text class="tb-res-sub">{{ result.sub }}</text>
        <text class="tb-res-num" :class="{ up: result.win, down: !result.win }">{{ result.win ? '+' : '-' }}{{ result.win ? result.payout : (result.entry + result.penalty) }}</text>
        <text class="tb-res-tip">{{ result.tip }}</text>
        <view class="tb-res-btns">
          <view class="tbtn ghost" @click="goHall">返回大厅</view>
          <view class="tbtn" @click="again">再来一局</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'

const MAX_ACTIONS = 36
const MAX_RAISES = 6
const AI_ONLY_LIMIT = 4
const CAT_NAME = { 0: '特殊235', 1: '散牌', 2: '对子', 3: '顺子', 4: '金花', 5: '顺金', 6: '豹子' }
const SUITS = ['S', 'H', 'C', 'D']
const SYM = { S: '♠', H: '♥', C: '♣', D: '♦' }
const AGGRO = [0, 0.12, -0.05]

export default {
  name: 'GameZha',
  data() {
    return {
      statusBarHeight: 20,
      safeBottom: 0,
      ready: false,
      cfg: { session_id: 0, room_id: 0, room_name: '', entry: 0, base_score: 1, match_mode: 'ai', player_count: 3, seats: [] },
      points: 0,
      myAvatar: '',
      players: [],
      unit: 1,
      pot: 0,
      turn: 0,
      cmsg: '',
      logs: [],
      logScroll: 0,
      actionCount: 0,
      raiseCount: 0,
      aiOnlyActions: 0,
      actedSet: {},
      busy: false,
      waitResolve: null,
      isPlaying: false,
      finished: false,
      done: false,
      showCompare: false,
      showResult: false,
      result: { win: false, sub: '', tip: '', payout: 0, penalty: 0, entry: 0 },
      replayActions: [],
      replayHands: {},
      replayStart: 0,
      base: 1
    }
  },
  computed: {
    me() { return this.players[0] || { hand: [], seen: false, folded: false, stack: 0, bet: 0 } },
    aiSeats() {
      const n = Number(this.cfg.player_count) === 2 ? 1 : 2
      return this.players.slice(1, 1 + n)
    },
    handCat() {
      if (this.me.hand.length !== 3) return 1
      return this.evalHand(this.me.hand).cat
    },
    raiseMaxed() { return this.raiseCount >= MAX_RAISES },
    canCompare() {
      const alive = this.activePlayers()
      return alive.length >= 2 && alive.every(p => this.actedSet[p.seat])
    },
    compareTargets() {
      return this.activePlayers().filter(p => p.seat !== 0)
    }
  },
  onLoad(q) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
    this.loadSession(q)
  },
  onUnload() {
    if (!this.done && this.cfg.session_id) {
      try { request('game_center.php', { action: 'abandon', session_id: this.cfg.session_id }, 'POST') } catch (e) {}
    }
  },
  methods: {
    /* ---------------- 会话 ---------------- */
    async loadSession(q) {
      const sid = Number((q && q.session) || 0)
      if (!sid) { uni.showToast({ title: '对局参数错误', icon: 'none' }); this.goHall(); return }
      try {
        const res = await request('game_center.php', { action: 'session_info', session_id: sid }, 'GET')
        if (!(res && res.code === 0 && res.data)) {
          uni.showToast({ title: (res && res.msg) || '对局不存在', icon: 'none' })
          this.goHall(); return
        }
        const d = res.data
        this.cfg = d
        this.points = Number(d.points || 0)
        this.myAvatar = d.my_avatar || ''
        this.base = Math.max(1, Number(d.base_score || 1))
        this.ready = true
        this.$nextTick(() => this.deal())
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '进入牌桌失败', icon: 'none' })
        this.goHall()
      }
    },

    /* ---------------- 牌 ---------------- */
    make(suit, rank) { return { suit: suit, rank: rank } },
    deck() {
      const a = []
      SUITS.forEach(s => { for (let r = 2; r <= 14; r++) a.push(this.make(s, r)) })
      return a
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t
      }
      return arr
    },
    isRed(c) { return c.suit === 'H' || c.suit === 'D' },
    suitSym(s) { return SYM[s] || '' },
    rankText(r) { return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] || String(r)) },
    catName(c) { return CAT_NAME[c] || '' },
    sleep(ms) { return new Promise(r => setTimeout(r, ms)) },

    /* ---------------- 牌型 ---------------- */
    evalHand(cards) {
      const ranks = cards.map(c => c.rank).sort((a, b) => b - a)
      const suits = cards.map(c => c.suit)
      const flush = suits[0] === suits[1] && suits[1] === suits[2]
      const set = {}
      ranks.forEach(r => { set[r] = (set[r] || 0) + 1 })
      const counts = Object.values(set).sort((a, b) => b - a)
      if (ranks.length === 3 && set[2] && set[3] && set[5] && !flush) return { cat: 0, key: [5, 3, 2], special: true }
      if (counts[0] === 3) return { cat: 6, key: [ranks[0]] }
      let straightHigh = 0
      if (set[14] && set[3] && set[2]) straightHigh = 3
      else if (ranks[0] - 1 === ranks[1] && ranks[1] - 1 === ranks[2]) straightHigh = ranks[0]
      if (straightHigh && flush) return { cat: 5, key: [straightHigh] }
      if (flush) return { cat: 4, key: ranks }
      if (straightHigh) return { cat: 3, key: [straightHigh] }
      if (counts[0] === 2) {
        const pair = ranks.find(r => set[r] === 2)
        const kick = ranks.find(r => set[r] === 1)
        return { cat: 2, key: [pair, kick] }
      }
      return { cat: 1, key: ranks }
    },
    cmpEval(a, b) {
      if (a.special && b.cat === 6) return 1
      if (b.special && a.cat === 6) return -1
      if (a.cat !== b.cat) return a.cat > b.cat ? 1 : -1
      const len = Math.max(a.key.length, b.key.length)
      for (let i = 0; i < len; i++) {
        const x = a.key[i] || 0, y = b.key[i] || 0
        if (x !== y) return x > y ? 1 : -1
      }
      return 0
    },
    handStrength(ev) {
      const t = k => Math.max(0, Math.min(1, (k - 2) / 12))
      switch (ev.cat) {
        case 6: return 0.95 + t(ev.key[0] || 2) * 0.05
        case 5: return 0.86 + t(ev.key[0] || 2) * 0.09
        case 4: return 0.64 + (t(ev.key[0] || 2) * .55 + t(ev.key[1] || 2) * .30 + t(ev.key[2] || 2) * .15) * 0.21
        case 3: return 0.52 + t(ev.key[0] || 2) * 0.11
        case 2: return 0.28 + t(ev.key[0] || 2) * 0.20 + t(ev.key[1] || 2) * 0.05
        case 1: return 0.04 + (t(ev.key[0] || 2) * .60 + t(ev.key[1] || 2) * .28 + t(ev.key[2] || 2) * .12) * 0.22
        default: return 0.02
      }
    },

    /* ---------------- 开局 ---------------- */
    seatProfiles() {
      const isReal = this.cfg.match_mode === 'real'
      const raw = Array.isArray(this.cfg.seats) ? this.cfg.seats : []
      const aiNames = ['', '官方AI·板栗', '官方AI·板栗']
      const out = []
      for (let i = 0; i < 3; i++) {
        if (i === 0) {
          out.push({ seat: 0, name: '我', avatar: this.myAvatar, tag: isReal ? '真人' : '玩家', isAi: false })
        } else {
          const s = raw[i]
          if (isReal && s && !Number(s.is_ai)) out.push({ seat: i, name: s.name || ('玩家' + i), avatar: s.avatar || '', tag: '真人', isAi: false })
          else if (isReal && s && Number(s.is_ai)) out.push({ seat: i, name: s.name || aiNames[i], avatar: '', tag: 'AI补位', isAi: true })
          else out.push({ seat: i, name: aiNames[i], avatar: '', tag: 'AI', isAi: true })
        }
      }
      return out
    },

    async deal() {
      const profile = this.seatProfiles()
      const playerCount = Number(this.cfg.player_count) === 2 ? 2 : 3
      const deck = this.shuffle(this.deck())
      const START = this.base * 60
      const players = [0, 1, 2].map(i => ({
        seat: i, name: profile[i].name, avatar: profile[i].avatar, isAi: profile[i].isAi,
        hand: [], seen: false, folded: false, reveal: false, stack: START, bet: 0, turns: 0
      }))
      if (playerCount === 2) players[2].folded = true
      for (let k = 0; k < 3; k++) players.forEach(p => { p.hand.push(deck.pop()) })
      players.forEach(p => { if (!p.folded) { this.pay(p, this.base) } })

      this.players = players
      this.unit = this.base
      this.pot = 0
      this.actionCount = 0
      this.actedSet = {}
      this.turn = 0
      this.raiseCount = 0
      this.aiOnlyActions = 0
      this.busy = false
      this.waitResolve = null
      this.isPlaying = true
      this.finished = false
      this.done = false
      this.showResult = false
      this.logs = []
      this.pot = players.reduce((a, p) => a + p.bet, 0)
      this.cmsg = '底注 ' + this.base + '，闷一注 ' + this.unit + '，看牌跟注 ' + (this.unit * 2)
      this.replayStart = Date.now()
      this.replayActions = []
      this.replayHands = { 0: players[0].hand.map(c => c.suit + c.rank), 1: players[1].hand.map(c => c.suit + c.rank), 2: players[2].hand.map(c => c.suit + c.rank) }
      this.log('开局，底注 ' + this.base)
      await this.sleep(700)
      this.loop()
    },

    pay(p, amount) {
      amount = Math.min(amount, p.stack)
      p.stack -= amount
      p.bet += amount
      this.pot += amount
      return amount
    },
    costOf(p) { return p.seen ? this.unit * 2 : this.unit },
    activePlayers() { return this.players.filter(p => !p.folded) },
    log(t) {
      this.logs.push(t)
      if (this.logs.length > 40) this.logs.shift()
      this.$nextTick(() => { this.logScroll = 999999 })
    },
    rec(a, data) {
      const o = Object.assign({ t: Date.now() - this.replayStart, a: 'zha_' + a }, data || {})
      this.replayActions.push(o)
    },

    /* ---------------- 主循环 ---------------- */
    async loop() {
      while (this.activePlayers().length > 1 && this.actionCount < MAX_ACTIONS) {
        const p = this.players[this.turn % 3]
        if (p.folded) { this.turn++; continue }
        if (p.seat === 0) {
          this.cmsg = '轮到你操作'
          const act = await this.waitUser()
          if (this.done) return
          await this.handleUser(act)
        } else {
          const userGone = this.players[0].folded
          this.cmsg = userGone ? 'AI 快速结算中…' : (p.name + ' 思考中…')
          await this.sleep(userGone ? 420 : 850)
          this.aiAction(p)
        }
        this.actedSet = Object.assign({}, this.actedSet, { [p.seat]: true })
        this.actionCount++
        if (this.activePlayers().length === 1) break
        if (this.players[0].folded && this.activePlayers().length > 1) {
          this.aiOnlyActions++
          if (this.aiOnlyActions >= AI_ONLY_LIMIT) { this.cmsg = '剩余玩家摊牌比牌'; break }
        }
        do { this.turn++ } while (this.players[this.turn % 3].folded)
      }
      this.finish()
    },

    waitUser() {
      this.busy = false
      return new Promise(res => { this.waitResolve = res })
    },
    choose(act) {
      if (this.busy || this.waitResolve === null) return
      this.busy = true
      const r = this.waitResolve
      this.waitResolve = null
      r({ act: act })
    },
    openCompare() {
      if (!this.canCompare) { uni.showToast({ title: '所有在场玩家都行动过一轮后才能比牌', icon: 'none' }); return }
      this.showCompare = true
    },
    async doCompareChoose(seat) {
      this.showCompare = false
      if (this.busy || this.waitResolve === null) return
      this.busy = true
      const r = this.waitResolve
      this.waitResolve = null
      r({ act: 'compare', target: seat })
    },

    async handleUser(act) {
      const p = this.players[0]
      if (act.act === 'see') {
        p.seen = true
        this.log('你选择看牌')
        this.rec('see', { seat: 0 })
        this.cmsg = '看牌后跟注需双倍'
        await this.sleep(300)
        const again = await new Promise(res => { this.waitResolve = res; this.busy = false })
        await this.handleUser(again)
        return
      }
      if (act.act === 'fold') return this.doFold(p)
      if (act.act === 'raise') {
        if (this.raiseCount >= MAX_RAISES) {
          uni.showToast({ title: '本局加注次数已达上限', icon: 'none' })
          const again = await new Promise(res => { this.waitResolve = res; this.busy = false })
          await this.handleUser(again)
          return
        }
        this.raiseCount++
        this.unit += this.base
        const amt = this.pay(p, this.costOf(p))
        this.log('你加注到 ' + this.costOf(p))
        this.rec('raise', { seat: 0, paid: amt })
        await this.sleep(380)
        return
      }
      if (act.act === 'call') {
        const amt = this.pay(p, this.costOf(p))
        this.log('你' + (p.seen ? '跟注' : '闷跟') + ' ' + amt)
        this.rec('call', { seat: 0, paid: amt })
        await this.sleep(380)
        return
      }
      if (act.act === 'compare') {
        const target = this.players[act.target]
        if (!target || target.folded) return
        const fee = this.pay(p, this.unit * 2)
        this.rec('compare_fee', { seat: 0, paid: fee, target: target.seat })
        await this.sleep(380)
        this.doCompare(p, target)
      }
    },

    /* ---------------- AI ---------------- */
    seenEnough() {
      const al = this.activePlayers()
      return al.length >= 2 && al.every(p => this.actedSet[p.seat])
    },
    aiRaise(p) {
      this.raiseCount++
      this.unit += this.base
      const amt = this.pay(p, this.unit * 2)
      p.turns++
      this.log(p.name + ' 加注 ' + amt)
      this.rec('raise', { seat: p.seat, paid: amt })
    },
    aiCompare(p, others) {
      const target = others[Math.floor(Math.random() * others.length)]
      const fee = this.pay(p, this.unit * 2)
      this.rec('compare_fee', { seat: p.seat, paid: fee, target: target.seat })
      return this.doCompare(p, target)
    },
    aiAction(p) {
      const pressure = this.unit / this.base
      const style = AGGRO[p.seat] || 0
      const r = Math.random()

      if (!p.seen && pressure < 5 && p.turns < 2 + Math.floor(Math.random() * 2) && this.actionCount < 10) {
        if (r < 0.72 && p.stack >= this.unit) {
          const amt = this.pay(p, this.unit)
          p.turns++
          this.log(p.name + ' 闷跟 ' + amt)
          this.rec('call', { seat: p.seat, paid: amt })
          return
        }
      }
      if (!p.seen) { p.seen = true; this.log(p.name + ' 看牌'); this.rec('see', { seat: p.seat }) }

      const ev = this.evalHand(p.hand)
      const s = this.handStrength(ev)
      const others = this.activePlayers().filter(x => x.seat !== p.seat)
      const need = this.unit * 2

      if (p.stack < need && s < 0.6) return this.doFold(p)

      if (this.seenEnough() && others.length === 1) {
        if (s >= 0.78 + style * 0.5 && r < 0.68) return this.aiCompare(p, others)
        if (s >= 0.50 && pressure >= 5 && r < 0.45) return this.aiCompare(p, others)
      }
      if (this.seenEnough() && others.length === 2 && s >= 0.90 && pressure >= 3 && r < 0.35 + Math.max(0, style)) {
        return this.aiCompare(p, others)
      }

      const foldLine = 0.16 + pressure * 0.045 - style
      if (s < foldLine && pressure >= 3) {
        if (pressure <= 4 && this.actionCount < 12 && r < 0.10 + Math.max(0, style) && p.stack >= need + this.base) return this.aiRaise(p)
        return this.doFold(p)
      }

      if (this.raiseCount < MAX_RAISES && p.stack >= need + this.base) {
        const raiseProb = s >= 0.86 ? 0.55 + style : (s >= 0.60 ? 0.34 + style : (s >= 0.32 && pressure <= 3 ? 0.18 + style * 0.5 : 0))
        if (r < raiseProb) return this.aiRaise(p)
        if (s >= 0.24 && s < 0.32 && pressure <= 3 && this.actionCount < 10 && r < 0.07 + Math.max(0, style)) return this.aiRaise(p)
      }

      const potOdds = need / Math.max(1, this.pot + need)
      const callLine = 0.22 + pressure * 0.03 - potOdds * 0.25 - style * 0.4
      if (s < callLine && pressure >= 4) return this.doFold(p)
      if (p.stack < need) return this.doFold(p)
      const amt = this.pay(p, need)
      p.turns++
      this.log(p.name + ' 跟注 ' + amt)
      this.rec('call', { seat: p.seat, paid: amt })
    },

    doFold(p) {
      p.folded = true
      this.log(p.name + ' 弃牌')
      this.rec('fold', { seat: p.seat })
    },

    doCompare(a, b) {
      const ea = this.evalHand(a.hand), eb = this.evalHand(b.hand)
      const loser = this.cmpEval(ea, eb) > 0 ? b : a
      a.reveal = true
      b.reveal = true
      this.log(a.name + CAT_NAME[ea.cat] + ' 比 ' + b.name + CAT_NAME[eb.cat] + '，' + loser.name + '负')
      this.cmsg = '比牌：' + a.name + '「' + CAT_NAME[ea.cat] + '」 VS ' + b.name + '「' + CAT_NAME[eb.cat] + '」'
      this.rec('compare', { a: a.seat, b: b.seat, loser: loser.seat })
      loser.folded = true
    },

    /* ---------------- 结算 ---------------- */
    async finish() {
      if (this.done) return
      this.done = true
      this.isPlaying = false
      this.finished = true
      const alive = this.activePlayers()
      let winner
      if (alive.length === 1) winner = alive[0]
      else {
        alive.forEach(p => { p.reveal = true })
        winner = alive.reduce((best, p) => this.cmpEval(this.evalHand(p.hand), this.evalHand(best.hand)) > 0 ? p : best)
      }
      winner.reveal = true
      if (winner.seat === 0) winner.seen = true
      const ev = this.evalHand(winner.hand)
      const multiplier = Math.max(1, Math.round(this.pot / this.base))
      const rank = winner.seat === 0 ? 1 : (winner.seat === 1 ? 2 : 3)
      this.cmsg = winner.name + ' 以「' + CAT_NAME[ev.cat] + '」赢走奖池 ' + this.pot
      this.log('本局赢家：' + winner.name + '（' + CAT_NAME[ev.cat] + '）')

      const outcome = { game: 'zhajinhua', rank: rank, winner: winner.seat, multiplier: multiplier, pot: this.pot, ubet: this.players[0].bet }
      await this.settle(outcome)
    },

    async settle(outcome) {
      const replay = {
        game_type: 'zhajinhua',
        room: { id: this.cfg.room_id, name: this.cfg.room_name, entry: this.cfg.entry },
        seats: this.players.map(p => ({ seat: p.seat, name: p.name, isUser: p.seat === 0 })),
        hands: this.replayHands,
        actions: this.replayActions,
        duration: Math.round((Date.now() - this.replayStart) / 1000),
        result: outcome
      }
      let r = null
      try {
        r = await request('game_center.php', {
          action: 'settle',
          session_id: this.cfg.session_id,
          outcome: JSON.stringify(outcome),
          replay: JSON.stringify(replay)
        }, 'POST')
      } catch (e) { r = { code: -1, msg: (e && e.msg) || '结算请求失败' } }

      const win = Number(outcome.rank) === 1
      const d = (r && r.data) ? r.data : {}
      const payout = parseInt(d.payout || 0, 10)
      const penalty = parseInt(d.penalty || 0, 10)
      const frozen = Number(d.frozen || 0) === 1
      if (d.points !== undefined) this.points = Number(d.points)
      const entry = Number(this.cfg.entry || 0)
      const wager = parseInt(d.wager || 0, 10)

      this.result = {
        win: win,
        sub: win
          ? ('获胜奖励 = 双倍入门费 ' + (entry * 2) + ' + 已下赌注 ' + wager + (frozen ? ' · 奖励冻结暂存中' : ' · 已发放至游戏邮箱'))
          : ('失败损失 = 双倍入门费 ' + (entry * 2) + ' + 已下赌注 ' + wager),
        tip: (r && r.code !== 0) ? (r.msg || '') : ('当前积分：' + this.points),
        payout: payout,
        penalty: penalty,
        entry: entry
      }
      await this.sleep(900)
      this.showResult = true
    },

    /* ---------------- 退出 / 再来 ---------------- */
    goHall() { uni.navigateBack() },
    onExit() {
      if (this.done) { this.goHall(); return }
      uni.showModal({
        title: '退出对局',
        content: '现在退出将判定为放弃本局（入门费不退），确认退出？',
        success: (res) => { if (res.confirm) this.abandon() }
      })
    },
    async abandon() {
      try { await request('game_center.php', { action: 'abandon', session_id: this.cfg.session_id }, 'POST') } catch (e) {}
      this.done = true
      this.goHall()
    },
    async again() {
      if (this.cfg.match_mode === 'real') { this.goHall(); return }
      try {
        const res = await request('game_center.php', { action: 'start', room_id: this.cfg.room_id }, 'POST')
        if (res && res.code === 0 && res.data && res.data.session_id) {
          this.cfg.session_id = res.data.session_id
          this.points = Number(res.data.points || this.points)
          this.showResult = false
          this.resetLocal()
          this.deal()
          return
        }
        uni.showToast({ title: (res && res.msg) || '开局失败', icon: 'none' })
      } catch (e) { uni.showToast({ title: (e && e.msg) || '开局失败', icon: 'none' }) }
    },
    resetLocal() {
      this.players = []
      this.logs = []
      this.pot = 0
      this.actedSet = {}
      this.replayActions = []
    }
  }
}
</script>

<style scoped>
.tb { min-height: 100vh; background: radial-gradient(120% 80% at 50% 0%, #1f5d3a 0%, #0d3a24 55%, #062316 100%); position: relative; }
.tb-bg { position: fixed; inset: 0; pointer-events: none; }
.tb-top { position: fixed; top: 0; left: 0; right: 0; z-index: 99; background: rgba(6,35,22,.9); }
.tb-top-bar { height: 44px; display: flex; align-items: center; padding: 0 20rpx; gap: 16rpx; }
.tb-exit { width: 100rpx; font-size: 26rpx; color: #bff0d4; }
.tb-top-mid { flex: 1; display: flex; flex-direction: column; }
.tb-room { font-size: 27rpx; color: #fff; font-weight: 700; }
.tb-sub { font-size: 19rpx; color: rgba(255,255,255,.6); }
.tb-pts { width: 140rpx; text-align: right; font-size: 24rpx; color: #ffd77a; font-weight: 700; }

.tb-table { padding: 20rpx 24rpx 240rpx; }
.tb-loading { padding: 200rpx 0; text-align: center; }
.tb-loading text { font-size: 26rpx; color: rgba(255,255,255,.7); }

.tb-ai-row { display: flex; justify-content: space-around; gap: 20rpx; }
.tb-seat { flex: 1; max-width: 320rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 18rpx 12rpx; border-radius: 22rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); }
.tb-seat.active { border-color: #ffd77a; box-shadow: 0 0 0 2rpx rgba(255,215,122,.35); }
.tb-seat.folded { opacity: .4; }
.tb-av { width: 76rpx; height: 76rpx; border-radius: 50%; background: rgba(255,255,255,.12); }
.tb-av-ai, .tb-av-ph { display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #cfeee0; }
.tb-av.big { width: 92rpx; height: 92rpx; }
.tb-name { font-size: 22rpx; color: #fff; }
.tb-status { font-size: 19rpx; color: rgba(255,255,255,.6); }
.tb-cards { display: flex; gap: 6rpx; }

.pc { width: 78rpx; height: 110rpx; border-radius: 10rpx; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,.3); }
.pc.sm { width: 52rpx; height: 74rpx; }
.pc.back { background: linear-gradient(135deg, #2b6fd6, #17407f); }
.pc-lb { font-size: 24rpx; font-weight: 800; color: #111; }
.pc.sm .pc-lb { font-size: 18rpx; }
.pc-ctr { font-size: 32rpx; color: #111; }
.pc-lb.red, .pc-ctr.red { color: #e63b3b; }

.tb-center { margin: 26rpx 0; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.tb-pot-label { font-size: 21rpx; color: rgba(255,255,255,.6); }
.tb-pot { font-size: 48rpx; font-weight: 800; color: #ffd77a; }
.tb-cmsg { font-size: 22rpx; color: #bff0d4; text-align: center; }

.tb-me { display: flex; align-items: center; gap: 18rpx; padding: 20rpx; border-radius: 24rpx; background: rgba(255,255,255,.1); border: 1rpx solid rgba(255,255,255,.14); }
.tb-me.active { border-color: #ffd77a; box-shadow: 0 0 0 2rpx rgba(255,215,122,.35); }
.tb-me-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.tb-hand-tip { margin-top: 14rpx; text-align: center; }
.tb-hand-tip text { font-size: 24rpx; color: #ffd77a; }

.tb-log { height: 150rpx; margin-top: 20rpx; padding: 14rpx 18rpx; border-radius: 18rpx; background: rgba(0,0,0,.25); }
.tb-log-line { padding: 3rpx 0; }
.tb-log-line text { font-size: 21rpx; color: rgba(255,255,255,.68); line-height: 1.6; }

.tb-ctrl { position: fixed; left: 0; right: 0; bottom: 0; z-index: 99; display: flex; flex-wrap: wrap; gap: 14rpx; padding: 20rpx 24rpx; background: rgba(6,35,22,.96); border-top: 1rpx solid rgba(255,255,255,.08); }
.tbtn { flex: 1; min-width: 150rpx; height: 84rpx; line-height: 84rpx; text-align: center; border-radius: 999rpx; background: linear-gradient(135deg, #ff3b5c, #ff6a3d); color: #fff; font-size: 25rpx; font-weight: 600; }
.tbtn.ghost { background: rgba(255,255,255,.12); }
.tbtn.danger { background: rgba(230,59,59,.85); }
.tbtn.dis { opacity: .4; }
.tb-wait { width: 100%; text-align: center; font-size: 24rpx; color: rgba(255,255,255,.7); padding: 26rpx 0; }

.tb-mask { position: fixed; inset: 0; z-index: 900; background: rgba(0,0,0,.62); display: flex; align-items: flex-end; justify-content: center; }
.tb-sheet { width: 100%; background: #171a2b; border-radius: 30rpx 30rpx 0 0; padding: 34rpx 28rpx calc(40rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 16rpx; align-items: stretch; }
.tb-sheet-t { font-size: 27rpx; color: #fff; font-weight: 700; text-align: center; margin-bottom: 8rpx; }
.tb-cmp { height: 84rpx; line-height: 84rpx; text-align: center; border-radius: 18rpx; background: rgba(255,255,255,.08); color: #fff; font-size: 26rpx; }
.tb-res-emoji { font-size: 70rpx; text-align: center; }
.tb-res-title { font-size: 32rpx; font-weight: 700; color: #fff; text-align: center; }
.tb-res-sub { font-size: 22rpx; color: #9ba0ba; text-align: center; line-height: 1.7; }
.tb-res-num { font-size: 58rpx; font-weight: 800; text-align: center; color: #9ba0ba; }
.tb-res-num.up { color: #ff6a8a; }
.tb-res-num.down { color: #6aa8ff; }
.tb-res-tip { font-size: 21rpx; color: #83879e; text-align: center; }
.tb-res-btns { display: flex; gap: 16rpx; margin-top: 14rpx; }
</style>
