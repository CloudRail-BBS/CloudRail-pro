<template>
  <view class="page">
    <view class="top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav">
        <view class="nav-back" @click="goBack">‹</view>
        <view class="tabs" v-if="!isOther">
          <text class="tab" :class="{on: relTab===0}" @click="relTab=0">邀请朋友</text>
          <text class="tab" :class="{on: relTab===1}" @click="relTab=1">亲密关系</text>
          <text class="tab" :class="{on: relTab===2}" @click="relTab=2">亲密团</text>
        </view>
        <text class="nav-title" v-else>{{ viewName || 'TA' }} 的亲密关系</text>
        <view class="nav-cup" @click="openRank">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M6 4h12v5a6 6 0 0 1-12 0V4z"/><path d="M6 17h12"/><path d="M9 21h6"/><path d="M12 15v6"/></svg>
        </view>
      </view>

      <view class="badges">
        <view class="badge-card" v-for="(b,i) in badges" :key="i">
          <view class="badge-custom">自定义 ›</view>
          <view class="badge-icon">
            <view class="lock">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c8b8c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </view>
          </view>
          <text class="badge-label">{{ b }}</text>
        </view>
      </view>
    </view>

    <!-- 看别人的主页：TA 的全部亲密关系，可以给 TA 打 call -->
    <scroll-view class="body" scroll-y v-if="isOther">
      <text class="invite-hint">TA 的亲密关系（{{ otherRelations.length }}）</text>

      <view class="slot" v-for="rel in otherRelations" :key="'o' + rel.id">
        <image class="slot-ava" :src="rel.otherUser.avatar" mode="aspectFill" @click.stop="goOtherUser(rel)" />
        <view class="slot-mid" @click="goOtherUser(rel)">
          <text class="slot-name">{{ rel.otherUser.name }}</text>
          <text class="slot-sub">{{ rel.type_name }} · 第{{ rel.days }}天 · 亲密度 {{ rel.intimacy }}</text>
        </view>
        <view class="cheer-btn" @click.stop="cheer(rel)">打call</view>
      </view>

      <view class="type-block" v-if="!otherRelations.length">
        <view class="slot">
          <text class="slot-empty">TA 还没有亲密关系</text>
        </view>
      </view>

      <view style="height:200rpx"></view>
    </scroll-view>

    <!-- 亲密关系：展示全部已建立关系 + 待确认 -->
    <scroll-view class="body" scroll-y v-if="!isOther && relTab===1">
      <view class="type-block" v-if="myRelations.length">
        <text class="type-title">已建立的关系（{{ myRelations.length }}）</text>

        <view class="slot" v-for="g in relationGroups" :key="g.type_key">
          <!-- 只有一段：直接展示对方 -->
          <template v-if="g.items.length === 1">
            <image class="slot-ava" :src="g.items[0].otherUser.avatar" mode="aspectFill" @click.stop="goDetail(g.items[0])" />
            <view class="slot-mid" @click="goDetail(g.items[0])">
              <text class="slot-name">{{ g.items[0].otherUser.name }}</text>
              <text class="slot-sub">已建立「{{ g.items[0].type_name }}」关系 · 第{{ g.items[0].days }}天</text>
            </view>
            <view class="slot-show-home" :class="{on: g.items[0].visible !== 0}" @click.stop="toggleShowHome(g.items[0])">
              <text class="slot-show-text">主页</text>
              <view class="slot-switch" :class="{on: g.items[0].visible !== 0}"><view class="slot-dot"></view></view>
            </view>
            <view class="slot-del" @click.stop="unbindRelation(g.items[0])">解除</view>
          </template>

          <!-- 同类多段：叠头像 + 数量角标，点开查看全部 -->
          <template v-else>
            <view class="stack" @click="openGroup(g)">
              <image class="stack-ava" v-for="(it,i) in g.items.slice(0,3)" :key="it.id"
                     :src="it.otherUser.avatar" mode="aspectFill"
                     :style="{ left: (i * 24) + 'rpx', zIndex: 10 - i }" />
              <view class="stack-badge">{{ g.items.length }}</view>
            </view>
            <view class="slot-mid" @click="openGroup(g)">
              <text class="slot-name">{{ g.type_name }}（{{ g.items.length }}）</text>
              <text class="slot-sub">{{ groupNames(g) }}</text>
            </view>
            <view class="slot-more" @click.stop="openGroup(g)">查看 ›</view>
          </template>
        </view>
      </view>

      <view class="type-block" v-if="incoming.length">
        <text class="type-title">待我确认（{{ incoming.length }}）</text>
        <view class="slot" v-for="inv in incoming" :key="'in'+inv.id">
          <image class="slot-ava" :src="inv.user.avatar" mode="aspectFill" />
          <view class="slot-mid">
            <text class="slot-name">{{ inv.user.name }} 邀请你做「{{ inv.type_name }}」</text>
            <text class="slot-sub">点击处理</text>
          </view>
          <view class="slot-del cancel" @click.stop="acceptInvite(inv)">处理</view>
        </view>
      </view>

      <view class="type-block" v-if="outgoing.length">
        <text class="type-title">等待对方确认（{{ outgoing.length }}）</text>
        <view class="slot" v-for="inv in outgoing" :key="'out'+inv.id">
          <image class="slot-ava" :src="inv.user.avatar" mode="aspectFill" />
          <view class="slot-mid">
            <text class="slot-name">已邀请 {{ inv.user.name }} 建立「{{ inv.type_name }}」</text>
            <text class="slot-sub">等待对方同意</text>
          </view>
          <view class="slot-del cancel" @click.stop="cancelInvite(inv)">撤回</view>
        </view>
      </view>

      <view class="type-block" v-if="!myRelations.length && !incoming.length && !outgoing.length">
        <view class="slot" @click="relTab=0">
          <view class="slot-plus" style="background:#ff6b9d18"><text class="plus" style="color:#ff6b9d">+</text></view>
          <text class="slot-empty">还没有亲密关系，点这里去「邀请朋友」建立吧</text>
        </view>
      </view>

      <view style="height:200rpx"></view>
    </scroll-view>

    <!-- 邀请朋友：从互关好友里选人再挑关系 -->
    <scroll-view class="body" scroll-y v-if="!isOther && relTab===0">
      <text class="invite-hint">从你的互关好友里选一位，再挑个关系建立</text>

      <view class="slot" v-if="!friends.length" style="background:#fff">
        <text class="slot-empty">还没有互相关注的好友，先去互关吧</text>
      </view>

      <view class="friend" v-for="f in friends" :key="f.uid" @click="pickFriend(f)">
        <image class="friend-ava" :src="f.avatar" mode="aspectFill" />
        <view class="friend-mid">
          <text class="friend-name">{{ f.name }}</text>
          <text class="friend-sub" v-if="f.linked">已建立「{{ f.linkedName }}」关系</text>
          <text class="friend-sub" v-else-if="f.pending">已发送邀请，等待对方同意</text>
          <text class="friend-sub" v-else>互相关注 · 可建立关系</text>
        </view>
        <view class="friend-go" :class="{muted: f.pending}">{{ f.linked ? '再加' : (f.pending ? '待确认' : '建立') }}</view>
      </view>

      <view style="height:200rpx"></view>
    </scroll-view>

    <!-- 亲密团：每个团背后就是一个真正的群聊，可以进去聊天 -->
    <scroll-view class="body" scroll-y v-if="!isOther && relTab===2">
      <view class="gt-top">
        <text class="gt-top-title">我的亲密团（{{ groups.length }}）</text>
        <view class="gt-create" @click="openGroupCreate">+ 创建亲密团</view>
      </view>

      <view class="gt-loading" v-if="groupLoading"><text>加载中…</text></view>

      <view class="gt-card" v-for="g in groups" :key="'g' + g.id">
        <view class="gt-head" @click="openGroupChat(g)">
          <view class="gt-stack">
            <image
              class="gt-stack-ava"
              v-for="(m, i) in g.members.slice(0, 3)"
              :key="'gm' + m.uid"
              :src="m.avatar"
              mode="aspectFill"
              :style="{ left: (i * 26) + 'rpx', zIndex: 10 - i }"
            />
          </view>
          <view class="gt-mid">
            <text class="gt-name">{{ g.name }}</text>
            <text class="gt-sub">{{ groupMemberText(g) }}</text>
          </view>
          <view class="gt-tag" v-if="g.is_owner">团长</view>
        </view>
        <view class="gt-acts">
          <view class="gt-btn main" @click="openGroupChat(g)">进入聊天</view>
          <view class="gt-btn" v-if="g.is_owner" @click="openGroupInvite(g)">邀请成员</view>
          <view class="gt-btn danger" v-if="g.is_owner" @click="dissolveGroup(g)">解散</view>
          <view class="gt-btn danger" v-else @click="leaveGroup(g)">退出</view>
        </view>
      </view>

      <view class="type-block" v-if="!groups.length && !groupLoading">
        <view class="slot">
          <text class="slot-empty">还没有亲密团，点右上角创建一个（至少邀请 2 位互关好友）</text>
        </view>
      </view>

      <view class="type-block" v-if="groupInvites.length">
        <text class="type-title">邀请我加入（{{ groupInvites.length }}）</text>
        <view class="slot" v-for="inv in groupInvites" :key="'gi' + inv.id">
          <image class="slot-ava" :src="inv.owner.avatar" mode="aspectFill" />
          <view class="slot-mid">
            <text class="slot-name">{{ inv.owner.name }} 邀请你加入「{{ inv.name }}」</text>
            <text class="slot-sub">点击处理</text>
          </view>
          <view class="slot-del cancel" @click.stop="handleGroupInvite(inv)">处理</view>
        </view>
      </view>

      <view style="height:200rpx"></view>
    </scroll-view>

    <view class="footer" v-if="!isOther && relTab===1">
      <view class="f-btn outline" @click="relTab=0">建立亲密关系</view>
      <view class="f-btn solid" @click="relTab=2">
        建立亲密团<text class="f-tag">上新</text>
      </view>
    </view>

    <!-- 同一种关系的全部对象 -->
    <view class="gp-mask" v-if="groupView" @click="closeGroup">
      <view class="gp-panel" @click.stop>
        <view class="gp-head">
          <text class="gp-title">{{ groupView.type_name }}（{{ groupView.items.length }}）</text>
          <text class="gp-close" @click="closeGroup">✕</text>
        </view>
        <scroll-view class="gp-body" scroll-y>
          <view class="slot gp-slot" v-for="rel in groupView.items" :key="rel.id">
            <image class="slot-ava" :src="rel.otherUser.avatar" mode="aspectFill" @click.stop="goDetail(rel)" />
            <view class="slot-mid" @click="goDetail(rel)">
              <text class="slot-name">{{ rel.otherUser.name }}</text>
              <text class="slot-sub">已建立「{{ rel.type_name }}」关系 · 第{{ rel.days }}天</text>
            </view>
            <view class="slot-show-home" :class="{on: rel.visible !== 0}" @click.stop="toggleShowHome(rel)">
              <text class="slot-show-text">主页</text>
              <view class="slot-switch" :class="{on: rel.visible !== 0}"><view class="slot-dot"></view></view>
            </view>
            <view class="slot-del" @click.stop="unbindRelation(rel)">解除</view>
          </view>
          <view style="height:40rpx"></view>
        </scroll-view>
      </view>
    </view>

    <!-- 亲密团：创建 / 邀请（从互关好友里选） -->
    <view class="gp2-mask" v-if="groupPicker.show" @click="closeGroupPicker">
      <view class="gp2-panel" @click.stop>
        <view class="gp-head">
          <text class="gp-title">{{ groupPicker.mode === 'create' ? '创建亲密团' : '邀请成员' }}</text>
          <text class="gp-close" @click="closeGroupPicker">✕</text>
        </view>

        <view class="gp2-input" v-if="groupPicker.mode === 'create'">
          <input
            class="gp2-input-inner"
            v-model="groupPicker.name"
            placeholder="给亲密团起个名字（最多12个字）"
            maxlength="12"
          />
        </view>

        <text class="gp2-hint">
          {{ groupPicker.mode === 'create' ? '选择至少 2 位互关好友' : '选择要邀请的互关好友' }}
          · 已选 {{ groupPicker.selected.length }} 人
        </text>

        <scroll-view class="gp2-body" scroll-y>
          <view class="gp2-none" v-if="!groupPicker.friends.length">
            <text>{{ groupPicker.mode === 'create' ? '还没有互关好友，先去互关吧' : '没有可邀请的互关好友了' }}</text>
          </view>
          <view
            class="gp2-friend"
            :class="{ off: f.pending }"
            v-for="f in groupPicker.friends"
            :key="'pf' + f.uid"
            @click="toggleGroupPick(f)"
          >
            <image class="gp2-ava" :src="f.avatar" mode="aspectFill" />
            <text class="gp2-name">{{ f.name }}</text>
            <text class="gp2-invited" v-if="f.pending">已邀请</text>
            <view class="gp2-check" v-else :class="{ on: groupPicker.selected.indexOf(f.uid) >= 0 }">✓</view>
          </view>
          <view style="height:20rpx"></view>
        </scroll-view>

        <view class="gp2-submit" :class="{ off: !canSubmitGroup }" @click="submitGroupPicker">
          {{ groupPicker.mode === 'create' ? '创建亲密团' : '发送邀请' }}
        </view>
      </view>
    </view>

    <!-- 亲密关系排行榜：按亲密值/等级从高到低 -->
    <view class="rank-mask" v-if="showRank" @click="closeRank">
      <view class="rank-panel" @click.stop>
        <view class="rank-head">
          <text class="rank-title">亲密关系排行榜</text>
          <text class="rank-close" @click="closeRank">✕</text>
        </view>
        <text class="rank-sub">按亲密度（等级）从高到低 · 共 {{ rankList.length }} 对</text>

        <scroll-view class="rank-body" scroll-y>
          <view class="rank-loading" v-if="rankLoading"><text>加载中…</text></view>

          <view class="rank-empty" v-else-if="!rankList.length">
            <text>还没有上榜的亲密关系</text>
          </view>

          <view class="rank-item" v-for="item in rankList" :key="item.id" :class="{mine: item.mine}">
            <view class="rank-no" :class="'no' + item.rank">{{ item.rank }}</view>
            <view class="rank-avas">
              <image class="rank-ava" :src="item.users[0].avatar" mode="aspectFill" />
              <image class="rank-ava second" :src="item.users[1].avatar" mode="aspectFill" />
            </view>
            <view class="rank-mid">
              <text class="rank-names">{{ item.users[0].name }} &amp; {{ item.users[1].name }}</text>
              <text class="rank-meta">{{ item.type_name }} · {{ item.level_name }} Lv.{{ item.level }} · {{ item.days }}天</text>
            </view>
            <view class="rank-score">
              <text class="rank-num">{{ item.intimacy }}</text>
              <text class="rank-unit">亲密度</text>
            </view>
          </view>

          <view style="height:40rpx"></view>
        </scroll-view>
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
      targetName: '',
      /* 看别人主页时的对象 */
      isOther: false,
      viewUid: '',
      viewName: '',
      otherRelations: [],
      relTab: 1,
      loading: false,
      badges: ['亲密等级30级', '续火花超7天', '续火花超7天'],
      /* 亲密团：每个团背后就是一个真正的群聊 */
      groups: [],
      groupInvites: [],
      groupLoading: false,
      groupPicker: { show: false, mode: 'create', gid: 0, name: '', selected: [], friends: [] },
      myRelations: [],
      incoming: [],
      outgoing: [],
      friends: [],
      types: [],
      showRank: false,
      rankLoading: false,
      rankList: [],
      groupKey: '',
      typeColors: {
        cp: '#ff6b9d', cp2: '#ff6b9d', lover: '#ff6b9d',
        bestie: '#ffa502', sister: '#ffa502',
        buddy: '#4a9eff', brother: '#4a9eff', partner: '#4a9eff',
        close: '#2ed573', soulmate: '#a55eea', master: '#2ed573'
      }
    }
  },
  computed: {
    /* 按关系类型分组：同一种关系（比如都是兄弟）只占一行，角标显示有几个 */
    relationGroups() {
      const map = {}
      const order = []
      this.myRelations.forEach(rel => {
        const k = rel.type_key || rel.type_name || 'other'
        if (!map[k]) {
          map[k] = { type_key: k, type_name: rel.type_name || '好友', items: [] }
          order.push(k)
        }
        map[k].items.push(rel)
      })
      return order.map(k => map[k])
    },
    groupView() {
      if (!this.groupKey) return null
      return this.relationGroups.find(g => g.type_key === this.groupKey) || null
    },
    /* 创建/邀请弹层：条件不满足时按钮置灰，避免点了只弹一句提示、感觉像"点了没反应" */
    canSubmitGroup() {
      const p = this.groupPicker
      if (!p || !p.show) return false
      if (p.mode === 'create') {
        return String(p.name || '').trim().length > 0 && p.selected.length >= 2
      }
      return p.selected.length >= 1
    }
  },
  onLoad(opt = {}) {
    this.targetId = opt.targetId || ''
    this.targetName = decodeURIComponent(opt.name || '')
    /* 从别人主页进来：viewUid 是主页主人，展示 TA 的亲密关系 */
    this.viewUid = opt.viewUid || opt.userId || ''
    this.viewName = decodeURIComponent(opt.viewName || '')
    this.isOther = !!this.viewUid
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    if (this.targetId) this.relTab = 1
  },
  onShow() {
    if (this.isOther) {
      this.loadOtherRelations()
    } else {
      this.loadBoard()
      this.loadGroups()
    }
  },
  methods: {
    async loadBoard() {
      if (this.loading) return
      this.loading = true
      try {
        const res = await request('relation.php', { action: 'board' }, 'GET')
        if (res.code === 0 && res.data) {
          const d = res.data
          if (d.types && d.types.length) this.types = d.types
          this.myRelations = (d.my_relations || []).map(this.normalizeRel)
          this.incoming = this.normalizeInvites(d.incoming || [])
          this.outgoing = this.normalizeInvites(d.outgoing || [])
          this.friends = (d.friends || []).map(f => ({
            uid: f.uid,
            /* 昵称没填就退回账号名，避免出现空白名字 */
            name: f.name || f.nickname || f.username || '好友',
            avatar: f.avatar || f.avatar_url || '',
            linked: !!f.linked,
            linkedName: f.linked_type || this.findLinkedName(f.uid),
            pending: !!f.pending
          }))
          if (this.targetId) await this.loadTargetState()
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
      this.loading = false
    },
    async loadTargetState() {
      try {
        const res = await request('relation.php', { action: 'get', targetId: this.targetId }, 'GET')
        if (res.code === 0 && res.data) {
          const b = res.data.pending
          if (b && b.is_from_me && !this.outgoing.some(o => o.type === b.type_key)) {
            this.outgoing.unshift({ id: b.id, type: b.type_key, type_name: b.type_name, user: { name: this.targetName, avatar: '' } })
          }
        }
      } catch (e) {}
    },
    /* 看别人主页：拿 TA 自己的全部亲密关系 */
    async loadOtherRelations() {
      if (!this.viewUid) return
      try {
        const res = await request('relation.php', { action: 'info', uid: this.viewUid }, 'GET')
        if (res.code === 0 && res.data) {
          this.otherRelations = (res.data.target_relations || []).map(this.normalizeRel)
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    /* 点别人的关系对象，进那个人的主页 */
    goOtherUser(rel) {
      const uid = rel && rel.otherUser && rel.otherUser.uid
      if (!uid) return
      uni.navigateTo({ url: '/pages/user/profile?userId=' + uid })
    },
    /* 给 TA 的这段关系打 call */
    async cheer(rel) {
      if (!rel || !rel.id) return
      try {
        const res = await request('relation.php', { action: 'cheer', id: rel.id }, 'POST')
        if (res.code === 0) {
          uni.showToast({ title: res.msg || '打 call 成功', icon: 'none' })
          if (res.data && res.data.intimacy_add > 0) rel.intimacy = (rel.intimacy || 0) + res.data.intimacy_add
        } else {
          uni.showToast({ title: res.msg || '打 call 失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '打 call 失败', icon: 'none' })
      }
    },
    normalizeRel(r) {
      /* 兼容两种返回形状：新版 otherUser，老版/列表版的 with */
      const o = r.otherUser || r.with || {}
      return {
        id: r.id,
        type: r.type || r.type_key,
        type_key: r.type || r.type_key || r.type_name,
        type_name: r.type_name,
        days: r.days || 1,
        intimacy: r.intimacy || 0,
        visible: (r.visible === 0) ? 0 : 1,
        otherUser: {
          uid: o.uid || o.id || r.other_uid || '',
          name: o.name || o.nickname || o.username || '好友',
          avatar: o.avatar || '/static/logo.png'
        }
      }
    },
    normalizeInvites(list) {
      return list.map(it => {
        const u = it.user || it.fromUser || it.toUser || {}
        return {
          id: it.id,
          type: it.type || it.type_key,
          type_name: it.type_name,
          user: {
            uid: u.uid || u.id || it.uid || '',
            name: u.name || u.nickname || u.username || it.name || '好友',
            avatar: u.avatar || it.avatar || '/static/logo.png'
          }
        }
      })
    },
    findLinkedName(uid) {
      const hit = this.myRelations.find(r => String(r.otherUser.uid) === String(uid))
      return hit ? hit.type_name : ''
    },
    goBack() { uni.navigateBack() },
    groupNames(g) {
      const names = g.items.map(it => it.otherUser.name).filter(Boolean)
      if (names.length <= 3) return names.join('、')
      return names.slice(0, 3).join('、') + ' 等 ' + names.length + ' 人'
    },
    openGroup(g) { this.groupKey = g.type_key },
    closeGroup() { this.groupKey = '' },
    goDetail(rel) {
      let url = '/pages/relation/detail?targetId=' + rel.otherUser.uid + '&name=' + encodeURIComponent(rel.otherUser.name)
      uni.navigateTo({ url })
    },
    pickFriend(f) {
      if (f.pending) { uni.showToast({ title: '已发送邀请，等待对方同意', icon: 'none' }); return }
      this.openTypePicker(f)
    },
    openTypePicker(f) {
      const texts = this.types.map((t, i) => `${i + 1}. ${t.name}`).join('    ')
      if (!this.types.length) { this.doApply(f, 'cp', '情侣'); return }
      uni.showModal({
        title: `和 ${f.name} 建立关系`,
        content: '可建立的关系：\n' + texts + '\n\n点「确定」先选第 1 个',
        confirmText: '确定',
        cancelText: '取消',
        success: (r) => {
          if (!r.confirm) return
          uni.showActionSheet({
            itemList: this.types.map(t => t.name),
            success: (s) => {
              const t = this.types[s.tapIndex]
              if (!t) return
              this.confirmApply(f, t)
            }
          })
        }
      })
    },
    confirmApply(f, t) {
      uni.showModal({
        title: `建立${t.name}关系`,
        content: `将向 ${f.name} 发送「${t.name}」邀请，对方同意后即建立关系`,
        confirmText: '发送申请',
        success: (r) => {
          if (r.confirm) this.doApply(f, t.key, t.name)
        }
      })
    },
    async doApply(f, type, typeName) {
      try {
        const res = await request('relation.php', { action: 'send', targetId: f.uid, type: type }, 'POST')
        if (res.code === 0) {
          f.pending = true
          this.outgoing.unshift({ id: res.data && res.data.id, type: type, type_name: typeName, user: { uid: f.uid, name: f.name, avatar: f.avatar } })
          uni.showToast({ title: '申请已发送', icon: 'success' })
        } else {
          uni.showToast({ title: res.msg || '发送失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },
    acceptInvite(inv) {
      uni.showModal({
        title: `「${inv.type_name}」邀请`,
        content: `${inv.user.name} 邀请你建立「${inv.type_name}」关系，同意吗？`,
        confirmText: '同意',
        cancelText: '拒绝',
        success: async (r) => {
          try {
            if (r.confirm) {
              const res = await request('relation.php', { action: 'accept', id: inv.id }, 'POST')
              if (res.code !== 0) { uni.showToast({ title: res.msg || '操作失败', icon: 'none' }); return }
              uni.showToast({ title: '关系建立成功', icon: 'success' })
            } else {
              await request('relation.php', { action: 'reject', id: inv.id }, 'POST')
            }
            const uid = inv.user.uid
            this.incoming = this.incoming.filter(x => x.id !== inv.id)
            if (r.confirm && uid && !this.myRelations.some(x => String(x.otherUser.uid) === String(uid))) {
              this.myRelations.unshift({
                id: 0, type: inv.type, type_name: inv.type_name, days: 1, visible: 1,
                otherUser: { uid: uid, name: inv.user.name, avatar: inv.user.avatar }
              })
            }
            setTimeout(() => this.loadBoard(), 400)
          } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
        }
      })
    },
    cancelInvite(inv) {
      uni.showModal({
        title: '撤回邀请', content: `撤回向 ${inv.user.name} 发出的「${inv.type_name}」邀请？`, confirmText: '撤回',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('relation.php', { action: 'reject', id: inv.id }, 'POST')
            if (res.code === 0) {
              this.outgoing = this.outgoing.filter(x => x.id !== inv.id)
              const ff = this.friends.find(x => String(x.uid) === String(inv.user.uid))
              if (ff) ff.pending = false
              uni.showToast({ title: '已撤回', icon: 'none' })
            } else uni.showToast({ title: res.msg || '撤回失败', icon: 'none' })
          } catch (e) { uni.showToast({ title: '撤回失败', icon: 'none' }) }
        }
      })
    },
    unbindRelation(rel) {
      uni.showModal({
        title: '解除关系', content: `解除与 ${rel.otherUser.name} 的「${rel.type_name}」关系？`, confirmText: '解除',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('relation.php', { action: 'cancel', id: rel.id }, 'POST')
            if (res.code === 0) {
              this.myRelations = this.myRelations.filter(x => x.id !== rel.id)
              this.friends.forEach(ff => { if (String(ff.uid) === String(rel.otherUser.uid)) ff.linked = false })
              uni.showToast({ title: '已解除', icon: 'none' })
            } else uni.showToast({ title: res.msg || '解除失败', icon: 'none' })
          } catch (e) { uni.showToast({ title: '解除失败', icon: 'none' }) }
        }
      })
    },
    /* 主页展示开关：直接开 / 直接关，立刻生效，不需要对方同意 */
    async toggleShowHome(rel) {
      if (!rel || this.isOther) return
      const nextVisible = rel.visible === 0 ? 1 : 0
      try {
        const res = await request('relation.php', { action: 'toggleVisible', id: rel.id, visible: nextVisible }, 'POST')
        if (res.code !== 0) {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
          return
        }
        rel.visible = (Number((res.data || {}).visible) === 1) ? 1 : 0
        uni.showToast({ title: res.msg || '操作成功', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    openRank() {
      this.showRank = true
      this.loadRank()
    },
    closeRank() { this.showRank = false },
    async loadRank() {
      if (this.rankLoading) return
      this.rankLoading = true
      try {
        const res = await request('relation.php', { action: 'rank', limit: 50 }, 'GET')
        if (res.code === 0 && res.data) {
          this.rankList = (res.data.list || []).map(it => {
            const us = it.users || []
            return {
              id: it.id,
              rank: it.rank,
              type_name: it.type_name,
              level: it.level,
              level_name: it.level_name,
              intimacy: it.intimacy,
              days: it.days,
              mine: !!it.mine,
              users: [
                { uid: (us[0] && us[0].uid) || '', name: (us[0] && us[0].name) || '用户', avatar: (us[0] && us[0].avatar) || '/static/logo.png' },
                { uid: (us[1] && us[1].uid) || '', name: (us[1] && us[1].name) || '用户', avatar: (us[1] && us[1].avatar) || '/static/logo.png' }
              ]
            }
          })
        } else {
          uni.showToast({ title: res.msg || '排行榜加载失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '排行榜加载失败', icon: 'none' })
      }
      this.rankLoading = false
    },
    /* ==================== 亲密团（背后就是群聊） ==================== */
    async loadGroups() {
      if (this.groupLoading) return
      this.groupLoading = true
      try {
        const res = await request('relation.php', { action: 'group_list' }, 'GET')
        if (res.code === 0 && res.data) {
          this.groups = (res.data.my || []).map(g => ({
            id: g.id,
            name: g.name,
            is_owner: !!g.is_owner,
            session_id: g.session_id || 0,
            members: (g.members || []).map(m => ({
              uid: String(m.uid),
              name: m.name || '好友',
              avatar: m.avatar || '/static/logo.png',
              joined: !!m.joined
            }))
          }))
          this.groupInvites = (res.data.invited || []).map(iv => ({
            id: iv.id,
            name: iv.name,
            owner: {
              uid: (iv.owner && iv.owner.uid) || '',
              name: (iv.owner && iv.owner.name) || '团长',
              avatar: (iv.owner && iv.owner.avatar) || '/static/logo.png'
            }
          }))
        }
      } catch (e) {
        uni.showToast({ title: '亲密团加载失败', icon: 'none' })
      }
      this.groupLoading = false
    },
    /* 团成员文案：人数 + 名字 */
    groupMemberText(g) {
      const joined = (g.members || []).filter(m => m.joined)
      const list = joined.length ? joined : (g.members || [])
      const names = list.map(m => m.name).filter(Boolean)
      const head = names.slice(0, 3).join('、')
      const more = names.length > 3 ? ' 等' : ''
      return list.length + ' 人 · ' + head + more
    },
    /* 进入这个亲密团的群聊：没有会话就现场让后端建一个 */
    async openGroupChat(g) {
      if (!g) return
      if (g.session_id) {
        uni.navigateTo({
          url: '/pages/message/group-chat?groupId=' + g.session_id + '&name=' + encodeURIComponent(g.name)
        })
        return
      }
      uni.showLoading({ title: '正在进入…' })
      try {
        const res = await request('relation.php', { action: 'group_chat', group_id: g.id }, 'POST')
        uni.hideLoading()
        if (res && res.code === 0 && res.data && res.data.session_id) {
          g.session_id = res.data.session_id
          uni.navigateTo({
            url: '/pages/message/group-chat?groupId=' + res.data.session_id +
              '&name=' + encodeURIComponent(res.data.name || g.name)
          })
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '进入失败，请稍后重试', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '进入失败，请稍后重试', icon: 'none' })
      }
    },
    /* 拉互关好友（用于建团 / 邀请）：主用 user/mutual，失败就退回「邀请朋友」那份互关好友 */
    async fetchMutualFriends(excludeUids) {
      const ex = (excludeUids || []).map(String)
      let list = []
      try {
        const res = await request('user.php', { action: 'mutual_follow_list' }, 'GET')
        if (res && res.code === 0 && res.data && res.data.list) list = res.data.list
      } catch (e) {}
      if (!list.length) {
        /* 兜底：和「邀请朋友」页签同一份数据，那边已经验证可用 */
        try {
          const res2 = await request('relation.php', { action: 'board' }, 'GET')
          if (res2 && res2.code === 0 && res2.data && res2.data.friends) list = res2.data.friends
        } catch (e) {}
      }
      return list
        .map(u => ({
          uid: String(u.uid || u.id || ''),
          name: u.name || u.nickname || u.username || '好友',
          avatar: u.avatar || u.avatar_url || '/static/logo.png'
        }))
        .filter(u => u.uid && ex.indexOf(u.uid) < 0)
    },
    async openGroupCreate() {
      const friends = await this.fetchMutualFriends([])
      if (!friends.length) {
        uni.showToast({ title: '还没有互关好友，先去互关吧', icon: 'none' })
        return
      }
      this.groupPicker = { show: true, mode: 'create', gid: 0, name: '', selected: [], friends }
    },
    async openGroupInvite(g) {
      if (!g) return
      /* 已进团的排除掉；已邀请还没同意的保留但标成"已邀请"（可再催一次也无副作用） */
      const joinedUids = (g.members || []).filter(m => m.joined).map(m => String(m.uid))
      const pendingUids = (g.members || []).filter(m => !m.joined).map(m => String(m.uid))
      const friends = (await this.fetchMutualFriends(joinedUids)).map(f => ({
        uid: f.uid,
        name: f.name,
        avatar: f.avatar,
        pending: pendingUids.indexOf(f.uid) >= 0
      }))
      if (!friends.length) {
        uni.showToast({ title: '没有可邀请的互关好友了（互关好友可能都已经在团里）', icon: 'none' })
        return
      }
      this.groupPicker = { show: true, mode: 'invite', gid: g.id, name: g.name, selected: [], friends }
    },
    closeGroupPicker() {
      this.groupPicker = { show: false, mode: 'create', gid: 0, name: '', selected: [], friends: [] }
    },
    toggleGroupPick(f) {
      if (!f) return
      if (f.pending) {
        uni.showToast({ title: '已经邀请过 TA 了，等对方确认', icon: 'none' })
        return
      }
      const i = this.groupPicker.selected.indexOf(f.uid)
      if (i >= 0) this.groupPicker.selected.splice(i, 1)
      else this.groupPicker.selected.push(f.uid)
    },
    async submitGroupPicker() {
      const p = this.groupPicker
      const uids = p.selected.join(',')
      if (p.mode === 'create') {
        const name = String(p.name || '').trim()
        if (!name) { uni.showToast({ title: '请给亲密团起个名字', icon: 'none' }); return }
        if (p.selected.length < 2) { uni.showToast({ title: '至少选择 2 位互关好友', icon: 'none' }); return }
        try {
          const res = await request('relation.php', { action: 'group_create', name, uids }, 'POST')
          if (res.code === 0) {
            this.closeGroupPicker()
            uni.showToast({ title: '亲密团已创建，等好友确认', icon: 'none' })
            this.loadGroups()
          } else {
            uni.showToast({ title: res.msg || '创建失败', icon: 'none' })
          }
        } catch (e) { uni.showToast({ title: '创建失败', icon: 'none' }) }
        return
      }
      if (!p.selected.length) { uni.showToast({ title: '请选择要邀请的好友', icon: 'none' }); return }
      try {
        const res = await request('relation.php', { action: 'group_invite', group_id: p.gid, uids }, 'POST')
        if (res.code === 0) {
          this.closeGroupPicker()
          uni.showToast({ title: res.msg || '邀请已发出', icon: 'none' })
          this.loadGroups()
        } else {
          uni.showToast({ title: res.msg || '邀请失败', icon: 'none' })
        }
      } catch (e) { uni.showToast({ title: '邀请失败', icon: 'none' }) }
    },
    /* 处理别人邀请我加入的亲密团 */
    handleGroupInvite(inv) {
      if (!inv) return
      uni.showModal({
        title: '亲密团邀请',
        content: inv.owner.name + ' 邀请你加入「' + inv.name + '」，同意吗？',
        confirmText: '同意',
        cancelText: '拒绝',
        success: async (r) => {
          try {
            const accept = r.confirm ? 1 : 0
            const res = await request('relation.php', { action: 'group_handle', group_id: inv.id, accept }, 'POST')
            if (res.code === 0) {
              uni.showToast({ title: res.msg || (accept ? '已加入亲密团' : '已拒绝'), icon: 'none' })
              this.loadGroups()
            } else {
              uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
            }
          } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
        }
      })
    },
    leaveGroup(g) {
      if (!g) return
      uni.showModal({
        title: '退出亲密团',
        content: '确定退出「' + g.name + '」？',
        confirmText: '退出',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('relation.php', { action: 'group_leave', group_id: g.id }, 'POST')
            if (res.code === 0) {
              uni.showToast({ title: '已退出', icon: 'none' })
              this.loadGroups()
            } else uni.showToast({ title: res.msg || '退出失败', icon: 'none' })
          } catch (e) { uni.showToast({ title: '退出失败', icon: 'none' }) }
        }
      })
    },
    dissolveGroup(g) {
      if (!g) return
      uni.showModal({
        title: '解散亲密团',
        content: '解散「' + g.name + '」会同时删除群聊和聊天记录，确定吗？',
        confirmText: '解散',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('relation.php', { action: 'group_dissolve', group_id: g.id }, 'POST')
            if (res.code === 0) {
              uni.showToast({ title: '亲密团已解散', icon: 'none' })
              this.loadGroups()
            } else uni.showToast({ title: res.msg || '解散失败', icon: 'none' })
          } catch (e) { uni.showToast({ title: '解散失败', icon: 'none' }) }
        }
      })
    },
    showToast(msg) { uni.showToast({ title: msg, icon: 'none' }) }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f7; overflow-x: hidden; }
.top { background: linear-gradient(180deg, #ffe4ec 0%, #fff0f5 100%); padding-bottom: 30rpx; }
.nav { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.nav-back { font-size: 44rpx; color: #333; padding: 0 10rpx; line-height: 1; }
.tabs { display: flex; gap: 36rpx; }
.tab { font-size: 28rpx; color: #999; padding-bottom: 6rpx; position: relative; }
.tab.on { color: #111; font-weight: 700; }
.tab.on::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:32rpx; height:5rpx; border-radius:3rpx; background:#111; }
.nav-cup { padding: 6rpx; }
.nav-title { font-size: 30rpx; font-weight: 700; color: #111; flex: 1; text-align: center; }
.cheer-btn { padding: 10rpx 26rpx; border-radius: 999rpx; background: linear-gradient(135deg,#ff4d6d,#ff2442); color: #fff; font-size: 24rpx; font-weight: 600; flex-shrink: 0; }

.badges { display: flex; gap: 20rpx; padding: 20rpx 30rpx 0; }
.badge-card { flex: 1; background: rgba(255,255,255,0.55); border-radius: 24rpx; padding: 20rpx 16rpx 24rpx; text-align: center; position: relative; }
.badge-custom { font-size: 22rpx; color: #b0a0b0; text-align: right; }
.badge-icon { width: 90rpx; height: 90rpx; margin: 0 auto 10rpx; }
.lock { width: 100%; height: 100%; border-radius: 50%; background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; }
.badge-label { font-size: 22rpx; color: #999; display: block; }

/* 注意：scroll-view 一定要 box-sizing: border-box + width: 100%，
   否则 padding 会额外撑出 60rpx，右边的按钮（比如「创建亲密团」）就被挤出屏幕了 */
.body { padding: 24rpx 30rpx 0; box-sizing: border-box; width: 100%; }
.type-block { margin-bottom: 28rpx; }
.type-title { display: block; font-size: 30rpx; font-weight: 700; color: #111; margin-bottom: 16rpx; }
.slot { display: flex; align-items: center; background: #fff; border-radius: 24rpx; padding: 24rpx 28rpx; min-height: 100rpx; }
.slot-plus { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 20rpx; flex-shrink: 0; }
.plus { font-size: 40rpx; font-weight: 300; line-height: 1; }
.slot-empty { font-size: 28rpx; color: #b3b3b3; }
.slot-ava { width: 76rpx; height: 76rpx; border-radius: 50%; margin-right: 20rpx; background: #f5f5f5; flex-shrink: 0; }
.slot-mid { flex: 1; }
.slot-name { display: block; font-size: 28rpx; font-weight: 600; color: #111; margin-bottom: 4rpx; }
.slot-sub { font-size: 22rpx; color: #aaa; }
.slot-del { padding: 8rpx 24rpx; border-radius: 999rpx; background: #f5f5f5; font-size: 24rpx; color: #666; flex-shrink: 0; }
.slot-del.cancel { background: #fff0f0; color: #ff4d6d; }

/* 同类多段：叠头像 + 数量角标 */
.stack { position: relative; width: 150rpx; height: 80rpx; margin-right: 16rpx; flex-shrink: 0; }
.stack-ava { position: absolute; top: 4rpx; width: 72rpx; height: 72rpx; border-radius: 50%; background: #f5f5f5; border: 4rpx solid #fff; }
.stack-badge { position: absolute; right: 0; bottom: 0; min-width: 34rpx; height: 34rpx; padding: 0 8rpx; border-radius: 999rpx; background: #ff2442; color: #fff; font-size: 20rpx; line-height: 34rpx; text-align: center; border: 3rpx solid #fff; z-index: 20; }
.slot-more { font-size: 24rpx; color: #ff6b9d; padding: 8rpx 12rpx; flex-shrink: 0; }

.slot-show-home { display: flex; align-items: center; gap: 8rpx; margin-right: 16rpx; flex-shrink: 0; }
.slot-show-text { font-size: 22rpx; color: #999; }
.slot-switch { width: 52rpx; height: 30rpx; background: #ddd; border-radius: 15rpx; position: relative; transition: background 0.2s; }
.slot-switch.on { background: #ff2442; }
.slot-dot { position: absolute; top: 3rpx; left: 3rpx; width: 24rpx; height: 24rpx; background: #fff; border-radius: 50%; transition: transform 0.2s; }
.slot-switch.on .slot-dot { transform: translateX(22rpx); }

.invite-hint { display: block; font-size: 24rpx; color: #999; margin-bottom: 20rpx; }
.friend { display: flex; align-items: center; background: #fff; border-radius: 24rpx; padding: 22rpx 26rpx; margin-bottom: 18rpx; }
.friend-ava { width: 84rpx; height: 84rpx; border-radius: 50%; margin-right: 22rpx; background: #f5f5f5; flex-shrink: 0; }
.friend-mid { flex: 1; min-width: 0; }
.friend-name { display: block; font-size: 29rpx; font-weight: 600; color: #111; margin-bottom: 6rpx; }
.friend-sub { font-size: 22rpx; color: #aaa; }
.friend-go { padding: 10rpx 26rpx; border-radius: 999rpx; background: linear-gradient(135deg,#ff4d6d,#ff2442); color: #fff; font-size: 24rpx; font-weight: 600; flex-shrink: 0; }
.friend-go.muted { background: #ffe1e8; color: #ff6b8a; }

/* ===== 亲密团 ===== */
.gt-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12rpx; margin-bottom: 20rpx; }
.gt-top-title { flex: 1 1 auto; min-width: 0; font-size: 28rpx; font-weight: 700; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-create { padding: 10rpx 26rpx; border-radius: 999rpx; background: linear-gradient(135deg,#ff4d6d,#ff2442); color: #fff; font-size: 24rpx; font-weight: 600; flex-shrink: 0; }
.gt-loading { padding: 60rpx 0; text-align: center; font-size: 26rpx; color: #bbb; }
.gt-card { background: #fff; border-radius: 24rpx; padding: 24rpx 26rpx; margin-bottom: 20rpx; box-sizing: border-box; overflow: hidden; }
.gt-head { display: flex; align-items: center; min-width: 0; }
.gt-stack { position: relative; width: 128rpx; height: 76rpx; flex: 0 0 auto; margin-right: 14rpx; }
.gt-stack-ava { position: absolute; top: 0; width: 68rpx; height: 68rpx; border-radius: 50%; background: #f5f5f5; border: 4rpx solid #fff; }
.gt-mid { flex: 1 1 0; min-width: 0; overflow: hidden; }
.gt-name { display: block; font-size: 29rpx; font-weight: 700; color: #111; margin-bottom: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-sub { display: block; font-size: 22rpx; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-tag { padding: 4rpx 16rpx; border-radius: 999rpx; background: #ffe4ec; color: #ff4d6d; font-size: 20rpx; flex: 0 0 auto; margin-left: 10rpx; }
.gt-acts { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.gt-btn { flex: 1 1 30%; min-width: 0; height: 64rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 23rpx; background: #f5f5f7; color: #555; white-space: nowrap; }
.gt-btn.main { background: linear-gradient(135deg,#ff4d6d,#ff2442); color: #fff; font-weight: 600; }
.gt-btn.danger { background: #fff0f0; color: #ff4d6d; }

/* ===== 亲密团：创建 / 邀请弹层 ===== */
.gp2-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: flex-end; }
.gp2-panel { width: 100%; max-height: 76vh; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 30rpx 30rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; box-sizing: border-box; }
.gp2-input { background: #f5f5f7; border-radius: 999rpx; padding: 0 30rpx; margin-bottom: 18rpx; box-sizing: border-box; }
.gp2-input-inner { width: 100%; height: 84rpx; font-size: 28rpx; color: #111; box-sizing: border-box; }
.gp2-hint { font-size: 22rpx; color: #aaa; margin-bottom: 16rpx; }
.gp2-body { flex: 1 1 auto; min-height: 0; max-height: 46vh; }
.gp2-none { padding: 70rpx 0; text-align: center; font-size: 26rpx; color: #bbb; }
.gp2-friend { display: flex; align-items: center; padding: 18rpx 16rpx; border-radius: 22rpx; margin-bottom: 12rpx; background: #fafafc; box-sizing: border-box; min-width: 0; }
.gp2-ava { width: 72rpx; height: 72rpx; border-radius: 50%; background: #eee; margin-right: 20rpx; flex: 0 0 auto; }
.gp2-name { flex: 1 1 0; min-width: 0; font-size: 28rpx; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp2-check { width: 44rpx; height: 44rpx; border-radius: 50%; border: 3rpx solid #ddd; color: transparent; font-size: 24rpx; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; box-sizing: border-box; }
.gp2-check.on { background: #ff2442; border-color: #ff2442; color: #fff; }
.gp2-friend.off { opacity: 0.55; }
.gp2-invited { font-size: 22rpx; color: #bbb; flex-shrink: 0; }
.gp2-submit { flex: 0 0 auto; margin-top: 18rpx; height: 92rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; color: #fff; background: linear-gradient(135deg,#ff4d6d,#ff2442); box-shadow: 0 8rpx 24rpx rgba(255,36,66,0.25); box-sizing: border-box; }

.gp2-submit.off { background: #e6e6ea; color: #fff; box-shadow: none; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 20rpx; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: linear-gradient(0deg,#f5f5f7 80%,transparent); }
.f-btn { flex: 1; height: 92rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
.f-btn.outline { border: 2rpx solid #ff6b9d; color: #ff6b9d; background: #fff; }
.f-btn.solid { background: linear-gradient(135deg,#ff4d6d,#ff2442); color: #fff; box-shadow: 0 8rpx 24rpx rgba(255,36,66,0.25); }
.f-tag { font-size: 18rpx; background: rgba(255,255,255,0.3); padding: 4rpx 14rpx; border-radius: 999rpx; margin-left: 10rpx; }

/* 同类关系弹层 */
.gp-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 98; display: flex; align-items: flex-end; }
.gp-panel { width: 100%; max-height: 72vh; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 30rpx 30rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; box-sizing: border-box; }
.gp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.gp-title { font-size: 34rpx; font-weight: 700; color: #111; }
.gp-close { font-size: 34rpx; color: #bbb; padding: 0 10rpx; }
.gp-body { flex: 1; min-height: 0; }
.gp-slot { background: #fafafc; margin-bottom: 14rpx; }

/* 排行榜弹层 */
.rank-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 99; display: flex; align-items: flex-end; }
.rank-panel { width: 100%; max-height: 76vh; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 30rpx 30rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; box-sizing: border-box; }
.rank-head { display: flex; align-items: center; justify-content: space-between; }
.rank-title { font-size: 34rpx; font-weight: 700; color: #111; }
.rank-close { font-size: 34rpx; color: #bbb; padding: 0 10rpx; }
.rank-sub { font-size: 22rpx; color: #aaa; margin: 8rpx 0 18rpx; }
.rank-body { flex: 1; min-height: 0; }
.rank-loading, .rank-empty { padding: 80rpx 0; text-align: center; font-size: 26rpx; color: #bbb; }
.rank-item { display: flex; align-items: center; padding: 20rpx 16rpx; border-radius: 22rpx; margin-bottom: 12rpx; background: #fafafc; }
.rank-item.mine { background: #fff0f5; border: 2rpx solid #ffd6e8; }
.rank-no { width: 48rpx; height: 48rpx; border-radius: 50%; background: #e8e8ee; color: #888; font-size: 24rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rank-no.no1 { background: linear-gradient(135deg,#ffd24a,#ff9f1a); color: #fff; }
.rank-no.no2 { background: linear-gradient(135deg,#d7d7e0,#a8a8bb); color: #fff; }
.rank-no.no3 { background: linear-gradient(135deg,#ffb98a,#e08b52); color: #fff; }
.rank-avas { display: flex; margin: 0 18rpx 0 14rpx; flex-shrink: 0; }
.rank-ava { width: 60rpx; height: 60rpx; border-radius: 50%; background: #eee; border: 3rpx solid #fff; }
.rank-ava.second { margin-left: -22rpx; }
.rank-mid { flex: 1; min-width: 0; }
.rank-names { display: block; font-size: 26rpx; font-weight: 600; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-meta { font-size: 21rpx; color: #aaa; }
.rank-score { text-align: right; flex-shrink: 0; }
.rank-num { display: block; font-size: 30rpx; font-weight: 700; color: #ff4d6d; }
.rank-unit { font-size: 19rpx; color: #bbb; }
</style>