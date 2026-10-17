<template>
  <view class="index-container" :class="themeClass">
    <!-- 权限拒绝提示 -->
    <view class="access-denied" v-if="accessDenied">
      <view class="denied-content">
        <view class="denied-icon"><image src="/static/icon/lock-gray.svg" class="denied-icon-img" mode="aspectFit"></image></view>
        <view class="denied-title">无权限访问</view>
        <view class="denied-reason">{{ denyReason }}</view>
        <view class="denied-tip">请联系管理员申请开通权限</view>
        <view class="denied-btn" @click="goBack">返回上一页</view>
      </view>
    </view>

    <view class="pc-layout-wrapper" v-else>
      <scroll-view
        scroll-y
        class="main-scroll"
        @scrolltolower="loadMorePosts"
        :lower-threshold="800"
        enable-back-to-top
        refresher-enabled
        :refresher-triggered="isRefresherTriggered"
        refresher-default-style="none"
        refresher-background="transparent"
        :refresher-threshold="60"
        @refresherrefresh="onNativeRefresh"
      >
      <view class="fix-head-block" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="circle-hero">
          <view class="hero-info">
            <image :src="circleInfo.image || '/static/logo.png'" class="hero-avatar" mode="aspectFill"></image>
            <view class="hero-main">
              <text class="hero-name">{{ circleInfo.name || '圈子' }}</text>
              <view class="hero-stats">
                <text>{{ formatNum(circleInfo.post_count) }} 总帖子</text>
                <text>{{ formatNum(circleInfo.member_count) }} 成员</text>
              </view>
            </view>
            <view class="join-btn" :class="{ joined: isJoined }" @click="toggleJoin">
              <text>{{ isJoined ? '已加入' : '加入' }}</text>
            </view>
          </view>
          <text class="hero-desc">{{ circleInfo.desc || '欢迎来到这个圈子，一起分享最新动态。' }}</text>
        </view>

        <view class="mod-section member-section" v-if="displayMembers.length > 0">
          <view class="section-head" @click="goMemberList('moderators')">
            <text class="section-title">圈子版主</text>
            <view class="section-more-wrap">
              <text class="section-more">{{ displayMembers.length }} 人</text>
              <text class="section-arrow">›</text>
            </view>
          </view>
          <scroll-view scroll-x class="member-scroll" :show-scrollbar="false">
            <view class="member-list">
              <view class="member-item" v-for="(u, idx) in displayMembers" :key="idx" @click="goUserProfile(u.id)">
                <view class="member-avatar-box">
                  <image :src="u.avatar || '/static/default-avatar.png'" class="member-avatar" mode="aspectFill"></image>
                  <image v-if="u.frame_img" :src="u.frame_img" class="member-frame" mode="aspectFit"></image>
                  <text class="moderator-mark" v-if="u.is_moderator">版</text>
                </view>
                <text class="member-name">{{ u.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="mod-section member-section" v-if="allMembers.length > 0">
          <view class="section-head" @click="goMemberList('members')">
            <text class="section-title">圈子成员</text>
            <view class="section-more-wrap">
              <text class="section-more">{{ circleInfo.member_count }} 人</text>
              <text class="section-arrow">›</text>
            </view>
          </view>
          <scroll-view scroll-x class="member-scroll" :show-scrollbar="false">
            <view class="member-list">
              <view class="member-item" v-for="(u, idx) in allMembers" :key="'m' + idx" @click="goUserProfile(u.id)">
                <view class="member-avatar-box">
                  <image :src="u.avatar || '/static/default-avatar.png'" class="member-avatar" mode="aspectFill"></image>
                  <image v-if="u.frame_img" :src="u.frame_img" class="member-frame" mode="aspectFit"></image>
                  <text class="moderator-mark" v-if="u.is_moderator">版</text>
                </view>
                <text class="member-name">{{ u.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="pinned-panel" v-if="pinnedPosts.length > 0">
          <view class="pinned-list">
            <view v-for="post in pinnedPosts" :key="'pin-' + post.id" class="pinned-row" @click="goPost(post.id)">
              <view class="pinned-icon-box">
                <text class="pinned-icon-text">置顶</text>
              </view>
              <text class="pinned-text">{{ post.title || post.plainContent || '推荐内容' }}</text>
              <text class="pinned-arrow">›</text>
            </view>
          </view>
        </view>

        <view class="feed-tabs">
          <view class="feed-tab" :class="{ active: postViewMode === 'normal' }" @click="switchPostView('normal')">全部帖子</view>
          <view class="feed-tab" :class="{ active: postViewMode === 'pending' }" @click="switchPostView('pending')" v-if="isModerator">待审核</view>
          <view class="feed-tab" :class="{ active: filterType === 'new' }" @click="switchFilter('new')">最新</view>
          <view class="feed-tab" :class="{ active: filterType === 'hot' }" @click="switchFilter('hot')">热门</view>
        </view>
      </view>

      <!-- 整页滚动容器（含头部与帖子） -->
        <view class="waterfall-wrap" v-if="firstLoading">
          <view class="waterfall-col" v-for="colIdx in [0, 1]" :key="colIdx">
            <view class="skeleton-card fade-in-up" v-for="i in 2" :key="i">
              <view class="sk-img"></view>
              <view class="sk-txt"></view>
              <view class="sk-user"></view>
            </view>
          </view>
        </view>
        <view class="waterfall-wrap" v-else-if="postList.length > 0">
          <view class="waterfall-col" v-for="(col, colIndex) in [colL, colR]" :key="colIndex">
            <view class="post-card fade-in-up" v-for="post in col" :key="post.id" @click="goPost(post.id)">
              <view v-if="parseInt(post.status || 1) === 0" class="status-mask">
                <text class="status-text">已被屏蔽</text>
              </view>
              <view v-else-if="parseInt(post.status || 1) === 2" class="status-mask">
                <text class="status-text">审核中</text>
              </view>
              <text class="pin-badge" v-if="parseInt(post.zhiding || 0) === 1">置顶</text>

              <!-- 抖音视频 -->
              <view v-if="post.douyin_url && post.douyin_cover" class="card-douyin-wrap" @click.stop="openPostVideo(post)">
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
                <view v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked" class="lock-badge comment-lock">
                  <text class="lock-badge-text">评论可见</text>
                </view>
              </view>

              <!-- 图文封面 -->
              <view v-else-if="post.coverImage || (isLockedPost(post) && getFirstImage(post))" class="card-img-wrap">
                <image :src="post.coverImage || getFirstImage(post)" class="card-img" mode="widthFix" lazy-load></image>
                <image v-if="post.video" src="/static/icon/video.png" class="video-badge-img"></image>
                <view v-else-if="post.images && post.images.length > 1" class="img-count-badge">
                  <text>{{ post.images.length }}</text>
                </view>
                <view v-if="parseInt(post.is_paid || 0) === 1 && !post.is_unlocked" class="lock-badge paid-lock">
                  <text class="lock-badge-text">¥{{ post.price || 0 }}</text>
                </view>
                <view v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked" class="lock-badge comment-lock">
                  <text class="lock-badge-text">评论可见</text>
                </view>
              </view>

              <!-- 纯文字封面 -->
              <view v-else-if="post.isTextOnly && post.textCoverData" class="card-text-cover" :style="{ background: post.textCoverData.gradient }">
                <view class="text-cover-content">
                  <text class="text-cover-title">{{ post.textCoverData.title }}</text>
                  <text v-if="post.textCoverData.subtitle && post.textCoverData.subtitle !== post.textCoverData.title" class="text-cover-subtitle">{{ post.textCoverData.subtitle }}</text>
                </view>
                <view class="text-cover-tag">文字</view>
                <view v-if="parseInt(post.is_paid || 0) === 1 && !post.is_unlocked" class="lock-badge paid-lock">
                  <text class="lock-badge-text">¥{{ post.price || 0 }}</text>
                </view>
                <view v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked" class="lock-badge comment-lock">
                  <text class="lock-badge-text">评论可见</text>
                </view>
              </view>

              <!-- 纯文字 -->
              <view v-else class="card-text-only">
                <text class="text-preview">{{ post.plainContent || '点击查看详情' }}</text>
                <view v-if="parseInt(post.is_paid || 0) === 1 && !post.is_unlocked" class="lock-badge paid-lock">
                  <text class="lock-badge-text">¥{{ post.price || 0 }}</text>
                </view>
                <view v-else-if="parseInt(post.is_comment_unlock || 0) === 1 && !post.is_unlocked" class="lock-badge comment-lock">
                  <text class="lock-badge-text">评论可见</text>
                </view>
              </view>

              <view class="card-content">
                <view v-if="post.mark || post.classification_name" class="card-tags">
                  <text class="card-tag" v-if="post.mark">{{ post.mark }}</text>
                  <text class="card-tag tag-secondary" v-else-if="post.classification_name">{{ post.classification_name }}</text>
                </view>

                <text class="card-title" :class="{ 'vip-title': isVipUser(post) }">{{ getPostTitle(post) }}</text>

                <view class="card-footer">
                  <view class="user-row" @click.stop="goUserProfile(post.user_id)">
                    <view class="user-avatar-box">
                      <image :src="post.avatar || '/static/logo.png'" class="user-avatar" mode="aspectFill" lazy-load></image>
                      <image v-if="getAvatarFrame(post)" :src="getAvatarFrame(post)" class="user-frame" mode="scaleToFill"></image>
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

              <view class="moderator-actions" v-if="isModerator">
                <view class="mod-btn" @click.stop="moderatePost(post, 2)">设为待审</view>
                <view class="mod-btn primary" @click.stop="moderatePost(post, 1)">恢复正常</view>
                <view class="mod-btn danger" @click.stop="deleteManagedPost(post)">删除</view>
              </view>
            </view>
          </view>
        </view>

        <view class="status-area" v-if="!firstLoading">
          <view class="loading-wrap" v-if="loading"><view class="spinner"></view></view>
          <view class="empty-wrap" v-else-if="postList.length === 0">
            <image src="/static/icon/nullu.png" class="empty-img" mode="widthFix"></image>
            <text>暂无内容</text>
          </view>
          <view class="nomore-wrap" v-else-if="!hasMore">
            <text class="dot"></text><text>THE END</text><text class="dot"></text>
          </view>
        </view>
        <view style="height: 150rpx;"></view>
      </scroll-view>
    </view>
    <PublishModal 
      :visible="showPublishModal" 
      @close="showPublishModal = false"
      @select="onPublishSelect"
    />

    <DouyinPlayer
      :show="showDouyinPlayer"
      :videoList="douyinVideoList"
      :userInfo="userInfo"
      @update:show="showDouyinPlayer = $event"
    />





    <view class="smart-toast" :class="{ show: toast.show }">
      <text>{{ toast.msg }}</text>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js';
import PublishModal from '../../components/PublishModal.vue';
import { getLevelDisplay as calcLevelDisplay } from '../../common/level.js';
import DouyinPlayer from '../../components/DouyinPlayer.vue';
import { buildDouyinVideoList } from '../../common/douyinPlayer.js';

export default {
  components: {
    PublishModal,
    DouyinPlayer
  },
  data() {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      navTotalHeight: 64,
      menuButtonHeight: 32,
      menuButtonWidth: 87,
      circleId: 0,
      circleInfo: { name: '', image: '', desc: '', member_count: 0, post_count: 0 },
      isJoined: false,
      isModerator: false,
      userInfo: null,
      memberList: [],
      showTitle: false,
      filterType: 'new',
      postList: [],
      colL: [],
      colR: [],
      page: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      joinLoading: false,
      toast: { show: false, msg: '' },
      loadingMessage: '',
      firstLoading: true,
      showPublishModal: false,
      showDouyinPlayer: false,
      douyinVideoList: [],
      isRefresherTriggered: false,
      accessDenied: false,
      denyReason: ''
    };
  },
  computed: {
    circleCover() {
      return this.circleInfo.cover || this.circleInfo.bg_image || this.circleInfo.background || this.circleInfo.image || '/static/logo.png';
    },
    pinnedPosts() {
      return this.postList
        .filter(p => parseInt(p.zhiding || 0) === 1 && Number(p.circle_id || 0) === Number(this.circleId || 0))
        .slice(0, 5);
    },
    feedPosts() {
      return this.postList;
    },
    displayMembers() {
      const map = new Map();
      const mods = Array.isArray(this.circleInfo.moderators) ? this.circleInfo.moderators : [];
      mods.forEach(u => {
        if (!u) return;
        const uid = u.uid || u.id || u.user_id;
        if (!uid) return;
        map.set(String(uid), { ...u, id: uid, uid: uid, is_moderator: true, name: u.name || u.nickname || u.username || '用户' });
      });
      return Array.from(map.values()).slice(0, 12);
    },
    allMembers() {
      const map = new Map();
      const mods = Array.isArray(this.circleInfo.moderators) ? this.circleInfo.moderators : [];
      mods.forEach(u => {
        if (!u) return;
        const uid = u.uid || u.id || u.user_id;
        if (!uid) return;
        map.set(String(uid), { ...u, id: uid, uid: uid, is_moderator: true, name: u.name || u.nickname || u.username || '用户' });
      });
      const joined = Array.isArray(this.memberList) ? this.memberList : [];
      joined.forEach(u => {
        if (!u) return;
        const uid = u.uid || u.id || u.user_id;
        if (!uid) return;
        const key = String(uid);
        if (!map.has(key)) map.set(key, { ...u, id: uid, uid: uid, is_moderator: !!u.is_moderator, name: u.name || u.nickname || u.username || '用户' });
      });
      return Array.from(map.values()).slice(0, 20);
    }
  },
  onLoad(opt) {
    const sysInfo = uni.getSystemInfoSync();
    this.statusBarHeight = sysInfo.statusBarHeight || 20;

    // #ifdef MP-WEIXIN
    const menuInfo = uni.getMenuButtonBoundingClientRect();
    this.menuButtonHeight = menuInfo.height;
    this.menuButtonWidth = menuInfo.width;
    this.navBarHeight = (menuInfo.top - this.statusBarHeight) * 2 + this.menuButtonHeight;
    // #endif
    // #ifndef MP-WEIXIN
    this.navBarHeight = 44;
    this.menuButtonHeight = 32;
    this.menuButtonWidth = 0;
    // #endif

    this.navTotalHeight = this.statusBarHeight + this.navBarHeight;

    const u = uni.getStorageSync('userInfo');
    if (u) this.userInfo = u;

    if (opt.id) {
      this.circleId = opt.id;
      this.circleInfo.name = decodeURIComponent(opt.name || '');
      this.getCircleInfo();
      this.getMemberList();
      this.loadPosts(true);
    }
  },
  methods: {
    // 等级分层配色（参考B站等级体系）
    getLevelTier(lv) {
      const n = parseInt(lv) || 0
      if (n <= 2) return 1
      if (n <= 4) return 2
      if (n <= 6) return 3
      if (n <= 8) return 4
      if (n <= 10) return 5
      return 6
    },
    goBack() { uni.navigateBack(); },

    showToast(msg) {
      this.toast.msg = msg;
      this.toast.show = true;
      setTimeout(() => (this.toast.show = false), 2000);
    },

    onScroll(e) {
      if (this._scrollTimer) return
      const top = e.detail.scrollTop
      this._scrollTimer = setTimeout(() => {
        if (top > 160) {
          this.navBg = '#fff';
          this.showTitle = true;
        } else {
          this.navBg = 'transparent';
          this.showTitle = false;
        }
        this._scrollTimer = null
      }, 30)
    },

    async getCircleInfo() {
      const uid = this.userInfo ? this.userInfo.id : 0;
      try {
        const res = await request('circle.php', { action: 'detail', id: this.circleId });
        if (res.code === 0 && res.data) {
          const t = res.data;
          if (t) {
            this.circleInfo = t;
            if (!this.circleInfo.desc && this.circleInfo.description) this.circleInfo.desc = this.circleInfo.description;
            this.circleInfo.member_count = parseInt(t.member_count || t.user_count || 0);
            this.circleInfo.post_count = parseInt(t.post_count || 0);
            this.isJoined = !!t.is_joined;
            this.isModerator = !!t.is_moderator;

            // 检查权限
            this.checkCircleAccess();
          }
        }
      } catch (e) {}
    },

    checkCircleAccess() {
      const circle = this.circleInfo;
      if (!circle || !circle.id) return;

      const requiredLevel = parseInt(circle.level || 0);
      const requiredVip = parseInt(circle.vip || 0);
      const userLv = parseInt(this.userInfo?.lv || this.userInfo?.level || 0);
      const userVip = parseInt(this.userInfo?.vip || 0);
      const userVipExpire = this.userInfo?.vip_expire_time;

      // 判断VIP是否有效（vip=1且未过期，或永久VIP）
      let userVipValid = false;
      if (userVip === 1) {
        if (userVipExpire) {
          const expireStr = String(userVipExpire);
          if (expireStr.startsWith('2099-12-31')) {
            userVipValid = true; // 永久VIP
          } else {
            const expireDate = new Date(expireStr.replace(/-/g, '/'));
            if (!isNaN(expireDate.getTime()) && expireDate.getTime() > Date.now()) {
              userVipValid = true; // 时限VIP未过期
            }
          }
        } else {
          userVipValid = true;
        }
      }

      // VIP用户无限制进入所有圈子（绕过等级限制）
      if (userVipValid) {
        this.accessDenied = false;
        this.denyReason = '';
        return;
      }

      // 检查等级要求
      if (requiredLevel > 0 && userLv < requiredLevel) {
        this.accessDenied = true;
        this.denyReason = `需要 Lv.${requiredLevel} 及以上才能进入该圈子`;
        return;
      }

      // 检查VIP要求（0=无限制，1=需要VIP）
      if (requiredVip === 1 && !userVipValid) {
        this.accessDenied = true;
        this.denyReason = '需要VIP才能进入该圈子';
        return;
      }

      this.accessDenied = false;
      this.denyReason = '';
    },

    async getMemberList() {
      try {
        const res = await request('circle.php', {
          action: 'getMembers',
          circle_id: this.circleId,
          limit: 50
        });
        if (res.code === 0 && res.data && res.data.length > 0) {
          this.memberList = res.data;
        }
      } catch (e) {}
    },

    switchPostView(mode) {
      if (this.postViewMode === mode) return;
      this.postViewMode = mode;
      this.loadPosts(true);
    },
    switchFilter(type) {
      if (this.filterType === type) return;
      this.filterType = type;
      this.loadPosts(true);
    },

    async loadPosts(refresh = false) {
      if (this.loading || (!this.hasMore && !refresh)) return;

      if (refresh) {
        this.page = 1;
        this.postList = [];
        this.colL = [];
        this.colR = [];
        this.hasMore = true;
      }

      this.loading = true;
      try {
        const reqParams = {
          action: 'list',
          circle_id: this.circleId,
          page: this.page,
          pageSize: this.pageSize,
          sort: this.filterType === 'reply' ? 'latest' : this.filterType
        };
        if (this.postViewMode === 'pending' && this.isModerator) {
          reqParams.status = '2';
        }
        const res = await request('post.php', reqParams);

        if (res.code === 0) {
          const rawData = res.data || {}
          const rawList = Array.isArray(rawData) ? rawData : (rawData.list || [])
          const list = rawList.map(p => {
            let imgs = [];
            if (p.images) {
              if (Array.isArray(p.images)) imgs = p.images;
              else if (typeof p.images === 'string') {
                try {
                  imgs = p.images.startsWith('[') ? JSON.parse(p.images) : p.images.split(',');
                } catch (e) {
                  imgs = p.images.split(',');
                }
              }
            }
            let coverImage = imgs[0] || '';
            if (p.video && !coverImage) coverImage = '/static/logo.png';
            
            let plainContent = (p.plain_content || p.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (plainContent.length > 60) plainContent = plainContent.substring(0, 60) + '...';

            // 文字封面处理
            let isTextOnly = !coverImage && !p.video;
            let textCoverData = null;
            
            if (isTextOnly) {
              const textCoverGradients = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
                'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
                'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
                'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
              ];
              const gradientIndex = (p.id || Math.floor(Math.random() * 12)) % 12;
              const titleText = (p.title || '').trim() || plainContent;
              const subtitleText = plainContent;
              
              textCoverData = {
                gradient: textCoverGradients[gradientIndex],
                title: titleText.length > 20 ? titleText.substring(0, 20) : titleText,
                subtitle: subtitleText.length > 40 ? subtitleText.substring(0, 40) : subtitleText
              };
            }
            
            return {
              ...p,
              display_name: p.name || p.nickname || p.username,
              images: imgs.filter(Boolean),
              coverImage,
              video: p.video || '',
              plainContent,
              isTextOnly,
              textCoverData,
              is_paid: parseInt(p.is_paid || 0),
              is_comment_unlock: parseInt(p.is_comment_unlock || 0),
              price: Number(p.price || 0),
              lv: parseInt(p.lv || 0),
              vip: parseInt(p.vip || 0),
              user_title: p.user_title || '',
              is_fancy: parseInt(p.is_fancy || 0),
              is_unlocked: !!(p.is_unlocked || p.is_purchased)
            };
          });

          if (list.length < this.pageSize) this.hasMore = false;
          if (refresh) {
            this.postList = list;
          } else {
            this.postList = [...this.postList, ...list];
          }
          this.page++;

          // 瀑布流布局
          list.forEach((p) => {
            if (this.colL.length <= this.colR.length) this.colL.push(p);
            else this.colR.push(p);
          });

          if (this.memberList.length === 0 && this.postList.length > 0) {
            const uniqueUsers = new Map();
            this.postList.forEach(p => {
              if (!uniqueUsers.has(p.user_id)) {
                uniqueUsers.set(p.user_id, { avatar: p.avatar, frame_img: p.frame_img, id: p.user_id, name: p.display_name });
              }
            });
            this.memberList = Array.from(uniqueUsers.values()).slice(0, 8);
          }
        } else {
          this.hasMore = false;
        }
      } catch (e) {
        this.hasMore = false;
      } finally {
        this.loading = false;

        this.firstLoading = false;
      }
    },

    async toggleJoin() {
      if (!this.userInfo) return uni.navigateTo({ url: '/pages/login/login' });
      if (this.joinLoading) return;

      this.joinLoading = true;
      this.showToast(this.isJoined ? '退出中...' : '加入中...');
      uni.vibrateShort();

      try {
        const res = await request('circle.php', {
          action: 'toggleJoin',
          circle_id: this.circleId,
          userId: this.userInfo.id
        }, 'POST');

        if (res.code === 0) {
          const newStatus = res.data.status;
          if (newStatus !== this.isJoined) {
            this.isJoined = newStatus;
            if (newStatus) {
              this.circleInfo.member_count++;
              this.showToast('已加入圈子');
              this.memberList.unshift({ avatar: this.userInfo.avatar, frame_img: this.userInfo.frame_img, name: this.userInfo.name });
            } else {
              this.circleInfo.member_count--;
              this.showToast('已退出');
            }
          }
        } else {
          this.showToast(res.msg);
        }
      } catch (e) {
        this.showToast('操作失败');
      } finally {
        this.joinLoading = false;

      }
    },

    async onNativeRefresh() {
      this.isRefresherTriggered = true;
      try {
        await this.loadPosts(true);
      } catch (e) {
      } finally {
        setTimeout(() => {
          this.isRefresherTriggered = false;
        }, 500);
      }
    },

    goPublish() {
      if (!this.userInfo) return uni.navigateTo({ url: '/pages/login/login' });
      this.showPublishModal = true;
    },

    openCircleSearch() {
      uni.navigateTo({ url: '/pages/search/search' });
    },

    onPublishSelect(type) {
      switch(type) {
        case 'post':
          uni.navigateTo({ url: `/pages/publish/publish?circleId=${this.circleId}` });
          break;
        case 'circle':
          uni.navigateTo({ url: '/pages/circle/circle' });
          break;
        case 'market':
          uni.navigateTo({ url: '/pages/market/publish' });
          break;
      }
      this.showPublishModal = false;
    },

    loadMorePosts() { this.loadPosts(); },
    goPost(id) { uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${id}` }); },

    async openPostVideo(post) {
      if (!post || !post.douyin_url) return
      uni.showLoading({ title: '解析中...', mask: true })
      try {
        const videoList = await buildDouyinVideoList(post)
        if (!videoList || videoList.length === 0) return
        this.douyinVideoList = videoList
        this.showDouyinPlayer = true
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '播放失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    goUserProfile(uid) { uni.navigateTo({ url: `/pages/user/profile?userId=${uid}` }); },
    goMemberList(type) {
      const name = encodeURIComponent(this.circleInfo.name || '');
      uni.navigateTo({
        url: `/pages/circle/members?id=${this.circleId}&name=${name}&type=${type}`
      });
    },

    async moderatePost(post, status) {
      if (!this.isModerator || !post || !post.id) return;
      const text = status === 1 ? '恢复为正常' : '设为待审核';
      uni.showModal({
        title: '版主管理',
        content: `确定将该帖子${text}吗？`,
        success: async (res) => {
          if (!res.confirm) return;
          const r = await request('post.php', { action: 'moderatePostStatus', postId: post.id, status }, 'POST');
          if (r.code === 0) {
            post.status = status;
            this.showToast('操作成功');
          } else {
            this.showToast(r.msg || '操作失败');
          }
        }
      });
    },

    async deleteManagedPost(post) {
      if (!this.isModerator || !post || !post.id) return;
      uni.showModal({
        title: '删除帖子',
        content: '确定删除该圈子帖子吗？此操作不可恢复。',
        confirmColor: '#ff2442',
        success: async (res) => {
          if (!res.confirm) return;
          const r = await request('post.php', { action: 'moderatorDelete', postId: post.id }, 'POST');
          if (r.code === 0) {
            this.postList = this.postList.filter(p => Number(p.id) !== Number(post.id));
            this.colL = this.colL.filter(p => Number(p.id) !== Number(post.id));
            this.colR = this.colR.filter(p => Number(p.id) !== Number(post.id));
            this.showToast('删除成功');
          } else {
            this.showToast(r.msg || '删除失败');
          }
        }
      });
    },

    isLockedPost(post) {
      if (!post) return false;
      return (parseInt(post.is_paid || 0) === 1 || parseInt(post.is_comment_unlock || 0) === 1) && !post.is_unlocked;
    },

    getLockedPlaceholderText(post) {
      return parseInt(post && post.is_paid ? post.is_paid : 0) === 1 ? '付费可见' : post.plainContent || '评论可见';
    },

    formatNum(n) {
      let num = Number(n) || 0;
      return num >= 10000 ? (num / 10000).toFixed(1) + 'w' : num;
    },

    getLevelDisplay(lv) {
      return calcLevelDisplay(lv);
    },

    formatTime(timeStr) {
      if (!timeStr) return '';

      let date;
      if (typeof timeStr === 'number') {
        if (String(timeStr).length === 10) timeStr = timeStr * 1000;
        date = new Date(timeStr);
      } else {
        date = new Date(String(timeStr).replace(/-/g, '/'));
      }
      if (isNaN(date.getTime())) return String(timeStr);

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);

      if (diffSec < 0) return '刚刚';
      if (diffSec < 60) return diffSec <= 1 ? '刚刚' : diffSec + '秒前';

      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + '分钟前';

      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return diffHour + '小时前';

      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return diffDay + '天前';

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');

      if (y === now.getFullYear()) return `${m}-${d}`;
      return `${y}-${m}-${d}`;
    },

    getAvatarFrame(post) {
      return (post && (post.current_frame_img || post.frame_img)) || '';
    },

    getUserName(post) {
      return (post && (post.name || post.username || post.display_name)) || '匿名';
    },

    getPostTitle(post) {
      return (post && post.title) || '无标题';
    },

    isVipUser(post) {
      return parseInt((post && post.vip) || 0) === 1;
    },

    getFirstImage(post) {
      if (!post) return '';
      if (post.coverImage) return post.coverImage;
      let images = [];
      if (Array.isArray(post.images)) {
        images = post.images;
      } else if (typeof post.images === 'string' && post.images.trim()) {
        try {
          images = post.images.startsWith('[') ? JSON.parse(post.images) : post.images.split(',');
        } catch (e) {
          images = post.images.split(',');
        }
      }
      return images.length > 0 ? images[0] : '';
    },

    async toggleLike(post) {
      if (!post) return;
      const wasLiked = !!post.is_liked;
      post.is_liked = !wasLiked;
      post.like_count = Math.max(0, parseInt(post.like_count || 0) + (wasLiked ? -1 : 1));

      try {
        const res = await request('post.php', { action: 'like', id: post.id, postId: post.id }, { method: 'POST' });
        if (!res || res.code !== 0) {
          post.is_liked = wasLiked;
          post.like_count = Math.max(0, parseInt(post.like_count || 0) + (wasLiked ? 1 : -1));
          if (res && res.message) uni.showToast({ title: res.message, icon: 'none' });
          return;
        }
        const d = res.data || {};
        if (typeof d.is_liked !== 'undefined') post.is_liked = !!d.is_liked;
        else if (typeof d.liked !== 'undefined') post.is_liked = !!d.liked;
        if (typeof d.like_count !== 'undefined') post.like_count = Number(d.like_count);
        else if (typeof d.likes !== 'undefined') post.like_count = Number(d.likes);
      } catch (e) {
        post.is_liked = wasLiked;
        post.like_count = Math.max(0, parseInt(post.like_count || 0) + (wasLiked ? 1 : -1));
      }
    },

    getColumnPosts(colIndex) {
      return this.postList.filter((item, index) => index % 2 === colIndex);
    }
  }
};
</script>

<style scoped>
.index-container { height: 100vh; background-color: var(--cr-surface-alt); position: relative; overflow-x: hidden; display: flex; flex-direction: column; box-sizing: border-box; }
.pc-layout-wrapper { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.fix-head-block { background: var(--cr-surface-alt); }

/* App Bar */
.custom-app-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 999;
    background: var(--cr-surface);
    box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.05);
}

.app-bar-content { display: flex; align-items: center; justify-content: space-between; padding-left: 24rpx; }
.nav-left { width: 60rpx; height: 100%; display: flex; align-items: center; cursor: pointer; }
.nav-icon { width: 48rpx; height: 48rpx; transition: all 0.2s; }
.nav-btn-right { width: 80rpx; display: flex; justify-content: center; cursor: pointer; }
.nav-center-area { flex: 1; display: flex; justify-content: center; align-items: center; }

.nav-center-tabs { display: flex; align-items: center; gap: 32rpx; }
.nav-tab { position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; }

.nav-tab text {
    font-size: 30rpx;
    color: var(--cr-text-muted);
    font-weight: 400;
    transition: all 0.2s;
}
.nav-tab.active text {
    font-size: 34rpx;
    color: var(--cr-text);
    font-weight: 800;
    transform: scale(1.05);
}
.active-line { width: 28rpx; height: 6rpx; background: #FF2442; border-radius: 4rpx; position: absolute; bottom: -8rpx; }

/* 圈子头部 */
.circle-header {
  background: var(--cr-surface);
  padding: 32rpx 24rpx;
  margin-bottom: 12rpx;
  border-radius: 0 0 24rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}

.circle-info {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.circle-avatar-box {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  overflow: hidden;
  border: 2rpx solid var(--cr-border);
  flex-shrink: 0;
}

.circle-avatar {
  width: 100%;
  height: 100%;
  display: block;
}

.circle-details {
  flex: 1;
  min-width: 0;
}

.circle-name {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--cr-text);
  margin-bottom: 12rpx;
  display: block;
}

.circle-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.meta-item {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}

.meta-divider {
  width: 2rpx;
  height: 16rpx;
  background: #e0e0e0;
  border-radius: 1rpx;
}

.circle-desc {
  font-size: 24rpx;
  color: var(--cr-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.join-button {
  flex-shrink: 0;
}

.join-btn {
  padding: 16rpx 40rpx;
  border-radius: 999rpx;
  background: #ff6b81;
  border: 1rpx solid #ff6b81;
  transition: all 0.3s;
  min-width: 120rpx;
  text-align: center;
}

.join-btn:active {
  background: #ff526d;
  transform: scale(0.95);
}

.join-btn text {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

.join-btn.joined {
  background: var(--cr-surface-alt);
  border-color: var(--cr-border);
}

.join-btn.joined text {
  color: var(--cr-text-muted);
}

/* Follow */
.follow-top-section {
  background: var(--cr-surface);
  padding: 30rpx 0;
  margin-bottom: 12rpx;
  border-radius: 0 0 24rpx 24rpx;
}
.follow-header {
  padding: 0 24rpx 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.fh-title {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--cr-text);
}
.fh-more {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}
.follow-scroll {
  white-space: nowrap;
  width: 100%;
}
.follow-list {
  display: flex;
  padding-left: 24rpx;
}
.follow-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 30rpx;
  width: 120rpx;
  cursor: pointer;
}
.follow-avatar-box {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}
.follow-avatar {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  border: 1px solid #f5f5f5;
  z-index: 1;
}
.follow-frame {
    position: absolute;
    top: -20%;
    left: -20%;
    width: 140%;
    height: 140%;
    pointer-events: none;
    z-index: 0;
}
.follow-name {
  font-size: 22rpx;
  color: var(--cr-text);
  width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Scroll */
.main-scroll { flex: 1; min-height: 0; background-color: var(--cr-surface-alt); position: relative; box-sizing: border-box; }

/* Waterfall（与首页 WaterfallTheme 保持一致） */
.waterfall-wrap { display: flex; align-items: flex-start; gap: 12rpx; padding: 0 16rpx; box-sizing: border-box; width: 100%; }
.waterfall-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12rpx; }

.post-card { position: relative; width: 100%; overflow: hidden; border-radius: 20rpx; background: var(--cr-surface); box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06); box-sizing: border-box; transition: all 0.2s ease; }
.post-card:active { transform: scale(0.985); }

.card-img-wrap { position: relative; width: 100%; min-height: 200rpx; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%); overflow: hidden; }
.card-img { width: 100%; display: block; }

.video-badge-img { position: absolute; top: 16rpx; right: 16rpx; width: 40rpx; height: 40rpx; }
.img-count-badge { position: absolute; top: 16rpx; right: 16rpx; padding: 4rpx 10rpx; border-radius: 8rpx; background: rgba(0,0,0,0.5); }
.img-count-badge text { color: #fff; font-size: 20rpx; font-weight: 700; }

/* 纯文字帖子竖屏封面 */
.card-text-cover { position: relative; width: 100%; padding-bottom: 133.33%; overflow: hidden; }
.text-cover-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40rpx 28rpx; box-sizing: border-box; text-align: center; }
.text-cover-title { font-size: 36rpx; color: #fff; font-weight: 700; line-height: 1.4; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.text-cover-subtitle { margin-top: 14rpx; font-size: 26rpx; color: rgba(255,255,255,0.92); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.text-cover-tag { position: absolute; top: 20rpx; right: 20rpx; padding: 6rpx 14rpx; border-radius: 999rpx; background: rgba(255,255,255,0.24); color: #fff; font-size: 20rpx; font-weight: 600; }

/* 纯文字帖子（非封面模式） */
.card-text-only { position: relative; min-height: 132rpx; padding: 24rpx; display: flex; align-items: center; justify-content: center; }
.text-preview { font-size: 28rpx; color: var(--cr-text); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }

/* 付费/评论解锁角标 */
.lock-badge { position: absolute; left: 14rpx; bottom: 14rpx; padding: 6rpx 14rpx; border-radius: 10rpx; }
.paid-lock { background: rgba(255,36,66,0.88); }
.comment-lock { background: rgba(14,165,233,0.88); }
.lock-badge-text { color: #fff; font-size: 20rpx; font-weight: 700; }

/* 状态遮罩 */
.status-mask { position: absolute; inset: 0; z-index: 5; background: rgba(255,255,255,0.82); display: flex; align-items: center; justify-content: center; }
.status-text { color: #ff2442; font-size: 24rpx; font-weight: 700; padding: 6rpx 16rpx; border-radius: 999rpx; border: 1rpx solid #ff2442; }

/* 置顶角标 */
.pin-badge { position: absolute; top: 14rpx; left: 14rpx; z-index: 6; padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(255,36,66,0.9); color: #fff; font-size: 20rpx; font-weight: 700; }

.card-content { padding: 18rpx 16rpx 14rpx; min-width: 0; }
.card-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 10rpx; }
.card-tag { display: inline-block; padding: 4rpx 12rpx; font-size: 20rpx; color: #ff2442; background: rgba(255,36,66,0.08); border-radius: 6rpx; font-weight: 500; }
.card-tag.tag-secondary { color: var(--cr-text-muted); background: #f5f5f5; }
.card-title { font-size: 28rpx; color: var(--cr-text); font-weight: 600; line-height: 1.42; margin-bottom: 12rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }

.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.user-row { display: flex; align-items: center; min-width: 0; flex: 1; }
.user-avatar-box { position: relative; width: 36rpx; height: 36rpx; margin-right: 8rpx; overflow: visible; flex-shrink: 0; }
.user-avatar { width: 100%; height: 100%; border-radius: 50%; border: 1rpx solid var(--cr-border); }
.user-frame { position: absolute; top: -4rpx; left: -4rpx; width: 44rpx; height: 44rpx; pointer-events: none; }
.user-meta { min-width: 0; flex: 1; }
.user-name-scroll { width: 100%; white-space: nowrap; }
.user-name { display: inline-block; font-size: 22rpx; color: var(--cr-text-muted); }

.action-row { display: flex; align-items: center; flex-shrink: 0; gap: 4rpx; }
.like-btn { display: flex; align-items: center; gap: 4rpx; padding: 4rpx 8rpx; border-radius: 20rpx; transition: all 0.2s ease; }
.like-btn:active { transform: scale(0.9); }
.like-btn.liked .action-num { color: #ff2442; }
.action-icon-img { width: 28rpx; height: 28rpx; margin-right: 6rpx; }
.action-num { font-size: 24rpx; color: var(--cr-text-muted); }

/* VIP / 靓号文字 */
.fancy-text { color: #ff2442 !important; font-weight: 800 !important; }
.vip-title { color: #ff2442 !important; font-weight: 800 !important; }
.vip-rainbow-text { background: linear-gradient(90deg, #ff2442, #ff7a00, #ffd400, #00c853, #00b0ff, #aa00ff, #ff2442); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: vipRainbowMove 4s linear infinite; font-weight: 900 !important; }
@keyframes vipRainbowMove { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }

/* 抖音视频卡片 */
.card-douyin-wrap { position: relative; width: 100%; background: #000; }
.card-douyin-cover { width: 100%; height: 560rpx; }
.card-douyin-play-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100rpx; height: 100rpx; border-radius: 50%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 2rpx solid rgba(255, 255, 255, 0.2); }
.card-douyin-play-icon { width: 0; height: 0; border-top: 20rpx solid transparent; border-bottom: 20rpx solid transparent; border-left: 32rpx solid #fff; border-radius: 4rpx; margin-left: 8rpx; }
.card-douyin-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 12rpx 16rpx; background: linear-gradient(transparent, rgba(0, 0, 0, 0.85)); }
.card-douyin-title { display: block; color: #fff; font-size: 24rpx; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Skeleton */
.skeleton-card { background: var(--cr-surface); border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.02); margin-bottom: 16rpx; }
.sk-img { width: 100%; height: 300rpx; background: var(--cr-surface-alt); animation: pulse 1.5s infinite; }
.sk-txt { width: 80%; height: 30rpx; background: var(--cr-surface-alt); margin: 20rpx; animation: pulse 1.5s infinite; }
.sk-user { width: 40%; height: 20rpx; background: var(--cr-surface-alt); margin: 0 20rpx 20rpx; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

/* Anim */
.fade-in-up { animation: fadeInUp 0.5s ease forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20rpx); } to { opacity: 1; transform: translateY(0); } }

/* Bottom status */
.status-area { padding: 30rpx 0; display: flex; justify-content: center; }
.empty-wrap { display: flex; flex-direction: column; align-items: center; margin-top: 60rpx; }
.empty-img { width: 200rpx; margin-bottom: 20rpx; opacity: 0.5; }
.empty-wrap text, .nomore-wrap { font-size: 24rpx; color: var(--cr-border-strong); }
.spinner { width: 40rpx; height: 40rpx; border: 4rpx solid #f3f3f3; border-top-color: #ff2442; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* 提示 */
.smart-toast {
  position: fixed;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.92);
  padding: 24rpx 52rpx;
  border-radius: 50rpx;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

.smart-toast.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  visibility: visible;
}

.circle-hero {
  position: relative;
  margin: 18rpx 22rpx 0;
  padding: 28rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
  background: var(--cr-surface);
  border-radius: 16rpx;
  border: 1rpx solid var(--cr-border);
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.hero-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.32) 0%, rgba(0,0,0,.18) 34%, rgba(0,0,0,.72) 100%);
}
.hero-nav {
  position: absolute;
  left: 22rpx;
  right: 22rpx;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 2;
}
.hero-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-icon { width: 44rpx; height: 44rpx; filter: brightness(0) invert(1); }
.hero-info {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.hero-avatar {
  width: 116rpx;
  height: 116rpx;
  border-radius: 24rpx;
  border: 2rpx solid #000;
  background: #eee;
}
.hero-main { flex: 1; min-width: 0; }
.hero-name {
  display: block;
  font-size: 42rpx;
  font-weight: 900;
  color: #1a1a1a;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero-stats {
  margin-top: 10rpx;
  display: flex;
  gap: 18rpx;
}
.hero-stats text {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}
.hero-desc {
  position: relative;
  z-index: 2;
  display: block;
  margin-top: 22rpx;
  padding: 18rpx 20rpx;
  border-radius: 8rpx;
  background: rgba(0,0,0,.04);
  color: #555;
  font-size: 25rpx;
  line-height: 1.45;
}
.hero-info .join-btn {
  min-width: 128rpx;
  height: 60rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  border: 1rpx solid #000;
}
.hero-info .join-btn text { color: #fff; font-size: 25rpx; font-weight: 900; }
.hero-info .join-btn.joined { background: var(--cr-surface-alt); border: 1rpx solid #e0e0e0; }
.hero-info .join-btn.joined text { color: var(--cr-text-muted); }
.mod-section {
  margin: 18rpx 22rpx 0;
  background: var(--cr-surface);
  border-radius: 8rpx;
  overflow: hidden;
}
.section-head {
  min-height: 78rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title { font-size: 29rpx; font-weight: 900; color: #111; }
.section-more { font-size: 23rpx; color: #8a8f98; }
.member-scroll { width: 100%; white-space: nowrap; padding-bottom: 22rpx; }
.member-list { display: flex; padding: 0 22rpx; gap: 22rpx; }
.member-item { width: 100rpx; flex-shrink: 0; text-align: center; }
.member-avatar-box { position: relative; width: 88rpx; height: 88rpx; margin: 0 auto 10rpx; }
.member-avatar { width: 100%; height: 100%; border-radius: 50%; background: #eee; }
.member-frame { position: absolute; inset: -18%; width: 136%; height: 136%; pointer-events: none; }
.moderator-mark {
  position: absolute;
  right: -2rpx;
  bottom: -2rpx;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #111;
  color: #fff;
  font-size: 18rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #fff;
}
.member-name { display: block; width: 100%; font-size: 22rpx; color: #59606b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pinned-panel {
  margin: 18rpx 22rpx 0;
  padding: 18rpx 22rpx;
  border-radius: 8rpx;
  background: var(--cr-surface);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.pinned-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.pinned-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.pinned-icon-box {
  flex-shrink: 0;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #fff0f3;
}
.pinned-icon-text {
  color: #c2415b;
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}
.pinned-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 26rpx;
  color: #3b4658;
}
.pinned-arrow { color: #9aa3b2; font-size: 36rpx; line-height: 1; }
.feed-tabs {
  margin-top: 18rpx;
  height: 88rpx;
  padding: 0 22rpx;
  background: var(--cr-surface-alt);
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.feed-tab {
  flex: 1;
  height: 56rpx;
  border-radius: 8rpx;
  background: transparent;
  color: #68707c;
  font-size: 26rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.feed-tab.active { background: #111; color: #fff; }
.feed-list { padding: 0 22rpx; }
.feed-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  border-radius: 8rpx;
  background: var(--cr-surface);
  border: 1rpx solid #edf0f4;
  box-shadow: 0 10rpx 28rpx rgba(20, 28, 40, 0.04);
}
.feed-author { display: flex; align-items: center; gap: 14rpx; }
.feed-author .user-avatar-box { width: 72rpx; height: 72rpx; margin: 0; flex-shrink: 0; }
.feed-author .user-avatar { width: 100%; height: 100%; border-radius: 50%; }
.author-meta { flex: 1; min-width: 0; }
.author-name-row { display: flex; align-items: center; gap: 8rpx; min-width: 0; max-width: 100%; }
/* VIP 徽章：金红渐变胶囊 + 王冠 + VIP字样 + 流光动画 */
.author-name-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  border-radius: 18rpx;
}
.author-name-badge .vip-badge-inner {
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
.author-name-badge .vip-badge-inner::before {
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
.author-name-badge .vip-badge-crown-img {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1rpx 2rpx rgba(0,0,0,0.3));
}
.author-name-badge .vip-badge-text {
  font-size: 18rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 1rpx;
  line-height: 1;
  text-shadow: 0 1rpx 2rpx rgba(140, 30, 0, 0.6);
  position: relative;
  z-index: 1;
}

/* 等级标签：渐变胶囊 + 星星 + Lv数字（与信息流统一小尺寸） */
.author-level-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 3rpx 10rpx 3rpx 8rpx;
  min-height: 32rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.12);
}
.author-level-tag .level-star-img {
  width: 18rpx;
  height: 18rpx;
  flex-shrink: 0;
}
/* 6 档等级配色 */
.lv-tier-1 { background: linear-gradient(135deg, #90a4ae 0%, #607d8b 100%); }
.lv-tier-2 { background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%); }
.lv-tier-3 { background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%); }
.lv-tier-4 { background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%); }
.lv-tier-5 { background: linear-gradient(135deg, #ffb74d 0%, #fb8c00 100%); }
.lv-tier-6 {
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 50%, #ee0979 100%);
  box-shadow: 0 2rpx 6rpx rgba(238, 9, 121, 0.35);
}
.author-level-text {
  font-size: 16rpx;
  color: #fff;
  font-weight: 700;
}

/* 认证图标：青蓝渐变胶囊 + 勾 */
.author-title-badge {
  max-width: 180rpx;
  padding: 3rpx 10rpx 3rpx 8rpx;
  min-height: 32rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  min-width: 0;
  flex-shrink: 1;
  color: #fff;
  box-shadow: 0 2rpx 4rpx rgba(79, 172, 254, 0.25);
}
.author-title-icon-img {
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
}
.author-title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18rpx;
  line-height: 1.2;
  color: #fff;
  font-weight: 700;
}
.feed-author .user-name { display: block; max-width: 230rpx; font-size: 27rpx; color: #1f2329; font-weight: 800; }
.post-time { display: block; margin-top: 4rpx; font-size: 21rpx; color: #9aa1ad; }
.feed-title {
  display: block;
  margin-top: 18rpx;
  font-size: 31rpx;
  line-height: 1.35;
  font-weight: 900;
  color: #ff2442;
}
.fancy-text {
  color: #ff2442 !important;
  font-weight: 900 !important;
}

.vip-fancy-text {
  background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: rainbow 3s ease infinite;
  font-weight: 800 !important;
}

@keyframes rainbow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.feed-text {
  display: block;
  margin-top: 10rpx;
  font-size: 27rpx;
  color: #4b5563;
  line-height: 1.55;
}
.feed-cover {
  position: relative;
  margin-top: 18rpx;
  width: 100%;
  height: 340rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background: #eef0f3;
}
.feed-img { width: 100%; height: 100%; display: block; }
.feed-cover-lock {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%);
}
.feed-cover-lock-text {
  font-size: 30rpx;
  color: var(--cr-text-muted);
  font-weight: 700;
  text-align: center;
}
.feed-actions {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f2f4f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.feed-actions-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.feed-actions-right {
  display: flex;
  align-items: center;
  gap: 26rpx;
}
.feed-actions text { font-size: 23rpx; color: #7a828e; }
.fancy-badge-inline {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 0rpx 6rpx 1rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
  border: 1rpx solid rgba(226, 200, 126, 0.35);
  box-shadow: 0 2rpx 5rpx rgba(226, 200, 126, 0.08), inset 0 1rpx 0 rgba(255, 220, 80, 0.04);
}
.fbi-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.95;
}
.fbi-num {
  font-size: 14rpx !important;
  font-weight: 700 !important;
  color: #e2c87e !important;
  letter-spacing: 0.2rpx !important;
}
.ordinary-num-inline {
  font-size: 14rpx !important;
  color: #e2c87e !important;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%) !important;
  border: 1rpx solid rgba(226, 200, 126, 0.35) !important;
  padding: 0rpx 6rpx 1rpx !important;
  border-radius: 12rpx !important;
}
.moderator-actions {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f1f2f4;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.mod-btn {
  flex: 1;
  height: 58rpx;
  border-radius: 8rpx;
  background: var(--cr-surface-alt);
  color: var(--cr-text);
  font-size: 23rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mod-btn.primary { background: #111; color: #fff; }
.mod-btn.danger { background: #fff1f3; color: #ff2442; }
.waterfall-col .moderator-actions { margin-top: 14rpx; padding-top: 12rpx; flex-wrap: wrap; }
.waterfall-col .mod-btn { flex: 1 1 40%; height: 52rpx; font-size: 21rpx; }

/* 抖音视频预览样式 */
.feed-douyin-wrap {
  position: relative;
  width: 100%;
  margin-top: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #000;
}
.feed-douyin-cover {
  width: 100%;
  height: 400rpx;
  display: block;
}
.feed-douyin-play-btn {
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
}
.feed-douyin-play-icon {
  width: 0;
  height: 0;
  border-top: 20rpx solid transparent;
  border-bottom: 20rpx solid transparent;
  border-left: 32rpx solid #fff;
  border-radius: 4rpx;
  margin-left: 8rpx;
}
.feed-douyin-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 60rpx 20rpx 16rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
}
.feed-douyin-title {
  display: block;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media screen and (min-width: 769px) {
  .index-container {
    max-width: 520px;
    margin: 0 auto;
    background: var(--cr-surface);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.08);
  }

  .custom-app-bar {
    max-width: 520px;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* 权限拒绝 */
.access-denied {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.denied-content {
  text-align: center;
  padding: 60rpx 40rpx;
}
.denied-icon {
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.denied-icon-img {
  width: 100rpx;
  height: 100rpx;
}
.denied-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20rpx;
}
.denied-reason {
  font-size: 30rpx;
  color: rgba(255,255,255,0.9);
  margin-bottom: 16rpx;
  background: rgba(0,0,0,0.15);
  padding: 20rpx 30rpx;
  border-radius: 16rpx;
}
.denied-tip {
  font-size: 26rpx;
  color: rgba(255,255,255,0.7);
  margin-bottom: 50rpx;
}
.denied-btn {
  display: inline-block;
  padding: 20rpx 60rpx;
  background: var(--cr-surface);
  color: #764ba2;
  border-radius: 50rpx;
  font-size: 30rpx;
  font-weight: 600;
}
</style>

