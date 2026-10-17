<template>
  <view class="page" :class="themeClass">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <view class="back-btn"><view class="back-arrow"></view></view>
      </view>
      <text class="nav-title">{{ isBound && !changeMode ? '我的手机' : (changeMode ? '更换手机' : '绑定手机') }}</text>
      <view class="nav-right"></view>
    </view>

    <view class="body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <view v-if="isBound && !changeMode" class="bound-card">
        <view class="bound-icon-wrap">
          <view class="bound-icon">
            <view class="phone-shape"></view>
          </view>
        </view>
        <text class="bound-title">手机号已绑定</text>
        <text class="bound-phone">{{ maskedPhone }}</text>
        <view class="safe-badge">
          <text class="safe-text">账号安全保护中</text>
        </view>
        <view class="change-btn" @click="changeMode = true">
          <text class="change-text">更换绑定</text>
        </view>
      </view>

      <view v-else>
        <view class="form-card">
          <text class="form-title">{{ changeMode ? '绑定新手机号' : '绑定手机号' }}</text>
          <text class="form-sub">绑定后可用手机号快捷登录，保障账号安全</text>
          <view class="field">
            <text class="field-label">手机号</text>
            <view class="field-input-wrap">
              <text class="field-prefix">+86</text>
              <input
                type="number"
                v-model="phone"
                class="field-input"
                placeholder="请输入11位手机号"
                placeholder-class="field-ph"
                maxlength="11"
                @input="clearErrors"
              />
            </view>
            <text v-if="phoneErr" class="field-error">{{ phoneErr }}</text>
          </view>
          <view class="field">
            <text class="field-label">验证码</text>
            <view class="field-input-wrap">
              <input
                type="number"
                v-model="code"
                class="field-input code-input"
                placeholder="6位短信验证码"
                placeholder-class="field-ph"
                maxlength="6"
                @input="clearErrors"
              />
              <view class="send-btn" :class="{ disabled: countdown > 0 || sending }" @click="sendCode">
                <text class="send-text">{{ countdown > 0 ? countdown + 's后重发' : (sending ? '发送中' : '获取验证码') }}</text>
              </view>
            </view>
            <text v-if="codeErr" class="field-error">{{ codeErr }}</text>
          </view>

          <view v-if="globalErr" class="global-error">{{ globalErr }}</view>

          <view class="submit-btn" :class="{ disabled: submitting }" @click="submit">
            <text class="submit-text">{{ submitting ? '绑定中...' : '确认绑定' }}</text>
          </view>

          <view v-if="changeMode" class="cancel-row" @click="changeMode = false">
            <text class="cancel-text">取消</text>
          </view>
        </view>
      </view>
    </view>
    <view class="hud-wrap" v-if="hudVisible" @touchmove.stop.prevent>
      <view class="hud"><view class="hud-spinner"></view><text class="hud-text">{{ hudText }}</text></view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 20,
      isBound: false,
      maskedPhone: '',
      changeMode: false,
      phone: '',
      code: '',
      phoneErr: '',
      codeErr: '',
      globalErr: '',
      sending: false,
      submitting: false,
      countdown: 0,
      cdTimer: null,
      hudVisible: false,
      hudText: ''
    };
  },
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    const t = uni.getStorageSync('token');
    if (!t) { uni.reLaunch({ url: '/pages/login/login' }); return; }
    this.loadStatus();
  },
  onUnload() { if (this.cdTimer) clearInterval(this.cdTimer); },
  methods: {
    goBack() { uni.navigateBack(); },
    showHud(t) { this.hudText = t; this.hudVisible = true; },
    hideHud() { this.hudVisible = false; },
    clearErrors() { this.phoneErr = ''; this.codeErr = ''; this.globalErr = ''; },

    async loadStatus() {
      try {
        const res = await request('user.php', { action: 'getAccountSecurity' });
        if (res.code === 0) {
          const d = res.data || {};
          this.isBound = !!d.has_phone;
          this.maskedPhone = d.phone_masked || '';
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        }
      } catch (e) {}
    },

    async sendCode() {
      if (this.countdown > 0 || this.sending) return;
      const p = this.phone.trim();
      if (!/^1[3-9]\d{9}$/.test(p)) { this.phoneErr = '请输入正确的手机号'; return; }

      this.sending = true;
      try {
        const res = await request('user.php', { action: 'sendBindPhoneSmsCode', phone: p });
        this.sending = false;
        if (res.code === 0) {
          this.startCountdown();
          var testCode = res.data && res.data.test_code;
          if (testCode) {
            this.code = String(testCode);
            uni.showToast({ title: '验证码 ' + testCode + '（测试模式已自动填入）', icon: 'none' });
          } else {
            uni.showToast({ title: '验证码已发送', icon: 'none' });
          }
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.phoneErr = res.msg || '发送失败，请稍后再试';
        }
      } catch (e) {
        this.sending = false;
        this.phoneErr = '网络错误';
      }
    },

    startCountdown() {
      this.countdown = 60;
      this.cdTimer = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) { clearInterval(this.cdTimer); this.cdTimer = null; }
      }, 1000);
    },

    async submit() {
      if (this.submitting) return;
      const p = this.phone.trim();
      const c = this.code.trim();
      if (!/^1[3-9]\d{9}$/.test(p)) { this.phoneErr = '请输入正确的手机号'; return; }
      if (!/^\d{6}$/.test(c)) { this.codeErr = '请输入6位验证码'; return; }

      this.submitting = true;
      this.showHud('绑定中...');
      try {
        const res = await request('user.php', { action: 'bindPhone', phone: p, code: c });
        this.hideHud();
        this.submitting = false;
        if (res.code === 0) {
          uni.showToast({ title: '绑定成功', icon: 'success' });
          this.isBound = true;
          this.maskedPhone = p.slice(0, 3) + '****' + p.slice(7);
          this.changeMode = false;
          this.phone = '';
          this.code = '';
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.globalErr = res.msg || '绑定失败';
        }
      } catch (e) {
        this.hideHud();
        this.submitting = false;
        this.globalErr = '网络错误';
      }
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; background: var(--cr-surface); }
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 44px;
  background: var(--cr-surface); border-bottom: 1rpx solid #f5f5f5; display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx;
}
.nav-left, .nav-right { width: 80rpx; display: flex; align-items: center; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #111; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.back-arrow { width: 18rpx; height: 18rpx; border-left: 4rpx solid #111827; border-bottom: 4rpx solid #111827; transform: rotate(45deg); margin-left: 6rpx; }

.body { padding: 0 28rpx; }

/* 已绑定 */
.bound-card { margin-top: 40rpx; background: var(--cr-surface); border-radius: 28rpx; padding: 60rpx 36rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.bound-icon-wrap { width: 120rpx; height: 120rpx; border-radius: 30rpx; background: #111827; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.bound-icon { display: flex; align-items: center; justify-content: center; }
.phone-shape { width: 36rpx; height: 60rpx; border: 4rpx solid #fff; border-radius: 8rpx; }
.bound-title { font-size: 32rpx; font-weight: 900; color: var(--cr-text); }
.bound-phone { font-size: 36rpx; font-weight: 900; color: var(--cr-text); letter-spacing: 2rpx; }
.safe-badge { padding: 8rpx 24rpx; background: #f0fdf4; border-radius: 20rpx; margin-top: 4rpx; }
.safe-text { font-size: 22rpx; color: #16a34a; font-weight: 600; }
.change-btn { margin-top: 16rpx; padding: 18rpx 60rpx; border: 2rpx solid var(--cr-border); border-radius: 32rpx; }
.change-text { font-size: 28rpx; font-weight: 700; color: var(--cr-text); }

/* 表单 */
.form-card { margin-top: 40rpx; background: var(--cr-surface); border-radius: 28rpx; padding: 40rpx 36rpx; }
.form-title { font-size: 36rpx; font-weight: 900; color: var(--cr-text); display: block; margin-bottom: 10rpx; }
.form-sub { font-size: 24rpx; color: var(--cr-text-muted); display: block; margin-bottom: 40rpx; }

.field { margin-bottom: 28rpx; }
.field-label { font-size: 24rpx; color: var(--cr-text-muted); display: block; margin-bottom: 12rpx; font-weight: 600; }
.field-input-wrap { display: flex; align-items: center; background: #f8f9fb; border-radius: 16rpx; padding: 0 20rpx; height: 96rpx; gap: 12rpx; }
.field-prefix { font-size: 28rpx; font-weight: 700; color: var(--cr-text); padding-right: 12rpx; border-right: 2rpx solid var(--cr-border); }
.field-input { flex: 1; font-size: 30rpx; color: var(--cr-text); height: 96rpx; }
.code-input { flex: 1; }
.field-ph { color: #d1d5db; }
.field-error { font-size: 22rpx; color: #ef4444; margin-top: 8rpx; display: block; }

.send-btn { padding: 12rpx 24rpx; background: #111827; border-radius: 12rpx; flex-shrink: 0; }
.send-btn.disabled { background: #d1d5db; }
.send-text { font-size: 22rpx; font-weight: 700; color: #fff; white-space: nowrap; }

.global-error { padding: 16rpx 20rpx; background: #fff5f5; border-radius: 14rpx; font-size: 24rpx; color: #ef4444; margin-bottom: 20rpx; }

.submit-btn { height: 96rpx; border-radius: 48rpx; background: #ff2442; display: flex; align-items: center; justify-content: center; margin-top: 12rpx; }
.submit-btn.disabled { opacity: 0.5; }
.submit-text { font-size: 30rpx; font-weight: 900; color: #fff; }

.cancel-row { padding: 24rpx; display: flex; justify-content: center; }
.cancel-text { font-size: 26rpx; color: var(--cr-text-muted); }

.hud-wrap { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; }
.hud { background: rgba(17,24,39,0.88); border-radius: 24rpx; padding: 36rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 18rpx; }
.hud-spinner { width: 56rpx; height: 56rpx; border-radius: 50%; border: 6rpx solid rgba(255,255,255,0.2); border-top-color: #fff; animation: spin 0.8s linear infinite; }
.hud-text { color: #fff; font-size: 26rpx; font-weight: 700; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
