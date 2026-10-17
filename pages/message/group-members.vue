<template>
  <view class="page" :class="themeClass">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="back-arrow">‹</text>
        </view>
        <text class="nav-title">群成员 ({{ totalCount }})</text>
        <view class="nav-right" @click="toggleSearch">
          <text class="search-icon">🔍</text>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar" v-if="showSearch">
      <view class="search-input-wrap">
        <text class="search-icon-small">🔍</text>
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="搜索群成员"
          confirm-type="search"
          @input="onSearchInput"
          @confirm="doSearch"
        />
        <text class="search-clear" v-if="searchKeyword" @click="clearSearch">✕</text>
      </view>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="loadMore">
      <!-- 群主和管理员 -->
      <view class="section" v-if="adminMembers.length > 0">
        <view class="section-header">
          <text class="section-title">群主 / 管理员</text>
          <text class="section-count">{{ adminMembers.length }}人</text>
        </view>
        <view class="member-list">
          <view
            class="member-item"
            v-for="member in adminMembers"
            :key="member.user_id || member.id"
            @click="onMemberClick(member)"
          >
            <view class="member-avatar-wrap">
              <image class="member-avatar" :src="fixUrl(member.avatar)" mode="aspectFill" />
              <view class="member-online-dot" :class="{ on: isOnline(member) }"></view>
            </view>
            <view class="member-info">
              <view class="member-name-row">
                <text class="member-name">{{ member.nickname || member.name || member.username }}</text>
                <text class="role-badge owner" v-if="member.role === 'owner'">群主</text>
                <text class="role-badge admin" v-else-if="member.role === 'admin'">管理员</text>
              </view>
              <text class="member-sub">@{{ member.username }}</text>
            </view>
            <view class="member-actions" v-if="canManage && member.role !== 'owner' && !isSelf(member)">
              <view class="remove-btn" @click.stop="confirmRemove(member)">
                <text class="remove-text">移除</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 分界线 -->
      <view class="divider" v-if="adminMembers.length > 0 && normalMembers.length > 0">
        <view class="divider-line"></view>
        <text class="divider-text">以下为普通成员</text>
        <view class="divider-line"></view>
      </view>

      <!-- 普通成员 -->
      <view class="section" v-if="normalMembers.length > 0">
        <view class="section-header">
          <text class="section-title">普通成员</text>
          <text class="section-count">{{ normalMembers.length }}人</text>
        </view>
        <view class="member-list">
          <view
            class="member-item"
            v-for="member in normalMembers"
            :key="member.user_id || member.id"
            @click="onMemberClick(member)"
          >
            <view class="member-avatar-wrap">
              <image class="member-avatar" :src="fixUrl(member.avatar)" mode="aspectFill" />
              <view class="member-online-dot" :class="{ on: isOnline(member) }"></view>
            </view>
            <view class="member-info">
              <view class="member-name-row">
                <text class="member-name">{{ member.nickname || member.name || member.username }}</text>
                <text class="muted-tag" v-if="member.muted_until">🔇</text>
              </view>
              <text class="member-sub">@{{ member.username }}</text>
            </view>
            <view class="member-actions" v-if="canManage && !isSelf(member)">
              <view class="remove-btn" @click.stop="confirmRemove(member)">
                <text class="remove-text">移除</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索无结果 -->
      <view class="empty-state" v-if="searchKeyword && filteredMembers.length === 0">
        <text class="empty-text">未找到"{{ searchKeyword }}"相关的成员</text>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore && !searchKeyword">
        <text class="load-more-text">{{ loading ? '加载中...' : '上拉加载更多' }}</text>
      </view>
      <view class="no-more" v-if="!hasMore && allMembers.length > 0 && !searchKeyword">
        <text class="no-more-text">— 没有更多了 —</text>
      </view>

      <view class="bottom-gap"></view>
    </scroll-view>

    <!-- 底部邀请按钮（所有人都能邀请） -->
    <view class="bottom-bar">
      <view class="invite-btn" @click="openInviteModal">
        <text class="invite-icon">+</text>
        <text class="invite-text">邀请成员</text>
      </view>
    </view>

    <!-- 移除确认弹窗 -->
    <XhsModal
      :show="removeModal.show"
      title="移除成员"
      ok-text="确认移除"
      cancel-text="取消"
      @update:show="removeModal.show = false"
      @confirm="doRemove"
    >
      <view class="modal-content">
        <text class="modal-text">确定要将「{{ removeModal.member ? (removeModal.member.nickname || removeModal.member.name || removeModal.member.username) : '' }}」移出群聊吗？</text>
      </view>
    </XhsModal>

    <!-- 成员管理弹窗 -->
    <XhsModal
      :show="memberAction.show"
      title="成员管理"
      ok-text="关闭"
      cancel-text="取消"
      @update:show="memberAction.show = false"
      @confirm="memberAction.show = false"
    >
      <view class="action-sheet">
        <view class="action-sheet-item" @click="viewMemberProfile(memberAction.member)">查看资料</view>
        <view class="action-sheet-item" v-if="canManageMember(memberAction.member) && memberAction.member.role !== 'admin'" @click="setMemberRole('admin')">设为管理员</view>
        <view class="action-sheet-item" v-if="canManageMember(memberAction.member) && memberAction.member.role === 'admin'" @click="setMemberRole('member')">取消管理员</view>
        <view class="action-sheet-item" v-if="canManageMember(memberAction.member)" @click="openMuteOptions">禁言</view>
        <view class="action-sheet-item danger" v-if="canManageMember(memberAction.member)" @click="confirmRemove(memberAction.member)">移出群聊</view>
      </view>
    </XhsModal>

    <!-- 禁言时长选择弹窗 -->
    <XhsModal
      :show="muteModal.show"
      title="选择禁言时长"
      ok-text="取消"
      @update:show="muteModal.show = false"
      @confirm="muteModal.show = false"
    >
      <view class="mute-options">
        <view class="mute-option" @click="setMemberMute(10)">禁言10分钟</view>
        <view class="mute-option" @click="setMemberMute(60)">禁言1小时</view>
        <view class="mute-option" @click="setMemberMute(1440)">禁言1天</view>
        <view class="mute-option" @click="setMemberMute(10080)">禁言7天</view>
        <view class="mute-option" @click="setMemberMute(0)">解除禁言</view>
      </view>
    </XhsModal>

    <!-- 邀请好友弹窗 -->
    <XhsModal
      :show="inviteModal.show"
      title="邀请好友"
      ok-text="确认邀请"
      cancel-text="取消"
      @update:show="inviteModal.show = false"
      @confirm="submitInvite"
    >
      <view class="invite-search">
        <input
          class="invite-search-input"
          v-model="inviteSearchKeyword"
          placeholder="搜索好友昵称"
          @input="filterInviteFriends"
        />
      </view>
      <view v-if="filteredInviteFriends.length" class="modal-list">
        <view
          v-for="friend in filteredInviteFriends"
          :key="friend.id"
          class="modal-item"
          @click="toggleInvite(friend.id)"
        >
          <image class="modal-avatar" :src="fixUrl(friend.avatar)" mode="aspectFill" />
          <view class="modal-info">
            <text class="modal-name">{{ friend.name || friend.username }}</text>
            <text class="modal-sub">@{{ friend.username }}</text>
          </view>
          <view class="check-dot" :class="{ active: inviteSelected[friend.id] }"></view>
        </view>
      </view>
      <view v-else class="modal-empty">暂无可邀请的互关好友</view>
    </XhsModal>
  </view>
</template>

<script>
import { request } from '@/common/request.js'
import presence from '@/common/presence.js'
import XhsModal from '@/components/XhsModal.vue'

export default {
  components: { XhsModal },
  data() {
    return {
      statusBarHeight: 20,
      groupId: 0,
      groupName: '',
      myInfo: { role: 'member' },
      allMembers: [],
      page: 1,
      hasMore: true,
      loading: false,
      showSearch: false,
      searchKeyword: '',
      removeModal: { show: false, member: null },
      memberAction: { show: false, member: null },
      muteModal: { show: false },
      inviteModal: { show: false },
      inviteFriends: [],
      inviteSelected: {},
      inviteSearchKeyword: '',
      onlineMap: {}
    }
  },
  computed: {
    isOwner() {
      return this.myInfo.role === 'owner'
    },
    isAdmin() {
      return this.myInfo.role === 'admin'
    },
    canManage() {
      return this.isOwner || this.isAdmin
    },
    totalCount() {
      return this.allMembers.length
    },
    // 群主和管理员
    adminMembers() {
      return this.filteredMembers.filter(m => m.role === 'owner' || m.role === 'admin')
    },
    // 普通成员
    normalMembers() {
      return this.filteredMembers.filter(m => m.role !== 'owner' && m.role !== 'admin')
    },
    // 搜索过滤后的成员
    filteredMembers() {
      if (!this.searchKeyword.trim()) return this.allMembers
      const kw = this.searchKeyword.trim().toLowerCase()
      return this.allMembers.filter(m => {
        const name = (m.nickname || m.name || m.username || '').toLowerCase()
        const username = (m.username || '').toLowerCase()
        return name.includes(kw) || username.includes(kw)
      })
    },
    // 过滤后的邀请好友列表（已排除群内成员，避免邀请后无任何反应）
    filteredInviteFriends() {
      const memberIds = new Set(this.allMembers.map(m => String(m.uid || m.id || m.user_id || '')))
      let list = this.inviteFriends.filter(f => !memberIds.has(String(f.uid || f.id || '')))
      if (!this.inviteSearchKeyword.trim()) return list
      const kw = this.inviteSearchKeyword.trim().toLowerCase()
      return list.filter(f => {
        const name = (f.name || f.username || '').toLowerCase()
        return name.includes(kw)
      })
    }
  },
  async onLoad(options) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.groupId = Number(options.groupId || 0)
    this.groupName = options.groupName || ''
    await this.fetchMyInfo()
    await this.loadMembers(true)
    /* 在线状态: 进入页面查一次, WS 实时推送 + 每 10 秒兜底刷新 */
    this.refreshOnline()
    this._onlineTimer = setInterval(() => this.refreshOnline(), 10000)
    uni.$off('presence_changed', this._onPresence)
    uni.$on('presence_changed', this._onPresence)
  },

  onUnload() {
    if (this._onlineTimer) { clearInterval(this._onlineTimer); this._onlineTimer = null }
    uni.$off('presence_changed', this._onPresence)
  },

  methods: {
    /* WS 推来在线变化时立刻改小圆点, 不走网络 */
    _onPresence() {
      this.allMembers.forEach(m => {
        const uid = String(m.uid || m.user_id || '')
        if (!uid) return
        const v = presence.getCached(uid)
        if (v === null) return
        if (!!this.onlineMap[uid] !== v) this.$set(this.onlineMap, uid, v)
      })
    },
    /* 在线状态: 批量查询当前已加载成员的在线情况 */
    isOnline(member) {
      if (!member) return false
      const uid = String(member.uid || member.user_id || '')
      return !!this.onlineMap[uid]
    },
    async refreshOnline() {
      const uids = this.allMembers.map(m => String(m.uid || m.user_id || '')).filter(Boolean)
      if (!uids.length) return
      try {
        this.onlineMap = await presence.fetchOnline(uids)
      } catch (e) {}
    },
    goBack() {
      uni.navigateBack()
    },
    fixUrl(url) {
      if (!url) return '/static/default-avatar.png'
      if (url.startsWith('http') || url.startsWith('//')) return url
      return url
    },
    isSelf(member) {
      const myUid = this.myInfo.uid || this.myInfo.id || this.myInfo.user_id
      const memberUid = member.uid || member.id || member.user_id
      return myUid && memberUid && String(myUid) === String(memberUid)
    },
    async fetchMyInfo() {
      try {
        const res = await request('group.php', { action: 'group_info', group_id: this.groupId }, 'GET')
        if (res.code === 0 && res.data) {
          const my = res.data.my || {}
          let role = my.role || ''
          /* 兜底: 后端未返回 my.role 时用 owner_uid 比对，避免群主/管理员看不到管理入口 */
          if (role !== 'owner') {
            const myUid = String((uni.getStorageSync('userInfo') || {}).uid || '')
            if (myUid && String(res.data.owner_uid || '') === myUid) role = 'owner'
          }
          this.myInfo = { ...my, role: role || 'member' }
        }
      } catch (e) {
        console.log('获取群信息失败', e)
      }
    },
    async loadMembers(refresh = false) {
      if (this.loading) return
      if (refresh) {
        this.page = 1
        this.hasMore = true
        this.allMembers = []
      }
      if (!this.hasMore) return
      this.loading = true
      try {
        const res = await request('group.php', {
          action: 'group_member_list',
          group_id: this.groupId,
          page: this.page,
          limit: 50
        }, 'GET')
        if (res.code === 0) {
          const data = res.data
          const list = (data && data.list) || (Array.isArray(data) ? data : []) || []
          if (refresh) {
            this.allMembers = list
          } else {
            this.allMembers = [...this.allMembers, ...list]
          }
          if (list.length < 50) {
            this.hasMore = false
          } else {
            this.page++
          }
        }
      } catch (e) {
        console.log('加载成员失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading && !this.searchKeyword) {
        this.loadMembers(false).then(() => this.refreshOnline())
      }
    },
    toggleSearch() {
      this.showSearch = !this.showSearch
      if (!this.showSearch) {
        this.searchKeyword = ''
      }
    },
    onSearchInput() {
      // 实时搜索
    },
    doSearch() {
      // 搜索已通过 computed 实时过滤
    },
    clearSearch() {
      this.searchKeyword = ''
    },
    onMemberClick(member) {
      if (this.canManage && !this.isSelf(member)) {
        this.memberAction.member = member
        this.memberAction.show = true
      } else {
        this.viewMemberProfile(member)
      }
    },
    canManageMember(member) {
      if (!member) return false
      if (this.isSelf(member)) return false
      if (member.role === 'owner') return false
      return this.canManage
    },
    viewMemberProfile(member) {
      this.memberAction.show = false
      const uid = member.uid || member.id || member.user_id
      if (!uid) return
      uni.navigateTo({
        url: `/pages/user/profile?userId=${uid}`
      })
    },
    async setMemberRole(role) {
      const member = this.memberAction.member
      if (!member) return
      const uid = member.uid || member.id || member.user_id
      try {
        const res = await request('group.php', {
          action: 'group_set_member_role',
          group_id: this.groupId,
          target_user_id: uid,
          role
        }, 'POST')
        if (res.code === 0) {
          uni.showToast({ title: role === 'admin' ? '已设为管理员' : '已取消管理员', icon: 'success' })
          // 更新本地数据
          this.allMembers = this.allMembers.map(m => {
            const mUid = m.uid || m.id || m.user_id
            if (String(mUid) === String(uid)) {
              return { ...m, role }
            }
            return m
          })
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        this.memberAction.show = false
      }
    },
    openMuteOptions() {
      this.memberAction.show = false
      this.muteModal.show = true
    },
    async setMemberMute(minutes) {
      const member = this.memberAction.member
      if (!member) return
      const uid = member.uid || member.id || member.user_id
      try {
        const res = await request('group.php', {
          action: 'group_set_member_mute',
          group_id: this.groupId,
          target_user_id: uid,
          minutes
        }, 'POST')
        if (res.code === 0) {
          uni.showToast({ title: minutes === 0 ? '已解除禁言' : `已禁言${minutes > 60 ? (minutes / 60 >= 24 ? (minutes / 1440 + '天') : (minutes / 60 + '小时')) : (minutes + '分钟')}`, icon: 'success' })
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        this.muteModal.show = false
      }
    },
    confirmRemove(member) {
      this.removeModal.member = member
      this.removeModal.show = true
    },
    async doRemove() {
      const member = this.removeModal.member
      if (!member) return
      const uid = member.uid || member.id || member.user_id
      try {
        const res = await request('group.php', {
          action: 'group_kick',
          group_id: this.groupId,
          target_user_id: uid
        }, 'POST')
        if (res.code === 0) {
          uni.showToast({ title: '已移除', icon: 'success' })
          this.allMembers = this.allMembers.filter(m => {
            const mUid = m.uid || m.id || m.user_id
            return String(mUid) !== String(uid)
          })
        } else {
          uni.showToast({ title: res.msg || '移除失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '移除失败', icon: 'none' })
      } finally {
        this.removeModal.show = false
        this.removeModal.member = null
      }
    },
    async openInviteModal() {
      this.inviteModal.show = true
      this.inviteSearchKeyword = ''
      this.inviteSelected = {}
      await this.fetchInviteFriends()
    },
    async fetchInviteFriends() {
      try {
        const res = await request('group.php', { action: 'mutual_follow_list' }, 'GET')
        if (res.code === 0) {
          const data = res.data
          this.inviteFriends = (data && data.list) || (Array.isArray(data) ? data : []) || []
        }
      } catch (e) {
        console.log('获取好友列表失败', e)
        this.inviteFriends = []
      }
    },
    filterInviteFriends() {
      // 通过 computed 实时过滤
    },
    toggleInvite(friendId) {
      this.inviteSelected = {
        ...this.inviteSelected,
        [friendId]: !this.inviteSelected[friendId]
      }
    },
    async submitInvite() {
      const selectedIds = Object.keys(this.inviteSelected).filter(id => this.inviteSelected[id])
      if (selectedIds.length === 0) {
        uni.showToast({ title: '请选择要邀请的好友', icon: 'none' })
        return
      }
      try {
        const res = await request('group.php', {
          action: 'group_invite',
          group_id: this.groupId,
          user_ids: selectedIds.join(',')
        }, 'POST')
        if (res.code === 0) {
          uni.showToast({ title: '邀请已发送', icon: 'success' })
          this.inviteModal.show = false
        } else {
          uni.showToast({ title: res.msg || '邀请失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '邀请失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  width: 100%;
  height: 100vh;
  background: #EDEDED;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部导航 */
.nav {
  background: #F7F7F7;
  border-bottom: 1rpx solid #DCDCDC;
  flex-shrink: 0;
}
.nav-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}
.nav-back {
  width: 80rpx;
  display: flex;
  align-items: center;
}
.back-arrow {
  font-size: 48rpx;
  color: #000;
  font-weight: 300;
  line-height: 1;
}
.nav-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
}
.nav-right {
  width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.search-icon {
  font-size: 36rpx;
}

/* 搜索栏 */
.search-bar {
  background: #F7F7F7;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #DCDCDC;
  flex-shrink: 0;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  background: var(--cr-surface);
  border-radius: 10rpx;
  padding: 0 20rpx;
  height: 64rpx;
}
.search-icon-small {
  font-size: 28rpx;
  margin-right: 12rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #000;
}
.search-clear {
  font-size: 28rpx;
  color: var(--cr-text-muted);
  padding: 0 8rpx;
}

/* 内容区 */
.content {
  flex: 1;
  width: 100%;
}

/* 分组 */
.section {
  background: var(--cr-surface);
  margin: 20rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 16rpx;
}
.section-title {
  font-size: 26rpx;
  color: var(--cr-text-muted);
  font-weight: 500;
}
.section-count {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}

/* 成员列表 */
.member-list {
  padding: 0 32rpx;
}
.member-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--cr-border);
}
.member-item:last-child {
  border-bottom: none;
}
.member-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: #DDD;
  flex-shrink: 0;
}

/* 在线状态: 头像包裹层 + 右下角小圆点（绿=在线 灰=离线） */
.member-avatar-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}
.member-online-dot {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #C9CED6;
  border: 3rpx solid #fff;
  box-sizing: border-box;
}
.member-online-dot.on {
  background: #22C55E;
}
.member-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}
.member-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.member-name {
  font-size: 30rpx;
  color: #000;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300rpx;
}
.member-sub {
  display: block;
  font-size: 22rpx;
  color: var(--cr-text-muted);
  margin-top: 4rpx;
}

/* 角色徽章 */
.role-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}
.role-badge.owner {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #FFF;
  font-weight: 600;
}
.role-badge.admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #FFF;
  font-weight: 500;
}
.muted-tag {
  font-size: 24rpx;
}

/* 移除按钮 */
.member-actions {
  flex-shrink: 0;
  margin-left: 16rpx;
}
.remove-btn {
  padding: 10rpx 24rpx;
  background: #FFEEEE;
  border-radius: 8rpx;
}
.remove-text {
  font-size: 24rpx;
  color: #FF2442;
}

/* 分界线 */
.divider {
  display: flex;
  align-items: center;
  padding: 20rpx 48rpx;
}
.divider-line {
  flex: 1;
  height: 1rpx;
  background: #DCDCDC;
}
.divider-text {
  font-size: 22rpx;
  color: var(--cr-text-muted);
  padding: 0 20rpx;
  white-space: nowrap;
}

/* 空状态 */
.empty-state {
  padding: 100rpx 40rpx;
  text-align: center;
}
.empty-text {
  font-size: 28rpx;
  color: var(--cr-text-muted);
}

/* 加载更多 */
.load-more, .no-more {
  text-align: center;
  padding: 30rpx;
}
.load-more-text, .no-more-text {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}
.bottom-gap {
  height: 140rpx;
}

/* 底部邀请栏 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--cr-surface);
  border-top: 1rpx solid var(--cr-border);
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
.invite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: #07C160;
  border-radius: 12rpx;
}
.invite-icon {
  font-size: 36rpx;
  color: #FFF;
  margin-right: 10rpx;
  font-weight: 300;
}
.invite-text {
  font-size: 30rpx;
  color: #FFF;
  font-weight: 500;
}

/* 弹窗 */
.modal-content {
  padding: 20rpx 0;
}
.modal-text {
  font-size: 28rpx;
  color: var(--cr-text);
  line-height: 1.6;
}
.invite-search {
  margin-bottom: 20rpx;
}
.invite-search-input {
  width: 100%;
  height: 72rpx;
  background: var(--cr-surface-alt);
  border-radius: 10rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.modal-list {
  max-height: 500rpx;
  overflow-y: auto;
}
.modal-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--cr-border);
}
.modal-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 10rpx;
  background: #DDD;
}
.modal-info {
  flex: 1;
  margin-left: 16rpx;
}
.modal-name {
  display: block;
  font-size: 28rpx;
  color: #000;
}
.modal-sub {
  display: block;
  font-size: 22rpx;
  color: var(--cr-text-muted);
}
.check-dot {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid var(--cr-border);
}
.check-dot.active {
  background: #07C160;
  border-color: #07C160;
}
.modal-empty {
  text-align: center;
  padding: 60rpx;
  font-size: 26rpx;
  color: var(--cr-text-muted);
}

/* 成员管理操作菜单 */
.action-sheet {
  padding: 10rpx 0;
}
.action-sheet-item {
  padding: 28rpx 32rpx;
  font-size: 30rpx;
  color: var(--cr-text);
  text-align: center;
  border-bottom: 1rpx solid var(--cr-border);
}
.action-sheet-item:active {
  background: var(--cr-surface-alt);
}
.action-sheet-item.danger {
  color: #FF2442;
}

/* 禁言选项 */
.mute-options {
  padding: 10rpx 0;
}
.mute-option {
  padding: 28rpx 32rpx;
  font-size: 30rpx;
  color: var(--cr-text);
  text-align: center;
  border-bottom: 1rpx solid var(--cr-border);
}
.mute-option:active {
  background: var(--cr-surface-alt);
}
.mute-option:last-child {
  border-bottom: none;
  color: #07C160;
}
</style>
