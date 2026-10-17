<template>
  <view class="posts-page" :class="themeClass">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-wrap">
          <image class="search-icon-img" src="/static/icon/admin-search-999.svg" mode="aspectFit" />
          <input class="search-input" type="text" v-model="searchKeyword" placeholder="搜索帖子标题或ID" @confirm="doSearch" />
        </view>
        <view class="search-action" @click="doSearch">搜索</view>
      </view>

      <!-- 筛选标签 -->
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-items">
          <view
            class="filter-item" :class="{ active: currentFilter === 'all' }" @click="setFilter('all')"
          >全部</view>
          <view
            class="filter-item" :class="{ active: currentFilter === 'pending' }" @click="setFilter('pending')"
          >待审核({{ pendingCount }})</view>
          <view
            class="filter-item" :class="{ active: currentFilter === 'active' }" @click="setFilter('active')"
          >已发布</view>
          <view
            class="filter-item" :class="{ active: currentFilter === 'deleted' }" @click="setFilter('deleted')"
          >已删除</view>
        </view>
      </scroll-view>

      <!-- 帖子列表 -->
      <view class="post-list">
        <view class="post-card" v-for="item in postList" :key="item.id" @click="viewDetail(item)">
          <!-- 作者行 -->
          <view class="pc-author-row">
            <view class="pc-avatar-wrap">
              <image class="pc-avatar" :src="item.avatar || '/static/logo.png'" mode="aspectFill" />
            </view>
            <view class="pc-author-info">
              <text class="pc-name">{{ item.username || '未知用户' }}</text>
              <text class="pc-time">{{ formatTime(item.create_time) }}</text>
            </view>
            <view class="pc-status" :class="getStatusClass(rawPostStatus(item))">{{ getStatusText(rawPostStatus(item)) }}</view>
          </view>

          <!-- 标题与摘要 -->
          <text class="pc-title">{{ item.title }}</text>
          <text class="pc-content" v-if="item.content_short">{{ item.content_short }}</text>

          <!-- 图片 -->
          <view class="pc-media" v-if="item.images_arr && item.images_arr.length > 0">
            <image
              v-for="(img, i) in item.images_arr.slice(0, 3)"
              :key="i"
              :src="img"
              class="pc-img"
              mode="aspectFill"
            />
          </view>

          <!-- 底部：统计 + 操作 -->
          <view class="pc-foot">
            <text class="pc-stat">{{ item.view_count || 0 }} 浏览 · {{ item.comment_count || 0 }} 评论</text>
            <view class="pc-actions" @click.stop>
              <view v-if="rawPostStatus(item) === 2" class="pa-btn approve" @click="approvePost(item.id)">通过</view>
              <view v-if="rawPostStatus(item) === 2" class="pa-btn reject" @click="rejectPost(item.id)">拒绝</view>
              <view v-if="rawPostStatus(item) === 1" :class="['pa-btn', item.zhiding ? 'untop' : 'top']" @click="toggleTop(item.id, item.zhiding)">{{ item.zhiding ? '取消置顶' : '置顶' }}</view>
              <view class="pa-btn edit" @click="editPost(item.id)">编辑</view>
              <view v-if="rawPostStatus(item) === 1" class="pa-btn del" @click="deletePost(item.id)">删除</view>
            </view>
          </view>
        </view>
      </view>
      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="postList.length === 0 && !loading">
        <view class="empty-emoji-img-wrap"><image class="empty-emoji-img" src="/static/icon/admin-inbox-ccc.svg" mode="aspectFit" /></view>
        <text class="empty-text">暂无帖子数据</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request, baseUrl } from '../../common/request.js';
import { getScreenMetrics } from '../../common/screen.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      searchKeyword: '',
      currentFilter: 'all',
      postList: [],
      page: 1,
      hasMore: true,
      loading: false,
      reqSeq: 0,
      pendingCount: 0,
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  onLoad(options) {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    if (options?.status === '2') this.currentFilter = 'pending';
    this.loadPosts();
    this.loadPendingCount();
  },
  methods: {
    goBack() { uni.navigateBack(); },
    setFilter(filter) {
      this.currentFilter = filter;
      this.loadPosts(true);
    },
    doSearch() {
      this.loadPosts(true);
    },
    /* 状态标签: 后端已合并为三态(1已发布/2待审核/0已删除);
       兼容未合并的情况, 用原始 status + is_approved 兜底判断 */
    rawPostStatus(item) {
      const st = Number(item && item.status);
      if (st === 0) return 0;
      if (st === 2) return 2;
      const ap = (item && item.is_approved !== undefined && item.is_approved !== null) ? Number(item.is_approved) : 1;
      return ap === 0 ? 2 : 1;
    },
    getStatusClass(status) {
      if (status === 1) return 'active'; if (status === 2) return 'pending'; if (status === 0) return 'deleted'; return '';
    },
    getStatusText(status) {
      if (status === 1) return '已发布'; if (status === 2) return '待审核'; if (status === 0) return '已删除'; return '未知';
    },
    formatTime(timeStr) {
      if (!timeStr) return '';
      const date = new Date(timeStr.replace(/-/g, '/'));
      const now = new Date(); const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) { const minutes = Math.floor(diff / (1000 * 60)); return minutes <= 0 ? '刚刚' : `${minutes}分钟前`; }
        return `${hours}小时前`;
      }
      if (days < 7) return `${days}天前`;
      return `${date.getMonth() + 1}/${date.getDate()}`;
    },
    async loadPosts(reset = false) {
      if (reset) { this.page = 1; this.postList = []; this.hasMore = true; }
      else if (this.loading || !this.hasMore) return;
      this.loading = true;
      const seq = ++this.reqSeq;
      try {
        /* 管理端帖子列表: 走 post/list, status 支持 all/1已发布/2待审核/0已删除 */
        const params = {
          action: 'list',
          page: this.page,
          status: this.getStatusValue(this.currentFilter)
        };
        if (this.searchKeyword) params.search = this.searchKeyword;
        const res = await request('post.php', params, { baseURL: baseUrl, method: 'GET' });
        if (seq !== this.reqSeq) return; /* 已有更新的请求: 丢弃过期响应 */
        if (res.code === 0 && res.data) {
          const rawList = Array.isArray(res.data) ? res.data : (res.data.list || []);
          if (this.page === 1) this.postList = rawList;
          else this.postList = [...this.postList, ...rawList];
          this.hasMore = rawList.length >= 10;
        } else {
          uni.showToast({ title: (res && res.msg) || '加载失败', icon: 'none' });
        }
      } catch (e) {} finally {
        if (seq === this.reqSeq) this.loading = false;
      }
    },
    async loadPendingCount() {
      try {
        const res = await request('post.php', { action: 'list', status: '2', page: 1, pageSize: 1 }, { baseURL: baseUrl, method: 'GET' });
        if (res.code === 0 && res.data) {
          this.pendingCount = parseInt(res.data.total || 0);
        }
      } catch (e) {}
    },
    getStatusValue(filter) {
      if (filter === 'all') return 'all'; if (filter === 'pending') return 2; if (filter === 'active') return 1; if (filter === 'deleted') return 0; return 'all';
    },
    loadMore() { if (!this.hasMore || this.loading) return; this.page++; this.loadPosts(); },
    viewDetail(item) { uni.showToast({ title: `帖子ID: ${item.id}`, icon: 'none' }); },
    editPost(postId) { uni.setStorageSync('editPostData', { postId }); uni.navigateTo({ url: '/pages/publish/publish' }); },

    async approvePost(postId) {
      this.showHud('loading', '审核中');
      try {
        const res = await request('post.php', { action: 'updatePost', id: postId, status: 1 }, { baseURL: baseUrl });
        if (res.code === 0 || res.status === 'success') { uni.showToast({ title: '审核通过', icon: 'success' }); this.loadPosts(true); this.loadPendingCount(); }
        else uni.showToast({ title: res?.msg || '审核失败', icon: 'none' });
      } catch (e) { uni.showToast({ title: '审核失败', icon: 'none' }); }
      this.hud.show = false;
    },
    async toggleTop(postId, currentTop) {
      this.showHud('loading', '处理中');
      try {
        const result = await request('post.php', { action: 'updatePost', id: postId, is_pinned: currentTop ? 0 : 1 }, { baseURL: baseUrl });
        if (result.code === 0 || result.status === 'success') { uni.showToast({ title: currentTop ? '已取消置顶' : '置顶成功', icon: 'success' }); const post = this.postList.find(p => p.id === postId); if (post) post.zhiding = currentTop ? 0 : 1; }
        else uni.showToast({ title: result?.msg || '操作失败', icon: 'none' });
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
      this.hud.show = false;
    },
    async rejectPost(postId) {
      uni.showModal({ title: '拒绝帖子', content: '确定要拒绝此帖子吗？', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '处理中');
          try {
            /* 拒绝 = 下架处理(进入"已删除"), 避免帖子重新回到"待审核"反复出现 */
            const result = await request('post.php', { action: 'deletePost', id: postId }, { baseURL: baseUrl });
            if (result.code === 0 || result.status === 'success') { uni.showToast({ title: '已拒绝', icon: 'success' }); this.loadPosts(true); this.loadPendingCount(); }
            else uni.showToast({ title: result?.msg || '操作失败', icon: 'none' });
          } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
          this.hud.show = false;
        }
      }});
    },
    async deletePost(postId) {
      uni.showModal({ title: '删除帖子', content: '确定要删除此帖子吗？', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中');
          try {
            const result = await request('post.php', { action: 'deletePost', id: postId }, { baseURL: baseUrl });
            if (result.code === 0 || result.status === 'success') { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadPosts(true); this.loadPendingCount(); }
            else uni.showToast({ title: result?.msg || '删除失败', icon: 'none' });
          } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
          this.hud.show = false;
        }
      }});
    },
    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text }; }
  }
};
</script>

<style scoped>
.posts-page { min-height: 100vh; background: var(--cr-surface-alt); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: var(--cr-surface-alt); }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 搜索 */
.search-bar { display: flex; padding: 24rpx; gap: 16rpx; background: transparent; }
.search-wrap {
  flex: 1; height: 88rpx; background: var(--cr-surface);
  border-radius: 44rpx; display: flex; align-items: center; padding: 0 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  border: 2rpx solid rgba(255,255,255,0.6);
}
.search-icon-img { width: 32rpx; height: 32rpx; display: block; margin-right: 16rpx; opacity: 0.6; }
.search-input { flex: 1; font-size: 28rpx; color: var(--cr-text); }
.search-input::placeholder { color: var(--cr-text-muted); }
.search-action {
  width: 130rpx; height: 88rpx; background: linear-gradient(135deg, #ff2442, #ff4d6d);
  border-radius: 44rpx; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 28rpx; font-weight: 600;
  box-shadow: 0 6rpx 24rpx rgba(255,36,66,0.35);
}
.search-action:active { transform: scale(0.96); box-shadow: 0 4rpx 16rpx rgba(255,36,66,0.25); }

/* 筛选 */
.filter-scroll { white-space: nowrap; background: transparent; }
.filter-items { display: inline-flex; padding: 12rpx 28rpx 24rpx; gap: 20rpx; }
.filter-item {
  padding: 16rpx 36rpx; border-radius: 34rpx; font-size: 26rpx; color: var(--cr-text-muted);
  background: var(--cr-surface); transition: all 0.25s ease; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.filter-item:active { transform: scale(0.96); }
.filter-item.active {
  background: linear-gradient(135deg, #ff2442, #ff4d6d);
  color: #fff; box-shadow: 0 6rpx 24rpx rgba(255,36,66,0.35);
}

/* 帖子卡片 - 信息流风格 */
.post-list { padding: 0 24rpx 24rpx; }
.post-card {
  background: var(--cr-surface); border-radius: 28rpx; margin-bottom: 24rpx;
  padding: 28rpx; box-shadow: 0 6rpx 28rpx rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}
.post-card:active { transform: scale(0.99); box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08); }

/* 作者行 */
.pc-author-row { display: flex; align-items: center; gap: 20rpx; }
.pc-avatar-wrap { position: relative; flex-shrink: 0; }
.pc-avatar {
  width: 76rpx; height: 76rpx; border-radius: 50%; display: block;
  border: 3rpx solid #fdeaea; box-shadow: 0 4rpx 12rpx rgba(255,36,66,0.12);
}
.pc-author-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.pc-name { font-size: 28rpx; font-weight: 600; color: #1a1a1a; }
.pc-time { font-size: 22rpx; color: var(--cr-text-muted); }
.pc-status {
  padding: 6rpx 20rpx; border-radius: 999rpx; font-size: 21rpx; flex-shrink: 0; font-weight: 700; letter-spacing: 1rpx;
}
.pc-status.active { background: linear-gradient(135deg, #e6f9ef 0%, #c9f0dc 100%); color: #0ca678; }
.pc-status.pending { background: linear-gradient(135deg, #fff4e5 0%, #ffe3c4 100%); color: #f76707; }
.pc-status.deleted { background: linear-gradient(135deg, #ffecee 0%, #ffd5da 100%); color: #e03131; }

/* 标题与摘要 */
.pc-title {
  display: block; margin-top: 20rpx; font-size: 31rpx; font-weight: 700; color: #111;
  line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.pc-content {
  display: block; margin-top: 10rpx; font-size: 26rpx; color: var(--cr-text-muted); line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}

/* 图片 */
.pc-media { display: flex; gap: 12rpx; margin-top: 20rpx; flex-wrap: wrap; }
.pc-img {
  width: 200rpx; height: 200rpx; border-radius: 18rpx; flex-shrink: 0;
  background: var(--cr-surface-alt); box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}
.pc-media .pc-img:only-child { width: 320rpx; height: 320rpx; }

/* 底部：统计 + 操作 */
.pc-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16rpx; margin-top: 24rpx; padding-top: 22rpx; border-top: 1rpx solid #f3f3f5;
}
.pc-stat { font-size: 23rpx; color: var(--cr-text-muted); }
.pc-actions { display: flex; gap: 14rpx; flex-shrink: 0; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.pa-btn {
  padding: 12rpx 26rpx; border-radius: 999rpx; font-size: 24rpx; text-align: center; font-weight: 700;
  transition: all 0.15s; white-space: nowrap;
}
.pa-btn:active { transform: scale(0.94); }
.pa-btn.approve { background: linear-gradient(135deg, #ff2442, #ff4d6d); color: #fff; box-shadow: 0 6rpx 18rpx rgba(255,36,66,0.35); }
.pa-btn.reject { background: linear-gradient(135deg, #fff1f2 0%, #ffd9dd 100%); color: #e03131; border: 2rpx solid #ffb3bb; }
.pa-btn.top { background: linear-gradient(135deg, #ffd86f, #f6b93b); color: #6b4e0a; box-shadow: 0 6rpx 16rpx rgba(246,185,59,0.35); }
.pa-btn.untop { background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%); color: #557feb; }
.pa-btn.edit { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #666; }
.pa-btn.del { background: linear-gradient(135deg, #ffecee 0%, #ffd5da 100%); color: #e03131; }
/* 加载/空状态 */
.load-more { padding: 24rpx; }
.load-btn {
  background: var(--cr-surface); padding: 26rpx; border-radius: 44rpx; text-align: center;
  font-size: 28rpx; color: var(--cr-text-muted); box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.load-btn:active { transform: scale(0.98); }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-emoji-img-wrap { display: flex; align-items: center; justify-content: center; opacity: 0.6; }
.empty-emoji-img { width: 100rpx; height: 100rpx; display: block; }
.empty-text { font-size: 28rpx; color: var(--cr-text-muted); margin-top: 20rpx; }
.footer-space { height: 60rpx; }

/* HUD */
.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.hud-toast { background: rgba(0,0,0,0.8); color: #fff; font-size: 28rpx; padding: 32rpx 56rpx; border-radius: 20rpx; display: flex; align-items: center; gap: 16rpx; backdrop-filter: blur(10px); }
.spinner { width: 36rpx; height: 36rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner.white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
