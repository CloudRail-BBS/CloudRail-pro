<template>
  <view class="text-flow-theme" :class="themeClass">
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
            <image
              :src="bannerImg(item.image)"
              class="hero-img"
              mode="aspectFill"
              :lazy-load="false"
              @error="markBannerError(index)"
            ></image>
            <view class="hero-shade"></view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view v-if="currentTab !== 2" class="quick-grid">
      <view v-for="item in quickEntries" :key="item.title" class="quick-item" @click="goEntry(item.url)">
        <view class="quick-icon" :class="item.iconClass">
          <!-- 聚合应用：四宫格Apps -->
          <view v-if="item.title === '聚合应用'" class="quick-icon-svg">
            <image src="/static/icon/quick-apps-white.svg" class="quick-svg-img" mode="aspectFit"></image>
          </view>
          <!-- 积分好礼：礼盒 -->
          <view v-else-if="item.title === '积分好礼'" class="quick-icon-svg">
            <image src="/static/icon/quick-gift-white.svg" class="quick-svg-img" mode="aspectFit"></image>
          </view>
          <!-- 靓号商城：标签价签 -->
          <view v-else-if="item.title === '靓号商城'" class="quick-icon-svg">
            <image src="/static/icon/quick-tag-white.svg" class="quick-svg-img" mode="aspectFit"></image>
          </view>
          <!-- 权益认证：盾牌+勾 -->
          <view v-else-if="item.title === '权益认证'" class="quick-icon-svg">
            <image src="/static/icon/quick-shield-check-white.svg" class="quick-svg-img" mode="aspectFit"></image>
          </view>
          <!-- 任务中心：日历+勾 -->
          <view v-else-if="item.title === '任务中心'" class="quick-icon-svg">
            <image src="/static/icon/quick-calendar-check-white.svg" class="quick-svg-img" mode="aspectFit"></image>
          </view>
          <!-- 小黑屋：禁止 -->
          <view v-else-if="item.title === '小黑屋'" class="quick-icon-svg">
            <image src="/static/icon/quick-ban-white.svg" class="quick-svg-img" mode="aspectFit"></image>
          </view>
          <image v-else :src="item.icon" class="quick-icon-img" mode="aspectFit"></image>
        </view>
        <text class="quick-title">{{ item.title }}</text>
      </view>
    </view>

    <view v-if="currentTab !== 2 && zhidingPostList.length > 0" class="pinned-panel">
      <view class="pinned-head">
        <text class="pinned-mark">置顶</text>
        <text class="pinned-title">精选推荐</text>
      </view>
      <swiper class="pinned-swiper" vertical autoplay interval="3600" circular>
        <swiper-item v-for="(post, idx) in zhidingPostList" :key="post.id || idx">
          <view class="pinned-row" @click="goPostDetail(post)">
            <text class="pinned-text">{{ cleanText(post.title || post.plain_content || '推荐内容') }}</text>
            <text class="pinned-arrow">›</text>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view v-if="currentTab === 2" class="follow-panel">
      <view class="section-head">
        <text class="section-title">我的关注</text>
        <text class="section-sub">来自你关注的人的最新动态</text>
      </view>
      <scroll-view scroll-x class="follow-scroll" :show-scrollbar="false">
        <view class="follow-list">
          <view
            v-for="user in followList"
            :key="user.id"
            class="follow-item"
            @click.stop="goUserProfile(user.id)"
          >
            <view class="follow-avatar-box">
              <image :src="user.avatar || '/static/logo.png'" class="follow-avatar" mode="aspectFill"></image>
              <image
                v-if="getAvatarFrame(user)"
                :src="getAvatarFrame(user)"
                class="follow-frame"
                mode="scaleToFill"
              ></image>
            </view>
            <text class="follow-name" :class="{ 'vip-rainbow-text': isVipUser(user) }">{{ getAuthorName(user) }}</text>
          </view>
          <view v-if="followList.length === 0" class="follow-empty">暂时还没有关注内容</view>
        </view>
      </scroll-view>
    </view>

    <view class="feed-section">
      <view class="section-head compact">
        <text class="section-title">{{ currentTab === 2 ? '关注动态' : '最新内容' }}</text>
        <text class="section-sub">{{ hasMore ? '持续更新中' : '已经到底了' }}</text>
      </view>

      <view v-for="post in postList" :key="post.id" class="feed-card" @click="goPostDetail(post)">
        <view class="feed-author">
          <view class="feed-avatar-box">
            <image :src="post.avatar || '/static/logo.png'" class="feed-avatar" mode="aspectFill"></image>
            <image
              v-if="getAvatarFrame(post)"
              :src="getAvatarFrame(post)"
              class="feed-frame"
              mode="scaleToFill"
            ></image>
            <view
              v-if="parseInt(post.vip || 0) === 1"
              class="feed-vip-icon"
            >
              <view class="feed-vip-check">
                <image src="/static/icon/vip-check-bold-white.svg" class="feed-vip-check-img" mode="aspectFit"></image>
              </view>
            </view>
          </view>

          <view class="feed-author-meta">
            <view class="feed-author-top">
              <text class="feed-name" :class="{ 'vip-rainbow-text': isVipUser(post) }">{{ getAuthorName(post) }}</text>
              <view
                v-if="parseInt(post.vip || 0) === 1"
                class="feed-name-vip-badge"
              >
                <view class="vip-badge-inner">
                  <view class="vip-badge-crown">
                    <image src="/static/icon/vip-crown-white.svg" class="vip-crown-img" mode="aspectFit"></image>
                  </view>
                  <text class="vip-badge-text">VIP</text>
                </view>
              </view>
              <view class="feed-level-tag" :class="'lv-tier-' + getLevelTier(getLevelDisplay(post))">
                <view class="level-star">
                  <image src="/static/icon/level-star-white.svg" class="level-star-img" mode="aspectFit"></image>
                </view>
                <text class="feed-level-text">Lv.{{ getLevelDisplay(post) }}</text>
              </view>
              <view v-if="post.user_title" class="feed-title-badge">
                <view class="feed-title-badge-icon">
                  <image src="/static/icon/title-check-white.svg" class="title-check-img" mode="aspectFit"></image>
                </view>
                <text class="feed-title-badge-text">{{ cleanText(post.user_title) }}</text>
              </view>
            </view>
            <view class="feed-time-wrap">
              <text class="feed-time">{{ post.create_time || '' }}</text>
              <view v-if="parseInt(post.is_fancy || 0) === 1 && post.display_number" class="fancy-badge-inline">
                <image src="/static/vip/lianghao.webp" class="fbi-icon" mode="aspectFit"></image>
                <text class="fbi-num">{{ post.display_number }}</text>
              </view>
            </view>
          </view>
        </view>

        <text class="feed-title" :class="{ 'vip-title': isVipUser(post) }">{{ getPostTitle(post) }}</text>

        <text v-if="getPostDesc(post)" class="feed-desc">{{ getPostDesc(post) }}</text>

        <view v-if="post.douyin_url && post.douyin_cover" class="feed-douyin-card" @click.stop="openDouyin(post)">
          <image :src="post.douyin_cover" class="douyin-cover" mode="aspectFill"></image>
          <view class="douyin-play-btn">
            <view class="douyin-play-icon"></view>
          </view>
          <view class="douyin-info">
            <text class="douyin-title">{{ post.douyin_title || '抖音视频' }}</text>
          </view>
        </view>

        <view v-if="shouldRenderMedia(post)" class="feed-media" @click.stop="onMediaClick(post)">
          <view
            class="feed-media-grid"
            :class="`count-${getDisplayMedia(post).length}`"
          >
            <view
              v-for="(img, index) in getDisplayMedia(post)"
              :key="post.id + '-img-' + index"
              class="media-item"
            >
              <image :src="img" class="media-image" mode="aspectFill" lazy-load></image>
              <view v-if="post.video && index === 0" class="video-mark">视频</view>
              <view
                v-else-if="!post.video && getMediaCount(post) > 3 && index === 2"
                class="more-mask"
              >
                <text>+{{ getMediaCount(post) - 3 }}</text>
              </view>
            </view>
            

          </view>
        </view>

        <view class="feed-footer">
          <text v-if="post.circle_name" class="feed-circle">{{ cleanText(post.circle_name) }}</text>
          <view class="feed-actions">
            <view class="feed-action">
              <image src="/static/post/xih1.png" class="feed-action-icon" mode="aspectFit"></image>
              <text>{{ formatNum(post.like_count) }}</text>
            </view>
            <view class="feed-action">
              <image src="/static/post/pl.png" class="feed-action-icon" mode="aspectFit"></image>
              <text>{{ formatNum(post.comment_count) }}</text>
            </view>
            <view class="feed-action">
              <image src="/static/tab/ydl.png" class="feed-action-icon" mode="aspectFit"></image>
              <text>{{ formatNum(post.view_count) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="isLoading" class="loading-line">
        <view class="mini-spinner"></view>
      </view>
      <view v-else-if="postList.length === 0" class="empty-wrap">
        <image src="/static/icon/nullu.png" class="empty-img" mode="widthFix"></image>
        <text>暂时没有内容</text>
      </view>
      <view v-else-if="!hasMore" class="end-line">THE END</view>
    </view>

    <view style="height: 128rpx;"></view>

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
  name: 'HomeTextFlowTheme',
  components: { DouyinPlayer },
  props: {
    userInfo: { type: Object, default: null },
    currentTab: { type: Number, default: 1 },
    bannerList: { type: Array, default: () => [] },
    zhidingPostList: { type: Array, default: () => [] },
    followList: { type: Array, default: () => [] },
    postList: { type: Array, default: () => [] },
    circleList: { type: Array, default: () => [] },
    currentCircleId: { type: Number, default: 0 },
    isLoading: { type: Boolean, default: false },
    hasMore: { type: Boolean, default: true }
  },
  data() {
    return {
      brokenBannerIndexes: [],
      /* 抖音式全屏播放器（视频帖专用） */
      showDouyinPlayer: false,
      douyinVideoList: [],
      douyinIndex: 0,
      douyinPostTitle: '',
      douyinAuthorAvatar: '',
      quickEntries: [
        { title: '聚合应用', icon: '', iconClass: 'quick-icon-hub', url: '/pages/hub/hub' },
        { title: '积分好礼', icon: '', iconClass: 'quick-icon-lottery', url: '/pages/lottery/index' },
        { title: '靓号商城', icon: '', iconClass: 'quick-icon-shop', url: '/pages/fancy/shop' },
        { title: '权益认证', icon: '', iconClass: 'quick-icon-cert', url: '/pages/user/zhuanye' },
        { title: '任务中心', icon: '', iconClass: 'quick-icon-task', url: '/pages/mission/mission' },
        { title: '小黑屋', icon: '', iconClass: 'quick-icon-blackhole', url: '/pages/blackhole/blackhole' }
      ]
    }
  },
  computed: {
    displayCircleList() {
      return (this.circleList || [])
        .filter(item => item && item.id && item.name)
        .slice(0, 8)
    },
    safeBannerList() {
      return (this.bannerList || []).filter((item, index) => item && item.image && !this.brokenBannerIndexes.includes(index))
    }
  },
  methods: {
    isUsableMedia(url) {
      const value = String(url || '').trim()
      if (!value) return false
      const lowered = value.toLowerCase()
      return !['null', 'undefined', 'false', '[]', '[object object]'].includes(lowered)
    },

    cleanText(text) {
      return String(text || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\[([^\]]*?)\(uid:\d+\)\]/gi, '$1')
        .replace(/@?([^\s\]]+)\(uid:\d+\)/gi, '$1')
        .replace(/\(uid:\d+\)/gi, '')
        .replace(/uid:\d+/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    },

    isLockedPost(post) {
      if (!post) return false
      return (parseInt(post.is_paid || 0) === 1 || parseInt(post.is_comment_unlock || 0) === 1) && !post.is_unlocked
    },

    isFancyPost(post) {
      return parseInt(post && post.is_fancy ? post.is_fancy : 0) === 1
    },

    isVipUser(post) {
      return parseInt(post && post.vip ? post.vip : 0) === 1
    },

    isPaidLocked(post) {
      if (!post) return false
      return parseInt(post.is_paid || 0) === 1 && !post.is_unlocked
    },

    getAvatarFrame(post) {
      return (post && (post.current_frame_img || post.frame_img)) || ''
    },

    getAuthorName(post) {
      return this.cleanText(post && (post.name || post.username || post.display_number)) || '匿名用户'
    },

    getPostTitle(post) {
      const title = this.cleanText(post && post.title)
      if (title) return title
      const desc = this.cleanText(post && (post.plainContent || post.plain_content || post.content))
      return desc ? desc.slice(0, 28) : '动态'
    },

    getPostDesc(post) {
      const desc = this.cleanText(post && (post.plainContent || post.plain_content || post.content))
      if (this.isLockedPost(post)) {
        return desc ? desc.slice(0, 60) : '进入详情后可查看完整内容'
      }

      const title = this.getPostTitle(post)
      if (!desc) return ''
      if (desc === title) return ''
      return desc
    },

    getAllMedia(post) {
      if (!post) return []
      if (post.isTextOnly) return []

      let list = []
      if (Array.isArray(post.images)) {
        list = post.images
      } else if (typeof post.images === 'string' && post.images.trim()) {
        try {
          list = post.images.startsWith('[') ? JSON.parse(post.images) : post.images.split(',')
        } catch (e) {
          list = post.images.split(',')
        }
      }

      list = list.filter(item => this.isUsableMedia(item))

      if (!list.length && this.isUsableMedia(post.coverImage)) {
        list = [String(post.coverImage).trim()]
      }

      return list
    },

    getMediaCount(post) {
      return this.getAllMedia(post).length
    },

    getDisplayMedia(post) {
      const list = this.getAllMedia(post)
      if (!list.length) return []
      if (post && post.video) return list.slice(0, 1)
      return list.length >= 3 ? list.slice(0, 3) : list.slice(0, list.length)
    },

    shouldRenderMedia(post) {
      if (post && post.isTextOnly) return false
      if (post && post.douyin_url && post.douyin_cover) return false
      return this.getDisplayMedia(post).length > 0
    },

    getLevelDisplay(post) {
      return calcLevelDisplay(post && post.lv ? post.lv : 0)
    },

    // 等级分层：用于配色，参考B站等级体系
    // 1-2级: 新手(灰蓝)  3-4级: 进阶(绿)  5-6级: 资深(蓝)
    // 7-8级: 高手(紫)    9-10级: 大神(金)  11+: 传说(红)
    getLevelTier(lv) {
      const n = parseInt(lv) || 0
      if (n <= 2) return 1
      if (n <= 4) return 2
      if (n <= 6) return 3
      if (n <= 8) return 4
      if (n <= 10) return 5
      return 6
    },

    bannerImg(url) {
      if (!url) return ''
      if (/^https?:\/\//i.test(url)) return url
      const base = (bmsBaseUrl || '').replace(/\/+$/, '')
      return base + (url.startsWith('/') ? url : '/' + url)
    },

    markBannerError(index) {
      if (!this.brokenBannerIndexes.includes(index)) {
        this.brokenBannerIndexes.push(index)
      }
    },

    selectCircle(circleId) {
      const id = Number(circleId || 0)
      if (Number(this.currentCircleId) === id) return
      this.$emit('circle-change', id)
    },

    handleBannerClick(item) {
      if (!item || !item.link) return
      if (item.link.indexOf('http') === 0) {
        uni.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(item.link)}` })
      } else {
        uni.navigateTo({ url: item.link })
      }
    },

    goEntry(url) {
      if (!url) return
      uni.navigateTo({ url })
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
.text-flow-theme {
  min-height: 100vh;
  background: var(--cr-surface-alt);
  color: var(--cr-text);
}

.channel-strip {
  background: var(--cr-surface);
  border-bottom: 1rpx solid #eee6de;
}

.channel-scroll {
  white-space: nowrap;
}

.channel-list {
  display: flex;
  gap: 16rpx;
  padding: 18rpx 24rpx 16rpx;
}

.channel-pill {
  flex: 0 0 auto;
  height: 54rpx;
  line-height: 54rpx;
  padding: 0 24rpx;
  border-radius: 28rpx;
  background: #f5efe7;
  color: #75584a;
  font-size: 25rpx;
  font-weight: 700;
}

.channel-pill.active {
  background: #1f2937;
  color: #fff;
}

.hero-band {
  padding: 20rpx 24rpx 0;
  background: var(--cr-surface);
}

.hero-swiper,
.hero-empty {
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

.hero-empty {
  padding: 0 34rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(135deg, #273444 0%, #a05a52 100%);
}

.hero-empty-title {
  color: #fff;
  font-size: 40rpx;
  font-weight: 800;
}

.hero-empty-sub {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 26rpx;
  line-height: 1.5;
}

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
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  position: relative;
  overflow: hidden;
}

/* 5 个入口的彩色渐变背景（135deg 双色渐变 + 同色阴影） */
.quick-icon-hub {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 5rpx 14rpx rgba(118, 75, 162, 0.32);
}
.quick-icon-lottery {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  box-shadow: 0 5rpx 14rpx rgba(255, 107, 107, 0.32);
}
.quick-icon-shop {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  box-shadow: 0 5rpx 14rpx rgba(17, 153, 142, 0.32);
}
.quick-icon-cert {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  box-shadow: 0 5rpx 14rpx rgba(79, 172, 254, 0.32);
}
.quick-icon-task {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 5rpx 14rpx rgba(245, 87, 108, 0.32);
}
.quick-icon-blackhole {
  background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%);
  box-shadow: 0 5rpx 14rpx rgba(31, 41, 55, 0.32);
}

.quick-icon-svg {
  width: 44rpx;
  height: 44rpx;
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

.quick-icon-img {
  width: 58rpx;
  height: 58rpx;
  display: block;
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

.pinned-panel,
.follow-panel,
.feed-section {
  margin-top: 18rpx;
  background: var(--cr-surface);
}

.pinned-panel {
  padding: 18rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.pinned-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.pinned-mark {
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #fff1f3;
  color: #c2415b;
  font-size: 22rpx;
  font-weight: 800;
}

.pinned-title {
  font-size: 26rpx;
  color: var(--cr-text);
  font-weight: 700;
}

.pinned-swiper {
  flex: 1;
  height: 54rpx;
}

.pinned-row {
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.pinned-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 26rpx;
  color: #4b5563;
}

.pinned-arrow {
  color: #9aa3b2;
  font-size: 34rpx;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 24rpx 24rpx 12rpx;
}

.section-head.compact {
  padding-bottom: 8rpx;
}

.section-title {
  font-size: 32rpx;
  color: var(--cr-text);
  font-weight: 900;
}

.section-sub {
  font-size: 23rpx;
  color: #9aa1ad;
}

.follow-scroll {
  width: 100%;
  white-space: nowrap;
}

.follow-list {
  display: flex;
  gap: 24rpx;
  padding: 6rpx 24rpx 24rpx;
}

.follow-item {
  width: 104rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.follow-avatar-box {
  position: relative;
  width: 82rpx;
  height: 82rpx;
  overflow: visible;
}

.follow-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #eef2f7;
}

.follow-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 168%;
  height: 168%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.follow-name {
  max-width: 104rpx;
  font-size: 22rpx;
  color: #4b5565;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-empty {
  padding: 20rpx 0;
  color: #8a94a6;
  font-size: 26rpx;
}

.feed-section {
  padding-bottom: 22rpx;
  background: transparent;
}

.feed-card {
  margin: 16rpx 20rpx 0;
  padding: 26rpx 24rpx 22rpx;
  border-radius: var(--cr-panel-radius, 28rpx);
  background: var(--cr-surface);
  border: 1rpx solid var(--cr-border);
  box-shadow: var(--cr-panel-shadow);
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.feed-author {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.feed-avatar-box {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  overflow: visible;
}

.feed-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #eef2f7;
}

.feed-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 168%;
  height: 168%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 头像右下角认证图标（橙色渐变圆 + 白色勾号，微博认证风格） */
.feed-vip-icon {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 24rpx;
  height: 24rpx;
  z-index: 3;
  background: linear-gradient(135deg, #ffb74d 0%, #ff6f00 100%);
  border: 2rpx solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1rpx 4rpx rgba(255, 111, 0, 0.45);
  overflow: hidden;
}
.feed-vip-check {
  width: 62%;
  height: 62%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.feed-vip-check .feed-vip-check-img {
  width: 100%;
  height: 100%;
}

.feed-author-meta {
  flex: 1;
  min-width: 0;
}

.feed-author-top {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  padding-right: 24rpx;
}

.feed-name {
  max-width: 250rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28rpx;
  font-weight: 800;
  color: var(--cr-text);
}

.feed-name-badge {
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
  margin-right: 2rpx;
  align-self: flex-start;
}

/* 等级标签：渐变胶囊 + 星星图标 + Lv数字，参考B站等级配色 */
.feed-level-tag {
  flex-shrink: 0;
  padding: 3rpx 10rpx 3rpx 8rpx;
  min-height: 32rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: #fff;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.12);
  border: 1rpx solid rgba(255, 255, 255, 0.35);
}
.feed-level-tag .level-star {
  width: 20rpx;
  height: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.feed-level-tag .level-star .level-star-img {
  width: 100%;
  height: 100%;
}

/* 6 档等级配色（渐变背景） */
.lv-tier-1 { background: linear-gradient(135deg, #90a4ae 0%, #607d8b 100%); } /* 新手-灰蓝 */
.lv-tier-2 { background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%); } /* 进阶-绿 */
.lv-tier-3 { background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%); } /* 资深-蓝 */
.lv-tier-4 { background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%); } /* 高手-紫 */
.lv-tier-5 { background: linear-gradient(135deg, #ffb74d 0%, #fb8c00 100%); } /* 大神-金 */
.lv-tier-6 {
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 50%, #ee0979 100%);
  box-shadow: 0 2rpx 6rpx rgba(238, 9, 121, 0.35);
} /* 传说-粉红渐变 */

.feed-level-text {
  font-size: 18rpx;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

.feed-title-badge {
  max-width: 180rpx;
  padding: 3rpx 10rpx 3rpx 8rpx;
  min-height: 32rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #ffb74d 0%, #ff6f00 100%);
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  min-width: 0;
  flex-shrink: 1;
  color: #fff;
  box-shadow: 0 2rpx 4rpx rgba(255, 111, 0, 0.3);
  border: 1rpx solid rgba(255, 255, 255, 0.35);
}
.feed-title-badge-icon {
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.feed-title-badge-icon .title-check-img {
  width: 100%;
  height: 100%;
}

.feed-title-badge-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18rpx;
  line-height: 1.2;
  color: #fff;
  font-weight: 700;
}

/* VIP 徽章：金红渐变胶囊 + 王冠 + VIP字样 + 流光动画（参考QQ会员风格） */
.feed-name-vip-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  border-radius: 18rpx;
}
.vip-badge-inner {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  min-height: 32rpx;
  box-sizing: border-box;
  padding: 3rpx 12rpx 3rpx 8rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #ff5e3a 0%, #ff2a68 30%, #ffb300 65%, #ffd54f 100%);
  box-shadow: 0 2rpx 8rpx rgba(255, 46, 104, 0.45), inset 0 1rpx 0 rgba(255,255,255,0.4);
  border: 1rpx solid rgba(255, 220, 100, 0.7);
  position: relative;
  overflow: hidden;
}
.vip-badge-inner::before {
  content: '';
  position: absolute;
  top: 0; left: -150%;
  width: 80%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%);
  transform: skewX(-25deg);
  animation: vipShine 3s ease-in-out infinite;
}
@keyframes vipShine {
  0% { left: -150%; }
  60% { left: 200%; }
  100% { left: 200%; }
}
.vip-badge-crown {
  width: 20rpx;
  height: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.vip-badge-crown .vip-crown-img {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 1rpx 2rpx rgba(0,0,0,0.3));
}
.vip-badge-text {
  font-size: 18rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 1rpx;
  line-height: 1;
  text-shadow: 0 1rpx 2rpx rgba(140, 30, 0, 0.6);
  position: relative;
  z-index: 1;
}

.feed-time-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.feed-time {
  font-size: 22rpx;
  color: #9aa1ad;
}

.feed-time-vip-badge {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}

/* 靓号徽章：暗金底色 + 金色边框 + 王冠 + 靓字（参考QQ靓号图标风格） */
.fancy-badge-inline {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  background: linear-gradient(135deg, #1a1300 0%, #2e2200 40%, #1a1300 100%);
  border: 1rpx solid rgba(255, 200, 80, 0.55);
  padding: 5rpx 14rpx 5rpx 8rpx;
  border-radius: 22rpx;
  box-shadow: 0 2rpx 10rpx rgba(212, 175, 55, 0.28), inset 0 1rpx 0 rgba(255, 220, 80, 0.18);
  position: relative;
  overflow: hidden;
}
.fancy-badge-inline::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 215, 100, 0.25) 50%, transparent 100%);
  transform: skewX(-25deg);
  animation: fancyShine 4s ease-in-out infinite 1s;
}
@keyframes fancyShine {
  0% { left: -100%; }
  50% { left: 200%; }
  100% { left: 200%; }
}

.fbi-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 1;
  position: relative;
  z-index: 1;
}

.fbi-num {
  font-size: 22rpx;
  font-weight: 800;
  color: #ffd76b;
  letter-spacing: 1.5rpx;
  font-family: monospace;
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.5);
  position: relative;
  z-index: 1;
}

/* 靓号ID（普通号码显示）：暗金背景 + 金色文字（参考QQ靓号ID） */
.ordinary-num-inline {
  font-size: 22rpx;
  color: #ffd76b;
  background: linear-gradient(135deg, #1a1300 0%, #2e2200 50%, #1a1300 100%);
  border: 1rpx solid rgba(255, 200, 80, 0.4);
  padding: 3rpx 12rpx;
  border-radius: 18rpx;
  font-weight: 700;
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.4);
}

.feed-title {
  display: block;
  margin-top: 20rpx;
  font-size: 32rpx;
  line-height: 1.38;
  color: var(--cr-text);
  font-weight: 900;
  word-break: break-word;
}

.feed-desc {
  display: -webkit-box;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #5b6470;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.feed-media {
  margin-top: 18rpx;
}

.feed-media-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.feed-media-grid.count-1 {
  display: block;
}

.feed-media-grid.count-2 {
  display: flex;
}

.feed-media-grid.count-3 {
  display: flex;
}

.media-item {
  position: relative;
  width: calc((100% - 20rpx) / 3);
  aspect-ratio: 1 / 1;
  border-radius: 18rpx;
  overflow: hidden;
  background: #edf0f4;
}

.feed-media-grid.count-2 .media-item {
  width: calc((100% - 10rpx) / 2);
}

.feed-media-grid.count-1 .media-item {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.media-image {
  width: 100%;
  height: 100%;
  display: block;
}

.video-mark,
.more-mask {
  position: absolute;
  right: 12rpx;
  bottom: 12rpx;
  min-width: 46rpx;
  height: 46rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.video-mark {
  font-size: 20rpx;
}

.more-mask text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}

.feed-media-locked {
  min-height: 220rpx;
  border-radius: 20rpx;
  padding: 30rpx 28rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #f1f2f5 0%, #e5e7eb 100%);
  text-align: center;
  gap: 20rpx;
}

.feed-media-locked-img {
  width: 100%;
  border-radius: 16rpx;
}

.feed-media-paid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.feed-media-paid-price {
  color: #ff2442;
  font-size: 32rpx;
  font-weight: 700;
}

.feed-lock-icon {
  position: relative;
  width: 46rpx;
  height: 58rpx;
}

.feed-lock-head {
  position: absolute;
  left: 11rpx;
  top: 0;
  width: 24rpx;
  height: 22rpx;
  border: 4rpx solid rgba(107, 114, 128, 0.9);
  border-bottom: none;
  border-radius: 18rpx 18rpx 0 0;
}

.feed-lock-body {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 46rpx;
  height: 36rpx;
  border-radius: 10rpx;
  background: rgba(107, 114, 128, 0.88);
}

.feed-media-locked-sub {
  margin-top: 18rpx;
  color: var(--cr-text-muted);
  font-size: 24rpx;
  line-height: 1.55;
}

.feed-footer {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f2ebe4;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feed-actions {
  display: flex;
  align-items: center;
  gap: 34rpx;
  min-width: 0;
}

.feed-action {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  color: var(--cr-text-muted);
  font-size: 24rpx;
}

.feed-action-icon {
  width: 28rpx;
  height: 28rpx;
}

.feed-circle-corner {
  position: absolute;
  right: 22rpx;
  bottom: 18rpx;
  max-width: 148rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 5rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(17, 17, 17, 0.94);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}

.feed-circle {
  max-width: 148rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 5rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(17, 17, 17, 0.94);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}

.fancy-text {
  color: #ff2442 !important;
  font-weight: 900 !important;
}
.vip-title {
  color: #ff2442 !important;
  font-weight: 900 !important;
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

.loading-line {
  height: 110rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-spinner {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 4rpx solid #d9d8d5;
  border-top-color: #a05a52;
  animation: spin 0.8s linear infinite;
}

.empty-wrap {
  min-height: 320rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8a94a6;
  font-size: 26rpx;
}

.empty-img {
  width: 180rpx;
  margin-bottom: 16rpx;
  opacity: 0.72;
}

.end-line {
  padding: 32rpx 0 8rpx;
  text-align: center;
  color: #b0b8c6;
  font-size: 22rpx;
}

.feed-douyin-card {
  position: relative;
  margin-top: 16rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background: #000;
}

.douyin-cover {
  width: 100%;
  height: 62vh;
  max-height: 1000rpx;
  min-height: 480rpx;
}

.douyin-play-btn {
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
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.douyin-play-icon {
  width: 0;
  height: 0;
  border-top: 20rpx solid transparent;
  border-bottom: 20rpx solid transparent;
  border-left: 32rpx solid #fff;
  border-radius: 4rpx;
  margin-left: 8rpx;
}

.douyin-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 20rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
}

.douyin-title {
  display: block;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.douyin-author {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 22rpx;
  margin-top: 6rpx;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media screen and (max-width: 375px) {
  .feed-card {
    margin-left: 18rpx;
    margin-right: 18rpx;
    padding-left: 18rpx;
    padding-right: 18rpx;
  }

  .feed-title {
    font-size: 30rpx;
  }

  .feed-desc {
    font-size: 24rpx;
  }

  .feed-author {
    gap: 20rpx;
  }

  .feed-name {
    max-width: 250rpx;
  }

  .feed-actions {
    gap: 24rpx;
  }

  .feed-name {
    max-width: 180rpx;
  }

  .feed-circle-corner {
    max-width: 130rpx;
  }
}
</style>
