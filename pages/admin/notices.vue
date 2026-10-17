<template>
  <view class="notices-page" :class="themeClass">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="search-bar">
        <input class="search-input" type="text" v-model="searchText" placeholder="搜索通知标题" @confirm="loadNotices" />
        <view class="search-action" @click="loadNotices">搜索</view>
        <view class="send-btn" @click="showSendModal = true">发送</view>
      </view>

      <view class="list">
        <view class="list-item" v-for="item in noticeList" :key="item.id">
          <view class="item-header">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-time">{{ formatTime(item.create_time) }}</text>
          </view>
          <view class="item-content">{{ item.content }}</view>
          <view class="item-actions">
            <view class="action-btn danger" @click="deleteNotice(item.id)">删除</view>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="noticeList.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-send-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无系统通知</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 发送通知弹窗 -->
    <view class="modal-mask" v-if="showSendModal" @click="closeSendModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">发送系统通知</text>
          <view class="modal-close" @click="closeSendModal">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">标题 *</text>
            <input class="form-input" type="text" v-model="formData.title" placeholder="请输入通知标题" />
          </view>
          <view class="form-item">
            <text class="form-label">内容 *</text>
            <textarea class="form-textarea" v-model="formData.content" placeholder="请输入通知内容" :maxlength="500"></textarea>
            <text class="form-tip">{{ formData.content.length }}/500</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeSendModal">取消</view>
          <view class="modal-btn confirm" @click="sendNotice">发送</view>
        </view>
      </view>
    </view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getScreenMetrics } from '../../common/screen.js';
import { request, bmsBaseUrl } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      noticeList: [],
      page: 1,
      hasMore: true,
      loading: false,
      searchText: '',
      showSendModal: false,
      formData: {
        title: '',
        content: ''
      },
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadNotices();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    showHud(type, text) {
      this.hud = { show: true, type: type || 'loading', text };
    },
    async loadNotices() {
      if (this.loading) return;
      this.loading = true;
      try {
        const res = await request('system_notices.php', {
          action: 'get_list',
          page: this.page
        }, { method: 'GET', baseURL: bmsBaseUrl });

        if (res.status === 'success') {
          const data = res.data;
          if (this.page === 1) {
            this.noticeList = data.list || [];
          } else {
            this.noticeList = [...this.noticeList, ...(data.list || [])];
          }
          this.hasMore = (data.list || []).length >= 20;
        }
      } catch (e) {
      }
      this.loading = false;
    },
    loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page++;
      this.loadNotices();
    },
    formatTime(timeStr) {
      if (!timeStr) return '';
      const date = new Date(timeStr);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    closeSendModal() {
      this.showSendModal = false;
      this.formData = { title: '', content: '' };
    },
    async sendNotice() {
      if (!this.formData.title.trim()) {
        uni.showToast({ title: '请输入标题', icon: 'none' });
        return;
      }
      if (!this.formData.content.trim()) {
        uni.showToast({ title: '请输入内容', icon: 'none' });
        return;
      }

      this.showHud('loading', '发送中...');
      try {
        const res = await request('system_notices.php', {
          action: 'send',
          title: this.formData.title.trim(),
          content: this.formData.content.trim()
        }, { method: 'POST', baseURL: bmsBaseUrl });

        this.hud.show = false;

        if (res.status === 'success') {
          uni.showToast({ title: '发送成功', icon: 'success' });
          this.closeSendModal();
          this.page = 1;
          this.hasMore = true;
          this.noticeList = [];
          this.loadNotices();
        } else {
          uni.showToast({ title: res.msg || '发送失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: '发送失败', icon: 'none' });
      }
    },
    deleteNotice(id) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条通知吗？',
        confirmColor: '#FF2442',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '删除中...');
            try {
              const r = await request('system_notices.php', {
                action: 'delete',
                id: id
              }, { method: 'POST', baseURL: bmsBaseUrl });

              this.hud.show = false;

              if (r.status === 'success') {
                uni.showToast({ title: '删除成功', icon: 'success' });
                this.noticeList = this.noticeList.filter(n => n.id != id);
              } else {
                uni.showToast({ title: r.msg || '删除失败', icon: 'none' });
              }
            } catch (e) {
              this.hud.show = false;
              uni.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.notices-page { min-height: 100vh; background: var(--cr-surface-alt); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: var(--cr-surface-alt); }

.main-scroll { height: 100vh; padding-top: 44px; }

.search-bar { display: flex; margin: 24rpx; gap: 16rpx; }
.search-input {
  flex: 1; height: 84rpx; background: var(--cr-surface); border-radius: 42rpx;
  padding: 0 32rpx; font-size: 28rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.08);
  border: 2rpx solid #f0f1f6; transition: all 0.3s ease;
}
.search-input:focus { border-color: #667eea; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.15); }
.search-action {
  width: 130rpx; height: 84rpx; background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border-radius: 42rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.3);
  transition: all 0.3s ease;
}
.search-action:active { transform: scale(0.96); }
.send-btn {
  width: 120rpx; height: 84rpx; background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff; border-radius: 42rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 700; box-shadow: 0 6rpx 24rpx rgba(39,174,96,0.3);
  transition: all 0.3s ease;
}
.send-btn:active { transform: scale(0.96); }

.list { margin: 0 24rpx; }
.list-item {
  background: var(--cr-surface); border-radius: 22rpx; padding: 28rpx;
  margin-bottom: 18rpx; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.06);
  border: 1rpx solid #f5f6fa; transition: all 0.3s ease;
}
.list-item:active { transform: scale(0.99); box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.08); }
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.item-title { font-size: 31rpx; font-weight: 700; color: #1a1a1a; }
.item-time { font-size: 24rpx; color: var(--cr-text-muted); padding: 6rpx 16rpx; background: var(--cr-surface-alt); border-radius: 14rpx; }
.item-content { font-size: 28rpx; color: var(--cr-text-muted); line-height: 1.7; margin-bottom: 18rpx; padding-bottom: 18rpx; border-bottom: 1rpx solid #f0f1f6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.item-actions { display: flex; justify-content: flex-end; }
.item-actions .action-btn { padding: 12rpx 30rpx; border-radius: 20rpx; font-size: 26rpx; font-weight: 600; background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }

.load-more { margin: 24rpx; text-align: center; }
.load-btn { padding: 24rpx; background: var(--cr-surface); border-radius: 20rpx; font-size: 28rpx; color: var(--cr-text-muted); box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); border: 1rpx solid #f0f1f6; transition: all 0.3s ease; }
.load-btn:active { transform: scale(0.98); }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: var(--cr-text-muted); }
.footer-space { height: 40rpx; }

/* 弹窗 - 美化 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(6rpx); }
.modal-content { width: 88%; max-width: 600rpx; background: var(--cr-surface); border-radius: 28rpx; overflow: hidden; box-shadow: 0 24rpx 80rpx rgba(102,126,234,0.2); }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 32rpx 32rpx 24rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.modal-title { font-size: 33rpx; font-weight: 700; color: #fff; letter-spacing: 1rpx; }
.modal-close {
  width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center;
  font-size: 38rpx; color: rgba(255,255,255,0.85); border-radius: 50%;
  background: rgba(255,255,255,0.15);
}
.modal-close:active { background: rgba(255,255,255,0.3); }
.modal-body { padding: 28rpx 32rpx; background: #fafbff; }
.form-item { margin-bottom: 24rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { display: block; font-size: 27rpx; color: #555; margin-bottom: 12rpx; font-weight: 600; }
.form-input {
  width: 100%; height: 84rpx; background: var(--cr-surface); border-radius: 16rpx;
  padding: 0 26rpx; font-size: 27rpx; border: 2rpx solid #e8ecf4;
  box-sizing: border-box; transition: all 0.2s;
}
.form-input:focus { border-color: #667eea; box-shadow: 0 0 0 4rpx rgba(102,126,234,0.08); }
.form-textarea {
  width: 100%; height: 200rpx; background: var(--cr-surface); border-radius: 16rpx;
  padding: 20rpx 26rpx; font-size: 27rpx; border: 2rpx solid #e8ecf4;
  box-sizing: border-box; transition: all 0.2s;
}
.form-textarea:focus { border-color: #667eea; box-shadow: 0 0 0 4rpx rgba(102,126,234,0.08); }
.form-tip { display: block; text-align: right; font-size: 23rpx; color: var(--cr-text-muted); margin-top: 8rpx; }
.modal-footer { display: flex; border-top: none; background: #f8f9fa; }
.modal-btn {
  flex: 1; height: 96rpx; display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: 600; transition: background 0.15s;
}
.modal-btn.cancel { color: var(--cr-text-muted); border-right: 1rpx solid #eee; }
.modal-btn.cancel:active { background: #eee; }
.modal-btn.confirm {
  color: #fff; background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 0;
}
.modal-btn.confirm:active { opacity: 0.9; }
</style>
