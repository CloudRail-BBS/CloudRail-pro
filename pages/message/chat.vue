<template>
  <view class="chat-page" :style="pageBgStyle">
    <OnlineNotifyCard />
    <view class="top-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left" @click="goBack">
          <image class="back-icon-img" src="/static/icon/back.svg" mode="aspectFit"></image>
        </view>

        <view class="nav-center" @click.stop="toUserProfile(targetId)">
          <view class="ava-wrap nav-avatar">
            <view class="skel" v-show="!targetAvatarReady"></view>
            <image
              class="img"
              :src="targetAvatar"
              mode="aspectFill"
              :style="{ opacity: targetAvatarReady ? 1 : 0 }"
              @load="onTargetAvatarLoad"
              @error="onTargetAvatarError"
            />
          </view>
          <text class="nav-title" :class="{ 'vip-rainbow-text': targetVip === 1 }">{{ targetName }}</text>
          <view class="online-state">
            <view class="online-dot" :class="{ 'is-on': targetOnline }"></view>
            <text class="online-text" :class="{ 'is-on': targetOnline }">{{ targetOnline ? '在线' : '离线' }}</text>
          </view>
        </view>

        <view class="nav-right" @click.stop="openMore">
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
        @scrolltoupper="loadOlder"
        @click="onPageTap"
      >
        <view class="msg-container" id="msgContainer" :style="msgContainerStyle">
          <view v-if="pageLoading" class="loading-box">
            <text>消息加载中...</text>
          </view>
          <template v-else>
          <!-- 历史消息提示：老消息在列表顶部，所以提示也放顶部，只有真的往上翻才出现 -->
          <view v-if="loadingOlder" class="loading-tip">加载中...</view>
          <view v-else-if="noMoreOlder && msgList.length" class="loading-tip">没有更多消息</view>
          <view v-for="(msg, idx) in msgList" :key="msg.id || msg.tempId" class="msg-item">
            <view v-if="showTime(idx)" class="msg-time">{{ fmtTime(msg.create_time) }}</view>
            <view v-if="msg.type === 'recalled'" class="recalled">
              <text class="recalled-txt">{{ msg.is_me ? '你' : targetName }} 撤回了一条消息</text>
            </view>
            <view v-else class="msg-row" :class="{ 'is-me': msg.is_me }" @longpress="openMsgMenu(msg)">
              <image class="msg-avatar" :src="msg.is_me ? myAvatar : targetAvatar" mode="aspectFill" @click="msg.is_me ? null : toUserProfile(targetId)" />
              <view class="msg-bubble">
                <view class="bubble-content" :class="[msg.bubble_style, { 'no-card': msg.type === 'image' || msg.type === 'emoticon' }]" :style="skinStyle(msg.bubble_style)">
                  <text v-if="skinDeco(msg.bubble_style, 'before')" class="bubble-deco" :style="skinDeco(msg.bubble_style, 'before').style">{{ skinDeco(msg.bubble_style, 'before').text }}</text>
                  <template v-if="msg.type === 'card' && msg.card">
                    <text class="card-tip">名片</text>
                    <view class="card-box" @click="toUserProfile(msg.card.uid)">
                      <image class="card-ava" :src="fixUrl(msg.card.avatar)" mode="aspectFill" />
                      <view class="card-meta">
                        <text class="card-name">{{ msg.card.name || '用户' }}</text>
                        <text class="card-sub">@{{ msg.card.username || '' }}</text>
                      </view>
                    </view>
                  </template>
                  <template v-else-if="msg.type === 'group_card' && msg.groupCard">
                    <text class="card-tip">群名片</text>
                    <view class="card-box group-card-box" @click="toGroupInfo(msg.groupCard.group_id)">
                      <image class="card-ava" :src="fixUrl(msg.groupCard.avatar)" mode="aspectFill" />
                      <view class="card-meta">
                        <text class="card-name">{{ msg.groupCard.name || '群聊' }}</text>
                        <text class="card-sub">群号：{{ msg.groupCard.identity_code || '-' }}</text>
                      </view>
                      <text class="group-card-arrow">›</text>
                    </view>
                  </template>
                                    <template v-else-if="msg.type === 'group_invite' && msg.invite">
                    <text class="card-tip">群聊邀请</text>
                    <view class="card-box invite-card">
                      <image class="card-ava" :src="fixUrl(msg.invite.avatar) || '/static/logo.png'" mode="aspectFill" />
                      <view class="card-meta">
                        <text class="card-name">{{ msg.invite.group_name || '群聊' }}</text>
                        <text class="card-sub">{{ msg.invite.inviter || '' }} 邀请你加入群聊</text>
                        <text class="card-code">群号：{{ msg.invite.identity_code || '-' }}</text>
                      </view>
                    </view>
                    <template v-if="msg.is_me">
                      <view class="invite-status" :class="Number(msg.invite.status || 0) === 0 ? 'pending' : (Number(msg.invite.status || 0) === 2 ? 'declined' : '')">
                        <text v-if="Number(msg.invite.status || 0) === 1">对方已同意邀请</text>
                        <text v-else-if="Number(msg.invite.status || 0) === 2">对方已拒绝邀请</text>
                        <text v-else-if="Number(msg.invite.status || 0) === 3">对方已提交申请</text>
                        <text v-else>等待对方验证</text>
                      </view>
                    </template>
                    <template v-else>
                      <view v-if="Number(msg.invite.status || 0) === 0" class="invite-actions">
                        <view class="invite-btn decline" @click.stop="declineInvite(msg)">拒绝</view>
                        <view class="invite-btn accept" @click.stop="acceptInvite(msg)">同意</view>
                      </view>
                      <view v-else class="invite-done" :class="{ declined: Number(msg.invite.status || 0) === 2, pending: Number(msg.invite.status || 0) === 3 }">
                        <text v-if="Number(msg.invite.status || 0) === 1">你已加入该群聊</text>
                        <text v-else-if="Number(msg.invite.status || 0) === 3">已申请，等待群主审核</text>
                        <text v-else>你已拒绝加入该群聊</text>
                      </view>
                    </template>
                  </template>
<template v-else-if="msg.type === 'relation_apply' && msg.relationApply">
                    <text class="card-tip">关系申请</text>
                    <view class="card-box invite-card rel-card">
                      <image class="card-ava" :src="fixUrl(msg.relationApply.from_avatar) || '/static/logo.png'" mode="aspectFill" />
                      <view class="card-meta">
                        <text class="card-name">{{ msg.relationApply.from_name || '好友' }}</text>
                        <text class="card-sub">想和你建立「{{ msg.relationApply.type_name || '好友' }}」关系</text>
                      </view>
                    </view>
                    <template v-if="msg.is_me">
                      <view class="invite-status" :class="Number(msg.relationApply.status || 0) === 1 ? '' : (Number(msg.relationApply.status || 0) > 1 ? 'declined' : 'pending')">
                        <text v-if="Number(msg.relationApply.status || 0) === 1">对方已同意，关系已建立</text>
                        <text v-else-if="Number(msg.relationApply.status || 0) === 2">对方已拒绝</text>
                        <text v-else-if="Number(msg.relationApply.status || 0) === 3">关系已解除</text>
                        <text v-else>等待对方确认</text>
                      </view>
                    </template>
                    <template v-else>
                      <view v-if="Number(msg.relationApply.status || 0) === 0" class="invite-actions">
                        <view class="invite-btn decline" @click.stop="handleRelationApply(msg, 0)">拒绝</view>
                        <view class="invite-btn accept" @click.stop="handleRelationApply(msg, 1)">同意</view>
                      </view>
                      <view v-else class="invite-done" :class="{ declined: Number(msg.relationApply.status || 0) > 1 }">
                        <text v-if="Number(msg.relationApply.status || 0) === 1">已建立关系</text>
                        <text v-else-if="Number(msg.relationApply.status || 0) === 3">关系已解除</text>
                        <text v-else>已拒绝</text>
                      </view>
                    </template>
                  </template>
<template v-else-if="msg.type === 'transfer' && msg.transfer">
                    <view class="transfer-card" :class="{ received: Number(msg.transfer.status || 0) === 1 }">
                      <view class="transfer-head">
                        <view class="transfer-icon">¥</view>
                        <view class="transfer-meta">
                          <text class="transfer-title">{{ Number(msg.transfer.status || 0) === 1 ? '已收款' : '转账' }}</text>
                          <text class="transfer-remark">{{ msg.transfer.remark || '私信转账' }}</text>
                        </view>
                      </view>
                      <text class="transfer-amount">¥{{ msg.transfer.amount }}</text>
                      <view class="transfer-action" v-if="!msg.is_me && Number(msg.transfer.status || 0) === 0" @click.stop="receiveTransfer(msg)">
                        <text>确认收款</text>
                      </view>
                      <text class="transfer-state" v-else>{{ Number(msg.transfer.status || 0) === 1 ? '已存入余额' : (msg.is_me ? '等待对方收款' : '待收款') }}</text>
                    </view>
                  </template>
                  <template v-else-if="msg.type === 'redpacket' && msg.redPacket">
                    <view class="redpacket-card" :class="{ received: Number(msg.redPacket.status || 0) === 1 }" @click.stop="onRedPacketClick(msg)">
                      <view class="redpacket-head">
                        <view class="redpacket-icon">
                          <image src="/static/icon/redpacket.svg" class="redpacket-icon-img" mode="aspectFit"></image>
                        </view>
                        <view class="redpacket-meta">
                          <text class="redpacket-title">{{ Number(msg.redPacket.status || 0) === 1 ? '红包已领取' : '红包来啦' }}</text>
                          <text class="redpacket-greeting">{{ msg.redPacket.greeting || '恭喜发财，大吉大利' }}</text>
                        </view>
                      </view>
                      <view class="redpacket-foot">
                        <text class="redpacket-status">{{ Number(msg.redPacket.status || 0) === 1 ? ('已领取 ¥' + msg.redPacket.amount) : (msg.is_me ? '等待对方领取' : '点击领取红包') }}</text>
                      </view>
                    </view>
                  </template>
                  <template v-else-if="msg.type === 'emoticon' || msg.type === 'text'">
                    <view class="bubble-txt" :class="{ 'vip-rainbow-text': !msg.is_me && targetVip === 1 }">
                      <template v-for="(part, idx) in parseEmoticons(msg.content)" :key="idx">
                        <image v-if="part.type === 'emoticon'" :src="fixUrl(part.url)" class="inline-emoticon" mode="aspectFit" @click.stop="previewEmoticon(part.url)" />
                        <text v-else selectable>{{ part.text }}</text>
                      </template>
                    </view>
                  </template>
                  <image v-else-if="msg.type === 'image'" :src="fixUrl(msg.content)" mode="aspectFit" class="msg-image" @click="previewImage(msg.content)" />
                  <!-- 语音消息：点一下播放，长按弹菜单（可转文字） -->
                  <view
                    v-else-if="msg.type === 'voice'"
                    class="voice-msg"
                    :class="{ playing: playingVoiceId === msg.id, mine: msg.is_me }"
                    :style="{ width: voiceWidth(msg) + 'rpx' }"
                    @click.stop="playVoiceMsg(msg)"
                  >
                    <view class="voice-wave"><view class="voice-bar"></view><view class="voice-bar"></view><view class="voice-bar"></view><view class="voice-bar"></view></view>
                    <text class="voice-sec">{{ voiceSec(msg) }}″</text>
                    <text v-if="msg.voiceText" class="voice-dot">文</text>
                  </view>
                  <!-- 兜底：出现未适配的消息类型时至少显示一条提示。
                       否则这条消息会因为整条 v-if/v-else-if 链都不匹配而“凭空消失” -->
                  <text v-else class="msg-unknown">[暂不支持的消息类型]</text>
                  <text v-if="skinDeco(msg.bubble_style, 'after')" class="bubble-deco" :style="skinDeco(msg.bubble_style, 'after').style">{{ skinDeco(msg.bubble_style, 'after').text }}</text>
                </view>
                <view v-if="msg.sending" class="msg-status">
                  <view class="status-loading"></view>
                </view>
              </view>
            </view>
          </view>
          <view v-if="!msgList.length" class="welcome-placeholder">
            <image class="welcome-ava" :src="targetAvatar || '/static/logo.png'" mode="aspectFill" />
            <text class="welcome-name">{{ targetName }}</text>
            <text class="welcome-hint">开始聊天吧~</text>
          </view>
          </template>
          <view :style="{ height: bottomGap + 'px' }"></view>
        </view>
      </scroll-view>

      <view class="input-wrapper" :style="inputWrapperStyle">
        <view class="chat-disabled-tip" v-if="!canChat">{{ chatDisabledReason }}</view>
        <view class="input-inner">
          <view class="tool-btn voice-switch" @click="toggleVoiceMode">
            <image :src="voiceMode ? '/static/icon/keyboard-ref.svg' : '/static/icon/mic.svg'" class="tool-icon-img" mode="aspectFit"></image>
          </view>
          <view class="tool-btn emoji-btn" @click="toggleEmojiPicker">
            <image src="/static/icon/smile.svg" class="tool-icon-img" mode="aspectFit"></image>
          </view>
          <view class="input-box">
            <!-- 语音模式：按住说话 -->
            <view
              v-if="voiceMode"
              class="voice-hold"
              :class="{ active: recording, cancel: recordCancel }"
              @touchstart.stop.prevent="onVoiceStart"
              @touchmove.stop.prevent="onVoiceMove"
              @touchend.stop.prevent="onVoiceEnd"
              @touchcancel.stop.prevent="onVoiceCancel"
            >{{ recording ? (recordCancel ? '松开手指，取消发送' : '松开 发送') : '按住 说话' }}</view>
            <template v-else>
            <!-- #ifdef H5 -->
            <div
              ref="richInput"
              class="text-input rich-input-h5"
              :class="{ disabled: !canChat }"
              :contenteditable="canChat ? 'true' : 'false'"
              data-placeholder="说些什么..."
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
              placeholder="说些什么..."
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
            </template>
          </view>
          <view class="tool-btn add-btn" @click="toggleMoreActions">
            <image src="/static/icon/plus-ref.svg" class="tool-icon-img" mode="aspectFit"></image>
          </view>
          <view class="send-btn" v-if="inputTxt.trim()" :class="{ active: canSend }" @click="sendText">
            <text class="send-text">发送</text>
          </view>
        </view>
      </view>

      <view class="emoji-picker" v-if="showEmojiPicker">
        <view class="emoji-handle"></view>
        <view class="emoji-tabs">
          <view class="emoji-tab" :class="{ active: emojiTab === 'recent' }" @click="switchToRecent">
            <text>最近</text>
            <text class="emoji-tab-num" v-if="recentlyUsedEmoticons.length">{{ recentlyUsedEmoticons.length }}</text>
          </view>
          <view class="emoji-tab" :class="{ active: emojiTab === 'default' }" @click="emojiTab = 'default'">
            <text>全部</text>
          </view>
        </view>
        <scroll-view class="emoji-scroll" scroll-y>
          <view class="emoji-grid" v-if="emojiTab === 'recent'">
            <view class="emoji-item" v-for="emo in recentlyUsedEmoticons" :key="emo.id" @click="insertEmoji(emo)">
              <image class="emoji-img" :src="emo.url" mode="aspectFit" @error="onEmojiImgError" />
            </view>
            <view class="emoji-empty" v-if="recentlyUsedEmoticons.length === 0">
              <text class="emoji-empty-txt">还没有最近使用的表情</text>
              <text class="emoji-empty-hint">点「全部」里的表情，用过的会自动收在这里</text>
            </view>
          </view>
          <view class="emoji-grid" v-if="emojiTab === 'default'">
            <view class="emoji-item" v-for="emo in defaultEmoticons" :key="emo.id" @click="insertEmoji(emo)">
              <image class="emoji-img" :src="emo.url" mode="aspectFit" @error="onEmojiImgError" />
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-if="sendingMask" class="loading-mask transparent" catchtouchmove="true"></view>

      <view class="modal-mask" v-if="showWarn" @click="closeWarn" catchtouchmove="true">
        <view class="modal-box" @click.stop>
          <view class="modal-header"><view class="warn-badge">系统警告</view></view>
          <view class="modal-body">
            <text class="modal-title">{{ warnTitle }}</text>
            <text class="modal-desc">{{ warnMsg }}</text>
          </view>
          <view class="modal-footer">
            <view class="modal-btn primary" @click="closeWarn">我知道了</view>
          </view>
        </view>
      </view>

      <view class="modal-mask" v-if="showBan" @click="closeBan" catchtouchmove="true">
        <view class="modal-box" @click.stop>
          <view class="modal-header"><view class="ban-badge">账号受限</view></view>
          <view class="modal-body">
            <text class="modal-title">您已被暂时禁言</text>
            <text class="modal-desc">{{ banMsg }}</text>
            <view class="ban-stats">
              <view class="stat-row">
                <text class="stat-label">违规次数</text>
                <text class="stat-value orange">{{ banCnt }}次</text>
              </view>
              <view class="stat-row">
                <text class="stat-label">解封倒计时</text>
                <text class="stat-value red">{{ banTime }}</text>
              </view>
            </view>
            <text class="modal-tip">请遵守社区规范，文明发言</text>
          </view>
          <view class="modal-footer">
            <view class="modal-btn danger" @click="closeBan">确定</view>
          </view>
        </view>
      </view>

      <view class="mask" v-if="more.show" @click="closeMore" catchtouchmove="true">
        <view class="sheet sheet-anim" @click.stop>
          <view class="sheet-item" @click="goTargetProfile">查看资料</view>
          <view class="sheet-item" @click="openTransfer">转账</view>
          <view class="sheet-item" @click="openCardPicker">发送名片（互关好友）</view>
          <view class="sheet-item" @click="pickChatBg">更换聊天背景</view>
          <view class="sheet-item" v-if="bgUrl" @click="clearChatBgConfirm">清除聊天背景</view>
          <view class="sheet-item" @click="toggleBlock">{{ blockedByMe ? '取消拉黑' : '拉黑对方' }}</view>
          <view class="sheet-item" @click="openSearch">搜索聊天记录</view>
          <view class="sheet-item danger" @click="clearChatConfirm">清空聊天记录</view>
          <view class="sheet-item danger" @click="deleteChatConfirm">删除会话</view>
          <view class="sheet-cancel" @click="closeMore">取消</view>
        </view>
      </view>

      <view class="mask" v-if="msgMenu.show" @click="closeMsgMenu" catchtouchmove="true">
        <view class="sheet sheet-anim" @click.stop>
          <view class="sheet-item" v-if="msgMenu.canCopy" @click="copyMsg">复制</view>
          <view class="sheet-item" v-if="msgMenu.canVoiceText" @click="voiceToText">转文字</view>
          <view class="sheet-item danger" v-if="msgMenu.canRecall" @click="recallMsgConfirm">撤回</view>
          <view class="sheet-cancel" @click="closeMsgMenu">取消</view>
        </view>
      </view>

      <!-- 录音状态浮层 -->
      <view v-if="recording" class="rec-mask">
        <view class="rec-box" :class="{ cancel: recordCancel }">
          <view class="rec-wave"><view class="rec-bar"></view><view class="rec-bar"></view><view class="rec-bar"></view></view>
          <text class="rec-sec">{{ recordSec }}″</text>
          <text class="rec-tip">{{ recordCancel ? '松开手指，取消发送' : '松开发送，上滑取消' }}</text>
        </view>
      </view>

      <view class="modal-mask" v-if="search.show" @click="closeSearch" catchtouchmove="true">
        <view class="modal modal-anim" @click.stop>
          <text class="modal-title">搜索聊天记录</text>
          <input class="modal-input" v-model="search.keyword" placeholder="输入关键词" confirm-type="search" @confirm="doSearch" />
          <view class="modal-btns">
            <view class="btn" @click="doSearch">搜索</view>
            <view class="btn ghost" @click="closeSearch">关闭</view>
          </view>
          <view class="sr" v-if="search.list.length">
            <view class="sr-item" v-for="it in search.list" :key="it.id">
              <text class="sr-time">{{ it.create_time }}</text>
              <text class="sr-txt" selectable>{{ it.content }}</text>
            </view>
          </view>
          <view class="sr-empty" v-else-if="search.done">没有找到相关记录</view>
        </view>
      </view>

      <view class="modal-mask" v-if="card.show" @click="closeCardPicker" catchtouchmove="true">
        <view class="modal modal-anim" @click.stop>
          <text class="modal-title">选择要发送的名片</text>
          <view class="friends">
            <view class="f-item" v-for="u in card.friends" :key="u.id" @click="sendCard(u)">
              <image class="f-ava" :src="fixUrl(u.avatar)" mode="aspectFill" />
              <view class="f-meta">
                <text class="f-name">{{ u.name }}</text>
                <text class="f-sub">@{{ u.username }}</text>
              </view>
              <view class="f-go">发送</view>
            </view>
          </view>
          <view class="modal-btns">
            <view class="btn ghost" @click="closeCardPicker">关闭</view>
          </view>
        </view>
      </view>

      <view class="modal-mask" v-if="transfer.show" @click="closeTransfer" catchtouchmove="true">
        <view class="modal modal-anim transfer-modal" @click.stop>
          <text class="modal-title">向 {{ targetName || '对方' }} 转账</text>
          <view class="amount-field">
            <text class="amount-symbol">¥</text>
            <input class="amount-input" v-model="transfer.amount" type="digit" placeholder="0.00" />
          </view>
          <input class="modal-input" v-model="transfer.remark" maxlength="50" placeholder="备注，可不填" />
          <input class="modal-input" v-model="transfer.payPassword" password placeholder="请输入支付密码" />
          <view class="modal-btns">
            <view class="btn ghost" @click="closeTransfer">取消</view>
            <view class="btn" @click="submitTransfer">确认转账</view>
          </view>
        </view>
      </view>

      <view class="modal-mask rp-modal-mask" v-if="redPacket.show" @click="closeRedPacket" catchtouchmove="true">
        <view class="redpacket-modal" @click.stop>
          <!-- 顶部红色区域 -->
          <view class="rp-modal-header">
            <view class="rp-modal-close" @click="closeRedPacket">
              <text class="rp-close-icon">×</text>
            </view>
            <view class="rp-modal-avatar">
              <image :src="targetAvatar || '/static/logo.png'" mode="aspectFill" class="rp-modal-ava-img" />
            </view>
            <text class="rp-modal-tip">发红包给 {{ targetName || '对方' }}</text>
            <view class="rp-amount-field">
              <text class="rp-amount-symbol">¥</text>
              <input class="rp-amount-input" v-model="redPacket.amount" type="digit" placeholder="0.00" placeholder-class="rp-amount-placeholder" />
            </view>
          </view>
          <!-- 底部白色卡片 -->
          <view class="rp-modal-body">
            <view class="rp-field-row">
              <text class="rp-field-label">祝福语</text>
              <input class="rp-field-input" v-model="redPacket.greeting" maxlength="50" placeholder="恭喜发财，大吉大利" />
            </view>
            <view class="rp-divider"></view>
            <view class="rp-field-row">
              <text class="rp-field-label">支付密码</text>
              <input class="rp-field-input" v-model="redPacket.payPassword" password placeholder="请输入支付密码" />
            </view>
            <view class="rp-send-btn" :class="{ disabled: redPacket.sending }" @click="submitRedPacket">
              <text class="rp-send-text">{{ redPacket.sending ? '发送中...' : '塞钱进红包' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 红包领取弹窗 -->
      <view class="rp-claim-overlay" v-if="rpClaim.show" @touchmove.stop.prevent @click="closeRpClaim">
        <view class="rp-claim-container" @click.stop>
          <view class="rp-claim-close" @click="closeRpClaim">×</view>

          <!-- 未拆开 -->
          <view class="rp-claim-main" v-if="!rpClaim.claimed">
            <view class="rp-claim-top">
              <view class="rp-claim-sender">
                <view class="rp-claim-ava-wrap">
                  <image class="rp-claim-ava-img" :src="rpClaim.senderAvatar || '/static/logo.png'" mode="aspectFill" />
                </view>
                <text class="rp-claim-sender-name">来自{{ rpClaim.senderName || '对方' }}的红包</text>
              </view>
              <text class="rp-claim-greeting">{{ rpClaim.greeting || '恭喜发财，大吉大利' }}</text>
            </view>
            <view class="rp-claim-opener"><view class="rp-claim-curve"></view></view>
            <view class="rp-claim-bottom">
              <view class="rp-claim-open-btn" :class="{ rotating: rpClaim.rotating, loading: rpClaim.claiming }" @click="claimRedPacket">
                <text class="rp-claim-open-text">開</text>
              </view>
            </view>
          </view>

          <!-- 拆开结果 -->
          <view class="rp-claim-result" v-else>
            <view class="rp-result-header">
              <view class="rp-result-icon-wrap">
                <image v-if="rpClaim.success" src="/static/icon/gift-white.svg" class="rp-result-icon" mode="aspectFit"></image>
                <image v-else src="/static/icon/x-circle-white.svg" class="rp-result-icon" mode="aspectFit"></image>
              </view>
              <text class="rp-result-title">{{ rpClaim.success ? '恭喜你成功领取了红包' : '很遗憾' }}</text>
            </view>
            <view class="rp-result-body" v-if="rpClaim.success">
              <view class="rp-result-amount">
                <text class="rp-result-symbol">¥</text>
                <text class="rp-result-value">{{ rpClaim.amount }}</text>
              </view>
              <text class="rp-result-desc">已存入你的余额</text>
            </view>
            <view class="rp-result-body" v-else>
              <text class="rp-result-desc">{{ rpClaim.resultText }}</text>
            </view>
            <view class="rp-result-footer">
              <view class="rp-result-btn" @click="closeRpClaim"><text>收下</text></view>
            </view>
          </view>
        </view>
      </view>

      <XhsConfirm
        :visible="confirm.show"
        :title="confirm.title"
        :message="confirm.content"
        @confirm="confirmOk"
        @cancel="confirmCancel"
      />

      <view class="toast-wrap" v-if="toastBox.show">
        <view class="toast toast-anim"><text class="toast-text">{{ toastBox.text }}</text></view>
      </view>

      <!-- +号功能面板（贴底弹起，与表情面板同位置） -->
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
    </view>
  </view>
</template>

<script>
import { request, baseUrl, uploadFile, uploadBackgroundImage } from '../../common/request.js'
import { startRecord, stopRecord, abortRecord, uploadVoice, playVoice, stopVoice, voiceSeconds, voiceBubbleWidth } from '../../common/voice.js'
import ws from '../../common/ws.js'
import presence from '../../common/presence.js'
import XhsConfirm from '../../components/XhsConfirm.vue'
import OnlineNotifyCard from '../../components/OnlineNotifyCard.vue'
import { ensureCustomBubbleCss, getBubbleSkins } from '../../common/bubble-style.js'

export default {
  components: {
    XhsConfirm,
    OnlineNotifyCard
  },
  data() {
    return {
      statusBarHeight: 20,
      safeBottom: 0,
      keyboardHeight: 0,

      myId: 0,
      myAvatar: '',
      myAvatarReady: false,

      targetId: 0,
      targetName: '',
      targetOnline: false,
      targetAvatar: '',
      targetAvatarReady: false,
      targetVip: 0,

      myBubbleStyle: 'bubble-default',
      /* 类名 -> {style, before, after}：气泡皮肤不能靠插样式，得用内联样式绑定 */
      bubbleSkins: {},

      msgList: [],
      msgIdSet: {},

      inputTxt: '',
      inputFocus: false,
      sending: false,

      pollTimer: null,
      fixUrlCache: {},

      scrollTop: 0,
      scrollAnim: true,
      lastScrollTop: 0,

      loadingOlder: false,
      noMoreOlder: false,
      /* 刚进页面时 scrolltoupper 会被自动触发一次，
         用它挡住那次误触发，避免一进来就显示"没有更多消息" */
      olderReady: false,

      showWarn: false,
      warnTitle: '',
      warnMsg: '',

      showBan: false,
      banMsg: '',
      banCnt: 0,
      banExpire: 0,
      banTime: '',
      banTimer: null,

      pageLoading: true,
      sendingMask: false,

      isAtBottom: true,

      more: { show: false },
      blockedByMe: false,
      blockedMe: false,
      bgUrl: '',

      search: { show: false, keyword: '', list: [], done: false },
      card: { show: false, friends: [] },
      transfer: { show: false, amount: '', remark: '', payPassword: '', sending: false },
      redPacket: { show: false, amount: '', greeting: '恭喜发财，大吉大利', payPassword: '', sending: false },
      rpClaim: {
        show: false, claimed: false, success: false, rotating: false, claiming: false,
        msgId: null, redPacketId: 0, amount: '0.00', greeting: '', resultText: '',
        senderName: '', senderAvatar: ''
      },

      msgMenu: { show: false, msg: null, canCopy: false, canRecall: false, canVoiceText: false },
      /* ---- 语音消息 ---- */
      voiceMode: false,      // 输入栏是否处于"按住说话"模式
      recording: false,      // 正在录音
      recordCancel: false,   // 上滑到取消区
      recordSec: 0,          // 录音秒数
      recTimer: null,
      recordStartY: 0,
      recordStartAt: 0,      // 按下时的时间戳，用于兜底算录音时长
      playingVoiceId: null,  // 正在播放的语音消息 id

      confirm: { show: false, title: '', content: '', resolve: null },

      toastBox: { show: false, text: '', timer: null },

      inputBarHeight: 50,

      canChat: true,
      chatDisabledReason: '',
      useKeyboardPush: false,
      showMoreActions: false,

      showEmojiPicker: false,
      emojiTab: 'default',
      defaultEmoticons: [],
      recentlyUsedEmoticons: [],
      emojiLoaded: false,
      emojiPickerHeight: 235,
      moreActionsHeight: 140
    }
  },
  computed: {
    canSend() {
      return this.inputTxt.trim().length > 0 && !this.sending
    },
    navTotalHeightPx() {
      return (this.statusBarHeight || 0) + 44
    },
    bottomGap() {
      // 键盘弹起时减小底部占位，避免最后一条消息与输入框之间出现大间隙
      if (this.keyboardHeight > 0 || this.showEmojiPicker || this.showMoreActions) {
        return 10
      }
      return (this.inputBarHeight || 50) + (this.safeBottom || 0) + 40
    },
    pageBgStyle() {
      if (!this.bgUrl) return {}
      return {
        backgroundImage: `url(${this.bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    },
    contentStyle() {
      // adjustResize 模式下 webview 已被压缩，键盘弹起时消息区不需要额外 keyboard padding
      // 仅在表情面板/+号面板打开时留出面板高度
      let panelH = 0
      if (this.showEmojiPicker) panelH = this.emojiPickerHeight + this.inputBarHeight
      else if (this.showMoreActions) panelH = this.moreActionsHeight + this.inputBarHeight
      return {
        paddingTop: this.navTotalHeightPx + 'px',
        paddingBottom: (this.inputBarHeight + panelH) + 'px'
      }
    },
    msgContainerStyle() {
      return {}
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
    }
  },
  async onLoad(opt) {
    /* 气泡样式(内置 + 后台自定义代码)：拉回来转成内联样式绑到气泡上。
       App 端往 document 插 <style> 不一定生效，所以外观必须走内联，这里拉完刷新一次。 */
    ensureCustomBubbleCss(true).then(() => { this.bubbleSkins = getBubbleSkins() })

    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.safeBottom = sys.safeAreaInsets?.bottom || 0
    this._origWindowHeight = sys.windowHeight || 0
    this._screenHeight = sys.screenHeight || sys.windowHeight || 0

    // 根据屏幕宽度动态计算面板高度（CSS用rpx，JS须用upx2px匹配）
    this.moreActionsHeight = uni.upx2px(280)
    this.emojiPickerHeight = uni.upx2px(470)

    const user = uni.getStorageSync('userInfo')
    if (!user) return uni.navigateBack()

    this.myId = user.id
    this.myAvatar = this.fixUrl(user.avatar)

    // #ifdef H5
    this.useKeyboardPush = true
    // #endif

    this.targetId = String(opt.targetId || "")
    this.targetName = decodeURIComponent(opt.name || '')
    this.targetAvatar = this.fixUrl(decodeURIComponent(opt.avatar || ''))

    // 键盘监听：H5用visualViewport，APP/小程序用uni.onKeyboardHeightChange（单一监听，避免重复顶起）
    // #ifdef H5
    if (window.visualViewport) {
      this._vpHandler = () => {
        const oldHeight = this.keyboardHeight
        const kbH = Math.max(0, window.innerHeight - window.visualViewport.height)
        this.keyboardHeight = kbH
        if (this.keyboardHeight > oldHeight && this.isAtBottom) {
          setTimeout(() => this.scrollBottom(false), 400)
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
        if (this.keyboardHeight > oldHeight && this.isAtBottom) {
          setTimeout(() => this.scrollBottom(false), 400)
        }
        this.$nextTick(() => {
          this.measureInputBar()
        })
      }
      uni.onKeyboardHeightChange(this._keyboardHandler)
    }
    // #endif

    try {
      const r = await request('message.php', { action: 'checkMyStyle' }, 'GET')
      if (r.code === 0 && r.data && r.data.style) this.myBubbleStyle = r.data.style
    } catch (e) {}

    if (!this.emojiLoaded) {
      await this.loadDefaultEmoticons()
    }

    this.preloadAvatar('my')
    this.preloadAvatar('target')

    this.loadCachedMsg()
    this.refreshChatProfile()
    this.loadMsg(true)
    ws.ensureConnected()
    this._wsUnsubChat = ws.on('chat', this._onWsChat)
    /* 对方在线状态: 进入页面查一次(WS 会实时推送, 这里是兜底), 之后每 10 秒兜底刷新 */
    this.refreshTargetOnline()
    this._onlineTimer = setInterval(() => this.refreshTargetOnline(), 10000)
    uni.$off('presence_changed', this._onPresence)
    uni.$on('presence_changed', this._onPresence)
  },
  onReady() {
    this.measureInputBar()
  },
  onUnload() {
    if (this._wsUnsubChat) { this._wsUnsubChat(); this._wsUnsubChat = null }
    if (this._onlineTimer) { clearInterval(this._onlineTimer); this._onlineTimer = null }
    if (this._olderTimer) { clearTimeout(this._olderTimer); this._olderTimer = null }
    /* 语音：停掉录音、播放和计时器，避免页面销毁后还在跑 */
    this.stopRecTimer()
    if (this.recording) { this.recording = false; stopRecord() }
    abortRecord()
    stopVoice()
    this.playingVoiceId = null
    uni.$off('presence_changed', this._onPresence)
    this.stopBanTimer()
    if (this.toastBox.timer) clearTimeout(this.toastBox.timer)
    this._clearKbFallback()
    if (this._keyboardHandler && typeof uni.offKeyboardHeightChange === 'function') {
      uni.offKeyboardHeightChange(this._keyboardHandler)
      this._keyboardHandler = null
    }
    // #ifdef H5
    if (this._vpHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this._vpHandler)
    }
    // #endif
  },
  methods: {
    preloadAvatar(type) {
      const src = type === 'my' ? this.myAvatar : this.targetAvatar
      if (!src) {
        if (type === 'my') this.myAvatarReady = true
        else this.targetAvatarReady = true
        return
      }
      uni.getImageInfo({
        src,
        success: () => {
          if (type === 'my') this.myAvatarReady = true
          else this.targetAvatarReady = true
        },
        fail: () => {
          if (type === 'my') {
            this.myAvatar = '/static/logo.png'
            this.myAvatarReady = true
          } else {
            this.targetAvatar = '/static/logo.png'
            this.targetAvatarReady = true
          }
        }
      })
    },

    onTargetAvatarLoad() { this.targetAvatarReady = true },
    onTargetAvatarError() {
      this.targetAvatar = '/static/logo.png'
      this.targetAvatarReady = true
    },
    onMyAvatarLoad() { this.myAvatarReady = true },
    onMyAvatarError() {
      this.myAvatar = '/static/logo.png'
      this.myAvatarReady = true
    },

    showToast(text, ms = 1800) {
      if (this.toastBox.timer) clearTimeout(this.toastBox.timer)
      this.toastBox.show = true
      this.toastBox.text = text
      this.toastBox.timer = setTimeout(() => {
        this.toastBox.show = false
        this.toastBox.text = ''
      }, ms)
    },

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
      this.$nextTick(() => {
        this.measureInputBar()
      })
      setTimeout(() => {
        if (this.isAtBottom) {
          this.scrollBottom(true)
        }
      }, 300)
    },
    focusInput() {},
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

    async toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker
      if (this.showEmojiPicker) {
        // 打开表情面板时隐藏系统键盘，关闭+号面板
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
        // 打开+号面板时隐藏系统键盘，关闭表情面板
        uni.hideKeyboard()
        this._clearKbFallback()
        this.keyboardHeight = 0
        this.showEmojiPicker = false
        this.$nextTick(() => {
          if (this.isAtBottom) this.scrollBottom(true)
        })
      }
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
      const regex = /\[表情(\d+)\]|\[([^\]]+)\]/g
      let lastIndex = 0
      let match
      
      while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', text: content.substring(lastIndex, match.index) })
        }
        
        let emoji = null
        if (match[1]) {
          const emojiId = parseInt(match[1])
          emoji = this.defaultEmoticons.find(e => e.id === emojiId)
        } else if (match[2]) {
          emoji = this.defaultEmoticons.find(e => e.code === match[0])
        }
        
        if (emoji) {
          parts.push({ type: 'emoticon', url: emoji.url })
        } else {
          parts.push({ type: 'text', text: match[0] })
        }
        
        lastIndex = regex.lastIndex
      }
      
      if (lastIndex < content.length) {
        parts.push({ type: 'text', text: content.substring(lastIndex) })
      }
      
      return parts
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

    async switchToRecent() {
      this.emojiTab = 'recent'
      this.loadRecentlyUsed()
    },

    loadRecentlyUsed() {
      try {
        const saved = uni.getStorageSync('recent_emoticons') || '[]'
        this.recentlyUsedEmoticons = JSON.parse(saved)
      } catch (e) {
        this.recentlyUsedEmoticons = []
      }
    },

    saveToRecentlyUsed(emo) {
      let recent = this.recentlyUsedEmoticons.filter(e => e.id !== emo.id)
      recent.unshift(emo)
      if (recent.length > 20) recent = recent.slice(0, 20)
      this.recentlyUsedEmoticons = recent
      uni.setStorageSync('recent_emoticons', JSON.stringify(recent))
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
      // 移除零宽空格
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
            // 检查再前面是否是 img（在前一个兄弟节点）
            const offset = sel.anchorOffset
            const beforeText = anchor.textContent.substring(0, offset - 1)
            // 如果零宽空格前没有其他文本，检查前一个兄弟节点是否 img
            if (beforeText.length === 0 && anchor.previousSibling && anchor.previousSibling.nodeType === 1 && anchor.previousSibling.tagName === 'IMG') {
              e.preventDefault()
              // 删除 img 节点
              const imgNode = anchor.previousSibling
              imgNode.remove()
              // 删除零宽空格
              anchor.textContent = anchor.textContent.substring(offset)
              // 重置光标到 anchor 开头
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
        // 光标在 div 或元素节点开头，检查前一个兄弟节点
        if (sel.anchorOffset === 0 && anchor === el) {
          // 不处理
          return
        }
      }
      // #endif
    },

    // H5 端：把 /static/xxx 路径补上 H5 base 前缀（如 /web/）
    fixH5StaticUrl(url) {
      // #ifdef H5
      if (!url) return ''
      // 已经是完整URL直接返回
      if (/^https?:\/\//.test(url)) return url
      // 以 /static/ 开头的相对路径，补上 base 前缀
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
      // 在 img 后插入零宽空格，确保光标能移到 img 后面
      const zwsp = document.createTextNode('\u200b')
      img.after(zwsp)
      range.setStartAfter(zwsp)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      this.inputTxt = this.extractRichText()
      // #endif
    },

    // 清空输入框（H5 清空 contenteditable，非 H5 清空 inputTxt）
    clearRichInput() {
      // #ifdef H5
      const el = this.$refs.richInput
      if (el) el.innerHTML = ''
      // #endif
      this.inputTxt = ''
    },

    // 根据 content（可能是 [表情x] code 或 url）获取表情图URL
    getEmoticonUrl(content) {
      if (!content) return ''
      if (content.startsWith('http') || content.startsWith('/static/')) return content
      // 形如 [表情1]
      const m = content.match(/\[表情(\d+)\]/)
      if (m) {
        const id = parseInt(m[1])
        const emo = this.defaultEmoticons.find(e => e.id === id)
        if (emo) return emo.url
      }
      // 其他 code
      const emo = this.defaultEmoticons.find(e => e.code === content)
      return emo ? emo.url : ''
    },

    openImagePicker() {
      this.showMoreActions = false
      if (!this.canChat || this.sending) return
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: (res) => {
          const filePath = (res.tempFilePaths || [])[0]
          if (!filePath) return
          this.sendImageMessage(filePath)
        }
      })
    },
    openCamera() {
      this.showMoreActions = false
      if (!this.canChat || this.sending) return
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera'],
        success: (res) => {
          const filePath = (res.tempFilePaths || [])[0]
          if (!filePath) return
          this.sendImageMessage(filePath)
        }
      })
    },

    async sendImageMessage(filePath) {
      if (!this.canChat || this.sending) return
      this.sending = true

      const tempId = 'temp_' + Date.now()
      const msg = {
        id: 0,
        tempId,
        chat_id: 0,
        sender_id: this.myId,
        receiver_id: this.targetId,
        type: 'image',
        content: filePath,
        create_time: new Date().toLocaleString(),
        is_me: true,
        sending: true
      }

      this.msgList.push(msg)
      this.scrollBottom(true)

      try {
        const uploadRes = await uploadFile(filePath, { type: 'chat' })
        const imageUrl = uploadRes?.url || uploadRes?.path || ''
        if (!imageUrl) throw new Error('upload failed')

        const res = await request('message.php', {
          action: 'send_image',
          receiver_id: this.targetId,
          type: 'image',
          content: imageUrl
        }, 'POST')

        if (res.code === 0) {
          const index = this.msgList.findIndex(m => m.tempId === tempId)
          if (index !== -1) {
            this.$set(this.msgList, index, {
              ...this.msgList[index],
              id: res.data?.id || 0,
              content: this.fixUrl(imageUrl),
              sending: false
            })
          }
        } else {
          const index = this.msgList.findIndex(m => m.tempId === tempId)
          if (index !== -1) {
            this.$set(this.msgList, index, {
              ...this.msgList[index],
              sending: false
            })
          }
          uni.showToast({ title: res.msg || '发送失败', icon: 'none' })
        }
      } catch (e) {
        const index = this.msgList.findIndex(m => m.tempId === tempId)
        if (index !== -1) {
          this.$set(this.msgList, index, {
            ...this.msgList[index],
            sending: false
          })
        }
        uni.showToast({ title: '图片发送失败', icon: 'none' })
      } finally {
        this.sending = false
      }
    },

    onEmojiImgError(e) {
      if (e.target) {
        e.target.hidden = true
      }
    },

    onScroll(e) {
      const d = e?.detail || {}
      this.lastScrollTop = d.scrollTop || 0
      const scrollHeight = d.scrollHeight || 0
      const sys = uni.getSystemInfoSync()
      const viewH = Math.max(1, (sys.windowHeight || 0) - this.navTotalHeightPx - (this.inputBarHeight || 50))
      const maxTop = Math.max(0, scrollHeight - viewH)
      this.isAtBottom = (this.lastScrollTop >= maxTop - 120)
    },

    scrollBottom(anim = true) {
      this.scrollAnim = !!anim
      this.$nextTick(() => {
        setTimeout(() => {
          uni.createSelectorQuery().in(this).select('.msg-container').boundingClientRect((rect) => {
            const target = (rect && rect.height) ? Math.ceil(rect.height) : 99999999
            /* scroll-top 必须"值发生变化"才会生效。
               如果目标值和上一次完全相同（连续发消息就会这样），
               先回退 1px 再设回目标值，否则滚不过去、看着像卡住。 */
            if (this.scrollTop === target) {
              this.scrollTop = target - 1
              this.$nextTick(() => { this.scrollTop = target })
            } else {
              this.scrollTop = target
            }
          }).exec()
        }, 50)
      })
    },

    measureInputBar() {
      this.$nextTick(() => {
        uni.createSelectorQuery().in(this).select('.input-wrapper').boundingClientRect((rect) => {
          if (rect && rect.height) this.inputBarHeight = Math.ceil(rect.height)
        }).exec()
      })
    },

    fixUrl(u) {
      if (!u) return '/static/logo.png'
      if (u.startsWith('http')) return u
      // 本地 static 资源直接返回，不拼接域名
      if (u.startsWith('/static/')) return u
      if (this.fixUrlCache[u]) return this.fixUrlCache[u]
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      const result = base + (u.startsWith('/') ? u : '/' + u)
      this.fixUrlCache[u] = result
      return result
    },

    toUserProfile(uid) {
      uni.navigateTo({ url: `/pages/user/profile?userId=${uid}` })
    },
    toGroupInfo(groupId) {
      if (!groupId) return
      uni.navigateTo({ url: `/pages/message/group-info?groupId=${groupId}` })
    },

    /* WS 推来在线变化时立刻改状态, 不走网络 */
    _onPresence() {
      if (!this.targetId) return
      const v = presence.getCached(this.targetId)
      if (v !== null) this.targetOnline = v
    },
    /* 兜底: 每 10 秒查一次(WS 正常时缓存已是新值, 基本不会发请求) */
    async refreshTargetOnline() {
      if (!this.targetId) return
      /* 查询失败（网络抖动/超时）时保留上一次的状态：
         之前这里 catch 里写死 false，会把人明明在线显示成离线 */
      try {
        const map = await presence.fetchOnline([this.targetId])
        this.targetOnline = !!map[String(this.targetId)]
      } catch (e) {}
    },
    _onWsChat(data) {
      if (String(data.sender_id) !== String(this.targetId) && String(data.sender_id) !== String(this.myId)) return
      const nm = this.normalizeMsg({
        id: data.msg_id,
        sender_id: data.sender_id,
        receiver_id: data.sender_id === this.myId ? this.targetId : this.myId,
        type: data.type,
        content: data.content,
        /* 发送者佩戴的气泡样式: 不带过来的话，实时收到的消息会退回默认气泡，刷新后才变 */
        bubble_style: data.bubble_style,
        create_time: data.create_time
      })
      if (nm.id && this.msgIdSet[nm.id]) return
      this.msgList.push(nm)
      if (nm.id) this.msgIdSet[nm.id] = true
      try { uni.setStorageSync('chat_cache_' + this.targetId, JSON.stringify(this.msgList)) } catch(e) {}
      this.$nextTick(() => { if (this.isAtBottom) this.scrollBottom(true) })
      if (!nm.is_me) {
        uni.$emit('message_read_changed', { targetId: this.targetId })
      }
    },

    async refreshChatProfile() {
      try {
        const res = await request('message.php', { action: 'getChatProfile', targetId: this.targetId }, 'GET')
        if (res.code === 0) {
          this.blockedByMe = !!res.data.blocked_by_me
          this.blockedMe = !!res.data.blocked_me
          this.bgUrl = res.data.bg_url ? this.fixUrl(res.data.bg_url) : ''
          this.targetVip = parseInt(res.data.vip || 0)
          /* 兜底：从只有 targetId 的入口进来时（没带 name/avatar），
             这里把对方昵称/头像补上，否则聊天页顶部和消息头像会空白或显示错人。
             getChatProfile 在 api-map 里映射到 user/profile，返回的就是 userPublic() 资料包 */
          if (!this.targetName) {
            this.targetName = res.data.nickname || res.data.name || res.data.username || ''
          }
          if (!this.targetAvatar || this.targetAvatar === '/static/logo.png') {
            const av = res.data.avatar || ''
            if (av) {
              this.targetAvatar = this.fixUrl(av)
              this.targetAvatarReady = false
              this.preloadAvatar('target')
            }
          }
        }
      } catch (e) {}

      try {
        const r = await request('user.php', { action: 'checkCanMessage', targetId: this.targetId }, 'GET')
        // 兼容多种返回格式: {canMessage} / {can_message} / 缺失字段
        const d = r && r.code === 0 ? r.data : null
        if (d && typeof d === 'object') {
          const cm = d.canMessage !== undefined ? d.canMessage : d.can_message
          // 后端未明确返回限制时，默认允许发送，避免输入框被误禁用
          this.canChat = (cm === undefined || cm === null || cm === '') ? true : (parseInt(cm) === 1)
          this.chatDisabledReason = this.canChat ? '' : (d.reason || '对方关闭了私信')
          // 对方账号被禁用时，弹窗提示并返回
          if (!this.canChat && this.chatDisabledReason && this.chatDisabledReason.indexOf('已被禁用') !== -1) {
            uni.showModal({
              title: '提示',
              content: this.chatDisabledReason,
              showCancel: false,
              confirmText: '确认',
              success: () => {
                uni.navigateBack()
              }
            })
            return
          }
        } else {
          // 接口异常/返回非预期格式时，默认允许发送
          this.canChat = true
          this.chatDisabledReason = ''
        }
      } catch (e) {
        this.canChat = true
        this.chatDisabledReason = ''
      }

      if (this.blockedMe) {
        this.canChat = false
        this.chatDisabledReason = '对方已拉黑你，无法发送消息'
      }
      if (this.blockedByMe) {
        this.canChat = false
        this.chatDisabledReason = '你已拉黑对方，请先取消拉黑'
      }
    },

    /* 安全包装：单条消息解析出错（比如未知类型）不应该让整个消息列表挂掉，
       否则一进会话就什么都看不到 */
    safeNormalize(m) {
      try {
        return this.normalizeMsg(m)
      } catch (e) {
        return {
          id: (m && m.id) ? parseInt(m.id) : null,
          type: 'text',
          content: '[消息解析失败]',
          create_time: (m && m.create_time) || '',
          is_me: String((m && (m.sender_id || m.from_uid)) || '') === String(this.myId),
          sending: false,
          bubble_style: 'bubble-default'
        }
      }
    },
    normalizeMsg(m) {
      let type = m.type || 'text'
      const isMe = String(m.sender_id || m.from_uid) === String(this.myId)
      const id = m.id ? parseInt(m.id) : null

      if (type === 'recalled') {
        return { id, type: 'recalled', content: '', create_time: m.create_time, is_me: isMe, sending: false, bubble_style: m.bubble_style || 'bubble-default' }
      }

      // 识别群名片消息：text 类型且 content 以 [群名片] 开头
      let groupCard = null
      if (type === 'text' && typeof m.content === 'string' && m.content.indexOf('[群名片]') === 0) {
        try {
          groupCard = JSON.parse(m.content.substring(5))
          type = 'group_card'
        } catch (e) {
          groupCard = null
        }
      }

      let card = null
      if (type === 'card') {
        try { card = JSON.parse(m.content || '{}') } catch (e) {
          card = { uid: 0, username: '', name: '名片', avatar: '' }
        }
      }
      let transfer = null
      if (type === 'transfer') {
        try { transfer = JSON.parse(m.content || '{}') } catch (e) {
          transfer = { transfer_id: 0, amount: '0.00', remark: '', status: 0 }
        }
        transfer.amount = Number(transfer.amount || 0).toFixed(2)
        transfer.status = Number(transfer.status || 0)
      }
      let redPacket = null
      if (type === 'redpacket') {
        try { redPacket = JSON.parse(m.content || '{}') } catch (e) {
          redPacket = { red_packet_id: 0, amount: '0.00', greeting: '恭喜发财，大吉大利', status: 0 }
        }
        redPacket.amount = Number(redPacket.amount || 0).toFixed(2)
        redPacket.status = Number(redPacket.status || 0)
      }
      let invite = null
      if (type === 'group_invite') {
        try { invite = JSON.parse(m.content || '{}') } catch (e) { invite = null }

      }

      /* 关系申请卡片：content 是 JSON
         { relation_id, type_key, type_name, from_uid, from_name, from_avatar, status } */
      let relationApply = null
      if (type === 'relation_apply') {
        try { relationApply = JSON.parse(m.content || '{}') } catch (e) { relationApply = null }
        if (relationApply) relationApply.status = Number(relationApply.status || 0)
      }

      /* 语音消息：content 是 JSON { url, duration(秒), text } */
      let voiceUrl = ''
      let voiceDur = 0
      let voiceText = ''
      if (type === 'voice') {
        try {
          const v = JSON.parse(m.content || '{}')
          voiceUrl = v.url || ''
          voiceDur = Number(v.duration || 0) * 1000
          voiceText = v.text || ''
        } catch (e) { voiceUrl = '' }
      }

      return {
        id, type,
        content: m.content || '',
        voiceUrl,
        voiceDur,
        voiceText,
        card,
        groupCard,
        transfer,
        redPacket,
        invite,
        relationApply,
        create_time: m.create_time,
        is_me: isMe,
        sending: false,
        bubble_style: m.bubble_style || (isMe ? this.myBubbleStyle : 'bubble-default')
      }
    },

    /* 处理关系申请：同意 / 拒绝（只有接收方、且还没处理过才能点） */
    async handleRelationApply(msg, accept) {
      if (!msg || !msg.relationApply) return
      if (Number(msg.relationApply.status || 0) !== 0) return
      const rid = Number(msg.relationApply.relation_id || 0)
      if (!rid) return
      const yes = await this.showConfirm(
        accept ? '同意关系' : '拒绝关系',
        accept ? '同意后，你们的关系会显示在双方的主页上' : '确定要拒绝这条关系申请吗？'
      )
      if (!yes) return
      try {
        const res = await request('relation.php', { action: 'handle', id: rid, accept: accept ? 1 : 0 }, 'POST')
        if (res && res.code === 0) {
          /* 本地先把卡片状态改掉，不用等重新拉列表 */
          const idx = this.msgList.findIndex(m => Number(m.id) === Number(msg.id))
          if (idx >= 0 && this.msgList[idx].relationApply) {
            this.msgList[idx].relationApply.status = accept ? 1 : 2
          }
          uni.showToast({ title: accept ? '关系已建立' : '已拒绝', icon: 'none' })
        } else {
          uni.showToast({ title: (res && (res.message || res.msg)) || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
    },

    async acceptInvite(msg) {
      const gid = Number(msg.invite.group_id || 0)
      if (!gid) return uni.showToast({ title: '群聊不存在', icon: 'none' })
      const res = await request('group.php', { action: 'group_join', group_id: gid }, 'POST')
      if (res.code === 0) {
        uni.showToast({ title: '已加入群聊', icon: 'success' })
        this.loadMsg()
      } else {
        uni.showToast({ title: res.msg || '加入失败', icon: 'none' })
      }
    },
    async declineInvite(msg) {
      const gid = Number(msg.invite.group_id || 0)
      if (!gid) return uni.showToast({ title: '群聊不存在', icon: 'none' })
      const res = await request('group.php', { action: 'group_join_decline', group_id: gid }, 'POST')
      if (res.code === 0) {
        uni.showToast({ title: '已拒绝邀请', icon: 'none' })
        this.loadMsg()
      } else {
        uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
      }
    },

    async loadMsg(scrollToBottom = true) {
      this.pageLoading = true
      /* 重新拉取消息时重置历史分页状态，否则上一次遗留的"没有更多消息"会一直挂着 */
      this.noMoreOlder = false
      this.olderReady = false
      if (this._olderTimer) { clearTimeout(this._olderTimer); this._olderTimer = null }
      try {
        const res = await request('message.php', { action: 'getChatDetail', targetId: this.targetId }, 'GET')
        if (res.code === 0) {
          this.msgList = (res.data.list || []).map(this.safeNormalize)
          this.msgIdSet = {}
          for (const m of this.msgList) if (m.id) this.msgIdSet[m.id] = true
          try { uni.setStorageSync('chat_cache_' + this.targetId, JSON.stringify(this.msgList)) } catch(e) {}
          this.$nextTick(() => {
            this.measureInputBar()
            if (scrollToBottom) this.scrollBottom(false)
          })
          /* 等首屏滚动到底稳定后再放开"上拉加载历史"，避免自动触发的 scrolltoupper 误判 */
          this._olderTimer = setTimeout(() => { this.olderReady = true }, 600)
          uni.$emit('message_read_changed', { targetId: this.targetId })
        }
      } finally {
        this.pageLoading = false
      }
    },

    loadCachedMsg() {
      try {
        const raw = uni.getStorageSync('chat_cache_' + this.targetId)
        if (!raw) return
        const list = JSON.parse(raw)
        if (Array.isArray(list) && list.length > 0) {
          this.msgList = list
          this.msgIdSet = {}
          for (const m of this.msgList) if (m.id) this.msgIdSet[m.id] = true
          this.$nextTick(() => this.scrollBottom(false))
        }
      } catch(e) {}
    },

    async pollMsg(force = false) {
      let maxId = 0
      for (let i = this.msgList.length - 1; i >= 0; i--) {
        if (this.msgList[i].id) { maxId = Number(this.msgList[i].id); break }
      }
      const res = await request('message.php', { action: 'getChatDetail', targetId: this.targetId, after_id: maxId }, 'GET')
      const list = res.data?.list || []
      if (!list.length) return

      const newMsgs = list.map(this.safeNormalize)
      const unique = newMsgs.filter(nm => !this.msgList.some(lm => Number(lm.id) === Number(nm.id)))
      if (unique.length) {
        this.msgList = [...this.msgList, ...unique]
        unique.forEach(nm => { if (nm.id) this.msgIdSet[nm.id] = true })
        if (unique.some(m => !m.is_me)) uni.$emit('message_read_changed', { targetId: this.targetId })
        this.$nextTick(() => { if (force || this.isAtBottom) this.scrollBottom(true) })
      }
    },

    async loadOlder() {
      /* 进页面时 scrolltoupper 会被自动触发，此时还没准备好，直接忽略 */
      if (!this.olderReady) return
      if (this.loadingOlder || this.noMoreOlder) return
      if (!this.msgList.length) return

      this.loadingOlder = true
      const beforeH = await this.getContainerHeight()

      try {
        const firstId = Number(this.msgList[0].id || 0)
        if (!firstId) { this.noMoreOlder = true; return }

        const res = await request('message.php', { action: 'getChatDetail', targetId: this.targetId, before_id: firstId }, 'GET')
        const list = res.data?.list || []
        if (!list.length) { this.noMoreOlder = true; return }

        const older = list.map(this.safeNormalize).filter(nm => !nm.id || !this.msgIdSet[Number(nm.id)])
        older.forEach(nm => { if (nm.id) this.msgIdSet[nm.id] = true })
        this.msgList = [...older, ...this.msgList]

        this.$nextTick(async () => {
          const afterH = await this.getContainerHeight()
          const diff = Math.max(0, afterH - beforeH)
          this.scrollAnim = false
          this.scrollTop = (this.lastScrollTop || 0) + diff
        })
      } finally {
        this.loadingOlder = false
      }
    },

    getContainerHeight() {
      return new Promise((resolve) => {
        uni.createSelectorQuery().in(this).select('#msgContainer').boundingClientRect((rect) => {
          resolve(rect && rect.height ? rect.height : 0)
        }).exec()
      })
    },

    async sendText() {
      // #ifdef H5
      this.inputTxt = this.extractRichText()
      // #endif
      const txt = this.inputTxt.trim()
      if (!txt || this.sending) return

      if (!this.canChat) return this.showToast(this.chatDisabledReason || '当前无法发送消息')
      if (this.blockedMe) return this.showToast('对方已拉黑你，无法发送')
      if (this.blockedByMe) return this.showToast('你已拉黑对方，请先取消拉黑')

      this.sending = true
      this.sendingMask = true

      const tempId = 't' + Date.now()
      const now = new Date()

      this.msgList.push({
        id: null, tempId,
        type: 'text',
        content: txt,
        is_me: true,
        create_time: now.toISOString(),
        sending: true,
        bubble_style: this.myBubbleStyle
      })
      this.$nextTick(() => this.scrollBottom(true))

      try {
        const res = await request('message.php', { action: 'sendMsg', receiver_id: this.targetId, content: txt }, 'POST')
        if (res.code === 0) {
          const idx = this.msgList.findIndex(m => m.tempId === tempId)
          if (idx !== -1) {
            this.msgList.splice(idx, 1, {
              id: parseInt(res.data?.id || 0) || null,
              type: 'text',
              content: txt,
              is_me: true,
              create_time: res.data?.create_time || now.toISOString(),
              sending: false,
              bubble_style: res.data?.bubble_style || this.myBubbleStyle
            })
            /* 用带动画的方式滚到底：这里如果瞬间跳（false），
               会打断上一条的平滑滚动，看上去就是"消息列表抖了一下" */
            this.$nextTick(() => this.scrollBottom(true))
          }
          this.inputTxt = ''
          this.clearRichInput()
          return
        }

        this.msgList = this.msgList.filter(m => m.tempId !== tempId)
        
        if (res.code === -101) {
          this.showWarning('内容违规警告', res.msg)
          uni.vibrateShort()
          return
        }
        if (res.code === -102 || res.code === -403) {
          this.showBanHud(res.msg, res.data?.count || 0, res.data?.expire_time || 0)
          uni.vibrateLong()
          return
        }
        this.showToast(res.msg || '发送失败')
      } catch (e) {
        this.msgList = this.msgList.filter(m => m.tempId !== tempId)
        this.showToast('网络错误，请重试')
      } finally {
        this.sending = false
        this.sendingMask = false
      }
    },

    showTime(i) {
      if (i === 0) return true
      const t1 = new Date(this.msgList[i - 1].create_time).getTime()
      const t2 = new Date(this.msgList[i].create_time).getTime()
      return t2 - t1 > 5 * 60 * 1000
    },

    fmtTime(t) {
      if (!t) return ''
      const d = new Date(String(t).replace(/-/g, '/'))
      if (isNaN(d.getTime())) return ''
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    },

    showWarning(title, msg) { this.warnTitle = title; this.warnMsg = msg; this.showWarn = true },
    closeWarn() { this.showWarn = false },

    showBanHud(msg, cnt, expire) {
      this.banMsg = msg
      this.banCnt = cnt
      this.banExpire = expire
      this.showBan = true
      this.startBanTimer()
    },
    closeBan() { this.showBan = false; this.stopBanTimer() },
    startBanTimer() { this.updateBanTime(); this.banTimer = setInterval(() => this.updateBanTime(), 5000) },
    stopBanTimer() { if (this.banTimer) { clearInterval(this.banTimer); this.banTimer = null } },
    updateBanTime() {
      const now = Math.floor(Date.now() / 1000)
      const remain = this.banExpire - now
      if (remain <= 0) { this.banTime = '已解除'; this.stopBanTimer(); return }
      const h = Math.floor(remain / 3600)
      const m = Math.floor((remain % 3600) / 60)
      const s = remain % 60
      if (h > 0) this.banTime = `${h}小时${m}分钟`
      else if (m > 0) this.banTime = `${m}分${s}秒`
      else this.banTime = `${s}秒`
    },

    openMore() { this.more.show = true },
    closeMore() { this.more.show = false },
    goTargetProfile() { this.closeMore(); this.toUserProfile(this.targetId) },

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
      if (!this.canChat) return this.showToast(this.chatDisabledReason || '当前无法发红包')
      this.redPacket = {
        show: true,
        amount: '',
        greeting: '恭喜发财，大吉大利',
        payPassword: '',
        sending: false
      }
    },
    closeRedPacket() {
      if (this.redPacket.sending) return
      this.redPacket.show = false
    },
    async submitRedPacket() {
      if (this.redPacket.sending) return
      const amount = Number(this.redPacket.amount || 0)
      if (!amount || amount <= 0) return this.showToast('请输入正确金额')
      if (!this.redPacket.payPassword) return this.showToast('请输入支付密码')

      this.redPacket.sending = true
      try {
        const res = await request('message.php', {
          action: 'sendRedPacket',
          to_user_id: this.targetId,
          amount,
          greeting: this.redPacket.greeting || '',
          pay_password: this.redPacket.payPassword
        }, 'POST')
        if (res.code !== 0) {
          return this.showToast(res.msg || '红包发送失败')
        }

        const rp = res.data?.red_packet || {
          red_packet_id: 0,
          amount: amount.toFixed(2),
          greeting: this.redPacket.greeting || '恭喜发财，大吉大利',
          status: 0,
          sender_id: this.myId,
          receiver_id: this.targetId
        }
        rp.amount = Number(rp.amount || amount).toFixed(2)
        rp.status = Number(rp.status || 0)
        this.msgList.push({
          id: parseInt(res.data?.id || 0) || null,
          type: 'redpacket',
          content: JSON.stringify(rp),
          redPacket: rp,
          is_me: true,
          create_time: res.data?.create_time || new Date().toISOString(),
          sending: false,
          bubble_style: this.myBubbleStyle
        })
        this.redPacket.show = false
        this.$nextTick(() => this.scrollBottom(true))
      } catch (e) {
        this.showToast('网络错误，请重试')
      } finally {
        this.redPacket.sending = false
      }
    },
    onRedPacketClick(msg) {
      if (!msg || !msg.redPacket) return
      const status = Number(msg.redPacket.status || 0)
      if (status === 1) {
        uni.showToast({ title: '红包已领取', icon: 'none' })
        return
      }
      if (status === 2) {
        uni.showToast({ title: '红包已过期', icon: 'none' })
        return
      }
      if (msg.is_me) {
        uni.showToast({ title: '自己不能领取自己的红包', icon: 'none' })
        return
      }
      // 打开红包拆开弹窗
      this.rpClaim = {
        show: true,
        claimed: false,
        success: false,
        rotating: false,
        claiming: false,
        msgId: msg.id,
        redPacketId: Number(msg.redPacket.red_packet_id || 0),
        amount: Number(msg.redPacket.amount || 0).toFixed(2),
        greeting: msg.redPacket.greeting || '恭喜发财，大吉大利',
        resultText: '',
        senderName: this.targetName || '对方',
        senderAvatar: this.targetAvatar || '/static/logo.png'
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
      if (!this.rpClaim.redPacketId) {
        uni.showToast({ title: '红包信息错误', icon: 'none' })
        return
      }
      // 旋转动画
      this.rpClaim.rotating = true
      await new Promise(r => setTimeout(r, 1500))
      this.rpClaim.rotating = false
      this.rpClaim.claiming = true

      try {
        const res = await request('message.php', {
          action: 'receiveRedPacket',
          red_packet_id: this.rpClaim.redPacketId
        }, 'POST')
        if (res.code === 0) {
          const rp = res.data?.red_packet || {}
          this.rpClaim.success = true
          this.rpClaim.amount = Number(rp.amount || this.rpClaim.amount || 0).toFixed(2)
          this.rpClaim.claimed = true
          // 更新消息列表
          const idx = this.msgList.findIndex(m => m.id === this.rpClaim.msgId)
          if (idx !== -1) {
            const newRp = { ...this.msgList[idx].redPacket, status: 1, amount: this.rpClaim.amount }
            this.msgList.splice(idx, 1, {
              ...this.msgList[idx],
              redPacket: newRp,
              content: JSON.stringify(newRp)
            })
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
      this.closeMore()
      if (!this.canChat) return this.showToast(this.chatDisabledReason || '当前无法转账')
      this.transfer = { show: true, amount: '', remark: '', payPassword: '', sending: false }
    },
    closeTransfer() {
      if (this.transfer.sending) return
      this.transfer.show = false
    },
    async submitTransfer() {
      if (this.transfer.sending) return
      const amount = Number(this.transfer.amount || 0)
      if (!amount || amount <= 0) return this.showToast('请输入正确金额')
      if (!this.transfer.payPassword) return this.showToast('请输入支付密码')

      this.transfer.sending = true
      try {
        const res = await request('message.php', {
          action: 'sendTransfer',
          to_user_id: this.targetId,
          amount,
          remark: this.transfer.remark || '',
          pay_password: this.transfer.payPassword
        }, 'POST')
        if (res.code !== 0) {
          return this.showToast(res.msg || '转账失败')
        }

        const tr = res.data?.transfer || {
          transfer_id: 0,
          amount: amount.toFixed(2),
          remark: this.transfer.remark || '',
          status: 0,
          sender_id: this.myId,
          receiver_id: this.targetId
        }
        tr.amount = Number(tr.amount || amount).toFixed(2)
        tr.status = Number(tr.status || 0)
        this.msgList.push({
          id: parseInt(res.data?.id || 0) || null,
          type: 'transfer',
          content: JSON.stringify(tr),
          transfer: tr,
          is_me: true,
          create_time: res.data?.create_time || new Date().toISOString(),
          sending: false,
          bubble_style: res.data?.bubble_style || this.myBubbleStyle
        })
        this.transfer.show = false
        this.$nextTick(() => this.scrollBottom(true))
      } catch (e) {
        this.showToast('网络错误，请重试')
      } finally {
        this.transfer.sending = false
      }
    },
    async receiveTransfer(msg) {
      if (!msg || !msg.transfer || Number(msg.transfer.status || 0) !== 0) return
      const ok = await this.showConfirm('确认收款', `确认收取 ¥${msg.transfer.amount} 吗？`)
      if (!ok) return
      const res = await request('message.php', { action: 'receiveTransfer', transfer_id: msg.transfer.transfer_id }, 'POST')
      if (res.code === 0) {
        const tr = res.data?.transfer || msg.transfer
        tr.amount = Number(tr.amount || msg.transfer.amount || 0).toFixed(2)
        tr.status = 1
        const idx = this.msgList.findIndex(m => m.id === msg.id)
        if (idx !== -1) {
          this.msgList.splice(idx, 1, {
            ...this.msgList[idx],
            transfer: tr,
            content: JSON.stringify(tr)
          })
        }
        this.showToast('收款成功，已存入余额')
      } else {
        this.showToast(res.msg || '收款失败')
      }
    },

    async openCardPicker() {
      this.showMoreActions = false
      this.closeMore()
      const myUid = (uni.getStorageSync('userInfo') || {}).uid || ''
      const res = await request('message.php', { action: 'getFriendsForCard', uid: myUid }, 'GET')
      if (res.code === 0) {
        this.card.friends = res.data.list || []
        if (!this.card.friends.length) return this.showToast('暂无互关好友')
        this.card.show = true
      } else this.showToast(res.msg || '获取好友失败')
    },
    closeCardPicker() { this.card.show = false },

    async sendCard(u) {
      this.card.show = false
      if (!u || !u.id) return
      if (!this.canChat) return this.showToast(this.chatDisabledReason || '当前无法发送消息')

      const tempId = 'c' + Date.now()
      const cardObj = { uid: u.id, username: u.username, name: u.name, avatar: u.avatar }

      this.msgList.push({
        id: null, tempId,
        type: 'card',
        content: JSON.stringify(cardObj),
        card: cardObj,
        is_me: true,
        create_time: new Date().toISOString(),
        sending: true,
        bubble_style: this.myBubbleStyle
      })
      this.scrollBottom(true)

      try {
        const res = await request('message.php', { action: 'sendCard', to_user_id: this.targetId, card_user_id: u.id }, 'POST')
        if (res.code === 0) {
          const idx = this.msgList.findIndex(m => m.tempId === tempId)
          if (idx !== -1) {
            this.msgList.splice(idx, 1, {
              id: parseInt(res.data?.id || 0) || null,
              type: 'card',
              content: JSON.stringify(cardObj),
              card: cardObj,
              is_me: true,
              create_time: res.data?.create_time || new Date().toISOString(),
              sending: false,
              bubble_style: res.data?.bubble_style || this.myBubbleStyle
            })
          }
          this.scrollBottom(true)
        } else {
          this.msgList = this.msgList.filter(m => m.tempId !== tempId)
          this.showToast(res.msg || '发送失败')
        }
      } catch (e) {
        this.msgList = this.msgList.filter(m => m.tempId !== tempId)
        this.showToast('网络错误')
      }
    },

    async pickChatBg() {
      this.closeMore()

      try {
        const pick = await new Promise((resolve, reject) => {
          uni.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: resolve,
            fail: reject
          })
        })

        const path = pick.tempFilePaths[0]
        if (!path) return this.showToast('未选择图片')

        this.showToast('正在上传...', 1200)

        let bgUrl = ''
        try {
          bgUrl = await uploadBackgroundImage(path)
        } catch (e) {
          const up = await uploadFile(path, { type: 'background' })
          bgUrl = up?.url || up?.data?.url || up?.path || up?.data?.path || ''
        }

        if (!bgUrl) {
          return this.showToast('上传失败')
        }

        const res = await request('message.php', {
          action: 'setChatBackground',
          targetId: this.targetId,
          bg_url: bgUrl
        }, 'POST')

        if (res.code === 0) {
          this.bgUrl = this.fixUrl(bgUrl)
          this.showToast('背景已设置')
        } else {
          this.showToast(res.msg || '设置失败')
        }
      } catch (e) {
        this.showToast(e?.msg || '操作取消或失败')
      }
    },

    async clearChatBgConfirm() {
      this.closeMore()
      const ok = await this.showConfirm('清除背景', '确定清除聊天背景吗？')
      if (!ok) return
      const res = await request('message.php', { action: 'setChatBackground', targetId: this.targetId, bg_url: '' }, 'POST')
      if (res.code === 0) { this.bgUrl = ''; this.showToast('已清除') }
      else this.showToast(res.msg || '清除失败')
    },

    async toggleBlock() {
      this.closeMore()
      const ok = await this.showConfirm(this.blockedByMe ? '取消拉黑' : '拉黑对方', '确定执行该操作吗？')
      if (!ok) return
      const willBlock = !this.blockedByMe
      const res = await request('message.php', { action: 'setBlock', targetId: this.targetId, block: willBlock ? 1 : 0 }, 'POST')
      if (res.code === 0) {
        this.blockedByMe = willBlock
        this.showToast(res.msg || '操作成功')
        await this.refreshChatProfile()
      } else {
        this.showToast(res.msg || '操作失败')
      }
    },

    openSearch() { this.closeMore(); this.search.show = true; this.search.keyword=''; this.search.list=[]; this.search.done=false },
    closeSearch() { this.search.show = false },

    async doSearch() {
      const kw = (this.search.keyword || '').trim()
      if (!kw) return this.showToast('请输入关键词')
      const res = await request('message.php', {
        action: 'searchChatMessages',
        targetId: this.targetId,
        keyword: kw,
        page: 1,
        pageSize: 30
      }, 'GET')
      if (res.code === 0) {
        this.search.list = res.data.list || []
        this.search.done = true
      } else {
        this.showToast(res.msg || '搜索失败')
      }
    },

    async clearChatConfirm() {
      this.closeMore()
      const ok = await this.showConfirm('清空聊天记录', '确定清空聊天记录吗？')
      if (!ok) return
      const res = await request('message.php', { action: 'clearChatHistory', targetId: this.targetId }, 'POST')
      if (res.code === 0) {
        this.msgList = []
        this.showToast('已清空')
      } else {
        this.showToast(res.msg || '操作失败')
      }
    },

    async deleteChatConfirm() {
      this.closeMore()
      const ok = await this.showConfirm('删除会话', '确定删除会话吗？')
      if (!ok) return
      const res = await request('message.php', { action: 'deleteChat', targetId: this.targetId }, 'POST')
      if (res.code === 0) {
        this.showToast('已删除')
        setTimeout(() => this.goBack(), 350)
      } else {
        this.showToast(res.msg || '删除失败')
      }
    },

    /* ---------------- 语音消息 ---------------- */
    toggleVoiceMode() {
      if (!this.canChat) return this.showToast(this.chatDisabledReason || '当前无法发送消息')
      this.voiceMode = !this.voiceMode
      if (this.voiceMode && this.showEmojiPicker) this.showEmojiPicker = false
    },
    onVoiceStart(e) {
      if (!this.canChat) return this.showToast(this.chatDisabledReason || '当前无法发送消息')
      if (this.blockedMe) return this.showToast('对方已拉黑你，无法发送')
      if (this.sending) return
      this.recordCancel = false
      this.recordSec = 0
      this.recordStartAt = Date.now()
      const t = (e && e.touches && e.touches[0]) || {}
      this.recordStartY = Number(t.clientY || 0)
      const started = startRecord({
        maxDuration: 60000,
        onStop: (res) => this.onRecordDone(res),
        onError: () => {
          this.stopRecTimer()
          this.recording = false
          this.showToast('录音失败，请检查麦克风权限')
        }
      })
      if (!started) return
      this.recording = true
      this.recTimer = setInterval(() => {
        this.recordSec++
        if (this.recordSec >= 60) this.onVoiceEnd()
      }, 1000)
    },
    onVoiceMove(e) {
      if (!this.recording) return
      const t = (e && e.touches && e.touches[0]) || {}
      /* 手指上滑超过 60px 视为取消 */
      this.recordCancel = (this.recordStartY - Number(t.clientY || 0)) > 60
    },
    onVoiceEnd() {
      if (!this.recording) return
      this.stopRecTimer()
      this.recording = false
      stopRecord()          // 会触发 onStop → onRecordDone
    },
    onVoiceCancel() {
      if (!this.recording) return
      this.recordCancel = true
      this.onVoiceEnd()
    },
    stopRecTimer() {
      if (this.recTimer) { clearInterval(this.recTimer); this.recTimer = null }
    },
    async onRecordDone(res) {
      const cancel = this.recordCancel
      this.recordCancel = false
      const path = (res && res.tempFilePath) || ''
      const isH5 = !!(res && res.h5)
      /* 录音秒数取三个来源的最大值：
         1) 页面计时器 recordSec
         2) 录音器回调里的 duration —— 部分安卓机这里返回 0
         3) 按下到松开的时间戳差 —— 最后的兜底
         H5 端 MediaRecorder 也根本不提供时长，必须靠 1) 和 3) */
      const tickSec = Number(this.recordSec || 0)
      const durSec = Math.round(Number((res && res.duration) || 0) / 1000)
      const wallSec = this.recordStartAt ? Math.round((Date.now() - this.recordStartAt) / 1000) : 0
      const sec = Math.max(tickSec, durSec, wallSec)
      if (cancel) {
        if (isH5 && path) { try { URL.revokeObjectURL(path) } catch (e) {} }
        return
      }
      if (!path) return this.showToast('录音失败')
      if (sec < 1) return this.showToast('说话时间太短（' + sec + '″）')
      await this.sendVoice(path, sec, res && res.mime)
    },
    async sendVoice(filePath, seconds, mime) {
      if (this.sending) return
      this.sending = true
      const tempId = 't' + Date.now()
      const now = new Date()
      /* 先本地占位（直接播本地文件），再上传 */
      this.msgList.push({
        id: null, tempId, type: 'voice', content: '',
        voiceUrl: filePath, voiceDur: seconds * 1000, voiceText: '',
        is_me: true, create_time: now.toISOString(), sending: true,
        bubble_style: this.myBubbleStyle
      })
      this.$nextTick(() => this.scrollBottom(true))
      try {
        const url = await uploadVoice(filePath, mime)
        if (!url) throw { msg: '语音上传失败' }
        const payload = JSON.stringify({ url: url, duration: seconds })
        const res = await request('message.php', {
          action: 'sendMsg', receiver_id: this.targetId, content: payload, type: 'voice'
        }, 'POST')
        if (res.code === 0) {
          const idx = this.msgList.findIndex(m => m.tempId === tempId)
          if (idx !== -1) {
            this.msgList.splice(idx, 1, Object.assign({}, this.msgList[idx], {
              id: parseInt((res.data && res.data.id) || 0) || null,
              content: payload,
              /* 关键：换成服务器地址。否则自己点播的还是本地临时文件路径，
                 被 fixUrl 拼上域名后必然加载失败（表现就是"自己听没声音、别人听有声音"） */
              voiceUrl: url,
              voiceDur: seconds * 1000,
              sending: false
            }))
            this.$nextTick(() => this.scrollBottom(true))
          }
          return
        }
        this.msgList = this.msgList.filter(m => m.tempId !== tempId)
        this.showToast(res.msg || '发送失败')
      } catch (e) {
        this.msgList = this.msgList.filter(m => m.tempId !== tempId)
        this.showToast((e && e.msg) || '语音发送失败')
      } finally {
        this.sending = false
      }
    },
    voiceSec(msg) { return voiceSeconds(msg.voiceDur) },

    /* 气泡皮肤：内联样式（App 端插 <style> 不一定生效，所以外观走内联） */
    skinStyle(cls) {
      const s = this.bubbleSkins[cls]
      return s && s.style ? s.style : ''
    },
    /* 气泡的 ::before / ::after（比如左上角小星星），用额外的小元素还原 */
    skinDeco(cls, which) {
      const s = this.bubbleSkins[cls]
      if (!s || !s[which]) return null
      return s[which]
    },
    voiceWidth(msg) { return voiceBubbleWidth(msg.voiceDur) },
    playVoiceMsg(msg) {
      const id = msg.id || msg.tempId
      if (this.playingVoiceId === id) { stopVoice(); this.playingVoiceId = null; return }
      const raw = msg.voiceUrl || msg.content
      /* 刚发出还没上传完的语音是本地临时路径（App 的 _doc/... 或 H5 的 blob:...），
         这种不能过 fixUrl，否则会被拼上域名导致加载失败 */
      const isLocal = /^(blob:|file:|content:|wxfile:|_doc|_download|_www)/.test(raw) ||
        raw.indexOf('/storage/') === 0 || raw.indexOf('/data/') === 0
      const url = (/^https?:/.test(raw) || isLocal) ? raw : this.fixUrl(raw)
      this.playingVoiceId = id
      const okPlay = playVoice(url, id, () => {
        if (this.playingVoiceId === id) this.playingVoiceId = null
      })
      if (!okPlay) { this.playingVoiceId = null; this.showToast('播放失败') }
    },
    /* 长按菜单里的"转文字"：显示这条语音附带文字 */
    voiceToText() {
      const msg = this.msgMenu.msg
      this.closeMsgMenu()
      if (!msg) return
      if (msg.voiceText) {
        uni.showModal({ title: '语音转文字', content: msg.voiceText, showCancel: false, confirmText: '知道了' })
        return
      }
      this.showToast('这条语音没有文字内容')
    },

    openMsgMenu(msg) {
      if (!msg || !msg.id) return
      this.msgMenu.msg = msg
      this.msgMenu.canCopy = (msg.type === 'text' && !!msg.content)
      this.msgMenu.canVoiceText = (msg.type === 'voice')
      this.msgMenu.canRecall = msg.is_me && msg.type !== 'transfer'
      this.msgMenu.show = true
    },
    closeMsgMenu() { this.msgMenu.show = false; this.msgMenu.msg = null },

    copyMsg() {
      const msg = this.msgMenu.msg
      this.closeMsgMenu()
      if (!msg || !msg.content) return
      uni.setClipboardData({ data: msg.content })
      this.showToast('已复制')
    },

    async recallMsgConfirm() {
      const msg = this.msgMenu.msg
      this.closeMsgMenu()
      const ok = await this.showConfirm('撤回消息', '确定撤回吗？（2分钟内可撤回）')
      if (!ok) return

      const res = await request('message.php', { action: 'recallMsg', msgId: msg.id }, 'POST')
      if (res.code === 0) {
        const msgIndex = this.msgList.findIndex(m => m.id === msg.id)
        if (msgIndex !== -1) {
          this.msgList.splice(msgIndex, 1, {
            id: msg.id,
            type: 'recalled',
            content: '',
            create_time: msg.create_time,
            is_me: true,
            sending: false,
            bubble_style: msg.bubble_style || 'bubble-default'
          })
          this.showToast('已撤回')
        }
        this.pollMsg(true)
      } else {
        this.showToast(res.msg || '撤回失败')
      }
    },

    showConfirm(title, content) {
      return new Promise((resolve) => {
        this.confirm = { show: true, title, content, resolve }
      })
    },
    confirmOk() {
      const r = this.confirm.resolve
      this.confirm.show = false
      r && r(true)
    },
    confirmCancel() {
      const r = this.confirm.resolve
      this.confirm.show = false
      r && r(false)
    },

    previewImage(url) {
      if (!url) return
      uni.previewImage({
        current: this.fixUrl(url),
        urls: [this.fixUrl(url)]
      })
    }
  }
}
</script>

<style scoped>
.chat-page{
  width:100%;
  height:100vh;
  background:linear-gradient(180deg, #f5f6f8 0%, #f0f1f5 100%);
  overflow:hidden;
}

.top-nav{
  position:fixed;
  top:0; left:0; right:0;
  background:rgba(255,255,255,.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index:999;
  border-bottom:1rpx solid rgba(0,0,0,.05);
  box-shadow:0 2rpx 20rpx rgba(0,0,0,.06);
  transition: all 0.3s ease;
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
.back-icon-img{
  width:44rpx;
  height:44rpx;
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
.nav-avatar{
  width:64rpx;
  height:64rpx;
  border-radius:50%;
  margin-right:16rpx;
  background:#f3f4f6;
  flex-shrink:0;
}
.nav-title{
  font-size:34rpx;
  font-weight:800;
  color:#15171a;
  max-width:400rpx;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.online-state{
  display:flex;
  align-items:center;
  margin-left:10rpx;
  flex-shrink:0;
}
.online-dot{
  width:14rpx;
  height:14rpx;
  border-radius:50%;
  background:#c9ced6;
  margin-right:6rpx;
}
.online-dot.is-on{
  background:#22c55e;
}
.online-text{
  font-size:22rpx;
  color:#9aa1ab;
}
.online-text.is-on{
  color:#22c55e;
}

.ava-wrap{
  position:relative;
  overflow:hidden;
}
.ava-wrap .img{
  width:100%;
  height:100%;
  border-radius:inherit;
  display:block;
  transition: opacity .18s ease-out;
}
.ava-wrap .skel{
  position:absolute;
  inset:0;
  border-radius:inherit;
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
  padding:24rpx;
  box-sizing:border-box;
  min-height:100%;
}
.loading-box{
  padding:120rpx 0;
  text-align:center;
  color:#9ca3af;
  font-size:26rpx;
}
.loading-tip{
  text-align:center;
  padding:14rpx 0;
  color:#999;
  font-size:24rpx;
}

.welcome-placeholder{
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:120rpx 0 60rpx;
}
.welcome-ava{
  width:120rpx;
  height:120rpx;
  border-radius:50%;
  margin-bottom:20rpx;
}
.welcome-name{
  font-size:30rpx;
  color:#333;
  font-weight:600;
  margin-bottom:8rpx;
}
.welcome-hint{
  font-size:26rpx;
  color:#999;
}

.msg-item{
  margin-bottom:20rpx;
  animation: msgIn .18s ease-out;
}
@keyframes msgIn{
  from{ opacity:.2; transform:translateY(10rpx); }
  to{ opacity:1; transform:translateY(0); }
}
.msg-time{
  text-align:center;
  font-size:22rpx;
  color:#9ca3af;
  margin-bottom:16rpx;
  padding:8rpx 20rpx;
  background:rgba(0,0,0,0.03);
  border-radius:999rpx;
  display:inline-block;
  margin-left:50%;
  transform:translateX(-50%);
}

.recalled{ display:flex; justify-content:center; margin:12rpx 0; }
.recalled-txt{
  font-size:24rpx;
  color:#9ca3af;
  background:rgba(0,0,0,0.06);
  padding:8rpx 18rpx;
  border-radius:999rpx;
}

.msg-row{ display:flex; align-items:flex-start; }
.msg-row.is-me{ flex-direction:row-reverse; }

.msg-avatar{
  width:80rpx;
  height:80rpx;
  border-radius:50%;
  background:#f3f4f6;
  flex-shrink:0;
}

.msg-bubble{
  max-width:75%;
  margin:0 16rpx;
  position:relative;
}
.bubble-content{
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
.bubble-content.no-card{
  padding:0;
  background:transparent;
  border-radius:18rpx;
  box-shadow:none;
}
/* 自定义气泡的 ::before / ::after 装饰（内容 + 定位都在内联样式里） */
.bubble-deco{
  position:absolute;
  line-height:1;
}
.msg-image{
  width:360rpx;
  height:480rpx;
  border-radius:24rpx;
  display:block;
  background:#f5f5f5;
}
.msg-row.is-me .bubble-content.bubble-default{
  background:linear-gradient(135deg,#ff4d6d 0%,#ff2442 100%);
  color:#fff;
  border-bottom-right-radius:8rpx;
  box-shadow:0 6rpx 20rpx rgba(255,77,109,.28);
}
.msg-row:not(.is-me) .bubble-content.bubble-default{
  background:#fff;
  color:#15171a;
  border-bottom-left-radius:8rpx;
}
.bubble-txt{
  font-size:30rpx;
  line-height:1.6;
  color:inherit;
  white-space:pre-wrap;
  word-break:break-word;
}

.msg-status{
  position:absolute;
  right:-52rpx;
  bottom:12rpx;
}
.msg-row.is-me .msg-status{
  left:-52rpx;
  right:auto;
}
.status-loading{
  width:32rpx;
  height:32rpx;
  border:3rpx solid rgba(0,0,0,0.12);
  border-top-color:#ff4d6d;
  border-radius:50%;
  animation: rotate .8s linear infinite;
}
@keyframes rotate{ to{ transform:rotate(360deg); } }

.card-tip{ display:block; font-size:22rpx; color:#666; margin-bottom:10rpx; }
.card-box{ background:rgba(0,0,0,0.05); border-radius:14rpx; padding:14rpx; display:flex; align-items:center; gap:14rpx; }
.card-ava{ width:70rpx; height:70rpx; border-radius:14rpx; background:#eee; }
.card-meta{ flex:1; min-width:0; }
.card-name{ font-size:30rpx; font-weight:800; color:#111; }
.card-sub{ display:block; margin-top:6rpx; font-size:24rpx; color:#7b7b7b; }
.group-card-box{ background:linear-gradient(135deg,#fff5f6 0%,#fff 100%); border:1rpx solid #ffe0e4; padding:18rpx; }
.group-card-box .card-name{ color:#ff2442; }
.group-card-box .card-sub{ color:#9ca3af; }
.group-card-arrow{ font-size:36rpx; color:#d1d5db; font-weight:300; line-height:1; }
.invite-card{ background:linear-gradient(135deg,#f0f9ff 0%,#fff 100%); border:1rpx solid #dbeafe; padding:18rpx; margin-bottom:12rpx; }
/* 关系申请卡片：粉色系，和群邀请的蓝色区分开 */
.rel-card{ background:linear-gradient(135deg,#fff1f5 0%,#fff 100%); border:1rpx solid #ffd6e2; }
.rel-card .card-name{ color:#ff4d79; }
/* 未适配消息类型的兜底提示 */
.msg-unknown{ font-size:24rpx; color:#9ca3af; padding:8rpx 4rpx; }
.invite-card .card-name{ color:#1e90ff; font-size:28rpx; font-weight:600; }
.invite-card .card-sub{ color:#9ca3af; }
.invite-card .card-code{ color:#1e90ff; font-size:24rpx; margin-top:4rpx; }
.invite-actions{ display:flex; gap:16rpx; margin-top:4rpx; }
.invite-status{ margin-top:8rpx; text-align:center; font-size:26rpx; padding:12rpx 0; border-radius:10rpx; background:#ecfdf5; color:#10b981; }
.invite-status.declined{ background:#f3f4f6; color:#9ca3af; }
.invite-status.pending{ background:#eff6ff; color:#3b82f6; }
.invite-done{ margin-top:8rpx; text-align:center; font-size:26rpx; padding:14rpx 0; border-radius:10rpx; background:linear-gradient(135deg,#4facfe 0%,#00c6fb 100%); color:#fff; }
.invite-done.declined{ background:#f3f4f6; color:#9ca3af; }
.invite-done.pending{ background:#eff6ff; color:#3b82f6; }
.invite-btn{ flex:1; text-align:center; font-size:26rpx; padding:14rpx 0; border-radius:10rpx; }
.invite-btn.accept{ background:linear-gradient(135deg,#4facfe 0%,#00c6fb 100%); color:#fff; }
.invite-btn.decline{ background:#f3f4f6; color:#6b7280; border:1rpx solid #e5e7eb; }

.transfer-card{
  width:430rpx;
  padding:22rpx;
  border-radius:18rpx;
  background:linear-gradient(135deg,#ffb23f 0%,#ff7a1a 100%);
  color:#fff;
  box-sizing:border-box;
}
.transfer-card.received{
  background:linear-gradient(135deg,#a7adb7 0%,#747b86 100%);
}
.transfer-head{
  display:flex;
  align-items:center;
  gap:14rpx;
}
.transfer-icon{
  width:58rpx;
  height:58rpx;
  border-radius:14rpx;
  background:rgba(255,255,255,.22);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:34rpx;
  font-weight:900;
}
.transfer-meta{ flex:1; min-width:0; }
.transfer-title{ display:block; font-size:30rpx; font-weight:900; color:#fff; }
.transfer-remark{ display:block; margin-top:4rpx; font-size:22rpx; color:rgba(255,255,255,.82); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.transfer-amount{ display:block; margin-top:22rpx; font-size:44rpx; font-weight:900; color:#fff; }
.transfer-action{
  margin-top:20rpx;
  height:64rpx;
  border-radius:16rpx;
  background:#fff;
  color:#ff7a1a;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:26rpx;
  font-weight:900;
}
.transfer-state{ display:block; margin-top:18rpx; font-size:23rpx; color:rgba(255,255,255,.86); }

/* 红包消息气泡 */
.redpacket-card{
  width:430rpx;
  border-radius:18rpx;
  background:linear-gradient(135deg,#FA5151 0%,#D32E2E 100%);
  color:#fff;
  overflow:hidden;
  box-sizing:border-box;
  cursor:pointer;
}
.redpacket-card.received{
  background:linear-gradient(135deg,#A7ADB7 0%,#747B86 100%);
}
.redpacket-head{
  display:flex;
  align-items:center;
  gap:14rpx;
  padding:22rpx 22rpx 14rpx 22rpx;
}
.redpacket-icon{
  width:64rpx;
  height:64rpx;
  border-radius:14rpx;
  background:rgba(255,255,255,.22);
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
}
.redpacket-icon-img{
  width:48rpx;
  height:48rpx;
}
.redpacket-meta{ flex:1; min-width:0; }
.redpacket-title{ display:block; font-size:30rpx; font-weight:900; color:#fff; }
.redpacket-greeting{ display:block; margin-top:4rpx; font-size:22rpx; color:rgba(255,255,255,.82); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.redpacket-foot{
  padding:14rpx 22rpx 20rpx 22rpx;
  border-top:1rpx solid rgba(255,255,255,.18);
}
.redpacket-status{ display:block; font-size:24rpx; color:rgba(255,255,255,.92); }

/* 红包发送弹窗 */
.rp-modal-mask{
  align-items:center;
  justify-content:center;
  padding:0 60rpx;
}
.redpacket-modal{
  position:relative;
  width:100%;
  max-width:620rpx;
  border-radius:24rpx;
  overflow:hidden;
  box-shadow:0 16rpx 48rpx rgba(0,0,0,.32);
  animation: popIn .2s cubic-bezier(0.34, 1.2, 0.64, 1);
}
/* 顶部红色区域 */
.rp-modal-header{
  position:relative;
  background:linear-gradient(160deg, #E54D42 0%, #C41A1A 100%);
  padding:60rpx 48rpx 48rpx;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.rp-modal-close{
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
.rp-close-icon{
  font-size:40rpx;
  color:#fff;
  line-height:1;
  font-weight:300;
}
.rp-modal-avatar{
  width:96rpx;
  height:96rpx;
  border-radius:50%;
  overflow:hidden;
  background:rgba(255,255,255,.2);
  border:3rpx solid rgba(255,255,255,.45);
  box-shadow:0 4rpx 16rpx rgba(0,0,0,.15);
}
.rp-modal-ava-img{
  width:100%;
  height:100%;
}
.rp-modal-tip{
  margin-top:16rpx;
  font-size:26rpx;
  color:rgba(255,255,255,.92);
  font-weight:400;
}
.rp-amount-field{
  width:100%;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  margin-top:32rpx;
  padding-bottom:8rpx;
  border-bottom:1rpx solid rgba(255,255,255,.25);
}
.rp-amount-symbol{
  font-size:40rpx;
  font-weight:400;
  color:#fff;
  margin-right:8rpx;
  line-height:1.2;
}
.rp-amount-input{
  flex:1;
  height:88rpx;
  font-size:72rpx;
  font-weight:400;
  color:#fff;
  text-align:center;
  line-height:1.1;
}
.rp-amount-placeholder{ color:rgba(255,255,255,.85); }
/* 底部白色卡片 */
.rp-modal-body{
  background:#fff;
  padding:8rpx 40rpx 40rpx;
}
.rp-field-row{
  display:flex;
  align-items:center;
  height:96rpx;
}
.rp-field-label{
  width:160rpx;
  font-size:28rpx;
  color:#333;
  flex-shrink:0;
  font-weight:400;
}
.rp-field-input{
  flex:1;
  height:100%;
  font-size:28rpx;
  color:#333;
  font-weight:400;
}
.rp-divider{
  height:1rpx;
  background:#f0f0f0;
}
.rp-send-btn{
  width:100%;
  height:88rpx;
  background:linear-gradient(135deg, #FA5151 0%, #E54D42 100%);
  border-radius:44rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-top:32rpx;
  box-shadow:0 8rpx 20rpx rgba(229,77,66,.32);
}
.rp-send-btn.disabled{ opacity:0.6; box-shadow:none; }
.rp-send-text{ font-size:32rpx; font-weight:400; color:#fff; letter-spacing:2rpx; }

/* 红包领取弹窗（仿首页红包样式） */
.rp-claim-overlay{
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
.rp-claim-container{
  width:calc(100% - 80rpx);
  max-width:560rpx;
  position:relative;
  margin:0 auto;
}
.rp-claim-close{
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
.rp-claim-main{
  background:#e83a3a;
  border-radius:24rpx;
  overflow:hidden;
  box-shadow:0 20rpx 60rpx rgba(232,58,58,.5);
  width:100%;
  min-height:800rpx;
  display:flex;
  flex-direction:column;
}
.rp-claim-top{
  padding:60rpx 32rpx 32rpx;
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.rp-claim-sender{
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:32rpx;
}
.rp-claim-ava-wrap{
  width:80rpx;
  height:80rpx;
  border-radius:50%;
  background:#fff;
  overflow:hidden;
  margin-right:16rpx;
  border:4rpx solid rgba(255,255,255,.5);
}
.rp-claim-ava-img{ width:100%; height:100%; }
.rp-claim-sender-name{ font-size:28rpx; color:rgba(255,255,255,.9); font-weight:500; }
.rp-claim-greeting{ font-size:36rpx; color:#fff; font-weight:bold; letter-spacing:4rpx; }
.rp-claim-opener{ height:32rpx; position:relative; overflow:hidden; }
.rp-claim-curve{
  position:absolute;
  top:-24rpx;
  left:50%;
  transform:translateX(-50%);
  width:120%;
  height:60rpx;
  background:#d43232;
  border-radius:50%;
}
.rp-claim-bottom{
  padding:48rpx 32rpx 80rpx;
  display:flex;
  justify-content:center;
  align-items:flex-end;
  flex:1;
}
.rp-claim-open-btn{
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
.rp-claim-open-btn.loading{ background:#ccc; }
.rp-claim-open-btn.rotating{
  animation:coinFlip .5s linear infinite;
  transform-style:preserve-3d;
}
@keyframes coinFlip{
  0%{ transform:rotateY(0deg); }
  50%{ transform:rotateY(180deg); }
  100%{ transform:rotateY(360deg); }
}
.rp-claim-open-text{
  font-size:56rpx;
  font-weight:bold;
  color:#8b4513;
  font-family:'STKaiti','KaiTi',serif;
}
.rp-claim-open-btn.loading .rp-claim-open-text{ color:#888; }

.rp-claim-result{ animation:resultAppear .3s ease-out; }
@keyframes resultAppear{
  from{ opacity:0; transform:scale(.9); }
  to{ opacity:1; transform:scale(1); }
}
.rp-result-header{
  background:linear-gradient(180deg,#e83a3a 0%,#c91f1f 100%);
  padding:48rpx 32rpx 32rpx;
  text-align:center;
  border-radius:24rpx 24rpx 0 0;
}
.rp-result-icon-wrap{
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 16rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rp-result-icon{
  width: 56rpx;
  height: 56rpx;
}
.rp-result-title{ font-size:32rpx; color:#fff; }
.rp-result-body{
  padding:100rpx 32rpx 48rpx;
  text-align:center;
  background:#fff;
}
.rp-result-amount{ margin-bottom:16rpx; }
.rp-result-symbol{ font-size:48rpx; font-weight:bold; color:#e83a3a; }
.rp-result-value{ font-size:88rpx; font-weight:bold; color:#e83a3a; line-height:1; }
.rp-result-desc{ font-size:28rpx; color:#666; display:block; }
.rp-result-footer{
  padding:0 32rpx 80rpx;
  margin-top:auto;
  background:#fff;
  border-radius:0 0 24rpx 24rpx;
}
.rp-result-btn{
  background:linear-gradient(180deg,#e83a3a 0%,#c91f1f 100%);
  padding:28rpx;
  border-radius:60rpx;
  text-align:center;
}
.rp-result-btn text{ font-size:32rpx; font-weight:bold; color:#fff; }

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
.tool-btn{
  width:60rpx;
  height:60rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  flex-shrink:0;
  transition:all 0.2s;
}
.tool-btn:active{ 
  opacity:0.7;
}
.tool-icon-img{
  width:36rpx;
  height:36rpx;
}
.input-box{
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
.input-box.voice-mode{
  border:none;
  box-shadow:none;
}
.voice-holder{
  width:100%;
  height:72rpx;
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
.chat-disabled-tip{
  padding:0 24rpx 8rpx;
  font-size:24rpx;
  color:#ff4d6d;
}
.send-btn{
  width:104rpx;
  height:72rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:999rpx;
  flex-shrink:0;
  background:#111827;
  transition:all 0.2s;
}
.send-btn:active{
  transform:scale(0.95);
}
.send-text{
  font-size:26rpx;
  color:#fff;
}

.loading-mask{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.25);
  z-index:10000;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0 40rpx;
}
.loading-mask.transparent{ background:transparent; }

.skel{
  position:relative;
  overflow:hidden;
  background:#eceff3;
}
.skel::after{
  content:'';
  position:absolute;
  top:0; left:-40%;
  width:40%; height:100%;
  background:linear-gradient(90deg,
    rgba(236,239,243,0) 0%,
    rgba(255,255,255,0.85) 50%,
    rgba(236,239,243,0) 100%
  );
  animation: shimmer 1.1s infinite;
}
@keyframes shimmer{ 0%{left:-40%} 100%{left:120%} }

.mask{
  position:fixed;
  inset:0;
  z-index:11000;
  background:rgba(0,0,0,0.5);
  display:flex;
  align-items:flex-end;
  backdrop-filter: blur(8rpx);
  -webkit-backdrop-filter: blur(8rpx);
}
.sheet{
  width:100%;
  background:#fff;
  border-top-left-radius:32rpx;
  border-top-right-radius:32rpx;
  overflow:hidden;
  box-shadow:0 -8rpx 32rpx rgba(0,0,0,0.12);
}
.sheet-anim{ animation: sheetUp .2s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes sheetUp{
  from{ transform:translateY(60rpx); opacity:0; }
  to{ transform:translateY(0); opacity:1; }
}
.sheet-item{
  padding:32rpx 24rpx;
  font-size:32rpx;
  color:#15171a;
  border-bottom:1rpx solid #f3f4f6;
  transition: all 0.3s ease;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:600;
}
.sheet-item:active{ background:#f9fafb; }
.sheet-item.danger{ color:#ff4d6d; font-weight:700; }
.sheet-cancel{
  padding:32rpx 24rpx;
  text-align:center;
  font-size:32rpx;
  color:#6b7280;
  font-weight:700;
  background:#f9fafb;
  margin-top:8rpx;
  border-top-left-radius:32rpx;
  border-top-right-radius:32rpx;
}

.modal-mask{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.5);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:12000;
  padding:0 40rpx;
}
.modal, .confirm, .modal-box{
  width:100%;
  max-width:650rpx;
  background:#fff;
  border-radius:28rpx;
  overflow:hidden;
  padding:24rpx;
}
.modal-anim{ animation: popIn .16s ease-out; }
@keyframes popIn{
  from{ opacity:.4; transform:scale(.98); }
  to{ opacity:1; transform:scale(1); }
}
.modal-title, .confirm-title{
  display:block;
  text-align:center;
  font-size:34rpx;
  font-weight:900;
  color:#111;
  margin-bottom:16rpx;
}
.confirm-content{
  display:block;
  text-align:center;
  font-size:28rpx;
  color:#666;
  line-height:1.6;
}
.modal-input{
  height:80rpx;
  background:#f9fafb;
  border-radius:16rpx;
  padding:0 20rpx;
  font-size:28rpx;
  margin-top:14rpx;
}
.transfer-modal{ padding:30rpx; }
.amount-field{
  height:112rpx;
  background:#f9fafb;
  border-radius:18rpx;
  display:flex;
  align-items:center;
  padding:0 22rpx;
  margin-bottom:14rpx;
}
.amount-symbol{ font-size:42rpx; font-weight:900; color:#111; margin-right:12rpx; }
.amount-input{ flex:1; height:100%; font-size:48rpx; font-weight:900; color:#111; }
.modal-btns, .confirm-btns{
  display:flex;
  gap:16rpx;
  margin-top:16rpx;
}
.btn, .cbtn{
  flex:1;
  height:80rpx;
  line-height:80rpx;
  text-align:center;
  border-radius:16rpx;
  font-size:30rpx;
  font-weight:900;
}
.btn{ background:#ff4d6d; color:#fff; }
.btn.ghost{ background:#f9fafb; color:#111; }
.cbtn.ghost{ background:#f9fafb; color:#111; }
.cbtn.danger{ background:#ff3b30; color:#fff; }

.sr{ margin-top:18rpx; max-height:520rpx; overflow:auto; }
.sr-item{ padding:16rpx 0; border-bottom:1rpx solid #f3f4f6; }
.sr-time{ display:block; font-size:22rpx; color:#999; margin-bottom:6rpx; }
.sr-txt{ font-size:28rpx; color:#111; }
.sr-empty{ text-align:center; font-size:26rpx; color:#999; margin-top:14rpx; }

.friends{ max-height:560rpx; overflow:auto; margin-top:12rpx; }
.f-item{ display:flex; align-items:center; gap:16rpx; padding:18rpx 0; border-bottom:1rpx solid #f3f4f6; }
.f-ava{ width:72rpx; height:72rpx; border-radius:18rpx; background:#eee; }
.f-meta{ flex:1; min-width:0; }
.f-name{ display:block; font-size:30rpx; font-weight:900; color:#111; }
.f-sub{ display:block; font-size:24rpx; color:#999; margin-top:4rpx; }
.f-go{ padding:10rpx 18rpx; background:#ff4d6d; color:#fff; border-radius:999rpx; font-size:24rpx; font-weight:900; }

.modal-box{ padding:0; }
.modal-header{ padding:40rpx 40rpx 20rpx; display:flex; justify-content:center; }
.warn-badge, .ban-badge{
  padding:12rpx 32rpx;
  border-radius:40rpx;
  font-size:24rpx;
  font-weight:800;
  letter-spacing:2rpx;
  color:#fff;
}
.warn-badge{ background:linear-gradient(135deg,#ff9500 0%,#ff6b00 100%); }
.ban-badge{ background:linear-gradient(135deg,#ff3b30 0%,#d70015 100%); }

.modal-body{ padding:20rpx 40rpx 40rpx; display:flex; flex-direction:column; align-items:center; }
.modal-desc{ font-size:28rpx; color:#666; line-height:1.6; text-align:center; margin-bottom:24rpx; }
.modal-tip{ font-size:24rpx; color:#999; text-align:center; padding:16rpx 24rpx; background:#f8f8f8; border-radius:12rpx; margin-top:12rpx; }
.ban-stats{ width:100%; margin:24rpx 0; }
.stat-row{ display:flex; justify-content:space-between; align-items:center; padding:20rpx 28rpx; background:#f9fafb; border-radius:16rpx; margin-bottom:12rpx; }
.stat-label{ font-size:28rpx; color:#666; font-weight:600; }
.stat-value{ font-size:32rpx; font-weight:900; }
.stat-value.red{ color:#ff3b30; }
.stat-value.orange{ color:#ff9500; }
.modal-footer{ padding:0 40rpx 40rpx; }
.modal-btn{
  width:100%;
  height:88rpx;
  line-height:88rpx;
  text-align:center;
  border-radius:44rpx;
  font-size:32rpx;
  font-weight:900;
}
.modal-btn.primary{ background:linear-gradient(135deg,#007aff 0%,#0051d5 100%); color:#fff; }
.modal-btn.danger{ background:linear-gradient(135deg,#ff3b30 0%,#d70015 100%); color:#fff; }

.toast-wrap{
  position:fixed;
  left:0; right:0;
  bottom:200rpx;
  z-index:13000;
  display:flex;
  justify-content:center;
  pointer-events:none;
}
.toast{
  max-width:560rpx;
  background:rgba(0,0,0,0.84);
  padding:18rpx 22rpx;
  border-radius:18rpx;
}
.toast-text{ color:#fff; font-size:26rpx; text-align:center; }
.toast-anim{ animation: toastIn .16s ease-out; }
@keyframes toastIn{
  from{ opacity:.3; transform:translateY(10rpx); }
  to{ opacity:1; transform:translateY(0); }
}

/* +号功能面板（贴底弹起，与表情面板同位置） */
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
  padding:24rpx 16rpx 16rpx 16rpx;
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

/* #ifdef H5 */
.chat-page, .top-nav, .input-wrapper{ max-width: 750rpx; margin: 0 auto; }
/* #endif */
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

.emoji-picker {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1999;
  height: 470rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fafafc 100%);
  border-top-left-radius: 28rpx;
  border-top-right-radius: 28rpx;
  box-shadow: 0 -8rpx 32rpx rgba(17, 17, 26, 0.10);
  animation: emojiPickerIn .28s cubic-bezier(.22, .61, .36, 1);
}
@keyframes emojiPickerIn{
  from{ opacity:0; transform:translateY(100%); }
  to{ opacity:1; transform:translateY(0); }
}

/* 顶部小拖手 */
.emoji-handle {
  width: 72rpx;
  height: 8rpx;
  margin: 14rpx auto 0;
  border-radius: 999rpx;
  background: #e6e8ec;
  flex-shrink: 0;
}

.emoji-tabs {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 26rpx 8rpx;
  flex-shrink: 0;
}

.emoji-tab {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 25rpx;
  line-height: 1;
  color: #8a8f99;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #f4f5f7;
  transition: background .2s ease, color .2s ease, transform .14s ease, box-shadow .2s ease;
}

.emoji-tab:active { transform: scale(.94); }

.emoji-tab.active {
  background: linear-gradient(135deg, #ff5c7a, #ff4d6d);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(255, 77, 109, 0.28);
}

.emoji-tab-num {
  font-size: 20rpx;
  opacity: .8;
}

.emoji-scroll {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  padding: 8rpx 26rpx 24rpx;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.emoji-item {
  width: 82rpx;
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid #f0f1f4;
  box-shadow: 0 2rpx 6rpx rgba(17, 17, 26, 0.04);
  transition: transform .14s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.emoji-item:active {
  transform: scale(.88);
  background: #fff1f4;
  border-color: #ffd6e0;
  box-shadow: none;
}

.emoji-img {
  width: 62rpx;
  height: 62rpx;
  border-radius: 12rpx;
}

.emoji-empty {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64rpx 0 20rpx;
}

.emoji-empty-txt {
  font-size: 26rpx;
  color: #b4b8c0;
}

.emoji-empty-hint {
  margin-top: 12rpx;
  font-size: 23rpx;
  color: #d3d6dc;
}

.inline-emoticon {
  width: 48rpx;
  height: 48rpx;
  vertical-align: middle;
  display: inline-block;
  margin: 0 2rpx;
  border-radius: 8rpx;
}

.emoticon-message {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
}
/* ==================== 语音消息 ==================== */
/* 按住说话 */
.voice-hold {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 36rpx;
  background: #fff;
  color: #333;
  font-size: 28rpx;
  border: 2rpx solid transparent;
  user-select: none;
}
.voice-hold.active { background: #d5d5d5; }
.voice-hold.cancel { background: #ffd6dc; color: #c81e3c; border-color: #ff8fa3; }

/* 语音气泡（宽度由 voiceWidth 按秒数给，颜色随所在气泡） */
.voice-msg {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 18rpx;
}
/* 声波：纯 CSS 四根圆头柱子，颜色自动跟随气泡文字（不依赖外部文件，任何端都能显示） */
.voice-wave {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 32rpx;
  flex-shrink: 0;
}
.voice-bar {
  width: 5rpx;
  border-radius: 3rpx;
  background: currentColor;
  opacity: .85;
}
.voice-bar:nth-child(1) { height: 12rpx; }
.voice-bar:nth-child(2) { height: 24rpx; }
.voice-bar:nth-child(3) { height: 32rpx; }
.voice-bar:nth-child(4) { height: 18rpx; }
.voice-msg.playing .voice-bar { animation: voicePulse .7s infinite ease-in-out; }
.voice-msg.playing .voice-bar:nth-child(2) { animation-delay: .1s; }
.voice-msg.playing .voice-bar:nth-child(3) { animation-delay: .2s; }
.voice-msg.playing .voice-bar:nth-child(4) { animation-delay: .3s; }
@keyframes voicePulse { 0%, 100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
.voice-sec { font-size: 26rpx; }
.voice-dot {
  font-size: 20rpx;
  line-height: 1;
  padding: 4rpx 8rpx;
  border-radius: 6rpx;
  background: rgba(0, 0, 0, .12);
}

/* 录音浮层 */
.rec-mask {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, .3);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.rec-box {
  width: 360rpx;
  padding: 40rpx 0;
  border-radius: 24rpx;
  background: rgba(30, 30, 30, .92);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.rec-box.cancel { background: rgba(160, 30, 50, .94); }
.rec-wave { display: flex; align-items: flex-end; gap: 8rpx; height: 50rpx; }
.rec-bar { width: 10rpx; border-radius: 5rpx; background: #6ee7a8; animation: recPulse .8s infinite ease-in-out; }
.rec-bar:nth-child(1) { height: 24rpx; }
.rec-bar:nth-child(2) { height: 46rpx; animation-delay: .15s; }
.rec-bar:nth-child(3) { height: 30rpx; animation-delay: .3s; }
@keyframes recPulse { 0%, 100% { transform: scaleY(.5); } 50% { transform: scaleY(1); } }
.rec-sec { font-size: 40rpx; font-weight: 700; color: #fff; }
.rec-tip { font-size: 24rpx; color: rgba(255, 255, 255, .85); }
</style>