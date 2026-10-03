<template>
  <view class="rel-page">

    <!-- 自定义导航栏 -->
    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: navBarHeight + 'px' }">
      <view class="nav-back" @click="goBack" :style="{ top: (statusBarHeight + (navBarHeight - 32) / 2) + 'px' }">
        <image src="/static/icon/arrow-left-dark.svg" class="back-icon" mode="aspectFit"></image>
      </view>
      <view class="nav-title">关系榜</view>
    </view>

    <!-- 三个分区：邀请朋友 / 亲密关系 / 亲密团 -->
    <view class="tabs" :style="{ top: navTotalHeight + 'px' }">
      <view class="tab" :class="{ on: tab === 'invite' }" @click="switchTab('invite')">邀请朋友</view>
      <view class="tab" :class="{ on: tab === 'intimacy' }" @click="switchTab('intimacy')">亲密关系</view>
      <view class="tab" :class="{ on: tab === 'group' }" @click="switchTab('group')">亲密团</view>
    </view>

    <view class="rel-body" :style="{ paddingTop: (navTotalHeight + 84) + 'px' }">

      <!-- ==================== 邀请朋友 ==================== -->
      <block v-if="tab === 'invite'">
        <view v-if="incoming.length" class="card">
          <view class="sec-title">待我确认<text class="sec-badge">{{ incoming.length }}</text></view>
          <view class="row" v-for="it in incoming" :key="'in' + it.id">
            <image class="row-ava" :src="it.user.avatar || defaultAvatar" mode="aspectFill" @click="goUser(it.user.uid)"></image>
            <view class="row-info">
              <text class="row-name">{{ it.user.name }}</text>
              <text class="row-sub">想和你成为「{{ it.type_name }}」</text>
            </view>
            <view class="row-btns">
              <view class="mini-btn plain" @click="handleApply(it, false)">拒绝</view>
              <view class="mini-btn primary" @click="handleApply(it, true)">同意</view>
            </view>
          </view>
        </view>

        <view v-if="outgoing.length" class="card">
          <view class="sec-title">等待对方确认</view>
          <view class="row" v-for="it in outgoing" :key="'out' + it.id">
            <image class="row-ava" :src="it.user.avatar || defaultAvatar" mode="aspectFill" @click="goUser(it.user.uid)"></image>
            <view class="row-info">
              <text class="row-name">{{ it.user.name }}</text>
              <text class="row-sub">已发出「{{ it.type_name }}」的申请</text>
            </view>
            <view class="mini-btn muted">等待确认</view>
          </view>
        </view>

        <view class="card">
          <view class="sec-title">互关好友<text class="sec-tip">选一位建立关系</text></view>
          <block v-if="friends.length">
            <view class="row" v-for="f in friends" :key="'f' + f.uid">
              <image class="row-ava" :src="f.avatar || defaultAvatar" mode="aspectFill" @click="goUser(f.uid)"></image>
              <view class="row-info">
                <text class="row-name">{{ f.name }}</text>
                <text class="row-sub" v-if="f.linked">已经是你的关系对象了</text>
                <text class="row-sub" v-else-if="f.pending">申请已发出，等待确认</text>
                <text class="row-sub" v-else>可以建立关系</text>
              </view>
              <view
                class="mini-btn"
                :class="canPick(f) ? 'primary' : 'muted'"
                @click="openPicker(f)"
              >{{ canPick(f) ? '邀请' : '不可申请' }}</view>
            </view>
          </block>
          <view v-else-if="!loading" class="empty-sub2">还没有互相关注的好友，先去互关几个人吧</view>
        </view>
      </block>

      <!-- ==================== 亲密关系 ==================== -->
      <block v-else-if="tab === 'intimacy'">
        <block v-if="myRelations.length">
          <view class="int-card" v-for="r in myRelations" :key="'r' + r.id" @click="goDetail(r)">
            <view class="int-pair">
              <image class="int-ava" :src="me.avatar || defaultAvatar" mode="aspectFill"></image>
              <text class="int-heart">♡</text>
              <image class="int-ava" :src="(r.with && r.with.avatar) || defaultAvatar" mode="aspectFill"></image>
            </view>
            <view class="int-info">
              <view class="int-line1">
                <text class="int-type">{{ r.type_name }}</text>
                <text class="int-name">{{ (r.with && r.with.name) || '对方' }}</text>
              </view>
              <view class="int-line2">
                <text class="int-lv">Lv.{{ r.level.level }} {{ r.level.level_name }}</text>
                <text class="int-dot">·</text>
                <text>亲密值 {{ r.intimacy }}</text>
                <text class="int-dot">·</text>
                <text>相伴 {{ r.days }} 天</text>
              </view>
              <view class="int-bar">
                <view class="int-bar-in" :style="{ width: r.level.progress + '%' }"></view>
              </view>
            </view>
            <view class="int-call" @click.stop="doCall(r)">打 call</view>
          </view>
          <view class="tip-line">点卡片看亲密值明细、做任务、翻我们的回忆</view>
        </block>
        <view v-else-if="!loading" class="card empty-box">
          <text class="empty-emoji">♡</text>
          <text class="empty-sub">还没有亲密关系，去「邀请朋友」和互关好友建立一段吧</text>
          <view class="mini-btn primary mt20" @click="switchTab('invite')">去邀请</view>
        </view>
      </block>

      <!-- ==================== 亲密团 ==================== -->
      <block v-else>
        <view v-if="invitedGroups.length" class="card">
          <view class="sec-title">邀请我加入<text class="sec-badge">{{ invitedGroups.length }}</text></view>
          <view class="row" v-for="g in invitedGroups" :key="'gi' + g.id">
            <image class="row-ava" :src="(g.owner && g.owner.avatar) || defaultAvatar" mode="aspectFill"></image>
            <view class="row-info">
              <text class="row-name">{{ g.name }}</text>
              <text class="row-sub">团长 {{ (g.owner && g.owner.name) || '好友' }} 邀请你加入</text>
            </view>
            <view class="row-btns">
              <view class="mini-btn plain" @click="handleGroupInvite(g, false)">拒绝</view>
              <view class="mini-btn primary" @click="handleGroupInvite(g, true)">加入</view>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="sec-title">我的亲密团<text class="sec-tip">多人结拜 / 组队</text></view>
          <block v-if="myGroups.length">
            <view class="grp" v-for="g in myGroups" :key="'g' + g.id">
              <view class="grp-head">
                <text class="grp-name">{{ g.name }}</text>
                <text class="grp-tag" v-if="g.is_owner">我是团长</text>
              </view>
              <view class="grp-members">
                <view class="grp-m" v-for="m in g.members" :key="'gm' + m.uid">
                  <image class="grp-ava" :class="{ 'not-joined': !m.joined }" :src="m.avatar || defaultAvatar" mode="aspectFill" @click="goUser(m.uid)"></image>
                  <text class="grp-mname">{{ m.name }}</text>
                  <text class="grp-mtag" v-if="m.is_owner">团长</text>
                  <text class="grp-mtag wait" v-else-if="!m.joined">待确认</text>
                </view>
              </view>
              <view class="grp-actions">
                <view class="mini-btn plain" v-if="!g.is_owner" @click="leaveGroup(g)">退出</view>
                <view class="mini-btn plain" v-else @click="dissolveGroup(g)">解散</view>
              </view>
            </view>
          </block>
          <view v-else-if="!groupsLoading" class="empty-sub2">还没有亲密团，拉上两三位好友组一个吧</view>

          <view class="mini-btn primary full-btn" @click="openCreate">创建亲密团</view>
        </view>
      </block>

    </view>

    <!-- ============ 关系选择弹窗 ============ -->
    <view v-if="pickerShow" class="rel-mask" @click="closePicker">
      <view class="rel-sheet" @click.stop>
        <text class="rel-sheet-title">选择你们的关系</text>
        <text class="rel-sheet-sub" v-if="pickTarget">和「{{ pickTarget.name }}」建立</text>

        <view class="rel-grid">
          <view
            v-for="t in relTypes"
            :key="t.key"
            class="rel-chip"
            :class="{ picked: picked === t.key, full: typeFull(t.key) }"
            @click="pick(t.key)"
          >
            <text class="chip-name">{{ t.name }}</text>
            <text class="chip-count">{{ countOf(myCounts, t.key) }}/{{ limitOf(t.key) }}</text>
          </view>
        </view>

        <view class="rel-custom">
          <input
            class="rel-input"
            v-model="customName"
            maxlength="8"
            placeholder="也可以自己写一个（最多 8 个字）"
            placeholder-class="rel-input-ph"
            @input="onCustomInput"
          />
          <text class="rel-custom-tip">自定义名额：{{ countOf(myCounts, 'custom') }}/{{ limitOf('custom') }}</text>
        </view>

        <view class="rel-sheet-actions">
          <view class="rel-sheet-btn cancel" @click="closePicker">取消</view>
          <view class="rel-sheet-btn ok" :class="{ disabled: sending }" @click="submitApply">{{ sending ? '发送中...' : '发送申请' }}</view>
        </view>
      </view>
    </view>

    <!-- ============ 创建亲密团弹窗 ============ -->
    <view v-if="createShow" class="rel-mask" @click="closeCreate">
      <view class="rel-sheet" @click.stop>
        <text class="rel-sheet-title">创建亲密团</text>
        <text class="rel-sheet-sub">选 2 位以上互关好友，等他们确认后就成团</text>

        <input
          class="rel-input"
          v-model="groupName"
          maxlength="12"
          placeholder="给亲密团起个名字（最多 12 字）"
          placeholder-class="rel-input-ph"
        />

        <view class="pick-list">
          <view class="pick-item" v-for="f in friends" :key="'pf' + f.uid" @click="toggleGroupPick(f.uid)">
            <image class="row-ava sm" :src="f.avatar || defaultAvatar" mode="aspectFill"></image>
            <text class="pick-name">{{ f.name }}</text>
            <view class="pick-box" :class="{ on: groupPicked.indexOf(f.uid) >= 0 }"></view>
          </view>
          <view v-if="!friends.length" class="empty-sub2">还没有互关好友可以邀请</view>
        </view>

        <view class="rel-sheet-actions">
          <view class="rel-sheet-btn cancel" @click="closeCreate">取消</view>
          <view class="rel-sheet-btn ok" :class="{ disabled: groupCreating }" @click="submitCreate">{{ groupCreating ? '创建中...' : ('创建（已选 ' + groupPicked.length + '）') }}</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { request } from '../../common/request.js'
import { applyH5ViewportHeightVar, getScreenMetrics } from '../../common/screen.js'

export default {
  data() {
    return {
      statusBarHeight: 0,
      navBarHeight: 44,
      navTotalHeight: 44,
      tab: 'intimacy',
      loading: true,
      me: {},
      myRelations: [],
      myCounts: {},
      limits: {},
      incoming: [],
      outgoing: [],
      friends: [],
      relTypes: [],
      pickerShow: false,
      pickTarget: null,
      picked: '',
      customName: '',
      sending: false,
      /* 亲密团 */
      groupsLoading: true,
      myGroups: [],
      invitedGroups: [],
      createShow: false,
      groupName: '',
      groupPicked: [],
      groupCreating: false,
      defaultAvatar: 'https://y.sgyunp.cn/f/6eXTL/IMG_5336.jpeg'
    }
  },
  onLoad() {
    applyH5ViewportHeightVar()
    const m = getScreenMetrics()
    this.statusBarHeight = m.statusBarHeight
    this.navBarHeight = m.navBarHeight
    this.navTotalHeight = this.statusBarHeight + this.navBarHeight
    this.loadBoard()
    this.loadGroups()
  },
  onShow() {
    if (!this.loading) {
      this.loadBoard()
      if (this.tab === 'group') this.loadGroups()
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    fmtDate(v) {
      const s = String(v || '')
      return s.length >= 10 ? s.substring(0, 10) : s
    },
    goUser(uid) {
      if (!uid) return
      uni.navigateTo({ url: '/pages/user/profile?userId=' + uid })
    },
    goDetail(r) {
      if (!r || !r.id) return
      uni.navigateTo({ url: '/pages/relation/detail?id=' + r.id })
    },
    switchTab(t) {
      this.tab = t
      if (t === 'group') this.loadGroups()
    },

    /* ==================== 数据 ==================== */
    async loadBoard() {
      this.loading = true
      try {
        const res = await request('relation.php', { action: 'board' }, 'GET')
        if (res && res.code === 0 && res.data) {
          const d = res.data
          this.me = d.me || {}
          this.myRelations = d.my_relations || []
          this.myCounts = d.my_counts || {}
          this.limits = d.limits || {}
          this.incoming = d.incoming || []
          this.outgoing = d.outgoing || []
          this.friends = d.friends || []
          if ((d.types || []).length) this.relTypes = d.types
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
      if (!(this.relTypes || []).length) {
        this.relTypes = [
          { key: 'cp', name: '情侣' }, { key: 'cp2', name: 'CP' },
          { key: 'bestie', name: '闺蜜' }, { key: 'buddy', name: '死党' },
          { key: 'brother', name: '兄弟' }, { key: 'sister', name: '姐妹' },
          { key: 'close', name: '挚友' }, { key: 'partner', name: '搭档' },
          { key: 'master', name: '师徒' }, { key: 'soulmate', name: '灵魂伴侣' }
        ]
      }
      this.loading = false
    },
    async loadGroups() {
      this.groupsLoading = true
      try {
        const res = await request('relation.php', { action: 'group_list' }, 'GET')
        if (res && res.code === 0 && res.data) {
          this.myGroups = res.data.my || []
          this.invitedGroups = res.data.invited || []
        }
      } catch (e) { /* 静默失败，不影响其它 tab */ }
      this.groupsLoading = false
    },

    /* ==================== 打 call ==================== */
    async doCall(r) {
      if (!r || !r.id) return
      try {
        const res = await request('relation.php', { action: 'call', id: r.id }, 'POST')
        if (res && res.code === 0) {
          uni.showToast({ title: (res.message || '打 call 成功'), icon: 'none' })
          this.loadBoard()
        } else {
          uni.showToast({ title: (res && (res.message || res.msg)) || '今天已经打过啦', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
    },

    /* ==================== 关系类型选择 ==================== */
    countOf(counts, key) {
      return Number((counts || {})[key] || 0)
    },
    limitOf(key) {
      return Number((this.limits || {})[key] || 5)
    },
    typeFull(key) {
      if (this.countOf(this.myCounts, key) >= this.limitOf(key)) return true
      const t = this.pickTarget || {}
      return this.countOf(t.counts, key) >= this.limitOf(key)
    },
    canPick(f) {
      if (!f) return false
      if (f.linked || f.pending) return false
      return (this.relTypes || []).some(t => !this.typeFull(t.key))
    },
    openPicker(f) {
      if (!f) return
      if (f.linked) return uni.showToast({ title: '你们之间已经有关系了', icon: 'none' })
      if (f.pending) return uni.showToast({ title: '申请已发出，等对方确认', icon: 'none' })
      if (!this.canPick(f)) return uni.showToast({ title: '各类型名额都满了，先解除一些吧', icon: 'none' })
      this.pickTarget = f
      this.picked = ''
      this.customName = ''
      this.pickerShow = true
    },
    closePicker() {
      if (this.sending) return
      this.pickerShow = false
    },
    pick(key) {
      const t = (this.relTypes || []).find(x => x.key === key) || {}
      if (this.typeFull(key)) {
        return uni.showToast({ title: '「' + (t.name || '该类型') + '」名额已满（' + this.limitOf(key) + ' 个）', icon: 'none' })
      }
      this.picked = key
      this.customName = ''
    },
    onCustomInput() {
      if (String(this.customName || '').trim() !== '') this.picked = ''
    },
    nameOf(key) {
      const t = (this.relTypes || []).find(x => x.key === key)
      return t ? t.name : '关系'
    },
    async submitApply() {
      if (this.sending) return
      const custom = String(this.customName || '').trim()
      const typeKey = custom !== '' ? 'custom' : this.picked
      if (typeKey === '') return uni.showToast({ title: '请选择或填写关系', icon: 'none' })
      if (this.typeFull(typeKey)) {
        return uni.showToast({ title: '「' + (custom || this.nameOf(typeKey)) + '」名额已满', icon: 'none' })
      }
      const uid = String((this.pickTarget || {}).uid || '')
      if (!uid) return
      this.sending = true
      try {
        const res = await request('relation.php', {
          action: 'apply', uid, type_key: typeKey,
          type_name: typeKey === 'custom' ? custom : ''
        }, 'POST')
        if (res && res.code === 0) {
          this.pickerShow = false
          uni.showToast({ title: '申请已发出，等待对方确认', icon: 'none' })
          this.loadBoard()
        } else {
          uni.showToast({ title: (res && (res.message || res.msg)) || '发送失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
      this.sending = false
    },

    handleApply(it, accept) {
      if (!it) return
      uni.showModal({
        title: accept ? '同意关系' : '拒绝关系',
        content: accept ? '同意后，你们的关系会显示在双方的主页上' : '确定要拒绝「' + it.user.name + '」的关系申请吗？',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('relation.php', { action: 'handle', id: it.id, accept: accept ? 1 : 0 }, 'POST')
            if (res && res.code === 0) {
              uni.showToast({ title: accept ? '关系已建立' : '已拒绝', icon: 'none' })
              this.loadBoard()
            } else {
              uni.showToast({ title: (res && (res.message || res.msg)) || '操作失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
          }
        }
      })
    },

    /* ==================== 亲密团 ==================== */
    openCreate() {
      this.groupName = ''
      this.groupPicked = []
      this.createShow = true
      if (!this.friends.length) this.loadBoard()
    },
    closeCreate() {
      if (this.groupCreating) return
      this.createShow = false
    },
    toggleGroupPick(uid) {
      const i = this.groupPicked.indexOf(uid)
      if (i >= 0) this.groupPicked.splice(i, 1)
      else {
        if (this.groupPicked.length >= 9) return uni.showToast({ title: '一个团最多 10 个人', icon: 'none' })
        this.groupPicked.push(uid)
      }
    },
    async submitCreate() {
      if (this.groupCreating) return
      const name = String(this.groupName || '').trim()
      if (name === '') return uni.showToast({ title: '给亲密团起个名字吧', icon: 'none' })
      if (this.groupPicked.length < 2) return uni.showToast({ title: '至少选 2 位互关好友', icon: 'none' })
      this.groupCreating = true
      try {
        const res = await request('relation.php', {
          action: 'group_create', name: name, uids: this.groupPicked.join(',')
        }, 'POST')
        if (res && res.code === 0) {
          this.createShow = false
          uni.showToast({ title: '亲密团已创建，等好友确认', icon: 'none' })
          this.loadGroups()
        } else {
          uni.showToast({ title: (res && (res.message || res.msg)) || '创建失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
      this.groupCreating = false
    },
    handleGroupInvite(g, accept) {
      uni.showModal({
        title: accept ? '加入亲密团' : '拒绝邀请',
        content: accept ? ('确认加入「' + g.name + '」吗？') : ('确定拒绝「' + g.name + '」的邀请吗？'),
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('relation.php', {
              action: 'group_handle', group_id: g.id, accept: accept ? 1 : 0
            }, 'POST')
            if (res && res.code === 0) {
              uni.showToast({ title: accept ? '已加入' : '已拒绝', icon: 'none' })
              this.loadGroups()
            } else {
              uni.showToast({ title: (res && (res.message || res.msg)) || '操作失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
          }
        }
      })
    },
    leaveGroup(g) {
      uni.showModal({
        title: '退出亲密团',
        content: '确定退出「' + g.name + '」吗？',
        success: async (r) => {
          if (!r.confirm) return
          const res = await request('relation.php', { action: 'group_leave', group_id: g.id }, 'POST')
          if (res && res.code === 0) { uni.showToast({ title: '已退出', icon: 'none' }); this.loadGroups() }
          else uni.showToast({ title: (res && (res.message || res.msg)) || '操作失败', icon: 'none' })
        }
      })
    },
    dissolveGroup(g) {
      uni.showModal({
        title: '解散亲密团',
        content: '解散后所有成员都会离开「' + g.name + '」，确定吗？',
        success: async (r) => {
          if (!r.confirm) return
          const res = await request('relation.php', { action: 'group_dissolve', group_id: g.id }, 'POST')
          if (res && res.code === 0) { uni.showToast({ title: '已解散', icon: 'none' }); this.loadGroups() }
          else uni.showToast({ title: (res && (res.message || res.msg)) || '操作失败', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.rel-page { min-height: var(--tcy-vh, 100vh); background: #f6f7f9; }
.custom-nav-bar { position: fixed; top: 0; left: 0; width: 100%; z-index: 999; display: flex; align-items: center; justify-content: center; background: #fff; border-bottom: 1rpx solid #f2f2f2; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.nav-back { position: fixed; left: 24rpx; z-index: 1000; width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.back-icon { font-size: 36rpx; color: #333; font-weight: bold; padding-bottom: 4rpx; }

/* ===== 顶部三个分区 ===== */
.tabs { position: fixed; left: 0; width: 100%; z-index: 998; display: flex; background: #fff; height: 84rpx; border-bottom: 1rpx solid #f2f2f2; }
.tab { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #888; position: relative; }
.tab.on { color: #ff2442; font-weight: 700; }
.tab.on::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 56rpx; height: 6rpx; border-radius: 6rpx; background: #ff2442; }

.rel-body { padding: 20rpx 24rpx 60rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 28rpx 26rpx; margin-bottom: 22rpx; }

.sec-title { font-size: 28rpx; font-weight: 700; color: #333; margin-bottom: 14rpx; display: flex; align-items: center; }
.sec-badge { margin-left: 12rpx; min-width: 34rpx; height: 34rpx; padding: 0 10rpx; border-radius: 999rpx; background: #ff2442; color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }
.sec-tip { margin-left: 12rpx; font-size: 22rpx; font-weight: 400; color: #bbb; }

/* ===== 亲密关系卡 ===== */
.int-card { display: flex; align-items: center; background: #fff; border-radius: 24rpx; padding: 24rpx 22rpx; margin-bottom: 20rpx; }
/* 左边一对头像：我 ♡ 对方，一眼看出谁是谁 */
.int-pair { display: flex; align-items: center; flex-shrink: 0; margin-right: 20rpx; }
.int-ava { width: 76rpx; height: 76rpx; border-radius: 50%; background: #eee; border: 2rpx solid #fff; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, .06); flex-shrink: 0; }
.int-pair .int-ava:last-child { box-shadow: 0 2rpx 10rpx rgba(255, 77, 121, .3); }
.int-heart { font-size: 22rpx; color: #ffb3c9; margin: 0 6rpx; }
.int-info { flex: 1; overflow: hidden; }
.int-line1 { display: flex; align-items: center; }
.int-type { font-size: 22rpx; font-weight: 800; color: #ff4d79; background: #ffeaf0; padding: 4rpx 14rpx; border-radius: 999rpx; margin-right: 12rpx; flex-shrink: 0; }
.int-name { font-size: 28rpx; font-weight: 600; color: #333; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.int-line2 { font-size: 21rpx; color: #999; margin-top: 10rpx; display: flex; align-items: center; }
.int-lv { color: #ff8a3d; font-weight: 700; }
.int-dot { margin: 0 6rpx; color: #ddd; }
.int-bar { height: 10rpx; border-radius: 10rpx; background: #f1f1f1; margin-top: 12rpx; overflow: hidden; }
.int-bar-in { height: 100%; border-radius: 10rpx; background: linear-gradient(90deg, #ff9ab5, #ff4d79); }
.int-call { flex-shrink: 0; margin-left: 14rpx; padding: 0 22rpx; height: 60rpx; border-radius: 999rpx; background: #fff0f4; color: #ff4d79; border: 1rpx solid #ffd0dd; font-size: 23rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.int-call:active { opacity: .7; }
.tip-line { text-align: center; font-size: 22rpx; color: #c2c2c2; padding: 8rpx 0 4rpx; }

/* ===== 亲密团 ===== */
.grp { border-top: 1rpx solid #f7f7f7; padding: 24rpx 0; }
.grp-head { display: flex; align-items: center; margin-bottom: 18rpx; }
.grp-name { font-size: 30rpx; font-weight: 700; color: #333; }
.grp-tag { margin-left: 14rpx; font-size: 20rpx; color: #ff4d79; background: #ffeaf0; padding: 4rpx 14rpx; border-radius: 999rpx; }
.grp-members { display: flex; flex-wrap: wrap; gap: 22rpx; }
.grp-m { display: flex; flex-direction: column; align-items: center; width: 110rpx; }
.grp-ava { width: 84rpx; height: 84rpx; border-radius: 50%; background: #eee; }
.grp-ava.not-joined { opacity: .35; }
.grp-mname { font-size: 21rpx; color: #666; margin-top: 8rpx; max-width: 110rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.grp-mtag { font-size: 18rpx; color: #ff4d79; margin-top: 4rpx; }
.grp-mtag.wait { color: #bbb; }
.grp-actions { display: flex; justify-content: flex-end; margin-top: 18rpx; }
.full-btn { width: 100%; margin-top: 24rpx; height: 84rpx; }

/* ===== 列表行 / 按钮 ===== */
.row { display: flex; align-items: center; padding: 20rpx 0; border-top: 1rpx solid #f7f7f7; }
.row-ava { width: 88rpx; height: 88rpx; border-radius: 50%; background: #eee; margin-right: 20rpx; flex-shrink: 0; }
.row-ava.sm { width: 64rpx; height: 64rpx; margin-right: 18rpx; }
.row-info { flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-right: 16rpx; }
.row-name { font-size: 29rpx; font-weight: 600; color: #333; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.row-sub { font-size: 23rpx; color: #a8a8a8; margin-top: 8rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.row-btns { display: flex; gap: 14rpx; flex-shrink: 0; }

.mini-btn { flex-shrink: 0; padding: 0 26rpx; height: 60rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; }
.mini-btn.primary { background: #ff2442; color: #fff; }
.mini-btn.plain { background: #fff; color: #888; border: 1rpx solid #e5e5e5; }
.mini-btn.muted { background: #f5f5f5; color: #b5b5b5; }
.mini-btn:active { opacity: .75; }
.mt20 { margin-top: 24rpx; }
.empty-sub2 { font-size: 24rpx; color: #bbb; padding: 24rpx 0 6rpx; }
.empty-box { display: flex; flex-direction: column; align-items: center; padding: 60rpx 26rpx; }
.empty-emoji { font-size: 64rpx; color: #ffc3d5; line-height: 1; }
.empty-sub { font-size: 24rpx; color: #aaa; margin-top: 16rpx; text-align: center; }

/* ===== 弹窗 ===== */
.rel-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .45); z-index: 999999; display: flex; align-items: flex-end; }
.rel-sheet { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 32rpx 30rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 78vh; overflow-y: auto; }
.rel-sheet-title { font-size: 30rpx; font-weight: 700; color: #333; display: block; text-align: center; }
.rel-sheet-sub { font-size: 23rpx; color: #aaa; display: block; text-align: center; margin-top: 10rpx; margin-bottom: 26rpx; }
.rel-grid { display: flex; flex-wrap: wrap; gap: 18rpx; }
.rel-chip { display: flex; align-items: center; padding: 0 22rpx; height: 68rpx; border-radius: 999rpx; background: #f5f6f8; color: #555; }
.chip-name { font-size: 26rpx; }
.chip-count { font-size: 20rpx; color: #b6b6b6; margin-left: 10rpx; }
.rel-chip.picked { background: #ffe7ee; color: #ff2442; font-weight: 700; border: 1rpx solid #ffc2d3; }
.rel-chip.picked .chip-count { color: #ff7f9d; }
.rel-chip.full { opacity: .45; }
.rel-custom { margin-top: 24rpx; }
.rel-input { height: 82rpx; border-radius: 16rpx; background: #f6f7f9; padding: 0 24rpx; font-size: 26rpx; color: #333; }
.rel-input-ph { color: #bbb; }
.rel-custom-tip { font-size: 21rpx; color: #b6b6b6; margin-top: 10rpx; display: block; }
.rel-sheet-actions { display: flex; gap: 20rpx; margin-top: 30rpx; }
.rel-sheet-btn { flex: 1; height: 84rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
.rel-sheet-btn.cancel { background: #f5f5f5; color: #666; }
.rel-sheet-btn.ok { background: #ff2442; color: #fff; }
.rel-sheet-btn.ok.disabled { opacity: .6; }

/* 邀请好友多选 */
.pick-list { margin-top: 24rpx; max-height: 44vh; overflow-y: auto; }
.pick-item { display: flex; align-items: center; padding: 18rpx 0; border-top: 1rpx solid #f7f7f7; }
.pick-name { flex: 1; font-size: 27rpx; color: #333; }
.pick-box { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ddd; box-sizing: border-box; }
.pick-box.on { background: #ff2442; border-color: #ff2442; }
</style>
