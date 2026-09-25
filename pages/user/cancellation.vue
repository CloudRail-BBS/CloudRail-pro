<template>
  <view class="cancellation-page">
    <!-- 导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <image src="/static/icon/arrow-left-dark.svg" class="back-arrow" mode="aspectFit"></image>
      </view>
      <text class="nav-title">注销账号</text>
      <view class="nav-right"></view>
    </view>

    <view class="content" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <!-- 已有申请状态 -->
      <view v-if="hasApplication && record" class="status-card">
        <view class="status-header">
          <text class="status-title">我的注销申请</text>
          <text class="status-badge" :class="'status-' + record.status">{{ record.status_text }}</text>
        </view>
        <view class="status-info">
          <view class="info-row">
            <text class="info-label">注销原因</text>
            <text class="info-value">{{ record.reason }}</text>
          </view>
          <view class="info-row" v-if="record.feedback">
            <text class="info-label">详细说明</text>
            <text class="info-value">{{ record.feedback }}</text>
          </view>
          <view class="info-row" v-if="record.contact">
            <text class="info-label">联系方式</text>
            <text class="info-value">{{ record.contact }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">申请时间</text>
            <text class="info-value">{{ record.created_at }}</text>
          </view>
          <view class="info-row" v-if="record.admin_remark">
            <text class="info-label">审核备注</text>
            <text class="info-value">{{ record.admin_remark }}</text>
          </view>
          <view class="info-row" v-if="record.reviewed_at">
            <text class="info-label">审核时间</text>
            <text class="info-value">{{ record.reviewed_at }}</text>
          </view>
        </view>
        <view class="status-actions" v-if="record.status == 0">
          <view class="cancel-btn" hover-class="btn-hover" @click="cancelApplication">取消申请</view>
        </view>
      </view>

      <!-- 注销申请表单 -->
      <view v-else>
        <!-- 警告提示 -->
        <view class="warning-card">
          <view class="warning-icon">!</view>
          <view class="warning-content">
            <text class="warning-title">账号注销须知</text>
            <text class="warning-text">1. 注销后账号将无法登录，所有数据将被清除</text>
            <text class="warning-text">2. 账号内的积分、余额、VIP等权益将全部失效</text>
            <text class="warning-text">3. 已发布的帖子、评论等内容将无法管理</text>
            <text class="warning-text">4. 注销申请提交后需管理员审核，请谨慎操作</text>
          </view>
        </view>

        <!-- 注销原因 -->
        <view class="form-group">
          <text class="form-label">注销原因 <text class="required">*</text></text>
          <view class="reason-list">
            <view
              v-for="(reason, index) in reasonList"
              :key="index"
              class="reason-item"
              :class="{ active: selectedReason === reason }"
              @click="selectedReason = reason"
            >
              <view class="radio-box">
                <view class="radio-inner" v-if="selectedReason === reason"></view>
              </view>
              <text class="reason-text">{{ reason }}</text>
            </view>
          </view>
        </view>

        <!-- 详细说明 -->
        <view class="form-group">
          <text class="form-label">详细说明（选填）</text>
          <textarea
            class="form-textarea"
            v-model="feedback"
            placeholder="请详细说明您的注销原因，以便我们改进服务"
            maxlength="500"
            :cursor-spacing="100"
          />
          <text class="char-count">{{ feedback.length }}/500</text>
        </view>

        <!-- 联系方式 -->
        <view class="form-group">
          <text class="form-label">联系方式（选填）</text>
          <input
            class="form-input"
            v-model="contact"
            placeholder="手机号或邮箱，方便我们联系您"
            maxlength="100"
          />
        </view>

        <!-- 确认勾选 -->
        <view class="confirm-row" @click="agreed = !agreed">
          <view class="checkbox" :class="{ checked: agreed }">
            <text v-if="agreed" class="check-icon">✓</text>
          </view>
          <text class="confirm-text">我已阅读并同意上述注销须知，确认申请注销账号</text>
        </view>

        <!-- 提交按钮 -->
        <view class="submit-btn" :class="{ disabled: !canSubmit }" hover-class="btn-hover" @click="submitApplication">
          {{ submitting ? '提交中...' : '提交注销申请' }}
        </view>
      </view>

      <view class="safe-bottom"></view>
    </view>
  </view>
</template>

<script>
import { request } from '@/common/request.js'

export default {
  data() {
    return {
      statusBarHeight: 20,
      reasonList: [
        '不再使用此账号',
        '想重新注册新账号',
        '对服务不满意',
        '隐私安全顾虑',
        '其他原因'
      ],
      selectedReason: '',
      feedback: '',
      contact: '',
      agreed: false,
      submitting: false,
      hasApplication: false,
      record: null
    }
  },
  computed: {
    canSubmit() {
      return this.selectedReason && this.agreed && !this.submitting
    }
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 20
    this.checkStatus()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async checkStatus() {
      try {
        const res = await request('user/cancellation/status', {}, 'GET')
        if (res.code === 0) {
          this.hasApplication = res.data.has_application
          this.record = res.data.record
        }
      } catch (e) {
        console.error('查询注销状态失败', e)
      }
    },
    async submitApplication() {
      if (!this.canSubmit) {
        if (!this.selectedReason) uni.showToast({ title: '请选择注销原因', icon: 'none' })
        else if (!this.agreed) uni.showToast({ title: '请先同意注销须知', icon: 'none' })
        return
      }

      uni.showModal({
        title: '确认注销',
        content: '您确定要提交注销申请吗？申请通过后账号将被禁用，此操作不可撤销。',
        confirmText: '确认提交',
        confirmColor: '#ff2442',
        success: async (res) => {
          if (!res.confirm) return
          this.submitting = true
          try {
            const result = await request('user/cancellation/submit', {
              reason: this.selectedReason,
              feedback: this.feedback,
              contact: this.contact
            }, 'POST')
            if (result.code === 0) {
              uni.showToast({ title: '申请已提交', icon: 'success' })
              this.checkStatus()
            } else {
              uni.showToast({ title: result.message || '提交失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '网络错误', icon: 'none' })
          } finally {
            this.submitting = false
          }
        }
      })
    },
    async cancelApplication() {
      if (!this.record) return
      uni.showModal({
        title: '取消申请',
        content: '确定要取消注销申请吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            const result = await request('user/cancellation/cancel', {
              id: this.record.id
            }, 'POST')
            if (result.code === 0) {
              uni.showToast({ title: '已取消申请', icon: 'success' })
              this.hasApplication = false
              this.record = null
            } else {
              uni.showToast({ title: result.message || '取消失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.cancellation-page {
  min-height: 100vh;
  background: #f6f7f9;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  z-index: 100;
  border-bottom: 1px solid #eee;
}

.nav-left, .nav-right {
  width: 80px;
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.back-arrow {
  width: 24px;
  height: 24px;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.content {
  padding: 16px;
}

/* 状态卡片 */
.status-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 10px;
}

.status-0 {
  background: #fff7e6;
  color: #fa8c16;
}

.status-1 {
  background: #f6ffed;
  color: #52c41a;
}

.status-2 {
  background: #fff1f0;
  color: #ff4d4f;
}

.status-info {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  margin-bottom: 10px;
  font-size: 14px;
}

.info-label {
  width: 80px;
  color: #999;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: #333;
  word-break: break-all;
}

.status-actions {
  margin-top: 16px;
}

.cancel-btn {
  width: 100%;
  height: 44px;
  line-height: 44px;
  text-align: center;
  background: #f5f5f5;
  color: #666;
  border-radius: 22px;
  font-size: 15px;
}

/* 警告卡片 */
.warning-card {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
}

.warning-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fa8c16;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-title {
  font-size: 15px;
  font-weight: 600;
  color: #d46b08;
  display: block;
  margin-bottom: 8px;
}

.warning-text {
  font-size: 13px;
  color: #8c5a00;
  line-height: 1.8;
  display: block;
}

/* 表单 */
.form-group {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.required {
  color: #ff2442;
}

.reason-list {
  display: flex;
  flex-direction: column;
}

.reason-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.reason-item:last-child {
  border-bottom: none;
}

.reason-item.active .reason-text {
  color: #ff2442;
}

.radio-box {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 50%;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reason-item.active .radio-box {
  border-color: #ff2442;
}

.radio-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff2442;
}

.reason-text {
  font-size: 14px;
  color: #333;
}

.form-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
}

.char-count {
  font-size: 12px;
  color: #999;
  text-align: right;
  display: block;
  margin-top: 6px;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  background: #f8f8f8;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
}

/* 确认勾选 */
.confirm-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 4px;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox.checked {
  background: #ff2442;
  border-color: #ff2442;
}

.check-icon {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.confirm-text {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  flex: 1;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 48px;
  line-height: 48px;
  text-align: center;
  background: linear-gradient(135deg, #ff6b81 0%, #ff2442 100%);
  color: #fff;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.submit-btn.disabled {
  background: #ccc;
}

.btn-hover {
  opacity: 0.8;
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
