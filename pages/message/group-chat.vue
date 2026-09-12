<template>
  <view class="chat-page">
    <view class="top-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left" @click="goBack">
          <text class="back-text">返回</text>
        </view>
        <view class="nav-center" @click="openGroupInfo">
          <text class="nav-title">{{ groupName || '群聊' }}（{{ memberCount }}）</text>
        </view>
        <view class="nav-right" @click="toggleMore">
          <text class="more-icon">⋯</text>
        </view>
      </view>
    </view>

    <view class="content" :style="contentStyle">
      <scroll-view
        class="msg-scroll"
        scroll-y
        :scroll-top="scrollTop"
        :scroll-with-animation="scrollAnim"
        @scroll="onScroll"
        @click="onPageTap"
      >
        <view class="msg-container" id="msgContainer">
          <view v-if="hasMoreOlder" class="load-more" @click="loadOlder">
            <text>{{ loadingOlder ? '加载中...' : '加载更早消息' }}</text>
          </view>

          <view v-if="loading" class="loading-box">
            <text>消息加载中...</text>
          </view>

          <template v-else>
            <view v-for="(msg, index) in msgList" :key="msg.id || msg.tempId" class="msg-item">
              <view v-if="showTime(index)" class="msg-time">{{ fmtTime(msg.create_time) }}</view>

              <view v-if="msg.type === 'notice'" class="notice-msg">
                <text>{{ msg.sender_name }} {{ msg.content }}</text>
              </view>

              <view v-else-if="msg.type === 'recalled'" class="notice-msg recalled-msg">
                <text>{{ msg.is_me ? '你' : msg.sender_name }}撤回了一条消息</text>
              </view>

              <view
                v-else
                class="msg-row"
                :class="{ me: msg.is_me }"
                @longpress="openMsgMenu(msg)"
              >
                <image class="msg-avatar" :src="msg.avatar" mode="aspectFill" @click="goUser(msg.sender_id)" />

                <view class="msg-main">
                  <text v-if="!msg.is_me" class="sender-name">{{ msg.sender_name }}</text>

                  <view class="bubble" :class="{ 'bubble-me': msg.is_me }">
                    <view v-if="msg.type === 'text' || msg.type === 'emoticon'" class="bubble-txt">
                      <template v-for="(part, idx) in parseEmoticons(msg.content)" :key="idx">
                        <image v-if="part.type === 'emoticon'" :src="fixUrl(part.url)" class="inline-emoticon" mode="aspectFit" @click.stop="previewEmoticon(part.url)" />
                        <text v-else selectable>{{ part.text }}</text>
                      </template>
                    </view>

                    <image
                      v-else-if="msg.type === 'image'"
                      class="bubble-image"
                      :src="msg.content"
                      mode="widthFix"
                      @click="previewImage(msg.content)"
                    />

                    <view v-else-if="msg.type === 'card' && msg.extra" class="card-box" @click="goUser(msg.extra.user_id)">
                      <image class="card-avatar" :src="fixUrl(msg.extra.avatar)" mode="aspectFill" />
                      <view class="card-info">
                        <text class="card-name">{{ msg.extra.name || '名片' }}</text>
                        <text class="card-tip">点击查看用户资料</text>
                      </view>
                    </view>

                    <view v-else-if="msg.type === 'redpacket' && msg.redPacket" class="grp-rp-card" :class="{ received: msg.redPacket.status !== 0 }" @click.stop="onGroupRedPacketClick(msg)">
                      <view class="grp-rp-head">
                        <view class="grp-rp-icon">
                          <image src="/static/icon/redpacket.svg" class="grp-rp-icon-img" mode="aspectFit"></image>
                        </view>
                        <view class="grp-rp-meta">
                          <text class="grp-rp-title">{{ msg.redPacket.status === 1 ? '红包已抢完' : (msg.redPacket.status === 2 ? '红包已过期' : '群红包来啦') }}</text>
                          <text class="grp-rp-greeting">{{ msg.redPacket.greeting || '恭喜发财，大吉大利' }}</text>
                        </view>
                      </view>
                      <view class="grp-rp-foot">
                        <text class="grp-rp-status">{{ msg.redPacket.status === 0 ? ('已领' + (msg.redPacket.count - msg.redPacket.left_count) + '/' + msg.redPacket.count + '个') : (msg.redPacket.status === 1 ? '全部领完' : '已过期') }}</text>
                      </view>
                    </view>

                    <text v-else class="bubble-text">{{ msg.content }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view v-if="!msgList.length" class="loading-box">
              <text>暂无群消息</text>
            </view>
          </template>
          <view :style="{ height: bottomGap + 'px' }"></view>
        </view>
      </scroll-view>

      <view class="input-wrapper" :style="inputWrapperStyle">
        <view class="chat-disabled-tip" v-if="!canChat">{{ chatDisabledReason }}</view>
        <view class="input-inner">
          <view class="tool-btn emoji-btn" @click="toggleEmojiPicker">
            <image src="/static/icon/smile-color.svg" class="tool-icon-img" mode="aspectFit"></image>
          </view>
          <view class="rich-input">
            <!-- #ifdef H5 -->
            <div
              ref="richInput"
              class="text-input rich-input-h5"
              :class="{ disabled: !canChat }"
              :contenteditable="canChat ? 'true' : 'false'"
              data-placeholder="说点什么..."
              @input="onRichInput"
              @focus="onInputFocus"
              @blur="onInputBlur"
              @keydown="onRichKeydown"
            ></div>
            <!-- #endif -->
            <!-- #ifndef H5 -->
            <textarea
              class="text-input"
              v-model="inputTxt"
              :disabled="!canChat"
              placeholder="说点什么..."
              confirm-type="send"
              :adjust-position="false"
              :cursor-spacing="0"
              auto-height
              :maxlength="2000"
              @focus="onInputFocus"
              @blur="onInputBlur"
              @confirm="sendText"
            />
            <!-- #endif -->
          </view>
          <view class="tool-btn add-btn" @click="toggleMoreActions">
            <image src="/static/icon/plus-ref.svg" class="tool-icon-img" mode="aspectFit"></image>
          </view>
          <view class="send-btn" v-if="inputTxt.trim()" :class="{ active: canSend }" @click="sendText">
            <text class="send-text">发送</text>
          </view>
        </view>
      </view>

      <!-- 表情选择器 -->
      <view class="emoji-picker" v-if="showEmojiPicker">
        <view class="emoji-tabs">
          <view class="emoji-tab" :class="{ active: emojiTab === 'recent' }" @click="switchToRecent">最近</view>
          <view class="emoji-tab" :class="{ active: emojiTab === 'default' }" @click="emojiTab = 'default'">全部</view>
        </view>
        <scroll-view class="emoji-scroll" scroll-y>
          <!-- 最近使用 -->
          <view class="emoji-grid" v-if="emojiTab === 'recent'">
            <view class="emoji-item" v-for="emo in recentlyUsedEmoticons" :key="emo.id" @click="insertEmoji(emo)">
              <image class="emoji-img" :src="emo.url" mode="aspectFit" @error="onEmojiImgError" />
            </view>
            <view class="empty-tip" v-if="recentlyUsedEmoticons.length === 0">
              <text>暂无最近使用</text>
            </view>
          </view>
          <!-- 全部表情 -->
          <view class="emoji-grid" v-if="emojiTab === 'default'">
            <view class="emoji-item" v-for="emo in defaultEmoticons" :key="emo.id" @click="insertEmoji(emo)">
              <image class="emoji-img" :src="emo.url" mode="aspectFit" @error="onEmojiImgError" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <XhsModal
      :show="moreVisible"
      title="更多操作"
      ok-text="关闭"
      cancel-text="取消"
      @update:show="moreVisible = false"
      @confirm="moreVisible = false"
    >
      <view class="action-sheet">
        <view class="action-sheet-item" @click="openGroupInfo">群资料</view>
        <view class="action-sheet-item" @click="sendImage">发送图片</view>
        <view class="action-sheet-item" @click="openShareModal">分享群聊</view>
      </view>
    </XhsModal>

    <XhsModal
      :show="shareModal.show"
      title="分享群聊给好友"
      ok-text="发送"
      cancel-text="取消"
      @update:show="shareModal.show = false"
      @confirm="submitShare"
    >
      <view v-if="shareFriends.length" class="modal-list">
        <view
          v-for="friend in shareFriends"
          :key="friend.id"
          class="modal-item"
          @click="toggleSharePick(friend.id)"
        >
          <image class="modal-avatar" :src="fixUrl(friend.avatar)" mode="aspectFill" />
          <view class="modal-info">
            <text class="modal-name">{{ friend.name || friend.username }}</text>
            <text class="modal-sub">@{{ friend.username }}</text>
          </view>
          <view class="check-dot" :class="{ active: shareSelected[friend.id] }"></view>
        </view>
      </view>
      <view v-else class="modal-empty">暂无可分享的互关好友</view>
    </XhsModal>

    <XhsModal
      :show="msgMenuVisible"
      title="消息操作"
      ok-text="关闭"
      cancel-text="取消"
      @update:show="closeMsgMenu"
      @confirm="closeMsgMenu"
    >
      <view class="action-sheet">
        <view v-if="msgMenu.canCopy" class="action-sheet-item" @click="copyMsg">复制</view>
        <view v-if="msgMenu.canRecall" class="action-sheet-item danger" @click="confirmRecall">撤回</view>
        <view v-if="!msgMenu.canCopy && !msgMenu.canRecall" class="action-sheet-empty">当前消息暂无可用操作</view>
      </view>
    </XhsModal>

    <XhsModal
      :show="announcementPopup.visible"
      placement="center"
      title="群公告"
      :hide-footer="true"
      @update:show="closeAnnouncementPopup"
      @cancel="closeAnnouncementPopup"
    >
      <view class="announcement-popup">
 
        <text class="announcement-popup-title">{{ groupName || '群聊公告' }}</text>
        <scroll-view scroll-y class="announcement-scroll">
          <text class="announcement-popup-text" selectable>{{ announcementPopup.content }}</text>
        </scroll-view>
        <view class="announcement-popup-btn" @click="closeAnnouncementPopup">我知道了</view>
      </view>
    </XhsModal>

    <XhsConfirm
      :visible="confirm.show"
      :title="confirm.title"
      :message="confirm.message"
      @confirm="onConfirmOk"
      @cancel="onConfirmCancel"
    />

    <view class="more-actions-panel" v-if="showMoreActions">
      <view class="more-actions-grid">
        <view class="more-action-item" @click="openImagePicker">
          <view class="more-action-icon-wrap">
            <image src="/static/icon/album.svg" class="more-action-icon" mode="aspectFit"></image>
          </view>
          <text class="more-action-label">相册</text>
        </view>
        <view class="more-action-item" @click="openRedPacket">
          <view class="more-action-icon-wrap">
            <image src="/static/icon/redpacket.svg" class="more-action-icon" mode="aspectFit"></image>
          </view>
          <text class="more-action-label">红包</text>
        </view>
        <view class="more-action-item" @click="openTransfer">
          <view class="more-action-icon-wrap">
            <image src="/static/icon/transfer.svg" class="more-action-icon" mode="aspectFit"></image>
          </view>
          <text class="more-action-label">转账</text>
        </view>
        <view class="more-action-item" @click="openCardPicker">
          <view class="more-action-icon-wrap">
            <image src="/static/icon/card.svg" class="more-action-icon" mode="aspectFit"></image>
          </view>
          <text class="more-action-label">名片</text>
        </view>
      </view>
    </view>

    <!-- 群红包发送弹窗 -->
    <view class="grp-rp-send-overlay" v-if="redPacket.show" @click="closeRedPacket" @touchmove.stop.prevent>
      <view class="grp-rp-send-modal" @click.stop>
        <!-- 顶部红色区域 -->
        <view class="grp-rp-send-header">
          <view class="grp-rp-send-close" @click="closeRedPacket">
            <text class="grp-rp-close-icon">×</text>
          </view>
          <text class="grp-rp-send-title">发群红包</text>
          <view class="grp-rp-amount-field">
            <text class="grp-rp-amount-symbol">¥</text>
            <input class="grp-rp-amount-input" v-model="redPacket.amount" type="digit" placeholder="0.00" placeholder-class="grp-rp-amount-placeholder" />
          </view>
          <text class="grp-rp-amount-tip">{{ redPacket.type === 'lucky' ? '总金额' : '单个金额' }}</text>
        </view>
        <!-- 底部白色卡片 -->
        <view class="grp-rp-send-body">
          <!-- 类型切换 -->
          <view class="grp-rp-type-tabs">
            <view class="grp-rp-type-tab" :class="{ active: redPacket.type === 'lucky' }" @click="redPacket.type = 'lucky'">
              <text>拼手气</text>
            </view>
            <view class="grp-rp-type-tab" :class="{ active: redPacket.type === 'fixed' }" @click="redPacket.type = 'fixed'">
              <text>普通红包</text>
            </view>
          </view>
          <view class="grp-rp-field-row">
            <text class="grp-rp-field-label">红包个数</text>
            <view class="grp-rp-count-field">
              <input class="grp-rp-count-input" v-model="redPacket.count" type="number" placeholder="个数" />
              <text class="grp-rp-count-unit">个</text>
            </view>
          </view>
          <view class="grp-rp-calc" v-if="redPacket.amount && redPacket.count">
            <text class="grp-rp-calc-txt" v-if="redPacket.type === 'lucky'">拼手气红包，{{ redPacket.count }}个共¥{{ Number(redPacket.amount || 0).toFixed(2) }}，随机分配</text>
            <text class="grp-rp-calc-txt" v-else>普通红包，每人¥{{ (Number(redPacket.amount || 0) / Number(redPacket.count || 1)).toFixed(2) }}，共{{ redPacket.count }}个</text>
          </view>
          <view class="grp-rp-divider"></view>
          <view class="grp-rp-field-row">
            <text class="grp-rp-field-label">祝福语</text>
            <input class="grp-rp-greeting-input" v-model="redPacket.greeting" maxlength="50" placeholder="恭喜发财，大吉大利" />
          </view>
          <view class="grp-rp-divider"></view>
          <view class="grp-rp-field-row">
            <text class="grp-rp-field-label">支付密码</text>
            <input class="grp-rp-password-input" v-model="redPacket.payPassword" password placeholder="请输入支付密码" />
          </view>
          <view class="grp-rp-send-btn" :class="{ disabled: redPacket.sending }" @click="submitRedPacket">
            <text class="grp-rp-send-btn-text">{{ redPacket.sending ? '发送中...' : '塞钱进红包' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 群红包领取弹窗 -->
    <view class="grp-rp-claim-overlay" v-if="rpClaim.show" @click="closeRpClaim" @touchmove.stop.prevent>
      <view class="grp-rp-claim-container" @click.stop>
        <view class="grp-rp-claim-close" @click="closeRpClaim">×</view>

        <!-- 未拆开 -->
        <view class="grp-rp-claim-main" v-if="!rpClaim.claimed">
          <view class="grp-rp-claim-top">
            <view class="grp-rp-claim-sender">
              <view class="grp-rp-claim-ava-wrap">
                <image class="grp-rp-claim-ava-img" :src="rpClaim.senderAvatar || '/static/logo.png'" mode="aspectFill" />
              </view>
              <text class="grp-rp-claim-sender-name">来自{{ rpClaim.senderName || '群成员' }}的红包</text>
            </view>
            <text class="grp-rp-claim-greeting">{{ rpClaim.greeting || '恭喜发财，大吉大利' }}</text>
          </view>
          <view class="grp-rp-claim-opener"><view class="grp-rp-claim-curve"></view></view>
          <view class="grp-rp-claim-bottom">
            <view class="grp-rp-claim-open-btn" :class="{ rotating: rpClaim.rotating, loading: rpClaim.claiming }" @click="claimRedPacket">
              <text class="grp-rp-claim-open-text">開</text>
            </view>
            <text class="grp-rp-claim-info" v-if="rpClaim.myClaimed">您已领过，¥{{ rpClaim.myAmount }}</text>
            <text class="grp-rp-claim-info" v-else-if="rpClaim.status === 1">红包已抢完</text>
            <text class="grp-rp-claim-info" v-else-if="rpClaim.status === 2">红包已过期</text>
          </view>
        </view>

        <!-- 拆开结果 -->
        <view class="grp-rp-claim-result" v-else>
          <view class="grp-rp-result-header">
            <view class="grp-rp-result-icon-wrap">
              <image v-if="rpClaim.success" src="/static/icon/gift-white.svg" class="grp-rp-result-icon" mode="aspectFit"></image>
              <image v-else src="/static/icon/x-circle-white.svg" class="grp-rp-result-icon" mode="aspectFit"></image>
            </view>
            <text class="grp-rp-result-title">{{ rpClaim.success ? '恭喜你成功领取了红包' : '很遗憾' }}</text>
          </view>
          <view class="grp-rp-result-body" v-if="rpClaim.success">
            <view class="grp-rp-result-amount">
              <text class="grp-rp-result-symbol">¥</text>
              <text class="grp-rp-result-value">{{ rpClaim.amount }}</text>
            </view>
            <text class="grp-rp-result-desc">已存入你的余额</text>
          </view>
          <view class="grp-rp-result-body" v-else>
            <text class="grp-rp-result-desc">{{ rpClaim.resultText }}</text>
          </view>
          <view class="grp-rp-result-footer">
            <view class="grp-rp-result-btn" @click="closeRpClaim"><text>收下</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request, baseUrl, uploadFile } from '../../common/request.js'
import ws from '../../common/ws.js'
import XhsConfirm from '../../components/XhsConfirm.vue'
import XhsModal from '../../components/XhsModal.vue'

export default {
  components: {
    XhsConfirm,
    XhsModal
  },
  data() {
    return {
      statusBarHeight: 20,
      safeBottom: 0,
      keyboardHeight: 0,
      useKeyboardPush: false,
      groupId: 0,
      showMoreActions: false,
      groupName: '',
      memberCount: 0,
      myId: 0,
      myRole: 'member',
      msgList: [],
      inputTxt: '',
      loading: true,
      loadingOlder: false,
      hasMoreOlder: false,
      sending: false,
      scrollTop: 0,
      scrollAnim: true,
      lastScrollTop: 0,
      isAtBottom: true,
      moreVisible: false,
      msgMenuVisible: false,
      msgMenu: { msg: null, canCopy: false, canRecall: false },
      confirm: { show: false, title: '', message: '', resolve: null },
      announcementPopup: { visible: false, content: '', storageKey: '' },
      canChat: true,
      chatDisabledReason: '',
      // 分享群聊
      shareModal: { show: false },
      shareFriends: [],
      shareSelected: {},
      groupIdentityCode: '',
      groupAvatar: '',
      // 群红包发送
      redPacket: {
        show: false, amount: '', count: '1', type: 'lucky',
        greeting: '恭喜发财，大吉大利', payPassword: '', sending: false
      },
      // 群红包领取
      rpClaim: {
        show: false, claimed: false, success: false, rotating: false, claiming: false,
        msgId: null, redPacketId: 0, amount: '0.00', greeting: '',
        senderName: '', senderAvatar: '', resultText: '',
        myClaimed: false, myAmount: '0.00', leftCount: 0, count: 0, status: 0
      },
      // 表情相关
      showEmojiPicker: false,
      emojiTab: 'default',
      defaultEmoticons: [],
      recentlyUsedEmoticons: [],
      emojiLoaded: false,
      emojiPickerHeight: 235,
      moreActionsHeight: 140,
      inputBarHeight: 50,
      inputFocus: false
    }
  },
  computed: {
    navHeight() {
      return (this.statusBarHeight || 0) + 48
    },
    contentStyle() {
      // adjustResize 模式下 webview 已被压缩，键盘弹起时消息区不需要额外 keyboard padding
      // 仅在表情面板/+号面板打开时留出面板高度
      let panelH = 0
      if (this.showEmojiPicker) panelH = this.emojiPickerHeight + this.inputBarHeight
      else if (this.showMoreActions) panelH = this.moreActionsHeight + this.inputBarHeight
      return {
        paddingTop: this.navHeight + 'px',
        paddingBottom: (this.inputBarHeight + panelH) + 'px'
      }
    },
    bottomGap() {
      // 键盘弹起时减小底部占位，避免最后一条消息与输入框之间出现大间隙
      if (this.keyboardHeight > 0 || this.showEmojiPicker || this.showMoreActions) {
        return 10
      }
      return (this.inputBarHeight || 50) + (this.safeBottom || 0) + 40
    },
    inputWrapperStyle() {
      // adjustResize 模式下系统会自动把 webview 压缩到键盘上方，fixed 输入框天然吸附键盘
      // 这里只处理表情面板/+号面板的定位，键盘弹起时不再手动设置 bottom（避免与系统双重顶起）
      let bottom = 0
      let paddingBottom = 0
      if (this.showEmojiPicker) {
        bottom = this.emojiPickerHeight
      } else if (this.showMoreActions) {
        bottom = this.moreActionsHeight
      } else {
        // 键盘弹起或收起：交给系统 adjustResize 自动处理，仅保留安全区
        paddingBottom = (this.safeBottom || 0)
      }
      return {
        bottom: bottom + 'px',
        paddingBottom: paddingBottom + 'px'
      }
    },
    canSend() {
      return String(this.inputTxt || '').trim().length > 0 && !this.sending
    },
    maxMsgId() {
      return this.msgList.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0)
    },
    minMsgId() {
      const ids = this.msgList.map(item => Number(item.id || 0)).filter(Boolean)
      return ids.length ? Math.min.apply(null, ids) : 0
    }
  },
  async onLoad(options) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.safeBottom = sys.safeAreaInsets?.bottom || 0
    this._origWindowHeight = sys.windowHeight || 0
    this._screenHeight = sys.screenHeight || sys.windowHeight || 0
    this.moreActionsHeight = uni.upx2px(280)
    this.emojiPickerHeight = uni.upx2px(470)
    const user = uni.getStorageSync('userInfo') || {}
    this.myId = String(user.uid || user.id || '')
    this.groupId = Number(options.groupId || 0)
    this.groupName = decodeURIComponent(options.name || '')

    // #ifdef H5
    this.useKeyboardPush = true
    // #endif

    // 键盘监听：H5用visualViewport，APP/小程序用uni.onKeyboardHeightChange（单一监听，避免重复顶起）
    // #ifdef H5
    if (window.visualViewport) {
      this._vpHandler = () => {
        const oldHeight = this.keyboardHeight
        const kbH = Math.max(0, window.innerHeight - window.visualViewport.height)
        this.keyboardHeight = kbH
        if (this.keyboardHeight > oldHeight && this.isAtBottom) {
          setTimeout(() => this.scrollBottom(false), 300)
        }
        this.$nextTick(() => {
          this.measureInputBar()
        })
      }
      window.visualViewport.addEventListener('resize', this._vpHandler)
    }
    // #endif

    // #ifndef H5
    if (typeof uni.onKeyboardHeightChange === 'function') {
      this._keyboardHandler = (e) => {
        const oldHeight = this.keyboardHeight
        // 键盘高度归一：小于50视为键盘收起
        const newHeight = (e && e.height && e.height > 50) ? e.height : 0
        if (newHeight === oldHeight) return // 高度未变化不处理，避免重复触发
        this.keyboardHeight = newHeight
        // 键盘弹出（高度增加）时，延迟滚动到底部
        if (this.keyboardHeight > oldHeight && this.isAtBottom) {
          setTimeout(() => this.scrollBottom(false), 300)
        }
        this.$nextTick(() => {
          this.measureInputBar()
        })
      }
      uni.onKeyboardHeightChange(this._keyboardHandler)
    }
    // #endif

    // 预加载表情数据，确保消息渲染时能正确解析表情
    if (!this.emojiLoaded) {
      await this.loadDefaultEmoticons()
    }

    await this.fetchGroupInfo()
    await this.loadLatest()
    // WebSocket 订阅当前群聊
    ws.ensureConnected()
    ws.joinGroup(this.groupId)
    this._wsUnsubGroupMsg = ws.on('group_msg', this._onWsGroupMsg)
  },
  onUnload() {
    // 取消 WebSocket 订阅
    if (this._wsUnsubGroupMsg) { this._wsUnsubGroupMsg(); this._wsUnsubGroupMsg = null }
    ws.leaveGroup(this.groupId)
    // 清理键盘监听
    this._clearKbFallback()
    if (typeof uni.offKeyboardHeightChange === 'function' && this._keyboardHandler) {
      uni.offKeyboardHeightChange(this._keyboardHandler)
    }
    // #ifdef H5
    if (window.visualViewport && this._vpHandler) {
      window.visualViewport.removeEventListener('resize', this._vpHandler)
    }
    // #endif
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goUser(userId) {
      if (!userId) return
      uni.navigateTo({ url: `/pages/user/profile?userId=${userId}` })
    },
    toggleMore() {
      this.moreVisible = !this.moreVisible
    },
    openGroupInfo() {
      this.moreVisible = false
      uni.navigateTo({ url: `/pages/message/group-info?groupId=${this.groupId}` })
    },
    async fetchGroupInfo() {
      const res = await request('group.php', { action: 'group_info', group_id: this.groupId }, 'GET')
      if (res.code === 0) {
        const data = res.data || {}
        const group = data.group || data || {}
        this.groupName = group.name || this.groupName
        this.memberCount = Number(group.member_count || 0)
        this.myRole = data.my?.role || 'member'
        this.groupIdentityCode = group.identity_code || ''
        this.groupAvatar = group.avatar || ''
        this.maybeShowAnnouncement(group.announcement || '')
      }
    },
    async openShareModal() {
      this.moreVisible = false
      if (!this.groupIdentityCode) {
        uni.showToast({ title: '群信息加载中，请稍后', icon: 'none' })
        return
      }
      try {
        const userInfo = uni.getStorageSync('userInfo') || {}
        const myUid = String(userInfo.uid || userInfo.id || '')
        const res = await request('user.php', { action: 'getMyFollows', uid: myUid, page: 1 }, 'GET')
        if (res.code !== 0) {
          uni.showToast({ title: res.msg || '加载好友失败', icon: 'none' })
          return
        }
        const list = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.list) ? res.data.list : [])
        // 获取群成员列表，排除已在群里的好友
        const memberIds = new Set()
        try {
          const memberRes = await request('group.php', { action: 'group_member_list', group_id: this.groupId, page: 1 }, 'GET')
          if (memberRes.code === 0) {
            (memberRes.data || []).forEach(item => memberIds.add(String(item.user_id || item.uid || '')))
          }
        } catch (e) {}
        this.shareFriends = list.filter(item => !memberIds.has(String(item.uid || item.id || '')))
        this.shareSelected = {}
        this.shareModal.show = true
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    toggleSharePick(userId) {
      this.$set(this.shareSelected, userId, !this.shareSelected[userId])
    },
    async submitShare() {
      const ids = Object.keys(this.shareSelected)
        .filter(key => this.shareSelected[key])
        .map(key => Number(key))
      if (!ids.length) {
        uni.showToast({ title: '请选择好友', icon: 'none' })
        return
      }
      // 群名片格式：[群名片] + JSON
      const cardData = JSON.stringify({
        group_id: this.groupId,
        name: this.groupName || '群聊',
        identity_code: this.groupIdentityCode,
        avatar: this.groupAvatar || ''
      })
      const content = `[群名片]${cardData}`
      uni.showLoading({ title: '发送中...' })
      let successCount = 0
      let failCount = 0
      for (const uid of ids) {
        try {
          const res = await request('message.php', {
            action: 'sendMsg',
            receiver_id: uid,
            content
          }, 'POST')
          if (res.code === 0) successCount++
          else failCount++
        } catch (e) {
          failCount++
        }
      }
      uni.hideLoading()
      this.shareModal.show = false
      if (successCount && !failCount) {
        uni.showToast({ title: `已分享给${successCount}位好友`, icon: 'none' })
      } else if (successCount && failCount) {
        uni.showToast({ title: `成功${successCount}个，失败${failCount}个`, icon: 'none' })
      } else {
        uni.showToast({ title: '分享失败', icon: 'none' })
      }
    },
    buildAnnouncementStorageKey(content) {
      const text = String(content || '').trim()
      if (!text) return ''
      let hash = 0
      for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) >>> 0
      }
      return `group_announcement_seen_${this.groupId}_${hash}`
    },
    maybeShowAnnouncement(content) {
      const text = String(content || '').trim()
      if (!text) return
      const storageKey = this.buildAnnouncementStorageKey(text)
      if (!storageKey) return
      const seen = uni.getStorageSync(storageKey)
      if (seen) return
      this.announcementPopup = {
        visible: true,
        content: text,
        storageKey
      }
    },
    closeAnnouncementPopup() {
      if (this.announcementPopup.storageKey) {
        uni.setStorageSync(this.announcementPopup.storageKey, 1)
      }
      this.announcementPopup = {
        visible: false,
        content: '',
        storageKey: ''
      }
    },
    normalizeMsg(msg) {
      const type = msg.msg_type || 'text'
      const isMe = String(msg.sender_id || msg.from_uid || '') === String(this.myId || '')
      let redPacket = null
      if (type === 'redpacket') {
        try { redPacket = JSON.parse(msg.content || '{}') } catch (e) {
          redPacket = { red_packet_id: 0, amount: '0.00', count: 0, type: 'lucky', greeting: '恭喜发财', status: 0 }
        }
        redPacket.amount = Number(redPacket.amount || 0).toFixed(2)
        redPacket.left_amount = Number(redPacket.left_amount || 0).toFixed(2)
        redPacket.status = Number(redPacket.status || 0)
        redPacket.count = Number(redPacket.count || 0)
        redPacket.left_count = Number(redPacket.left_count || 0)
      }
      return {
        id: Number(msg.id || 0),
        tempId: msg.tempId || '',
        type,
        content: msg.content || '',
        extra: msg.extra || null,
        redPacket,
        create_time: msg.create_time || '',
        sender_id: String(msg.sender_id || msg.from_uid || ''),
        sender_name: msg.name || msg.username || '用户',
        avatar: this.fixUrl(msg.avatar),
        is_me: isMe
      }
    },
    async loadLatest() {
      this.loading = true
      try {
        const res = await request('group.php', {
          action: 'group_msg_list',
          group_id: this.groupId,
          limit: 30
        }, 'GET')
        if (res.code !== 0) {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
          return
        }

        const data = res.data
        const arr = (Array.isArray(data) ? data : (data && data.list)) || []
        this.msgList = arr.map(this.normalizeMsg)
        this.hasMoreOlder = !!(res.extra && res.extra.has_more && res.extra.min_id)
        uni.$emit('message_read_changed', { groupId: this.groupId })
        this.$nextTick(() => this.scrollBottom(false))
      } finally {
        this.loading = false
      }
    },
    async loadOlder() {
      if (this.loadingOlder || !this.minMsgId) return
      this.loadingOlder = true
      try {
        const res = await request('group.php', {
          action: 'group_msg_list',
          group_id: this.groupId,
          before_id: this.minMsgId,
          limit: 30
        }, 'GET')
        if (res.code !== 0) return
        const data = res.data
        const older = ((Array.isArray(data) ? data : (data && data.list)) || []).map(this.normalizeMsg)
        this.msgList = [...older, ...this.msgList]
        this.hasMoreOlder = !!(res.extra && res.extra.has_more && res.extra.min_id)
      } finally {
        this.loadingOlder = false
      }
    },
    // ========== WebSocket 回调 ==========
    _onWsGroupMsg(data) {
      // 只处理当前群的消息
      if (Number(data.group_id) !== Number(this.groupId)) return
      const nm = this.normalizeMsg({
        id: data.msg_id,
        sender_id: data.sender_id,
        msg_type: data.msg_type,
        name: data.name,
        username: data.username,
        avatar: data.avatar,
        content: data.msg_type === 'redpacket' ? data.content : data.content,
        extra: data.extra,
        create_time: data.create_time
      })
      // 去重
      if (nm.id && this.msgList.some(m => Number(m.id) === Number(nm.id))) return
      this.msgList.push(nm)
      // 只有别人的消息才触发已读事件（自己的消息不需要标记已读）
      if (String(data.sender_id || '') !== String(this.myId || '')) {
        uni.$emit('message_read_changed', { groupId: this.groupId })
      }
      this.$nextTick(() => {
        if (this.isAtBottom) this.scrollBottom(true)
      })
    },
    onScroll(e) {
      const detail = e.detail || {}
      this.lastScrollTop = detail.scrollTop || 0
      const scrollHeight = detail.scrollHeight || 0
      const sys = uni.getSystemInfoSync()
      const viewport = Math.max(1, (sys.windowHeight || 0) - this.navHeight - 70)
      const maxTop = Math.max(0, scrollHeight - viewport)
      this.isAtBottom = this.lastScrollTop >= maxTop - 120
    },
    scrollBottom(animate = true) {
      this.scrollAnim = !!animate
      this.$nextTick(() => {
        this.scrollTop = 99999999
      })
    },
    goPage(url) { if (url) uni.navigateTo({ url }) },
    goBack() { uni.navigateBack() },
    onPageTap() {
      this.inputFocus = false
      uni.hideKeyboard()
      // 点击消息区域时关闭表情面板/+号面板
      if (this.showEmojiPicker) this.showEmojiPicker = false
      if (this.showMoreActions) this.showMoreActions = false
    },
    onInputFocus() {
      this.inputFocus = true
      // 点击输入框时关闭表情面板/+号面板，让键盘正常弹起
      if (this.showEmojiPicker) this.showEmojiPicker = false
      if (this.showMoreActions) this.showMoreActions = false
      // 键盘弹起后，等待布局稳定再滚动
      this.$nextTick(() => {
        this.measureInputBar()
      })
      // 延迟滚动，确保键盘完全弹出后再滚动到底部
      setTimeout(() => {
        if (this.isAtBottom) {
          this.scrollBottom(true)
        }
      }, 300)
    },
    focusInput() {
      // 点击输入框区域时聚焦到textarea
      uni.createSelectorQuery().in(this).select('.text-input').node((res) => {
        if (res.node) {
          res.node.focus()
        }
      }).exec()
    },
    focusTextInput() {
      uni.showKeyboard({
        success: () => {
          this.inputFocus = true
          setTimeout(() => {
            if (this.isAtBottom) {
              this.scrollBottom(true)
            }
          }, 200)
        }
      })
    },
    onInputBlur() {
      this.inputFocus = false
      this._clearKbFallback()
      // #ifndef H5
      // 如果 onKeyboardHeightChange 不可靠，blur时手动归零
      setTimeout(() => {
        if (!this.inputFocus) {
          this.keyboardHeight = 0
        }
      }, 100)
      // #endif
      // #ifdef H5
      // H5兜底：如果 visualViewport resize 未触发归零，blur后手动归零
      setTimeout(() => {
        if (!this.inputFocus && !this.showEmojiPicker && !this.showMoreActions) {
          this.keyboardHeight = 0
        }
      }, 150)
      // #endif
      // 延迟关闭表情选择器
      setTimeout(() => {
        this.measureInputBar()
      }, 60)
    },
    _clearKbFallback() {
      if (this._kbFallbackTimer) {
        clearTimeout(this._kbFallbackTimer)
        this._kbFallbackTimer = null
      }
    },
    measureInputBar() {
      const query = uni.createSelectorQuery().in(this)
      query.select('.input-wrapper').boundingClientRect((rect) => {
        if (rect && rect.height) this.inputBarHeight = Math.ceil(rect.height)
      }).exec()
    },
    // ========== 表情功能 ==========
    async toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker
      if (this.showEmojiPicker) {
        uni.hideKeyboard()
        this._clearKbFallback()
        this.keyboardHeight = 0
        this.showMoreActions = false
        if (!this.emojiLoaded) {
          await this.loadDefaultEmoticons()
        }
        this.$nextTick(() => {
          if (this.isAtBottom) this.scrollBottom(true)
        })
      }
    },
    toggleMoreActions() {
      this.showMoreActions = !this.showMoreActions
      if (this.showMoreActions) {
        uni.hideKeyboard()
        this._clearKbFallback()
        this.keyboardHeight = 0
        this.showEmojiPicker = false
        this.$nextTick(() => {
          if (this.isAtBottom) this.scrollBottom(true)
        })
      }
    },
    onEmojiImgError(e) {
      // 表情图片加载失败时的处理
    },
    async loadDefaultEmoticons() {
      // 直接读取本地 /static/emoticons/ 目录下的 108 个 gif 表情
      if (this.emojiLoaded) return
      const list = []
      for (let i = 1; i <= 108; i++) {
        list.push({
          id: i,
          code: '[表情' + i + ']',
          url: '/static/emoticons/' + i + '.gif'
        })
      }
      this.defaultEmoticons = list
      this.emojiLoaded = true
    },
    switchToRecent() {
      this.emojiTab = 'recent'
      let saved = uni.getStorageSync('recently_used_emoticons')
      if (saved) {
        try { this.recentlyUsedEmoticons = JSON.parse(saved) } catch { this.recentlyUsedEmoticons = [] }
      } else {
        this.recentlyUsedEmoticons = []
      }
    },
    saveToRecentlyUsed(emo) {
      let recent = this.recentlyUsedEmoticons.filter(e => e.id !== emo.id)
      recent.unshift(emo)
      this.recentlyUsedEmoticons = recent.slice(0, 20)
      uni.setStorageSync('recently_used_emoticons', JSON.stringify(this.recentlyUsedEmoticons))
    },
    insertEmoji(emo) {
      this.saveToRecentlyUsed(emo)
      // #ifdef H5
      this.insertEmojiAtCursor(emo)
      // #endif
      // #ifndef H5
      this.inputTxt += emo.code
      // #endif
    },

    // H5 端：从 contenteditable div 提取纯文本（img alt -> [表情x]）
    extractRichText() {
      // #ifdef H5
      const el = this.$refs.richInput
      if (!el) return ''
      let text = ''
      el.childNodes.forEach(node => {
        if (node.nodeType === 3) {
          text += node.textContent
        } else if (node.nodeType === 1) {
          if (node.tagName === 'IMG') {
            text += node.getAttribute('alt') || ''
          } else {
            text += node.textContent || ''
          }
        }
      })
      return text.replace(/\u200b/g, '')
      // #endif
      // #ifndef H5
      return this.inputTxt
      // #endif
    },

    // H5 端：contenteditable input 事件
    onRichInput() {
      // #ifdef H5
      this.inputTxt = this.extractRichText()
      // #endif
    },

    // H5 端：键盘事件，Enter 发送，Shift+Enter 换行，Backspace 一次删除表情
    onRichKeydown(e) {
      // #ifdef H5
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendText()
        return
      }
      // Backspace：如果光标前是 零宽空格+img，一次性删除两个，避免要按2次
      if (e.key === 'Backspace') {
        const sel = window.getSelection()
        if (sel.rangeCount === 0) return
        const range = sel.getRangeAt(0)
        if (!range.collapsed) return
        const anchor = sel.anchorNode
        const el = this.$refs.richInput
        if (!el || !el.contains(anchor)) return
        // 光标在文本节点中间/末尾，检查前一个字符是否为零宽空格
        if (anchor.nodeType === 3 && sel.anchorOffset > 0) {
          const prevChar = anchor.textContent[sel.anchorOffset - 1]
          if (prevChar === '\u200b') {
            const offset = sel.anchorOffset
            const beforeText = anchor.textContent.substring(0, offset - 1)
            if (beforeText.length === 0 && anchor.previousSibling && anchor.previousSibling.nodeType === 1 && anchor.previousSibling.tagName === 'IMG') {
              e.preventDefault()
              const imgNode = anchor.previousSibling
              imgNode.remove()
              anchor.textContent = anchor.textContent.substring(offset)
              const newRange = document.createRange()
              newRange.setStart(anchor, 0)
              newRange.collapse(true)
              sel.removeAllRanges()
              sel.addRange(newRange)
              this.inputTxt = this.extractRichText()
              return
            }
          }
        }
        if (sel.anchorOffset === 0 && anchor === el) {
          return
        }
      }
      // #endif
    },

    // H5 端：把 /static/xxx 路径补上 H5 base 前缀（如 /web/）
    fixH5StaticUrl(url) {
      // #ifdef H5
      if (!url) return ''
      if (/^https?:\/\//.test(url)) return url
      if (url.indexOf('/static/') === 0) {
        const base = (window.__uniConfig && window.__uniConfig.router && window.__uniConfig.router.base) || '/'
        return base.replace(/\/$/, '') + url
      }
      return url
      // #endif
      // #ifndef H5
      return url
      // #endif
    },

    // H5 端：在光标处插入表情图片
    insertEmojiAtCursor(emoji) {
      // #ifdef H5
      const el = this.$refs.richInput
      if (!el) return
      el.focus()
      const sel = window.getSelection()
      let range
      if (sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0)
      } else {
        range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
      }
      const img = document.createElement('img')
      img.src = this.fixH5StaticUrl(emoji.url)
      img.className = 'input-emoji'
      img.setAttribute('alt', emoji.code || `[表情${emoji.id}]`)
      // inline style，避免 scoped 样式对动态创建元素不生效
      const px = uni.upx2px(36)
      img.style.width = px + 'px'
      img.style.height = px + 'px'
      img.style.verticalAlign = 'middle'
      img.style.display = 'inline-block'
      img.style.margin = '0 ' + uni.upx2px(4) + 'px'
      range.deleteContents()
      range.insertNode(img)
      const zwsp = document.createTextNode('\u200b')
      img.after(zwsp)
      range.setStartAfter(zwsp)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      this.inputTxt = this.extractRichText()
      // #endif
    },

    // 清空输入框
    clearRichInput() {
      // #ifdef H5
      const el = this.$refs.richInput
      if (el) el.innerHTML = ''
      // #endif
      this.inputTxt = ''
    },

    previewEmoticon(url) {
      uni.previewImage({
        urls: [this.fixUrl(url)],
        current: this.fixUrl(url)
      })
    },
    parseEmoticons(content) {
      if (!content) return [{ type: 'text', text: '' }]

      const parts = []
      // 支持两种格式：[表情1] 和 [微笑]
      const regex = /\[表情(\d+)\]|\[([^\]]+)\]/g
      let lastIndex = 0
      let match

      while ((match = regex.exec(content)) !== null) {
        // 添加表情之前的文本
        if (match.index > lastIndex) {
          parts.push({ type: 'text', text: content.substring(lastIndex, match.index) })
        }

        // 添加表情 - 从默认表情查找
        let emoji = null
        if (match[1]) {
          // [表情1] 格式
          const emojiId = parseInt(match[1])
          emoji = this.defaultEmoticons.find(e => e.id === emojiId)
        } else if (match[2]) {
          // [微笑] 格式
          emoji = this.defaultEmoticons.find(e => e.code === match[0])
        }

        if (emoji) {
          parts.push({ type: 'emoticon', url: emoji.url })
        } else {
          // 如果找不到表情，显示原始文本
          parts.push({ type: 'text', text: match[0] })
        }

        lastIndex = regex.lastIndex
      }

      // 添加最后一段文本
      if (lastIndex < content.length) {
        parts.push({ type: 'text', text: content.substring(lastIndex) })
      }

      return parts
    },
    openImagePicker() {
      this.showMoreActions = false
      this.sendImage()
    },
    openCamera() {
      this.showMoreActions = false
      uni.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        sourceType: ['camera'],
        success: (res) => {
          this.selectImages(res.tempFilePaths)
        }
      })
    },
    showVideoCall() {
      this.showMoreActions = false
      uni.showToast({ title: '视频通话功能开发中', icon: 'none' })
    },
    sendLocation() {
      this.showMoreActions = false
      uni.showToast({ title: '位置功能开发中', icon: 'none' })
    },
    openRedPacket() {
      this.showMoreActions = false
      if (!this.canChat) {
        uni.showToast({ title: this.chatDisabledReason || '当前无法发红包', icon: 'none' })
        return
      }
      this.redPacket.show = true
      this.redPacket.amount = ''
      this.redPacket.count = '1'
      this.redPacket.type = 'lucky'
      this.redPacket.greeting = '恭喜发财，大吉大利'
      this.redPacket.payPassword = ''
      this.redPacket.sending = false
    },
    closeRedPacket() {
      if (this.redPacket.sending) return
      this.redPacket.show = false
    },
    async submitRedPacket() {
      if (this.redPacket.sending) return
      const amount = Number(this.redPacket.amount || 0)
      const count = Number(this.redPacket.count || 0)
      if (!amount || amount <= 0) return uni.showToast({ title: '请输入正确金额', icon: 'none' })
      if (!count || count <= 0) return uni.showToast({ title: '请输入红包个数', icon: 'none' })
      if (amount < count * 0.01) return uni.showToast({ title: '金额不足，每个红包至少0.01元', icon: 'none' })
      if (!this.redPacket.payPassword) return uni.showToast({ title: '请输入支付密码', icon: 'none' })

      this.redPacket.sending = true
      try {
        const res = await request('group.php', {
          action: 'group_send_redpacket',
          group_id: this.groupId,
          amount,
          count,
          type: this.redPacket.type,
          greeting: this.redPacket.greeting || '',
          pay_password: this.redPacket.payPassword
        }, 'POST')
        if (res.code !== 0) {
          return uni.showToast({ title: res.msg || '红包发送失败', icon: 'none' })
        }

        // 本地push红包消息
        let rpInfo = {}
        try { rpInfo = JSON.parse(res.data.extra || '{}') } catch (e) {}
        const tempId = this.buildClientMsgId('rp')
        this.msgList.push({
          id: Number(res.data.id || 0),
          tempId,
          type: 'redpacket',
          content: res.data.extra || '',
          extra: null,
          redPacket: {
            red_packet_id: Number(res.data.red_packet_id || 0),
            amount: Number(rpInfo.amount || amount).toFixed(2),
            count: count,
            left_count: count,
            left_amount: Number(rpInfo.amount || amount).toFixed(2),
            type: this.redPacket.type,
            greeting: this.redPacket.greeting,
            status: 0,
            sender_id: this.myId
          },
          create_time: res.data.create_time || new Date().toISOString(),
          sender_id: this.myId,
          sender_name: '我',
          avatar: '',
          is_me: true
        })
        this.redPacket.show = false
        this.$nextTick(() => this.scrollBottom(true))
      } catch (e) {
        uni.showToast({ title: '网络错误，请重试', icon: 'none' })
      } finally {
        this.redPacket.sending = false
      }
    },
    async onGroupRedPacketClick(msg) {
      if (!msg || !msg.redPacket) return
      const rpId = Number(msg.redPacket.red_packet_id || 0)
      if (!rpId) return uni.showToast({ title: '红包信息错误', icon: 'none' })

      // 先查询红包详情
      try {
        const res = await request('group.php', {
          action: 'group_redpacket_detail',
          red_packet_id: rpId
        }, 'GET')
        if (res.code !== 0) return uni.showToast({ title: res.msg || '查询失败', icon: 'none' })
        const rp = res.data.red_packet || {}
        const myClaimed = !!res.data.my_claimed
        const myAmount = res.data.my_amount || '0.00'

        this.rpClaim = {
          show: true,
          claimed: false,
          success: false,
          rotating: false,
          claiming: false,
          msgId: msg.id,
          redPacketId: rpId,
          amount: Number(rp.amount || 0).toFixed(2),
          greeting: rp.greeting || '恭喜发财，大吉大利',
          senderName: msg.sender_name || '群成员',
          senderAvatar: msg.avatar || '/static/logo.png',
          resultText: '',
          myClaimed: myClaimed,
          myAmount: myAmount,
          leftCount: Number(rp.left_count || 0),
          count: Number(rp.count || 0),
          status: Number(rp.status || 0)
        }
      } catch (e) {
        uni.showToast({ title: '网络错误', icon: 'none' })
      }
    },
    closeRpClaim() {
      if (this.rpClaim.claiming) return
      this.rpClaim.show = false
      this.rpClaim.claimed = false
      this.rpClaim.rotating = false
      this.rpClaim.claiming = false
    },
    async claimRedPacket() {
      if (this.rpClaim.claiming) return
      // 已领过或已过期/已抢完 → 直接展示结果
      if (this.rpClaim.myClaimed) {
        this.rpClaim.success = true
        this.rpClaim.amount = this.rpClaim.myAmount
        this.rpClaim.claimed = true
        return
      }
      if (this.rpClaim.status === 1) {
        this.rpClaim.success = false
        this.rpClaim.resultText = '手慢了，红包已抢完'
        this.rpClaim.claimed = true
        return
      }
      if (this.rpClaim.status === 2) {
        this.rpClaim.success = false
        this.rpClaim.resultText = '红包已过期'
        this.rpClaim.claimed = true
        return
      }

      this.rpClaim.rotating = true
      await new Promise(r => setTimeout(r, 1500))
      this.rpClaim.rotating = false
      this.rpClaim.claiming = true

      try {
        const res = await request('group.php', {
          action: 'group_receive_redpacket',
          red_packet_id: this.rpClaim.redPacketId,
          group_id: this.groupId
        }, 'POST')
        if (res.code === 0) {
          this.rpClaim.success = true
          this.rpClaim.amount = Number(res.data.amount || 0).toFixed(2)
          this.rpClaim.claimed = true
          // 更新消息列表中的红包状态
          const idx = this.msgList.findIndex(m => m.id === this.rpClaim.msgId)
          if (idx !== -1 && this.msgList[idx].redPacket) {
            const rp = { ...this.msgList[idx].redPacket }
            rp.left_count = Math.max(0, rp.left_count - 1)
            rp.left_amount = (Number(rp.left_amount) - Number(this.rpClaim.amount)).toFixed(2)
            if (rp.left_count === 0) rp.status = 1
            this.msgList.splice(idx, 1, { ...this.msgList[idx], redPacket: rp })
          }
        } else {
          this.rpClaim.success = false
          this.rpClaim.resultText = res.msg || '领取失败'
          this.rpClaim.claimed = true
        }
      } catch (e) {
        this.rpClaim.success = false
        this.rpClaim.resultText = '网络错误，请重试'
        this.rpClaim.claimed = true
      } finally {
        this.rpClaim.claiming = false
      }
    },
    openGift() {
      this.showMoreActions = false
      uni.showToast({ title: '礼物功能开发中', icon: 'none' })
    },
    voiceInput() {
      this.showMoreActions = false
      uni.showToast({ title: '语音输入功能开发中', icon: 'none' })
    },
    openTransfer() {
      this.showMoreActions = false
      uni.showToast({ title: '转账功能开发中', icon: 'none' })
    },
    openCardPicker() {
      this.showMoreActions = false
      uni.showToast({ title: '名片功能开发中', icon: 'none' })
    },
    async sendImageMessage(imagePath) {
      // 如果需要发送已上传的图片URL，可以调用这个
      // 但目前sendImage已经处理得很好，所以主要用sendImage
      if (this.sending) return
      this.sending = true

      const tempId = this.buildClientMsgId('img')
      const now = new Date().toISOString()
      this.msgList.push({
        id: 0,
        tempId,
        type: 'image',
        content: imagePath,
        extra: null,
        create_time: now,
        sender_id: this.myId,
        sender_name: '我',
        avatar: '/static/default-avatar.png',
        is_me: true
      })
      this.$nextTick(() => this.scrollBottom(true))

      try {
        const r = await new Promise((resolve, reject) => {
          uni.uploadFile({
            url: baseUrl + 'group.php',
            filePath: imagePath,
            name: 'image',
            formData: { action: 'group_msg_send', group_id: this.groupId, msg_type: 'image', client_msg_id: tempId },
            header: { 'Authorization': 'Bearer ' + (uni.getStorageSync('token') || '') },
            success: (res) => {
              try { resolve(JSON.parse(res.data)) } catch (e) { reject(e) }
            },
            fail: reject
          })
        })

        if (r.code === 0) {
          const index = this.msgList.findIndex(m => m.tempId === tempId)
          if (index !== -1) {
            this.$set(this.msgList, index, {
              ...this.msgList[index],
              id: r.data?.msg_id || 0,
              content: r.data?.url || imagePath,
              sending: false
            })
          }
        } else {
          this.msgList = this.msgList.filter(item => item.tempId !== tempId)
          uni.showToast({ title: r.msg || '发送失败', icon: 'none' })
        }
      } catch (e) {
        this.msgList = this.msgList.filter(item => item.tempId !== tempId)
        uni.showToast({ title: '图片发送失败', icon: 'none' })
      } finally {
        this.sending = false
      }
    },
    buildClientMsgId(prefix = 'g') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    },
    async sendText() {
      // #ifdef H5
      this.inputTxt = this.extractRichText()
      // #endif
      const txt = String(this.inputTxt || '').trim()
      if (!txt || this.sending) return

      this.sending = true
      const tempId = this.buildClientMsgId('txt')
      const now = new Date().toISOString()
      this.msgList.push({
        id: 0,
        tempId,
        type: 'text',
        content: txt,
        extra: null,
        create_time: now,
        sender_id: this.myId,
        sender_name: '我',
        avatar: '/static/default-avatar.png',
        is_me: true
      })
      this.inputTxt = ''
      this.clearRichInput()
      this.$nextTick(() => this.scrollBottom(true))

      try {
        const res = await request('group.php', {
          action: 'group_msg_send',
          group_id: this.groupId,
          msg_type: 'text',
          content: txt,
          client_msg_id: tempId
        }, 'POST')

        if (res.code !== 0) {
          this.msgList = this.msgList.filter(item => item.tempId !== tempId)
          uni.showToast({ title: res.msg || '发送失败', icon: 'none' })
          return
        }

        const idx = this.msgList.findIndex(item => item.tempId === tempId)
        if (idx !== -1) {
          this.$set(this.msgList, idx, {
            ...this.msgList[idx],
            id: Number(res.data?.msg_id || 0),
            create_time: res.data?.time || now,
            tempId: ''
          })
        }
      } catch (e) {
        this.msgList = this.msgList.filter(item => item.tempId !== tempId)
        uni.showToast({ title: '发送失败，请重试', icon: 'none' })
      } finally {
        this.sending = false
      }
    },
    async sendImage() {
      this.moreVisible = false
      if (this.sending) return

      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: async (pickRes) => {
          const filePath = (pickRes.tempFilePaths || [])[0]
          if (!filePath) return

          this.sending = true
          try {
            const uploadRes = await uploadFile(filePath, { type: 'chat' })
            const imageUrl = uploadRes?.url || uploadRes?.path || uploadRes?.data?.url || uploadRes?.data?.path || ''
            if (!imageUrl) throw new Error('upload failed')

            const tempId = this.buildClientMsgId('img')
            const now = new Date().toISOString()
            this.msgList.push({
              id: 0,
              tempId,
              type: 'image',
              content: this.fixUrl(imageUrl),
              extra: null,
              create_time: now,
              sender_id: this.myId,
              sender_name: '我',
              avatar: '/static/default-avatar.png',
              is_me: true
            })
            this.$nextTick(() => this.scrollBottom(true))

            const res = await request('group.php', {
              action: 'group_msg_send',
              group_id: this.groupId,
              msg_type: 'image',
              content: imageUrl,
              client_msg_id: tempId
            }, 'POST')

            if (res.code !== 0) {
              this.msgList = this.msgList.filter(item => item.tempId !== tempId)
              uni.showToast({ title: res.msg || '发送失败', icon: 'none' })
              return
            }

            const idx = this.msgList.findIndex(item => item.tempId === tempId)
            if (idx !== -1) {
              this.$set(this.msgList, idx, {
                ...this.msgList[idx],
                id: Number(res.data?.msg_id || 0),
                create_time: res.data?.time || now,
                tempId: ''
              })
            }
          } catch (e) {
            uni.showToast({ title: '图片发送失败', icon: 'none' })
          } finally {
            this.sending = false
          }
        }
      })
    },
    showTime(index) {
      if (index === 0) return true
      const prev = new Date(String(this.msgList[index - 1].create_time).replace(/-/g, '/')).getTime()
      const curr = new Date(String(this.msgList[index].create_time).replace(/-/g, '/')).getTime()
      return curr - prev > 5 * 60 * 1000
    },
    fmtTime(value) {
      if (!value) return ''
      const date = new Date(String(value).replace(/-/g, '/'))
      if (isNaN(date.getTime())) return String(value)
      const h = String(date.getHours()).padStart(2, '0')
      const m = String(date.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    },
    previewImage(url) {
      if (!url) return
      uni.previewImage({ current: url, urls: [url] })
    },
    openMsgMenu(msg) {
      if (!msg || !msg.id) return
      this.msgMenu = {
        msg,
        canCopy: msg.type === 'text' && !!msg.content,
        canRecall: msg.type !== 'notice' && msg.type !== 'recalled' && (msg.is_me || ['owner', 'admin'].includes(this.myRole))
      }
      this.msgMenuVisible = true
    },
    closeMsgMenu() {
      this.msgMenuVisible = false
      this.msgMenu = { msg: null, canCopy: false, canRecall: false }
    },
    copyMsg() {
      const msg = this.msgMenu.msg
      this.closeMsgMenu()
      if (!msg || !msg.content) return
      uni.setClipboardData({ data: msg.content })
    },
    confirmRecall() {
      const msg = this.msgMenu.msg
      this.closeMsgMenu()
      if (!msg) return
      this.confirm = {
        show: true,
        title: '撤回消息',
        message: '确定撤回这条群消息吗？',
        resolve: async (ok) => {
          if (!ok) return
          const res = await request('group.php', {
            action: 'group_msg_recall',
            group_id: this.groupId,
            msg_id: msg.id
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '撤回失败', icon: 'none' })
            return
          }
          const idx = this.msgList.findIndex(item => Number(item.id) === Number(msg.id))
          if (idx !== -1) {
            this.$set(this.msgList, idx, {
              ...this.msgList[idx],
              type: 'recalled',
              content: ''
            })
          }
        }
      }
    },
    onConfirmOk() {
      const handler = this.confirm.resolve
      this.confirm = { show: false, title: '', message: '', resolve: null }
      handler && handler(true)
    },
    onConfirmCancel() {
      const handler = this.confirm.resolve
      this.confirm = { show: false, title: '', message: '', resolve: null }
      handler && handler(false)
    },
    fixUrl(url) {
      if (!url) return '/static/default-avatar.png'
      if (String(url).startsWith('http')) return url
      // 本地 static 资源直接返回，不拼接域名
      if (String(url).startsWith('/static/')) return url
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      return base + (String(url).startsWith('/') ? url : '/' + url)
    }
  }
}
</script>

<style scoped>
.chat-page{
  width:100%;
  height:100vh;
  background:linear-gradient(180deg,#f5f6f8 0%, #eceff3 100%);
  overflow:hidden;
}
.top-nav{
  position:fixed;
  left:0;
  right:0;
  top:0;
  background:rgba(255,255,255,.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index:30;
  border-bottom:1rpx solid rgba(0,0,0,.05);
  box-shadow:0 2rpx 20rpx rgba(0,0,0,.06);
}
.nav-content{
  height:44px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 24rpx;
}
.nav-left, .nav-right{
  width:100rpx;
  display:flex;
  align-items:center;
  justify-content:center;
}
.back-text{
  font-size:28rpx;
  color:#374151;
}
.more-icon{
  font-size:48rpx;
  color:#6b7280;
}
.nav-center{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  min-width:0;
  padding:0 16rpx;
}
.nav-title{
  font-size:34rpx;
  color:#111827;
  font-weight:800;
  max-width:400rpx;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.content{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  box-sizing:border-box;
  min-height:0;
}
.msg-scroll{
  flex:1;
  min-height:0;
  height:0;
  z-index:1;
}
.msg-container{
  padding:20rpx 24rpx;
  box-sizing:border-box;
  min-height:100%;
}
.load-more{
  width:220rpx;
  margin:0 auto 18rpx;
  padding:14rpx 0;
  text-align:center;
  background:#fff;
  border-radius:999rpx;
  color:#6b7280;
  font-size:24rpx;
}
.loading-box{
  padding:120rpx 0;
  text-align:center;
  color:#9ca3af;
  font-size:26rpx;
}
.msg-time{
  margin: 14rpx auto 18rpx;
  text-align:center;
  color:#9ca3af;
  font-size:22rpx;
}
.notice-msg{
  margin: 0 auto 18rpx;
  max-width: 80%;
  padding: 14rpx 20rpx;
  text-align:center;
  background: rgba(17,24,39,.06);
  border-radius: 999rpx;
  color:#6b7280;
  font-size:22rpx;
  line-height:1.5;
}
.recalled-msg{
  background: rgba(255,255,255,.8);
}
.msg-row{
  display:flex;
  align-items:flex-start;
  gap:16rpx;
  margin-bottom:18rpx;
}
.msg-row.me{
  flex-direction: row-reverse;
}
.msg-avatar{
  width:76rpx;
  height:76rpx;
  border-radius:20rpx;
  background:#fff;
  flex-shrink:0;
}
.msg-main{
  max-width: 72%;
  display:flex;
  flex-direction:column;
}
.sender-name{
  margin-bottom:10rpx;
  font-size:22rpx;
  color:#6b7280;
}
.bubble{
  display:inline-block;
  padding:22rpx 32rpx;
  border-radius:28rpx;
  max-width:100%;
  font-size:30rpx;
  line-height:1.6;
  word-break:break-word;
  background:#fff;
  color:#15171a;
  box-shadow:0 4rpx 16rpx rgba(0,0,0,.06);
}
.bubble-me{
  background:linear-gradient(135deg,#ff4d6d 0%,#ff2442 100%) !important;
  color:#fff !important;
  border-bottom-right-radius:8rpx;
  box-shadow:0 6rpx 20rpx rgba(255,77,109,.28);
}
.bubble:not(.bubble-me){
  border-bottom-left-radius:8rpx;
}
.bubble-text{
  font-size:30rpx;
  color:#15171a;
  line-height:1.6;
  word-break:break-word;
}
.bubble-me .bubble-text{
  color:#fff;
}
.bubble-txt{
  font-size:30rpx;
  line-height:1.6;
  color:inherit;
  white-space:pre-wrap;
  word-break:break-word;
}
.bubble-me .bubble-txt{
  color:#fff;
}
.inline-emoticon{
  width:44rpx;
  height:44rpx;
  vertical-align:middle;
  display:inline-block;
  margin:0 2rpx;
}
.bubble-image{
  width:300rpx;
  max-width:100%;
  border-radius:18rpx;
  display:block;
}
.card-box{
  display:flex;
  align-items:center;
  gap:16rpx;
}
.card-avatar{
  width:72rpx;
  height:72rpx;
  border-radius:18rpx;
}
.card-info{
  display:flex;
  flex-direction:column;
  gap:6rpx;
}
.card-name{
  font-size:28rpx;
  font-weight:700;
  color:#111827;
}
.card-tip{
  font-size:22rpx;
  color:#9ca3af;
}
.input-wrapper{
  position:fixed;
  left:0; right:0;
  bottom:0;
  z-index:2000;
  background:#f7f8fa;
  border-top:1rpx solid rgba(0,0,0,.08);
  transition: all .18s ease;
}
.input-inner{
  padding:8rpx 24rpx;
  display:flex;
  align-items:center;
  gap:12rpx;
}
.rich-input{
  flex:1;
  background:#fff;
  border-radius:999rpx;
  padding:10rpx 24rpx;
  min-height:56rpx;
  display:flex;
  align-items:center;
  border:1rpx solid rgba(0,0,0,.06);
  box-shadow:0 2rpx 8rpx rgba(0,0,0,.04);
  position:relative;
}
.rich-input.voice-mode{
  border:none;
  box-shadow:none;
}
.voice-holder{
  width:100%;
  height:56rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:999rpx;
  background:rgba(255,255,255,.95);
}
.voice-text{
  font-size:30rpx;
  color:#374151;
  font-weight:500;
  letter-spacing:4rpx;
}
.tool-btn{
  width:60rpx;
  height:60rpx;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
  transition: all 0.2s;
}
.tool-btn:active{
  opacity:0.7;
}
.tool-icon{
  font-size:36rpx;
  color:#6b7280;
  line-height:1;
}
.tool-icon-img{
  width:36rpx;
  height:36rpx;
}
.text-input{
  width:100%;
  min-height:36rpx;
  max-height:150rpx;
  font-size:28rpx;
  color:#15171a;
  caret-color:#15171a;
  line-height:32rpx;
  position:relative;
  z-index:1;
}
/* H5 富文本输入框（contenteditable） */
.rich-input-h5{
  -webkit-user-select:text;
  user-select:text;
  overflow-wrap:break-word;
  word-break:break-all;
  outline:none;
  cursor:text;
}
.rich-input-h5.disabled{
  opacity:0.5;
  pointer-events:none;
}
.rich-input-h5:empty::before{
  content:attr(data-placeholder);
  color:#999;
  font-size:28rpx;
  pointer-events:none;
}
/* 输入框内表情图片 */
.input-emoji{
  width:36rpx;
  height:36rpx;
  vertical-align:middle;
  display:inline-block;
  margin:0 4rpx;
}
.send-btn{
  width:104rpx;
  height:72rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#111827;
  border-radius:999rpx;
  flex-shrink:0;
  transition: all 0.2s;
}
.send-btn:active{
  transform:scale(0.95);
}
.send-text{
  font-size:26rpx;
  color:#fff;
}
.chat-disabled-tip{
  padding:0 24rpx 8rpx;
  font-size:24rpx;
  color:#ff4d6d;
}
.safe-bottom{ width:100%; }

/* ========== 表情选择器 ========== */
.emoji-picker {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1rpx solid #f3f4f6;
  box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.08);
  z-index: 1999;
  height: 470rpx;
  box-sizing: border-box;
  animation: emojiPickerIn .25s ease-out;
}
@keyframes emojiPickerIn{
  from{ opacity:0; transform:translateY(100%); }
  to{ opacity:1; transform:translateY(0); }
}
.emoji-tabs {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  gap: 16rpx;
  flex-shrink: 0;
}
.emoji-tab {
  font-size: 26rpx;
  color: #666;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: #f5f6fa;
  transition: all 0.2s;
  flex-shrink: 0;
}
.emoji-tab.active {
  background: #ff4d6d;
  color: #fff;
}
.emoji-scroll {
  height: 360rpx;
  padding: 16rpx 20rpx;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
}
.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}
.emoji-item {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 12rpx;
  background: #f8f9fa;
  transition: all 0.2s;
}
.emoji-item:active {
  transform: scale(0.9);
  background: #eee;
}
.emoji-img {
  width: 56rpx;
  height: 56rpx;
}
.empty-tip {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 26rpx;
}
.empty-tip .hint {
  font-size: 24rpx;
  color: #ccc;
  margin-top: 16rpx;
}
.action-sheet{
  padding: 8rpx 0 6rpx;
}
.action-sheet-item{
  height: 92rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 30rpx;
  color:#111827;
  border-radius: 18rpx;
}
.action-sheet-item + .action-sheet-item{
  margin-top: 10rpx;
}
.action-sheet-item:active{
  background:#f9fafb;
}
.action-sheet-item.danger{
  color:#ff2442;
}
.action-sheet-empty{
  padding: 24rpx 0 8rpx;
  text-align:center;
  font-size: 24rpx;
  color:#9ca3af;
}
.modal-list{
  max-height:540rpx;
  overflow:hidden;
}
.modal-item{
  display:flex;
  align-items:center;
  gap:16rpx;
  padding:16rpx 0;
}
.modal-item + .modal-item{
  border-top:1rpx solid #f3f4f6;
}
.modal-avatar{
  width:68rpx;
  height:68rpx;
  border-radius:18rpx;
}
.modal-info{
  flex:1;
}
.modal-name{
  font-size:26rpx;
  color:#111827;
  font-weight:700;
}
.modal-sub{
  display:block;
  margin-top:6rpx;
  font-size:22rpx;
  color:#9ca3af;
}
.check-dot{
  width:32rpx;
  height:32rpx;
  border-radius:50%;
  border:2rpx solid #d1d5db;
}
.check-dot.active{
  background:#ff2442;
  border-color:#ff2442;
}
.modal-empty{
  padding:40rpx 0;
  text-align:center;
  color:#9ca3af;
  font-size:24rpx;
}
.announcement-popup{
  padding: 6rpx 0 8rpx;
}
.announcement-badge{
  width: 140rpx;
  height: 44rpx;
  margin: 0 auto 18rpx;
  border-radius: 999rpx;
  background: #fff1f3;
  color: #ff2442;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 22rpx;
  font-weight: 700;
}
.announcement-popup-title{
  display:block;
  text-align:center;
  font-size: 32rpx;
  color:#111827;
  font-weight: 800;
}
.announcement-scroll{
  max-height: 360rpx;
  margin-top: 20rpx;
  padding: 24rpx 24rpx 0;
  background: #f8fafc;
  border-radius: 22rpx;
  box-sizing: border-box;
}
.announcement-popup-text{
  font-size: 26rpx;
  color:#4b5563;
  line-height: 1.8;
  white-space: pre-wrap;
}
.announcement-popup-btn{
  height: 88rpx;
  margin-top: 18rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #ff4d6d 0%, #ff2442 100%);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 30rpx;
  font-weight: 800;
}
.more-actions-panel{
  position:fixed;
  left:0; right:0;
  bottom:0;
  background:#f7f8fa;
  border-top:1rpx solid #f3f4f6;
  box-shadow:0 -4rpx 20rpx rgba(0,0,0,0.08);
  z-index:1999;
  height:280rpx;
  box-sizing:border-box;
  padding-bottom:env(safe-area-inset-bottom);
  animation: moreActionsIn .25s ease-out;
}
@keyframes moreActionsIn{
  from{ opacity:0; transform:translateY(100%); }
  to{ opacity:1; transform:translateY(0); }
}
.more-actions-grid{
  display:flex;
  flex-wrap:wrap;
  padding:24rpx 16rpx 36rpx 16rpx;
}
.more-action-item{
  width:25%;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:14rpx;
  padding:18rpx 0;
  box-sizing:border-box;
}
.more-action-icon-wrap{
  width:112rpx;
  height:112rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#fff;
  border-radius:24rpx;
  box-shadow:0 4rpx 12rpx rgba(0,0,0,0.06);
  transition:transform .15s ease;
}
.more-action-item:active .more-action-icon-wrap{
  transform:scale(0.92);
}
.more-action-icon{
  width:60rpx;
  height:60rpx;
}
.more-action-label{
  font-size:24rpx;
  color:#374151;
  line-height:1;
}

/* 群红包消息气泡 */
.grp-rp-card{
  width:430rpx;
  border-radius:18rpx;
  background:linear-gradient(135deg,#FA5151 0%,#D32E2E 100%);
  color:#fff;
  overflow:hidden;
  box-sizing:border-box;
  cursor:pointer;
}
.grp-rp-card.received{
  background:linear-gradient(135deg,#A7ADB7 0%,#747B86 100%);
}
.grp-rp-head{
  display:flex;
  align-items:center;
  gap:14rpx;
  padding:22rpx 22rpx 14rpx 22rpx;
}
.grp-rp-icon{
  width:64rpx;
  height:64rpx;
  border-radius:14rpx;
  background:rgba(255,255,255,.22);
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
}
.grp-rp-icon-img{
  width:48rpx;
  height:48rpx;
}
.grp-rp-meta{ flex:1; min-width:0; }
.grp-rp-title{ display:block; font-size:30rpx; font-weight:900; color:#fff; }
.grp-rp-greeting{ display:block; margin-top:4rpx; font-size:22rpx; color:rgba(255,255,255,.82); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.grp-rp-foot{
  padding:14rpx 22rpx 20rpx 22rpx;
  border-top:1rpx solid rgba(255,255,255,.18);
}
.grp-rp-status{ display:block; font-size:24rpx; color:rgba(255,255,255,.92); }

/* 群红包发送弹窗 */
.grp-rp-send-overlay{
  position:fixed;
  top:0; left:0;
  width:100%; height:100%;
  background:rgba(0,0,0,.5);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:10000;
  padding:0 60rpx;
  box-sizing:border-box;
}
.grp-rp-send-modal{
  position:relative;
  width:100%;
  max-width:620rpx;
  border-radius:24rpx;
  overflow:hidden;
  box-shadow:0 16rpx 48rpx rgba(0,0,0,.32);
  animation: grpPopIn .2s cubic-bezier(0.34, 1.2, 0.64, 1);
}
@keyframes grpPopIn { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
/* 顶部红色区域 */
.grp-rp-send-header{
  position:relative;
  background:linear-gradient(160deg, #E54D42 0%, #C41A1A 100%);
  padding:56rpx 48rpx 44rpx;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.grp-rp-send-close{
  position:absolute;
  top:20rpx;
  right:20rpx;
  width:56rpx;
  height:56rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(255,255,255,.15);
  border-radius:50%;
}
.grp-rp-close-icon{
  font-size:40rpx;
  color:#fff;
  line-height:1;
  font-weight:300;
}
.grp-rp-send-title{
  font-size:30rpx;
  font-weight:400;
  color:rgba(255,255,255,.92);
  margin-bottom:32rpx;
}
.grp-rp-amount-field{
  width:100%;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  padding-bottom:8rpx;
  border-bottom:1rpx solid rgba(255,255,255,.25);
}
.grp-rp-amount-symbol{
  font-size:40rpx;
  font-weight:400;
  color:#fff;
  margin-right:8rpx;
  line-height:1.2;
}
.grp-rp-amount-input{
  flex:1;
  height:88rpx;
  font-size:72rpx;
  font-weight:400;
  color:#fff;
  text-align:center;
  line-height:1.1;
}
.grp-rp-amount-placeholder{ color:rgba(255,255,255,.85); }
.grp-rp-amount-tip{
  margin-top:12rpx;
  font-size:24rpx;
  color:rgba(255,255,255,.75);
  font-weight:400;
}
/* 底部白色卡片 */
.grp-rp-send-body{
  background:#fff;
  padding:32rpx 40rpx 40rpx;
}
.grp-rp-type-tabs{
  display:flex;
  background:#f5f5f5;
  border-radius:12rpx;
  padding:6rpx;
  margin-bottom:28rpx;
}
.grp-rp-type-tab{
  flex:1;
  text-align:center;
  padding:18rpx 0;
  font-size:28rpx;
  color:#999;
  border-radius:8rpx;
  transition:all .2s;
  font-weight:400;
}
.grp-rp-type-tab.active{
  background:#fff;
  color:#E54D42;
  font-weight:500;
  box-shadow:0 2rpx 8rpx rgba(0,0,0,.06);
}
.grp-rp-field-row{
  display:flex;
  align-items:center;
  height:96rpx;
}
.grp-rp-field-label{
  width:160rpx;
  font-size:28rpx;
  color:#333;
  flex-shrink:0;
  font-weight:400;
}
.grp-rp-count-field{
  flex:1;
  display:flex;
  align-items:center;
}
.grp-rp-count-input{
  flex:1;
  height:100%;
  font-size:32rpx;
  color:#333;
  font-weight:400;
}
.grp-rp-count-unit{ font-size:28rpx; color:#999; font-weight:400; }
.grp-rp-calc{ padding:8rpx 0 4rpx; }
.grp-rp-calc-txt{ font-size:22rpx; color:#999; font-weight:400; }
.grp-rp-divider{
  height:1rpx;
  background:#f0f0f0;
}
.grp-rp-greeting-input{
  flex:1;
  height:100%;
  font-size:28rpx;
  color:#333;
  font-weight:400;
}
.grp-rp-password-input{
  flex:1;
  height:100%;
  font-size:28rpx;
  color:#333;
  font-weight:400;
}
.grp-rp-send-btn{
  width:100%;
  height:88rpx;
  background:linear-gradient(135deg, #FA5151 0%, #E54D42 100%);
  border-radius:44rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-top:36rpx;
  box-shadow:0 8rpx 20rpx rgba(229,77,66,.32);
}
.grp-rp-send-btn.disabled{ opacity:0.6; box-shadow:none; }
.grp-rp-send-btn-text{ font-size:32rpx; font-weight:400; color:#fff; letter-spacing:2rpx; }

/* 群红包领取弹窗 */
.grp-rp-claim-overlay{
  position:fixed;
  top:0; left:0;
  width:100%; height:100%;
  background:rgba(0,0,0,.7);
  display:flex;
  justify-content:center;
  align-items:center;
  z-index:10000;
  box-sizing:border-box;
}
.grp-rp-claim-container{
  width:calc(100% - 80rpx);
  max-width:560rpx;
  position:relative;
  margin:0 auto;
}
.grp-rp-claim-close{
  position:absolute;
  top:-80rpx;
  right:0;
  width:72rpx;
  height:72rpx;
  background:rgba(255,255,255,.9);
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:40rpx;
  color:#666;
  box-shadow:0 4rpx 16rpx rgba(0,0,0,.1);
  z-index:10;
}
.grp-rp-claim-main{
  background:#e83a3a;
  border-radius:24rpx;
  overflow:hidden;
  box-shadow:0 20rpx 60rpx rgba(232,58,58,.5);
  width:100%;
  min-height:800rpx;
  display:flex;
  flex-direction:column;
}
.grp-rp-claim-top{
  padding:60rpx 32rpx 32rpx;
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.grp-rp-claim-sender{
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:32rpx;
}
.grp-rp-claim-ava-wrap{
  width:80rpx;
  height:80rpx;
  border-radius:50%;
  background:#fff;
  overflow:hidden;
  margin-right:16rpx;
  border:4rpx solid rgba(255,255,255,.5);
}
.grp-rp-claim-ava-img{ width:100%; height:100%; }
.grp-rp-claim-sender-name{ font-size:28rpx; color:rgba(255,255,255,.9); font-weight:500; }
.grp-rp-claim-greeting{ font-size:36rpx; color:#fff; font-weight:bold; letter-spacing:4rpx; }
.grp-rp-claim-opener{ height:32rpx; position:relative; overflow:hidden; }
.grp-rp-claim-curve{
  position:absolute;
  top:-24rpx;
  left:50%;
  transform:translateX(-50%);
  width:120%;
  height:60rpx;
  background:#d43232;
  border-radius:50%;
}
.grp-rp-claim-bottom{
  padding:48rpx 32rpx 60rpx;
  display:flex;
  flex-direction:column;
  align-items:center;
  flex:1;
  gap:20rpx;
}
.grp-rp-claim-open-btn{
  width:160rpx;
  height:160rpx;
  border-radius:50%;
  background:linear-gradient(180deg,#f7d16a 0%,#e6b82a 100%);
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 8rpx 24rpx rgba(0,0,0,.2);
  border:4rpx solid rgba(255,255,255,.3);
}
.grp-rp-claim-open-btn.loading{ background:#ccc; }
.grp-rp-claim-open-btn.rotating{
  animation:grpCoinFlip .5s linear infinite;
  transform-style:preserve-3d;
}
@keyframes grpCoinFlip{
  0%{ transform:rotateY(0deg); }
  50%{ transform:rotateY(180deg); }
  100%{ transform:rotateY(360deg); }
}
.grp-rp-claim-open-text{
  font-size:56rpx;
  font-weight:bold;
  color:#8b4513;
  font-family:'STKaiti','KaiTi',serif;
}
.grp-rp-claim-open-btn.loading .grp-rp-claim-open-text{ color:#888; }
.grp-rp-claim-info{ font-size:24rpx; color:rgba(255,255,255,.85); }

.grp-rp-claim-result{ animation:grpResultAppear .3s ease-out; }
@keyframes grpResultAppear{
  from{ opacity:0; transform:scale(.9); }
  to{ opacity:1; transform:scale(1); }
}
.grp-rp-result-header{
  background:linear-gradient(180deg,#e83a3a 0%,#c91f1f 100%);
  padding:48rpx 32rpx 32rpx;
  text-align:center;
  border-radius:24rpx 24rpx 0 0;
}
.grp-rp-result-icon-wrap{
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 16rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.grp-rp-result-icon{
  width: 56rpx;
  height: 56rpx;
}
.grp-rp-result-title{ font-size:32rpx; color:#fff; }
.grp-rp-result-body{
  padding:100rpx 32rpx 48rpx;
  text-align:center;
  background:#fff;
}
.grp-rp-result-amount{ margin-bottom:16rpx; }
.grp-rp-result-symbol{ font-size:48rpx; font-weight:bold; color:#e83a3a; }
.grp-rp-result-value{ font-size:88rpx; font-weight:bold; color:#e83a3a; line-height:1; }
.grp-rp-result-desc{ font-size:28rpx; color:#666; display:block; }
.grp-rp-result-footer{
  padding:0 32rpx 80rpx;
  margin-top:auto;
  background:#fff;
  border-radius:0 0 24rpx 24rpx;
}
.grp-rp-result-btn{
  background:linear-gradient(180deg,#e83a3a 0%,#c91f1f 100%);
  padding:28rpx;
  border-radius:60rpx;
  text-align:center;
}
.grp-rp-result-btn text{ font-size:32rpx; font-weight:bold; color:#fff; }
</style>
