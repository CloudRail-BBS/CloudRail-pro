<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">返回</view>
        <text class="nav-title">群号加群</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view :style="{ height: statusBarHeight + 56 + 'px' }"></view>

    <view class="card search-card">
      <text class="label">输入群号</text>
      <view class="search-row">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="请输入群号（6位数字）"
          confirm-type="search"
          @confirm="searchGroup"
        />
        <view class="search-btn" @click="searchGroup">
          <text>搜索</text>
        </view>
      </view>
      <text class="hint">群号由系统生成，支持精准搜索加入群聊。</text>
    </view>

    <view v-if="group" class="card result-card">
      <view class="group-head">
        <image class="group-avatar" :src="fixUrl(group.avatar)" mode="aspectFill" />
        <view class="group-meta">
          <text class="group-name">{{ group.name }}</text>
          <text class="group-code">群号 {{ group.identity_code }}</text>
          <text class="group-count">{{ group.member_count }}人</text>
        </view>
      </view>

      <view class="status-box" v-if="myStatus === 'member'">
        <text class="status-ok">你已经在这个群里了</text>
      </view>
      <view class="status-box" v-else-if="hasPending">
        <text class="status-wait">入群申请已提交，等待群主或管理员审核</text>
      </view>
      <view v-else>
        <view v-if="Number(group.join_need_approve || 0) === 1" class="verify-box">
          <text class="verify-label">申请备注</text>
          <textarea
            v-model="verifyMsg"
            class="verify-input"
            maxlength="60"
            placeholder="简单介绍一下你自己，方便群主审核"
          />
        </view>
        <view class="action-row">
          <view v-if="myStatus === 'member'" class="primary-btn ghost" @click="enterGroup">进入群聊</view>
          <view v-else class="primary-btn" @click="applyJoin">
            <text>{{ Number(group.join_need_approve || 0) === 1 ? '申请加入' : '直接加入' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="searched" class="empty-card">
      <text class="empty-title">没有找到对应群聊</text>
      <text class="empty-desc">请确认群号是否输入正确。</text>
    </view>
  </view>
</template>

<script>
import { request, baseUrl } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      keyword: '',
      group: null,
      myStatus: 'none',
      hasPending: 0,
      verifyMsg: '',
      searched: false
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async searchGroup() {
      const code = String(this.keyword || '').trim().toUpperCase()
      if (!code) {
        uni.showToast({ title: '请输入群号', icon: 'none' })
        return
      }

      const res = await request('group.php', { action: 'group_search_by_identity', identity_code: code }, 'GET')
      this.searched = true
      if (res.code !== 0) {
        this.group = null
        uni.showToast({ title: res.msg || '未找到群聊', icon: 'none' })
        return
      }

      this.group = res.data.group || null
      this.myStatus = res.data.my_status || 'none'
      this.hasPending = Number(res.data.has_pending || 0)
    },
    async applyJoin() {
      if (!this.group || !this.group.id) return
      const res = await request('group.php', {
        action: 'group_apply_join',
        group_id: this.group.id,
        verify_msg: this.verifyMsg || ''
      }, 'POST')

      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '申请失败', icon: 'none' })
        return
      }

      if (Number(this.group.join_need_approve || 0) === 1) {
        this.hasPending = 1
        uni.showToast({ title: '申请已提交', icon: 'none' })
        return
      }

      this.myStatus = 'member'
      uni.showToast({ title: '已加入群聊', icon: 'none' })
      setTimeout(() => this.enterGroup(), 240)
    },
    enterGroup() {
      if (!this.group || !this.group.id) return
      uni.navigateTo({
        url: `/pages/message/group-chat?groupId=${this.group.id}&name=${encodeURIComponent(this.group.name || '')}`
      })
    },
    fixUrl(url) {
      if (!url) return '/static/default-avatar.png'
      if (String(url).startsWith('http')) return url
      if (String(url).startsWith('/static/')) return url
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      return base + (String(url).startsWith('/') ? url : '/' + url)
    }
  }
}
</script>

<style scoped>
.page{
  min-height:100vh;
  background:#f5f6f8;
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
.label{
  font-size:28rpx;
  color:#111827;
  font-weight:700;
}
.search-row{
  margin-top:18rpx;
  display:flex;
  gap:16rpx;
}
.search-input{
  flex:1;
  height:88rpx;
  background:#f3f4f6;
  border-radius:12rpx;
  padding:0 24rpx;
  font-size:28rpx;
  color:#111827;
}
.search-btn{
  width:160rpx;
  height:88rpx;
  border-radius:12rpx;
  background:#111827;
  display:flex;
  align-items:center;
  justify-content:center;
}
.search-btn text{
  color:#fff;
  font-size:28rpx;
  font-weight:700;
}
.hint{
  margin-top:16rpx;
  font-size:24rpx;
  line-height:1.6;
  color:#9ca3af;
}
.group-head{
  display:flex;
  align-items:center;
  gap:20rpx;
}
.group-avatar{
  width:108rpx;
  height:108rpx;
  border-radius:24rpx;
  background:#f3f4f6;
}
.group-meta{
  display:flex;
  flex-direction:column;
  gap:10rpx;
}
.group-name{
  font-size:34rpx;
  color:#111827;
  font-weight:800;
}
.group-code,
.group-count{
  font-size:24rpx;
  color:#6b7280;
}
.status-box{
  margin-top:24rpx;
  padding:20rpx 24rpx;
  border-radius:12rpx;
  background:#f9fafb;
}
.status-ok{
  font-size:26rpx;
  color:#059669;
  font-weight:700;
}
.status-wait{
  font-size:26rpx;
  color:#d97706;
  line-height:1.6;
}
.verify-box{
  margin-top:24rpx;
}
.verify-label{
  font-size:26rpx;
  color:#111827;
  font-weight:700;
}
.verify-input{
  width:100%;
  min-height:180rpx;
  margin-top:16rpx;
  background:#f3f4f6;
  border-radius:12rpx;
  padding:20rpx 24rpx;
  box-sizing:border-box;
  font-size:26rpx;
  color:#111827;
}
.action-row{
  margin-top:24rpx;
}
.primary-btn{
  height:88rpx;
  border-radius:12rpx;
  background:#ff2442;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#fff;
  font-size:30rpx;
  font-weight:800;
}
.primary-btn.ghost{
  background:#111827;
}
.empty-card{
  margin:60rpx 24rpx 0;
  background:#fff;
  border-radius:16rpx;
  padding:60rpx 40rpx;
  text-align:center;
}
.empty-title{
  font-size:30rpx;
  color:#111827;
  font-weight:800;
}
.empty-desc{
  margin-top:12rpx;
  display:block;
  font-size:24rpx;
  color:#9ca3af;
}
</style>
