<template>
  <view class="chat-page">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-box">
          <image class="search-icon-img" src="/static/icon/admin-search-999.svg" mode="aspectFit" />
          <input class="search-input" type="text" v-model="keyword" placeholder="搜索群名、群号或群ID" @confirm="loadGroups" />
        </view>
        <view class="search-btn" @click="loadGroups">搜索</view>
      </view>

      <!-- 群聊列表 -->
      <view class="list" v-if="groups.length > 0">
        <view class="list-item" v-for="item in groups" :key="item.id">
          <view class="item-header" @click="toggleExpand(item)">
            <image class="item-avatar" :src="item.avatar_path || '/static/default-group.png'" mode="aspectFill" />
            <view class="item-info">
              <text class="item-name">{{ item.name || '-' }}</text>
              <text class="item-meta">#{{ item.id }} · {{ item.identity_code || '-' }}</text>
            </view>
            <view class="expand-icon" :class="{ expanded: expandedId === item.id }">›</view>
          </view>

          <!-- 群聊信息 -->
          <view class="item-detail">
            <view class="detail-row">
              <text class="detail-label">群主</text>
              <text class="detail-value">{{ item.owner_name || item.owner_username || '-' }}</text>
            </view>
            <view class="tags-row">
              <text class="tag" v-if="item.join_need_approve">需审核</text>
              <text class="tag danger" v-if="item.mute_all">全员禁言</text>
              <text class="tag">{{ item.member_count || 0 }} 人</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">最后活跃</text>
              <text class="detail-value small">{{ item.last_msg_time || item.create_time || '-' }}</text>
            </view>
            <view class="detail-row" v-if="item.last_msg_preview">
              <text class="detail-label">最新消息</text>
              <text class="detail-value small">{{ item.last_msg_preview }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="item-actions">
            <view class="action-btn" @click="showMembers(item)">
              <image class="action-icon-img" src="/static/icon/admin-users-4b5563.svg" mode="aspectFit" />
              <text>成员</text>
            </view>
            <view class="action-btn" @click="showRequests(item)">
              <image class="action-icon-img" src="/static/icon/admin-file-text-4b5563.svg" mode="aspectFit" />
              <text>申请</text>
            </view>
            <view class="action-btn" @click="showMessages(item)">
              <image class="action-icon-img" src="/static/icon/admin-message-square-4b5563.svg" mode="aspectFit" />
              <text>消息</text>
            </view>
            <view class="action-btn danger" @click="dissolveGroup(item)">
              <image class="action-icon-img" src="/static/icon/admin-trash-e74c3c.svg" mode="aspectFit" />
              <text>解散</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="groups.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-message-square-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无群聊数据</text>
      </view>

      <!-- 加载中 -->
      <view class="loading-state" v-if="loading">
        <view class="spinner"></view>
        <text>加载中...</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 成员管理弹窗 -->
    <view class="modal-mask" v-if="membersShow" @click="closeMembers">
      <view class="modal-content large" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ currentGroup.name }} · 成员管理 ({{ membersList.length }})</text>
          <view class="modal-close" @click="closeMembers">×</view>
        </view>
        <scroll-view class="modal-scroll" scroll-y>
          <view class="member-list">
            <view class="member-item" v-for="m in membersList" :key="m.user_id">
              <image class="member-avatar" :src="m.avatar || '/static/default-avatar.png'" mode="aspectFill" />
              <view class="member-info">
                <view class="member-name-row">
                  <text class="member-name">{{ m.name || m.nickname || m.username || '-' }}</text>
                  <text class="role-tag" :class="'role-' + m.role">{{ roleText(m.role) }}</text>
                  <text class="status-tag" v-if="m.status !== 'active'">{{ statusText(m.status) }}</text>
                </view>
                <text class="member-id">uid:{{ m.user_id }} · @{{ m.username || '-' }}</text>
                <text class="member-mute" v-if="m.muted_until">禁言至：{{ m.muted_until }}</text>
              </view>
              <view class="member-actions" v-if="m.role !== 'owner' && m.status === 'active'">
                <view class="small-btn" v-if="!m.muted_until" @click="muteMember(m, 24)">禁言24h</view>
                <view class="small-btn" v-if="m.muted_until" @click="muteMember(m, 0)">解禁</view>
                <view class="small-btn danger" @click="kickMember(m)">移出</view>
              </view>
              <text class="member-op-hint" v-else-if="m.role === 'owner'">群主</text>
              <text class="member-op-hint" v-else>不可操作</text>
            </view>
          </view>
          <view class="empty-state small" v-if="membersList.length === 0">
            <text>暂无成员</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 入群申请弹窗 -->
    <view class="modal-mask" v-if="requestsShow" @click="closeRequests">
      <view class="modal-content large" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ currentGroup.name }} · 入群申请 ({{ requestsList.length }})</text>
          <view class="modal-close" @click="closeRequests">×</view>
        </view>
        <scroll-view class="modal-scroll" scroll-y>
          <view class="request-list">
            <view class="request-item" v-for="r in requestsList" :key="r.id">
              <view class="request-user">
                <image class="request-avatar" :src="r.applicant_user?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
                <view class="request-info">
                  <text class="request-name">{{ r.applicant_name || '-' }}</text>
                  <text class="request-id">uid:{{ r.applicant_id }}</text>
                </view>
              </view>
              <view class="request-msg">
                <text class="request-label">备注</text>
                <text class="request-text">{{ r.verify_msg || '无' }}</text>
              </view>
              <view class="request-status">
                <text class="status-badge" :class="'status-' + r.status">{{ requestStatusText(r.status) }}</text>
                <text class="request-time">{{ r.create_time || '-' }}</text>
              </view>
              <view class="request-actions" v-if="r.status === 'pending'">
                <view class="small-btn success" @click="reviewRequest(r, 'approve')">通过</view>
                <view class="small-btn danger" @click="reviewRequest(r, 'reject')">拒绝</view>
              </view>
              <view class="request-reviewer" v-else>
                <text v-if="r.reviewer_name">{{ r.reviewer_name }} 处理</text>
              </view>
            </view>
          </view>
          <view class="empty-state small" v-if="requestsList.length === 0">
            <text>暂无入群申请</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 群消息弹窗 -->
    <view class="modal-mask" v-if="messagesShow" @click="closeMessages">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ currentGroup.name }} · 群消息</text>
          <view class="modal-close" @click="closeMessages">×</view>
        </view>
        <scroll-view class="modal-scroll" scroll-y>
          <view class="message-list">
            <view class="message-item" v-for="msg in messagesList" :key="msg.id">
              <view class="msg-header">
                <text class="msg-sender">{{ msg.sender_name || ('uid:' + msg.sender_id) }}</text>
                <text class="msg-time">{{ msg.create_time }}</text>
              </view>
              <view class="msg-tags">
                <text class="msg-type-tag">{{ msg.msg_type || 'text' }}</text>
                <text class="msg-recall-tag" v-if="msg.is_recall">已撤回</text>
              </view>
              <text class="msg-content" v-if="!msg.is_recall">{{ formatMsg(msg) }}</text>
              <text class="msg-recall" v-else>[此消息已撤回]</text>
            </view>
          </view>
          <view class="empty-state small" v-if="messagesList.length === 0">
            <text>暂无消息记录</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- Toast提示 -->
    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast" :class="hud.type">
        <view class="spinner" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request, bmsBaseUrl } from '../../common/request.js'
import { getScreenMetrics } from '../../common/screen.js'

export default {
  data() {
    return {
      statusBarHeight: 0,
      keyword: '',
      loading: false,
      groups: [],
      expandedId: 0,

      // 成员管理
      membersShow: false,
      membersLoading: false,
      membersList: [],
      currentGroup: {},

      // 入群申请
      requestsShow: false,
      requestsLoading: false,
      requestsList: [],

      // 群消息
      messagesShow: false,
      messagesLoading: false,
      messagesList: [],

      hud: { show: false, text: '', type: 'loading' }
    }
  },
  onLoad() {
    const metrics = getScreenMetrics()
    this.statusBarHeight = metrics.statusBarHeight
    this.loadGroups()
  },
  methods: {
    showHud(text, type = 'loading') {
      this.hud = { show: true, text, type }
    },
    hideHud() {
      this.hud.show = false
    },
    toast(text) {
      uni.showToast({ title: text, icon: 'none' })
    },

    async loadGroups() {
      this.loading = true
      try {
        const action = this.keyword ? 'search_groups' : 'list_groups'
        const params = this.keyword ? { action, keyword: this.keyword.trim() } : { action, limit: 50 }
        const r = await request('groups.php', params, { method: 'GET', baseURL: bmsBaseUrl })
        if (r.status === 'success') {
          this.groups = r.data?.list || []
        } else {
          this.toast(r.msg || '加载失败')
        }
      } catch (e) {
        this.toast('网络错误')
      } finally {
        this.loading = false
      }
    },

    toggleExpand(item) {
      this.expandedId = this.expandedId === item.id ? 0 : item.id
    },

    async showMembers(item) {
      this.currentGroup = item
      this.membersShow = true
      this.membersLoading = true
      try {
        const r = await request('groups.php', { action: 'get_group_members', group_id: item.id, limit: 200 }, { method: 'GET', baseURL: bmsBaseUrl })
        if (r.status === 'success') {
          this.membersList = r.data?.list || []
        } else {
          this.toast(r.msg || '加载失败')
        }
      } catch (e) {
        this.toast('网络错误')
      } finally {
        this.membersLoading = false
      }
    },
    closeMembers() {
      this.membersShow = false
      this.membersList = []
    },

    async showRequests(item) {
      this.currentGroup = item
      this.requestsShow = true
      this.requestsLoading = true
      try {
        const r = await request('groups.php', { action: 'get_join_requests', group_id: item.id, limit: 100 }, { method: 'GET', baseURL: bmsBaseUrl })
        if (r.status === 'success') {
          this.requestsList = r.data?.list || []
        } else {
          this.toast(r.msg || '加载失败')
        }
      } catch (e) {
        this.toast('网络错误')
      } finally {
        this.requestsLoading = false
      }
    },
    closeRequests() {
      this.requestsShow = false
      this.requestsList = []
    },

    async showMessages(item) {
      this.currentGroup = item
      this.messagesShow = true
      this.messagesLoading = true
      try {
        const r = await request('groups.php', { action: 'get_group_messages', group_id: item.id, limit: 200 }, { method: 'GET', baseURL: bmsBaseUrl })
        if (r.status === 'success') {
          this.messagesList = r.data?.list || []
        } else {
          this.toast(r.msg || '加载失败')
        }
      } catch (e) {
        this.toast('网络错误')
      } finally {
        this.messagesLoading = false
      }
    },
    closeMessages() {
      this.messagesShow = false
      this.messagesList = []
    },

    formatMsg(msg) {
      if (msg.msg_type === 'image') return '[图片] ' + (msg.content || '')
      if (msg.msg_type === 'video') return '[视频] ' + (msg.content || '')
      if (msg.msg_type === 'card') return '[名片]'
      if (msg.msg_type === 'notice') return '[通知] ' + (msg.content || '')
      return msg.content || '-'
    },

    roleText(role) {
      if (role === 'owner') return '群主'
      if (role === 'admin') return '管理员'
      return '成员'
    },
    statusText(status) {
      if (status === 'kicked') return '已移出'
      if (status === 'left') return '已退出'
      return '正常'
    },
    requestStatusText(status) {
      if (status === 'approved') return '已通过'
      if (status === 'rejected') return '已拒绝'
      return '待审核'
    },

    async reviewRequest(row, decision) {
      uni.showModal({
        title: decision === 'approve' ? '通过申请' : '拒绝申请',
        content: `确定${decision === 'approve' ? '通过' : '拒绝'} ${row.applicant_name || ('uid:' + row.applicant_id)} 的入群申请吗？`,
        confirmColor: decision === 'approve' ? '#27ae60' : '#e74c3c',
        success: async (res) => {
          if (!res.confirm) return
          this.showHud('处理中...')
          try {
            const r = await request('groups.php', {
              action: 'review_join_request',
              group_id: this.currentGroup.id,
              request_id: row.id,
              decision
            }, { method: 'POST', baseURL: bmsBaseUrl })
            this.hideHud()
            if (r.status === 'success') {
              this.toast(decision === 'approve' ? '已通过' : '已拒绝')
              this.showRequests(this.currentGroup)
            } else {
              this.toast(r.msg || '操作失败')
            }
          } catch (e) {
            this.hideHud()
            this.toast('网络错误')
          }
        }
      })
    },

    async muteMember(row, hours) {
      const name = row.nickname || row.name || row.username || ('uid:' + row.user_id)
      const msg = hours > 0 ? `确定将 ${name} 禁言 ${hours} 小时吗？` : `确定解除 ${name} 的禁言吗？`
      uni.showModal({
        title: hours > 0 ? '设置禁言' : '解除禁言',
        content: msg,
        confirmColor: '#6c5ce7',
        success: async (res) => {
          if (!res.confirm) return
          this.showHud('处理中...')
          try {
            const r = await request('groups.php', {
              action: 'mute_member',
              group_id: this.currentGroup.id,
              user_id: row.user_id,
              mute_hours: hours
            }, { method: 'POST', baseURL: bmsBaseUrl })
            this.hideHud()
            if (r.status === 'success') {
              this.toast(hours > 0 ? '禁言成功' : '已解除禁言')
              this.showMembers(this.currentGroup)
            } else {
              this.toast(r.msg || '操作失败')
            }
          } catch (e) {
            this.hideHud()
            this.toast('网络错误')
          }
        }
      })
    },

    async kickMember(row) {
      const name = row.nickname || row.name || row.username || ('uid:' + row.user_id)
      uni.showModal({
        title: '移出成员',
        content: `确定将 ${name} 移出群聊吗？`,
        confirmColor: '#e74c3c',
        success: async (res) => {
          if (!res.confirm) return
          this.showHud('处理中...')
          try {
            const r = await request('groups.php', {
              action: 'kick_member',
              group_id: this.currentGroup.id,
              user_id: row.user_id
            }, { method: 'POST', baseURL: bmsBaseUrl })
            this.hideHud()
            if (r.status === 'success') {
              this.toast('已移出')
              this.showMembers(this.currentGroup)
            } else {
              this.toast(r.msg || '操作失败')
            }
          } catch (e) {
            this.hideHud()
            this.toast('网络错误')
          }
        }
      })
    },

    async dissolveGroup(item) {
      uni.showModal({
        title: '解散群聊',
        content: `确定解散"${item.name || ('群聊 #' + item.id)}"吗？此操作会删除群成员、消息和申请记录。`,
        confirmColor: '#e74c3c',
        success: async (res) => {
          if (!res.confirm) return
          this.showHud('解散中...')
          try {
            const r = await request('groups.php', {
              action: 'dissolve_group',
              group_id: item.id
            }, { method: 'POST', baseURL: bmsBaseUrl })
            this.hideHud()
            if (r.status === 'success') {
              this.toast('群聊已解散')
              this.loadGroups()
            } else {
              this.toast(r.msg || '解散失败')
            }
          } catch (e) {
            this.hideHud()
            this.toast('网络错误')
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.chat-page { display: flex; flex-direction: column; height: 100vh; background: #f5f6fa; }

.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f5f6fa; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 搜索栏 */
.search-bar { 
  display: flex; gap: 16rpx; padding: 24rpx; 
  background: #fff; border-bottom: 1rpx solid #f0f0f0;
}
.search-box { 
  flex: 1; height: 80rpx; background: #f5f6fa; border-radius: 40rpx; 
  display: flex; align-items: center; padding: 0 28rpx; gap: 12rpx;
}
.search-icon-img { width: 32rpx; height: 32rpx; display: block; }
.search-input { flex: 1; font-size: 28rpx; color: #333; }
.search-btn { 
  height: 80rpx; padding: 0 32rpx; background: #6c5ce7; border-radius: 40rpx; 
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600; color: #fff;
}

/* 列表 */
.list { padding: 20rpx 24rpx; }
.list-item { 
  background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); border: 1rpx solid #f0f0f0;
}

.item-header { display: flex; align-items: center; gap: 20rpx; }
.item-avatar { width: 88rpx; height: 88rpx; border-radius: 16rpx; background: #f0f0f0; }
.item-info { flex: 1; }
.item-name { font-size: 30rpx; font-weight: 700; color: #1f2937; display: block; }
.item-meta { font-size: 24rpx; color: #9ca3af; margin-top: 6rpx; display: block; }
.expand-icon { font-size: 36rpx; color: #ccc; transition: transform 0.3s; }
.expand-icon.expanded { transform: rotate(90deg); color: #6c5ce7; }

.item-detail { 
  padding: 20rpx 0; margin-top: 16rpx; border-top: 1rpx solid #f5f6fa;
  display: none;
}
.list-item:has(.expanded) .item-detail { display: block; }

.detail-row { display: flex; align-items: flex-start; margin-bottom: 12rpx; gap: 16rpx; }
.detail-label { font-size: 24rpx; color: #9ca3af; min-width: 100rpx; }
.detail-value { font-size: 26rpx; color: #374151; }
.detail-value.small { font-size: 24rpx; color: #6b7280; }
.tags-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 12rpx 0; }
.tag { 
  font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; 
  background: #f0f0ff; color: #6c5ce7; font-weight: 600;
}
.tag.danger { background: #fff0f0; color: #e74c3c; }

.item-actions { 
  display: flex; gap: 12rpx; flex-wrap: wrap;
  padding-top: 20rpx; border-top: 1rpx solid #f5f6fa;
}
.action-btn { 
  flex: 1; min-width: 120rpx; height: 72rpx; border-radius: 16rpx;
  background: #f5f6fa; display: flex; align-items: center; justify-content: center; gap: 8rpx;
  font-size: 26rpx; font-weight: 500; color: #4b5563; transition: all 0.2s;
}
.action-btn:active { transform: scale(0.98); background: #eee; }
.action-btn.danger { background: #fff0f0; color: #e74c3c; }
.action-btn.danger:active { background: #ffe0e0; }
.action-icon-img { width: 36rpx; height: 36rpx; display: block; }

/* 空状态 */
.empty-state { 
  display: flex; flex-direction: column; align-items: center; justify-content: center; 
  padding: 120rpx 0; color: #9ca3af;
}
.empty-state.small { padding: 60rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 28rpx; }

/* 加载中 */
.loading-state { 
  display: flex; flex-direction: column; align-items: center; justify-content: center; 
  padding: 60rpx 0; color: #9ca3af; gap: 16rpx;
}
.spinner { 
  width: 48rpx; height: 48rpx; border: 4rpx solid #e0e0e0; 
  border-top-color: #6c5ce7; border-radius: 50%; 
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.footer-space { height: 60rpx; }

/* 弹窗 */
.modal-mask { 
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 40rpx;
}
.modal-content { 
  background: #fff; border-radius: 32rpx; width: 100%; max-height: 80vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.modal-content.large { max-width: 960rpx; }
.modal-header { 
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: 700; color: #1f2937; }
.modal-close { font-size: 48rpx; color: #ccc; line-height: 1; }
.modal-scroll { flex: 1; overflow-y: auto; padding: 24rpx; }

/* 成员列表 */
.member-list { display: flex; flex-direction: column; gap: 16rpx; }
.member-item { 
  display: flex; align-items: center; gap: 20rpx; padding: 20rpx;
  background: #fafbfc; border-radius: 16rpx;
}
.member-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #eee; }
.member-info { flex: 1; }
.member-name-row { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.member-name { font-size: 28rpx; font-weight: 600; color: #1f2937; }
.role-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 10rpx; font-weight: 600; }
.role-tag.role-owner { background: #fff0f0; color: #e74c3c; }
.role-tag.role-admin { background: #fff8e0; color: #f39c12; }
.role-tag.role-member { background: #f0f0f0; color: #666; }
.status-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 10rpx; background: #f5f5f5; color: #999; }
.member-id { font-size: 22rpx; color: #9ca3af; display: block; margin-top: 4rpx; }
.member-mute { font-size: 22rpx; color: #e74c3c; display: block; margin-top: 4rpx; }
.member-actions { display: flex; gap: 10rpx; }
.member-op-hint { font-size: 22rpx; color: #ccc; }

.small-btn { 
  font-size: 22rpx; padding: 8rpx 20rpx; border-radius: 10rpx;
  background: #f0f0f0; color: #666; font-weight: 500;
}
.small-btn:active { background: #e0e0e0; }
.small-btn.danger { background: #fff0f0; color: #e74c3c; }
.small-btn.success { background: #f0fff0; color: #27ae60; }

/* 申请列表 */
.request-list { display: flex; flex-direction: column; gap: 16rpx; }
.request-item { 
  padding: 20rpx; background: #fafbfc; border-radius: 16rpx;
}
.request-user { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.request-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #eee; }
.request-info { flex: 1; }
.request-name { font-size: 28rpx; font-weight: 600; color: #1f2937; display: block; }
.request-id { font-size: 22rpx; color: #9ca3af; }
.request-msg { margin-bottom: 12rpx; }
.request-label { font-size: 22rpx; color: #9ca3af; margin-right: 8rpx; }
.request-text { font-size: 24rpx; color: #4b5563; }
.request-status { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 10rpx; font-weight: 600; }
.status-badge.status-pending { background: #fff8e0; color: #f39c12; }
.status-badge.status-approved { background: #f0fff0; color: #27ae60; }
.status-badge.status-rejected { background: #f5f5f5; color: #999; }
.request-time { font-size: 22rpx; color: #9ca3af; }
.request-actions { display: flex; gap: 12rpx; }
.request-reviewer { font-size: 22rpx; color: #9ca3af; }

/* 消息列表 */
.message-list { display: flex; flex-direction: column; gap: 16rpx; }
.message-item { 
  padding: 20rpx; background: #fafbfc; border-radius: 16rpx;
  border-left: 6rpx solid #e0e0e0;
}
.message-item:first-child { border-left-color: #6c5ce7; }
.msg-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.msg-sender { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.msg-time { font-size: 22rpx; color: #9ca3af; }
.msg-tags { display: flex; gap: 10rpx; margin-bottom: 10rpx; }
.msg-type-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; background: #f0f0f0; color: #666; }
.msg-recall-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; background: #fff8e0; color: #f39c12; }
.msg-content { font-size: 26rpx; color: #374151; line-height: 1.5; word-break: break-all; }
.msg-recall { font-size: 26rpx; color: #ccc; font-style: italic; }

/* Toast */
.hud-mask { 
  position: fixed; inset: 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center;
}
.hud-toast { 
  padding: 24rpx 48rpx; background: rgba(0,0,0,0.75); border-radius: 16rpx;
  display: flex; align-items: center; gap: 16rpx;
  font-size: 28rpx; color: #fff;
}
.hud-toast .spinner { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
</style>
