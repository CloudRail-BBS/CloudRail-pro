<template>
  <view class="page-container">

    <view class="init-loading-mask" v-if="initialLoading" @touchmove.stop.prevent>
      <view class="spinner"></view>
    </view>

    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: navBarHeight + 'px', background: 'rgba(255,255,255,' + navOpacity + ')' }">
      <view class="nav-content">
        <view class="nav-left">
        </view>
        <view class="nav-title" :style="{ opacity: navOpacity }">
          {{ userInfo.name || userInfo.username }}
          <image v-if="userInfo.vip == 1 && isLogin" src="/static/vip/vip.gif" class="nav-vip-icon" mode="aspectFit"></image>
        </view>
        <view class="nav-right">
          <view class="nav-btn" @click="openSidebar">
            <image class="nav-icon" src="/static/user/cel.png" mode="aspectFit"></image>
          </view>
        </view>
      </view>
    </view>

    <view class="fixed-bg-layer" :style="{ transform: 'translateY(' + bgPullDistance + 'px)' }">
      <image
        class="bg-img"
        :key="cachedBg"
        :src="cachedBg || userInfo.background_image || defaultBg"
        mode="aspectFill"
        :class="{ loaded: imgLoaded.bg }"
        @load="onImgLoad('bg')"
      ></image>
      <view class="bg-gradient"></view>
    </view>

    <scroll-view
      class="main-scroll"
      scroll-y
      enable-back-to-top
      refresher-enabled
      refresher-default-style="none"
      :refresher-triggered="isRefreshing"
      refresher-background="transparent"
      @refresherrefresh="onCustomRefresh"
      @scroll="onScroll"
      @scrolltolower="onReachBottom"
    >
      <view slot="refresher" class="custom-refresher">
        <view class="refresh-loading" :class="{ active: isRefreshing }"></view>
      </view>

      <view class="nav-placeholder" :style="{ height: (statusBarHeight + navBarHeight) + 'px' }"></view>
      <view class="bg-placeholder"></view>
      <view class="profile-card">
        <view class="profile-top">
          <view class="avatar-wrapper" @click="openAvatarModal">
            <view class="skeleton avatar-skeleton" v-if="!imgLoaded.avatar"></view>
            <image
              class="avatar-img"
              :key="cachedAvatar"
              :class="{ loaded: imgLoaded.avatar }"
              :src="cachedAvatar || userInfo.avatar || defaultAvatar"
              mode="aspectFill"
              @load="onImgLoad('avatar')"
            ></image>
            <image v-if="currentFrameUrl" :src="currentFrameUrl" class="avatar-frame" mode="aspectFit"></image>
            <!-- 认证徽标：头像右下角蓝V/红V，与个人主页一致 -->
            <image
              v-if="userInfo.auth_badge_label"
              :src="userInfo.auth_badge_type === 'enterprise' ? '/static/v/blue-v.svg' : '/static/v/red-v.svg'"
              class="avatar-auth-badge"
              mode="aspectFit"
            ></image>
          </view>
          <view class="action-buttons">
            <view class="action-buttons-row">
              <view class="btn secondary" @click="onChangeBackground">更换封面</view>
              <view class="btn primary" v-if="isLogin" @click="toSetting">编辑资料</view>
              <view class="btn primary" v-else @click="toLoginPage">去登录</view>
              <view class="btn asset" v-if="isLogin" @click="toTaskPage">我的资产</view>
              <view class="btn vip-btn" v-if="isLogin" @click="toVipPage">{{ userInfo.vip == 1 ? 'VIP会员' : '开通VIP' }}</view>
            </view>
          </view>
        </view>

        <view class="profile-info">
          <view class="name-line">
            <text class="user-name" :class="{ 'vip-rainbow-text': userInfo.vip == 1 && isLogin }">{{ userInfo.name || userInfo.nickname || userInfo.username || '请登录' }}</text>
            <view v-if="userInfo.vip == 1 && isLogin" class="vip-sole-icon">
              <view class="vip-badge-inner">
                <image class="vip-badge-crown-img" src="/static/icon/crown-white.svg" mode="aspectFit" />
                <text class="vip-badge-text">VIP</text>
              </view>
            </view>
            <view class="level-tag" :class="['lv-tier-' + getLevelTier(levelDisplay), { 'tag-on-dark': bgIsDark }]" v-if="isLogin">
              <image class="level-star-img" src="/static/icon/star-white.svg" mode="aspectFit" />
              <text class="lv-text" :class="{ 'text-on-dark': bgIsDark }">Lv.{{ levelDisplay }}</text>
            </view>
            <view v-if="isLogin && userInfo.is_fancy == 1" class="fancy-badge-inline name-inline-badge">
              <image src="/static/vip/lianghao.webp" class="fbi-icon" mode="aspectFit"></image>
              <text class="fbi-num">{{ userInfo.display_number }}</text>
            </view>
            <text v-else-if="isLogin && userInfo.display_number" class="ordinary-num-inline name-inline-number">{{ userInfo.display_number }}</text>
            <view class="title-row title-inline" :class="{ 'tag-on-dark': bgIsDark }" v-if="userInfo.user_title">
              <image class="title-icon-img" src="/static/icon/check-white.svg" mode="aspectFit" />
              <text class="title-text" :class="{ 'text-on-dark': bgIsDark }">{{ userInfo.user_title }}</text>
            </view>
            <view
              v-if="isLogin && Number(userInfo.enterprise_verified || 0) === 1 && userInfo.enterprise_name"
              class="enterprise-auth-btn"
              :class="{ 'tag-on-dark': bgIsDark }"
              @click.stop="showEnterpriseInfo"
            >
              <text class="enterprise-auth-icon" :class="{ 'text-on-dark': bgIsDark }">企</text>
            </view>
          </view>
          <view class="bio-line" @click="openInfoEdit">
            <text v-if="userInfo.personal_signature" :class="{ 'vip-rainbow-text': userInfo.vip == 1 && isLogin }">{{ userInfo.personal_signature }}</text>
            <text v-else class="bio-placeholder">填写个性签名，让大家认识你...</text>
            <image src="/static/icon/edit-gray.svg" class="edit-pen" mode="aspectFit"></image>
          </view>
        </view>

        <view class="stats-row">
          <view class="stat-item" @click="toFollowList">
            <text class="num">{{ formatNum(userInfo.follow_count) }}</text>
            <text class="label">关注</text>
          </view>
          <view class="stat-item" @click="toFansList">
            <text class="num">{{ formatNum(userInfo.fans_count) }}</text>
            <text class="label">粉丝</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.total_like) }}</text>
            <text class="label">获赞</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.post_count) }}</text>
            <text class="label">帖子</text>
          </view>
          <view class="stat-item" @click="toTaskPage">
            <text class="num">{{ formatBalance(userInfo.balance) }}</text>
            <text class="label">余额</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.total_view_count) }}</text>
            <text class="label">曝光</text>
          </view>
        </view>
      </view>

      <!-- 每日签到卡片 -->
      <view class="checkin-card" v-if="isLogin">
        <view class="checkin-left">
          <view class="checkin-streak">
            <text class="streak-num">{{ checkinInfo.streak || 0 }}</text>
            <text class="streak-label">连续签到</text>
          </view>
          <view class="checkin-info">
            <view class="checkin-title">每日签到</view>
            <view class="checkin-desc">今日签到 +{{ checkinInfo.today_points || 5 }} 积分</view>
          </view>
        </view>
        <view class="checkin-btn" :class="{ checked: checkinInfo.is_checked }" @click="doCheckin">
          {{ checkinInfo.is_checked ? '已签到' : '立即签到' }}
        </view>
      </view>

      <view class="stats-gap"></view>
      <view class="content-area">
        <view class="sticky-tabs" :style="{ top: (statusBarHeight + navBarHeight - 1) + 'px' }">
          <view class="tab-item" :class="{ active: curTab === 0 }" @click="switchTab(0)">
            发布作品
            <view class="active-bar" v-if="curTab === 0"></view>
          </view>
          <view class="tab-item" :class="{ active: curTab === 1 }" @click="switchTab(1)">
            我的动态
            <view class="active-bar" v-if="curTab === 1"></view>
          </view>
          <view class="tab-item" :class="{ active: curTab === 2 }" @click="switchTab(2)">
            我的足迹
            <view class="active-bar" v-if="curTab === 2"></view>
          </view>
          <view class="tab-item" :class="{ active: curTab === 3 }" @click="switchTab(3)">
            商品橱窗
            <view class="active-bar" v-if="curTab === 3"></view>
          </view>
        </view>
        <view class="list-container">
          <block v-if="curTab === 0 || curTab === 2">
          <view class="empty-box" v-if="currentList.length === 0 && !loading">
            <text class="empty-text">这里空空如也</text>
          </view>

          <view class="waterfall-box" v-else>
            <view class="card-item" v-for="item in currentList" :key="item.id" @click="goPostDetail(item.id)">
              <block v-if="item.cover_img || item.douyin_cover">
                <view class="card-image-box">
                  <view class="skeleton card-skeleton" v-if="!imgLoaded['post_'+item.id]"></view>
                  <image
                    class="card-cover"
                    :class="{ loaded: imgLoaded['post_'+item.id] }"
                    :src="item.cover_img || item.douyin_cover"
                    mode="aspectFill"
                    lazy-load
                    @load="onImgLoad('post_'+item.id)"
                  ></image>
                  <view class="video-play-icon" v-if="item.douyin_cover"></view>
                  <view class="status-tag" v-if="curTab === 0 && (item.status == 0 || item.status == 2)">
                    {{ item.status == 0 ? '封禁' : '审核中' }}
                  </view>
                </view>
                <view class="card-info">
                  <view class="card-title">{{ item.title }}</view>
                  <view class="card-meta">
                    <view class="meta-user">
                      <image :src="item.user_avatar || userInfo.avatar || defaultAvatar" class="meta-avatar"></image>
                      <text class="meta-name">{{ item.name || userInfo.name }}</text>
                    </view>
                    <view class="meta-stats">
                      <view class="meta-like">
                        <image src="/static/tab/ydl.png" class="like-icon" mode="aspectFit"></image>
                        {{ formatNum(item.view_count) }}
                      </view>
                      <view class="meta-like">
                        <image src="/static/post/xih1.png" class="like-icon" mode="aspectFit"></image>
                        {{ item.like_count }}
                      </view>
                    </view>
                  </view>
                </view>
              </block>
              <block v-else>
                <view class="text-cover-card" :style="{ background: (item.textCoverData && item.textCoverData.gradient) || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }">
                  <view class="text-cover-inner">
                    <text class="text-cover-title" v-if="item.textCoverData">{{ item.textCoverData.title }}</text>
                    <text class="text-cover-subtitle" v-if="item.textCoverData && item.textCoverData.subtitle">{{ item.textCoverData.subtitle }}</text>
                  </view>
                  <view v-if="curTab === 0 && (item.status == 0 || item.status == 2)" class="text-cover-status">
                    {{ item.status == 0 ? '封禁' : '审核中' }}
                  </view>
                </view>
                <view class="card-info">
                  <view class="card-title">
                    <text v-if="curTab === 0 && item.status == 0" class="red-tag">[封]</text>
                    <text v-if="curTab === 0 && item.status == 2" class="orange-tag">[审]</text>
                    {{ item.title }}
                  </view>
                  <view class="card-meta">
                    <view class="meta-stats">
                      <view class="meta-like">
                        <image src="/static/tab/ydl.png" class="like-icon" mode="aspectFit"></image>
                        {{ formatNum(item.view_count) }}
                      </view>
                      <view class="meta-like">
                        <image src="/static/post/xih1.png" class="like-icon" mode="aspectFit"></image>
                        {{ item.like_count }}
                      </view>
                    </view>
                  </view>
                </view>
              </block>
            </view>
          </view>

          <view class="loading-more">
            <view class="spinner small" v-if="loading"></view>
            <text class="no-more" v-if="!hasMore[curTab] && currentList.length > 0">没有更多了</text>
          </view>
          </block>

          <block v-if="curTab === 1">
            <view class="empty-box" v-if="currentList.length === 0 && !loading">
              <text class="empty-text">还没有发过动态</text>
            </view>
            <view class="dynamic-list" v-else>
              <view class="dynamic-card" v-for="item in currentList" :key="item.id" @click="goDynamicDetail(item.id)">
                <view class="dynamic-card-img" v-if="item.images && item.images.length > 0">
                  <image :src="item.images[0]" mode="aspectFill" class="dynamic-cover"></image>
                  <view class="dynamic-img-count" v-if="item.images.length > 1">{{ item.images.length }}图</view>
                </view>
                <view class="dynamic-card-body">
                  <view class="dynamic-card-title" v-if="item.title">{{ item.title }}</view>
                  <view class="dynamic-card-content" v-if="item.content">{{ item.content }}</view>
                  <view class="dynamic-card-meta">
                    <view class="dm-stat">
                      <view class="dm-icon-wrap">
                        <image src="/static/post/pl.png" class="dm-icon-img" mode="aspectFit"></image>
                      </view>
                      <text class="dm-num">{{ item.comment_count || 0 }}</text>
                    </view>
                    <view class="dm-stat">
                      <view class="dm-icon-wrap liked">
                        <image src="/static/post/xih1.png" class="dm-icon-img" mode="aspectFit"></image>
                      </view>
                      <text class="dm-num">{{ item.like_count || 0 }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view class="loading-more">
              <view class="spinner small" v-if="loading"></view>
              <text class="no-more" v-if="!hasMore[curTab] && currentList.length > 0">没有更多了</text>
            </view>
          </block>

          <block v-if="curTab === 3">
            <view class="empty-box" v-if="shopList.length === 0 && !shopLoading">
              <text class="empty-text">暂无在售商品</text>
            </view>
            <view class="shop-grid" v-else>
              <view class="shop-card" v-for="item in shopList" :key="item.id" @click="goShopDetail(item.id)">
                <image :src="item.image" class="shop-img" mode="aspectFill"></image>
                <view class="shop-info">
                  <text class="shop-title">{{ item.title }}</text>
                  <view class="shop-bottom">
                    <text class="shop-price">¥{{ item.price }}</text>
                    <view class="shop-type-tag" :class="item.product_type == 1 ? 'physical' : 'virtual'">
                      {{ item.product_type == 1 ? '实体' : '虚拟' }}
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view class="loading-more">
              <view class="spinner small" v-if="shopLoading"></view>
              <text class="no-more" v-if="!shopHasMore && shopList.length > 0">没有更多了</text>
            </view>
          </block>
        </view>
      </view>
      <view style="height: 120rpx;"></view>
    </scroll-view>

    <view class="sidebar-mask" :class="{ show: sidebarOpen }" @click="closeSidebar">
      <view class="sidebar-panel" :class="{ show: sidebarOpen }" @click.stop>
        <view class="sidebar-user">
          <view class="sidebar-avatar-wrapper">
            <image class="sidebar-avatar" :src="userInfo.avatar || defaultAvatar" mode="aspectFill"></image>
            <image v-if="currentFrameUrl" :src="currentFrameUrl" class="sidebar-avatar-frame" mode="aspectFit"></image>
          </view>
          <view class="sidebar-uinfo">
            <text class="sidebar-name">{{ userInfo.name || userInfo.nickname || userInfo.username || '未登录' }}</text>
            <text class="sidebar-uid" v-if="isLogin && userInfo.display_number">{{ userInfo.display_number }}</text>
          </view>
        </view>
        <view class="sidebar-divider"></view>
        <view class="sidebar-menu">
          <view class="sidebar-item" v-for="item in sidebarMenus" :key="item.label" @click="onSidebarTap(item)">
            <image class="sidebar-item-icon" :src="item.icon" mode="aspectFit"></image>
            <text class="sidebar-item-text">{{ item.label }}</text>
            <text class="sidebar-arrow">›</text>
          </view>
        </view>
        <view class="sidebar-divider"></view>
        <view class="sidebar-section-title">更多</view>
        <view class="sidebar-menu">
          <view class="sidebar-item" v-for="item in sidebarLinks" :key="item.label" @click="onSidebarTap(item)">
            <image class="sidebar-item-icon" :src="item.icon" mode="aspectFit"></image>
            <text class="sidebar-item-text">{{ item.label }}</text>
            <text class="sidebar-arrow">›</text>
          </view>
          <view v-if="isLogin && canAccessAdmin" class="sidebar-item admin-item" @click="goAdmin">
            <image class="sidebar-item-icon" src="/static/icon/usersz.png" mode="aspectFit"></image>
            <text class="sidebar-item-text">{{ adminEntryText }}</text>
            <text class="sidebar-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <view class="modal-mask" v-if="violationInfo.show">
      <view class="dialog-box" @click.stop>
        <view class="dialog-title warn">违规通知</view>
        <view class="dialog-content">帖子 "{{ violationInfo.title }}" 已被封禁。</view>
        <view class="dialog-footer">
          <view class="d-btn cancel" @click="violationInfo.show=false">知道了</view>
        </view>
      </view>
    </view>

    <view class="modal-mask" v-if="showEdit" @click="showEdit=false">
      <view class="dialog-box input-mode" @click.stop>
        <view class="dialog-title">编辑资料</view>
        <view class="input-group">
          <text>昵称</text>
          <input v-model="editForm.nickname" maxlength="12" placeholder="请输入昵称" />
        </view>
        <view class="input-group">
          <text>签名</text>
          <input v-model="editForm.signature" maxlength="30" placeholder="一句话介绍自己" />
        </view>
        <view class="dialog-footer">
          <view class="d-btn cancel" @click="showEdit=false">取消</view>
          <view class="d-btn confirm" @click="saveInfo">保存</view>
        </view>
      </view>
    </view>
    
    <view class="sheet-mask" v-if="showSheet" :class="{ show: showSheet }" @click="showSheet=false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-header">{{ sheetType === 'avatar' ? '更换头像' : '更换背景' }}</view>
        <view class="sheet-opt" @click="doUpload('camera')">拍照</view>
        <view class="sheet-opt" @click="doUpload('album')">从相册选择</view>
        <view class="sheet-gap"></view>
        <view class="sheet-opt cancel" @click="showSheet=false">取消</view>
      </view>
    </view>

    <!-- HUD -->
    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>
    <CustomTabBar :current="3" @publish="goPublish" />
    <PublishModal
      :visible="showPublishModal"
      @close="showPublishModal = false"
      @select="onPublishSelect"
    />

  </view>
</template>

<script>
import { request, uploadBackgroundImage, uploadAvatar, baseUrl } from '../../common/request.js';
import { getLevelDisplay as calcLevelDisplay } from '../../common/level.js';
import PublishModal from '../../components/PublishModal.vue';
import CustomTabBar from '../../components/CustomTabBar.vue';
import { applyH5ViewportHeightVar, getScreenMetrics } from '../../common/screen.js';
import { swr, invalidate, CACHE_KEYS } from '../../common/cache.js';

export default {
  components: {
    PublishModal,
    CustomTabBar
  },
  data() {
    return {
      statusBarHeight: 0,
      navBarHeight: 44,
      navOpacity: 0,
      initialLoading: true,
      isLogin: false,

      userInfo: {
        id: 0, username: '', name: '', avatar: '', background_image: '',
        personal_signature: '', jifen: 0, lv: 0, vip: 0, is_admin: 0,
        post_count: 0, total_like: 0, follow_count: 0, fans_count: 0,
        current_frame_img: '', user_title: '', enterprise_verified: 0, enterprise_name: ''
      },

      cachedAvatar: '',
      cachedBg: '',
      defaultAvatar: '/static/logo.png',
      defaultBg: '/static/logo.png',
      currentFrameUrl: '',
      bgIsDark: false,

      curTab: 0,
      lists: { 0: [], 1: [], 2: [] },
      pages: { 0: 1, 1: 1, 2: 1 },
      hasMore: { 0: true, 1: true, 2: true },
      loading: false,
      isRefreshing: false,
      prefetchCache: { 0: null, 1: null, 2: null },

      imgLoaded: { bg: false, avatar: false },

      bgPullDistance: 0,

      sidebarOpen: false,
      sidebarMenus: [
        { label: '我的设置', icon: '/static/icon/usersz.png', type: 'page', url: '/pages/user/setting' },
        { label: '我的举报', icon: '/static/icon/admin-alert-triangle-e67e22.svg', type: 'page', url: '/pages/user/my-reports' },
		 { label: '我的二维码', icon: '/static/qewm.png', type: 'page', url: '/pages/user/qrcode' },
		 		{ label: '我的订单', icon: '/static/shop/order.png', type: 'page', url: '/pages/market/orders' },
		 { label: '社区集市', icon: '/static/icon/shop.png', type: 'page', url: '/pages/market/shop' },
        { label: '权益认证', icon: '/static/icon/zhuanyehao.png', url: '/pages/user/zhuanye', type: 'page' },
        { label: '头像框装扮', icon: '/static/icon/zb.png', url: '/pages/myTopic/myTopic', type: 'page' },
	 { label: '气泡商城', icon: '/static/icon/zb.png', url: '/pages/user/bubble', type: 'page' },
        { label: '任务中心', icon: '/static/icon/rw.png', url: '/pages/mission/mission', type: 'page' },
        { label: '靓号商城', icon: '/static/icon/qianbao.png', url: '/pages/fancy/shop', type: 'page' },
      ],
      sidebarLinks: [
       
      ],

      showSheet: false,
      sheetType: 'avatar',
      showEdit: false,
      editForm: { nickname: '', signature: '' },
      /* 签到信息 */
      checkinInfo: {
        is_checked: false,
        streak: 0,
        today_points: 5
      },
      hud: { show: false, type: 'loading', text: '' },
      violationInfo: { show: false, id: 0, title: '' },

      shopList: [],
      shopPage: 1,
      shopHasMore: true,
      shopLoading: false,

      showPublishModal: false,
      textCoverGradients: [
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
      ]
    }
  },

  computed: {
    canAccessAdmin() {
      if (!this.isLogin) return false;
      const role = this.userInfo.role || '';
      const isAdmin = parseInt(this.userInfo.is_admin || 0) === 1;
      return isAdmin || role === 'admin' || role === 'moderator' || role === 'auditor';
    },
    adminEntryText() {
      const role = this.userInfo.role || '';
      if (role === 'moderator') return '版主中心';
      if (role === 'auditor') return '审核员中心';
      return '管理员中心';
    },
    currentList() { return this.lists[this.curTab] || []; },
    levelDisplay() { return calcLevelDisplay(this.userInfo.lv); },
  },

  onLoad() {
    applyH5ViewportHeightVar();
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.prefetchTab(2);
    // 监听靓号购买成功事件，强制刷新用户信息
    uni.$on('fancyNumberChanged', (data) => {
      if (this.isLogin) {
        this.refreshData();
      }
    });
  },

  onUnload() {
    uni.$off('fancyNumberChanged');
  },

  onShow() {
    this.checkLogin();
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
    // 检测背景图亮度，黑色背景时切换标签为白色样式
    checkBgBrightness() {
      const url = this.cachedBg || this.userInfo.background_image || this.defaultBg
      if (!url) return
      // #ifdef H5
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const w = 40, h = 40
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, w, h)
            const data = ctx.getImageData(0, 0, w, h).data
            let r = 0, g = 0, b = 0, count = 0
            for (let i = 0; i < data.length; i += 4) {
              r += data[i]
              g += data[i + 1]
              b += data[i + 2]
              count++
            }
            const avg = (r + g + b) / (count * 3)
            this.bgIsDark = avg < 100
          } catch (e) {
            this.bgIsDark = false
          }
        }
        img.onerror = () => { this.bgIsDark = false }
        img.src = url
      } catch (e) {
        this.bgIsDark = false
      }
      // #endif
      // #ifndef H5
      this.bgIsDark = false
      // #endif
    },

    normalizePostItem(item) {
      const DEFAULT_VIDEO_COVER = '/static/logo.png'
      const post = item || {}
      
      const isUsableMedia = (url) => {
        const value = String(url || '').trim()
        if (!value) return false
        const lowered = value.toLowerCase()
        return !['null', 'undefined', 'false', '[]', '[object object]'].includes(lowered)
      }
      
      let imgs = []
      if (post.images && post.images !== 'NULL') {
        if (Array.isArray(post.images)) {
          imgs = post.images
        } else if (typeof post.images === 'string') {
          try {
            imgs = post.images.startsWith('[') ? JSON.parse(post.images) : post.images.split(',')
          } catch (e) {
            imgs = post.images.split(',')
          }
        }
      }
      
      imgs = imgs
        .map(img => String(img || '').trim())
        .filter(img => isUsableMedia(img))
      
      let coverImage = imgs[0] || post.cover_img || post.coverImage || post.douyin_cover || ''
      if (!isUsableMedia(coverImage)) coverImage = ''
      if ((post.video || post.douyin_cover) && !coverImage) coverImage = DEFAULT_VIDEO_COVER

      // 纯文字卡片随机渐变背景
      const isTextOnly = !coverImage && !post.video && !post.douyin_cover
      let plainContent = (post.plain_content || post.content || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (plainContent.length > 70) plainContent = plainContent.substring(0, 70) + '...'
      const textCoverData = isTextOnly ? {
        gradient: this.textCoverGradients[(post.id || 0) % 12],
        title: ((post.title || '').trim() || plainContent || '文字内容').substring(0, 20),
        subtitle: (plainContent || '点击查看详情').substring(0, 40)
      } : null

      return {
        ...post,
        cover_img: coverImage,
        coverImage: coverImage,
        images: imgs,
        douyin_cover: post.douyin_cover || '',
        isTextOnly,
        textCoverData,
        plainContent
      }
    },
    checkImageCache(url, type) {
      if (!url) return;
      const cacheKey = `img_${type}_${url}`;
      const cached = uni.getStorageSync(cacheKey);
      if (cached) {
        if (type === 'avatar') this.cachedAvatar = cached;
        if (type === 'bg') this.cachedBg = cached;
      } else {
        if (type === 'avatar') this.cachedAvatar = url;
        if (type === 'bg') this.cachedBg = url;
        // #ifndef H5
        uni.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode === 200) {
              uni.saveFile({
                tempFilePath: res.tempFilePath,
                success: (r) => { uni.setStorageSync(cacheKey, r.savedFilePath); }
              });
            }
          }
        });
        // #endif
      }
    },

    onImgLoad(key) { this.$set(this.imgLoaded, key, true); },
    onScroll(e) {
      const st = e.detail.scrollTop || 0
      this._latestScrollTop = st
      if (this._scrollTimer) return
      this._scrollTimer = setTimeout(() => {
        this._scrollTimer = null
        const op = Math.min(this._latestScrollTop / 60, 1)
        this.navOpacity = op
        this.bgPullDistance = this._latestScrollTop < 0 ? Math.min(-this._latestScrollTop, 500) : 0
      }, 30)
    },

    async onCustomRefresh() {
      if (this.isRefreshing) return;
      this.isRefreshing = true;
      uni.vibrateShort();
      await Promise.all([this.refreshData(), this.loadList(true)]);
      this.prefetchTab(this.curTab === 0 ? 1 : 0);
      setTimeout(() => { this.isRefreshing = false; }, 500);
    },

    onScan() {
      // #ifndef H5
      uni.scanCode({
        success: (res) => {
          if (res.result) {
            if (res.result.startsWith('/pages') || res.result.startsWith('http')) {
              if (res.result.startsWith('http')) {
                // #ifdef APP-PLUS
                plus.runtime.openURL(res.result);
                // #endif
                // #ifdef MP-WEIXIN
                uni.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(res.result)}` });
                // #endif
              } else {
                uni.navigateTo({ url: res.result });
              }
            } else {
              uni.showToast({ title: '扫描结果: ' + res.result, icon: 'none' });
            }
          }
        },
        fail: () => {
          uni.showToast({ title: '扫码取消', icon: 'none' });
        }
      });
      // #endif
    },

    toAddFriend() {
      if (!this.checkAuth()) return;
      uni.navigateTo({ url: '/pages/user/fried' });
    },

    openSidebar() { this.sidebarOpen = true; },
    closeSidebar() { this.sidebarOpen = false; },

    onSidebarTap(item) {
      this.closeSidebar();
      setTimeout(() => {
        if (item.type === 'page') {
          if (!this.checkAuth()) return;
          uni.navigateTo({ url: item.url });
        } else if (item.type === 'link') {
          // #ifdef APP-PLUS
          plus.runtime.openURL(item.url);
          // #endif
          // #ifdef H5
          window.open(item.url, '_blank');
          // #endif
          // #ifdef MP-WEIXIN
          uni.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(item.url)}` });
          // #endif
        }
      }, 260);
    },

    toSetting() { uni.navigateTo({ url: '/pages/user/setting' }); },
    toLoginPage() { uni.navigateTo({ url: '/pages/login/login' }); },
    toTaskPage() { uni.navigateTo({ url: '/pages/user/wallet' }); },
    toVipPage() { uni.navigateTo({ url: '/pages/vip/index' }); },
    toFollowList() { if (this.checkAuth()) uni.navigateTo({ url: `/pages/user/follows?userId=${this.userInfo.id || 0}` }); },
    toFansList() { if (this.checkAuth()) uni.navigateTo({ url: `/pages/user/fans?userId=${this.userInfo.id || 0}` }); },
    showEnterpriseInfo() {
      if (!this.userInfo.enterprise_name) return
      uni.showModal({
        title: '企业认证',
        content: this.userInfo.enterprise_name,
        showCancel: false,
        confirmText: '我知道了'
      })
    },
    goPostDetail(id) { uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${id}` }); },
    formatNum(n) { n = parseInt(n) || 0; return n > 9999 ? (n / 10000).toFixed(1) + 'w' : n; },
    formatBalance(v) { v = parseFloat(v) || 0; return v.toFixed(2); },
    checkAuth() { if (!this.isLogin) { this.toLoginPage(); return false; } return true; },

    checkLogin() {
      const u = uni.getStorageSync('userInfo');
      const t = uni.getStorageSync('token');
      if (t) {
        // 只要存在 token 即视为已登录，userInfo 缺失时稍后由 refreshData 从后端拉取
        this.isLogin = true;
        this.userInfo = { ...this.userInfo, ...(u || {}) };
        if (u) {
          if (this.userInfo.current_frame_img) this.currentFrameUrl = this.userInfo.current_frame_img;
          this.checkImageCache(this.userInfo.avatar, 'avatar');
          this.checkImageCache(this.userInfo.background_image, 'bg');
          this.checkBgBrightness();
        }
        // 兼容旧缓存：如果 localStorage 里的 userInfo 缺 total_view_count 字段，
        // 说明是后端新增字段之前的旧数据，强制清掉 SWR 缓存让 refreshData 立即走后端拉新
        if (u && (u.total_view_count === undefined || u.total_view_count === null)) {
          try { if (typeof invalidate === 'function' && CACHE_KEYS && CACHE_KEYS.USER_INFO) invalidate(CACHE_KEYS.USER_INFO); } catch (_) {}
        }
        this.refreshData();
      } else {
        this.isLogin = false;
        this.userInfo = {};
        this.cachedAvatar = this.defaultAvatar;
        this.cachedBg = this.defaultBg;
        this.initialLoading = false;
      }
    },

    // 靓号直查：走 fancy.php getMyNumber（服务器已支持，不依赖 functions.php 是否更新）
    // 返回后把 is_fancy / display_number 合并进 userInfo，让界面显示已购靓号
    fetchMyFancy() {
      if (!this.isLogin) return
      return request('fancy.php', { action: 'getMyNumber' })
        .then((res) => {
          if (res.code === 0 && res.data) {
            const d = res.data
            const fancy = {
              is_fancy: parseInt(d.is_fancy || 0),
              display_number: d.display_number || '',
            }
            this.userInfo = Object.assign({}, this.userInfo || {}, fancy)
            const cached = uni.getStorageSync('userInfo') || {}
            uni.setStorageSync('userInfo', Object.assign({}, cached, fancy))
          }
        })
        .catch(() => {})
    },

    /* 加载签到状态 */
    async loadCheckinStatus() {
      if (!this.isLogin) return;
      try {
        const res = await request('checkin/status', {}, { method: 'GET' });
        if (res.code === 0 && res.data) {
          this.checkinInfo = {
            is_checked: res.data.is_checked,
            streak: res.data.streak || 0,
            today_points: res.data.today_points || 5
          };
        }
      } catch (e) {
        console.log('加载签到状态失败', e);
      }
    },

    /* 执行签到 */
    async doCheckin() {
      if (this.checkinInfo.is_checked) {
        uni.showToast({ title: '今日已签到', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '签到中...' });
      try {
        const res = await request('checkin/do', {}, { method: 'POST' });
        if (res.code === 0) {
          this.checkinInfo.is_checked = true;
          this.checkinInfo.streak = res.data.streak;
          uni.showToast({ title: res.message || '签到成功', icon: 'success' });
          this.refreshData();
        } else {
          uni.showToast({ title: res.message || '签到失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    async refreshData() {
      // 使用 SWR 缓存：60秒内不重复请求用户信息
      // checkLogin 已先读 localStorage 立即渲染，这里只需控制后台刷新频率
      try {
        const { data, fromCache, stale } = await swr(
          CACHE_KEYS.USER_INFO,
          () => request('user.php', { action: 'getUserInfo' }),
          {
            ttl: 60000,  // 用户信息 60 秒内用缓存（变更频率低）
            onRefresh: (newData) => {
              if (newData) {
                this.userInfo = newData;
                this.currentFrameUrl = newData.current_frame_img || '';
                uni.setStorageSync('userInfo', newData);
                this.checkImageCache(newData.avatar, 'avatar');
                this.checkImageCache(newData.background_image, 'bg');
                this.checkBgBrightness();
              }
            }
          }
        )

        // 首次请求（非缓存命中）：立即应用数据
        if (!fromCache && data) {
          this.userInfo = data;
          this.currentFrameUrl = data.current_frame_img || '';
          uni.setStorageSync('userInfo', data);
          this.checkImageCache(data.avatar, 'avatar');
          this.checkImageCache(data.background_image, 'bg');
          this.checkBgBrightness();
        }
        // fromCache=true 时，checkLogin 已经渲染过 localStorage 数据，这里不重复设置
      } catch (e) {
        if (e && e.code === -2) {
          this.isLogin = false;
          this.userInfo = {};
          this.cachedAvatar = this.defaultAvatar;
          this.cachedBg = this.defaultBg;
          // 登录失效时清除用户信息缓存
          invalidate(CACHE_KEYS.USER_INFO)
        }
      }
      // 靓号字段可能被 functions.php 老版本遗漏，这里直查兜底
      this.fetchMyFancy();
      this.initialLoading = false;
      this.loadCheckinStatus();
      if (this.lists[this.curTab].length === 0) this.loadList(true);
    },

    async prefetchTab(tab) {
      if (!this.isLogin || this.prefetchCache[tab]) return;
      try {
        let res;
        if (tab === 1) {
          res = await request('dynamic.php', { action: 'myList', page: 1 });
        } else {
          const act = tab === 0 ? 'getMyPosts' : 'getMyLikedPosts';
          res = await request('user.php', { action: act, page: 1 });
        }
        if (res.code === 0) {
          this.prefetchCache[tab] = tab === 1 ? this.pickList(res.data) : this.pickList(res.data).map(this.normalizePostItem);
        }
      } catch (e) { /* silent */ }
    },

    switchTab(i) {
      if (this.curTab === i) return;
      this.curTab = i;
      if (i === 3) {
        if (this.shopList.length === 0) this.loadShop(true);
        return;
      }
      if (this.lists[i].length === 0 && this.hasMore[i]) {
        if (this.prefetchCache[i] && this.prefetchCache[i].length > 0) {
          this.lists[i] = this.prefetchCache[i];
          this.prefetchCache[i] = null;
          this.pages[i] = 2;
          if (this.lists[i].length < 10) this.hasMore[i] = false;
          this.prefetchNextPage(i);
        } else {
          this.loadList(true);
        }
      }
    },

    async prefetchNextPage(tab) {
      if (!this.hasMore[tab]) return;
      try {
        let res;
        if (tab === 1) {
          res = await request('dynamic.php', { action: 'myList', page: this.pages[tab] });
        } else {
          const act = tab === 0 ? 'getMyPosts' : 'getMyLikedPosts';
          res = await request('user.php', { action: act, page: this.pages[tab] });
        }
        if (res.code === 0) {
          this.prefetchCache[tab] = tab === 1 ? this.pickList(res.data) : this.pickList(res.data).map(this.normalizePostItem);
        }
      } catch (e) { /* silent */ }
    },

    pickList(d) {
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.list)) return d.list;
      return [];
    },

    async loadList(reset = false) {
      if (!this.isLogin) return;
      const t = this.curTab;
      if (!this.hasMore[t] && !reset) return;
      if (this.loading) return;

      if (reset) { this.pages[t] = 1; this.lists[t] = []; this.hasMore[t] = true; this.prefetchCache[t] = null; }
      this.loading = true;

      try {
        let res;
        if (t === 1) {
          res = await request('dynamic.php', { action: 'myList', page: this.pages[t] });
        } else {
          const act = t === 0 ? 'getMyPosts' : 'getMyLikedPosts';
          res = await request('user.php', { action: act, page: this.pages[t] });
        }
        if (res.code === 0) {
          const arr = t === 1 ? this.pickList(res.data) : this.pickList(res.data).map(this.normalizePostItem);
          this.lists[t] = reset ? arr : [...this.lists[t], ...arr];
          if (arr.length < 10) this.hasMore[t] = false;
          if (arr.length > 0) this.pages[t]++;

          if (t === 0 && reset) {
            const banned = arr.find(item => item.status == 0);
            if (banned) this.violationInfo = { show: true, id: banned.id, title: banned.title };
          }
          this.$nextTick(() => { this.prefetchNextPage(t); });
        }
      } finally { this.loading = false; }
    },

    onReachBottom() {
      if (this.curTab === 3) { this.loadShop(); return; }
      const t = this.curTab;
      if (this.prefetchCache[t] && this.prefetchCache[t].length > 0) {
        const arr = this.prefetchCache[t];
        this.lists[t] = [...this.lists[t], ...arr];
        this.prefetchCache[t] = null;
        if (arr.length < 10) this.hasMore[t] = false;
        if (arr.length > 0) this.pages[t]++;
        this.$nextTick(() => { this.prefetchNextPage(t); });
      } else {
        this.loadList();
      }
    },

    goDynamicDetail(id) {
      uni.navigateTo({ url: `/pages/dynamic/detail?id=${id}` });
    },

    onChangeBackground() { if (this.checkAuth()) { this.sheetType = 'background'; this.showSheet = true; } },
    openAvatarModal() { if (this.checkAuth()) { this.sheetType = 'avatar'; this.showSheet = true; } },

    doUpload(source) {
      this.showSheet = false;
      const self = this;
      uni.chooseImage({
        count: 1,
        sourceType: [source],
        sizeType: ['compressed'],
        crop: {
          width: self.sheetType === 'background' ? 750 : 500,
          height: self.sheetType === 'background' ? 500 : 500
        },
        success: (res) => {
          self.showHud('loading', '更换中');
          const path = res.tempFilePaths[0];
          const upPromise = self.sheetType === 'background' ? uploadBackgroundImage(path) : uploadAvatar(path);

          upPromise.then(url => {
            const act = self.sheetType === 'background' ? 'updateBackground' : 'updateAvatar';
            const pm = self.sheetType === 'background'
              ? { backgroundUrl: url, background: url, background_image: url }
              : { avatarPath: url, avatar: url };

            request('user.php', { action: act, ...pm }).then(r => {
              if (r && r.code === 0) {
                // 优先用后端返回的最新 userPublic 覆盖；兜底用本地 URL（兼容旧后端返回 null）
                if (r.data && (r.data.avatar || r.data.background_image || r.data.name)) {
                  self.userInfo = Object.assign({}, self.userInfo || {}, r.data);
                  uni.setStorageSync('userInfo', self.userInfo);
                }
                if (self.sheetType === 'background') {
                  self.imgLoaded.bg = false;
                  self.userInfo.background_image = self.userInfo.background_image || url;
                  self.userInfo.background = self.userInfo.background || url;
                  self.cachedBg = self.userInfo.background_image;
                } else {
                  self.imgLoaded.avatar = false;
                  self.userInfo.avatar = self.userInfo.avatar || url;
                  self.cachedAvatar = self.userInfo.avatar;
                }
                // 头像/封面变更后失效用户信息缓存，保证下次进页面立即走后端最新数据
                try { if (typeof invalidate === 'function' && CACHE_KEYS && CACHE_KEYS.USER_INFO) invalidate(CACHE_KEYS.USER_INFO); } catch (_) {}
                uni.setStorageSync('userInfo', self.userInfo);
                self.showHud('success', '成功');
                setTimeout(() => { self.hud.show = false; }, 1000);
              } else {
                self.hud.show = false;
                uni.showToast({ title: ((r && r.msg) || '更新失败'), icon: 'none' });
              }
            });
          }).catch(e => {
            self.hud.show = false;
            uni.showToast({ title: (e && e.msg) || '上传失败', icon: 'none' });
          });
        }
      });
    },

    openInfoEdit() {
      if (!this.checkAuth()) return;
      this.editForm.nickname = this.userInfo.name || this.userInfo.username;
      this.editForm.signature = this.userInfo.personal_signature || '';
      this.showEdit = true;
    },

    async saveInfo() {
      if (!this.editForm.nickname) return uni.showToast({ title: '昵称不能为空', icon: 'none' });
      this.showHud('loading', '保存中');
      try {
        // 合并成一次 update 请求，避免"先改昵称后端 ok/签名失败导致数据不一致", 后端返回完整 userPublic
        const res = await request('user.php', {
          action: 'update',
          newNickname: this.editForm.nickname,
          nickname: this.editForm.nickname,
          newSignature: this.editForm.signature,
          signature: this.editForm.signature,
          bio: this.editForm.signature
        });
        if (res && res.code === 0 && res.data) {
          this.userInfo = Object.assign({}, this.userInfo || {}, res.data);
        } else {
          // 兜底旧后端兼容：本地直接赋值
          this.userInfo.name = this.editForm.nickname;
          this.userInfo.nickname = this.editForm.nickname;
          this.userInfo.personal_signature = this.editForm.signature;
          this.userInfo.bio = this.editForm.signature;
          this.userInfo.signature = this.editForm.signature;
        }
        uni.setStorageSync('userInfo', this.userInfo);
        // 资料变更后失效用户信息缓存，下次 onShow 立即拉新
        try { if (typeof invalidate === 'function' && CACHE_KEYS && CACHE_KEYS.USER_INFO) invalidate(CACHE_KEYS.USER_INFO); } catch (_) {}
        this.showEdit = false;
        this.showHud('success', '已保存');
        setTimeout(() => { this.hud.show = false; }, 1000);
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: ((e && e.msg) || '保存失败'), icon: 'none' });
      }
    },

    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text }; },

    goShopDetail(id) { uni.navigateTo({ url: `/pages/market/detail?id=${id}` }); },

    async loadShop(reset = false) {
      if (this.shopLoading || (!this.shopHasMore && !reset)) return;
      if (!this.isLogin) return;
      if (reset) { this.shopPage = 1; this.shopList = []; this.shopHasMore = true; }
      this.shopLoading = true;
      try {
        const res = await request('market.php', {
          action: 'get_user_products',
          user_id: this.userInfo.id,
          page: this.shopPage
        });
        if (res.code === 0) {
          const arr = this.pickList(res.data) || [];
          this.shopList = reset ? arr : [...this.shopList, ...arr];
          if (arr.length < 10) this.shopHasMore = false;
          if (arr.length > 0) this.shopPage++;
        }
      } catch (e) { /* silent */ }
      finally { this.shopLoading = false; }
    },
    goPublish() {
      if (!this.checkAuth()) return;
      this.showPublishModal = true;
    },

    goAdmin() {
      if (!this.isLogin || !this.canAccessAdmin) {
        uni.showToast({ title: '无权限访问', icon: 'none' });
        return;
      }
      this.closeSidebar();
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/admin/index' });
      }, 260);
    },

    onPublishSelect(type) {
      switch (type) {
        case 'post':
          uni.navigateTo({ url: '/pages/publish/publish' });
          break;
        case 'circle':
          uni.navigateTo({ url: '/pages/circle/circle' });
          break;
        case 'market':
          uni.navigateTo({ url: '/pages/market/publish' });
          break;
      }
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: var(--tcy-vh, 100vh);
  background-color: #F8F8F8;
  color: #333;
  overflow-anchor: none;
}

.init-loading-mask {
  position: fixed; top: 0; left: 0; width: 100vw; height: var(--tcy-vh, 100vh);
  background: #fff; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}
.spinner {
  width: 44rpx; height: 44rpx;
  border: 4rpx solid rgba(0,0,0,0.08);
  border-top-color: #FF2442;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner.small { width: 32rpx; height: 32rpx; border-width: 3rpx; }
.spinner.white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

.skeleton {
  background: #F0F0F0;
  animation: shimmer 1.4s ease infinite;
  border-radius: 12rpx;
}
.avatar-skeleton {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  border-radius: 50%; z-index: 3;
}
.card-skeleton {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 2;
}
@keyframes shimmer {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

.fixed-bg-layer {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 420rpx;
  z-index: 0; pointer-events: none;
  transition: transform 0.3s ease;
}
.bg-img {
  width: 100%; height: 100%;
  opacity: 0; transition: opacity 0.4s ease;
}
.bg-img.loaded { opacity: 1; }
.bg-gradient {
  position: absolute; bottom: 0; left: 0;
  width: 100%; height: 160rpx;
  background: linear-gradient(to bottom, transparent, #F8F8F8);
  pointer-events: none;
}

.nav-bar {
  position: fixed; top: 0; left: 0; width: 100%;
  z-index: 999; transition: background 0.15s;
}
.nav-content {
  width: 100%; height: 44px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx;
  box-sizing: border-box;
}
.nav-left, .nav-right {
  display: flex; align-items: center; gap: 16rpx;
  min-width: 100rpx;
}
.nav-right { justify-content: flex-end; }
.nav-title {
  font-size: 32rpx; font-weight: 700;
  color: #333; opacity: 0;
  flex: 1; text-align: center;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
}
.nav-vip-icon { width: 40rpx; height: 40rpx; flex-shrink: 0; }
.nav-btn {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(0,0,0,0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background 0.2s;
}
.nav-btn:active { background: rgba(0,0,0,0.25); }
.nav-icon { width: 36rpx; height: 36rpx; }

.main-scroll { height: var(--tcy-vh, 100vh); position: relative; z-index: 1; }
.custom-refresher {
  height: 80rpx; width: 100%;
  display: flex; align-items: center; justify-content: center;
}
.refresh-loading {
  width: 36rpx; height: 36rpx;
  border: 3rpx solid #ddd; border-radius: 50%;
  border-top-color: transparent;
}
.refresh-loading.active {
  animation: spin 0.7s linear infinite;
  border-color: #FF2442; border-top-color: transparent;
}
.nav-placeholder { width: 100%; background: transparent; }
.bg-placeholder { width: 100%; height: 90rpx; background: transparent; }

.profile-card {
  position: relative; padding: 0 32rpx;
  z-index: 10; margin-bottom: 0;
  background: transparent;
}
.profile-top {
  display: flex; justify-content: space-between;
  align-items: flex-end; margin-bottom: 20rpx;
}

.avatar-wrapper {
  width: 128rpx; height: 128rpx;
  border-radius: 50%;
  background: #fff;
  padding: 4rpx;
  position: relative;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1);
}
.avatar-img {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: #eee;
  opacity: 0; transition: opacity 0.3s;
}
.avatar-img.loaded { opacity: 1; }
.avatar-frame {
  position: absolute;
  top: -20%; left: -20%;
  width: 140%; height: 140%;
  z-index: 2;
  pointer-events: none;
}
/* 认证 V 标：头像右下角，与个人主页一致 */
.avatar-auth-badge {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  border: 3rpx solid var(--card-bg);
  z-index: 5;
  box-shadow: 0 4rpx 14rpx rgba(0,0,0,0.22);
  background: #fff;
}

.action-buttons { padding-bottom: 8rpx; }
.action-buttons-row { display: flex; gap: 10rpx; }
.action-buttons-row .btn { flex: 1; min-width: 0; padding: 0 8rpx; }
.btn {
  height: 56rpx; padding: 0 20rpx;
  border-radius: 28rpx; font-size: 22rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s, transform 0.1s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  box-sizing: border-box;
}
.btn:active { opacity: 0.85; transform: scale(0.97); }
.btn.secondary {
  background: #fff; color: #333;
  border: none !important;
  outline: none;
  box-shadow: none;
}
.btn.asset {
  background: #111;
  color: #fff;
}
.btn.primary {
  background: #FF2442; color: #fff; border: none;
}
.btn.vip-btn {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #333; border: none;
}

.profile-info { margin-bottom: 7rpx; }
.name-line {
  display: flex; align-items: center;
  gap: 12rpx; margin-bottom: 12rpx; flex-wrap: wrap;
}
.user-name { font-size: 38rpx; font-weight: 800; color: #333; }
.vip-rainbow-text {
  background: linear-gradient(90deg, #ff2442, #ff7a00, #ffd400, #00c853, #00b0ff, #aa00ff, #ff2442);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: vipRainbowMove 4s linear infinite;
  font-weight: 900;
}
@keyframes vipRainbowMove {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}
/* 等级标签：渐变胶囊 + 星星图标 + Lv数字（参考B站等级体系） */
.level-tag {
  display: inline-flex; align-items: center;
  gap: 6rpx;
  font-size: 24rpx; padding: 4rpx 14rpx 4rpx 10rpx;
  min-height: 40rpx;
  box-sizing: border-box;
  border-radius: 22rpx; font-weight: 700;
  color: #fff;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
}
.level-tag .level-star-img {
  width: 24rpx; height: 24rpx; flex-shrink: 0;
}
/* 6 档等级配色 */
.lv-tier-1 { background: linear-gradient(135deg, #90a4ae 0%, #607d8b 100%); }
.lv-tier-2 { background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%); }
.lv-tier-3 { background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%); }
.lv-tier-4 { background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%); }
.lv-tier-5 { background: linear-gradient(135deg, #ffb74d 0%, #fb8c00 100%); }
.lv-tier-6 {
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 50%, #ee0979 100%);
  box-shadow: 0 2rpx 8rpx rgba(238, 9, 121, 0.35);
}
.lv-text { font-size: 24rpx; color: #fff; font-weight: 700; letter-spacing: 0.5rpx; }
/* VIP 徽章：金红渐变胶囊 + 王冠 + VIP字样 + 流光动画（参考QQ会员风格） */
.vip-sole-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  border-radius: 22rpx;
}
.vip-sole-icon .vip-badge-inner {
  display: inline-flex; align-items: center; gap: 4rpx;
  min-height: 40rpx; padding: 4rpx 16rpx 4rpx 10rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #ff5e3a 0%, #ff2a68 30%, #ffb300 65%, #ffd54f 100%);
  box-shadow: 0 2rpx 10rpx rgba(255, 46, 104, 0.5), inset 0 1rpx 0 rgba(255,255,255,0.4);
  border: 1rpx solid rgba(255, 220, 100, 0.7);
  position: relative;
  overflow: hidden;
}
/* 流光高光层 */
.vip-sole-icon .vip-badge-inner::before {
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
.vip-sole-icon .vip-badge-crown-img {
  width: 26rpx; height: 26rpx; flex-shrink: 0;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1rpx 2rpx rgba(0,0,0,0.3));
}
.vip-sole-icon .vip-badge-text {
  font-size: 22rpx; font-weight: 900; color: #fff;
  letter-spacing: 1rpx; line-height: 1;
  text-shadow: 0 1rpx 2rpx rgba(140, 30, 0, 0.6);
  position: relative;
  z-index: 1;
}
.uid-line {
  font-size: 22rpx; color: #999;
  margin-bottom: 12rpx; font-family: monospace;
  display: flex; align-items: center; gap: 10rpx;
}
/* 靓号徽章：暗金底色 + 金色边框 + 王冠 + 靓字（参考QQ靓号图标风格） */
.fancy-badge-inline {
  display: inline-flex; align-items: center; gap: 6rpx;
  background: linear-gradient(135deg, #1a1300 0%, #2e2200 40%, #1a1300 100%);
  border: 1rpx solid rgba(255, 200, 80, 0.55);
  padding: 5rpx 14rpx 5rpx 8rpx;
  border-radius: 22rpx;
  box-shadow: 0 2rpx 10rpx rgba(212, 175, 55, 0.28), inset 0 1rpx 0 rgba(255, 220, 80, 0.18);
  position: relative;
  overflow: hidden;
}
/* 靓号徽章内部高光 */
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
  width: 24rpx; height: 24rpx;
  opacity: 1;
  position: relative;
  z-index: 1;
}
.fbi-num {
  font-size: 22rpx; font-weight: 800;
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
  color: #b89035;
  font-weight: 600;
}
.name-inline-number {
  margin-left: -2rpx;
  padding: 5rpx 14rpx 5rpx 8rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #1a1300 0%, #2e2200 50%, #1a1300 100%);
  border: 1rpx solid rgba(255, 200, 80, 0.4);
  color: #ffd76b;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.4);
}
.name-inline-badge {
  transform: translateY(-1rpx);
}
/* 认证图标：青蓝渐变胶囊 + 勾 */
.title-row {
  display: inline-flex; align-items: center;
  gap: 6rpx; margin-bottom: 14rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  padding: 4rpx 14rpx 4rpx 10rpx;
  min-height: 40rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  color: #fff;
  box-shadow: 0 2rpx 6rpx rgba(79, 172, 254, 0.3);
}
.title-inline {
  margin-bottom: 0;
}
.title-icon-img {
  width: 28rpx; height: 28rpx; flex-shrink: 0;
}
.title-text { font-size: 22rpx; color: #fff; font-weight: 700; }

/* 黑色背景下的白色样式（VIP/等级胶囊保留彩色背景） */
.tag-on-dark {
  border: 1rpx solid rgba(255,255,255,0.3) !important;
}
.text-on-dark {
  color: #fff !important;
}
.enterprise-auth-btn {
  display: inline-flex;
  align-items: center;
  font-size: 24rpx;
  padding: 8rpx 18rpx;
  border-radius: 28rpx;
  background: transparent;
  border: 1rpx solid rgba(0,0,0,0.3);
}
.enterprise-auth-icon {
  font-size: 24rpx;
  color: #000;
  font-weight: 700;
  line-height: 1;
}
.bio-line {
  font-size: 26rpx; color: #333;
  line-height: 1.5; white-space: pre-wrap;
  display: flex; align-items: center;
  text-shadow: 0 1rpx 4rpx rgba(255,255,255,0.6);
}
.bio-placeholder { color: #666; }
.edit-pen { margin-left: 10rpx; width: 24rpx; height: 24rpx; }

.stats-row {
  display: flex; justify-content: space-between;
  gap: 16rpx; padding: 0 16rpx 0 0;
  margin-top: 0;
  background: transparent !important;
}
.stat-item {
  display: flex; flex-direction: column;
  align-items: center; flex: 1;
  background: transparent !important;
}
.stats-gap {
  width: 100%;
  height: 8rpx;
  background: transparent;
}
.stat-item .num { font-size: 32rpx; font-weight: 700; color: #333; }
.stat-item .label { font-size: 22rpx; color: #999; margin-top: 2rpx; }

.content-area {
  border-radius: 32rpx 32rpx 0 0;
  background: #f5f5f5;
  min-height: 500rpx;
  position: relative; z-index: 20;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  margin-top: 20rpx;
  box-shadow: 0 -8rpx 30rpx rgba(0,0,0,0.1);
}
.sticky-tabs {
  position: sticky; z-index: 100;
  display: flex; height: 88rpx;
  background: #fff;
  border-bottom: 1rpx solid #F0F0F0;
  border-radius: 32rpx 32rpx 0 0;
}
.tab-item {
  flex: 1; display: flex;
  align-items: center; justify-content: center;
  font-size: 28rpx; color: #999;
  position: relative; font-weight: 500;
  transition: all 0.2s;
}
.tab-item.active { color: #333; font-weight: 700; font-size: 30rpx; }
.active-bar {
  position: absolute; bottom: 0;
  width: 36rpx; height: 6rpx;
  background: #FF2442; border-radius: 6rpx;
}

.list-container { padding: 24rpx; min-height: 600rpx; background: #fff; }
.waterfall-box { display: flex; flex-wrap: wrap; justify-content: space-between; }
.card-item {
  width: 48.5%; background: #fff;
  border-radius: 16rpx; overflow: hidden;
  margin-bottom: 20rpx; position: relative;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);
  transition: transform 0.2s;
}
.card-item:active { transform: scale(0.98); }
.card-image-box {
  width: 100%; height: 340rpx;
  position: relative; background: #F5F5F5;
  overflow: hidden;
}
.card-cover {
  width: 100%; height: 100%;
  opacity: 0; transition: opacity 0.35s ease;
}
.card-cover.loaded { opacity: 1; }
.status-tag {
  position: absolute; top: 12rpx; left: 12rpx;
  background: rgba(0,0,0,0.55); color: #fff;
  font-size: 20rpx; padding: 4rpx 12rpx;
  border-radius: 8rpx;
  backdrop-filter: blur(4px);
}
.video-play-icon {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 80rpx; height: 80rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.video-play-icon::after {
  content: '';
  width: 0; height: 0;
  border-left: 24rpx solid #fff;
  border-top: 16rpx solid transparent;
  border-bottom: 16rpx solid transparent;
  margin-left: 6rpx;
}
.card-info { padding: 18rpx 16rpx; }
.card-title {
  font-size: 26rpx; color: #333;
  line-height: 1.4; margin-bottom: 14rpx;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  font-weight: 500;
}
.card-meta {
  display: flex; justify-content: space-between;
  align-items: center; font-size: 20rpx; color: #999;
}
.meta-user {
  display: flex; align-items: center;
  gap: 8rpx; max-width: 65%;
}
.meta-avatar {
  width: 32rpx; height: 32rpx;
  border-radius: 50%; background: #eee;
}
.meta-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.meta-like { display: flex; align-items: center; gap: 4rpx; }
.meta-stats { display: flex; align-items: center; gap: 16rpx; }
.like-icon { width: 24rpx; height: 24rpx; margin-right: 4rpx; }

.text-cover-card {
  position: relative;
  width: 100%;
  height: 340rpx;
  overflow: hidden;
}
.text-cover-inner {
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
.text-cover-status {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.red-tag { color: #ff4d4f; margin-right: 6rpx; }
.orange-tag { color: #ffa940; margin-right: 6rpx; }

.empty-box { padding-top: 120rpx; text-align: center; }
.empty-text { color: #ccc; font-size: 26rpx; }
.loading-more {
  padding: 30rpx 0; text-align: center;
  display: flex; justify-content: center;
}
.no-more { color: #ccc; font-size: 22rpx; }

.sidebar-mask {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0);
  z-index: 10001;
  visibility: hidden;
  transition: background 0.3s, visibility 0s 0.3s;
}
.sidebar-mask.show {
  background: rgba(0,0,0,0.45);
  visibility: visible;
  transition: background 0.3s, visibility 0s;
}
.sidebar-panel {
  position: absolute; top: 0; right: 0;
  width: 580rpx; height: 100%;
  background: #fff;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex; flex-direction: column;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: -4rpx 0 24rpx rgba(0,0,0,0.08);
}
.sidebar-panel.show { transform: translateX(0); }

.sidebar-user {
  display: flex; align-items: center;
  padding: 60rpx 36rpx 36rpx; gap: 20rpx;
}
.sidebar-avatar-wrapper {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
}
.sidebar-avatar {
  width: 100%; height: 100%;
  border-radius: 50%; background: #eee;
}
.sidebar-avatar-frame {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  z-index: 2;
  pointer-events: none;
}
.sidebar-uinfo { flex: 1; overflow: hidden; }
.sidebar-name {
  font-size: 32rpx; font-weight: 700;
  color: #333; display: block;
  overflow: hidden; white-space: nowrap;
  text-overflow: ellipsis;
}
.sidebar-uid {
  font-size: 22rpx; color: #999;
  margin-top: 4rpx; display: block;
  font-family: monospace;
}
.sidebar-divider {
  height: 1rpx; background: #F0F0F0;
  margin: 0 36rpx;
}
.sidebar-section-title {
  font-size: 22rpx; color: #bbb;
  padding: 24rpx 36rpx 8rpx;
  font-weight: 600;
}
.sidebar-menu { padding: 12rpx 0; }
.sidebar-item {
  display: flex; align-items: center;
  padding: 24rpx 36rpx; gap: 20rpx;
  transition: background 0.15s;
}
.sidebar-item:active { background: #F8F8F8; }
.sidebar-item-icon { width: 40rpx; height: 40rpx; flex-shrink: 0; }
.sidebar-item-text {
  flex: 1; font-size: 28rpx;
  color: #333; font-weight: 500;
}
.sidebar-arrow { font-size: 32rpx; color: #ccc; }
.admin-item {
  background: linear-gradient(135deg, #FFE8EB 0%, #FFF0F2 100%);
  border-left: 6rpx solid #FF2442;
}
.admin-item .sidebar-item-text { color: #FF2442; font-weight: 600; }
.sidebar-bottom {
  margin-top: auto;
  padding: 36rpx;
}
.sidebar-logout {
  height: 80rpx;
  display: flex; align-items: center; justify-content: center;
  background: #FFF0F0; color: #FF2442;
  border-radius: 16rpx; font-size: 28rpx;
  font-weight: 600; transition: opacity 0.2s;
}
.sidebar-logout:active { opacity: 0.8; }

.modal-mask {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 10002;
  display: flex; align-items: center; justify-content: center;
}
.dialog-box {
  width: 580rpx; background: #fff;
  border-radius: 24rpx; overflow: hidden;
}
.dialog-title {
  padding: 40rpx 0 20rpx;
  text-align: center; font-weight: 700;
  font-size: 32rpx; color: #333;
}
.dialog-title.warn { color: #FF2442; }
.dialog-content {
  padding: 0 40rpx 40rpx;
  text-align: center; color: #666;
  font-size: 28rpx; line-height: 1.6;
}
.dialog-footer { display: flex; border-top: 1rpx solid #F0F0F0; }
.d-btn {
  flex: 1; height: 96rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; transition: background 0.15s;
}
.d-btn:active { background: #F8F8F8; }
.d-btn.cancel { color: #999; }
.d-btn.confirm {
  color: #FF2442; border-left: 1rpx solid #F0F0F0;
  font-weight: 600;
}
.input-mode { padding-bottom: 30rpx; }
.input-group { padding: 0 40rpx; margin-bottom: 20rpx; }
.input-group text {
  font-size: 24rpx; color: #999;
  margin-bottom: 10rpx; display: block;
}
.input-group input {
  background: #F5F5F5; height: 76rpx;
  border-radius: 14rpx; padding: 0 24rpx;
  font-size: 28rpx; color: #333;
}

.sheet-mask {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 10002;
  display: flex; align-items: flex-end; justify-content: center;
  visibility: hidden; opacity: 0;
  pointer-events: none;
  transition: all 0.3s;
}
.sheet-mask.show {
  visibility: visible; opacity: 1;
  pointer-events: auto;
}
.sheet-panel {
  width: 100%; background: #F8F8F8;
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.sheet-mask.show .sheet-panel { transform: translateY(0); }
.sheet-header {
  background: #fff; padding: 28rpx;
  text-align: center; font-size: 24rpx;
  color: #999; border-bottom: 1rpx solid #eee;
}
.sheet-opt {
  background: #fff; height: 104rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; color: #333;
  border-bottom: 1rpx solid #F5F5F5;
  transition: background 0.15s;
}
.sheet-opt:active { background: #F5F5F5; }
.sheet-gap { height: 12rpx; background: #F8F8F8; }
.sheet-opt.cancel { border-bottom: none; font-weight: 600; color: #999; }

.hud-mask {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 10003;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.hud-toast {
  background: rgba(30,30,30,0.88);
  padding: 36rpx 56rpx; border-radius: 20rpx;
  display: flex; flex-direction: column;
  align-items: center; color: #fff;
  font-size: 26rpx; gap: 20rpx;
  backdrop-filter: blur(10px);
}

/* 商品橱窗 */
.shop-grid { display: flex; flex-wrap: wrap; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; }
.shop-card {
  width: calc(50% - 12rpx);
  background: #fff;
  border-radius: 14rpx;
  overflow: hidden;
  border: 1rpx solid #F0F0F0;
  margin-bottom: 16rpx;
}
.shop-card:active { opacity: 0.85; }
.shop-img { width: 100%; height: 220rpx; display: block; background: #eee; }
.shop-info { padding: 14rpx 16rpx 16rpx; }
.shop-title {
  font-size: 24rpx; color: #333;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  line-height: 1.4; margin-bottom: 12rpx;
}
.shop-bottom { display: flex; align-items: center; justify-content: space-between; }
.shop-price { font-size: 28rpx; font-weight: 800; color: #FF2F00; }
.shop-type-tag {
  font-size: 18rpx; padding: 3rpx 10rpx;
  border-radius: 4rpx; font-weight: 500;
}
.shop-type-tag.physical { background: #EAF3FF; color: #1677FF; }
.shop-type-tag.virtual { background: #FFF4E5; color: #FF6900; }

/* 我的动态卡片 */
.dynamic-list { padding: 20rpx 24rpx; }
.dynamic-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);
}
.dynamic-card:active { opacity: 0.85; }
.dynamic-card-img {
  width: 100%;
  height: 320rpx;
  position: relative;
  background: #f5f5f5;
  overflow: hidden;
}
.dynamic-cover { width: 100%; height: 100%; }
.dynamic-img-count {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}
.dynamic-card-body { padding: 20rpx 24rpx; }
.dynamic-card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dynamic-card-content {
  font-size: 26rpx;
  color: #777;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12rpx;
}
.dynamic-card-meta {
  display: flex;
  align-items: center;
  gap: 40rpx;
}
.dm-stat {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.dm-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dm-icon-wrap.liked {
  background: transparent;
}
.dm-icon-img {
  width: 28rpx;
  height: 28rpx;
}
.dm-num {
  font-size: 24rpx;
  color: #999;
}

/* 签到卡片 */
.checkin-card {
  margin: 0 16px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}
.checkin-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.checkin-streak {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 8px 12px;
}
.streak-num {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}
.streak-label {
  font-size: 11px;
  color: rgba(255,255,255,0.8);
  margin-top: 4px;
}
.checkin-info {
  display: flex;
  flex-direction: column;
}
.checkin-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}
.checkin-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  margin-top: 4px;
}
.checkin-btn {
  background: #fff;
  color: #667eea;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 20px;
}
.checkin-btn.checked {
  background: rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.8);
}

</style>
