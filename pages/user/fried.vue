<template>
  <view class="add-friend-page" :class="themeClass">
    <view class="top-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="nav-title">添加朋友</view>
        <view class="nav-right"></view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="page-scroll"
      :style="{ height: scrollHeight + 'px' }"
      enhanced
      :show-scrollbar="false"
    >
      <view class="search-wrap">
        <view class="search-box">
          <text class="search-icon">⌕</text>
          <input
            class="search-input"
            placeholder="输入昵称 / 靓号 / 社区ID / 群名或群号"
            placeholder-class="search-placeholder"
            v-model="keyword"
            confirm-type="search"
            @input="onInput"
            @confirm="searchUser(true)"
          />
        </view>

        <view class="my-id">
          
          <text v-if="myDisplayNumber" :style="myIsFancy ? 'color:#f59e0b;font-weight:700;' : 'color:#aaa;'">
            {{ myIsFancy ? '靓ID：' : '' }}{{ myDisplayNumber }}
          </text>
          <text v-else>--</text>
          <text class="copy-icon" @click="copyMyId">⎘</text>
        </view>
        <view class="search-results" v-if="showSearchResults">
          <view v-if="searchLoading" class="search-result-empty">
            <text>搜索中...</text>
          </view>

          <template v-else>
            <view
              class="search-result-item"
              v-for="item in searchResults"
              :key="(item.kind === 'group' ? 'g' : 'u') + item.id"
              @click="item.kind === 'group' ? goToGroup(item) : goToUserProfile(item.id)"
            >
              <view class="search-result-avatar-wrap">
                <image
                  :src="item.avatar || '/static/logo.png'"
                  class="search-result-avatar"
                  mode="aspectFill"
                  lazy-load
                ></image>
                <image
                  v-if="item.current_frame_img"
                  :src="item.current_frame_img"
                  class="search-result-avatar-frame"
                  mode="aspectFit"
                ></image>
              </view>

              <view class="search-result-info">
                <view class="search-result-name-row">
                  <text class="search-result-name">{{ item.name }}</text>
                  <text v-if="item.kind === 'group'" class="search-result-badge">群</text>
                </view>
                <view v-if="item.kind === 'group'" class="search-result-id">
                  <text style="color:#aaa;">群号 {{ item.identity_code || '-' }} · {{ item.member_count }}人</text>
                </view>
                <view v-else class="search-result-id" :style="item.is_fancy == 1 ? 'color:#f59e0b;font-weight:700;' : 'color:#aaa;'">
                  <image v-if="item.is_fancy == 1" src="/static/icon/star-gold.svg" class="fancy-star" mode="aspectFit"></image>
                  <text>{{ item.display_number || item.id || '' }}</text>
                </view>
              </view>
            </view>

            <view class="search-result-empty" v-if="searchResults.length === 0">
              <text>没有找到相关用户或群聊</text>
            </view>
          </template>
        </view>
      </view>
      <view class="entry-card">
        <view class="entry-item no-border" @click="handleEntry('scan')">
          <view class="entry-left">
            <view class="entry-icon-box">
              <image class="entry-icon-img" src="/static/user/sys.png" mode="aspectFit"></image>
            </view>
            <text class="entry-text">扫描二维码</text>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </view>
      <view class="recommend-section">
        <view class="section-title">为你推荐</view>

        <view v-if="recommendLoading" class="recommend-loading">
          <text>加载中...</text>
        </view>

        <template v-else>
          <view
            class="user-item"
            v-for="(item, index) in recommendList"
            :key="item.id"
          >
            <view class="user-left" @click="goToUserProfile(item.id)">
              <view class="avatar-wrap">
                <image
                  :src="item.avatar || '/static/logo.png'"
                  class="avatar"
                  mode="aspectFill"
                  lazy-load
                ></image>

                <image
                  v-if="item.current_frame_img"
                  :src="item.current_frame_img"
                  class="avatar-frame"
                  mode="aspectFit"
                ></image>

                <view class="avatar-corner" v-if="item.cornerText">{{ item.cornerText }}</view>
                <view class="avatar-badge" v-if="item.showPBadge">P</view>
              </view>

              <view class="user-info">
                <view class="name-row">
                  <text class="user-name">{{ item.name }}</text>
                </view>

                <view class="meta-row">
                  <text
                    v-if="item.tag"
                    class="meta-tag"
                    :class="{ light: item.tagStyle === 'light' }"
                  >
                    {{ item.tag }}
                  </text>

                  <text v-if="item.activeText" class="meta-text">{{ item.activeText }}</text>
                  <text v-if="item.workText" class="meta-text meta-pill">{{ item.workText }}</text>
                </view>

                <view class="desc-row">
                  <text class="desc-text">{{ item.desc }}</text>
                </view>
              </view>
            </view>

            <view class="user-actions">
              <view
                class="follow-btn"
                :class="{ followed: item.followed, 'follow-back': item.isFollowedBy && !item.followed, disabled: !!followLockMap[item.id] }"
                @click.stop="toggleFollow(index)"
              >
                <text>{{ item.followed ? '已关注' : (item.isFollowedBy ? '回关' : '关注') }}</text>
              </view>

              <view
                class="dismiss-btn"
                :class="{ disabled: !!dismissLockMap[item.id] }"
                @click.stop="removeRecommend(index)"
              >
                <text>×</text>
              </view>
            </view>
          </view>

          <view class="recommend-empty" v-if="recommendList.length === 0">
            <text>暂无推荐用户</text>
          </view>
        </template>
      </view>

      <view style="height: 40rpx;"></view>
    </scroll-view>

    <XhsHUD :show="hud.show" :type="hud.type" :text="hud.text" />
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import XhsHUD from '../../components/XhsHUD.vue'

export default {
  components: {
    XhsHUD
  },
  data() {
    return {
      statusBarHeight: 20,
      scrollHeight: 0,

      keyword: '',
      myUserId: '',
      myDisplayNumber: '',
      myIsFancy: false,

      searchResults: [],
      showSearchResults: false,
      searchLoading: false,
      searchTimer: null,
      searchReqId: 0,
      lastSearchKeyword: '',

      recommendList: [],
      recommendLoading: false,

      followLockMap: {},
      dismissLockMap: {},

      hud: {
        show: false,
        type: 'loading',
        text: '加载中...'
      }
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.scrollHeight = sys.windowHeight - (this.statusBarHeight + 44)
    this.getMyUserId()
    this.getRecommendList()
  },

  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
  },

  methods: {
    getMyUserId() {
      const userInfo = uni.getStorageSync('userInfo')
      if (userInfo && userInfo.id) {
        this.myUserId = String(userInfo.id)
        this.myDisplayNumber = userInfo.display_number || ''
        this.myIsFancy = parseInt(userInfo.is_fancy || 0) === 1
      }
    },

    normalizeRecommendUser(item) {
      /* 后端 recommend 合并了真实统计，这里直接用；取不到才回退 0 */
      const fans = Number(item.fans_count || 0)
      const follows = Number(item.follow_count || 0)
      const likes = Number(item.total_like || 0)
      const posts = Number(item.post_count || 0)

      let activeText = ''
      if (fans >= 1000) activeText = '高人气用户'
      else if (fans >= 100) activeText = '人气用户'
      else if (posts >= 10) activeText = '活跃创作者'
      else if (posts >= 3) activeText = '最近活跃'
      else activeText = '推荐认识'

      /* 后端 uid 是字符串(如 202610012244331A2B3C)，不能 Number()，
         否则会变成 NaN：v-for :key 非法，关注/移除/进主页也会一起失效 */
      const uid = String(item.id || item.uid || '')
      return {
        id: uid,
        name: item.name || item.username || '用户',
        avatar: item.avatar || '/static/logo.png',
        current_frame_img: item.current_frame_img || '',
        cornerText: item.cornerText || '',
        showPBadge: Number(item.vip || 0) === 1,
        tag: fans >= 5000 ? '热门' : '',
        tagStyle: 'light',
        activeText,
        workText: `粉丝 ${fans} · 关注 ${follows} · 获赞 ${likes} · 发帖 ${posts}`,
        desc: item.personal_signature || '这个人很神秘，什么都没留下',
        followed: !!(item.is_following || item.followed),
        isFollowedBy: !!item.is_followed_by
      }
    },

    async getRecommendList() {
      this.recommendLoading = true
      try {
        const res = await request('user.php', {
          action: 'getRecommendUsers',
          page: 1,
          limit: 20
        }, 'GET')

        /* 后端 user/recommend 返回的是 { list }，兼容个别返回纯数组的老版本 */
        if (res.code === 0) {
          const arr = Array.isArray(res.data) ? res.data : ((res.data && res.data.list) || [])
          this.recommendList = arr.map(this.normalizeRecommendUser)
        } else {
          this.recommendList = []
        }
      } catch (err) {
        this.recommendList = []
      } finally {
        this.recommendLoading = false
      }
    },

    onInput(e) {
      this.keyword = (e.detail.value || '').trim()

      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
        this.searchTimer = null
      }

      if (!this.keyword) {
        this.showSearchResults = false
        this.searchResults = []
        this.searchLoading = false
        this.lastSearchKeyword = ''
        return
      }

      this.showSearchResults = true
      this.searchLoading = true

      this.searchTimer = setTimeout(() => {
        this.searchUser()
      }, 350)
    },

    async searchUser(force = false) {
      const kw = (this.keyword || '').trim()

      if (!kw) {
        this.showSearchResults = false
        this.searchResults = []
        this.searchLoading = false
        return
      }

      if (!force && kw === this.lastSearchKeyword) {
        this.searchLoading = false
        return
      }

      this.lastSearchKeyword = kw
      const reqId = ++this.searchReqId
      this.searchLoading = true
      this.showSearchResults = true

      try {
        /* 用户 + 群聊一起搜，结果合并到同一个列表 */
        const [res, groupRes] = await Promise.all([
          request('user.php', { action: 'searchUser', keyword: kw }, 'GET'),
          request('message.php', { action: 'group_search', q: kw }, 'GET').catch(() => null)
        ])

        if (reqId !== this.searchReqId) return

        /* 后端返回的是 { list, total }，兼容个别返回纯数组的老版本 */
        const users = (res && res.code === 0)
          ? (Array.isArray(res.data) ? res.data : ((res.data && res.data.list) || []))
          : []
        const groups = (groupRes && groupRes.code === 0)
          ? (Array.isArray(groupRes.data) ? groupRes.data : ((groupRes.data && groupRes.data.list) || []))
          : []

        this.searchResults = [
          ...users.map(u => ({ ...u, kind: 'user' })),
          ...groups.map(g => ({
            kind: 'group',
            id: Number(g.id || g.session_id || 0),
            name: g.name || '群聊',
            avatar: g.avatar || '',
            identity_code: g.identity_code || '',
            member_count: Number(g.member_count || 0)
          }))
        ]
      } catch (err) {
        if (reqId !== this.searchReqId) return
        this.searchResults = []
      } finally {
        if (reqId === this.searchReqId) {
          this.searchLoading = false
        }
      }
    },

    copyMyId() {
      if (!this.myUserId) return
      uni.setClipboardData({
        data: this.myUserId,
        success: () => {
          uni.showToast({
            title: '复制成功',
            icon: 'success'
          })
        }
      })
    },

    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },

    handleEntry(type) {
      if (type === 'scan') {
        // #ifdef H5
        uni.showToast({
          title: '请使用APP扫一扫',
          icon: 'none'
        })
        // #endif

        // #ifndef H5
        uni.scanCode({
          success: (res) => {
            if (!res.result) return

            if (res.result.includes('/pages/user/profile?userId=')) {
              const userId = res.result.split('userId=')[1]
              if (userId) {
                uni.navigateTo({
                  url: `/pages/user/profile?userId=${userId}`
                })
              }
            } else {
              uni.showToast({
                title: '无效的二维码',
                icon: 'none'
              })
            }
          },
          fail: () => {}
        })
        // #endif
      }
    },

    async toggleFollow(index) {
      const user = this.recommendList[index]
      if (!user || this.followLockMap[user.id]) return

      this.$set(this.followLockMap, user.id, true)

      const prev = user.followed
      user.followed = !prev

      try {
        const res = await request('user.php', {
          action: 'toggleFollow',
          targetId: user.id
        }, 'POST')

        if (res.code !== 0) {
          user.followed = prev
          uni.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          })
          return
        }

        uni.showToast({
          title: user.followed ? '已关注' : '已取消',
          icon: 'none'
        })

        // 关注成功后延迟移除该用户（后端已排除已关注用户）
        if (user.followed) {
          setTimeout(() => {
            const idx = this.recommendList.findIndex(u => u.id === user.id)
            if (idx > -1) {
              this.recommendList.splice(idx, 1)
            }
          }, 1200)
        }
      } catch (err) {
        user.followed = prev
        uni.showToast({
          title: '网络错误',
          icon: 'none'
        })
      } finally {
        this.$delete(this.followLockMap, user.id)
      }
    },

    async removeRecommend(index) {
      const user = this.recommendList[index]
      if (!user || this.dismissLockMap[user.id]) return

      this.$set(this.dismissLockMap, user.id, true)

      try {
        const res = await request('user.php', {
          action: 'dismissRecommendUser',
          targetId: user.id
        }, 'POST')

        if (res.code === 0) {
          this.recommendList.splice(index, 1)
          uni.showToast({
            title: '已移除',
            icon: 'none'
          })
        } else {
          uni.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          })
        }
      } catch (err) {
        uni.showToast({
          title: '网络错误',
          icon: 'none'
        })
      } finally {
        this.$delete(this.dismissLockMap, user.id)
      }
    },

    goToUserProfile(userId) {
      uni.navigateTo({
        url: `/pages/user/profile?userId=${userId}`
      })
    },

    /* 搜索结果里的群聊: 进群资料页(可在那里直接加入 / 进入群聊) */
    goToGroup(item) {
      const gid = Number((item && item.id) || 0)
      if (!gid) {
        uni.showToast({ title: '群聊不存在', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/message/group-profile?groupId=${gid}`,
        fail: () => {
          uni.showToast({ title: '打开群资料失败', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.add-friend-page {
  min-height: 100vh;
  background: var(--cr-surface);
  overflow: hidden;
}

.top-nav {
  background: var(--cr-surface);
  position: relative;
  z-index: 20;
}

.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: var(--cr-surface);
}

.nav-left,
.nav-right {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-left {
  justify-content: flex-start;
}

.nav-right {
  justify-content: flex-end;
}

.back-icon {
  font-size: 54rpx;
  color: var(--cr-text);
  line-height: 1;
  font-weight: 300;
  margin-left: 2rpx;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 38rpx;
  color: var(--cr-text);
  font-weight: 500;
  letter-spacing: 1rpx;
}

.page-scroll {
  background: var(--cr-surface);
}

.search-wrap {
  padding: 10rpx 24rpx 12rpx;
  box-sizing: border-box;
  background: var(--cr-surface);
}

.search-box {
  height: 74rpx;
  border-radius: 14rpx;
  background: #f6f6f8;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  box-sizing: border-box;
}

.search-icon {
  font-size: 30rpx;
  color: #b8b8be;
  margin-right: 12rpx;
  line-height: 1;
}

.search-input {
  flex: 1;
  height: 74rpx;
  font-size: 28rpx;
  color: var(--cr-text);
}

.search-placeholder {
  color: #b7b7bd;
  font-size: 28rpx;
}

.my-id {
  text-align: center;
  font-size: 22rpx;
  color: #b6b6bc;
  margin-top: 22rpx;
  line-height: 1;
}

.copy-icon {
  font-size: 22rpx;
  color: #b6b6bc;
  margin-left: 6rpx;
}

.search-results {
  background: var(--cr-surface);
  border-radius: 12rpx;
  margin-top: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.search-result-avatar-wrap {
  width: 80rpx;
  height: 80rpx;
  margin-right: 20rpx;
  position: relative;
  flex-shrink: 0;
}

.search-result-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: block;
}

.search-result-avatar-frame {
  position: absolute;
  inset: -4rpx;
  width: calc(100% + 8rpx);
  height: calc(100% + 8rpx);
  pointer-events: none;
}

.search-result-info {
  flex: 1;
  min-width: 0;
}

.search-result-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.search-result-name-row .search-result-name {
  margin-bottom: 0;
}

.search-result-badge {
  margin-left: 10rpx;
  padding: 0 10rpx;
  height: 32rpx;
  line-height: 32rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  color: #7c5cff;
  background: rgba(124, 92, 255, 0.12);
  flex-shrink: 0;
}

.search-result-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--cr-text);
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-id {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: var(--cr-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fancy-star {
  width: 24rpx;
  height: 24rpx;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.search-result-empty {
  padding: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--cr-text-muted);
}

.entry-card {
  margin-top: 18rpx;
  background: var(--cr-surface);
  padding-left: 24rpx;
  box-sizing: border-box;
}

.entry-item {
  min-height: 98rpx;
  padding-right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid var(--cr-border);
  box-sizing: border-box;
}

.entry-item.no-border {
  border-bottom: none;
}

.entry-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.entry-icon-box {
  width: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
}

.entry-icon-img {
  width: 40rpx;
  height: 40rpx;
}

.entry-text {
  font-size: 28rpx;
  color: #2f2f2f;
  font-weight: 400;
}

.entry-arrow {
  font-size: 34rpx;
  color: #cfcfd4;
  line-height: 1;
}

.recommend-section {
  margin-top: 18rpx;
  background: var(--cr-surface);
  border-top: 18rpx solid #f6f6f8;
}

.section-title {
  padding: 22rpx 24rpx 14rpx;
  font-size: 26rpx;
  color: #b2b2b8;
  font-weight: 400;
}

.recommend-loading,
.recommend-empty {
  padding: 40rpx 24rpx 60rpx;
  text-align: center;
  color: var(--cr-text-muted);
  font-size: 26rpx;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 24rpx 20rpx;
  box-sizing: border-box;
  background: var(--cr-surface);
}

.user-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.avatar-wrap {
  width: 86rpx;
  height: 86rpx;
  position: relative;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.avatar {
  width: 86rpx;
  height: 86rpx;
  border-radius: 50%;
  display: block;
  background: #f3f3f3;
}

.avatar-frame {
  position: absolute;
  inset: -6rpx;
  width: calc(100% + 12rpx);
  height: calc(100% + 12rpx);
  pointer-events: none;
}

.avatar-badge {
  position: absolute;
  right: -2rpx;
  bottom: -2rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #ff62a6;
  border: 4rpx solid #fff;
  color: #fff;
  font-size: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-weight: 600;
}

.avatar-corner {
  position: absolute;
  left: -6rpx;
  bottom: -2rpx;
  height: 28rpx;
  padding: 0 10rpx;
  border-radius: 14rpx;
  background: linear-gradient(90deg, #b166ff, #ff70bf);
  color: #fff;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border: 2rpx solid #fff;
  box-sizing: border-box;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.user-name {
  font-size: 34rpx;
  color: #202020;
  line-height: 1.2;
  font-weight: 600;
  max-width: 100%;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10rpx;
  gap: 8rpx;
  line-height: 1;
}

.meta-tag {
  height: 30rpx;
  padding: 0 10rpx;
  border-radius: 8rpx;
  background: var(--cr-surface-alt);
  color: #8b8b92;
  font-size: 20rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.meta-tag.light {
  background: #f3f3f3;
  color: #9c9ca3;
}

.meta-text {
  font-size: 22rpx;
  color: #9e9ea5;
  line-height: 1;
}

.meta-pill {
  background: var(--cr-surface-alt);
  padding: 6rpx 10rpx;
  border-radius: 8rpx;
}

.desc-row {
  margin-top: 12rpx;
  min-width: 0;
}

.desc-text {
  font-size: 27rpx;
  color: #8f8f96;
  line-height: 1.25;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-actions {
  margin-left: 18rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.follow-btn {
  width: 104rpx;
  height: 60rpx;
  border-radius: 14rpx;
  background: #ff2f68;
  display: flex;
  align-items: center;
  justify-content: center;
}

.follow-btn text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1;
}

.follow-btn.followed {
  background: #f1f1f3;
}

.follow-btn.followed text {
  color: var(--cr-text-muted);
}

.follow-btn.follow-back {
  background: var(--cr-surface);
  border: 2rpx solid #ff2f68;
}

.follow-btn.follow-back text {
  color: #ff2f68;
}

.follow-btn.disabled,
.dismiss-btn.disabled {
  opacity: 0.6;
}

.dismiss-btn {
  width: 48rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 14rpx;
}

.dismiss-btn text {
  font-size: 38rpx;
  color: #b8b8be;
  line-height: 1;
  font-weight: 300;
}
</style>
