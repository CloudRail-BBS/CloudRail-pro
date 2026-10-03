<template>
  <!-- 斗地主牌桌（竖屏布局，横向自适应；根节点 position:fixed 铺满视口，不依赖 100vh） -->
  <view class="dd">
    <!-- 牌桌背景（真实斗地主桌面素材） -->
    <view class="dd-bg">
      <image class="dd-bg-img" src="/static/ddz/ui/bg1.png" mode="aspectFill"></image>
      <view class="dd-bg-mask"></view>
    </view>

    <!-- 顶栏 -->
    <view class="dd-top" :style="{ paddingTop: topPad + 'px' }">
      <view class="dd-top-bar">
        <view class="dd-exit" @click="onExit">退出</view>
        <view class="dd-top-mid">
          <text class="dd-room">{{ cfg.room_name }}</text>
          <text class="dd-sub">{{ cfg.match_mode === 'real' ? '真人对局' : 'AI 对局' }} · 入门费 {{ cfg.entry }} 积分</text>
          <text class="dd-mult" v-if="started">底分 {{ base }} · 倍数 ×{{ mult }}</text>
        </view>
        <view class="dd-me-mini" :class="{ active: turnSeat === 0 && !over }">
          <image v-if="myAvatar" class="dd-av" :src="myAvatar" mode="aspectFill"></image>
          <view v-else class="dd-av dd-av-ph">我</view>
          <text class="dd-name">我</text>
          <text class="dd-tag" v-if="landlord === 0">地主</text>
          <text class="dd-cnt">剩 {{ hands[0] ? hands[0].length : 0 }} 张</text>
        </view>
        <view class="dd-pts">{{ points }}</view>
      </view>
    </view>

    <!-- 牌桌主体：上面一行两个对手，下面出牌区 -->
    <view class="dd-main" v-if="ready">
      <view class="dd-seats">
        <view
          v-for="i in [1, 2]"
          :key="i"
          class="dd-side"
          :class="{ active: turnSeat === i && !over, folded: hands[i] && hands[i].length === 0 }"
        >
          <view class="dd-side-head">
            <image v-if="seatInfo(i).avatar" class="dd-av" :src="seatInfo(i).avatar" mode="aspectFill"></image>
            <view v-else class="dd-av dd-av-ai">AI</view>
            <view class="dd-side-name">
              <text class="dd-name">{{ seatInfo(i).name }}</text>
              <text class="dd-cnt">剩 {{ hands[i] ? hands[i].length : 0 }} 张</text>
            </view>
            <text class="dd-tag" v-if="landlord === i">地主</text>
          </view>
          <view class="dd-play">
            <view v-if="plays[i] && plays[i].pass" class="dd-pass">不要</view>
            <view v-else-if="plays[i] && plays[i].cards" class="dd-playcards">
              <view v-for="(c, ci) in plays[i].cards" :key="ci" class="pc sm">
                <image class="pc-img" :src="cardImage(c)" mode="aspectFit"></image>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 中间：底牌 + 状态提示 + 我出的牌 + 日志 -->
      <view class="dd-mid">
        <view class="dd-bottom">
          <view v-for="(c, i) in bottomCards" :key="i" class="pc sm">
            <image class="pc-img" :src="bottomShown ? cardImage(c) : cardBack" mode="aspectFit"></image>
          </view>
        </view>
        <text class="dd-cmsg">{{ cmsg }}</text>
        <view class="dd-play dd-myplay">
          <view v-if="plays[0] && plays[0].pass" class="dd-pass">不要</view>
          <view v-else-if="plays[0] && plays[0].cards" class="dd-playcards">
            <view v-for="(c, ci) in plays[0].cards" :key="ci" class="pc sm">
              <image class="pc-img" :src="cardImage(c)" mode="aspectFit"></image>
            </view>
          </view>
        </view>
        <scroll-view class="dd-log" scroll-y :scroll-top="logScroll">
          <view v-for="(t, i) in logs" :key="i" class="dd-log-line"><text>{{ t }}</text></view>
        </scroll-view>
      </view>
    </view>

    <view v-else class="dd-loading"><text>正在进入牌桌…</text></view>

    <!-- 底部：我的手牌 + 操作按钮 -->
    <view class="dd-foot" v-if="ready" :style="{ paddingBottom: bottomPad + 'px' }">
      <view class="dd-hand">
        <view class="dd-hand-row" :style="{ height: handCard.h + 'px' }">
          <view
            v-for="(c, ci) in sortedHand"
            :key="code(c)"
            class="pc pc-hand"
            :class="{ sel: isSelected(c) }"
            :style="handCardStyle(ci)"
            @click="toggleSelect(c)"
          >
            <image class="pc-img" :src="cardImage(c)" mode="aspectFit"></image>
          </view>
        </view>
      </view>

      <view class="dd-ctrl">
        <block v-if="myTurnBid">
          <view class="tbtn ghost" @click="doBid(0)">不叫</view>
          <view v-for="s in [1,2,3]" :key="s" class="tbtn" :class="{ dis: s <= highestBid }" @click="s > highestBid && doBid(s)">{{ s }} 分</view>
        </block>
        <block v-else-if="myTurnPlay">
          <view class="tbtn ghost" :class="{ dis: !lastPlay }" @click="userPass">不出</view>
          <view class="tbtn ghost" @click="hint">提示</view>
          <view class="tbtn" @click="userPlay">出牌</view>
        </block>
        <view v-else-if="phase === 'done'" class="dd-wait">{{ overText }}</view>
        <view v-else class="dd-wait">等待其他玩家…</view>
      </view>
    </view>

    <!-- 结算 -->
    <view v-if="showResult" class="dd-mask">
      <view class="dd-sheet">
        <text class="dd-res-emoji">{{ result.win ? '🏆' : '💔' }}</text>
        <text class="dd-res-title">{{ result.win ? '恭喜获胜！' : '本局未获胜' }}</text>
        <text class="dd-res-sub">{{ result.sub }}</text>
        <text class="dd-res-num" :class="{ up: result.win, down: !result.win }">{{ result.win ? '+' : '-' }}{{ result.win ? result.payout : (result.entry + result.penalty) }}</text>
        <text class="dd-res-tip">{{ result.tip }}</text>
        <view class="dd-res-btns">
          <view class="tbtn ghost" @click="goHall">返回大厅</view>
          <view class="tbtn" @click="again">再来一局</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import wsManager from '../../common/ws.js'

/* ============ 资源目录（取自「佳蓝游戏引擎」斗地主演示项目的素材） ============ */
const ASSET = '/static/ddz'
const CARD_DIR = ASSET + '/cards/'
const SND_DIR = ASSET + '/sound/'
const CARD_BACK = CARD_DIR + 'card_00.png'

/* 牌面图映射：card_01~13=方块A~K, 14~26=梅花A~K, 27~39=黑桃A~K, 40~52=红桃A~K, 53=小王, 54=大王 */
const SUIT_BASE = { D: 1, C: 14, S: 27, H: 40 }
/* 块内位置：A(14)=0, 2..10=rank-1, J(11)=10, Q(12)=11, K(13)=12 */
function cardPos(rank) {
  if (rank === 14) return 0
  return rank - 1
}

export default {
  name: 'GameDdz',
  data() {
    return {
      statusBarHeight: 20,
      safeBottom: 0,
      winW: 780,
      winH: 360,
      handBoxW: 0,
      ready: false,
      cfg: { session_id: 0, room_id: 0, room_name: '', entry: 0, base_score: 1, match_mode: 'ai', seats: [] },
      points: 0,
      myAvatar: '',
      hands: [[], [], []],
      bottomCards: [],
      bottomShown: false,
      landlord: -1,
      base: 1,
      mult: 1,
      lastPlay: null,
      lastBy: -1,
      passStreak: 0,
      turnSeat: 0,
      playCounts: [0, 0, 0],
      selected: [],
      plays: [{}, {}, {}],
      phase: 'idle',
      started: false,
      over: false,
      overText: '',
      cmsg: '',
      logs: [],
      logScroll: 0,
      highestBid: 0,
      bidResolve: null,
      playResolve: null,
      done: false,
      showResult: false,
      result: { win: false, sub: '', tip: '', payout: 0, penalty: 0, entry: 0 },
      replayActions: [],
      replayStart: 0,
      profile: [],
      soundOn: true,
      cardBack: CARD_BACK,
      /* 真人对局（联机）：牌局由服务端做权威，这里只放服务端下发的状态 */
      online: false,
      onlineTimer: null,
      onlineState: null
    }
  },
  computed: {
    sortedHand() {
      const h = (this.hands[0] || []).slice()
      h.sort((a, b) => this.ord(b.rank) - this.ord(a.rank) || String(a.suit).localeCompare(String(b.suit)))
      return h
    },
    /* 手牌一屏铺开：按张数算牌宽与叠压间距，任何时候都不用左右滑动（单位 px）
       牌图实际比例 142x192 → 高 = 宽 × 1.352
       可用宽度优先取实测的手牌容器宽度（handBoxW），测不到才按窗口宽度估算，
       这样无论横屏竖屏、无论按钮几个，手牌都不会溢出压到按钮上 */
    handCard() {
      const n = Math.max(1, this.sortedHand.length)
      const portrait = this.isPortrait
      const guess = this.winW - (portrait ? 24 : 200)
      const avail = Math.max(150, this.handBoxW > 60 ? (this.handBoxW - 6) : guess)
      const maxH = portrait ? 84 : 96
      const h = Math.round(Math.min(maxH, Math.max(48, this.winH * (portrait ? 0.13 : 0.27))))
      const w = Math.round(h / 1.352)
      let step = n > 1 ? (avail - w) / (n - 1) : 0
      step = Math.min(step, w + 6)                   // 张数少时不要撑太开
      step = Math.max(step, 9)
      return { w: w, h: h, step: Math.max(0, Math.floor(step)) }
    },
    /* 是否竖屏（computed，取值不要加括号） */
    isPortrait() { return this.winH > this.winW },
    /* 横屏时状态栏在侧边不占位置；竖屏时给状态栏和底部安全区留出空间 */
    topPad() { return this.isPortrait ? (Number(this.statusBarHeight) || 0) : 0 },
    bottomPad() { return this.isPortrait ? (Number(this.safeBottom) || 0) : 0 },
    /* 联机时「能不能叫地主 / 能不能出牌」一律以服务端下发的 can_bid / can_play 为准：
       本地那份可能已经过期（切后台回来、别人先出牌了），照旧显示按钮就会让你一点就报
       「当前阶段不是…」。单机（AI）对局没有这两个字段，仍沿用「轮到我 0 号位」的旧约定。 */
    myTurnBid() {
      if (this.online) return this.phase === 'bid' && !!(this.onlineState && this.onlineState.can_bid)
      return this.phase === 'bid' && this.turnSeat === 0
    },
    myTurnPlay() {
      if (this.online) return this.phase === 'play' && !!(this.onlineState && this.onlineState.can_play)
      return this.phase === 'play' && this.turnSeat === 0
    }
  },
  onLoad(q) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
    this.soundOn = true
    this._timers = []
    this._audios = []
    this.watchWindow()
    this.loadSession(q)
  },
  onShow() {
    this.syncWindow()
    /* 切回前台必须立刻和服务端对一次状态。
       切后台时如果正好有一个 ddz_state 请求在途，它可能再也不会回来，
       而 _onlinePulling 这把锁会一直卡着 —— 之后所有轮询都被当成"上一次还没回来"
       直接合并丢掉，界面就永远停在切走前那一帧。
       表现就是：别人早叫完地主、牌都出几轮了，我这边还显示轮到我叫地主，一点就报
       "当前阶段不是叫地主阶段"。所以这里先清锁，再强制拉一次。 */
    if (this.online && !this.done) this.resyncOnline()
  },
  onUnload() {
    /* 先解绑实时推送，避免页面销毁后回调还在跑 */
    try {
      if (this._onlineWsCb && wsManager && wsManager.off) wsManager.off('ddz_update', this._onlineWsCb)
      this._onlineWsCb = null
    } catch (e) {}
    if (!this.done && this.cfg.session_id) {
      try { request('game_center.php', { action: 'abandon', session_id: this.cfg.session_id }, 'POST') } catch (e) {}
    }
    /* 页面销毁时必须收干净：延时器、音频实例、全局窗口监听。
       否则"页面已经销毁但 JS 还在跑"，会触发视图层报错
       （表现就是 请求的页面无法打开 __uniappview.html） */
    this.clearTimers()
    this.destroyAudios()
    if (this._onResize) {
      try { uni.offWindowResize && uni.offWindowResize(this._onResize) } catch (e) {}
      this._onResize = null
    }
  },
  methods: {
    /* ---------------- 窗口尺寸 ---------------- */
    /* 进入时量一次，并监听尺寸变化（分屏、字体缩放、折叠屏展开等） */
    watchWindow() {
      this.syncWindow()
      this.later(() => this.syncWindow(), 300)
      if (!this._onResize) {
        this._onResize = () => this.syncWindow()
        try { uni.onWindowResize(this._onResize) } catch (e) {}
      }
    },
    /* 统一登记延时器：页面销毁时全部清掉 */
    later(fn, ms) {
      const id = setTimeout(() => {
        const k = this._timers.indexOf(id)
        if (k >= 0) this._timers.splice(k, 1)
        fn()
      }, ms)
      this._timers.push(id)
      return id
    },
    clearTimers() {
      (this._timers || []).forEach(id => clearTimeout(id))
      this._timers = []
    },
    /* 销毁所有正在播/待播的音频实例 */
    destroyAudios() {
      (this._audios || []).forEach(ac => { try { ac.destroy() } catch (e) {} })
      this._audios = []
    },
    /* 取窗口尺寸。个别机型 windowWidth/windowHeight 取值会滞后，
       用屏幕尺寸 screenWidth/screenHeight 做纠正，避免布局按错误尺寸计算 */
    syncWindow() {
      const s = uni.getSystemInfoSync()
      const sw = Number(s.screenWidth || 0)
      const sh = Number(s.screenHeight || 0)
      let w = Number(s.windowWidth || sw || 0)
      let h = Number(s.windowHeight || sh || 0)
      if (sw > 0 && sh > 0 && sw > sh) {
        if (w < h) { const t = w; w = h; h = t }   // 宽高反了就对调
        if (w < sw) w = sw
        if (h > sh) h = sh
      }
      if (w > 0) this.winW = w
      if (h > 0) this.winH = h
      this.measureHand()
    },
    /* 实测手牌容器宽度：按真实布局算牌宽，避免手牌溢出压到按钮上 */
    measureHand() {
      this.$nextTick(() => {
        try {
          uni.createSelectorQuery().in(this).select('.dd-hand').boundingClientRect(rect => {
            if (rect && rect.width) {
              const w = Math.round(rect.width)
              /* 首次量到时写一行诊断，方便排查尺寸问题 */
              if (this.handBoxW === 0) this.log('牌桌 ' + this.winW + '×' + this.winH + '，手牌区 ' + w + 'px')
              this.handBoxW = w
            }
          }).exec()
        } catch (e) { /* 测不到就退回按窗口宽度估算 */ }
      })
    },

    /* ---------------- 牌面图片（真实扑克牌素材） ---------------- */
    cardImage(c) {
      if (!c) return CARD_BACK
      if (c.rank === 15) return CARD_DIR + 'card_53.png'   // 小王
      if (c.rank === 16) return CARD_DIR + 'card_54.png'   // 大王
      const idx = (SUIT_BASE[c.suit] || 1) + cardPos(c.rank)
      return CARD_DIR + 'card_' + (idx < 10 ? '0' + idx : String(idx)) + '.png'
    },

    /* ---------------- 音效（真人配音素材，mp3） ---------------- */
    /* 用 mp3 不用 ogg：uni-app 在 App 端只保证 mp3/aac/m4a/wav，
       ogg 在浏览器能播但 App 端 innerAudioContext 播不出来。
       每次播放新建实例（复用实例连续 stop/play 在 App 端容易哑）；
       必须等 onCanplay 再 play，否则新建后立刻 play 会被丢掉 */
    playSnd(name, vol) {
      if (!this.soundOn || !name) return
      try {
        const ac = uni.createInnerAudioContext()
        this._audios.push(ac)
        /* volume / obeyMuteSwitch 在部分平台是只读属性，赋值会直接抛异常。
           必须分别兜住 —— 之前就是这行抛错，导致后面的 src 和 play 根本没执行，
           整局完全静音（日志里会看到 "Cannot set property obeyMuteSwitch ... only a getter"） */
        try { ac.volume = typeof vol === 'number' ? vol : 1 } catch (e) {}
        try { ac.obeyMuteSwitch = false } catch (e) {}
        let started = false
        let dead = false
        const fin = () => {
          if (dead) return
          dead = true
          const k = this._audios.indexOf(ac)
          if (k >= 0) this._audios.splice(k, 1)
          try { ac.destroy() } catch (e) {}
        }
        const start = () => {
          if (started || dead) return
          started = true
          try { ac.play() } catch (e) {}
        }
        ac.onCanplay(start)
        ac.onEnded(fin)
        ac.onError((e) => {
          this.log('[音效] ' + name + ' 失败：' + ((e && e.errMsg) || '未知'))
          fin()
        })
        ac.src = SND_DIR + name + '.mp3'
        this.later(start, 400)             // 兜底：个别机型不触发 onCanplay
        /* 到点还没开始播，写进日志，方便区分"没触发"和"播了但没声" */
        this.later(() => { if (!started && !dead) this.log('[音效] ' + name + ' 未能开始播放') }, 2000)
        this.later(fin, 9000)
      } catch (e) {
        this.log('[音效] ' + name + ' 异常：' + ((e && e.message) || e))
      }
    },
    /* 牌值 → 配音文件名里的牌名（A→1，小王→14，大王→15） */
    voiceRank(rank) {
      if (rank === 14) return '1'
      if (rank === 15) return '14'
      if (rank === 16) return '15'
      return String(rank)
    },
    /* 出牌语音：按牌型播对应的真人配音 */
    speakPlay(cards, info) {
      if (!cards || !cards.length) return

      /* 先掐掉上一条还没播完的报牌语音。
         否则上家那句还没放完，我这手牌的报牌声又起来了，
         两条叠在一起，听起来就像上家的牌被重新报了一遍（先报4再报10）。 */
      try {
        const keep = []
        const old = this._audios || []
        old.forEach(a => {
          const src = String((a && a.src) || '')
          if (src.indexOf('Man_') >= 0) {
            try { a.stop() } catch (e) {}
            try { a.destroy() } catch (e) {}
          } else {
            keep.push(a)
          }
        })
        this._audios = keep
      } catch (e) {}

      const t = (info && info.type) || ''
      if (t === 'rocket') { this.playSnd('Man_wangzha'); return }
      if (t === 'bomb') { this.playSnd('Man_zhadan'); return }
      if (t === 'straight') { this.playSnd('Man_shunzi'); return }
      if (t === 'pairs_straight') { this.playSnd('Man_liandui'); return }
      if (t === 'plane' || t === 'plane_single' || t === 'plane_pair') { this.playSnd('Man_feiji'); return }
      if (t === 'triple_single') { this.playSnd('Man_sandaiyi'); return }
      if (t === 'triple_pair') { this.playSnd('Man_sandaiyidui'); return }
      if (t === 'four_two') { this.playSnd('Man_sidaier'); return }
      if (t === 'four_two_pair') { this.playSnd('Man_sidailiangdui'); return }
      const r = this.voiceRank(cards[0].rank)
      if (t === 'pair') { this.playSnd('Man_dui' + r); return }
      if (t === 'triple') { this.playSnd('Man_tuple' + r); return }
      this.playSnd('Man_' + r)
    },
    /* 不要 / 要不起 */
    sfxPass() { this.playSnd('Man_buyao' + (1 + Math.floor(Math.random() * 3))) },
    /* 只剩 1~2 张时报警 */
    sfxAlert(left) {
      if (left === 1) this.playSnd('Man_baojing1')
      else if (left === 2) this.playSnd('Man_baojing2')
    },
    sfxSpring() { this.playSnd('Man_chuntian1') },
    sfxWin() { this.playSnd('win') },
    sfxLose() { this.playSnd('lose') },
    /* 手牌叠压定位：第 1 张正常，其余用负 margin 叠上去（单位 px） */
    handCardStyle(ci) {
      const k = this.handCard
      return {
        width: k.w + 'px',
        height: k.h + 'px',
        marginLeft: ci === 0 ? '0' : (k.step - k.w) + 'px'
      }
    },

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
        this.profile = this.seatProfiles()
        this.ready = true
        this.measureHand()

        /* 真人对局：牌局由服务端做权威，本地那套「自己洗牌 + 本地 AI 对手」的循环不再使用，
           改成不停把服务端状态拉回来渲染，玩家操作也直接提交给服务端。
           接管这几个方法是因为模板上的按钮直接调它们，联机时不能再走本地逻辑。 */
        this.online = !!(d.match_mode === 'real' && d.match_no)
        if (this.online) {
          this.userPlay = () => this.onlinePlay()
          this.userPass = () => this.onlinePass()
          this.doBid = (s) => this.onlineBid(s)
          this.hint = () => this.onlineHint()
          this.startOnline()
        } else {
          /* 真人匹配却没带 match_no：要么后端还是旧版，要么这一局是升级前匹配的。
             这种情况只能各打各的，明确提示重开一局，免得以为是"同一局"。 */
          if (d.match_mode === 'real') {
            uni.showToast({ title: '这一局缺联机数据，请回大厅重新匹配一次', icon: 'none', duration: 3000 })
          }
          this.$nextTick(() => this.bidding(0))
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '进入牌桌失败', icon: 'none' })
        this.goHall()
      }
    },
    seatProfiles() {
      const isReal = this.cfg.match_mode === 'real'
      const raw = Array.isArray(this.cfg.seats) ? this.cfg.seats : []
      const aiNames = ['', '官方AI·朱雀', '官方AI·玄武']
      const out = []
      for (let i = 0; i < 3; i++) {
        if (i === 0) out.push({ name: '我', avatar: this.myAvatar, real: false })
        else {
          const s = raw[i]
          if (isReal && s && !Number(s.is_ai)) out.push({ name: s.name || ('玩家' + i), avatar: s.avatar || '', real: true })
          else out.push({ name: aiNames[i], avatar: '', real: false })
        }
      }
      return out
    },
    seatInfo(i) { return this.profile[i] || { name: '', avatar: '' } },

    /* ==================== 真人对局（联机，服务端权威） ==================== */

    async startOnline() {
      this.phase = 'bid'
      this.hands = [[], [], []]
      this.plays = [{}, {}, {}]
      this.over = false
      this.done = false
      this.selected = []
      this.cmsg = '正在进入牌局…'
      this.logs = []
      this.log('已进入真人对局，牌局由服务器统一发放')

      /* 实时同步：服务端每有动作都会推一条 ddz_update，并且是「逐人推送各自的完整状态」，
         收到就直接渲染 —— 出牌播报几乎零延迟，也不会像轮询那样把中间某一次动作吞掉。
         轮询只作为兜底（WS 没连上也能正常玩）。 */
      this._onlineWsCb = (data) => {
        if (!this.online || this.done) return
        /* 记一下 WS 最近一次送数据的时间：用来判断"轮询回来的这份是不是旧的" */
        this._lastWsAt = Date.now()
        if (data && data.state) this.applyOnline(data.state)
        else this.pullOnline()
      }
      try { wsManager.on('ddz_update', this._onlineWsCb) } catch (e) {}

      uni.showToast({ title: '真人对局 · 联机同步中', icon: 'none' })
      await this.pullOnline()
      this.ensureOnlineTimer()
    },

    /* 轮询兜底：没有就补一个（切后台回来时定时器可能已经不在了） */
    ensureOnlineTimer() {
      if (!this.online || this.done) return
      if (this.onlineTimer) return
      this.onlineTimer = setInterval(() => this.pullOnline(), 1200)
      this._timers.push(this.onlineTimer)
    },

    /* 强制重新同步一次：清掉可能卡住的拉取锁，保证这次请求一定发得出去 */
    resyncOnline() {
      if (!this.online || this.done) return
      this._onlinePulling = false
      this._onlinePending = false
      this._lastWsAt = 0
      this.ensureOnlineTimer()
      this.pullOnline()
    },

    /* 串行化的拉取：上一次还没回来就把这次合并掉，避免并发请求乱序返回导致状态倒错。
       另外还有一个关键点：如果这次请求还在路上时就已经收到了 WS 的新状态，
       这份响应就是「旧的」，必须丢掉 —— 否则界面会被回退到上一个动作，
       表现就是「不该我出牌却显示轮到我」、按钮状态乱跳。 */
    async pullOnline() {
      if (!this.online || this.done) return
      /* 上一次拉取还在路上：正常情况下把这次合并掉就行。
         但如果它已经卡了 6 秒以上（切后台把请求丢了、网络断了），就必须放行，
         否则这把锁永远解不开，界面再也同步不上。 */
      if (this._onlinePulling && Date.now() - (this._onlinePullingAt || 0) < 6000) {
        this._onlinePending = true
        return
      }
      this._onlinePulling = true
      this._onlinePullingAt = Date.now()
      const beganAt = Date.now()
      try {
        const res = await request('game_center.php', { action: 'ddz_state', session_id: this.cfg.session_id }, 'GET')
        if (res && res.code === 0 && res.data) {
          this._onlineErr = ''
          if ((this._lastWsAt || 0) <= beganAt) this.applyOnline(res.data)
        } else if (res && res.code && !this._onlineErr) {
          /* 拉不到联机状态时把原因说出来，别默默卡在原地 */
          this._onlineErr = res.msg || res.message || '联机状态获取失败'
          uni.showToast({ title: this._onlineErr, icon: 'none' })
        }
      } catch (e) {
        if (!this._onlineErr) {
          this._onlineErr = (e && e.msg) || '网络错误'
          uni.showToast({ title: '联机状态获取失败：' + this._onlineErr, icon: 'none' })
        }
      }
      this._onlinePulling = false
      if (this._onlinePending) { this._onlinePending = false; this.pullOnline() }
    },

    /* 把服务端状态灌进本地这些渲染字段，模板不用改。
       两个关键点：
       1) 服务端用的是「绝对座位」，而本地模板一直假设「我 = 0 号位」
          （按钮条件是 turnSeat === 0），所以这里统一转成以我为 0 的相对座位，
          否则会出现「该我出牌却不给按钮 / 不该我出却能点」。
       2) 本地循环里出牌是有报牌配音和音效的，联机走的是服务端状态，
          所以要自己比对状态变化来触发，否则全程没声音。 */
    applyOnline(d) {
      if (!d) return
      /* 只接受「不比当前旧」的状态。
         轮询、WS 推送、出牌响应这三个来源时序是交错的，旧的那一份一到，
         整张桌子就会倒回上一个动作（牌面、剩余张数"闪一下又回来"）。
         服务端把这一局的最后改动时间当版本号发下来，比它旧的一律丢弃。 */
      const rev = String(d.rev || '')
      if (rev && this._onlineRev && rev < this._onlineRev) return
      if (rev) this._onlineRev = rev
      this.onlineState = d
      const my = Number(d.my_seat) || 0
      const rel = s => ((Number(s) - my + 3) % 3)

      /* ---- 手牌：只拿得到自己的，对手按剩余张数补牌背 ---- */
      const counts = d.counts || [0, 0, 0]
      const mine = Array.isArray(d.hand) ? d.hand : []
      const ph = n => new Array(Math.max(0, n)).fill({ suit: 'X', rank: 3 })
      this.hands = [mine, ph(counts[(my + 1) % 3] || 0), ph(counts[(my + 2) % 3] || 0)]

      /* ---- 座位资料也按相对座位重排，让我自己永远在 0 号 ---- */
      const seats = d.seats || []
      const prof = []
      for (let i = 0; i < 3; i++) {
        const s = seats[(my + i) % 3] || {}
        prof.push({
          name: i === 0 ? '我' : (s.name || ('玩家' + (s.seat != null ? s.seat : i))),
          avatar: i === 0 ? this.myAvatar : (s.avatar || ''),
          real: !s.is_ai
        })
      }
      this.profile = prof

      this.landlord = Number(d.landlord) >= 0 ? rel(d.landlord) : -1
      this.mult = Number(d.multiplier || 1)
      this.turnSeat = rel(d.turn)
      this.passStreak = Number(d.passes || 0)
      this.bottomShown = Number(d.landlord) >= 0
      this.bottomCards = d.bottom || []

      const lastSeat = Number(d.last_seat)
      const lastCards = d.last_cards || []
      const key = lastSeat + '|' + lastCards.map(c => String(c.suit) + c.rank).join(',')
      const first = (this._onlineKey === undefined)
      const changed = (key !== this._onlineKey)
      this._onlineKey = key
      if (first) this.logs = []

      /* ---- 出牌流水：写进牌桌的「记录」条（时间 + 谁 + 出了什么牌） ---- */
      if (changed && !first) {
        const relSeat = rel(lastSeat)
        const who = relSeat === 0 ? '我' : ((prof[relSeat] && prof[relSeat].name) || ('座位' + (relSeat + 1)))
        const dt = new Date()
        const pad = n => (n < 10 ? '0' + n : '' + n)
        const hhmm = pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds())
        if (lastSeat >= 0 && lastCards.length) {
          const info = d.last_info || {}
          const NAME = {
            single: '单张', pair: '对子', trio: '三张', trio1: '三带一', trio2: '三带二',
            straight: '顺子', pairs: '连对', plane: '飞机', four2: '四带二',
            bomb: '炸弹', rocket: '火箭'
          }
          const RK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王' }
          const txt = lastCards.map(c => (RK[Number(c.rank)] || String(c.rank)) + String(c.suit || '')).join(' ')
          this.logs = (this.logs || []).concat([
            hhmm + '  ' + who + '  ' + (NAME[info.type] || '出牌') + ' ' + txt
          ]).slice(-60)
          this.$nextTick(() => { this.logScroll = (this.logs || []).length * 100 })
        }
      }

      if (lastSeat >= 0 && lastCards.length) {
        this.lastPlay = d.last_info
        this.lastBy = rel(lastSeat)
        this.plays[rel(lastSeat)] = { cards: lastCards }
      } else {
        this.lastPlay = null
        this.lastBy = -1
        this.plays = [{}, {}, {}]
      }

      /* ---- 补音效：有人出牌就报牌，有人"不要"就有不要的声音 ---- */
      if (changed && !first) {
        if (lastSeat >= 0 && lastCards.length) {
          this.speakPlay(lastCards, d.last_info)
          const t = (d.last_info || {}).type
          if (t === 'bomb' || t === 'rocket') {
            this.log((t === 'rocket' ? '火箭' : '炸弹') + '！倍数 ×' + this.mult)
          }
          this.cmsg = this.seatInfo(rel(lastSeat)).name + ' 出牌：' + this.typeName(d.last_info || {})
        }
        if (Number(d.passes || 0) > Number(this._onlinePasses || 0)) this.sfxPass()
      }
      this._onlinePasses = Number(d.passes || 0)

      if (d.phase === 'bid') {
        this.phase = 'bid'
        if (d.can_bid) this.cmsg = '轮到你叫地主' + this.remainText(d)
        else if (!changed) this.cmsg = this.seatInfo(this.turnSeat).name + ' 正在叫地主…'
      } else if (d.phase === 'play') {
        this.phase = 'play'
        if (d.can_play) this.cmsg = (this.lastPlay ? '跟牌或不要' : '该你出牌（主动出牌）') + this.remainText(d)
        else if (!changed) this.cmsg = this.seatInfo(this.turnSeat).name + ' 思考中…'
      } else if (d.phase === 'over') {
        this.onlineFinish(d)
      }
    },

    /* 轮到自己时的剩余秒数。服务端 20 秒没动作就会自动托管（叫地主超时视为不叫、
       出牌超时按不要处理），提示出来，省得你切后台回来看到"怎么自己已经过了"却不知道原因。 */
    remainText(d) {
      const n = Number(d && d.remain)
      return n > 0 ? '（剩 ' + n + 's）' : ''
    },

    async onlineBid(call) {
      if (!this.online || this.done) return
      const beganAt = Date.now()
      try {
        const res = await request('game_center.php', {
          action: 'ddz_bid', session_id: this.cfg.session_id, call: call ? 1 : 0
        }, 'POST')
        if (res && res.code === 0 && res.data) {
          /* 同样防旧状态覆盖新状态 */
          if ((this._lastWsAt || 0) <= beganAt) this.applyOnline(res.data)
        } else if (res) {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
          /* 服务端说这个阶段不该我做这个操作 —— 说明本地状态过期了，
             立刻重新同步一次把按钮纠正回来，而不是让你反复点、反复报错 */
          this.resyncOnline()
        }
      } catch (e) { this.resyncOnline() }
    },

    async onlinePlay() {
      if (!this.online || this.done) return
      const hand = this.hands[0] || []
      const cards = hand.filter(c => c && this.selected.includes(this.code(c)))
      if (!cards.length) { uni.showToast({ title: '请选择要出的牌', icon: 'none' }); return }
      await this.onlineSubmit({ cards: cards })
    },

    async onlinePass() {
      if (!this.online || this.done) return
      await this.onlineSubmit({ pass: 1 })
    },

    async onlineSubmit(payload) {
      const body = Object.assign({ action: 'ddz_play', session_id: this.cfg.session_id }, payload)
      if (payload.cards) body.cards = JSON.stringify(payload.cards)
      const beganAt = Date.now()
      try {
        const res = await request('game_center.php', body, 'POST')
        if (res && res.code === 0 && res.data) {
          this.selected = []
          /* 这里也必须防"旧状态覆盖新状态"：
             出牌请求在途时如果已经收到 WS 推来的更新，说明这份响应是旧的，
             丢掉它。否则界面会先跳到最新、再倒回上一次，看着就像在回放。 */
          if ((this._lastWsAt || 0) <= beganAt) this.applyOnline(res.data)
        } else if (res) {
          uni.showToast({ title: res.msg || '出牌失败', icon: 'none' })
          /* 同上：状态过期就立刻重新同步，避免界面一直停在旧牌面 */
          this.resyncOnline()
        }
      } catch (e) { this.resyncOnline() }
    },

    /* 提示：只在本地帮忙选牌，合法性还是服务端说了算 */
    onlineHint() {
      if (!this.online) return
      const hand = this.hands[0] || []
      if (!hand.length) return
      if (!this.lastPlay) {
        const lead = this.leadPlay(hand)
        if (!lead || !lead.length) { uni.showToast({ title: '没有可出的牌', icon: 'none' }); return }
        this.selected = lead.map(c => this.code(c))
        return
      }
      const cand = this.findBeat(hand, this.lastPlay, false)
      if (!cand || !cand.length) return this.onlinePass()
      this.selected = cand.map(c => this.code(c))
    },

    /* 联机结算：胜负由服务端牌局决定，前端只是把结果提交去做积分结算 */
    async onlineFinish(d) {
      if (this.done) return
      this.done = true
      this.over = true
      this.phase = 'done'
      if (this.onlineTimer) { clearInterval(this.onlineTimer); this.onlineTimer = null }
      const win = !!Number(d.win)
      this.overText = (win ? '你赢了！' : '你输了') + ' 倍数 ×' + this.mult
      this.cmsg = this.overText
      this.log('结算：' + (win ? '你赢了' : '你输了') + ' ×' + this.mult)
      if (win) this.sfxWin(); else this.sfxLose()
      try {
        const res = await request('game_center.php', {
          action: 'settle',
          session_id: this.cfg.session_id,
          outcome: JSON.stringify({
            win: win ? 1 : 0,
            multiplier: this.mult,
            role: (this.landlord === 0 ? 'landlord' : 'peasant'),
            seats: [0, 1, 2].map(i => ({ seat: i, name: this.seatInfo(i).name, isUser: i === 0 }))
          }),
          replay: JSON.stringify({ duration: 0, actions: [] })
        }, 'POST')
        if (res && res.code === 0 && res.data) {
          const r = res.data
          this.points = Number(r.points || this.points)
          this.result = {
            win: win,
            sub: this.overText,
            tip: '',
            payout: Number(r.payout || 0),
            penalty: Number(r.penalty || 0),
            entry: Number(r.entry || 0)
          }
        }
      } catch (e) {}
      this.showResult = true
    },

    /* ---------------- 牌 ---------------- */
    code(c) { return String(c.suit) + c.rank },
    deck() {
      const a = []
      const SUITS = ['S', 'H', 'C', 'D']
      SUITS.forEach(s => { for (let r = 2; r <= 14; r++) a.push({ suit: s, rank: r }) })
      a.push({ suit: 'J', rank: 15 })
      a.push({ suit: 'J', rank: 16 })
      return a
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t
      }
      return arr
    },
    ord(r) { return r === 2 ? 15 : (r >= 3 && r <= 14 ? r : r + 1) },
    /* 用登记过的延时器：页面销毁时被清掉，Promise 不再 resolve，
       游戏循环自然停在原地，不会在页面没了之后继续操作 */
    sleep(ms) { return new Promise(r => this.later(r, ms)) },
    log(t) {
      this.logs.push(t)
      if (this.logs.length > 40) this.logs.shift()
      this.$nextTick(() => { this.logScroll = 999999 })
    },
    rec(a, data) { this.replayActions.push(Object.assign({ t: Date.now() - this.replayStart, a: 'ddz_' + a }, data || {})) },

    /* ---------------- 牌型识别 ---------------- */
    detect(cards) {
      if (!cards || !cards.length) return null
      const n = cards.length
      const cnt = {}
      cards.forEach(c => { const o = this.ord(c.rank); cnt[o] = (cnt[o] || 0) + 1 })
      const ords = Object.keys(cnt).map(Number).sort((a, b) => a - b)
      const groups = ords.map(o => ({ o: o, n: cnt[o] }))
      if (n === 1) return { type: 'single', key: ords[0], len: 1 }
      if (n === 2) {
        if (cnt[16] && cnt[17]) return { type: 'rocket', key: 100, len: 2 }
        if (groups[0].n === 2) return { type: 'pair', key: ords[0], len: 2 }
        return null
      }
      if (n === 3 && groups[0].n === 3) return { type: 'triple', key: ords[0], len: 3 }
      if (n === 4) {
        if (groups[0].n === 4) return { type: 'bomb', key: ords[0], len: 4 }
        if (groups.length === 2 && groups.some(g => g.n === 3) && groups.some(g => g.n === 1)) return { type: 'triple_single', key: groups.find(g => g.n === 3).o, len: 4 }
        return null
      }
      if (n === 5) {
        if (groups.some(g => g.n === 3) && groups.some(g => g.n === 2)) return { type: 'triple_pair', key: groups.find(g => g.n === 3).o, len: 5 }
      }
      if (n === 6) {
        const fours = groups.filter(g => g.n === 4)
        const singles = groups.filter(g => g.n === 1)
        if (fours.length === 1 && singles.length === 2) return { type: 'four_two', key: fours[0].o, len: 6 }
      }
      if (n === 8) {
        const fours = groups.filter(g => g.n === 4)
        const pairs = groups.filter(g => g.n === 2)
        if (fours.length === 1 && pairs.length === 2) return { type: 'four_two_pair', key: fours[0].o, len: 8 }
      }
      if (n >= 5 && groups.every(g => g.n === 1) && ords[ords.length - 1] <= 14) {
        if (this.consecutive(ords)) return { type: 'straight', key: ords[ords.length - 1], len: n }
      }
      if (n >= 6 && n % 2 === 0 && groups.every(g => g.n === 2) && ords[ords.length - 1] <= 14) {
        if (this.consecutive(ords)) return { type: 'pairs_straight', key: ords[ords.length - 1], len: n }
      }
      const tripleOrds = groups.filter(g => g.n >= 3 && g.o <= 14).map(g => g.o).sort((a, b) => a - b)
      const windows = this.findPlaneWindows(tripleOrds)
      if (n % 3 === 0) {
        const k = n / 3
        if (k >= 2 && windows.some(w => w.length === k && w.length * 3 === n && groups.every(g => g.n === 3))) {
          const w = windows.find(w => w.length === k)
          return { type: 'plane', key: w[w.length - 1], len: n }
        }
      }
      if (n % 4 === 0) {
        const k = n / 4
        if (k >= 2) {
          const w = windows.find(x => x.length === k && this.wingsAfter(cnt, x, k, 1))
          if (w) return { type: 'plane_single', key: w[w.length - 1], len: n }
        }
      }
      if (n % 5 === 0) {
        const k = n / 5
        if (k >= 2) {
          const w = windows.find(x => x.length === k && this.wingsAfter(cnt, x, k, 2))
          if (w) return { type: 'plane_pair', key: w[w.length - 1], len: n }
        }
      }
      return null
    },
    consecutive(ords) {
      for (let i = 1; i < ords.length; i++) if (ords[i] !== ords[i - 1] + 1) return false
      return true
    },
    findPlaneWindows(tripleOrds) {
      const res = []
      for (let i = 0; i < tripleOrds.length; i++) {
        const w = [tripleOrds[i]]
        for (let j = i + 1; j < tripleOrds.length; j++) {
          if (tripleOrds[j] === w[w.length - 1] + 1) w.push(tripleOrds[j]); else break
        }
        for (let k = 2; k <= w.length; k++) res.push(w.slice(0, k))
      }
      return res
    },
    wingsAfter(cnt, window, k, kind) {
      const left = Object.assign({}, cnt)
      window.forEach(o => { left[o] -= 3; if (left[o] <= 0) delete left[o] })
      const total = Object.values(left).reduce((a, b) => a + b, 0)
      if (kind === 1) return total === k
      if (total !== 2 * k) return false
      return Object.values(left).every(v => v === 2 || v === 0) && Object.keys(left).length === k
    },
    canBeat(prev, cur) {
      if (!prev) return true
      if (cur.type === 'rocket') return true
      if (cur.type === 'bomb') {
        if (prev.type === 'rocket') return false
        if (prev.type === 'bomb') return cur.key > prev.key
        return true
      }
      if (prev.type === 'bomb' || prev.type === 'rocket') return false
      return cur.type === prev.type && cur.len === prev.len && cur.key > prev.key
    },
    groupMap(hand) {
      const m = new Map()
      hand.forEach(c => { const o = this.ord(c.rank); if (!m.has(o)) m.set(o, []); m.get(o).push(c) })
      return m
    },
    take(m, o, n) { return m.get(o).slice(0, n) },
    lowestOutside(m, exclude, units, asPair) {
      const rest = [...m.keys()].filter(o => !exclude.includes(o)).sort((a, b) => a - b)
      if (!asPair) {
        const res = []
        for (const o of rest) {
          const av = m.get(o)
          for (const cd of av) { if (res.length < units) res.push(cd) }
          if (res.length === units) return res
        }
        return res.length === units ? res : null
      }
      const res = []
      for (const o of rest) {
        if (m.get(o).length >= 2 && res.length / 2 < units) res.push(...m.get(o).slice(0, 2))
        if (res.length === units * 2) return res
      }
      return null
    },
    windowRanks(ranks, len, highGt) {
      const avail = ranks.filter(o => o >= 3 && o <= 14)
      for (let i = 0; i + len - 1 < avail.length; i++) {
        const w = avail.slice(i, i + len)
        if (this.consecutive(w) && w[len - 1] > highGt) return w
      }
      return null
    },
    findBeat(hand, prev, allowBomb) {
      if (!prev) return this.leadPlay(hand)
      const m = this.groupMap(hand)
      const ords = [...m.keys()].sort((a, b) => a - b)
      const pairRanks = ords.filter(o => m.get(o).length >= 2)
      const tripleRanks = ords.filter(o => m.get(o).length >= 3 && o <= 14)
      const bombRanks = ords.filter(o => m.get(o).length === 4)
      if (prev.type === 'single') {
        const o = ords.find(x => x > prev.key); if (o != null) return this.take(m, o, 1)
      } else if (prev.type === 'pair') {
        const o = pairRanks.find(x => x > prev.key); if (o != null) return this.take(m, o, 2)
      } else if (prev.type === 'triple') {
        const o = tripleRanks.find(x => x > prev.key); if (o != null) return this.take(m, o, 3)
      } else if (prev.type === 'triple_single') {
        const o = tripleRanks.find(x => x > prev.key)
        if (o != null) { const kick = this.lowestOutside(m, [o], 1); if (kick) return [...this.take(m, o, 3), ...kick] }
      } else if (prev.type === 'triple_pair') {
        const o = tripleRanks.find(x => x > prev.key)
        if (o != null) { const kick = this.lowestOutside(m, [o], 2, true); if (kick) return [...this.take(m, o, 3), ...kick] }
      } else if (prev.type === 'straight') {
        const r = this.windowRanks(ords, prev.len, prev.key)
        if (r) return r.flatMap(o => this.take(m, o, 1))
      } else if (prev.type === 'pairs_straight') {
        const r = this.windowRanks(pairRanks, prev.len / 2, prev.key)
        if (r) return r.flatMap(o => this.take(m, o, 2))
      } else if (String(prev.type).indexOf('plane') === 0) {
        const k = prev.type === 'plane' ? prev.len / 3 : (prev.type === 'plane_single' ? prev.len / 4 : prev.len / 5)
        const wins = this.findPlaneWindows(tripleRanks).filter(w => w.length === k && w[w.length - 1] > prev.key)
        for (const w of wins) {
          if (prev.type === 'plane') return w.flatMap(o => this.take(m, o, 3))
          const kind = prev.type === 'plane_single' ? 1 : 2
          const wings = this.lowestOutside(m, w, k, kind === 2)
          if (wings && wings.length === k * kind) return [...w.flatMap(o => this.take(m, o, 3)), ...wings]
        }
      } else if (prev.type === 'four_two') {
        const o = bombRanks.find(x => x > prev.key)
        if (o != null) { const kick = this.lowestOutside(m, [o], 2); if (kick && kick.length === 2) return [...this.take(m, o, 4), ...kick] }
      } else if (prev.type === 'four_two_pair') {
        const o = bombRanks.find(x => x > prev.key)
        if (o != null) { const kick = this.lowestOutside(m, [o], 2, true); if (kick && kick.length === 4) return [...this.take(m, o, 4), ...kick] }
      }
      if (allowBomb) {
        if (prev.type !== 'bomb' && prev.type !== 'rocket') { if (bombRanks.length) return this.take(m, bombRanks[0], 4) }
        else if (prev.type === 'bomb') { const o = bombRanks.find(x => x > prev.key); if (o != null) return this.take(m, o, 4) }
        if (prev.type !== 'rocket' && m.has(16) && m.has(17)) return [m.get(16)[0], m.get(17)[0]]
      }
      return null
    },
    leadPlay(hand) {
      const m = this.groupMap(hand)
      const ords = [...m.keys()].sort((a, b) => a - b)
      const pairs = ords.filter(o => m.get(o).length >= 2 && o <= 14)
      const triples = ords.filter(o => m.get(o).length >= 3 && o <= 14)
      const singles = ords.filter(o => o <= 14)
      const cands = []
      if (singles.length) cands.push({ key: singles[0], cards: this.take(m, singles[0], 1), n: 1 })
      if (pairs.length) cands.push({ key: pairs[0], cards: this.take(m, pairs[0], 2), n: 2 })
      if (triples.length) {
        const t = triples[0]
        const kick = this.lowestOutside(m, [t], 1)
        if (kick) cands.push({ key: t, cards: [...this.take(m, t, 3), ...kick], n: 4 })
      }
      const s5 = this.windowRanks(singles, 5, 0)
      if (s5 && hand.length >= 7) cands.push({ key: s5[4], cards: s5.flatMap(o => this.take(m, o, 1)), n: 5 })
      if (!cands.length) {
        if (m.has(16) && m.has(17)) return [m.get(16)[0], m.get(17)[0]]
        const b = ords.find(o => m.get(o).length === 4)
        if (b) return this.take(m, b, 4)
        return this.take(m, ords[0], Math.min(m.get(ords[0]).length, hand.length))
      }
      cands.sort((a, b) => a.key - b.key || b.n - a.n)
      return cands[0].cards
    },

    /* ---------------- 叫地主 ---------------- */
    handStrengthOf(h) {
      let s = 0
      h.forEach(c => { const o = this.ord(c.rank); if (o === 15) s += 1; if (o >= 16) s += 2 })
      const m = this.groupMap(h)
      m.forEach(v => { if (v.length === 4) s += 3 })
      return s
    },
    async bidding(attempt) {
      this.over = false
      this.landlord = -1
      this.bottomCards = []
      this.bottomShown = false
      this.mult = 1
      this.lastPlay = null
      this.lastBy = -1
      this.passStreak = 0
      this.turnSeat = 0
      this.playCounts = [0, 0, 0]
      this.selected = []
      this.plays = [{}, {}, {}]
      this.phase = 'bid'
      this.started = false
      /* 按钮数量变了 → 手牌可用宽度也变了，重新量 */
      this.measureHand()
      this.replayStart = Date.now()
      this.replayActions = []
      this.logs = []

      const deck = this.shuffle(this.deck())
      const hands = [[], [], []]
      for (let k = 0; k < 17; k++) for (let i = 0; i < 3; i++) hands[i].push(deck.pop())
      this.bottomCards = [deck.pop(), deck.pop(), deck.pop()]
      this.hands = hands
      this.cmsg = '叫地主阶段'
      this.rec('deal', { attempt: attempt })
      this.log('发牌完成，开始叫地主')

      let highest = 0, highSeat = -1
      const start = attempt % 3
      for (let k = 0; k < 3; k++) {
        const i = (start + k) % 3
        this.turnSeat = i
        let bid = 0
        if (i === 0) {
          this.cmsg = '轮到你叫地主'
          bid = await this.waitBid(highest)
        } else {
          this.cmsg = this.seatInfo(i).name + ' 思考中…'
          await this.sleep(750)
          const s = this.handStrengthOf(hands[i])
          let want = s >= 7 ? 3 : s >= 5 ? 2 : s >= 3 ? 1 : 0
          if (Math.random() < 0.25 && want > 0) want -= 1
          bid = want > highest ? want : 0
        }
        this.rec('bid', { seat: i, bid: bid })
        this.log(this.seatInfo(i).name + (bid ? ' 叫 ' + bid + ' 分' : ' 不叫'))
        if (bid > highest) { highest = bid; highSeat = i }
        if (bid === 3) break
      }
      if (highSeat < 0) {
        if (attempt < 2) { this.log('无人叫地主，重新发牌'); await this.sleep(700); return this.bidding(attempt + 1) }
        highSeat = [0, 1, 2].reduce((a, b) => this.handStrengthOf(hands[b]) > this.handStrengthOf(hands[a]) ? b : a, 0)
        highest = 1
        this.log('强制 ' + this.seatInfo(highSeat).name + ' 当地主')
      }
      this.landlord = highSeat
      this.base = Math.max(1, highest)
      this.mult = this.base
      hands[this.landlord] = hands[this.landlord].concat(this.bottomCards)
      this.hands = hands
      this.bottomShown = true
      this.rec('landlord', { seat: this.landlord, base: this.base })
      this.log(this.seatInfo(this.landlord).name + ' 成为地主，底分 ' + this.base)
      this.started = true
      this.phase = 'play'
      this.measureHand()
      this.cmsg = this.seatInfo(this.landlord).name + ' 地主先出'
      await this.sleep(800)
      this.turnSeat = this.landlord
      this.playLoop()
    },
    waitBid(highest) {
      this.highestBid = highest
      return new Promise(res => { this.bidResolve = res })
    },
    doBid(s) {
      if (!this.bidResolve) return
      /* 叫分语音：1/2/3 分 → ScoreOrder1~3；不叫 → ScoreNoOrder */
      if (s > 0) this.playSnd('Man_ScoreOrder' + s)
      else this.playSnd('Man_ScoreNoOrder')
      const r = this.bidResolve
      this.bidResolve = null
      r(s)
    },

    /* ---------------- 出牌循环 ---------------- */
    async playLoop() {
      while (!this.over) {
        const i = this.turnSeat % 3
        this.turnSeat = i
        let cards = null, isPass = false
        if (i === 0) {
          cards = await this.waitUserPlay()
          if (this.over) return
          if (cards === null) isPass = true
        } else {
          this.cmsg = this.seatInfo(i).name + ' 思考中…'
          await this.sleep(780)
          const act = this.aiDecide(i)
          if (act === null) isPass = true; else cards = act
        }
        if (this.over) return
        if (isPass) this.doPass(i); else this.doPlay(i, cards)
        if (this.over) return
        this.turnSeat++
      }
    },
    waitUserPlay() {
      this.selected = []
      this.cmsg = this.lastPlay ? '跟牌或不要' : '该你出牌（主动出牌）'
      return new Promise(res => { this.playResolve = res })
    },
    userPass() {
      if (!this.lastPlay || !this.playResolve) return
      const r = this.playResolve
      this.playResolve = null
      r(null)
    },
    /* 提示：压得过就直接打出去，压不过就自动"不出" */
    hint() {
      if (!this.playResolve) return
      /* 轮到我主动出牌：没有"压不过"一说，直接出最小的一手 */
      if (!this.lastPlay) {
        const lead = this.leadPlay(this.hands[0])
        if (!lead || !lead.length) { uni.showToast({ title: '没有可出的牌', icon: 'none' }); return }
        this.selected = lead.map(c => this.code(c))
        this.userPlay()
        return
      }
      const cand = this.findBeat(this.hands[0], this.lastPlay, false)
      if (!cand || !cand.length) { this.userPass(); return }
      this.selected = cand.map(c => this.code(c))
      this.userPlay()
    },
    userPlay() {
      if (!this.playResolve) return
      const cards = (this.hands[0] || []).filter(c => this.selected.includes(this.code(c)))
      if (!cards.length) { uni.showToast({ title: '请选择要出的牌', icon: 'none' }); return }
      const info = this.detect(cards)
      if (!info) { uni.showToast({ title: '牌型不合法', icon: 'none' }); return }
      if (this.lastPlay && !this.canBeat(this.lastPlay, info)) { uni.showToast({ title: '压不过上家的牌', icon: 'none' }); return }
      const r = this.playResolve
      this.playResolve = null
      this.selected = []
      r(cards)
    },
    toggleSelect(c) {
      const key = this.code(c)
      const idx = this.selected.indexOf(key)
      if (idx >= 0) this.selected.splice(idx, 1)
      else this.selected.push(key)
    },
    isSelected(c) { return this.selected.includes(this.code(c)) },

    aiDecide(i) {
      const h = this.hands[i]
      if (!this.lastPlay) return this.leadPlay(h)
      const enemyNear = this.enemyOf(i).some(s => this.hands[s].length <= 3)
      const teammateLeading = i !== this.landlord && this.lastBy !== this.landlord && this.lastBy !== i
      if (teammateLeading) {
        if (this.lastPlay.key <= 8 && h.length <= 4) return this.findBeat(h, this.lastPlay, false)
        return null
      }
      const cand = this.findBeat(h, this.lastPlay, false)
      if (!cand) {
        if (enemyNear) return this.findBeat(h, this.lastPlay, true)
        return null
      }
      const info = this.detect(cand)
      if (info.key >= 15 && !enemyNear && Math.random() < 0.45) {
        return enemyNear ? this.findBeat(h, this.lastPlay, true) : null
      }
      return cand
    },
    enemyOf(i) {
      if (i === this.landlord) return [0, 1, 2].filter(s => s !== this.landlord)
      return [this.landlord]
    },

    doPass(i) {
      this.plays[i] = { pass: true }
      this.rec('pass', { seat: i })
      this.sfxPass()
      this.log(this.seatInfo(i).name + ' 不要')
      this.passStreak++
      if (this.passStreak >= 2) {
        this.lastPlay = null; this.lastBy = -1; this.passStreak = 0
        this.plays = [{}, {}, {}]
      }
    },
    doPlay(i, cards) {
      const info = this.detect(cards)
      const codes = cards.map(c => this.code(c))
      this.hands[i] = (this.hands[i] || []).filter(c => !codes.includes(this.code(c)))
      this.playCounts[i]++
      this.plays[i] = { cards: cards }
      if (info.type === 'bomb' || info.type === 'rocket') {
        this.mult *= 2
        this.log((info.type === 'rocket' ? '火箭' : '炸弹') + '！倍数 ×' + this.mult)
      }
      /* 真人配音：按牌型报牌 */
      this.speakPlay(cards, info)
      /* 只剩一张时，等报牌语音说完再报警 */
      if (this.hands[i] && this.hands[i].length === 1) this.later(() => this.playSnd('Man_baojing1'), 1300)
      this.rec('play', { seat: i, type: info.type, key: info.key, cards: cards.map(c => this.code(c)) })
      this.log(this.seatInfo(i).name + ' 出牌：' + this.typeName(info))
      this.lastPlay = info; this.lastBy = i; this.passStreak = 0
      this.cmsg = this.seatInfo(i).name + '：' + this.typeName(info) + ' · ×' + this.mult
      if (!this.hands[i].length) this.endGame(i)
    },
    typeName(info) {
      return {
        single: '单张', pair: '对子', triple: '三张', triple_single: '三带一', triple_pair: '三带二',
        straight: '顺子(' + info.len + ')', pairs_straight: '连对(' + info.len + ')',
        plane: '飞机', plane_single: '飞机带单', plane_pair: '飞机带对',
        four_two: '四带二', four_two_pair: '四带两对', bomb: '炸弹', rocket: '火箭'
      }[info.type] || info.type
    },

    endGame(emptySeat) {
      this.over = true
      this.phase = 'done'
      const landlordWin = emptySeat === this.landlord
      const peas = [0, 1, 2].filter(s => s !== this.landlord)
      const peasPlays = peas.reduce((a, s) => a + this.playCounts[s], 0)
      let spring = 0
      if (landlordWin && peasPlays === 0) { this.mult *= 2; spring = 1 }
      else if (!landlordWin && this.playCounts[this.landlord] === 1) { this.mult *= 2; spring = 2 }
      const userIsLandlord = this.landlord === 0
      const win = userIsLandlord ? landlordWin : !landlordWin
      this.overText = (landlordWin ? '地主' : '农民') + '获胜！倍数 ×' + this.mult + (spring ? (spring === 1 ? '（春天）' : '（反春）') : '')
      this.cmsg = this.overText
      this.rec('win', { landlord: this.landlord, landlordWin: landlordWin, multiplier: this.mult, spring: spring })
      this.log('结算：' + (win ? '你赢了' : '你输了') + ' ×' + this.mult)
      /* 春天先喊，胜负音乐等它喊完 */
      if (spring) {
        this.sfxSpring()
        this.later(() => { if (win) this.sfxWin(); else this.sfxLose() }, 1700)
      } else if (win) this.sfxWin(); else this.sfxLose()
      const outcome = { game: 'doudizhu', role: userIsLandlord ? 'landlord' : 'peasant', win: win ? 1 : 0, multiplier: this.mult, landlord: this.landlord, landlordWin: landlordWin ? 1 : 0, spring: spring }
      this.later(() => this.settle(outcome), 1400)
    },

    /* ---------------- 结算 ---------------- */
    async settle(outcome) {
      const replay = {
        game_type: 'doudizhu',
        room: { id: this.cfg.room_id, name: this.cfg.room_name, entry: this.cfg.entry },
        seats: [0, 1, 2].map(i => ({ seat: i, name: this.seatInfo(i).name, isUser: i === 0 })),
        bottom: this.bottomCards.map(c => this.code(c)),
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

      const win = !!outcome.win
      const d = (r && r.data) ? r.data : {}
      const payout = parseInt(d.payout || 0, 10)
      const penalty = parseInt(d.penalty || 0, 10)
      const frozen = Number(d.frozen || 0) === 1
      if (d.points !== undefined) this.points = Number(d.points)
      const entry = Number(this.cfg.entry || 0)
      this.result = {
        win: win,
        sub: win ? ('获胜奖励 ' + payout + ' 积分' + (frozen ? ' · 冻结暂存中' : ' · 已发放至游戏邮箱')) : ('失败损失 ' + (entry + penalty) + ' 积分 · 倍数 ×' + this.mult),
        tip: (r && r.code !== 0) ? (r.msg || '') : ('当前积分：' + this.points),
        payout: payout,
        penalty: penalty,
        entry: entry
      }
      this.done = true
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
          this.hands = [[], [], []]
          this.plays = [{}, {}, {}]
          this.bidding(0)
          return
        }
        uni.showToast({ title: (res && res.msg) || '开局失败', icon: 'none' })
      } catch (e) { uni.showToast({ title: (e && e.msg) || '开局失败', icon: 'none' }) }
    }
  }
}
</script>

<style scoped>
/* ================= 斗地主牌桌（竖屏，确定性布局） =================
   重要：.dd-bg 是 position:fixed，会绘制在 static 内容之上，
   所以每个内容区都必须显式 position + z-index，否则会被背景图整层遮住 */
.dd { position: fixed; left: 0; right: 0; top: 0; bottom: 0; overflow: hidden; display: flex; flex-direction: column; background: #0a2b1a; }
.dd-bg { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.dd-bg-img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.dd-bg-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .3); }

/* ---------- 顶栏 ---------- */
.dd-top { position: relative; z-index: 2; flex: 0 0 auto; background: rgba(6,35,22,.92); border-bottom: 1px solid rgba(255,255,255,.08); }
.dd-top-bar { min-height: 42px; display: flex; align-items: center; padding: 2px 12px; gap: 10px; }
.dd-exit { flex: 0 0 auto; font-size: 12px; color: #bff0d4; padding: 5px 13px; border-radius: 999px; background: rgba(255,255,255,.12); }
.dd-top-mid { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; overflow: hidden; }
.dd-room { font-size: 13px; color: #fff; font-weight: 700; white-space: nowrap; }
.dd-sub { font-size: 10px; color: rgba(255,255,255,.62); white-space: nowrap; }
.dd-mult { font-size: 10px; color: #ffd66b; white-space: nowrap; }
.dd-me-mini { flex: 0 0 auto; display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); }
.dd-me-mini.active { border-color: #ffd77a; box-shadow: 0 0 0 2px rgba(255,215,122,.3); }
.dd-me-mini .dd-av { width: 24px; height: 24px; }
.dd-pts { flex: 0 0 auto; font-size: 13px; color: #ffd77a; font-weight: 700; }

.dd-loading { position: relative; z-index: 2; flex: 1 1 auto; display: flex; align-items: center; justify-content: center; }
.dd-loading text { font-size: 13px; color: rgba(255,255,255,.8); }

/* ---------- 主体：上排两个对手 + 下面出牌区 ---------- */
.dd-main { position: relative; z-index: 2; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 8px 10px; }
.dd-seats { flex: 0 0 auto; display: flex; gap: 8px; }
.dd-side { flex: 1 1 0; min-width: 0; min-height: 104px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 10px 8px; border-radius: 14px; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.2); }
.dd-side.active { border-color: #ffd77a; background: rgba(255,215,122,.16); box-shadow: 0 0 0 2px rgba(255,215,122,.3); }
.dd-side.folded { opacity: .5; }
.dd-side-head { display: flex; align-items: center; gap: 8px; }
.dd-side-name { display: flex; flex-direction: column; min-width: 0; }

.dd-mid { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }

/* ---------- 扑克牌（真实牌面图 142x192 → 高 = 宽 × 1.352） ---------- */
.pc { position: relative; width: 36px; height: 49px; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; }
.pc-img { width: 100%; height: 100%; display: block; }
.pc.sm { width: 30px; height: 41px; }
.pc.mini { width: 15px; height: 20px; }
.pc.sel { transform: translateY(-10px); box-shadow: 0 0 0 2px #ffd77a, 0 4px 10px rgba(0,0,0,.5); }
.pc-hand { flex-shrink: 0; transition: transform .12s ease; }

/* ---------- 头像 / 标签 ---------- */
.dd-av { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.16); flex-shrink: 0; }
.dd-av-ai, .dd-av-ph { display: flex; align-items: center; justify-content: center; font-size: 11px; color: #d8f5e5; font-weight: 700; }
.dd-name { font-size: 12px; color: #fff; white-space: nowrap; }
.dd-tag { flex-shrink: 0; font-size: 10px; color: #1a2a1f; background: #ffd77a; padding: 2px 7px; border-radius: 5px; font-weight: 700; }
.dd-cnt { font-size: 11px; color: #ffd66b; font-weight: 800; white-space: nowrap; }

/* ---------- 出牌展示 / 日志 ---------- */
.dd-play { min-height: 30px; display: flex; align-items: center; justify-content: center; }
.dd-playcards { display: flex; gap: 3px; }
.dd-pass { padding: 4px 10px; border-radius: 999px; background: rgba(0,0,0,.5); font-size: 12px; color: #fff; }
.dd-myplay { min-height: 44px; }
.dd-bottom { display: flex; gap: 6px; }
.dd-cmsg { font-size: 13px; color: #bff0d4; text-align: center; }
.dd-log { width: 100%; height: 62px; padding: 4px 10px; border-radius: 8px; background: rgba(0,0,0,.4); flex: 0 0 auto; }
.dd-log-line { padding: 1px 0; }
.dd-log-line text { font-size: 10px; color: rgba(255,255,255,.72); line-height: 1.5; }

/* ---------- 底部：手牌一行铺满 + 按钮一行 ---------- */
.dd-foot { position: relative; z-index: 2; flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px; padding: 6px 10px 10px; background: rgba(6,35,22,.94); border-top: 1px solid rgba(255,255,255,.08); }
.dd-hand { width: 100%; }
.dd-hand-row { display: flex; align-items: flex-end; justify-content: center; padding: 10px 0 2px; }
.dd-ctrl { display: flex; justify-content: center; align-items: center; gap: 10px; }
.tbtn { flex: 0 0 auto; min-width: 76px; height: 42px; line-height: 42px; text-align: center; border-radius: 999px; padding: 0 16px; box-sizing: border-box; background: linear-gradient(135deg, #ff3b5c, #ff6a3d); color: #fff; font-size: 14px; font-weight: 600; }
.tbtn.ghost { background: rgba(255,255,255,.18); }
.tbtn.dis { opacity: .4; }
.dd-wait { text-align: center; font-size: 13px; color: rgba(255,255,255,.85); padding: 12px 0; }

/* ---------- 结算弹窗 ---------- */
.dd-mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 900; background: rgba(0,0,0,.66); display: flex; align-items: center; justify-content: center; padding: 16px; }
.dd-sheet { width: 88%; max-width: 420px; max-height: 86vh; overflow-y: auto; background: #171a2b; border-radius: 18px; padding: 22px 24px; display: flex; flex-direction: column; gap: 8px; }
.dd-res-emoji { font-size: 40px; text-align: center; }
.dd-res-title { font-size: 18px; font-weight: 700; color: #fff; text-align: center; }
.dd-res-sub { font-size: 12px; color: #9ba0ba; text-align: center; line-height: 1.7; }
.dd-res-num { font-size: 34px; font-weight: 800; text-align: center; color: #9ba0ba; }
.dd-res-num.up { color: #ff6a8a; }
.dd-res-num.down { color: #6aa8ff; }
.dd-res-tip { font-size: 11px; color: #83879e; text-align: center; }
.dd-res-btns { display: flex; gap: 12px; margin-top: 10px; }
.dd-res-btns .tbtn { flex: 1 1 0; min-width: 0; }
</style>
