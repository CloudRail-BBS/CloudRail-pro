<template>
  <view class="gc-hall">
    <view class="gc-bg"><view class="gc-blob"></view></view>

    <!-- 顶栏 -->
    <view class="gc-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="gc-nav-bar">
        <view class="gc-back" @click="goBack">‹</view>
        <text class="gc-nav-title">游戏中心</text>
        <view class="gc-nav-right">
          <view class="gc-coin"><text class="gc-coin-ico">◆</text><text class="gc-coin-num">{{ points }}</text></view>
          <view class="gc-nav-btn" @click="goMail">邮箱<text v-if="mailUnread > 0" class="gc-dot">{{ mailUnread > 99 ? '99+' : mailUnread }}</text></view>
          <view class="gc-nav-btn" @click="goRecords">战绩</view>
        </view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="gc-body">
      <!-- 玩法切换 -->
      <view class="gc-tabs">
        <view class="gc-tab" :class="{ active: gameType === 'zhajinhua' }" @click="switchType('zhajinhua')">
          <text class="gc-tab-t">炸金花</text><text class="gc-tab-s">三张牌 · 比胆识</text>
        </view>
        <view class="gc-tab" :class="{ active: gameType === 'doudizhu' }" @click="switchType('doudizhu')">
          <text class="gc-tab-t">斗地主</text><text class="gc-tab-s">三人局 · 抢地主</text>
        </view>
      </view>

      <view class="gc-rule">
        <text class="gc-rule-t">{{ ruleText }}</text>
      </view>

      <view v-if="frozen" class="gc-freeze">
        <text>平台房间奖励临时冻结中，获胜奖励将暂存于游戏邮箱，解冻后可领取</text>
      </view>

      <!-- 房号搜索 -->
      <view class="gc-search">
        <input class="gc-search-in" type="number" maxlength="10" v-model="roomNoInput" placeholder="输入房间号，进入玩家自建房" />
        <view class="gc-search-btn" @click="findRoom">进入</view>
      </view>

      <view class="gc-sec-title">
        <text>开放房间</text>
        <view v-if="userRoom" class="gc-create" @click="openCreate">＋ 创建房间</view>
      </view>

      <!-- 房间列表 -->
      <view v-if="list.length === 0" class="gc-empty">
        <text>官方暂未开放房间</text>
        <text class="gc-empty-s">可点击右上角「创建房间」消耗房卡自行开局，或输入好友房间号进入</text>
      </view>

      <view
        v-for="r in list"
        :key="r.id"
        class="gc-room"
        :class="{ mine: Number(r.is_mine) === 1, found: r.id === foundId }"
        @click="openStart(r)"
      >
        <view class="gc-room-ico">{{ gameType === 'doudizhu' ? '♛' : '♠' }}</view>
        <view class="gc-room-main">
          <view class="gc-room-name">
            <text>{{ r.name }}</text>
            <text v-if="r.room_source === 'user'" class="gc-tag user">{{ Number(r.is_mine) === 1 ? '我的房间' : '玩家自建' }}</text>
            <text v-if="Number(r.has_password) === 1" class="gc-tag lock">密码房</text>
          </view>
          <view class="gc-room-meta">
            <text class="gc-meta">入门 {{ r.entry_fee }} 积分/局</text>
            <text class="gc-meta">底分 {{ r.base_score }}</text>
            <text v-if="r.room_source === 'user'" class="gc-meta">房号 {{ r.id }}</text>
            <text class="gc-meta">已玩 {{ r.play_count }} 局</text>
          </view>
        </view>
        <view class="gc-room-right">
          <text v-if="r.room_source === 'user'" class="gc-room-no">#{{ r.id }}</text>
          <text v-else class="gc-room-open">{{ r.open_count }} 桌</text>
          <view class="gc-enter">进入</view>
        </view>
      </view>

      <view class="gc-tip">
        <text>入门费开局即扣除；获胜奖励发放至游戏邮箱，领取后到账。请理性娱乐，积分不可兑换现金。</text>
      </view>
    </view>

    <!-- 开局方式 -->
    <view v-if="showStart" class="gc-mask" @click="showStart = false">
      <view class="gc-sheet" @click.stop>
        <view class="gc-sheet-h">
          <text>{{ curRoom ? curRoom.name : '' }}</text>
          <text class="gc-x" @click="showStart = false">✕</text>
        </view>
        <view class="gc-li"><text class="gc-li-k">玩法</text><text class="gc-li-v">{{ gameType === 'doudizhu' ? '斗地主' : '炸金花' }}</text></view>
        <view class="gc-li"><text class="gc-li-k">入门费（开局扣除）</text><text class="gc-li-v gold">{{ curRoom ? curRoom.entry_fee : 0 }} 积分</text></view>
        <view class="gc-li"><text class="gc-li-k">结算规则</text><text class="gc-li-v sm">{{ ruleShort }}</text></view>

        <view v-if="needPwd" class="gc-pwd">
          <text class="gc-pwd-l">请输入房间密码</text>
          <input class="gc-pwd-in" type="number" maxlength="8" v-model="startPwd" placeholder="4~8 位数字密码" />
        </view>

        <view class="gc-modes">
          <view class="gc-mode" :class="{ active: pickedMode === 'ai' }" @click="pickedMode = 'ai'">
            <text class="gc-mode-t">AI 对局 <text class="gc-tag">秒开</text></text>
            <text class="gc-mode-s">{{ aiDesc }}</text>
          </view>
          <view class="gc-mode" :class="{ active: pickedMode === 'real', off: !canReal }" @click="canReal && (pickedMode = 'real')">
            <text class="gc-mode-t">真人对局</text>
            <text class="gc-mode-s">{{ canReal ? (matchWait + 's 内开局，不足由 AI 补位') : '玩家自建房仅支持人机对战' }}</text>
          </view>
        </view>

        <view class="gc-sheet-btn" @click="confirmStart">
          {{ pickedMode === 'real' ? ('匹配真人 · 扣 ' + (curRoom ? curRoom.entry_fee : 0) + ' 积分') : ('AI 秒开 · 扣 ' + (curRoom ? curRoom.entry_fee : 0) + ' 积分') }}
        </view>
      </view>
    </view>

    <!-- 匹配中 -->
    <view v-if="showMatch" class="gc-mask">
      <view class="gc-sheet">
        <view class="gc-match-h">正在匹配真人对手</view>
        <view class="gc-match-sub">{{ matchRoomName }}</view>
        <view class="gc-waiters">
          <view v-for="(w, i) in matchWaiters" :key="i" class="gc-waiter">
            <image v-if="w.avatar" class="gc-waiter-av" :src="w.avatar" mode="aspectFill"></image>
            <view v-else class="gc-waiter-av gc-waiter-ph">AI</view>
            <text class="gc-waiter-nm">{{ w.me ? '我' : w.name }}</text>
          </view>
        </view>
        <view class="gc-match-cnt">已就绪 {{ matchCount }} / 3 · 预计 {{ matchRemain }}s 后开局</view>
        <text class="gc-match-tip">真人不足时将由官方 AI 补位，凑齐 3 人立即开局。</text>
        <view class="gc-sheet-btn ghost" @click="cancelMatch">取消匹配</view>
      </view>
    </view>

    <!-- 创建房间 -->
    <view v-if="showCreate" class="gc-mask" @click="showCreate = false">
      <view class="gc-sheet" @click.stop>
        <view class="gc-sheet-h">
          <text>创建房间（房卡）</text>
          <text class="gc-x" @click="showCreate = false">✕</text>
        </view>
        <text class="gc-create-desc">创建房间需消耗 1 张对应等级的房卡（积分支付）；开房后好友可凭房间号进入，每局仍按等级收入门费。</text>

        <text class="gc-create-l">选择房间等级</text>
        <view class="gc-levels">
          <view v-for="lv in levels" :key="lv.key" class="gc-level" :class="{ active: crLevel === lv.key }" @click="crLevel = lv.key">
            <text class="gc-level-n">{{ lv.name }}</text>
            <text class="gc-level-s">房卡 {{ lv.card }}</text>
            <text class="gc-level-s">入门 {{ lv.entry }} · 底分 {{ lv.base }}</text>
          </view>
        </view>

        <text class="gc-create-l">开局人数</text>
        <view class="gc-players">
          <view class="gc-player" :class="{ active: crPlayers === 2 }" @click="crPlayers = 2"><text>2 人开局</text><text class="gc-player-s">1 位 AI</text></view>
          <view class="gc-player" :class="{ active: crPlayers === 3 }" @click="crPlayers = 3"><text>3 人对局</text><text class="gc-player-s">2 位 AI</text></view>
        </view>

        <text class="gc-create-l">房间密码 <text class="gc-create-ls">选填 · 4~8 位数字，留空任何人可进</text></text>
        <input class="gc-pwd-in" type="number" maxlength="8" v-model="crPwd" placeholder="不设置请留空" />

        <view class="gc-sheet-btn" @click="confirmCreate">{{ crSummary }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import wsManager from '../../common/ws.js'

export default {
  name: 'GameHall',
  data() {
    return {
      statusBarHeight: 20,
      gameType: 'zhajinhua',
      list: [],
      points: 0,
      levels: [],
      userRoom: 1,
      realMatch: 1,
      matchWait: 15,
      frozen: 0,
      myUid: '',
      mailUnread: 0,
      roomNoInput: '',
      foundId: 0,

      /* 开局 */
      showStart: false,
      curRoom: null,
      pickedMode: 'ai',
      startPwd: '',

      /* 匹配 */
      showMatch: false,
      matchRoomId: 0,
      matchRoomName: '',
      matchCount: 1,
      matchRemain: 0,
      matchWaiters: [],
      matchTimer: null,

      /* 创建房间 */
      showCreate: false,
      crLevel: 'primary',
      crPlayers: 2,
      crPwd: '',
      creating: false,

      wsOff: null
    }
  },
  computed: {
    ruleText() {
      return this.gameType === 'zhajinhua'
        ? '豹子＞顺金＞金花＞顺子＞对子＞散牌，特殊 235 可胜豹子。赢=双倍入门费+本人已下赌注，输=双倍入门费+已下赌注。'
        : '三人 17/17/20 张抢地主；火箭最大、炸弹翻倍，含顺子/连对/飞机/四带二，支持春天。'
    },
    ruleShort() {
      return this.gameType === 'zhajinhua' ? '双倍入门费 + 本人已下赌注' : '双倍胜负（赢 +2 倍入门费 / 输 -2 倍）'
    },
    aiDesc() {
      if (this.curRoom && this.curRoom.room_source === 'user' && Number(this.curRoom.min_players) === 2) return '与 1 位官方 AI 即时开局，2 人即可开局'
      return '与两位官方 AI 即时开局，无需等待'
    },
    canReal() {
      return Number(this.realMatch) === 1 && !(this.curRoom && this.curRoom.room_source === 'user')
    },
    needPwd() {
      return !!(this.curRoom && this.curRoom.room_source === 'user' && Number(this.curRoom.has_password) === 1 && Number(this.curRoom.is_mine) !== 1)
    },
    crSummary() {
      const lv = this.levels.find(x => x.key === this.crLevel)
      if (!lv) return '选择房间等级'
      return '立即开房 · 扣 ' + lv.card + ' 积分'
    }
  },
  onLoad(q) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    if (q && q.type === 'doudizhu') this.gameType = 'doudizhu'
    this.loadRooms()
    this.loadMailUnread()
    this.bindWs()
  },
  onShow() {
    // 从牌桌/邮箱返回时刷新积分与房间
    this.loadRooms()
    this.loadMailUnread()
  },
  onUnload() {
    this.clearMatch()
    if (this.wsOff) { try { this.wsOff() } catch (e) {} this.wsOff = null }
  },
  methods: {
    goBack() { uni.navigateBack() },
    goMail() { uni.navigateTo({ url: '/pages/game/mail' }) },
    goRecords() { uni.navigateTo({ url: '/pages/game/records' }) },

    switchType(t) {
      if (this.gameType === t) return
      this.gameType = t
      this.loadRooms()
    },

    async loadRooms() {
      try {
        const res = await request('game_center.php', { action: 'rooms', type: this.gameType }, 'GET')
        if (res && res.code === 0 && res.data) {
          const d = res.data
          this.list = Array.isArray(d.list) ? d.list : []
          this.points = Number(d.points || 0)
          this.levels = d.levels || []
          this.userRoom = Number(d.user_room || 0)
          this.realMatch = Number(d.real_match || 0)
          this.matchWait = Number(d.match_wait || 15)
          this.frozen = Number(d.frozen || 0)
          this.myUid = d.my_uid || ''
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '房间加载失败', icon: 'none' })
      }
    },

    async loadMailUnread() {
      try {
        const res = await request('game_center.php', { action: 'mail_unread' }, 'GET')
        if (res && res.code === 0 && res.data) this.mailUnread = Number(res.data.unread || 0)
      } catch (e) {}
    },

    async findRoom() {
      const no = parseInt(String(this.roomNoInput || '').replace(/\D/g, ''), 10)
      if (!no) { uni.showToast({ title: '请输入房间号', icon: 'none' }); return }
      try {
        const res = await request('game_center.php', { action: 'find_room', room_no: no }, 'GET')
        if (res && res.code === 0 && res.data && res.data.room) {
          const r = res.data.room
          if (r.game_type === 'doudizhu' && this.gameType !== 'doudizhu') this.gameType = 'doudizhu'
          const idx = this.list.findIndex(x => Number(x.id) === Number(r.id))
          if (idx >= 0) this.list.splice(idx, 1, r)
          else this.list.unshift(r)
          /* 玩家自建的房间：进房间等待页（可能要输密码、等人凑齐、等房主开始） */
          if (r.room_source === 'user') {
            uni.navigateTo({
              url: '/pages/game/room?no=' + (r.room_no || r.id) + '&type=' + (r.game_type || this.gameType)
            })
            return
          }
          this.foundId = Number(r.id)
          this.roomNoInput = ''
          this.openStart(r)
        } else {
          uni.showToast({ title: (res && res.msg) || '房间不存在', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '房间不存在', icon: 'none' })
      }
    },

    openStart(r) {
      if (Number(r.status) !== 1) { uni.showToast({ title: '该房间已关闭', icon: 'none' }); return }
      /* 玩家自建房：不进"选对局模式"的弹窗、更不能直接开一局 AI，
         统一进房间等待页（要密码就输密码 → 进房 → 等房主点开始） */
      if (r.room_source === 'user') {
        uni.navigateTo({
          url: '/pages/game/room?no=' + (r.room_no || r.id) + '&type=' + (r.game_type || this.gameType)
        })
        return
      }
      if (r.room_source !== 'user' && Number(r.open_count) <= 0) { uni.showToast({ title: '当前桌位已满，请稍后再来', icon: 'none' }); return }
      this.curRoom = r
      this.pickedMode = 'ai'
      this.startPwd = ''
      this.showStart = true
    },

    confirmStart() {
      if (this.pickedMode === 'real') return this.startMatch()
      this.doStart()
    },

    async doStart() {
      const r = this.curRoom
      if (!r) return
      const payload = { action: 'start', room_id: r.id }
      if (this.needPwd) {
        const pwd = String(this.startPwd || '').trim()
        if (!/^\d{4,8}$/.test(pwd)) { uni.showToast({ title: '请输入 4~8 位数字房间密码', icon: 'none' }); return }
        payload.room_password = pwd
      }
      try {
        const res = await request('game_center.php', payload, 'POST')
        if (res && res.code === 0 && res.data && res.data.session_id) {
          this.points = Number(res.data.points || this.points)
          this.showStart = false
          this.enterTable(res.data.session_id, r.id, res.data.game_type || this.gameType)
        } else {
          uni.showToast({ title: (res && res.msg) || '开局失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '开局失败', icon: 'none' })
      }
    },

    enterTable(sid, rid, type) {
      if (!sid) { uni.showToast({ title: '对局数据异常，请重试', icon: 'none' }); return }
      /* WS 推送和匹配接口的响应可能一前一后各来一次，
         不加这把锁就会连跳两次、叠出两层牌桌 */
      if (this._enteredAt && Date.now() - this._enteredAt < 10000) return
      this._enteredAt = Date.now()
      const page = type === 'doudizhu' ? 'ddz' : 'zha'
      uni.navigateTo({ url: '/pages/game/' + page + '?session=' + sid + '&room=' + rid })
    },

    /* ---------------- 真人匹配 ---------------- */
    async startMatch() {
      const r = this.curRoom
      if (!r) return
      this.matchRoomId = Number(r.id)
      this.matchRoomName = r.name + ' · 入门费 ' + r.entry_fee + ' 积分'
      this.matchWaiters = []
      this.matchCount = 1
      this.matchRemain = this.matchWait
      this.showStart = false
      this.showMatch = true
      try {
        const res = await request('game_center.php', { action: 'match_join', room_id: r.id }, 'POST')
        if (res && res.code === 0) this.handleMatch(res.data)
        else { this.clearMatch(); uni.showToast({ title: (res && res.msg) || '匹配失败', icon: 'none' }) }
      } catch (e) {
        this.clearMatch()
        uni.showToast({ title: (e && e.msg) || '匹配失败', icon: 'none' })
      }
    },

    handleMatch(data) {
      if (!data) return
      this.matchCount = Number(data.count || 1)
      this.matchRemain = Math.max(0, Number(data.remain || this.matchWait))
      this.matchWaiters = data.waiters || []
      if (data.points !== undefined) this.points = Number(data.points)
      if (data.status === 'matched' && data.session_id) {
        this.clearMatch()
        this.enterTable(data.session_id, data.room_id, data.game_type || this.gameType)
        return
      }
      if (!this.matchTimer) this.matchTimer = setInterval(this.pollMatch, 1500)
    },

    async pollMatch() {
      if (!this.matchRoomId) return
      try {
        const res = await request('game_center.php', { action: 'match_poll', room_id: this.matchRoomId }, 'GET')
        if (res && res.code === 0) this.handleMatch(res.data)
        else if (res && res.code) {
          /* 匹配被后台结束（房间关闭 / 不在队列里等），别静默把界面收掉，给个提示 */
          this.clearMatch()
          uni.showToast({ title: (res.msg || res.message) || '匹配已结束，请重新开始', icon: 'none' })
        }
      } catch (e) {}
    },

    async cancelMatch() {
      const roomId = this.matchRoomId
      this.clearMatch()
      try { await request('game_center.php', { action: 'match_cancel', room_id: roomId }, 'POST') } catch (e) {}
      this.loadRooms()
    },

    clearMatch() {
      if (this.matchTimer) { clearInterval(this.matchTimer); this.matchTimer = null }
      this.showMatch = false
      this.matchRoomId = 0
      this.matchWaiters = []
    },

    /* WS：同组匹配成功时立即切牌桌 */
    bindWs() {
      this.wsOff = wsManager.on('game_match', (data) => {
        if (!data) return
        /* 带了 session_id 就说明这条是「本局定向」推给我的，必须直接进牌桌。
           不能拿 matchRoomId 去挡：最后那个凑齐人数、触发开局的玩家，
           推送到达时他自己的匹配接口响应可能还没回来，matchRoomId 还是 0，
           一挡就变成「我进了牌桌、他没进」。 */
        if (data.session_id) {
          if (this.matchRoomId && data.room_id && Number(data.room_id) !== Number(this.matchRoomId)) {
            /* 我正在匹配另一个房间，这条不是我的局 */
            this.loadRooms()
            return
          }
          this.clearMatch()
          uni.showToast({ title: '匹配成功', icon: 'none' })
          this.enterTable(data.session_id, data.room_id, data.game_type || this.gameType)
          return
        }
        /* 推送里没带 session_id 时不能直接跳（会丢参数卡住），改为轮询拉取 */
        if (!this.matchRoomId || Number(data.room_id) !== Number(this.matchRoomId)) {
          this.loadRooms()
          return
        }
        uni.showToast({ title: '匹配成功', icon: 'none' })
        if (!this.matchTimer) this.matchTimer = setInterval(this.pollMatch, 1500)
        this.pollMatch()
      })
    },

    /* ---------------- 创建房间 ---------------- */
    openCreate() {
      if (!this.userRoom) { uni.showToast({ title: '自建房间功能暂未开放', icon: 'none' }); return }
      if (!this.levels.length) { uni.showToast({ title: '房间等级加载中', icon: 'none' }); return }
      this.crLevel = this.levels[0].key
      this.crPlayers = 2
      this.crPwd = ''
      this.showCreate = true
    },

    async confirmCreate() {
      if (this.creating) return
      const lv = this.levels.find(x => x.key === this.crLevel)
      if (!lv) return
      const pwd = String(this.crPwd || '').trim()
      if (pwd && !/^\d{4,8}$/.test(pwd)) { uni.showToast({ title: '房间密码需为 4~8 位数字，或留空', icon: 'none' }); return }
      this.creating = true
      try {
        const res = await request('game_center.php', {
          action: 'create_room',
          level: this.crLevel,
          min_players: this.crPlayers,
          game_type: this.gameType,
          room_password: pwd
        }, 'POST')
        if (res && res.code === 0 && res.data) {
          this.points = Number(res.data.points || this.points)
          this.showCreate = false
          uni.showToast({ title: '房间已创建', icon: 'none' })
          await this.loadRooms()
          /* 直接进房间等待页：房主在里面点「开始游戏」，朋友输房间号进来 */
          uni.navigateTo({
            url: '/pages/game/room?room_id=' + res.data.id + '&type=' + (res.data.game_type || this.gameType)
          })
        } else {
          uni.showToast({ title: (res && res.msg) || '创建失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '创建失败', icon: 'none' })
      }
      this.creating = false
    }
  }
}
</script>

<style scoped>
.gc-hall { min-height: 100vh; background: #0f1220; position: relative; }
.gc-bg { position: fixed; inset: 0; overflow: hidden; pointer-events: none; }
.gc-blob { position: absolute; top: -160rpx; right: -140rpx; width: 460rpx; height: 460rpx; border-radius: 50%; background: radial-gradient(circle, rgba(120,86,255,.5) 0%, rgba(120,86,255,0) 70%); }

.gc-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 99; background: rgba(15,18,32,.92); }
.gc-nav-bar { height: 44px; display: flex; align-items: center; padding: 0 20rpx; }
.gc-back { width: 56rpx; font-size: 46rpx; color: #fff; line-height: 1; }
.gc-nav-title { flex: 1; font-size: 32rpx; font-weight: 700; color: #fff; }
.gc-nav-right { display: flex; align-items: center; gap: 12rpx; }
.gc-coin { display: flex; align-items: center; gap: 6rpx; padding: 6rpx 16rpx; border-radius: 999rpx; background: rgba(255,255,255,.08); }
.gc-coin-ico { font-size: 20rpx; color: #ffd77a; }
.gc-coin-num { font-size: 24rpx; color: #ffd77a; font-weight: 700; }
.gc-nav-btn { position: relative; padding: 6rpx 16rpx; border-radius: 999rpx; font-size: 24rpx; color: #cfd3e6; background: rgba(255,255,255,.06); }
.gc-dot { position: absolute; top: -6rpx; right: -6rpx; min-width: 28rpx; height: 28rpx; line-height: 28rpx; text-align: center; border-radius: 999rpx; background: #ff3b5c; color: #fff; font-size: 18rpx; padding: 0 6rpx; }

.gc-body { padding: 20rpx 24rpx 60rpx; }
.gc-tabs { display: flex; gap: 16rpx; }
.gc-tab { flex: 1; padding: 22rpx 20rpx; border-radius: 22rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 6rpx; }
.gc-tab.active { background: linear-gradient(135deg, #7c5cff, #4b32d6); border-color: transparent; }
.gc-tab-t { font-size: 30rpx; font-weight: 700; color: #fff; }
.gc-tab-s { font-size: 20rpx; color: rgba(255,255,255,.6); }
.gc-tab.active .gc-tab-s { color: rgba(255,255,255,.85); }

.gc-rule { margin-top: 18rpx; padding: 18rpx 20rpx; border-radius: 18rpx; background: rgba(255,255,255,.05); }
.gc-rule-t { font-size: 22rpx; color: #a7abc4; line-height: 1.7; }
.gc-freeze { margin-top: 14rpx; padding: 16rpx 20rpx; border-radius: 16rpx; background: rgba(255,183,77,.12); }
.gc-freeze text { font-size: 22rpx; color: #ffcf80; }

.gc-search { margin-top: 20rpx; display: flex; gap: 14rpx; }
.gc-search-in { flex: 1; height: 78rpx; padding: 0 24rpx; border-radius: 18rpx; background: rgba(255,255,255,.07); color: #fff; font-size: 26rpx; }
.gc-search-btn { width: 150rpx; height: 78rpx; line-height: 78rpx; text-align: center; border-radius: 18rpx; background: linear-gradient(135deg, #7c5cff, #4b32d6); color: #fff; font-size: 27rpx; font-weight: 600; }

.gc-sec-title { margin: 26rpx 0 16rpx; display: flex; align-items: center; justify-content: space-between; }
.gc-sec-title text { font-size: 28rpx; font-weight: 700; color: #fff; }
.gc-create { padding: 10rpx 22rpx; border-radius: 999rpx; background: rgba(255,255,255,.1); font-size: 23rpx; color: #fff; }

.gc-empty { padding: 70rpx 30rpx; border-radius: 22rpx; background: rgba(255,255,255,.05); text-align: center; display: flex; flex-direction: column; gap: 12rpx; }
.gc-empty text { font-size: 26rpx; color: #c3c7dc; }
.gc-empty .gc-empty-s { font-size: 22rpx; color: #83879e; line-height: 1.7; }

.gc-room { display: flex; align-items: center; gap: 18rpx; padding: 24rpx 22rpx; border-radius: 22rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); margin-bottom: 16rpx; }
.gc-room.mine { border-color: rgba(124,92,255,.75); }
.gc-room.found { border-color: #ffd77a; box-shadow: 0 0 0 2rpx rgba(255,215,122,.35); }
.gc-room-ico { width: 76rpx; height: 76rpx; border-radius: 20rpx; background: linear-gradient(135deg, #7c5cff, #4b32d6); color: #fff; font-size: 38rpx; display: flex; align-items: center; justify-content: center; }
.gc-room-main { flex: 1; min-width: 0; }
.gc-room-name { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.gc-room-name text { font-size: 28rpx; font-weight: 700; color: #fff; }
.gc-tag { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 8rpx; background: rgba(255,255,255,.14); color: #d6d9ea; font-weight: 400; }
.gc-tag.user { background: rgba(124,92,255,.35); color: #d9d0ff; }
.gc-tag.lock { background: rgba(255,183,77,.25); color: #ffcf80; }
.gc-room-meta { margin-top: 10rpx; display: flex; flex-wrap: wrap; gap: 8rpx 16rpx; }
.gc-meta { font-size: 21rpx; color: #9ba0ba; }
.gc-room-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; }
.gc-room-no { font-size: 26rpx; color: #ffd77a; font-weight: 700; }
.gc-room-open { font-size: 22rpx; color: #9ba0ba; }
.gc-enter { padding: 10rpx 26rpx; border-radius: 999rpx; background: linear-gradient(135deg, #ff3b5c, #ff6a3d); color: #fff; font-size: 24rpx; font-weight: 600; }

.gc-tip { margin-top: 26rpx; }
.gc-tip text { font-size: 20rpx; color: #6d718a; line-height: 1.8; }

/* 弹层 */
.gc-mask { position: fixed; inset: 0; z-index: 900; background: rgba(0,0,0,.62); display: flex; align-items: flex-end; }
.gc-sheet { width: 100%; max-height: 86vh; overflow-y: auto; background: #171a2b; border-radius: 30rpx 30rpx 0 0; padding: 32rpx 28rpx calc(40rpx + env(safe-area-inset-bottom)); }
.gc-sheet-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.gc-sheet-h text { font-size: 32rpx; font-weight: 700; color: #fff; }
.gc-x { font-size: 30rpx; color: #83879e; }
.gc-li { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid rgba(255,255,255,.06); }
.gc-li-k { font-size: 25rpx; color: #a7abc4; }
.gc-li-v { font-size: 26rpx; color: #fff; font-weight: 600; }
.gc-li-v.gold { color: #ffd77a; }
.gc-li-v.sm { font-size: 22rpx; font-weight: 400; color: #c3c7dc; max-width: 60%; text-align: right; }

.gc-pwd { margin: 22rpx 0 6rpx; }
.gc-pwd-l { font-size: 25rpx; color: #fff; font-weight: 600; }
.gc-pwd-in { margin-top: 12rpx; height: 82rpx; padding: 0 24rpx; border-radius: 18rpx; background: rgba(255,255,255,.07); color: #fff; font-size: 26rpx; }

.gc-modes { margin-top: 24rpx; display: flex; gap: 16rpx; }
.gc-mode { flex: 1; padding: 22rpx 20rpx; border-radius: 20rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 8rpx; }
.gc-mode.active { border-color: #7c5cff; background: rgba(124,92,255,.18); }
.gc-mode.off { opacity: .45; }
.gc-mode-t { font-size: 26rpx; font-weight: 700; color: #fff; }
.gc-mode-s { font-size: 20rpx; color: #9ba0ba; line-height: 1.6; }

.gc-sheet-btn { margin-top: 28rpx; height: 90rpx; line-height: 90rpx; text-align: center; border-radius: 999rpx; background: linear-gradient(135deg, #ff3b5c, #ff6a3d); color: #fff; font-size: 28rpx; font-weight: 700; }
.gc-sheet-btn.ghost { background: rgba(255,255,255,.1); }

.gc-match-h { text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }
.gc-match-sub { margin-top: 10rpx; text-align: center; font-size: 23rpx; color: #9ba0ba; }
.gc-waiters { margin: 30rpx 0; display: flex; justify-content: center; gap: 26rpx; }
.gc-waiter { display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.gc-waiter-av { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255,255,255,.1); }
.gc-waiter-ph { display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #9ba0ba; }
.gc-waiter-nm { font-size: 21rpx; color: #c3c7dc; }
.gc-match-cnt { text-align: center; font-size: 25rpx; color: #fff; }
.gc-match-tip { display: block; margin: 18rpx 0 4rpx; text-align: center; font-size: 21rpx; color: #83879e; line-height: 1.7; }

.gc-create-desc { display: block; font-size: 22rpx; color: #9ba0ba; line-height: 1.8; margin-bottom: 22rpx; }
.gc-create-l { display: block; font-size: 25rpx; font-weight: 700; color: #fff; margin: 22rpx 0 12rpx; }
.gc-create-ls { font-size: 20rpx; font-weight: 400; color: #83879e; }
.gc-levels { display: flex; gap: 14rpx; }
.gc-level { flex: 1; padding: 20rpx 12rpx; border-radius: 18rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.gc-level.active { border-color: #7c5cff; background: rgba(124,92,255,.18); }
.gc-level-n { font-size: 26rpx; font-weight: 700; color: #fff; }
.gc-level-s { font-size: 19rpx; color: #9ba0ba; }
.gc-players { display: flex; gap: 16rpx; }
.gc-player { flex: 1; padding: 20rpx; border-radius: 18rpx; background: rgba(255,255,255,.06); border: 1rpx solid rgba(255,255,255,.08); display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.gc-player.active { border-color: #7c5cff; background: rgba(124,92,255,.18); }
.gc-player text { font-size: 25rpx; color: #fff; font-weight: 600; }
.gc-player .gc-player-s { font-size: 19rpx; color: #9ba0ba; font-weight: 400; }
</style>
