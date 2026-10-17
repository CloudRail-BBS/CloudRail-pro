<template>
  <view class="comment-list-wrap" :class="themeClass">
    <view v-if="loading" class="comment-loading">
      <text>评论加载中...</text>
    </view>

    <view
      v-else-if="comments.length > 0"
      class="comment-list"
      :class="{ 'drawer-comment-list': inDrawer }"
    >
      <view
        v-for="item in comments"
        :key="'cl-' + item.id"
        class="comment-item"
      >
        <image
          class="comment-avatar"
          :src="item.avatar || '/static/logo.png'"
          mode="scaleToFill"
          @tap="$emit('user-home', item.user_id)"
        ></image>

        <view class="comment-main">
          <view class="comment-head">
            <view class="comment-name-line">
              <text class="comment-name" @tap="$emit('user-home', item.user_id)">
                {{ item.name || item.username || '匿名' }}
              </text>

              <text
                v-if="postInfo && String(item.user_id) === String(postInfo.user_id)"
                class="badge author"
              >作者</text>

              <text v-if="parseInt(item.is_pinned) === 1" class="badge pinned">置顶</text>

              <text
                v-if="botUserId && String(item.user_id) === String(botUserId)"
                class="badge ai-bot"
              >智能机器人</text>

              <template v-if="!inDrawer">
                <text v-if="parseInt(item.status) === 0" class="badge banned">已屏蔽</text>
                <text v-if="parseInt(item.status) === 2" class="badge pending">待审</text>
              </template>
            </view>

            <text
              v-if="!inDrawer && isOwner && String(item.parent_id) === '0'"
              class="pin-btn"
              @tap="$emit('toggle-pin', item)"
            >
              {{ pinLoadingId === item.id ? '处理中' : (parseInt(item.is_pinned) === 1 ? '取消置顶' : '置顶') }}
            </text>
          </view>

          <view class="comment-bubble" @tap="$emit('reply-target', item)">
            <template v-for="(n, ni) in parseRichTextToNodes(item.content)">
              <text
                v-if="n.type === 'text'"
                :key="'ct-' + item.id + '-' + ni"
                class="comment-text"
              >{{ n.text }}</text>
              <text
                v-else-if="n.type === 'link'"
                :key="'cl-' + item.id + '-' + ni"
                class="comment-link"
                @tap.stop="$emit('open-link', n.url)"
              >{{ n.text }}</text>
              <text
                v-else-if="n.type === 'mention'"
                :key="'cm-' + item.id + '-' + ni"
                class="comment-mention"
                @tap.stop="$emit('user-home', n.userId)"
              >{{ n.text }}</text>
            </template>
          </view>

          <view class="comment-actions">
            <text class="comment-time">{{ formatTime(item.create_time) }}</text>
            <text class="comment-reply" @tap.stop="$emit('reply-target', item)">回复</text>
            <text
              v-if="canDelete(item)"
              class="comment-delete"
              @tap.stop="$emit('delete-ask', item.id)"
            >删除</text>
          </view>

          <view
            v-if="item.children && item.children.length > 0"
            class="sub-comment-list"
          >
            <view
              v-for="sub in getVisibleChildren(item)"
              :key="'sub-' + sub.id"
              class="sub-comment-item"
              @tap="$emit('reply-target', sub)"
            >
              <view class="sub-comment-head">
                <text class="sub-name" @tap.stop="$emit('user-home', sub.user_id)">
                  {{ sub.name || sub.username || '匿名' }}
                </text>
                <text v-if="sub.reply_to_name" class="reply-to"> 回复 </text>
                <text
                  v-if="sub.reply_to_name"
                  class="sub-name"
                  @tap.stop="$emit('user-home', sub.reply_to_user_id)"
                >{{ sub.reply_to_name }}</text>
              </view>

              <view class="sub-comment-content">
                <template v-for="(n, ni) in parseRichTextToNodes(sub.content)">
                  <text
                    v-if="n.type === 'text'"
                    :key="'st-' + sub.id + '-' + ni"
                    class="comment-text"
                  >{{ n.text }}</text>
                  <text
                    v-else-if="n.type === 'link'"
                    :key="'sl-' + sub.id + '-' + ni"
                    class="comment-link"
                    @tap.stop="$emit('open-link', n.url)"
                  >{{ n.text }}</text>
                  <text
                    v-else-if="n.type === 'mention'"
                    :key="'sm-' + sub.id + '-' + ni"
                    class="comment-mention"
                    @tap.stop="$emit('user-home', n.userId)"
                  >{{ n.text }}</text>
                </template>
              </view>

              <view class="sub-actions">
                <text>{{ formatTime(sub.create_time) }}</text>
                <text @tap.stop="$emit('reply-target', sub)">回复</text>
                <text
                  v-if="canDelete(sub)"
                  class="comment-delete"
                  @tap.stop="$emit('delete-ask', sub.id)"
                >删除</text>
              </view>
            </view>

            <view
              v-if="shouldShowReplyToggle(item)"
              class="reply-toggle"
              @tap="toggleReplies(item)"
            >
              <text>{{ getReplyToggleText(item) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-comment">
      <text>暂时还没有人评论哦~</text>
    </view>
  </view>
</template>

<script>
import { formatTime, parseRichTextToNodes } from '../common/postUtils.js'

export default {
  name: 'PostCommentList',

  props: {
    comments: { type: Array, default: () => [] },
    postInfo: { type: Object, default: null },
    userInfo: { type: Object, default: null },
    isOwner: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    pinLoadingId: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    inDrawer: { type: Boolean, default: false },
    botUserId: { type: [Number, String], default: 0 }
  },

  emits: ['reply-target', 'delete-ask', 'toggle-pin', 'user-home', 'open-link'],

  data() {
    return {
      collapsedReplyMap: {}
    }
  },

  methods: {
    formatTime,
    parseRichTextToNodes,

    canDelete(item) {
      return !!(
        this.userInfo &&
        item &&
        (
          String(item.user_id) === String(this.userInfo.id) ||
          this.isAdmin ||
          this.isOwner
        )
      )
    },

    shouldShowReplyToggle(item) {
      return !!(item && item.children && item.children.length > 2)
    },

    getVisibleChildren(item) {
      if (!item || !item.children) return []
      if (!this.shouldShowReplyToggle(item)) return item.children
      const collapsed = this.collapsedReplyMap[item.id] !== false
      return collapsed ? item.children.slice(0, 2) : item.children
    },

    getReplyToggleText(item) {
      if (!this.shouldShowReplyToggle(item)) return ''
      const collapsed = this.collapsedReplyMap[item.id] !== false
      return collapsed ? `展开 ${item.children.length - 2} 条回复` : '收起回复'
    },

    toggleReplies(item) {
      if (!item || !item.id) return
      const collapsed = this.collapsedReplyMap[item.id] !== false
      this.$set(this.collapsedReplyMap, item.id, !collapsed)
    }
  }
}
</script>

<style scoped>
.comment-list {
  background: var(--cr-surface);
  border-radius: 24rpx;
  padding: 6rpx 20rpx;
}

.drawer-comment-list {
  border-radius: 0;
  padding: 0;
}

.comment-loading,
.empty-comment {
  background: var(--cr-surface);
  border-radius: 24rpx;
  padding: 60rpx 30rpx;
  text-align: center;
}

.comment-loading text,
.empty-comment text {
  color: var(--cr-text-muted);
  font-size: 25rpx;
}

.comment-item {
  display: flex;
  padding: 24rpx 0;
}

.comment-item + .comment-item {
  border-top: 1rpx solid #f0f1f4;
}

.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #eee;
}

.comment-main {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}

.comment-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-name-line {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.comment-name {
  color: #555;
  font-size: 26rpx;
  font-weight: 600;
  max-width: 260rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  margin-left: 8rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  line-height: 1.5;
}

.badge.author {
  color: #2563eb;
  background: rgba(59, 130, 246, 0.12);
}

.badge.pinned {
  color: #a16207;
  background: rgba(250, 204, 21, 0.18);
}

.badge.banned {
  color: #e11d48;
  background: rgba(255, 77, 109, 0.12);
}

.badge.pending {
  color: #d97706;
  background: rgba(255, 159, 67, 0.14);
}

.badge.ai-bot {
  color: #7c3aed;
  background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.15));
  font-weight: 600;
}

.pin-btn {
  margin-left: 12rpx;
  color: #3b82f6;
  font-size: 22rpx;
  flex-shrink: 0;
}

.comment-bubble {
  display: inline-block;
  max-width: 100%;
  margin-top: 10rpx;
  border-radius: 18rpx;
  background: #f6f7fb;
  padding: 16rpx 18rpx;
  word-break: break-word;
  white-space: pre-wrap;
}

.comment-text,
.comment-link,
.comment-mention {
  font-size: 28rpx;
  line-height: 1.8;
}

.comment-text { color: var(--cr-text); }
.comment-link { color: #3b82f6; }
.comment-mention { color: #7c3aed; }

.comment-actions {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.comment-time,
.comment-reply,
.comment-delete {
  color: var(--cr-text-muted);
  font-size: 22rpx;
  margin-right: 24rpx;
}

.comment-delete { color: #ff2442; }

.sub-comment-list {
  margin-top: 16rpx;
  padding-left: 12rpx;
  border-left: 4rpx solid #f1f2f4;
}

.sub-comment-item { padding: 14rpx 0; }

.sub-comment-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.sub-name {
  color: #555;
  font-size: 24rpx;
  font-weight: 600;
}

.reply-to {
  color: var(--cr-text-muted);
  font-size: 22rpx;
  margin: 0 8rpx;
}

.sub-comment-content {
  margin-top: 8rpx;
  border-radius: 16rpx;
  background: var(--cr-surface-alt);
  padding: 14rpx 16rpx;
  word-break: break-word;
  white-space: pre-wrap;
}

.sub-actions {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
}

.sub-actions text {
  color: var(--cr-text-muted);
  font-size: 21rpx;
  margin-right: 22rpx;
}

.reply-toggle { padding: 12rpx 0 4rpx; }

.reply-toggle text {
  color: #3b82f6;
  font-size: 23rpx;
}
</style>
