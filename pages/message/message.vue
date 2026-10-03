<template>
  <view class="msg-page">
    <OnlineNotifyCard />
    <view class="fixed-header">
      <view class="header-row">
        <text class="page-title">消息</text>
        <view class="header-actions">
          <view class="search-entry-btn" @click="goAddFriend">
            <image src="/static/icon/search-gray.svg" class="header-icon-img" mode="aspectFit"></image>
          </view>
          <view class="add-entry-btn" @click="showAddMenu = true">
            <image src="/static/icon/plus-circle-gray.svg" class="header-icon-img" mode="aspectFit"></image>
          </view>
        </view>
      </view>

      <view class="notice-tabs">
          <view class="notice-tab" @click="toDetails('like')">
            <view class="tab-icon-wrap like-icon">
              <image src="/static/icon/heart-white.svg" class="tab-icon-img" mode="aspectFit"></image>
            </view>
            <text class="tab-label">获赞</text>
            <view class="tab-badge" v-if="unreadCounts.like">
              <text>{{ formatCount(unreadCounts.like) }}</text>
            </view>
          </view>

          <view class="notice-tab" @click="toDetails('comment')">
            <view class="tab-icon-wrap comment-icon">
              <image src="/static/icon/chat-bubble-white.svg" class="tab-icon-img" mode="aspectFit"></image>
            </view>
            <text class="tab-label">评论</text>
            <view class="tab-badge" v-if="unreadCounts.comment">
              <text>{{ formatCount(unreadCounts.comment) }}</text>
            </view>
          </view>

          <view class="notice-tab group-tab" @click="toSystemNotice">
            <view class="tab-icon-wrap notice-icon">
              <image src="/static/icon/bell-white.svg" class="tab-icon-img" mode="aspectFit"></image>
            </view>
            <text class="tab-label">通知</text>
            <view class="tab-badge" v-if="unreadCounts.system">
              <text>{{ formatCount(unreadCounts.system) }}</text>
            </view>
          </view>
        </view>
      </view>

    <scroll-view class="main-scroll" scroll-y enhanced :show-scrollbar="false" @scrolltolower="onScrollToLower">
      <view class="page-card">
        <view v-if="loading" class="skeleton-container">
          <view class="chat-row" v-for="i in 6" :key="'sk-c-'+i">
            <view class="avatar sk-avatar skeleton-anim"></view>
            <view class="chat-body">
              <view class="chat-top">
                <view class="sk-text sk-name skeleton-anim"></view>
                <view class="sk-text sk-time skeleton-anim"></view>
              </view>
              <view class="sk-text sk-preview skeleton-anim"></view>
            </view>
          </view>
        </view>

        <view v-else class="msg-list">
          <view
            v-for="(item, index) in combinedMsgList"
            :key="item.type === 'private' ? 'p-'+item.chat_id : 'g-'+item.id"
            class="chat-row"
            @click="item.type === 'private' ? toChat(item) : toGroupChat(item)"
          >
            <view class="ava-wrap avatar">
              <image
                class="img"
                :src="item.avatar || '/static/logo.png'"
                mode="aspectFill"
                @error="onAvatarError(item)"
              />
              <!-- 在线状态: 仅私聊显示（群聊头像不显示） -->
              <view v-if="item.type === 'private'" class="online-dot" :class="{ on: item.online }"></view>
            </view>

            <view class="chat-body">
              <view class="chat-top">
                <view class="name-wrap">
                  <text class="name" :class="{ 'vip-rainbow-text': parseInt(item.vip || 0) === 1 }">{{ item.name }}</text>
                  <view class="badge-inline" v-if="Number(item.unread || 0)">
                    <text>{{ formatCount(Number(item.unread || 0)) }}</text>
                  </view>
                </view>
                <text class="time">{{ formatTime(item.type === 'private' ? item.update_time : (item.last_msg_time || item.update_time)) }}</text>
              </view>
              <text class="preview">{{ item.type === 'private' ? (item.last_msg || '点击开始聊天') : (item.last_msg_preview || item.last_msg || '点击进入群聊') }}</text>
            </view>
          </view>

          <view class="empty" v-if="combinedMsgList.length === 0">
            <text>暂无消息</text>
          </view>
        </view>

        <view class="footer">聊天内容受平台实时监管，请文明交流</view>
      </view>
    </scroll-view>

    <CustomTabBar :current="2" @publish="goPublish" />
    <PublishModal :visible="showPublishModal" @close="showPublishModal = false" @select="onPublishSelect" />

    <view class="add-menu-mask" v-if="showAddMenu" @click="showAddMenu = false">
      <view class="add-menu-sheet" @click.stop>
        <view class="add-menu-item" @click="goCreateGroup">
          <view class="add-menu-icon-wrap">
            <image src="/static/icon/users-white.svg" class="add-menu-icon-img" mode="aspectFit"></image>
          </view>
          <text class="add-menu-text">发起群聊</text>
        </view>
        <view class="add-menu-item" @click="goSearchGroup">
          <view class="add-menu-icon-wrap">
            <image src="/static/icon/users-plus-white.svg" class="add-menu-icon-img" mode="aspectFit"></image>
          </view>
          <text class="add-menu-text">添加群聊</text>
        </view>
        <view class="add-menu-item" @click="goAddFriend">
          <view class="add-menu-icon-wrap">
            <image src="/static/icon/user-plus-white.svg" class="add-menu-icon-img" mode="aspectFit"></image>
          </view>
          <text class="add-menu-text">添加朋友</text>
        </view>
        <view class="add-menu-item" @click="goScan">
          <view class="add-menu-icon-wrap">
            <image src="/static/icon/scan-line-white.svg" class="add-menu-icon-img" mode="aspectFit"></image>
          </view>
          <text class="add-menu-text">扫一扫</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request, baseUrl } from '../../common/request.js'
import ws from '../../common/ws.js'
import PublishModal from '../../components/PublishModal.vue'
import CustomTabBar from '../../components/CustomTabBar.vue'
import { applyH5ViewportHeightVar } from '../../common/screen.js'
import { swr, invalidate, subscribe, CACHE_KEYS } from '../../common/cache.js'
import presence from '../../common/presence.js'
import OnlineNotifyCard from '../../components/OnlineNotifyCard.vue'

export default {
  components: {
    PublishModal,
    CustomTabBar,
    OnlineNotifyCard
  },
  data() {
    return {
      loading: true,
      showAddMenu: false,
      unreadCounts: { like: 0, comment: 0, system: 0, fans: 0, follow: 0 },
      lastSystem: {},
      privateList: [],
      groupList: [],
      showPublishModal: false,
      isFetchingData: false,
      fixUrlCache: {},
      myId: 0
    }
  },
  computed: {
    groupUnreadTotal() {
      return this.groupList.reduce((sum, item) => sum + Number(item.unread || 0), 0)
    },
    hasUnread() {
      const u = this.unreadCounts
      return (u.like + u.comment + u.system + u.fans + u.follow > 0) ||
        this.privateList.some(item => Number(item.unread || 0) > 0) ||
        this.groupList.some(item => Number(item.unread || 0) > 0)
    },
    combinedMsgList() {
      const privateItems = this.privateList.map(item => {
        let lastMsg = item.last_msg || ''
        if (item.last_message && typeof item.last_message === 'object') {
          lastMsg = this.previewText(item.last_message)
        } else {
          /* 后端存的 last_msg 对语音/红包这类消息是原始 JSON，
             这里兜底转成可读文案，否则列表里会直接显示一串代码 */
          lastMsg = this.cleanPreview(lastMsg)
          if (lastMsg.indexOf('[群名片]') === 0) lastMsg = '[群名片]'
        }
        return {
          ...item,
          last_msg: lastMsg,
          type: 'private',
          sortTime: item.update_time || ''
        }
      })
      const groupItems = this.groupList.map(item => ({
        ...item,
        type: 'group',
        sortTime: item.last_msg_time || item.update_time || ''
      }))
      return [...privateItems, ...groupItems].sort((a, b) => {
        if (!a.sortTime) return 1
        if (!b.sortTime) return -1
        return b.sortTime.localeCompare(a.sortTime)
      })
    }
  },
  onLoad() {
    applyH5ViewportHeightVar()
    const user = uni.getStorageSync('userInfo') || {}
    this.myId = Number(user.id || 0)
    uni.$on('message_read_changed', this.onMessageReadChanged)
    /* WebSocket 实时更新会话列表：在 onLoad 里注册一次，页面存活期间一直有效。
       以前是放在 onShow 注册、onHide 注销，切到别的 Tab 就会注销掉，
       于是新消息只更新了小红点（那是 App.vue 全局监听的），
       列表预览必须手动刷新才变。 */
    this._registerWsCallbacks()
    // 订阅消息列表缓存刷新事件：后台拉到新数据后静默更新
    this._unsubMsgCache = subscribe(CACHE_KEYS.MESSAGE_LIST, (newData) => {
      /* 缓存里存的就是 { privateRes, groupRes }（见 swr 的 fetcher 返回值），
         以前这里判断 newData.privateList 永远不成立，等于什么都没做 */
      this._applyMessageData(newData)
    })
  },
  onShow() {
    /* 自定义 TabBar：每次页面显示都压一次原生 TabBar，
       否则切页后原生 TabBar 会重新露出来，和自定义的重叠成两排 */
    try { uni.hideTabBar({ animation: false, fail: () => {} }) } catch (e) {}
    // 从子页返回时强制失效缓存，确保拉到最新已读状态
    invalidate(CACHE_KEYS.MESSAGE_LIST)
    this.fetchData(true)
    ws.ensureConnected()
    /* 在线状态: 会话列表进入页面时由后端给一次, 之后 WS 实时推送 + 每 10 秒兜底刷新 */
    this.refreshOnlineDots()
    if (!this._onlineTimer) {
      this._onlineTimer = setInterval(() => this.refreshOnlineDots(), 10000)
    }
    this._startListPoll()
    uni.$off('presence_changed', this._onPresence)
    uni.$on('presence_changed', this._onPresence)
  },
  onUnload() {
    this._unregisterWsCallbacks()
    uni.$off('message_read_changed', this.onMessageReadChanged)
    uni.$off('presence_changed', this._onPresence)
    if (this._readRefreshTimer) {
      clearTimeout(this._readRefreshTimer)
      this._readRefreshTimer = null
    }
    if (this._onlineTimer) {
      clearInterval(this._onlineTimer)
      this._onlineTimer = null
    }
    if (this._unsubMsgCache) this._unsubMsgCache()
    this._stopListPoll()
  },
  onHide() {
    /* 注意：这里不能注销 WebSocket 监听。
       切到别的 Tab / 切后台都会触发 onHide，一注销就收不到实时消息，
       会话列表只能靠手动刷新。监听改为在 onLoad 注册、onUnload 注销。 */
    if (this._onlineTimer) {
      clearInterval(this._onlineTimer)
      this._onlineTimer = null
    }
    this._stopListPoll()
  },
  onPullDownRefresh() {
    // 用户主动下拉刷新：强制失效缓存，立即拉取最新
    invalidate(CACHE_KEYS.MESSAGE_LIST)
    this.fetchData(false).finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    /* WS 推来在线变化时立刻改小圆点, 不走网络 */
    _onPresence() {
      this.privateList.forEach((item, idx) => {
        const uid = String(item.target_uid || (item.peer && item.peer.uid) || '')
        if (!uid) return
        const v = presence.getCached(uid)
        if (v === null) return
        if (!!item.online !== v) this.$set(this.privateList, idx, { ...item, online: v })
      })
    },
    /* 在线状态: 只刷新私聊会话头像上的小圆点，不重新拉整个列表 */
    async refreshOnlineDots() {
      const uids = this.privateList
        .map(it => String(it.target_uid || (it.peer && it.peer.uid) || ''))
        .filter(Boolean)
      if (!uids.length) return
      let map = {}
      try {
        map = await presence.fetchOnline(uids)
      } catch (e) {
        return
      }
      this.privateList.forEach((item, idx) => {
        const uid = String(item.target_uid || (item.peer && item.peer.uid) || '')
        if (!uid) return
        const on = !!map[uid]
        if (!!item.online !== on) this.$set(this.privateList, idx, { ...item, online: on })
      })
    },
    /* 会话列表"最后一条消息"预览文案
       红包/转账/群邀请/名片等卡片消息的 content 是 JSON，直接显示会变成一串"代码"，
       这里按消息类型转成可读文案（与后端 chat.php 的 $msgPreview 保持一致） */
    previewText(data) {
      const type = String((data && (data.type || data.msg_type)) || 'text')
      const content = String((data && data.content) || '')
      if (type === 'text') {
        return content.indexOf('[群名片]') === 0 ? '[群名片]' : content
      }
      if (type === 'image') return '[图片]'
      if (type === 'emoticon') return '[表情]'
      if (type === 'recalled') return '撤回了一条消息'
      if (type === 'voice') {
        let sec = 0
        try { sec = Number(JSON.parse(content || '{}').duration || 0) } catch (e) { sec = 0 }
        return '[语音]' + (sec > 0 ? ' ' + sec + '″' : '')
      }
      if (type === 'relation_apply') {
        let rn = ''
        let rs = 0
        try {
          const rj = JSON.parse(content || '{}')
          rn = String(rj.type_name || '')
          rs = Number(rj.status || 0)
        } catch (e) {}
        const rtail = rs === 1 ? '（已同意）' : (rs === 2 ? '（已拒绝）' : (rs === 3 ? '（已解除）' : '（等待确认）'))
        return '[关系申请] ' + (rn || '好友关系') + rtail
      }
      if (['card', 'group_card', 'transfer', 'redpacket', 'group_invite'].indexOf(type) < 0) return content

      let j = null
      try { j = JSON.parse(content || '{}') } catch (e) { j = null }
      if (!j || typeof j !== 'object') j = {}
      if (type === 'redpacket') {
        const greeting = String(j.greeting || '').trim()
        return '[红包] ' + (greeting || '恭喜发财，大吉大利')
      }
      if (type === 'transfer') {
        return '[转账] ¥' + Number(j.amount || 0).toFixed(2)
      }
      if (type === 'group_invite') {
        const inviter = String(j.inviter || '').trim() || '好友'
        const gname = String(j.group_name || '').trim()
        return '[群邀请] ' + inviter + ' 邀请你加入群聊' + (gname ? '「' + gname + '」' : '')
      }
      const n = String(j.name || '').trim()
      if (type === 'group_card') return '[群名片] ' + (n || '群聊')
      return '[名片] ' + (n || '用户')
    },
    /* 列表刷新时，后端给的 last_msg 对语音/红包/转账/名片这类消息是原始 JSON，
       统一转成可读文案，避免列表里直接显示一串代码 */
    cleanPreview(text) {
      const s = String(text || '')
      if (!s || s.charAt(0) !== '{') return s
      let j = null
      try { j = JSON.parse(s) } catch (e) { return s }
      if (!j || typeof j !== 'object') return s
      if (j.url !== undefined && j.duration !== undefined) {
        const sec = Number(j.duration || 0)
        return '[语音]' + (sec > 0 ? ' ' + sec + '″' : '')
      }
      if (j.relation_id !== undefined) {
        const rs = Number(j.status || 0)
        const tail = rs === 1 ? '（已同意）' : (rs === 2 ? '（已拒绝）' : '（等待确认）')
        return '[关系申请] ' + (String(j.type_name || '').trim() || '好友关系') + tail
      }
      if (j.greeting !== undefined) return '[红包] ' + (String(j.greeting || '').trim() || '恭喜发财，大吉大利')
      if (j.transfer_id !== undefined) return '[转账] ¥' + Number(j.amount || 0).toFixed(2)
      if (j.group_name !== undefined) return '[群邀请] ' + (String(j.inviter || '').trim() || '好友') + ' 邀请你加入群聊'
      if (j.uid !== undefined && j.nickname !== undefined) return '[名片] ' + (String(j.nickname || '').trim() || '用户')
      return '[消息]'
    },
    onScrollToLower() {
    },
    goPublish() {
      this.showPublishModal = true
    },

    onPublishSelect(e) {
      if (e && e.url) {
        uni.navigateTo({ url: e.url })
      }
    },
    handleRefresh() {
      this.fetchData(true)
      uni.vibrateShort({ type: 'light' }).catch(() => {})
    },
    goCreateGroup() {
      this.showAddMenu = false
      uni.navigateTo({ url: '/pages/message/group-create' })
    },
    goSearchGroup() {
      this.showAddMenu = false
      uni.navigateTo({ url: '/pages/message/group-search' })
    },
    goScan() {
      this.showAddMenu = false
      // #ifdef H5
      uni.showToast({
        title: '请使用APP扫一扫',
        icon: 'none'
      })
      // #endif

      // #ifndef H5
      uni.scanCode({
        success: (res) => {
          const raw = String((res && res.result) || '').trim()
          if (!raw) return
          this.handleScanResult(raw)
        },
        fail: () => {
          uni.showToast({
            title: '扫码失败',
            icon: 'none'
          })
        }
      })
      // #endif
    },
    /* 解析扫码结果: 兼容 群二维码 / 用户二维码 / 站内页面链接 */
    handleScanResult(raw) {
      let text = String(raw || '').trim()
      /* 群二维码内容是 https://站点/#/pages/message/group-search?code=群号
         先取出 hash 里的路由部分(兼容 webBaseUrl 末尾有无斜杠两种拼接) */
      const hashIdx = text.indexOf('#/')
      if (hashIdx > -1) text = text.slice(hashIdx + 1)
      /* 不带 hash 的普通链接: 只取 path + query */
      const m = text.match(/^https?:\/\/[^/]*(\/[^?\s]*)?(\?[^\s]*)?/i)
      if (m) text = String(m[1] || '/') + String(m[2] || '')

      const qIdx = text.indexOf('?')
      const path = qIdx > -1 ? text.slice(0, qIdx) : text
      const query = qIdx > -1 ? text.slice(qIdx + 1) : ''

      const params = {}
      query.split('&').forEach((kv) => {
        if (!kv) return
        const i = kv.indexOf('=')
        if (i > -1) {
          let v = kv.slice(i + 1)
          try { v = decodeURIComponent(v) } catch (e) {}
          params[kv.slice(0, i)] = v
        }
      })

      const code = params.code || params.identity_code || ''
      const groupId = params.groupId || params.group_id || ''
      const userId = params.userId || params.user_id || ''

      /* 1) 群二维码: 携带群号 -> 进群搜索页自动查询并展示群卡片(可申请加入/进入群聊) */
      if (code) {
        uni.navigateTo({ url: `/pages/message/group-search?code=${encodeURIComponent(code)}` })
        return
      }
      /* 2) 群资料 / 群聊链接 */
      if (groupId) {
        const url = path.indexOf('group-profile') > -1
          ? `/pages/message/group-profile?groupId=${groupId}`
          : `/pages/message/group-chat?groupId=${groupId}`
        uni.navigateTo({ url })
        return
      }
      /* 3) 用户二维码 */
      if (userId) {
        uni.navigateTo({ url: `/pages/user/profile?userId=${userId}` })
        return
      }
      /* 4) 纯数字当作群号 */
      if (/^\d{4,12}$/.test(text)) {
        uni.navigateTo({ url: `/pages/message/group-search?code=${text}` })
        return
      }
      uni.showToast({
        title: '无法识别的二维码',
        icon: 'none'
      })
    },
    goAddFriend() {
      uni.navigateTo({ url: '/pages/user/fried' })
    },
    /* 会话列表轮询兜底：WebSocket 推送一旦掉链子，列表就要等手动刷新才变。
       这里在页面可见时每 8 秒静默拉一次，保证新消息和预览能自己冒出来 */
    _startListPoll() {
      if (this._listTimer) return
      this._listTimer = setInterval(() => {
        if (this.isFetchingData) return
        /* 必须绕过 15 秒缓存，否则轮询拿回来的还是旧数据 */
        invalidate(CACHE_KEYS.MESSAGE_LIST)
        this.fetchData(false)
      }, 8000)
    },
    _stopListPoll() {
      if (this._listTimer) { clearInterval(this._listTimer); this._listTimer = null }
    },
    /* 页面存活期间一直挂着的 WebSocket 监听（onLoad 注册一次） */
    _registerWsCallbacks() {
      this._unregisterWsCallbacks()
      this._wsUnsubChat = ws.on('chat', this._onWsChat)
      this._wsUnsubGroup = ws.on('group_msg', this._onWsGroupMsg)
      this._wsUnsubNotif = ws.on('notification', this._onWsNotification)
      this._wsUnsubUnread = ws.on('unread_update', this._onWsUnreadUpdate)
    },
    _unregisterWsCallbacks() {
      if (this._wsUnsubChat) { this._wsUnsubChat(); this._wsUnsubChat = null }
      if (this._wsUnsubGroup) { this._wsUnsubGroup(); this._wsUnsubGroup = null }
      if (this._wsUnsubNotif) { this._wsUnsubNotif(); this._wsUnsubNotif = null }
      if (this._wsUnsubUnread) { this._wsUnsubUnread(); this._wsUnsubUnread = null }
    },
    _onWsChat(data) {
      const chatId = data.chat_id
      const idx = this.privateList.findIndex(i => Number(i.chat_id) === Number(chatId))
      if (idx >= 0) {
        const item = { ...this.privateList[idx] }
        const lastMsg = this.previewText(data)
        item.last_msg = lastMsg
        item.update_time = data.create_time
        /* 自己发出去的消息不加未读（服务端会推给会话里所有人，包括发送者） */
        if (Number(data.sender_id) !== Number(this.myId || 0)) {
          item.unread = Number(item.unread || 0) + 1
        }
        const newList = this.privateList.filter((_, i) => i !== idx)
        newList.unshift(item)
        this.privateList = newList
      } else {
        /* 列表里还没有这个会话（第一次聊天）：清掉缓存重新拉一次，让新会话直接出现 */
        invalidate(CACHE_KEYS.MESSAGE_LIST)
        this.fetchData(false)
      }
      this.syncGlobalUnread()
    },
    _onWsGroupMsg(data) {
      const groupId = Number(data.group_id)
      const idx = this.groupList.findIndex(i => Number(i.id) === groupId)
      if (idx >= 0) {
        const item = { ...this.groupList[idx] }
        if (Number(data.sender_id) !== Number(this.myId || 0)) {
          item.unread = Number(item.unread || 0) + 1
        }
        item.last_msg_preview = this.previewText(data).slice(0, 60)
        item.last_msg_time = data.create_time
        this.$set(this.groupList, idx, item)
      } else {
        /* 列表里还没有这个群：清掉缓存重新拉一次 */
        invalidate(CACHE_KEYS.MESSAGE_LIST)
        this.fetchData(false)
      }
      this.syncGlobalUnread()
    },
    _onWsNotification(data) {
      const notifType = data.notif_type
      if (notifType === 'like') {
        this.unreadCounts.like = Number(this.unreadCounts.like || 0) + 1
      } else if (notifType === 'comment') {
        this.unreadCounts.comment = Number(this.unreadCounts.comment || 0) + 1
      } else if (notifType === 'fans') {
        this.unreadCounts.fans = Number(this.unreadCounts.fans || 0) + 1
      } else if (notifType === 'follow') {
        this.unreadCounts.follow = Number(this.unreadCounts.follow || 0) + 1
      }
      this.syncGlobalUnread()
    },
    _onWsUnreadUpdate(data) {
      if (data.unread_like !== undefined) this.unreadCounts.like = Number(data.unread_like || 0)
      if (data.unread_comment !== undefined) this.unreadCounts.comment = Number(data.unread_comment || 0)
      if (data.unread_system !== undefined) this.unreadCounts.system = Number(data.unread_system || 0)
      if (data.unread_fans !== undefined) this.unreadCounts.fans = Number(data.unread_fans || 0)
      if (data.unread_follow !== undefined) this.unreadCounts.follow = Number(data.unread_follow || 0)
      this.syncGlobalUnread()
    },
    async fetchData(showLoading = true) {
      if (this.isFetchingData) return
      this.isFetchingData = true

      // 仅在无缓存且需要 loading 时显示 loading（命中缓存秒开则不闪 loading）
      const hasCache = this.privateList.length > 0 || this.groupList.length > 0
      if (showLoading && !hasCache) {
        this.loading = true
      }

      try {
        // 使用 SWR 缓存：命中缓存秒开，后台静默刷新
        const { data, fromCache, stale } = await swr(
          CACHE_KEYS.MESSAGE_LIST,
          async () => {
            // 并行请求私聊 + 群聊
            const [privateRes, groupRes] = await Promise.all([
              request('message.php', { action: 'getMessageIndex' }, 'GET'),
              request('group.php', { action: 'group_list', page: 1 }, 'GET')
            ])

            // 组装成统一结构返回给缓存层
            const result = { code: 0, data: { privateRes, groupRes } }
            return result
          },
          {
            ttl: 15000,  // 消息列表 15 秒内用缓存（消息实时性要求较高）
            onRefresh: (newData) => {
              // 后台刷新成功：subscribe 也会触发，这里冗余保险
              this._applyMessageData(newData)
            }
          }
        )

        if (fromCache && data) {
          // 命中缓存：立即渲染
          this._applyMessageData(data)
          this.loading = false
          // stale=true 表示后台正在刷新，刷新完会通过 subscribe 回调更新
          if (!stale) this.isFetchingData = false
          return
        }

        // 非缓存命中（首次请求）
        if (data) {
          this._applyMessageData(data)
        }
      } catch (e) {
        console.log('[message] fetchData error', e)
      } finally {
        if (showLoading) setTimeout(() => { this.loading = false }, 220)
        this.isFetchingData = false
      }
    },
    // 应用消息数据到 UI（提取公共逻辑，缓存命中和首次请求共用）
    _applyMessageData(data) {
      if (!data || typeof data !== 'object') return
      const { privateRes, groupRes } = data

      // 处理私聊数据
      if (privateRes && privateRes.code === 0) {
        const d = privateRes.data || {}
        this.unreadCounts = {
          like: Number(d.unread_like || 0),
          comment: Number(d.unread_comment || 0),
          system: Number(d.unread_system || 0),
          fans: Number(d.unread_fans || 0),
          follow: Number(d.unread_follow || 0)
        }
        this.lastSystem = d.last_system_notice || {}

        this.privateList = (d.chat_list || []).map(item => ({
          ...item,
          avatar: item.avatar ? this.fixUrl(item.avatar) : '/static/logo.png',
          unread: Number(item.unread || 0)
        }))
      }

      // 处理群聊数据
      if (groupRes && groupRes.code === 0) {
        this.groupList = (groupRes.data || []).filter(item => item.type === 'group').map(item => ({
          ...item,
          id: Number(item.id || 0),
          member_count: Number(item.member_count || 0),
          unread: Number(item.unread || 0),
          avatar: this.fixUrl(item.avatar || '/static/logo.png')
        }))
      }

      this.syncGlobalUnread()
    },
    syncGlobalUnread() {
      const privateUnread = this.privateList.reduce((s, i) => s + Number(i.unread || 0), 0)
      const groupUnread = this.groupList.reduce((s, i) => s + Number(i.unread || 0), 0)
      const u = this.unreadCounts
      const total = Number(u.like || 0) + Number(u.comment || 0) + Number(u.system || 0) + Number(u.fans || 0) + Number(u.follow || 0) + privateUnread + groupUnread
      setTimeout(() => {
        uni.setStorageSync('global_message_unread', total)
      }, 0)
      uni.$emit('message_unread_updated', total)
    },
    async fetchPrivateIndex() {
      const res = await request('message.php', { action: 'getMessageIndex' }, 'GET')
      if (res.code !== 0) return

      const d = res.data || {}
      this.unreadCounts = {
        like: Number(d.unread_like || 0),
        comment: Number(d.unread_comment || 0),
        system: Number(d.unread_system || 0),
        fans: Number(d.unread_fans || 0),
        follow: Number(d.unread_follow || 0)
      }
      this.lastSystem = d.last_system_notice || {}

      const list = (d.chat_list || []).map(item => ({
        ...item,
        avatar: item.avatar ? this.fixUrl(item.avatar) : '/static/logo.png',
        unread: Number(item.unread || 0)
      }))

      this.privateList = list
    },
    async fetchGroupList() {
      const res = await request('group.php', { action: 'group_list', page: 1 }, 'GET')
      if (res.code !== 0) return

      const list = (res.data || []).filter(item => item.type === 'group').map(item => ({
        ...item,
        id: Number(item.id || 0),
        member_count: Number(item.member_count || 0),
        unread: Number(item.unread || 0),
        avatar: this.fixUrl(item.avatar || '/static/logo.png')
      }))

      this.groupList = list
    },
    toChat(item) {
      if (item) {
        item.unread = 0
        request('message.php', { action: 'markChatRead', chatId: item.chat_id }, 'POST').catch(() => {})
        invalidate(CACHE_KEYS.MESSAGE_LIST)
        this.syncGlobalUnread()
      }
      uni.navigateTo({
        url: `/pages/message/chat?targetId=${item.peer?.uid || item.target_uid}&name=${encodeURIComponent(item.name)}&avatar=${encodeURIComponent(item.avatar)}`
      })
    },
    toGroupChat(item) {
      if (!item) return
      item.unread = 0
      request('group.php', { action: 'group_mark_read', groupId: item.id }, 'POST').catch(() => {})
      invalidate(CACHE_KEYS.MESSAGE_LIST)
      this.syncGlobalUnread()
      uni.navigateTo({
        url: `/pages/message/group-chat?groupId=${item.id}&name=${encodeURIComponent(item.name)}`
      })
    },
    toGroupInfo(item) {
      if (!item) return
      uni.navigateTo({
        url: `/pages/message/group-info?groupId=${item.id}`
      })
    },
    async markAllRead() {
      await Promise.allSettled([
        request('message.php', { action: 'markAllRead' }, 'POST'),
        request('group.php', { action: 'group_mark_all_read' }, 'POST')
      ])
      invalidate(CACHE_KEYS.MESSAGE_LIST)
      this.fetchData(false)
    },
    toDetails(type) {
      if (type === 'like') {
        this.unreadCounts.like = 0
        request('message.php', { action: 'markNoticeRead', type: 'like' }, 'POST').catch(() => {})
      } else if (type === 'comment') {
        this.unreadCounts.comment = 0
        request('message.php', { action: 'markNoticeRead', type: 'comment' }, 'POST').catch(() => {})
      }
      invalidate(CACHE_KEYS.MESSAGE_LIST)
      this.syncGlobalUnread()
      uni.navigateTo({ url: `/pages/message/details?type=${type}` })
    },
    toSystemNotice() {
      this.unreadCounts.system = 0
      request('message.php', { action: 'markNoticeRead', type: 'system' }, 'POST').catch(() => {})
      invalidate(CACHE_KEYS.MESSAGE_LIST)
      this.syncGlobalUnread()
      uni.navigateTo({ url: '/pages/message/system-notices' })
    },
    onMessageReadChanged(payload = {}) {
      if (payload.type === 'like') this.unreadCounts.like = 0
      if (payload.type === 'comment') this.unreadCounts.comment = 0
      if (payload.type === 'system') this.unreadCounts.system = 0
      if (!payload.skipFetch) {
        if (payload.chatId || payload.targetId) {
          this.privateList = this.privateList.map(item => {
            const sameChat = payload.chatId && Number(item.chat_id) === Number(payload.chatId)
            const sameTarget = payload.targetId && Number(item.target_uid) === Number(payload.targetId)
            return sameChat || sameTarget ? { ...item, unread: 0 } : item
          })
        }
        if (payload.groupId) {
          this.groupList = this.groupList.map(item => (
            Number(item.id) === Number(payload.groupId) ? { ...item, unread: 0 } : item
          ))
        }
        // 已读状态变更：立即失效缓存，避免下次 fetchData 恢复旧未读数
        invalidate(CACHE_KEYS.MESSAGE_LIST)
        if (this._readRefreshTimer) clearTimeout(this._readRefreshTimer)
        this._readRefreshTimer = setTimeout(() => {
          this.fetchData(false)
        }, 800)
      }
    },
    formatCount(n) {
      return n > 99 ? '99+' : String(n || 0)
    },
    formatTime(value) {
      if (!value) return ''
      const str = String(value).trim()
      // 兼容 "YYYY-MM-DD HH:mm[:ss]" / ISO / 时间戳
      let date
      if (/^\d+$/.test(str)) {
        date = new Date(Number(str))
      } else if (str.indexOf('T') !== -1) {
        // ISO 格式（群聊 last_msg_time）
        date = new Date(str)
      } else {
        // "YYYY-MM-DD HH:mm[:ss]" → 替换为 "/" 让 iOS 可解析
        date = new Date(str.replace(/-/g, '/'))
      }
      if (isNaN(date.getTime())) {
        return str.length >= 16 ? str.slice(11, 16) : str
      }

      const now = new Date()
      // 今天 00:00 的时间戳
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const msgTime = date.getTime()
      const oneDayMs = 24 * 60 * 60 * 1000

      const hh = String(date.getHours()).padStart(2, '0')
      const mm = String(date.getMinutes()).padStart(2, '0')

      // 今天：只显示 HH:mm
      if (msgTime >= todayStart) {
        return `${hh}:${mm}`
      }
      // 昨天
      if (msgTime >= todayStart - oneDayMs) {
        return '昨天'
      }
      // 前天
      if (msgTime >= todayStart - 2 * oneDayMs) {
        return '前天'
      }
      // 一周内：显示星期几
      const diffDays = Math.floor((todayStart - msgTime) / oneDayMs)
      if (diffDays < 7) {
        const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        return weekMap[date.getDay()]
      }
      // 同年：显示 MM-DD
      if (date.getFullYear() === now.getFullYear()) {
        const M = String(date.getMonth() + 1).padStart(2, '0')
        const D = String(date.getDate()).padStart(2, '0')
        return `${M}-${D}`
      }
      // 跨年：显示 YYYY-MM-DD
      const Y = date.getFullYear()
      const M = String(date.getMonth() + 1).padStart(2, '0')
      const D = String(date.getDate()).padStart(2, '0')
      return `${Y}-${M}-${D}`
    },
    fixUrl(url) {
      if (!url) return '/static/logo.png'
      if (String(url).startsWith('http')) return url
      if (String(url).startsWith('/static/')) return url
      const cacheKey = String(url)
      if (this.fixUrlCache[cacheKey]) return this.fixUrlCache[cacheKey]
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      const result = base + (cacheKey.startsWith('/') ? cacheKey : '/' + cacheKey)
      this.fixUrlCache[cacheKey] = result
      return result
    },
    onAvatarError(item) {
      // 头像加载失败：按标识定位原始数据项回退默认图（combinedMsgList 的 index 与 privateList/groupList 不对应）
      if (item.type === 'private') {
        const idx = this.privateList.findIndex(p => Number(p.chat_id) === Number(item.chat_id))
        if (idx >= 0) this.$set(this.privateList, idx, { ...this.privateList[idx], avatar: '/static/logo.png' })
      } else {
        const idx = this.groupList.findIndex(g => Number(g.id) === Number(item.id))
        if (idx >= 0) this.$set(this.groupList, idx, { ...this.groupList[idx], avatar: '/static/logo.png' })
      }
    }
  }
}
</script>

<style scoped>
.msg-page {
  background:#f5f6f8;
  height:var(--tcy-vh, 100vh);
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.fixed-header{
  background:#fff;
  flex-shrink:0;
  position:relative;
  z-index:10;
  box-shadow:0 2rpx 6rpx rgba(0,0,0,0.04);
}

.main-scroll{
  flex:1;
  min-height:0;
  background:#fff;
  box-sizing:border-box;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.page-card{
  margin:0;
  background:#fff;
  border-radius:0;
  overflow:hidden;
}

.header-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:24rpx 32rpx 20rpx;
  padding-top: calc(24rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
}
.page-title{ font-size:44rpx; font-weight:900; color:#15171a; }
.header-actions{ display:flex; gap:28rpx; }
.search-entry-btn { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; cursor: pointer; color:#6b7280; }
.search-entry-btn:active { opacity: .65; }
.add-entry-btn { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; cursor: pointer; color:#6b7280; }
.add-entry-btn:active { opacity: .65; }
.header-icon-img { width: 44rpx; height: 44rpx; display: block; }

.add-menu-mask{
  position:fixed;
  inset:0;
  z-index:1000;
  background:rgba(0,0,0,0.35);
  animation: maskFadeIn 0.2s ease;
}
@keyframes maskFadeIn{
  from{ opacity:0; }
  to{ opacity:1; }
}
.add-menu-sheet{
  position:absolute;
  right:20rpx;
  top:calc(120rpx + var(--status-bar-height, 0px));
  width:260rpx;
  background:linear-gradient(145deg,#2d3748 0%,#1a202c 100%);
  border-radius:20rpx;
  overflow:hidden;
  animation: sheetUp 0.25s cubic-bezier(0.2,0.8,0.2,1);
  box-shadow:0 12rpx 40rpx rgba(0,0,0,0.35),0 2rpx 8rpx rgba(0,0,0,0.2);
  padding:8rpx 0;
}
.add-menu-sheet::before{
  content:'';
  position:absolute;
  right:20rpx;
  top:-10rpx;
  width:0;
  height:0;
  border-left:10rpx solid transparent;
  border-right:10rpx solid transparent;
  border-bottom:10rpx solid #2d3748;
}
@keyframes sheetUp{
  from{ transform:translateY(-10rpx) scale(0.96); opacity:0; }
  to{ transform:translateY(0) scale(1); opacity:1; }
}
.add-menu-item{
  display:flex;
  align-items:center;
  padding:18rpx 20rpx;
  transition:background 0.2s;
  gap:14rpx;
}
.add-menu-item:active{
  background:rgba(255,255,255,0.08);
}
.add-menu-item + .add-menu-item{
  border-top:1rpx solid rgba(255,255,255,0.06);
}
.add-menu-icon-wrap{
  width:40rpx;
  height:40rpx;
  border-radius:10rpx;
  background:linear-gradient(135deg,#ff4d6d 0%,#ff2442 100%);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
  color:#fff;
  box-shadow:0 2rpx 8rpx rgba(255,77,109,0.3);
}
.add-menu-icon-img{
  width:22rpx;
  height:22rpx;
  display:block;
}
.add-menu-text{
  font-size:30rpx;
  color:#fff;
  font-weight:400;
  flex:1;
}

.notice-tabs{
  display:flex;
  align-items:center;
  justify-content:space-around;
  padding:24rpx 32rpx 32rpx;
  border-bottom:1rpx solid #f3f4f6;
}
.notice-tab{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:12rpx;
  position:relative;
  padding:8rpx 20rpx;
  border-radius:24rpx;
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
}
.notice-tab:active{
  transform:scale(0.92);
}
.tab-icon-wrap{
  width:96rpx; height:96rpx;
  border-radius:30rpx;
  display:flex; align-items:center; justify-content:center;
  transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
  position:relative;
  overflow:hidden;
  color:#fff;
}
.tab-icon-img{
  width:52rpx;
  height:52rpx;
  position:relative;
  z-index:1;
}
.like-icon{
  background:linear-gradient(135deg, #FF6B9D 0%, #FF3D6E 100%);
  box-shadow:0 8rpx 20rpx rgba(255,61,110,0.32);
}
.comment-icon{
  background:linear-gradient(135deg, #5B8DEF 0%, #3B6FE0 100%);
  box-shadow:0 8rpx 20rpx rgba(59,111,224,0.32);
}
.notice-icon{
  background:linear-gradient(135deg, #FFB547 0%, #FF8A3D 100%);
  box-shadow:0 8rpx 20rpx rgba(255,138,61,0.32);
}
.notice-tab:active .like-icon{
  box-shadow:0 4rpx 10rpx rgba(255,61,110,0.28);
}
.notice-tab:active .comment-icon{
  box-shadow:0 4rpx 10rpx rgba(59,111,224,0.28);
}
.notice-tab:active .notice-icon{
  box-shadow:0 4rpx 10rpx rgba(255,138,61,0.28);
}
.tab-label{ font-size:26rpx; color:#374151; font-weight:600; letter-spacing:1rpx; }
.tab-badge{
  position:absolute;
  top:-2rpx;
  right:6rpx;
  min-width:34rpx;
  height:34rpx;
  padding:0 10rpx;
  border-radius:17rpx;
  background:linear-gradient(135deg, #ff2442 0%, #ff4d6d 100%);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4rpx 12rpx rgba(255,36,66,0.4);
  border:2rpx solid #fff;
  z-index:2;
}
.tab-badge text{ color:#fff; font-size:18rpx; font-weight:800; }

.msg-list{
  padding:0;
}

.chat-row{
  display:flex;
  align-items:center;
  padding:28rpx 32rpx;
  position:relative;
  transition:background 0.2s;
}
.chat-row:active{
  background:#f9fafb;
}
.chat-row + .chat-row{ border-top:1rpx solid #f3f4f6; }

.avatar{
  width:104rpx;
  height:104rpx;
  border-radius:28rpx;
  margin-right:24rpx;
  background:#f3f4f6;
  flex-shrink:0;
}
.system-avatar{
  background:linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
  display:flex;
  align-items:center;
  justify-content:center;
}
.sys-icon{ font-size:40rpx; }

.ava-wrap{ position:relative; overflow:hidden; }
.ava-wrap .img{ width:100%; height:100%; border-radius:inherit; display:block; }

/* 在线状态: 头像右下角小圆点（.ava-wrap 是 overflow:hidden，圆点放在头像内）
   绿=在线，灰=离线，由后端 chat_list 的 item.online 驱动 */
.online-dot{
  position:absolute;
  right:8rpx;
  bottom:8rpx;
  width:22rpx;
  height:22rpx;
  border-radius:50%;
  background:#c9ced6;
  border:3rpx solid #fff;
  box-sizing:border-box;
}
.online-dot.on{ background:#22c55e; }

.chat-body{ flex:1; overflow:hidden; }
.chat-top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10rpx; gap:16rpx; }
.name-wrap{ display:flex; align-items:center; gap:10rpx; min-width:0; flex:1; overflow:hidden; }
.name{
  font-size:32rpx;
  font-weight:800;
  color:#111;
  max-width:380rpx;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.time-badge{
  display:flex;
  align-items:center;
  gap:12rpx;
  flex-shrink:0;
}
.time{ font-size:24rpx; color:#9ca3af; flex-shrink:0; }
.preview{
  font-size:28rpx;
  color:#6b7280;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  display:block;
  line-height:1.5;
}
.dot{
  width:20rpx;
  height:20rpx;
  background:linear-gradient(135deg, #ff2442 0%, #ff4d6d 100%);
  border-radius:50%;
  margin-left:16rpx;
  box-shadow:0 4rpx 12rpx rgba(255,36,66,0.35);
}

.badge-inline{
  background:linear-gradient(135deg, #ff2442 0%, #ff4d6d 100%);
  color:#fff;
  min-width:40rpx;
  height:40rpx;
  padding:0 12rpx;
  border-radius:20rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:22rpx;
  font-weight:800;
  flex-shrink:0;
  box-shadow:0 4rpx 12rpx rgba(255,36,66,0.35);
}

.empty{ padding:140rpx; text-align:center; color:#9ca3af; font-size:28rpx; }
.footer{ text-align:center; font-size:22rpx; color:#d1d5db; padding:36rpx 0 32rpx; }

.skeleton-container{ animation:fadeIn .3s ease; padding:0 32rpx 20rpx; }
@keyframes fadeIn{ from{opacity:0} to{opacity:1} }
.skeleton-anim{ background:#eceff3; border-radius:12rpx; animation:skeleton-loading 1.4s infinite; background-size:200% 100%; }
@keyframes skeleton-loading{ 0%{background-position:200% 50%} 100%{background-position:0 50%} }
.sk-text{ height:36rpx; margin-bottom:14rpx; }
.sk-name{ width:220rpx; height:40rpx; }
.sk-time{ width:100rpx; height:32rpx; }
.sk-preview{ width:75%; height:32rpx; margin-top:10rpx; }
.sk-avatar{ width:104rpx; height:104rpx; border-radius:28rpx; }

.vip-rainbow-text {
  background: linear-gradient(90deg, #ff2442, #ff7a00, #ffd400, #00c853, #00b0ff, #aa00ff, #ff2442);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: vipRainbowMove 4s linear infinite;
  font-weight: 900 !important;
}
@keyframes vipRainbowMove {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

</style>