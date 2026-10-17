<template>
  <view class="detail-page" :class="themeClass">
    <!-- 顶部导航 -->
    <view class="nav-bar always-solid" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-btn" @click="goBack">
          <view class="nav-back-arrow"></view>
        </view>
        <text class="nav-title-text">{{ info.title || '商品详情' }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }" @scroll="onPageScroll" @scrolltolower="() => {}">
      <!-- 图片轮播 -->
      <view class="hero-wrap">
        <scroll-view scroll-x class="hero-scroll" :show-scrollbar="false" @scroll="heroScroll">
          <view class="hero-img-item" v-for="(img, idx) in displayImages" :key="idx">
            <image :src="img" mode="widthFix" class="hero-img" @click="previewImg(idx)"></image>
          </view>
        </scroll-view>
        <view class="hero-indicator" v-if="displayImages.length > 1">
          <view class="indicator-current">{{ currentImageIndex + 1 }}</view>
          <view class="indicator-sep">/</view>
          <view class="indicator-total">{{ displayImages.length }}</view>
        </view>
      </view>

      <!-- 价格+标题卡片 -->
      <view class="main-card">
        <text class="goods-title">{{ info.title }}</text>
        <view class="price-area">
          <view class="price-left">
            <view class="price-main">
              <text class="currency">¥</text>
              <text class="amount">{{ info.price }}</text>
            </view>
            <view class="price-tip">
              <text>优惠价</text>
            </view>
          </view>
          <view class="price-right">
            <view class="type-badge" :class="info.product_type == 1 ? 'physical' : 'virtual'">
              <view class="badge-dot"></view>
              <text>{{ info.product_type == 1 ? '实体' : '虚拟' }}</text>
            </view>
            <view class="cat-badge" v-if="info.category_id > 0 && info.category_name">
              <text>{{ info.category_name }}</text>
            </view>
          </view>
          <view class="stock-row">
            <text class="stock-label">库存</text>
            <text class="stock-val" :class="{ 'soldout': isSoldOut }">{{ isSoldOut ? '已售罄' : '库存 ' + (Number(info.stock) || 0) + (info.product_type == 1 ? ' 件' : ' 份') }}</text>
          </view>
        </view>
      </view>

      <!-- 服务保障卡片 -->
      <view class="service-card">
        <view class="service-head">
          <view class="service-head-bar"></view>
          <text class="service-head-title">服务保障</text>
        </view>
        <view class="service-list">
          <view class="service-item">
            <view class="service-icon shield"></view>
            <view class="service-text-wrap">
              <text class="service-text">平台担保</text>
              <text class="service-sub">资金安全有保障</text>
            </view>
          </view>
          <view class="service-item">
            <view class="service-icon check"></view>
            <view class="service-text-wrap">
              <text class="service-text">极速发货</text>
              <text class="service-sub">卖家快速响应</text>
            </view>
          </view>
          <view class="service-item">
            <view class="service-icon refund"></view>
            <view class="service-text-wrap">
              <text class="service-text">售后无忧</text>
              <text class="service-sub">问题可申诉</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 卖家卡片 -->
      <view class="seller-card">
        <view class="seller-left">
          <view class="seller-avatar-wrap">
            <image :src="info.avatar || '/static/logo.png'" class="seller-avatar" mode="aspectFill"></image>
            <view class="seller-cert-badge" v-if="info.personal_verified || info.enterprise_verified">
              <view class="cert-check"></view>
            </view>
          </view>
          <view class="seller-info">
            <view class="seller-name-row">
              <text class="seller-name">{{ info.seller_name }}</text>
              <view class="seller-tag">
                <text>信誉卖家</text>
              </view>
              <view class="seller-tag">
                <text>平台入驻</text>
              </view>
            </view>
          </view>
        </view>
        <view class="seller-contact-btn" @click="handleContact">
          <view class="contact-icon"></view>
          <text>联系</text>
        </view>
        <view class="seller-contact-btn seller-edit-btn" v-if="isOwner" @click="goEdit" style="margin-left:16rpx;">
          <text>编辑</text>
        </view>
      </view>

      <!-- 宝贝详情 -->
      <view class="desc-card">
        <view class="desc-header">
          <text class="desc-title">宝贝详情</text>
          <view class="desc-line"></view>
        </view>
        <view class="desc-content">
          <text class="desc-text">{{ info.content }}</text>
        </view>
      </view>

      <view style="height: 120rpx;"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bb-buy-btn" :class="{ 'soldout': isSoldOut }" @click="openPayModal">
        <text class="bb-buy-text">{{ isSoldOut ? '已售罄' : '立即购买' }}</text>
      </view>
    </view>

    <!-- 购买弹窗 -->
    <view class="sheet-mask" v-if="showPayModal" @click="showPayModal = false" @touchmove.stop.prevent>
      <view class="pay-sheet" @click.stop>
        <view class="sheet-handle"></view>
        <view class="sheet-close" @click="showPayModal = false">
          <view class="close-x"></view>
        </view>

        <!-- 商品预览 -->
        <view class="sheet-goods">
          <view class="sheet-thumb-wrap">
            <image :src="info.image" class="sheet-thumb" mode="aspectFill"></image>
            <view class="sheet-thumb-tag" v-if="info.product_type == 1">
              <text>实体</text>
            </view>
            <view class="sheet-thumb-tag virtual" v-else>
              <text>虚拟</text>
            </view>
          </view>
          <view class="sheet-goods-info">
            <text class="sheet-goods-title">{{ info.title }}</text>
            <view class="sheet-goods-price-row">
              <text class="sheet-goods-sym">¥</text>
              <text class="sheet-goods-price">{{ info.price }}</text>
            </view>
            <text class="sheet-goods-tip">购买后请在订单中心查看进度</text>
          </view>
        </view>

        <!-- 表单 -->
        <view class="form-list">
          <view class="form-item">
            <view class="form-label-wrap">
              <text class="form-label">联系方式</text>
              <text class="form-required">*</text>
            </view>
            <input class="form-input" type="number" v-model="buyPhone" placeholder="请输入联系方式" placeholder-class="ph" />
          </view>
          <block v-if="info.product_type == 1">
            <view class="form-item">
              <view class="form-label-wrap">
                <text class="form-label">收件人</text>
                <text class="form-required">*</text>
              </view>
              <input class="form-input" v-model="buyShippingName" placeholder="收件人姓名" placeholder-class="ph" />
            </view>
            <view class="form-item">
              <view class="form-label-wrap">
                <text class="form-label">收件手机</text>
                <text class="form-required">*</text>
              </view>
              <input class="form-input" type="number" v-model="buyShippingPhone" placeholder="收件人手机号" placeholder-class="ph" />
            </view>
            <view class="form-item addr-item">
              <view class="form-label-wrap">
                <text class="form-label">收货地址</text>
                <text class="form-required">*</text>
              </view>
              <textarea class="form-input form-textarea" v-model="buyShippingAddress" placeholder="省/市/区/详细地址" placeholder-class="ph" :show-confirm-bar="false"></textarea>
            </view>
          </block>
          <view class="form-item">
            <view class="form-label-wrap">
              <text class="form-label">支付密码</text>
              <text class="form-required">*</text>
            </view>
            <input class="form-input pwd-input" type="number" maxlength="6" v-model="buyPwd" placeholder="请输入6位支付密码" placeholder-class="ph" password />
          </view>
        </view>

        <!-- 底部 -->
        <view class="sheet-footer">
          <view class="sheet-total-row">
            <text class="sheet-total-label">实付款</text>
            <view class="sheet-total-price-wrap">
              <text class="sheet-total-sym">¥</text>
              <text class="sheet-total-price">{{ info.price }}</text>
            </view>
          </view>
          <view class="sheet-confirm-btn" @click="doBuy">
            <text class="sheet-confirm-text">提交订单</text>
          </view>
        </view>
      </view>
    </view>

    <!-- HUD -->
    <view class="hud-mask" v-if="hud.visible" @touchmove.stop.prevent>
      <view class="hud-box">
        <view v-if="hud.type === 'loading'" class="hud-spinner"></view>
        <view v-if="hud.type === 'success'" class="hud-success"></view>
        <view v-if="hud.type === 'error'" class="hud-error">!</view>
        <text class="hud-text">{{ hud.text }}</text>
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
import { request, baseUrl } from '../../common/request.js';
import XhsConfirm from '../../components/XhsConfirm.vue';

export default {
    components: { XhsConfirm },
    data() {
        return {
            statusBarHeight: 20,
            id: 0,
            info: {},
            displayImages: [],
            currentImageIndex: 0,
            token: '',
            isLogin: false,
            navSolid: false,

            showPayModal: false,

            buyPhone: '',
            buyPwd: '',
            buyShippingName: '',
            buyShippingPhone: '',
            buyShippingAddress: '',

            confirmDialog: {
                visible: false,
                title: '',
                message: '',
                confirmText: '确定',
                cancelText: '取消',
                resolve: null
            },
            hud: { visible: false, type: 'loading', text: '' }
        };
    },
    computed: {
        isSoldOut() {
            return Number(this.info && this.info.stock) <= 0;
        },
        isOwner() {
            if (this.info.is_owner !== undefined) return !!this.info.is_owner;
            const u = uni.getStorageSync('userInfo') || {};
            const myUid = u.uid || u.id || '';
            const ownerId = this.info.user_id || this.info.uid || '';
            return !!myUid && !!ownerId && String(myUid) === String(ownerId);
        }
    },
    onLoad(opt) {
        this.id = opt.id;
        this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20;
        this.checkLoginState();
        this.loadInfo();
    },
    onShow() {
        this.checkLoginState();
    },
    methods: {
        goBack() { uni.navigateBack(); },

        onPageScroll(e) {
            const top = e.detail.scrollTop || 0;
            this.navSolid = top > 200;
        },

        checkLoginState() {
            const u = uni.getStorageSync('userInfo');
            const t = uni.getStorageSync('token');
            if (u && t && u.id) {
                this.isLogin = true;
                this.token = t;
            } else {
                this.isLogin = false;
                this.token = '';
            }
        },

        requireLogin() {
            if (!this.isLogin) {
                uni.showToast({ title: '请先登录', icon: 'none' });
                setTimeout(() => { uni.navigateTo({ url: '/pages/login/login' }); }, 1000);
                return false;
            }
            return true;
        },

        showHud(text, type = 'loading') {
            this.hud = { visible: true, text, type };
            if (type !== 'loading') {
                setTimeout(() => { this.hud.visible = false; }, 1500);
            }
        },
        hideHud() { this.hud.visible = false; },

        showConfirmDialog(options) {
            return new Promise((resolve) => {
                this.confirmDialog = {
                    visible: true,
                    title: options.title || '',
                    message: options.message || '',
                    confirmText: options.confirmText || '确定',
                    cancelText: options.cancelText || '取消',
                    resolve
                };
            });
        },
        closeConfirmDialog(result) {
            const resolve = this.confirmDialog.resolve;
            this.confirmDialog = {
                visible: false,
                title: '',
                message: '',
                confirmText: '确定',
                cancelText: '取消',
                resolve: null
            };
            if (resolve) resolve(result);
        },
        handleConfirmOk() { this.closeConfirmDialog(true); },
        handleConfirmCancel() { this.closeConfirmDialog(false); },

        previewImg(idx) {
            const allImages = this.displayImages.length > 0 ? this.displayImages : [this.info.image];
            uni.previewImage({ urls: allImages, current: allImages[idx] || allImages[0] });
        },

        heroScroll(e) {
            const scrollLeft = e.detail.scrollLeft;
            const itemWidth = uni.getSystemInfoSync().windowWidth;
            this.currentImageIndex = Math.round(scrollLeft / itemWidth);
        },

        parseDisplayImages(info) {
            const list = [];
            const push = (url) => {
                const v = String(url || '').trim();
                if (v && !list.includes(v)) list.push(v);
            };

            const raw = info && info.images;
            if (Array.isArray(raw)) {
                raw.forEach(push);
            } else if (typeof raw === 'string' && raw.trim()) {
                const text = raw.trim();
                if (text.startsWith('[')) {
                    try {
                        const arr = JSON.parse(text);
                        if (Array.isArray(arr)) arr.forEach(push);
                    } catch (e) {
                        text.split(',').forEach(push);
                    }
                } else {
                    text.split(',').forEach(push);
                }
            }

            if (list.length === 0) push(info && info.image);
            return list;
        },

        async loadInfo() {
            try {
                const res = await request('market.php', { action: 'get_detail', id: this.id });
                if (res.code === 0) {
                    this.info = res.data;
                    this.displayImages = this.parseDisplayImages(this.info);
                }
            } catch (e) {}
        },

        handleContact() {
            if (!this.requireLogin()) return;
            this.goChat();
        },

        goEdit() {
            if (!this.requireLogin()) return;
            if (!this.info || !this.id) return;
            uni.navigateTo({ url: '/pages/market/publish?id=' + this.id });
        },

        goChat() {
            const targetId = this.info.user_id || this.info.uid || (this.info.seller && (this.info.seller.uid || this.info.seller.id)) || '';
            const name = this.info.seller_name || '卖家';
            const avatar = this.info.avatar || '/static/logo.png';
            uni.navigateTo({
                url: `/pages/message/chat?targetId=${targetId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`,
                fail: () => this.showHud('打开聊天页失败', 'error')
            });
        },

        openPayModal() {
            if (!this.requireLogin()) return;
            if (this.isSoldOut) return this.showHud('商品已售罄', 'error');
            this.buyPhone = '';
            this.buyPwd = '';
            this.buyShippingName = '';
            this.buyShippingPhone = '';
            this.buyShippingAddress = '';
            this.showPayModal = true;
        },

        async doBuy() {
            if (!this.buyPhone || !this.buyPwd) return this.showHud('请填写完整信息', 'error');
            if (this.buyPwd.length < 6) return this.showHud('请输入6位支付密码', 'error');
            if (this.info.product_type == 1) {
                if (!this.buyShippingName) return this.showHud('请填写收件人', 'error');
                if (!this.buyShippingPhone) return this.showHud('请填写收件手机', 'error');
                if (!this.buyShippingAddress) return this.showHud('请填写收货地址', 'error');
            }
            this.showHud('支付中...');
            const buyData = {
                action: 'buy', id: this.id,
                phone: this.buyPhone, pay_password: this.buyPwd,
                shipping_name: this.buyShippingName,
                shipping_phone: this.buyShippingPhone,
                shipping_address: this.buyShippingAddress
            };
            try {
                const res = await request('market.php', buyData);
                this.hideHud();
                if (res.code === 0) {
                    this.showPayModal = false;
                    this.showHud('购买成功', 'success');
                    setTimeout(() => { uni.redirectTo({ url: '/pages/market/orders' }); }, 1500);
                } else if (res.code === -4) {
                    this.showPayModal = false;
                    const ok = await this.showConfirmDialog({
                        title: '未设置支付密码',
                        message: res.msg || '请先前往账户安全设置支付密码',
                        confirmText: '去设置',
                        cancelText: '取消'
                    });
                    if (ok) uni.navigateTo({ url: '/pages/user/pay-password' });
                } else if (res.code === -3) {
                    this.showHud('余额不足', 'error');
                } else if (res.code === -2) {
                    this.showHud('登录已过期', 'error');
                    setTimeout(() => { uni.redirectTo({ url: '/pages/login/login' }); }, 1500);
                } else {
                    this.showHud(res.msg || '购买失败', 'error');
                }
            } catch (e) {
                this.hideHud();
                this.showHud('网络错误', 'error');
            }
        }
    }
}
</script>

<style scoped>
view, text, image, input, textarea { box-sizing: border-box; }

.detail-page {
  min-height: 100vh;
  background: #F4F5F7;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

/* === 导航栏 === */
.nav-bar {
  position: fixed; top: 0; left: 0; width: 100%;
  z-index: 999; pointer-events: none;
  transition: background 0.25s ease, box-shadow 0.25s ease;
}
.nav-bar.solid {
  background: var(--cr-surface);
  box-shadow: 0 1rpx 0 rgba(0,0,0,0.04);
  pointer-events: all;
}
.nav-bar.always-solid {
  background: var(--cr-surface);
  box-shadow: 0 1rpx 0 rgba(0,0,0,0.04);
  pointer-events: all;
}
.nav-row {
  height: 44px;
  display: flex; align-items: center;
  padding: 0 24rpx;
  gap: 12rpx;
}
.nav-btn {
  width: 64rpx; height: 64rpx;
  background: rgba(255,255,255,0.92);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  pointer-events: all;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1);
}
.nav-bar.solid .nav-btn {
  background: var(--cr-surface-alt);
  box-shadow: none;
}
.nav-bar.always-solid .nav-btn {
  background: var(--cr-surface-alt);
  box-shadow: none;
}
.nav-title-text {
  flex: 1;
  font-size: 30rpx; font-weight: 700;
  color: #1A1A1A;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 16rpx;
  box-sizing: border-box;
}
.nav-spacer { flex: 1; }
.nav-back-arrow {
  width: 18rpx; height: 18rpx;
  border-left: 4rpx solid #1A1A1A;
  border-bottom: 4rpx solid #1A1A1A;
  transform: rotate(45deg);
  margin-left: 6rpx;
}

.scroll-body {
  height: 100vh;
  box-sizing: border-box;
}

/* === 图片轮播 === */
.hero-wrap {
  width: 100%;
  background: var(--cr-surface);
  position: relative;
  border-radius: 0 0 32rpx 32rpx;
  overflow: hidden;
}
.hero-scroll { width: 100%; white-space: nowrap; }
.hero-img-item { display: inline-block; width: 100%; vertical-align: top; }
.hero-img { width: 100%; display: block; background: var(--cr-surface-alt); }
.hero-indicator {
  position: absolute; right: 24rpx; bottom: 36rpx;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(8px);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  display: flex; align-items: baseline; gap: 4rpx;
}
.indicator-current {
  font-size: 26rpx;
  color: #fff;
  font-weight: 700;
  font-family: 'SF Pro Display', Arial, sans-serif;
}
.indicator-sep {
  font-size: 20rpx;
  color: rgba(255,255,255,0.5);
}
.indicator-total {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  font-family: 'SF Pro Display', Arial, sans-serif;
}

/* === 主信息卡片 === */
.main-card {
  background: var(--cr-surface);
  padding: 20rpx 24rpx 18rpx;
  margin: 16rpx 16rpx 0;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03);
}
.price-area {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.price-left {
  display: flex; align-items: center; gap: 12rpx;
}
.price-main {
  display: flex; align-items: baseline;
  color: #FF2F00;
}
.currency { font-size: 30rpx; font-weight: 700; margin-right: 2rpx; }
.amount {
  font-size: 64rpx; font-weight: 800;
  line-height: 1.1; letter-spacing: -2rpx;
  font-family: 'SF Pro Display', Arial, sans-serif;
  display: inline-block;
  vertical-align: middle;
}
.price-tip {
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #FF6900, #FF2200);
  border-radius: 6rpx;
}
.price-tip text {
  font-size: 18rpx; color: #fff;
  font-weight: 700;
}

.price-right {
  display: flex; gap: 8rpx; align-items: center;
}
.stock-row {
  display: flex; align-items: center; gap: 12rpx;
  padding-top: 14rpx; margin-top: 14rpx;
  border-top: 1rpx solid #F5F5F5;
}
.stock-label {
  font-size: 24rpx; color: var(--cr-text-muted); font-weight: 500;
}
.stock-val {
  font-size: 26rpx; color: #1677FF; font-weight: 700;
}
.stock-val.soldout {
  color: #FF2F00;
}
.type-badge {
  display: flex; align-items: center; gap: 6rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx; font-weight: 700;
}
.badge-dot {
  width: 8rpx; height: 8rpx;
  border-radius: 50%;
}
.type-badge.physical {
  background: #EAF3FF; color: #1677FF;
}
.type-badge.physical .badge-dot { background: #1677FF; }
.type-badge.virtual {
  background: #FFF4E5; color: #FF6900;
}
.type-badge.virtual .badge-dot { background: #FF6900; }
.cat-badge {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: var(--cr-surface-alt);
  font-size: 20rpx; color: var(--cr-text-muted);
  font-weight: 500;
}

.goods-title {
  font-size: 34rpx; font-weight: 700;
  color: #1A1A1A; line-height: 1.5;
  display: block;
  margin-bottom: 12rpx;
}

/* === 服务保障卡片 === */
.service-card {
  background: var(--cr-surface);
  margin: 16rpx 16rpx 0;
  padding: 28rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03);
}
.service-head {
  display: flex; align-items: center; gap: 12rpx;
  margin-bottom: 24rpx;
}
.service-head-bar {
  width: 6rpx; height: 28rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #FF6900, #FF2200);
}
.service-head-title {
  font-size: 30rpx; font-weight: 800;
  color: #1A1A1A;
}
.service-list {
  display: flex;
  gap: 16rpx;
}
.service-item {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center;
  padding: 20rpx 8rpx;
  background: var(--cr-canvas);
  border-radius: 16rpx;
  gap: 10rpx;
}
.service-icon {
  width: 40rpx; height: 40rpx;
  flex-shrink: 0;
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
.service-icon.shield::before {
  content: '';
  position: absolute;
  inset: 2rpx;
  background: #FFF4E5;
  clip-path: polygon(50% 0, 100% 20%, 100% 65%, 50% 100%, 0 65%, 0 20%);
  border-radius: 4rpx;
}
.service-icon.shield::after {
  content: '';
  position: absolute;
  width: 12rpx; height: 6rpx;
  border-left: 3rpx solid #FF6900;
  border-bottom: 3rpx solid #FF6900;
  transform: rotate(-45deg);
  top: 50%; left: 50%;
  margin-left: -6rpx;
  margin-top: -5rpx;
}
.service-icon.check::before {
  content: '';
  position: absolute;
  inset: 2rpx;
  background: #F0F9EB;
  border-radius: 50%;
}
.service-icon.check::after {
  content: '';
  position: absolute;
  width: 14rpx; height: 7rpx;
  border-left: 3rpx solid #52C41A;
  border-bottom: 3rpx solid #52C41A;
  transform: rotate(-45deg);
  top: 50%; left: 50%;
  margin-left: -7rpx;
  margin-top: -6rpx;
}
.service-icon.refund::before {
  content: '';
  position: absolute;
  inset: 2rpx;
  background: #EAF3FF;
  border-radius: 50%;
}
.service-icon.refund::after {
  content: '';
  position: absolute;
  width: 16rpx; height: 16rpx;
  border: 3rpx solid #1677FF;
  border-radius: 50%;
  border-top-color: transparent;
  border-right-color: transparent;
  transform: rotate(-45deg);
  top: 50%; left: 50%;
  margin-left: -8rpx;
  margin-top: -8rpx;
}
.service-text-wrap {
  display: flex; flex-direction: column;
  align-items: center; gap: 4rpx;
}
.service-text {
  font-size: 24rpx;
  color: #1A1A1A;
  font-weight: 700;
}
.service-sub {
  font-size: 19rpx;
  color: var(--cr-text-muted);
}

/* === 卖家卡片 === */
.seller-card {
  background: var(--cr-surface);
  margin: 16rpx 16rpx 0;
  padding: 18rpx 24rpx;
  border-radius: 24rpx;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03);
}
.seller-card:active { opacity: 0.85; }
.seller-left {
  display: flex; align-items: center; gap: 20rpx;
  flex: 1; min-width: 0;
}
.seller-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.seller-avatar {
  width: 88rpx; height: 88rpx;
  border-radius: 50%; background: #eee;
  border: 2rpx solid #F5F5F5;
}
.seller-cert-badge {
  position: absolute;
  right: -2rpx; bottom: -2rpx;
  width: 28rpx; height: 28rpx;
  background: linear-gradient(135deg, #FFB74D, #FF6F00);
  border-radius: 50%;
  border: 3rpx solid #fff;
  display: flex; align-items: center; justify-content: center;
}
.cert-check {
  width: 10rpx; height: 5rpx;
  border-left: 2rpx solid #fff;
  border-bottom: 2rpx solid #fff;
  transform: rotate(-45deg);
  margin-top: -2rpx;
}
.seller-info {
  flex: 1; min-width: 0;
  display: flex; align-items: center;
}
.seller-name-row {
  display: flex; align-items: center; gap: 8rpx;
  width: 100%;
}
.seller-name {
  font-size: 30rpx; font-weight: 700;
  color: #1A1A1A;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex-shrink: 0;
  max-width: 200rpx;
}
.seller-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: #FFF4E5;
  border: 1rpx solid #FFE0C2;
  flex-shrink: 0;
}
.seller-tag text {
  font-size: 19rpx; color: #FF6900;
  font-weight: 600;
}
.seller-contact-btn {
  display: flex; align-items: center; gap: 6rpx;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #FFF5F0, #FFE5D9);
  border: 1rpx solid #FFCCAA;
  flex-shrink: 0;
}
.seller-contact-btn:active { opacity: 0.7; }
.contact-icon {
  width: 24rpx; height: 20rpx;
  background: #FF6200;
  border-radius: 8rpx 8rpx 8rpx 2rpx;
  position: relative;
}
.contact-icon::before {
  content: '';
  position: absolute;
  width: 4rpx; height: 4rpx;
  background: var(--cr-surface);
  border-radius: 50%;
  top: 50%; left: 6rpx;
  transform: translateY(-50%);
  box-shadow: 8rpx 0 0 #fff;
}
.seller-contact-btn text { font-size: 24rpx; color: #FF6200; font-weight: 700; }

/* === 宝贝详情 === */
.desc-card {
  background: var(--cr-surface);
  margin: 16rpx 16rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03);
}
.desc-header {
  display: flex; align-items: center; gap: 16rpx;
  margin-bottom: 16rpx;
}
.desc-title {
  font-size: 30rpx; font-weight: 800;
  color: #1A1A1A;
}
.desc-line {
  flex: 1;
  height: 1rpx;
  background: linear-gradient(90deg, #EEEEEE, transparent);
}
.desc-content { padding: 0; }
.desc-text {
  font-size: 28rpx; color: #444;
  line-height: 1.8;
}

/* === 底部操作栏 === */
.bottom-bar {
  position: fixed; bottom: 0; left: 0; width: 100%;
  background: var(--cr-surface);
  padding: 14rpx 24rpx;
  padding-bottom: calc(14rpx + env(safe-area-inset-bottom));
  display: flex; gap: 24rpx; align-items: center;
  z-index: 99;
  box-shadow: 0 -4rpx 24rpx rgba(0,0,0,0.06);
}

.bb-buy-btn {
  flex: 1; height: 88rpx;
  background: linear-gradient(135deg, #FF6900 0%, #FF2200 100%);
  border-radius: 44rpx;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 50, 0, 0.3);
}
.bb-buy-btn:active { transform: scale(0.98); }
.bb-buy-btn.soldout {
  background: #C8C9CC;
  box-shadow: none;
}
.bb-buy-text {
  font-size: 32rpx; font-weight: 800; color: #fff; letter-spacing: 2rpx;
  line-height: 1;
  padding-top: 2rpx;
}

/* === 购买弹窗 === */
.sheet-mask {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex; align-items: flex-end;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.pay-sheet {
  width: 100%;
  background: var(--cr-surface);
  border-radius: 32rpx 32rpx 0 0;
  padding: 0 0 calc(env(safe-area-inset-bottom));
  animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}
.sheet-handle {
  width: 64rpx; height: 8rpx;
  background: #E5E5E5; border-radius: 4rpx;
  margin: 20rpx auto 0;
}
.sheet-close {
  position: absolute;
  top: 20rpx; right: 24rpx;
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}
.close-x {
  width: 24rpx; height: 24rpx;
  position: relative;
}
.close-x::before, .close-x::after {
  content: '';
  position: absolute;
  width: 28rpx; height: 3rpx;
  background: #999;
  top: 50%; left: 50%;
  border-radius: 2rpx;
}
.close-x::before { transform: translate(-50%, -50%) rotate(45deg); }
.close-x::after { transform: translate(-50%, -50%) rotate(-45deg); }

/* 商品预览 */
.sheet-goods {
  display: flex; align-items: flex-start;
  padding: 28rpx 28rpx 28rpx;
  gap: 20rpx;
  border-bottom: 1rpx solid #F5F5F5;
}
.sheet-thumb-wrap {
  position: relative;
  flex-shrink: 0;
}
.sheet-thumb {
  width: 160rpx; height: 160rpx;
  border-radius: 16rpx;
  background: var(--cr-surface-alt);
  border: 1rpx solid var(--cr-border);
}
.sheet-thumb-tag {
  position: absolute;
  left: 8rpx; top: 8rpx;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  background: #1677FF;
}
.sheet-thumb-tag.virtual {
  background: #FF6900;
}
.sheet-thumb-tag text {
  font-size: 18rpx; color: #fff;
  font-weight: 700;
}
.sheet-goods-info { flex: 1; padding-top: 8rpx; min-width: 0; }
.sheet-goods-title {
  font-size: 28rpx; color: #1A1A1A;
  display: block; margin-bottom: 14rpx;
  line-height: 1.4;
  font-weight: 600;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.sheet-goods-price-row {
  display: flex; align-items: baseline; gap: 4rpx;
  margin-bottom: 8rpx;
}
.sheet-goods-sym {
  font-size: 24rpx; font-weight: 700;
  color: #FF2F00;
}
.sheet-goods-price {
  font-size: 42rpx; font-weight: 800;
  color: #FF2F00;
  font-family: 'SF Pro Display', Arial, sans-serif;
  line-height: 1;
}
.sheet-goods-tip {
  font-size: 20rpx; color: var(--cr-text-muted);
}

/* 表单 */
.form-list { padding: 8rpx 28rpx; }
.form-item {
  display: flex; align-items: center;
  min-height: 104rpx;
  border-bottom: 1rpx solid #F5F5F5;
  gap: 16rpx;
}
.form-item:last-child { border-bottom: none; }
.addr-item { align-items: flex-start; padding-top: 24rpx; }
.form-label-wrap {
  flex-shrink: 0;
  width: 160rpx;
  display: flex; align-items: center; gap: 4rpx;
}
.form-label {
  font-size: 28rpx; color: var(--cr-text);
  font-weight: 600;
}
.form-required {
  font-size: 24rpx; color: #FF2F00;
  font-weight: 700;
}
.form-input {
  flex: 1; font-size: 28rpx; color: #1A1A1A;
  height: 100rpx; line-height: 100rpx;
  background: transparent;
}
.pwd-input {
  letter-spacing: 4rpx;
  font-family: monospace;
}
.form-textarea {
  height: auto; min-height: 120rpx;
  line-height: 1.6; padding-top: 8rpx;
}
.ph { color: #BFBFBF; font-weight: normal; }

/* 底部 */
.sheet-footer {
  padding: 24rpx 28rpx 32rpx;
  border-top: 1rpx solid #F5F5F5;
}
.sheet-total-row {
  display: flex; justify-content: space-between;
  align-items: baseline; margin-bottom: 20rpx;
}
.sheet-total-label { font-size: 26rpx; color: var(--cr-text-muted); }
.sheet-total-price-wrap {
  display: flex; align-items: baseline;
  color: #FF2F00;
}
.sheet-total-sym { font-size: 26rpx; font-weight: 700; }
.sheet-total-price {
  font-size: 44rpx; font-weight: 800;
  font-family: 'SF Pro Display', Arial, sans-serif;
  letter-spacing: -1rpx;
}
.sheet-confirm-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #FF6900, #FF2200);
  border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 50, 0, 0.25);
}
.sheet-confirm-btn:active { transform: scale(0.98); }
.sheet-confirm-text { font-size: 32rpx; font-weight: 800; color: #fff; letter-spacing: 2rpx; }

/* HUD */
.hud-mask {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.hud-box {
  padding: 32rpx 48rpx;
  background: rgba(20,20,20,0.85);
  backdrop-filter: blur(12px);
  border-radius: 20rpx;
  display: flex; flex-direction: column;
  align-items: center; min-width: 200rpx;
  pointer-events: all;
}
.hud-text { color: #fff; font-size: 28rpx; margin-top: 16rpx; }
.hud-spinner {
  width: 56rpx; height: 56rpx;
  border: 5rpx solid rgba(255,255,255,0.2);
  border-top: 5rpx solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.hud-success {
  width: 20rpx; height: 36rpx;
  border-right: 5rpx solid #fff;
  border-bottom: 5rpx solid #fff;
  transform: rotate(45deg) translate(-2rpx, -4rpx);
  margin-top: 4rpx;
}
.hud-error {
  width: 56rpx; height: 56rpx;
  border: 4rpx solid #fff;
  border-radius: 50%;
  color: #fff; font-size: 38rpx;
  font-weight: bold; text-align: center;
  line-height: 48rpx;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
