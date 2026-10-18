<template>
  <view class="waterfall-theme" :class="themeClass">
    <!-- 顶部轮播图（banner） -->
    <view v-if="currentTab !== 2 && safeBannerList.length > 0" class="hero-band">
      <swiper
        class="hero-swiper"
        circular
        autoplay
        interval="4200"
        duration="450"
        :indicator-dots="true"
        indicator-active-color="#ffffff"
        indicator-color="rgba(255,255,255,0.48)"
      >
        <swiper-item v-for="(item, index) in safeBannerList" :key="item.id || index">
          <view class="hero-slide" @click="handleBannerClick(item)">
            <image :src="bannerImg(item.image)" class="hero-img" mode="aspectFill" :lazy-load="false"></image>
            <view class="hero-shade"></view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 快捷入口卡片 -->
    <view class="quick-grid">
      <view v-for="item in quickEntries" :key="item.title" class="quick-item" @click="goEntry(item.url)">
        <view class="quick-icon" :class="item.iconClass">
          <view class="quick-icon-svg">
            <image :src="item.icon" class="quick-svg-img" mode="aspectFit"></image>
          </view>
        </view>
        <text class="quick-title">{{ item.title }}</text>
      </view>
    </view>

    <view v-if="currentTab === 2 && userInfo" class="follow-top-section">
      <view class="follow-header">
        <text class="follow-title">我的关注</text>
        <text class="follow-subtitle">看看你关注的人最近在发什么</text>
      </view>
      <scroll-view scroll-x class="follow-scroll" :show-scrollbar="false" enhanced>
        <view class="follow-list">
          <view
            v-for="user in followList"
            :key="user.id"
            class="follow-item"
            @click.stop="goUserProfile(user.id)"
          >
            <view class="follow-avatar-box">
              <image :src="user.avatar || '/static/logo.png'" class="follow-avatar" mode="aspectFill" lazy-load></image>
              <image
                v-if="getAvatarFrame(user)"
                :src="getAvatarFrame(user)"
                class="follow-frame"
                mode="scaleToFill"
                lazy-load
              ></image>
              <view
                v-if="parseInt(user.vip || 0) === 1"
                class="follow-vip-icon"
              >
                <image src="/static/icon/vip-shield-white.svg" class="follow-vip-img" mode="aspectFit"></image>
              </view>
            </view>
            <text class="follow-name" :class="{ 'vip-rainbow-text': isVipUser(user) }">{{ getUserName(user) }}</text>
          </view>

          <view v-if="followList.length === 0" class="follow-empty">
            <text>暂时还没有关注的人</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 置顶帖子卡片已隐藏 -->
    <!--
    <view v-if="currentTab !== 2" class="discovery-header">
      <view v-if="zhidingPostList.length > 0" class="pinned-card">
        <view class="pinned-left">
          <text class="pinned-tag">置顶</text>
        </view>
        <swiper class="pinned-swiper" vertical autoplay interval="3500" circular>
          <swiper-item v-for="(post, idx) in zhidingPostList" :key="post.id || idx">
            <view class="pinned-row" @click="goPostDetail(post)">
              <text class="pinned-text">{{ post.title || '推荐内容' }}</text>
              <image src="/static/icon/arrow-right-gray.png" class="pin-arrow"></image>
            </view>
          </swiper-item>
        </swiper>
      </view>
    </view>
    -->

    <view v-if="postList.length > 0 || isLoading" class="waterfall-wrap">
      <view v-for="(col, colIndex) in [colL, colR]" :key="colIndex" class="waterfall-col">
        <view v-for="post in col" :key="post.id" class="post-card fade-in-up" @click="goPostDetail(post)">
          <view v-if="parseInt(post.status || 1) === 0" class="status-mask">
            <text class="status-text">已被屏蔽</text>
          </view>
          <view v-else-if="parseInt(post.status || 1) === 2" class="status-mask">
            <text class="status-text">审核中</text>
          </view>

          <view v-if="post.douyin_url && post.douyin_cover" class="card-douyin-wrap" @click.stop="openDouyin(post)">
            <image :src="post.douyin_cover" class="card-douyin-cover" mode="aspectFill"></image>
            <view class="card-douyin-play-btn">
              <view class="card-douyin-play-icon"></view>
            </view>
            <view class="card-douyin-info">
              <text class="card-douyin-title">{{ post.douyin_title || '抖音视频' }}</text>
            </view>

            <view v-if="parseInt(post.is_paid || 0) === 1 && !post.is_unlocked" class="lock-badge paid-lock">
              <text class="lock-badge-text">¥{{ post.price || 0 }}</text>
            </view>
            <view
              v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked"
              class="lock-badge comment-lock"
            >
              <text class="lock-badge-text">评论可见</text>
            </view>
          </view>

          <view v-else-if="post.coverImage || (isPaidLocked(post) && getFirstImage(post))" class="card-img-wrap" @click.stop="onMediaClick(post)">
            <image
              :src="post.coverImage || getFirstImage(post)"
              class="card-img"
              mode="widthFix"
              lazy-load
              @error="handleImgError"
            ></image>
            <image v-if="post.video" src="/static/icon/video.png" class="video-badge-img"></image>
            <view v-else-if="Number(post.totalImages || 0) > 1" class="img-count-badge">
              <text>{{ post.totalImages }}</text>
            </view>

            <view v-if="parseInt(post.is_paid || 0) === 1 && !post.is_unlocked" class="lock-badge paid-lock">
              <text class="lock-badge-text">¥{{ post.price || 0 }}</text>
            </view>
            <view
              v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked"
              class="lock-badge comment-lock"
            >
              <text class="lock-badge-text">评论可见</text>
            </view>
          </view>

          <view
            v-else-if="post.isTextOnly && post.textCoverData"
            class="card-text-cover"
            :style="{ background: post.textCoverData.gradient }"
          >
            <view class="text-cover-content">
              <text class="text-cover-title">{{ post.textCoverData.title }}</text>
              <text
                v-if="post.textCoverData.subtitle && post.textCoverData.subtitle !== post.textCoverData.title"
                class="text-cover-subtitle"
              >
                {{ post.textCoverData.subtitle }}
              </text>
            </view>

            <view class="text-cover-tag">文字</view>
            <view v-if="parseInt(post.is_paid || 0) === 1 && !post.is_unlocked" class="lock-badge paid-lock">
              <text class="lock-badge-text">¥{{ post.price || 0 }}</text>
            </view>
            <view
              v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked"
              class="lock-badge comment-lock"
            >
              <text class="lock-badge-text">评论可见</text>
            </view>
          </view>

          <view v-else class="card-text-only">
            <text class="text-preview">{{ post.plainContent || '点击查看详情' }}</text>

            <view v-if="parseInt(post.is_paid || 0) === 1 && !post.is_unlocked" class="lock-badge paid-lock">
              <text class="lock-badge-text">¥{{ post.price || 0 }}</text>
            </view>
            <view
              v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked"
              class="lock-badge comment-lock"
            >
              <text class="lock-badge-text">评论可见</text>
            </view>
          </view>

          <view class="card-content">
            <!-- 标签 -->
            <view v-if="post.mark || post.classification_name" class="card-tags">
              <text class="card-tag" v-if="post.mark">{{ post.mark }}</text>
              <text class="card-tag tag-secondary" v-else-if="post.classification_name">{{ post.classification_name }}</text>
            </view>

            <text class="card-title" :class="{ 'vip-title': isVipUser(post) }">{{ getPostTitle(post) }}</text>

            <view v-if="currentTab === 2 && post.is_mutual" class="mutual-tag">
              <text>互相关注</text>
            </view>

            <view class="card-footer">
              <view class="user-row" @click.stop="goUserProfile(post.user_id)">
                <view class="user-avatar-box">
                  <image :src="post.avatar || '/static/logo.png'" class="user-avatar" mode="aspectFill" lazy-load></image>
                  <image
                    v-if="getAvatarFrame(post)"
                    :src="getAvatarFrame(post)"
                    class="user-frame"
                    mode="scaleToFill"
                  ></image>
                </view>
                <view class="user-meta">
                  <scroll-view class="user-name-scroll" scroll-x :show-scrollbar="false">
                    <text class="user-name" :class="{ 'vip-rainbow-text': isVipUser(post) }">{{ getUserName(post) }}</text>
                  </scroll-view>
                </view>
              </view>

              <view class="action-row">
                <view class="like-btn" :class="{ liked: post.is_liked }" @click.stop="toggleLike(post)">
                  <image :src="post.is_liked ? '/static/post/xih1.png' : '/static/post/xih0.png'" class="action-icon-img" mode="aspectFit"></image>
                  <text class="action-num">{{ formatNum(post.like_count) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="isLoading && postList.length === 0" class="skeleton-card fade-in-up">
          <view class="sk-img"></view>
          <view class="sk-txt"></view>
          <view class="sk-user"></view>
        </view>
      </view>
    </view>

    <view class="status-area">
      <view v-if="isLoading" class="loading-wrap">
        <view class="spinner"></view>
      </view>
      <view v-else-if="postList.length === 0" class="empty-wrap">
        <image src="/static/icon/nullu.png" class="empty-img" mode="widthFix"></image>
        <text>暂无内容</text>
      </view>
      <view v-else-if="!hasMore" class="nomore-wrap">
        <text class="dot"></text>
        <text>THE END</text>
        <text class="dot"></text>
      </view>
    </view>

    <view style="height: 120rpx;"></view>

    <!-- 视频帖：点封面/视频直接进抖音式全屏播放（图文/文字帖仍走原来的详情页） -->
    <DouyinPlayer
      :show="showDouyinPlayer"
      :videoList="douyinVideoList"
      :initialIndex="douyinIndex"
      :userInfo="userInfo"
      :postTitle="douyinPostTitle"
      :postAuthorAvatar="douyinAuthorAvatar"
      @update:show="showDouyinPlayer = $event"
      @like="onDouyinLike"
      @collect="onDouyinCollect"
    />
  </view>
</template>

<script>
import { getLevelDisplay as calcLevelDisplay } from '../common/level.js'
import { bmsBaseUrl, request } from '../common/request.js'
import DouyinPlayer from './DouyinPlayer.vue'

export default {
  name: 'WaterfallTheme',
  components: { DouyinPlayer },
  props: {
    userInfo: {
      type: Object,
      default: null
    },
    currentTab: {
      type: Number,
      default: 1
    },
    bannerList: {
      type: Array,
      default: () => []
    },
    zhidingPostList: {
      type: Array,
      default: () => []
    },
    followList: {
      type: Array,
      default: () => []
    },
    postList: {
      type: Array,
      default: () => []
    },
    colL: {
      type: Array,
      default: () => []
    },
    colR: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      /* 抖音式全屏播放器（视频帖专用） */
      showDouyinPlayer: false,
      douyinVideoList: [],
      douyinIndex: 0,
      douyinPostTitle: '',
      douyinAuthorAvatar: ''
    }
  },
  computed: {
    safeBannerList() {
      return (this.bannerList || []).filter(item => item && item.image)
    },
    quickEntries() {
      return [
        { title: '聚合应用', icon: '/static/icon/quick-apps-white.svg', iconClass: 'quick-icon-hub', url: '/pages/hub/hub' },
        { title: '积分好礼', icon: '/static/icon/quick-gift-white.svg', iconClass: 'quick-icon-lottery', url: '/pages/lottery/index' },
        { title: '靓号商城', icon: '/static/icon/quick-tag-white.svg', iconClass: 'quick-icon-shop', url: '/pages/fancy/shop' },
        { title: '权益认证', icon: '/static/icon/quick-shield-check-white.svg', iconClass: 'quick-icon-cert', url: '/pages/user/zhuanye' },
        { title: '任务中心', icon: '/static/icon/quick-calendar-check-white.svg', iconClass: 'quick-icon-task', url: '/pages/mission/mission' },
        { title: '小黑屋', icon: '/static/icon/quick-ban-white.svg', iconClass: 'quick-icon-blackhole', url: '/pages/blackhole/blackhole' }
      ]
    }
  },
  methods: {
    bannerImg(url) {
      if (!url) return ''
      if (/^https?:\/\//i.test(url)) return url
      const base = (bmsBaseUrl || '').replace(/\/+$/, '')
      return base + (url.startsWith('/') ? url : '/' + url)
    },

    getAvatarFrame(item) {
      return (item && (item.current_frame_img || item.frame_img)) || ''
    },

    getUserName(item) {
      return (item && (item.name || item.username)) || '匿名'
    },

    getLevelDisplay(item) {
      return calcLevelDisplay(item && item.lv ? item.lv : 0)
    },

    getPostTitle(post) {
      return (post && post.title) || '无标题'
    },

    isFancyPost(item) {
      return parseInt(item && item.is_fancy ? item.is_fancy : 0) === 1
    },

    isVipUser(item) {
      return parseInt(item && item.vip ? item.vip : 0) === 1
    },

    isLockedPost(post) {
      if (!post) return false
      return (parseInt(post.is_paid || 0) === 1 || parseInt(post.is_comment_unlock || 0) === 1) && !post.is_unlocked
    },

    getLockedPlaceholderText(post) {
      return parseInt(post && post.is_paid ? post.is_paid : 0) === 1 ? '付费可见' : '评论可见'
    },

    handleImgError() {
    },

    handleBannerClick(item) {
      if (!item || !item.link) return

      if (item.link.indexOf('http') === 0) {
        uni.navigateTo({
          url: `/pages/webview/webview?url=${encodeURIComponent(item.link)}`
        })
      } else {
        uni.navigateTo({ url: item.link })
      }
    },

    goPostDetail(post) {
      if (!post) return
      this.$emit('goPostDetail', post)
    },

    /* 取视频帖的播放地址：优先后端解析好的 douyin_url，其次上传视频 video */
    postVideoUrl(post) {
      if (!post) return ''
      const d = String(post.douyin_url || '').trim()
      if (d && d !== '0' && d !== 'null' && d !== 'undefined') return d
      const v = String(post.video || '').trim()
      if (v && v !== '0' && v !== 'null' && v !== 'undefined') return v
      return ''
    },

    /* 把一条帖子转成播放器需要的数据 */
    buildDouyinItem(post) {
      return {
        id: post.id,
        url: this.postVideoUrl(post),
        cover: post.douyin_cover || post.coverImage || this.getFirstImage(post) || '/static/logo.png',
        title: post.douyin_title || this.getPostTitle(post) || '视频',
        author: post.douyin_author || post.name || post.username || '匿名',
        authorId: post.user_id,
        userId: post.user_id,
        avatar: post.avatar || '/static/logo.png',
        authorAvatar: post.avatar || '/static/logo.png',
        likeCount: Number(post.like_count) || 0,
        commentCount: Number(post.comment_count) || 0,
        isLiked: !!post.is_liked,
        isCollected: !!post.is_collected,
        isFollowed: !!post.is_followed,
        comments: []
      }
    },

    /* 视频帖：点封面直接进抖音式全屏播放；图文/文字帖保持原样进详情页。
       把列表里所有视频帖一起传进去，这样能像抖音那样上下滑刷下一个。 */
    openDouyin(post) {
      if (!post) return
      /* 付费/评论解锁贴不在这里直接放，仍走详情页去解锁 */
      if (this.isLockedPost(post)) { this.goPostDetail(post); return }
      if (!this.postVideoUrl(post)) { this.goPostDetail(post); return }

      const all = (this.postList || []).filter(p => p && this.postVideoUrl(p))
      let idx = all.findIndex(p => String(p.id) === String(post.id))
      if (idx < 0) { all.unshift(post); idx = 0 }
      /* 只取一小段窗口，避免一次加载太多原生视频导致卡顿 */
      const start = Math.max(0, Math.min(idx - 2, all.length - 10))
      const win = all.slice(start, start + 10)
      const winIdx = Math.max(0, idx - start)

      // #ifdef APP-PLUS
      /* App 端原生视频会盖住普通 view，而 cover-view 在 vue3 下点击不通，
         所以改跳 nvue 原生页面播放：那边普通 view 能正常压在视频上、点得动。
         只传帖子 id —— nvue 页和 vue 页是两套 JS 运行时、模块状态不共享，
         全局变量传不过去，让播放器页自己按 id 去接口取真实数据 */
      uni.navigateTo({ url: '/pages/videoplayer/douyin?id=' + post.id })
      return
      // #endif

      this.douyinVideoList = win.map(p => this.buildDouyinItem(p))
      this.douyinIndex = winIdx
      this.douyinPostTitle = this.getPostTitle(post) || ''
      this.douyinAuthorAvatar = post.avatar || ''
      this.showDouyinPlayer = true
    },

    /* 媒体区点击：视频帖进播放器，其余照旧进详情页 */
    onMediaClick(post) {
      if (this.postVideoUrl(post)) this.openDouyin(post)
      else this.goPostDetail(post)
    },

    /* 播放器里点赞：先本地变，再同步后端 */
    async onDouyinLike(payload) {
      const v = (payload && payload.video) || {}
      const id = v.id
      if (!id) return
      try {
        const res = await request('post.php', { action: 'like', id: id, postId: id }, { method: 'POST' })
        if (!res || res.code !== 0) return
        const d = res.data || {}
        const liked = (typeof d.is_liked !== 'undefined') ? !!d.is_liked
          : (typeof d.liked !== 'undefined' ? !!d.liked : !!(payload && payload.liked))
        const cnt = (typeof d.like_count !== 'undefined') ? Number(d.like_count)
          : (typeof d.likes !== 'undefined' ? Number(d.likes) : null)
        const idx = payload && payload.index
        if (this.douyinVideoList[idx]) {
          this.$set(this.douyinVideoList[idx], 'isLiked', liked)
          if (cnt !== null) this.$set(this.douyinVideoList[idx], 'likeCount', cnt)
        }
        const p = (this.postList || []).find(x => x && x.id === id)
        if (p) { p.is_liked = liked; if (cnt !== null) p.like_count = cnt }
      } catch (e) {}
    },

    /* 播放器里收藏：同步后端并回写状态 */
    async onDouyinCollect(payload) {
      const v = (payload && payload.video) || {}
      const id = v.id
      if (!id) return
      try {
        const res = await request('post.php', { action: 'collect', id: id, postId: id }, { method: 'POST' })
        if (!res || res.code !== 0) return
        const collected = !!(res.data && res.data.collected)
        const idx = payload && payload.index
        if (this.douyinVideoList[idx]) this.$set(this.douyinVideoList[idx], 'isCollected', collected)
        const p = (this.postList || []).find(x => x && x.id === id)
        if (p) p.is_collected = collected
      } catch (e) {}
    },

    goUserProfile(uid) {
      if (!uid) return
      uni.navigateTo({ url: `/pages/user/profile?userId=${uid}` })
    },

    goEntry(url) {
      uni.navigateTo({ url: url });
    },

    toggleLike(post) {
      if (!post) return
      // 乐观更新
      const wasLiked = !!post.is_liked
      post.is_liked = !wasLiked
      post.like_count = parseInt(post.like_count || 0) + (wasLiked ? -1 : 1)
      
      // 调用点赞API
      const token = uni.getStorageSync('token');
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        post.is_liked = wasLiked;
        post.like_count = parseInt(post.like_count || 0) + (wasLiked ? 1 : -1);
        return;
      }
      
      const app = getApp();
      const apiBase = (app.globalData && app.globalData.apiBase) || 'https://example.com/api/index.php/';
      
      uni.request({
        url: apiBase + 'post/like',
        method: 'POST',
        header: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        data: {
          post_id: post.id
        },
        success: (res) => {
          if (res.data && res.data.code !== 0) {
            // 点赞失败，恢复状态
            post.is_liked = wasLiked;
            post.like_count = parseInt(post.like_count || 0) + (wasLiked ? 1 : -1);
            uni.showToast({ title: res.data.message || '操作失败', icon: 'none' });
          }
        },
        fail: () => {
          // 请求失败，恢复状态
          post.is_liked = wasLiked;
          post.like_count = parseInt(post.like_count || 0) + (wasLiked ? 1 : -1);
        }
      });
      
      // 调用父组件的点赞方法
      this.$emit('toggleLike', post)
    },

    isPaidLocked(post) {
      if (!post) return false
      return parseInt(post.is_paid || 0) === 1 && !post.is_unlocked
    },

    formatNum(n) {
      const value = parseInt(n || 0)
      if (value > 9999) return (value / 10000).toFixed(1) + 'w'
      return value > 999 ? '999+' : String(value)
    },

    getFirstImage(post) {
      if (!post) return ''
      if (post.coverImage) return post.coverImage
      let images = []
      if (Array.isArray(post.images)) {
        images = post.images
      } else if (typeof post.images === 'string' && post.images.trim()) {
        try {
          images = post.images.startsWith('[') ? JSON.parse(post.images) : post.images.split(',')
        } catch (e) {
          images = post.images.split(',')
        }
      }
      return images.length > 0 ? images[0] : ''
    }
  }
}
</script>

<style scoped>
.waterfall-theme {
  min-height: 100vh;
  background: var(--cr-surface);
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.hero-band {
  padding: 20rpx 24rpx 0;
  background: var(--cr-surface);
}
.hero-swiper {
  width: 100%;
  height: 360rpx;
  border-radius: 26rpx;
  overflow: hidden;
}
.hero-slide {
  position: relative;
  width: 100%;
  height: 100%;
}
.hero-img {
  width: 100%;
  height: 100%;
}
.hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(18, 18, 18, 0.02) 0%, rgba(18, 18, 18, 0.12) 100%);
}

.banner-item {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.banner-img {
  width: 100%;
  height: 100%;
}

.banner-top-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 64rpx;
  background: linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0) 100%);
  pointer-events: none;
  z-index: 2;
}

.banner-bottom-mask {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 44rpx;
  background: linear-gradient(to bottom, rgba(255,255,255,0), #fff);
  pointer-events: none;
  z-index: 2;
}

.discovery-header {
  padding-bottom: 18rpx;
  background: var(--cr-surface);
  border-radius: 0 0 24rpx 24rpx;
  overflow: hidden;
}

.pinned-card {
  margin: 10rpx 24rpx 0;
  padding: 0 20rpx;
  height: 76rpx;
  border-radius: 18rpx;
  background: linear-gradient(90deg, #fff2f3 0%, #ffffff 100%);
  border: 1rpx solid rgba(255, 36, 66, 0.12);
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.pinned-left {
  flex-shrink: 0;
}

.pinned-tag {
  color: #ff2442;
  font-size: 22rpx;
  font-weight: 700;
  background: rgba(255, 36, 66, 0.08);
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
}

.pinned-swiper {
  flex: 1;
  height: 100%;
}

.pinned-row {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.pinned-text {
  flex: 1;
  min-width: 0;
  color: var(--cr-text);
  font-size: 26rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pin-arrow {
  width: 22rpx;
  height: 22rpx;
  opacity: 0.55;
}

.follow-top-section {
  background: var(--cr-surface);
  padding: 20rpx 0 24rpx;
  margin-bottom: 12rpx;
  border-radius: 0 0 24rpx 24rpx;
}

.follow-header {
  padding: 0 24rpx 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18rpx;
}

.follow-title {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--cr-text);
}

.follow-subtitle {
  flex: 1;
  text-align: right;
  font-size: 22rpx;
  color: #9aa1ad;
}

.follow-scroll {
  width: 100%;
  white-space: nowrap;
}

.follow-list {
  display: flex;
  padding-left: 24rpx;
}

.follow-item {
  width: 110rpx;
  margin-right: 28rpx;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.follow-avatar-box {
  position: relative;
  width: 92rpx;
  height: 92rpx;
  margin-bottom: 10rpx;
  overflow: visible;
}

.follow-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1rpx solid var(--cr-border);
}

.follow-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 166%;
  height: 166%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.follow-vip-icon {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 32rpx;
  height: 32rpx;
  z-index: 4;
  pointer-events: none;
  color: #ffb300;
  background: linear-gradient(135deg, #ffd54f 0%, #ff9800 100%);
  border: 2rpx solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(255, 152, 0, 0.4);
}
.follow-vip-icon .follow-vip-img {
  width: 60%;
  height: 60%;
}

.follow-name {
  width: 100%;
  text-align: center;
  font-size: 22rpx;
  color: var(--cr-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-empty {
  width: 100%;
  padding: 28rpx 0;
  text-align: center;
  color: var(--cr-text-muted);
  font-size: 24rpx;
}

.waterfall-wrap {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 8rpx 20rpx 0;
  box-sizing: border-box;
  width: 100%;
}

.waterfall-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.post-card {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--cr-panel-radius, 28rpx);
  background: var(--cr-surface);
  border: 1rpx solid var(--cr-border);
  box-shadow: var(--cr-panel-shadow);
  box-sizing: border-box;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.post-card:active {
  transform: scale(0.985);
}

.card-img-wrap {
  position: relative;
  width: 100%;
  min-height: 200rpx;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  overflow: hidden;
}

.card-img {
  width: 100%;
  display: block;
}

.video-badge-img {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 40rpx;
  height: 40rpx;
}

.img-count-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(0,0,0,0.5);
}

.img-count-badge text {
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}

.card-text-cover {
  position: relative;
  width: 100%;
  padding-bottom: 133.33%;
  overflow: hidden;
}

.text-cover-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 28rpx;
  box-sizing: border-box;
  text-align: center;
}

.text-cover-title {
  font-size: 36rpx;
  color: #fff;
  font-weight: 700;
  line-height: 1.4;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-cover-subtitle {
  margin-top: 14rpx;
  font-size: 26rpx;
  color: rgba(255,255,255,0.92);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-cover-tag {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.24);
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
}

.card-text-only {
  position: relative;
  min-height: 132rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-preview {
  font-size: 28rpx;
  color: var(--cr-text);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.locked-media-placeholder,
.locked-cover,
.text-locked-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%);
}

.locked-media-placeholder {
  min-height: 260rpx;
  padding: 30rpx;
}

.locked-cover {
  position: relative;
}

.locked-cover-placeholder,
.text-locked-placeholder {
  padding: 30rpx;
  flex-direction: column;
  gap: 20rpx;
}

.locked-post-image {
  width: 100%;
  border-radius: 12rpx;
}

.locked-media-text,
.locked-cover-text,
.text-locked-hint {
  color: var(--cr-text-muted);
  font-size: 26rpx;
  font-weight: 700;
  text-align: center;
}

.lock-badge {
  position: absolute;
  left: 14rpx;
  bottom: 14rpx;
  padding: 6rpx 14rpx;
  border-radius: 10rpx;
}

.paid-lock {
  background: rgba(255,36,66,0.88);
}

.comment-lock {
  background: rgba(14,165,233,0.88);
}

.lock-badge-text {
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}

.status-mask {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(255,255,255,0.82);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-text {
  color: #ff2442;
  font-size: 24rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid #ff2442;
}

.card-content {
  padding: 18rpx 16rpx 14rpx;
  min-width: 0;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.card-tag {
  display: inline-block;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: #ff2442;
  background: rgba(255,36,66,0.08);
  border-radius: 6rpx;
  font-weight: 500;
}

.card-tag.tag-secondary {
  color: var(--cr-text-muted);
  background: var(--cr-surface-alt);
}

.card-title {
  font-size: 28rpx;
  color: var(--cr-text);
  font-weight: 600;
  line-height: 1.42;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.mutual-tag {
  margin-bottom: 12rpx;
}

.mutual-tag text {
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: #fff0f2;
  color: #ff2442;
  font-size: 18rpx;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.user-row {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.user-avatar-box {
  position: relative;
  width: 36rpx;
  height: 36rpx;
  margin-right: 8rpx;
  overflow: visible;
  flex-shrink: 0;
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1rpx solid var(--cr-border);
}

.user-meta {
  min-width: 0;
  flex: 1;
}

.user-name-scroll {
  width: 100%;
  white-space: nowrap;
}

.user-name {
  display: inline-block;
  font-size: 22rpx;
  color: var(--cr-text-muted);
}

.action-row {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4rpx;
}

.like-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 8rpx;
  border-radius: 20rpx;
  transition: all 0.2s ease;
}

.like-btn:active {
  transform: scale(0.9);
}

.like-btn.liked .action-num {
  color: #ff2442;
}

.user-avatar-box {
  position: relative;
  width: 36rpx;
  height: 36rpx;
  margin-right: 8rpx;
  overflow: visible;
}

.user-frame {
  position: absolute;
  top: -4rpx;
  left: -4rpx;
  width: 44rpx;
  height: 44rpx;
  pointer-events: none;
}

.action-icon-img {
  width: 28rpx;
  height: 28rpx;
  margin-right: 6rpx;
}

.action-num {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}

.action-sep {
  margin: 0 6rpx;
  color: var(--cr-border-strong);
  font-size: 20rpx;
}

.fancy-text {
  color: #ff2442 !important;
  font-weight: 800 !important;
}
.vip-title {
  color: #ff2442 !important;
  font-weight: 800 !important;
}
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

.skeleton-card {
  overflow: hidden;
  border-radius: 18rpx;
  background: var(--cr-surface-alt);
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

.sk-img {
  width: 100%;
  height: 300rpx;
  background: #e8e8e8;
}

.sk-txt {
  width: 80%;
  height: 30rpx;
  margin: 20rpx;
  background: #e8e8e8;
}

.sk-user {
  width: 40%;
  height: 20rpx;
  margin: 0 20rpx 20rpx;
  background: #e8e8e8;
}

.fade-in-up {
  animation: fadeInUp 0.35s ease forwards;
}

.status-area {
  padding: 30rpx 0;
  display: flex;
  justify-content: center;
}

.empty-wrap {
  margin-top: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-img {
  width: 200rpx;
  margin-bottom: 20rpx;
  opacity: 0.5;
}

.empty-wrap text,
.nomore-wrap {
  color: #c0c4cc;
  font-size: 24rpx;
}

.spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #f3f3f3;
  border-top-color: #ff2442;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.card-douyin-wrap {
  position: relative;
  width: 100%;
  background: #000;
}

.card-douyin-cover {
  width: 100%;
  height: 560rpx;
}

.card-douyin-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.card-douyin-play-icon {
  width: 0;
  height: 0;
  border-top: 20rpx solid transparent;
  border-bottom: 20rpx solid transparent;
  border-left: 32rpx solid #fff;
  border-radius: 4rpx;
  margin-left: 8rpx;
}

.card-douyin-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12rpx 16rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
}

.card-douyin-title {
  display: block;
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-douyin-author {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 20rpx;
  margin-top: 4rpx;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 快捷入口卡片 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12rpx;
  padding: 26rpx 18rpx 24rpx;
  background: var(--cr-surface);
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.quick-icon {
  width: 78rpx;
  height: 78rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.quick-icon-hub {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 6rpx 18rpx rgba(118, 75, 162, 0.32);
}
.quick-icon-lottery {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  box-shadow: 0 6rpx 18rpx rgba(255, 107, 107, 0.32);
}
.quick-icon-shop {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  box-shadow: 0 6rpx 18rpx rgba(17, 153, 142, 0.32);
}
.quick-icon-cert {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  box-shadow: 0 6rpx 18rpx rgba(79, 172, 254, 0.32);
}
.quick-icon-task {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 6rpx 18rpx rgba(245, 87, 108, 0.32);
}
.quick-icon-blackhole {
  background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%);
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.32);
}
.quick-icon-svg {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.quick-icon-svg .quick-svg-img {
  width: 100%;
  height: 100%;
}
.quick-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: 23rpx;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.35;
  color: var(--cr-text);
}
</style>
