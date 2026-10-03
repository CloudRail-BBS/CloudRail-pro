<template>
  <view class="ddz-page">
    <!-- 顶栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">返回</view>
        <text class="nav-title">斗地主</text>
        <view class="nav-right">
          <text class="sound-btn" @click="toggleSound">{{ soundOn ? '🔊' : '🔇' }}</text>
          <text class="my-score">{{ myScore }}</text>
        </view>
      </view>
    </view>
    <view :style="{ height: statusBarHeight + 44 + 'px' }"></view>

    <!-- 赌桌 -->
    <view class="table">
      <!-- 底牌（顶部中间） -->
      <view class="bottom-zone">
        <view v-for="(c, i) in bottomCards" :key="i" class="pk pk-mini" :class="{ back: !showBottom }">
          <template v-if="showBottom">
            <text class="pk-corner" :class="cardColor(c)">{{ cardText(c) }}</text>
          </template>
        </view>
      </view>

      <!-- 两个对手 -->
      <view class="opponent left" :class="{ active: turn === 1 && status === 2 }">
        <view class="op-avatar-wrap">
          <image class="op-avatar" src="/static/logo.png" mode="aspectFill"></image>
          <view class="op-badge" :class="{ landlord: landlordSeat === 1 }">{{ seatRole(1) }}</view>
        </view>
        <text class="op-name">{{ players[1].name }}</text>
        <view class="op-cards">
          <view class="pk-back-mini" v-for="n in Math.min(10, ai1Count)" :key="n"></view>
        </view>
        <text class="op-count">{{ ai1Count }} 张</text>
        <!-- 他出的牌 -->
        <view class="op-play" v-if="lastPlay.seat === 1 && lastPlay.cards.length">
          <view v-for="(c, i) in lastPlay.cards" :key="i" class="pk pk-tiny">
            <text class="pk-corner" :class="cardColor(c)">{{ cardText(c) }}</text>
          </view>
        </view>
      </view>

      <view class="opponent right" :class="{ active: turn === 2 && status === 2 }">
        <view class="op-avatar-wrap">
          <image class="op-avatar" src="/static/logo.png" mode="aspectFill"></image>
          <view class="op-badge" :class="{ landlord: landlordSeat === 2 }">{{ seatRole(2) }}</view>
        </view>
        <text class="op-name">{{ players[2].name }}</text>
        <view class="op-cards">
          <view class="pk-back-mini" v-for="n in Math.min(10, ai2Count)" :key="n"></view>
        </view>
        <text class="op-count">{{ ai2Count }} 张</text>
        <view class="op-play" v-if="lastPlay.seat === 2 && lastPlay.cards.length">
          <view v-for="(c, i) in lastPlay.cards" :key="i" class="pk pk-tiny">
            <text class="pk-corner" :class="cardColor(c)">{{ cardText(c) }}</text>
          </view>
        </view>
      </view>

      <!-- 中央：状态 / 我出的牌 -->
      <view class="center-zone">
        <view v-if="status === 0" class="center-tip">点下方「开始游戏」发牌</view>
        <view v-else-if="status === 1" class="center-tip">{{ bidTip }}</view>
        <view v-else-if="status === 3" class="center-tip">{{ resultText }}</view>
        <view v-else-if="lastPlay.seat === 0 && lastPlay.cards.length" class="center-cards">
          <view v-for="(c, i) in lastPlay.cards" :key="i" class="pk pk-small">
            <text class="pk-corner" :class="cardColor(c)">{{ cardText(c) }}</text>
          </view>
        </view>
        <view v-else class="center-tip">{{ turnName }} 出牌中…</view>
      </view>

      <!-- 我的身份 -->
      <view class="me-role-bar">
        <text class="me-role" :class="{ landlord: landlordSeat === 0 }">{{ seatRole(0) || '—' }}</text>
        <text class="me-left">剩 {{ myCards.length }} 张</text>
        <text class="last-label" v-if="lastPlayLabel">{{ lastPlayLabel }}</text>
      </view>
    </view>

    <!-- 我的手牌（叠压） -->
    <view class="hand-zone" :style="{ paddingBottom: (safeBottom + 6) + 'px' }">
      <scroll-view class="hand-scroll" scroll-x>
        <view class="hand-row">
          <view
            v-for="(c, i) in myCards"
            :key="i"
            class="pk pk-hand"
            :class="{ picked: picked.indexOf(i) >= 0 }"
            @click="togglePick(i)"
          >
            <text class="pk-corner tl" :class="cardColor(c)">{{ cardCorner(c) }}</text>
            <text class="pk-suit" :class="cardColor(c)">{{ cardSuit(c) }}</text>
            <text class="pk-corner br" :class="cardColor(c)">{{ cardCorner(c) }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="btn-row">
        <view v-if="status === 0" class="btn primary" @click="startGame"><text>开始游戏（底注 {{ baseScore }}）</text></view>
        <view v-else-if="status === 3" class="btn primary" @click="startGame"><text>再来一局</text></view>
        <template v-else-if="status === 1">
          <view class="btn ghost" @click="bid(false)"><text>不叫</text></view>
          <view class="btn primary" @click="bid(true)"><text>叫地主</text></view>
        </template>
        <template v-else>
          <view class="btn ghost" @click="hint"><text>提示</text></view>
          <view class="btn" :class="{ disabled: !canPass }" @click="pass"><text>不出</text></view>
          <view class="btn primary" :class="{ disabled: !canPlay }" @click="play"><text>出牌</text></view>
        </template>
      </view>
    </view>
  </view>
</template>

<script>
/* ============================================================
   斗地主（单机版 · 真实牌面 + 音效）
   游戏逻辑全在前端；后端只记账（api/zjh.php 的 settle）。
   音效：素材文件放在 static/audio/ddz/（语音 mp3 + 音效 wav）
   牌值 v：3~15 = 3~2（11=J 12=Q 13=K 14=A 15=2），16 小王，17 大王
   ============================================================ */
import { request } from '../../../common/request.js'

/* 音效素材目录 */
const SND_DIR = '/static/audio/ddz/'
/* 语音 mp3 */
const SND = {
  bidYes: 'bid_yes.mp3',   // 叫地主
  bidNo: 'bid_no.mp3',     // 不叫
  pass: 'pass.mp3',        // 要不起
  bomb: 'bomb.mp3',        // 炸弹
  rocket: 'rocket.mp3',    // 王炸
  start: 'start.mp3',      // 开始
  win: 'win.mp3',          // 赢了
  lose: 'lose.mp3',        // 输了
  /* 音效 wav */
  deal: 'deal.wav',        // 发牌
  play: 'play.wav',        // 出牌
  select: 'select.wav',    // 选牌
  boom: 'bomb.wav',        // 爆炸
  winFx: 'win.wav',        // 胜利
  loseFx: 'lose.wav'       // 失败
}

const SUIT_SYM = ['♠', '♥', '♣', '♦']
const VAL_NAME = { 3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A',15:'2' }

export default {
  data() {
    return {
      statusBarHeight: 20,
      safeBottom: 0,
      baseScore: 10,
      status: 0,
      players: [{ name: '我' }, { name: '左家' }, { name: '右家' }],
      myCards: [],
      ai1Cards: [],
      ai2Cards: [],
      bottomCards: [],
      showBottom: false,
      landlordSeat: -1,
      turn: 0,
      lastPlay: { seat: -1, cards: [], type: null },
      lastPlayLabel: '',
      picked: [],
      resultText: '',
      myScore: 0,
      bidTip: '你要叫地主吗？',
      soundOn: true,
      _audio: {}
    }
  },
  computed: {
    turnName() { return this.turn === 0 ? '我' : this.players[this.turn].name },
    ai1Count() { return this.ai1Cards.length },
    ai2Count() { return this.ai2Cards.length },
    canPlay() {
      if (this.status !== 2 || this.turn !== 0 || !this.picked.length) return false
      const t = this.rankType(this.picked.map(i => this.myCards[i]))
      if (!t) return false
      return this.lastPlay.type ? this.canBeat(t, this.lastPlay.type) : true
    },
    canPass() {
      if (this.status !== 2 || this.turn !== 0) return false
      return this.lastPlay.seat !== -1 && this.lastPlay.seat !== 0
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
    const u = uni.getStorageSync('userInfo') || {}
    this.myScore = Number(u.points || 0) || 0
    this.soundOn = uni.getStorageSync('ddz_sound') !== 'off'
    this.prepareAudio()
  },
  onUnload() {
    Object.keys(this._audio).forEach(k => {
      try { this._audio[k].destroy() } catch (e) {}
    })
  },
  methods: {
    goBack() { uni.navigateBack() },
    toggleSound() {
      this.soundOn = !this.soundOn
      uni.setStorageSync('ddz_sound', this.soundOn ? 'on' : 'off')
      if (this.soundOn) this.sfxSelect()
    },

    /* ---------------- 牌面展示 ---------------- */
    seatRole(seat) {
      if (this.landlordSeat < 0) return ''
      return seat === this.landlordSeat ? '地主' : '农民'
    },
    cardText(c) {
      if (!c) return ''
      if (c.v === 16) return '小王'
      if (c.v === 17) return '大王'
      return VAL_NAME[c.v] || ''
    },
    cardCorner(c) {
      if (!c) return ''
      if (c.v === 16) return '小'
      if (c.v === 17) return '大'
      return VAL_NAME[c.v] || ''
    },
    cardSuit(c) {
      if (!c) return ''
      if (c.v >= 16) return '🃏'
      return SUIT_SYM[c.s] || ''
    },
    cardColor(c) {
      if (!c) return ''
      if (c.v >= 16) return 'joker'
      return (c.s === 1 || c.s === 3) ? 'red' : 'black'
    },

    /* ---------------- 音效（本地素材文件） ---------------- */
    /* 启动时把所有音频提前挂好 src，出牌时直接 play，避免首次播放延迟 */
    prepareAudio() {
      Object.keys(SND).forEach(k => {
        try {
          const ac = uni.createInnerAudioContext()
          ac.src = SND_DIR + SND[k]
          /* volume / obeyMuteSwitch 在部分平台是只读属性，赋值会抛异常，
             分别兜住，避免后面的缓存赋值被跳过 */
          try { ac.volume = 1 } catch (e) {}
          try { ac.obeyMuteSwitch = false } catch (e) {}
          this._audio[k] = ac
        } catch (e) { /* 音效失败不影响游戏 */ }
      })
    },
    playSnd(key, vol) {
      if (!this.soundOn) return
      const ac = this._audio[key]
      if (!ac) return
      try {
        ac.volume = typeof vol === 'number' ? vol : 1
        ac.stop()
        ac.play()
      } catch (e) { /* 音效失败不影响游戏 */ }
    },
    sfxSelect() { this.playSnd('select', 0.8) },
    sfxDeal() { this.playSnd('deal', 0.95) },
    sfxPlay() { this.playSnd('play', 0.95) },
    sfxPass() { this.playSnd('pass', 1) },
    sfxBomb(isRocket) {
      this.playSnd(isRocket ? 'rocket' : 'bomb', 1)
      this.playSnd('boom', 0.85)
    },
    sfxWin() {
      this.playSnd('winFx', 0.9)
      setTimeout(() => this.playSnd('win', 1), 260)
    },
    sfxLose() {
      this.playSnd('loseFx', 0.9)
      setTimeout(() => this.playSnd('lose', 1), 240)
    },

    /* ---------------- 牌型识别 ---------------- */
    rankType(cards) {
      if (!cards || !cards.length) return null
      const n = cards.length
      const vs = cards.map(c => c.v).sort((a, b) => a - b)
      const cnt = {}
      vs.forEach(v => { cnt[v] = (cnt[v] || 0) + 1 })
      const vals = Object.keys(cnt).map(Number).sort((a, b) => a - b)
      const counts = vals.map(v => cnt[v])
      const isConsec = (arr) => {
        for (let i = 1; i < arr.length; i++) if (arr[i] !== arr[i - 1] + 1) return false
        return true
      }
      if (n === 2 && vs[0] === 16 && vs[1] === 17) return { type: 'rocket', main: 100, len: 1 }
      if (n === 4 && vals.length === 1) return { type: 'bomb', main: vals[0], len: 1 }
      if (n === 1) return { type: 'single', main: vs[0], len: 1 }
      if (n === 2 && vals.length === 1) return { type: 'pair', main: vals[0], len: 1 }
      if (n === 3 && vals.length === 1) return { type: 'triple', main: vals[0], len: 1 }
      if (n === 4 && vals.length === 2 && counts.indexOf(3) >= 0) return { type: 'triple1', main: vals[counts.indexOf(3)], len: 1 }
      if (n === 5 && vals.length === 2 && counts.indexOf(3) >= 0 && counts.indexOf(2) >= 0) return { type: 'triple2', main: vals[counts.indexOf(3)], len: 1 }
      if (n >= 5 && vals.length === n && vs[n - 1] <= 14 && isConsec(vals)) return { type: 'straight', main: vs[n - 1], len: n }
      if (n >= 6 && n % 2 === 0 && vals.length === n / 2 && counts.every(c => c === 2) && vals[vals.length - 1] <= 14 && isConsec(vals)) return { type: 'pairs', main: vals[vals.length - 1], len: vals.length }
      if (n >= 6 && n % 3 === 0 && vals.length === n / 3 && counts.every(c => c === 3) && vals[vals.length - 1] <= 14 && isConsec(vals)) return { type: 'plane', main: vals[vals.length - 1], len: vals.length }
      return null
    },
    canBeat(a, b) {
      if (!a) return false
      if (!b) return true
      if (a.type === 'rocket') return true
      if (b.type === 'rocket') return false
      if (a.type === 'bomb' && b.type !== 'bomb') return true
      if (a.type === 'bomb' && b.type === 'bomb') return a.main > b.main
      if (b.type === 'bomb') return false
      return a.type === b.type && a.len === b.len && a.main > b.main
    },

    /* ---------------- 开局 ---------------- */
    buildDeck() {
      const deck = []
      for (let s = 0; s < 4; s++) for (let v = 3; v <= 15; v++) deck.push({ v, s })
      deck.push({ v: 16, s: 4 }); deck.push({ v: 17, s: 4 })
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = deck[i]; deck[i] = deck[j]; deck[j] = t
      }
      return deck
    },
    startGame() {
      if (this.myScore < this.baseScore) return uni.showToast({ title: '积分不足，至少需要 ' + this.baseScore, icon: 'none' })
      const deck = this.buildDeck()
      this.myCards = deck.slice(0, 17).sort((a, b) => a.v - b.v)
      this.ai1Cards = deck.slice(17, 34)
      this.ai2Cards = deck.slice(34, 51)
      this.bottomCards = deck.slice(51, 54)
      this.showBottom = false
      this.landlordSeat = -1
      this.lastPlay = { seat: -1, cards: [], type: null }
      this.lastPlayLabel = ''
      this.picked = []
      this.resultText = ''
      this.status = 1
      this.sfxDeal()
      setTimeout(() => this.playSnd('start', 1), 480)
      this.bidTip = '你要叫地主吗？'
    },

    /* ---------------- 叫地主 ---------------- */
    bid(take) {
      if (this.status !== 1) return
      if (take) return this.setLandlord(0)
      this.playSnd('bidNo', 1)
      let chosen = -1
      for (const s of [1, 2]) { if (Math.random() < 0.6) { chosen = s; break } }
      if (chosen < 0) chosen = Math.random() < 0.5 ? 1 : 2
      this.setLandlord(chosen)
    },
    setLandlord(seat) {
      this.landlordSeat = seat
      this.showBottom = true
      if (seat === 0) this.myCards = this.myCards.concat(this.bottomCards).sort((a, b) => a.v - b.v)
      else if (seat === 1) this.ai1Cards = this.ai1Cards.concat(this.bottomCards)
      else this.ai2Cards = this.ai2Cards.concat(this.bottomCards)
      // 我叫的地主立刻出声；AI 抢到就等"不叫"说完再报
      if (seat === 0) this.playSnd('bidYes', 1)
      else setTimeout(() => this.playSnd('bidYes', 1), 700)
      this.status = 2
      this.turn = seat
      if (seat !== 0) setTimeout(() => this.aiTurn(seat), 900)
    },

    /* ---------------- 我的操作 ---------------- */
    togglePick(i) {
      if (this.status !== 2 || this.turn !== 0) return
      const k = this.picked.indexOf(i)
      if (k >= 0) this.picked.splice(k, 1)
      else { this.picked.push(i); this.sfxSelect() }
    },
    hint() {
      if (this.status !== 2 || this.turn !== 0) return
      const found = this.findBeat(this.myCards, this.lastPlay.type)
      if (!found || !found.length) return uni.showToast({ title: '没有能压过的牌', icon: 'none' })
      const idxs = []
      found.forEach(c => {
        const i = this.myCards.findIndex((m, k2) => m.v === c.v && m.s === c.s && idxs.indexOf(k2) < 0)
        if (i >= 0 && idxs.indexOf(i) < 0) idxs.push(i)
      })
      this.picked = idxs
    },
    play() {
      if (!this.canPlay) return
      const cards = this.picked.slice().sort((a, b) => a - b).map(i => this.myCards[i])
      const t = this.rankType(cards)
      this.myCards = this.myCards.filter((_, i) => this.picked.indexOf(i) < 0)
      this.picked = []
      this.lastPlay = { seat: 0, cards, type: t }
      this.lastPlayLabel = ''
      if (t.type === 'bomb' || t.type === 'rocket') this.sfxBomb(t.type === 'rocket')
      else this.sfxPlay()
      if (this.myCards.length === 0) return this.settle(0)
      this.nextTurn()
    },
    pass() {
      if (!this.canPass) return
      this.sfxPass()
      this.lastPlayLabel = '我不要'
      this.nextTurn()
    },

    /* ---------------- 回合 ---------------- */
    nextTurn() {
      let next = this.turn
      for (let i = 0; i < 3; i++) {
        next = (next + 1) % 3
        if (next !== this.turn) break
      }
      if (this.lastPlay.seat === next) {
        this.lastPlay = { seat: -1, cards: [], type: null }
        this.lastPlayLabel = '重新出牌'
      }
      this.turn = next
      if (next === 0) return
      setTimeout(() => this.aiTurn(next), 900)
    },
    aiTurn(seat) {
      if (this.status !== 2) return
      const cards = seat === 1 ? this.ai1Cards : this.ai2Cards
      const move = this.lastPlay.type ? this.findBeat(cards, this.lastPlay.type) : this.aiLead(cards)
      if (move && move.length) {
        if (seat === 1) this.ai1Cards = this.removeCards(this.ai1Cards, move)
        else this.ai2Cards = this.removeCards(this.ai2Cards, move)
        const mt = this.rankType(move)
        this.lastPlay = { seat, cards: move, type: mt }
        this.lastPlayLabel = ''
        if (mt.type === 'bomb' || mt.type === 'rocket') this.sfxBomb(mt.type === 'rocket')
        else this.sfxPlay()
        const left = seat === 1 ? this.ai1Cards.length : this.ai2Cards.length
        if (left === 0) return this.settle(seat)
      } else {
        this.sfxPass()
        this.lastPlayLabel = this.players[seat].name + ' 不要'
      }
      this.nextTurn()
    },
    removeCards(hand, used) {
      const h = hand.slice()
      used.forEach(c => {
        const i = h.findIndex(x => x.v === c.v && x.s === c.s)
        if (i >= 0) h.splice(i, 1)
      })
      return h
    },
    aiLead(hand) {
      const sorted = hand.slice().sort((a, b) => a.v - b.v)
      const cnt = {}
      sorted.forEach(c => { cnt[c.v] = (cnt[c.v] || 0) + 1 })
      for (const c of sorted) if (cnt[c.v] < 4 && c.v < 16) return [c]
      return [sorted[0]]
    },
    findBeat(hand, t) {
      if (!t) return null
      const sorted = hand.slice().sort((a, b) => a.v - b.v)
      const byV = {}
      sorted.forEach(c => { (byV[c.v] = byV[c.v] || []).push(c) })
      const vals = Object.keys(byV).map(Number).sort((a, b) => a - b)
      let r = null
      if (t.type === 'single') { for (const v of vals) if (v > t.main) return [byV[v][0]] }
      else if (t.type === 'pair') { for (const v of vals) if (byV[v].length >= 2 && v > t.main) return [byV[v][0], byV[v][1]] }
      else if (t.type === 'triple') { for (const v of vals) if (byV[v].length >= 3 && v > t.main) return [byV[v][0], byV[v][1], byV[v][2]] }
      else if (t.type === 'triple1') {
        for (const v of vals) if (byV[v].length >= 3 && v > t.main) {
          const kick = sorted.find(c => c.v !== v)
          if (kick) return [byV[v][0], byV[v][1], byV[v][2], kick]
        }
      } else if (t.type === 'triple2') {
        for (const v of vals) if (byV[v].length >= 3 && v > t.main) {
          const pv = vals.find(x => x !== v && byV[x].length >= 2)
          if (pv) return [byV[v][0], byV[v][1], byV[v][2], byV[pv][0], byV[pv][1]]
        }
      } else {
        r = this.findBomb(byV, vals, t)
      }
      if (r) return r
      if (t.type !== 'bomb' && t.type !== 'rocket') return this.findBomb(byV, vals, t)
      return null
    },
    findBomb(byV, vals, t) {
      for (const v of vals) if (byV[v].length === 4 && (t.type !== 'bomb' || v > t.main)) return byV[v].slice(0, 4)
      if (vals.indexOf(16) >= 0 && vals.indexOf(17) >= 0) return [byV[16][0], byV[17][0]]
      return null
    },

    /* ---------------- 结算 ---------------- */
    settle(winSeat) {
      this.status = 3
      const amLandlord = this.landlordSeat === 0
      const landlordWin = winSeat === this.landlordSeat
      const win = amLandlord ? (landlordWin ? this.baseScore * 2 : -(this.baseScore * 2))
                             : (landlordWin ? -this.baseScore : this.baseScore)
      const who = winSeat === 0 ? '我' : this.players[winSeat].name
      this.resultText = who + (landlordWin ? '（地主）' : '（农民）') + ' 先出完，'
        + (win > 0 ? '赢 ' + win : (win < 0 ? '输 ' + (-win) : '平')) + ' 积分'
      if (win > 0) this.sfxWin(); else if (win < 0) this.sfxLose()
      uni.showModal({
        title: win > 0 ? '这局赢了' : (win < 0 ? '这局输了' : '平局'),
        content: this.resultText, showCancel: false, confirmText: '知道了'
      })
      this.recordSettle(this.baseScore, win, win > 0 ? 'win' : (win < 0 ? 'lose' : 'draw'), this.resultText)
    },
    async recordSettle(bet, win, result, detail) {
      try {
        const res = await request('zjh.php', { action: 'settle', bet, win, result, detail }, 'POST')
        if (res && res.code === 0 && res.data && typeof res.data.points !== 'undefined') {
          this.myScore = Number(res.data.points) || this.myScore
          const u = uni.getStorageSync('userInfo') || {}
          u.points = this.myScore; u.score = this.myScore; u.jifen = this.myScore
          uni.setStorageSync('userInfo', u)
        }
      } catch (e) {}
    }
  }
}
</script>

<style scoped>
/* ---------- 赌桌 ---------- */
.ddz-page {
  min-height: 100vh;
  background: radial-gradient(ellipse 120% 70% at 50% 42%, #2f7d4f 0%, #1c5a37 45%, #0d3520 100%);
}
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 99; background: rgba(6, 32, 18, 0.9); }
.nav-bar { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.nav-back { width: 120rpx; font-size: 28rpx; color: #cfe9d8; }
.nav-title { font-size: 32rpx; font-weight: 700; color: #fff; letter-spacing: 3rpx; }
.nav-right { width: 200rpx; display: flex; align-items: center; justify-content: flex-end; gap: 14rpx; }
.sound-btn { font-size: 32rpx; }
.my-score { font-size: 26rpx; color: #ffd77a; font-weight: 700; }

.table { position: relative; padding: 10rpx 24rpx 0; }

/* 底牌 */
.bottom-zone { display: flex; justify-content: center; gap: 8rpx; margin-bottom: 12rpx; }

/* ---------- 扑克牌（真实牌面） ---------- */
.pk {
  position: relative;
  background: #ffffff;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.pk-mini { width: 46rpx; height: 64rpx; }
.pk-tiny { width: 40rpx; height: 56rpx; }
.pk-small { width: 56rpx; height: 80rpx; }
.pk-hand { width: 96rpx; height: 136rpx; flex-shrink: 0; margin-left: -34rpx; }
.pk-hand:first-child { margin-left: 0; }
.pk.back { background: linear-gradient(135deg, #3f7fd0 0%, #1d4a86 100%); }

.pk-corner {
  position: absolute;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1;
}
.pk-corner.tl { top: 6rpx; left: 7rpx; }
.pk-corner.br { bottom: 6rpx; right: 7rpx; transform: rotate(180deg); }
.pk-mini .pk-corner, .pk-tiny .pk-corner { font-size: 18rpx; }
.pk-suit {
  position: absolute;
  left: 0; right: 0; top: 50%;
  transform: translateY(-50%);
  text-align: center;
  font-size: 40rpx;
  line-height: 1;
}
.pk-corner.red, .pk-suit.red { color: #e03a3a; }
.pk-corner.black, .pk-suit.black { color: #1b1b1b; }
.pk-corner.joker, .pk-suit.joker { color: #c8961e; font-size: 26rpx; }

/* 手牌选中：上移 */
.pk-hand { transition: transform 0.14s ease; }
.pk-hand.picked { transform: translateY(-26rpx); }

/* ---------- 两个对手 ---------- */
.opponent { position: absolute; top: 90rpx; width: 240rpx; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.opponent.left { left: 20rpx; }
.opponent.right { right: 20rpx; }
.op-avatar-wrap { position: relative; }
.op-avatar { width: 84rpx; height: 84rpx; border-radius: 50%; border: 3rpx solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); }
.op-badge {
  position: absolute; bottom: -6rpx; left: 50%; transform: translateX(-50%);
  padding: 2rpx 14rpx; border-radius: 999rpx; font-size: 18rpx;
  background: rgba(0,0,0,0.55); color: #dfe9e2; white-space: nowrap;
}
.op-badge.landlord { background: linear-gradient(135deg, #ff3b5c, #ff6a3d); color: #fff; font-weight: 700; }
.op-name { font-size: 22rpx; color: rgba(255,255,255,0.85); }
.op-cards { display: flex; }
.pk-back-mini {
  width: 18rpx; height: 26rpx; border-radius: 3rpx; margin-left: -8rpx;
  background: linear-gradient(135deg, #3f7fd0, #1d4a86);
  border: 1rpx solid rgba(255,255,255,0.25);
}
.pk-back-mini:first-child { margin-left: 0; }
.op-count { font-size: 20rpx; color: #ffd77a; }
.opponent.active .op-avatar { border-color: #ffd77a; box-shadow: 0 0 0 4rpx rgba(255,215,122,0.3); }
.op-play { display: flex; margin-top: 4rpx; }

/* ---------- 中央区 ---------- */
.center-zone {
  min-height: 260rpx; margin: 0 250rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.center-tip { font-size: 26rpx; color: rgba(255,255,255,0.7); text-align: center; line-height: 1.6; }
.center-cards { display: flex; gap: 6rpx; flex-wrap: wrap; justify-content: center; }

/* ---------- 我的身份条 ---------- */
.me-role-bar { display: flex; align-items: center; justify-content: center; gap: 16rpx; margin: 10rpx 0 6rpx; }
.me-role { font-size: 22rpx; padding: 4rpx 18rpx; border-radius: 999rpx; background: rgba(0,0,0,0.4); color: #dfe9e2; }
.me-role.landlord { background: linear-gradient(135deg, #ff3b5c, #ff6a3d); color: #fff; font-weight: 700; }
.me-left { font-size: 22rpx; color: rgba(255,255,255,0.75); }
.last-label { font-size: 22rpx; color: #ffd77a; }

/* ---------- 手牌区 ---------- */
.hand-zone {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 99;
  padding: 8rpx 0 0;
  background: linear-gradient(180deg, rgba(6,32,18,0) 0%, rgba(6,32,18,0.92) 26%, #062012 100%);
}
.hand-scroll { width: 100%; white-space: nowrap; }
.hand-row { display: flex; padding: 34rpx 30rpx 12rpx; }

.btn-row { display: flex; gap: 16rpx; padding: 6rpx 30rpx 4rpx; }
.btn { flex: 1; height: 84rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); }
.btn text { font-size: 27rpx; color: #fff; font-weight: 600; }
.btn.primary { background: linear-gradient(135deg, #ff3b5c, #ff6a3d); box-shadow: 0 6rpx 18rpx rgba(255,59,92,0.3); }
.btn.ghost { background: rgba(255,255,255,0.1); }
.btn.disabled { opacity: 0.4; }
</style>
