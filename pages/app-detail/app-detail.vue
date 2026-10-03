<template>
  <view class="detail-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-btn" @click="goBack">
        <image src="/static/icon/arrow-left-dark.svg" class="nav-icon" mode="aspectFit"></image>
      </view>
      <text class="nav-title">应用详情</text>
      <view class="nav-btn" @click="openMore">
        <image src="/static/icon/gengduo.png" class="nav-icon" mode="aspectFit"></image>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="!loaded" class="loading-box">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="!info" class="loading-box">
      <text class="loading-text">软件不存在或已下架</text>
    </view>

    <block v-else>
      <!-- 应用头部 -->
      <view class="app-header">
        <image :src="info.logo || '/static/logo.png'" class="app-icon" mode="aspectFill"></image>
        <view class="app-basic-info">
          <text class="app-name">{{ info.name || '未命名软件' }}</text>
          <text class="app-slogan">{{ shortIntro }}</text>
          <view class="app-meta">
            <text class="app-category">{{ info.category_name || '未分类' }}</text>
            <text class="app-size">{{ info.size || '未知大小' }}</text>
          </view>
          <view class="app-rating">
            <image src="/static/icon/star-yellow.svg" class="star-img" mode="aspectFit"></image>
            <text class="rating-score">{{ info.rating || '0.0' }}</text>
            <text class="rating-count">({{ ratedCount }}个评分)</text>
          </view>
        </view>
      </view>

      <!-- 下载按钮区域 -->
      <view class="download-section">
        <view class="download-info">
          <text class="download-count">{{ formatCount(info.download_count || 0) }}次下载</text>
          <text class="app-version">版本 {{ info.version || '1.0.0' }}</text>
        </view>
        <view class="download-btn" :class="{ downloading: downloading }" @click="handleDownload">
          <text>{{ downloading ? downloadText : '获取' }}</text>
        </view>
      </view>

      <!-- 预览图 -->
      <view class="screenshots-section" v-if="images.length > 0">
        <text class="section-title">预览</text>
        <scroll-view scroll-x class="screenshots-scroll" :show-scrollbar="false">
          <view class="screenshots-list">
            <image
              v-for="(img, index) in images"
              :key="index"
              :src="img"
              class="screenshot-item"
              mode="aspectFill"
              @click="previewImage(index)"
            ></image>
          </view>
        </scroll-view>
      </view>

      <!-- 免责声明 -->
      <view class="disclaimer-box" v-if="disclaimer">
        <text class="disclaimer-text">{{ disclaimer }}</text>
      </view>

      <!-- 应用介绍 -->
      <view class="description-section">
        <text class="section-title">应用介绍</text>
        <view class="description-content" :class="{ expanded: isDescExpanded }">
          <text class="description-text">{{ info.intro || '暂无介绍' }}</text>
        </view>
        <text class="expand-btn" v-if="needExpand" @click="isDescExpanded = !isDescExpanded">
          {{ isDescExpanded ? '收起' : '展开' }}
        </text>
      </view>

      <!-- 应用信息 -->
      <view class="info-section">
        <text class="section-title">信息</text>
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">开发者</text>
            <text class="info-value">{{ info.author_name || info.user_nickname || '匿名用户' }}</text>
          </view>
          <view class="info-item" v-if="info.package_name">
            <text class="info-label">包名</text>
            <text class="info-value">{{ info.package_name }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">大小</text>
            <text class="info-value">{{ info.size || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">版本</text>
            <text class="info-value">{{ info.version || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">类别</text>
            <text class="info-value">{{ info.category_name || '-' }}</text>
          </view>
          <view class="info-item" v-if="info.channel_name">
            <text class="info-label">渠道</text>
            <text class="info-value">{{ info.channel_name }}</text>
          </view>
          <view class="info-item" v-if="info.tags_text">
            <text class="info-label">标签</text>
            <text class="info-value">{{ info.tags_text }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">更新时间</text>
            <text class="info-value">{{ info.time_ago || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 评价 -->
      <view class="reviews-section">
        <view class="reviews-header">
          <text class="section-title">评价</text>
          <text class="reviews-count">{{ commentCount }}条评价</text>
        </view>

        <!-- 评分总览 -->
        <view class="rating-overview" v-if="ratedCount > 0">
          <view class="rating-big">
            <text class="big-score">{{ info.rating || '0.0' }}</text>
            <image src="/static/icon/stars-5-gold.svg" class="big-stars" mode="aspectFit"></image>
            <text class="big-count">{{ ratedCount }}个评分</text>
          </view>
          <view class="rating-bars">
            <view class="rating-bar" v-for="i in 5" :key="i">
              <text class="bar-label">{{ 6 - i }}星</text>
              <view class="bar-track">
                <view class="bar-fill" :style="{ width: distPercent(6 - i) + '%' }"></view>
              </view>
            </view>
          </view>
        </view>

        <!-- 发表评价 -->
        <view class="write-review">
          <view class="write-stars">
            <text class="write-label">评分</text>
            <view
              v-for="star in 5"
              :key="star"
              class="star-item"
              @click="setRating(star)"
            >
              <image
                class="write-star-img"
                :src="star <= myRating ? '/static/icon/star-yellow.svg' : '/static/icon/star-empty.svg'"
                mode="aspectFit"
              ></image>
            </view>
            <text class="write-score">{{ myRating > 0 ? myRating + '分' : '点击评分' }}</text>
          </view>
          <view class="write-input-row">
            <textarea
              v-model="commentText"
              class="write-input"
              placeholder="说说你对这个软件的看法..."
              confirm-type="send"
              @confirm="submitComment"
            />
            <view class="send-btn" :class="{ active: canSubmit }" @click="submitComment">
              <text>发送</text>
            </view>
          </view>
        </view>

        <!-- 评价列表 -->
        <view class="reviews-list" v-if="comments.length > 0">
          <view class="review-item" v-for="item in comments" :key="item.id">
            <image :src="item.avatar || '/static/logo.png'" class="reviewer-avatar" mode="aspectFill"></image>
            <view class="review-body">
              <view class="review-header">
                <text class="reviewer-name">{{ item.name || item.username || '匿名' }}</text>
                <view class="review-stars-row">
                  <image
                    v-for="star in 5"
                    :key="star"
                    class="review-star-img"
                    :src="star <= (item.rating || 0) ? '/static/icon/star-yellow.svg' : '/static/icon/star-empty.svg'"
                    mode="aspectFit"
                  ></image>
                </view>
                <text class="review-date">{{ item.time_ago || formatTime(item.create_time) }}</text>
              </view>
              <text class="review-content">{{ item.content }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-reviews">
          <text>暂无评价，快来发表第一条评价吧</text>
        </view>
      </view>

      <!-- 类似应用 -->
      <view class="similar-section" v-if="similarApps.length > 0">
        <text class="section-title">类似应用</text>
        <view class="similar-list">
          <view class="similar-item" v-for="app in similarApps" :key="app.id" @click="goAppDetail(app.id)">
            <image :src="app.icon || '/static/logo.png'" class="similar-icon" mode="aspectFill"></image>
            <view class="similar-info">
              <text class="similar-name">{{ app.name || app.title }}</text>
              <text class="similar-category">{{ app.category_name || '未分类' }}</text>
              <view class="similar-rating">
                <image src="/static/icon/star-yellow.svg" class="similar-star-img" mode="aspectFit"></image>
                <text class="similar-score">{{ app.rating || '0.0' }}</text>
              </view>
            </view>
            <text class="similar-arrow">›</text>
          </view>
        </view>
      </view>

      <view style="height: 200rpx;"></view>
    </block>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="loaded && info">
      <view class="reward-btn" @click="handleReward">
        <image class="reward-svg-img" src="/static/icon/reward-red.svg" mode="aspectFit" />
        <text class="reward-text">打赏</text>
      </view>
      <view class="bottom-download" :class="{ disabled: downloading }" @click="handleDownload">
        <text>{{ downloading ? downloadText : '下载 ' + (info.size || '') }}</text>
      </view>
      <image
        v-if="info.avatar"
        :src="info.avatar"
        class="author-avatar"
        mode="aspectFill"
        @click="goAuthor"
      ></image>
    </view>

    <!-- 打赏弹窗 -->
    <view class="reward-mask" v-if="showRewardModal" @touchmove.stop.prevent @tap="showRewardModal = false">
      <view class="reward-box" @tap.stop>
        <view class="reward-title-row">
          <image class="reward-title-svg-img" src="/static/icon/reward-red.svg" mode="aspectFit" />
          <text class="reward-title">打赏作者</text>
        </view>
        <text class="reward-author">打赏给：{{ info && (info.author_name || info.user_nickname) || '匿名用户' }}</text>

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
            />
          </view>
        </view>

        <view class="reward-balance">
          <text>当前积分：{{ (userInfo && userInfo.jifen) || 0 }}</text>
        </view>

        <view class="reward-btns">
          <view class="reward-cancel" @click="showRewardModal = false"><text>取消</text></view>
          <view class="reward-confirm" :class="{ disabled: rewardLock }" @click.stop="doReward"><text>确认打赏</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request, webBaseUrl } from '../../common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      id: 0,
      loaded: false,
      info: null,
      images: [],
      isDescExpanded: false,
      downloading: false,
      downloadText: '下载中...',
      comments: [],
      commentCount: 0,
      commentText: '',
      myRating: 0,
      similarApps: [],
      showRewardModal: false,
      rewardAmount: 100,
      isCustomReward: false,
      customRewardAmount: '',
      rewardLock: false,
      userInfo: null
    }
  },
  computed: {
    /* 简介首行，用于头部副标题 */
    shortIntro() {
      const text = String((this.info && this.info.intro) || '').trim()
      if (!text) return '暂无简介'
      const firstLine = text.split('\n')[0].trim()
      return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine
    },
    /* 简介较长时才显示展开按钮 */
    needExpand() {
      return String((this.info && this.info.intro) || '').length > 80
    },
    disclaimer() {
      const text = String((this.info && this.info.disclaimer) || '').trim()
      return text || '该软件为用户上传，仅供学习用途，请在下载后24小时内删除，如造成您的利益受损，请联系我们删除。'
    },
    /* 有评分的评价数量 */
    ratedCount() {
      return this.comments.filter(c => Number(c.rating) > 0).length
    },
    canSubmit() {
      return !!this.commentText.trim() && this.myRating > 0
    },
    canManage() {
      const user = uni.getStorageSync('userInfo') || {}
      if (Number(user.is_admin || 0) === 1) return true
      return !!(this.info && Number(this.info.can_manage) === 1)
    }
  },
  onLoad(options) {
    this.id = parseInt(options.id || 0)
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
    if (!this.id) {
      uni.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => this.goBack(), 900)
      return
    }
    this.loadDetail()
    this.loadComments()
  },
  onShareAppMessage() {
    return {
      title: (this.info && this.info.name) || '软件推荐',
      path: `/pages/app-detail/app-detail?id=${this.id}`,
      imageUrl: (this.info && this.info.logo) || '/static/logo.png'
    }
  },
  onShareTimeline() {
    return {
      title: (this.info && this.info.name) || '软件推荐',
      query: `id=${this.id}`,
      imageUrl: (this.info && this.info.logo) || '/static/logo.png'
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goAppDetail(id) {
      if (!id || Number(id) === Number(this.id)) return
      uni.navigateTo({ url: `/pages/app-detail/app-detail?id=${id}` })
    },
    goAuthor() {
      const uid = this.info && this.info.user_id
      if (!uid) return
      uni.navigateTo({ url: `/pages/user/profile?userId=${uid}` })
    },
    async loadDetail() {
      try {
        const res = await request('software.php', { action: 'get_detail', id: this.id })
        if (res.code !== 0 || !res.data) {
          this.loaded = true
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
          return
        }
        this.info = res.data
        this.images = Array.isArray(res.data.images_arr) ? res.data.images_arr : []
        this.loaded = true
        this.loadSimilar()
      } catch (e) {
        this.loaded = true
        uni.showToast({ title: '网络异常', icon: 'none' })
      }
    },
    async loadComments() {
      try {
        const res = await request('software.php', { action: 'get_comments', id: this.id, size: 50 })
        if (res.code === 0 && Array.isArray(res.data)) {
          this.comments = res.data
          this.commentCount = res.data.length
        }
      } catch (e) {
      }
    },
    /* 同类推荐：同分类下取若干条，排除自己 */
    async loadSimilar() {
      const cid = Number((this.info && this.info.category_id) || 0)
      if (cid <= 0) return
      try {
        const res = await request('software.php', { action: 'get_list', category_id: cid, page: 1, size: 6 })
        if (res.code === 0 && Array.isArray(res.data)) {
          this.similarApps = res.data
            .filter(s => Number(s.id) !== Number(this.id))
            .slice(0, 4)
        }
      } catch (e) {
      }
    },
    previewImage(index) {
      uni.previewImage({
        current: this.images[index],
        urls: this.images
      })
    },
    setRating(star) {
      this.myRating = star
    },
    async submitComment() {
      if (!this.commentText.trim()) {
        uni.showToast({ title: '请输入评论内容', icon: 'none' })
        return
      }
      if (this.myRating <= 0) {
        uni.showToast({ title: '请先选择评分', icon: 'none' })
        return
      }
      try {
        const res = await request('software.php', {
          action: 'add_comment',
          id: this.id,
          content: this.commentText.trim(),
          rating: this.myRating
        })
        if (res.code === 0) {
          uni.showToast({ title: '评论成功', icon: 'success' })
          this.commentText = ''
          this.myRating = 0
          this.loadComments()
          this.loadDetail()
        } else {
          uni.showToast({ title: res.msg || '评论失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      }
    },
    /* 某星级占比 */
    distPercent(star) {
      if (!this.ratedCount) return 0
      const count = this.comments.filter(c => Number(c.rating) === Number(star)).length
      return Math.round((count / this.ratedCount) * 100)
    },
    formatCount(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return 0
      if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
      return num
    },
    formatTime(timeStr) {
      if (!timeStr) return ''
      const date = new Date(String(timeStr).replace(/-/g, '/'))
      if (isNaN(date.getTime())) return ''
      const diff = Date.now() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        if (hours === 0) {
          const mins = Math.floor(diff / (1000 * 60))
          return mins <= 0 ? '刚刚' : mins + '分钟前'
        }
        return hours + '小时前'
      }
      if (days < 7) return days + '天前'
      return `${date.getMonth() + 1}/${date.getDate()}`
    },
    openMore() {
      const items = ['分享链接']
      if (this.canManage) {
        items.push('编辑软件')
        items.push('删除软件')
      }
      uni.showActionSheet({
        itemList: items,
        success: (res) => {
          const action = items[res.tapIndex]
          if (action === '分享链接') this.copyShareLink()
          if (action === '编辑软件') uni.navigateTo({ url: '/pages/software/publish?id=' + this.id })
          if (action === '删除软件') this.confirmDelete()
        }
      })
    },
    copyShareLink() {
      const title = (this.info && this.info.name) || '这个软件不错'
      const text = `我发现一个不错的软件，快来看看：\n${title}\n${this.getShareLink()}`
      uni.setClipboardData({
        data: text,
        success: () => uni.showToast({ title: '分享链接已复制', icon: 'none' })
      })
    },
    getShareLink() {
      return `${webBaseUrl}/#/pages/app-detail/app-detail?id=${this.id}`
    },
    confirmDelete() {
      uni.showModal({
        title: '确认删除',
        content: '删除后不可恢复，确定继续吗？',
        confirmText: '删除',
        confirmColor: '#ff4757',
        success: async (res) => {
          if (!res.confirm) return
          try {
            const ret = await request('software.php', { action: 'delete', id: this.id })
            uni.showToast({ title: ret.msg || '操作完成', icon: 'none' })
            if (ret.code === 0) setTimeout(() => this.goBack(), 800)
          } catch (e) {
            uni.showToast({ title: '网络异常', icon: 'none' })
          }
        }
      })
    },
    async fetchDownloadUrl() {
      const res = await request('software.php', { action: 'download', id: this.id })
      if (res.code !== 0 || !res.data || !res.data.download_url) {
        throw new Error(res.msg || '下载地址获取失败')
      }
      if (this.info) {
        this.info.download_count = parseInt(res.data.downloads || this.info.download_count || 0)
      }
      return res.data.download_url
    },
    async handleDownload() {
      if (this.downloading) return
      if (!this.info || !this.info.download_url) {
        uni.showToast({ title: '该软件暂无可下载文件', icon: 'none' })
        return
      }
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
    /* App 端：apk/wgt 自动下载安装，其余交给系统打开 */
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
    handleReward() {
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
    getActualRewardAmount() {
      if (this.isCustomReward && this.customRewardAmount.trim()) {
        return Number(this.customRewardAmount) || 0
      }
      return this.rewardAmount
    },
    async doReward() {
      if (!this.userInfo || !this.info || this.rewardLock) return

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
            this.info.reward_count = Number(this.info.reward_count || 0) + 1
          }
          if (this.userInfo) {
            this.userInfo.jifen = Math.max(0, Number(this.userInfo.jifen || 0) - actualAmount)
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
    }
  }
}
</script>

<style scoped>
.detail-page {
  background: #f5f5f7;
  min-height: 100vh;
}

/* 导航栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx 20rpx;
  background: #fff;
}

.nav-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 40rpx;
  height: 40rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #000;
}

.loading-box {
  padding: 200rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* 应用头部信息 */
.app-header {
  display: flex;
  padding: 30rpx;
  background: #fff;
  gap: 30rpx;
}

.app-icon {
  width: 180rpx;
  height: 180rpx;
  border-radius: 40rpx;
  flex-shrink: 0;
  background: #f5f5f7;
}

.app-basic-info {
  flex: 1;
  min-width: 0;
}

.app-name {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #000;
  margin-bottom: 8rpx;
}

.app-slogan {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.app-meta {
  display: flex;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.app-category,
.app-size {
  font-size: 22rpx;
  color: #999;
}

.app-rating {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.star-img {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

.rating-score {
  font-size: 26rpx;
  font-weight: 600;
  color: #000;
}

.rating-count {
  font-size: 22rpx;
  color: #999;
}

/* 下载区域 */
.download-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx 30rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.download-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.download-count {
  font-size: 24rpx;
  color: #666;
}

.app-version {
  font-size: 22rpx;
  color: #999;
}

.download-btn {
  min-width: 160rpx;
  height: 64rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #007aff;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 32rpx;
}

.download-btn.downloading {
  background: #e3f2fd;
  color: #007aff;
}

/* 预览图 */
.screenshots-section {
  background: #fff;
  padding: 30rpx 0;
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #000;
  padding: 0 30rpx;
  margin-bottom: 20rpx;
}

.screenshots-scroll {
  white-space: nowrap;
}

.screenshots-list {
  display: inline-flex;
  padding: 0 30rpx;
  gap: 16rpx;
}

.screenshot-item {
  width: 280rpx;
  height: 480rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: #f5f5f7;
}

/* 免责声明 */
.disclaimer-box {
  margin: 0 20rpx 20rpx;
  padding: 20rpx 24rpx;
  background: #fff3e0;
  border-radius: 12rpx;
}

.disclaimer-text {
  font-size: 24rpx;
  color: #e65100;
  line-height: 1.6;
}

/* 应用介绍 */
.description-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.description-content {
  max-height: 220rpx;
  overflow: hidden;
}

.description-content.expanded {
  max-height: none;
}

.description-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.7;
  white-space: pre-line;
}

.expand-btn {
  display: block;
  font-size: 24rpx;
  color: #007aff;
  margin-top: 16rpx;
}

/* 应用信息 */
.info-section {
  background: #fff;
  padding: 30rpx 0;
  margin-bottom: 20rpx;
}

.info-list {
  padding: 0 30rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f7;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  max-width: 440rpx;
  text-align: right;
  word-break: break-all;
}

/* 评价 */
.reviews-section {
  background: #fff;
  padding: 30rpx 0;
  margin-bottom: 20rpx;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30rpx;
}

.reviews-count {
  font-size: 24rpx;
  color: #999;
}

.rating-overview {
  display: flex;
  padding: 20rpx 30rpx;
  gap: 40rpx;
  border-bottom: 1rpx solid #f5f5f7;
}

.rating-big {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.big-score {
  font-size: 72rpx;
  font-weight: bold;
  color: #000;
}

.big-stars {
  width: 140rpx;
  height: 28rpx;
}

.big-count {
  font-size: 20rpx;
  color: #999;
}

.rating-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12rpx;
}

.rating-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.bar-label {
  font-size: 20rpx;
  color: #999;
  width: 44rpx;
}

.bar-track {
  flex: 1;
  height: 8rpx;
  background: #f5f5f7;
  border-radius: 4rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #ffb800;
  border-radius: 4rpx;
}

/* 发表评价 */
.write-review {
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f7;
}

.write-stars {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.write-label {
  font-size: 26rpx;
  color: #333;
  margin-right: 8rpx;
}

.star-item {
  padding: 4rpx;
}

.write-star-img {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
}

.write-score {
  font-size: 24rpx;
  color: #999;
  margin-left: 8rpx;
}

.write-input-row {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.write-input {
  flex: 1;
  min-height: 72rpx;
  max-height: 200rpx;
  padding: 16rpx;
  background: #f5f5f7;
  border-radius: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
}

.send-btn {
  padding: 0 32rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8e8e8;
  border-radius: 36rpx;
  font-size: 28rpx;
  color: #999;
}

.send-btn.active {
  background: #007aff;
  color: #fff;
}

/* 评价列表 */
.reviews-list {
  padding: 0 30rpx;
}

.review-item {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f7;
}

.review-item:last-child {
  border-bottom: none;
}

.reviewer-avatar {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f5f5f7;
}

.review-body {
  flex: 1;
  min-width: 0;
}

.review-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 10rpx;
}

.reviewer-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #000;
}

.review-stars-row {
  display: flex;
  gap: 2rpx;
}

.review-star-img {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.review-date {
  font-size: 20rpx;
  color: #999;
}

.review-content {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.empty-reviews {
  padding: 60rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-reviews text {
  font-size: 26rpx;
  color: #999;
}

/* 类似应用 */
.similar-section {
  background: #fff;
  padding: 30rpx 0 10rpx;
}

.similar-list {
  padding: 0 30rpx;
}

.similar-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f7;
}

.similar-item:last-child {
  border-bottom: none;
}

.similar-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
  background: #f5f5f7;
}

.similar-info {
  flex: 1;
  min-width: 0;
}

.similar-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #000;
  margin-bottom: 6rpx;
}

.similar-category {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.similar-rating {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.similar-star-img {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.similar-score {
  font-size: 22rpx;
  color: #999;
}

.similar-arrow {
  font-size: 40rpx;
  color: #ccc;
  margin-left: 16rpx;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.reward-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  flex-shrink: 0;
}

.reward-svg-img {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.reward-text {
  font-size: 20rpx;
  color: #666;
}

.bottom-download {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.bottom-download.disabled {
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

/* 打赏弹窗 */
.reward-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reward-box {
  width: 580rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 44rpx 36rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.reward-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.reward-title-svg-img {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.reward-title {
  font-size: 34rpx;
  font-weight: 900;
  color: #111827;
}

.reward-author {
  font-size: 26rpx;
  color: #6b7280;
}

.reward-amount-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  width: 100%;
  justify-content: center;
}

.reward-amount-chip {
  width: 220rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid transparent;
}

.reward-amount-chip.active {
  background: #fff0f0;
  border-color: #ff2442;
}

.reward-amount-chip text {
  font-size: 28rpx;
  color: #374151;
  font-weight: 700;
}

.reward-amount-chip.active text {
  color: #ff2442;
}

.reward-amount-chip.custom-chip {
  border: 3rpx dashed #d1d5db;
}

.reward-amount-chip.custom-chip.active {
  border-style: solid;
  border-color: #ff2442;
  background: #fff0f0;
}

.custom-reward-input {
  width: 100%;
  height: 100%;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #374151;
}

.reward-chip-ph {
  color: #9ca3af;
  font-weight: 400;
}

.reward-balance {
  font-size: 24rpx;
  color: #9ca3af;
}

.reward-btns {
  display: flex;
  width: 100%;
  gap: 16rpx;
  margin-top: 12rpx;
}

.reward-cancel {
  flex: 1;
  height: 80rpx;
  border-radius: 20rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reward-cancel text {
  font-size: 28rpx;
  color: #6b7280;
  font-weight: 700;
}

.reward-confirm {
  flex: 1;
  height: 80rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #ff2442, #ef4444);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reward-confirm.disabled {
  opacity: 0.5;
}

.reward-confirm text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 800;
}
</style>
