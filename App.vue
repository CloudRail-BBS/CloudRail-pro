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

      if (payload.code && !isLoggedIn()) {
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
