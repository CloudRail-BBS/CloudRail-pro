<template>
  <view class="pg" :class="themeClass">
    <view class="pg-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pg-nav-bar">
        <view class="pg-back" @click="goBack">‹</view>
        <text class="pg-title">对局回放</text>
        <view class="pg-pts"></view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="pg-body">
      <view v-if="!replay" class="pg-empty"><text>{{ loading ? '加载中…' : '回放不存在' }}</text></view>

      <block v-else>
        <view class="sum">
          <text class="sum-room">{{ replay.room_name }}</text>
          <text class="sum-line">{{ replay.game_type === 'doudizhu' ? '斗地主' : '炸金花' }} · 入门 {{ replay.entry_fee }} · 时长 {{ replay.duration }}s</text>
          <text class="sum-net" :class="{ up: Number(replay.net) > 0, down: Number(replay.net) < 0 }">
            {{ Number(replay.net) > 0 ? '+' : '' }}{{ replay.net }} 积分（{{ replay.result === 'win' ? '胜' : (replay.result === 'lose' ? '负' : replay.result) }}）
          </text>
        </view>

        <view class="sec">
          <text class="sec-t">座位</text>
          <view class="chips">
            <text v-for="(s, i) in seats" :key="i" class="chip">{{ s.name }}{{ s.isUser ? '（我）' : '' }}</text>
          </view>
        </view>

        <view class="sec" v-if="handsText">
          <text class="sec-t">牌面</text>
          <text class="sec-body">{{ handsText }}</text>
        </view>

        <view class="sec">
          <text class="sec-t">动作过程</text>
          <view class="acts">
            <view v-for="(a, i) in actions" :key="i" class="act">
              <text class="act-t">{{ timeLabel(a.t) }}</text>
              <text class="act-a">{{ describe(a) }}</text>
            </view>
            <view v-if="actions.length === 0" class="act"><text class="act-t">—</text><text class="act-a">无动作记录</text></view>
          </view>
        </view>
      </block>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'

export default {
  name: 'GameReplay',
  data() {
    return { statusBarHeight: 20, replay: null, loading: true }
  },
  computed: {
    data() { return (this.replay && this.replay.replay_data) || {} },
    seats() { return this.data.seats || [] },
    actions() { return this.data.actions || [] },
    handsText() {
      const d = this.data
      const out = []
      if (d.hands) {
        Object.keys(d.hands).forEach(k => {
          out.push(this.seatName(Number(k)) + '：' + (d.hands[k] || []).map(c => this.cardLabel(c)).join(' '))
        })
      }
      if (d.bottom && d.bottom.length) out.push('底牌：' + d.bottom.map(c => this.cardLabel(c)).join(' '))
      return out.join('\n')
    }
  },
  onLoad(q) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.load(Number((q && q.id) || 0))
  },
  methods: {
    goBack() { uni.navigateBack() },

    /* 座位名：0 号位固定是"我" */
    seatName(i) {
      const s = this.seats[Number(i)]
      if (s) return s.isUser ? '我' : (s.name || ('座位' + i))
      return Number(i) === 0 ? '我' : ('座位' + i)
    },
    /* 毫秒 → 0:03 这种时间 */
    timeLabel(t) {
      const sec = Math.max(0, Math.round(Number(t || 0) / 1000))
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return m + ':' + (s < 10 ? '0' + s : s)
    },
    /* 牌编码 → 可读牌面：S14 → ♠A，H3 → ♥3 */
    cardLabel(code) {
      const str = String(code == null ? '' : code)
      const rank = Number(str.slice(1))
      if (rank === 15) return '小王'
      if (rank === 16) return '大王'
      const SYM = { S: '♠', H: '♥', C: '♣', D: '♦' }
      const T = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
      return (SYM[str.charAt(0)] || '') + (T[rank] || String(rank || ''))
    },
    typeName(t) {
      return {
        single: '单张', pair: '对子', triple: '三张', triple_single: '三带一', triple_pair: '三带二',
        straight: '顺子', pairs_straight: '连对', plane: '飞机', plane_single: '飞机带单', plane_pair: '飞机带对',
        four_two: '四带二', four_two_pair: '四带两对', bomb: '炸弹', rocket: '火箭'
      }[t] || (t ? String(t) : '牌')
    },
    /* 把记录里的原始动作（ddz_play / zha_fold …）翻译成人话 */
    describe(a) {
      if (!a) return ''
      const raw = String(a.a || '')
      const act = raw.replace(/^(ddz|zha)_/, '')
      switch (act) {
        case 'deal':
          return '发牌' + (a.attempt ? '（第 ' + (a.attempt + 1) + ' 次）' : '')
        case 'bid':
          return this.seatName(a.seat) + (a.bid > 0 ? ' 叫 ' + a.bid + ' 分' : ' 不叫')
        case 'landlord':
          return this.seatName(a.seat) + ' 成为地主（底分 ' + a.base + '）'
        case 'play': {
          const cards = (a.cards || []).map(c => this.cardLabel(c)).join(' ')
          return this.seatName(a.seat) + ' 出牌：' + this.typeName(a.type) + (cards ? '　' + cards : '')
        }
        case 'pass':
          return this.seatName(a.seat) + ' 不要'
        case 'win':
          return (a.landlordWin ? '地主' : '农民') + '获胜 ×' + (a.multiplier || 1) + (a.spring ? '（春天）' : '')
        case 'see':
          return this.seatName(a.seat) + ' 看牌'
        case 'raise':
          return this.seatName(a.seat) + ' 加注 ' + a.paid
        case 'call':
          return this.seatName(a.seat) + ' 跟注 ' + a.paid
        case 'compare_fee':
          return this.seatName(a.seat) + ' 支付比牌费 ' + a.paid
        case 'compare':
          return this.seatName(a.a) + ' 与 ' + this.seatName(a.b) + ' 比牌，' + this.seatName(a.loser === a.a ? a.b : a.a) + ' 胜'
        case 'fold':
          return this.seatName(a.seat) + ' 弃牌'
        default:
          return raw || '—'
      }
    },

    async load(id) {
      if (!id) { this.loading = false; return }
      try {
        const res = await request('game_center.php', { action: 'replay_get', id: id }, 'GET')
        if (res && res.code === 0 && res.data) this.replay = res.data.replay
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '加载失败', icon: 'none' })
      }
      this.loading = false
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
.pg-body { padding: 20rpx 24rpx 60rpx; }
.pg-empty { padding: 160rpx 0; text-align: center; }
.pg-empty text { font-size: 26rpx; color: #6d718a; }
.sum { padding: 26rpx; border-radius: 22rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 10rpx; }
.sum-room { font-size: 30rpx; font-weight: 700; color: #fff; }
.sum-line { font-size: 22rpx; color: #9ba0ba; }
.sum-net { font-size: 28rpx; font-weight: 700; color: #c3c7dc; }
.sum-net.up { color: #52d17c; }
.sum-net.down { color: #ff6a8a; }
.sec { margin-top: 24rpx; }
.sec-t { display: block; font-size: 26rpx; font-weight: 700; color: #fff; margin-bottom: 12rpx; }
.sec-body { font-size: 22rpx; color: #c3c7dc; line-height: 1.8; white-space: pre-line; }
.chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip { padding: 8rpx 20rpx; border-radius: 999rpx; background: rgba(255,255,255,.08); font-size: 22rpx; color: #d6d9ea; }
.acts { display: flex; flex-direction: column; gap: 8rpx; }
.act { display: flex; gap: 16rpx; }
.act-t { width: 90rpx; font-size: 20rpx; color: #6d718a; }
.act-a { flex: 1; font-size: 22rpx; color: #c3c7dc; }
</style>
