<template>
  <view class="fancy-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-back" @click="goBack">
          <view class="nav-back-arrow"></view>
        </view>
        <text class="nav-title">靓号商城</text>
        <view class="nav-side"></view>
      </view>
    </view>

    <view :style="{ height: statusBarHeight + 44 + 'px' }"></view>

    <!-- 资产卡片（银行卡造型） -->
    <view class="asset-card">
      <view class="asset-card-bg"></view>
      <view class="asset-card-glow1"></view>
      <view class="asset-card-glow2"></view>
      <view class="asset-card-content">
        <view class="asset-card-top">
          <view class="asset-card-brand">
            <view class="brand-mark"></view>
            <text class="brand-name">白鸽·尊享</text>
          </view>
        </view>

        <view class="asset-card-mid">
          <text class="asset-card-label">{{ myInfo.is_fancy ? '当前靓号' : '当前号码' }}</text>
          <view class="asset-card-num-row">
            <text v-if="myInfo.is_fancy" class="asset-card-num gold">{{ myInfo.display_number || '———' }}</text>
            <text v-else-if="myInfo.display_number" class="asset-card-num">{{ myInfo.display_number }}</text>
            <text v-else class="asset-card-num asset-card-num-empty">尚未拥有号码</text>
            <view v-if="myInfo.is_fancy" class="asset-card-tag">
              <view class="tag-dot"></view>
              <text class="tag-text">VIP</text>
            </view>
          </view>
        </view>

        <view class="asset-card-bottom">
          <view class="asset-card-col">
            <text class="col-label">可用余额</text>
            <text class="col-value">¥ {{ parseFloat(myInfo.balance || 0).toFixed(2) }}</text>
          </view>
          <view class="asset-card-action" @click="goWallet">
            <text class="action-text">充值</text>
            <view class="action-arrow"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表标题 -->
    <view class="list-head">
      <view class="list-head-left">
        <text class="lh-title">精选靓号</text>
        <view class="lh-divider"></view>
        <text class="lh-sub">每位用户限购一个</text>
      </view>
      <view class="lh-pill">
        <text class="lh-count">共 {{ total }} 款</text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <scroll-view scroll-x class="filter-bar" show-scrollbar="false">
      <view class="filter-list">
        <view
          v-for="f in filters"
          :key="f.key"
          class="filter-item"
          :class="{ active: activeFilter === f.key }"
          @click="activeFilter = f.key"
        >
          <text class="filter-text">{{ f.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 加载中 -->
    <view v-if="loading && list.length === 0" class="loading-area">
      <view class="spin"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredList.length === 0" class="empty-area">
      <view class="empty-icon">
        <view class="empty-circle"></view>
        <view class="empty-dash"></view>
      </view>
      <text class="empty-txt">{{ list.length === 0 ? '暂无可购买的靓号' : '该分类下暂无靓号' }}</text>
    </view>

    <!-- 靓号列表 -->
    <view v-else class="number-grid">
      <view
        class="number-card"
        :class="getCardClass(item)"
        v-for="item in filteredList"
        :key="item.id"
        @click="openBuy(item)"
      >
        <!-- 顶部光晕装饰 -->
        <view class="nc-glow"></view>

        <!-- 顶部类型标签 + 稀有度 -->
        <view class="nc-header">
          <view class="nc-tag" :class="getFeatureClass(item)">
            <view class="nc-tag-dot"></view>
            <text class="nc-tag-text">{{ getFeatureLabel(item) }}</text>
          </view>
          <view class="nc-level">
            <view class="nc-star" :class="{ on: i <= getLevel(item) }" v-for="i in 3" :key="i"></view>
          </view>
        </view>

        <!-- 号码主体 -->
        <view class="nc-body">
          <view class="nc-num-prefix">
            <text class="nc-num-hash">No.</text>
          </view>
          <text class="nc-num">{{ item.number }}</text>
        </view>

        <!-- 底部价格 + 按钮 -->
        <view class="nc-footer">
          <view class="nc-price-wrap">
            <text class="nc-price-sym">¥</text>
            <text class="nc-price">{{ parseFloat(item.price).toFixed(0) }}</text>
            <text class="nc-price-unit">/ 个</text>
          </view>
          <view class="nc-buy-btn">
            <text class="nc-buy-text">抢购</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading && list.length > 0" class="load-more" @click="loadMore">
      <text class="lm-text">点击加载更多</text>
    </view>
    <view v-if="loading && list.length > 0" class="loading-more">
      <view class="spin spin-sm"></view>
    </view>
    <view v-if="!hasMore && list.length > 0 && filteredList.length > 0" class="end-line">
      <view class="el-bar"></view>
      <text class="el-text">已展示全部靓号</text>
      <view class="el-bar"></view>
    </view>

    <view style="height: 120rpx;"></view>

    <!-- 购买确认弹窗 -->
    <view class="modal-mask" v-if="buyTarget" @click.self="closeBuySheet">
      <view class="buy-sheet" :class="{'sheet-show': buyTarget}">
        <view class="sheet-handle"></view>

        <view class="sheet-header">
          <text class="sheet-title">确认订单</text>
          <view class="sheet-close-btn" @click="closeBuySheet">
            <view class="close-x"></view>
          </view>
        </view>

        <!-- 靓号预览 -->
        <view class="sheet-preview">
          <view class="sp-glow"></view>
          <view class="sp-content">
            <view class="sp-tag">
              <text>{{ getFeatureLabel(buyTarget) }}</text>
            </view>
            <text class="sp-number">{{ buyTarget.number }}</text>
            <view class="sp-meta">
              <text class="sp-meta-text">购买后将成为你的专属靓号</text>
            </view>
          </view>
        </view>

        <!-- 订单明细 -->
        <view class="sheet-rows">
          <view class="sheet-row">
            <text class="sr-label">靓号价格</text>
            <text class="sr-val sr-gold">¥ {{ parseFloat(buyTarget.price).toFixed(2) }}</text>
          </view>
          <view class="sheet-divider"></view>
          <view class="sheet-row">
            <text class="sr-label">当前余额</text>
            <text class="sr-val" :class="myInfo.balance < buyTarget.price ? 'sr-red' : 'sr-dark'">
              ¥ {{ parseFloat(myInfo.balance || 0).toFixed(2) }}
            </text>
          </view>
          <view class="sheet-divider"></view>
          <view class="sheet-row">
            <text class="sr-label">支付方式</text>
            <text class="sr-val sr-dark">余额支付</text>
          </view>
        </view>

        <!-- 密码输入 -->
        <view class="pwd-row">
          <view class="pwd-icon">
            <view class="pwd-lock"></view>
          </view>
          <input
            class="pwd-input"
            v-model="buyPassword"
            type="number"
            password
            placeholder="请输入6位支付密码"
            placeholder-style="color:#BFBFBF"
            maxlength="6"
          />
        </view>

        <view v-if="myInfo.balance < buyTarget.price" class="ins-tip">
          <view class="ins-icon"></view>
          <text class="ins-txt">余额不足，</text>
          <text class="ins-link" @click="goWallet">立即充值 ›</text>
        </view>

        <text class="sheet-notice">购买后将替换当前号码，此操作不可撤销</text>

        <view class="sheet-actions">
          <view class="sa-cancel" @click="closeBuySheet">
            <text class="sa-cancel-text">取消</text>
          </view>
          <view
            class="sa-confirm"
            :class="{ 'sa-disabled': myInfo.balance < buyTarget.price || buying || buyPassword.length < 6 }"
            @click="confirmBuy"
          >
            <view v-if="buying" class="btn-spin"></view>
            <text v-else class="sa-confirm-text">确认支付 ¥{{ parseFloat(buyTarget.price).toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <XhsHUD :show="hud.show" :text="hud.text" :mode="hud.mode" />

    <view v-if="xModal.show" class="xm-mask" @touchmove.stop.prevent @tap.self="closeXModal">
      <view class="xm-panel" @tap.stop>
        <text class="xm-title">{{ xModal.title }}</text>
        <text class="xm-content">{{ xModal.content }}</text>
        <view class="xm-footer">
          <view v-if="xModal.showCancel" class="xm-btn xm-cancel" @tap="closeXModal">取消</view>
          <view class="xm-btn xm-confirm" @tap="confirmXModal">{{ xModal.confirmText }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request, baseUrl } from '@/common/request.js'
import XhsHUD from '@/components/XhsHUD.vue'

export default {
  components: { XhsHUD },
  data() {
    return {
      statusBarHeight: 20,
      list: [],
      total: 0,
      page: 1,
      hasMore: true,
      loading: false,
      myInfo: { display_number: '', is_fancy: 0, balance: 0 },
      buyTarget: null,
      buyPassword: '',
      buying: false,
      hud: { show: false, text: '', mode: 'success' },
      xModal: { show: false, title: '', content: '', showCancel: false, confirmText: '确定', onConfirm: null },
      activeFilter: 'all',
      filters: [
        { key: 'all', label: '全部' },
        { key: 'leopard', label: '豹子号' },
        { key: 'straight', label: '顺子号' },
        { key: 'pair', label: '对子号' },
        { key: 'repeat', label: '重复号' },
      ],
    }
  },
  computed: {
    filteredList() {
      if (this.activeFilter === 'all') return this.list
      return this.list.filter(item => this.getFeatureType(item) === this.activeFilter)
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20
    this.fetchMyInfo()
    this.fetchList(true)
  },
  methods: {
    goBack() { uni.navigateBack() },
    goWallet() { uni.navigateTo({ url: '/pages/user/wallet' }) },

    // 靓号特征识别
    getFeatureType(item) {
      const num = String(item.number || '').replace(/\D/g, '')
      if (!num) return 'normal'
      // 豹子号：3个以上相同数字连续
      if (/(.)\1{2,}/.test(num)) return 'leopard'
      // 顺子号：4个以上连续递增或递减
      const straightMatch = this.checkStraight(num, 4)
      if (straightMatch) return 'straight'
      // 对子号：AABB / ABAB
      if (/(.)\1(.)\2/.test(num) || /(.)(.)\1\2/.test(num)) return 'pair'
      // 重复号：含2个相同数字
      if (/(.)\1{1,}/.test(num)) return 'repeat'
      return 'normal'
    },
    checkStraight(num, minLen) {
      for (let i = 0; i <= num.length - minLen; i++) {
        let asc = true, desc = true
        for (let j = i; j < i + minLen - 1; j++) {
          if (parseInt(num[j+1]) - parseInt(num[j]) !== 1) asc = false
          if (parseInt(num[j+1]) - parseInt(num[j]) !== -1) desc = false
        }
        if (asc || desc) return true
      }
      return false
    },
    getFeatureLabel(item) {
      const t = this.getFeatureType(item)
      const map = { leopard: '豹子号', straight: '顺子号', pair: '对子号', repeat: '重复号', normal: '精选号' }
      return map[t] || '精选号'
    },
    getFeatureClass(item) {
      const t = this.getFeatureType(item)
      return 'tag-' + t
    },
    getCardClass(item) {
      const t = this.getFeatureType(item)
      return 'card-' + t
    },
    getLevel(item) {
      const t = this.getFeatureType(item)
      const price = parseFloat(item.price || 0)
      if (t === 'leopard' && price >= 500) return 3
      if (t === 'straight' && price >= 300) return 3
      if (t === 'leopard' || t === 'straight') return 2
      if (t === 'pair' || price >= 100) return 2
      return 1
    },

    showHUD(text, mode = 'success') {
      this.hud = { show: true, text, mode }
      setTimeout(() => { this.hud.show = false }, 1800)
    },

    showXModal(conf) {
      this.xModal = {
        show: true,
        title: conf.title || '提示',
        content: conf.content || '',
        showCancel: !!conf.showCancel,
        confirmText: conf.confirmText || '确定',
        onConfirm: conf.onConfirm || null,
      }
    },

    closeXModal() { this.xModal.show = false },

    confirmXModal() {
      const cb = this.xModal.onConfirm
      this.closeXModal()
      if (cb) cb()
    },

    closeBuySheet() {
      this.buyTarget = null
      this.buyPassword = ''
    },

    async fetchMyInfo() {
      try {
        const res = await request('fancy.php', { action: 'getMyNumber' })
        if (res.code === 0) {
          this.myInfo = {
            display_number: res.data.display_number || '',
            is_fancy: parseInt(res.data.is_fancy || 0),
            balance: parseFloat(res.data.balance || 0),
          }
        }
      } catch (e) {}
    },

    async fetchList(reset = false) {
      if (this.loading) return
      if (reset) { this.page = 1; this.hasMore = true }
      if (!this.hasMore) return
      this.loading = true
      try {
        const res = await request('fancy.php', { action: 'getList', page: this.page })
        if (res.code === 0) {
          const items = (res.data.list || [])
          if (reset) this.list = items
          else this.list = [...this.list, ...items]
          this.total = res.data.total || 0
          this.hasMore = res.data.has_more || false
          this.page++
        }
      } catch (e) {}
      this.loading = false
    },

    loadMore() { this.fetchList(false) },

    async openBuy(item) {
      try {
        const res = await request('fancy.php', { action: 'getMyNumber' })
        if (res.code === 0) {
          this.myInfo = {
            display_number: res.data.display_number || '',
            is_fancy: parseInt(res.data.is_fancy || 0),
            balance: parseFloat(res.data.balance || 0),
          }
        }
      } catch (e) {}

      if (this.myInfo.is_fancy) {
        this.showXModal({
          title: '您已拥有靓号',
          content: '每人限购一个靓号。如需更换，请联系客服释放当前靓号（释放即放弃当前靓号）。',
          confirmText: '知道了',
        })
        return
      }
      this.buyPassword = ''
      this.buyTarget = item
    },

    async confirmBuy() {
      if (!this.buyTarget || this.buying) return
      if (this.myInfo.balance < this.buyTarget.price) return
      if (this.buyPassword.length < 6) {
        this.showHUD('请输入6位支付密码', 'error')
        return
      }
      this.buying = true
      try {
        const res = await request('fancy.php', {
          action: 'buy',
          id: this.buyTarget.id,
          pay_password: this.buyPassword,
        })
        if (res.code === 0) {
          this.showHUD('购买成功！', 'success')
          this.myInfo.display_number = res.data.display_number
          this.myInfo.is_fancy = 1
          this.myInfo.balance = parseFloat(res.data.balance || 0)
          const cachedUser = uni.getStorageSync('userInfo')
          if (cachedUser) {
            cachedUser.display_number = res.data.display_number
            cachedUser.is_fancy = 1
            cachedUser.balance = parseFloat(res.data.balance || 0)
            uni.setStorageSync('userInfo', cachedUser)
          }
          uni.$emit('fancyNumberChanged', {
            display_number: res.data.display_number,
            is_fancy: 1,
            balance: parseFloat(res.data.balance || 0),
          })
          this.closeBuySheet()
          this.fetchList(true)
        } else if (res.code === -4) {
          this.closeBuySheet()
          uni.showModal({
            title: '未设置支付密码',
            content: res.msg || '请先前往账户安全设置支付密码',
            confirmText: '去设置',
            cancelText: '取消',
            success: (r) => { if(r.confirm) uni.navigateTo({ url: '/pages/user/pay-password' }) }
          })
        } else {
          this.showHUD(res.msg || '购买失败', 'error')
        }
      } catch (e) {
        this.showHUD('网络异常，请重试', 'error')
      }
      this.buying = false
    }
  }
}
</script>
<style scoped>
.fancy-page {
  background: #F5F6F8;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
}

/* ===== 导航栏 ===== */
.nav-bar {
  position: fixed;
  left: 0; right: 0; top: 0;
  z-index: 100;
  background: rgba(245, 246, 248, 0.92);
  backdrop-filter: blur(14px);
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
  padding: 0 28rpx;
}
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
}
.nav-back {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: flex-start;
}
.nav-back-arrow {
  width: 18rpx; height: 18rpx;
  border-left: 4rpx solid #1A1A1A;
  border-bottom: 4rpx solid #1A1A1A;
  transform: rotate(45deg);
  margin-left: 8rpx;
}
.nav-title {
  font-size: 33rpx;
  font-weight: 700;
  color: #1A1A1A;
  letter-spacing: 1rpx;
}
.nav-side { width: 56rpx; }

/* ===== 资产卡片（银行卡造型） ===== */
.asset-card {
  margin: 24rpx 28rpx 0;
  position: relative;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 16rpx 40rpx rgba(26, 26, 26, 0.18);
}
.asset-card-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 50%, #0a0a0c 100%);
}
.asset-card-glow1 {
  position: absolute;
  width: 280rpx; height: 280rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214, 168, 84, 0.25) 0%, transparent 70%);
  right: -80rpx; top: -120rpx;
}
.asset-card-glow2 {
  position: absolute;
  width: 200rpx; height: 200rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214, 168, 84, 0.12) 0%, transparent 70%);
  left: -60rpx; bottom: -60rpx;
}
.asset-card-content {
  position: relative;
  z-index: 1;
  padding: 32rpx 32rpx 28rpx;
}
.asset-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}
.asset-card-brand {
  display: flex; align-items: center; gap: 12rpx;
}
.brand-mark {
  width: 28rpx; height: 28rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #EED29E, #D6A854);
  box-shadow: 0 0 12rpx rgba(214, 168, 84, 0.5);
}
.brand-name {
  font-size: 22rpx;
  color: rgba(238, 210, 158, 0.85);
  font-weight: 500;
  letter-spacing: 2rpx;
}

.asset-card-mid {
  margin-bottom: 36rpx;
}
.asset-card-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2rpx;
  display: block;
  margin-bottom: 12rpx;
}
.asset-card-num-row {
  display: flex; align-items: center; gap: 16rpx;
}
.asset-card-num {
  font-size: 50rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
  color: rgba(255, 255, 255, 0.95);
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}
.asset-card-num.gold {
  background: linear-gradient(135deg, #FFF0D4 0%, #EED29E 50%, #D6A854 100%);
  -webkit-background-clip: text;
  color: transparent;
}
.asset-card-num-empty {
  font-size: 30rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 1rpx;
}
.asset-card-tag {
  display: flex; align-items: center; gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: linear-gradient(135deg, rgba(214, 168, 84, 0.25), rgba(214, 168, 84, 0.1));
  border: 1rpx solid rgba(214, 168, 84, 0.4);
}
.tag-dot {
  width: 8rpx; height: 8rpx;
  border-radius: 50%;
  background: #EED29E;
}
.tag-text {
  font-size: 18rpx;
  color: #EED29E;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.asset-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.08);
}
.asset-card-col {
  display: flex; flex-direction: column; gap: 6rpx;
}
.col-label {
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.45);
}
.col-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}
.asset-card-action {
  display: flex; align-items: center; gap: 6rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #EED29E, #D6A854);
  box-shadow: 0 4rpx 12rpx rgba(214, 168, 84, 0.3);
}
.action-text {
  font-size: 22rpx;
  color: #4A330B;
  font-weight: 700;
}
.action-arrow {
  width: 10rpx; height: 10rpx;
  border-top: 3rpx solid #4A330B;
  border-right: 3rpx solid #4A330B;
  transform: rotate(45deg);
  margin-right: -4rpx;
}

/* ===== 列表标题 ===== */
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 28rpx 16rpx;
}
.list-head-left {
  display: flex; align-items: center; gap: 16rpx;
}
.lh-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #1A1A1A;
  letter-spacing: 1rpx;
}
.lh-divider {
  width: 2rpx; height: 24rpx;
  background: #D9D9D9;
}
.lh-sub {
  font-size: 22rpx;
  color: #999;
}
.lh-pill {
  background: rgba(214, 168, 84, 0.1);
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
  border: 1rpx solid rgba(214, 168, 84, 0.2);
}
.lh-count {
  font-size: 22rpx;
  color: #B48532;
  font-weight: 600;
}

/* ===== 筛选标签 ===== */
.filter-bar {
  padding: 0 28rpx;
  margin-bottom: 20rpx;
  white-space: nowrap;
}
.filter-list {
  display: inline-flex;
  gap: 14rpx;
  padding: 4rpx 0;
}
.filter-item {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 1rpx solid #EBEBEB;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s;
}
.filter-item.active {
  background: #1A1A1A;
  border-color: #1A1A1A;
}
.filter-text {
  font-size: 24rpx;
  color: #595959;
  font-weight: 500;
}
.filter-item.active .filter-text {
  color: #EED29E;
  font-weight: 700;
}

/* ===== 加载/空状态 ===== */
.loading-area, .empty-area {
  display: flex; flex-direction: column;
  align-items: center;
  padding: 140rpx 0 100rpx;
  gap: 24rpx;
}
.empty-icon {
  position: relative;
  width: 96rpx; height: 96rpx;
  display: flex; align-items: center; justify-content: center;
}
.empty-circle {
  position: absolute;
  inset: 0;
  border: 2rpx dashed #D6A854;
  border-radius: 50%;
  opacity: 0.4;
}
.empty-dash {
  width: 36rpx; height: 36rpx;
  border: 2rpx solid #D6A854;
  border-radius: 8rpx;
  opacity: 0.6;
}
.empty-txt {
  font-size: 26rpx;
  color: #BFBFBF;
}
.loading-text {
  font-size: 24rpx;
  color: #999;
}
.spin {
  width: 44rpx; height: 44rpx;
  border: 3rpx solid rgba(214, 168, 84, 0.15);
  border-top-color: #D6A854;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.spin-sm { width: 32rpx; height: 32rpx; border-width: 2rpx; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 靓号卡片网格 ===== */
.number-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 28rpx;
  gap: 18rpx;
}
.number-card {
  width: calc(50% - 9rpx);
  position: relative;
  border-radius: 22rpx;
  padding: 22rpx 22rpx 20rpx;
  box-sizing: border-box;
  background: linear-gradient(155deg, #2c2c2e 0%, #1c1c1e 55%, #0a0a0c 100%);
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.15);
}
.number-card:active {
  transform: scale(0.97);
  box-shadow: 0 3rpx 10rpx rgba(0, 0, 0, 0.2);
}
/* 顶部光晕装饰（按类型变色） */
.nc-glow {
  position: absolute;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  right: -60rpx; top: -80rpx;
  background: radial-gradient(circle, rgba(214, 168, 84, 0.22) 0%, transparent 70%);
  pointer-events: none;
}
.card-leopard .nc-glow { background: radial-gradient(circle, rgba(255, 107, 107, 0.3) 0%, transparent 70%); }
.card-straight .nc-glow { background: radial-gradient(circle, rgba(79, 172, 254, 0.28) 0%, transparent 70%); }
.card-pair .nc-glow { background: radial-gradient(circle, rgba(67, 233, 123, 0.26) 0%, transparent 70%); }
.card-repeat .nc-glow { background: radial-gradient(circle, rgba(250, 112, 154, 0.26) 0%, transparent 70%); }

/* 顶部 */
.nc-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18rpx;
}
.nc-tag {
  display: flex; align-items: center; gap: 6rpx;
  padding: 4rpx 12rpx 4rpx 8rpx;
  border-radius: 999rpx;
  background: rgba(214, 168, 84, 0.18);
  border: 1rpx solid rgba(214, 168, 84, 0.35);
}
.nc-tag-dot {
  width: 8rpx; height: 8rpx;
  border-radius: 50%;
  background: #EED29E;
  box-shadow: 0 0 6rpx rgba(238, 210, 158, 0.6);
}
.tag-leopard { background: rgba(255, 107, 107, 0.18); border-color: rgba(255, 107, 107, 0.4); }
.tag-leopard .nc-tag-dot { background: #FF6B6B; box-shadow: 0 0 6rpx rgba(255, 107, 107, 0.6); }
.tag-leopard .nc-tag-text { color: #FF8A8A; }
.tag-straight { background: rgba(79, 172, 254, 0.18); border-color: rgba(79, 172, 254, 0.4); }
.tag-straight .nc-tag-dot { background: #4facfe; box-shadow: 0 0 6rpx rgba(79, 172, 254, 0.6); }
.tag-straight .nc-tag-text { color: #6DC1FF; }
.tag-pair { background: rgba(67, 233, 123, 0.18); border-color: rgba(67, 233, 123, 0.4); }
.tag-pair .nc-tag-dot { background: #43e97b; box-shadow: 0 0 6rpx rgba(67, 233, 123, 0.6); }
.tag-pair .nc-tag-text { color: #5FF096; }
.tag-repeat { background: rgba(250, 112, 154, 0.18); border-color: rgba(250, 112, 154, 0.4); }
.tag-repeat .nc-tag-dot { background: #FA709A; box-shadow: 0 0 6rpx rgba(250, 112, 154, 0.6); }
.tag-repeat .nc-tag-text { color: #FF8FB3; }
.tag-normal .nc-tag-text { color: #EED29E; }
.nc-tag-text {
  font-size: 19rpx;
  font-weight: 700;
  color: #EED29E;
  letter-spacing: 0.5rpx;
}

/* 稀有度星级 */
.nc-level {
  display: flex; gap: 4rpx;
}
.nc-star {
  width: 10rpx; height: 10rpx;
  background: rgba(255, 255, 255, 0.12);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
.nc-star.on {
  background: #EED29E;
  box-shadow: 0 0 4rpx rgba(238, 210, 158, 0.6);
}

/* 号码主体 */
.nc-body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  margin: 14rpx 0 24rpx;
}
.nc-num-prefix {
  display: flex;
  align-items: center;
}
.nc-num-hash {
  font-size: 18rpx;
  color: rgba(238, 210, 158, 0.55);
  font-weight: 600;
  letter-spacing: 1rpx;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}
.nc-num {
  font-size: 42rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  background: linear-gradient(135deg, #FFF0D4 0%, #EED29E 50%, #D6A854 100%);
  -webkit-background-clip: text;
  color: transparent;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}

/* 底部 */
.nc-footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.08);
}
.nc-price-wrap {
  display: flex; align-items: baseline; gap: 2rpx;
}
.nc-price-sym {
  font-size: 22rpx;
  font-weight: 600;
  color: #EED29E;
}
.nc-price {
  font-size: 34rpx;
  font-weight: 800;
  color: #EED29E;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}
.nc-price-unit {
  font-size: 18rpx;
  color: rgba(238, 210, 158, 0.5);
  margin-left: 2rpx;
}
.nc-buy-btn {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #EED29E 0%, #D6A854 100%);
  box-shadow: 0 4rpx 10rpx rgba(214, 168, 84, 0.3);
}
.nc-buy-text {
  font-size: 22rpx;
  color: #4A330B;
  font-weight: 800;
  letter-spacing: 1rpx;
}

/* ===== 加载更多/结束 ===== */
.load-more {
  text-align: center;
  padding: 36rpx;
}
.lm-text {
  font-size: 23rpx;
  color: #999;
}
.loading-more {
  display: flex; justify-content: center;
  padding: 30rpx;
}
.end-line {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 40rpx 56rpx;
}
.el-bar { flex: 1; height: 1px; background: #E5E5E5; }
.el-text { font-size: 21rpx; color: #BFBFBF; white-space: nowrap; }

/* ===== 购买弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.buy-sheet {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 0 36rpx calc(36rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.buy-sheet.sheet-show { transform: translateY(0); }
.sheet-handle {
  width: 64rpx; height: 8rpx;
  border-radius: 4rpx;
  background: #E5E5E5;
  margin: 20rpx auto 0;
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 0 24rpx;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1A1A1A;
  letter-spacing: 1rpx;
}
.sheet-close-btn {
  width: 52rpx; height: 52rpx;
  border-radius: 50%;
  background: #F5F5F5;
  display: flex; align-items: center; justify-content: center;
}
.close-x {
  position: relative;
  width: 18rpx; height: 18rpx;
}
.close-x::before, .close-x::after {
  content: '';
  position: absolute;
  left: 50%; top: 50%;
  width: 18rpx; height: 2rpx;
  background: #595959;
  transform-origin: center;
}
.close-x::before { transform: translate(-50%, -50%) rotate(45deg); }
.close-x::after { transform: translate(-50%, -50%) rotate(-45deg); }

/* 靓号预览 */
.sheet-preview {
  position: relative;
  background: linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 50%, #0a0a0c 100%);
  border-radius: 24rpx;
  padding: 36rpx 28rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}
.sp-glow {
  position: absolute;
  width: 240rpx; height: 240rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214, 168, 84, 0.3) 0%, transparent 70%);
  right: -80rpx; top: -100rpx;
}
.sp-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}
.sp-tag {
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: rgba(214, 168, 84, 0.18);
  border: 1rpx solid rgba(214, 168, 84, 0.4);
  font-size: 20rpx;
  color: #EED29E;
  font-weight: 700;
}
.sp-number {
  font-size: 64rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
  background: linear-gradient(135deg, #FFF0D4 0%, #EED29E 50%, #D6A854 100%);
  -webkit-background-clip: text;
  color: transparent;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}
.sp-meta {
  margin-top: 4rpx;
}
.sp-meta-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 订单明细 */
.sheet-rows {
  background: #F8F9FA;
  border-radius: 20rpx;
  padding: 0 28rpx;
  margin-bottom: 20rpx;
}
.sheet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 0;
}
.sheet-divider {
  height: 1rpx;
  background: #EDEDED;
}
.sr-label {
  font-size: 27rpx;
  color: #595959;
}
.sr-val {
  font-size: 29rpx;
  font-weight: 700;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}
.sr-gold { color: #D6A854; }
.sr-dark { color: #1A1A1A; }
.sr-red { color: #FF4D4F; }

/* 密码输入 */
.pwd-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #F8F9FA;
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 96rpx;
  margin-bottom: 16rpx;
}
.pwd-icon {
  width: 36rpx; height: 36rpx;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pwd-lock {
  width: 22rpx; height: 18rpx;
  border: 2rpx solid #595959;
  border-radius: 3rpx;
  position: relative;
  margin-top: 6rpx;
}
.pwd-lock::before {
  content: '';
  position: absolute;
  width: 14rpx; height: 10rpx;
  border: 2rpx solid #595959;
  border-bottom: none;
  border-radius: 7rpx 7rpx 0 0;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
}
.pwd-input {
  flex: 1;
  font-size: 30rpx;
  color: #1A1A1A;
  font-family: monospace;
  letter-spacing: 4rpx;
}

/* 余额不足提示 */
.ins-tip {
  padding: 14rpx 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.ins-icon {
  width: 24rpx; height: 24rpx;
  border-radius: 50%;
  background: #FF4D4F;
  position: relative;
  flex-shrink: 0;
}
.ins-icon::before {
  content: '!';
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-size: 18rpx;
  font-weight: 900;
}
.ins-txt { font-size: 24rpx; color: #FF4D4F; }
.ins-link { font-size: 24rpx; color: #D6A854; font-weight: 700; }

.sheet-notice {
  font-size: 21rpx;
  color: #BFBFBF;
  text-align: center;
  display: block;
  margin: 12rpx 0 24rpx;
}

/* 操作按钮 */
.sheet-actions {
  display: flex;
  gap: 16rpx;
}
.sa-cancel {
  flex: 1;
  height: 92rpx;
  border-radius: 18rpx;
  background: #F0F2F5;
  display: flex; align-items: center; justify-content: center;
}
.sa-cancel-text { font-size: 29rpx; color: #595959; font-weight: 600; }
.sa-confirm {
  flex: 2;
  height: 92rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #2c2c2e 0%, #1A1A1A 100%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(26, 26, 26, 0.2);
}
.sa-confirm-text {
  font-size: 29rpx;
  font-weight: 800;
  color: #EED29E;
  letter-spacing: 1rpx;
}
.sa-disabled { opacity: 0.4; box-shadow: none; }
.btn-spin {
  width: 32rpx; height: 32rpx;
  border: 3rpx solid rgba(238, 210, 158, 0.2);
  border-top-color: #EED29E;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* ===== X 模态框 ===== */
.xm-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0,0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 56rpx;
  animation: fadeIn 0.2s ease;
}
.xm-panel {
  width: 100%;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  padding: 52rpx 40rpx 0;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.1);
}
.xm-title {
  font-size: 33rpx;
  font-weight: 800;
  color: #1A1A1A;
  text-align: center;
  display: block;
  margin-bottom: 18rpx;
}
.xm-content {
  font-size: 27rpx;
  color: #595959;
  line-height: 1.6;
  text-align: center;
  display: block;
  margin-bottom: 44rpx;
}
.xm-footer {
  display: flex;
  border-top: 1px solid #F0F0F0;
  margin: 0 -40rpx;
}
.xm-btn {
  flex: 1;
  height: 100rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 29rpx;
  font-weight: 600;
}
.xm-cancel { color: #8C8C8C; border-right: 1px solid #F0F0F0; }
.xm-confirm { color: #D6A854; font-weight: 700; }
</style>
