<template>
  <view class="comments-page" :class="themeClass">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="search-bar">
        <input class="search-input" type="text" v-model="searchKeyword" placeholder="搜索评论内容" />
        <view class="search-action" @click="doSearch">搜索</view>
      </view>

      <view class="filter-bar">
        <scroll-view scroll-x class="filter-scroll">
          <view class="filter-items">
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'all' }"
              @click="setFilter('all')"
            >
              全部
            </view>
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'pending' }"
              @click="setFilter('pending')"
            >
              待审核({{ pendingCount }})
            </view>
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'active' }"
              @click="setFilter('active')"
            >
              已通过
            </view>
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'deleted' }"
              @click="setFilter('deleted')"
            >
              已删除
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="comment-list">
        <view class="comment-card" v-for="item in commentList" :key="item.id">
          <view class="cc-row">
            <view class="cc-left">
              <image class="cc-avatar" :src="item.avatar || '/static/logo.png'" mode="aspectFill" />
              <view class="cc-body">
                <view class="cc-header">
                  <text class="cc-author">{{ item.nickname || item.username || '未知用户' }}</text>
                  <view class="cc-status" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</view>
                </view>
                <view class="cc-text">{{ item.content }}</view>
                <view class="cc-meta">
                  <text>{{ formatTime(item.create_time) }}</text>
                  <text v-if="item.post_title" class="cc-post">{{ item.post_title }}</text>
                </view>
                <view class="cc-post-id">帖子ID: {{ item.post_id }}</view>
              </view>
            </view>
            <view class="cc-actions" @click.stop>
              <view v-if="item.status === 0" class="ca-btn green" @click="approveComment(item.id)">通过</view>
              <view v-if="item.status === 0" class="ca-btn orange" @click="rejectComment(item.id)">拒绝</view>
              <view v-if="item.status === 1" class="ca-btn red" @click="deleteComment(item.id)">删除</view>
            </view>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="commentList.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-message-square-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无评论</text>
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
import { request, bmsBaseUrl } from '../../common/request.js';
import { getScreenMetrics } from '../../common/screen.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      showSearch: false,
      searchKeyword: '',
      currentFilter: 'all',
      commentList: [],
      page: 1,
      hasMore: true,
      loading: false,
      pendingCount: 0,
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  onLoad(options) {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    
    if (options?.status === '2') {
      this.currentFilter = 'pending';
    }
    
    this.loadComments();
    this.loadPendingCount();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    setFilter(filter) {
      this.currentFilter = filter;
      this.commentList = [];
      this.page = 1;
      this.hasMore = true;
      this.loadComments();
    },
    doSearch() {
      this.commentList = [];
      this.page = 1;
      this.hasMore = true;
      this.loadComments();
    },
    getStatusClass(status) {
      switch (status) {
        case 1: return 'active';
        case 0: return 'pending';
        case -1: return 'deleted';
        default: return '';
      }
    },
    getStatusText(status) {
      switch (status) {
        case 1: return '已通过';
        case 0: return '待审核';
        case -1: return '已删除';
        default: return '未知';
      }
    },
    formatTime(timeStr) {
      if (!timeStr) return '';
      const date = new Date(timeStr.replace(/-/g, '/'));
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
          const minutes = Math.floor(diff / (1000 * 60));
          return minutes <= 0 ? '刚刚' : `${minutes}分钟前`;
        }
        return `${hours}小时前`;
      }
      if (days < 7) return `${days}天前`;
      return `${date.getMonth() + 1}/${date.getDate()}`;
    },
    async loadComments() {
      if (this.loading) return;
      this.loading = true;
      
      try {
        const params = {
          action: 'get_comments',
          page: this.page,
          status: this.getStatusValue(this.currentFilter)
        };
        if (this.searchKeyword) {
          params.search = this.searchKeyword;
        }

        const res = await request('comments.php', params, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data && res.data.list) {
          if (this.page === 1) {
            this.commentList = res.data.list;
          } else {
            this.commentList = [...this.commentList, ...res.data.list];
          }
          this.hasMore = res.data.list.length >= 10;

        }
      } catch (e) {
      }

      this.loading = false;
    },
    async loadPendingCount() {
      try {
        const res = await request('dashboard.php', { action: 'get_stats' }, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data && res.data.stats && res.data.stats.pending) {
          this.pendingCount = res.data.stats.pending.comments;
        }
      } catch (e) {
        // 获取待审核评论数量失败
      }
    },
    getStatusValue(filter) {
      switch (filter) {
        case 'all': return 'all';
        case 'pending': return 0;
        case 'active': return 1;
        case 'deleted': return -1;
        default: return 'all';
      }
    },
    loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page++;
      this.loadComments();
    },
    async approveComment(commentId) {
      this.showHud('loading', '审核中');
      try {
        const res = await request('comments.php', {
          action: 'update_comment_status',
          id: commentId,
          status: 1
        }, { baseURL: bmsBaseUrl });
        if (res.status === 'success') {
          uni.showToast({ title: '审核通过', icon: 'success' });
          this.commentList = this.commentList.filter(c => c.id !== commentId);
        } else {
          uni.showToast({ title: res?.msg || '审核失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '审核失败', icon: 'none' });
      }
      this.hud.show = false;
    },
    async rejectComment(commentId) {
      uni.showModal({
        title: '拒绝评论',
        content: '确定要拒绝此评论吗？拒绝后将被删除。',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '处理中');
            try {
              const result = await request('comments.php', {
                action: 'delete_comment',
                id: commentId
              }, { baseURL: bmsBaseUrl });
              if (result.status === 'success') {
                uni.showToast({ title: '已拒绝', icon: 'success' });
                this.commentList = this.commentList.filter(c => c.id !== commentId);
              } else {
                uni.showToast({ title: result?.msg || '操作失败', icon: 'none' });
              }
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' });
            }
            this.hud.show = false;
          }
        }
      });
    },
    async deleteComment(commentId) {
      uni.showModal({
        title: '删除评论',
        content: '确定要删除此评论吗？',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '删除中');
            try {
              const result = await request('comments.php', {
                action: 'delete_comment',
                id: commentId
              }, { baseURL: bmsBaseUrl });
              if (result.status === 'success') {
                uni.showToast({ title: '删除成功', icon: 'success' });
                this.commentList = this.commentList.filter(c => c.id !== commentId);
              } else {
                uni.showToast({ title: result?.msg || '删除失败', icon: 'none' });
              }
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' });
            }
            this.hud.show = false;
          }
        }
      });
    },
    showHud(type, text) {
      this.hud = { show: true, type: type || 'loading', text };
    }
  }
};
</script>

<style scoped>
.comments-page { min-height: 100vh; background: linear-gradient(180deg, #f5f7fa 0%, #e8ecf0 100%); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f5f7fa; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 搜索 */
.search-bar { display: flex; padding: 24rpx; gap: 16rpx; background: transparent; }
.search-input {
  flex: 1; height: 88rpx; background: var(--cr-surface); border-radius: 44rpx; padding: 0 32rpx; font-size: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06); border: 2rpx solid rgba(255,255,255,0.6);
}
.search-action {
  width: 130rpx; height: 88rpx; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 44rpx;
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 28rpx; font-weight: 600;
  box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.4);
}
.search-action:active { transform: scale(0.96); }

/* 筛选 */
.filter-bar { background: var(--cr-surface); padding: 20rpx 24rpx; margin-bottom: 20rpx; border-radius: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.filter-scroll { white-space: nowrap; }
.filter-items { display: inline-flex; gap: 20rpx; }
.filter-item {
  padding: 16rpx 32rpx; background: var(--cr-surface-alt); border-radius: 34rpx; font-size: 26rpx; color: var(--cr-text-muted);
  font-weight: 600; white-space: nowrap; transition: all 0.25s;
}
.filter-item:active { transform: scale(0.96); }
.filter-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2); color: #fff;
  box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.4);
}

/* 评论卡片 */
.comment-list { padding: 0 24rpx; }
.comment-card {
  background: var(--cr-surface); border-radius: 28rpx;
  margin-bottom: 20rpx; overflow: hidden;
  box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}
.comment-card:active { transform: scale(0.99); box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08); }
.cc-row { display: flex; align-items: center; padding: 24rpx; gap: 20rpx; }
.cc-left { flex: 1; display: flex; gap: 20rpx; min-width: 0; }
.cc-avatar {
  width: 96rpx; height: 96rpx; border-radius: 50%; flex-shrink: 0;
  border: 4rpx solid #f0edff; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
}
.cc-body { flex: 1; display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }
.cc-header { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.cc-author { font-size: 29rpx; font-weight: 600; color: var(--cr-text); }
.cc-status { padding: 6rpx 16rpx; border-radius: 12rpx; font-size: 21rpx; flex-shrink: 0; font-weight: 600; white-space: nowrap; }
.cc-status.active { background: linear-gradient(135deg, #eef9f0 0%, #d4edda 100%); color: #27ae60; }
.cc-status.pending { background: linear-gradient(135deg, #fef5e7 0%, #faebcc 100%); color: #e67e22; }
.cc-status.deleted { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }
.cc-text { font-size: 27rpx; color: #444; line-height: 1.6; word-break: break-all; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cc-meta { display: flex; flex-wrap: wrap; gap: 14rpx; font-size: 23rpx; color: var(--cr-text-muted); }
.cc-post { color: var(--cr-text-muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-post-id { font-size: 22rpx; color: var(--cr-text-muted); }

/* 操作按钮 - 右侧 */
.cc-actions { display: flex; flex-direction: column; gap: 12rpx; flex-shrink: 0; justify-content: center; align-items: center; }
.ca-btn {
  padding: 12rpx 28rpx; border-radius: 24rpx; font-size: 24rpx; text-align: center;
  white-space: nowrap; font-weight: 600; transition: all 0.15s; min-width: 80rpx;
}
.ca-btn:active { transform: scale(0.92); }
.ca-btn.green { background: linear-gradient(135deg, #eef9f0 0%, #d4edda 100%); color: #27ae60; }
.ca-btn.orange { background: linear-gradient(135deg, #fef5e7 0%, #faebcc 100%); color: #e67e22; }
.ca-btn.red { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }

.load-more { padding: 28rpx 24rpx; }
.load-btn {
  background: var(--cr-surface); padding: 26rpx; border-radius: 44rpx; text-align: center;
  font-size: 28rpx; color: var(--cr-text-muted); box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.load-btn:active { transform: scale(0.98); }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 28rpx; color: var(--cr-text-muted); margin-top: 20rpx; }
.footer-space { height: 60rpx; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(10rpx); }
.hud-toast { background: rgba(0,0,0,0.8); padding: 32rpx 56rpx; border-radius: 20rpx; color: #fff; font-size: 28rpx; display: flex; align-items: center; gap: 16rpx; }
.spinner { width: 36rpx; height: 36rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>