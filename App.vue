<template>
  <view class="app-container">
    <slot></slot>
    <!-- 开屏广告：覆盖全屏，App 启动时由 onLaunch 拉取配置后展示 -->
    <SplashAd ref="splashAd" />
  </view>
</template>

<script>
import { isLoggedIn, setAuth } from '@/common/auth.js'
import { request, normalizeServerMessage } from '@/common/request.js'
import ws from '@/common/ws.js'
import { startOnlineNotify } from '@/common/online-notify.js'
import { applyH5DocumentTitle, setupH5TitleSync } from '@/common/pageTitle.js'
import { parseOauthCallbackUrl, saveOauthCallback, readOauthCallback, clearOauthCallback } from '@/common/oauthCallback.js'
import { saveLevelConfig } from '@/common/level.js'
import { ensureCustomBubbleCss } from '@/common/bubble-style.js'

export default {
  data() {
    return {
      oauthHandling: false,
      updateChecking: false,
      updatePrompting: false,
      updateLastCheckAt: 0,
      updatePromptedCode: 0,
      runtimeConfigCheckedAt: 0,
      globalUnreadCount: 0,
      messagePollingTimer: null,
      isFetchingGlobalUnread: false, // 添加标志防止重复请求
      _unreadRefreshTimer: null
    };
  },

  onLaunch() {
    this.hideNativeTabBar()

    /* 把后台「气泡管理」里写的自定义气泡样式注入到页面(不然自定义气泡不生效) */
    ensureCustomBubbleCss()

    // #ifdef H5
    this.ensureH5DefaultRoute()
    setupH5TitleSync()
    this.preloadHlsJs()
    setTimeout(() => {
      this.handleLaunchRouteGuard()
    }, 160)
    // #endif

    // #ifdef APP-PLUS
    /* 全局竖屏（牌桌不再自动横屏）；基座若按 auto 打包，这里兜住不让页面乱转 */
    try { plus.screen.lockOrientation('portrait-primary') } catch (e) {}
    plus.globalEvent.addEventListener('newintent', () => {
      setTimeout(() => {
        this.checkArguments()
      }, 100)
    })

    plus.globalEvent.addEventListener('handleOpenURL', (e) => {
      const args = (e && (e.url || e.data)) || ''
      if (args) {
        plus.runtime.arguments = args
      }
      setTimeout(() => {
        this.checkArguments()
      }, 100)
    })

    setTimeout(async () => {
      this.checkArguments()
      await this.checkGlobalAppUpdate(true)
      this.handleLaunchRouteGuard()
    }, 120)
    // #endif

    this.syncRuntimeConfig(true)
    this.setupPushListener()
  },

  onShow() {
    this.hideNativeTabBar()
    // #ifdef H5
    applyH5DocumentTitle()
    this.checkH5Login()
    // #endif

    // #ifdef APP-PLUS
    setTimeout(() => {
      this.checkArguments()
    }, 80)

    setTimeout(() => {
      this.consumePendingOauthCallback()
      this.checkGlobalAppUpdate()
    }, 180)
    // #endif

    this.syncRuntimeConfig()
    /* 先注销上一轮注册的监听: onShow 会被多次触发, 不注销会导致监听器累积、未读数被重复累加 */
    if (this._wsUnsubUnread) { this._wsUnsubUnread(); this._wsUnsubUnread = null }
    if (this._wsUnsubChat) { this._wsUnsubChat(); this._wsUnsubChat = null }
    if (this._wsUnsubGroupMsg) { this._wsUnsubGroupMsg(); this._wsUnsubGroupMsg = null }
    if (this._wsUnsubNotif) { this._wsUnsubNotif(); this._wsUnsubNotif = null }
    // 已登录时连接 WebSocket 并获取初始未读数
    if (isLoggedIn()) {
      ws.ensureConnected()
      // 互关好友上线提醒（幂等，内部自己注册 presence_changed 监听）
      startOnlineNotify()
      // 注册 WebSocket 未读数更新回调
      this._wsUnsubUnread = ws.on('unread_update', (data) => {
        this.fetchGlobalUnread()
      })
      // 监听实时消息/通知事件，触发全局未读数刷新（tabBar红点）
      this._wsUnsubChat = ws.on('chat', () => {
        this._scheduleUnreadRefresh()
      })
      this._wsUnsubGroupMsg = ws.on('group_msg', () => {
        this._scheduleUnreadRefresh()
      })
      this._wsUnsubNotif = ws.on('notification', () => {
        this._scheduleUnreadRefresh()
      })
      // 首次启动时随机延迟1-10秒拉取一次未读数
      const delay = 1000 + Math.random() * 9000
      setTimeout(() => {
        this.fetchGlobalUnread()
      }, delay)
    }
    // 监听消息页面发送的未读更新事件（先解绑，避免多次 onShow 重复注册）
    uni.$off('message_unread_updated', this.onUnreadUpdated)
    uni.$on('message_unread_updated', this.onUnreadUpdated)
  },

  /* 在线状态完全交给 WebSocket 连接本身去判断（纯 WS 检测）：
     连接活着 = 在线，连接断了 = 离线，前端不做任何"后台"相关处理。
     App 被划掉或系统挂起后心跳自然停止，服务端 20 秒内判定离线并广播。 */
  onUnload() {
    if (this._unreadRefreshTimer) { clearTimeout(this._unreadRefreshTimer); this._unreadRefreshTimer = null }
    if (this._wsUnsubUnread) { this._wsUnsubUnread(); this._wsUnsubUnread = null }
    if (this._wsUnsubChat) { this._wsUnsubChat(); this._wsUnsubChat = null }
    if (this._wsUnsubGroupMsg) { this._wsUnsubGroupMsg(); this._wsUnsubGroupMsg = null }
    if (this._wsUnsubNotif) { this._wsUnsubNotif(); this._wsUnsubNotif = null }
    uni.$off('message_unread_updated', this.onUnreadUpdated)
  },

  methods: {
    /* 开屏广告：拉配置成功后展示（后台关掉或没配图就不展示） */
    hideNativeTabBar() {
      try {
        uni.hideTabBar({ animation: false, fail: () => {} })
      } catch (e) {}
      setTimeout(() => {
        try {
          uni.hideTabBar({ animation: false, fail: () => {} })
        } catch (e) {}
      }, 300)
      setTimeout(() => {
        try {
          uni.hideTabBar({ animation: false, fail: () => {} })
        } catch (e) {}
      }, 800)
    },

    // #ifdef H5
    preloadHlsJs() {
      if (window.Hls) {
        console.log('HLS.js already loaded')
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js'
      script.onload = () => {
        console.log('HLS.js preloaded successfully')
      }
      script.onerror = () => {
        console.error('Failed to preload HLS.js')
      }
      script.async = true
      document.head.appendChild(script)
    },
    // #endif

    // 移除全局轮询，改为首次启动时只核查一次
    // 消息轮询由message.vue负责

    // 监听消息页面发送的未读更新事件
    onUnreadUpdated(total) {
      this.globalUnreadCount = total
    },

    // 防抖刷新全局未读数（2秒内多次触发只请求一次）
    _scheduleUnreadRefresh() {
      if (this._unreadRefreshTimer) clearTimeout(this._unreadRefreshTimer)
      this._unreadRefreshTimer = setTimeout(() => {
        this._unreadRefreshTimer = null
        this.fetchGlobalUnread()
      }, 2000)
    },

    async fetchGlobalUnread() {
      if (!isLoggedIn()) return
      // 防止重复请求，避免并发导致的性能问题
      if (this.isFetchingGlobalUnread) return
      this.isFetchingGlobalUnread = true

      try {
        const [msgRes, groupRes] = await Promise.allSettled([
          request('message.php', { action: 'getMessageIndex' }, 'GET'),
          request('group.php', { action: 'group_list', page: 1 }, 'GET')
        ])

        let total = 0

        if (msgRes.status === 'fulfilled' && msgRes.value && msgRes.value.code === 0 && msgRes.value.data) {
          const d = msgRes.value.data
          const privateUnread = (d.chat_list || []).reduce((sum, item) => sum + Number(item.unread || 0), 0)
          total += Number(d.unread_like || 0) + Number(d.unread_comment || 0) + Number(d.unread_system || 0) + privateUnread
        }

        if (groupRes.status === 'fulfilled' && groupRes.value && groupRes.value.code === 0 && Array.isArray(groupRes.value.data)) {
          total += groupRes.value.data.filter(item => item.type === 'group').reduce((sum, item) => sum + Number(item.unread || 0), 0)
        }

        if (total !== this.globalUnreadCount) {
          this.globalUnreadCount = total
          uni.setStorageSync('global_message_unread', total)
          uni.$emit('message_unread_updated', total)
        }
      } catch (e) {
      } finally {
        this.isFetchingGlobalUnread = false
      }
    },

    async syncRuntimeConfig(force = false) {
      const now = Date.now()
      // 优化：将缓存时间从5分钟增加到10分钟，减少不必要的请求
      if (!force && now - this.runtimeConfigCheckedAt < 600000) return
      this.runtimeConfigCheckedAt = now

      try {
        const res = await request('post.php?action=get_runtime_config', {}, 'GET')
        if (res && res.code === 0 && res.data) {
          saveLevelConfig(res.data)
          uni.$emit('runtime_config_updated', res.data)
        }
      } catch (e) {}
    },

    ensureH5DefaultRoute() {
      // #ifdef H5
      try {
        const hash = window.location.hash || ''
        if (!hash || hash === '#') {
          let pathname = window.location.pathname || '/'
          pathname = pathname.replace(/\/index\.html?$/i, '/')
          window.location.replace(pathname.replace(/\/?$/, '/') + (window.location.search || '') + '#/pages/index/index')
        }
      } catch (e) {}
      // #endif
    },

    handleLaunchRouteGuard() {
      const route = this.getCurrentRouteSafe()

      if (isLoggedIn()) {
        if (route === 'pages/login/login') {
          uni.reLaunch({ url: '/pages/index/index' })
        }
        this.registerPushCid()
        return
      }

      if (route && route !== 'pages/login/login') {
        uni.reLaunch({ url: '/pages/login/login' })
      }
    },

    getCurrentRouteSafe() {
      let route = ''

      try {
        const pages = getCurrentPages()
        const current = pages && pages.length ? pages[pages.length - 1] : null
        if (current && current.route) route = current.route
      } catch (e) {}

      // #ifdef H5
      if (!route) {
        try {
          const hash = window.location.hash || ''
          route = hash.replace(/^#\/?/, '').split('?')[0].split('#')[0]
        } catch (e) {}
      }
      // #endif

      return route || 'pages/index/index'
    },

    async handleOauthCallbackPayload(payload, source = 'runtime') {
      if (!payload) return false

      saveOauthCallback(payload)

      if (payload.token) {
        if (this.oauthHandling) return true

        this.oauthHandling = true
        try {
          uni.setStorageSync('token', payload.token)
          const res = await request('user.php', { action: 'getUserInfo' })

          if (res.code === 0) {
            setAuth(res.data, payload.token)
            clearOauthCallback()
            uni.$emit('oauth_login_success', { token: payload.token, userInfo: res.data, source })
            uni.showToast({ title: '登录成功', icon: 'none' })
            this.registerPushCid()
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/index/index' })
            }, 400)
          } else {
            clearOauthCallback()
            uni.removeStorageSync('token')
            uni.$emit('global_login_fail', { msg: normalizeServerMessage(res.msg, '登录失败') })
            if (this.getCurrentRouteSafe().indexOf('login') === -1) {
              uni.reLaunch({ url: '/pages/login/login' })
            }
          }
        } catch (e) {
          clearOauthCallback()
          uni.removeStorageSync('token')
          uni.$emit('global_login_fail', { msg: normalizeServerMessage(e?.msg, '网络连接失败') })
          if (this.getCurrentRouteSafe().indexOf('login') === -1) {
            uni.reLaunch({ url: '/pages/login/login' })
          }
        } finally {
          setTimeout(() => {
            this.oauthHandling = false
          }, 500)
        }

        return true
      }

      if (payload.loginError) {
        clearOauthCallback()
        uni.$emit('global_login_fail', { msg: normalizeServerMessage(payload.loginError, '登录失败') })
        if (this.getCurrentRouteSafe().indexOf('login') === -1) {
          uni.reLaunch({ url: '/pages/login/login' })
        }
        return true
      }

      if (payload.bindSuccess) {
        clearOauthCallback()
        uni.showToast({ title: '绑定成功', icon: 'none' })
        uni.$emit('global_bind_success', payload)
        return true
      }

      if (payload.bindError) {
        clearOauthCallback()
        uni.showToast({ title: normalizeServerMessage(payload.bindError, '绑定失败'), icon: 'none' })
        uni.$emit('global_bind_fail', payload)
        return true
      }

      return false
    },

    consumePendingOauthCallback() {
      const payload = readOauthCallback()
      if (!payload) return

      if (payload.token && !isLoggedIn()) {
        this.handleOauthCallbackPayload(payload, 'storage')
        return
      }

      if (payload.token && isLoggedIn()) {
        clearOauthCallback()
        return
      }

      if (payload.bindSuccess || payload.bindError || payload.loginError) {
        this.handleOauthCallbackPayload(payload, 'storage')
      }
    },

    checkArguments() {
      try {
        const args = plus.runtime.arguments
        const payload = parseOauthCallbackUrl(args)
        if (payload) {
          plus.runtime.arguments = ''
          this.handleOauthCallbackPayload(payload, 'arguments')
        }
      } catch (e) {
        // 参数解析异常
      }
    },

    getQueryParam(url, name) {
      try {
        const reg = new RegExp('(^|&|\\?)' + name + '=([^&]*)(&|$)')
        const result = url.match(reg)
        if (result != null) {
          return decodeURIComponent(result[2])
        }
        return null
      } catch (e) {
        return null
      }
    },

    setupPushListener() {
      // #ifdef APP-PLUS
      uni.onPushMessage((res) => {
        if (res.type !== 'click') return
        try {
          const payload = res.data?.payload
          if (!payload) return
          const data = typeof payload === 'string' ? JSON.parse(payload) : payload
          this.handlePushTap(data)
        } catch (e) {}
      })
      // #endif
    },

    handlePushTap(data) {
      if (!data || !data.type) return

      setTimeout(() => {
        if (data.type === 'chat') {
          uni.navigateTo({
            url: `/pages/message/chat?targetId=${data.target_uid}&name=${encodeURIComponent(data.name || '')}&avatar=`
          })
        } else if (data.type === 'comment' && data.post_id) {
          uni.navigateTo({ url: `/pages/post/detail?postId=${data.post_id}` })
        }
      }, 300)
    },

    registerPushCid() {
      // #ifdef APP-PLUS
      uni.getPushClientId({
        success: (res) => {
          const cid = res.cid
          if (!cid) return

          const savedCid = uni.getStorageSync('push_cid')
          if (savedCid === cid) return

          request('user.php', { action: 'savePushToken', cid })
            .then(() => {
              uni.setStorageSync('push_cid', cid)
            })
            .catch(() => {})
        },
        fail: () => {}
      })
      // #endif
    },

    checkH5Login() {
      try {
        const url = window.location.href
        const token = this.getQueryParam(url, 'token')
        const loginSuccess = this.getQueryParam(url, 'loginSuccess')
        const loginError = this.getQueryParam(url, 'loginError')

        if (token && loginSuccess) {
          uni.setStorageSync('token', token)

          request('user.php', { action: 'getUserInfo' })
            .then((res) => {
              if (res.code === 0) {
                setAuth(res.data, token)
                uni.showToast({ title: '登录成功', icon: 'none' })
              } else {
                uni.removeStorageSync('token')
                uni.showToast({ title: normalizeServerMessage(res.msg, '登录失败'), icon: 'none' })
              }

              const newUrl = url.replace(/[?&]token=[^&]*/g, '').replace(/[?&]loginSuccess=[^&]*/g, '')
              this._h5LoginProcessed = true
              window.history.replaceState({}, '', newUrl)
              uni.reLaunch({ url: '/pages/index/index' })
            })
            .catch((e) => {
              uni.removeStorageSync('token')
              uni.showToast({ title: normalizeServerMessage(e?.msg, '网络连接失败'), icon: 'none' })

              const newUrl = url.replace(/[?&]token=[^&]*/g, '').replace(/[?&]loginSuccess=[^&]*/g, '')
              this._h5LoginProcessed = true
              window.history.replaceState({}, '', newUrl)
              uni.reLaunch({ url: '/pages/index/index' })
            })
        } else if (loginError) {
          const msg = normalizeServerMessage(decodeURIComponent(loginError), '登录失败')
          uni.$emit('global_login_fail', { msg })

          const newUrl = url.replace(/[?&]loginError=[^&]*/g, '')
          this._h5LoginProcessed = true
          window.history.replaceState({}, '', newUrl)

          const pages = getCurrentPages()
          const current = pages[pages.length - 1]
          if (!current || current.route.indexOf('login') === -1) {
            uni.reLaunch({ url: '/pages/login/login' })
          }
        }
      } catch (e) {
      }
    },

    parseVersionCodeFromName(versionName = '') {
      const cleaned = String(versionName || '').replace(/[^\d.]/g, '')
      if (!cleaned) return 0

      const parts = cleaned.split('.').filter(Boolean).slice(0, 3).map(item => parseInt(item || 0))
      while (parts.length < 3) parts.push(0)
      return parts[0] * 10000 + parts[1] * 100 + parts[2]
    },

    async getCurrentAppVersionInfo() {
      return await new Promise((resolve) => {
        try {
          plus.runtime.getProperty(plus.runtime.appid, (info) => {
            const versionName = String((info && (info.version || info.versionName)) || '').trim()
            const versionCodeRaw = parseInt((info && info.versionCode) || 0)
            const versionCode = versionCodeRaw > 0 ? versionCodeRaw : this.parseVersionCodeFromName(versionName)
            resolve({
              code: versionCode || 0,
              name: versionName || ''
            })
          })
        } catch (e) {
          resolve({ code: 0, name: '' })
        }
      })
    },

    getRuntimePlatform() {
      // #ifdef APP-PLUS
      try {
        const osName = String((plus.os && plus.os.name) || '').toLowerCase()
        if (osName.indexOf('ios') !== -1) return 'ios'
        if (osName.indexOf('android') !== -1) return 'android'
      } catch (e) {}
      return 'android'
      // #endif

      // #ifdef H5
      return 'h5'
      // #endif

      return 'android'
    },

    async checkGlobalAppUpdate(force = false) {
      // #ifndef APP-PLUS
      return
      // #endif

      if (this.updateChecking || this.updatePrompting) return
      if (!force && Date.now() - this.updateLastCheckAt < 30000) return

      this.updateChecking = true
      this.updateLastCheckAt = Date.now()

      try {
        const current = await this.getCurrentAppVersionInfo()
        const platform = this.getRuntimePlatform()
        const res = await request(
          'app.php',
          {
            action: 'check_update',
            current_version_code: current.code,
            current_version_name: current.name,
            platform
          },
          'GET'
        )

        if (!(res.code === 0 && res.data)) return

        const serverVersionCode = parseInt(res.data.version_code || 0)
        const serverVersionName = String(res.data.version_name || '').trim()
        const currentComparable = current.code || this.parseVersionCodeFromName(current.name)
        const serverComparable = serverVersionCode || this.parseVersionCodeFromName(serverVersionName)

        if (!serverComparable || serverComparable <= currentComparable) return
        if (this.updatePromptedCode === serverComparable) return

        this.updatePromptedCode = serverComparable
        await this.promptGlobalAppUpdate(res.data)
      } catch (e) {
      } finally {
        this.updateChecking = false
      }
    },

    async promptGlobalAppUpdate(info) {
      if (!info || this.updatePrompting) return

      this.updatePrompting = true

      const versionName = String(info.version_name || '').trim()
      const title = ['发现新版本', versionName].filter(Boolean).join(' ')
      const content = [String(info.title || '').trim(), String(info.content || '').trim()].filter(Boolean).join('\n\n').slice(0, 500)
      const forceUpdate = parseInt(info.is_force || 0) === 1

      const modalRes = await new Promise((resolve) => {
        uni.showModal({
          title: title || '发现新版本',
          content: content || '检测到新版本，是否立即更新？',
          showCancel: !forceUpdate,
          cancelText: '暂不更新',
          confirmText: '立即更新',
          success: resolve,
          fail: () => resolve({ confirm: false, cancel: true })
        })
      })

      this.updatePrompting = false

      if (modalRes && modalRes.confirm) {
        this.startGlobalAppUpdateDownload(info)
        return
      }

      if (forceUpdate) {
        setTimeout(() => {
          this.promptGlobalAppUpdate(info)
        }, 300)
      }
    },

    startGlobalAppUpdateDownload(info) {
      const downloadUrl = String((info && info.download_url) || '').trim()
      if (!downloadUrl) {
        uni.showToast({ title: '更新地址未配置', icon: 'none' })
        return
      }

      // #ifdef H5
      window.open(downloadUrl, '_blank')
      return
      // #endif

      // #ifdef APP-PLUS
      const platform = this.getRuntimePlatform()
      const canInstallPackage = platform === 'android' && /\.(apk|wgt)(\?|#|$)/i.test(downloadUrl)

      if (!canInstallPackage) {
        try {
          plus.runtime.openURL(downloadUrl)
        } catch (e) {
          uni.showToast({ title: '无法打开更新地址', icon: 'none' })
        }
        return
      }

      let waiting = null
      try {
        waiting = plus.nativeUI.showWaiting('正在下载更新...')
      } catch (e) {}

      const task = plus.downloader.createDownload(
        downloadUrl,
        { filename: '_doc/update/' },
        (download, status) => {
          if (waiting) {
            try {
              waiting.close()
            } catch (e) {}
          }

          if (status == 200) {
            plus.runtime.install(
              download.filename,
              { force: true },
              () => {
                plus.runtime.restart()
              },
              () => {
                uni.showToast({ title: '安装失败', icon: 'none' })
              }
            )
          } else {
            uni.showToast({ title: '下载失败', icon: 'none' })
          }
        }
      )

      task.addEventListener('statechanged', (download) => {
        if (download.state == 3 && download.totalSize > 0 && waiting) {
          const progress = parseInt((download.downloadedSize / download.totalSize) * 100)
          try {
            waiting.setTitle('正在下载更新 ' + progress + '%')
          } catch (e) {}
        }
      })

      task.start()
      // #endif
    }
  }
}
</script>

<style>
/* #ifndef APP-PLUS-NVUE */
@import "./common/bubble.css";

/* 思源黑体 - 常规字重 */
@font-face {
  font-family: 'Noto Sans SC';
  src: url('https://fonts.gstatic.com/s/notosanssc/v36/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VA.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

button::after {
  border: none !important;
  border-radius: 0 !important;
  content: none !important;
}

page,
view,
text,
input,
textarea,
button,
scroll-view {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  font-weight: 400;
}

page {
  background-color: #f6f7f9;
}
/* #endif */
</style>
