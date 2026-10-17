<template>
  <view class="detail-page" :class="themeClass">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-btn" @click="goBack">
        <image src="/static/icon/fanhui.png" class="nav-icon" mode="aspectFit"></image>
      </view>
      <text class="nav-title">软件详情</text>
      <view class="nav-btn more-btn" @click="openMore">
        <view class="more-icon">
          <view class="more-dot"></view>
          <view class="more-dot"></view>
          <view class="more-dot"></view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-body">
      <!-- 头部卡片 -->
      <view class="header-card" v-if="info">
        <image :src="safeInfo.logo || '/static/logo.png'" class="app-logo" mode="aspectFill"></image>
        <view class="app-info">
          <text class="app-name">{{ safeInfo.name || '未命名软件' }}</text>
          <text class="app-package">{{ safeInfo.package_name || 'com.example.app' }}</text>
          <view class="tags-row">
            <text class="tag-item primary">{{ safeInfo.channel_name || '官方版' }}</text>
            <text class="tag-item">{{ safeInfo.category_name || '实用工具' }}</text>
            <text class="tag-item">{{ safeInfo.tags_text || '全兼容' }}</text>
          </view>
        </view>
      </view>

      <!-- 数据统计行 -->
      <view class="stats-row">
        <view class="stat-item" @click="openComments">
          <view class="stat-value">
            <image class="stat-star-img" src="/static/icon/star-yellow.svg" mode="aspectFit" />
            <text>{{ safeInfo.rating || '0.0' }}</text>
          </view>
          <text class="stat-label">{{ commentCount }} 条评论</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">{{ safeInfo.size || '-' }}</text>
          <text class="stat-label">大小</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">{{ formatCount(safeInfo.download_count || 0) }}</text>
          <text class="stat-label">下载</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="handleReward">
          <view class="stat-value">
            <image class="stat-coin-img" src="/static/icon/coins-orange.svg" mode="aspectFit" />
            <text>{{ safeInfo.reward_count || 0 }}</text>
          </view>
          <text class="stat-label">有人打赏</text>
        </view>
      </view>

      <!-- Tab切换 -->
      <view class="tabs-bar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
          <view v-if="tab.key === 'comment' && commentCount > 0" class="tab-badge">{{ commentCount }}</view>
        </view>
      </view>

      <!-- 详情内容 -->
      <view v-show="activeTab === 'detail'" class="detail-content">
        <!-- 介绍图 -->
        <view class="images-section" v-if="displayImages.length > 0">
          <scroll-view scroll-x class="images-scroll" :show-scrollbar="false">
            <view class="images-list">
              <image
                v-for="(img, index) in displayImages"
                :key="index"
                :src="img"
                class="image-item"
                mode="aspectFill"
                @click="previewImage(index)"
              ></image>
            </view>
          </scroll-view>
        </view>

        <!-- 免责声明 -->
        <view class="disclaimer-box">
          <text class="disclaimer-text">{{ safeInfo.disclaimer || '该软件为用户上传，仅供学习用途，请在下载后24小时内删除，如造成您的利益受损，请联系我们删除。' }}</text>
        </view>

        <!-- 软件简介 -->
        <view class="intro-section">
          <text class="section-title">软件简介</text>
          <text class="intro-text">{{ safeInfo.intro || '暂无简介' }}</text>
        </view>

        <!-- 用户评论预览 -->
        <view class="review-preview" v-if="recentComments.length > 0">
          <text class="section-title">用户评价</text>
          <view v-for="item in recentComments" :key="item.id" class="review-item">
            <image :src="item.avatar || '/static/logo.png'" class="review-avatar" mode="aspectFill"></image>
            <view class="review-content">
              <text class="review-name">{{ item.name || item.username || '匿名' }}</text>
              <text class="review-text">{{ item.content }}</text>
            </view>
          </view>
          <view class="view-all-reviews" @click="activeTab = 'comment'">
            <text>查看全部评论</text>
            <image src="/static/icon/chevron-right-gray.svg" class="view-all-arrow" mode="aspectFit"></image>
          </view>
        </view>
      </view>

      <!-- 评论内容 -->
      <view v-show="activeTab === 'comment'" class="comment-content">
        <!-- 星级评分 -->
        <view class="rating-box">
          <text class="rating-label">评分</text>
          <view class="rating-stars">
            <view
              v-for="star in 5"
              :key="star"
              class="star-item"
              @click="setRating(star)"
            >
              <image class="star-svg-img" :src="star <= rating ? '/static/icon/star-yellow.svg' : '/static/icon/star-empty.svg'" mode="aspectFit" />
            </view>
          </view>
          <text class="rating-text">{{ rating > 0 ? rating + '分' : '点击评分' }}</text>
        </view>

        <!-- 评论输入框 -->
        <view class="comment-input-box">
          <textarea
            v-model="commentText"
            class="comment-input"
            placeholder="说说你对这个软件的看法..."
            confirm-type="send"
            @confirm="submitComment"
          />
          <view class="send-btn" :class="{ active: canSubmit }" @click="submitComment">
            <text>发送</text>
          </view>
        </view>

        <!-- 评论列表 -->
        <view v-if="comments.length > 0" class="comment-list">
          <view v-for="item in comments" :key="item.id" class="comment-item">
            <image :src="item.avatar || '/static/logo.png'" class="comment-avatar" mode="aspectFill"></image>
            <view class="comment-body">
              <view class="comment-header">
                <text class="comment-name">{{ item.name || item.username || '匿名' }}</text>
                <view class="comment-rating">
                  <image v-for="star in 5" :key="star" class="comment-star-img" :src="star <= (item.rating || 0) ? '/static/icon/star-yellow.svg' : '/static/icon/star-empty.svg'" mode="aspectFit" />
                </view>
                <text class="comment-time">{{ formatTime(item.create_time) }}</text>
              </view>
              <text class="comment-text">{{ item.content }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-comments">
          <text>暂无评论，快来发表第一条评论吧</text>
        </view>
      </view>

      <view style="height: 200rpx;"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-left">
        <view class="reward-btn" @click="handleReward">
          <image class="reward-svg-img" src="/static/icon/reward-red.svg" mode="aspectFit" />
          <text class="reward-text">打赏</text>
        </view>
      </view>
      <view class="download-btn" :class="{ disabled: downloading }" @click="handleDownload">
        <text>{{ downloading ? downloadText : '下载 ' + (safeInfo.size || '') }}</text>
      </view>
      <image v-if="safeInfo.avatar" :src="safeInfo.avatar" class="author-avatar" mode="aspectFill"></image>
    </view>

    <!-- 打赏弹窗 -->
    <view class="reward-mask" v-if="showRewardModal" @touchmove.stop.prevent @tap="showRewardModal = false">
      <view class="reward-box" @tap.stop>
        <view class="reward-title-row">
          <image class="reward-title-svg-img" src="/static/icon/reward-red.svg" mode="aspectFit" />
          <text class="reward-title">打赏作者</text>
        </view>
        <text class="reward-author">打赏给：{{ safeInfo.author_name || safeInfo.user_nickname || '匿名用户' }}</text>
        
        <view class="reward-amount-grid">
          <view
            v-for="amount in [100, 200, 500, 1000]"
            :key="amount"
            class="reward-amount-chip"
            :class="{ active: rewardAmount === amount && !isCustomReward }"
            @click="selectRewardAmount(amount)"
          >
            <text>{{ amount }} 积分</text>
          </view>
          
          <view class="reward-amount-chip custom-chip" :class="{ active: isCustomReward }">
            <input
              type="digit"
              v-model="customRewardAmount"
              placeholder="自定义"
              placeholder-class="reward-chip-ph"
              class="custom-reward-input"
              @focus="selectCustomReward"
              @input="onCustomRewardInput"
              @blur="safeStop"
            />
          </view>
        </view>

        <view class="reward-balance">
          <text>当前积分：{{ userInfo && userInfo.jifen || 0 }}</text>
        </view>

        <view class="reward-btns">
          <view class="reward-cancel" @click="showRewardModal = false"><text>取消</text></view>
          <view class="reward-confirm" :class="{ disabled: rewardLock }" @click.stop="doReward"><text>确认打赏</text></view>
        </view>
      </view>
    </view>

    <XhsModal
      :show="actionMenuVisible"
      title="更多操作"
      :hide-footer="true"
      @update:show="actionMenuVisible = $event"
      @cancel="closeActionMenu"
    >
      <view class="action-menu-list">
        <view class="action-menu-item" @click="handleMoreAction('share')">
          <text class="action-menu-text">分享链接</text>
        </view>
        <view v-if="canManage" class="action-menu-item" @click="handleMoreAction('edit')">
          <text class="action-menu-text">编辑软件</text>
        </view>
        <view v-if="canManage" class="action-menu-item" @click="handleMoreAction('manage')">
          <text class="action-menu-text">管理软件</text>
        </view>
        <view v-if="canManage" class="action-menu-item danger" @click="handleMoreAction('delete')">
          <text class="action-menu-text danger-text">删除软件</text>
        </view>
      </view>
    </XhsModal>

    <XhsConfirm
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :mask-closable="false"
      @confirm="handleConfirmOk"
      @cancel="handleConfirmCancel"
    />
  </view>
</template>

<script>
import { request, webBaseUrl } from '../../common/request.js'
import XhsModal from '../../components/XhsModal.vue'
import XhsConfirm from '../../components/XhsConfirm.vue'

export default {
  components: {
    XhsModal,
    XhsConfirm
  },
  data() {
    return {
      statusBarHeight: 20,
      id: 0,
      info: null,
      displayImages: [],
      activeTab: 'detail',
      tabs: [
        { key: 'detail', label: '详情' },
        { key: 'comment', label: '评论' }
      ],
      comments: [],
      recentComments: [],
      commentCount: 0,
      commentText: '',
      rating: 0,
      downloading: false,
      downloadText: '下载中...',
      actionMenuVisible: false,
      confirmDialog: {
        visible: false,
        title: '',
        message: '',
        confirmText: '确定',
        cancelText: '取消',
        resolve: null
      },
      showRewardModal: false,
      rewardAmount: 100,
      isCustomReward: false,
      customRewardAmount: '',
      rewardLock: false,
      userInfo: null
    }
  },
  computed: {
    safeInfo() {
      return this.info || {
        logo: '',
        name: '',
        package_name: '',
        version: '',
        channel_name: '',
        category_name: '',
        tags: '',
        tags_text: '',
        size: '',
        download_count: 0,
        reward_count: 0,
        rating: '0.0',
        intro: '',
        disclaimer: '',
        user_id: 0,
        can_manage: 0,
        avatar: '',
        author_name: '',
        user_nickname: ''
      }
    },
    isOwner() {
      const user = uni.getStorageSync('userInfo') || {}
      return String(user.id || 0) === String(this.safeInfo.user_id || 0)
    },
    isAdmin() {
      const user = uni.getStorageSync('userInfo') || {}
      return parseInt(user.is_admin || 0) === 1
    },
    isReviewer() {
      const user = uni.getStorageSync('userInfo') || {}
      return parseInt(user.is_reviewer || 0) === 1
    },
    canManage() {
      return this.isOwner || this.isAdmin
    },
    canSubmit() {
      return this.commentText.trim() && this.rating > 0
    }
  },
  onLoad(options) {
    this.id = parseInt(options.id || 0)
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
    this.loadDetail()
    this.loadComments()
  },
  onShareAppMessage() {
    return {
      title: this.safeInfo.name || '软件推荐',
      path: `/pages/software/detail?id=${this.id}`,
      imageUrl: this.safeInfo.logo || '/static/logo.png'
    }
  },
  onShareTimeline() {
    return {
      title: this.safeInfo.name || '软件推荐',
      query: `id=${this.id}`,
      imageUrl: this.safeInfo.logo || '/static/logo.png'
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async loadDetail() {
      try {
        const res = await request('software.php', { action: 'get_detail', id: this.id })
        if (res.code !== 0 || !res.data) {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
          setTimeout(() => this.goBack(), 900)
          return
        }
        this.info = res.data
        this.displayImages = Array.isArray(res.data.images_arr) ? res.data.images_arr : []
        // tags_text 由后端解析返回（ID → 名称），前端直接使用
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      }
    },
    async loadComments() {
      try {
        const res = await request('software.php', { action: 'get_comments', id: this.id })
        if (res.code === 0 && Array.isArray(res.data)) {
          this.comments = res.data
          this.commentCount = res.data.length
          this.recentComments = res.data.slice(0, 2)
        }
      } catch (e) {
      }
    },
    previewImage(index) {
      uni.previewImage({
        current: this.displayImages[index],
        urls: this.displayImages
      })
    },
    getShareLink() {
      return `${webBaseUrl}/#/pages/software/detail?id=${this.id}`
    },
    copyShareLink() {
      const title = this.safeInfo.name || '这个软件不错'
      const text = `我在CloudRail-pro发现一个不错的软件，快来看看：\n${title}\n${this.getShareLink()}`
      uni.setClipboardData({
        data: text,
        success: () => uni.showToast({ title: '分享链接已复制', icon: 'none' })
      })
    },
    showConfirmDialog(options) {
      return new Promise((resolve) => {
        this.confirmDialog = {
          visible: true,
          title: options.title || '',
          message: options.message || '',
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          resolve
        }
      })
    },
    closeConfirmDialog(result) {
      const resolve = this.confirmDialog.resolve
      this.confirmDialog = {
        visible: false,
        title: '',
        message: '',
        confirmText: '确定',
        cancelText: '取消',
        resolve: null
      }
      if (resolve) resolve(result)
    },
    handleConfirmOk() {
      this.closeConfirmDialog(true)
    },
    handleConfirmCancel() {
      this.closeConfirmDialog(false)
    },
    closeActionMenu() {
      this.actionMenuVisible = false
    },
    openMore() {
      this.actionMenuVisible = true
    },
    async handleMoreAction(action) {
      this.closeActionMenu()
      if (action === 'share') {
        this.copyShareLink()
        return
      }
      if (action === 'edit') {
        uni.navigateTo({ url: '/pages/software/publish?id=' + this.id })
        return
      }
      if (action === 'manage') {
        uni.navigateTo({ url: '/pages/software/my_pub' })
        return
      }
      if (action === 'delete') {
        const ok = await this.showConfirmDialog({
          title: '确认删除',
          message: '删除后不可恢复，确定继续吗？',
          confirmText: '删除'
        })
        if (!ok) return
        try {
          const ret = await request('software.php', { action: 'delete', id: this.id })
          uni.showToast({ title: ret.msg || '操作完成', icon: 'none' })
          if (ret.code === 0) {
            setTimeout(() => this.goBack(), 800)
          }
        } catch (e) {
          uni.showToast({ title: e.msg || '网络异常', icon: 'none' })
        }
      }
    },
    async fetchDownloadUrl() {
      const res = await request('software.php', { action: 'download', id: this.id })
      if (res.code !== 0 || !res.data || !res.data.download_url) {
        throw new Error(res.msg || '下载地址获取失败')
      }
      if (this.info) {
        this.info.download_count = parseInt(res.data.download_count || this.info.download_count || 0)
      }
      return res.data.download_url
    },
    async handleDownload() {
      if (this.downloading) return
      try {
        this.downloading = true
        this.downloadText = '准备下载...'
        const finalUrl = await this.fetchDownloadUrl()

        // #ifdef APP-PLUS
        await this.downloadForApp(finalUrl)
        // #endif

        // #ifdef H5
        window.open(finalUrl, '_blank')
        uni.showToast({ title: '已打开下载链接', icon: 'none' })
        // #endif

        // #ifdef MP-WEIXIN
        uni.setClipboardData({
          data: finalUrl,
          success: () => uni.showToast({ title: '下载链接已复制', icon: 'none' })
        })
        // #endif
      } catch (e) {
        uni.showToast({ title: e.message || '下载失败', icon: 'none' })
      } finally {
        this.downloading = false
        this.downloadText = '下载中...'
      }
    },
    downloadForApp(url) {
      return new Promise((resolve, reject) => {
        const lower = String(url || '').toLowerCase()
        const canAutoInstall = /\.(apk|wgt|wgtu)(\?|$)/.test(lower)
        if (!canAutoInstall) {
          try {
            plus.runtime.openURL(url)
            uni.showToast({ title: '已打开下载链接', icon: 'none' })
            resolve()
          } catch (e) {
            reject(new Error('无法打开下载链接'))
          }
          return
        }

        const task = uni.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode !== 200 || !res.tempFilePath) {
              reject(new Error('下载失败'))
              return
            }
            try {
              plus.runtime.install(
                res.tempFilePath,
                { force: false },
                () => {
                  uni.showToast({ title: '安装成功', icon: 'success' })
                  resolve()
                },
                () => {
                  try {
                    plus.runtime.openURL(url)
                    uni.showToast({ title: '已转系统安装', icon: 'none' })
                    resolve()
                  } catch (e) {
                    reject(new Error('安装失败'))
                  }
                }
              )
            } catch (e) {
              reject(new Error('安装失败'))
            }
          },
          fail: () => reject(new Error('下载失败'))
        })

        if (task && typeof task.onProgressUpdate === 'function') {
          task.onProgressUpdate((progress) => {
            this.downloadText = `下载中 ${progress.progress}%`
          })
        }
      })
    },
    openComments() {
      this.activeTab = 'comment'
    },
    setRating(star) {
      this.rating = star
    },
    async submitComment() {
      if (!this.commentText.trim()) {
        uni.showToast({ title: '请输入评论内容', icon: 'none' })
        return
      }
      if (this.rating <= 0) {
        uni.showToast({ title: '请先选择评分', icon: 'none' })
        return
      }
      try {
        const res = await request('software.php', {
          action: 'add_comment',
          id: this.id,
          content: this.commentText.trim(),
          rating: this.rating
        })
        if (res.code === 0) {
          uni.showToast({ title: '评论成功', icon: 'success' })
          this.commentText = ''
          this.rating = 0
          this.loadComments()
          this.loadDetail()
        } else {
          uni.showToast({ title: res.msg || '评论失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      }
    },
    handleReward() {
      // 获取用户信息
      const token = uni.getStorageSync('token')
      const userInfo = uni.getStorageSync('userInfo')
      if (!token && (!userInfo || !userInfo.token)) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          uni.navigateTo({ url: '/pages/user/login' })
        }, 800)
        return
      }
      this.userInfo = userInfo || { token: token }
      this.showRewardModal = true
    },
    selectRewardAmount(amount) {
      this.rewardAmount = amount
      this.isCustomReward = false
      this.customRewardAmount = ''
      this.doReward()
    },
    selectCustomReward() {
      this.isCustomReward = true
    },
    onCustomRewardInput() {
      this.isCustomReward = true
    },
    safeStop() {
      // 阻止事件冒泡
    },
    getActualRewardAmount() {
      if (this.isCustomReward && this.customRewardAmount.trim()) {
        return Number(this.customRewardAmount) || 0
      }
      return this.rewardAmount
    },
    async doReward() {
      if (!this.userInfo || !this.info) return
      if (this.rewardLock) return

      const actualAmount = this.getActualRewardAmount()
      if (actualAmount < 100) {
        uni.showToast({ title: '最低打赏100积分', icon: 'none' })
        return
      }

      const balance = Number(this.userInfo.jifen || 0)
      if (balance < actualAmount) {
        uni.showToast({ title: '积分不足', icon: 'none' })
        return
      }

      this.rewardLock = true
      this.showRewardModal = false

      try {
        const res = await request('software.php', {
          action: 'reward',
          id: this.id,
          amount: actualAmount,
          target_user_id: this.info.user_id
        })
        if (res.code === 0) {
          uni.showToast({ title: '打赏成功', icon: 'success' })
          if (this.info) {
            this.info.reward_count = (this.info.reward_count || 0) + 1
          }
          // 更新用户积分
          if (this.userInfo) {
            this.userInfo.jifen = Math.max(0, (this.userInfo.jifen || 0) - actualAmount)
            uni.setStorageSync('userInfo', this.userInfo)
          }
        } else {
          uni.showToast({ title: res.msg || '打赏失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      } finally {
        this.rewardLock = false
      }
    },
    formatCount(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return 0
      if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
      return num
    },
    formatTime(timeStr) {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        if (hours === 0) {
          const mins = Math.floor(diff / (1000 * 60))
          return mins <= 0 ? '刚刚' : mins + '分钟前'
        }
        return hours + '小时前'
      } else if (days < 7) {
        return days + '天前'
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`
      }
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--cr-surface-alt);
}

.nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx 18rpx;
  background: var(--cr-surface);
}

.nav-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 44rpx;
  height: 44rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.more-btn {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  background: var(--cr-surface-alt);
  transition: background 0.2s;
}

.more-btn:active {
  background: #e8e8e8;
}

.more-icon {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  width: 44rpx;
  height: 24rpx;
}

.more-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #333;
}

.scroll-body {
  height: calc(100vh - 88rpx);
}

/* 头部卡片 */
.header-card {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 28rpx;
  background: var(--cr-surface);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
}

.app-info {
  flex: 1;
}

.app-name {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12rpx;
}

.app-package {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 16rpx;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  padding: 6rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #fff;
}

.tag-item.primary {
  background: var(--cr-surface);
  color: #667eea;
}

/* 数据统计行 */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 32rpx 24rpx;
  background: var(--cr-surface);
  margin: 0 16rpx 16rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-value {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

/* 统计图标 image */
.stat-star-img {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}
.stat-coin-img {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.stat-label {
  font-size: 22rpx;
  color: var(--cr-text-muted);
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: var(--cr-surface-alt);
}

/* Tab切换 */
.tabs-bar {
  display: flex;
  background: var(--cr-surface);
  padding: 0 32rpx;
  margin-bottom: 16rpx;
  border-bottom: 1rpx solid var(--cr-border);
}

.tab-item {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 28rpx 0;
  font-size: 32rpx;
  color: var(--cr-text-muted);
  transition: all 0.3s;
}

.tab-item.active {
  color: #667eea;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  background: #667eea;
  border-radius: 3rpx;
}

.tab-badge {
  padding: 2rpx 12rpx;
  background: #ff4757;
  border-radius: 20rpx;
  font-size: 20rpx;
  color: #fff;
}

/* 详情内容 */
.detail-content {
  padding: 0 16rpx;
}

.images-section {
  margin-bottom: 16rpx;
}

.images-scroll {
  white-space: nowrap;
}

.images-list {
  display: inline-flex;
  gap: 16rpx;
  padding: 8rpx 0;
}

.image-item {
  width: 360rpx;
  height: 240rpx;
  border-radius: 16rpx;
  background: var(--cr-surface-alt);
}

.disclaimer-box {
  padding: 20rpx 24rpx;
  background: #fff3e0;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.disclaimer-text {
  font-size: 24rpx;
  color: #e65100;
  line-height: 1.6;
}

.intro-section {
  padding: 24rpx;
  background: var(--cr-surface);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--cr-text);
  margin-bottom: 16rpx;
}

.intro-text {
  font-size: 26rpx;
  color: var(--cr-text-muted);
  line-height: 1.8;
}

/* 评论预览 */
.review-preview {
  padding: 24rpx;
  background: var(--cr-surface);
  border-radius: 16rpx;
}

.review-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.review-item:last-child {
  border-bottom: none;
}

.review-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--cr-surface-alt);
}

.review-content {
  flex: 1;
}

.review-name {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--cr-text);
  margin-bottom: 8rpx;
}

.review-text {
  font-size: 24rpx;
  color: var(--cr-text-muted);
  line-height: 1.5;
}

.view-all-reviews {
  padding-top: 16rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}
.view-all-arrow {
  width: 24rpx;
  height: 24rpx;
}

.view-all-reviews text {
  font-size: 24rpx;
  color: #667eea;
}

/* 评论内容 */
.comment-content {
  padding: 0 16rpx;
}

/* 星级评分 */
.rating-box {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: var(--cr-surface);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}

.rating-label {
  font-size: 28rpx;
  color: var(--cr-text);
  font-weight: 500;
}

.rating-stars {
  display: flex;
  gap: 8rpx;
}

.star-item {
  padding: 8rpx;
}

.rating-stars .star-svg-img {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.rating-text {
  font-size: 26rpx;
  color: var(--cr-text-muted);
}

.comment-input-box {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  background: var(--cr-surface);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  align-items: flex-end;
}

.comment-input {
  flex: 1;
  min-height: 72rpx;
  max-height: 200rpx;
  font-size: 28rpx;
  padding: 16rpx;
  background: var(--cr-surface-alt);
  border-radius: 12rpx;
  line-height: 1.5;
}

.send-btn {
  padding: 0 32rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #e8e8e8;
  border-radius: 36rpx;
  font-size: 28rpx;
  color: var(--cr-text-muted);
}

.send-btn.active {
  background: #667eea;
  color: #fff;
}

.comment-list {
  background: var(--cr-surface);
  border-radius: 16rpx;
  padding: 16rpx;
}

.comment-item {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--cr-surface-alt);
}

.comment-body {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.comment-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--cr-text);
}

.comment-rating {
  display: flex;
  gap: 2rpx;
}

.comment-star-img {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.comment-time {
  font-size: 22rpx;
  color: var(--cr-text-muted);
}

.comment-text {
  font-size: 26rpx;
  color: var(--cr-text-muted);
  line-height: 1.6;
}

.empty-comments {
  padding: 80rpx 0;
  text-align: center;
  background: var(--cr-surface);
  border-radius: 16rpx;
}

.empty-comments text {
  font-size: 28rpx;
  color: var(--cr-text-muted);
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: var(--cr-surface);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.bottom-left {
  flex-shrink: 0;
}

.reward-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 20rpx;
}

.reward-svg-img {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.reward-text {
  font-size: 20rpx;
  color: var(--cr-text-muted);
}

.download-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 44rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.download-btn.disabled {
  opacity: 0.6;
}

.author-avatar {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

/* 打赏弹窗样式 */
.reward-mask { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.reward-box { width: 580rpx; background: var(--cr-surface); border-radius: 28rpx; padding: 44rpx 36rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.reward-title-row { display: flex; align-items: center; gap: 12rpx; }
.reward-title-svg-img { width: 40rpx; height: 40rpx; flex-shrink: 0; }
.reward-title { font-size: 34rpx; font-weight: 900; color: var(--cr-text); }
.reward-author { font-size: 26rpx; color: var(--cr-text-muted); }

.reward-amount-grid { display: flex; flex-wrap: wrap; gap: 20rpx; width: 100%; justify-content: center; }
.reward-amount-chip { width: 220rpx; height: 80rpx; border-radius: 16rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border: 3rpx solid transparent; }
.reward-amount-chip.active { background: #fff0f0; border-color: #ff2442; }
.reward-amount-chip text { font-size: 28rpx; color: var(--cr-text); font-weight: 700; }
.reward-amount-chip.active text { color: #ff2442; }
.reward-amount-chip.custom-chip { border: 3rpx dashed var(--cr-border); }
.reward-amount-chip.custom-chip.active { border-style: solid; border-color: #ff2442; background: #fff0f0; }
.custom-reward-input { width: 100%; height: 100%; text-align: center; font-size: 28rpx; font-weight: 700; color: var(--cr-text); }
.reward-chip-ph { color: var(--cr-text-muted); font-weight: 400; }
.reward-balance { font-size: 24rpx; color: var(--cr-text-muted); }
.reward-btns { display: flex; width: 100%; gap: 16rpx; margin-top: 12rpx; }
.reward-cancel { flex: 1; height: 80rpx; border-radius: 20rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.reward-cancel text { font-size: 28rpx; color: var(--cr-text-muted); font-weight: 700; }
.reward-confirm { flex: 1; height: 80rpx; border-radius: 20rpx; background: linear-gradient(135deg, #ff2442, #ef4444); display: flex; align-items: center; justify-content: center; }
.reward-confirm.disabled { opacity: 0.5; }
.reward-confirm text { font-size: 28rpx; color: #fff; font-weight: 800; }

/* 更多操作菜单 */
.action-menu-list {
  padding: 16rpx 0;
}

.action-menu-item {
  padding: 28rpx 32rpx;
}

.action-menu-item.danger {
  background: #fff5f5;
}

.action-menu-text {
  font-size: 30rpx;
  color: var(--cr-text);
}

.action-menu-text.danger-text {
  color: #ff4757;
}
</style>