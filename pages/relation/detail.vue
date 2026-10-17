<template>
  <view class="page" :class="themeClass">
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav">
        <view class="nav-btn" @click="goBack">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </view>
        <text class="nav-title">亲密关系</text>
        <view class="nav-btn" @click="showLevels = true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </view>
      </view>

      <view class="hero" v-if="info">
        <view class="pair">
          <view class="pair-side">
            <view class="ava-ring">
              <image class="pair-ava" :src="leftAvatar" mode="aspectFill" />
            </view>
            <text class="pair-name">{{ leftName }}</text>
          </view>
          <view class="pair-heart">
            <text class="heart">♥</text>
            <view class="spark s1"></view>
            <view class="spark s2"></view>
            <view class="spark s3"></view>
            <view class="spark s4"></view>
          </view>
          <view class="pair-side">
            <view class="ava-ring">
              <image class="pair-ava" :src="rightAvatar" mode="aspectFill" />
            </view>
            <text class="pair-name">{{ rightName }}</text>
          </view>
        </view>
        <view class="pair-badge">{{ info.typeLabel || '亲密关系' }}</view>
        <view class="hero-days" v-if="info.days">已相伴 {{ info.days }} 天</view>
      </view>
    </view>

    <view class="body" v-if="info">
      <view class="card level-card">
        <view class="level-row">
          <view class="level-badge-big">Lv.{{ info.level.level }}</view>
          <view class="level-right">
            <text class="level-num">{{ info.intimacy }} 亲密值</text>
            <text class="level-next" v-if="!info.level.is_max">距离「{{ info.level.next_name }}」还差 {{ Math.max(0, info.level.next_need - info.intimacy) }}</text>
            <text class="level-next" v-else>已是最高等级</text>
          </view>
        </view>
        <view class="track"><view class="track-fill" :style="{ width: (info.level.progress || 0) + '%' }"></view></view>
        <text class="level-lvname">{{ info.level.level_name || '' }}</text>
      </view>

      <!-- 围观别人的关系：只能打 call -->
      <view class="card checkin" v-if="info.is_guest" :class="{ off: info.called_today }" @click="doCheer">
        <view class="checkin-icon">♥</view>
        <view class="checkin-mid">
          <text class="checkin-title">{{ info.called_today ? '今天已打过 call' : '给他们打 call' }}</text>
          <text class="checkin-sub">{{ info.called_today ? '明天再来' : '打 call 帮他们涨亲密值' }}</text>
        </view>
        <text class="checkin-tag">{{ info.called_today ? '已完成' : '+5' }}</text>
      </view>

      <view class="card checkin" v-else :class="{ off: !info.canCheckin }" @click="doCheckin">
        <view class="checkin-icon">{{ info.canCheckin ? '◎' : '✓' }}</view>
        <view class="checkin-mid">
          <text class="checkin-title">{{ info.canCheckin ? '每日签到' : '今日已签到' }}</text>
          <text class="checkin-sub">{{ info.canCheckin ? '连续签到额外 +5' : '明天再来' }}</text>
        </view>
        <text class="checkin-tag">{{ info.canCheckin ? '+10' : '已完成' }}</text>
      </view>

      <template v-if="!info.is_guest">
        <text class="section">日常任务</text>
        <view class="card task-card">
          <view class="task">
            <view class="task-mid">
              <text class="task-name">互发消息</text>
              <text class="task-sub">今天和对方聊聊天</text>
            </view>
            <text class="task-coin">+2</text>
          </view>
          <view class="task">
            <view class="task-mid">
              <text class="task-name">访问主页</text>
              <text class="task-sub">去对方主页看看</text>
            </view>
            <text class="task-coin">+1</text>
          </view>
          <view class="task">
            <view class="task-mid">
              <text class="task-name">连续签到</text>
              <text class="task-sub">不间断签到有加成</text>
            </view>
            <text class="task-coin">+5</text>
          </view>
        </view>
      </template>
    </view>

    <view class="body" v-else-if="!loading">
      <text class="empty-sub center">{{ errMsg || '关系不存在或已解除' }}</text>
    </view>

    <view v-if="showLevels" class="modal-mask" @click="showLevels = false">
      <view class="modal" @click.stop>
        <view class="modal-head">
          <text class="modal-title">亲密等级</text>
          <text class="modal-close" @click="showLevels = false">✕</text>
        </view>
        <view class="level-item">
          <view class="level-badge l1">Lv.1</view>
          <view class="level-info">
            <text class="level-name">初识</text>
            <text class="level-desc">个人主页显示关系标签，在VIP标识旁展示你和谁绑定了关系</text>
          </view>
        </view>
        <view class="level-item">
          <view class="level-badge l2">Lv.2</view>
          <view class="level-info">
            <text class="level-name">亲密</text>
            <text class="level-desc">私聊时触发专属动画特效，聊天更有氛围</text>
          </view>
        </view>
        <view class="level-item">
          <view class="level-badge l3">Lv.3</view>
          <view class="level-info">
            <text class="level-name">羁绊</text>
            <text class="level-desc">对方点你主页时，头像处展示双人叠影头像卡</text>
          </view>
        </view>
        <view class="level-item" v-for="p in extraLevels" :key="'lv' + p.level">
          <view class="level-badge l2">Lv.{{ p.level }}</view>
          <view class="level-info">
            <text class="level-name">{{ p.level_name }}</text>
            <text class="level-desc">达到该等级可解锁更多专属标识与权益</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
export default {
  data() {
    return {
      statusBarHeight: 20,
      targetId: '',
      relationId: '',
      info: null,
      loading: true,
      errMsg: '',
      myAvatar: '/static/logo.png',
      myName: '我',
      showLevels: false,
      defaultAvatar: 'https://y.sgyunp.cn/f/6eXTL/IMG_5336.jpeg'
    }
  },
  computed: {
    /* 围观别人的关系时展示「A & B」，看自己的关系时展示「我 & TA」 */
    leftAvatar() {
      if (this.info && this.info.is_guest) return (this.info.a && this.info.a.avatar) || this.defaultAvatar
      return this.myAvatar
    },
    leftName() {
      if (this.info && this.info.is_guest) return (this.info.a && this.info.a.name) || 'TA'
      return this.myName
    },
    rightAvatar() {
      if (this.info && this.info.is_guest) return (this.info.b && this.info.b.avatar) || this.defaultAvatar
      return (this.info && this.info.otherUser && this.info.otherUser.avatar) || this.defaultAvatar
    },
    rightName() {
      if (this.info && this.info.is_guest) return (this.info.b && this.info.b.name) || 'TA'
      return (this.info && this.info.otherUser && (this.info.otherUser.nickname || this.info.otherUser.name)) || '对方'
    },
    extraLevels() {
      const cur = (this.info && this.info.level && this.info.level.level) || 1
      const list = []
      for (let i = cur + 1; i <= cur + 3; i++) list.push({ level: i, level_name: '进阶' })
      return list.slice(0, 2)
    }
  },
  onLoad(opt = {}) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.targetId = opt.targetId || ''
    this.relationId = opt.relationId || ''
    try {
      const u = uni.getStorageSync('userInfo') || {}
      this.myAvatar = u.avatar || '/static/logo.png'
      this.myName = u.nickname || '我'
    } catch(e) {}
    this.loadDetail()
  },
  methods: {
    async loadDetail() {
      this.loading = true
      try {
        const payload = this.relationId
          ? { action: 'detail', relationId: this.relationId }
          : { action: 'detail', targetId: this.targetId }
        const res = await request('relation.php', payload, 'GET')
        if (res && res.code === 0 && res.data && (res.data.otherUser || res.data.is_guest)) {
          this.info = res.data
        } else {
          this.errMsg = (res && (res.message || res.msg)) || '关系不存在或已解除'
        }
      } catch(e) {
        this.errMsg = '网络错误，请稍后再试'
      }
      this.loading = false
    },
    /* 围观别人的关系：打 call */
    async doCheer() {
      if (!this.info || !this.info.is_guest || this.info.called_today) return
      const rid = this.info.id || this.relationId
      if (!rid) return
      try {
        const res = await request('relation.php', { action: 'cheer', id: rid }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: res.msg || '打 call 成功', icon: 'success' })
          this.loadDetail()
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '打 call 失败', icon: 'none' })
        }
      } catch(e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
    },
    async doCheckin() {
      if (!this.info || !this.info.canCheckin) return
      try {
        const res = await request('relation.php', { action: 'checkin', targetId: this.targetId }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: res.msg || '签到成功', icon: 'success' })
          this.loadDetail()
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '签到失败', icon: 'none' })
        }
      } catch(e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
    },
    goBack() { uni.navigateBack() }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf9fb; }
.header { background: linear-gradient(180deg, #ffe4ec 0%, #fff5f8 100%); padding-bottom: 50px; }
.nav { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; }
.nav-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--cr-surface); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(255,94,138,0.12); }
.nav-title { font-size: 17px; font-weight: 700; color: #1a1a1a; }

.hero { padding: 28px 0 10px; display: flex; flex-direction: column; align-items: center; }
.pair { display: flex; align-items: center; gap: 20px; }
.pair-side { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ava-ring { width: 72px; height: 72px; border-radius: 50%; padding: 3px; background: var(--cr-surface); box-shadow: 0 4px 16px rgba(255,94,138,0.2); }
.pair-ava { width: 100%; height: 100%; border-radius: 50%; }
.pair-name { font-size: 13px; color: #555; font-weight: 500; max-width: 90px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pair-heart { position: relative; display: flex; align-items: center; justify-content: center; }
.heart { font-size: 28px; color: #ff3b6c; animation: beat 1.2s ease-in-out infinite; filter: drop-shadow(0 2px 8px rgba(255,59,108,0.4)); }
@keyframes beat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.25); }
  50% { transform: scale(1); }
  75% { transform: scale(1.15); }
}
.spark { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #ff8fb1; opacity: 0; }
.s1 { top: -10px; left: 50%; animation: spark1 1.2s ease-in-out infinite; }
.s2 { bottom: -10px; left: 50%; animation: spark2 1.2s ease-in-out infinite; }
.s3 { left: -12px; top: 50%; animation: spark3 1.2s ease-in-out infinite; }
.s4 { right: -12px; top: 50%; animation: spark4 1.2s ease-in-out infinite; }
@keyframes spark1 { 0%,100% {opacity:0; transform:translateY(0) scale(.5);} 50% {opacity:1; transform:translateY(-8px) scale(1);} }
@keyframes spark2 { 0%,100% {opacity:0; transform:translateY(0) scale(.5);} 50% {opacity:1; transform:translateY(8px) scale(1);} }
@keyframes spark3 { 0%,100% {opacity:0; transform:translateX(0) scale(.5);} 50% {opacity:1; transform:translateX(-8px) scale(1);} }
@keyframes spark4 { 0%,100% {opacity:0; transform:translateX(0) scale(.5);} 50% {opacity:1; transform:translateX(8px) scale(1);} }
.pair-badge { margin-top: 18px; padding: 5px 18px; border-radius: 20px; background: linear-gradient(135deg, #ff3b6c, #ff5e8a); color: #fff; font-size: 12px; font-weight: 600; box-shadow: 0 4px 12px rgba(255,59,108,0.3); }
.hero-days { font-size: 12px; color: #b9b9b9; margin-top: 10px; }

.body { padding: 0 16px 40px; margin-top: -30px; position: relative; }
.card { background: var(--cr-surface); border-radius: 18px; padding: 18px; margin-bottom: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }

.level-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.level-badge-big { font-size: 20px; font-weight: 800; color: #ff3b6c; background: linear-gradient(135deg, #fff0f3, #ffe4ec); padding: 8px 16px; border-radius: 12px; }
.level-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.level-num { font-size: 14px; color: #1a1a1a; font-weight: 700; }
.level-next { font-size: 11px; color: var(--cr-text-muted); }
.track { height: 8px; background: #fff0f3; border-radius: 4px; overflow: hidden; }
.track-fill { height: 100%; background: linear-gradient(90deg, #ff3b6c, #ff8fb1); border-radius: 4px; }
.level-lvname { display: block; font-size: 11px; color: #ff8fb1; text-align: center; margin-top: 10px; }

.checkin { display: flex; align-items: center; gap: 14px; }
.checkin-icon { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #ffe4ec, #ffd0dd); color: #ff3b6c; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.checkin-mid { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.checkin-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.checkin-sub { font-size: 12px; color: var(--cr-text-muted); }
.checkin-tag { font-size: 13px; font-weight: 700; color: #fff; padding: 7px 16px; border-radius: 20px; background: linear-gradient(135deg, #ff3b6c, #ff5e8a); box-shadow: 0 2px 8px rgba(255,59,108,0.3); }
.checkin.off .checkin-tag { color: var(--cr-text-muted); background: #f5f5f5; box-shadow: none; }

.section { display: block; font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 20px 4px 10px; }
.task-card { padding: 4px 18px; }
.task { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #f8f8f8; }
.task:last-child { border-bottom: none; }
.task-mid { display: flex; flex-direction: column; gap: 3px; }
.task-name { font-size: 14px; color: #1a1a1a; font-weight: 500; }
.task-sub { font-size: 12px; color: var(--cr-text-muted); }
.task-coin { font-size: 14px; color: #ff3b6c; font-weight: 700; }

.empty-sub { font-size: 13px; color: var(--cr-text-muted); display: block; }
.empty-sub.center { text-align: center; padding-top: 40px; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.modal { background: var(--cr-surface); border-radius: 20px 20px 0 0; padding: 20px 16px 40px; width: 100%; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-title { font-size: 17px; font-weight: 700; color: #1a1a1a; }
.modal-close { font-size: 18px; color: var(--cr-text-muted); padding: 4px 8px; }
.level-item { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f5f5f5; }
.level-item:last-child { border-bottom: none; }
.level-badge { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.level-badge.l1 { background: linear-gradient(135deg, #ffb3c9, #ff8fb1); }
.level-badge.l2 { background: linear-gradient(135deg, #ff5e8a, #ff3b6c); }
.level-badge.l3 { background: linear-gradient(135deg, #ff3b6c, #c9184a); }
.level-info { flex: 1; }
.level-name { font-size: 15px; font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 4px; }
.level-desc { font-size: 12px; color: var(--cr-text-muted); line-height: 1.5; }
</style>