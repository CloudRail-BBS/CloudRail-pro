<template>
  <view class="circle-page">
    <OnlineNotifyCard />
    <view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-row">
        <view class="nav-tabs">
          <view class="nav-tab" :class="{ active: currentTab === 0 }" @click="switchTab(0)">
            <text>发现</text>
            <view class="active-line" v-if="currentTab === 0"></view>
          </view>
          <view class="nav-tab" :class="{ active: currentTab === 1 }" @click="switchTab(1)">
            <text>动态</text>
            <view class="active-line" v-if="currentTab === 1"></view>
          </view>
          <view class="nav-tab" :class="{ active: currentTab === 2 }" @click="switchTab(2)">
            <text>圈子</text>
            <view class="active-line" v-if="currentTab === 2"></view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="page-scroll"
      enhanced
      :show-scrollbar="false"
      :refresher-enabled="refresherEnabled"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :lower-threshold="120"
    >
      <view class="page-body">
        <view :key="currentTab" class="tab-panel">
        <!-- 关注/发现 tab：参考图样式 -->
        <template v-if="currentTab === 0">
          <!-- 圈子推荐 -->
          <view class="rec-section">
            <view class="rec-head">
              <text class="rec-title">圈子推荐</text>
              <view class="rec-more" @click="switchTab(2)">
                <text class="rec-more-text">全部圈子</text>
                <text class="rec-more-arrow">›</text>
              </view>
            </view>
            <view class="rec-grid">
              <view
                class="rec-item"
                v-for="item in recommendCircles"
                :key="item.id"
                @click="goDetail(item)"
              >
                <image :src="item.image" class="rec-icon" mode="aspectFill"></image>
                <view class="rec-info">
                  <text class="rec-name">{{ item.name }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 精选排行榜 -->
          <view class="rank-section">
            <view class="rec-head">
              <text class="rec-title">精选排行榜</text>
              <view class="rec-more" @click="switchTab(1)">
                <text class="rec-more-text">完整榜单</text>
                <text class="rec-more-arrow">›</text>
              </view>
            </view>
            <view class="rank-list">
              <view
                class="rank-item"
                v-for="(item, idx) in hotPosts"
                :key="item.id"
                @click="goPostDetail(item)"
              >
                <text class="rank-no" :class="{ top: idx < 3 }">{{ idx + 1 }}</text>
                <image :src="getPostCover(item)" class="rank-cover" mode="aspectFill"></image>
                <view class="rank-info">
                  <text class="rank-title">{{ (item.title || item.plain_content || '动态').slice(0, 20) }}</text>
                  <text class="rank-author">{{ item.name || item.username || '匿名' }}</text>
                </view>
                <view class="rank-heat">
                  <text class="heat-num">{{ formatNum(item.view_count || item.like_count || 0) }}</text>
                  <text class="heat-icon">♨</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 可能认识的人 -->
          <view class="user-section" v-if="recommendUsers.length > 0">
            <view class="rec-head">
              <text class="rec-title">可能认识的人</text>
            </view>
            <view class="user-list">
              <view class="user-item" v-for="u in recommendUsers" :key="u.uid || u.id">
                <image :src="u.avatar || u.avatar_url || '/static/logo.png'" class="user-avatar" mode="aspectFill"></image>
                <view class="user-info">
                  <text class="user-name">{{ u.nickname || u.name || '用户' }}</text>
                  <text class="user-bio">{{ u.signature || u.bio || '这个人很懒，什么都没留下' }}</text>
                </view>
                <view class="user-btn" :class="{ followed: u.is_following }" @click="toggleFollow(u)">
                  <text class="user-btn-text">{{ u.is_following ? '已关注' : '关注' }}</text>
                </view>
              </view>
            </view>
          </view>

          <view style="height: 40rpx;"></view>
        </template>

        <DynamicFeed ref="dynamicFeed" v-if="currentTab === 1" feedType="all" />

        <template v-if="currentTab === 2">
        <template v-if="firstLoading">
          <view class="sk-card">
            <view class="sk-head"></view>
            <view class="sk-row-item" v-for="i in 6" :key="i">
              <view class="sk-row-img"></view>
              <view class="sk-row-info">
                <view class="sk-line l160"></view>
                <view class="sk-line l240 mt12"></view>
                <view class="sk-line l100 mt12"></view>
              </view>
            </view>
          </view>
        </template>

        <template v-else>
          <!-- 顶部广告轮播 -->
          <swiper class="circle-banner" v-if="bannerList.length > 0" circular autoplay :interval="3500" indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff">
            <swiper-item v-for="(b, idx) in bannerList" :key="idx" @click="handleBannerClick(b)">
              <image :src="bannerImg(b.image)" class="circle-banner-img" mode="aspectFill"></image>
            </swiper-item>
          </swiper>

          <!-- 推荐圈子（未分类） -->
          <view class="cat-block" v-if="uncategorizedList.length > 0">
            <view class="cat-head">
              <view class="cat-bar"></view>
              <text class="cat-title">推荐圈子</text>
            </view>
            <view class="cat-grid">
              <view
                class="cat-card"
                v-for="item in uncategorizedList"
                :key="item.id"
                @click="goDetail(item)"
              >
                <image :src="item.image" class="cat-card-icon" mode="aspectFill"></image>
                <view class="cat-card-info">
                  <text class="cat-card-name">{{ item.name }}</text>
                  <text class="cat-card-stat">{{ item.post_count }} 帖子 | {{ item.member_count }} 加入</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 各分类区块 -->
          <view class="cat-block" v-for="group in categoryGroups" :key="'cat-' + group.id">
            <view class="cat-head">
              <view class="cat-bar"></view>
              <text class="cat-title">{{ group.name }}</text>
            </view>
            <view class="cat-grid">
              <view
                class="cat-card"
                v-for="item in group.list"
                :key="item.id"
                @click="goDetail(item)"
              >
                <image :src="item.image" class="cat-card-icon" mode="aspectFill" lazy-load></image>
                <view class="cat-card-info">
                  <text class="cat-card-name">{{ item.name }}</text>
                  <text class="cat-card-stat">{{ item.post_count }} 帖子 | {{ item.member_count }} 加入</text>
                </view>
              </view>
            </view>
          </view>

            <view class="loading-row" v-if="loading && !firstLoading">
              <view class="loading-dot"></view>
              <text class="loading-txt">加载中...</text>
            </view>

            <view class="no-more-row" v-if="!hasMore && filteredList.length > 0 && !loading">
              <text class="no-more-txt">— 没有更多圈子了 —</text>
            </view>

            <view class="empty-wrap" v-if="!loading && filteredList.length === 0">
              <image src="/static/icon/nullu.png" class="empty-img" mode="aspectFit"></image>
              <text class="empty-title">没有找到相关圈子</text>
              <text class="empty-sub">换个关键词试试</text>
            </view>

        </template>
        </template>

        <view style="height: 40rpx;"></view>
        </view>
      </view>
    </scroll-view>

    <view class="toast" :class="{ show: toast.show }">
      <text>{{ toast.msg }}</text>
    </view>

    <CustomTabBar :current="1" @publish="goPublish" />
    <PublishModal :visible="showPublishModal" @close="showPublishModal = false" @select="onPublishSelect" />
  </view>
</template>

<script>
import { request, bmsBaseUrl } from '../../common/request.js'
import DynamicFeed from '../../components/DynamicFeed.vue'
import PublishModal from '../../components/PublishModal.vue'
import CustomTabBar from '../../components/CustomTabBar.vue'
import OnlineNotifyCard from '../../components/OnlineNotifyCard.vue'
import { applyH5ViewportHeightVar, getScreenMetrics } from '../../common/screen.js'

export default {
  components: { DynamicFeed, PublishModal, CustomTabBar, OnlineNotifyCard },
  data() {
    return {
      statusBarHeight: 0,
      topPlaceholderHeight: 80,
      currentTab: 2,
      userInfo: null,
      list: [],
      filteredCacheList: [],
      page: 1,
      pageSize: 20,
      hasMore: true,
      firstLoading: true,
      loading: false,
      isRefreshing: false,
      requestLock: false,
      sortType: 'hot',
      categories: [],
      hotPosts: [],
      recommendUsers: [],
      bannerList: [],
      toast: { show: false, msg: '' },
      toastTimer: null,
      showPublishModal: false,

      refresherEnabled: true
    }
  },

  computed: {
    filteredList() {
      return this.filteredCacheList
    },
    recommendCircles() {
      return this.filteredCacheList.slice(0, 6)
    },
    uncategorizedList() {
      return this.filteredCacheList.filter(i => !Number(i.category_id || 0))
    },
    categoryGroups() {
      const groups = []
      const cats = this.categories || []
      cats.forEach(cat => {
        const list = this.filteredCacheList.filter(i => Number(i.category_id) === Number(cat.id))
        if (list.length > 0) groups.push({ id: cat.id, name: cat.name, list })
      })
      // 兜底: 分类接口异常/为空时, 按圈子自带的分类名分组, 避免有分类的圈子不显示
      if (groups.length === 0) {
        const map = {}
        this.filteredCacheList.forEach(i => {
          if (!Number(i.category_id || 0)) return
          const k = i.category_name || '其他圈子'
          if (!map[k]) { map[k] = { id: i.category_id, name: k, list: [] }; groups.push(map[k]) }
          map[k].list.push(i)
        })
      }
      return groups
    }
  },

  onLoad() {
    applyH5ViewportHeightVar()
    const metrics = getScreenMetrics()
    this.statusBarHeight = metrics.statusBarHeight
    this.topPlaceholderHeight = this.statusBarHeight + 44

    const u = uni.getStorageSync('userInfo')
    if (u) this.userInfo = u

    this.loadData(true)
    this.loadCategories()
    this.loadHotPosts()
    this.loadRecommendUsers()
    this.loadBanner()
  },

  /* 自定义 TabBar：每次页面显示都压一次原生 TabBar，
     否则切页后原生 TabBar 会重新露出来，和自定义的重叠成两排 */
  onShow() {
    try { uni.hideTabBar({ animation: false, fail: () => {} }) } catch (e) {}
  },

  onUnload() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
  },

  methods: {
    switchTab(tab) {
      if (this.currentTab === tab) return
      this.currentTab = tab
      if (tab === 1 && this.$refs.dynamicFeed) {
        this.$refs.dynamicFeed.loadData(true)
      }
    },

    normalizeItem(item) {
      return {
        ...item,
        id: Number(item.id || 0),
        image: item.image || '/static/logo.png',
        is_joined: !!item.is_joined,
        is_top: Number(item.is_top || 0),
        sort: Number(item.sort || 0),
        member_count: Number(item.user_count || item.member_count || 0),
        post_count: Number(item.post_count || 0),
        level: Number(item.level || 0),
        vip: Number(item.vip || 0),
        description: item.description || item.desc || ''
      }
    },

    mergeUniqueById(oldList, newList) {
      const map = {}
      const result = []
      oldList.forEach(item => {
        if (!map[item.id]) { map[item.id] = true; result.push(item) }
      })
      newList.forEach(item => {
        if (!map[item.id]) { map[item.id] = true; result.push(item) }
      })
      return result
    },

    async loadData(reset = false) {
      if (this.requestLock) return
      if (!reset && (!this.hasMore || this.loading)) return

      this.requestLock = true
      this.loading = true

      if (reset) {
        this.page = 1
        this.hasMore = true
      }

      try {
        const uid = this.userInfo ? this.userInfo.id : 0
        const res = await request('circle.php', {
          action: 'list',
          userId: uid,
          page: this.page,
          pageSize: this.pageSize,
          sort: this.sortType
        }, 'GET')

        if (res.code === 0) {
          const incoming = Array.isArray(res.data) ? res.data.map(this.normalizeItem) : []
          if (reset || this.page === 1) {
            this.list = incoming
          } else {
            this.list = this.mergeUniqueById(this.list, incoming)
          }
          this.hasMore = incoming.length >= this.pageSize
          this.applyFilter()
        } else {
          this.showToast(res.msg || '加载失败')
        }
      } catch (e) {
        this.showToast('网络异常')
      } finally {
        this.loading = false
        this.firstLoading = false
        this.isRefreshing = false
        this.requestLock = false
      }
    },

    applyFilter() {
      let source = [...this.list]
      source.sort((a, b) => {
        const topA = Number(a.is_top || 0)
        const topB = Number(b.is_top || 0)
        if (topB !== topA) return topB - topA
        const sortA = Number(a.sort || 0)
        const sortB = Number(b.sort || 0)
        if (sortA !== sortB) return sortA - sortB
        return Number(b.member_count || 0) - Number(a.member_count || 0)
      })
      this.filteredCacheList = source
    },

    changeSort(type) {
      if (this.sortType === type) return
      this.sortType = type
      this.loadData(true)
    },

    async loadCategories() {
      try {
        const res = await request('circle.php', { action: 'categories' }, 'GET')
        if (res.code === 0) this.categories = Array.isArray(res.data) ? res.data : []
      } catch (e) {}
    },

    loadMore() {
      if (this.currentTab === 1) {
        if (this.$refs.dynamicFeed) this.$refs.dynamicFeed.loadMore()
        return
      }
      if (this.currentTab === 0) return
      if (this.loading || !this.hasMore || this.requestLock) return
      this.page += 1
      this.loadData()
    },

    async onRefresh() {
      if (this.currentTab === 1) {
        this.isRefreshing = true
        try {
          if (this.$refs.dynamicFeed) await this.$refs.dynamicFeed.onRefresh()
        } finally {
          this.isRefreshing = false
        }
        return
      }
      this.isRefreshing = true
      this.loadData(true)
      this.loadHotPosts()
      this.loadRecommendUsers()
    },

    async loadBanner() {
      try {
        const res = await request('banner.php', { action: 'list' }, 'GET')
        if (res.code === 0) this.bannerList = res.data || []
      } catch (e) {}
    },

    bannerImg(url) {
      if (!url) return '/static/logo.png'
      if (/^https?:\/\//i.test(url)) return url
      const base = (bmsBaseUrl || '').replace(/\/+$/, '')
      return base + (url.startsWith('/') ? url : '/' + url)
    },

    handleBannerClick(item) {
      if (!item || !item.link) return
      if (item.link.indexOf('http') === 0) {
        uni.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(item.link)}` })
      } else {
        uni.navigateTo({ url: item.link })
      }
    },

    async loadHotPosts() {
      try {
        const res = await request('post.php', {
          action: 'list',
          page: 1,
          pageSize: 5,
          sort: 'hot'
        }, 'GET')
        if (res.code === 0) {
          const arr = Array.isArray(res.data) ? res.data : (res.data.list || [])
          this.hotPosts = arr.slice(0, 4)
        }
      } catch (e) {}
    },

    async loadRecommendUsers() {
      try {
        const res = await request('user.php', {
          action: 'getRecommendUsers',
          page: 1,
          pageSize: 6
        }, 'GET')
        if (res.code === 0) {
          const arr = Array.isArray(res.data) ? res.data : (res.data.list || [])
          this.recommendUsers = arr.slice(0, 5)
        }
      } catch (e) {}
    },

    async toggleFollow(u) {
      if (!this.userInfo) {
        return uni.navigateTo({ url: '/pages/login/login' })
      }
      const prev = !!u.is_following
      u.is_following = !prev
      try {
        const res = await request('user.php', {
          action: 'toggleFollow',
          uid: u.uid || u.id
        }, 'POST')
        if (res.code === 0) {
          u.is_following = !!(res.data && res.data.following)
          this.showToast(u.is_following ? '已关注' : '已取消关注')
        } else {
          u.is_following = prev
          this.showToast(res.msg || '操作失败')
        }
      } catch (e) {
        u.is_following = prev
        this.showToast('网络异常')
      }
    },

    getPostCover(post) {
      if (!post) return '/static/logo.png'
      if (post.cover) return post.cover
      if (post.images) {
        try {
          const arr = typeof post.images === 'string' ? JSON.parse(post.images) : post.images
          if (Array.isArray(arr) && arr.length) return arr[0]
        } catch (e) {}
      }
      return '/static/logo.png'
    },

    goPostDetail(post) {
      uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${post.id}` })
    },

    goUserProfile(u) {
      uni.navigateTo({ url: `/pages/user/profile?userId=${u.id}` })
    },

    goDetail(item) {
      uni.navigateTo({
        url: `/pages/circle/detail?id=${item.id}&name=${encodeURIComponent(item.name)}`
      })
    },

    async handleJoin(item) {
      if (!this.userInfo) {
        return uni.navigateTo({ url: '/pages/login/login' })
      }
      try { uni.vibrateShort() } catch (e) {}

      const prev = item.is_joined
      item.is_joined = !prev
      item.member_count = Math.max(0, Number(item.member_count || 0) + (item.is_joined ? 1 : -1))
      this.applyFilter()

      try {
        const res = await request('circle.php', {
          action: 'toggleJoin',
          circle_id: item.id,
          userId: this.userInfo.id
        }, 'POST')

        if (res.code === 0) {
          const newStatus = !!(res.data && res.data.status)
          item.is_joined = newStatus
          this.showToast(newStatus ? '已加入圈子' : '已退出圈子')
        } else {
          item.is_joined = prev
          item.member_count = Math.max(0, Number(item.member_count || 0) + (prev ? 1 : -1))
          this.applyFilter()
          this.showToast(res.msg || '操作失败')
        }
      } catch (e) {
        item.is_joined = prev
        item.member_count = Math.max(0, Number(item.member_count || 0) + (prev ? 1 : -1))
        this.applyFilter()
        this.showToast('网络异常')
      }
    },

    goPublish() {
      this.showPublishModal = true
    },

    onPublishSelect(e) {
      if (e && e.url) {
        uni.navigateTo({ url: e.url })
      }
    },

    showToast(msg) {
      this.toast.msg = msg
      this.toast.show = true
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast.show = false }, 1800)
    },

    formatNum(n) {
      n = Number(n || 0)
      if (n >= 10000) {
        const v = (n / 10000).toFixed(1)
        return v.endsWith('.0') ? `${parseInt(v)}w` : `${v}w`
      }
      return String(n)
    }
  }
}
</script>

<style scoped>
.tab-panel { width: 100%; }

.circle-page {
  display: flex;
  flex-direction: column;
  height: var(--tcy-vh, 100vh);
  overflow: hidden;
  background: #F6F7F9;
}

/* ── Top Bar ── */
.top-bar {
  position: relative;
  z-index: 100;
  flex-shrink: 0;
  background: rgba(246, 247, 249, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.05);
}
.header-row {
  padding: 12rpx 32rpx 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-tabs {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.nav-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.nav-tab text {
  font-size: 30rpx;
  color: #999999;
  font-weight: 400;
  transition: all 0.2s;
}
.nav-tab.active text {
  font-size: 34rpx;
  color: #333333;
  font-weight: 800;
  transform: scale(1.05);
}
.active-line {
  width: 28rpx;
  height: 6rpx;
  background: #ff2442;
  border-radius: 4rpx;
  position: absolute;
  bottom: -8rpx;
  left: 50%;
  transform: translateX(-50%);
}
/* ── Scroll ── */
.page-scroll {
  flex: 1;
  min-height: 0;
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
}
.page-body { padding: 20rpx 24rpx 220rpx; }

/* ── Section head ── */
.section-head {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #111;
}
.count-badge {
  margin-left: 10rpx;
  background: #FF4D6A;
  border-radius: 20rpx;
  padding: 2rpx 14rpx;
  display: flex; align-items: center; justify-content: center;
}
.count-text { font-size: 20rpx; color: #fff; font-weight: 600; }

/* ── Discover Section ── */
.discover-section {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  margin-bottom: 20rpx;
}
.discover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx 20rpx;
}
.sort-tabs {
  display: flex;
  align-items: center;
  background: #F2F3F5;
  border-radius: 20rpx;
  padding: 4rpx;
}
.sort-tab {
  height: 44rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.sort-tab text { font-size: 24rpx; color: #888; font-weight: 500; }
.sort-tab.active { background: #fff; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.08); }
.sort-tab.active text { color: #111; font-weight: 600; }

/* ── 分类栏 ── */
.cat-bar {
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  padding: 20rpx 0;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.cat-scroll { width: 100%; white-space: nowrap; }
.cat-inner { display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; width: max-content; }
.cat-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #F2F3F5;
  transition: all 0.2s;
}
.cat-item text { font-size: 24rpx; color: #666; }
.cat-item.active { background: linear-gradient(135deg, #ff2442, #ff4d6a); }
.cat-item.active text { color: #fff; font-weight: 600; }
.cat-count { font-size: 20rpx; color: #999; }
.cat-item.active .cat-count { color: rgba(255,255,255,0.85); }

/* ── 分类区块 ── */
.cat-section { margin-bottom: 20rpx; }
/* ── Circle grid ── */
.circle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 0 24rpx;
}
.circle-card {
  position: relative;
  display: flex;
  align-items: center;
  background: #F8F8F8;
  border-radius: 28rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.08), 0 2rpx 8rpx rgba(0,0,0,0.04);
  border: 2rpx solid #E5E5E5;
}
.circle-card:active { 
  background: #F0F0F0; 
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  border-color: #D0D0D0;
}

.card-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 16rpx;
  background: #F5F5F5;
}
.card-icon {
  width: 100%;
  height: 100%;
}
.card-top-tag {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: linear-gradient(135deg, #ff2442, #ff4d6a);
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(255,77,106,0.3);
  z-index: 10;
}
.card-top-tag text { font-size: 14rpx; color: #fff; }

.card-content {
  flex: 1;
  min-width: 0;
}
.card-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}
.card-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #111;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}
.card-limit-tags {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-left: 8rpx;
  flex-shrink: 0;
}
.limit-tag {
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
  line-height: 1.4;
}
.limit-tag text { font-size: 18rpx; font-weight: 600; }
.lv-tag {
  background: transparent;
  border: 1rpx solid rgba(0,0,0,0.3);
}
.lv-tag text { color: #000; }
.vip-tag {
  background: linear-gradient(135deg, #2B2B2B, #000);
}
.vip-tag text { color: #F0C386; }
.card-desc {
  display: -webkit-box;
  font-size: 22rpx;
  color: #8A8F9D;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

/* ── Loading / empty ── */
.loading-row {
  display: flex; align-items: center; justify-content: center;
  padding: 40rpx 0; gap: 12rpx;
}
.loading-dot {
  width: 28rpx; height: 28rpx;
  border-radius: 50%;
  border: 3rpx solid #EBEBEB;
  border-top-color: #FF4D6A;
  animation: spin 0.8s linear infinite;
}
.loading-txt { font-size: 24rpx; color: #AAB0BB; }
.no-more-row {
  display: flex; align-items: center; justify-content: center;
  padding: 32rpx 0;
}
.no-more-txt { font-size: 22rpx; color: #CCC; letter-spacing: 2rpx; }
.empty-wrap {
  padding: 80rpx 0 60rpx;
  display: flex; flex-direction: column; align-items: center;
}
.empty-img { width: 180rpx; height: 180rpx; opacity: 0.55; }
.empty-title { margin-top: 24rpx; font-size: 28rpx; color: #333; font-weight: 600; }
.empty-sub { margin-top: 8rpx; font-size: 24rpx; color: #AAB0BB; }

/* ── Toast ── */
.toast {
  position: fixed; left: 50%; top: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  background: rgba(0,0,0,0.8);
  border-radius: 999rpx;
  padding: 22rpx 40rpx;
  z-index: 9999;
  opacity: 0;
  transition: all 0.22s ease;
  pointer-events: none;
  backdrop-filter: blur(10px);
}
.toast text { color: #fff; font-size: 26rpx; letter-spacing: 0.5rpx; }
.toast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }

/* ── Skeleton ── */
.sk-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
}
.sk-head {
  width: 120rpx; height: 28rpx;
  background: #ECEEF1;
  border-radius: 10rpx;
  margin-bottom: 24rpx;
  animation: blink 1.4s infinite;
}
.sk-row-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F4F5F7;
}
.sk-row-item:last-child { border-bottom: none; }
.sk-row-img {
  width: 96rpx; height: 96rpx;
  border-radius: 18rpx;
  background: #ECEEF1;
  flex-shrink: 0;
  animation: blink 1.4s infinite;
}
.sk-row-info { flex: 1; }
.sk-line {
  height: 24rpx;
  background: #ECEEF1;
  border-radius: 10rpx;
  animation: blink 1.4s infinite;
}
.sk-line.l160 { width: 160rpx; }
.sk-line.l240 { width: 240rpx; }
.sk-line.l100 { width: 100rpx; }
.sk-line.mt12 { margin-top: 12rpx; }

/* ── 关注/发现 tab：参考图样式 ── */
.rec-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 12rpx;
  margin-bottom: 20rpx;
}
.rec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.rec-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111;
}
.rec-more {
  display: flex;
  align-items: center;
}
.rec-more-text {
  font-size: 24rpx;
  color: #999;
}
.rec-more-arrow {
  font-size: 28rpx;
  color: #ccc;
  margin-left: 4rpx;
}
.rec-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8rpx 24rpx;
}
.rec-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}
.rec-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
  background: #f5f5f5;
}
.rec-info {
  flex: 1;
  min-width: 0;
}
.rec-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #111;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 排行榜 */
.rank-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 12rpx;
  margin-bottom: 20rpx;
}
.rank-list {
  padding: 0;
}
.rank-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.rank-item:last-child { border-bottom: none; }
.rank-no {
  width: 48rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #ccc;
  text-align: center;
  flex-shrink: 0;
  font-style: italic;
}
.rank-no.top { color: #111; }
.rank-cover {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  margin: 0 20rpx;
  background: #f5f5f5;
}
.rank-info {
  flex: 1;
  min-width: 0;
}
.rank-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #111;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: 8rpx;
}
.rank-author {
  display: block;
  font-size: 22rpx;
  color: #999;
}
.rank-heat {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.heat-num {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-right: 6rpx;
}
.heat-icon {
  font-size: 24rpx;
  color: #999;
}

/* 推荐用户 */
.user-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 12rpx;
  margin-bottom: 20rpx;
}
.user-list { padding: 0; }
.user-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.user-item:last-child { border-bottom: none; }
.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 20rpx;
  background: #f5f5f5;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #ff2442;
  margin-bottom: 8rpx;
}
.user-bio {
  display: block;
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.user-btn {
  flex-shrink: 0;
  padding: 12rpx 36rpx;
  border-radius: 999rpx;
  border: 2rpx solid #ddd;
}
.user-btn.followed {
  border-color: #eee;
  background: #f5f5f5;
}
.user-btn.followed .user-btn-text { color: #999; }
.user-btn-text {
  font-size: 24rpx;
  color: #333;
}

/* 圈子 tab：参考图样式 */
.circle-banner {
  width: 100%;
  height: 320rpx;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 30rpx;
  background: #eee;
}
.circle-banner-img {
  width: 100%;
  height: 100%;
}.cat-block {
  margin-bottom: 28rpx;
}
.cat-head {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding-left: 4rpx;
}
.cat-bar {
  width: 8rpx;
  height: 32rpx;
  background: #111;
  border-radius: 4rpx;
  margin-right: 14rpx;
}
.cat-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111;
}
.cat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}
.cat-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 20rpx;
}
.cat-card-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  margin-right: 18rpx;
  background: #f5f5f5;
}
.cat-card-info {
  flex: 1;
  min-width: 0;
}
.cat-card-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #111;
  margin-bottom: 10rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cat-card-stat {
  display: block;
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@keyframes spin { to { transform: rotate(360deg); } }

@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
</style>
