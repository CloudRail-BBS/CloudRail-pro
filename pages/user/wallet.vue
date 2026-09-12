<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <view class="nav-back-btn">
          <view class="back-arrow"></view>
        </view>
      </view>
      <text class="nav-title">我的资产</text>
      <view class="nav-right">
        <view class="refresh-btn" @click="getWalletData">
          <view class="refresh-icon" :class="{ spinning: refreshing }">
            <view class="refresh-circle"></view>
            <view class="refresh-arrow"></view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <view class="balance-card">
        <view class="card-inner">
          <view class="card-header">
            <view class="card-label-wrap">
              <view class="card-dot"></view>
              <text class="card-label">{{ currencyName }}余额</text>
            </view>
            <text class="card-uid">UID {{ userInfo.id || '---' }}</text>
          </view>

          <view class="balance-area">
            <text class="balance-symbol">¥</text>
            <text class="balance-num">{{ userInfo.balance || '0.00' }}</text>
          </view>

          <view class="card-actions">
            <view class="card-action-btn outline" @click="goWithdraw">
              <text class="card-action-text">提现</text>
            </view>
            <view>
             
            </view>
          </view>
          <view class="deco-circle deco-1"></view>
          <view class="deco-circle deco-2"></view>
        </view>
      </view>
      <view class="section">
        <view class="section-header">
          <text class="section-title">卡密兑换</text>
          <text class="section-sub">输入卡密兑换余额</text>
        </view>
        <view class="redeem-wrap">
          <input
            type="text"
            v-model="cardCode"
            placeholder="请输入卡密 ABCD-EFGH-IJKL-MNOP"
            placeholder-class="redeem-ph"
            class="redeem-input"
            maxlength="19"
            @input="onCardCodeInput"
          />
          <view class="redeem-btn" :class="{ disabled: submitting }" @click="redeemCard">
            <text class="redeem-btn-text">{{ submitting ? '兑换中...' : '兑换' }}</text>
          </view>
        </view>
        <view v-if="buyCardUrl" class="buy-card-wrap" @click="goBuyCard">
          <view class="buy-card-bg-deco1"></view>
          <view class="buy-card-bg-deco2"></view>
          <view class="buy-card-left">
            <view class="buy-card-icon-box">
              <image class="buy-card-icon" src="/static/icon/buy-card.svg" mode="aspectFit"></image>
            </view>
          </view>
          <view class="buy-card-middle">
            <text class="buy-card-title">购买卡密</text>
            <text class="buy-card-desc">在线购买充值卡密，即时到账</text>
          </view>
          <view class="buy-card-right">
            <text class="buy-card-go">去购买</text>
            <text class="buy-card-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 账单明细 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">账单明细</text>
          <view class="clear-btn" :class="{ disabled: !logs.length }" @click="openPasswordModal">
            <text class="clear-text">清空记录</text>
          </view>
        </view>

        <view v-if="logs.length" class="log-list">
          <view class="log-item" v-for="(log, idx) in logs" :key="idx">
            <view class="log-icon-wrap" :class="log.type == 1 ? 'income-bg' : 'expense-bg'">
              <text class="log-icon-text">{{ log.type == 1 ? '+' : '-' }}</text>
            </view>
            <view class="log-content">
              <text class="log-memo">{{ log.memo || (log.type == 1 ? '充值' : '消费') }}</text>
              <text class="log-time">{{ log.create_time }}</text>
            </view>
            <text class="log-amount" :class="log.type == 1 ? 'income-color' : 'expense-color'">
              {{ log.type == 1 ? '+' : '-' }}{{ log.amount }}{{ getLogUnit(log) }}
            </text>
          </view>
        </view>

        <view v-else class="empty-state">
          <view class="empty-icon-wrap">
            <view class="empty-icon"></view>
          </view>
          <text class="empty-text">暂无交易记录</text>
        </view>
      </view>

      <view style="height: 160rpx;"></view>
    </scroll-view>

    <view class="sheet-mask" v-if="showPwdModal" @touchmove.stop.prevent @click.self="showPwdModal=false">
      <view class="bottom-sheet small-sheet">
        <view class="sheet-handle"></view>
        <view class="sheet-head">
          <text class="sheet-title">安全验证</text>
          <view class="sheet-close" @click="showPwdModal=false">
            <text class="sheet-close-icon">×</text>
          </view>
        </view>
        <view class="sheet-body">
          <text class="sheet-sub">输入支付密码以清空全部账单记录</text>
          <view v-if="pwdError" class="inline-err">{{ pwdError }}</view>
          <input
            type="number"
            v-model="inputPassword"
            class="pwd-input"
            placeholder="请输入6位支付密码"
            placeholder-class="input-ph"
            maxlength="6"
            :focus="showPwdModal"
            @input="pwdError=''"
          />
          <view class="sheet-btns" style="margin-top:32rpx;">
            <view class="sheet-btn secondary" @click="showPwdModal=false">
              <text class="sheet-btn-text">取消</text>
            </view>
            <view class="sheet-btn danger" @click="confirmClearLogs">
              <text class="sheet-btn-text white">确认清空</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="alert-mask" v-if="alertVisible" @touchmove.stop.prevent>
      <view class="alert-box">
        <text class="alert-title">提示</text>
        <text class="alert-text">{{ alertText }}</text>
        <view class="alert-btn" @click="alertVisible=false">
          <text class="alert-btn-text">知道了</text>
        </view>
      </view>
    </view>
    <view class="hud-wrap" v-if="hud.visible" @touchmove.stop.prevent>
      <view class="hud">
        <view class="hud-spinner"></view>
        <text class="hud-text">{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { baseUrl, request, getCurrencyName, refreshAppConfig, getBuyCardUrl } from '../../common/request.js';

export default {
  data() {
    return {
      // 货币名称（从后端动态获取，启动时填充）
      currencyName: '星域豆',
      statusBarHeight: 20,
      token: '',
      isLogin: false,
      userInfo: {},

      cardCode: '',
      buyCardUrl: '',
      logs: [],
      refreshing: false,
      submitting: false,

      showPwdModal: false,
      inputPassword: '',
      pwdError: '',

      hud: { visible: false, type: 'loading', text: '' },
      alertVisible: false,
      alertText: ''
    };
  },
  async onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    // 异步获取货币名称和购买卡密链接，不阻塞主流程
    this.currencyName = await getCurrencyName()
    this.buyCardUrl = await getBuyCardUrl()
    this.checkLoginState();
  },
  async onShow() {
    // 每次显示页面时刷新货币名称（后台改配置后立即生效）
    refreshAppConfig()
    this.currencyName = await getCurrencyName()
    this.buyCardUrl = await getBuyCardUrl()
    this.checkLoginState();
    if (!this.isLogin) { this.requireLogin(); return; }
    this.getWalletData();
  },
  onUnload() {
  },
  methods: {
    goBack() { uni.navigateBack(); },

    getLogUnit(log) {
      const memo = log.memo || '';
      // 卡密兑换是余额收入，显示"元"
      if (memo.includes('卡密兑换')) {
        return ' 元';
      }
      // 包含积分相关关键词的记录显示"积分"单位，否则默认"元"
      if (memo.includes('打赏') || memo.includes('猜拳') || memo.includes('下注') || memo.includes('中奖') || memo.includes('兑换')) {
        return ' 积分';
      }
      return ' 元';
    },

    goWithdraw() {
      if (!this.isLogin) return this.requireLogin();
      uni.navigateTo({ url: '/pages/user/withdraw' });
    },

    showAlert(text) {
      this.alertText = String(text || '操作失败');
      this.alertVisible = true;
    },

    checkLoginState() {
      const u = uni.getStorageSync('userInfo');
      const t = uni.getStorageSync('token');
      if (u && t && u.id) {
        this.isLogin = true; this.token = t; this.userInfo = u;
      } else {
        this.isLogin = false; this.token = ''; this.userInfo = {};
      }
    },

    requireLogin() {
      this.showAlert('请先登录');
      setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 700);
    },

    showLoading(text = '加载中') { this.hud = { visible: true, type: 'loading', text }; },
    hideHud() { this.hud.visible = false; },

    getRequestHeader() {
      return {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Bearer ' + this.token,
        'token': this.token
      };
    },

    async getWalletData() {
      if (!this.isLogin || this.refreshing) return;
      this.refreshing = true;
      try {
        const res = await request('wallet.php', { action: 'get_wallet' });
        if (res.code === 0) {
          const bal = res.data.balance !== undefined ? res.data.balance : res.data.coin;
          this.userInfo.balance = bal;
          this.logs = res.data.logs || res.data.list || [];
          let localU = uni.getStorageSync('userInfo') || {};
          localU.balance = bal;
          uni.setStorageSync('userInfo', localU);
        } else if (res.code === -2) {
          this.isLogin = false; this.requireLogin();
        }
      } catch (e) {} finally {
        setTimeout(() => { this.refreshing = false; }, 300);
      }
    },

    openPasswordModal() {
      if (!this.isLogin) return this.requireLogin();
      if (!this.logs.length) return;
      this.inputPassword = ''; this.pwdError = '';
      this.showPwdModal = true;
    },

    async confirmClearLogs() {
      if (!this.inputPassword) { this.pwdError = '请输入支付密码'; return; }
      if (this.inputPassword.length < 6) { this.pwdError = '支付密码为6位数字'; return; }
      this.showLoading('验证中...');
      try {
        const res = await request('wallet.php', { action: 'clean_logs', pay_password: this.inputPassword });
        this.hideHud();
        if (res.code === 0) { this.logs = []; this.showPwdModal = false; }
        else if (res.code === -2) { this.showPwdModal = false; this.isLogin = false; this.requireLogin(); }
        else if (res.code === -4) {
          this.showPwdModal = false;
          uni.showModal({
            title: '未设置支付密码',
            content: res.msg || '请先前往账户安全设置支付密码',
            confirmText: '去设置',
            cancelText: '取消',
            success: (r) => { if(r.confirm) uni.navigateTo({ url: '/pages/user/pay-password' }); }
          });
        }
        else { this.pwdError = res.msg || '支付密码错误'; }
      } catch (e) {
        this.hideHud(); this.pwdError = '网络错误';
      }
    },

    async redeemCard() {
      if (!this.isLogin) return this.requireLogin();
      if (!this.cardCode || !this.cardCode.trim()) {
        this.showAlert('请输入卡密');
        return;
      }
      if (this.submitting) return;
      this.submitting = true;
      try {
        const res = await request('wallet.php', { action: 'redeem_card', card_code: this.cardCode.trim() });
        if (res.code === 0) {
          this.cardCode = '';
          this.getWalletData();
          this.showAlert('兑换成功，已到账 ' + res.data.amount + ' 积分');
        } else {
          if (res.code === -2) { this.isLogin = false; this.requireLogin(); return; }
          this.showAlert(res.msg || '兑换失败');
        }
      } catch (e) {
        this.showAlert('网络请求失败');
      } finally {
        this.submitting = false;
      }
    },

    onCardCodeInput(e) {
      let val = (e.detail.value || '').toUpperCase();
      val = val.replace(/[^A-Z0-9-]/g, '');
      this.cardCode = val;
    },

    goBuyCard() {
      if (!this.buyCardUrl) return;
      // #ifdef H5
      window.open(this.buyCardUrl, '_blank');
      // #endif
      // #ifdef APP-PLUS
      plus.runtime.openURL(this.buyCardUrl);
      // #endif
      // #ifndef H5 || APP-PLUS
      uni.navigateTo({
        url: '/pages/webview/webview?url=' + encodeURIComponent(this.buyCardUrl)
      });
      // #endif
    }
  }
};
</script>

<style scoped>

.page { min-height: 100vh; background: #fff; }

.scroll-body { position: fixed; top: 0; left: 0; right: 0; bottom: 0; }

.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 44px;
  background: #fff;
  border-bottom: 1rpx solid #f5f5f5;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20rpx;
}
.nav-left, .nav-right { width: 80rpx; display: flex; align-items: center; }
.nav-right { justify-content: flex-end; }
.nav-title { font-size: 34rpx; font-weight: 800; color: #111827; }

.nav-back-btn {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
}
.back-arrow {
  width: 18rpx; height: 18rpx;
  border-left: 4rpx solid #111827;
  border-bottom: 4rpx solid #111827;
  transform: rotate(45deg);
  margin-left: 6rpx;
}

.refresh-btn {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
}
.refresh-icon { width: 32rpx; height: 32rpx; position: relative; }
.refresh-circle {
  width: 26rpx; height: 26rpx; border-radius: 50%;
  border: 4rpx solid #111827; border-top-color: transparent;
}
.spinning .refresh-circle { animation: spin 0.8s linear infinite; }

/* ===== 余额卡片 ===== */
.balance-card {
  margin: 24rpx 28rpx 0;
  border-radius: 28rpx;
  overflow: hidden;
}
.card-inner {
  background: #111827;
  padding: 40rpx 36rpx 36rpx;
  position: relative;
  overflow: hidden;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 28rpx;
}
.card-label-wrap { display: flex; align-items: center; gap: 12rpx; }
.card-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #ef4444; }
.card-label { font-size: 24rpx; color: rgba(255,255,255,0.6); font-weight: 500; }
.card-uid { font-size: 22rpx; color: rgba(255,255,255,0.35); font-family: monospace; }

.balance-area { display: flex; align-items: baseline; gap: 8rpx; margin-bottom: 40rpx; }
.balance-symbol { font-size: 36rpx; color: rgba(255,255,255,0.7); font-weight: 700; }
.balance-num { font-size: 88rpx; color: #ffffff; font-weight: 900; letter-spacing: -2rpx; line-height: 1; }

.card-actions { display: flex; gap: 16rpx; }
.card-action-btn {
  height: 68rpx; padding: 0 36rpx; border-radius: 34rpx;
  display: flex; align-items: center; justify-content: center;
}
.card-action-btn.outline { border: 2rpx solid rgba(255,255,255,0.3); }
.card-action-btn.solid { background: #ef4444; }
.card-action-text { font-size: 26rpx; font-weight: 700; color: rgba(255,255,255,0.8); }
.card-action-text.white { color: #fff; }

.deco-circle {
  position: absolute; border-radius: 50%;
  background: rgba(255,255,255,0.03);
}
.deco-1 { width: 300rpx; height: 300rpx; right: -80rpx; top: -80rpx; }
.deco-2 { width: 200rpx; height: 200rpx; right: 60rpx; bottom: -60rpx; background: rgba(239,68,68,0.08); }


.section {
  margin: 24rpx 28rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);
}
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24rpx;
}
.section-title { font-size: 30rpx; font-weight: 800; color: #111827; }
.section-sub { font-size: 22rpx; color: #9ca3af; }

.redeem-wrap { display: flex; gap: 16rpx; align-items: center; }
.redeem-input { flex: 1; height: 88rpx; background: #f5f5f5; border-radius: 16rpx; padding: 0 24rpx; font-size: 32rpx; font-weight: 600; letter-spacing: 2rpx; color: #333; font-family: monospace; }
.redeem-ph { color: #bbb; font-weight: 400; letter-spacing: 0; font-family: -apple-system, sans-serif; }
.redeem-btn { width: 160rpx; height: 88rpx; background: linear-gradient(135deg, #ff6b6b, #ee5a24); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.redeem-btn.disabled { opacity: 0.6; }
.redeem-btn-text { color: #fff; font-size: 30rpx; font-weight: 600; }
.buy-card-wrap {
  margin-top: 24rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  border-radius: 24rpx;
  display: flex; align-items: center;
  padding: 0 32rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(99, 102, 241, 0.28);
  transition: all 0.2s ease;
}
.buy-card-wrap:active {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 16rpx rgba(99, 102, 241, 0.24);
}
.buy-card-bg-deco1 {
  position: absolute;
  width: 240rpx; height: 240rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  right: -80rpx; top: -100rpx;
}
.buy-card-bg-deco2 {
  position: absolute;
  width: 160rpx; height: 160rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  right: 80rpx; bottom: -80rpx;
}
.buy-card-left { flex-shrink: 0; margin-right: 24rpx; position: relative; z-index: 1; }
.buy-card-icon-box {
  width: 88rpx; height: 88rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.22);
  border: 2rpx solid rgba(255, 255, 255, 0.35);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(10rpx);
}
.buy-card-icon {
  width: 52rpx; height: 52rpx;
}
.buy-card-middle {
  flex: 1;
  display: flex; flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  position: relative; z-index: 1;
}
.buy-card-title {
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.buy-card-desc {
  color: rgba(255, 255, 255, 0.78);
  font-size: 22rpx;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buy-card-right {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 4rpx;
  padding: 14rpx 22rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  position: relative; z-index: 1;
}
.buy-card-go {
  color: #6366f1;
  font-size: 24rpx;
  font-weight: 700;
}
.buy-card-arrow {
  color: #6366f1;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1;
  margin-left: 2rpx;
}

/* ===== 账单 ===== */
.clear-btn { padding: 8rpx 20rpx; background: #f3f4f6; border-radius: 20rpx; }
.clear-btn.disabled { opacity: 0.4; }
.clear-text { font-size: 22rpx; color: #6b7280; }

.log-list { display: flex; flex-direction: column; gap: 0; }
.log-item {
  display: flex; align-items: center; gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f3f4f6;
}
.log-item:last-child { border-bottom: none; }
.log-icon-wrap {
  width: 72rpx; height: 72rpx; border-radius: 18rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.income-bg { background: #f0fdf4; }
.expense-bg { background: #fafafa; }
.log-icon-text { font-size: 30rpx; font-weight: 900; }
.income-bg .log-icon-text { color: #16a34a; }
.expense-bg .log-icon-text { color: #6b7280; }

.log-content { flex: 1; min-width: 0; }
.log-memo { font-size: 28rpx; font-weight: 700; color: #111827; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.log-time { font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; display: block; }
.log-amount { font-size: 30rpx; font-weight: 900; flex-shrink: 0; }
.income-color { color: #16a34a; }
.expense-color { color: #111827; }

.empty-state { padding: 40rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.empty-icon-wrap { width: 96rpx; height: 96rpx; border-radius: 24rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.empty-icon { width: 40rpx; height: 40rpx; border-radius: 50%; border: 4rpx solid #d1d5db; }
.empty-text { font-size: 26rpx; color: #9ca3af; }

/* ===== Bottom Sheet ===== */
.sheet-mask {
  position: fixed; inset: 0; z-index: 9990;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end;
}
.bottom-sheet {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom, 20rpx);
  animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.small-sheet { max-height: 70vh; }
.sheet-handle {
  width: 64rpx; height: 8rpx; border-radius: 4rpx;
  background: #e5e7eb;
  margin: 20rpx auto 4rpx;
}
.sheet-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #f3f4f6;
}
.sheet-title { font-size: 32rpx; font-weight: 900; color: #111827; }
.sheet-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.sheet-close-icon { font-size: 44rpx; color: #9ca3af; line-height: 1; }
.sheet-body { padding: 24rpx 32rpx 16rpx; }
.sheet-sub { font-size: 26rpx; color: #6b7280; display: block; margin-bottom: 20rpx; }

.sheet-btns { display: flex; gap: 16rpx; }
.sheet-btn {
  flex: 1; height: 88rpx; border-radius: 22rpx;
  display: flex; align-items: center; justify-content: center;
}
.sheet-btn.secondary { background: #f3f4f6; }
.sheet-btn.primary { background: #ff2442; }
.sheet-btn.danger { background: #111827; }
.sheet-btn-text { font-size: 28rpx; font-weight: 800; color: #374151; }
.sheet-btn-text.white { color: #fff; }

.pwd-input {
  width: 100%; height: 88rpx; background: #f8f9fb; border-radius: 16rpx;
  padding: 0 20rpx; font-size: 28rpx; color: #111827; box-sizing: border-box;
}
.input-ph { color: #9ca3af; }
.inline-err {
  padding: 14rpx 18rpx; background: #fff5f5; border-radius: 14rpx;
  font-size: 24rpx; color: #ef4444; margin-bottom: 14rpx;
}

/* ===== Alert ===== */
.alert-mask {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
}
.alert-box {
  width: 560rpx; background: #fff; border-radius: 28rpx;
  padding: 40rpx 36rpx 28rpx;
  display: flex; flex-direction: column; align-items: center; gap: 16rpx;
}
.alert-title { font-size: 30rpx; font-weight: 900; color: #111827; }
.alert-text { font-size: 26rpx; color: #6b7280; text-align: center; line-height: 1.6; }
.alert-btn {
  margin-top: 12rpx; width: 100%; height: 80rpx; border-radius: 20rpx;
  background: #111827;
  display: flex; align-items: center; justify-content: center;
}
.alert-btn-text { font-size: 28rpx; font-weight: 800; color: #fff; }

/* ===== HUD ===== */
.hud-wrap {
  position: fixed; inset: 0; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}
.hud {
  background: rgba(17,24,39,0.88); border-radius: 24rpx;
  padding: 36rpx 48rpx;
  display: flex; flex-direction: column; align-items: center; gap: 18rpx;
  min-width: 180rpx;
}
.hud-spinner {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  border: 6rpx solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}
.hud-text { color: #fff; font-size: 26rpx; font-weight: 700; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
