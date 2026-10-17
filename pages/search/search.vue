<template>
  <view class="search-page" :class="themeClass">
    <view class="search-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search-bar">
        <view class="back-btn" @click="goBack">
          <view class="ic ic-back">
            <image class="ic-img" src="/static/icon/arrow-left-dark.svg" mode="aspectFit" />
          </view>
        </view>

        <view class="search-input-wrap">
          <view class="ic ic-search">
            <image class="ic-img" src="/static/icon/search-input.svg" mode="aspectFit" />
          </view>
          <input
            class="search-input"
            v-model="keyword"
            placeholder="搜索感兴趣的内容"
            placeholder-class="search-placeholder"
            confirm-type="search"
            :adjust-position="false"
            @confirm="onSearch"
            focus
          />
          <view class="clear-btn" v-if="keyword" @click="clearKeyword">
            <view class="ic ic-clear">
              <image class="ic-img" src="/static/icon/x-circle-lightgray.svg" mode="aspectFit" />
            </view>
          </view>
        </view>

        <view class="search-action" @click="onSearch">
          <text class="search-action-text">搜索</text>
        </view>
      </view>

      <!-- 结果分类 Tab -->
      <view class="filter-tabs" v-if="hasSearched">
        <view class="tab-item" :class="{ active: currentTab === 0 }" @click="switchTab(0)">
          <text>帖子</text>
        </view>
        <view class="tab-item" :class="{ active: currentTab === 1 }" @click="switchTab(1)">
          <text>用户</text>
        </view>
        <view class="tab-item" :class="{ active: currentTab === 2 }" @click="switchTab(2)">
          <text>商品</text>
        </view>
      </view>
    </view>

    <view class="result-container" :style="{ paddingTop: resultPaddingTop + 'px' }">
      <template v-if="!hasSearched">
        <view class="discovery-wrap" v-if="!isDiscoveryLoading">
          <scroll-view scroll-y class="discovery-scroll" :show-scrollbar="false">

            <!-- 搜索历史 -->
            <view class="disc-section" v-if="historyList.length > 0">
              <view class="disc-section-header">
                <view class="disc-title-wrap">
                  <view class="ic ic-clock disc-title-ic">
                    <image class="ic-img" src="/static/icon/clock-dark.svg" mode="aspectFit" />
                  </view>
                  <text class="disc-section-title">搜索历史</text>
                </view>
                <view class="icon-clear-btn" @click="clearHistory">
                  <view class="ic ic-trash">
                    <image class="ic-img" src="/static/icon/trash-gray.svg" mode="aspectFit" />
                  </view>
                </view>
              </view>
              <view class="history-tags">
                <view
                  class="history-tag"
                  v-for="(item, idx) in historyList"
                  :key="'his-' + idx"
                  @click="clickHistory(item)"
                >
                  <text class="history-tag-text">{{ item }}</text>
                </view>
              </view>
            </view>

            <!-- 热门圈子 -->
            <view class="disc-section" v-if="hotCircles.length > 0">
              <view class="disc-section-header">
                <view class="disc-title-wrap">
                  <view class="ic ic-users disc-title-ic">
                    <image class="ic-img" src="/static/icon/users-dark.svg" mode="aspectFit" />
                  </view>
                  <text class="disc-section-title">热门圈子</text>
                </view>
              </view>
              <scroll-view scroll-x class="circle-scroll" :show-scrollbar="false">
                <view class="circle-row">
                  <view
                    class="circle-card"
                    v-for="(item, index) in hotCircles"
                    :key="'circle-' + item.id"
                    @click="goCircle(item.id)"
                  >
                    <image
                      :src="item.image || '/static/default_circle.png'"
                      mode="aspectFill"
                      class="circle-img"
                      lazy-load
                    ></image>
                    <text class="circle-name">{{ item.name }}</text>
                    <text class="circle-meta">{{ formatCount(item.user_count) }} 成员</text>
                  </view>
                </view>
              </scroll-view>
            </view>

            <!-- 榜单 Tab 切换 -->
            <view class="disc-tabs-wrap">
              <view class="disc-tabs">
                <view
                  class="disc-tab"
                  :class="{ active: discoveryTab === 1 }"
                  @click="discoveryTab = 1"
                >
                  <view class="disc-tab-ic">
                    <image class="disc-tab-img" :src="discoveryTab === 1 ? '/static/icon/flame-red.svg' : '/static/icon/flame-gray.svg'" mode="aspectFit" />
                  </view>
                  <text>热门帖子</text>
                </view>
                <view
                  class="disc-tab"
                  :class="{ active: discoveryTab === 2 }"
                  @click="discoveryTab = 2"
                >
                  <view class="disc-tab-ic">
                    <image class="disc-tab-img" :src="discoveryTab === 2 ? '/static/icon/shuffle-red.svg' : '/static/icon/shuffle-gray.svg'" mode="aspectFit" />
                  </view>
                  <text>随机帖子</text>
                </view>
                <view
                  class="disc-tab"
                  :class="{ active: discoveryTab === 3 }"
                  @click="discoveryTab = 3"
                >
                  <view class="disc-tab-ic">
                    <image class="disc-tab-img" :src="discoveryTab === 3 ? '/static/icon/trending-up-red.svg' : '/static/icon/trending-up-gray.svg'" mode="aspectFit" />
                  </view>
                  <text>热门动态</text>
                </view>
                <view
                  class="disc-tab"
                  :class="{ active: discoveryTab === 4 }"
                  @click="discoveryTab = 4"
                >
                  <view class="disc-tab-ic">
                    <image class="disc-tab-img" :src="discoveryTab === 4 ? '/static/icon/tag-red.svg' : '/static/icon/tag-gray.svg'" mode="aspectFit" />
                  </view>
                  <text>随机话题</text>
                </view>
              </view>
              <view class="disc-tabs-line"></view>
            </view>

            <!-- Tab 内容区 -->
            <view class="disc-tab-content">
              <!-- 热门帖子 -->
              <view v-if="discoveryTab === 1" class="tab-pane">
                <view class="pane-empty" v-if="hotPostsList.length === 0">
                  <text class="pane-empty-text">暂无热门帖子</text>
                </view>
                <view class="hot-rank-list" v-else>
                  <view
                    class="hot-rank-item"
                    v-for="(item, index) in hotPostsList"
                    :key="'hp-' + item.id"
                    @click="goPostDetail(item.id)"
                  >
                    <text class="rank-num" :class="'rank-' + (index + 1)">{{ index + 1 }}</text>
                    <view class="rank-main rank-main-with-cover">
                      <text class="rank-title rank-title-2line">{{ item.title || item.plain_text }}</text>
                      <view class="rank-meta">
                        <image :src="item.avatar || defaultAvatar" class="rank-avatar" mode="aspectFill" lazy-load></image>
                        <text class="rank-author">{{ item.name || item.username }}</text>
                        <view class="ic ic-eye rank-eye">
                          <image class="ic-img" src="/static/icon/eye-lightgray.svg" mode="aspectFit" />
                        </view>
                        <text class="rank-views">{{ formatCount(item.view_count) }}</text>
                      </view>
                    </view>
                    <image
                      :src="item.cover_img"
                      mode="aspectFill"
                      class="rank-cover"
                      lazy-load
                    ></image>
                  </view>
                </view>
              </view>

              <!-- 随机帖子 -->
              <view v-if="discoveryTab === 2" class="tab-pane">
                <view class="pane-header">
                  <text class="pane-hint">为你推荐</text>
                  <view class="refresh-btn" @click="refreshRandom">
                    <view class="ic ic-refresh">
                      <image class="ic-img" src="/static/icon/refresh-gray.svg" mode="aspectFit" />
                    </view>
                    <text class="refresh-text">换一批</text>
                  </view>
                </view>
                <view class="pane-empty" v-if="randomPosts.length === 0">
                  <text class="pane-empty-text">暂无推荐</text>
                </view>
                <view class="rec-list" v-else>
                  <view
                    class="rec-item"
                    v-for="(item, index) in randomPosts"
                    :key="'rp-' + item.id + '-' + index"
                    @click="goPostDetail(item.id)"
                  >
                    <view class="rec-main">
                      <text class="rec-title">{{ item.title || item.plain_text }}</text>
                      <view class="rec-meta">
                        <image :src="item.avatar || defaultAvatar" class="rec-avatar" mode="aspectFill" lazy-load></image>
                        <text class="rec-author">{{ item.name || item.username }}</text>
                        <view class="ic ic-eye rec-eye">
                          <image class="ic-img" src="/static/icon/eye-lightgray.svg" mode="aspectFit" />
                        </view>
                        <text class="rec-views">{{ formatCount(item.view_count) }}</text>
                      </view>
                    </view>
                    <image
                      v-if="item.cover_img"
                      :src="item.cover_img"
                      mode="aspectFill"
                      class="rec-cover"
                      lazy-load
                    ></image>
                  </view>
                </view>
              </view>

              <!-- 热门动态 -->
              <view v-if="discoveryTab === 3" class="tab-pane">
                <view class="pane-empty" v-if="hotDynamics.length === 0">
                  <text class="pane-empty-text">暂无热门动态</text>
                </view>
                <view class="hot-rank-list" v-else>
                  <view
                    class="hot-rank-item"
                    v-for="(item, index) in hotDynamics"
                    :key="'hd-' + item.id"
                    @click="goDynamicDetail(item.id)"
                  >
                    <text class="rank-num" :class="'rank-' + (index + 1)">{{ index + 1 }}</text>
                    <view class="rank-main rank-main-with-cover">
                      <text class="rank-title rank-title-2line">{{ item.plain_text }}</text>
                      <view class="rank-meta">
                        <image :src="item.avatar || defaultAvatar" class="rank-avatar" mode="aspectFill" lazy-load></image>
                        <text class="rank-author">{{ item.name || item.username }}</text>
                        <view class="ic ic-eye rank-eye">
                          <image class="ic-img" src="/static/icon/eye-lightgray.svg" mode="aspectFit" />
                        </view>
                        <text class="rank-views">{{ formatCount(item.view_count) }}</text>
                      </view>
                    </view>
                    <image
                      :src="item.cover_img"
                      mode="aspectFill"
                      class="rank-cover"
                      lazy-load
                    ></image>
                  </view>
                </view>
              </view>

              <!-- 随机话题 -->
              <view v-if="discoveryTab === 4" class="tab-pane">
                <view class="pane-header">
                  <text class="pane-hint">话题推荐</text>
                  <view class="refresh-btn" @click="refreshRandom">
                    <view class="ic ic-refresh">
                      <image class="ic-img" src="/static/icon/refresh-gray.svg" mode="aspectFit" />
                    </view>
                    <text class="refresh-text">换一批</text>
                  </view>
                </view>
                <view class="pane-empty" v-if="randomTopics.length === 0">
                  <text class="pane-empty-text">暂无话题</text>
                </view>
                <scroll-view scroll-x class="topic-scroll" :show-scrollbar="false" v-else>
                  <view class="topic-row">
                    <view
                      class="topic-card"
                      :class="{ 'has-cover': item.cover_img }"
                      v-for="(item, index) in randomTopics"
                      :key="'rt-' + item.id + '-' + index"
                      @click="goTopic(item.name)"
                    >
                      <image
                        v-if="item.cover_img"
                        :src="item.cover_img"
                        mode="aspectFill"
                        class="topic-cover"
                        lazy-load
                      ></image>
                      <view class="topic-card-mask" v-if="item.cover_img"></view>
                      <view class="topic-card-body">
                        <text class="topic-hash">#</text>
                        <text class="topic-name">{{ item.name }}</text>
                        <text class="topic-count">{{ formatCount(item.post_count) }} 帖</text>
                      </view>
                    </view>
                  </view>
                </scroll-view>
              </view>
            </view>

            <view style="height: 80rpx;"></view>
          </scroll-view>
        </view>
        <view class="skeleton-wrap" v-else>
          <view class="sk-section" v-for="i in 3" :key="'ss-'+i">
            <view class="sk-line sk-title"></view>
            <view class="sk-row" v-for="j in 3" :key="'sk-'+i+'-'+j">
              <view class="sk-circle"></view>
              <view class="sk-lines">
                <view class="sk-line sk-line-long"></view>
                <view class="sk-line sk-line-short"></view>
              </view>
            </view>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="loading-wrap" v-if="loading && currentList.length === 0">
          <view class="spinner"></view>
        </view>

        <scroll-view v-else scroll-y class="result-scroll" :show-scrollbar="false">
          <view v-if="currentTab === 0">
            <view
              class="post-item"
              v-for="item in postList"
              :key="'post-' + item.id"
              @click="goPostDetail(item.id)"
            >
              <view class="post-body">
                <view class="post-title-row">
                  <text
                    v-for="(segment, index) in highlight(item.title || item.plain_content)"
                    :key="'post-title-' + index"
                    :class="{ 'search-highlight': segment.highlighted }"
                  >{{ segment.text }}</text>
                </view>
                <text class="post-desc" v-if="item.desc">{{ item.desc }}</text>
                <view class="post-meta">
                  <image
                    :src="item.avatar || defaultAvatar"
                    class="meta-avatar"
                    mode="aspectFill"
                    lazy-load
                  ></image>
                  <text class="meta-name">{{ item.name || item.username }}</text>
                  <text class="meta-dot">·</text>
                  <text class="meta-time">{{ formatTime(item.create_time) }}</text>
                </view>
              </view>
              <image
                v-if="item.cover_img"
                :src="item.cover_img"
                mode="aspectFill"
                class="post-thumb"
                lazy-load
              ></image>
            </view>

            <view class="empty-state" v-if="postList.length === 0 && !loading">
              <view class="ic ic-empty empty-ic">
                <image class="ic-img" src="/static/icon/search-empty.svg" mode="aspectFit" />
              </view>
              <text class="empty-title">暂无相关帖子</text>
              <text class="empty-desc">换个关键词试试</text>
            </view>
          </view>

          <view v-if="currentTab === 1">
            <view
              class="user-item"
              v-for="u in userList"
              :key="'user-' + u.id"
              @click="goUserProfile(u.id)"
            >
              <view class="user-avatar-wrap">
                <image :src="u.avatar || defaultAvatar" class="user-avatar" mode="aspectFill" lazy-load></image>
                <image v-if="u.current_frame_img" :src="u.current_frame_img" class="user-frame" mode="scaleToFill"></image>
              </view>
              <view class="user-info">
                <view class="user-name-row">
                  <text class="user-name">
                    <text
                      v-for="(segment, index) in highlight(u.name || u.username)"
                      :key="'user-name-' + index"
                      :class="{ 'search-highlight': segment.highlighted }"
                    >{{ segment.text }}</text>
                  </text>
                  <view class="user-tag" v-if="u.user_title"><text class="user-tag-text">{{ u.user_title }}</text></view>
                </view>
                <text class="user-fans">粉丝 {{ formatCount(u.fans_count) }}</text>
                <text class="user-bio" v-if="u.personal_signature || u.bio">{{ u.personal_signature || u.bio }}</text>
              </view>
              <view class="follow-btn">
                <text class="follow-btn-text">主页</text>
              </view>
            </view>

            <view class="empty-state" v-if="userList.length === 0 && !loading">
              <view class="ic ic-empty empty-ic">
                <image class="ic-img" src="/static/icon/users-lightgray.svg" mode="aspectFit" />
              </view>
              <text class="empty-title">未找到相关用户</text>
              <text class="empty-desc">试试昵称或 ID</text>
            </view>
          </view>

          <view v-if="currentTab === 2">
            <view
              class="goods-item"
              v-for="item in goodsList"
              :key="'goods-' + item.id"
              @click="goGoodsDetail(item.id)"
            >
              <image :src="item.image || '/static/logo.png'" class="goods-thumb" mode="aspectFill" lazy-load></image>
              <view class="goods-info">
                <text class="goods-title">
                  <text
                    v-for="(segment, index) in highlight(item.title)"
                    :key="'goods-title-' + index"
                    :class="{ 'search-highlight': segment.highlighted }"
                  >{{ segment.text }}</text>
                </text>
                <view class="goods-meta">
                  <text class="goods-price">¥{{ item.price }}</text>
                  <view class="goods-type-tag" :class="item.product_type == 1 ? 'physical' : 'virtual'">
                    <text>{{ item.product_type == 1 ? '实体' : '虚拟' }}</text>
                  </view>
                </view>
                <view class="goods-seller">
                  <image :src="item.avatar || '/static/logo.png'" class="goods-seller-avatar" mode="aspectFill"></image>
                  <text class="goods-seller-name">{{ item.seller_name }}</text>
                </view>
              </view>
            </view>

            <view class="empty-state" v-if="goodsList.length === 0 && !loading">
              <view class="ic ic-empty empty-ic">
                <image class="ic-img" src="/static/icon/shopping-bag-lightgray.svg" mode="aspectFit" />
              </view>
              <text class="empty-title">暂无相关商品</text>
              <text class="empty-desc">换个关键词试试</text>
            </view>
          </view>

          <view style="height: 60rpx;"></view>
        </scroll-view>
      </template>

    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import { splitHighlightedText } from '../../common/textHighlight.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      keyword: '',
      hasSearched: false,
      currentTab: 0,

      historyList: [],
      hotCircles: [],
      hotTopics: [],
      randomTopics: [],
      hotPostsList: [],
      randomPosts: [],

      postList: [],
      userList: [],
      goodsList: [],

      loading: false,
      isDiscoveryLoading: true,
      defaultAvatar: '/static/default.png',

      searchReqId: 0,
      discoveryLoaded: false,

      // 发现页 Tab：1=热门帖子 2=随机帖子 3=热门动态 4=随机话题
      discoveryTab: 1,
      // 热门动态/随机话题
      hotDynamics: []
    }
  },

  computed: {
    resultPaddingTop() {
      // 88rpx 搜索栏 + 88rpx 分类Tab(仅搜索时)，rpx 转 px
      const searchBarH = uni.upx2px(88)
      const tabsH = this.hasSearched ? uni.upx2px(88) : 0
      return this.statusBarHeight + searchBarH + tabsH
    },
    currentList() {
      if (this.currentTab === 0) return this.postList
      if (this.currentTab === 1) return this.userList
      return this.goodsList
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.restoreHistory()
    this.loadDiscoveryData()
  },

  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },

    restoreHistory() {
      const raw = uni.getStorageSync('search_history')
      if (!raw) { this.historyList = []; return }
      try {
        const parsed = JSON.parse(raw)
        this.historyList = Array.isArray(parsed) ? parsed : []
      } catch (e) {
        this.historyList = []
      }
    },

    saveHistory(kw) {
      kw = String(kw || '').trim()
      if (!kw) return
      const idx = this.historyList.indexOf(kw)
      if (idx > -1) this.historyList.splice(idx, 1)
      this.historyList.unshift(kw)
      if (this.historyList.length > 10) this.historyList = this.historyList.slice(0, 10)
      uni.setStorageSync('search_history', JSON.stringify(this.historyList))
    },

    clearKeyword() { this.keyword = '' },

    formatTime(t) {
      if (!t) return ''
      t = String(t)
      return t.length >= 10 ? t.substring(5, 10) : t
    },

    formatCount(num) {
      num = Number(num) || 0
      if (num >= 10000) {
        const r = (num / 10000).toFixed(1)
        return r.endsWith('.0') ? `${parseInt(r)}w` : `${r}w`
      }
      return String(num)
    },

    clickHistory(kw) { this.keyword = kw; this.onSearch() },

    clearHistory() {
      uni.showModal({
        title: '提示',
        content: '确定清空历史记录？',
        confirmColor: '#ff2442',
        success: (res) => {
          if (res.confirm) {
            this.historyList = []
            uni.removeStorageSync('search_history')
          }
        }
      })
    },

    switchTab(idx) {
      if (this.currentTab === idx) return
      this.currentTab = idx
      if (idx === 0 && this.postList.length === 0) this.doSearch()
      if (idx === 1 && this.userList.length === 0) this.doSearch()
      if (idx === 2 && this.goodsList.length === 0) this.doSearch()
    },

    async loadDiscoveryData() {
      if (this.discoveryLoaded) { this.isDiscoveryLoading = false; return }
      this.isDiscoveryLoading = true
      try {
        // 帖子数据(post.php) 用于热门帖子、随机帖子
        // 动态数据(dynamic.php) 用于热门话题、随机话题（话题聚合自动态内容）
        const [cRes, postRes, dynRes] = await Promise.all([
          request('circle.php', { action: 'list', limit: 10 }),
          request('post.php', { action: 'list', page: 1, pageSize: 50, sort: 'hot' }),
          request('dynamic.php', { action: 'list', page: 1, pageSize: 50 })
        ])

        // 热门圈子
        if (cRes.code === 0) {
          const circles = (cRes.data || []).map(item => ({ ...item, user_count: Number(item.user_count || 0) }))
          circles.sort((a, b) => b.user_count - a.user_count)
          this.hotCircles = circles.slice(0, 8)
        }

        // 帖子数据规范化
        // post.php?action=list 返回 { list: [...], pages, total, site_notice }
        let posts = []
        if (postRes.code === 0) {
          if (Array.isArray(postRes.data)) {
            posts = postRes.data
          } else if (postRes.data && Array.isArray(postRes.data.list)) {
            posts = postRes.data.list
          }
        }
        const normalizedPosts = posts.map(item => this.normalizePost(item))
        this._cachedPosts = normalizedPosts

        // 仅保留带图帖子，热门按 view_count 排序
        if (normalizedPosts.length > 0) {
          const withImg = normalizedPosts.filter(p => p.cover_img)
          this.hotPostsList = withImg
            .slice()
            .sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0))
            .slice(0, 5)
          // 随机帖子：从带图中洗牌
          this.randomPosts = this.shuffle(withImg).slice(0, 5)
        }

        // 动态数据：用于热门动态 + 随机话题（话题聚合自动态内容）
        const dynamics = (dynRes.code === 0 && Array.isArray(dynRes.data)) ? dynRes.data : []
        const normalizedDynamics = dynamics.map(item => this.normalizeDynamic(item))
        this._cachedDynamics = normalizedDynamics

        // 热门动态：仅带图，按 view_count 排序取前 5
        const dynWithImg = normalizedDynamics.filter(d => d.cover_img)
        this.hotDynamics = dynWithImg
          .slice()
          .sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0))
          .slice(0, 5)

        // 随机话题：从动态中聚合
        const { hot, random } = this.extractTopicsFromDynamics(normalizedDynamics)
        this.hotTopics = hot
        this.randomTopics = random

        this.discoveryLoaded = true
      } catch (e) {} finally {
        this.isDiscoveryLoading = false
      }
    },

    // 规范化帖子数据(post表)，提取首图、纯文本、view_count 等
    normalizePost(item) {
      let cover = ''
      const imgs = item.images
      if (imgs) {
        if (typeof imgs === 'string' && imgs.startsWith('[')) {
          try { const a = JSON.parse(imgs); cover = Array.isArray(a) ? (a[0] || '') : '' } catch (e) {}
        } else if (typeof imgs === 'string') {
          cover = imgs.split(',')[0] || ''
        } else if (Array.isArray(imgs)) {
          cover = imgs[0] || ''
        }
      }
      let text = item.content || ''
      if (typeof text !== 'string') text = String(text)
      text = text.replace(/<[^>]+>/g, '')

      return {
        ...item,
        cover_img: cover,
        plain_text: text,
        view_count: Number(item.view_count || 0),
        like_count: Number(item.like_count || 0),
        comment_count: Number(item.comment_count || 0)
      }
    },

    // 规范化动态数据(用于话题聚合)
    normalizeDynamic(item) {
      // 提取动态首图（用于话题是否带图判断 + 话题卡片展示）
      let cover = ''
      const imgs = item.images
      if (imgs) {
        if (typeof imgs === 'string' && imgs.startsWith('[')) {
          try { const a = JSON.parse(imgs); cover = Array.isArray(a) ? (a[0] || '') : '' } catch (e) {}
        } else if (typeof imgs === 'string') {
          cover = imgs.split(',')[0] || ''
        } else if (Array.isArray(imgs)) {
          cover = imgs[0] || ''
        }
      }

      let text = item.content || ''
      if (typeof text !== 'string') text = String(text)
      text = text.replace(/<[^>]+>/g, '')

      let topicArr = []
      if (item.topics) {
        if (typeof item.topics === 'string') {
          try {
            const p = JSON.parse(item.topics)
            if (Array.isArray(p)) topicArr = p
          } catch (e) {}
        } else if (Array.isArray(item.topics)) {
          topicArr = item.topics
        }
      }

      return {
        ...item,
        cover_img: cover,
        plain_text: text,
        topics_arr: topicArr,
        view_count: Number(item.view_count || 0)
      }
    },

    extractTopicsFromDynamics(dynamics) {
      if (!Array.isArray(dynamics) || dynamics.length === 0) {
        return { hot: [], random: [] }
      }
      const topicMap = new Map()
      const topicRegex = /#([^\s#]{1,12})/g

      for (const item of dynamics) {
        const text = item.plain_text || ''
        const names = new Set()

        if (text) {
          const matches = text.match(topicRegex)
          if (matches) {
            for (const m of matches) {
              const n = m.substring(1).trim()
              if (n) names.add(n)
            }
          }
        }

        if (Array.isArray(item.topics_arr)) {
          for (const t of item.topics_arr) {
            const n = (typeof t === 'string') ? t : (t && t.name)
            if (n) names.add(String(n).trim())
          }
        }

        const v = Number(item.view_count || 0)
        const cover = item.cover_img || ''
        for (const name of names) {
          if (topicMap.has(name)) {
            const entry = topicMap.get(name)
            entry.count += 1
            entry.viewTotal += v
            // 记录话题首图（取第一张有图的）
            if (cover && !entry.cover) entry.cover = cover
          } else {
            topicMap.set(name, { name, count: 1, viewTotal: v, cover })
          }
        }
      }

      const all = Array.from(topicMap.values())
      // 仅保留带图话题
      const withCover = all.filter(t => t.cover)
      // 热门话题：按 count、viewTotal 排序
      const hot = withCover
        .slice()
        .sort((a, b) => b.count - a.count || b.viewTotal - a.viewTotal)
        .slice(0, 8)
        .map(t => ({ id: 0, name: t.name, post_count: t.count, view_total: t.viewTotal, cover_img: t.cover || '' }))

      // 随机话题：从带图中洗牌
      const random = this.shuffle(withCover).slice(0, 8)
        .map(t => ({ id: 0, name: t.name, post_count: t.count, view_total: t.viewTotal, cover_img: t.cover || '' }))

      return { hot, random }
    },

    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },

    refreshRandom() {
      let changed = false
      // 刷新随机帖子（仅带图）
      if (this._cachedPosts && this._cachedPosts.length > 0) {
        const withImg = this._cachedPosts.filter(p => p.cover_img)
        this.randomPosts = this.shuffle(withImg).slice(0, 5)
        changed = true
      }
      // 刷新随机话题
      if (this._cachedDynamics && this._cachedDynamics.length > 0) {
        const { random } = this.extractTopicsFromDynamics(this._cachedDynamics)
        this.randomTopics = random
        changed = true
      }
      if (changed) {
        uni.showToast({ title: '已换一批', icon: 'none', duration: 800 })
      }
    },

    onSearch() {
      const kw = String(this.keyword || '').trim()
      if (!kw) { uni.showToast({ title: '请输入内容', icon: 'none' }); return }
      this.keyword = kw
      this.saveHistory(kw)
      this.hasSearched = true
      this.doSearch()
    },

    async doSearch() {
      const kw = String(this.keyword || '').trim()
      if (!kw) return
      const reqId = ++this.searchReqId
      this.loading = true
      try {
        if (this.currentTab === 0) {
          this.postList = []
          const res = await request('post.php', { action: 'search', q: kw })
          if (reqId !== this.searchReqId) return
          if (res.code === 0) {
            // 兼容两种返回结构：直接数组 / { list: [] } 包装
            let arr = []
            if (Array.isArray(res.data)) arr = res.data
            else if (res.data && Array.isArray(res.data.list)) arr = res.data.list
            this.postList = arr.map(item => {
              const plain = item.content ? String(item.content).replace(/<[^>]+>/g, '') : ''
              item.desc = plain.substring(0, 40).replace(/\n/g, ' ')
              let cover = ''
              if (item.images) {
                if (typeof item.images === 'string' && item.images.startsWith('[')) {
                  try { const a = JSON.parse(item.images); cover = Array.isArray(a) ? (a[0] || '') : '' } catch (e) {}
                } else if (typeof item.images === 'string') {
                  cover = item.images.split(',')[0] || ''
                } else if (Array.isArray(item.images)) {
                  cover = item.images[0] || ''
                }
              }
              return { ...item, cover_img: cover }
            })
          } else {
            this.postList = []
          }
        } else if (this.currentTab === 1) {
          this.userList = []
          const res = await request('user.php', { action: 'searchUser', keyword: kw })
          if (reqId !== this.searchReqId) return
          if (res.code === 0) {
            let arr = []
            if (Array.isArray(res.data)) arr = res.data
            else if (res.data && Array.isArray(res.data.list)) arr = res.data.list
            this.userList = arr.map(u => ({
              ...u, fans_count: Number(u.fans_count || 0), vip: Number(u.vip || 0)
            }))
          } else {
            this.userList = []
          }
        } else {
          this.goodsList = []
          const res = await request('market.php', { action: 'get_list', q: kw })
          if (reqId !== this.searchReqId) return
          if (res.code === 0) {
            let arr = []
            if (Array.isArray(res.data)) arr = res.data
            else if (res.data && Array.isArray(res.data.list)) arr = res.data.list
            this.goodsList = arr.map(item => {
              const img = item.image || item.cover || (Array.isArray(item.images) ? item.images[0] : '') || ''
              return {
                ...item,
                image: img,
                cover_img: img,
                product_type: item.product_type !== undefined ? Number(item.product_type) : (item.type === 'entity' ? 1 : 0)
              }
            })
          } else {
            this.goodsList = []
          }
        }
      } catch (e) {
        if (reqId !== this.searchReqId) return
        uni.showToast({ title: '搜索失败', icon: 'none' })
      } finally {
        if (reqId === this.searchReqId) this.loading = false
      }
    },

    highlight(str) {
      return splitHighlightedText(str, this.keyword)
    },

    goPostDetail(id) { uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${id}` }) },
    goDynamicDetail(id) { uni.navigateTo({ url: `/pages/dynamic/detail?id=${id}` }) },
    goUserProfile(id) { uni.navigateTo({ url: `/pages/user/profile?userId=${id}` }) },
    goGoodsDetail(id) { uni.navigateTo({ url: `/pages/market/detail?id=${id}` }) },
    goCircle(id) { uni.navigateTo({ url: `/pages/circle/detail?id=${id}` }) },
    goTopic(name) { uni.navigateTo({ url: `/pages/dynamic/topic-result?name=${encodeURIComponent(name)}` }) }
  }
}
</script>

<style scoped>
/* ── 页面基础 ── */
.search-page { height: 100vh; background: var(--cr-surface); display: flex; flex-direction: column; }

/* ── 图标通用 ── */
.ic { display: flex; align-items: center; justify-content: center; }
.ic .ic-img { width: 100%; height: 100%; }

/* ── 顶部栏（抖音风格）── */
.search-header {
  position: fixed; top: 0; left: 0; width: 100%;
  background: var(--cr-surface); z-index: 100;
}
.search-bar {
  display: flex; align-items: center;
  padding: 12rpx 24rpx; height: 88rpx; box-sizing: border-box;
  gap: 16rpx;
}

/* 返回按钮 */
.back-btn {
  width: 56rpx; height: 56rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.ic-back { width: 40rpx; height: 40rpx; color: #111; }
.back-btn:active .ic-back { color: #ff2442; }

/* 搜索输入框（灰色胶囊，抖音风格） */
.search-input-wrap {
  flex: 1; height: 68rpx;
  border-radius: 34rpx;
  display: flex; align-items: center;
  padding: 0 20rpx; box-sizing: border-box;
  background: #f4f4f6;
}
.ic-search { width: 32rpx; height: 32rpx; color: var(--cr-text-muted); margin-right: 12rpx; flex-shrink: 0; }
.search-input { flex: 1; height: 68rpx; font-size: 28rpx; color: #111; }
.search-placeholder { color: #b1b3ba; font-size: 28rpx; }

/* 清空按钮 */
.clear-btn {
  width: 36rpx; height: 36rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  margin-left: 8rpx;
}
.ic-clear { width: 32rpx; height: 32rpx; color: #c0c2c8; }

/* 搜索按钮 */
.search-action { flex-shrink: 0; padding: 8rpx 8rpx; }
.search-action-text { font-size: 28rpx; color: #ff2442; font-weight: 600; }
.search-action:active .search-action-text { opacity: 0.7; }

/* 分类 Tab */
.filter-tabs {
  display: flex; align-items: center;
  height: 88rpx; padding: 0 24rpx; box-sizing: border-box;
  gap: 56rpx;
}
.tab-item {
  position: relative;
  height: 88rpx; display: flex; align-items: center;
}
.tab-item text { font-size: 28rpx; color: var(--cr-text-muted); font-weight: 500; }
.tab-item.active text { color: #111; font-size: 32rpx; font-weight: 700; }
.tab-item.active::after {
  content: ''; position: absolute;
  left: 50%; bottom: 16rpx; transform: translateX(-50%);
  width: 40rpx; height: 6rpx; border-radius: 3rpx; background: #ff2442;
}

/* ── 内容容器 ── */
.result-container { flex: 1; overflow: hidden; }
.discovery-scroll, .result-scroll { height: 100%; }

/* ── 发现页 ── */
.discovery-wrap { height: 100%; }

.disc-section {
  padding: 24rpx 32rpx 20rpx;
}
.disc-section + .disc-section { border-top: 1rpx solid #f5f5f7; }
.disc-section-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx;
}
.disc-title-wrap { display: flex; align-items: center; gap: 12rpx; }
.disc-title-ic {
  width: 36rpx; height: 36rpx;
  color: #111;
}
.flame-ic { color: #ff2442; }
.disc-section-title { font-size: 32rpx; font-weight: 700; color: #111; letter-spacing: 0.5rpx; }
.disc-section-sub { font-size: 22rpx; color: #ff2442; }

/* HOT 角标 */
.hot-badge {
  height: 28rpx; padding: 0 8rpx;
  border-radius: 6rpx;
  background: linear-gradient(135deg, #ff2442 0%, #ff6b6b 100%);
  font-size: 18rpx; font-weight: 700; color: #fff;
  display: flex; align-items: center; justify-content: center;
  margin-left: 4rpx;
}

/* ── 发现页 Tab 切换 ── */
.disc-tabs-wrap {
  padding: 0 16rpx;
  margin-top: 8rpx;
}
.disc-tabs {
  display: flex; align-items: stretch;
  height: 88rpx;
  width: 100%;
}
.disc-tab {
  position: relative;
  flex: 1; min-width: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 6rpx;
  padding: 0 4rpx;
  box-sizing: border-box;
}
.disc-tab-ic {
  width: 30rpx; height: 30rpx;
  display: flex; align-items: center; justify-content: center;
  color: #b1b3ba;
  transition: color 0.2s;
  flex-shrink: 0;
}
.disc-tab-ic .disc-tab-img { width: 100%; height: 100%; }
.disc-tab text {
  font-size: 26rpx; color: var(--cr-text-muted); font-weight: 500;
  white-space: nowrap;
  transition: color 0.2s, font-size 0.2s;
  overflow: hidden; text-overflow: ellipsis;
}

/* 选中态：图标和文字同时变色 */
.disc-tab.active .disc-tab-ic { color: #ff2442; }
.disc-tab.active text { color: #111; font-size: 28rpx; font-weight: 700; }
.disc-tab.active::after {
  content: ''; position: absolute;
  left: 50%; bottom: 12rpx; transform: translateX(-50%);
  width: 36rpx; height: 5rpx; border-radius: 3rpx; background: #ff2442;
}
.disc-tabs-line {
  height: 1rpx; background: var(--cr-surface-alt);
  margin: 0 -16rpx;
}
.disc-tab-content {
  padding: 20rpx 32rpx 0;
  min-height: 400rpx;
}
.tab-pane { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4rpx); } to { opacity: 1; transform: translateY(0); } }

/* Tab 内空状态/标题 */
.pane-empty {
  padding: 100rpx 0; text-align: center;
}
.pane-empty-text { font-size: 26rpx; color: #b1b3ba; }
.pane-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20rpx;
}
.pane-hint { font-size: 24rpx; color: var(--cr-text-muted); }

/* 清空按钮（垃圾桶图标） */
.icon-clear-btn {
  width: 44rpx; height: 44rpx;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.icon-clear-btn:active { background: var(--cr-surface-alt); }
.ic-trash { width: 32rpx; height: 32rpx; color: var(--cr-text-muted); }

/* 换一批按钮 */
.refresh-btn {
  display: flex; align-items: center; gap: 6rpx;
  padding: 8rpx 16rpx; border-radius: 24rpx;
  background: #f4f4f6;
}
.refresh-btn:active { background: #ebebed; }
.ic-refresh { width: 26rpx; height: 26rpx; color: var(--cr-text-muted); }
.refresh-text { font-size: 22rpx; color: var(--cr-text-muted); font-weight: 500; }

/* 历史标签 */
.history-tags { display: flex; flex-wrap: wrap; gap: 16rpx; }
.history-tag {
  height: 56rpx; padding: 0 24rpx;
  border-radius: 28rpx;
  background: #f4f4f6;
  display: flex; align-items: center; justify-content: center;
}
.history-tag:active { background: #ebebed; }
.history-tag-text { font-size: 26rpx; color: var(--cr-text); }

/* ── 热门榜单（抖音风格前三名彩色排名）── */
.hot-rank-list { display: flex; flex-direction: column; }
.hot-rank-item {
  display: flex; align-items: center;
  padding: 20rpx 0;
}
.hot-rank-item + .hot-rank-item { border-top: 1rpx solid #f5f5f7; }
.hot-rank-item:active { background: var(--cr-canvas); }
.rank-num {
  width: 56rpx; flex-shrink: 0;
  font-size: 34rpx; font-weight: 800; font-style: italic;
  color: #c0c2c8; text-align: center;
  font-family: "DIN Alternate", "Inter", sans-serif;
}
.rank-1 { color: #ff2442; font-size: 40rpx; }
.rank-2 { color: #ff7a00; font-size: 38rpx; }
.rank-3 { color: #f59e0b; font-size: 36rpx; }
.rank-main { flex: 1; min-width: 0; margin-right: 16rpx; }
.rank-main-with-cover { margin-right: 20rpx; }
.rank-title {
  display: block; font-size: 28rpx; color: #111; font-weight: 600;
  margin-bottom: 6rpx; line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rank-title-2line {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  white-space: normal; overflow: hidden;
  margin-bottom: 10rpx;
}
.rank-heat { font-size: 22rpx; color: var(--cr-text-muted); }
.rank-meta { display: flex; align-items: center; gap: 8rpx; }
.rank-avatar { width: 28rpx; height: 28rpx; border-radius: 50%; background: var(--cr-surface-alt); }
.rank-author {
  font-size: 22rpx; color: var(--cr-text-muted);
  max-width: 160rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rank-eye { width: 24rpx; height: 24rpx; color: #c0c2c8; margin-left: 4rpx; }
.rank-views { font-size: 22rpx; color: #c0c2c8; }
.rank-cover {
  width: 140rpx; height: 100rpx; border-radius: 12rpx;
  background: var(--cr-surface-alt); flex-shrink: 0;
}
.rank-arrow { width: 28rpx; height: 28rpx; color: #d1d5db; flex-shrink: 0; }

/* ── 话题卡片（横向滚动）── */
.topic-scroll { width: 100%; white-space: nowrap; }
.topic-row { display: inline-flex; gap: 16rpx; padding-right: 16rpx; }
.topic-card {
  position: relative;
  display: inline-flex; flex-direction: column; align-items: flex-start;
  width: 200rpx; height: 180rpx;
  padding: 22rpx 20rpx;
  background: #f7f7f8; border-radius: 16rpx;
  vertical-align: top;
  overflow: hidden;
  box-sizing: border-box;
}
.topic-card:active { background: #eeeef0; }
.topic-card.has-cover { padding: 0; background: #000; }
.topic-card.has-cover:active { background: #000; }

.topic-cover {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 1;
}
.topic-card-mask {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.15) 100%);
  z-index: 2;
}
.topic-card-body {
  position: relative; z-index: 3;
  display: flex; flex-direction: column; align-items: flex-start;
  width: 100%; height: 100%;
  padding: 20rpx;
  box-sizing: border-box;
  justify-content: flex-end;
}
.topic-hash { font-size: 24rpx; color: #ff2442; line-height: 1; font-weight: 700; }
.has-cover .topic-hash { color: #ff6b6b; }
.topic-name {
  font-size: 26rpx; color: #111; font-weight: 600;
  margin-top: 6rpx; margin-bottom: 6rpx;
  width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.has-cover .topic-name { color: #fff; }
.topic-count { font-size: 20rpx; color: var(--cr-text-muted); }
.has-cover .topic-count { color: rgba(255,255,255,0.85); }

/* ── 推荐帖子 ── */
.rec-list { display: flex; flex-direction: column; }
.rec-item {
  display: flex; align-items: flex-start;
  padding: 22rpx 0;
}
.rec-item + .rec-item { border-top: 1rpx solid #f5f5f7; }
.rec-item:active { background: var(--cr-canvas); }
.rec-main { flex: 1; min-width: 0; margin-right: 20rpx; }
.rec-title {
  display: -webkit-box; overflow: hidden;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  font-size: 28rpx; color: #111; font-weight: 600; line-height: 1.5;
  margin-bottom: 14rpx;
}
.rec-meta { display: flex; align-items: center; gap: 8rpx; }
.rec-avatar { width: 30rpx; height: 30rpx; border-radius: 50%; background: var(--cr-surface-alt); }
.rec-author {
  font-size: 22rpx; color: var(--cr-text-muted);
  max-width: 160rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rec-eye { width: 24rpx; height: 24rpx; color: #c0c2c8; margin-left: 4rpx; }
.rec-views { font-size: 22rpx; color: #c0c2c8; }
.rec-cover { width: 140rpx; height: 100rpx; border-radius: 12rpx; background: var(--cr-surface-alt); flex-shrink: 0; }

/* ── 热门圈子 ── */
.circle-scroll { width: 100%; white-space: nowrap; }
.circle-row { display: inline-flex; gap: 20rpx; padding-right: 20rpx; }
.circle-card {
  display: inline-flex; flex-direction: column; align-items: center;
  width: 130rpx;
}
.circle-img {
  width: 110rpx; height: 110rpx; border-radius: 24rpx;
  background: var(--cr-surface-alt); margin-bottom: 10rpx;
}
.circle-name {
  font-size: 24rpx; color: #111; font-weight: 600;
  text-align: center; width: 130rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.circle-meta { font-size: 20rpx; color: var(--cr-text-muted); margin-top: 4rpx; }

/* ── 骨架屏 ── */
.skeleton-wrap { padding: 20rpx 28rpx; }
.sk-section { margin-bottom: 32rpx; }
.sk-title { height: 32rpx; width: 200rpx; border-radius: 8rpx; background: var(--cr-surface-alt); margin-bottom: 24rpx; }
.sk-row { display: flex; align-items: center; padding: 16rpx 0; }
.sk-circle { width: 56rpx; height: 56rpx; border-radius: 50%; background: var(--cr-surface-alt); flex-shrink: 0; margin-right: 20rpx; }
.sk-lines { flex: 1; }
.sk-line { height: 22rpx; border-radius: 4rpx; background: var(--cr-surface-alt); margin-bottom: 12rpx; }
.sk-line-long { width: 70%; }
.sk-line-short { width: 40%; margin-bottom: 0; }

/* ── 搜索结果 - 帖子 ── */
.post-item {
  display: flex; align-items: flex-start;
  padding: 28rpx 32rpx;
}
.post-item + .post-item { border-top: 1rpx solid #f5f5f7; }
.post-item:active { background: var(--cr-canvas); }
.post-body { flex: 1; min-width: 0; margin-right: 20rpx; }
.post-title-row {
  font-size: 30rpx; color: #111; font-weight: 600; line-height: 1.5;
  margin-bottom: 10rpx;
  display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.search-highlight { color: #ff2442; font-weight: 700; }
.post-desc {
  font-size: 25rpx; color: var(--cr-text-muted); line-height: 1.6; margin-bottom: 16rpx;
  display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.post-meta { display: flex; align-items: center; gap: 8rpx; }
.meta-avatar { width: 30rpx; height: 30rpx; border-radius: 50%; background: var(--cr-surface-alt); }
.meta-name {
  font-size: 22rpx; color: var(--cr-text-muted);
  max-width: 160rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.meta-dot { font-size: 22rpx; color: #d1d5db; }
.meta-time { font-size: 22rpx; color: #d1d5db; flex-shrink: 0; }
.post-thumb {
  width: 200rpx; height: 148rpx; border-radius: 14rpx;
  background: var(--cr-surface-alt); flex-shrink: 0;
}

/* ── 搜索结果 - 用户 ── */
.user-item {
  display: flex; align-items: center;
  padding: 28rpx 32rpx;
}
.user-item + .user-item { border-top: 1rpx solid #f5f5f7; }
.user-item:active { background: var(--cr-canvas); }
.user-avatar-wrap {
  position: relative; width: 96rpx; height: 96rpx;
  flex-shrink: 0; margin-right: 20rpx;
  overflow: visible;
}
.user-avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: var(--cr-surface-alt); z-index: 1;
}
.user-frame {
  position: absolute;
  top: -15%; left: -15%;
  width: 130%; height: 130%;
  z-index: 2;
  pointer-events: none;
}
.user-info { flex: 1; min-width: 0; }
.user-name-row { display: flex; align-items: center; margin-bottom: 8rpx; flex-wrap: wrap; gap: 8rpx; }
.user-name { font-size: 30rpx; color: #111; font-weight: 700; max-width: 260rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-tag { height: 30rpx; padding: 0 10rpx; border-radius: 6rpx; background: #ff2442; display: flex; align-items: center; }
.user-tag-text { font-size: 18rpx; color: #fff; line-height: 1; }
.user-fans { font-size: 22rpx; color: var(--cr-text-muted); display: block; margin-bottom: 6rpx; }
.user-bio { font-size: 24rpx; color: var(--cr-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.follow-btn {
  flex-shrink: 0; margin-left: 16rpx;
  height: 56rpx; padding: 0 28rpx;
  border-radius: 28rpx; border: 1.5rpx solid #ff2442;
  display: flex; align-items: center; justify-content: center;
}
.follow-btn:active { background: #fff1f3; }
.follow-btn-text { font-size: 26rpx; color: #ff2442; font-weight: 600; }

/* ── 搜索结果 - 商品 ── */
.goods-item {
  display: flex; align-items: flex-start;
  padding: 28rpx 32rpx;
  gap: 20rpx;
}
.goods-item + .goods-item { border-top: 1rpx solid #f5f5f7; }
.goods-item:active { background: var(--cr-canvas); }
.goods-thumb {
  width: 160rpx; height: 160rpx; border-radius: 14rpx;
  background: var(--cr-surface-alt); flex-shrink: 0;
}
.goods-info { flex: 1; min-width: 0; }
.goods-title {
  font-size: 28rpx; color: #111; font-weight: 500;
  line-height: 1.5; margin-bottom: 12rpx;
  display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.goods-meta { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.goods-price { font-size: 34rpx; font-weight: 800; color: #ff2442; }
.goods-type-tag {
  height: 30rpx; padding: 0 12rpx;
  border-radius: 4rpx; font-size: 18rpx; font-weight: 600;
  display: flex; align-items: center;
}
.goods-type-tag.physical { background: #eaf3ff; color: #1677ff; }
.goods-type-tag.virtual { background: #fff4e5; color: #ff6900; }
.goods-seller { display: flex; align-items: center; gap: 8rpx; }
.goods-seller-avatar { width: 30rpx; height: 30rpx; border-radius: 50%; background: #eee; }
.goods-seller-name { font-size: 22rpx; color: var(--cr-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200rpx; }

/* ── 空状态 ── */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 140rpx 0; }
.empty-ic { width: 96rpx; height: 96rpx; color: #d1d5db; margin-bottom: 20rpx; }
.empty-title { font-size: 30rpx; color: var(--cr-text-muted); font-weight: 600; margin-bottom: 10rpx; }
.empty-desc { font-size: 24rpx; color: #b1b3ba; }

/* ── 加载 ── */
.loading-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.spinner { width: 56rpx; height: 56rpx; border-radius: 50%; border: 4rpx solid var(--cr-border); border-top-color: #ff2442; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
