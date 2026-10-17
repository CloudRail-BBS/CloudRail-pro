<template>
  <view class="page" :class="themeClass">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <view class="back-btn"><view class="back-arrow"></view></view>
      </view>
      <text class="nav-title">申请提现</text>
      <view class="nav-right">
        <text class="record-link" @click="goRecords">记录</text>
      </view>
    </view>

    <scroll-view scroll-y class="body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <view class="balance-banner">
        <text class="balance-label">可提现余额（{{ currencyName }}）</text>
        <text class="balance-val">¥ {{ availableBalance }}</text>
        <text class="balance-hint">已冻结 ¥{{ frozenBalance }}</text>
      </view>
      <view class="section">
        <text class="section-title">收款方式</text>
        <view class="channel-list">
          <view
            v-for="c in channels" :key="c.value"
            class="channel-item"
            :class="{ active: form.channel === c.value }"
            @click="form.channel = c.value"
          >
            <view class="channel-icon" :class="c.value + '-bg'">
              <text class="channel-icon-text">{{ c.icon }}</text>
            </view>
            <text class="channel-name">{{ c.label }}</text>
            <view class="channel-radio" :class="{ checked: form.channel === c.value }">
              <view v-if="form.channel === c.value" class="radio-dot"></view>
            </view>
          </view>
        </view>
      </view>
      <view class="section">
        <text class="section-title">提现金额</text>
        <view class="input-wrap">
          <text class="input-prefix">¥</text>
          <input
            type="digit"
            v-model="form.amount"
            class="main-input"
            placeholder="最低 ¥30.00"
            placeholder-class="input-ph"
          />
          <text class="input-all" @click="fillAll">全部</text>
        </view>
        <view v-if="showFeeInfo" class="fee-info-box">
          <view class="fee-row">
            <text class="fee-label">手续费（{{ feeRate }}%）</text>
            <text class="fee-val fee-deduct">-¥{{ feeAmount.toFixed(2) }}</text>
          </view>
          <view class="fee-row fee-settle-row">
            <text class="fee-label fee-settle-label">预计实际到账</text>
            <text class="fee-val fee-settle-val">¥{{ settleAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">收款账号</text>
        <view class="input-row">
          <text class="input-label">{{ channelLabel }}账号</text>
          <input
            type="text"
            v-model="form.account"
            class="line-input"
            :placeholder="channelPlaceholder"
            placeholder-class="input-ph"
          />
        </view>

        <template v-if="form.channel === 'bank'">
          <view class="input-row">
            <text class="input-label">真实姓名</text>
            <input type="text" v-model="form.real_name" class="line-input" placeholder="开户人姓名" placeholder-class="input-ph" />
          </view>
          <view class="input-row">
            <text class="input-label">开户行</text>
            <input type="text" v-model="form.bank_name" class="line-input" placeholder="如：中国工商银行" placeholder-class="input-ph" />
          </view>
        </template>
      </view>
      <view class="tips-box">
        <text class="tips-title">提现须知</text>
        <text class="tips-line">· 审核工作日1-3天内完成</text>
        <text class="tips-line">· 申请后余额将被冻结，审核通过后扣除</text>
        <text v-if="feeRate > 0" class="tips-line tips-fee">· 当前提现手续费率：{{ feeRate }}%，将从提现金额中扣除</text>
        <text v-else class="tips-line">· 当前提现免手续费</text>
        <text class="tips-line">· 如有疑问请联系客服</text>
      </view>

      <view style="height:160rpx;"></view>
    </scroll-view>

    <view class="submit-bar">
      <view class="submit-btn" :class="{ disabled: submitting }" @click="submit">
        <text class="submit-text">{{ submitting ? '提交中...' : '提交申请' }}</text>
      </view>
    </view>

    <view class="alert-mask" v-if="alertVisible" @touchmove.stop.prevent>
      <view class="alert-box">
        <text class="alert-title">提示</text>
        <text class="alert-msg">{{ alertText }}</text>
        <view class="alert-ok" @click="alertVisible=false"><text class="alert-ok-text">知道了</text></view>
      </view>
    </view>
    <view class="hud-wrap" v-if="hudVisible" @touchmove.stop.prevent>
      <view class="hud"><view class="hud-spinner"></view><text class="hud-text">{{ hudText }}</text></view>
    </view>
  </view>
</template>

<script>
import { baseUrl, request, getCurrencyName, refreshAppConfig } from '../../common/request.js';

export default {
  data() {
    return {
      // 货币名称（从后端动态获取，启动时填充）
      currencyName: '余额',
      statusBarHeight: 20,
      token: '',
      availableBalance: '0.00',
      frozenBalance: '0.00',
      submitting: false,
      hudVisible: false,
      hudText: '',
      alertVisible: false,
      alertText: '',
      form: { channel: 'alipay', amount: '', account: '', real_name: '', bank_name: '' },
      feeRate: 0,
      channels: [
        { value: 'alipay', label: '支付宝', icon: '支' },
        { value: 'wxpay',  label: '微信',   icon: '微' },
        { value: 'bank',   label: '银行卡', icon: '卡' },
      ]
    };
  },
  computed: {
    channelLabel() {
      return { alipay: '支付宝', wxpay: '微信', bank: '银行卡' }[this.form.channel] || '';
    },
    channelPlaceholder() {
      return { alipay: '支付宝账号/手机号', wxpay: '微信号/手机号', bank: '银行卡号' }[this.form.channel] || '';
    },
    parsedAmount() {
      return parseFloat(this.form.amount) || 0;
    },
    feeAmount() {
      if (this.feeRate <= 0 || this.parsedAmount < 1) return 0;
      return Math.round(this.parsedAmount * this.feeRate / 100 * 100) / 100;
    },
    settleAmount() {
      if (this.parsedAmount < 1) return 0;
      return Math.round((this.parsedAmount - this.feeAmount) * 100) / 100;
    },
    showFeeInfo() {
      return this.feeRate > 0 && this.parsedAmount >= 1;
    }
  },
  async onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    // 异步获取货币名称，不阻塞主流程
    this.currencyName = await getCurrencyName()
    const t = uni.getStorageSync('token');
    if (!t) { uni.reLaunch({ url: '/pages/login/login' }); return; }
    this.token = t;
    this.loadBalance();
    this.loadFeeRate();
  },
  async onShow() {
    // 每次显示页面时刷新货币名称（后台改配置后立即生效）
    refreshAppConfig()
    this.currencyName = await getCurrencyName()
  },
  methods: {
    goBack() { uni.navigateBack(); },
    goRecords() { uni.navigateTo({ url: '/pages/user/withdraw-records' }); },

    showAlert(t) { this.alertText = t; this.alertVisible = true; },
    showHud(t) { this.hudText = t; this.hudVisible = true; },
    hideHud() { this.hudVisible = false; },

    getHeader() {
      return { 'content-type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer ' + this.token, 'token': this.token };
    },

    async loadFeeRate() {
      try {
        const res = await request('withdraw.php', { action: 'get_fee_rate' });
        if (res && res.code === 0) {
          this.feeRate = parseFloat(res.data.fee_rate) || 0;
        }
      } catch (e) {}
    },

    async loadBalance() {
      try {
        const res = await request('wallet.php', { action: 'get_wallet' });
        if (res.code === 0) {
          this.availableBalance = res.data.balance || '0.00';
          this.frozenBalance = res.data.frozen_balance || '0.00';
        }
      } catch (e) {}
    },

    fillAll() {
      const avail = parseFloat(this.availableBalance) - parseFloat(this.frozenBalance);
      this.form.amount = String(Math.max(0, avail).toFixed(2));
    },

    async submit() {
      if (this.submitting) return;
      const amt = parseFloat(this.form.amount);
      if (!amt || amt < 1) return this.showAlert('最低提现金额为 ¥30.00');
      if (!this.form.account.trim()) return this.showAlert('请填写收款账号');
      if (this.form.channel === 'bank' && !this.form.real_name.trim()) return this.showAlert('请填写真实姓名');
      if (this.form.channel === 'bank' && !this.form.bank_name.trim()) return this.showAlert('请填写开户行');

      this.submitting = true;
      this.showHud('提交中...');
      try {
        const res = await request('withdraw.php', { action: 'apply', ...this.form });
        this.hideHud();
        this.submitting = false;
        if (res.code === 0) {
          this.showAlert('申请已提交，1-3个工作日内审核');
          this.form.amount = '';
          this.loadBalance();
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.showAlert(res.msg || '提交失败');
        }
      } catch (e) {
        this.hideHud(); this.submitting = false; this.showAlert('网络错误');
      }
    }
  }
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
.nav-right { justify-content: flex-end; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #111; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.back-arrow { width: 18rpx; height: 18rpx; border-left: 4rpx solid #111827; border-bottom: 4rpx solid #111827; transform: rotate(45deg); margin-left: 6rpx; }
.record-link { font-size: 26rpx; color: var(--cr-text-muted); }

.body { position: fixed; top: 0; left: 0; right: 0; bottom: 0; }

.balance-banner {
  margin: 24rpx 28rpx 0; background: #111827;
  border-radius: 24rpx; padding: 36rpx; display: flex; flex-direction: column; gap: 10rpx;
}
.balance-label { font-size: 24rpx; color: rgba(255,255,255,0.5); }
.balance-val { font-size: 72rpx; font-weight: 900; color: #fff; letter-spacing: -2rpx; }
.balance-hint { font-size: 22rpx; color: rgba(251,191,36,0.8); }

.section { margin: 20rpx 28rpx 0; background: var(--cr-surface); border-radius: 20rpx; padding: 28rpx; }
.section-title { font-size: 28rpx; font-weight: 800; color: var(--cr-text); display: block; margin-bottom: 20rpx; }

.channel-list { display: flex; flex-direction: column; gap: 0; }
.channel-item { display: flex; align-items: center; gap: 18rpx; padding: 18rpx 0; border-bottom: 1rpx solid #f3f4f6; }
.channel-item:last-child { border-bottom: none; }
.channel-icon { width: 68rpx; height: 68rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.alipay-bg { background: #1677ff; }
.wxpay-bg { background: #07c160; }
.bank-bg { background: #f59e0b; }
.channel-icon-text { font-size: 26rpx; font-weight: 900; color: #fff; }
.channel-name { flex: 1; font-size: 28rpx; font-weight: 700; color: var(--cr-text); }
.channel-radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid var(--cr-border); display: flex; align-items: center; justify-content: center; }
.channel-radio.checked { border: 0; background: #ef4444; }
.radio-dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: var(--cr-surface); }

.input-wrap { display: flex; align-items: center; background: #f8f9fb; border-radius: 16rpx; padding: 0 20rpx; height: 96rpx; }
.input-prefix { font-size: 36rpx; font-weight: 900; color: var(--cr-text); margin-right: 8rpx; }
.main-input { flex: 1; font-size: 40rpx; font-weight: 900; color: var(--cr-text); height: 96rpx; }
.input-all { font-size: 24rpx; font-weight: 700; color: #ef4444; padding: 8rpx 16rpx; }

.input-row { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #f3f4f6; gap: 16rpx; }
.input-row:last-child { border-bottom: none; }
.input-label { font-size: 26rpx; color: var(--cr-text-muted); width: 140rpx; flex-shrink: 0; }
.line-input { flex: 1; font-size: 28rpx; color: var(--cr-text); height: 60rpx; }
.input-ph { color: #d1d5db; }

.tips-box { margin: 20rpx 28rpx 0; padding: 24rpx; background: #fffbeb; border-radius: 20rpx; }
.tips-title { font-size: 24rpx; font-weight: 700; color: #92400e; display: block; margin-bottom: 12rpx; }
.tips-line { font-size: 22rpx; color: #78350f; display: block; line-height: 2; }
.tips-fee { color: #b45309; font-weight: 600; }

.fee-info-box { margin-top: 18rpx; background: #f0fdf4; border-radius: 14rpx; padding: 18rpx 20rpx; display: flex; flex-direction: column; gap: 10rpx; }
.fee-row { display: flex; align-items: center; justify-content: space-between; }
.fee-label { font-size: 24rpx; color: var(--cr-text-muted); }
.fee-val { font-size: 24rpx; font-weight: 700; }
.fee-deduct { color: #f59e0b; }
.fee-settle-row { border-top: 1rpx solid #bbf7d0; padding-top: 10rpx; margin-top: 2rpx; }
.fee-settle-label { font-size: 26rpx; font-weight: 700; color: var(--cr-text); }
.fee-settle-val { font-size: 30rpx; font-weight: 900; color: #16a34a; }

.submit-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 16rpx 28rpx 32rpx; background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-top: 1rpx solid rgba(0,0,0,0.06); }
.submit-btn { height: 96rpx; border-radius: 48rpx; background: #ff2442; display: flex; align-items: center; justify-content: center; }
.submit-btn.disabled { opacity: 0.5; }
.submit-text { font-size: 32rpx; font-weight: 900; color: #fff; }

.alert-mask { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.alert-box { width: 560rpx; background: var(--cr-surface); border-radius: 28rpx; padding: 40rpx 36rpx 28rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.alert-title { font-size: 30rpx; font-weight: 900; color: var(--cr-text); }
.alert-msg { font-size: 26rpx; color: var(--cr-text-muted); text-align: center; line-height: 1.6; }
.alert-ok { margin-top: 12rpx; width: 100%; height: 80rpx; border-radius: 20rpx; background: #111827; display: flex; align-items: center; justify-content: center; }
.alert-ok-text { font-size: 28rpx; font-weight: 800; color: #fff; }

.hud-wrap { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; }
.hud { background: rgba(17,24,39,0.88); border-radius: 24rpx; padding: 36rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 18rpx; }
.hud-spinner { width: 56rpx; height: 56rpx; border-radius: 50%; border: 6rpx solid rgba(255,255,255,0.2); border-top-color: #fff; animation: spin 0.8s linear infinite; }
.hud-text { color: #fff; font-size: 26rpx; font-weight: 700; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
