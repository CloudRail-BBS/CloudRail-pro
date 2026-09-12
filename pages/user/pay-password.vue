<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <view class="back-btn"><view class="back-arrow"></view></view>
      </view>
      <text class="nav-title">{{ hasPayPwd ? '修改支付密码' : '设置支付密码' }}</text>
      <view class="nav-right"></view>
    </view>

    <view class="body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <view v-if="step === 1" class="form-card">
        <text class="form-title">邮箱验证</text>
        <text class="form-sub">{{ hasPayPwd ? '修改支付密码需先验证邮箱' : '设置支付密码需先验证邮箱' }}</text>

        <view class="field">
          <text class="field-label">绑定邮箱</text>
          <view class="field-display">
            <text class="field-display-text">{{ maskedEmail || '（未绑定邮箱）' }}</text>
          </view>
        </view>

        <view class="field">
          <text class="field-label">验证码</text>
          <view class="field-input-wrap">
            <input
              type="number"
              v-model="emailCode"
              class="field-input code-input"
              placeholder="6位邮箱验证码"
              placeholder-class="field-ph"
              maxlength="6"
            />
            <view class="send-btn" :class="{ disabled: countdown > 0 || sending }" @click="sendCode">
              <text class="send-text">{{ countdown > 0 ? countdown + 's后重发' : (sending ? '发送中' : '获取验证码') }}</text>
            </view>
          </view>
          <text v-if="codeErr" class="field-error">{{ codeErr }}</text>
        </view>

        <view class="submit-btn" :class="{ disabled: emailCode.length < 6 || verifying }" @click="verifyEmailCode">
          <text class="submit-text">{{ verifying ? '验证中...' : '下一步' }}</text>
        </view>
      </view>
      <view v-if="step === 2" class="form-card">
        <text class="form-title">设置支付密码</text>
        <text class="form-sub">请输入6位数字支付密码，用于余额支付时验证身份</text>

        <view class="field">
          <text class="field-label">新支付密码</text>
          <view class="pin-field" @click="focusNewPwd">
            <view class="pin-box">
              <view
                v-for="i in 6" :key="'p'+i"
                class="pin-cell"
                :class="{ filled: newPwd.length >= i, active: newPwdFocused && newPwd.length === i - 1 }"
              >
                <view v-if="newPwd.length >= i" class="pin-dot"></view>
              </view>
            </view>
            <input
              class="pin-real-input"
              type="number"
              :value="newPwd"
              maxlength="6"
              :focus="newPwdFocused"
              :adjust-position="true"
              @input="onNewPwdInput"
              @blur="newPwdFocused = false"
            />
          </view>
        </view>

        <view class="field">
          <text class="field-label">确认支付密码</text>
          <view class="pin-field" @click="focusConfirmPwd">
            <view class="pin-box">
              <view
                v-for="i in 6" :key="'c'+i"
                class="pin-cell"
                :class="{ filled: confirmPwd.length >= i, active: confirmPwdFocused && confirmPwd.length === i - 1 }"
              >
                <view v-if="confirmPwd.length >= i" class="pin-dot"></view>
              </view>
            </view>
            <input
              class="pin-real-input"
              type="number"
              :value="confirmPwd"
              maxlength="6"
              :focus="confirmPwdFocused"
              :adjust-position="true"
              @input="onConfirmPwdInput"
              @blur="confirmPwdFocused = false"
            />
          </view>
        </view>

        <text v-if="pwdErr" class="field-error">{{ pwdErr }}</text>

        <view class="submit-btn" :class="{ disabled: newPwd.length < 6 || confirmPwd.length < 6 || submitting }" @click="submitPayPwd">
          <text class="submit-text">{{ submitting ? '保存中...' : '确认设置' }}</text>
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
      step: 1,
      hasPayPwd: false,
      maskedEmail: '',
      verifiedToken: '',
      emailCode: '',
      codeErr: '',
      newPwd: '',
      confirmPwd: '',
      pwdErr: '',
      newPwdFocused: false,
      confirmPwdFocused: false,
      sending: false,
      verifying: false,
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

    focusNewPwd() {
      this.confirmPwdFocused = false;
      this.newPwdFocused = false;
      this.$nextTick(() => { this.newPwdFocused = true; });
    },

    focusConfirmPwd() {
      this.newPwdFocused = false;
      this.confirmPwdFocused = false;
      this.$nextTick(() => { this.confirmPwdFocused = true; });
    },

    async loadStatus() {
      try {
        const res = await request('user.php', { action: 'getAccountSecurity' });
        if (res.code === 0) {
          const d = res.data || {};
          this.hasPayPwd = !!d.has_pay_password;
          this.maskedEmail = d.email_masked || d.email || '';
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        }
      } catch (e) {
        if (e && e.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        }
      }
    },

    async sendCode() {
      if (this.countdown > 0 || this.sending) return;
      if (!this.maskedEmail) {
        this.codeErr = '账号未绑定邮箱，请先在设置中绑定邮箱';
        return;
      }
      this.sending = true;
      try {
        const res = await request('user.php', { action: 'sendPayPwdEmailCode' });
        this.sending = false;
        if (res.code === 0) {
          this.startCountdown();
          uni.showToast({ title: '验证码已发送', icon: 'none' });
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.codeErr = res.msg || '发送失败';
        }
      } catch (e) {
        this.sending = false;
        if (e && e.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.codeErr = '网络错误，请稍后重试';
        }
      }
    },

    startCountdown() {
      this.countdown = 60;
      this.cdTimer = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) { clearInterval(this.cdTimer); this.cdTimer = null; }
      }, 1000);
    },

    async verifyEmailCode() {
      if (this.emailCode.length < 6 || this.verifying) return;
      this.verifying = true;
      this.showHud('验证中...');
      try {
        const res = await request('user.php', { action: 'verifyPayPwdEmailCode', code: this.emailCode });
        this.hideHud();
        this.verifying = false;
        if (res.code === 0) {
          this.verifiedToken = res.data.verify_token || '';
          this.newPwd = '';
          this.confirmPwd = '';
          this.pwdErr = '';
          this.step = 2;
          this.$nextTick(() => { this.newPwdFocused = true; });
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.codeErr = res.msg || '验证码错误';
        }
      } catch (e) {
        this.hideHud();
        this.verifying = false;
        if (e && e.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.codeErr = '网络错误，请稍后重试';
        }
      }
    },

    onNewPwdInput(e) {
      this.newPwd = (e.detail.value || '').replace(/[^0-9]/g, '').slice(0, 6);
      this.pwdErr = '';
      if (this.newPwd.length === 6) {
        this.newPwdFocused = false;
        this.$nextTick(() => { this.confirmPwdFocused = true; });
      }
    },

    onConfirmPwdInput(e) {
      this.confirmPwd = (e.detail.value || '').replace(/[^0-9]/g, '').slice(0, 6);
      this.pwdErr = '';
    },

    async submitPayPwd() {
      if (this.newPwd.length < 6 || this.confirmPwd.length < 6 || this.submitting) return;
      if (this.newPwd !== this.confirmPwd) { this.pwdErr = '两次密码不一致'; return; }
      this.submitting = true;
      this.showHud('保存中...');
      try {
        const res = await request('user.php', {
          action: 'setPayPassword',
          pay_password: this.newPwd,
          verify_token: this.verifiedToken
        });
        this.hideHud();
        this.submitting = false;
        if (res.code === 0) {
          uni.showToast({ title: '支付密码已设置', icon: 'success' });
          setTimeout(() => uni.navigateBack(), 1500);
        } else if (res.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.pwdErr = res.msg || '设置失败';
        }
      } catch (e) {
        this.hideHud();
        this.submitting = false;
        if (e && e.code === -2) {
          uni.reLaunch({ url: '/pages/login/login' });
        } else {
          this.pwdErr = '网络错误，请稍后重试';
        }
      }
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; }
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 44px;
  background: #fff; border-bottom: 1rpx solid #f5f5f5; display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx;
}
.nav-left, .nav-right { width: 80rpx; display: flex; align-items: center; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #111; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.back-arrow { width: 18rpx; height: 18rpx; border-left: 4rpx solid #111; border-bottom: 4rpx solid #111; transform: rotate(45deg); margin-left: 6rpx; }

.body { padding: 0 28rpx; }
.form-card { margin-top: 40rpx; background: #fff; border-radius: 28rpx; padding: 40rpx 36rpx; }
.form-title { font-size: 36rpx; font-weight: 700; color: #111; display: block; margin-bottom: 10rpx; }
.form-sub { font-size: 24rpx; color: #999; display: block; margin-bottom: 40rpx; }

.field { margin-bottom: 28rpx; }
.field-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 12rpx; font-weight: 600; }
.field-display { background: #f8f8f8; border-radius: 16rpx; padding: 0 20rpx; height: 96rpx; display: flex; align-items: center; border: 1rpx solid #f0f0f0; }
.field-display-text { font-size: 28rpx; color: #333; }
.field-input-wrap { display: flex; align-items: center; background: #f8f8f8; border-radius: 16rpx; padding: 0 20rpx; height: 96rpx; gap: 12rpx; border: 1rpx solid #f0f0f0; }
.field-input { flex: 1; font-size: 30rpx; color: #111; height: 96rpx; }
.code-input { flex: 1; }
.field-ph { color: #ccc; }
.field-error { font-size: 22rpx; color: #ff2442; margin-top: 8rpx; display: block; }

.send-btn { padding: 14rpx 28rpx; background: #111; border-radius: 12rpx; flex-shrink: 0; }
.send-btn.disabled { background: #ccc; }
.send-text { font-size: 22rpx; font-weight: 600; color: #fff; white-space: nowrap; }

/* PIN 输入 */
.pin-field { position: relative; }
.pin-box { display: flex; gap: 16rpx; }
.pin-cell {
  flex: 1; height: 96rpx; border-radius: 16rpx;
  background: #f8f8f8; border: 1.5rpx solid #e5e7eb;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.15s;
}
.pin-cell.active { border-color: #111; background: #fff; }
.pin-cell.filled { border-color: #111; background: #fff; }
.pin-dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: #111; }

/* 覆盖整个 pin-box 以捕获点击 / H5 触发键盘 */
.pin-real-input {
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 96rpx;
  opacity: 0;
  z-index: 2;
  /* H5 去掉 number 类型的上下箭头 */
  -webkit-appearance: none;
}

.submit-btn { height: 96rpx; border-radius: 48rpx; background: #ff2442; display: flex; align-items: center; justify-content: center; margin-top: 20rpx; }
.submit-btn.disabled { opacity: 0.45; }
.submit-text { font-size: 30rpx; font-weight: 700; color: #fff; }

.hud-wrap { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; }
.hud { background: rgba(17,24,39,0.88); border-radius: 24rpx; padding: 36rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 18rpx; }
.hud-spinner { width: 56rpx; height: 56rpx; border-radius: 50%; border: 6rpx solid rgba(255,255,255,0.2); border-top-color: #fff; animation: spin 0.8s linear infinite; }
.hud-text { color: #fff; font-size: 26rpx; font-weight: 600; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
