<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">返回</view>
        <text class="nav-title">群资料</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view :style="{ height: statusBarHeight + 56 + 'px' }"></view>

    <view class="card hero-card">
      <image class="hero-avatar" :src="fixUrl(group.avatar)" mode="aspectFill" @click="canManage ? chooseAvatar() : null" />
      <view class="hero-meta">
        <view class="hero-title-row">
          <text class="hero-title">{{ group.name || '群聊' }}</text>
          <text class="hero-role">{{ roleText }}</text>
        </view>
        <view class="hero-code-row">
          <text class="hero-sub">群号 {{ group.identity_code || '-' }}</text>
          <view class="copy-btn" v-if="group.identity_code" @click="copyGroupCode">
            <text class="copy-btn-text">复制</text>
          </view>
        </view>
        <text class="hero-sub">{{ Number(group.member_count || 0) }} 人</text>
      </view>
    </view>

    <view class="card">
      <view class="section-head">
        <text class="section-title">群公告</text>
        <text v-if="canManage" class="section-link" @click="openAnnouncementModal">编辑</text>
      </view>
      <text class="section-text">{{ group.announcement || '群主还没有设置群公告' }}</text>
    </view>

    <view class="card" v-if="canManage">
      <view class="list-row" @click="openNameModal">
        <text class="list-label">修改群名称</text>
        <text class="list-value">{{ group.name || '未设置' }}</text>
      </view>
      <view class="list-row">
        <view>
          <text class="list-label">入群需审核</text>
          <text class="list-desc">关闭后，搜索到群号的用户可直接进群。</text>
        </view>
        <switch :checked="Number(group.join_need_approve || 0) === 1" color="#ff2442" @change="changeJoinApprove" />
      </view>
      <view class="list-row">
        <view>
          <text class="list-label">全员禁言</text>
          <text class="list-desc">开启后仅群主和管理员可发言。</text>
        </view>
        <switch :checked="Number(group.mute_all || 0) === 1" color="#ff2442" @change="changeMuteAll" />
      </view>
      <view class="list-row" @click="openInviteModal">
        <text class="list-label">邀请好友进群</text>
        <text class="list-link">去邀请</text>
      </view>
      <view class="list-row" v-if="joinRequests.length" @click="toggleReviewOpen">
        <text class="list-label">入群申请</text>
        <text class="list-link">{{ reviewOpen ? '收起' : '查看' }} {{ joinRequests.length }} 条</text>
      </view>
    </view>

    <view v-if="reviewOpen && joinRequests.length" class="card">
      <view class="section-head">
        <text class="section-title">待审核申请</text>
      </view>
      <view class="request-list">
        <view v-for="item in joinRequests" :key="item.id" class="request-item">
          <image class="request-avatar" :src="fixUrl(item.avatar)" mode="aspectFill" />
          <view class="request-info">
            <text class="request-name">{{ item.name || item.username }}</text>
            <text class="request-msg">{{ item.verify_msg || '这个人很懒，没有留下申请备注' }}</text>
          </view>
          <view class="request-actions">
            <view class="mini-btn ghost" @click="reviewJoin(item, 'reject')">拒绝</view>
            <view class="mini-btn" @click="reviewJoin(item, 'approve')">通过</view>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-head">
        <text class="section-title">群成员</text>
        <text class="section-tip">共 {{ members.length }} 人</text>
      </view>

      <view class="member-list">
        <view v-for="member in members" :key="member.user_id" class="member-item" @click="openMemberAction(member)">
          <image class="member-avatar" :src="fixUrl(member.avatar)" mode="aspectFill" />
          <view class="member-info">
            <view class="member-name-row">
              <text class="member-name">{{ member.nickname || member.name || member.username }}</text>
              <text class="member-role">{{ mapRole(member.role) }}</text>
            </view>
            <text class="member-sub">
              <text v-if="member.muted_until">已禁言至 {{ member.muted_until }}</text>
              <text v-else>@{{ member.username }}</text>
            </text>
          </view>
          <text class="member-manage" v-if="canManageMember(member)">管理</text>
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <view v-if="isOwner" class="danger-btn" @click="confirmDissolve">解散群聊</view>
      <view v-else class="danger-btn" @click="confirmLeave">退出群聊</view>
    </view>

    <XhsModal :show="nameModal.show" title="修改群名称" ok-text="保存" @update:show="nameModal.show = false" @confirm="submitName">
      <input v-model="nameModal.value" class="modal-input" maxlength="20" placeholder="请输入新的群名称" />
    </XhsModal>

    <XhsModal :show="announcementModal.show" title="编辑群公告" ok-text="保存" @update:show="announcementModal.show = false" @confirm="submitAnnouncement">
      <textarea v-model="announcementModal.value" class="modal-textarea" maxlength="500" placeholder="请输入群公告内容" />
    </XhsModal>

    <XhsModal :show="inviteModal.show" title="邀请好友" ok-text="确认邀请" @update:show="inviteModal.show = false" @confirm="submitInvite">
      <view v-if="inviteFriends.length" class="modal-list">
        <view
          v-for="friend in inviteFriends"
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

    <XhsModal
      :show="memberAction.show"
      title="成员管理"
      ok-text="关闭"
      cancel-text="取消"
      @update:show="closeMemberAction"
      @confirm="closeMemberAction"
    >
      <view class="action-sheet">
        <view
          v-if="isOwner && memberAction.member && memberAction.member.role !== 'owner'"
          class="action-sheet-item"
          @click="toggleMemberRole"
        >
          {{ memberAction.member.role === 'admin' ? '取消管理员' : '设为管理员' }}
        </view>
        <view v-if="memberAction.member && memberAction.member.muted_until" class="action-sheet-item" @click="setMemberMute(0)">解除禁言</view>
        <view v-if="canMuteMember(memberAction.member)" class="action-sheet-item" @click="setMemberMute(60)">禁言1小时</view>
        <view v-if="canMuteMember(memberAction.member)" class="action-sheet-item" @click="setMemberMute(1440)">禁言1天</view>
        <view v-if="canManageMember(memberAction.member)" class="action-sheet-item danger" @click="kickMember">移出群聊</view>
        <view
          v-if="!isOwner && !canMuteMember(memberAction.member) && !canManageMember(memberAction.member) && !(memberAction.member && memberAction.member.muted_until)"
          class="action-sheet-empty"
        >
          当前成员暂无可执行操作
        </view>
      </view>
    </XhsModal>

    <XhsConfirm
      :visible="confirm.show"
      :title="confirm.title"
      :message="confirm.message"
      @confirm="confirmOk"
      @cancel="confirmCancel"
    />
  </view>
</template>

<script>
import { request, baseUrl, uploadFile } from '../../common/request.js'
import XhsConfirm from '../../components/XhsConfirm.vue'
import XhsModal from '../../components/XhsModal.vue'

export default {
  components: {
    XhsConfirm,
    XhsModal
  },
  data() {
    return {
      statusBarHeight: 20,
      groupId: 0,
      group: {},
      myInfo: { role: 'member' },
      members: [],
      joinRequests: [],
      reviewOpen: true,
      inviteFriends: [],
      inviteSelected: {},
      nameModal: { show: false, value: '' },
      announcementModal: { show: false, value: '' },
      inviteModal: { show: false },
      memberAction: { show: false, member: null },
      confirm: { show: false, title: '', message: '', resolve: null }
    }
  },
  computed: {
    isOwner() {
      return this.myInfo.role === 'owner'
    },
    canManage() {
      return ['owner', 'admin'].includes(this.myInfo.role)
    },
    roleText() {
      return this.mapRole(this.myInfo.role)
    }
  },
  async onLoad(options) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.groupId = Number(options.groupId || 0)
    await this.refreshAll()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async refreshAll() {
      await this.fetchInfo()
      await Promise.all([this.fetchMembers(), this.fetchJoinRequests()])
    },
    async fetchInfo() {
      const res = await request('group.php', { action: 'group_info', group_id: this.groupId }, 'GET')
      if (res.code === 0) {
        this.group = (res.data && (res.data.group || res.data)) || {}
        this.myInfo = res.data.my || { role: 'member' }
      }
    },
    async fetchMembers() {
      const res = await request('group.php', { action: 'group_member_list', group_id: this.groupId, page: 1 }, 'GET')
      if (res.code === 0) {
        const data = res.data
        this.members = (data && data.list) || (Array.isArray(data) ? data : []) || []
      }
    },
    async fetchJoinRequests() {
      if (!this.canManage) {
        this.joinRequests = []
        return
      }
      const res = await request('group.php', { action: 'group_join_request_list', group_id: this.groupId, page: 1 }, 'GET')
      if (res.code === 0) {
        this.joinRequests = res.data || []
      }
    },
    mapRole(role) {
      if (role === 'owner') return '群主'
      if (role === 'admin') return '管理员'
      return '成员'
    },
    copyGroupCode() {
      const code = this.group.identity_code || ''
      if (!code) return
      uni.setClipboardData({
        data: code,
        success: () => {
          uni.showToast({ title: '群号已复制', icon: 'none' })
        }
      })
    },
    fixUrl(url) {
      if (!url) return '/static/default-avatar.png'
      if (String(url).startsWith('http')) return url
      if (String(url).startsWith('/static/')) return url
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      return base + (String(url).startsWith('/') ? url : '/' + url)
    },
    openNameModal() {
      this.nameModal.value = this.group.name || ''
      this.nameModal.show = true
    },
    async submitName() {
      const value = String(this.nameModal.value || '').trim()
      if (value.length < 2) {
        uni.showToast({ title: '群名称至少2个字', icon: 'none' })
        return
      }
      const res = await request('group.php', {
        action: 'group_update_name',
        group_id: this.groupId,
        name: value
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '修改失败', icon: 'none' })
        return
      }
      this.nameModal.show = false
      this.group.name = value
      uni.showToast({ title: '已保存', icon: 'none' })
    },
    openAnnouncementModal() {
      this.announcementModal.value = this.group.announcement || ''
      this.announcementModal.show = true
    },
    async submitAnnouncement() {
      const res = await request('group.php', {
        action: 'group_set_announcement',
        group_id: this.groupId,
        announcement: this.announcementModal.value || ''
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
        return
      }
      this.announcementModal.show = false
      this.group.announcement = this.announcementModal.value || ''
      uni.showToast({ title: '已更新', icon: 'none' })
    },
    async changeJoinApprove(e) {
      const enabled = e.detail.value ? 1 : 0
      const res = await request('group.php', {
        action: 'group_set_join_need_approve',
        group_id: this.groupId,
        enabled
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
        this.fetchInfo()
        return
      }
      this.group.join_need_approve = enabled
    },
    async changeMuteAll(e) {
      const enabled = e.detail.value ? 1 : 0
      const res = await request('group.php', {
        action: 'group_set_mute_all',
        group_id: this.groupId,
        enabled
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
        this.fetchInfo()
        return
      }
      this.group.mute_all = enabled
    },
    async chooseAvatar() {
      if (!this.canManage) return
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (pickRes) => {
          const filePath = (pickRes.tempFilePaths || [])[0]
          if (!filePath) return
          const up = await uploadFile(filePath, { type: 'image' })
          const avatar = up?.url || up?.path || up?.data?.url || up?.data?.path || ''
          if (!avatar) {
            uni.showToast({ title: '上传失败', icon: 'none' })
            return
          }
          const res = await request('group.php', {
            action: 'group_set_avatar',
            group_id: this.groupId,
            avatar
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
            return
          }
          this.group.avatar = avatar
        }
      })
    },
    async openInviteModal() {
      const myUid = String((uni.getStorageSync('userInfo') || {}).uid || '')
      const res = await request('group.php', { action: 'mutual_follow_list', uid: myUid, page: 1 }, 'GET')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
        return
      }
      const memberIds = new Set(this.members.map(item => String(item.user_id || item.uid || '')))
      const fdata = res.data
      const fList = (fdata && fdata.list) || (Array.isArray(fdata) ? fdata : []) || []
      this.inviteFriends = fList.filter(item => !memberIds.has(String(item.uid || item.id || '')))
      this.inviteSelected = {}
      this.inviteModal.show = true
    },
    toggleInvite(userId) {
      this.$set(this.inviteSelected, userId, !this.inviteSelected[userId])
    },
    async submitInvite() {
      const ids = Object.keys(this.inviteSelected).filter(key => this.inviteSelected[key])
      if (!ids.length) {
        uni.showToast({ title: '请选择好友', icon: 'none' })
        return
      }
      const res = await request('group.php', {
        action: 'group_invite',
        group_id: this.groupId,
        member_uids: ids,
        member_ids_json: JSON.stringify(ids)
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '邀请失败', icon: 'none' })
        return
      }
      this.inviteModal.show = false
      uni.showToast({ title: res.msg || '邀请已发送', icon: 'none' })
      this.refreshAll()
    },
    toggleReviewOpen() {
      this.reviewOpen = !this.reviewOpen
    },
    async reviewJoin(item, decision) {
      const res = await request('group.php', {
        action: 'group_join_request_review',
        group_id: this.groupId,
        request_id: item.id,
        decision
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        return
      }
      uni.showToast({ title: decision === 'approve' ? '已通过' : '已拒绝', icon: 'none' })
      this.refreshAll()
    },
    canManageMember(member) {
      if (!member) return false
      if (!this.canManage) return false
      if (Number(member.user_id) === Number((uni.getStorageSync('userInfo') || {}).id || 0)) return false
      if (this.isOwner) return member.role !== 'owner'
      return member.role === 'member'
    },
    canMuteMember(member) {
      return this.canManageMember(member)
    },
    openMemberAction(member) {
      if (!this.canManageMember(member)) return
      this.memberAction = { show: true, member }
    },
    closeMemberAction() {
      this.memberAction = { show: false, member: null }
    },
    async toggleMemberRole() {
      const member = this.memberAction.member
      if (!member) return
      const role = member.role === 'admin' ? 'member' : 'admin'
      const res = await request('group.php', {
        action: 'group_set_member_role',
        group_id: this.groupId,
        target_user_id: member.user_id,
        role
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
        return
      }
      this.closeMemberAction()
      this.refreshAll()
    },
    async setMemberMute(minutes) {
      const member = this.memberAction.member
      if (!member) return
      const res = await request('group.php', {
        action: 'group_set_member_mute',
        group_id: this.groupId,
        target_user_id: member.user_id,
        minutes
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        return
      }
      this.closeMemberAction()
      this.refreshAll()
    },
    kickMember() {
      const member = this.memberAction.member
      if (!member) return
      this.closeMemberAction()
      this.confirm = {
        show: true,
        title: '移出群聊',
        message: `确定将 ${member.nickname || member.name || member.username} 移出群聊吗？`,
        resolve: async (ok) => {
          if (!ok) return
          const res = await request('group.php', {
            action: 'group_kick',
            group_id: this.groupId,
            target_user_id: member.user_id
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
            return
          }
          this.refreshAll()
        }
      }
    },
    confirmLeave() {
      this.confirm = {
        show: true,
        title: '退出群聊',
        message: '确定退出这个群聊吗？退出后可通过群号重新申请加入。',
        resolve: async (ok) => {
          if (!ok) return
          const res = await request('group.php', {
            action: 'group_leave',
            group_id: this.groupId
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '退出失败', icon: 'none' })
            return
          }
          uni.showToast({ title: '已退出群聊', icon: 'none' })
          setTimeout(() => {
            uni.navigateBack({ delta: 2 })
          }, 260)
        }
      }
    },
    confirmDissolve() {
      this.confirm = {
        show: true,
        title: '解散群聊',
        message: '解散后将删除群成员、群消息和所有入群申请，且不可恢复。确定继续吗？',
        resolve: async (ok) => {
          if (!ok) return
          const res = await request('group.php', {
            action: 'group_dissolve',
            group_id: this.groupId
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '解散失败', icon: 'none' })
            return
          }
          uni.showToast({ title: '群聊已解散', icon: 'none' })
          setTimeout(() => {
            uni.navigateBack({ delta: 2 })
          }, 260)
        }
      }
    },
    confirmOk() {
      const handler = this.confirm.resolve
      this.confirm = { show: false, title: '', message: '', resolve: null }
      handler && handler(true)
    },
    confirmCancel() {
      const handler = this.confirm.resolve
      this.confirm = { show: false, title: '', message: '', resolve: null }
      handler && handler(false)
    }
  }
}
</script>

<style scoped>
.page{
  min-height:100vh;
  background:#f5f6f8;
  padding-bottom:40rpx;
}
.nav{
  position:fixed;
  left:0;
  right:0;
  top:0;
  background:#f5f6f8;
  z-index:20;
}
.nav-bar{
  height:56px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 24rpx;
}
.nav-back,.nav-placeholder{
  width:120rpx;
  font-size:28rpx;
  color:#374151;
}
.nav-title{
  font-size:32rpx;
  font-weight:800;
  color:#111827;
}
.card{
  margin:24rpx;
  background:#fff;
  border-radius:16rpx;
  padding:28rpx;
}
.hero-card{
  display:flex;
  align-items:center;
  gap:24rpx;
}
.hero-avatar{
  width:124rpx;
  height:124rpx;
  border-radius:30rpx;
  background:#f3f4f6;
}
.hero-meta{
  flex:1;
  display:flex;
  flex-direction:column;
  gap:10rpx;
}
.hero-title-row{
  display:flex;
  align-items:center;
  gap:12rpx;
}
.hero-title{
  font-size:34rpx;
  color:#111827;
  font-weight:800;
}
.hero-role{
  font-size:22rpx;
  color:#ff2442;
  background:#fff1f3;
  padding:6rpx 12rpx;
  border-radius:999rpx;
}
.hero-sub{
  font-size:24rpx;
  color:#6b7280;
}
.hero-code-row{
  display:flex;
  align-items:center;
  gap:12rpx;
}
.copy-btn{
  padding:4rpx 16rpx;
  border-radius:999rpx;
  background:#fff1f3;
  border:1rpx solid #ffd6df;
}
.copy-btn-text{
  font-size:22rpx;
  color:#ff2442;
  font-weight:600;
}
.section-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.section-title{
  font-size:30rpx;
  color:#111827;
  font-weight:800;
}
.section-link,.section-tip{
  font-size:24rpx;
  color:#ff2442;
}
.section-text{
  margin-top:18rpx;
  display:block;
  font-size:26rpx;
  color:#4b5563;
  line-height:1.8;
}
.list-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20rpx;
  padding:20rpx 0;
}
.list-row + .list-row{
  border-top:1rpx solid #f3f4f6;
}
.list-label{
  display:block;
  font-size:28rpx;
  color:#111827;
  font-weight:700;
}
.list-desc{
  display:block;
  margin-top:8rpx;
  font-size:22rpx;
  color:#9ca3af;
  line-height:1.5;
}
.list-value,.list-link{
  font-size:24rpx;
  color:#6b7280;
}
.list-link{
  color:#ff2442;
}
.request-list{
  margin-top:18rpx;
}
.request-item{
  display:flex;
  align-items:center;
  gap:18rpx;
  padding:18rpx 0;
}
.request-item + .request-item{
  border-top:1rpx solid #f3f4f6;
}
.request-avatar{
  width:76rpx;
  height:76rpx;
  border-radius:20rpx;
}
.request-info{
  flex:1;
  min-width:0;
}
.request-name{
  font-size:28rpx;
  color:#111827;
  font-weight:700;
}
.request-msg{
  display:block;
  margin-top:8rpx;
  font-size:22rpx;
  color:#9ca3af;
  line-height:1.5;
}
.request-actions{
  display:flex;
  gap:12rpx;
}
.mini-btn{
  min-width:92rpx;
  height:60rpx;
  padding:0 20rpx;
  border-radius:999rpx;
  background:#111827;
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24rpx;
}
.mini-btn.ghost{
  background:#f3f4f6;
  color:#374151;
}
.member-list{
  margin-top:18rpx;
}
.member-item{
  display:flex;
  align-items:center;
  gap:18rpx;
  padding:18rpx 0;
}
.member-item + .member-item{
  border-top:1rpx solid #f3f4f6;
}
.member-avatar{
  width:80rpx;
  height:80rpx;
  border-radius:22rpx;
}
.member-info{
  flex:1;
  min-width:0;
}
.member-name-row{
  display:flex;
  align-items:center;
  gap:12rpx;
}
.member-name{
  font-size:28rpx;
  color:#111827;
  font-weight:700;
}
.member-role{
  font-size:22rpx;
  color:#6b7280;
}
.member-sub{
  display:block;
  margin-top:8rpx;
  font-size:22rpx;
  color:#9ca3af;
}
.member-manage{
  font-size:24rpx;
  color:#ff2442;
}
.bottom-actions{
  margin:0 24rpx;
}
.danger-btn{
  height:92rpx;
  border-radius:14rpx;
  background:#111827;
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:30rpx;
  font-weight:800;
}
.modal-input{
  width:100%;
  height:88rpx;
  background:#f3f4f6;
  border-radius:12rpx;
  padding:0 24rpx;
  box-sizing:border-box;
  font-size:28rpx;
  color:#111827;
}
.modal-textarea{
  width:100%;
  min-height:220rpx;
  background:#f3f4f6;
  border-radius:12rpx;
  padding:20rpx 24rpx;
  box-sizing:border-box;
  font-size:26rpx;
  color:#111827;
}
.modal-list{
  max-height:540rpx;
  overflow:hidden;
}
.modal-item{
  display:flex;
  align-items:center;
  gap:16rpx;
  padding:16rpx 0;
}
.modal-item + .modal-item{
  border-top:1rpx solid #f3f4f6;
}
.modal-avatar{
  width:68rpx;
  height:68rpx;
  border-radius:18rpx;
}
.modal-info{
  flex:1;
}
.modal-name{
  font-size:26rpx;
  color:#111827;
  font-weight:700;
}
.modal-sub{
  display:block;
  margin-top:6rpx;
  font-size:22rpx;
  color:#9ca3af;
}
.check-dot{
  width:32rpx;
  height:32rpx;
  border-radius:50%;
  border:2rpx solid #d1d5db;
}
.check-dot.active{
  background:#ff2442;
  border-color:#ff2442;
}
.modal-empty{
  padding:40rpx 0;
  text-align:center;
  color:#9ca3af;
  font-size:24rpx;
}
.action-sheet{
  padding: 8rpx 0 6rpx;
}
.action-sheet-item{
  height:92rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:30rpx;
  color:#111827;
  border-radius:18rpx;
}
.action-sheet-item + .action-sheet-item{
  margin-top:10rpx;
}
.action-sheet-item:active{
  background:#f9fafb;
}
.action-sheet-item.danger{
  color:#ff2442;
}
.action-sheet-empty{
  padding:24rpx 0 8rpx;
  text-align:center;
  color:#9ca3af;
  font-size:24rpx;
}
</style>
