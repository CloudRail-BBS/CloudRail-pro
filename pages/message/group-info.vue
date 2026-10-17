<template>
  <view class="page" :class="themeClass">
    <!-- 顶部导航(固定) -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="back-arrow">‹</text>
        </view>
        <text class="nav-title">群聊资料</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>
    <!-- 导航占位: 让内容从导航下方开始 -->
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="content">
      <!-- 群信息卡片（点击进入群资料详情） -->
      <view class="card group-info-card" @click="openGroupProfile">
        <image class="group-avatar" :src="fixUrl(group.avatar)" mode="aspectFill" @click.stop="canManage ? chooseAvatar() : null" />
        <view class="group-meta">
          <text class="group-name">{{ group.name || '群聊' }}</text>
          <view class="group-code-row">
            <text class="group-code">群号：{{ group.identity_code || '-' }}</text>
            <view class="copy-btn" v-if="group.identity_code" @click.stop="copyGroupCode">
              <text class="copy-btn-text">复制</text>
            </view>
          </view>
          <text class="group-count">{{ Number(group.member_count || 0) }} 人</text>
        </view>
        <view class="group-card-right">
          <text class="role-tag" v-if="isMember && roleText">{{ roleText }}</text>
          <view class="qr-entry" v-if="group.identity_code" @click.stop="openGroupQR">
            <image class="qr-entry-icon" src="/static/qewm.png" mode="aspectFit" />
            <text class="qr-entry-text">群二维码</text>
          </view>
        </view>
      </view>

      <!-- 群公告（群主/管理员可编辑） -->
      <view class="card">
        <view class="cell" @click="canManage ? openAnnouncementModal() : null">
          <text class="cell-label">群公告</text>
          <view class="cell-value-wrap">
            <text class="cell-value announcement-text">{{ group.announcement || '群主还没有设置群公告' }}</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 群成员 -->
      <view class="card">
        <view class="cell" @click="viewAllMembers">
          <text class="cell-label">群成员</text>
          <view class="cell-value-wrap">
            <text class="cell-value">{{ members.length }}人</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
        <view class="member-grid">
          <view class="member-grid-item" v-for="member in displayMembers" :key="member.user_id" @click="openMemberAction(member)">
            <image class="member-grid-avatar" :src="fixUrl(member.avatar)" mode="aspectFill" />
            <text class="member-grid-name">{{ member.nickname || member.name || member.username }}</text>
          </view>
          <view class="member-grid-item add-item" v-if="canInvite" @click="openInviteModal">
            <view class="add-icon">+</view>
            <text class="member-grid-name">添加</text>
          </view>
        </view>
      </view>

      <!-- 我在本群的昵称 -->
      <view class="card">
        <view class="cell" @click="openMyNicknameModal">
          <text class="cell-label">我在本群的昵称</text>
          <view class="cell-value-wrap">
            <text class="cell-value">{{ myNickname || '未设置' }}</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 消息设置 -->
      <view class="card">
        <view class="cell">
          <text class="cell-label">消息免打扰</text>
          <switch :checked="Number(group.mute_notify || 0) === 1" color="#07C160" @change="toggleMuteNotify" />
        </view>
        <view class="cell">
          <text class="cell-label">置顶聊天</text>
          <switch :checked="Number(group.is_top || 0) === 1" color="#07C160" @change="toggleTopChat" />
        </view>
      </view>

      <!-- 邀请好友（所有群成员可用） -->
      <view class="card" v-if="isMember">
        <view class="cell" @click="openInviteModal">
          <text class="cell-label">邀请好友进群</text>
          <view class="cell-value-wrap">
            <text class="cell-value">从互关好友中选择</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 管理功能（群主/管理员可见） -->
      <view class="card" v-if="canManage">
        <view class="cell" @click="openNameModal">
          <text class="cell-label">修改群名称</text>
          <view class="cell-value-wrap">
            <text class="cell-value">{{ group.name || '未设置' }}</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
        <view class="cell">
          <text class="cell-label">入群需审核</text>
          <switch :checked="Number(group.join_need_approve || 0) === 1" color="#07C160" @change="changeJoinApprove" />
        </view>
        <view class="cell">
          <text class="cell-label">全员禁言</text>
          <switch :checked="Number(group.mute_all || 0) === 1" color="#07C160" @change="changeMuteAll" />
        </view>
        <view class="cell" v-if="joinRequests.length" @click="toggleReviewOpen">
          <text class="cell-label">入群申请</text>
          <view class="cell-value-wrap">
            <text class="cell-value badge">{{ joinRequests.length }}条待处理</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 待审核申请列表 -->
      <view v-if="reviewOpen && joinRequests.length" class="card">
        <view class="section-head">
          <text class="section-title">待审核申请</text>
        </view>
        <view class="request-list">
          <view v-for="item in joinRequests" :key="item.id" class="request-item">
            <image class="request-avatar" :src="fixUrl(item.avatar)" mode="aspectFill" />
            <view class="request-info">
              <text class="request-name">{{ item.name || item.username }}</text>
              <text class="request-msg">{{ item.verify_msg || '这个人很懒，没有留下申请备注' }}</text>
            </view>
            <view class="request-actions">
              <view class="mini-btn ghost" @click="reviewJoin(item, 'reject')">拒绝</view>
              <view class="mini-btn" @click="reviewJoin(item, 'approve')">通过</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 其他功能 -->
      <view class="card">
        <view class="cell" @click="searchChatHistory">
          <text class="cell-label">查找聊天记录</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="bottom-actions">
        <view v-if="isOwner" class="danger-btn" @click="confirmDissolve">解散群聊</view>
        <view v-else class="danger-btn" @click="confirmLeave">退出群聊</view>
      </view>

      <view class="bottom-gap"></view>
    </view>

    <!-- 弹窗们 -->
    <!-- 群二维码 -->
    <view v-if="qrModal.show" class="qr-mask" @click="closeGroupQR">
      <view class="qr-panel" @click.stop>
        <view class="qr-panel-head">
          <image class="qr-panel-avatar" :src="fixUrl(group.avatar)" mode="aspectFill" />
          <text class="qr-panel-name">{{ group.name || '群聊' }}</text>
          <text class="qr-panel-code">群号：{{ group.identity_code || '-' }}</text>
        </view>
        <view class="qr-panel-body">
          <image v-if="qrModal.url" class="qr-panel-img" :src="qrModal.url" mode="aspectFit" show-menu-by-longpress />
          <view v-else class="qr-panel-loading">
            <text class="qr-panel-loading-text">二维码生成中...</text>
          </view>
        </view>
        <text class="qr-panel-tip">扫码或长按识别二维码，加入「{{ group.name || '群聊' }}」</text>
        <view class="qr-panel-actions">
          <view class="qr-panel-btn ghost" @click="closeGroupQR">关闭</view>
          <view class="qr-panel-btn primary" @click="saveGroupQR">保存图片</view>
        </view>
      </view>
    </view>

    <!-- 群二维码分享卡片离屏画布(用于合成 群头像+群名+群号+二维码) -->
    <canvas canvas-id="groupQRCanvas" id="groupQRCanvas" class="qr-canvas"></canvas>

    <XhsModal :show="nameModal.show" title="修改群名称" ok-text="保存" @update:show="nameModal.show = false" @confirm="submitName">
      <input v-model="nameModal.value" class="modal-input" maxlength="20" placeholder="请输入新的群名称" />
    </XhsModal>

    <XhsModal :show="announcementModal.show" title="编辑群公告" ok-text="保存" @update:show="announcementModal.show = false" @confirm="submitAnnouncement">
      <textarea v-model="announcementModal.value" class="modal-textarea" maxlength="500" placeholder="请输入群公告内容" />
    </XhsModal>

    <XhsModal :show="inviteModal.show" title="邀请好友" ok-text="确认邀请" @update:show="inviteModal.show = false" @confirm="submitInvite">
      <view v-if="inviteFriends.length" class="modal-list">
        <view v-for="friend in inviteFriends" :key="friend.id" class="modal-item" @click="toggleInvite(friend.id)">
          <image class="modal-avatar" :src="fixUrl(friend.avatar)" mode="aspectFill" />
          <view class="modal-info">
            <text class="modal-name">{{ friend.name || friend.username }}</text>
            <text class="modal-sub">@{{ friend.username }}</text>
          </view>
          <view class="check-dot" :class="{ active: inviteSelected[friend.id] }"></view>
        </view>
      </view>
      <view v-else class="modal-empty">暂无可邀请的互关好友</view>
    </XhsModal>

    <XhsModal :show="memberAction.show" title="成员管理" ok-text="关闭" cancel-text="取消" @update:show="closeMemberAction" @confirm="closeMemberAction">
      <view class="action-sheet">
        <view class="action-sheet-item" @click="viewMemberProfile">查看资料</view>
        <view class="action-sheet-item" v-if="canManageMember(memberAction.member)" @click="setMemberRole('admin')">设为管理员</view>
        <view class="action-sheet-item" v-if="canManageMember(memberAction.member) && memberAction.member.role === 'admin'" @click="setMemberRole('member')">取消管理员</view>
        <view class="action-sheet-item" v-if="canManageMember(memberAction.member)" @click="muteMember">禁言</view>
        <view class="action-sheet-item danger" v-if="canManageMember(memberAction.member)" @click="kickMember">移出群聊</view>
      </view>
    </XhsModal>

    <XhsModal :show="myNicknameModal.show" title="我在本群的昵称" ok-text="保存" @update:show="myNicknameModal.show = false" @confirm="submitMyNickname">
      <input v-model="myNicknameModal.value" class="modal-input" maxlength="20" placeholder="请输入昵称" />
    </XhsModal>

    <XhsConfirm
      :visible="confirm.show"
      :title="confirm.title"
      :message="confirm.message"
      @confirm="confirmOk"
      @cancel="confirmCancel"
    />
  </view>
</template>

<script>
import { request, baseUrl, uploadFile, webBaseUrl } from '../../common/request.js'
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
      groupId: 0,
      group: {},
      myInfo: { role: 'member' },
      members: [],
      joinRequests: [],
      reviewOpen: true,
      inviteFriends: [],
      inviteSelected: {},
      nameModal: { show: false, value: '' },
      announcementModal: { show: false, value: '' },
      inviteModal: { show: false },
      memberAction: { show: false, member: null },
      confirm: { show: false, title: '', message: '', resolve: null },
      myNickname: '',
      myNicknameModal: { show: false, value: '' },
      qrModal: { show: false, url: '' }
    }
  },
  computed: {
    /* 当前登录用户 uid: 兼容 userInfo 里的 uid / id 两种字段 */
    myUid() {
      const info = uni.getStorageSync('userInfo') || {}
      return String(info.uid || info.id || '')
    },
    isOwner() {
      return this.role() === 'owner'
    },
    isAdmin() {
      return this.role() === 'admin'
    },
    /* 群主 / 管理员才显示"管理功能"卡片(入群审核、全员禁言等), 普通成员与未入群用户不显示 */
    canManage() {
      return this.isOwner || this.isAdmin
    },
    roleText() {
      return this.mapRole(this.role())
    },
    canInvite() {
      return this.isMember
    },
    isMember() {
      return !!(this.group && (this.group.is_member === true || Number(this.group.is_member) === 1))
    },
    displayMembers() {
      return (this.members || []).slice(0, 10)
    }
  },
  async onLoad(options) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.groupId = Number(options.groupId || 0)
    await this.refreshAll()
  },
  methods: {
    /* 当前用户在本群的角色: 后端 my.role 为准, 缺失时用 owner_uid 兜底,
       避免群主看不到"管理功能"(入群审核/全员禁言)卡片 */
    role() {
      const r = String(this.myInfo.role || '').toLowerCase()
      if (r === 'owner' || r === 'admin') return r
      if (this.myUid && String(this.group.owner_uid || '') === this.myUid) return 'owner'
      return 'member'
    },
    goBack() {
      uni.navigateBack()
    },
    /* ===== 进入群资料详情页(QQ 风格) ===== */
    openGroupProfile() {
      uni.navigateTo({ url: `/pages/message/group-profile?groupId=${this.groupId}` })
    },
    /* ===== 群二维码 ===== */
    openGroupQR() {
      if (!this.group.identity_code) {
        uni.showToast({ title: '群号未生成，暂无法生成二维码', icon: 'none' })
        return
      }
      const target = `${webBaseUrl}#/pages/message/group-search?code=${encodeURIComponent(this.group.identity_code)}`
      this.qrModal = {
        show: true,
        url: `https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=H&margin=10&data=${encodeURIComponent(target)}`
      }
    },
    closeGroupQR() {
      this.qrModal = { show: false, url: '' }
    },
    /* ===== 保存群二维码: 合成"群头像 + 群名 + 群号 + 二维码"完整卡片 ===== */
    saveGroupQR() {
      if (!this.qrModal.url) {
        uni.showToast({ title: '二维码还未生成', icon: 'none' })
        return
      }
      uni.showLoading({ title: '生成中...', mask: true })
      /* 1. 头像、二维码下载到本地临时路径(canvas 绘制必须用本地路径) */
      this.downloadImg(this.fixUrl(this.group.avatar)).then((avatarPath) => {
        return this.downloadImg(this.qrModal.url).then((qrPath) => {
          /* 2. 绘制卡片 */
          return this.drawGroupQRCard(avatarPath, qrPath)
        })
      }).then(() => {
        /* 3. 画布导出为图片(2 倍分辨率, 更清晰) */
        return new Promise((resolve, reject) => {
          uni.canvasToTempFilePath({
            canvasId: 'groupQRCanvas',
            x: 0,
            y: 0,
            width: 600,
            height: 860,
            destWidth: 1200,
            destHeight: 1720,
            fileType: 'png',
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          }, this)
        })
      }).then((tempFilePath) => {
        /* 4. 保存到系统相册 */
        return new Promise((resolve, reject) => {
          uni.saveImageToPhotosAlbum({ filePath: tempFilePath, success: resolve, fail: reject })
        })
      }).then(() => {
        uni.hideLoading()
        uni.showToast({ title: '已保存到相册', icon: 'success' })
      }).catch((e) => {
        uni.hideLoading()
        const msg = String((e && (e.errMsg || e.msg)) || '')
        if (msg.indexOf('auth') > -1 || msg.indexOf('authorize') > -1) {
          uni.showModal({
            title: '需要相册权限',
            content: '请在系统设置中允许「CloudRail-pro」保存图片到相册，然后重试',
            showCancel: false
          })
        } else {
          uni.showToast({ title: '保存失败，请重试', icon: 'none' })
        }
      })
    },
    /* 下载图片到本地临时路径: 失败返回空串(头像加载不出来用灰底圆代替, 不阻塞保存) */
    downloadImg(url) {
      return new Promise((resolve) => {
        if (!url) return resolve('')
        uni.getImageInfo({
          src: url,
          success: (r) => resolve(r.path || ''),
          fail: () => resolve('')
        })
      })
    },
    /* 绘制群二维码分享卡片: 600 x 860 */
    drawGroupQRCard(avatarPath, qrPath) {
      return new Promise((resolve) => {
        const W = 600
        const H = 860
        const ctx = uni.createCanvasContext('groupQRCanvas', this)
        const groupName = String(this.group.name || '群聊')
        const groupCode = String(this.group.identity_code || '-')
        const memberCount = Number(this.group.member_count || 0)

        /* 白色卡片底 */
        ctx.setFillStyle('#FFFFFF')
        ctx.fillRect(0, 0, W, H)

        /* 顶部品牌色渐变装饰条 */
        const grad = ctx.createLinearGradient(0, 0, W, 0)
        grad.addColorStop(0, '#FF2442')
        grad.addColorStop(1, '#FF7A59')
        ctx.setFillStyle(grad)
        ctx.fillRect(0, 0, W, 10)

        /* 群头像: 圆形裁剪 */
        const avSize = 140
        const avX = (W - avSize) / 2
        const avY = 70
        ctx.save()
        ctx.beginPath()
        ctx.arc(W / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        if (avatarPath) {
          ctx.drawImage(avatarPath, avX, avY, avSize, avSize)
        } else {
          ctx.setFillStyle('#E5E7EB')
          ctx.fillRect(avX, avY, avSize, avSize)
        }
        ctx.restore()

        /* 群名称(居中, 超长自动截断) */
        ctx.setTextAlign('center')
        ctx.setFillStyle('#111827')
        ctx.setFontSize(36)
        ctx.fillText(this.ellipsisText(ctx, groupName, 460), W / 2, 268)

        /* 群号 + 群人数 */
        ctx.setFillStyle('#8A8F99')
        ctx.setFontSize(24)
        ctx.fillText(`群号：${groupCode}    ${memberCount}人`, W / 2, 310)

        /* 二维码容器(浅灰圆角底) */
        const qrBox = 390
        const qrBoxX = (W - qrBox) / 2
        const qrBoxY = 350
        ctx.setFillStyle('#F7F8FA')
        this.roundRect(ctx, qrBoxX, qrBoxY, qrBox, qrBox, 24)
        ctx.fill()

        /* 二维码 */
        if (qrPath) {
          const qrSize = 330
          const qrX = (W - qrSize) / 2
          const qrY = qrBoxY + (qrBox - qrSize) / 2
          ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize)
        }

        /* 底部提示文案 */
        ctx.setFillStyle('#6B7280')
        ctx.setFontSize(26)
        ctx.fillText('扫码或长按识别二维码加入群聊', W / 2, 788)

        ctx.setFillStyle('#B0B4BB')
        ctx.setFontSize(22)
        ctx.fillText('CloudRail-pro · 群聊', W / 2, 824)

        /* 绘制完成后再导出画布 */
        ctx.draw(false, () => {
          setTimeout(() => resolve(), 300)
        })
      })
    },
    /* 圆角矩形路径 */
    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
      ctx.lineTo(x + w, y + h - r)
      ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
      ctx.lineTo(x + r, y + h)
      ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
      ctx.lineTo(x, y + r)
      ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
      ctx.closePath()
    },
    /* 文本超宽截断加省略号 */
    ellipsisText(ctx, text, maxWidth) {
      if (ctx.measureText(text).width <= maxWidth) return text
      let t = text
      while (t.length > 1 && ctx.measureText(t + '...').width > maxWidth) {
        t = t.slice(0, -1)
      }
      return t + '...'
    },
    viewAllMembers() {
      const name = encodeURIComponent(this.group.name || '')
      uni.navigateTo({
        url: `/pages/message/group-members?groupId=${this.groupId}&groupName=${name}`
      })
    },
    openMyNicknameModal() {
      this.myNicknameModal.value = this.myNickname || ''
      this.myNicknameModal.show = true
    },
    submitMyNickname() {
      const val = this.myNicknameModal.value.trim()
      if (!val) {
        uni.showToast({ title: '昵称不能为空', icon: 'none' })
        return
      }
      this.myNickname = val
      this.myNicknameModal.show = false
      uni.showToast({ title: '修改成功', icon: 'success' })
    },
    toggleMuteNotify(e) {
      const val = e.detail.value ? 1 : 0
      this.group.mute_notify = val
      uni.showToast({ title: val ? '已开启免打扰' : '已关闭免打扰', icon: 'none' })
    },
    toggleTopChat(e) {
      const val = e.detail.value ? 1 : 0
      this.group.is_top = val
      uni.showToast({ title: val ? '已置顶' : '已取消置顶', icon: 'none' })
    },
    searchChatHistory() {
      uni.showToast({ title: '查找聊天记录开发中', icon: 'none' })
    },
    async refreshAll() {
      await this.fetchInfo()
      await Promise.all([this.fetchMembers(), this.fetchJoinRequests()])
    },
    async fetchInfo() {
      const res = await request('group.php', { action: 'group_info', group_id: this.groupId }, 'GET')
      if (res.code === 0) {
        const info = (res.data && (res.data.group || res.data)) || {}
        this.group = info
        const my = (res.data && res.data.my) || info.my || {}
        this.myInfo = { ...my }
      }
    },
    async fetchMembers() {
      const res = await request('group.php', { action: 'group_member_list', group_id: this.groupId, page: 1 }, 'GET')
      if (res.code === 0) {
        const data = res.data
        this.members = (data && data.list) || (Array.isArray(data) ? data : []) || []
      }
    },
    async fetchJoinRequests() {
      if (!this.canManage) {
        this.joinRequests = []
        return
      }
      const res = await request('group.php', { action: 'group_join_request_list', group_id: this.groupId, page: 1 }, 'GET')
      if (res.code === 0) {
        const data = res.data
        /* 后端返回 {list:[...]}, 旧版可能直接返回数组, 两种都兼容, 否则 .length 取不到导致申请卡片不显示 */
        this.joinRequests = (data && data.list) || (Array.isArray(data) ? data : []) || []
      }
    },
    mapRole(role) {
      if (role === 'owner') return '群主'
      if (role === 'admin') return '管理员'
      return '成员'
    },
    copyGroupCode() {
      const code = this.group.identity_code || ''
      if (!code) return
      uni.setClipboardData({
        data: code,
        success: () => {
          uni.showToast({ title: '群号已复制', icon: 'none' })
        }
      })
    },
    fixUrl(url) {
      if (!url) return '/static/default-avatar.png'
      if (String(url).startsWith('http')) return url
      if (String(url).startsWith('/static/')) return url
      const base = baseUrl.replace(/\/API\/?$/i, '').replace(/\/$/, '')
      return base + (String(url).startsWith('/') ? url : '/' + url)
    },
    openNameModal() {
      this.nameModal.value = this.group.name || ''
      this.nameModal.show = true
    },
    async submitName() {
      const value = String(this.nameModal.value || '').trim()
      if (value.length < 2) {
        uni.showToast({ title: '群名称至少2个字', icon: 'none' })
        return
      }
      const res = await request('group.php', {
        action: 'group_update_name',
        group_id: this.groupId,
        name: value
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '修改失败', icon: 'none' })
        return
      }
      this.nameModal.show = false
      this.group.name = value
      uni.showToast({ title: '已保存', icon: 'none' })
    },
    openAnnouncementModal() {
      this.announcementModal.value = this.group.announcement || ''
      this.announcementModal.show = true
    },
    async submitAnnouncement() {
      const res = await request('group.php', {
        action: 'group_set_announcement',
        group_id: this.groupId,
        announcement: this.announcementModal.value || ''
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
        return
      }
      this.announcementModal.show = false
      this.group.announcement = this.announcementModal.value || ''
      uni.showToast({ title: '已更新', icon: 'none' })
    },
    async changeJoinApprove(e) {
      const enabled = e.detail.value ? 1 : 0
      const res = await request('group.php', {
        action: 'group_set_join_need_approve',
        group_id: this.groupId,
        enabled
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
        this.fetchInfo()
        return
      }
      this.group.join_need_approve = enabled
    },
    async changeMuteAll(e) {
      const enabled = e.detail.value ? 1 : 0
      const res = await request('group.php', {
        action: 'group_set_mute_all',
        group_id: this.groupId,
        enabled
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
        this.fetchInfo()
        return
      }
      this.group.mute_all = enabled
    },
    async chooseAvatar() {
      if (!this.canManage) return
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (pickRes) => {
          const filePath = (pickRes.tempFilePaths || [])[0]
          if (!filePath) return
          const up = await uploadFile(filePath, { type: 'image' })
          const avatar = up?.url || up?.path || up?.data?.url || up?.data?.path || ''
          if (!avatar) {
            uni.showToast({ title: '上传失败', icon: 'none' })
            return
          }
          const res = await request('group.php', {
            action: 'group_set_avatar',
            group_id: this.groupId,
            avatar
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
            return
          }
          this.group.avatar = avatar
        }
      })
    },
    async openInviteModal() {
      const myUid = String((uni.getStorageSync('userInfo') || {}).uid || '')
      const res = await request('group.php', { action: 'mutual_follow_list', uid: myUid, page: 1 }, 'GET')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
        return
      }
      const memberIds = new Set(this.members.map(item => String(item.user_id || item.uid || '')))
      const fdata = res.data
      const fList = (fdata && fdata.list) || (Array.isArray(fdata) ? fdata : []) || []
      this.inviteFriends = fList.filter(item => !memberIds.has(String(item.uid || item.id || '')))
      this.inviteSelected = {}
      this.inviteModal.show = true
    },
    toggleInvite(userId) {
      this.$set(this.inviteSelected, userId, !this.inviteSelected[userId])
    },
    async submitInvite() {
      const ids = Object.keys(this.inviteSelected).filter(key => this.inviteSelected[key])
      if (!ids.length) {
        uni.showToast({ title: '请选择好友', icon: 'none' })
        return
      }
      const res = await request('group.php', {
        action: 'group_invite',
        group_id: this.groupId,
        user_ids: ids.join(',')
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '邀请失败', icon: 'none' })
        return
      }
      this.inviteModal.show = false
      uni.showToast({ title: res.msg || '邀请已发送', icon: 'none' })
      this.refreshAll()
    },
    toggleReviewOpen() {
      this.reviewOpen = !this.reviewOpen
    },
    async reviewJoin(item, decision) {
      const res = await request('group.php', {
        action: 'group_join_request_review',
        group_id: this.groupId,
        request_id: item.id,
        decision
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        return
      }
      uni.showToast({ title: decision === 'approve' ? '已通过' : '已拒绝', icon: 'none' })
      this.refreshAll()
    },
    canManageMember(member) {
      if (!member) return false
      if (!this.canManage) return false
      if (Number(member.user_id) === Number((uni.getStorageSync('userInfo') || {}).id || 0)) return false
      if (this.isOwner) return member.role !== 'owner'
      return member.role === 'member'
    },
    canMuteMember(member) {
      return this.canManageMember(member)
    },
    openMemberAction(member) {
      if (!this.canManageMember(member)) return
      this.memberAction = { show: true, member }
    },
    closeMemberAction() {
      this.memberAction = { show: false, member: null }
    },
    viewMemberProfile() {
      const member = this.memberAction.member
      this.closeMemberAction()
      if (!member) return
      const uid = member.user_id || member.uid || member.id
      if (!uid) return
      uni.navigateTo({
        url: `/pages/user/profile?userId=${uid}`
      })
    },
    muteMember() {
      const member = this.memberAction.member
      if (!member) return
      this.closeMemberAction()
      // 直接禁言1小时，或弹出选择
      uni.showActionSheet({
        itemList: ['禁言10分钟', '禁言1小时', '禁言1天', '禁言7天', '解除禁言'],
        success: (res) => {
          const minutes = [10, 60, 1440, 10080, 0][res.tapIndex]
          this.setMemberMute(minutes)
        }
      })
    },
    async toggleMemberRole() {
      const member = this.memberAction.member
      if (!member) return
      const role = member.role === 'admin' ? 'member' : 'admin'
      const res = await request('group.php', {
        action: 'group_set_member_role',
        group_id: this.groupId,
        target_user_id: member.user_id,
        role
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '设置失败', icon: 'none' })
        return
      }
      this.closeMemberAction()
      this.refreshAll()
    },
    async setMemberMute(minutes) {
      const member = this.memberAction.member
      if (!member) return
      const res = await request('group.php', {
        action: 'group_set_member_mute',
        group_id: this.groupId,
        target_user_id: member.user_id,
        minutes
      }, 'POST')
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        return
      }
      this.closeMemberAction()
      this.refreshAll()
    },
    kickMember() {
      const member = this.memberAction.member
      if (!member) return
      this.closeMemberAction()
      this.confirm = {
        show: true,
        title: '移出群聊',
        message: `确定将 ${member.nickname || member.name || member.username} 移出群聊吗？`,
        resolve: async (ok) => {
          if (!ok) return
          const res = await request('group.php', {
            action: 'group_kick',
            group_id: this.groupId,
            target_user_id: member.user_id
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
            return
          }
          this.refreshAll()
        }
      }
    },
    confirmLeave() {
      this.confirm = {
        show: true,
        title: '退出群聊',
        message: '确定退出这个群聊吗？退出后可通过群号重新申请加入。',
        resolve: async (ok) => {
          if (!ok) return
          const res = await request('group.php', {
            action: 'group_leave',
            group_id: this.groupId
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '退出失败', icon: 'none' })
            return
          }
          uni.showToast({ title: '已退出群聊', icon: 'none' })
          setTimeout(() => {
            uni.navigateBack({ delta: 2 })
          }, 260)
        }
      }
    },
    confirmDissolve() {
      this.confirm = {
        show: true,
        title: '解散群聊',
        message: '解散后将删除群成员、群消息和所有入群申请，且不可恢复。确定继续吗？',
        resolve: async (ok) => {
          if (!ok) return
          const res = await request('group.php', {
            action: 'group_dissolve',
            group_id: this.groupId
          }, 'POST')
          if (res.code !== 0) {
            uni.showToast({ title: res.msg || '解散失败', icon: 'none' })
            return
          }
          uni.showToast({ title: '群聊已解散', icon: 'none' })
          setTimeout(() => {
            uni.navigateBack({ delta: 2 })
          }, 260)
        }
      }
    },
    confirmOk() {
      const handler = this.confirm.resolve
      this.confirm = { show: false, title: '', message: '', resolve: null }
      handler && handler(true)
    },
    confirmCancel() {
      const handler = this.confirm.resolve
      this.confirm = { show: false, title: '', message: '', resolve: null }
      handler && handler(false)
    }
  }
}
</script>

<style scoped>
/* ===== QQ风格群资料页面 ===== */
.page{
  width:100%;
  min-height:100vh;
  background:#EDEDED;
}

/* 顶部导航(固定) */
.nav{
  position:fixed;
  left:0;
  right:0;
  top:0;
  background:#F7F7F7;
  border-bottom:1rpx solid #DCDCDC;
  z-index:20;
}
.nav-bar{
  height:44px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 24rpx;
}
.nav-back{
  width:80rpx;
  display:flex;
  align-items:center;
}
.back-arrow{
  font-size:48rpx;
  color:#000;
  font-weight:300;
  line-height:1;
}
.nav-title{
  font-size:32rpx;
  color:#000;
  font-weight:600;
}
.nav-placeholder{
  width:80rpx;
}

/* 内容滚动区 */
/* 内容区: 跟随页面整体滚动(不用 scroll-view, 避免 App 端高度算不出导致滚不到底) */
.content{
  width:100%;
}

/* 卡片 */
.card{
  background: var(--cr-surface);
  margin:20rpx 24rpx;
  border-radius:16rpx;
  overflow:hidden;
}

/* 群信息卡片(点击进入群资料详情页) */
.group-info-card{
  display:flex;
  align-items:center;
  padding:32rpx;
  position:relative;
}
.group-avatar{
  width:120rpx;
  height:120rpx;
  border-radius:16rpx;
  background:#DDD;
  flex-shrink:0;
}
.group-meta{
  flex:1;
  margin-left:24rpx;
  min-width:0;
}
.group-name{
  display:block;
  font-size:34rpx;
  font-weight:600;
  color:#000;
  margin-bottom:8rpx;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
}
.group-code-row{
  display:flex;
  align-items:center;
  margin-bottom:6rpx;
}
.group-code{
  font-size:24rpx;
  color: var(--cr-text-muted);
}
.copy-btn{
  margin-left:12rpx;
  padding:4rpx 16rpx;
  background: var(--cr-surface-alt);
  border-radius:6rpx;
}
.copy-btn-text{
  font-size:20rpx;
  color: var(--cr-text-muted);
}
.group-count{
  font-size:24rpx;
  color: var(--cr-text-muted);
}
/* 群名片右侧: 角色标签 + 群二维码入口 */
.group-card-right{
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  justify-content:space-between;
  align-self:stretch;
  flex-shrink:0;
  padding-left:16rpx;
}
.role-tag{
  font-size:20rpx;
  color:#FF9500;
  background:#FFF4E5;
  padding:4rpx 12rpx;
  border-radius:6rpx;
}
.qr-entry{
  display:flex;
  flex-direction:column;
  align-items:center;
}
.qr-entry-icon{
  width:56rpx;
  height:56rpx;
}
.qr-entry-text{
  font-size:20rpx;
  color: var(--cr-text-muted);
  margin-top:4rpx;
}

/* 群二维码弹层 */
.qr-mask{
  position:fixed;
  top:0;left:0;right:0;bottom:0;
  background:rgba(0,0,0,0.55);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:9999;
}
.qr-panel{
  width:600rpx;
  background: var(--cr-surface);
  border-radius:24rpx;
  padding:36rpx 32rpx 28rpx;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.qr-panel-head{
  display:flex;
  flex-direction:column;
  align-items:center;
  margin-bottom:24rpx;
}
.qr-panel-avatar{
  width:84rpx;
  height:84rpx;
  border-radius:12rpx;
  background:#EEE;
  margin-bottom:12rpx;
}
.qr-panel-name{
  font-size:32rpx;
  font-weight:600;
  color:#111;
}
.qr-panel-code{
  font-size:24rpx;
  color: var(--cr-text-muted);
  margin-top:6rpx;
}
.qr-panel-body{
  width:440rpx;
  height:440rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#F7F7F7;
  border-radius:16rpx;
}
.qr-panel-img{
  width:420rpx;
  height:420rpx;
}
.qr-panel-loading-text{
  font-size:26rpx;
  color: var(--cr-text-muted);
}
.qr-panel-tip{
  font-size:24rpx;
  color: var(--cr-text-muted);
  text-align:center;
  line-height:1.5;
  margin:22rpx 0 26rpx;
}
/* 群二维码卡片离屏画布: 尺寸用 px, 与 drawGroupQRCard 的绘制坐标一一对应 */
.qr-canvas{
  position:fixed;
  left:-2000px;
  top:-2000px;
  width:600px;
  height:860px;
}
.qr-panel-actions{
  display:flex;
  width:100%;
}
.qr-panel-btn{
  flex:1;
  height:84rpx;
  border-radius:42rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:30rpx;
}
.qr-panel-btn.ghost{
  background: var(--cr-surface-alt);
  color: var(--cr-text-muted);
  margin-right:20rpx;
}
.qr-panel-btn.primary{
  background:linear-gradient(135deg,#FF2442 0%,#FF5E7A 100%);
  color:#FFF;
  font-weight:600;
}

/* 单元格 */
.cell{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:28rpx 32rpx;
  border-bottom: 1rpx solid var(--cr-border);
  min-height:88rpx;
}
.cell:last-child{
  border-bottom:none;
}
.cell-label{
  font-size:30rpx;
  color:#000;
  flex-shrink:0;
}
.cell-value-wrap{
  display:flex;
  align-items:center;
  flex:1;
  justify-content:flex-end;
  min-width:0;
  margin-left:20rpx;
}
.cell-value{
  font-size:28rpx;
  color: var(--cr-text-muted);
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  max-width:400rpx;
}
.cell-value.badge{
  color:#FF2442;
}
.announcement-text{
  max-width:350rpx;
}
.cell-arrow{
  font-size:36rpx;
  color: var(--cr-border-strong);
  margin-left:8rpx;
  flex-shrink:0;
}

/* 群成员网格 */
.member-grid{
  display:flex;
  flex-wrap:wrap;
  padding:24rpx 32rpx 32rpx;
  gap:24rpx;
}
.member-grid-item{
  width:100rpx;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.member-grid-avatar{
  width:80rpx;
  height:80rpx;
  border-radius:12rpx;
  background:#DDD;
}
.member-grid-name{
  font-size:20rpx;
  color: var(--cr-text-muted);
  margin-top:8rpx;
  max-width:100rpx;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  text-align:center;
}
.add-item{
  justify-content:center;
}
.add-icon{
  width:80rpx;
  height:80rpx;
  border-radius:12rpx;
  background: var(--cr-surface-alt);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:48rpx;
  color: var(--cr-text-muted);
  font-weight:300;
}

/* 待审核申请 */
.section-head{
  padding:24rpx 32rpx 16rpx;
}
.section-title{
  font-size:28rpx;
  color:#000;
  font-weight:600;
}
.request-list{
  padding:0 32rpx 24rpx;
}
.request-item{
  display:flex;
  align-items:center;
  padding:16rpx 0;
  border-bottom: 1rpx solid var(--cr-border);
}
.request-item:last-child{
  border-bottom:none;
}
.request-avatar{
  width:72rpx;
  height:72rpx;
  border-radius:10rpx;
  background:#DDD;
  flex-shrink:0;
}
.request-info{
  flex:1;
  margin-left:16rpx;
  min-width:0;
}
.request-name{
  display:block;
  font-size:28rpx;
  color:#000;
}
.request-msg{
  display:block;
  font-size:22rpx;
  color: var(--cr-text-muted);
  margin-top:4rpx;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.request-actions{
  display:flex;
  gap:12rpx;
  flex-shrink:0;
}
.mini-btn{
  padding:8rpx 20rpx;
  background:#07C160;
  border-radius:6rpx;
}
.mini-btn.ghost{
  background: var(--cr-surface-alt);
}
.mini-btn text{
  font-size:24rpx;
  color:#FFF;
}
.mini-btn.ghost text{
  color: var(--cr-text-muted);
}

/* 底部操作 */
.bottom-actions{
  padding:40rpx 24rpx 20rpx;
}
.danger-btn{
  background: var(--cr-surface);
  border-radius:16rpx;
  padding:28rpx;
  text-align:center;
  font-size:32rpx;
  color:#FF2442;
  font-weight:500;
}
.bottom-gap{
  height:60rpx;
}

/* 弹窗 */
.modal-input{
  width:100%;
  height:80rpx;
  background: var(--cr-surface-alt);
  border-radius:12rpx;
  padding:0 24rpx;
  font-size:28rpx;
  box-sizing:border-box;
}
.modal-textarea{
  width:100%;
  height:200rpx;
  background: var(--cr-surface-alt);
  border-radius:12rpx;
  padding:20rpx 24rpx;
  font-size:28rpx;
  box-sizing:border-box;
}
.modal-list{
  max-height:500rpx;
  overflow-y:auto;
}
.modal-item{
  display:flex;
  align-items:center;
  padding:20rpx 0;
  border-bottom: 1rpx solid var(--cr-border);
}
.modal-avatar{
  width:72rpx;
  height:72rpx;
  border-radius:10rpx;
  background:#DDD;
}
.modal-info{
  flex:1;
  margin-left:16rpx;
}
.modal-name{
  display:block;
  font-size:28rpx;
  color:#000;
}
.modal-sub{
  display:block;
  font-size:22rpx;
  color: var(--cr-text-muted);
}
.check-dot{
  width:36rpx;
  height:36rpx;
  border-radius:50%;
  border: 2rpx solid var(--cr-border);
}
.check-dot.active{
  background:#07C160;
  border-color:#07C160;
}
.modal-empty{
  text-align:center;
  padding:60rpx;
  font-size:26rpx;
  color: var(--cr-text-muted);
}
.action-sheet{
  padding:10rpx 0;
}
.action-sheet-item{
  padding:28rpx 32rpx;
  font-size:30rpx;
  color: var(--cr-text);
  text-align:center;
  border-bottom: 1rpx solid var(--cr-border);
}
.action-sheet-item.danger{
  color:#FF2442;
}
</style>
