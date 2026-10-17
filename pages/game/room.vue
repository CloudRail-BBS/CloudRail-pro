<template>
  <view class="rm-page" :class="themeClass">
    <!-- 自定义导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">
        <image src="/static/icon/arrow-left-dark.svg" class="back-icon" mode="aspectFit"></image>
      </view>
      <view class="nav-title">游戏房间</view>
    </view>

    <!-- 还没进房：输入房间号 -->
    <view v-if="!inRoom" class="join-box">
      <view class="join-tip">输入房主给你的房间号</view>
      <input class="join-in" type="number" maxlength="8" v-model="roomNo" placeholder="房间号" />
      <input v-if="needPwd" class="join-in" type="number" maxlength="8" v-model="pwd" placeholder="房间密码" />
      <view class="join-btn" @click="joinRoom">进入房间</view>
      <view class="join-note">房间里人不够时，房主点开始会由 AI 补齐空位</view>
    </view>

    <!-- 已在房间：等待开局 -->
    <view v-else class="room-box">
      <view class="room-no">
        <text class="room-no-label">房间号</text>
        <text class="room-no-val">{{ roomNo }}</text>
        <text class="room-no-copy" @click="copyNo">复制</text>
      </view>
      <view class="room-name">{{ roomName || (gameType === 'doudizhu' ? '斗地主房间' : '炸金花房间') }}</view>

      <view class="seats">
        <view v-for="i in 3" :key="i" class="seat" :class="{ on: waiters[i - 1] }">
          <image v-if="waiters[i - 1]" class="seat-ava" :src="waiters[i - 1].avatar || defaultAvatar" mode="aspectFill"></image>
          <view v-else class="seat-empty">?</view>
          <text class="seat-name">{{ waiters[i - 1] ? (waiters[i - 1].me ? '我' : waiters[i - 1].name) : '等待加入' }}</text>
        </view>
      </view>

      <view class="room-status">
        <text v-if="isOwner">已就坐 {{ count }} 人，点「开始游戏」立刻开局（人数不够会自动补 AI）</text>
        <text v-else>已就坐 {{ count }} 人，等房主点「开始游戏」</text>
      </view>

      <view v-if="isOwner" class="room-start" @click="startGame">开始游戏</view>
      <view v-else class="room-wait">等待房主开始…</view>

      <view class="room-leave" @click="goBack">退出房间</view>
    </view>
  </view>
</template>

<script>
import { request } from '@/common/request.js'
import wsManager from '@/common/ws.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      defaultAvatar: '/static/icon/default-avatar.png',

      gameType: 'doudizhu',
      roomNo: '',
      pwd: '',
      needPwd: false,
      inRoom: false,

      roomId: 0,
      roomName: '',
      isOwner: false,
      waiters: [],
      count: 0,
      remain: 0,

      pollTimer: null,
      wsOff: null,
      entered: false
    }
  },
  onLoad(options) {
    try {
      const si = uni.getSystemInfoSync()
      this.statusBarHeight = si.statusBarHeight || 20
    } catch (e) {}
    const opt = options || {}
    this.gameType = opt.type === 'zhajinhua' ? 'zhajinhua' : 'doudizhu'
    if (opt.no) this.roomNo = String(opt.no)
    if (opt.room_id) {
      /* 房主刚创建完，房间号还要回查一次 */
      this.roomId = Number(opt.room_id)
      if (opt.no) this.roomNo = String(opt.no)
      this.loadRoomNoThenJoin()
    } else if (opt.no) {
      /* 从大厅点进来的：直接自动加入房间，
         不要再让用户手动点一次「进入房间」，否则看起来就像"点了根本没反应/进不去"。
         房间有密码的话，这一步会失败并自动弹出密码输入框。 */
      this.joinRoom()
    }
    this.bindWs()
  },
  onUnload() {
    /* 离开房间页要把自己的排队记录撤掉，
       否则房主那边会看到「人已经走了，还显示在线」 */
    if (!this.entered && this.roomId) {
      try { request('game_center.php', { action: 'match_cancel', room_id: this.roomId }, 'POST') } catch (e) {}
    }
    this.stopAll()
  },
  methods: {
    bindWs() {
      try {
        this.wsOff = wsManager.on('game_match', (data) => {
          if (!data || !data.session_id) return
          if (this.roomId && data.room_id && Number(data.room_id) !== Number(this.roomId)) return
          this.enterTable(data.session_id, data.room_id, data.game_type || this.gameType)
        })
      } catch (e) {}
    },
    stopAll() {
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
      try { if (this.wsOff) this.wsOff() } catch (e) {}
    },

    /* 房主创建完房间后带过来的是 room_id —— 房间号本身就是房间 id，
       所以这里要用 room_no 去查（后端 find_room 只认 room_no，用错参数会直接报错，
       查不到就拿不到 is_mine，房主会被当成"等待房主开始"的普通玩家）。 */
    async loadRoomNoThenJoin() {
      if (!this.roomNo) this.roomNo = String(this.roomId)
      try {
        const res = await request('game_center.php', { action: 'find_room', room_no: this.roomId }, 'GET')
        if (res && res.code === 0 && res.data && res.data.room) {
          const r = res.data.room
          this.roomNo = String(r.id)
          this.roomName = r.name || ''
          this.isOwner = Number(r.is_mine) === 1
          if (r.game_type) this.gameType = r.game_type
        } else if (res && res.code) {
          uni.showToast({ title: (res.msg || res.message) || '房间读取失败', icon: 'none' })
        }
      } catch (e) {}
      this.joinMatch()
    },

    async joinRoom() {
      const no = parseInt(String(this.roomNo || '').replace(/\D/g, ''), 10)
      if (!no) { uni.showToast({ title: '请输入房间号', icon: 'none' }); return }
      try {
        const res = await request('game_center.php', {
          action: 'find_room', room_no: no, room_password: this.pwd
        }, 'GET')
        if (!res || res.code !== 0 || !res.data || !res.data.room) {
          /* 没设密码就再试一次不带密码的；还不行就把后端的原话抛出来 */
          uni.showToast({ title: (res && (res.msg || res.message)) || '房间不存在', icon: 'none' })
          if (String((res && res.msg) || '').indexOf('密码') >= 0) this.needPwd = true
          return
        }
        const r = res.data.room
        this.roomId = Number(r.id)
        this.roomNo = String(r.room_no || r.id)
        this.roomName = r.name || ''
        this.isOwner = Number(r.is_mine) === 1
        if (r.game_type) this.gameType = r.game_type
        this.joinMatch()
      } catch (e) {
        uni.showToast({ title: '进入房间失败，请重试', icon: 'none' })
      }
    },

    async joinMatch() {
      try {
        const res = await request('game_center.php', { action: 'match_join', room_id: this.roomId }, 'POST')
        if (res && res.code !== 0) {
          uni.showToast({ title: (res.msg || res.message) || '进入房间失败', icon: 'none' })
          return
        }
        this.inRoom = true
        this.applyMatch(res && res.data)
        if (!this.pollTimer) this.pollTimer = setInterval(this.poll, 1500)
      } catch (e) {
        uni.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    },

    applyMatch(d) {
      if (!d) return
      this.count = Number(d.count || 0)
      this.remain = Math.max(0, Number(d.remain || 0))
      this.waiters = d.waiters || []
      if (d.status === 'matched' && d.session_id) {
        this.enterTable(d.session_id, d.room_id, d.game_type || this.gameType)
      }
    },

    async poll() {
      if (!this.roomId || this.entered) return
      try {
        const res = await request('game_center.php', { action: 'match_poll', room_id: this.roomId }, 'GET')
        if (res && res.code === 0) this.applyMatch(res.data)
      } catch (e) {}
    },

    async startGame() {
      if (this.starting) return
      this.starting = true
      try {
        const res = await request('game_center.php', { action: 'room_start', room_id: this.roomId }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: (res.data && res.data.status === 'matched') ? '开局成功' : '正在补齐 AI…', icon: 'none' })
          this.applyMatch(res.data)
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '开始失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
      this.starting = false
    },

    enterTable(sid, rid, type) {
      if (this.entered || !sid) return
      this.entered = true
      this.stopAll()
      const page = (type === 'zhajinhua') ? 'zha' : 'ddz'
      uni.navigateTo({ url: '/pages/game/' + page + '?session=' + sid + '&room=' + (rid || this.roomId) })
    },

    copyNo() {
      uni.setClipboardData({
        data: String(this.roomNo),
        success: () => uni.showToast({ title: '房间号已复制', icon: 'none' })
      })
    },

    goBack() {
      this.stopAll()
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/game/hall' }) })
    }
  }
}
</script>

<style scoped>
.rm-page { min-height: 100vh; background: var(--cr-canvas); }
.nav { position: relative; display: flex; align-items: center; justify-content: center; height: 88rpx; background: var(--cr-surface); }
.nav-title { font-size: 32rpx; font-weight: bold; color: var(--cr-text); }
.nav-back { position: absolute; left: 24rpx; bottom: 0; height: 88rpx; width: 60rpx; display: flex; align-items: center; }
.back-icon { width: 36rpx; height: 36rpx; }

.join-box { margin: 80rpx 40rpx 0; padding: 48rpx 40rpx; background: var(--cr-surface); border-radius: 24rpx; }
.join-tip { font-size: 28rpx; color: var(--cr-text-muted); margin-bottom: 28rpx; text-align: center; }
.join-in { height: 88rpx; background: var(--cr-surface-alt); border-radius: 16rpx; padding: 0 28rpx; font-size: 32rpx; margin-bottom: 24rpx; text-align: center; }
.join-btn { height: 88rpx; line-height: 88rpx; text-align: center; background: #ff6b81; color: #fff; border-radius: 44rpx; font-size: 32rpx; font-weight: bold; margin-top: 12rpx; }
.join-note { margin-top: 28rpx; font-size: 24rpx; color: var(--cr-text-muted); text-align: center; line-height: 1.6; }

.room-box { padding: 40rpx; }
.room-no { display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.room-no-label { font-size: 26rpx; color: var(--cr-text-muted); margin-right: 12rpx; }
.room-no-val { font-size: 52rpx; font-weight: bold; color: #ff6b81; letter-spacing: 4rpx; }
.room-no-copy { font-size: 24rpx; color: #576b95; margin-left: 20rpx; padding: 4rpx 16rpx; border: 1rpx solid #576b95; border-radius: 20rpx; }
.room-name { text-align: center; font-size: 26rpx; color: var(--cr-text-muted); margin-bottom: 48rpx; }

.seats { display: flex; justify-content: space-between; }
.seat { flex: 1; margin: 0 12rpx; background: var(--cr-surface); border-radius: 20rpx; padding: 32rpx 0; display: flex; flex-direction: column; align-items: center; }
.seat.on { background: #fff5f7; }
.seat-ava { width: 110rpx; height: 110rpx; border-radius: 50%; background: #eee; }
.seat-empty { width: 110rpx; height: 110rpx; border-radius: 50%; background: #f0f1f3; color: #c8c9cc; font-size: 44rpx; display: flex; align-items: center; justify-content: center; }
.seat-name { margin-top: 16rpx; font-size: 24rpx; color: var(--cr-text-muted); max-width: 160rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.room-status { margin: 48rpx 0 32rpx; text-align: center; font-size: 26rpx; color: var(--cr-text-muted); }
.room-start { height: 92rpx; line-height: 92rpx; text-align: center; background: #ff6b81; color: #fff; border-radius: 46rpx; font-size: 32rpx; font-weight: bold; }
.room-wait { height: 92rpx; line-height: 92rpx; text-align: center; background: #f0f1f3; color: #999; border-radius: 46rpx; font-size: 30rpx; }
.room-leave { margin-top: 32rpx; text-align: center; font-size: 26rpx; color: var(--cr-text-muted); }
</style>
