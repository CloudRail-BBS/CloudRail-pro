<template>
  <view class="page-container">
    <view class="nav-bar-fixed">
      <view :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content">
        <view class="nav-btn left" @click="handleBack">
          <image src="/static/icon/fanhui.png" class="nav-icon"></image>
        </view>
        <text class="nav-title">{{ editId ? '编辑软件' : '发布软件' }}</text>
        <view class="nav-btn right"></view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="scroll-content">
      <view class="section-card">
        <view class="field-title">软件 Logo</view>
        <view class="logo-upload-box" @click="chooseLogo">
          <image v-if="logo" :src="logo" class="logo-preview" mode="aspectFill"></image>
          <view v-else class="logo-placeholder">
            <text class="plus-symbol">+</text>
            <text class="placeholder-text">上传 Logo</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="field-title">软件介绍图【必须上传3张图，否则发布不了】</view>
        <scroll-view scroll-x class="images-scroll" v-if="images.length > 0">
          <view class="image-item" v-for="(img, idx) in images" :key="idx">
            <image :src="img" class="uploaded-img" mode="aspectFill"></image>
            <view class="delete-btn" @click.stop="deleteImage(idx)">x</view>
          </view>
          <view v-if="images.length < maxSoftwareImages" class="add-more-btn" @click.stop="chooseImages">
            <text class="plus-symbol">+</text>
          </view>
        </scroll-view>
        <view v-else class="placeholder-strip" @click="chooseImages">
          <text class="plus-symbol">+</text>
          <text class="placeholder-text">上传 3-6 张介绍图</text>
        </view>
        <text class="helper-text">当前 {{ images.length }} / {{ maxSoftwareImages }} 张，至少 3 张</text>
      </view>

      <view class="section-card form-section">
        <view class="input-row">
          <input
            class="main-input"
            v-model="name"
            placeholder="软件名字"
            placeholder-class="ph-style"
            maxlength="60"
          />
        </view>
        <view class="divider"></view>
        <view class="input-row">
          <textarea
            class="desc-input"
            v-model="intro"
            placeholder="软件简介"
            placeholder-class="ph-style"
            maxlength="1000"
            :disable-default-padding="true"
            :show-confirm-bar="false"
          ></textarea>
          <text class="word-counter">{{ intro.length }}/1000</text>
        </view>
      </view>

      <view class="section-card meta-section">
        <view class="meta-row">
          <text class="meta-label">软件分类</text>
          <view class="cat-tabs">
            <view
              v-for="cat in categoryOptions"
              :key="cat.id"
              class="cat-tab"
              :class="{ active: categoryId === cat.id }"
              @click="selectCat(cat)"
            >
              <text>{{ cat.icon ? cat.icon + ' ' : '' + cat.name }}</text>
            </view>
          </view>
        </view>
        <view class="divider"></view>
        <view class="meta-row">
          <text class="meta-label">软件版本</text>
          <input class="meta-input" v-model="version" placeholder="例如 2.3.1" placeholder-class="ph-style" maxlength="30" />
        </view>
        <view class="divider"></view>
        <view class="meta-row">
          <text class="meta-label">软件大小</text>
          <input class="meta-input" v-model="size" placeholder="例如 128MB" placeholder-class="ph-style" maxlength="30" />
        </view>
        <view class="divider"></view>
        <view class="meta-row" @click="openChannelPicker">
          <text class="meta-label">软件渠道</text>
          <view class="cat-pick-right">
            <text class="cat-pick-val">{{ selectedChannelName }}</text>
            <text class="arrow-right">›</text>
          </view>
        </view>
        <view class="divider"></view>
        <view class="meta-row">
          <text class="meta-label">APK标签</text>
          <view class="tags-container">
            <view
              v-for="tag in selectedTags"
              :key="tag.id"
              class="selected-tag"
            >
              <text>{{ tag.name }}</text>
              <text class="tag-close" @click.stop="removeTag(tag.id)">×</text>
            </view>
            <view class="add-tag-btn" @click="openTagPicker">
              <text class="plus-symbol">+</text>
            </view>
          </view>
        </view>
        <view class="divider"></view>
        <view class="meta-row">
          <text class="meta-label">下载链接</text>
          <input
            class="meta-input"
            v-model="downloadUrl"
            placeholder="填写 http 或 https 下载链接"
            placeholder-class="ph-style"
          />
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </view>

    <view class="cat-sheet-mask" :class="{ show: showCatSheet }" @tap="closeCatSheet">
      <view class="cat-sheet-panel" @tap.stop="">
        <view class="cat-sheet-title-bar">
          <text class="cat-sheet-title">选择软件分类</text>
        </view>
        <scroll-view scroll-y class="cat-sheet-scroll">
          <view
            v-for="(cat, idx) in categoryOptions"
            :key="cat.id"
            class="cat-sheet-item"
            :class="{
              'cat-first': idx === 0,
              'cat-active': categoryId === cat.id
            }"
            @tap="selectCat(cat)"
          >
            <text>{{ (cat.icon ? cat.icon + ' ' : '') + cat.name }}</text>
            <text v-if="cat.type === 1" class="cat-type-tag">游戏</text>
            <view v-if="categoryId === cat.id" class="cat-check"></view>
          </view>
        </scroll-view>
        <view class="cat-sheet-gap"></view>
        <view class="cat-sheet-cancel" @tap="closeCatSheet">
          <text>取消</text>
        </view>
      </view>
    </view>

    <view class="cat-sheet-mask" :class="{ show: showChannelSheet }" @tap="closeChannelSheet">
      <view class="cat-sheet-panel" @tap.stop="">
        <view class="cat-sheet-title-bar">
          <text class="cat-sheet-title">选择软件渠道</text>
        </view>
        <scroll-view scroll-y class="cat-sheet-scroll">
          <view
            v-for="(ch, idx) in channelOptions"
            :key="ch.id"
            class="cat-sheet-item"
            :class="{
              'cat-first': idx === 0,
              'cat-active': channelId === ch.id
            }"
            @tap="selectChannel(ch)"
          >
            <text>{{ ch.name }}</text>
            <view v-if="channelId === ch.id" class="cat-check"></view>
          </view>
        </scroll-view>
        <view class="cat-sheet-gap"></view>
        <view class="cat-sheet-cancel" @tap="closeChannelSheet">
          <text>取消</text>
        </view>
      </view>
    </view>

    <view class="cat-sheet-mask" :class="{ show: showTagSheet }" @tap="closeTagSheet">
      <view class="cat-sheet-panel tag-sheet" @tap.stop="">
        <view class="cat-sheet-title-bar">
          <text class="cat-sheet-title">选择标签</text>
        </view>
        <scroll-view scroll-y class="cat-sheet-scroll">
          <view class="tags-grid">
            <view
              v-for="tag in tagOptions"
              :key="tag.id"
              class="tag-grid-item"
              :class="{ 'tag-active': isTagSelected(tag.id) }"
              @tap="toggleTag(tag)"
            >
              <text>{{ tag.name }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="cat-sheet-gap"></view>
        <view class="cat-sheet-cancel" @tap="closeTagSheet">
          <text>取消</text>
        </view>
      </view>
    </view>

    <view class="bottom-fixed-area">
      <view class="pub-btn" @click="submit" :class="{ disabled: submitting || !canSubmit }">
        <text>{{ submitting ? '提交中...' : (editId ? '保存修改' : '确认发布') }}</text>
      </view>
    </view>

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
import { request, uploadFile } from '../../common/request.js'
import XhsConfirm from '../../components/XhsConfirm.vue'

export default {
  components: {
    XhsConfirm
  },
  data() {
    return {
      statusBarHeight: 20,
      editId: 0,
      token: '',
      isLogin: false,
      name: '',
      logo: '',
      images: [],
      intro: '',
      categoryId: 0,
      categories: [],
      categoryOptions: [],
      showCatSheet: false,
      channels: [],
      channelOptions: [{ id: 0, name: '未选择' }],
      channelId: 0,
      showChannelSheet: false,
      tags: [],
      tagOptions: [],
      selectedTags: [],
      showTagSheet: false,
      version: '',
      size: '',
      downloadUrl: '',
      minSoftwareImages: 3,
      maxSoftwareImages: 6,
      submitting: false,
      submitSuccess: false,
      confirmDialog: {
        visible: false,
        title: '',
        message: '',
        confirmText: '确定',
        cancelText: '取消',
        resolve: null
      }
    }
  },
  computed: {
    canSubmit() {
      return !!(
        this.name.trim() &&
        this.logo &&
        this.intro.trim() &&
        this.version.trim() &&
        this.size.trim() &&
        this.downloadUrl.trim() &&
        this.images.length >= this.minSoftwareImages
      )
    },
    selectedCatName() {
      const item = this.categories.find(x => Number(x.id) === Number(this.categoryId))
      if (!item) return '未分类'
      return (item.icon ? item.icon + ' ' : '') + item.name
    },
    selectedChannelName() {
      const item = this.channels.find(x => Number(x.id) === Number(this.channelId))
      if (!item) return '未选择'
      return item.name
    },
    softwareType() {
      const cat = this.categories.find(x => Number(x.id) === Number(this.categoryId))
      return cat ? Number(cat.type) : 0
    }
  },
  watch: {
    categoryId(newVal, oldVal) {
      // 仅在用户手动切换分类时清空渠道和标签（编辑加载详情时不清空）
      if (oldVal && this._detailLoaded) {
        this.channelId = 0
        this.selectedTags = []
      }
      this.loadChannels()
      this.loadTags()
    }
  },
  async onLoad(options) {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
    this.editId = parseInt(options.id || 0)
    this.checkLoginState()
    this.loadRuntimeConfig()
    // 先加载分类、渠道、标签列表，确保数据就绪后再加载详情
    await Promise.all([
      this.loadCategories(),
      this.loadChannels(),
      this.loadTags()
    ])
    if (this.editId) this.loadDetail()
  },
  onShow() {
    this.checkLoginState()
    if (!this.isLogin) this.requireLogin()
  },
  methods: {
    checkLoginState() {
      const u = uni.getStorageSync('userInfo')
      const t = uni.getStorageSync('token')
      if (u && t && u.id) {
        this.isLogin = true
        this.token = t
      } else {
        this.isLogin = false
        this.token = ''
      }
    },
    requireLogin() {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => uni.navigateTo({ url: '/pages/login/login' }), 800)
    },
    async loadRuntimeConfig() {
      try {
        const res = await request('software.php', { action: 'get_runtime_config' })
        if (res.code === 0 && res.data) {
          this.minSoftwareImages = parseInt(res.data.min_software_images || 3) || 3
          const max = parseInt(res.data.max_software_images || 6) || 6
          this.maxSoftwareImages = Math.min(6, Math.max(3, max))
        }
      } catch (e) {}
    },
    async loadDetail() {
      try {
        const res = await request('software.php', { action: 'get_detail', id: this.editId })
        if (res.code !== 0 || !res.data) {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
          return
        }
        const data = res.data
        this.name = data.name || ''
        this.logo = data.logo || ''
        this.images = Array.isArray(data.images_arr) ? data.images_arr : []
        this.intro = data.intro || ''
        // 先保存 channelId 和 tagIds，设置 categoryId 触发 watch 重新加载渠道和标签
        const savedChannelId = parseInt(data.channel_id || 0) || 0
        let savedTagIds = []
        if (data.tags) {
          savedTagIds = data.tags.split(',').filter(id => id.trim() && parseInt(id) > 0)
        }
        // 设置 categoryId 会触发 watch 重新加载 channels 和 tags
        this.categoryId = parseInt(data.category_id || 0) || 0
        // 等待 watch 触发的 loadChannels/loadTags 完成
        await Promise.all([this.loadChannels(), this.loadTags()])
        // 恢复 channelId 和 selectedTags
        this.channelId = savedChannelId
        if (savedTagIds.length) {
          this.selectedTags = this.tags.filter(t => savedTagIds.includes(String(t.id)))
        }
        this.version = data.version || ''
        this.size = data.size || ''
        this.downloadUrl = data.download_url || ''
        // 标记详情已加载完成，后续 categoryId 变化为用户手动切换
        this._detailLoaded = true
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      }
    },
    async loadCategories() {
      try {
        const res = await request('software.php', { action: 'get_categories' })
        if (res.code === 0) {
          this.categories = Array.isArray(res.data) ? res.data : []
          this.categoryOptions = this.categories
          // 如果没有选中分类，默认选中第一个
          if (this.categoryId === 0 && this.categoryOptions.length > 0) {
            this.categoryId = Number(this.categoryOptions[0].id)
          }
        }
      } catch (e) {}
    },
    async loadChannels() {
      try {
        const res = await request('software.php', { action: 'get_channels', type: this.softwareType })
        if (res.code === 0) {
          this.channels = Array.isArray(res.data) ? res.data : []
          this.channelOptions = [{ id: 0, name: '未选择' }, ...this.channels]
        }
      } catch (e) {}
    },
    async loadTags() {
      try {
        const res = await request('software.php', { action: 'get_tags', type: this.softwareType })
        if (res.code === 0) {
          this.tags = Array.isArray(res.data) ? res.data : []
          this.tagOptions = this.tags
        }
      } catch (e) {}
    },
    openCatPicker() {
      this.showCatSheet = true
    },
    selectCat(cat) {
      const newId = cat ? Number(cat.id || 0) : 0
      if (newId === this.categoryId) return
      this.categoryId = newId
    },
    closeCatSheet() {
      this.showCatSheet = false
    },
    openChannelPicker() {
      this.showChannelSheet = true
    },
    selectChannel(ch) {
      this.channelId = ch ? Number(ch.id || 0) : 0
      this.showChannelSheet = false
    },
    closeChannelSheet() {
      this.showChannelSheet = false
    },
    openTagPicker() {
      this.showTagSheet = true
    },
    isTagSelected(tagId) {
      return this.selectedTags.some(t => Number(t.id) === Number(tagId))
    },
    toggleTag(tag) {
      const idx = this.selectedTags.findIndex(t => Number(t.id) === Number(tag.id))
      if (idx >= 0) {
        this.selectedTags.splice(idx, 1)
      } else {
        if (this.selectedTags.length >= 3) {
          uni.showToast({ title: '最多选择3个标签', icon: 'none' })
          return
        }
        this.selectedTags.push(tag)
      }
    },
    removeTag(tagId) {
      const idx = this.selectedTags.findIndex(t => Number(t.id) === Number(tagId))
      if (idx >= 0) {
        this.selectedTags.splice(idx, 1)
      }
    },
    closeTagSheet() {
      this.showTagSheet = false
    },
    chooseLogo() {
      if (!this.isLogin) return this.requireLogin()
      uni.chooseImage({
        count: 1,
        success: async (res) => {
          if (!res.tempFilePaths || !res.tempFilePaths[0]) return
          await this.uploadLogo(res.tempFilePaths[0])
        }
      })
    },
    async uploadLogo(filePath) {
      try {
        uni.showLoading({ title: '上传中...' })
        const up = await uploadFile(filePath, { type: 'software', current_count: 0 })
        this.logo = up.url || up.path || ''
      } catch (e) {
        uni.showToast({ title: e.msg || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    chooseImages() {
      if (!this.isLogin) return this.requireLogin()
      const remain = this.maxSoftwareImages - this.images.length
      if (remain <= 0) return
      uni.chooseImage({
        count: remain,
        success: async (res) => {
          const files = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : []
          for (let i = 0; i < files.length; i++) {
            await this.uploadImage(files[i])
          }
        }
      })
    },
    async uploadImage(filePath) {
      if (this.images.length >= this.maxSoftwareImages) return
      try {
        uni.showLoading({ title: '上传中...' })
        const up = await uploadFile(filePath, {
          type: 'software',
          current_count: this.images.length
        })
        const finalUrl = up.url || up.path || ''
        if (finalUrl) {
          this.images = [...this.images, finalUrl]
        }
      } catch (e) {
        uni.showToast({ title: e.msg || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    deleteImage(index) {
      const next = [...this.images]
      next.splice(index, 1)
      this.images = next
    },
    validateDownloadUrl() {
      return /^https?:\/\//i.test(this.downloadUrl.trim())
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
    async submit() {
      if (!this.isLogin) return this.requireLogin()
      if (!this.canSubmit) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' })
        return
      }
      if (this.images.length < this.minSoftwareImages) {
        uni.showToast({ title: `至少上传 ${this.minSoftwareImages} 张介绍图`, icon: 'none' })
        return
      }
      if (!this.validateDownloadUrl()) {
        uni.showToast({ title: '下载链接格式不正确', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const tagIds = this.selectedTags.map(t => t.id).join(',')
        const payload = {
          action: this.editId ? 'update' : 'publish',
          id: this.editId || 0,
          name: this.name.trim(),
          logo: this.logo,
          images: JSON.stringify(this.images),
          intro: this.intro.trim(),
          type: this.softwareType,
          category_id: this.categoryId,
          channel_id: this.channelId,
          tags: tagIds,
          version: this.version.trim(),
          size: this.size.trim(),
          download_url: this.downloadUrl.trim()
        }
        const res = await request('software.php', payload)
        if (res.code === 0) {
          this.submitSuccess = true
          uni.showToast({ title: res.msg || '提交成功', icon: 'success' })
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/software/my_pub' })
          }, 900)
        } else {
          uni.showToast({ title: res.msg || '提交失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e.msg || '网络异常', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    async handleBack() {
      if (!this.submitSuccess && (this.name || this.logo || this.images.length || this.intro || this.version || this.size || this.downloadUrl)) {
        const ok = await this.showConfirmDialog({
          title: '确认退出',
          message: '内容尚未保存，退出后会丢失。',
          confirmText: '退出'
        })
        if (ok) uni.navigateBack()
        return
      }
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f7f8fa;
}

.nav-bar-fixed {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: #fff;
  z-index: 99;
  border-bottom: 1rpx solid #eee;
}

.nav-content {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
}

.nav-btn {
  width: 60rpx;
  height: 100%;
  display: flex;
  align-items: center;
}

.nav-icon {
  width: 44rpx;
  height: 44rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
}

.scroll-content {
  padding: 20rpx 24rpx 0;
}

.section-card {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 18rpx;
  background: #fff;
}

.type-tabs {
  display: flex;
  gap: 20rpx;
}

.type-tab {
  padding: 12rpx 32rpx;
  border-radius: 30rpx;
  font-size: 28rpx;
  color: #666;
  background: #f5f5f5;
  transition: all 0.3s;
}

.type-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.field-title {
  margin-bottom: 18rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.logo-upload-box {
  width: 180rpx;
  height: 180rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: #f5f5f5;
}

.logo-preview {
  width: 100%;
  height: 100%;
}

.logo-placeholder,
.placeholder-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #999;
}

.logo-placeholder {
  width: 100%;
  height: 100%;
}

.placeholder-strip {
  height: 160rpx;
  border-radius: 20rpx;
  background: #f7f8fa;
}

.plus-symbol {
  font-size: 48rpx;
  line-height: 1;
  color: #ff2442;
}

.placeholder-text {
  margin-top: 10rpx;
  font-size: 24rpx;
}

.helper-text {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #999;
}

.images-scroll {
  white-space: nowrap;
}

.image-item,
.add-more-btn {
  position: relative;
  display: inline-flex;
  width: 190rpx;
  height: 190rpx;
  margin-right: 16rpx;
  border-radius: 22rpx;
  overflow: hidden;
  background: #f7f8fa;
}

.uploaded-img {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-more-btn {
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.form-section,
.meta-section {
  padding-top: 6rpx;
}

.input-row,
.meta-row {
  position: relative;
}

.main-input,
.meta-input {
  width: 100%;
  min-height: 88rpx;
  font-size: 30rpx;
  color: #1d1d1f;
}

.desc-input {
  width: 100%;
  min-height: 220rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #1d1d1f;
}

.word-counter {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 22rpx;
  color: #999;
}

.divider {
  height: 1rpx;
  background: #f0f0f0;
}

.meta-row {
  display: flex;
  align-items: center;
  min-height: 90rpx;
}

.textarea-row {
  display: block;
  padding: 24rpx 0 8rpx;
}

.meta-label {
  flex-shrink: 0;
  width: 140rpx;
  font-size: 28rpx;
  color: #333;
}

.cat-tabs {
  flex: 1;
  display: flex;
  gap: 16rpx;
  overflow-x: auto;
}

.cat-tab {
  flex: 0 0 auto;
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
  transition: all 0.3s;
}

.cat-tab.active {
  background: #3b82f6;
  color: #ffffff;
}

.meta-input {
  flex: 1;
  text-align: right;
}

.cat-pick-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 28rpx;
  color: #666;
}

.cat-pick-val {
  max-width: 420rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-right {
  margin-left: 10rpx;
  font-size: 30rpx;
  color: #bbb;
}

.link-input {
  width: 100%;
  min-height: 160rpx;
  margin-top: 18rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #1d1d1f;
}

.ph-style {
  color: #bbb;
}

.bottom-spacer {
  height: 180rpx;
}

.bottom-fixed-area {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #eee;
}

.pub-btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff6b81 0%, #ff2442 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pub-btn.disabled {
  opacity: 0.5;
}

.cat-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0);
  pointer-events: none;
  transition: background 0.25s ease;
}

.cat-sheet-mask.show {
  background: rgba(0, 0, 0, 0.32);
  pointer-events: auto;
}

.cat-sheet-panel {
  position: absolute;
  left: 20rpx;
  right: 20rpx;
  bottom: 20rpx;
  border-radius: 28rpx;
  background: #f5f5f5;
  overflow: hidden;
  transform: translateY(110%);
  transition: transform 0.25s ease;
}

.cat-sheet-mask.show .cat-sheet-panel {
  transform: translateY(0);
}

.cat-sheet-title-bar {
  background: #fff;
  padding: 26rpx 32rpx 18rpx;
  text-align: center;
}

.cat-sheet-title {
  font-size: 26rpx;
  color: #999;
}

.cat-sheet-scroll {
  max-height: 58vh;
  background: #fff;
}

.cat-sheet-item {
  position: relative;
  padding: 28rpx 32rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.cat-type-tag {
  font-size: 22rpx;
  color: #f59e0b;
  background: #fef3c7;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.cat-sheet-item.cat-first {
  border-top: 0;
}

.cat-sheet-item.cat-active {
  color: #ff2442;
  font-weight: 600;
}

.cat-check {
  position: absolute;
  right: 34rpx;
  top: 50%;
  width: 14rpx;
  height: 24rpx;
  border-right: 4rpx solid #ff2442;
  border-bottom: 4rpx solid #ff2442;
  transform: translateY(-60%) rotate(45deg);
}

.cat-sheet-gap {
  height: 14rpx;
  background: #f5f5f5;
}

.cat-sheet-cancel {
  background: #fff;
  text-align: center;
  padding: 28rpx 0 calc(28rpx + env(safe-area-inset-bottom));
  font-size: 32rpx;
  color: #222;
}

.tags-container {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: flex-end;
}

.selected-tag {
  display: flex;
  align-items: center;
  padding: 10rpx 20rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 24rpx;
}

.tag-close {
  margin-left: 12rpx;
  font-size: 32rpx;
  line-height: 1;
}

.add-tag-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tags-grid {
  padding: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-grid-item {
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
  background: #f5f5f5;
  font-size: 28rpx;
  color: #666;
}

.tag-grid-item.tag-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
</style>
