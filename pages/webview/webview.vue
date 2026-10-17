<template>
  <view class="webview-box">

    <view class="nav-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="back-btn" @click="goBack">×</view>
      <text class="title">{{ title }}</text>
    </view>

    <web-view 
      :src="url" 
      :webview-styles="webviewStyles"
      @message="handleMessage"
    ></web-view>
  </view>
</template>

<script>
import { parseOauthCallbackUrl, saveOauthCallback } from '../../common/oauthCallback.js'

export default {
  data() {
    return {
      url: '',
      pendingLoginUrl: '',
      urlObserverInstalled: false,
      urlObserverTimer: null,
      title: 'VCYWEB',
      isLogin: false,
      callbackHandled: false,
      statusBarHeight: 20,
      webviewStyles: {
        progress: {
          color: '#ff2442'
        }
      }
    }
  },
  onLoad(options) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight;
    this.isLogin = options.isLogin === '1';

    if (options.url) {
      let targetUrl = String(options.url);
      try {
        targetUrl = decodeURIComponent(targetUrl);
      } catch (e) {}

      // Reject a raw-token callback before the native WebView can load it and
      // expose the credential to the callback page or its subresources.
      if (this.isLogin && parseOauthCallbackUrl(targetUrl)?.token) {
        this.callbackHandled = true;
        uni.showToast({ title: '登录回调缺少有效会话校验', icon: 'none' });
        setTimeout(() => { uni.navigateBack(); }, 1200);
        return;
      }

      if (this.isLogin) {
        this.pendingLoginUrl = targetUrl;
        // #ifdef APP-PLUS
        // Start on a local blank document; the remote authorization URL is
        // assigned only after the native navigation filter is installed.
        this.url = 'about:blank';
        this.startUrlObserver();
        // #endif
        // #ifndef APP-PLUS
        this.url = targetUrl;
        // #endif
      } else {
        this.url = targetUrl;
      }
    }

  },
  onUnload() {
    if (this.urlObserverTimer) clearTimeout(this.urlObserverTimer);
  },
  methods: {
    handleMessage() {},

    goBack() {
      uni.navigateBack();
    },

    startUrlObserver() {
      if (this.urlObserverInstalled) return;

      const pages = getCurrentPages();  
      const page = pages[pages.length - 1];  
      const currentWebview = page.$getAppWebview();
      

      const childWebview = currentWebview.children()[0];

      if (!childWebview) {

        this.urlObserverTimer = setTimeout(() => { this.startUrlObserver() }, 200);
        return;
      }
      // Reject token-bearing navigations before they load in the WebView.
      // Keep this observer limited to login flows so ordinary external pages
      // can continue to use their own query parameters.
      const tokenParamPattern = '.*[?&#](?:[Tt]|%54|%74)(?:[Oo]|%4[Ff]|%6[Ff])(?:[Kk]|%4[Bb]|%6[Bb])(?:[Ee]|%45|%65)(?:[Nn]|%4[Ee]|%6[Ee])=.*';
      childWebview.overrideUrlLoading({ mode: 'reject', match: tokenParamPattern }, (e) => {
        this.checkLoginCallback(e.url);
      });
      this.urlObserverInstalled = true;

      childWebview.addEventListener("loaded", () => {
        const currentUrl = childWebview.getURL();
        this.checkLoginCallback(currentUrl);
      });

      const targetUrl = this.pendingLoginUrl;
      this.pendingLoginUrl = '';
      if (targetUrl) this.url = targetUrl;
    },

    checkLoginCallback(url) {
      if (!url) return false;
      if (this.callbackHandled) return true;
      const payload = parseOauthCallbackUrl(url);

      if (this.isLogin && payload) {
        const token = payload.token;
        const error = payload.loginError;

        if (token) {
          this.callbackHandled = true;
          uni.showToast({ title: '登录回调缺少有效会话校验', icon: 'none' });
          setTimeout(() => { uni.navigateBack(); }, 1200);
          return true;
        } 
        else if (error) {
          this.callbackHandled = true;
          saveOauthCallback(payload);
        
          uni.showToast({ title: error, icon: 'none' });
          setTimeout(() => { uni.navigateBack(); }, 1500);
          return true;
        }
      }

  
      if (!this.isLogin && payload) {
          const bindSuccess = payload.bindSuccess;
          const bindError = payload.bindError;

          if (bindSuccess) {
              this.callbackHandled = true;
              saveOauthCallback(payload);
              uni.showToast({ title: '绑定成功', icon: 'success' });
             
              const pages = getCurrentPages();
              if (pages.length > 1) {
                  const prevPage = pages[pages.length - 2];
                  if (prevPage.$vm.initData) prevPage.$vm.initData(); 
              }
          } else if (bindError) {
              this.callbackHandled = true;
              saveOauthCallback(payload);
              uni.showToast({ title: bindError, icon: 'none' });
          }
          setTimeout(() => { uni.navigateBack(); }, 1000);
          return true;
      }

      return false;
    },

    getQueryParam(url, name) {
      const reg = new RegExp("(^|&|\\?)" + name + "=([^&]*)(&|$)");
      const r = url.match(reg);
      if (r != null) return unescape(r[2]); 
      return null;
    }
  }
}
</script>

<style scoped>
.webview-box {
  width: 100%;
  height: 100vh;
  background-color: #fff;
  position: relative;
}

.nav-header {
  position: fixed;
  top: 0; left: 0; width: 100%;
  height: 44px;
  background: #fff;
  z-index: 999;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 5px rgba(0,0,0,0.1);
}
.back-btn {
  width: 44px; height: 44px;
  font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  color: #333;
}
.title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
</style>
