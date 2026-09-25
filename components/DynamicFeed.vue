<template>
  <view class="dynamic-feed">
    <template v-if="firstLoading">
      <view class="sk-item" v-for="i in 4" :key="i">
        <view class="sk-head-row">
          <view class="sk-avatar"></view>
          <view class="sk-name-area">
            <view class="sk-name"></view>
            <view class="sk-time"></view>
          </view>
        </view>
        <view class="sk-content-line" v-for="j in 2" :key="j"></view>
        <view class="sk-img-row">
          <view class="sk-img" v-for="k in 3" :key="k"></view>
        </view>
      </view>
    </template>

    <template v-else>
      <view class="dynamic-item" v-for="item in list" :key="item.id">
        <view class="item-head">
          <view class="avatar-wrap">
            <image :src="item.avatar || '/static/logo.png'" class="item-avatar" mode="aspectFill" @click="goUser(item.user_id)"></image>
            <image v-if="item.frame_img" :src="item.frame_img" class="item-avatar-frame" mode="aspectFit"></image>
          </view>
          <view class="item-user-info">
            <text class="item-name">{{ item.name || item.username || '用户' }}</text>
            <view class="item-meta-row">
              <text class="item-time">{{ formatTime(item.created_at) }}</text>
              <text v-if="isAdmin || item.user_id === currentUserId" class="item-delete-btn" @click.stop="confirmDelete(item)">删除</text>
            </view>
          </view>
          <view class="head-right">
            <view class="view-count">
              <image src="/static/tab/ydl.png" class="view-icon" mode="aspectFit"></image>
              <text class="view-num">{{ formatNum(item.view_count || 0) }}</text>
            </view>
          </view>
        </view>

        <view class="item-body" @click="goDetail(item)">
        <view class="item-title" v-if="item.title">
          <text class="title-text">{{ item.title }}</text>
        </view>

        <view class="item-content" v-if="item.content">
          <text class="content-text">
            <text v-for="(seg, si) in parseContent(item.content)" :key="si" :class="seg.type === 'topic' ? 'inline-topic' : ''" @click.stop="seg.type === 'topic' ? goTopic(0, seg.value) : null">{{ seg.type === 'topic' ? '#' + seg.value : seg.value }}</text>
          </text>
        </view>

        <view class="item-images" v-if="item.images && item.images.length > 0">
          <view class="img-row" :class="'img-count-' + Math.min(item.images.length, 3)">
            <image
              v-for="(img, idx) in (item.images.length > 3 ? item.images.slice(0, 3) : item.images)"
              :key="idx"
              :src="img"
              class="row-img"
              mode="aspectFill"
            >
            </image>
          </view>
        </view>
        </view>

        <view class="item-footer">
          <view class="footer-tag" v-if="item.topics && item.topics.length > 0" @click.stop="goTopic(item.topics[0].id, item.topics[0].name)">
            <text class="footer-tag-text">#{{ item.topics[0].name }}</text>
          </view>
          <view class="footer-actions">
            <view class="action-btn" @click="goDetail(item)">
              <view class="action-icon-wrap">
                <image class="action-icon-img" src="/static/post/pl.png" mode="aspectFit"></image>
              </view>
              <text class="action-label">评论</text>
              <text class="action-num" v-if="item.comment_count">{{ item.comment_count }}</text>
            </view>
            <view class="action-btn" @click="onLike(item)">
              <view class="action-icon-wrap" :class="{ 'liked-bg': item.is_liked }">
                <image class="action-icon-img" :src="item.is_liked ? '/static/post/xih1.png' : '/static/post/xih0.png'" mode="aspectFit"></image>
              </view>
              <text class="action-label" :class="{ 'liked-text': item.is_liked }">点赞</text>
              <text class="action-num" :class="{ 'liked-text': item.is_liked }" v-if="item.like_count">{{ item.like_count }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="loading-row" v-if="loading && !firstLoading">
        <view class="loading-dot"></view>
        <text class="loading-txt">加载中...</text>
      </view>

      <view class="no-more-row" v-if="!hasMore && list.length > 0 && !loading">
        <text class="no-more-txt">— 没有更多动态了 —</text>
      </view>

      <view class="empty-wrap" v-if="!loading && list.length === 0">
        <image src="/static/icon/nullu.png" class="empty-img" mode="aspectFit"></image>
        <text class="empty-title">{{ feedType === 'follow' ? '还没有关注的动态' : '还没有动态' }}</text>
        <text class="empty-sub">{{ feedType === 'follow' ? '关注更多人，发现更多精彩' : '发布第一条动态吧' }}</text>
      </view>
    </template>
  </view>
</template>

<script>
import { request } from '../common/request.js'
import { swr, invalidate, subscribe, CACHE_KEYS } from '../common/cache.js'

export default {
  name: 'DynamicFeed',
  props: {
    feedType: {
      type: String,
      default: 'all'
    },
    topic: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      list: [],
      page: 1,
      pageSize: 20,
      hasMore: true,
      firstLoading: true,
      loading: false,
      requestLock: false,
      currentUserId: 0,
      isAdmin: false
    }
  },
  mounted() {
    const u = uni.getStorageSync('userInfo')
    if (u) {
      this.currentUserId = u.id
      this.isAdmin = parseInt(u.is_admin) >= 1
    }
    // 订阅缓存刷新事件：后台拉到新数据后静默更新 UI
    this._unsubCache = subscribe(this._cacheKey(), (newData) => {
      if (Array.isArray(newData) && this.page === 1) {
        // 只有当前在第1页时才整体替换，避免分页中乱序
        this.list = newData
      }
    })
    this.loadData(true)
  },
  beforeDestroy() {
    if (this._unsubCache) this._unsubCache()
  },
  methods: {
    // 当前 feedType 对应的缓存 key
    _cacheKey() {
      return this.feedType === 'follow' ? CACHE_KEYS.DYNAMIC_FOLLOW : CACHE_KEYS.DYNAMIC_LIST
    },
    async loadData(reset = false) {
      if (this.requestLock) return
      if (!reset && (!this.hasMore || this.loading)) return

      this.requestLock = true
      this.loading = true

      if (reset) {
        this.page = 1
        this.hasMore = true
      }

      try {
        const params = {
          action: 'list',
          page: this.page,
          pageSize: this.pageSize
        }
        if (this.feedType === 'follow') {
          params.type = 'follow'
        }
        // 话题搜索模式：传入 topic 参数
        if (this.topic) {
          params.topic = this.topic
        }

        // 话题搜索模式或第2页及以后：不使用 SWR 缓存
        if (this.topic) {
          const res = await request('dynamic.php', params, 'GET')
          if (res.code === 0) {
            // 后端返回 {list: [...], total: ...}，兼容直接返回数组的情况
            const rawList = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.list) ? res.data.list : [])
            const incoming = rawList.map(item => this.normalizeItem(item))
            if (reset || this.page === 1) {
              this.list = incoming
            } else {
              this.list = [...this.list, ...incoming]
            }
            this.hasMore = incoming.length >= this.pageSize
          }
        } else if (this.page === 1) {
          const { data, fromCache, stale } = await swr(
            this._cacheKey(),
            () => request('dynamic.php', params, 'GET'),
            {
              ttl: 30000,  // 30秒内用缓存
              onRefresh: (newData) => {
                // 后台刷新成功，subscribe 也会触发，这里冗余保险
                // 后端返回 {list: [...], total: ...}，兼容直接返回数组的情况
                const rawList = Array.isArray(newData) ? newData : (newData && Array.isArray(newData.list) ? newData.list : [])
                const list = rawList.map(item => this.normalizeItem(item))
                if (list.length > 0) {
                  this.list = list
                  this.hasMore = list.length >= this.pageSize
                }
              }
            }
          )

          if (fromCache && data) {
            // 命中缓存：立即渲染，隐藏 firstLoading
            // 后端返回 {list: [...], total: ...}，兼容直接返回数组的情况
            const rawList = Array.isArray(data) ? data : (data && Array.isArray(data.list) ? data.list : [])
            const list = rawList.map(item => this.normalizeItem(item))
            if (list.length > 0) {
              this.list = list
              this.hasMore = list.length >= this.pageSize
            }
            this.firstLoading = false
            // stale=true 表示后台正在刷新，刷新完会通过 subscribe 回调更新
            // 非 stale 说明缓存未过期，不需要 loading
            if (!stale) this.loading = false
            // 如果是 reset 且缓存命中，标记 requestLock 释放
            this.requestLock = false
            return
          }
          // 非缓存命中（首次请求），走下面的常规流程
          if (data) {
            // 后端返回 {list: [...], total: ...}，兼容直接返回数组的情况
            const rawList = Array.isArray(data) ? data : (data && Array.isArray(data.list) ? data.list : [])
            const list = rawList.map(item => this.normalizeItem(item))
            this.list = list
            this.hasMore = list.length >= this.pageSize
          }
        } else {
          // 第2页及以后：直接请求，不缓存（避免缓存膨胀）
          const res = await request('dynamic.php', params, 'GET')
          if (res.code === 0) {
            // 后端返回 {list: [...], total: ...}，兼容直接返回数组的情况
            const rawList = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.list) ? res.data.list : [])
            const incoming = rawList.map(item => this.normalizeItem(item))
            this.list = [...this.list, ...incoming]
            this.hasMore = incoming.length >= this.pageSize
          }
        }
      } catch (e) {
        console.log('[DynamicFeed] load error', e)
      } finally {
        this.loading = false
        this.firstLoading = false
        this.requestLock = false
      }
    },

    loadMore() {
      if (this.loading || !this.hasMore || this.requestLock) return
      this.page += 1
      this.loadData()
    },

    onRefresh() {
      // 用户主动下拉刷新：强制失效缓存，立即拉取最新
      invalidate(this._cacheKey())
      return this.loadData(true)
    },

    async onLike(item) {
      if (item._liking) return  // 防抖：请求未完成时禁止再次点击
      const u = uni.getStorageSync('userInfo')
      if (!u) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      try { uni.vibrateShort() } catch (e) {}

      const prevLiked = item.is_liked
      const prevCount = Number(item.like_count) || 0
      item._liking = true
      // 乐观更新
      item.is_liked = !prevLiked
      item.like_count = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1

      try {
        const res = await request('dynamic.php', {
          action: 'like',
          id: item.id,
          dynamic_id: item.id
        }, 'POST')

        if (res.code === 0) {
          const data = res.data || {}
          if (typeof data.is_liked !== 'undefined') item.is_liked = !!data.is_liked
          else if (typeof data.status !== 'undefined') item.is_liked = !!data.status
          else if (typeof data.liked !== 'undefined') item.is_liked = !!data.liked
          if (typeof data.like_count !== 'undefined') item.like_count = Number(data.like_count) || 0
          else if (typeof data.likes !== 'undefined') item.like_count = Number(data.likes) || 0
        } else {
          // 点赞失败，回滚状态
          item.is_liked = prevLiked
          item.like_count = prevCount
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        item.is_liked = prevLiked
        item.like_count = prevCount
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        item._liking = false
      }
    },

    normalizeItem(item) {
      if (!item) return item
      // 把 author 对象里的字段合并到顶层，兼容前端模板
      if (item.author) {
        item.avatar = item.author.avatar || item.avatar
        item.nickname = item.author.nickname || item.nickname
        item.name = item.author.nickname || item.author.name || item.name
        item.username = item.author.username || item.username
        item.personal_signature = item.author.personal_signature || item.personal_signature
        item.frame_img = item.author.frame_img || item.frame_img
        item.user_id = item.author.uid || item.user_id
        item.uid = item.author.uid || item.uid
        item.is_followed = item.author.is_followed || false
      }
      return item
    },

    goDetail(item) {
      uni.navigateTo({ url: `/pages/dynamic/detail?id=${item.id}` })
    },

    confirmDelete(item) {
      uni.showModal({
        title: '提示',
        content: '确定删除这条动态吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            const result = await request('dynamic.php', {
              action: 'delete',
              dynamic_id: item.id
            }, 'POST')
            if (result.code === 0) {
              uni.showToast({ title: '已删除', icon: 'success' })
              this.list = this.list.filter(d => d.id !== item.id)
              invalidate(this._cacheKey())
            } else {
              uni.showToast({ title: result.msg || '删除失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '网络异常', icon: 'none' })
          }
        }
      })
    },

    goUser(uid) {
      if (!uid) return
      uni.navigateTo({ url: `/pages/user/profile?userId=${uid}` })
    },

    goTopic(tid, name) {
      if (!name) return
      uni.navigateTo({ url: `/pages/dynamic/topic-result?name=${encodeURIComponent(name)}` })
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

    formatNum(n) {
      n = parseInt(n || 0)
      if (n < 1000) return String(n)
      if (n < 10000) return (n / 1000).toFixed(1) + 'k'
      return (n / 10000).toFixed(1) + 'w'
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
    }
  }
}
</script>

<style scoped>
.dynamic-feed { padding: 0 0 20rpx; }

/* Skeleton */
.sk-item {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}
.sk-head-row { display: flex; align-items: center; margin-bottom: 20rpx; }
.sk-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #ECEEF1; }
.sk-name-area { margin-left: 16rpx; flex: 1; }
.sk-name { width: 120rpx; height: 28rpx; background: #ECEEF1; border-radius: 8rpx; margin-bottom: 8rpx; }
.sk-time { width: 80rpx; height: 20rpx; background: #ECEEF1; border-radius: 8rpx; }
.sk-content-line { height: 28rpx; background: #ECEEF1; border-radius: 8rpx; margin-bottom: 12rpx; }
.sk-img-row { display: flex; gap: 8rpx; margin-top: 16rpx; }
.sk-img { width: 200rpx; height: 200rpx; background: #ECEEF1; border-radius: 12rpx; }

/* Dynamic Item */
.dynamic-item {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

.item-head {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.avatar-wrap {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}
.item-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f5f5f5;
}
.item-avatar-frame {
  position: absolute;
  top: -12rpx;
  left: -12rpx;
  width: 96rpx;
  height: 96rpx;
  pointer-events: none;
}
.item-user-info {
  flex: 1;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}
.item-time {
  font-size: 22rpx;
  color: #999;
}
.item-meta-row {
  display: flex;
  align-items: center;
  margin-top: 4rpx;
}
.item-delete-btn {
  font-size: 22rpx;
  color: #3399ff;
  margin-left: 16rpx;
}
.head-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.view-count {
  display: flex;
  align-items: center;
  padding: 6rpx 14rpx 6rpx 10rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
}
.view-icon {
  width: 24rpx;
  height: 24rpx;
  margin-right: 6rpx;
  opacity: 0.6;
}
.view-num {
  font-size: 22rpx;
  color: #999;
  line-height: 1;
}

/* Title */
.item-title {
  margin-bottom: 12rpx;
}
.title-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  word-break: break-all;
}

/* Content */
.item-content {
  margin-bottom: 16rpx;
}
.content-text {
  font-size: 28rpx;
  color: #444;
  line-height: 1.6;
  word-break: break-all;
}
.inline-topic {
  color: #2b6cb0;
}

/* Topic Tag - blue rounded */
.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
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

/* Images - horizontal row */
.item-images { margin-bottom: 20rpx; }
.img-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  border-radius: 16rpx;
  overflow: hidden;
}
.row-img {
  background: #f5f5f5;
  border-radius: 12rpx;
}
/* 统一所有图片数量：一行3个 */
.img-count-1 .row-img,
.img-count-2 .row-img,
.img-count-3 .row-img,
.img-count-4 .row-img,
.img-count-5 .row-img,
.img-count-6 .row-img,
.img-count-7 .row-img,
.img-count-8 .row-img,
.img-count-9 .row-img {
  width: calc(33.33% - 6rpx);
  height: 220rpx;
}

/* Footer */
.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}
.footer-tag {
  flex-shrink: 0;
  max-width: 40%;
  overflow: hidden;
}
.footer-tag-text {
  font-size: 24rpx;
  color: #2b6cb0;
  background: #eaf4fb;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.footer-actions {
  display: flex;
  align-items: center;
  gap: 40rpx;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 4rpx;
}
.action-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-icon-wrap.liked-bg {
  background: transparent;
}
.action-iconfont {
  font-size: 26rpx;
}
.action-icon-img {
  width: 28rpx;
  height: 28rpx;
}
.action-label {
  font-size: 26rpx;
  color: #666;
}
.action-label.liked-text {
  color: #ff2442;
}
.action-num {
  font-size: 24rpx;
  color: #999;
}
.action-num.liked-text {
  color: #ff2442;
}

/* Loading / Empty */
.loading-row {
  display: flex; align-items: center; justify-content: center;
  padding: 40rpx 0; gap: 12rpx;
}
.loading-dot {
  width: 28rpx; height: 28rpx;
  border-radius: 50%;
  border: 3rpx solid #EBEBEB;
  border-top-color: #4A7FE0;
  animation: spin 0.8s linear infinite;
}
.loading-txt { font-size: 24rpx; color: #AAB0BB; }
.no-more-row {
  display: flex; align-items: center; justify-content: center;
  padding: 32rpx 0;
}
.no-more-txt { font-size: 22rpx; color: #CCC; letter-spacing: 2rpx; }
.empty-wrap {
  padding: 80rpx 0 60rpx;
  display: flex; flex-direction: column; align-items: center;
}
.empty-img { width: 180rpx; height: 180rpx; opacity: 0.55; }
.empty-title { margin-top: 24rpx; font-size: 28rpx; color: #333; font-weight: 600; }
.empty-sub { margin-top: 8rpx; font-size: 24rpx; color: #AAB0BB; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
