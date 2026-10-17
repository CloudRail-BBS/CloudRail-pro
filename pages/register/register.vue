<template>
  <view class="xhs-register" :class="themeClass">
    <view class="logo-box">
      <image src="/static/logo.png" mode="aspectFit" class="logo-img" />
    </view>

    <view class="main-con">
      <view class="text-header">
        <text class="h1">欢迎加入我们</text>
        <text class="h2">开启你的精彩旅程</text>
      </view>

      <view class="form-box">
        <view class="input-group" :class="{ active: focusUser }">
          <input
            type="text" v-model="username"
            placeholder="设置账号 (2-10位)"
            placeholder-class="ph-style"
            @focus="focusUser=true" @blur="focusUser=false"
            class="xhs-input" maxlength="10"
          />
          <text v-if="username.length > 0" class="count-tip">{{ username.length }}/10</text>
        </view>
        <view class="input-group" :class="{ active: focusPwd }">
          <input
            type="password" v-model="password"
            placeholder="设置密码 (至少6位)"
            placeholder-class="ph-style"
            @focus="focusPwd=true" @blur="focusPwd=false"
            class="xhs-input" maxlength="20"
          />
        </view>
        <view class="input-group" :class="{ active: focusConfirm }">
          <input
            type="password" v-model="confirmPwd"
            placeholder="再次确认密码"
            placeholder-class="ph-style"
            @focus="focusConfirm=true" @blur="focusConfirm=false"
            class="xhs-input" maxlength="20"
          />
        </view>

        <!-- 邀请码输入框 -->
        <view v-if="inviteCodeRequired" class="input-group" :class="{ active: focusInvite }">
          <input
            type="text" v-model="inviteCode"
            placeholder="请输入邀请码"
            placeholder-class="ph-style"
            @focus="focusInvite=true" @blur="focusInvite=false"
            class="xhs-input" maxlength="32"
          />
        </view>

        <view class="input-group" :class="{ active: focusEmail }">
          <input
            type="text" v-model="email"
            placeholder="请输入邮箱地址"
            placeholder-class="ph-style"
            @focus="focusEmail=true" @blur="focusEmail=false"
            class="xhs-input"
          />
        </view>
        <view class="input-group sms-group" :class="{ active: focusCode }">
          <input
            type="number" v-model="emailCode"
            placeholder="6位邮箱验证码"
            placeholder-class="ph-style"
            maxlength="6"
            @focus="focusCode=true" @blur="focusCode=false"
            class="xhs-input code-input"
          />
          <view class="send-code-btn" :class="{ disabled: countdown > 0 || sendingCode }" @click="sendCode">
            <text>{{ countdown > 0 ? countdown + 's' : (sendingCode ? '发送中' : '获取验证码') }}</text>
          </view>
        </view>

        <button
          class="xhs-btn"
          :class="{ disabled: !isFormValid || isLoading }"
          @click="handleRegister"
          :disabled="!isFormValid || isLoading"
        >
          <text>{{ isLoading ? '注册中...' : '立即注册' }}</text>
        </button>

        <view class="login-row">
          <text class="login-tip">已有账号？</text>
          <text class="login-link" @click="goLogin">去登录</text>
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
      username: '', password: '', confirmPwd: '',
      email: '', emailCode: '',
      inviteCode: '',
      inviteCodeRequired: false,
      focusUser: false, focusPwd: false, focusConfirm: false,
      focusEmail: false, focusCode: false, focusInvite: false,
      isLoading: false, sendingCode: false,
      countdown: 0, cdTimer: null
    };
  },
  computed: {
    isFormValid() {
      let valid = this.username.length >= 2 && this.username.length <= 10 &&
                  this.password.length >= 6 && this.confirmPwd.length >= 6 &&
                  this.email.includes('@') && this.emailCode.length === 6;
      if (this.inviteCodeRequired) {
        valid = valid && this.inviteCode.length >= 6;
      }
      return valid;
    }
  },
  onLoad() { 
    this.inviteCodeRequired = false; // 重置状态
    this.loadInviteConfig(); 
  },
  onUnload() { 
    if (this.cdTimer) clearInterval(this.cdTimer); 
  },
  methods: {
    async loadInviteConfig() {
      try {
        const res = await request('extensions/invite_code.php', { action: 'get_config' });
        
        if (res.code === 0 && res.data) {
          if (res.data.require_invite_code) {
            this.inviteCodeRequired = true;
          }
        }
      } catch (e) {
      }
    },

    async sendCode() {
      if (this.countdown > 0 || this.sendingCode) return;
      const e = this.email.trim();
      if (!e.includes('@') || !e.includes('.')) return this.toast('请输入正确的邮箱地址');

      this.sendingCode = true;
      try {
        const res = await request('user.php', { action: 'sendRegisterEmailCode', email: e });
        if (res.code === 0) {
          if (res.data && res.data.test_mode) {
            this.toast(res.msg || '邮件发送失败，请检查SMTP配置');
          } else {
            this.toast('验证码已发送，请查收邮件');
            this.countdown = 60;
            this.cdTimer = setInterval(() => {
              this.countdown--;
              if (this.countdown <= 0) { clearInterval(this.cdTimer); this.cdTimer = null; }
            }, 1000);
          }
        } else {
          this.toast(res.msg || '发送失败');
        }
      } catch (e) {
        this.toast('网络错误');
      } finally {
        this.sendingCode = false;
      }
    },

    async handleRegister() {
      if (this.isLoading) return;
      const u = this.username.trim();
      const p = this.password.trim();
      const e = this.email.trim();

      if (u.length < 2) return this.toast('账号至少2位');
      if (u.length > 10) return this.toast('账号最多10位');
      if (p !== this.confirmPwd) return this.toast('两次密码不一致');
      if (/^\d+$/.test(u)) return this.toast('账号不能为纯数字');
      if (/(.)\1{3,}/.test(u)) return this.toast('账号重复字符过多');
      if (!e.includes('@')) return this.toast('请输入正确的邮箱');
      if (this.emailCode.length !== 6) return this.toast('请输入6位验证码');
      if (this.inviteCodeRequired && !this.inviteCode.trim()) return this.toast('请输入邀请码');

      this.isLoading = true;
      try {
        const params = {
          action: 'registerWithEmail',
          username: u, password: p,
          email: e, email_code: this.emailCode
        };
        if (this.inviteCodeRequired) {
          params.invite_code = this.inviteCode.trim();
        }
        const res = await request('user.php', params);
        if (res.code === 0) {
          this.toast('注册成功');
          setTimeout(() => uni.navigateBack(), 1200);
        } else if (res.code === -2) {
          uni.showModal({ title: '提示', content: res.msg, showCancel: false });
        } else {
          this.toast(res.msg || '注册失败');
        }
      } catch (err) {
        this.toast('网络请求失败');
      } finally {
        this.isLoading = false;
      }
    },

    goLogin() { uni.navigateBack(); },
    toast(title) { uni.showToast({ title, icon: 'none', duration: 2000 }); }
  }
};
</script>

<style scoped>
.xhs-register { min-height: 100vh; background-color: var(--cr-surface); padding: 0 60rpx; display: flex; flex-direction: column; }
.logo-box { margin-top: 80rpx; margin-bottom: 48rpx; display: flex; justify-content: center; }
.logo-img { width: 120rpx; height: 120rpx; }
.text-header { margin-bottom: 48rpx; text-align: center; }
.h1 { display: block; font-size: 44rpx; color: var(--cr-text); font-weight: 900; margin-bottom: 12rpx; }
.h2 { font-size: 26rpx; color: var(--cr-text-muted); }
.input-group { background-color: #f6f6f6; border-radius: 44rpx; height: 92rpx; display: flex; align-items: center; padding: 0 36rpx; margin-bottom: 20rpx; border: 2rpx solid transparent; transition: all 0.25s; position: relative; }
.input-group.active { background-color: var(--cr-surface); border-color: #ff2442; }
.sms-group { padding-right: 16rpx; }
.xhs-input { flex: 1; font-size: 30rpx; color: var(--cr-text); height: 100%; }
.code-input { flex: 1; }
.ph-style { color: #c4c4c4; }
.count-tip { font-size: 22rpx; color: var(--cr-text-muted); }
.send-code-btn { flex-shrink: 0; padding: 14rpx 24rpx; background: #111827; border-radius: 28rpx; }
.send-code-btn.disabled { background: #d1d5db; }
.send-code-btn text { font-size: 22rpx; color: #fff; font-weight: 700; white-space: nowrap; }
.xhs-btn { background: linear-gradient(135deg, #ff2442, #ef4444); color: #fff; border-radius: 48rpx; font-size: 32rpx; font-weight: 700; height: 96rpx; line-height: 96rpx; border: none; margin-top: 32rpx; box-shadow: 0 8rpx 24rpx rgba(255,36,66,0.25); }
.xhs-btn::after { border: none; }
.xhs-btn.disabled { background: #fca5a5; box-shadow: none; }
.login-row { margin-top: 36rpx; display: flex; justify-content: center; font-size: 28rpx; }
.login-tip { color: var(--cr-text-muted); }
.login-link { color: #2b4c7e; margin-left: 10rpx; font-weight: 600; }
</style>
