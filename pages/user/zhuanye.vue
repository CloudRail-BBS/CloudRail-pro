<template>
  <view class="cert-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-side" @click="goBack">
          <image src="/static/icon/fanhui.png" class="nav-icon" mode="aspectFit"></image>
        </view>
        <text class="nav-title">权益认证</text>
        <view class="nav-side"></view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="page-scroll"
      :style="{ paddingTop: (statusBarHeight + 44) + 'px', height: 'calc(100vh - ' + (statusBarHeight + 44) + 'px)' }"
    >
      <!-- 顶部用户信息卡片 -->
      <view class="user-card">
        <view class="user-card-deco1"></view>
        <view class="user-card-deco2"></view>
        <view class="user-card-content">
          <image :src="(userInfo && userInfo.avatar) || '/static/logo.png'" class="user-avatar" mode="aspectFill"></image>
          <view class="user-info">
            <text class="user-name">{{ userInfo.name || userInfo.username || '用户' }}</text>
            <view class="user-cert-row">
              <view class="cert-chip" :class="{ active: isVerified(personal) }">
                <text class="cert-chip-dot"></text>
                <text class="cert-chip-text">{{ isVerified(personal) ? '个人已认证' : '个人未认证' }}</text>
              </view>
              <view class="cert-chip" :class="{ active: isVerified(enterprise) }">
                <text class="cert-chip-dot"></text>
                <text class="cert-chip-text">{{ isVerified(enterprise) ? '企业已认证' : '企业未认证' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 规则说明卡片 -->
      <view class="info-card">
        <view class="info-card-head">
          <view class="info-card-icon">
            <text>¥</text>
          </view>
          <text class="info-card-title">认证规则</text>
        </view>
        <view class="info-card-row">
          <text class="info-card-label">申请费用</text>
          <text class="info-card-value">¥{{ Number(rules.cert_fee || 0).toFixed(2) }}</text>
        </view>
        <view class="info-card-divider"></view>
        <view class="info-card-tips">
          <text class="info-card-tip">· 提交认证申请会立即扣费，修改头衔免费</text>
          <text class="info-card-tip">· 通过认证后开通视频发布权限，可创建群聊</text>
          <text class="info-card-tip">· 申请前需已设置支付密码，且绑定邮箱或手机号</text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tab-bar">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'personal' }"
          @click="activeTab = 'personal'"
        >
          <text class="tab-icon-text">个</text>
          <text class="tab-label">个人认证</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'enterprise' }"
          @click="activeTab = 'enterprise'"
        >
          <text class="tab-icon-text">企</text>
          <text class="tab-label">企业认证</text>
        </view>
      </view>

      <!-- 个人认证 -->
      <view v-if="activeTab === 'personal'" class="cert-form-card">
        <!-- 状态横幅 -->
        <view class="status-banner" :class="bannerClass(personal)">
          <view class="status-banner-icon">
            <image v-if="isVerified(personal)" src="/static/icon/check-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
            <image v-else-if="personal.latest.status === 'pending'" src="/static/icon/clock-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
            <image v-else-if="personal.latest.status === 'rejected'" src="/static/icon/x-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
            <image v-else src="/static/icon/alert-circle-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
          </view>
          <view class="status-banner-info">
            <text class="status-banner-title">{{ bannerTitle(personal, '个人') }}</text>
            <text class="status-banner-sub">{{ bannerSub(personal, '个人') }}</text>
          </view>
        </view>

        <!-- 当前头衔展示（已通过时） -->
        <view v-if="isVerified(personal) && personal.approved_title" class="current-cert-box">
          <view class="current-cert-icon">
            <image src="/static/icon/rz.png" class="current-cert-img" mode="aspectFit"></image>
          </view>
          <view class="current-cert-info">
            <text class="current-cert-label">当前认证头衔</text>
            <text class="current-cert-title">{{ personal.approved_title }}</text>
          </view>
        </view>

        <!-- 表单 -->
        <view class="form-section">
          <view class="form-section-title">
            <text class="form-section-bar"></text>
            <text>{{ isVerified(personal) ? '修改头衔' : '填写申请信息' }}</text>
          </view>

          <view class="form-group">
            <text class="form-label">{{ isVerified(personal) ? '新认证头衔' : '申请头衔' }}</text>
            <view class="form-input-wrap">
              <input
                v-model="personalForm.apply_title"
                class="form-input"
                maxlength="16"
                :placeholder="isVerified(personal) ? '输入新的认证头衔' : '例如：摄影博主 / 社区创作者'"
              />
              <text class="form-counter">{{ (personalForm.apply_title || '').length }}/16</text>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">补充说明</text>
            <textarea
              v-model="personalForm.remark"
              class="form-textarea"
              maxlength="120"
              :placeholder="isVerified(personal) ? '说明修改原因，便于审核' : '可填写申请原因、擅长方向等，便于审核'"
            ></textarea>
          </view>
        </view>

        <!-- 审核说明 -->
        <view v-if="personal.latest.review_note" class="review-box">
          <text class="review-box-label">审核说明</text>
          <text class="review-box-text">{{ personal.latest.review_note }}</text>
        </view>

        <!-- 提交按钮 -->
        <view
          class="action-btn"
          :class="{ 'action-btn-modify': isVerified(personal) }"
          @click="submitPersonal"
        >
          <text>{{ isVerified(personal) ? '提交修改头衔申请' : '提交个人认证申请' }}</text>
        </view>

        <view v-if="isVerified(personal)" class="free-tip">
          <text>修改头衔免费，仅需审核</text>
        </view>
      </view>

      <!-- 企业认证 -->
      <view v-else class="cert-form-card">
        <!-- 状态横幅 -->
        <view class="status-banner" :class="bannerClass(enterprise)">
          <view class="status-banner-icon">
            <image v-if="isVerified(enterprise)" src="/static/icon/check-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
            <image v-else-if="enterprise.latest.status === 'pending'" src="/static/icon/clock-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
            <image v-else-if="enterprise.latest.status === 'rejected'" src="/static/icon/x-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
            <image v-else src="/static/icon/alert-circle-white.svg" class="status-banner-icon-img" mode="aspectFit"></image>
          </view>
          <view class="status-banner-info">
            <text class="status-banner-title">{{ bannerTitle(enterprise, '企业') }}</text>
            <text class="status-banner-sub">{{ bannerSub(enterprise, '企业') }}</text>
          </view>
        </view>

        <!-- 当前企业展示 -->
        <view v-if="isVerified(enterprise) && enterprise.approved_name" class="current-cert-box">
          <view class="current-cert-icon enterprise">
            <image src="/static/icon/enterprise-cert.svg" class="current-cert-img" mode="aspectFit"></image>
          </view>
          <view class="current-cert-info">
            <text class="current-cert-label">当前认证企业</text>
            <text class="current-cert-title">{{ enterprise.approved_name }}</text>
          </view>
        </view>

        <!-- 表单 -->
        <view class="form-section">
          <view class="form-section-title">
            <text class="form-section-bar"></text>
            <text>{{ isVerified(enterprise) ? '修改企业认证' : '填写申请信息' }}</text>
          </view>

          <view class="form-group">
            <text class="form-label">企业名称</text>
            <view class="form-input-wrap">
              <input
                v-model="enterpriseForm.company_name"
                class="form-input"
                maxlength="64"
                placeholder="请输入营业执照上的企业全称"
              />
            </view>
          </view>

          <view class="form-row">
            <view class="form-group half">
              <text class="form-label">联系人</text>
              <view class="form-input-wrap">
                <input
                  v-model="enterpriseForm.contact_name"
                  class="form-input"
                  maxlength="32"
                  placeholder="选填"
                />
              </view>
            </view>
            <view class="form-group half">
              <text class="form-label">联系电话</text>
              <view class="form-input-wrap">
                <input
                  v-model="enterpriseForm.contact_phone"
                  class="form-input"
                  maxlength="20"
                  placeholder="选填"
                />
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">营业执照</text>
            <view class="license-upload" @click="chooseLicense">
              <image
                v-if="enterpriseForm.license_image"
                :src="enterpriseForm.license_image"
                class="license-preview"
                mode="aspectFill"
              ></image>
              <view v-else class="license-placeholder">
                <view class="license-plus-circle">
                  <text class="license-plus">＋</text>
                </view>
                <text class="license-text">{{ uploadingLicense ? '上传中...' : '点击上传营业执照' }}</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">补充说明</text>
            <textarea
              v-model="enterpriseForm.remark"
              class="form-textarea"
              maxlength="160"
              placeholder="可填写业务方向、认证用途等，便于后台审核"
            ></textarea>
          </view>
        </view>

        <!-- 审核说明 -->
        <view v-if="enterprise.latest.review_note" class="review-box">
          <text class="review-box-label">审核说明</text>
          <text class="review-box-text">{{ enterprise.latest.review_note }}</text>
        </view>

        <!-- 提交按钮 -->
        <view
          class="action-btn"
          :class="{ 'action-btn-modify': isVerified(enterprise), disabled: uploadingLicense }"
          @click="submitEnterprise"
        >
          <text>{{ isVerified(enterprise) ? '提交修改企业认证申请' : '提交企业认证申请' }}</text>
        </view>

        <view v-if="isVerified(enterprise)" class="free-tip">
          <text>修改企业认证信息免费，仅需审核</text>
        </view>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>

    <PayPasswordModal
      :visible="payDialogVisible"
      :desc="payDialogDesc"
      @cancel="closePayDialog"
      @confirm="handlePayConfirm"
    />
  </view>
</template>

<script>
import { request, uploadFile } from '../../common/request.js'
import PayPasswordModal from '../../components/PayPasswordModal.vue'

function emptyCert() {
  return {
    verified: 0,
    approved_title: '',
    approved_name: '',
    latest: {
      status: 'none',
      apply_title: '',
      company_name: '',
      license_image: '',
      contact_name: '',
      contact_phone: '',
      remark: '',
      review_note: '',
      reviewed_at: '',
      created_at: ''
    }
  }
}

export default {
  components: { PayPasswordModal },
  data() {
    return {
      statusBarHeight: 20,
      activeTab: 'personal',
      uploadingLicense: false,
      payDialogVisible: false,
      payDialogDesc: '',
      pendingSubmitPayload: null,
      userInfo: uni.getStorageSync('userInfo') || {},
      rules: {
        cert_fee: 0,
        need_pay_password: true,
        need_contact_bind: true,
        grant_can_video: true,
        grant_group_create: true
      },
      personal: emptyCert(),
      enterprise: emptyCert(),
      personalForm: {
        apply_title: '',
        remark: ''
      },
      enterpriseForm: {
        company_name: '',
        license_image: '',
        contact_name: '',
        contact_phone: '',
        remark: ''
      }
    }
  },
  onLoad(options) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    if (options && options.tab === 'enterprise') {
      this.activeTab = 'enterprise'
    }
  },
  onShow() {
    this.loadCenter()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    isVerified(cert) {
      return Number(cert && cert.verified || 0) === 1
    },
    statusText(status) {
      if (status === 'pending') return '审核中'
      if (status === 'approved') return '已通过'
      if (status === 'rejected') return '已驳回'
      if (status === 'revoked') return '已撤销'
      return '未申请'
    },
    bannerClass(cert) {
      if (this.isVerified(cert)) return 'success'
      if (cert.latest.status === 'pending') return 'pending'
      if (cert.latest.status === 'rejected') return 'danger'
      return 'neutral'
    },
    bannerTitle(cert, label) {
      if (this.isVerified(cert)) return `${label}认证已通过`
      if (cert.latest.status === 'pending') return `${label}认证审核中`
      if (cert.latest.status === 'rejected') return `${label}认证已驳回`
      if (cert.latest.status === 'revoked') return `${label}认证已撤销`
      return `申请${label}认证`
    },
    bannerSub(cert, label) {
      if (this.isVerified(cert)) {
        const title = cert.approved_title || cert.approved_name || ''
        return title ? `当前：${title}` : '可在下方修改认证信息'
      }
      if (cert.latest.status === 'pending') return '请耐心等待审核结果'
      if (cert.latest.status === 'rejected') return '请根据审核说明修改后重新申请'
      return `填写信息并支付 ¥${Number(this.rules.cert_fee || 0).toFixed(2)} 提交申请`
    },
    getConflictMessage(certType) {
      const current = certType === 'enterprise' ? this.enterprise : this.personal
      const other = certType === 'enterprise' ? this.personal : this.enterprise
      const currentLabel = certType === 'enterprise' ? '企业认证' : '个人认证'
      const otherLabel = certType === 'enterprise' ? '个人认证' : '企业认证'
      if (this.isVerified(current)) {
        return ''
      }
      if ((current.latest && current.latest.status) === 'pending') {
        return `当前${currentLabel}正在审核中，请等待审核结果`
      }
      if (this.isVerified(other)) {
        return `你已完成${otherLabel}，请先撤销当前认证后再申请${currentLabel}`
      }
      if ((other.latest && other.latest.status) === 'pending') {
        return `你已有${otherLabel}申请待审核，请先等待审核结果`
      }
      return ''
    },
    async loadCenter() {
      try {
        const res = await request('user.php', { action: 'getCertificationCenter' })
        if (res.code !== 0) {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
          return
        }

        const data = res.data || {}
        this.userInfo = data.userInfo || this.userInfo
        this.rules = Object.assign({}, this.rules, data.rules || {})
        uni.setStorageSync('userInfo', this.userInfo)

        this.personal = Object.assign(emptyCert(), data.personal || {})
        this.enterprise = Object.assign(emptyCert(), data.enterprise || {})

        this.personalForm.apply_title = this.personal.latest.apply_title || this.personal.approved_title || ''
        this.personalForm.remark = this.personal.latest.remark || ''

        this.enterpriseForm.company_name = this.enterprise.latest.company_name || this.enterprise.approved_name || ''
        this.enterpriseForm.license_image = this.enterprise.latest.license_image || ''
        this.enterpriseForm.contact_name = this.enterprise.latest.contact_name || ''
        this.enterpriseForm.contact_phone = this.enterprise.latest.contact_phone || ''
        this.enterpriseForm.remark = this.enterprise.latest.remark || ''
      } catch (e) {
        uni.showToast({ title: e?.msg || '加载失败', icon: 'none' })
      }
    },
    async chooseLicense() {
      if (this.uploadingLicense) return
      try {
        const choose = await new Promise((resolve, reject) => {
          uni.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: resolve,
            fail: reject
          })
        })

        const filePath = (choose.tempFilePaths || [])[0]
        if (!filePath) return

        this.uploadingLicense = true
        const up = await uploadFile(filePath, { type: 'post' })
        const finalUrl = up.url || up.path || ''
        if (!finalUrl) throw new Error('上传结果异常')
        this.enterpriseForm.license_image = finalUrl
      } catch (e) {
        if (e && e.errMsg && String(e.errMsg).includes('cancel')) return
        uni.showToast({ title: e?.msg || '上传失败', icon: 'none' })
      } finally {
        this.uploadingLicense = false
      }
    },
    async submitPersonal() {
      const conflictMessage = this.getConflictMessage('personal')
      if (conflictMessage) {
        uni.showToast({ title: conflictMessage, icon: 'none' })
        return
      }
      const title = String(this.personalForm.apply_title || '').trim()
      if (title.length < 2 || title.length > 16) {
        uni.showToast({ title: '头衔需 2-16 个字', icon: 'none' })
        return
      }
      const payload = {
        cert_type: 'personal',
        apply_title: title,
        remark: String(this.personalForm.remark || '').trim()
      }
      if (this.isVerified(this.personal)) {
        await this.submitDirectly(payload)
        return
      }
      this.openPayDialog(payload)
    },
    async submitEnterprise() {
      const conflictMessage = this.getConflictMessage('enterprise')
      if (conflictMessage) {
        uni.showToast({ title: conflictMessage, icon: 'none' })
        return
      }
      const companyName = String(this.enterpriseForm.company_name || '').trim()
      if (companyName.length < 2 || companyName.length > 64) {
        uni.showToast({ title: '企业名称需 2-64 个字', icon: 'none' })
        return
      }
      if (!this.enterpriseForm.license_image) {
        uni.showToast({ title: '请先上传营业执照', icon: 'none' })
        return
      }
      const payload = {
        cert_type: 'enterprise',
        company_name: companyName,
        license_image: this.enterpriseForm.license_image,
        contact_name: String(this.enterpriseForm.contact_name || '').trim(),
        contact_phone: String(this.enterpriseForm.contact_phone || '').trim(),
        remark: String(this.enterpriseForm.remark || '').trim()
      }
      if (this.isVerified(this.enterprise)) {
        await this.submitDirectly(payload)
        return
      }
      this.openPayDialog(payload)
    },
    async submitDirectly(payload) {
      uni.showLoading({ title: '提交中...' })
      try {
        const res = await request('user.php', Object.assign({ action: 'submitCertification' }, payload))
        if (res.code === 0) {
          uni.showToast({ title: res.msg || '提交成功', icon: 'none' })
          const submittedType = payload.cert_type
          this.resetFormByType(submittedType)
          const center = res.data && res.data.center
          if (center) {
            this.userInfo = center.userInfo || this.userInfo
            this.rules = Object.assign({}, this.rules, center.rules || {})
            this.personal = Object.assign(emptyCert(), center.personal || {})
            this.enterprise = Object.assign(emptyCert(), center.enterprise || {})
          } else {
            await this.loadCenter()
          }
        } else {
          uni.showToast({ title: res.msg || '提交失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e?.msg || '提交失败，请重试', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    ensureSecurityReady() {
      if (!this.userInfo.has_pay_password) {
        uni.showToast({ title: '请先设置支付密码', icon: 'none' })
        return false
      }
      if (!this.userInfo.has_email && !this.userInfo.has_phone) {
        uni.showToast({ title: '请先绑定邮箱或手机号', icon: 'none' })
        return false
      }
      return true
    },
    openPayDialog(payload) {
      if (!this.ensureSecurityReady()) return
      this.pendingSubmitPayload = Object.assign({}, payload)
      const fee = Number(this.rules.cert_fee || 0).toFixed(2)
      const typeLabel = payload.cert_type === 'enterprise' ? '企业认证' : '个人认证'
      this.payDialogDesc = `申请${typeLabel}将扣除 ¥${fee}，请输入支付密码确认`
      this.payDialogVisible = true
    },
    closePayDialog() {
      this.payDialogVisible = false
      this.payDialogDesc = ''
      this.pendingSubmitPayload = null
    },
    resetFormByType(certType) {
      if (certType === 'enterprise') {
        this.enterpriseForm.company_name = ''
        this.enterpriseForm.license_image = ''
        this.enterpriseForm.contact_name = ''
        this.enterpriseForm.contact_phone = ''
        this.enterpriseForm.remark = ''
        return
      }
      this.personalForm.apply_title = ''
      this.personalForm.remark = ''
    },
    async handlePayConfirm(payPassword, setError, setLoading) {
      if (!this.pendingSubmitPayload) {
        setError('提交参数丢失，请重试')
        return
      }
      setLoading(true)
      try {
        const payload = Object.assign({ action: 'submitCertification', pay_password: payPassword }, this.pendingSubmitPayload)
        const res = await request('user.php', payload)
        if (res.code === 0) {
          const submittedType = this.pendingSubmitPayload.cert_type
          this.closePayDialog()
          this.resetFormByType(submittedType)
          uni.showToast({ title: res.msg || '提交成功', icon: 'none' })
          const center = res.data && res.data.center
          if (center) {
            this.userInfo = center.userInfo || this.userInfo
            this.rules = Object.assign({}, this.rules, center.rules || {})
            this.personal = Object.assign(emptyCert(), center.personal || {})
            this.enterprise = Object.assign(emptyCert(), center.enterprise || {})
          }
          return
        }
        setLoading(false)
        setError(res.msg || '提交失败')
      } catch (e) {
        setLoading(false)
        setError(e?.msg || '提交失败，请重试')
      }
    },
  }
}
</script>

<style scoped>
.cert-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f6fa 0%, #eef0f6 100%);
}

/* === 导航栏 === */
.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}
.nav-content {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}
.nav-side {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
}
.nav-icon { width: 30rpx; height: 30rpx; }
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 800;
  color: #111827;
}

.page-scroll {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 24rpx;
}

/* === 用户信息卡片 === */
.user-card {
  position: relative;
  margin-top: 20rpx;
  padding: 32rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%);
  overflow: hidden;
  box-shadow: 0 12rpx 32rpx rgba(79, 70, 229, 0.25);
}
.user-card-deco1 {
  position: absolute;
  width: 280rpx; height: 280rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  right: -100rpx; top: -120rpx;
}
.user-card-deco2 {
  position: absolute;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  right: 60rpx; bottom: -100rpx;
}
.user-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 22rpx;
}
.user-avatar {
  width: 104rpx; height: 104rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.user-name {
  font-size: 34rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1rpx;
}
.user-cert-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.cert-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}
.cert-chip.active {
  background: rgba(255, 255, 255, 0.95);
}
.cert-chip-dot {
  width: 12rpx; height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
}
.cert-chip.active .cert-chip-dot {
  background: #10b981;
}
.cert-chip-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}
.cert-chip.active .cert-chip-text {
  color: #065f46;
}

/* === 规则说明卡片 === */
.info-card {
  margin-top: 20rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.04);
}
.info-card-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 18rpx;
}
.info-card-icon {
  width: 56rpx; height: 56rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 900;
  color: #d97706;
}
.info-card-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #111827;
}
.info-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.info-card-label {
  font-size: 26rpx;
  color: #6b7280;
}
.info-card-value {
  font-size: 34rpx;
  font-weight: 900;
  color: #dc2626;
}
.info-card-divider {
  height: 1rpx;
  background: #f1f5f9;
  margin: 18rpx 0;
}
.info-card-tips {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.info-card-tip {
  font-size: 23rpx;
  color: #9ca3af;
  line-height: 1.6;
}

/* === Tab 切换 === */
.tab-bar {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
  background: #eef0f6;
  border-radius: 20rpx;
  padding: 8rpx;
}
.tab-item {
  flex: 1;
  height: 80rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  transition: all 0.2s;
}
.tab-item.active {
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.tab-icon-text {
  width: 36rpx; height: 36rpx;
  border-radius: 50%;
  background: #cbd5e1;
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-item.active .tab-icon-text {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
}
.tab-label {
  font-size: 27rpx;
  font-weight: 700;
  color: #6b7280;
}
.tab-item.active .tab-label {
  color: #111827;
}

/* === 认证表单卡片 === */
.cert-form-card {
  margin-top: 20rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.04);
}

/* 状态横幅 */
.status-banner {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}
.status-banner.success {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 1rpx solid #a7f3d0;
}
.status-banner.pending {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1rpx solid #fde68a;
}
.status-banner.danger {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1rpx solid #fecaca;
}
.status-banner.neutral {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1rpx solid #e2e8f0;
}
.status-banner-icon {
  width: 56rpx; height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.status-banner-icon-img {
  width: 32rpx;
  height: 32rpx;
}
.status-banner.success .status-banner-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}
.status-banner.pending .status-banner-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}
.status-banner.danger .status-banner-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}
.status-banner.neutral .status-banner-icon {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
}
.status-banner-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.status-banner-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #111827;
}
.status-banner.success .status-banner-title { color: #065f46; }
.status-banner.pending .status-banner-title { color: #92400e; }
.status-banner.danger .status-banner-title { color: #991b1b; }
.status-banner-sub {
  font-size: 23rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* 当前认证展示 */
.current-cert-box {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 22rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 1rpx solid #fed7aa;
  margin-bottom: 24rpx;
}
.current-cert-icon {
  width: 72rpx; height: 72rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #ffffff 0%, #fff7ed 100%);
  border: 1rpx solid #fed7aa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(249, 115, 22, 0.12);
}
.current-cert-icon.enterprise {
  background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%);
  border: 1rpx solid #bae6fd;
  box-shadow: 0 2rpx 8rpx rgba(14, 165, 233, 0.12);
}
.current-cert-img {
  width: 44rpx; height: 44rpx;
}
.current-cert-emoji {
  color: #fff;
  font-size: 30rpx;
  font-weight: 900;
}
.current-cert-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.current-cert-label {
  font-size: 22rpx;
  color: #6366f1;
  font-weight: 600;
}
.current-cert-icon.enterprise ~ .current-cert-info .current-cert-label {
  color: #0284c7;
}
.current-cert-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1e293b;
}

/* 表单区域 */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}
.form-section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 800;
  color: #111827;
  margin-bottom: 4rpx;
}
.form-section-bar {
  width: 6rpx; height: 28rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #4f46e5 0%, #7c3aed 100%);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.form-group.half { flex: 1; min-width: 0; }
.form-label {
  font-size: 25rpx;
  font-weight: 700;
  color: #374151;
}
.form-input-wrap {
  position: relative;
}
.form-input {
  width: 100%;
  box-sizing: border-box;
  height: 88rpx;
  padding: 0 22rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  font-size: 27rpx;
  color: #111827;
}
.form-counter {
  position: absolute;
  right: 22rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20rpx;
  color: #94a3b8;
  font-weight: 600;
}
.form-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 160rpx;
  padding: 18rpx 22rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  font-size: 27rpx;
  color: #111827;
  line-height: 1.6;
}
.form-row {
  display: flex;
  gap: 16rpx;
}

/* 营业执照上传 */
.license-upload {
  width: 100%;
  height: 240rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx dashed #cbd5e1;
  background: #f8fafc;
}
.license-preview {
  width: 100%; height: 100%;
}
.license-placeholder {
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
}
.license-plus-circle {
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.license-plus {
  font-size: 40rpx;
  color: #4f46e5;
  font-weight: 300;
  line-height: 1;
}
.license-text {
  font-size: 23rpx;
  color: #94a3b8;
}

/* 审核说明 */
.review-box {
  margin-top: 24rpx;
  padding: 22rpx;
  border-radius: 16rpx;
  background: #fef2f2;
  border: 1rpx solid #fecaca;
}
.review-box-label {
  display: block;
  font-size: 22rpx;
  font-weight: 800;
  color: #dc2626;
  margin-bottom: 10rpx;
}
.review-box-text {
  display: block;
  font-size: 24rpx;
  color: #7f1d1d;
  line-height: 1.7;
}

/* 提交按钮 */
.action-btn {
  margin-top: 28rpx;
  height: 96rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
  box-shadow: 0 12rpx 28rpx rgba(79, 70, 229, 0.28);
  transition: all 0.2s;
}
.action-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 6rpx 16rpx rgba(79, 70, 229, 0.24);
}
.action-btn-modify {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  box-shadow: 0 12rpx 28rpx rgba(14, 165, 233, 0.28);
}
.action-btn-modify:active {
  box-shadow: 0 6rpx 16rpx rgba(14, 165, 233, 0.24);
}
.action-btn.disabled {
  opacity: 0.5;
}

/* 免费提示 */
.free-tip {
  margin-top: 16rpx;
  text-align: center;
  font-size: 22rpx;
  color: #0284c7;
  font-weight: 600;
}

.safe-bottom {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
