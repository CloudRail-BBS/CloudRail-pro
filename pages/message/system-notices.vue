<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <view class="back-btn"><view class="back-arrow"></view></view>
      </view>
      <text class="nav-title">系统通知</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view
      scroll-y
      class="body"
      :style="{ paddingTop: (statusBarHeight + 44) + 'px' }"
      @scrolltolower="loadMore"
    >
      <view v-if="loading && list.length === 0" class="empty-wrap">
        <view class="spinner"></view>
      </view>

      <view v-else-if="list.length === 0" class="empty-wrap">

        <text class="empty-text">暂无系统通知</text>
      </view>

      <view v-else class="list">
        <view
          v-for="item in list"
          :key="item.id"
          class="notice-card"
          @click="openNotice(item)"
        >
          <view class="notice-header">
            <view >
            </view>
            <view class="notice-meta">
              <text class="notice-title">{{ item.title || '系统通知' }}</text>
              <text class="notice-time">{{ formatTime(item.create_time) }}</text>
            </view>
          </view>
          <text v-if="item.content" class="notice-preview">{{ item.content }}</text>
        </view>
      </view>

      <view v-if="list.length > 0 && !hasMore" class="no-more"><text>已显示全部通知</text></view>
      <view v-if="loadingMore" class="loading-more"><view class="spinner-sm"></view></view>
      <view style="height:60rpx;"></view>
    </scroll-view>
    <view class="detail-mask" v-if="activeNotice" @touchmove.stop.prevent>
      <view class="detail-box">
        <view class="detail-header">
          <text class="detail-title">{{ activeNotice.title || '系统通知' }}</text>
          <text class="detail-time">{{ formatTime(activeNotice.create_time) }}</text>
        </view>
        <scroll-view scroll-y class="detail-scroll">
          <text class="detail-content" selectable>{{ activeNotice.content }}</text>
        </scroll-view>
        <view class="detail-footer">
          <view class="detail-close" @click="activeNotice = null">
            <text class="detail-close-text">关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 20,
      list: [],
      loading: false,
      loadingMore: false,
      page: 1,
      hasMore: true,
      activeNotice: null,
      deletingId: null,
    };
  },
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    const t = uni.getStorageSync('token');
    if (!t) { uni.reLaunch({ url: '/pages/login/login' }); return; }
    request('message.php', { action: 'markNoticeRead', type: 'system' }, 'POST').catch(() => {});
    this.loadList(true);
  },
  onShow() {
    // 仅同步本地已读状态，不触发拉取（避免循环刷新）
    uni.$emit('message_read_changed', { type: 'system', skipFetch: true });
  },
  onUnload() {
    // 页面销毁（返回）时通知消息页刷新，确保已读状态实时更新
    uni.$emit('message_read_changed', { type: 'system', skipFetch: false });
  },
  methods: {
    goBack() { uni.navigateBack(); },

    async loadList(reload = false) {
      if (reload) { this.page = 1; this.hasMore = true; this.list = []; }
      if (!this.hasMore) return;
      if (reload) this.loading = true;
      else this.loadingMore = true;
      try {
        const res = await request('message.php', { action: 'getSystemNotices', page: this.page });
        if (res.code === 0) {
          const items = res.data.list || [];
          this.list = reload ? items : [...this.list, ...items];
          this.hasMore = this.page < (res.data.pages || 1);
          if (this.hasMore) this.page++;
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' });
        }
      } catch {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },

    loadMore() {
      if (!this.loadingMore && this.hasMore) this.loadList(false);
    },

    openNotice(item) {
      this.activeNotice = item;
    },

    askDelete(item) {
      uni.showModal({
        title: '删除通知',
        content: '确认删除该条通知？',
        confirmColor: '#ff2442',
        success: (r) => {
          if (r.confirm) this.deleteNotice(item.id);
        }
      });
    },

    async deleteNotice(id) {
      this.deletingId = id;
      try {
        const res = await request('message.php', { action: 'deleteNotice', id });
        if (res.code === 0) {
          this.list = this.list.filter(x => x.id !== id);
          if (this.activeNotice && this.activeNotice.id === id) this.activeNotice = null;
        } else {
          uni.showToast({ title: res.msg || '删除失败', icon: 'none' });
        }
      } catch {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        this.deletingId = null;
      }
    },

    deleteActive() {
      if (!this.activeNotice) return;
      const item = this.activeNotice;
      uni.showModal({
        title: '删除通知',
        content: '确认删除该条通知？',
        confirmColor: '#ff2442',
        success: (r) => {
          if (r.confirm) this.deleteNotice(item.id);
        }
      });
    },

    askClearAll() {
      uni.showModal({
        title: '清空通知',
        content: '确认删除全部系统通知？',
        confirmColor: '#ff2442',
        success: async (r) => {
          if (!r.confirm) return;
          try {
            const res = await request('message.php', { action: 'deleteAllNotices' });
            if (res.code === 0) {
              this.list = [];
              this.activeNotice = null;
              this.hasMore = false;
            } else {
              uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
            }
          } catch {
            uni.showToast({ title: '网络错误', icon: 'none' });
          }
        }
      });
    },

    formatTime(t) {
      if (!t) return '';
      return String(t).replace('T', ' ').substring(0, 16);
    },
  },
};
</script>

<style scoped>
.page { min-height: 100vh; background: #f4f6f9; }
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 44px; background: #f4f6f9;
  display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx;
}
.nav-left { width: 80rpx; display: flex; align-items: center; }
.nav-right { width: 80rpx; display: flex; align-items: center; justify-content: flex-end; }
.nav-title { font-size: 34rpx; font-weight: 800; color: #111827; }
.back-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(17,24,39,0.06); display: flex; align-items: center; justify-content: center; }
.back-arrow { width: 18rpx; height: 18rpx; border-left: 4rpx solid #111827; border-bottom: 4rpx solid #111827; transform: rotate(45deg); margin-left: 6rpx; }
.clear-btn { font-size: 26rpx; color: #ff2442; font-weight: 600; }

.body { position: fixed; top: 0; left: 0; right: 0; bottom: 0; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; gap: 20rpx; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #9ca3af; }
.spinner { width: 60rpx; height: 60rpx; border-radius: 50%; border: 6rpx solid #e5e7eb; border-top-color: #111827; animation: spin 0.8s linear infinite; }

.list { padding: 20rpx 28rpx 0; display: flex; flex-direction: column; gap: 16rpx; }

.notice-card { background: #fff; border-radius: 20rpx; padding: 28rpx; }
.notice-header { display: flex; align-items: center; gap: 18rpx; margin-bottom: 14rpx; }
.notice-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: linear-gradient(135deg, #ff2442, #ef4444); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notice-icon { font-size: 34rpx; }
.notice-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.notice-title { font-size: 28rpx; font-weight: 800; color: #111827; }
.notice-time { font-size: 22rpx; color: #9ca3af; }
.notice-preview { font-size: 26rpx; color: #6b7280; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* 删除按钮 */
.notice-del-btn {
  width: 56rpx; height: 56rpx; flex-shrink: 0;
  border-radius: 50%; background: #f3f4f6;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.15s;
}
.notice-del-btn.deleting { opacity: 0.4; pointer-events: none; }
.del-icon-x {
  width: 24rpx; height: 24rpx; position: relative;
}
.del-icon-x::before,
.del-icon-x::after {
  content: '';
  position: absolute;
  left: 50%; top: 50%;
  width: 24rpx; height: 3rpx;
  background: #9ca3af;
  border-radius: 2rpx;
  transform-origin: center;
}
.del-icon-x::before { transform: translate(-50%, -50%) rotate(45deg); }
.del-icon-x::after  { transform: translate(-50%, -50%) rotate(-45deg); }

.no-more { text-align: center; padding: 24rpx; font-size: 22rpx; color: #9ca3af; }
.loading-more { display: flex; justify-content: center; padding: 20rpx; }
.spinner-sm { width: 40rpx; height: 40rpx; border-radius: 50%; border: 4rpx solid #e5e7eb; border-top-color: #6b7280; animation: spin 0.8s linear infinite; }

/* 详情弹窗 */
.detail-mask { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.detail-box { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 36rpx 36rpx 0; max-height: 70vh; display: flex; flex-direction: column; }
.detail-header { margin-bottom: 20rpx; }
.detail-title { font-size: 32rpx; font-weight: 900; color: #111827; display: block; margin-bottom: 8rpx; }
.detail-time { font-size: 22rpx; color: #9ca3af; }
.detail-scroll { flex: 1; max-height: 50vh; }
.detail-content { font-size: 28rpx; color: #374151; line-height: 1.9; white-space: pre-wrap; display: block; padding-bottom: 20rpx; }

.detail-footer {
  display: flex; align-items: center;
  border-top: 1rpx solid #f3f4f6; margin-top: 10rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
.detail-del-btn { flex: 1; padding: 28rpx 0; display: flex; align-items: center; justify-content: center; }
.detail-del-text { font-size: 28rpx; font-weight: 700; color: #ff2442; }
.detail-divider { width: 1rpx; height: 40rpx; background: #f3f4f6; }
.detail-close { flex: 1; padding: 28rpx 0; display: flex; align-items: center; justify-content: center; }
.detail-close-text { font-size: 28rpx; font-weight: 700; color: #6b7280; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
