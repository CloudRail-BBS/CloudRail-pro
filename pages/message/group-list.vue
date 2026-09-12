<template>
  <view class="group-list-page">
    <view class="top-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-side" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="nav-center">
          <text class="nav-title">群聊</text>
        </view>
        <view class="nav-side nav-right" @click="showMenu = true">
          <text class="add-icon">＋</text>
        </view>
      </view>
    </view>

    <view class="content" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="loading-box">
        <text>加载中...</text>
      </view>

      <scroll-view v-else class="group-scroll" scroll-y enhanced :show-scrollbar="false">
        <view
          v-for="item in groupList"
          :key="item.id"
          class="group-item"
          @click="toGroupChat(item)"
        >
          <view class="ava-wrap group-avatar">
            <image
              class="img"
              :src="item.avatar || '/static/logo.png'"
              mode="aspectFill"
              lazy-load
              @error="$set(groupList.find(g => g.id === item.id), 'avatar', '/static/logo.png')"
            />
          </view>

          <view class="group-body">
            <view class="group-top">
              <text class="group-name" :class="{ 'vip-rainbow-text': parseInt(item.vip || 0) === 1 }">{{ item.name }}</text>
              <text class="group-meta">{{ item.member_count }}人</text>
            </view>
            <text class="group-preview">{{ item.last_msg_preview || '点击进入群聊' }}</text>
            <view class="group-bottom">
              <text class="group-code">群号 {{ item.identity_code }}</text>
              <text class="group-time">{{ formatTime(item.last_msg_time) }}</text>
            </view>
          </view>

          <view class="group-badge" v-if="Number(item.unread || 0)">{{ formatCount(Number(item.unread || 0)) }}</view>
        </view>

        <view class="empty" v-if="groupList.length === 0">
          <text>还没有加入任何群聊</text>
          <text class="empty-tip">点击右上角 + 号创建或加入群聊</text>
        </view>
      </scroll-view>
    </view>

    <view class="menu-mask" v-if="showMenu" @click="showMenu = false">
      <view class="menu-sheet" @click.stop>
        <view class="menu-item" @click="goCreateGroup">
          <view class="menu-icon-wrap">
            <image src="/static/icon/users-plus-white.svg" class="menu-icon-img" mode="aspectFit"></image>
          </view>
          <text class="menu-text">创建群聊</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goSearchGroup">
          <view class="menu-icon-wrap">
            <image src="/static/icon/search-white.svg" class="menu-icon-img" mode="aspectFit"></image>
          </view>
          <text class="menu-text">群号加群</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-cancel" @click="showMenu = false">
          <text>取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request, baseUrl } from '../../common/request.js'
import ws from '../../common/ws.js'
import { getScreenMetrics } from '../../common/screen.js'

export default {
  data() {
    return {
      statusBarHeight: 0,
      navContentHeight: 44,
      loading: true,
      showMenu: false,
      groupList: [],
      myId: 0
    }
  },
  computed: {
    navHeight() {
      return Number(this.statusBarHeight || 0) + this.navContentHeight
    }
  },
  onLoad() {
    const metrics = getScreenMetrics()
    this.statusBarHeight = metrics.statusBarHeight
    const user = uni.getStorageSync('userInfo') || {}
    this.myId = Number(user.id || 0)
    this.fetchGroupList()
  },
  onShow() {
    ws.ensureConnected()
    this._wsUnsubGroup = ws.on('group_msg', this._onWsGroupMsg)
    this._wsUnsubUnread = ws.on('unread_update', this._onWsUnreadUpdate)
  },
  onHide() {
    this._unregisterWsCallbacks()
  },
  onUnload() {
    this._unregisterWsCallbacks()
  },
  onPullDownRefresh() {
    this.fetchGroupList().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    _unregisterWsCallbacks() {
      if (this._wsUnsubGroup) { this._wsUnsubGroup(); this._wsUnsubGroup = null }
      if (this._wsUnsubUnread) { this._wsUnsubUnread(); this._wsUnsubUnread = null }
    },
    _onWsGroupMsg(data) {
      const groupId = Number(data.group_id)
      const idx = this.groupList.findIndex(i => Number(i.id) === groupId)
      if (idx >= 0) {
        const item = { ...this.groupList[idx] }
        if (Number(data.sender_id) !== Number(this.myId || 0)) {
          item.unread = Number(item.unread || 0) + 1
        }
        item.last_msg_preview = data.msg_type === 'image' ? '[图片]' : (data.content || '').slice(0, 60)
        item.last_msg_time = data.create_time
        this.$set(this.groupList, idx, item)
        this.syncGlobalUnread()
      }
    },
    _onWsUnreadUpdate(data) {
      if (data.group_unread !== undefined) {
        this.fetchGroupList()
      }
    },
    syncGlobalUnread() {
      const groupUnread = this.groupList.reduce((s, i) => s + Number(i.unread || 0), 0)
      setTimeout(() => {
        uni.setStorageSync('group_message_unread', groupUnread)
      }, 0)
      uni.$emit('message_unread_updated')
    },
    goBack() {
      uni.navigateBack()
    },
    async fetchGroupList() {
      this.loading = true
      try {
        const res = await request('group.php', { action: 'group_list', page: 1 }, 'GET')
        if (res.code === 0) {
          const list = (res.data || []).map(item => ({
            ...item,
            id: Number(item.id || 0),
            member_count: Number(item.member_count || 0),
            unread: Number(item.unread || 0),
            avatar: this.fixUrl(item.avatar || '/static/logo.png')
          }))
          this.groupList = list
          this.syncGlobalUnread()
        }
      } catch (e) {
      } finally {
        this.loading = false
      }
    },
    toGroupChat(item) {
      if (!item) return
      item.unread = 0
      request('group.php', { action: 'group_mark_read', groupId: item.id }, 'POST').catch(() => {})
      this.syncGlobalUnread()
      uni.navigateTo({
        url: `/pages/message/group-chat?groupId=${item.id}&name=${encodeURIComponent(item.name)}`
      })
    },
    goCreateGroup() {
      this.showMenu = false
      uni.navigateTo({ url: '/pages/message/group-create' })
    },
    goSearchGroup() {
      this.showMenu = false
      uni.navigateTo({ url: '/pages/message/group-search' })
    },
    formatCount(n) {
      return n > 99 ? '99+' : String(n || 0)
    },
    formatTime(value) {
      if (!value) return ''
      const str = String(value)
      if (str.length >= 16) return str.slice(11, 16)
      return str
    },
    fixUrl(url) {
      if (!url) return '/static/logo.png'
      if (String(url).startsWith('http')) return url
      if (String(url).startsWith('/static/')) return url
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      return base + (String(url).startsWith('/') ? url : '/' + url)
    }
  }
}
</script>

<style scoped>
.group-list-page {
  width: 100%;
  min-height: 100vh;
  background: #f5f6f8;
}

.top-nav {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  background: rgba(255,255,255,.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 100;
  border-bottom: 1rpx solid rgba(0,0,0,.05);
  box-shadow: 0 2rpx 20rpx rgba(0,0,0,.06);
}
.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.nav-side {
  width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-icon {
  font-size: 48rpx;
  color: #15171a;
  font-weight: 300;
  line-height: 1;
}
.add-icon {
  font-size: 44rpx;
  color: #15171a;
  font-weight: 400;
  line-height: 1;
}
.nav-center {
  flex: 1;
  text-align: center;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #15171a;
}

.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.loading-box {
  padding: 200rpx 0;
  text-align: center;
  color: #9ca3af;
  font-size: 28rpx;
}

.group-scroll {
  height: calc(100vh - 88rpx - var(--status-bar-height, 20px));
}

.group-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  position: relative;
  transition: all 0.2s;
}
.group-item:active {
  background: #f9fafb;
}
.group-item + .group-item {
  border-top: 1rpx solid #f3f4f6;
}

.group-avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 28rpx;
  margin-right: 24rpx;
  background: #f3f4f6;
  flex-shrink: 0;
}
.ava-wrap { position: relative; overflow: hidden; }
.ava-wrap .img { width: 100%; height: 100%; border-radius: inherit; display: block; }

.group-body { flex: 1; overflow: hidden; }
.group-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.group-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400rpx;
}
.group-meta {
  font-size: 22rpx;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.group-preview {
  font-size: 28rpx;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  margin-bottom: 10rpx;
}
.group-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.group-code { font-size: 22rpx; color: #9ca3af; }
.group-time { font-size: 22rpx; color: #d1d5db; }

.group-badge {
  position: absolute;
  top: 24rpx;
  right: 32rpx;
  background: linear-gradient(135deg, #ff2442 0%, #ff4d6d 100%);
  color: #fff;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 800;
  box-shadow: 0 4rpx 12rpx rgba(255,36,66,0.35);
}

.empty {
  padding: 200rpx 60rpx;
  text-align: center;
  color: #9ca3af;
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.empty-tip {
  font-size: 24rpx;
  color: #d1d5db;
}

.menu-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: flex-end;
  animation: maskFadeIn 0.25s ease;
}
@keyframes maskFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.menu-sheet {
  width: 100%;
  background: #f5f6f8;
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
  overflow: hidden;
  padding: 20rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  animation: sheetUp 0.3s cubic-bezier(0.2,0.8,0.2,1);
}
@keyframes sheetUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  transition: all 0.2s;
}
.menu-item:active {
  background: #f9fafb;
  transform: scale(0.99);
}
.menu-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #ff4d6d 0%, #ff2442 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 109, 0.3);
}
.menu-icon-img {
  width: 28rpx;
  height: 28rpx;
}
.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #15171a;
  font-weight: 500;
}
.menu-arrow {
  font-size: 36rpx;
  color: #d1d5db;
  font-weight: 300;
}

.menu-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #6b7280;
  font-weight: 500;
  margin-top: 8rpx;
}
.menu-cancel:active {
  background: #f9fafb;
}

.vip-rainbow-text {
  background: linear-gradient(90deg, #ff2442, #ff7a00, #ffd400, #00c853, #00b0ff, #aa00ff, #ff2442);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: vipRainbowMove 4s linear infinite;
  font-weight: 900 !important;
}
@keyframes vipRainbowMove {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}
</style>