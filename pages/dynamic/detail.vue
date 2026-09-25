<template>
  <view class="detail-container">
    <!-- 自定义导航栏 -->
    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <view class="nav-title-wrap">
        <text class="nav-title">动态详情</text>
      </view>
      <view class="nav-right">
        <text v-if="detail && (detail.is_own || isAdmin)" class="nav-menu-icon" @click="showMenu">⋯</text>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <!-- 加载中 -->
    <view class="loading-wrap" v-if="loading">
      <view class="loading-dot"></view>
      <text class="loading-txt">加载中...</text>
    </view>

    <!-- 内容区 -->
    <view v-else-if="detail" class="detail-content">
      <!-- 用户头部 -->
      <view class="user-header">
        <view class="user-avatar-wrap">
          <image :src="detail.avatar || '/static/logo.png'" class="user-avatar" mode="aspectFill" @click="goUser"></image>
          <image v-if="detail.frame_img" :src="detail.frame_img" class="user-avatar-frame" mode="aspectFit"></image>
        </view>
        <view class="user-info">
          <view class="name-row">
            <text class="user-name">{{ detail.name || detail.username || '用户' }}</text>
            <text class="user-time">{{ formatTime(detail.created_at) }}</text>
          </view>
          <text class="user-signature" v-if="detail.personal_signature">{{ detail.personal_signature }}</text>
        </view>
        <view class="follow-btn" v-if="!detail.is_own" :class="{ followed: detail.is_followed }" @click="toggleFollow">
          <text class="follow-text">{{ detail.is_followed ? '已关注' : '+ 关注' }}</text>
        </view>
      </view>

      <!-- 图片轮播 -->
      <view class="image-swiper-wrap" v-if="detail.images && detail.images.length > 0">
        <swiper
          class="image-swiper"
          :style="{ height: swiperHeight + 'px' }"
          :indicator-dots="false"
          :autoplay="false"
          :circular="false"
          @change="onSwiperChange"
        >
          <swiper-item v-for="(img, idx) in detail.images" :key="idx">
            <view class="swiper-image-clip">
            <image
              :src="img"
              class="swiper-image"
              mode="widthFix"
              @click="previewImage(idx)"
              @load="onImageLoad($event, idx)"
            ></image>
            </view>
          </swiper-item>
        </swiper>
        <view class="swiper-indicator" v-if="detail.images.length > 1">
          <text class="indicator-text">{{ currentImageIdx + 1 }}/{{ detail.images.length }}</text>
        </view>
      </view>

      <!-- 标题 -->
      <view class="detail-title" v-if="detail.title">
        <text class="title-text">{{ detail.title }}</text>
      </view>

      <!-- 内容 -->
      <view class="detail-content-text" v-if="detail.content">
        <text class="content-text">
          <text v-for="(seg, si) in parseContent(detail.content)" :key="si" :class="seg.type === 'topic' ? 'inline-topic' : ''" @click="seg.type === 'topic' ? goTopic(0, seg.value) : null">{{ seg.type === 'topic' ? '#' + seg.value : seg.value }}</text>
        </text>
      </view>

      <!-- 话题标签 -->
      <view class="detail-tags" v-if="detail.topics && detail.topics.length > 0">
        <view class="topic-tag" v-for="(t, ti) in detail.topics" :key="ti" @click="goTopic(t.id, t.name)">
          <text class="topic-tag-text">#{{ t.name }}</text>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comment-section">
        <view class="comment-header">
          <text class="comment-header-title">评论 {{ detail.comment_count || '' }}</text>
        </view>

        <view class="comment-list" v-if="comments.length > 0">
          <view class="comment-item" v-for="cm in comments" :key="cm.id">
            <image :src="cm.avatar || '/static/logo.png'" class="cm-avatar" mode="aspectFill"></image>
            <view class="cm-body">
              <text class="cm-name">{{ cm.name || cm.username || '用户' }}</text>
              <text class="cm-content">{{ cm.content }}</text>
              <view class="cm-footer">
                <text class="cm-time">{{ formatTime(cm.created_at) }}</text>
                <text class="cm-reply-btn" @click="setReply(cm)">回复</text>
              </view>
              <!-- 子评论（抖音风格：默认收缩，点击展开显示3条，更多查看更多回复） -->
              <view class="sub-comments" v-if="cm.replies && cm.replies.length > 0">
                <view class="sub-comment-item" v-for="reply in getVisibleReplies(cm)" :key="reply.id">
                  <image :src="reply.avatar || '/static/logo.png'" class="sub-avatar" mode="aspectFill"></image>
                  <view class="sub-body">
                    <text class="sub-name">{{ reply.name || reply.username || '用户' }}</text>
                    <text class="sub-content" v-if="reply.reply_to_name">回复 @{{ reply.reply_to_name }}：{{ reply.content }}</text>
                    <text class="sub-content" v-else>{{ reply.content }}</text>
                    <view class="cm-footer">
                      <text class="cm-time">{{ formatTime(reply.created_at) }}</text>
                      <text class="cm-reply-btn" @click="setReply(reply, cm)">回复</text>
                    </view>
                  </view>
                </view>
                <view class="reply-toggle" @click="toggleReplies(cm)">
                  <text class="reply-toggle-text">{{ getReplyToggleText(cm) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="comment-empty" v-else>
          <text class="comment-empty-text">还没有评论，快来抢沙发~</text>
        </view>
      </view>
    </view>

    <!-- 不存在 -->
    <view class="not-found" v-else-if="!loading">
      <text class="not-found-text">动态不存在或已删除</text>
    </view>

    <!-- 底部交互栏 -->
    <view class="bottom-bar" v-if="detail" :style="{ bottom: keyboardHeight + 'px', paddingBottom: '12rpx' }">
      <view class="reply-indicator" v-if="replyToName" @click="cancelReply">
        <text class="reply-indicator-text">回复 @{{ replyToName }}</text>
        <text class="reply-cancel">取消</text>
      </view>
      <view class="bar-row">
        <view class="bar-input-wrap">
          <input
            class="bar-input"
            v-model="commentText"
            :focus="commentFocus"
            @blur="commentFocus = false"
            :placeholder="replyToName ? `回复 @${replyToName}` : '说点什么…'"
            placeholder-class="bar-placeholder"
            confirm-type="send"
            :adjust-position="false"
            :cursor-spacing="20"
            @confirm="sendComment"
          />
        </view>
        <view class="bar-actions">
          <view class="bar-action view-stat">
            <view class="bar-icon-wrap">
              <image src="/static/tab/ydl.png" class="bar-icon-img" mode="aspectFit"></image>
            </view>
            <text class="bar-num">{{ detail.view_count || 0 }}</text>
          </view>
          <view class="bar-action" @click="onLike">
            <view class="bar-icon-wrap" :class="{ 'liked-bg': detail.is_liked }">
              <image class="bar-icon-img" :src="detail.is_liked ? '/static/post/xih1.png' : '/static/post/xih0.png'" mode="aspectFit"></image>
            </view>
            <text class="bar-num" :class="{ 'liked-text': detail.is_liked }" v-if="detail.like_count">{{ detail.like_count }}</text>
          </view>
        </view>
        <view class="bar-send" :class="{ disabled: !commentText.trim() }" @click="sendComment">
          <text>发送</text>
        </view>
      </view>
    </view>

    <!-- Toast -->
    <view class="toast" :class="{ show: toast.show }">
      <text>{{ toast.msg }}</text>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import { getScreenMetrics } from '../../common/screen.js'

export default {
  data() {
    return {
      statusBarHeight: 0,
      safeBottom: 0,
      dynamicId: 0,
      detail: null,
      loading: true,
      comments: [],
      currentImageIdx: 0,
      commentText: '',
      commentFocus: false,
      replyTo: 0,
      replyToName: '',
      toast: { show: false, msg: '' },
      toastTimer: null,
      likeLoading: false,  // 点赞防抖锁
      imageRatios: {},   // { idx: width/height }
      swiperHeight: 375,  // 默认高度（px），加载后调整
      keyboardHeight: 0,
      expandedReplyMap: {},
      fullyExpandedMap: {},
      isAdmin: false
    }
  },
  onLoad(options) {
    const metrics = getScreenMetrics()
    this.statusBarHeight = metrics.statusBarHeight
    this.safeBottom = (metrics.sys && metrics.sys.safeAreaInsets && metrics.sys.safeAreaInsets.bottom) || 0

    const u = uni.getStorageSync('userInfo')
    if (u) this.isAdmin = parseInt(u.is_admin) >= 1

    this.dynamicId = parseInt(options.id || options.dynamic_id || 0)
    if (!this.dynamicId) {
      this.loading = false
      return
    }
    this.loadDetail()
    this.loadComments()

    // 监听键盘高度变化，仅上移底部输入栏
    // H5端用visualViewport检测键盘，非H5端用uni.onKeyboardHeightChange
    // #ifdef H5
    if (window.visualViewport) {
      this._vpHandler = () => {
        this.keyboardHeight = Math.max(0, window.innerHeight - window.visualViewport.height)
      }
      window.visualViewport.addEventListener('resize', this._vpHandler)
    }
    // #endif

    // #ifndef H5
    if (typeof uni.onKeyboardHeightChange === 'function') {
      this._keyboardHandler = (res) => {
        this.keyboardHeight = (res && res.height) || 0
      }
      uni.onKeyboardHeightChange(this._keyboardHandler)
    }
    // #endif
  },
  onUnload() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
    // #ifdef H5
    if (this._vpHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this._vpHandler)
      this._vpHandler = null
    }
    // #endif
    // #ifndef H5
    if (this._keyboardHandler && typeof uni.offKeyboardHeightChange === 'function') {
      uni.offKeyboardHeightChange(this._keyboardHandler)
      this._keyboardHandler = null
    }
    // #endif
  },
  methods: {
    async loadDetail() {
      this.loading = true
      try {
        const res = await request('dynamic.php', {
          action: 'detail',
          dynamic_id: this.dynamicId
        }, 'GET')

        if (res.code === 0 && res.data) {
          // 把 author 对象里的字段合并到顶层，兼容前端模板
          const d = res.data
          if (d.author) {
            d.avatar = d.author.avatar || d.avatar
            d.nickname = d.author.nickname || d.nickname
            d.name = d.author.nickname || d.author.name || d.name
            d.username = d.author.username || d.username
            d.personal_signature = d.author.personal_signature || d.personal_signature
            d.frame_img = d.author.frame_img || d.frame_img
            d.uid = d.author.uid || d.uid
            d.user_id = d.author.uid || d.user_id
            d.is_followed = d.author.is_followed || false
          }
          this.detail = d
        } else {
          this.detail = null
        }
      } catch (e) {
        console.log('[detail] load error', e)
      } finally {
        this.loading = false
      }
    },

    async loadComments() {
      try {
        const res = await request('dynamic.php', {
          action: 'getComments',
          dynamic_id: this.dynamicId
        }, 'GET')

        if (res.code === 0) {
          this.comments = Array.isArray(res.data) ? res.data : []
        }
      } catch (e) {
        console.log('[detail] comments error', e)
      }
    },

    onSwiperChange(e) {
      this.currentImageIdx = e.detail.current
      this.updateSwiperHeight()
    },

    onImageLoad(e, idx) {
      const w = e.detail.width
      const h = e.detail.height
      if (w && h) {
        this.imageRatios[idx] = w / h
        if (idx === this.currentImageIdx) {
          this.updateSwiperHeight()
        }
      }
    },

    updateSwiperHeight() {
      const ratio = this.imageRatios[this.currentImageIdx]
      if (!ratio) return
      const metrics = getScreenMetrics()
      const screenWidth = (metrics.sys && metrics.sys.windowWidth) || uni.getSystemInfoSync().windowWidth || 375
      const screenHeight = (metrics.sys && metrics.sys.windowHeight) || uni.getSystemInfoSync().windowHeight || 667
      const naturalHeight = screenWidth / ratio
      const maxHeight = screenHeight * 0.6
      this.swiperHeight = Math.min(naturalHeight, maxHeight)
    },

    previewImage(idx) {
      if (!this.detail || !this.detail.images) return
      uni.previewImage({
        current: this.detail.images[idx],
        urls: this.detail.images
      })
    },

    async toggleFollow() {
      const u = uni.getStorageSync('userInfo')
      if (!u) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      if (!this.detail || this.detail.is_own) return

      const prevFollowed = this.detail.is_followed
      this.detail.is_followed = !prevFollowed

      try {
        const res = await request('user.php', {
          action: 'toggleFollow',
          targetId: this.detail.user_id
        }, 'POST')

        if (res.code === 0) {
          const data = res.data || {}
          if (typeof data.following !== 'undefined') {
            this.detail.is_followed = !!data.following
          } else if (data.status === 'followed') {
            this.detail.is_followed = true
          } else if (data.status === 'unfollowed') {
            this.detail.is_followed = false
          }
        } else {
          this.detail.is_followed = prevFollowed
        }
      } catch (e) {
        this.detail.is_followed = prevFollowed
      }
    },

    async onLike() {
      if (this.likeLoading) return  // 防抖：请求未完成时禁止再次点击
      const u = uni.getStorageSync('userInfo')
      if (!u) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      if (!this.detail) return
      try { uni.vibrateShort() } catch (e) {}

      const prevLiked = this.detail.is_liked
      const prevCount = Number(this.detail.like_count) || 0
      this.likeLoading = true
      // 乐观更新
      this.detail.is_liked = !prevLiked
      this.detail.like_count = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1

      try {
        const res = await request('dynamic.php', {
          action: 'like',
          id: this.dynamicId,
          dynamic_id: this.dynamicId
        }, 'POST')

        if (res.code === 0) {
          const data = res.data || {}
          if (typeof data.is_liked !== 'undefined') this.detail.is_liked = !!data.is_liked
          else if (typeof data.status !== 'undefined') this.detail.is_liked = !!data.status
          else if (typeof data.liked !== 'undefined') this.detail.is_liked = !!data.liked
          if (typeof data.like_count !== 'undefined') this.detail.like_count = Number(data.like_count) || 0
          else if (typeof data.likes !== 'undefined') this.detail.like_count = Number(data.likes) || 0
        } else {
          // 点赞失败，回滚状态
          this.detail.is_liked = prevLiked
          this.detail.like_count = prevCount
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        this.detail.is_liked = prevLiked
        this.detail.like_count = prevCount
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        this.likeLoading = false
      }
    },

    async sendComment() {
      const u = uni.getStorageSync('userInfo')
      if (!u) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      const text = (this.commentText || '').trim()
      if (!text || !this.detail) return

      try {
        const res = await request('dynamic.php', {
          action: 'addComment',
          dynamic_id: this.dynamicId,
          content: text,
          parent_id: this.replyTo
        }, 'POST')

        if (res.code === 0) {
          const newComment = {
            id: res.data.id,
            user_id: res.data.user_id,
            content: res.data.content,
            name: res.data.name,
            username: res.data.username,
            avatar: res.data.avatar,
            created_at: ''
          }

          if (this.replyTo > 0 && res.data.parent_id) {
            const parent = this.comments.find(c => c.id === res.data.parent_id)
            if (parent) {
              if (!parent.replies) parent.replies = []
              newComment.reply_to_name = res.data.reply_to_name
              parent.replies.push(newComment)
            }
            this.cancelReply()
          } else {
            newComment.replies = []
            this.comments.push(newComment)
          }

          this.detail.comment_count = (this.detail.comment_count || 0) + 1
          this.commentText = ''
          uni.hideKeyboard()
        } else {
          this.showToast(res.msg || '评论失败')
        }
      } catch (e) {
        this.showToast('网络异常')
      }
    },

    setReply(comment, parent) {
      const parentId = parent ? parent.id : comment.id
      const name = comment.name || comment.username || '用户'
      this.replyTo = parentId
      this.replyToName = name
      this.commentFocus = false
      this.$nextTick(() => {
        this.commentFocus = true
      })
    },

    getVisibleReplies(cm) {
      if (!cm || !cm.replies || cm.replies.length === 0) return []
      const expanded = this.expandedReplyMap[cm.id] === true
      if (!expanded) return []
      const fullyExpanded = this.fullyExpandedMap[cm.id] === true
      if (fullyExpanded || cm.replies.length <= 3) return cm.replies
      return cm.replies.slice(0, 3)
    },

    getReplyToggleText(cm) {
      if (!cm || !cm.replies || cm.replies.length === 0) return ''
      const expanded = this.expandedReplyMap[cm.id] === true
      if (!expanded) return `展开 ${cm.replies.length} 条回复`
      const fullyExpanded = this.fullyExpandedMap[cm.id] === true
      if (!fullyExpanded && cm.replies.length > 3) {
        return `查看更多回复（${cm.replies.length - 3}条）`
      }
      return '收起回复'
    },

    toggleReplies(cm) {
      if (!cm || !cm.id) return
      const id = cm.id
      const expanded = this.expandedReplyMap[id] === true
      const fullyExpanded = this.fullyExpandedMap[id] === true
      if (!expanded) {
        this.$set(this.expandedReplyMap, id, true)
      } else if (!fullyExpanded && cm.replies.length > 3) {
        this.$set(this.fullyExpandedMap, id, true)
      } else {
        this.$set(this.expandedReplyMap, id, false)
        this.$set(this.fullyExpandedMap, id, false)
      }
    },

    cancelReply() {
      this.replyTo = 0
      this.replyToName = ''
    },

    goUser() {
      if (!this.detail || !this.detail.user_id) return
      uni.navigateTo({ url: `/pages/user/profile?userId=${this.detail.user_id}` })
    },

    goTopic(tid, name) {
      if (!name) return
      uni.navigateTo({ url: `/pages/dynamic/topic-result?name=${encodeURIComponent(name)}` })
    },

    parseContent(content) {
      if (!content) return []
      const segments = []
      const regex = /#([^\s#]{1,12})/g
      let lastIndex = 0
      let match
      while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ type: 'text', value: content.slice(lastIndex, match.index) })
        }
        segments.push({ type: 'topic', value: match[1] })
        lastIndex = regex.lastIndex
      }
      if (lastIndex < content.length) {
        segments.push({ type: 'text', value: content.slice(lastIndex) })
      }
      return segments
    },

    goBack() {
      uni.navigateBack()
    },

    showMenu() {
      const isOwn = this.detail && this.detail.is_own
      const items = isOwn ? ['编辑动态', '删除动态'] : ['删除动态']
      uni.showActionSheet({
        itemList: items,
        success: (res) => {
          if (isOwn && res.tapIndex === 0) this.editDynamic()
          else if ((!isOwn && res.tapIndex === 0) || (isOwn && res.tapIndex === 1)) this.confirmDelete()
        }
      })
    },

    confirmDelete() {
      uni.showModal({
        title: '提示',
        content: '确定删除这条动态吗？',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('dynamic.php', {
              action: 'delete',
              dynamic_id: this.dynamicId
            }, 'POST')
            if (res.code === 0) {
              uni.showToast({ title: '已删除', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 800)
            } else {
              this.showToast(res.msg || '删除失败')
            }
          } catch (e) {
            this.showToast('网络异常')
          }
        }
      })
    },

    editDynamic() {
      if (!this.detail) return
      uni.setStorageSync('editDynamic', JSON.stringify(this.detail))
      uni.navigateTo({ url: '/pages/dynamic/publish?edit=1' })
    },

    formatTime(t) {
      if (!t) return ''
      const d = new Date(t.replace(/-/g, '/'))
      const now = new Date()
      const diff = (now - d) / 1000
      if (diff < 60) return '刚刚'
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
      if (diff < 2592000) return Math.floor(diff / 86400) + '天前'
      const md = `${d.getMonth() + 1}月${d.getDate()}日`
      return md
    },

    showToast(msg) {
      this.toast.msg = msg
      this.toast.show = true
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast.show = false }, 1800)
    }
  }
}
</script>

<style scoped>
.detail-container {
  min-height: 100vh;
  background: #f5f5f5;
  overflow-x: hidden;
}

/* 导航栏 */
.custom-nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: #fff;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
  box-shadow: 0 1rpx 0 rgba(0,0,0,0.05);
}
.nav-back {
  width: 60rpx;
  display: flex;
  align-items: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: #333;
  line-height: 1;
}
.nav-title-wrap {
  flex: 1;
  text-align: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.nav-right {
  width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.nav-menu-icon {
  font-size: 44rpx;
  color: #333;
  line-height: 1;
  padding: 0 10rpx;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 12rpx;
}
.loading-dot {
  width: 28rpx; height: 28rpx;
  border-radius: 50%;
  border: 3rpx solid #EBEBEB;
  border-top-color: #4A7FE0;
  animation: spin 0.8s linear infinite;
}
.loading-txt { font-size: 24rpx; color: #AAB0BB; }

/* 详情内容 */
.detail-content {
  background: #fff;
  margin-bottom: 120rpx;
}

/* 用户头部 */
.user-header {
  display: flex;
  align-items: center;
  padding: 24rpx;
}
.user-avatar-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}
.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f5f5f5;
}
.user-avatar-frame {
  position: absolute;
  top: -14rpx;
  left: -14rpx;
  width: 108rpx;
  height: 108rpx;
  pointer-events: none;
}
.user-info {
  flex: 1;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.user-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}
.user-time {
  font-size: 22rpx;
  color: #999;
}
.user-signature {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.follow-btn {
  padding: 10rpx 28rpx;
  background: #4A7FE0;
  border-radius: 28rpx;
}
.follow-btn.followed {
  background: #f0f0f0;
}
.follow-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
}
.follow-btn.followed .follow-text {
  color: #999;
}

/* 图片轮播 */
.image-swiper-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.image-swiper {
  width: 100%;
  overflow: hidden;
  background: transparent;
  transition: height 0.2s ease;
}
.swiper-image-clip {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.swiper-image {
  width: 100%;
  display: block;
}
.swiper-indicator {
  position: absolute;
  bottom: 24rpx;
  right: 24rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 20rpx;
  padding: 6rpx 20rpx;
  z-index: 10;
}
.indicator-text {
  font-size: 24rpx;
  color: #fff;
}

/* 标题 */
.detail-title {
  padding: 24rpx;
}
.title-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.5;
  word-break: break-all;
}

/* 内容 */
.detail-content-text {
  padding: 0 24rpx 20rpx;
}
.content-text {
  font-size: 30rpx;
  color: #444;
  line-height: 1.7;
  word-break: break-all;
}
.inline-topic {
  color: #2b6cb0;
}

/* 话题标签 */
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 0 24rpx 24rpx;
}
.topic-tag {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: #EBF2FF;
  border-radius: 20rpx;
}
.topic-tag-text {
  font-size: 24rpx;
  color: #4A7FE0;
  font-weight: 500;
}

/* 评论区 */
.comment-section {
  padding: 0 24rpx;
  margin-top: 8rpx;
}
.comment-header {
  padding: 24rpx 0 16rpx;
  border-top: 1rpx solid #f0f0f0;
}
.comment-header-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.comment-list {
  padding-bottom: 20rpx;
}
.comment-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.cm-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f5f5f5;
}
.cm-body {
  flex: 1;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.cm-name {
  font-size: 26rpx;
  color: #4A7FE0;
  font-weight: 500;
  margin-bottom: 6rpx;
}
.cm-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  word-break: break-all;
}
.cm-time {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
}
.cm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}
.cm-reply-btn {
  font-size: 24rpx;
  color: #4A7FE0;
  font-weight: 500;
}

/* 子评论 */
.sub-comments {
  margin-top: 16rpx;
  padding: 8rpx 0 8rpx 0;
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
}
.sub-comment-item {
  display: flex;
  padding: 12rpx 0;
}
.sub-comment-item + .sub-comment-item {
  border-top: 1rpx solid #f0f0f0;
}
.reply-toggle {
  padding: 12rpx 0 4rpx;
}
.reply-toggle-text {
  font-size: 24rpx;
  color: #4A7FE0;
  font-weight: 500;
}
.sub-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f5f5f5;
}
.sub-body {
  flex: 1;
  margin-left: 12rpx;
  display: flex;
  flex-direction: column;
}
.sub-name {
  font-size: 24rpx;
  color: #4A7FE0;
  font-weight: 500;
  margin-bottom: 4rpx;
}
.sub-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
  word-break: break-all;
}
.comment-empty {
  padding: 40rpx 0;
  text-align: center;
}
.comment-empty-text {
  font-size: 26rpx;
  color: #999;
}

/* 不存在 */
.not-found {
  padding: 120rpx 0;
  text-align: center;
}
.not-found-text {
  font-size: 28rpx;
  color: #999;
}

/* 底部栏 */
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding: 12rpx 24rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);
  z-index: 90;
}
.reply-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0 12rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.reply-indicator-text {
  font-size: 24rpx;
  color: #4A7FE0;
}
.reply-cancel {
  font-size: 24rpx;
  color: #999;
}
.bar-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20rpx;
}
.bar-input-wrap {
  width: 360rpx;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
}
.bar-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  color: #333;
}
.bar-placeholder { color: #bbb; }
.bar-actions {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.bar-action {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.bar-action.view-stat {
  pointer-events: none;
  opacity: 0.7;
}
.bar-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bar-icon-wrap.liked-bg {
  background: transparent;
}
.bar-icon-img {
  width: 28rpx;
  height: 28rpx;
}
.bar-num {
  font-size: 24rpx;
  color: #999;
}
.bar-num.liked-text {
  color: #ff2442;
}
.bar-send {
  width: 104rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bar-send.disabled {
  opacity: 0.4;
}
.bar-send text {
  color: #fff;
  font-size: 26rpx;
}

/* Toast */
.toast {
  position: fixed; left: 50%; top: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  background: rgba(0,0,0,0.8);
  border-radius: 999rpx;
  padding: 22rpx 40rpx;
  z-index: 9999;
  opacity: 0;
  transition: all 0.22s ease;
  pointer-events: none;
}
.toast text { color: #fff; font-size: 26rpx; }
.toast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
