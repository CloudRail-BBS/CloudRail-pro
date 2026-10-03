<template>
  <view class="rd-page">

    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: navBarHeight + 'px' }">
      <view class="nav-back" @click="goBack" :style="{ top: (statusBarHeight + (navBarHeight - 32) / 2) + 'px' }">
        <image src="/static/icon/arrow-left-dark.svg" class="back-icon" mode="aspectFit"></image>
      </view>
      <view class="nav-title">亲密关系</view>
    </view>

    <view class="rd-body" :style="{ paddingTop: (navTotalHeight + 20) + 'px' }" v-if="rel">

      <!-- 自检提示：数据表/字段不齐时直接显示出来，方便排查亲密值为什么不涨 -->
      <view v-if="healthWarning" class="warn-bar">{{ healthWarning }}</view>

      <!-- ============ 顶部：关系 + 亲密值 ============ -->
      <view class="hero">
        <view class="hero-avatars">
          <view class="hero-side">
            <image class="hero-ava" :src="rel.me.avatar || defaultAvatar" mode="aspectFill" @click="goUser(rel.me.uid)"></image>
            <text class="hero-role">我</text>
          </view>
          <view class="hero-link"></view>
          <view class="hero-side">
            <image class="hero-ava" :src="rel.ta.avatar || defaultAvatar" mode="aspectFill" @click="goUser(rel.ta.uid)"></image>
            <text class="hero-role">{{ rel.ta.name || '对方' }}</text>
          </view>
        </view>

        <view class="hero-type">{{ rel.type_name }}</view>
        <view class="hero-days">已相伴 {{ rel.days }} 天</view>

        <view class="hero-stats">
          <view class="hs">
            <text class="hs-num">{{ rel.intimacy }}</text>
            <text class="hs-label">亲密值</text>
          </view>
          <view class="hs">
            <text class="hs-num">Lv.{{ rel.level.level }}</text>
            <text class="hs-label">{{ rel.level.level_name }}</text>
          </view>
          <view class="hs">
            <text class="hs-num">{{ rel.call_total }}</text>
            <text class="hs-label">打 call</text>
          </view>
        </view>

        <view class="hero-bar">
          <view class="hero-bar-in" :style="{ width: rel.level.progress + '%' }"></view>
        </view>
        <view class="hero-next" v-if="!rel.level.is_max">
          距离「{{ rel.level.next_name }}」还差 {{ Math.max(0, rel.level.next_need - rel.intimacy) }} 亲密值
        </view>
        <view class="hero-next" v-else>已经是最高等级啦</view>

        <view class="hero-call" :class="{ done: rel.called_today }" @click="doCall">
          {{ rel.called_today ? '今天已为 TA 打过 call' : '为 TA 打 call（亲密值 +5）' }}
        </view>
      </view>

      <!-- ============ 互动标识 ============ -->
      <view class="card">
        <view class="sec-title">互动标识<text class="sec-tip">已点亮 {{ gotCount }}/{{ rel.marks.length }}</text></view>
        <view class="marks">
          <view class="mark" v-for="m in rel.marks" :key="m.key" :class="{ got: m.got }">
            <view class="mark-ico">{{ m.got ? '★' : '☆' }}</view>
            <text class="mark-name">{{ m.name }}</text>
          </view>
        </view>
      </view>

      <!-- ============ 今日任务 ============ -->
      <view class="card">
        <view class="sec-title">今日任务<text class="sec-tip">完成后可以涨亲密值</text></view>
        <view class="task" v-for="t in rel.tasks" :key="t.key">
          <view class="task-info">
            <text class="task-title">{{ t.title }}</text>
            <text class="task-desc">{{ t.desc }}</text>
          </view>
          <view
            class="mini-btn"
            :class="t.claimed ? 'muted' : (t.done ? 'primary' : 'plain')"
            @click="claimTask(t)"
          >{{ t.claimed ? '已领取' : (t.done ? ('领取 +' + t.points) : '去完成') }}</view>
        </view>
      </view>

      <!-- ============ 专属权益 ============ -->
      <view class="card">
        <view class="sec-title">专属权益<text class="sec-tip">按亲密等级解锁</text></view>
        <view class="ben" v-for="b in rel.benefits" :key="'b' + b.level" :class="{ on: b.unlocked }">
          <view class="ben-lv">Lv.{{ b.level }}</view>
          <view class="ben-info">
            <text class="ben-name">{{ b.name }}</text>
            <text class="ben-desc">{{ b.desc }}</text>
          </view>
          <text class="ben-state">{{ b.unlocked ? '已解锁' : '未解锁' }}</text>
        </view>
      </view>

      <!-- ============ 我们的回忆 ============ -->
      <view class="card">
        <view class="sec-title">我们的回忆<text class="sec-tip">{{ rel.memories.length }} 条</text></view>
        <view class="mini-btn primary full-btn" @click="openRec">去记录</view>

        <block v-if="rel.memories.length">
          <view class="mem" v-for="m in rel.memories" :key="m.source + '-' + m.id">
            <view class="mem-head">
              <text class="mem-who">{{ m.is_me ? '我' : rel.ta.name }}</text>
              <text class="mem-src" v-if="m.source === 'chat'">来自聊天</text>
              <text class="mem-time">{{ fmtTime(m.time) }}</text>
              <text class="mem-del" v-if="m.source === 'manual' && m.is_me" @click="delMemory(m)">删除</text>
            </view>
            <image v-if="m.type === 'image'" class="mem-img" :src="m.url" mode="widthFix" @click="previewImg(m.url)"></image>
            <view v-else-if="m.type === 'voice'" class="mem-voice" @click="playVoice(m)">
              <text class="mem-voice-ico">▶</text>
              <text>语音 {{ m.duration }}″</text>
            </view>
            <text v-else class="mem-text">{{ m.content }}</text>
          </view>
        </block>
        <view v-else class="empty-sub2">还没有回忆，去记一条，或者多聊聊天</view>
      </view>

    </view>

    <view v-else-if="!loading" class="rd-body" :style="{ paddingTop: (navTotalHeight + 120) + 'px' }">
      <view class="empty-sub2 center">{{ errMsg || '关系不存在或已解除' }}</view>
    </view>

    <!-- ============ 去记录 ============ -->
    <view v-if="recShow" class="rel-mask" @click="closeRec">
      <view class="rel-sheet" @click.stop>
        <text class="rel-sheet-title">记录这一刻</text>
        <text class="rel-sheet-sub">只有你们两个人能看到</text>
        <textarea
          class="rec-textarea"
          v-model="recText"
          maxlength="200"
          placeholder="今天发生了什么？"
          placeholder-class="rel-input-ph"
        ></textarea>
        <view class="rec-img-box" v-if="recImg">
          <image class="rec-img" :src="recImg" mode="aspectFill"></image>
        </view>
        <view class="mini-btn plain full-btn" @click="chooseRecImg">{{ recImg ? '换一张图' : '加一张图（可选）' }}</view>
        <view class="rel-sheet-actions">
          <view class="rel-sheet-btn cancel" @click="closeRec">取消</view>
          <view class="rel-sheet-btn ok" :class="{ disabled: recSending }" @click="submitRec">{{ recSending ? '保存中...' : '保存' }}</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { request, uploadFile } from '../../common/request.js'
import { applyH5ViewportHeightVar, getScreenMetrics } from '../../common/screen.js'

export default {
  data() {
    return {
      statusBarHeight: 0,
      navBarHeight: 44,
      navTotalHeight: 44,
      id: 0,
      loading: true,
      errMsg: '',
      rel: null,
      recShow: false,
      recText: '',
      recImg: '',
      recSending: false,
      defaultAvatar: 'https://y.sgyunp.cn/f/6eXTL/IMG_5336.jpeg'
    }
  },
  computed: {
    gotCount() {
      return ((this.rel && this.rel.marks) || []).filter(m => m.got).length
    },
    /* 后端自检发现表/字段不全时给一句人话提示，否则亲密值会一直是 0 却看不出原因 */
    healthWarning() {
      const h = (this.rel && this.rel.health) || null
      if (!h) return ''
      if (!h.intimacy_column) {
        return '数据表 user_relations 缺少 intimacy 字段，亲密值加不上去。到 install.php 点一次「补齐缺失数据表 / 字段」即可。'
      }
      const miss = h.tables_missing || []
      if (miss.length) return '缺少数据表：' + miss.join('、')
      return ''
    }
  },
  onLoad(opt = {}) {
    applyH5ViewportHeightVar()
    const m = getScreenMetrics()
    this.statusBarHeight = m.statusBarHeight
    this.navBarHeight = m.navBarHeight
    this.navTotalHeight = this.statusBarHeight + this.navBarHeight
    this.id = Number(opt.id || 0)
    if (!this.id) {
      this.loading = false
      this.errMsg = '参数错误'
      return
    }
    this.loadDetail()
  },
  onUnload() {
    this.stopAudio()
  },
  methods: {
    goBack() { uni.navigateBack() },
    goUser(uid) {
      if (!uid) return
      uni.navigateTo({ url: '/pages/user/profile?userId=' + uid })
    },
    fmtTime(v) {
      const s = String(v || '')
      return s.length >= 16 ? s.substring(5, 16) : s
    },

    async loadDetail() {
      this.loading = true
      try {
        const res = await request('relation.php', { action: 'detail', id: this.id }, 'GET')
        if (res && res.code === 0 && res.data) {
          this.rel = res.data
        } else {
          this.errMsg = (res && (res.message || res.msg)) || '加载失败'
        }
      } catch (e) {
        this.errMsg = '网络错误，请稍后再试'
      }
      this.loading = false
    },

    /* ==================== 打 call ==================== */
    async doCall() {
      if (!this.rel || this.rel.called_today) return
      try {
        const res = await request('relation.php', { action: 'call', id: this.id }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: res.message || '打 call 成功', icon: 'none' })
          this.loadDetail()
        } else {
          uni.showToast({ title: (res && (res.message || res.msg)) || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
    },

    /* ==================== 领任务奖励 ==================== */
    async claimTask(t) {
      if (!t || t.claimed) return
      if (!t.done) {
        return uni.showToast({ title: '任务还没完成：' + t.desc, icon: 'none' })
      }
      try {
        const res = await request('relation.php', { action: 'task_claim', id: this.id, task_key: t.key }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: res.message || '已领取', icon: 'none' })
          this.loadDetail()
        } else {
          uni.showToast({ title: (res && (res.message || res.msg)) || '领取失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
    },

    /* ==================== 我们的回忆 ==================== */
    openRec() {
      this.recText = ''
      this.recImg = ''
      this.recShow = true
    },
    closeRec() {
      if (this.recSending) return
      this.recShow = false
    },
    chooseRecImg() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: (r) => {
          const p = (r.tempFilePaths || [])[0]
          if (p) this.recImg = p
        }
      })
    },
    async submitRec() {
      if (this.recSending) return
      const text = String(this.recText || '').trim()
      if (!text && !this.recImg) return uni.showToast({ title: '写点什么或加张图吧', icon: 'none' })
      this.recSending = true
      try {
        if (this.recImg) {
          const up = await uploadFile(this.recImg, { type: 'post' })
          const url = (up && (up.url || up.path)) || ''
          if (!url) throw new Error('upload')
          await request('relation.php', { action: 'memory_add', id: this.id, type: 'image', content: url }, 'POST')
        }
        if (text) {
          const res = await request('relation.php', { action: 'memory_add', id: this.id, type: 'text', content: text }, 'POST')
          if (!res || res.code !== 0) {
            uni.showToast({ title: (res && (res.message || res.msg)) || '保存失败', icon: 'none' })
            this.recSending = false
            return
          }
        }
        this.recShow = false
        uni.showToast({ title: '已记入我们的回忆', icon: 'none' })
        this.loadDetail()
      } catch (e) {
        uni.showToast({ title: '保存失败，请稍后再试', icon: 'none' })
      }
      this.recSending = false
    },
    delMemory(m) {
      uni.showModal({
        title: '删除回忆',
        content: '确定删除这条记录吗？',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('relation.php', { action: 'memory_del', mid: m.id }, 'POST')
            if (res && res.code === 0) {
              uni.showToast({ title: '已删除', icon: 'none' })
              this.loadDetail()
            } else {
              uni.showToast({ title: (res && (res.message || res.msg)) || '删除失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
          }
        }
      })
    },
    previewImg(url) {
      if (!url) return
      uni.previewImage({ urls: [url] })
    },
    playVoice(m) {
      if (!m || !m.url) return uni.showToast({ title: '语音地址已失效', icon: 'none' })
      this.stopAudio()
      try {
        const a = uni.createInnerAudioContext()
        a.src = m.url
        a.play()
        this._audio = a
      } catch (e) {}
    },
    stopAudio() {
      if (this._audio) {
        try { this._audio.stop(); this._audio.destroy() } catch (e) {}
        this._audio = null
      }
    }
  }
}
</script>

<style scoped>
.rd-page { min-height: var(--tcy-vh, 100vh); background: #f6f7f9; }
.custom-nav-bar { position: fixed; top: 0; left: 0; width: 100%; z-index: 999; display: flex; align-items: center; justify-content: center; background: #fff; border-bottom: 1rpx solid #f2f2f2; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.nav-back { position: fixed; left: 24rpx; z-index: 1000; width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.back-icon { font-size: 36rpx; color: #333; font-weight: bold; padding-bottom: 4rpx; }

.rd-body { padding: 0 24rpx 60rpx; }
/* 自检提示条 */
.warn-bar { background: #fff7e6; border: 1rpx solid #ffe0a3; color: #b26a00; font-size: 23rpx; line-height: 1.6; padding: 20rpx 24rpx; border-radius: 16rpx; margin-bottom: 22rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 28rpx 26rpx; margin-bottom: 22rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; display: flex; align-items: center; justify-content: space-between; }
.sec-tip { font-size: 22rpx; font-weight: 400; color: #bbb; }
.empty-sub2 { font-size: 24rpx; color: #bbb; padding: 24rpx 0 6rpx; }
.empty-sub2.center { text-align: center; }

/* ===== 顶部 ===== */
.hero { background: linear-gradient(160deg, #fff4f7 0%, #ffffff 60%); border-radius: 24rpx; padding: 40rpx 26rpx 30rpx; margin-bottom: 22rpx; border: 1rpx solid #ffe6ee; }
.hero-avatars { position: relative; display: flex; align-items: flex-start; justify-content: center; }
.hero-side { display: flex; flex-direction: column; align-items: center; width: 190rpx; }
.hero-ava { width: 130rpx; height: 130rpx; border-radius: 50%; background: #eee; border: 4rpx solid #fff; box-shadow: 0 4rpx 18rpx rgba(255, 77, 121, .18); }
.hero-role { font-size: 22rpx; color: #888; margin-top: 12rpx; max-width: 180rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hero-link { width: 110rpx; height: 130rpx; box-sizing: border-box; }
.hero-type { text-align: center; font-size: 38rpx; font-weight: 800; color: #ff4d79; margin-top: 24rpx; letter-spacing: 2rpx; }
.hero-days { text-align: center; font-size: 24rpx; color: #b9b9b9; margin-top: 10rpx; }
.hero-stats { display: flex; margin-top: 30rpx; }
.hs { flex: 1; display: flex; flex-direction: column; align-items: center; }
.hs-num { font-size: 34rpx; font-weight: 800; color: #333; }
.hs-label { font-size: 21rpx; color: #a8a8a8; margin-top: 8rpx; }
.hero-bar { height: 14rpx; border-radius: 14rpx; background: #f1f1f1; margin-top: 30rpx; overflow: hidden; }
.hero-bar-in { height: 100%; border-radius: 14rpx; background: linear-gradient(90deg, #ff9ab5, #ff4d79); }
.hero-next { text-align: center; font-size: 22rpx; color: #bbb; margin-top: 14rpx; }
.hero-call { margin-top: 26rpx; height: 84rpx; border-radius: 999rpx; background: linear-gradient(135deg, #ff6f9c, #ff4d79); color: #fff; font-size: 28rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.hero-call.done { background: #f5f5f5; color: #b5b5b5; }
.hero-call:active { opacity: .8; }

/* ===== 互动标识 ===== */
.marks { display: flex; flex-wrap: wrap; gap: 18rpx; }
.mark { width: 128rpx; display: flex; flex-direction: column; align-items: center; opacity: .38; }
.mark.got { opacity: 1; }
.mark-ico { font-size: 40rpx; color: #ddd; line-height: 1; }
.mark.got .mark-ico { color: #ffb400; }
.mark-name { font-size: 20rpx; color: #888; margin-top: 10rpx; text-align: center; }
.mark.got .mark-name { color: #ff4d79; font-weight: 600; }

/* ===== 任务 ===== */
.task { display: flex; align-items: center; padding: 22rpx 0; border-top: 1rpx solid #f7f7f7; }
.task-info { flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-right: 16rpx; }
.task-title { font-size: 28rpx; font-weight: 600; color: #333; }
.task-desc { font-size: 22rpx; color: #a8a8a8; margin-top: 8rpx; }

/* ===== 权益 ===== */
.ben { display: flex; align-items: center; padding: 20rpx 0; border-top: 1rpx solid #f7f7f7; opacity: .5; }
.ben.on { opacity: 1; }
.ben-lv { width: 96rpx; height: 42rpx; border-radius: 999rpx; background: #f3f3f3; color: #999; font-size: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ben.on .ben-lv { background: #ffeaf0; color: #ff4d79; font-weight: 700; }
.ben-info { flex: 1; display: flex; flex-direction: column; margin-left: 20rpx; overflow: hidden; }
.ben-name { font-size: 27rpx; font-weight: 600; color: #333; }
.ben-desc { font-size: 21rpx; color: #a8a8a8; margin-top: 6rpx; }
.ben-state { font-size: 21rpx; color: #c2c2c2; flex-shrink: 0; }
.ben.on .ben-state { color: #ff4d79; }

/* ===== 回忆 ===== */
.mem { padding: 22rpx 0; border-top: 1rpx solid #f7f7f7; }
.mem-head { display: flex; align-items: center; margin-bottom: 12rpx; }
.mem-who { font-size: 24rpx; font-weight: 700; color: #ff4d79; margin-right: 12rpx; }
.mem-src { font-size: 19rpx; color: #ff9ab5; background: #fff0f4; padding: 2rpx 12rpx; border-radius: 999rpx; margin-right: 12rpx; }
.mem-time { flex: 1; font-size: 21rpx; color: #c2c2c2; }
.mem-del { font-size: 21rpx; color: #c2c2c2; }
.mem-img { width: 100%; border-radius: 16rpx; background: #f5f5f5; }
.mem-text { font-size: 26rpx; color: #444; line-height: 1.6; display: block; }
.mem-voice { display: inline-flex; align-items: center; height: 62rpx; padding: 0 26rpx; border-radius: 999rpx; background: #fff0f4; color: #ff4d79; font-size: 24rpx; }
.mem-voice-ico { margin-right: 10rpx; }

.mini-btn { flex-shrink: 0; padding: 0 26rpx; height: 62rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; }
.mini-btn.primary { background: #ff2442; color: #fff; }
.mini-btn.plain { background: #fff; color: #888; border: 1rpx solid #e5e5e5; }
.mini-btn.muted { background: #f5f5f5; color: #b5b5b5; }
.mini-btn:active { opacity: .75; }
.full-btn { width: 100%; margin-bottom: 8rpx; }

/* ===== 弹窗 ===== */
.rel-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .45); z-index: 999999; display: flex; align-items: flex-end; }
.rel-sheet { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 32rpx 30rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 78vh; overflow-y: auto; }
.rel-sheet-title { font-size: 30rpx; font-weight: 700; color: #333; display: block; text-align: center; }
.rel-sheet-sub { font-size: 23rpx; color: #aaa; display: block; text-align: center; margin-top: 10rpx; margin-bottom: 26rpx; }
.rec-textarea { width: 100%; box-sizing: border-box; height: 200rpx; border-radius: 16rpx; background: #f6f7f9; padding: 22rpx 24rpx; font-size: 26rpx; color: #333; }
.rel-input-ph { color: #bbb; }
.rec-img-box { margin-top: 20rpx; }
.rec-img { width: 100%; height: 320rpx; border-radius: 16rpx; background: #f5f5f5; }
.rel-sheet-actions { display: flex; gap: 20rpx; margin-top: 30rpx; }
.rel-sheet-btn { flex: 1; height: 84rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
.rel-sheet-btn.cancel { background: #f5f5f5; color: #666; }
.rel-sheet-btn.ok { background: #ff2442; color: #fff; }
.rel-sheet-btn.ok.disabled { opacity: .6; }
</style>
