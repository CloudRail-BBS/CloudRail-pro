<template>
  <view class="xhs-bind-container" :class="themeClass">
    <view class="custom-nav">
      <view class="nav-left" @click="goBack">
        <image src="/static/icon/arrow-left-dark.svg" class="back-arrow" mode="aspectFit"></image>
      </view>
      <text class="nav-title">{{ isChangeMode ? '更换邮箱' : '绑定邮箱' }}</text>
      <view class="nav-right"></view>
    </view>

    <view class="content-body">
      
      <view class="bound-state" v-if="isBound && !isChangeMode">
        <image src="/static/logo.png" mode="aspectFit" class="app-logo"></image>
        <view class="bound-title">当前账号已绑定邮箱</view>
        <view class="bound-email">{{ currentEmail }}</view>
        <view class="safe-tag">
           <image src="/static/icon/shield-check-green.svg" class="shield-icon" mode="aspectFit"></image><text> 账号安全保护中</text>
        </view>
        <button class="xhs-btn outline-btn" @click="switchToChangeMode">更换绑定</button>
      </view>

      <view class="form-state" v-if="!isBound || isChangeMode">
        <view class="header-text">
          <view class="h1">{{ isChangeMode ? '验证新邮箱' : '绑定邮箱' }}</view>
          <view class="h2" v-if="fromLogin" style="color:#ff2442">为账号安全，请绑定邮箱（可随时在设置中更换）</view>
          <view class="h2" v-else>绑定邮箱可用于登录/发帖、找回密码及接收通知</view>
        </view>

        <view class="form-box">
          <view class="input-item" :class="{ error: emailError }">
            <input 
              v-model="email" 
              :placeholder="isChangeMode ? '请输入新邮箱地址' : '请输入邮箱地址'" 
              placeholder-class="ph-style"
              class="xhs-input"
              type="text"
              @input="resetErrors"
            />
          </view>
          <text class="error-text" v-if="emailError">{{ emailError }}</text>

    
          <view class="input-item code-item" :class="{ error: codeError }">
            <input 
              v-model="code" 
              placeholder="请输入6位验证码" 
              placeholder-class="ph-style"
              class="xhs-input"
              type="number"
              maxlength="6"
              @input="resetErrors"
            />
            <view class="line"></view>
            <view 
              class="code-btn" 
              :class="{ disabled: !isEmailValid || codeCountdown > 0 || isSendingCode }"
              @click="getEmailCode"
            >
              {{ codeBtnText }}
            </view>
          </view>
          <text class="error-text" v-if="codeError">{{ codeError }}</text>

          
          <button 
            class="xhs-btn primary-btn" 
            :class="{ disabled: !canSubmit || isSubmitting }"
            @click="submitAction"
          >
            {{ isSubmitting ? '正在提交...' : (isChangeMode ? '确认更换' : '立即绑定') }}
          </button>

          <view class="cancel-text" v-if="isChangeMode" @click="cancelChangeMode">取消更换</view>
          <view class="cancel-text" v-if="fromLogin && !isChangeMode" @click="skipEmailBind">稍后再绑定</view>
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
      isBound: false,
      isChangeMode: false,
      currentEmail: '',
      fromLogin: false,

      email: '',
      code: '',
      
      emailError: '',
      codeError: '',
      
      isSendingCode: false,
      isSubmitting: false,
      
      codeCountdown: 0,
      timer: null
    };
  },
  computed: {
    isEmailValid() {
      const reg = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      return this.email.trim().length > 0 && reg.test(this.email.trim());
    },
    codeBtnText() {
      if (this.isSendingCode) return '发送中...';
      if (this.codeCountdown > 0) return `${this.codeCountdown}s 后重试`;
      return '获取验证码';
    },
    canSubmit() {
      return this.isEmailValid && this.code.length === 6 && !this.isSendingCode;
    }
  },
  onLoad(options) {
    this.fromLogin = !!(options && options.fromLogin);
    this.checkStatus();
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },
  methods: {
    goBack() {
      if (this.fromLogin) {
        uni.setStorageSync('_forceRefreshHome', '1');
        uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
      } else {
        uni.navigateBack();
      }
    },
    
    resetErrors() {
      this.emailError = '';
      this.codeError = '';
    },

    async checkStatus() {
      try {
        const u = uni.getStorageSync('userInfo');
        if (!u || !u.id) return;
        const res = await request('user.php', { action: 'getUserInfo', userId: u.id });
        if (res.code === 0 && res.data.email) {
          this.isBound = true;
          this.currentEmail = res.data.email;
        } else {
          this.isBound = false;
        }
      } catch (e) {}
    },

    async getEmailCode() {
      if (!this.isEmailValid || this.codeCountdown > 0 || this.isSendingCode) return;
      
      if (this.isChangeMode && this.email.trim() === this.currentEmail) {
        this.emailError = '新邮箱不能与当前邮箱一致';
        return;
      }

      this.isSendingCode = true;
      try {
        const res = await request('user.php', {
          action: 'sendEmailCode',
          email: this.email.trim()
        });

        if (res.code === 0) {
          if (res.data && res.data.test_mode) {
            this.emailError = res.msg || '邮件发送失败，请检查SMTP配置';
          } else {
            uni.showToast({ title: '验证码已发送', icon: 'none' });
            this.codeCountdown = 60;
            this.timer = setInterval(() => {
              if (this.codeCountdown > 0) this.codeCountdown--;
              else { clearInterval(this.timer); this.timer = null; }
            }, 1000);
          }
        } else {
          this.emailError = res.msg;
        }
      } catch (e) {
        this.emailError = '网络请求失败，请检查网络';
      } finally {
        this.isSendingCode = false;
      }
    },

    async submitAction() {
      if (!this.canSubmit || this.isSubmitting) return;
      
      this.isSubmitting = true;
      try {
        const action = this.isChangeMode ? 'changeEmail' : 'bindEmail';
        const res = await request('user.php', {
          action: action,
          email: this.email.trim(),
          verifyCode: this.code.trim()
        });

        if (res.code === 0) {
          uni.showToast({ title: '绑定成功', icon: 'success' });
          const u = uni.getStorageSync('userInfo') || {};
          u.email = this.email.trim();
          uni.setStorageSync('userInfo', u);
          
          this.currentEmail = u.email;
          this.isBound = true;
          this.isChangeMode = false;
          this.email = '';
          this.code = '';
          if (this.timer) clearInterval(this.timer);
          this.codeCountdown = 0;
          if (this.fromLogin) {
            setTimeout(() => {
              uni.setStorageSync('_forceRefreshHome', '1');
              uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
            }, 1200);
          }
        } else {
          if (res.msg.includes('验证码')) this.codeError = res.msg;
          else this.emailError = res.msg;
        }
      } catch (e) {
        uni.showToast({ title: '提交失败，请重试', icon: 'none' });
      } finally {
        this.isSubmitting = false;
      }
    },

    skipEmailBind() {
      uni.setStorageSync('_forceRefreshHome', '1');
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
    },

    switchToChangeMode() {
      this.isChangeMode = true; 
      this.email=''; this.code=''; this.resetErrors(); 
    },
    cancelChangeMode() { 
      this.isChangeMode = false; 
      this.email=''; this.code=''; this.resetErrors(); 
    }
  }
};
</script>

<style scoped>
.xhs-bind-container {
  min-height: 100vh;
  background-color: var(--cr-surface);
  display: flex;
  flex-direction: column;
}

.custom-nav {
  height: 88rpx;
  margin-top: var(--status-bar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  background: var(--cr-surface);
}
.back-arrow { width: 44rpx; height: 44rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: var(--cr-text); }
.nav-right { width: 44rpx; }

.content-body {
  padding: 60rpx 40rpx;
  flex: 1;
}

.header-text { margin-bottom: 80rpx; }
.h1 { font-size: 48rpx; font-weight: 600; color: var(--cr-text); margin-bottom: 16rpx; }
.h2 { font-size: 26rpx; color: var(--cr-text-muted); }

.input-item {
  height: 100rpx;
  background: var(--cr-surface-alt);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  padding: 0 40rpx;
  margin-bottom: 10rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}
.input-item.error { border-color: #ff2442; background: #fff5f6; }

.xhs-input {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  color: var(--cr-text);
}
.ph-style { color: var(--cr-border-strong); }

.code-item { padding-right: 30rpx; }
.line { width: 2rpx; height: 32rpx; background: #ddd; margin: 0 24rpx; }
.code-btn {
  font-size: 28rpx;
  color: #ff2442;
  font-weight: 500;
  white-space: nowrap;
}
.code-btn.disabled { color: var(--cr-border-strong); }

.error-text {
  font-size: 24rpx;
  color: #ff2442;
  margin-left: 40rpx;
  margin-bottom: 30rpx;
  display: block;
}

.xhs-btn {
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  margin-top: 60rpx;
}
.xhs-btn::after { border: none; }
.primary-btn {
  background: #ff2442;
  color: #fff;
}
.primary-btn:active { background: #e0203a; }
.primary-btn.disabled {
  background: #ffb4c0;
  box-shadow: none;
  color: rgba(255,255,255,0.8);
}

.outline-btn {
  background: var(--cr-surface);
  border: 2rpx solid var(--cr-border);
  color: var(--cr-text);
  width: 240rpx;
  height: 80rpx;
  line-height: 76rpx;
  font-size: 28rpx;
  margin-top: 60rpx;
}

.cancel-text {
  text-align: center;
  color: var(--cr-text-muted);
  font-size: 28rpx;
  margin-top: 40rpx;
}

.bound-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100rpx;
}
.app-logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  margin-bottom: 40rpx;
  border: 2rpx solid var(--cr-border);
}
.bound-title { font-size: 30rpx; color: var(--cr-text-muted); margin-bottom: 16rpx; }
.bound-email { font-size: 44rpx; color: var(--cr-text); font-weight: bold; margin-bottom: 30rpx; }
.safe-tag {
  background: #eafff6;
  color: #00b386;
  font-size: 24rpx;
  padding: 8rpx 24rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
}
.shield-icon { margin-right: 8rpx; width: 24rpx; height: 24rpx; vertical-align: middle; }
</style>