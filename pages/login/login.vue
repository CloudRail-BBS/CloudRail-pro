<template>
  <view class="xhs-login">
    <view class="logo-box">
      <image src="/static/logo.png" mode="aspectFit" class="logo-img" />
    </view>

    <view class="main-con">
      <view class="text-header">
        <text class="h1">登录后更精彩</text>
        <text class="h2">探索你感兴趣的生活方式</text>
      </view>

      <!-- 注册账号 + 账号密码登录（顺序已调换） -->
      <view v-if="!showForm && !showPhoneForm" class="quick-login-box">
        <button class="xhs-btn register-btn" @click="goRegister">注册账号</button>
        <button class="xhs-btn login-btn" @click="showForm = true">账号密码登录</button>
        <button class="xhs-btn guest-btn" @click="enterGuestMode">游客模式</button>
      </view>

      <view v-if="showForm && !showPhoneForm" class="form-box fade-in">
        <view class="input-group" :class="{ active: focusUser }">
          <input
            type="text"
            v-model="username"
            placeholder="请输入用户名/邮箱"
            placeholder-class="ph-style"
            @focus="focusUser = true"
            @blur="focusUser = false"
            @input="filterInput"
            class="xhs-input"
          />
          <view v-if="username" class="clear-icon" @click="username = ''">×</view>
        </view>

        <view class="input-group" :class="{ active: focusPwd }">
          <input
            type="password"
            v-model="password"
            placeholder="请输入密码"
            placeholder-class="ph-style"
            @focus="focusPwd = true"
            @blur="focusPwd = false"
            class="xhs-input"
          />
        </view>

        <view class="action-links">
          <text @click="goForgetPwd">忘记密码?</text>
        </view>

        <button class="xhs-btn" :class="{ disabled: !canSubmit }" @click="handleLogin" :disabled="!canSubmit">
          <text>登录</text>
        </button>

        <view class="register-row">
          <text class="reg-tip">还没有账号？</text>
          <text class="reg-btn" @click="goRegister">立即注册</text>
        </view>
      </view>

      <view v-if="showPhoneForm" class="form-box fade-in">
        <view class="input-group" :class="{ active: focusPhone }">
          <input
            type="number"
            v-model="phone"
            placeholder="请输入手机号"
            placeholder-class="ph-style"
            maxlength="11"
            @focus="focusPhone = true"
            @blur="focusPhone = false"
            class="xhs-input"
          />
          <view v-if="phone" class="clear-icon" @click="phone = ''">×</view>
        </view>

        <view class="input-group sms-group" :class="{ active: focusSmsCode }">
          <input
            type="number"
            v-model="smsCode"
            placeholder="请输入验证码"
            placeholder-class="ph-style"
            maxlength="6"
            @focus="focusSmsCode = true"
            @blur="focusSmsCode = false"
            class="xhs-input sms-input"
          />
          <view class="sms-btn" :class="{ 'sms-btn-disabled': !canSendSms || smsCooldown > 0 }" @click="handleSendSms">
            <text>{{ smsCooldown > 0 ? smsCooldown + 's' : '获取验证码' }}</text>
          </view>
        </view>

        <view class="action-links">
          <text @click="switchToAccountLogin">使用账号密码登录</text>
        </view>

        <button class="xhs-btn" :class="{ disabled: !canPhoneSubmit }" @click="handlePhoneLogin" :disabled="!canPhoneSubmit">
          <text>登录/注册</text>
        </button>

        <view class="register-row">
          <text class="reg-tip phone-tip">未注册的手机号将自动创建账号</text>
        </view>
      </view>

      <view class="social-login-box">
        <view class="divider">
          <view class="line"></view>
          <text class="text">其他登录方式</text>
          <view class="line"></view>
        </view>

        <view class="social-icons">
          <view class="icon-item" @click="handleSocialLogin('qq')">
            <image src="/static/icon/qq.png" class="s-icon"></image>
            <text>QQ</text>
          </view>
          <view class="icon-item" @click="handleWxLogin">
            <image src="/static/icon/wx.png" class="s-icon"></image>
            <text>微信</text>
          </view>
          <view class="icon-item" @click="switchToPhoneLogin">
            <image src="/static/icon/phone.png" class="s-icon"></image>
            <text>手机号</text>
          </view>
          <view v-if="pinhaoEnabled" class="icon-item" @click="handlePinhaoLogin">
            <image src="/static/icon/pinhao.jpg" class="s-icon"></image>
            <text>拼好社</text>
          </view>
        </view>
      </view>

      <view class="kefu-row" @click="goKefu">
        <text>遇到问题？联系客服</text>
      </view>
    </view>

    <view class="hud-overlay" v-if="hud.visible" :class="{ 'hud-mask-show': hud.isModal }">
      <view class="hud-box fade-zoom-in">
        <view v-if="hud.type === 'loading'" class="hud-loading">
          <view class="spinner"></view>
        </view>
        <view v-else class="hud-icon-wrap">
          <icon v-if="hud.type === 'success'" type="success_no_circle" size="40" color="#fff"/>
          <icon v-if="hud.type === 'error'" type="cancel" size="40" color="#fff"/>
          <text v-if="hud.type === 'warn'" class="warn-symbol">!</text>
        </view>
        <text class="hud-text">{{ hud.message }}</text>
        <view v-if="hud.isModal" class="hud-modal-btn" @click="hideHud">知道了</view>
      </view>
    </view>

    <view v-if="oauthQr.visible" class="oauth-mask" @click="closeOauthQr">
      <view class="oauth-box" @click.stop>
        <text class="oauth-title">微信扫码登录</text>
        <image
          v-if="oauthQr.qrcode"
          :src="oauthQr.qrcode"
          class="oauth-qrcode"
          mode="aspectFit"
        />
        <iframe
          v-else
          class="oauth-iframe"
          :src="oauthQr.iframeUrl"
          frameborder="0"
        ></iframe>
        <view class="oauth-actions">
          <button class="oauth-btn ghost" @click="closeOauthQr">关闭</button>
          <button class="oauth-btn" @click="openOauthUrl" :disabled="!oauthQr.url">继续登录</button>
        </view>
        <text class="oauth-tip">如二维码无法显示，请点“继续登录”跳转授权页</text>
      </view>
    </view>

  </view>
</template>

<script>
import { request, baseUrl, getKefuUrl } from '../../common/request.js'
import { WEB_BASE } from '../../common/config.js'
import { isLoggedIn, setAuth } from '../../common/auth.js'
import { buildSecureOAuthCallbackUrl, createOAuthState } from '../../common/oauthCallback.js'
import LYBAuth from '../../utils/lyb-auth-uni.js'

export default {
  data() {
    return {
      username: '',
      password: '',
      focusUser: false,
      focusPwd: false,
      showForm: false,
      redirected: false,
      addMode: false,

      showPhoneForm: false,
      phone: '',
      smsCode: '',
      focusPhone: false,
      focusSmsCode: false,
      smsCooldown: 0,
      smsTimer: null,
      smsSending: false,

      hud: { visible: false, type: 'loading', message: '', isModal: false },

      oauthQr: {
        visible: false,
        qrcode: '',
        iframeUrl: '',
        url: ''
      },
      kefuLink: '',
      oauthEnabled: null,
      pinhaoWv: null,
      pinhaoPollTimer: null,
      pinhaoEnabled: true,
      pinhaoAppid: '10007',
      pinhaoOauthUrl: 'https://example.com',
      pinhaoLoading: false,
      pinhaoConfig: {
        client_id: '10007',
        redirect_uri: '',
        authorize_url: 'https://example.com/oauth/authorize.php',
        token_url: 'https://example.com/oauth/token.php',
        app_name: 'CloudRail-pro'
      }
    }
  },

  computed: {
    canSubmit() {
      return this.username.trim().length > 0 && this.password.length >= 1
    },
    isPhoneValid() {
      return /^1[3-9]\d{9}$/.test(this.phone.trim())
    },
    canSendSms() {
      return this.isPhoneValid && !this.smsSending
    },
    canPhoneSubmit() {
      return this.isPhoneValid && /^\d{6}$/.test(this.smsCode.trim())
    }
  },

  onLoad(options) {
    if ((options && options.add === '1') || uni.getStorageSync('login_add_mode') === '1') {
      this.addMode = true;
      try { uni.removeStorageSync('login_add_mode'); } catch (e) {}
    }
    if (options && options.loginError) this.showHud('error', decodeURIComponent(options.loginError), true);
    this.checkPinhaoCallback(options);
    this.checkOauthStatus();
    this.loadPinhaoConfig();
  },

  onShow() {
    if (!this.addMode && !this.redirected && isLoggedIn()) {
      this.redirected = true;
      uni.reLaunch({ url: '/pages/index/index' });
    }
    uni.$on('global_login_fail', (data) => {
      this.showHud('error', data.msg, true);
    });
    this.restoreSmsCooldown();
  },

  onHide() {
    uni.$off('global_login_fail');
  },

  onUnload() {
    this._closePinhaoWv();
    uni.$off('global_login_fail');
    if (this.smsTimer) {
      clearInterval(this.smsTimer);
      this.smsTimer = null;
    }
  },

  methods: {
    filterInput(e) {
      this.username = e.detail.value.trim();
    },

    showHud(type, message, isModal) {
      if (typeof isModal === 'undefined') isModal = false;
      this.hud = { visible: true, type, message, isModal };
      if (!isModal && type !== 'loading') setTimeout(() => this.hideHud(), 1500);
    },

    // 将QQ头像转换为高清版本
    convertToHighQualityAvatar(avatarUrl) {
      if (!avatarUrl) return avatarUrl;
      // QQ头像URL通常包含大小参数，如 /100 表示100x100像素
      // 替换为大尺寸头像
      return avatarUrl.replace(/\/(\d+)\/?$/, '/400/');
    },

    hideHud() {
      this.hud.visible = false;
    },

    switchToPhoneLogin() {
      this.showForm = false;
      this.showPhoneForm = true;
    },

    switchToAccountLogin() {
      this.showPhoneForm = false;
      this.showForm = true;
    },

    startSmsCooldown() {
      this.smsCooldown = 60;
      try { uni.setStorageSync('sms_cooldown_end', Date.now() + 60 * 1000); } catch (e) {}
      if (this.smsTimer) clearInterval(this.smsTimer);
      this.smsTimer = setInterval(() => {
        this.smsCooldown--;
        if (this.smsCooldown <= 0) {
          this.smsCooldown = 0;
          clearInterval(this.smsTimer);
          this.smsTimer = null;
          try { uni.removeStorageSync('sms_cooldown_end'); } catch (e) {}
        }
      }, 1000);
    },

    restoreSmsCooldown() {
      try {
        var endTime = uni.getStorageSync('sms_cooldown_end');
        if (!endTime) return;
        var remaining = Math.ceil((endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          uni.removeStorageSync('sms_cooldown_end');
          return;
        }
        this.smsCooldown = remaining;
        if (this.smsTimer) clearInterval(this.smsTimer);
        this.smsTimer = setInterval(() => {
          this.smsCooldown--;
          if (this.smsCooldown <= 0) {
            this.smsCooldown = 0;
            clearInterval(this.smsTimer);
            this.smsTimer = null;
            try { uni.removeStorageSync('sms_cooldown_end'); } catch (e) {}
          }
        }, 1000);
      } catch (e) {}
    },

    handleSendSms() {
      if (!this.canSendSms || this.smsCooldown > 0) return;
      var phoneVal = this.phone.trim();
      if (!/^1[3-9]\d{9}$/.test(phoneVal)) {
        this.showHud('warn', '请输入正确的手机号');
        return;
      }
      this.smsSending = true;
      this.showHud('loading', '发送中...');
      request('user.php', { action: 'sendPhoneSmsCode', phone: phoneVal })
        .then((res) => {
          this.smsSending = false;
          if (res.code === 0) {
            var testCode = res.data && res.data.test_code;
            if (testCode) {
              this.smsCode = String(testCode);
              this.showHud('success', '验证码 ' + testCode + '（测试模式已自动填入）');
            } else {
              this.showHud('success', '验证码已发送');
            }
            this.startSmsCooldown();
          } else {
            this.showHud('error', res.msg || '发送失败', true);
          }
        })
        .catch(() => {
          this.smsSending = false;
          this.showHud('error', '网络连接超时');
        });
    },

    handlePhoneLogin() {
      if (!this.canPhoneSubmit) return;
      var phoneVal = this.phone.trim();
      var codeVal = this.smsCode.trim();
      this.showHud('loading', '登录中...');
      request('user.php', { action: 'phoneLogin', phone: phoneVal, verifyCode: codeVal })
        .then((res) => {
          if (res.code === 0) {
            setAuth((res.data && res.data.user) || res.data, res.data.token);
            this.showHud('success', '登录成功');
            if (res.data && !res.data.email) {
              setTimeout(() => uni.navigateTo({ url: '/pages/user/email?fromLogin=1' }), 800);
            } else {
              setTimeout(() => {
                uni.setStorageSync('_forceRefreshHome', '1');
                uni.reLaunch({ url: '/pages/index/index' });
              }, 800);
            }
          } else {
            var isBan = res.msg && res.msg.indexOf('封禁') !== -1;
            this.showHud('error', res.msg || '登录失败', isBan);
          }
        })
        .catch(() => {
          this.showHud('error', '网络连接超时');
        });
    },

    handleSocialLogin(type) {
      // 使用uniapp官方OAuth登录
      if (type === 'qq') {
        this.handleQqLogin()
      } else {
        this.showHud('warn', '暂不支持该登录方式', true)
      }
    },

    handleWxLogin() {
      // 使用uniapp官方微信登录
      this.handleWechatLogin()
    },

    // 微信登录（使用uniapp官方API）
    handleWechatLogin() {
      // #ifdef APP-PLUS
      // 检测是否安装微信客户端
      if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.isApplicationExist) {
        var checkDone = false
        var checkTimer = setTimeout(() => {
          if (!checkDone) { checkDone = true; this._doWxLogin() }
        }, 800)
        try {
          plus.runtime.isApplicationExist({ pname: 'com.tencent.mm', action: 'weixin://' }, (installed) => {
            if (checkDone) return
            checkDone = true
            clearTimeout(checkTimer)
            if (!installed) {
              this.showHud('error', '未安装微信客户端，无法使用微信登录', true)
              return
            }
            this._doWxLogin()
          })
        } catch (e) {
          if (!checkDone) { checkDone = true; clearTimeout(checkTimer); this._doWxLogin() }
        }
      } else {
        this._doWxLogin()
      }
      // #endif
      // #ifdef H5
      // H5端直接跳转到微信授权页
      const state = this.createH5OAuthState()
      if (!state) return
      const callbackUrl = window.location.origin + '/API/oauth.php?action=callback&type=wx'
      const authUrl = 'https://open.weixin.qq.com/connect/qrconnect?' +
        'appid=' + encodeURIComponent('wx737f0ab51bf66a2f') +
        '&redirect_uri=' + encodeURIComponent(callbackUrl) +
        '&response_type=code&scope=snsapi_login&state=' + encodeURIComponent(state)
      window.location.href = authUrl
      // #endif
      // #ifdef MP-WEIXIN
      this.showHud('loading', '微信授权中...')
      uni.login({
        provider: 'weixin',
        success: (loginRes) => {
          uni.getUserProfile({
            desc: '用于完善会员资料',
            success: (infoRes) => {
              this.oauthLogin('wx', loginRes.code, infoRes.userInfo)
            },
            fail: () => {
              this.showHud('error', '请授权用户信息', true)
            }
          })
        },
        fail: () => {
          this.showHud('error', '微信登录失败', true)
        }
      })
      // #endif
    },

    // APP端微信登录实际执行
    _doWxLogin() {
      this.showHud('loading', '微信授权中...')
      uni.login({
        provider: 'weixin',
        success: (loginRes) => {
          // 获取用户信息
          uni.getUserInfo({
            provider: 'weixin',
            success: (infoRes) => {
              // 微信openid可能在authResult中
              var rawOpenId = ''
              if (loginRes) {
                rawOpenId = loginRes.openid || loginRes.openId || ''
                if (!rawOpenId && loginRes.authResult) {
                  rawOpenId = loginRes.authResult.openid || loginRes.authResult.openId || loginRes.authResult.unionid || ''
                }
              }
              const userInfoWithOpenId = {
                ...infoRes.userInfo,
                openid: rawOpenId
              }
              this.oauthLogin('wx', loginRes.code, userInfoWithOpenId)
            },
            fail: () => {
              this.showHud('error', '获取用户信息失败', true)
            }
          })
        },
        fail: (err) => {
          let msg = '微信登录失败'
          if (err && err.errMsg && err.errMsg.indexOf('not installed') >= 0) {
            msg = '未安装微信客户端'
          } else if (err && err.errMsg && (err.errMsg.indexOf('not configured') >= 0 || err.errMsg.indexOf('未配置') >= 0)) {
            msg = '微信SDK未配置，请在HBuilderX云打包时勾选微信登录模块'
          }
          this.showHud('error', msg, true)
        }
      })
    },

    enterGuestMode() {
      uni.setStorageSync('guest_mode', '1')
      uni.reLaunch({ url: '/pages/index/index' })
    },

    // QQ登录（使用uniapp官方API）
    handleQqLogin() {
      // #ifdef APP-PLUS
      this.showHud('loading', 'QQ授权中...')
      uni.login({
        provider: 'qq',
        success: (loginRes) => {
          // Android APP: openid 可能在 loginRes.authResult 中
          var rawOpenId = ''
          if (loginRes) {
            rawOpenId = loginRes.openid || loginRes.openId || ''
            if (!rawOpenId && loginRes.authResult) {
              rawOpenId = loginRes.authResult.openid || loginRes.authResult.openId || loginRes.authResult.unionid || ''
            }
          }
          uni.getUserInfo({
            provider: 'qq',
            success: (infoRes) => {
              const userInfoWithOpenId = {
                ...infoRes.userInfo,
                openid: rawOpenId,
                avatarUrl: this.convertToHighQualityAvatar(infoRes.userInfo.avatarUrl)
              }
              this.oauthLogin('qq', loginRes.code, userInfoWithOpenId)
            },
            fail: () => {
              const userInfoWithOpenId = {
                openid: rawOpenId
              }
              this.oauthLogin('qq', loginRes.code, userInfoWithOpenId)
            }
          })
        },
        fail: () => {
          this.showHud('error', 'QQ登录失败', true)
        }
      })
      // #endif
      // #ifdef H5
      // H5端直接跳转到QQ授权页
      const state = this.createH5OAuthState()
      if (!state) return
      const callbackUrl = window.location.origin + '/API/oauth.php?action=callback&type=qq'
      const authUrl = 'https://graph.qq.com/oauth2.0/authorize?' +
        'response_type=code&client_id=' + encodeURIComponent('102059855') +
        '&redirect_uri=' + encodeURIComponent(callbackUrl) +
        '&state=' + encodeURIComponent(state) +
        '&scope=get_user_info'
      window.location.href = authUrl
      // #endif
      // #ifdef MP
      this.showHud('warn', '小程序暂不支持QQ登录', true)
      // #endif
    },

    // OAuth登录统一处理
    oauthLogin(type, code, userInfo) {
      this.showHud('loading', '登录中...')
      request('user.php', {
        action: 'oauthLogin',
        type: type,
        code: code,
        userInfo: JSON.stringify(userInfo)
      })
        .then((res) => {
          if (res.code === 0) {
            setAuth((res.data && res.data.user) || res.data, res.data.token)
            this.showHud('success', '登录成功')
            if (res.data && !res.data.email) {
              setTimeout(() => uni.navigateTo({ url: '/pages/user/email?fromLogin=1' }), 800)
            } else {
              setTimeout(() => {
                uni.setStorageSync('_forceRefreshHome', '1')
                uni.reLaunch({ url: '/pages/index/index' })
              }, 800)
            }
          } else {
            var isBan = res.msg && res.msg.indexOf('封禁') !== -1
            this.showHud('error', res.msg || '登录失败', isBan)
          }
        })
        .catch(() => {
          this.showHud('error', '网络连接超时')
        })
    },

    createH5OAuthState() {
      try {
        return createOAuthState()
      } catch (e) {
        this.showHud('error', '当前浏览器无法安全发起第三方登录', true)
        return ''
      }
    },

    // 拼好社接口响应可能带 UTF-8 BOM, 安全解析 JSON, 避免 App 端解析失败
    _parsePinhaoBody(res) {
      let body = res && res.data
      if (typeof body === 'string') {
        body = body.replace(/^\uFEFF/, '').trim()
        try { body = JSON.parse(body) } catch (e) { return null }
      }
      return (body && typeof body === 'object') ? body : null
    },

    async loadPinhaoConfig() {
      try {
        const res = await request('system/settings', {}, { method: 'GET' })
        if (res && res.code === 0 && res.data) {
          this.pinhaoEnabled = parseInt(res.data.pinhao_enabled || 0) === 1
          this.pinhaoAppid = res.data.pinhao_appid || ''
          // 后台可能把 pinhao_oauth_url 填成完整接口地址(如 https://example.com/oauth/authorize.php)，
          // 这里统一剥离到根地址，避免拼出 /oauth/authorize.php/oauth/token.php 这类错误 URL
          let oauthUrl = (res.data.pinhao_oauth_url || '').trim()
          oauthUrl = oauthUrl.split(/[?#]/)[0].replace(/\/(oauth\/(authorize|token)\.php|oauth|api\.php)$/i, '').replace(/\/$/, '')
          this.pinhaoOauthUrl = oauthUrl
          
          // ★★★ 同步更新 pinhaoConfig 对象，让SDK用后台配置 ★★★
          if (this.pinhaoEnabled && this.pinhaoAppid && this.pinhaoOauthUrl) {
            this.pinhaoConfig = {
              client_id: this.pinhaoAppid,
              redirect_uri: '',
              authorize_url: this.pinhaoOauthUrl + '/oauth/authorize.php',
              token_url: this.pinhaoOauthUrl + '/oauth/token.php',
              app_name: 'CloudRail-pro'
            }
          } else {
            this.pinhaoEnabled = false
          }
        }
      } catch (e) {
        this.pinhaoEnabled = false
      }
    },

    // 拼好社登录
    handlePinhaoLogin() {
      // ★★★ 先检查配置是否完整 ★★★
      if (!this.pinhaoConfig || !this.pinhaoConfig.client_id) {
        this.showHud('error', '拼好社登录未配置，请联系管理员', true);
        return;
      }
      if (!this.pinhaoConfig.authorize_url || !this.pinhaoConfig.token_url) {
        this.showHud('error', '拼好社OAuth地址未配置', true);
        return;
      }

      // ★★★ 先取消之前的会话，清除缓存 ★★★
      try {
        if (typeof LYBAuth !== "undefined") {
          LYBAuth.cancel();
        }
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem('lyb_oauth_pending');
        }
      } catch (e) {}

      if (this.pinhaoLoading) return;
      this.pinhaoLoading = true;
      
      let redirectUri = '';
      // #ifdef H5
      if (typeof window !== 'undefined') {
        redirectUri = buildSecureOAuthCallbackUrl(WEB_BASE)
        if (!redirectUri) {
          this.pinhaoLoading = false
          this.showHud('error', 'OAuth 回调地址必须配置为 HTTPS', true)
          return
        }
      }
      // #endif
      
      LYBAuth.init({
        platform: 'pinhao',
        client_id: this.pinhaoConfig.client_id,
        redirect_uri: redirectUri,
        authorize_url: this.pinhaoConfig.authorize_url,
        token_url: this.pinhaoConfig.token_url,
        app_name: this.pinhaoConfig.app_name,
        onLogin: (res) => {
          this.pinhaoLoading = false;
          this.handlePinhaoLoginSuccess(res);
        },
        onError: (err, msg) => {
          this.pinhaoLoading = false;
          this.showHud('error', msg || '登录失败，请重试', true);
        }
      });
      
      LYBAuth.login();
    },
    
    handlePinhaoLoginSuccess(res) {
      // res 里只有code，调用后端接口，后端用code换用户信息
      request('auth/pinhao_login', {
        code: res.code
      }, 'POST').then((r) => {
        if (r && r.code === 0 && r.data && r.data.token) {
          try { uni.setStorageSync('token', r.data.token) } catch (e) {}
          try { uni.setStorageSync('userInfo', r.data.user || {}) } catch (e) {}
          this.showHud('success', '登录成功', false);
          setTimeout(() => { uni.reLaunch({ url: '/pages/index/index' }) }, 800);
        } else {
          this.showHud('error', (r && r.message) || '登录失败', true);
        }
      }).catch((e) => {
        this.showHud('error', '登录失败: ' + (e.msg || ''), true);
      });
    },

    // App端: 用code换登录态
    _pinhaoExchangeCode(code) {
      request('auth/pinhao_login', { code: code }, 'POST').then((res) => {
        if (res && res.code === 0 && res.data && res.data.token) {
          try { uni.setStorageSync('token', res.data.token) } catch (e) {}
          try { uni.setStorageSync('userInfo', res.data.user || {}) } catch (e) {}
          this._closePinhaoWv()
          this.showHud('success', '登录成功', false)
          setTimeout(() => { uni.reLaunch({ url: '/pages/index/index' }) }, 800)
        } else {
          this._closePinhaoWv()
          this.showHud('error', (res && res.message) || '登录失败', true)
        }
      }).catch((e) => {
        this._closePinhaoWv()
        this.showHud('error', '登录失败: ' + (e.msg || ''), true)
      })
    },

    // App端: 用code换登录态
    _pinhaoExchangeCode(code) {
      request('auth/pinhao_login', { code: code }, 'POST').then((res) => {
        if (res && res.code === 0 && res.data && res.data.token) {
          try { uni.setStorageSync('token', res.data.token) } catch (e) {}
          try { uni.setStorageSync('userInfo', res.data.user || {}) } catch (e) {}
          this._closePinhaoWv()
          this.showHud('success', '登录成功', false)
          setTimeout(() => { uni.reLaunch({ url: '/pages/index/index' }) }, 800)
        } else {
          this._closePinhaoWv()
          this.showHud('error', (res && res.message) || '登录失败', true)
        }
      }).catch((e) => {
        this._closePinhaoWv()
        this.showHud('error', '登录失败: ' + (e.msg || ''), true)
      })
    },

    // App 端: 拼好社 App 唤起登录 (创建会话 -> 唤起App -> 轮询授权 -> 换取授权码)
    _pinhaoAppLogin(APPID) {
      if (this.pinhaoPollTimer) { clearInterval(this.pinhaoPollTimer); this.pinhaoPollTimer = null }
      const apiBase = this.pinhaoOauthUrl || 'https://oauth.your-domain.com'
      // 1. 通过后端代理创建登录会话
      request('system/pinhao_create', {}, { method: 'POST' }).then((body) => {
          if (!body || body.error !== true || !body.info || !body.info.sid) {
            this.hideHud()
            this.showHud('error', (body && body.info) || '创建拼好社登录会话失败', true)
            return
          }
          const sid = body.info.sid
          // 2. 唤起拼好社 App
          const appScheme = 'pinhao://authorize?sid=' + encodeURIComponent(sid) +
            '&appid=' + encodeURIComponent(APPID) +
            '&app=' + encodeURIComponent('拼好社3.0')
          try {
            plus.runtime.openURL(appScheme, (err) => {
              // App 未安装: 降级到 WebView 授权页
              this._pinhaoFallbackWebview(APPID, sid, apiBase)
            })
          } catch (e) {
            this._pinhaoFallbackWebview(APPID, sid, apiBase)
            return
          }
          // 3. 轮询授权结果
          this._pinhaoPoll(APPID, sid, apiBase)
      }).catch(() => {
        this.hideHud()
        this.showHud('error', '网络错误，无法连接拼好社', true)
      })
    },

    // 轮询拼好社授权状态 (status===2 已授权, -1 会话过期)
    _pinhaoPoll(APPID, sid, apiBase) {
      let count = 0
      const MAX = 200
      this.pinhaoPollTimer = setInterval(() => {
        count++
        if (count > MAX) {
          this._closePinhaoWv()
          this.showHud('error', '授权超时，请重新发起登录', true)
          return
        }
        request('system/pinhao_status', { sid: sid }, { method: 'GET' }).then((body) => {
            if (!body || body.error !== true || !body.info) return
            const status = body.info.status
            if (status === 2) {
              this._closePinhaoWv()
              this._pinhaoGetCode(APPID, sid, apiBase)
            } else if (status === -1) {
              this._closePinhaoWv()
              this.showHud('error', '拼好社登录会话已过期，请重新发起', true)
            }
        }).catch(() => {})
      }, 1500)
    },

    // 用 sid 换取授权码 code, 交给社区后端完成登录 (AppSecret 只在服务端)
    _pinhaoGetCode(APPID, sid, apiBase) {
      request('system/pinhao_code', { sid: sid }, { method: 'GET' }).then((body) => {
          if (body && body.error === true && body.info && body.info.code) {
            const info = body.info || {}
            this._pinhaoExchange(body.info.code, {
              pinhao_uid: info.uid,
              pinhao_name: info.username,
              pinhao_avatar: info.avatar
            })
          } else {
            this._closePinhaoWv()
            this.showHud('error', (body && body.info) || '换取授权码失败，请重试', true)
          }
      }).catch(() => {
          this._closePinhaoWv()
          this.showHud('error', '网络错误，获取授权码失败', true)
      })
    },

    // 降级: 未安装拼好社 App 时, 打开 WebView 授权页
    _pinhaoFallbackWebview(APPID, sid, apiBase) {
      this.showHud('loading', '正在打开拼好社授权...')
      const state = String(sid || '').trim()
      const redirectUri = buildSecureOAuthCallbackUrl(WEB_BASE, state)
      const oauthBase = String(apiBase || this.pinhaoOauthUrl || '').trim().replace(/\/+$/, '')
      if (!state || !redirectUri || !/^https:\/\/[^/?#]+(?:\/[^?#]*)?$/i.test(oauthBase)) {
        this.showHud('error', '登录会话无效，请重新发起授权', true)
        return
      }
      // redirect_uri 携带 sid, 授权页完成授权后会把会话置为 status=2
      const authUrl = oauthBase + '/oauth/authorize.php' +
        '?appid=' + encodeURIComponent(APPID) +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&state=' + encodeURIComponent(state)
      const wv = plus.webview.create(authUrl, 'pinhao_oauth_page', {
        top: 0, bottom: 0,
        backButtonAutoControl: 'close'
      })
      // 授权完成后跳转到回调页, 关闭 WebView, 交由轮询换取授权码并登录(不依赖服务端回连)
      wv.addEventListener('loading', (e) => {
        const url = e.url || ''
        if (url.indexOf('oauth_callback.php') > -1) {
          try { wv.close() } catch (err) {}
          this.pinhaoWv = null
          this.hideHud()
        }
      })
      wv.show()
      this.pinhaoWv = wv
    },

    // 用 code 调用后端换取 token 并登录
    _pinhaoExchange(code, extra = {}) {
      const redirectUri = buildSecureOAuthCallbackUrl(WEB_BASE)
      if (!redirectUri) {
        this._closePinhaoWv()
        this.showHud('error', 'OAuth 回调地址必须配置为 HTTPS', true)
        return
      }
      this.showHud('loading', '登录中...')
      request('user.php', Object.assign({
        action: 'oauthLoginPinhao',
        code: code,
        redirect_uri: redirectUri
      }, extra))
        .then((res) => {
          if (res.code === 0) {
            setAuth((res.data && res.data.user) || res.data, res.data.token)
            this._closePinhaoWv()
            this.showHud('success', '登录成功')
            setTimeout(() => {
              uni.setStorageSync('_forceRefreshHome', '1')
              uni.reLaunch({ url: '/pages/index/index' })
            }, 800)
          } else {
            this._closePinhaoWv()
            const isBan = res.msg && res.msg.indexOf('封禁') !== -1
            this.showHud('error', res.msg || '登录失败', isBan)
          }
        })
        .catch(() => {
          this._closePinhaoWv()
          this.showHud('error', '网络连接超时')
        })
    },

    // 关闭拼好社授权 WebView 并停止轮询
    _closePinhaoWv() {
      if (this.pinhaoPollTimer) { clearInterval(this.pinhaoPollTimer); this.pinhaoPollTimer = null }
      if (this.pinhaoWv) {
        try { this.pinhaoWv.close() } catch (e) {}
        this.pinhaoWv = null
      }
      this.hideHud()
    },

    // 处理拼好社回调参数。未经当前端发起的本地事务绑定的 sid 不参与登录。
    checkPinhaoCallback(options) {
      if (!options) return
      if (options.loginError) this.showHud('error', decodeURIComponent(options.loginError), true)
      if (options.pinhao_sid) this.showHud('error', '登录回调缺少可验证的状态，请重新发起登录', true)
    },

    closeOauthQr() {
      this.oauthQr.visible = false;
      this.oauthQr.qrcode = '';
      this.oauthQr.iframeUrl = '';
      this.oauthQr.url = '';
    },

    openOauthUrl() {
      // #ifdef H5
      if (!this.oauthQr.url) return;
      const state = this.createH5OAuthState()
      if (!state) return
      try {
        const authUrl = new URL(this.oauthQr.url, window.location.origin)
        authUrl.searchParams.set('state', state)
        window.location.href = authUrl.toString()
      } catch (e) {
        this.showHud('error', '第三方登录地址无效', true)
      }
      // #endif
    },

    checkOauthStatus() {
      uni.request({
        url: baseUrl + 'sdk/connect.php?mode=status',
        method: 'GET',
        timeout: 5000,
        success: (res) => {
          const body = res.data || {};
          if (body.code === 0 && body.data) {
            this.oauthEnabled = body.data.enabled !== false;
          }
        },
        fail: () => {}
      });
    },

    handleLogin() {
      if (!this.canSubmit) return;
      this.showHud('loading', '登录中...');
      request('user.php', { action: 'login', account: this.username, username: this.username, password: this.password })
        .then((res) => {
          if (res.code === 0) {
            setAuth((res.data && res.data.user) || res.data, res.data.token);
            this.showHud('success', '登录成功');
            setTimeout(() => {
              uni.setStorageSync('_forceRefreshHome', '1');
              uni.reLaunch({ url: '/pages/index/index' });
            }, 800);
          } else {
            var isBan = res.msg && res.msg.indexOf('封禁') !== -1;
            this.showHud('error', res.msg || '登录失败', isBan);
            if (res.msg && res.msg.indexOf('密码错误') !== -1) this.password = '';
          }
        })
        .catch(() => {
          this.showHud('error', '网络连接超时');
        });
    },

    goRegister() {
      uni.navigateTo({ url: '/pages/register/register' });
    },

    goForgetPwd() {
      uni.navigateTo({ url: '/pages/forget-pwd/forget-pwd' });
    },

    async goKefu() {
      const link = await getKefuUrl()
      this.kefuLink = link
      if (!link) {
        this.showHud('warn', '客服未配置');
        return;
      }
      // #ifdef APP-PLUS
      plus.runtime.openURL(link, (err) => {
          this.showHud('error', '无法打开链接');
      });
      // #endif
      // #ifdef H5
      window.location.href = link;
      // #endif
      // #ifdef MP
      uni.setClipboardData({
          data: link,
          success: () => {
              this.showHud('success', '链接已复制，请在浏览器打开', true);
          }
      });
      // #endif
    }
  }
}
</script>

<style scoped>
.xhs-login { min-height: 100vh; background-color: #ffffff; padding: 0 60rpx; display: flex; flex-direction: column; }
.logo-box { margin-top: 100rpx; margin-bottom: 60rpx; display: flex; justify-content: center; }
.logo-img { width: 160rpx; height: 160rpx; }
.text-header { margin-bottom: 60rpx; text-align: center; }
.h1 { display: block; font-size: 44rpx; color: #333; font-weight: bold; margin-bottom: 16rpx; }
.h2 { font-size: 28rpx; color: #999; }

/* 按钮布局：上下排列 + 间距 + 底部留白 */
.quick-login-box {
  margin-top: 40rpx;
  margin-bottom: 80rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.quick-login-box .xhs-btn {
  width: 100%;
}
/* 注册按钮 = 蓝色 */
.register-btn {
  background-color: #2b4c7e !important;
  box-shadow: 0 8rpx 20rpx rgba(43, 76, 126, 0.2) !important;
}
/* 登录按钮 = 红色（保持原样） */
.login-btn {
  background-color: #ff2442 !important;
  box-shadow: 0 8rpx 20rpx rgba(255, 36, 66, 0.2) !important;
}
.guest-btn {
  background-color: #e8e8e8 !important;
  color: #888 !important;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05) !important;
}

.input-group { background-color: #f6f6f6; border-radius: 44rpx; height: 96rpx; display: flex; align-items: center; padding: 0 40rpx; margin-bottom: 30rpx; border: 2rpx solid transparent; transition: all 0.3s; position: relative; }
.input-group.active { border-color: #ff2442; background-color: #fff; }
.xhs-input { flex: 1; font-size: 30rpx; color: #333; height: 100%; }
.ph-style { color: #ccc; }
.clear-icon { color: #ccc; font-size: 36rpx; padding: 10rpx; margin-right: -10rpx; }
.action-links { display: flex; justify-content: flex-end; margin-bottom: 50rpx; font-size: 26rpx; color: #666; }
.xhs-btn { background-color: #ff2442; color: #fff; border-radius: 48rpx; font-size: 32rpx; font-weight: 600; height: 96rpx; line-height: 96rpx; border: none; box-shadow: 0 8rpx 20rpx rgba(255, 36, 66, 0.2); display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
.xhs-btn::after { border: none; }
.xhs-btn.disabled { background-color: #ffb4c1; box-shadow: none; opacity: 0.8; }
.register-row { margin-top: 40rpx; display: flex; justify-content: center; font-size: 28rpx; }
.reg-tip { color: #999; }
.reg-btn { color: #2b4c7e; margin-left: 10rpx; font-weight: 500; }
.fade-in { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10rpx); } to { opacity: 1; transform: translateY(0); } }
.sms-group { padding-right: 20rpx; }
.sms-input { flex: 1; }
.sms-btn { flex-shrink: 0; background-color: #ff2442; color: #fff; font-size: 24rpx; font-weight: 500; padding: 0 28rpx; height: 60rpx; line-height: 60rpx; border-radius: 30rpx; text-align: center; white-space: nowrap; }
.sms-btn:active { opacity: 0.8; }
.sms-btn-disabled { background-color: #ccc !important; color: #fff; }
.phone-tip { color: #bbb; font-size: 24rpx; }
.social-login-box { margin-top: auto; padding-bottom: 40rpx; }
.divider { display: flex; align-items: center; justify-content: center; margin-bottom: 40rpx; }
.line { width: 100rpx; height: 1rpx; background-color: #eee; }
.text { font-size: 24rpx; color: #999; margin: 0 20rpx; }
.social-icons { display: flex; justify-content: center; gap: 80rpx; }
.icon-item { display: flex; flex-direction: column; align-items: center; }
.s-icon { width: 88rpx; height: 88rpx; background: #f6f6f6; border-radius: 50%; padding: 20rpx; box-sizing: border-box; margin-bottom: 10rpx; }
.icon-item text { font-size: 24rpx; color: #666; }
.kefu-row { margin-top: 30rpx; text-align: center; font-size: 24rpx; color: #999; text-decoration: underline; padding-bottom: 20rpx; }

.hud-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background-color: rgba(0,0,0,0); transition: background-color 0.3s; }
.hud-mask-show { background-color: rgba(0,0,0,0.3); }
.hud-box { background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); padding: 40rpx 50rpx; border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 260rpx; max-width: 500rpx; box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.2); }
.hud-icon-wrap { margin-bottom: 20rpx; }
.spinner { width: 60rpx; height: 60rpx; border: 6rpx solid rgba(255,255,255,0.3); border-top-color: #ffffff; border-radius: 50%; animation: hudSpin 0.8s linear infinite; margin-bottom: 20rpx; }
@keyframes hudSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.warn-symbol { font-size: 60rpx; color: #fff; font-weight: bold; }
.hud-text { color: #ffffff; font-size: 28rpx; text-align: center; line-height: 1.5; max-width: 100%; }
.hud-modal-btn { margin-top: 30rpx; padding: 12rpx 36rpx; background: rgba(255,255,255,0.2); border-radius: 30rpx; color: #fff; font-size: 26rpx; font-weight: 500; }
.hud-modal-btn:active { background: rgba(255,255,255,0.3); }
.fade-zoom-in { animation: zoomIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

.oauth-mask{ position: fixed; left:0; top:0; right:0; bottom:0; z-index: 10000; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; padding: 40rpx; }
.oauth-box{ width: 640rpx; background: #fff; border-radius: 24rpx; padding: 30rpx; box-sizing: border-box; }
.oauth-title{ font-size: 32rpx; font-weight: 600; color:#333; text-align:center; display:block; margin-bottom: 20rpx; }
.oauth-qrcode{ width: 420rpx; height: 420rpx; display:block; margin: 0 auto 20rpx; }
.oauth-iframe{ width: 100%; height: 520rpx; border: 0; border-radius: 16rpx; background: #fafafa; }
.oauth-actions{ display:flex; gap: 20rpx; }
.oauth-btn{ flex:1; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; background: #ff2442; color:#fff; font-size: 28rpx; }
.oauth-btn.ghost{ background: #f4f4f4; color:#333; }
.oauth-tip{ display:block; text-align:center; color:#888; font-size: 24rpx; margin-top: 14rpx; }
</style>
