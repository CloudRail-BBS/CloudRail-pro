<template>
  <view class="page" :class="themeClass">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <view class="back-btn"><view class="back-arrow"></view></view>
      </view>
      <text class="nav-title">提现记录</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view
      scroll-y
      class="body"
      :style="{ paddingTop: (statusBarHeight + 44) + 'px' }"
    >
      <view v-if="loading && list.length === 0" class="empty-wrap">
        <view class="spinner"></view>
      </view>

      <view v-else-if="list.length === 0" class="empty-wrap">
        <text class="empty-text">暂无提现记录</text>
      </view>

      <view v-else class="list">
        <view v-for="item in list" :key="item.id" class="record-card">
          <view class="card-top">
            <view class="channel-badge" :class="item.channel + '-badge'">
              <text class="badge-text">{{ channelLabel(item.channel) }}</text>
            </view>
            <text class="amount">¥{{ item.amount }}</text>
            <view class="status-tag" :class="'status-' + item.status">
              <text class="status-text">{{ item.status_text }}</text>
            </view>
          </view>
          <view class="card-mid">
            <text class="account-text">{{ item.account }}</text>
          </view>
          <view class="card-bot">
            <text class="time-text">{{ item.created_at }}</text>
            <text v-if="item.remark" class="remark-text">{{ item.remark }}</text>
            <view
              v-if="parseInt(item.status) === 0"
              class="cancel-btn"
              @click="cancelRequest(item)"
            >
              <text class="cancel-text">撤销</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="list.length > 0" class="no-more"><text>已显示全部记录</text></view>
      <view style="height:60rpx;"></view>
    </scroll-view>

    <XhsConfirm
      :visible="confirmVisible"
      title="撤销申请"
      message="确定撤销该提现申请？余额将解除冻结。"
      confirm-text="撤销"
      cancel-text="取消"
      @confirm="doCancel"
      @cancel="confirmVisible = false"
    />

    <view class="hud-wrap" v-if="hudVisible" @touchmove.stop.prevent>
      <view class="hud"><view class="hud-spinner"></view><text class="hud-text">{{ hudText }}</text></view>
    </view>
  </view>
</template>

<script>
import { baseUrl, request } from '../../common/request.js';
import XhsConfirm from '@/components/XhsConfirm.vue';

export default {
  components: { XhsConfirm },
  data() {
    return {
      statusBarHeight: 20,
      token: '',
      list: [],
      loading: false,
      hudVisible: false,
      hudText: '',
      confirmVisible: false,
      pendingCancelItem: null,
    };
  },
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    const t = uni.getStorageSync('token');
    if (!t) { uni.reLaunch({ url: '/pages/login/login' }); return; }
    this.token = t;
    this.loadList();
  },
  methods: {
    goBack() { uni.navigateBack(); },

    showHud(t) { this.hudText = t; this.hudVisible = true; },
    hideHud() { this.hudVisible = false; },

    channelLabel(ch) {
      return { alipay: '支付宝', wxpay: '微信', bank: '银行卡' }[ch] || ch;
    },

    async loadList() {
      if (this.loading) return;
      this.loading = true;
      try {
        const res = await request('withdraw.php', { action: 'get_my_requests' });
        if (res.code === 0) {
          this.list = Array.isArray(res.data) ? res.data : (res.data.list || []);
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' });
        }
      } catch {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    cancelRequest(item) {
      this.pendingCancelItem = item;
      this.confirmVisible = true;
    },

    async doCancel() {
      this.confirmVisible = false;
      const item = this.pendingCancelItem;
      if (!item) return;

      this.showHud('撤销中...');
      try {
        const res = await request('withdraw.php', { action: 'cancel', id: item.id });
        this.hideHud();
        if (res.code === 0) {
          uni.showToast({ title: '已撤销', icon: 'success' });
          this.loadList();
        } else {
          uni.showToast({ title: res.msg || '撤销失败', icon: 'none' });
        }
      } catch {
        this.hideHud();
        uni.showToast({ title: '网络错误', icon: 'none' });
      }
    },
  },
};
</script>

<style scoped>
.page { min-height: 100vh; background: var(--cr-surface); }
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 44px; background: var(--cr-surface); border-bottom: 1rpx solid #f5f5f5;
  display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx;
}
.nav-left, .nav-right { width: 80rpx; display: flex; align-items: center; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #111; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.back-arrow { width: 18rpx; height: 18rpx; border-left: 4rpx solid #111827; border-bottom: 4rpx solid #111827; transform: rotate(45deg); margin-left: 6rpx; }

.body { position: fixed; top: 0; left: 0; right: 0; bottom: 0; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; }
.empty-text { font-size: 28rpx; color: var(--cr-text-muted); }
.spinner { width: 60rpx; height: 60rpx; border-radius: 50%; border: 6rpx solid var(--cr-border); border-top-color: #111827; animation: spin 0.8s linear infinite; }

.list { padding: 20rpx 28rpx 0; display: flex; flex-direction: column; gap: 20rpx; }

.record-card { background: var(--cr-surface); border-radius: 20rpx; padding: 28rpx; }
.card-top { display: flex; align-items: center; gap: 14rpx; margin-bottom: 14rpx; }
.channel-badge { border-radius: 10rpx; padding: 6rpx 16rpx; }
.alipay-badge { background: #e8f4ff; }
.wxpay-badge { background: #e8f9ee; }
.bank-badge { background: #fef3c7; }
.badge-text { font-size: 22rpx; font-weight: 700; color: var(--cr-text); }
.amount { flex: 1; font-size: 36rpx; font-weight: 900; color: var(--cr-text); }
.status-tag { border-radius: 10rpx; padding: 6rpx 16rpx; }
.status-0 { background: #fef9c3; }
.status-1 { background: #dcfce7; }
.status-2 { background: #fee2e2; }
.status-text { font-size: 22rpx; font-weight: 700; }
.status-0 .status-text { color: #92400e; }
.status-1 .status-text { color: #166534; }
.status-2 .status-text { color: #991b1b; }

.card-mid { margin-bottom: 12rpx; }
.account-text { font-size: 26rpx; color: var(--cr-text-muted); }

.card-bot { display: flex; align-items: center; gap: 12rpx; }
.time-text { font-size: 22rpx; color: var(--cr-text-muted); flex: 1; }
.remark-text { font-size: 22rpx; color: var(--cr-text-muted); flex: 1; text-align: right; }
.cancel-btn { padding: 8rpx 24rpx; border-radius: 12rpx; border: 2rpx solid #ef4444; }
.cancel-text { font-size: 22rpx; font-weight: 700; color: #ef4444; }

.no-more { text-align: center; padding: 24rpx; font-size: 22rpx; color: var(--cr-text-muted); }

.hud-wrap { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; }
.hud { background: rgba(17,24,39,0.88); border-radius: 24rpx; padding: 36rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 18rpx; }
.hud-spinner { width: 56rpx; height: 56rpx; border-radius: 50%; border: 6rpx solid rgba(255,255,255,0.2); border-top-color: #fff; animation: spin 0.8s linear infinite; }
.hud-text { color: #fff; font-size: 26rpx; font-weight: 700; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
