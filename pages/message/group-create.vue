<template>
  <view class="page" :class="themeClass">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">返回</view>
        <text class="nav-title">创建群聊</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view :style="{ height: statusBarHeight + 56 + 'px' }"></view>

    <view v-if="authMessage" class="guard-card">
      <text class="guard-title">{{ canCreateGroup ? '创建条件已满足' : '创建群聊前需先完成认证' }}</text>
      <text class="guard-desc">{{ authMessage }}</text>
    </view>

    <view class="card">
      <view class="avatar-row">
        <image class="avatar" :src="avatarPreview" mode="aspectFill" @click="chooseAvatar" />
        <view class="avatar-meta">
          <text class="section-title">群头像</text>
          <text class="section-desc">建议上传清晰方图，群资料页可再次修改。</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">群名称</text>
        <input
          v-model="name"
          class="field-input"
          maxlength="20"
          placeholder="请输入2-20个字的群名称"
        />
      </view>

      <view class="switch-row">
        <view>
          <text class="field-label">入群需审核</text>
          <text class="switch-desc">开启后，群主或管理员审核通过才能进群。</text>
        </view>
        <switch :checked="joinNeedApprove" color="#ff2442" @change="joinNeedApprove = !!$event.detail.value" />
      </view>
    </view>

    <view class="card">
      <view class="section-head">
        <text class="section-title">邀请互关好友</text>
        <text class="section-tip">已选 {{ selectedIds.length }} 人</text>
      </view>

      <view v-if="friends.length" class="friend-list">
        <view
          v-for="friend in friends"
          :key="friend.id"
          class="friend-item"
          @click="toggleFriend(friend.id)"
        >
          <image class="friend-avatar" :src="fixUrl(friend.avatar)" mode="aspectFill" />
          <view class="friend-info">
            <text class="friend-name">{{ friend.name || friend.username }}</text>
            <text class="friend-sub">@{{ friend.username }}</text>
          </view>
          <view class="friend-check" :class="{ active: selectedMap[friend.id] }">
            <text v-if="selectedMap[friend.id]" class="friend-check-text">√</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-box">
        <text class="empty-text">暂无互关好友，建群后也可以在群资料页继续邀请。</text>
      </view>
    </view>

    <view class="submit-wrap">
      <view class="submit-btn" @click="submitCreate">
        <text>{{ submitting ? '创建中...' : '创建群聊' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request, baseUrl, uploadFile } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      name: '',
      avatar: '',
      joinNeedApprove: true,
      friends: [],
      selectedMap: {},
      submitting: false,
      canCreateGroup: false,
      authMessage: ''
    }
  },
  computed: {
    selectedIds() {
      return Object.keys(this.selectedMap).filter(key => this.selectedMap[key])
    },
    avatarPreview() {
      if (!this.avatar) return '/static/default-avatar.png'
      if (String(this.avatar).startsWith('http') || String(this.avatar).startsWith('/')) return this.fixUrl(this.avatar)
      return this.avatar
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.loadCreateAuth()
    this.fetchFriends()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async loadCreateAuth() {
      try {
        const res = await request('user.php', { action: 'getCertificationCenter' })
        const data = res.data || {}
        const userInfo = data.userInfo || {}
        const verified = Number(userInfo.personal_verified || 0) === 1 || Number(userInfo.enterprise_verified || 0) === 1
        this.canCreateGroup = verified
        if (!verified) {
          this.authMessage = '完成个人认证或企业认证后，才可创建群聊。'
          return
        }
        this.authMessage = '你已完成权益认证，可直接创建群聊。'
      } catch (e) {
        this.canCreateGroup = false
        this.authMessage = '创建条件获取失败，请稍后重试。'
      }
    },
    async fetchFriends() {
      const myUid = String((uni.getStorageSync('userInfo') || {}).uid || '')
      const res = await request('group.php', { action: 'mutual_follow_list', uid: myUid, page: 1 }, 'GET')
      if (res.code === 0) {
        const data = res.data
        this.friends = (Array.isArray(data) ? data : (data && data.list)) || []
      }
    },
    chooseAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const path = (res.tempFilePaths || [])[0]
          if (path) this.avatar = path
        }
      })
    },
    toggleFriend(userId) {
      const key = String(userId)
      this.$set(this.selectedMap, key, !this.selectedMap[key])
    },
    async submitCreate() {
      if (this.submitting) return
      if (!this.canCreateGroup) {
        uni.showToast({ title: this.authMessage || '请先完成权益认证', icon: 'none' })
        return
      }
      if (String(this.name || '').trim().length < 2) {
        uni.showToast({ title: '群名称至少2个字', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        let avatarPath = this.avatar || ''
        if (avatarPath && !String(avatarPath).startsWith('http') && !String(avatarPath).startsWith('/uploads/')) {
          const up = await uploadFile(avatarPath, { type: 'avatar' })
          avatarPath = up?.url || up?.path || up?.data?.url || up?.data?.path || ''
        }

        const res = await request('group.php', {
          action: 'group_create',
          name: this.name.trim(),
          avatar: avatarPath,
          join_need_approve: this.joinNeedApprove ? 1 : 0,
          member_uids: this.selectedIds,
          member_ids_json: JSON.stringify(this.selectedIds)
        }, 'POST')

        if (res.code !== 0) {
          uni.showToast({ title: res.msg || '创建失败', icon: 'none' })
          return
        }

        const groupId = res.data.group_id
        const groupName = this.name.trim()
        uni.showToast({ title: '创建成功', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({
            url: `/pages/message/group-chat?groupId=${groupId}&name=${encodeURIComponent(groupName)}`
          })
        }, 260)
      } catch (e) {
        uni.showToast({ title: '创建失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    fixUrl(url) {
      if (!url) return '/static/default-avatar.png'
      if (String(url).startsWith('http')) return url
      if (String(url).startsWith('/static/')) return url
      if (String(url).startsWith('/')) {
        const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
        return base + url
      }
      return url
    }
  }
}
</script>

<style scoped>
.page{
  min-height:100vh;
  background: var(--cr-surface-alt);
  padding-bottom:40rpx;
}
.nav{
  position:fixed;
  left:0;
  right:0;
  top:0;
  background: var(--cr-surface-alt);
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
  color: var(--cr-text);
}
.nav-title{
  font-size:32rpx;
  font-weight:800;
  color: var(--cr-text);
}
.card{
  margin:24rpx;
  background: var(--cr-surface);
  border-radius:16rpx;
  padding:28rpx;
}
.guard-card{
  margin:24rpx 24rpx 0;
  padding:24rpx 26rpx;
  border-radius:18rpx;
  background:linear-gradient(135deg, rgba(255,36,66,.1), rgba(255,137,137,.08));
  border:1rpx solid rgba(255,36,66,.14);
}
.guard-title{
  display:block;
  font-size:28rpx;
  color: var(--cr-text);
  font-weight:800;
}
.guard-desc{
  display:block;
  margin-top:10rpx;
  font-size:24rpx;
  color: var(--cr-text-muted);
  line-height:1.7;
}
.avatar-row{
  display:flex;
  align-items:center;
  gap:24rpx;
}
.avatar{
  width:120rpx;
  height:120rpx;
  border-radius:28rpx;
  background:#f3f4f6;
}
.avatar-meta{
  flex:1;
  display:flex;
  flex-direction:column;
  gap:10rpx;
}
.section-title{
  font-size:30rpx;
  color: var(--cr-text);
  font-weight:800;
}
.section-desc,
.section-tip,
.switch-desc{
  font-size:24rpx;
  color: var(--cr-text-muted);
  line-height:1.6;
}
.field{
  margin-top:28rpx;
}
.field-label{
  display:block;
  font-size:28rpx;
  color: var(--cr-text);
  font-weight:700;
}
.field-input{
  margin-top:16rpx;
  height:88rpx;
  background:#f3f4f6;
  border-radius:12rpx;
  padding:0 24rpx;
  font-size:28rpx;
  color: var(--cr-text);
}
.switch-row{
  margin-top:28rpx;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16rpx;
}
.section-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.friend-list{
  margin-top:18rpx;
}
.friend-item{
  display:flex;
  align-items:center;
  gap:20rpx;
  padding:20rpx 0;
}
.friend-item + .friend-item{
  border-top:1rpx solid #f3f4f6;
}
.friend-avatar{
  width:88rpx;
  height:88rpx;
  border-radius:22rpx;
  background:#f3f4f6;
}
.friend-info{
  flex:1;
  display:flex;
  flex-direction:column;
  gap:8rpx;
  min-width:0;
}
.friend-name{
  font-size:28rpx;
  color: var(--cr-text);
  font-weight:700;
}
.friend-sub{
  font-size:22rpx;
  color: var(--cr-text-muted);
}
.friend-check{
  width:40rpx;
  height:40rpx;
  border-radius:50%;
  border: 2rpx solid var(--cr-border);
  display:flex;
  align-items:center;
  justify-content:center;
}
.friend-check.active{
  background:#ff2442;
  border-color:#ff2442;
}
.friend-check-text{
  color:#fff;
  font-size:22rpx;
  font-weight:700;
}
.empty-box{
  margin-top:18rpx;
  padding:24rpx;
  border-radius:12rpx;
  background:#f9fafb;
}
.empty-text{
  font-size:24rpx;
  color: var(--cr-text-muted);
  line-height:1.6;
}
.submit-wrap{
  margin: 0 24rpx;
}
.submit-btn{
  height:92rpx;
  border-radius:14rpx;
  background:#111827;
  display:flex;
  align-items:center;
  justify-content:center;
}
.submit-btn text{
  color:#fff;
  font-size:30rpx;
  font-weight:800;
}
</style>
