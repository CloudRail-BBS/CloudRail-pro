<template>
  <view class="review-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <text class="back-arrow">返回</text>
      </view>
      <text class="nav-title">审核文章</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view
      class="page-scroll"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + 44) + 'px' }"
      @scrolltolower="loadList"
    >
      <view class="page-inner">
        <!-- 状态筛选: 全部 / 待审核 / 已通过 / 已删除 -->
        <view class="filter-tabs">
          <view
            v-for="tab in filterTabs"
            :key="tab.key"
            class="filter-tab"
            :class="{ active: currentFilter === tab.key }"
            @click="switchFilter(tab.key)"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>

        <view v-if="loading && page === 1" class="loading-box">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-else-if="list.length === 0" class="empty-box">
          <text class="empty-title">{{ emptyText }}</text>
          <text class="empty-desc">新的内容会显示在这里。</text>
        </view>

        <view v-else>
          <view v-for="item in list" :key="item.id" class="review-card">
            <view class="card-head">
              <view class="author-box">
                <image class="avatar" :src="item.avatar || '/static/logo.png'" mode="aspectFill"></image>
                <image v-if="item.current_frame_img" class="avatar-frame" :src="item.current_frame_img" mode="aspectFit"></image>
                <view class="author-meta">
                  <view class="name-row">
                    <text class="author-name">{{ item.name || item.username || '用户' }}</text>
                    <text v-if="item.user_title" class="author-title">{{ item.user_title }}</text>
                  </view>
                  <view class="sub-row">
                    <text v-if="item.display_number" class="sub-text">{{ (item.is_fancy == 1 ? '靓号 ' : '编号 ') + item.display_number }}</text>
                    <text class="sub-text">{{ formatTime(item.create_time) }}</text>
                  </view>
                </view>
              </view>
              <view class="status-badge" :class="statusClass(item.status)">
                <text>{{ statusText(item.status) }}</text>
              </view>
            </view>

            <view class="card-body" @click="goDetail(item)">
              <text class="post-title">{{ item.title || '未命名帖子' }}</text>
              <text v-if="item.content_preview || item.content_short" class="post-desc">{{ item.content_preview || item.content_short }}</text>

              <view v-if="item.cover_img" class="cover-wrap">
                <image class="cover-img" :src="item.cover_img" mode="aspectFill"></image>
              </view>

              <view class="meta-row">
                <text v-if="item.circle_name" class="meta-pill">{{ item.circle_name }}</text>
                <text class="meta-id">ID {{ item.id }}</text>
              </view>
            </view>

            <view class="action-row">
              <view class="action-btn ghost" @click="goDetail(item)">
                <text>查看详情</text>
              </view>
              <view class="action-btn ghost" @click="editPost(item)">
                <text>编辑文章</text>
              </view>
              <template v-if="isPending(item)">
                <view class="action-btn reject" @click="changeStatus(item, 0)">
                  <text>驳回</text>
                </view>
                <view class="action-btn approve" @click="changeStatus(item, 1)">
                  <text>通过</text>
                </view>
              </template>
            </view>
          </view>
        </view>

        <view v-if="loadingMore" class="loading-more">
          <text>加载更多中...</text>
        </view>
        <view v-else-if="!hasMore && list.length > 0" class="loading-more">
          <text>没有更多数据了</text>
        </view>
      </view>
      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      list: [],
      page: 1,
      limit: 10,
      hasMore: true,
      loading: false,
      loadingMore: false,
      actionLock: false,
      userInfo: null,
      /* 当前筛选标签: all全部 / pending待审核 / active已通过 / deleted已删除 */
      currentFilter: 'pending',
      reqSeq: 0,
      filterTabs: [
        { key: 'all', label: '全部' },
        { key: 'pending', label: '待审核' },
        { key: 'active', label: '已通过' },
        { key: 'deleted', label: '已删除' }
      ]
    }
  },

  computed: {
    /* 传给后端的 status 参数: all / 2待审核 / 1已通过 / 0已删除 */
    statusParam() {
      if (this.currentFilter === 'active') return '1'
      if (this.currentFilter === 'deleted') return '0'
      if (this.currentFilter === 'all') return 'all'
      return '2'
    },
    emptyText() {
      if (this.currentFilter === 'active') return '暂无已通过的帖子'
      if (this.currentFilter === 'deleted') return '暂无已删除的帖子'
      if (this.currentFilter === 'all') return '暂无帖子'
      return '暂无待审核帖子'
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
  },

  onShow() {
    this.refreshUserAndLoad()
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

    formatTime(val) {
      if (!val) return ''
      return String(val).slice(0, 16)
    },

    /* 切换标签: 清空列表并按新状态重新加载 */
    switchFilter(key) {
      if (this.currentFilter === key) return
      this.currentFilter = key
      this.list = []
      this.page = 1
      this.hasMore = true
      this.loadList(true)
    },

    async refreshUserAndLoad() {
      this.userInfo = uni.getStorageSync('userInfo') || null
      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      try {
        const res = await request('user.php', { action: 'getUserInfo' })
        if (res.code === 0 && res.data) {
          this.userInfo = res.data
          uni.setStorageSync('userInfo', res.data)
        }
      } catch (e) {}

      const canReview = Number(this.userInfo.is_admin || 0) === 1 || Number(this.userInfo.is_reviewer || 0) === 1
      if (!canReview) {
        uni.showToast({ title: '暂无权限', icon: 'none' })
        setTimeout(() => this.goBack(), 800)
        return
      }

      this.loadList(true)
    },

    async loadList(reset = false) {
      if (!reset && (!this.hasMore || this.loading || this.loadingMore)) return

      if (reset) {
        this.page = 1
        this.hasMore = true
        this.loading = true
      } else {
        this.loadingMore = true
      }

      const seq = ++this.reqSeq
      try {
        const res = await request('post.php', {
          action: 'list',
          status: this.statusParam,
          page: this.page,
          limit: this.limit
        }, 'GET')

        /* 已切换标签, 丢弃过期结果, 避免标签和内容对不上 */
        if (seq !== this.reqSeq) return

        if (res.code === 0) {
          const data = res.data || {}
          const raw = Array.isArray(data.list) ? data.list : []
          /* 按当前标签再过滤一次, 确保已通过的不会混进"待审核" */
          const rows = raw.filter(r => this.matchFilter(r))
          this.list = reset ? rows : this.list.concat(rows)
          this.hasMore = raw.length >= this.limit
          if (raw.length > 0) this.page += 1
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      } finally {
        if (seq === this.reqSeq) {
          this.loading = false
          this.loadingMore = false
        }
      }
    },

    /* 判断一条帖子是否属于当前标签 */
    matchFilter(row) {
      const approved = Number(row.is_approved === undefined || row.is_approved === null ? 0 : row.is_approved)
      const st = Number(row.status)
      if (this.currentFilter === 'pending') return approved === 0 && st !== 0
      if (this.currentFilter === 'active') return approved === 1 && st !== 0
      if (this.currentFilter === 'deleted') return st === 0
      return true
    },

    /* 只有待审核的帖子才显示"通过/驳回"按钮 */
    isPending(item) {
      const n = Number(item && item.status)
      return n !== 1 && n !== 0
    },

    /* 状态标签: 按真实审核状态显示(1已通过/2待审核/0已删除) */
    statusText(status) {
      const n = Number(status)
      if (n === 1) return '已通过'
      if (n === 0) return '已删除'
      return '待审核'
    },
    statusClass(status) {
      const n = Number(status)
      if (n === 1) return 'is-active'
      if (n === 0) return 'is-deleted'
      return 'is-pending'
    },

    goDetail(item) {
      if (!item || !item.id) return
      uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${item.id}` })
    },

    editPost(item) {
      if (!item || !item.id) return
      uni.setStorageSync('editPostData', { postId: item.id })
      uni.navigateTo({ url: '/pages/publish/publish' })
    },

    async changeStatus(item, status) {
      if (!item || !item.id || this.actionLock) return
      this.actionLock = true

      const actionText = status === 1 ? '审核通过' : '已驳回'
      try {
        /* 通过: post/update 置 is_approved=1; 驳回: 下架处理(进入"已删除") */
        const payload = status === 1
          ? { action: 'updatePost', id: item.id, status: 1 }
          : { action: 'deletePost', id: item.id }
        const res = await request('post.php', payload, 'POST')

        if (res.code === 0) {
          uni.showToast({ title: actionText, icon: 'none' })
          /* 重新拉取当前标签的数据, 保证标签和内容都是最新的 */
          this.loadList(true)
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      } finally {
        this.actionLock = false
      }
    }
  }
}
</script>

<style scoped>
.review-page { min-height: 100vh; background: #f6f7fb; }
.nav-bar { position: fixed; top: 0; left: 0; right: 0; height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; box-sizing: border-box; background: rgba(255,255,255,0.96); backdrop-filter: blur(18px); z-index: 20; border-bottom: 1rpx solid #eef0f4; }
.nav-left, .nav-right { width: 90rpx; display: flex; align-items: center; }
.back-arrow { font-size: 24rpx; color: #222; line-height: 1; }
.nav-title { font-size: 17px; font-weight: 600; color: #222; }
.page-scroll { height: 100vh; }
.page-inner { padding: 24rpx; }
.filter-tabs { display: flex; align-items: center; gap: 14rpx; margin-bottom: 24rpx; }
.filter-tab { padding: 14rpx 30rpx; border-radius: 999rpx; background: #fff; color: #5b616e; font-size: 24rpx; border: 1rpx solid #eceef3; }
.filter-tab.active { background: #FF2442; color: #fff; border-color: #FF2442; font-weight: 600; }
.loading-box, .empty-box { margin-top: 80rpx; padding: 80rpx 32rpx; text-align: center; color: #8b90a0; }
.empty-title { display: block; font-size: 30rpx; color: #2b2f3a; font-weight: 600; margin-bottom: 14rpx; }
.empty-desc, .loading-text { font-size: 24rpx; color: #8b90a0; }
.review-card { background: #fff; border-radius: 28rpx; padding: 26rpx; box-shadow: 0 10rpx 30rpx rgba(31, 41, 55, 0.05); margin-bottom: 24rpx; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.author-box { display: flex; align-items: center; min-width: 0; position: relative; }
.avatar { width: 78rpx; height: 78rpx; border-radius: 24rpx; background: #f2f3f7; }
.avatar-frame { position: absolute; left: -6rpx; top: -6rpx; width: 90rpx; height: 90rpx; pointer-events: none; }
.author-meta { margin-left: 18rpx; min-width: 0; }
.name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10rpx; }
.author-name { font-size: 28rpx; color: #222; font-weight: 600; max-width: 360rpx; }
.author-title { font-size: 22rpx; color: #ff5a6b; background: #fff1f3; padding: 4rpx 12rpx; border-radius: 999rpx; }
.sub-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12rpx; margin-top: 8rpx; }
.sub-text { font-size: 22rpx; color: #8b90a0; }
.status-badge { flex-shrink: 0; background: #fff6e8; color: #d97706; border-radius: 999rpx; padding: 10rpx 18rpx; font-size: 22rpx; font-weight: 600; }
.status-badge.is-pending { background: #fff6e8; color: #d97706; }
.status-badge.is-active { background: #e8f8ef; color: #0f9d58; }
.status-badge.is-deleted { background: #ffeef0; color: #e03131; }
.card-body { margin-top: 20rpx; }
.post-title { display: block; font-size: 30rpx; color: #1f2430; font-weight: 600; line-height: 1.45; }
.post-desc { display: block; margin-top: 12rpx; font-size: 25rpx; color: #616775; line-height: 1.65; }
.cover-wrap { margin-top: 18rpx; border-radius: 22rpx; overflow: hidden; background: #f4f6fb; }
.cover-img { width: 100%; height: 320rpx; display: block; }
.meta-row { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-top: 18rpx; }
.meta-pill { max-width: 420rpx; padding: 8rpx 16rpx; border-radius: 999rpx; background: #f1f3f7; color: #505665; font-size: 22rpx; }
.meta-id { font-size: 22rpx; color: #9aa0ae; }
.action-row { display: flex; align-items: center; gap: 14rpx; margin-top: 22rpx; }
.action-btn { flex: 1; min-width: 0; height: 74rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; }
.action-btn.ghost { background: #f5f7fb; color: #374151; }
.action-btn.reject { background: #fff1f2; color: #e11d48; }
.action-btn.approve { background: #ecfdf3; color: #059669; }
.loading-more { padding: 24rpx 0 8rpx; text-align: center; color: #97a0af; font-size: 22rpx; }
.safe-bottom { height: calc(24px + env(safe-area-inset-bottom)); }
</style>
