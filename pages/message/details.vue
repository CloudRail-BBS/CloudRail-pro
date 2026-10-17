<template>
  <view class="container" :class="themeClass">
    <view class="custom-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-header">
        <view class="back-wrap" @click="goBack">
          <image class="back-icon-img" src="/static/icon/back.svg" mode="aspectFit"></image>
        </view>

        <view class="tab-box" :class="{ 'single-tab': visibleTabs.length === 1 }">
          <view
            v-for="tab in visibleTabs"
            :key="tab.key"
            class="tab-item"
            :class="{ active: true }"
          >
            {{ tab.name }}
            <view class="active-line"></view>
          </view>
        </view>

        <view class="clear-btn" @click="showConfirm">清空</view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <!-- 骨架屏 -->
    <view v-if="firstLoading" class="skeleton-wrap">
      <view class="chat-wrap skeleton-box">
        <view class="chat-row" v-for="i in 8" :key="'sk-' + i">
          <view class="sk-avatar skeleton-anim"></view>
          <view class="chat-body">
            <view class="chat-top">
              <view class="sk-text sk-name skeleton-anim"></view>
              <view class="sk-text sk-time skeleton-anim"></view>
            </view>
            <view class="sk-text sk-preview skeleton-anim"></view>
          </view>
          <view class="sk-cover skeleton-anim"></view>
        </view>
      </view>
    </view>

    <scroll-view
      v-else
      scroll-y
      class="list-scroll"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="msg-item" v-for="(item, index) in list" :key="item.id || index">
        <view class="ava-wrap avatar" @click.stop="toUser(item.actor_id)">
          <image
            class="img"
            :src="item.actor_avatar || '/static/logo.png'"
            mode="aspectFill"
            @error="$set(list[index], 'actor_avatar', '/static/logo.png')"
          />
        </view>
        <view class="content-col">
          <view class="name-line">
            <text class="username">{{ item.actor_name }}</text>
            <text class="time">{{ formatTime(item.create_time) }}</text>
          </view>

          <view v-if="currentTabKey === 'like'" class="action-text">
            {{ item.action_text || '赞了你的帖子' }}
          </view>

          <view v-if="currentTabKey === 'comment'" class="comment-content">
            <text class="action-prefix">{{ item.action_text || '评论了你：' }}</text>
            {{ item.content || '暂无内容' }}
          </view>
        </view>
        <view class="right-box">
          <view
            v-if="item.post_cover"
            class="post-cover-box"
            @click.stop="toPost(item.post_id, item.target_type)"
          >
            <image
              class="post-cover-img"
              :src="item.post_cover"
              mode="aspectFill"
            />
          </view>

          <view
            v-else-if="item.post_content"
            class="post-text-preview"
            @click.stop="toPost(item.post_id, item.target_type)"
          >
            {{ item.post_content }}
          </view>

          <view
            v-else
            class="post-text-preview post-text-placeholder"
            @click.stop="toPost(item.post_id, item.target_type)"
          >
            查看详情
          </view>
        </view>

      </view>

      <view class="empty-state" v-if="list.length === 0 && !loading">
        <text class="empty-text">暂无消息</text>
      </view>

      <view class="load-more" v-if="list.length > 0">
        <text v-if="loading">加载中...</text>
        <text v-else-if="!hasMore">没有更多了</text>
        <text v-else>上拉加载更多</text>
      </view>

      <view style="height: env(safe-area-inset-bottom)"></view>
    </scroll-view>

    <!-- 清空确认弹窗 -->
    <view class="confirm-mask" v-if="showClearConfirm" @click="hideConfirm" catchtouchmove="true">
      <view class="confirm-box" @click.stop>
        <view class="confirm-title">确认清空</view>
        <view class="confirm-desc">清空后将无法恢复，确定要清空当前分类的所有消息吗？</view>
        <view class="confirm-btns">
          <view class="confirm-btn cancel" @click="hideConfirm">取消</view>
          <view class="confirm-btn confirm" @click="handleClear">确定</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { request, baseUrl } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      entryType: '',
      tabs: [
        { name: '赞与收藏', key: 'like' },
        { name: '评论和@', key: 'comment' }
      ],
      currentTab: 0,

      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      firstLoading: true,

      refreshing: false,
      showClearConfirm: false,

      avatarLoadedMap: {}
    }
  },

  computed: {
    visibleTabs() {
      // 根据入口类型只显示对应的tab
      if (this.entryType === 'like') return [this.tabs[0]]
      if (this.entryType === 'comment') return [this.tabs[1]]
      return this.tabs
    },
    currentTabKey() {
      return this.tabs[this.currentTab].key
    }
  },

  onLoad(opt) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20

    if (opt.type) {
      this.entryType = opt.type
      const idx = this.tabs.findIndex(t => t.key === opt.type)
      if (idx !== -1) this.currentTab = idx
    }

    request('message.php', { action: 'markNoticeRead', type: this.currentTabKey }, 'POST').catch(() => {})
    this.fetchList(true)
  },

  onShow() {
    // 仅同步本地已读状态，不触发拉取（避免循环刷新）
    uni.$emit('message_read_changed', { type: this.currentTabKey, skipFetch: true })
  },

  onUnload() {
    // 页面销毁（返回）时通知消息页刷新，确保已读状态实时更新
    uni.$emit('message_read_changed', { type: this.currentTabKey, skipFetch: false })
  },

  methods: {
    normalizeItem(item, index = 0) {
      const actorName = item.actor_name || item.actor_username || `用户${item.actor_id || ''}`
      const actorAvatar = this.fixUrl(item.actor_avatar || '')
      const postCover = item.post_cover ? this.fixUrl(item.post_cover) : ''
      const postContent = item.post_content || ''
      const content = item.content || ''

      let actionText = ''
      const t = String(item.type || '')
      const isDynamic = t.indexOf('dynamic_') === 0

      if (this.currentTabKey === 'like') {
        if (['comment_like', 'like_comment'].includes(t)) {
          actionText = '赞了你的评论'
        } else if (['collect', 'favorite', 'fav'].includes(t)) {
          actionText = '收藏了你的帖子'
        } else if (t === 'dynamic_like') {
          actionText = '赞了你的动态'
        } else {
          actionText = '赞了你的帖子'
        }
      } else {
        if (['reply', 'reply_comment', 'comment_reply'].includes(t)) {
          actionText = '回复了你：'
        } else if (['at', 'mention'].includes(t)) {
          actionText = '@了你：'
        } else if (t === 'dynamic_reply') {
          actionText = '回复了你：'
        } else if (t === 'dynamic_comment') {
          actionText = '评论了你：'
        } else {
          actionText = '评论了你：'
        }
      }

      const targetType = isDynamic ? 'dynamic' : (item.target_type || 'post')

      return {
        ...item,
        id: item.id || index,
        actor_name: actorName,
        actor_avatar: actorAvatar,
        post_cover: postCover,
        post_content: postContent,
        content,
        action_text: actionText,
        target_type: targetType
      }
    },

    switchTab(i) {
      if (this.currentTab === i) return
      this.currentTab = i
      this.fetchList(true)
    },

    async fetchList(refresh = false) {
      if (refresh) {
        this.page = 1
        this.hasMore = true
        this.list = []
        this.avatarLoadedMap = {}
      }
      if (!this.hasMore) return

      this.loading = true
      try {
        const res = await request('message.php', {
          action: 'getNotificationList',
          type: this.currentTabKey,
          page: this.page
        }, 'GET')

        if (res.code === 0) {
          const d = res.data
          let raw = []
          if (Array.isArray(d)) {
            raw = d
          } else if (d && Array.isArray(d.list)) {
            raw = d.list
          }
          const data = raw.map((it, idx) => this.normalizeItem(it, idx))

          this.list = refresh ? data : [...this.list, ...data]

          const a = { ...this.avatarLoadedMap }
          this.list.forEach((it, idx) => {
            const k = it.id || idx
            if (a[k] === undefined) a[k] = true
          })
          this.avatarLoadedMap = a

          this.hasMore = data.length >= 20
          if (this.hasMore) this.page++
          uni.$emit('message_read_changed', { type: this.currentTabKey })
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
        }
      } finally {
        this.loading = false
        this.firstLoading = false
        this.refreshing = false
      }
    },

    loadMore() {
      if (this.loading) return
      this.fetchList(false)
    },

    onRefresh() {
      this.refreshing = true
      this.fetchList(true)
    },

    showConfirm() {
      if (this.list.length === 0) {
        uni.showToast({ title: '暂无消息可清空', icon: 'none' })
        return
      }
      this.showClearConfirm = true
    },

    hideConfirm() {
      this.showClearConfirm = false
    },

    async handleClear() {
      this.hideConfirm()
      uni.showLoading({ title: '清空中...', mask: true })
      try {
        const res = await request('message.php', {
          action: 'clearSpecificNotifications',
          type: this.currentTabKey
        }, 'POST')
        uni.hideLoading()
        if (res.code === 0) {
          this.list = []
          this.hasMore = false
          uni.showToast({ title: '已清空', icon: 'none' })
        } else {
          uni.showToast({ title: res.msg || '清空失败', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '清空失败', icon: 'none' })
      }
    },

    onAvatarLoad(k) { this.$set(this.avatarLoadedMap, k, true) },
    onAvatarError(k) { this.$set(this.avatarLoadedMap, k, true) },

    toUser(uid) {
      if (!uid) return
      uni.navigateTo({ url: `/pages/user/profile?userId=${uid}` })
    },

    toPost(pid, targetType) {
      if (!pid) return
      if (targetType === 'dynamic') {
        uni.navigateTo({ url: `/pages/dynamic/detail?id=${pid}` })
      } else {
        uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${pid}` })
      }
    },

    goBack() {
      uni.navigateBack()
    },

    formatTime(t) {
      if (!t) return ''
      const date = new Date(String(t).replace(/-/g, '/'))
      const now = new Date()
      const diff = now - date
      const oneDay = 86400000

      if (diff < oneDay && now.getDate() === date.getDate()) {
        return String(t).substring(11, 16)
      } else if (diff < oneDay * 2) {
        return '昨天'
      } else if (diff < oneDay * 7) {
        return Math.floor(diff / oneDay) + '天前'
      } else {
        return String(t).substring(5, 16)
      }
    },

    fixUrl(u) {
      if (!u) return '/static/logo.png'
      if (String(u).startsWith('http')) return u
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      return base + (u.startsWith('/') ? u : '/' + u)
    }
  }
}
</script>

<style scoped>
page { background-color: var(--cr-surface-alt); }

.container { min-height: 100vh; background: var(--cr-surface-alt); }

/* ===== 导航栏 ===== */
.custom-nav {
  position: fixed;
  top: 0; left: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  z-index: 100;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}
.nav-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}
.back-wrap {
  width: 110rpx;
  height: 44px;
  display: flex;
  align-items: center;
}
.back-btn {
  font-size: 42rpx;
  color: #000;
  font-weight: 500;
  line-height: 1;
}
.back-icon-img {
  width: 40rpx;
  height: 40rpx;
}
.clear-btn {
  width: 80rpx;
  text-align: right;
  font-size: 26rpx;
  color: #007aff;
  font-weight: 700;
}
.tab-box {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 48rpx;
}
.tab-box.single-tab {
  gap: 0;
}
.tab-item {
  font-size: 28rpx;
  color: #8E8E93;
  position: relative;
  padding: 12rpx 0;
}
.tab-item.active {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1A1A;
}
.active-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32rpx;
  height: 6rpx;
  background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
  border-radius: 3rpx;
  animation: lineSlide .3s ease-out;
}
@keyframes lineSlide { from { width: 0; opacity: 0 } to { width: 32rpx; opacity: 1 } }

/* ===== 滚动列表 ===== */
.list-scroll {
  height: calc(100vh - 44px - env(safe-area-inset-top));
}

/* ===== 通知行 ===== */
.msg-item {
  display: flex;
  align-items: center;
  padding: 24rpx 24rpx;
  background: var(--cr-surface);
  border-bottom: 1rpx solid #F2F2F7;
}
.msg-item:active { background: var(--cr-surface-alt); }

/* ===== 头像 ===== */
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.03);
  flex-shrink: 0;
}
.ava-wrap { position: relative; overflow: hidden; }
.ava-wrap .img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  display: block;
  transition: opacity .18s ease-out;
}
.ava-wrap .skel {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #eceff3;
  overflow: hidden;
}
.ava-wrap .skel::after {
  content: '';
  position: absolute;
  top: 0; left: -40%;
  width: 40%; height: 100%;
  background: linear-gradient(90deg, rgba(236,239,243,0) 0%, rgba(255,255,255,0.85) 50%, rgba(236,239,243,0) 100%);
  animation: shimmer 1.1s infinite;
}
@keyframes shimmer { 0% { left: -40% } 100% { left: 120% } }

/* ===== 文字内容 ===== */
.content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-right: 20rpx;
  overflow: hidden;
  min-width: 0;
}
.name-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.username {
  font-size: 30rpx;
  font-weight: 800;
  color: #111;
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time {
  font-size: 22rpx;
  color: var(--cr-text-muted);
  flex-shrink: 0;
  margin-left: 12rpx;
}
.action-text {
  font-size: 26rpx;
  color: #8E8E93;
  line-height: 1.5;
}
.comment-content {
  font-size: 26rpx;
  color: #3C3C43;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}
.action-prefix { color: #8E8E93; }

/* ===== 右侧帖子预览（核心修复） ===== */
.right-box {
  flex-shrink: 0;
  width: 100rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

/* 封面图容器：直接显示，无 opacity 动画 */
.post-cover-box {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--cr-surface-alt);
  border: 1rpx solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}
.post-cover-img {
  width: 100%;
  height: 100%;
  display: block;
}

/* 文字预览 */
.post-text-preview {
  width: 100rpx;
  height: 100rpx;
  font-size: 20rpx;
  color: #3C3C43;
  background: var(--cr-surface-alt);
  padding: 12rpx;
  overflow: hidden;
  border-radius: 12rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}
.post-text-placeholder {
  color: #AEAEB2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}
.empty-text { font-size: 28rpx; color: var(--cr-border-strong); }
.load-more {
  text-align: center;
  color: #bdbdbd;
  font-size: 24rpx;
  padding: 24rpx 0 10rpx;
}

/* ===== 骨架屏 ===== */
.skeleton-wrap { animation: fadeIn .3s ease; }
.skeleton-box {
  background: var(--cr-surface);
}
.chat-wrap { }
.chat-row {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #F2F2F7;
}
.chat-body {
  flex: 1;
  margin: 0 20rpx;
}
.chat-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.skeleton-anim {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
  border-radius: 8rpx;
}
@keyframes skeleton-loading { 0% { background-position: 100% 50% } 100% { background-position: 0 50% } }
.sk-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; flex-shrink: 0; }
.sk-cover { width: 100rpx; height: 100rpx; border-radius: 12rpx; flex-shrink: 0; }
.sk-text { height: 28rpx; }
.sk-name { width: 180rpx; }
.sk-time { width: 70rpx; }
.sk-preview { width: 85%; height: 24rpx; margin-top: 4rpx; }

/* ===== 清空确认弹窗 ===== */
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn .25s ease-out;
  padding: 0 60rpx;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
.confirm-box {
  width: 100%;
  max-width: 560rpx;
  background: var(--cr-surface);
  border-radius: 24rpx;
  overflow: hidden;
  animation: scaleIn .3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes scaleIn { from { opacity: 0; transform: scale(.9) } to { opacity: 1; transform: scale(1) } }
.confirm-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1A1A1A;
  text-align: center;
  padding: 48rpx 40rpx 20rpx;
}
.confirm-desc {
  font-size: 26rpx;
  color: #8E8E93;
  line-height: 1.6;
  text-align: center;
  padding: 0 40rpx 40rpx;
}
.confirm-btns {
  display: flex;
  border-top: 1rpx solid #E5E5EA;
}
.confirm-btn {
  flex: 1;
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  font-size: 32rpx;
}
.confirm-btn.cancel {
  color: #8E8E93;
  border-right: 1rpx solid #E5E5EA;
}
.confirm-btn.confirm {
  color: #007AFF;
  font-weight: 700;
}
.confirm-btn:active { background: var(--cr-surface-alt); }
</style>
