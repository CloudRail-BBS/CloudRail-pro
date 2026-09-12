<template>
  <view class="xhs-forget-container">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left" @click="goBack">
          <image src="/static/icon/arrow-left-dark.svg" class="nav-icon" mode="aspectFit"></image>
        </view>
        <text class="nav-title">找回密码</text>
        <view class="nav-right"></view> 
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="content-wrapper">
      <view class="step-indicator">
        <view class="step-item" :class="{ active: step >= 1, completed: step > 1 }">
          <view class="step-num">1</view> <text class="step-txt">验证账号</text>
        </view>
        <view class="step-line" :class="{ active: step > 1 }"></view>
        <view class="step-item" :class="{ active: step >= 2, completed: step > 2 }">
          <view class="step-num">2</view> <text class="step-txt">验证邮箱</text>
        </view>
        <view class="step-line" :class="{ active: step > 2 }"></view>
        <view class="step-item" :class="{ active: step >= 3, completed: step > 3 }">
          <view class="step-num">3</view> <text class="step-txt">重置密码</text>
        </view>
      </view>

      <view class="form-area">
        <view v-if="step === 1" class="step-block fade-in">
          <text class="main-title">请输入账号</text>
          <text class="sub-title">支持用户名或邮箱</text>

          <view class="input-group" :class="{ 'input-focus': focusUser, 'input-error': usernameError }">
            <input
              v-model="username"
              type="text"
              placeholder="请输入用户名/邮箱"
              placeholder-class="input-placeholder"
              @focus="focusUser = true"
              @blur="focusUser = false"
              @input="usernameError = ''"
              class="xhs-input"
            />
            <view v-if="username" class="clear-btn" @click.stop="clearUsername">
              <text class="clear-icon">×</text>
            </view>
          </view>
          <text v-if="usernameError" class="error-msg">{{ usernameError }}</text>

          <button
            class="xhs-btn-primary"
            :class="{ disabled: !username || isLoading }"
            :disabled="!username || isLoading"
            @click="checkUsername"
          >
            {{ isLoading ? '验证中...' : '下一步' }}
          </button>
        </view>
        <view v-if="step === 2" class="step-block fade-in">
           <text class="main-title">输入验证码</text>
           <text class="sub-title">验证码已发送至 {{ emailMask }}</text>
           <view class="verify-code-container">
             <view class="input-group" :class="{ 'input-focus': focusCode, 'input-error': codeError }">
               <input v-model="verifyCode" type="number" maxlength="6" placeholder="请输入6位验证码" placeholder-class="input-placeholder" @focus="focusCode = true" @blur="focusCode = false" @input="handleCodeInput" class="xhs-input" />
               <view class="code-btn-wrapper">
                 <text class="get-code-text" :class="{ 'code-disabled': countdown > 0 || isLoading }" @click="getVerifyCode">{{ countdown > 0 ? `${countdown}s后重发` : (codeSent ? '重新发送' : '获取验证码') }}</text>
               </view>
             </view>
             <text v-if="codeError" class="error-msg">{{ codeError }}</text>
           </view>
           <button class="xhs-btn-primary" :class="{ disabled: verifyCode.length !== 6 || isLoading }" :disabled="verifyCode.length !== 6 || isLoading" @click="checkVerifyCode">{{ isLoading ? '验证中...' : '下一步' }}</button>
           <view class="text-btn" @click="prevStep"><text>返回上一步</text></view>
        </view>
        
        <view v-if="step === 3" class="step-block fade-in">
           <text class="main-title">设置新密码</text>
           <text class="sub-title">新密码长度需为 6-20 位</text>
           <view class="input-group" :class="{ 'input-focus': focusPwd, 'input-error': pwdError }">
             <input v-model="newPwd" :type="showPwd ? 'text' : 'password'" maxlength="20" placeholder="请输入新密码" placeholder-class="input-placeholder" @focus="focusPwd = true" @blur="focusPwd = false" @input="checkPwdValid" class="xhs-input" />
             <view class="eye-btn" @click.stop="showPwd = !showPwd"><image v-if="showPwd" src="/static/icon/eye-gray.svg" class="eye-icon" mode="aspectFit"></image><image v-else src="/static/icon/eye-off-gray.svg" class="eye-icon" mode="aspectFit"></image></view>
           </view>
           <text v-if="pwdError" class="error-msg">{{ pwdError }}</text>
           
           <view class="input-group" :class="{ 'input-focus': focusRePwd, 'input-error': rePwdError }">
             <input v-model="rePwd" :type="showRePwd ? 'text' : 'password'" maxlength="20" placeholder="请确认新密码" placeholder-class="input-placeholder" @focus="focusRePwd = true" @blur="focusRePwd = false" @input="checkPwdValid" class="xhs-input" />
             <view class="eye-btn" @click.stop="showRePwd = !showRePwd"><image v-if="showRePwd" src="/static/icon/eye-gray.svg" class="eye-icon" mode="aspectFit"></image><image v-else src="/static/icon/eye-off-gray.svg" class="eye-icon" mode="aspectFit"></image></view>
           </view>
           <text v-if="rePwdError" class="error-msg">{{ rePwdError }}</text>
           
           <button class="xhs-btn-primary" :class="{ disabled: !canSubmit || isLoading }" :disabled="!canSubmit || isLoading" @click="resetPassword">{{ isLoading ? '提交中...' : '确认修改' }}</button>
        </view>
      </view>

      <view class="footer-tips" v-if="step !== 3">
        <text class="tips-text">无法验证？</text>
        <text class="link-text" @click="goKefu">联系客服</text>
      </view>
    </view>

    <view v-if="showSuccess" class="xhs-modal-mask">
      <view class="xhs-modal">
        <view class="modal-icon-wrapper"><image src="/static/icon/check-green.svg" class="modal-icon" mode="aspectFit"></image></view>
        <text class="modal-title">密码重置成功</text>
        <text class="modal-desc">您的密码已更新，请使用新密码登录</text>
        <button class="xhs-modal-btn" @click="goBack">返回登录</button>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      
      step: 1,
      username: '',
      userId: 0,
      email: '',
      emailMask: '',
      verifyCode: '',
      resetToken: '', // 安全令牌
      newPwd: '',
      rePwd: '',
      
      focusUser: false, focusCode: false, focusPwd: false, focusRePwd: false,
      showPwd: false, showRePwd: false,
      usernameError: '', codeError: '', pwdError: '', rePwdError: '',
      isLoading: false, codeSent: false, countdown: 0, timer: null, showSuccess: false,
      
      kefuUrl: 'https://qm.qq.com/q/BDH2RQwhcQ' 
    }
  },

  onLoad() {
    const sysInfo = uni.getSystemInfoSync();
    if (sysInfo.statusBarHeight) {
      this.statusBarHeight = sysInfo.statusBarHeight;
    }
  },

  computed: {
    canSubmit() {
      return (this.newPwd && this.rePwd && this.newPwd === this.rePwd && this.newPwd.length >= 6 && !this.pwdError && !this.rePwdError)
    }
  },
  
  onUnload() { this.clearTimer() },

  methods: {

    async checkUsername() {
      let val = this.username.trim()
      if (!val) { return this.usernameError = '请输入用户名或邮箱' }
    
      if (/^\d{5,12}$/.test(val)) {
        val += '@qq.com'
        this.username = val 
        uni.showToast({title: '已自动识别为QQ邮箱', icon:'none'})
      }

      this.isLoading = true; this.usernameError = ''
      try {
        const res = await request('user.php', { action: 'forget_check_username', username: val })

        if (res.code === 0) {
          let email = res.data?.email || res.email;
          
          if (!email || email === 'null' || email === '') {
           
             if (res.data?.maskedEmail || res.maskedEmail) {
              
                 email = 'placeholder@email.com'; 
             } else {
                 this.usernameError = '该账号未绑定有效邮箱，请联系客服处理';
                 return;
             }
          }
          
          this.userId = parseInt(res.data?.userId || res.userId) || 0;
          this.email = String(email).trim();
          this.emailMask = res.data?.maskedEmail || res.maskedEmail || this.email.replace(/(.{2}).+(.{2}@.+)/, "$1****$2");
          
          this.step = 2;
          uni.showToast({ title: '账号验证成功', icon: 'none' });
          

          setTimeout(() => { this.getVerifyCode() }, 500);
        } else {
          this.usernameError = res.msg || '账号不存在';
        }
      } catch (err) {
        this.usernameError = '网络请求失败，请检查网络';
      } finally {
        this.isLoading = false;
      }
    },


    async getVerifyCode() {
        if(this.countdown > 0 || this.isLoading) return;
        this.isLoading = true; this.codeError = '';
        try{
            const res = await request('user.php', {
                action: 'forget_send_verify_code',
                targetUserId: this.userId,
              
                email: this.email 
            });
            if(res.code === 0){
                this.codeSent = true;
                this.startCountdown();
                uni.showToast({title: '验证码已发送', icon: 'none'});
            } else {
                this.codeError = res.msg || '发送失败，请重试';
            }
        } catch(e){
            this.codeError = '网络错误';
        } finally {
            this.isLoading = false;
        }
    },

    async checkVerifyCode() {
        if(this.verifyCode.length !== 6) return this.codeError = '请输入6位验证码';
        this.isLoading = true; this.codeError = '';
        
        try{
            const res = await request('user.php', {
                action: 'forget_check_verify_code',
                targetUserId: this.userId,
                verifyCode: this.verifyCode
            });
            
            if(res.code === 0){
                this.resetToken = res.data.resetToken;
                if(!this.resetToken) {
                    this.codeError = '安全校验失败，请重试';
                    return;
                }
                this.step = 3;
            } else {
                this.codeError = res.msg || '验证失败';
            }
        } catch(e){
            this.codeError = '网络错误';
        } finally {
            this.isLoading = false;
        }
    },

    async resetPassword() {
        if(!this.canSubmit) return;
        this.isLoading = true;
        
        try{
            const res = await request('user.php', {
                action: 'forget_reset_password',
           
                resetToken: this.resetToken, 
                newPassword: this.newPwd
            });
            
            if(res.code === 0){
                this.showSuccess = true;
            } else {
                uni.showToast({title: res.msg, icon: 'none'});
              
                if(res.msg.includes('过期') || res.msg.includes('非法')) {
                   setTimeout(() => { 
                       this.step = 1; this.username = ''; this.verifyCode = ''; this.resetToken = '';
                   }, 1500);
                }
            }
        } catch(e){
            uni.showToast({title: '网络错误', icon: 'none'});
        } finally {
            this.isLoading = false;
        }
    },

    clearUsername() { this.username = ''; this.usernameError = '' },
    handleCodeInput(e) { this.verifyCode = e.detail.value.replace(/\D/g, '').slice(0, 6); this.codeError = '' },
    checkPwdValid() {
      this.pwdError = ''; this.rePwdError = '';
      if (this.newPwd.length > 0 && this.newPwd.length < 6) this.pwdError = '密码至少6位';
      if (this.rePwd && this.newPwd !== this.rePwd) this.rePwdError = '两次密码不一致';
    },
    startCountdown() { 
        this.countdown = 60; 
        this.clearTimer();
        this.timer = setInterval(() => { 
            this.countdown--; 
            if(this.countdown <= 0) this.clearTimer() 
        }, 1000) 
    },
    clearTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null } },
    
    prevStep() { 
        if (this.step === 2) {
            this.step = 1; this.codeError = ''; this.verifyCode = '';
        }
    },
    goBack() { uni.navigateBack() },
    goKefu() {
      if (!this.kefuUrl) return;
      // #ifdef H5
      window.location.href = this.kefuUrl;
      // #endif
      // #ifndef H5
      const encodedUrl = encodeURIComponent(this.kefuUrl);
      uni.navigateTo({ url: `/pages/webview/webview?url=${encodedUrl}&title=联系客服` });
      // #endif
    }
  }
}
</script>

<style scoped>
:root { --primary-color: #ff2442; --text-main: #333333; --text-sub: #999999; --border-color: #f5f5f5; --bg-color: #ffffff; --input-bg: #f8f8f8; }
.xhs-forget-container { min-height: 100vh; background-color: #ffffff; display: flex; flex-direction: column; }

.nav-bar { 
    width: 100%;
    position: fixed; 
    top: 0; 
    left: 0;
    z-index: 100; 
    background: #fff;
}
.nav-content {
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    height: 44px;
    padding: 0 32rpx; 
}
.nav-left { width: 60rpx; height: 100%; display: flex; align-items: center; }
.nav-icon { width: 40rpx; height: 40rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #333; }
.nav-right { width: 60rpx; }

.content-wrapper { flex: 1; padding: 40rpx 48rpx; display: flex; flex-direction: column; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.step-indicator { display: flex; align-items: center; justify-content: space-between; margin-bottom: 60rpx; }
.step-item { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; }
.step-num { width: 48rpx; height: 48rpx; border-radius: 50%; background-color: #f0f0f0; color: #bbb; font-size: 24rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx; border: 4rpx solid #ffffff; transition: all 0.3s; }
.step-txt { font-size: 20rpx; color: #ccc; transition: all 0.3s; }
.step-item.active .step-num { background-color: #ff2442; color: #ffffff; }
.step-item.active .step-txt { color: #333; font-weight: 500; }
.step-line { flex: 1; height: 4rpx; background-color: #f0f0f0; margin: 0 10rpx; margin-bottom: 30rpx; position: relative; z-index: 1; }
.step-line.active { background-color: #ff2442; }
.form-area { flex: 1; }
.fade-in { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10rpx); } to { opacity: 1; transform: translateY(0); } }
.main-title { font-size: 48rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.sub-title { font-size: 26rpx; color: #999; display: block; margin-bottom: 60rpx; }
.input-group { display: flex; align-items: center; height: 100rpx; background-color: #f8f8f8; border-radius: 50rpx; padding: 0 32rpx; margin-bottom: 24rpx; transition: all 0.3s; border: 2rpx solid transparent; }
.input-focus { background-color: #ffffff; border-color: #ff2442; box-shadow: 0 4rpx 12rpx rgba(255, 36, 66, 0.1); }
.input-error { border-color: #ff4d4f; background-color: #fff0f0; }
.xhs-input { flex: 1; height: 100%; font-size: 30rpx; color: #333; }
.input-placeholder { color: #ccc; }
.clear-btn, .eye-btn { width: 60rpx; height: 100%; display: flex; align-items: center; justify-content: center; }
.clear-icon { font-size: 32rpx; color: #ccc; background: #f0f0f0; width: 32rpx; height: 32rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding-bottom: 2rpx; }
.eye-icon { width: 36rpx; height: 36rpx; }
.error-msg { font-size: 24rpx; color: #ff4d4f; margin-left: 32rpx; margin-bottom: 20rpx; display: block; }

.code-btn-wrapper { 
    padding-left: 20rpx; 
    border-left: 2rpx solid #eee; 
    height: 40rpx; 
    display: flex; 
    align-items: center;
    flex-shrink: 0; /* 防止被挤压 */
    min-width: 140rpx; /* 给一个最小宽度 */
    justify-content: center;
}
.get-code-text { font-size: 26rpx; color: #ff2442; font-weight: 500; white-space: nowrap; }
.code-disabled { color: #ccc; }

.xhs-btn-primary { margin-top: 60rpx; background-color: #ff2442; color: #ffffff; border-radius: 50rpx; height: 96rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 600; border: none; box-shadow: 0 8rpx 20rpx rgba(255, 36, 66, 0.2); transition: all 0.3s; }
.xhs-btn-primary.disabled { background-color: #ffb3bf; box-shadow: none; color: rgba(255, 255, 255, 0.8); }
.xhs-btn-primary:after { border: none; }
.text-btn { margin-top: 30rpx; text-align: center; }
.text-btn text { font-size: 26rpx; color: #999; }
.footer-tips { margin-top: auto; padding-bottom: 40rpx; text-align: center; }
.tips-text { font-size: 24rpx; color: #bbb; }
.link-text { font-size: 24rpx; color: #333; margin-left: 10rpx; font-weight: 500; text-decoration: underline; }
.xhs-modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.xhs-modal { width: 600rpx; background-color: #ffffff; border-radius: 32rpx; padding: 50rpx 40rpx; display: flex; flex-direction: column; align-items: center; animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes modalPop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-icon-wrapper { width: 100rpx; height: 100rpx; border-radius: 50%; background-color: #ebfff0; display: flex; align-items: center; justify-content: center; margin-bottom: 30rpx; }
.modal-icon { width: 50rpx; height: 50rpx; }
.modal-title { font-size: 36rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.modal-desc { font-size: 28rpx; color: #999; text-align: center; margin-bottom: 50rpx; line-height: 1.5; }
.xhs-modal-btn { width: 100%; height: 88rpx; background-color: #ff2442; color: #ffffff; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; }
</style>
