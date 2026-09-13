<template>
  <view class="circle-page">
    <view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-row">
        <view class="nav-tabs">
          <view class="nav-tab" :class="{ active: currentTab === 0 }" @click="switchTab(0)">
            <text>关注</text>
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
        <DynamicFeed ref="followFeed" v-if="currentTab === 0" feedType="follow" />
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
          <!-- 推荐圈子（未分类） -->
          <view class="discover-section" v-if="uncategorizedList.length > 0">
            <view class="discover-head">
              <text class="section-title">推荐圈子</text>
              <view class="sort-tabs">
                <view class="sort-tab" :class="{ active: sortType === 'hot' }" @click="changeSort('hot')">
                  <text>最热</text>
                </view>
                <view class="sort-tab" :class="{ active: sortType === 'new' }" @click="changeSort('new')">
                  <text>最新</text>
                </view>
              </view>
            </view>

            <view class="circle-grid">
              <view
                class="circle-card"
                v-for="item in uncategorizedList"
                :key="item.id"
                @click="goDetail(item)"
              >
                <view class="card-top-tag" v-if="item.is_top"><text>置顶</text></view>
                <view class="card-icon-wrap">
                  <image :src="item.image" class="card-icon" mode="aspectFill" lazy-load></image>
                </view>
                <view class="card-content">
                  <view class="card-name-row">
                    <text class="card-name">{{ item.name }}</text>
                    <view class="card-limit-tags" v-if="item.vip > 0">
                      <view class="limit-tag vip-tag" v-if="item.vip > 0">
                        <text>VIP</text>
                      </view>
                    </view>
                  </view>
                  <text class="card-desc">{{ item.description || '欢迎加入，一起交流分享' }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 各分类区块：标题即分类名，圈子按分类归集 -->
            <view class="discover-section cat-section" v-for="group in categoryGroups" :key="'cat-' + group.id">
              <view class="discover-head">
                <text class="section-title">{{ group.name }}</text>
              </view>
              <view class="circle-grid">
                <view
                  class="circle-card"
                  v-for="item in group.list"
                  :key="item.id"
                  @click="goDetail(item)"
                >
                  <view class="card-top-tag" v-if="item.is_top"><text>置顶</text></view>
                  <view class="card-icon-wrap">
                    <image :src="item.image" class="card-icon" mode="aspectFill" lazy-load></image>
                  </view>
                  <view class="card-content">
                    <view class="card-name-row">
                      <text class="card-name">{{ item.name }}</text>
                      <view class="card-limit-tags" v-if="item.vip > 0">
                        <view class="limit-tag vip-tag" v-if="item.vip > 0">
                          <text>VIP</text>
                        </view>
                      </view>
                    </view>
                    <text class="card-desc">{{ item.description || '欢迎加入，一起交流分享' }}</text>
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
import { request } from '../../common/request.js'
import DynamicFeed from '../../components/DynamicFeed.vue'
import PublishModal from '../../components/PublishModal.vue'
import CustomTabBar from '../../components/CustomTabBar.vue'
import { applyH5ViewportHeightVar, getScreenMetrics } from '../../common/screen.js'

export default {
  components: { DynamicFeed, PublishModal, CustomTabBar },
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
  },

  onUnload() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
  },

  methods: {
    switchTab(tab) {
      if (this.currentTab === tab) return
      this.currentTab = tab
      if (tab === 0 && this.$refs.followFeed) {
        this.$refs.followFeed.loadData(true)
      }
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
      if (this.currentTab === 0) {
        if (this.$refs.followFeed) this.$refs.followFeed.loadMore()
        return
      }
      if (this.currentTab === 1) {
        if (this.$refs.dynamicFeed) this.$refs.dynamicFeed.loadMore()
        return
      }
      if (this.loading || !this.hasMore || this.requestLock) return
      this.page += 1
      this.loadData()
    },

    async onRefresh() {
      if (this.currentTab === 0) {
        this.isRefreshing = true
        try {
          if (this.$refs.followFeed) await this.$refs.followFeed.onRefresh()
        } finally {
          this.isRefreshing = false
        }
        return
      }
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

@keyframes spin { to { transform: rotate(360deg); } }

@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
</style>
