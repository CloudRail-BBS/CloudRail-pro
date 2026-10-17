<template>
  <view class="index-container" :class="themeClass">
    <SplashAd />
    <OnlineNotifyCard />
    <view
      class="custom-app-bar pc-centered-nav"
      :style="{ paddingTop: statusBarHeight + 'px', height: navBarHeight + 'px' }"
    >
      <view class="app-bar-content" :style="{ height: menuButtonHeight + 'px' }">
        <view class="nav-left">
          <view class="nav-left-avatar-wrap" @click.stop="openSidebar">
            <image v-if="userInfo?.avatar" :src="userInfo?.avatar" class="nav-avatar" mode="aspectFill"></image>
            <image v-else :src="defaultAvatar" class="nav-avatar" mode="aspectFill"></image>
          </view>
        </view>

        <view class="nav-center-area">
          <view class="refresh-status-bar" v-if="refreshState > 0">
            <view class="r-icon-box" v-if="refreshState === 1 || refreshState === 2">
              <view class="css-arrow" :class="{ up: refreshState === 2 }"></view>
            </view>
            <view class="r-loading" v-else-if="refreshState === 3"></view>
            <text class="r-text">{{ refreshTextMap[refreshState] }}</text>
          </view>

          <view class="nav-center-tabs" v-else>
            <view class="nav-tab" :class="{ active: currentTab === 2 }" @click="switchTab(2)">
              <text>商城</text>
              <view class="active-line" v-if="currentTab === 2"></view>
            </view>
            <view class="nav-tab" :class="{ active: currentTab === 0 }" @click="switchTab(0)">
              <text>首页</text>
              <view class="active-line" v-if="currentTab === 0"></view>
            </view>
            <view class="nav-tab" :class="{ active: currentTab === 1 }" @click="switchTab(1)">
              <text>应用</text>
              <view class="active-line" v-if="currentTab === 1"></view>
            </view>
          </view>
        </view>

        <view class="nav-right-spacer">
          <view class="search-entry-btn" @click="goSearchPage">
            <image class="header-img" src="/static/icon/search-gray.svg" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>

    <view class="pc-layout-wrapper">
      <scroll-view
        scroll-y
        class="main-scroll"
        @scrolltolower="loadMore"
        @scroll="handleMainScroll"
        :lower-threshold="180"
        enable-back-to-top
        :scroll-with-animation="false"
        :refresher-enabled="refresherEnabled"
      :refresher-triggered="isRefresherTriggered"
      refresher-default-style="none"
      refresher-background="transparent"
      :refresher-threshold="60"
      @refresherpulling="onRefresherPulling"
      @refresherrefresh="onNativeRefresh"
      @refresherrestore="onRefresherRestore"
      @refresherabort="onRefresherAbort"
    >
        <view :style="{ height: navTotalHeight + 'px' }"></view>

        <view :key="currentTab" class="tab-panel">
        <SoftwareLibrarySection
          v-if="currentTab === 1"
          embedded
        />

        <MarketShopSection
          v-else-if="currentTab === 2"
          embedded
        />

        <HomeTextFlowTheme
          v-else-if="isTextFlowTheme"
          :userInfo="userInfo"
          :currentTab="currentTab"
          :bannerList="bannerList"
          :zhidingPostList="zhidingPostList"
          :followList="followList"
          :postList="postList"
          :circle-list="circleList"
          :current-circle-id="currentCircleId"
          :isLoading="isLoading"
          :hasMore="hasMore"
          @goPostDetail="goPostDetail"
          @circle-change="switchCircle"
        />

        <WaterfallTheme
          v-else
          :userInfo="userInfo"
          :currentTab="currentTab"
          :bannerList="bannerList"
          :zhidingPostList="zhidingPostList"
          :followList="followList"
          :postList="postList"
          :colL="colL"
          :colR="colR"
          :isLoading="isLoading"
          :hasMore="hasMore"
          @goPostDetail="goPostDetail"
          @toggleLike="onToggleLike"
        />
        </view>
      </scroll-view>
    </view>

    <view class="notice-modal-mask" v-if="showNoticeModal" @touchmove.stop.prevent>
      <view class="notice-modal-box">
        <view class="notice-header">
          <text class="notice-title">系统公告</text>
        </view>
        <scroll-view scroll-y class="notice-content-scroll">
          <text class="notice-content-text" selectable>{{ siteNotice }}</text>
        </scroll-view>
        <view class="notice-footer">
          <view class="notice-btn" @click="closeNoticeModal">我知道了</view>
        </view>
      </view>
    </view>

    <view class="version-mask" v-if="showUpdateModal" @touchmove.stop.prevent>
      <view class="version-box">
        <view class="version-hero">
          <view class="version-orb orb-a"></view>
          <view class="version-orb orb-b"></view>
          <view class="version-chip-row">
            <text class="version-chip">{{ updateInfo.is_force == 1 ? '强制更新' : '新版本可用' }}</text>
            <text class="version-chip ghost">v{{ updateInfo.version_name || '最新' }}</text>
          </view>
          <text class="v-title">发现更好的社区体验</text>
          <text class="v-subtitle">{{ updateInfo.title || '这次更新带来了更稳定、更顺滑的使用体验' }}</text>
        </view>

        <view class="version-content">
          <view class="v-section">
            <text class="v-section-label">更新内容</text>
            <scroll-view scroll-y class="v-scroll">
              <text class="v-desc" selectable>{{ updateInfo.content || '修复已知问题并优化细节体验' }}</text>
            </scroll-view>
          </view>

          <view class="v-progress-box" v-if="isDownloading">
            <view class="v-progress-head">
              <text class="v-progress-label">下载更新包中</text>
              <text class="v-progress-text">{{ downloadProgress }}%</text>
            </view>
            <view class="v-progress-bg">
              <view class="v-progress-fill" :style="{ width: downloadProgress + '%' }"></view>
            </view>
          </view>

          <view class="v-btn-group" v-else>
            <view
              class="v-btn cancel"
              v-if="updateInfo.is_force != 1"
              @click="closeUpdateModal"
            >
              暂不更新
            </view>
            <view class="v-btn confirm" @click="startDownload">立即更新</view>
          </view>
        </view>
      </view>
    </view>

    <CustomTabBar :current="0" @publish="goPublish" />
    <PublishModal
      :visible="showPublishModal"
      @close="showPublishModal = false"
      @select="onPublishSelect"
    />

    <XhsHUD :show="hud.show" :text="hud.text" :mode="hud.mode" />


    <view class="sidebar-mask" :class="{ show: sidebarOpen }" @click="closeSidebar">
      <view class="sidebar-panel" :class="{ show: sidebarOpen }" @click.stop>
        <view class="sidebar-user">
          <view class="sidebar-avatar-wrapper">
            <image class="sidebar-avatar" :src="(userInfo && userInfo.avatar) || defaultAvatar" mode="aspectFill"></image>
          </view>
          <view class="sidebar-uinfo">
            <text class="sidebar-name">{{ userInfo ? (userInfo.name || userInfo.username || '用户') : '未登录' }}</text>
            <text class="sidebar-uid">{{ userInfo && userInfo.personal_signature ? userInfo.personal_signature : '这个人很懒，什么都没留下' }}</text>
          </view>
        </view>
        <view class="sidebar-divider"></view>
        <view class="sidebar-section-title">首页主题</view>
        <view class="theme-choice-list">
          <view
            class="theme-choice-item"
            v-for="item in themeOptions"
            :key="item.key"
            :class="{ active: userThemePreference === item.key }"
            @click="setThemePreference(item.key)"
          >
            <view class="theme-choice-dot"></view>
            <view class="theme-choice-copy">
              <text class="theme-choice-title">{{ item.label }}</text>
              <text class="theme-choice-desc">{{ item.desc }}</text>
            </view>
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
        <view class="sidebar-logout-area">
          <view class="sidebar-logout-btn" @click="handleLogout">
            <text class="sidebar-logout-text">退出登录</text>
          </view>
        </view>
      </view>
    </view>

    <view class="filter-menu-mask" v-if="showFilterMenu" @click="toggleFilter"></view>
    <view class="filter-menu" v-if="showFilterMenu">
      <view
        class="filter-menu-item"
        v-for="opt in filterOptions"
        :key="opt.key"
        :class="{ active: currentFilter === opt.key }"
        @click="switchFilter(opt.key)"
      >
        <text class="filter-menu-text">{{ opt.label }}</text>
      </view>
    </view>
    
    <RedPacketModal 
      :userId="userInfo?.id || 0" 
      :username="userInfo?.username || ''" 
    />
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import PublishModal from '../../components/PublishModal.vue'
import CustomTabBar from '../../components/CustomTabBar.vue'
import XhsHUD from '../../components/XhsHUD.vue'
import WaterfallTheme from '../../components/WaterfallTheme.vue'
import HomeTextFlowTheme from '../../components/HomeTextFlowTheme.vue'
import MarketShopSection from '../../components/MarketShopSection.vue'
import SoftwareLibrarySection from '../../components/SoftwareLibrarySection.vue'

import SplashAd from '../../components/SplashAd.vue'
import RedPacketModal from '../../components/RedPacketModal.vue'
import OnlineNotifyCard from '../../components/OnlineNotifyCard.vue'
import { applyH5ViewportHeightVar, getScreenMetrics } from '../../common/screen.js'
import { saveLevelConfig } from '../../common/level.js'

const DEFAULT_VIDEO_COVER = '/static/logo.png'
const CURRENT_VERSION_CODE = 21
const IMG_CACHE_KEY = 'app_local_images_map'
const IMG_CACHE_QUEUE_KEY = 'app_local_images_queue'
const POST_DETAIL_PREVIEW_PREFIX = 'post_detail_preview_'
const HOME_THEME_PREF_KEY = 'home_theme_preference'

function createTabState() {
  return {
    list: [],
    colL: [],
    colR: [],
    page: 1,
    hasMore: true,
    loaded: false,
    loading: false,
    lastFetchTime: 0
  }
}

export default {
  components: {
    CustomTabBar,
    PublishModal,
    XhsHUD,
    WaterfallTheme,
    HomeTextFlowTheme,
    MarketShopSection,
    SoftwareLibrarySection,
    RedPacketModal,
    OnlineNotifyCard,
    SplashAd,
  },

  data() {
    return {
      userInfo: uni.getStorageSync('userInfo') || null,

      statusBarHeight: 20,
      navBarHeight: 44,
      navTotalHeight: 64,
      menuButtonHeight: 32,
      menuButtonWidth: 87,

      hideFab: false,
      lastScrollTop: 0,

      showPublishModal: false,
      hud: { show: false, text: '', mode: 'loading' },
      defaultAvatar: '/static/logo.png',

      currentTab: 0,
      /* 抖音式视频播放器是否开着（给 onBackPress 用） */
      douyinPlayerOpen: false,
      backendHomeTheme: 'text_flow',
      userThemePreference: '',
      currentFilter: 'all',
      currentCircleId: 0,
      showFilterMenu: false,
      sidebarOpen: false,
      themeOptions: [
        { key: '', label: '文字流主题', desc: '管理员切换首页主题后自动同步' },
        { key: 'waterfall', label: '瀑布流主题', desc: '双列卡片布局，适合图片内容' }
      ],
      sidebarMenus: [],
      filterOptions: [
        { key: 'all', label: '全部', desc: '显示所有帖子内容' },
        { key: 'text', label: '纯文字', desc: '只看没有图片和视频的帖子' },
        { key: 'video', label: '视频', desc: '只看视频帖子' },
        { key: 'image', label: '图文', desc: '只看带图片的帖子' }
      ],

      pageSize: 12,
      isLoading: false,

      bannerList: [],
      zhidingPostList: [],
      followList: [],
      circleList: [],

      tabCache: {
        0: createTabState(),
        1: createTabState(),
        2: createTabState(),
        3: createTabState()
      },

      isRefresherTriggered: false,
      refreshState: 0,
      refreshTextMap: {
        1: '下拉推荐',
        2: '松开推荐',
        3: '推荐中...'
      },

      siteNotice: '',
      showNoticeModal: false,
      showUpdateModal: false,
      updateInfo: {},

      isDownloading: false,
      downloadProgress: 0,
      currentVersionCode: CURRENT_VERSION_CODE,

      isRefreshing: false,
      refreshWatchdog: null,

      lastPullTs: 0,
      pullThrottleMs: 48,
      lastPullState: 0,

      lastScrollTs: 0,
      scrollThrottleMs: 48,

      reqToken: 0,
      loadMoreLock: false,
      loadMoreTimer: null,
      lastLoadMoreTs: 0,
      loadMoreThrottleMs: 300,

      // 优化：缓存过滤后的列表，避免computed中重复计算
      _postListCache: [],
      _colLCache: [],
      _colRCache: [],
      _filterDirty: true,

      // 首次加载标记（onLoad时为true，首次onShow后变false）
      _isFirstLoad: true,
      // 强制刷新标记（登录/发布后设置）
      _forceRefreshOnShow: false,

      cachedImagesMap: {},
      imageDownloadQueue: [],
      imageDownloading: false,
      imagePrefetchLimit: 3, // 优化：从6减少到3，减少内存占用
      // 优化：延迟批量写入Storage的状态
      _imageCacheDirty: false,
      _imageCachePersistTimer: null,

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
      ],

      refresherEnabled: true
    }
  },

  computed: {
    currentCache() {
      return this.tabCache[this.currentTab]
    },
    currentFilterLabel() {
      const labels = { all: '全部', text: '纯文字', video: '视频', image: '图文' }
      return labels[this.currentFilter] || '全部'
    },
    postList() {
      this.rebuildFilteredCache()
      return this._postListCache
    },
    colL() {
      this.rebuildFilteredCache()
      return this._colLCache
    },
    colR() {
      this.rebuildFilteredCache()
      return this._colRCache
    },
    hasMore() {
      return this.currentCache.hasMore
    },
    isTextFlowTheme() {
      return this.activeHomeTheme === 'text_flow'
    },
    activeHomeTheme() {
      const pref = String(this.userThemePreference || '')
      if (pref === 'text_flow' || pref === 'waterfall') return pref
      return this.backendHomeTheme === 'text_flow' ? 'text_flow' : 'waterfall'
    }
  },

  onLoad() {
    applyH5ViewportHeightVar()
    const metrics = getScreenMetrics()
    this.statusBarHeight = metrics.statusBarHeight
    /* 抖音式视频播放器开着时，系统返回键先关播放器，而不是直接退出应用 */
    this._onDouyinOpen = (open) => { this.douyinPlayerOpen = !!open }
    uni.$on('qixi_douyin_open', this._onDouyinOpen)
    this.loadThemePreference()
    this.loadBackendThemeCache()

    // #ifdef MP-WEIXIN
    const menuInfo = uni.getMenuButtonBoundingClientRect()
    if (menuInfo) {
      this.menuButtonHeight = menuInfo.height || 32
      this.menuButtonWidth = menuInfo.width || 87
      this.navBarHeight = ((menuInfo.top - this.statusBarHeight) * 2 + this.menuButtonHeight) || 44
    } else {
      this.menuButtonHeight = 32
      this.menuButtonWidth = 87
      this.navBarHeight = 44
    }
    // #endif

    // #ifndef MP-WEIXIN
    this.navBarHeight = metrics.navBarHeight
    this.menuButtonHeight = 32
    this.menuButtonWidth = 0
    // #endif

    this.navTotalHeight = this.statusBarHeight + this.navBarHeight

    // #ifdef APP-PLUS
    const savedMap = uni.getStorageSync(IMG_CACHE_KEY)
    if (savedMap) this.cachedImagesMap = savedMap
    const savedQueue = uni.getStorageSync(IMG_CACHE_QUEUE_KEY)
    if (savedQueue && Array.isArray(savedQueue)) this.imageDownloadQueue = savedQueue

    plus.runtime.getProperty(plus.runtime.appid, (wgtinfo) => {
      if (wgtinfo.versionCode) this.currentVersionCode = parseInt(wgtinfo.versionCode)
    })
    // #endif

    // #ifdef H5
    this.checkAppUpdate()
    // #endif

    this.initData()
  },

  watch: {
    // 优化：当tab或filter变化时标记缓存脏，下次访问时重建
    currentTab() {
      this.markFilterDirty()
    },
    currentFilter() {
      this.markFilterDirty()
    }
  },

  onShow() {
    /* 自定义 TabBar：每次页面显示都压一次原生 TabBar，
       否则切页后原生 TabBar 会重新露出来，和自定义的重叠成两排 */
    try { uni.hideTabBar({ animation: false, fail: () => {} }) } catch (e) {}
    this.userInfo = uni.getStorageSync('userInfo') || null

    // 检查是否需要强制刷新（登录/发布后设置）
    const needForceRefresh = uni.getStorageSync('_forceRefreshHome')
    if (needForceRefresh) {
      uni.removeStorageSync('_forceRefreshHome')
      this._forceRefreshOnShow = true
    }

    // 首次onShow：由onLoad的initData处理，跳过
    if (this._isFirstLoad) {
      this._isFirstLoad = false
      return
    }

    // 强制刷新场景（登录/发布后）
    if (this._forceRefreshOnShow) {
      this._forceRefreshOnShow = false
      this.refreshData()
      return
    }

    // 后续返回首页：使用缓存，不重新请求（用户下拉才刷新）
    // 仅更新浏览量等轻量数据
    const viewUpdate = uni.getStorageSync('last_view_update')
    if (viewUpdate && viewUpdate.postId) {
      const cache = this.getCurrentCache()
      const idx = (cache.list || []).findIndex(p => p.id == viewUpdate.postId)
      if (idx !== -1) {
        this.$set(cache.list, idx, { ...cache.list[idx], view_count: viewUpdate.view_count })
      }
      uni.removeStorageSync('last_view_update')
    }
  },

  onUnload() {
    if (this.refreshWatchdog) clearTimeout(this.refreshWatchdog)
    if (this.loadMoreTimer) clearTimeout(this.loadMoreTimer)
    if (this._imageCachePersistTimer) {
      clearTimeout(this._imageCachePersistTimer)
      this._imageCachePersistTimer = null
    }
    try { uni.$off('qixi_douyin_open', this._onDouyinOpen) } catch (e) {}
  },

  /* 返回键：抖音式播放器开着就先关播放器（返回 true = 我处理了，别退出页面/应用） */
  onBackPress() {
    if (this.douyinPlayerOpen) {
      try { uni.$emit('qixi_douyin_close') } catch (e) {}
      this.douyinPlayerOpen = false
      return true
    }
    return false
  },

  methods: {
    // 优化：按需重建过滤缓存，避免computed每次访问都重新计算
    rebuildFilteredCache() {
      if (!this._filterDirty) return
      this._filterDirty = false
      const cache = this.currentCache
      const list = cache.list
      if (this.currentFilter === 'all') {
        this._postListCache = list
        this._colLCache = cache.colL
        this._colRCache = cache.colR
        return
      }
      let filtered
      if (this.currentFilter === 'text') filtered = list.filter(p => p.isTextOnly)
      else if (this.currentFilter === 'video') filtered = list.filter(p => !!p.video)
      else if (this.currentFilter === 'image') filtered = list.filter(p => !!p.coverImage && !p.video)
      else filtered = list
      const colL = [], colR = []
      filtered.forEach(p => {
        if (colL.length <= colR.length) colL.push(p)
        else colR.push(p)
      })
      this._postListCache = filtered
      this._colLCache = colL
      this._colRCache = colR
    },
    markFilterDirty() {
      this._filterDirty = true
    },

    getCurrentCache(tab = this.currentTab) {
      return this.tabCache[tab]
    },

    resetTabState(tab = this.currentTab) {
      this.tabCache[tab] = createTabState()
      this.markFilterDirty()
    },

    resetCurrentTabState() {
      this.resetTabState(this.currentTab)
    },

    getTabStaleTime() {
      return 60000
    },

    withTimeout(promise, ms = 8000, fallback = null) {
      let timer = null
      return Promise.race([
        Promise.resolve(promise).catch(() => fallback),
        new Promise(resolve => {
          timer = setTimeout(() => resolve(fallback), ms)
        })
      ]).finally(() => {
        if (timer) clearTimeout(timer)
      })
    },

    async loadRuntimeConfig() {
      try {
        const res = await request('post.php?action=get_runtime_config', {}, 'GET')
        if (res && res.code === 0 && res.data) {
          saveLevelConfig(res.data)
          const theme = String(res.data.home_theme || 'text_flow')
          this.backendHomeTheme = theme === 'waterfall' ? 'waterfall' : 'text_flow'
          try {
            uni.setStorageSync('home_backend_theme', this.backendHomeTheme)
          } catch (e) {}
        }
      } catch (e) {}
    },

    loadThemePreference() {
      try {
        const v = String(uni.getStorageSync(HOME_THEME_PREF_KEY) || '')
        this.userThemePreference = (v === 'text_flow' || v === 'waterfall') ? v : ''
      } catch (e) {
        this.userThemePreference = ''
      }
    },

    loadBackendThemeCache() {
      try {
        const cached = uni.getStorageSync('home_backend_theme')
        if (cached === 'waterfall' || cached === 'text_flow') {
          this.backendHomeTheme = cached
        }
      } catch (e) {}
    },

    setThemePreference(theme) {
      const next = (theme === 'text_flow' || theme === 'waterfall') ? theme : ''
      this.userThemePreference = next
      try {
        if (next) uni.setStorageSync(HOME_THEME_PREF_KEY, next)
        else uni.removeStorageSync(HOME_THEME_PREF_KEY)
      } catch (e) {}
      uni.showToast({ title: next ? '首页样式已切换' : '已跟随后台设置', icon: 'none' })
    },

    buildPostPreview(post) {
      if (!post || typeof post !== 'object') return null

      return {
        id: post.id,
        user_id: post.user_id,
        title: post.title || '',
        plain_content: post.plainContent || post.plain_content || '',
        content: post.content || post.plainContent || '',
        avatar: post.avatar || '',
        name: post.name || post.username || '匿名',
        current_frame_img: post.current_frame_img || post.frame_img || '',
        create_time: post.create_time || post.created_at || '',
        like_count: Number(post.like_count) || 0,
        comment_count: Number(post.comment_count) || 0,
        circle_name: post.circle_name || '社区',
        circle_id: post.circle_id || 0,
        images: Array.isArray(post.images) ? post.images : (post.coverImage ? [post.coverImage] : []),
        coverImage: post.coverImage || '',
        video: post.video || '',
        topic_names: post.topic_names || [],
        co_creators: Array.isArray(post.co_creators) ? post.co_creators : [],
        status: parseInt(post.status || 1),
        is_paid: parseInt(post.is_paid || 0),
        is_comment_unlock: parseInt(post.is_comment_unlock || 0),
        is_unlocked: !!(post.is_unlocked || post.is_purchased),
        price: post.price || '0',
        vip: parseInt(post.vip || 0),
        lv: parseInt(post.lv || 0),
        user_title: post.user_title || '',
        display_number: post.display_number || '',
        is_fancy: parseInt(post.is_fancy || 0)
      }
    },

    onToggleLike(post) {
      // 点赞事件处理（WaterfallTheme组件已经直接调用API了，这里只做预留）
      console.log('toggleLike', post);
    },

    goPostDetail(post) {
      // 兼容：如果子组件误传 id，也尽量兜底
      if (!post || typeof post !== 'object') {
        const pid = Number(post || 0)
        if (!pid) {
          uni.showToast({ title: '帖子数据异常', icon: 'none' })
          return
        }
        uni.navigateTo({
          url: `/pages/post-detail/post-detail?postId=${pid}`
        })
        return
      }

      const preview = this.buildPostPreview(post)
      if (preview && preview.id) {
        try {
          uni.setStorageSync(`${POST_DETAIL_PREVIEW_PREFIX}${preview.id}`, preview)
        } catch (e) {}
      }

      uni.navigateTo({
        url: `/pages/post-detail/post-detail?postId=${post.id}`
      })
    },

    queueImageCaching(images) {
      // #ifdef H5
      return
      // #endif
      // #ifndef H5
      if (!images || images.length === 0) return

      const uniq = images
        .filter(Boolean)
        .filter((url, index, arr) => arr.indexOf(url) === index)
        .filter(url => !this.cachedImagesMap[url])
        .filter(url => !this.imageDownloadQueue.includes(url))
        .slice(0, this.imagePrefetchLimit)

      if (!uniq.length) return

      this.imageDownloadQueue.push(...uniq)
      uni.setStorageSync(IMG_CACHE_QUEUE_KEY, this.imageDownloadQueue)
      this.runImageCacheQueue()
      // #endif
    },

    runImageCacheQueue() {
      // #ifdef H5
      return
      // #endif
      // #ifndef H5
      if (this.imageDownloading) return
      if (!this.imageDownloadQueue.length) return

      this.imageDownloading = true
      const remoteUrl = this.imageDownloadQueue.shift()
      // 优化：延迟写入storage，批量处理
      this._imageCacheDirty = true
      uni.setStorageSync(IMG_CACHE_QUEUE_KEY, this.imageDownloadQueue)

      if (!remoteUrl || this.cachedImagesMap[remoteUrl]) {
        this.imageDownloading = false
        setTimeout(() => this.runImageCacheQueue(), 200)
        return
      }

      uni.downloadFile({
        url: remoteUrl,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            uni.saveFile({
              tempFilePath: res.tempFilePath,
              success: (saveRes) => {
                this.$set(this.cachedImagesMap, remoteUrl, saveRes.savedFilePath)
                this.scheduleImageCachePersist()
              },
              complete: () => {
                this.imageDownloading = false
                setTimeout(() => this.runImageCacheQueue(), 300)
              }
            })
          } else {
            this.imageDownloading = false
            setTimeout(() => this.runImageCacheQueue(), 300)
          }
        },
        fail: () => {
          this.imageDownloading = false
          setTimeout(() => this.runImageCacheQueue(), 500)
        }
      })
      // #endif
    },

    // 优化：延迟批量写入Storage，减少同步阻塞
    scheduleImageCachePersist() {
      if (this._imageCachePersistTimer) return
      this._imageCachePersistTimer = setTimeout(() => {
        this._imageCachePersistTimer = null
        if (this._imageCacheDirty) {
          uni.setStorageSync(IMG_CACHE_KEY, this.cachedImagesMap)
          this._imageCacheDirty = false
        }
      }, 2000)
    },

    normalizePostItem(i) {
      const isUsableMedia = (url) => {
        const value = String(url || '').trim()
        if (!value) return false
        const lowered = value.toLowerCase()
        return !['null', 'undefined', 'false', '[]', '[object object]'].includes(lowered)
      }

      let imgs = []
      if (i.images && i.images !== 'NULL') {
        if (Array.isArray(i.images)) {
          imgs = i.images
        } else if (typeof i.images === 'string') {
          try {
            imgs = i.images.startsWith('[') ? JSON.parse(i.images) : i.images.split(',')
          } catch (e) {
            imgs = i.images.split(',')
          }
        }
      }

      imgs = imgs
        .map(item => String(item || '').trim())
        .filter(item => isUsableMedia(item))

      let coverImage = imgs[0] || ''
      if (!isUsableMedia(coverImage)) coverImage = ''
      if (i.video && !coverImage) coverImage = DEFAULT_VIDEO_COVER

      let plainContent = (i.plain_content || i.content || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (plainContent.length > 70) plainContent = plainContent.substring(0, 70) + '...'

      const isTextOnly = !coverImage && !i.video
      // 优化：仅在需要时创建textCoverData，减少不必要对象分配
      const textCoverData = isTextOnly ? {
        gradient: this.textCoverGradients[(i.id || 0) % 12],
        title: ((i.title || '').trim() || plainContent || '文字内容').substring(0, 20),
        subtitle: (plainContent || '点击查看详情').substring(0, 40)
      } : null

      return {
        ...i,
        images: imgs,
        coverImage,
        video: i.video || '',
        totalImages: imgs.length,
        name: i.name || i.username || '用户',
        plainContent,
        isTextOnly,
        textCoverData,
        frame_img: i.frame_img || i.current_frame_img || '',
        lv: parseInt(i.lv || 0),
        vip: parseInt(i.vip || 0),
        user_title: i.user_title || '',
        display_number: i.display_number || '',
        is_fancy: parseInt(i.is_fancy || 0),
        is_paid: parseInt(i.is_paid || 0),
        is_comment_unlock: parseInt(i.is_comment_unlock || 0),
        is_unlocked: !!(i.is_unlocked || i.is_purchased)
      }
    },

    buildColumns(list) {
      const colL = []
      const colR = []
      list.forEach((p) => {
        if (colL.length <= colR.length) colL.push(p)
        else colR.push(p)
      })
      return { colL, colR }
    },

    appendColumns(cache, list) {
      if (!list || !list.length) return
      list.forEach((p) => {
        if (cache.colL.length <= cache.colR.length) cache.colL.push(p)
        else cache.colR.push(p)
      })
    },

    handleMainScroll(e) {
      if (this.refreshState > 0) return
      const now = Date.now()
      if (now - this.lastScrollTs < this.scrollThrottleMs) return
      this.lastScrollTs = now

      const currentY = e.detail.scrollTop || 0
      if (currentY <= 0) {
        this.hideFab = false
      } else {
        if (currentY > this.lastScrollTop && currentY > 100) this.hideFab = true
        else if (currentY < this.lastScrollTop) this.hideFab = false
      }
      this.lastScrollTop = currentY
    },

    onRefresherPulling(e) {
      if (this.isRefreshing) return
      const dy = e.detail.dy || 0
      const now = Date.now()
      if (now - this.lastPullTs < this.pullThrottleMs) return
      this.lastPullTs = now

      let nextState = 0
      if (dy > 60) nextState = 2
      else if (dy > 10) nextState = 1

      if (nextState !== this.lastPullState) {
        this.lastPullState = nextState
        this.refreshState = nextState
      }
    },

    async onNativeRefresh() {
      if (this.isRefreshing) {
        this.isRefresherTriggered = false
        return
      }

      this.isRefreshing = true
      this.isRefresherTriggered = true
      this.refreshState = 3
      this.lastPullState = 3

      if (this.refreshWatchdog) clearTimeout(this.refreshWatchdog)
      this.refreshWatchdog = setTimeout(() => {
        this.forceStopRefresh('刷新超时')
      }, 12000)

      try {
        await this.refreshData()
        setTimeout(() => uni.showToast({ title: '推荐已更新', icon: 'none' }), 50)
      } catch (e) {
        setTimeout(() => uni.showToast({ title: '刷新失败', icon: 'none' }), 50)
      } finally {
        this.finishRefreshSmooth()
      }
    },

    onRefresherRestore() {
      if (!this.isRefreshing) {
        this.refreshState = 0
        this.lastPullState = 0
        this.isRefresherTriggered = false
      }
    },

    onRefresherAbort() {
      if (!this.isRefreshing) {
        this.refreshState = 0
        this.lastPullState = 0
        this.isRefresherTriggered = false
      }
    },

    finishRefreshSmooth() {
      if (this.refreshWatchdog) clearTimeout(this.refreshWatchdog)

      setTimeout(() => {
        this.isRefresherTriggered = false
        setTimeout(() => {
          this.refreshState = 0
          this.lastPullState = 0
          this.isRefreshing = false
        }, 100)
      }, 220)
    },

    forceStopRefresh(tip) {
      if (this.refreshWatchdog) clearTimeout(this.refreshWatchdog)
      this.isRefresherTriggered = false
      this.refreshState = 0
      this.lastPullState = 0
      this.isRefreshing = false
      if (tip) uni.showToast({ title: tip, icon: 'none' })
    },

    async initData() {
      this.isLoading = true
      try {
        await Promise.allSettled([
          this.withTimeout(this.loadRuntimeConfig(), 5000),
          this.withTimeout(this.fetchPostList(true, false, this.currentTab), 9000),
          this.withTimeout(this.getZhidingList(), 6000),
          this.withTimeout(this.getBannerList(), 6000),
          this.withTimeout(this.getCircleList(), 6000),
          this.currentTab === 3 ? this.withTimeout(this.getFollowUsers(), 6000) : Promise.resolve()
        ])
      } finally {
        this.isLoading = false
      }
    },

    async refreshData() {
      this.resetCurrentTabState()

      if (this.currentTab === 3 && this.userInfo) {
        await this.getFollowUsers()
      }

      await Promise.allSettled([
        this.withTimeout(this.loadRuntimeConfig(), 5000),
        this.withTimeout(this.fetchPostList(true, false, this.currentTab), 9000),
        this.withTimeout(this.getZhidingList(), 6000),
        this.withTimeout(this.getBannerList(), 6000),
        this.withTimeout(this.getCircleList(), 6000)
      ])
    },

    loadMore() {
      const cache = this.getCurrentCache()
      if (this.isRefreshing) return
      if (this.isLoading) return
      if (!cache.loaded) return
      if (cache.loading) return
      if (this.loadMoreLock) return
      if (!cache.hasMore) return

      const now = Date.now()
      if (now - this.lastLoadMoreTs < this.loadMoreThrottleMs) return
      this.lastLoadMoreTs = now

      this.loadMoreLock = true
      if (this.loadMoreTimer) clearTimeout(this.loadMoreTimer)

      this.loadMoreTimer = setTimeout(async () => {
        try {
          await this.fetchPostList(false, false, this.currentTab)
        } finally {
          setTimeout(() => {
            this.loadMoreLock = false
          }, 100)
        }
      }, 40)
    },

    async switchTab(index) {
      if (this.currentTab === index) return
      if (this.isRefreshing) return

      if (index === 3 && !this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      // 视觉顺序：商城(2) → 首页(0) → 应用(1)
      this.currentTab = index

      if (index === 1 || index === 2) return

      if (index === 3) {
        await this.getFollowUsers()
      }

      const cache = this.getCurrentCache(index)
      const now = Date.now()
      const staleTime = this.getTabStaleTime(index)

      if (!cache.loaded || cache.list.length === 0) {
        this.isLoading = true
        await this.fetchPostList(true, false, index)
        this.isLoading = false
        return
      }

      if (now - cache.lastFetchTime > staleTime) {
        this.fetchPostList(true, true, index)
      }
    },

    async fetchPostList(reload = false, silent = false, tab = this.currentTab) {
      const cache = this.getCurrentCache(tab)
      if (!cache) return
      if (tab === 1 || tab === 2) return
      if (!cache.hasMore && !reload) return
      if (cache.loading) return

      const myToken = ++this.reqToken
      if (!silent) this.isLoading = true
      cache.loading = true

      let sortAction = 'latest'
      if (tab === 3) sortAction = 'follow'

      const reqPage = reload ? 1 : cache.page

      try {
        const postTypeMap = { all: '', text: 'text', video: 'video', image: 'image' }
        const res = await request('post.php', {
          action: 'list',
          page: reqPage,
          pageSize: this.pageSize,
          sort: sortAction,
          excludeZhiding: 1,
          circle_id: tab === 3 ? 0 : this.currentCircleId,
          post_type: postTypeMap[this.currentFilter] || '',
          _t: reload ? Date.now() : ''
        }, 'GET')

        if (myToken !== this.reqToken) return

        if (res.code === 0) {
          const noticeText = (res.data && res.data.site_notice) || res.site_notice || ''
          if (noticeText && reload && reqPage === 1 && tab === this.currentTab) {
            this.siteNotice = noticeText
            const lastRead = uni.getStorageSync('last_read_notice')
            if (this.siteNotice !== lastRead) this.showNoticeModal = true
          }

          const rawData = res.data || {}
          const rawList = Array.isArray(rawData) ? rawData : (rawData.list || [])
          const list = rawList.map(this.normalizePostItem)

          const preloadImages = list
            .map(i => i.coverImage)
            .filter(Boolean)
            .slice(0, this.imagePrefetchLimit)

          if (reload) {
            cache.list = list
            cache.page = 2
            cache.hasMore = rawList.length >= this.pageSize
            cache.loaded = true
            cache.lastFetchTime = Date.now()

            const cols = this.buildColumns(list)
            cache.colL = cols.colL
            cache.colR = cols.colR
          } else {
            cache.list = [...cache.list, ...list]
            this.appendColumns(cache, list)
            if (rawList.length > 0) cache.page = reqPage + 1
            cache.hasMore = rawList.length >= this.pageSize
            cache.loaded = true
            cache.lastFetchTime = Date.now()
          }

          setTimeout(() => {
            this.queueImageCaching(preloadImages)
          }, 30)
        } else {
          if (reload) {
            cache.list = []
            cache.colL = []
            cache.colR = []
            cache.page = 1
          }
          cache.hasMore = false
          cache.loaded = true
          cache.lastFetchTime = Date.now()
        }
      } catch (e) {
        if (myToken === this.reqToken) {
          if (reload && cache.list.length === 0) {
            cache.list = []
            cache.colL = []
            cache.colR = []
          }
        }
      } finally {
        cache.loading = false
        if (!silent && tab === this.currentTab) this.isLoading = false
        this.markFilterDirty() // 优化：数据变更后标记需要重建缓存
      }
    },

    async getBannerList() {
      try {
        const res = await request('banner.php', { action: 'list' }, 'GET')
        if (res.code === 0) this.bannerList = res.data || []
      } catch (e) {}
    },

    async getCircleList() {
      try {
        const res = await request('circle.php', { action: 'list', sort: 'hot', limit: 8 }, 'GET')
        if (res.code === 0) {
          const data = res.data
          this.circleList = (Array.isArray(data) ? data : (data && data.list) || []) 
        }
      } catch (e) {}
    },

    async getZhidingList() {
      try {
        const res = await request('post.php', { action: 'zhiding', limit: 3 }, 'GET')
        if (res.code === 0) this.zhidingPostList = (Array.isArray(res.data) ? res.data : (res.data && res.data.list) || [])
      } catch (e) {}
    },

    async getFollowUsers() {
      if (!this.userInfo) return
      try {
        const res = await request('post.php', { action: 'getFollowList' })
        if (res.code === 0) this.followList = (Array.isArray(res.data) ? res.data : (res.data && res.data.list) || [])
      } catch (e) {}
    },

    goSearchPage() {
      uni.navigateTo({ url: '/pages/search/search' })
    },

    openSidebar() {
      this.sidebarOpen = true
    },

    closeSidebar() {
      this.sidebarOpen = false
    },

    onSidebarTap(item) {
      this.closeSidebar()
      setTimeout(() => {
        if (item.type === 'page') {
          if (!this.userInfo) return uni.navigateTo({ url: '/pages/login/login' })
          uni.navigateTo({ url: item.url })
        }
      }, 220)
    },

    async switchCircle(circleId) {
      const id = Number(circleId || 0)
      if (this.currentCircleId === id) return
      this.currentCircleId = id
      this.resetTabState(0)
      this.resetTabState(1)
      if (this.currentTab === 3) return
      this.isLoading = true
      try {
        await this.fetchPostList(true, false, this.currentTab)
      } finally {
        this.isLoading = false
      }
    },

    goPublish() {
      if (!this.userInfo) return uni.navigateTo({ url: '/pages/login/login' })
      this.showPublishModal = true
    },

    onPublishSelect(type) {
      switch (type) {
        case 'post':
          uni.navigateTo({ url: '/pages/publish/publish' })
          break
        case 'circle':
          uni.navigateTo({ url: '/pages/circle/circle' })
          break
        case 'market':
          uni.navigateTo({ url: '/pages/market/publish' })
          break
        case 'software':
          uni.navigateTo({ url: '/pages/software/publish' })
          break
      }
    },

    closeNoticeModal() {
      this.showNoticeModal = false
      if (this.siteNotice) uni.setStorageSync('last_read_notice', this.siteNotice)
    },

    async checkAppUpdate() {
      try {
        const res = await request('app.php', {
          action: 'check_update',
          current_version_code: this.currentVersionCode,
          platform: 'h5'
        }, 'GET')
        if (res.code === 0 && res.data) {
          const sVer = parseInt(res.data.version_code || 0)
          if (sVer > this.currentVersionCode) {
            this.updateInfo = res.data
            this.showUpdateModal = true
          }
        }
      } catch (e) {}
    },

    closeUpdateModal() {
      if (this.updateInfo.is_force == 1) return
      this.showUpdateModal = false
    },

    startDownload() {
      if (!this.updateInfo.download_url) return
      // #ifdef H5
      window.open(this.updateInfo.download_url, '_blank')
      return
      // #endif

      // #ifdef APP-PLUS
      this.isDownloading = true
      this.downloadProgress = 0

      const dtask = plus.downloader.createDownload(
        this.updateInfo.download_url,
        { filename: '_doc/update/' },
        (d, status) => {
          if (status == 200) {
            this.isDownloading = false
            plus.runtime.install(
              d.filename,
              { force: true },
              () => {
                plus.runtime.restart()
              },
              () => {
                uni.showToast({ title: '安装失败', icon: 'none' })
              }
            )
          } else {
            this.isDownloading = false
            uni.showToast({ title: '下载失败', icon: 'none' })
          }
        }
      )

      dtask.addEventListener('statechanged', (task) => {
        if (task.state == 3 && task.totalSize > 0) {
          this.downloadProgress = parseInt((task.downloadedSize / task.totalSize) * 100)
        }
      })

      dtask.start()
      // #endif
    },

    toggleFilter() {
      this.showFilterMenu = !this.showFilterMenu
    },

    switchFilter(filterKey) {
      if (this.currentFilter === filterKey) {
        this.showFilterMenu = false
        this.closeSidebar()
        return
      }
      this.currentFilter = filterKey
      this.showFilterMenu = false
      this.tabCache[0] = createTabState()
      this.tabCache[1] = createTabState()
      this.tabCache[2] = createTabState()
      this.tabCache[3] = createTabState()
      this.markFilterDirty()
      this.closeSidebar()
      this.fetchPostList(true, false, this.currentTab)
    },

    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (!res.confirm) return
          try {
            uni.removeStorageSync('userInfo')
            uni.removeStorageSync('token')
          } catch (e) {}
          this.userInfo = null
          this.closeSidebar()
          uni.showToast({ title: '已退出登录', icon: 'none' })
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/login' })
          }, 500)
        }
      })
    }
  }
}
</script>

<style scoped>
.tab-panel { width: 100%; }

.index-container { min-height: var(--tcy-vh, 100vh); background-color: var(--cr-surface); position: relative; overflow-x: hidden; }
.custom-app-bar { position: fixed; top: 0; left: 0; width: 100%; z-index: 999; background: var(--cr-surface); box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.05); }
.app-bar-content { display: flex; align-items: center; justify-content: space-between; padding-left: 18rpx; }
.nav-left { width: 144rpx; height: 100%; display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.nav-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; }
.nav-btn:active { opacity: .65; }
.search-entry-btn { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--cr-text-muted); }
.mine-style-icon { width: 36rpx; height: 36rpx; }
.header-img { width: 44rpx; height: 44rpx; display: block; }
.nav-left-avatar-wrap { position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.nav-left-avatar-wrap:active { opacity: .65; }
.nav-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: var(--cr-surface-alt); }
.nav-center-area { flex: 1; display: flex; justify-content: center; align-items: center; }
.refresh-status-bar { display: flex; align-items: center; justify-content: center; gap: 12rpx; min-height: 40rpx; }
.r-text { font-size: 28rpx; color: var(--cr-text); font-weight: 500; }
.r-icon-box { width: 30rpx; height: 30rpx; display: flex; align-items: center; justify-content: center; }
.css-arrow { width: 0; height: 0; border-left: 10rpx solid transparent; border-right: 10rpx solid transparent; border-top: 14rpx solid #666; transform: rotate(180deg); transition: transform 0.15s ease; }
.css-arrow.up { transform: rotate(0deg); }
.r-loading { width: 24rpx; height: 24rpx; border: 3rpx solid var(--cr-border-strong); border-top-color: #ff2442; border-radius: 50%; animation: spin 0.8s linear infinite; }
.nav-center-tabs { display: flex; align-items: center; gap: 32rpx; }
.nav-tab { position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.nav-tab text { font-size: 30rpx; color: var(--cr-text-muted); font-weight: 400; transition: all 0.2s; }
.nav-tab.active text { font-size: 34rpx; color: var(--cr-text); font-weight: 800; transform: scale(1.05); }
.active-line { width: 28rpx; height: 6rpx; background: #FF2442; border-radius: 4rpx; position: absolute; bottom: -8rpx; }
.main-scroll { height: var(--tcy-vh, 100vh); background-color: var(--cr-surface-alt); position: relative; }

.nav-btn-right { display: none; }
.nav-right-spacer { width: 120rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; padding-right: 18rpx; box-sizing: border-box; }
.filter-btn-label,
.filter-btn-arrow,
.filter-menu-mask,
.filter-menu {
  display: none;
}

.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
  position: absolute;
  top: 0;
  right: 0;
  width: 590rpx;
  max-width: 82vw;
  height: 100%;
  background: var(--cr-surface);
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(28rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(28rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  box-shadow: -4rpx 0 24rpx rgba(0,0,0,0.08);
}
.sidebar-panel.show { transform: translateX(0); }
.sidebar-user { display: flex; align-items: center; padding: 60rpx 36rpx 34rpx; gap: 20rpx; }
.sidebar-avatar-wrapper { width: 88rpx; height: 88rpx; flex-shrink: 0; }
.sidebar-avatar { width: 100%; height: 100%; border-radius: 50%; background: #eee; display: block; }
.sidebar-uinfo { flex: 1; overflow: hidden; }
.sidebar-name { font-size: 32rpx; font-weight: 700; color: var(--cr-text); display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.sidebar-uid { font-size: 22rpx; color: var(--cr-text-muted); margin-top: 6rpx; display: block; line-height: 1.4; max-height: 64rpx; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.sidebar-divider { height: 1rpx; background: var(--cr-surface-alt); margin: 0 36rpx; flex-shrink: 0; }
.sidebar-section-title { font-size: 22rpx; color: var(--cr-text-muted); padding: 24rpx 36rpx 10rpx; font-weight: 700; }
.theme-choice-list { padding: 0 24rpx 18rpx; }
.theme-choice-item { display: flex; align-items: center; gap: 18rpx; padding: 18rpx 12rpx; border-radius: 16rpx; }
.theme-choice-item:active { background: var(--cr-surface-alt); }
.theme-choice-item.active { background: #fff5f7; }
.theme-choice-dot { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid #d8dce3; flex-shrink: 0; box-sizing: border-box; }
.theme-choice-item.active .theme-choice-dot { border: 8rpx solid #ff2442; }
.theme-choice-copy { flex: 1; min-width: 0; }
.theme-choice-title { display: block; font-size: 28rpx; color: var(--cr-text); font-weight: 700; }
.theme-choice-desc { display: block; margin-top: 4rpx; font-size: 22rpx; color: var(--cr-text-muted); line-height: 1.35; }
.filter-choice-list { padding: 0 24rpx 18rpx; }
.filter-choice-item { display: flex; align-items: center; gap: 18rpx; padding: 18rpx 12rpx; border-radius: 16rpx; }
.filter-choice-item:active { background: var(--cr-surface-alt); }
.filter-choice-item.active { background: #fff5f7; }
.filter-choice-dot { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid #d8dce3; flex-shrink: 0; box-sizing: border-box; }
.filter-choice-item.active .filter-choice-dot { border: 8rpx solid #ff2442; }
.filter-choice-copy { flex: 1; min-width: 0; }
.filter-choice-title { display: block; font-size: 28rpx; color: var(--cr-text); font-weight: 700; }
.filter-choice-desc { display: block; margin-top: 4rpx; font-size: 22rpx; color: var(--cr-text-muted); line-height: 1.35; }
.sidebar-menu { padding: 12rpx 0 12rpx; }
.sidebar-item { display: flex; align-items: center; padding: 24rpx 36rpx; gap: 20rpx; transition: background 0.15s; }
.sidebar-item:active { background: var(--cr-surface-alt); }
.sidebar-item-icon { width: 40rpx; height: 40rpx; flex-shrink: 0; }
.sidebar-item-text { flex: 1; font-size: 28rpx; color: var(--cr-text); font-weight: 500; }
.sidebar-arrow { font-size: 32rpx; color: var(--cr-border-strong); }

.sidebar-logout-area { padding: 24rpx 36rpx 12rpx; }
.sidebar-logout-btn {
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #ff4d6d 0%, #ff2442 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 28rpx rgba(255,36,66,.22);
  transition: opacity 0.15s;
}
.sidebar-logout-btn:active { opacity: .85; }
.sidebar-logout-text { color: #fff; font-size: 30rpx; font-weight: 700; letter-spacing: 2rpx; }

.notice-modal-mask, .version-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.notice-modal-box {
  width: 560rpx;
  background: var(--cr-surface);
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  animation: popUp 0.3s;
}
.notice-header { padding: 40rpx 0 20rpx; text-align: center; }
.notice-title { font-size: 34rpx; font-weight: bold; color: var(--cr-text); }
.notice-content-scroll { padding: 0 40rpx 40rpx; max-height: 500rpx; box-sizing: border-box; }
.notice-content-text { font-size: 30rpx; color: #555; line-height: 1.6; white-space: pre-wrap; }
.notice-footer { border-top: 1rpx solid var(--cr-border); }
.notice-btn { height: 90rpx; line-height: 90rpx; text-align: center; font-size: 32rpx; color: #ff2442; font-weight: 600; cursor: pointer; }

.version-box {
  width: 620rpx;
  background: var(--cr-surface);
  border-radius: 34rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 28rpx 90rpx rgba(17, 24, 39, 0.2);
  animation: popUp 0.3s;
}
.version-hero{
  position: relative;
  overflow: hidden;
  padding: 34rpx 36rpx 28rpx;
  background:
    radial-gradient(circle at top right, rgba(255,255,255,.26) 0, rgba(255,255,255,0) 38%),
    linear-gradient(145deg, #ff6b81 0%, #ff2442 62%, #d91d3f 100%);
}
.version-orb{
  position:absolute;
  border-radius:50%;
  background: rgba(255,255,255,.16);
}
.orb-a{ width: 160rpx; height: 160rpx; top: -48rpx; right: -36rpx; }
.orb-b{ width: 84rpx; height: 84rpx; bottom: 18rpx; right: 138rpx; }
.version-chip-row{
  position: relative;
  z-index: 1;
  display:flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.version-chip{
  height: 42rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,.2);
  color: #fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 22rpx;
  font-weight: 700;
  backdrop-filter: blur(6px);
}
.version-chip.ghost{
  background: rgba(255,255,255,.12);
}
.version-content {
  padding: 28rpx 32rpx 34rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.v-title {
  position: relative;
  z-index: 1;
  margin-top: 18rpx;
  font-size: 40rpx;
  font-weight: 900;
  color: #fff;
  line-height: 1.22;
}
.v-subtitle {
  position: relative;
  z-index: 1;
  margin-top: 12rpx;
  font-size: 25rpx;
  color: rgba(255,255,255,.84);
  line-height: 1.6;
}
.v-section{
  padding: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #fff8f9 0%, #fff 100%);
  border: 1rpx solid #ffe1e7;
}
.v-section-label{
  display:block;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color:#ff2442;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.v-scroll {
  max-height: 300rpx;
}
.v-desc {
  font-size: 28rpx;
  color: #4b5563;
  line-height: 1.76;
  white-space: pre-wrap;
}
.v-btn-group {
  display: flex;
  gap: 18rpx;
  margin-top: 24rpx;
}
.v-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
}
.v-btn.cancel {
  background: #f4f4f5;
  color: var(--cr-text-muted);
}
.v-btn.confirm {
  background: linear-gradient(135deg, #ff4d6d 0%, #ff2442 100%);
  color: #fff;
  box-shadow: 0 16rpx 36rpx rgba(255,36,66,.24);
}
.v-progress-box {
  margin-top: 24rpx;
  padding: 22rpx 24rpx 20rpx;
  border-radius: 22rpx;
  background: #fff7f8;
  border: 1rpx solid #ffd8df;
}
.v-progress-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom: 14rpx;
}
.v-progress-label{
  font-size: 24rpx;
  color: var(--cr-text);
  font-weight: 700;
}
.v-progress-bg {
  height: 14rpx;
  background: #ffe5ea;
  border-radius: 999rpx;
  overflow: hidden;
}
.v-progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #ff4d6d 0%, #ff2442 100%);
  transition: width 0.2s;
}
.v-progress-text {
  font-size: 24rpx;
  color: #ff2442;
  text-align: right;
  font-weight: 800;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { transform: translateY(-20rpx); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes popUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>







