<template>
  <view class="mall-page">
    <view class="custom-nav" :style="{ paddingTop: statusBarHeight + 'px', height: navBarHeight + 'px' }">
      <view class="nav-content" :style="{ height: menuButtonHeight + 'px' }">
        <view class="nav-back" @click="goBack">
          <image src="/static/icon/arrow-left-dark.svg" class="back-arrow" mode="aspectFit"></image>
        </view>
        <text class="nav-title">装扮商城</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="header-section" :style="{ marginTop: (navTotalHeight + 10) + 'px' }">
      <view class="score-card">
        <view class="score-left">
          <text class="score-label">当前可用积分</text>
          <text class="score-val">{{ myPoints }}</text>
        </view>
        <view class="score-right">
          <image src="/static/icon/task/star.png" class="coin-img" mode="aspectFit"></image>
        </view>
      </view>
    </view>

    <view class="tab-container">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text>头像框商城</text>
        <view class="tab-line"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text>我的仓库</text>
        <view class="tab-line"></view>
      </view>
    </view>

    <view class="goods-grid" v-if="currentTab === 0">
      <view class="goods-card" v-for="(item, index) in frameList" :key="index" @click="clickBuy(item)">
        <view class="preview-wrap">
          <image :src="userAvatar || '/static/default-avatar.png'" class="user-base-avatar" mode="aspectFill"></image>
          <image :src="item.img_url" class="frame-overlay" mode="aspectFit"></image>
          <view class="owned-tag" v-if="isOwned(item.id)">已拥有</view>
        </view>
        
        <text class="goods-name">{{ item.name }}</text>
        
        <view class="action-area">
          <view class="price-row" v-if="!isOwned(item.id)">
            <image src="/static/icon/gem-blue.svg" class="price-symbol" mode="aspectFit"></image>
            <text class="price-num">{{ item.price }}</text>
          </view>
          
          <button 
            class="action-btn"
            :class="{ 'btn-buy': !isOwned(item.id), 'btn-owned': isOwned(item.id) }"
            @click.stop="clickBuy(item)"
          >
            {{ isOwned(item.id) ? '去佩戴' : '兑换' }}
          </button>
        </view>
      </view>
    </view>

    <view class="goods-grid" v-if="currentTab === 1">
      <view class="goods-card">
        <view class="preview-wrap">
          <image :src="userAvatar || '/static/default-avatar.png'" class="user-base-avatar" mode="aspectFill"></image>
          <view class="no-frame-mask">无框</view>
        </view>
        <text class="goods-name">默认头像</text>
        <view class="action-area">
          <button 
             class="action-btn" 
             :class="currentWearId == 0 ? 'btn-wearing' : 'btn-use'"
             @click="handleWear(null)"
          >
            {{ currentWearId == 0 ? '佩戴中' : '使用' }}
          </button>
        </view>
      </view>

      <view class="goods-card" v-for="(item, index) in myOwnedList" :key="index">
        <view class="preview-wrap">
          <image :src="userAvatar || '/static/default-avatar.png'" class="user-base-avatar" mode="aspectFill"></image>
          <image :src="item.img_url" class="frame-overlay" mode="aspectFit"></image>
        </view>
        <text class="goods-name">{{ item.name }}</text>
        <view class="action-area">
          <button 
             class="action-btn" 
             :class="currentWearId == item.id ? 'btn-wearing' : 'btn-use'"
             @click="handleWear(item)"
          >
            {{ currentWearId == item.id ? '佩戴中' : '使用' }}
          </button>
        </view>
      </view>
      
      <view class="empty-box" v-if="myOwnedList.length === 0">
        <text>还没有兑换任何头像框，去商城逛逛吧~</text>
      </view>
    </view>

    <view class="custom-modal-mask" :class="{ show: showConfirmModal }" @click="closeModal">
      <view class="modal-box" @click.stop>
        <view class="modal-content">
          <text class="m-title">确认兑换</text>
          <text class="m-desc">确定消耗 <text class="highlight">{{ targetItem?.price }}</text> 积分</text>
          <text class="m-desc-sub">兑换“{{ targetItem?.name }}”吗？</text>
          
          <view class="m-preview">
             <image :src="userAvatar || '/static/default-avatar.png'" class="m-avatar"></image>
             <image :src="targetItem?.img_url" class="m-frame"></image>
          </view>
        </view>
        
        <view class="modal-btns">
          <view class="m-btn cancel" @click="closeModal">取 消</view>
          <view class="m-btn confirm" @click="confirmBuy">确 定</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { request } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      menuButtonHeight: 32,
      navTotalHeight: 64,

      currentTab: 0,
      myPoints: 0,
      userAvatar: '',
      frameList: [],
      myFrameIds: [],
      currentWearId: 0,

      showConfirmModal: false,
      targetItem: null,
    };
  },
  computed: {
    myOwnedList() {
      return this.frameList.filter(item => this.isOwned(item.id));
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight;
    // #ifdef MP-WEIXIN
    const menu = uni.getMenuButtonBoundingClientRect();
    this.menuButtonHeight = menu.height;
    this.navBarHeight = (menu.top - this.statusBarHeight) * 2 + this.menuButtonHeight;
    // #endif
    this.navTotalHeight = this.statusBarHeight + this.navBarHeight;
  },
  onShow() {
    this.loadData();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    async loadData() {
      const user = uni.getStorageSync('userInfo');
      if(!user) return;
      try {
        const res = await request('mall.php', { action: 'getMallData', userId: user.id });
        if(res.code===0) {
          this.myPoints = res.data.points;
          this.frameList = res.data.frames;
          this.myFrameIds = res.data.myFrameIds.map(String);
          this.currentWearId = res.data.currentWear;
          this.userAvatar = res.data.userAvatar; 
          
          if(this.userAvatar) {
              user.avatar = this.userAvatar;
              uni.setStorageSync('userInfo', user);
          }
        }
      } catch(e){}
    },

    isOwned(id) {
      return this.myFrameIds.includes(String(id));
    },

    clickBuy(item) {
      if (this.isOwned(item.id)) {
        this.currentTab = 1;
        return;
      }
      this.targetItem = item;
      this.showConfirmModal = true;
    },

    closeModal() {
      this.showConfirmModal = false;
      setTimeout(() => { this.targetItem = null; }, 300);
    },

    async confirmBuy() {
      if (!this.targetItem) return;
      const item = this.targetItem;
      const user = uni.getStorageSync('userInfo');
      
      this.showConfirmModal = false;
      
      uni.showLoading({ title: '兑换中' });
      const res = await request('mall.php', { action:'buyFrame', userId:user.id, frameId:item.id }, 'POST');
      uni.hideLoading();
      
      if(res.code===0) {
        uni.showToast({ title: '兑换成功' });
        this.loadData();
      } else {
        uni.showToast({ title: res.msg, icon: 'none' });
      }
    },

    async handleWear(item) {
      const targetId = item ? item.id : 0;
      if (String(this.currentWearId) === String(targetId)) return;

      const user = uni.getStorageSync('userInfo');
      uni.showLoading({ mask: true });
      const res = await request('mall.php', { action:'wearFrame', userId:user.id, frameId:targetId }, 'POST');
      uni.hideLoading();
      
      if(res.code===0) {
        this.currentWearId = targetId;
        uni.showToast({ title: targetId===0?'已恢复默认':'佩戴成功' });
      } else {
        uni.showToast({ title: res.msg, icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.mall-page { min-height: 100vh; background-color: #F6F7F9; padding-bottom: 40rpx; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, sans-serif; }

.custom-nav { position: fixed; top: 0; left: 0; width: 100%; z-index: 999; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); }
.nav-content { display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; }
.nav-back { width: 60rpx; height: 100%; display: flex; align-items: center; }
.back-arrow { width: 38rpx; height: 38rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #333; }
.nav-placeholder { width: 60rpx; }

.header-section { padding: 0 30rpx; margin-bottom: 30rpx; }
.score-card {
  background: linear-gradient(135deg, #2c2c2c, #4a4a4a);
  border-radius: 32rpx;
  padding: 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  box-shadow: 0 10rpx 20rpx rgba(0,0,0,0.15);
}
.score-label { font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 8rpx; display: block; }
.score-val { font-size: 60rpx; font-weight: bold; color: #f0c386; font-family: 'DIN', sans-serif; }
.coin-img { width: 100rpx; height: 100rpx; opacity: 0.8; }

.tab-container { display: flex; justify-content: center; margin-bottom: 30rpx; }
.tab-item { margin: 0 30rpx; font-size: 30rpx; color: #999; position: relative; padding-bottom: 12rpx; transition: all 0.3s; }
.tab-item.active { color: #333; font-weight: bold; font-size: 32rpx; }
.tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) scaleX(0); width: 40rpx; height: 6rpx; background: #ff2442; border-radius: 4rpx; transition: transform 0.3s; }
.tab-item.active .tab-line { transform: translateX(-50%) scaleX(1); }

.goods-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; padding: 0 30rpx; }

.goods-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
  transition: transform 0.1s;
}
.goods-card:active { transform: scale(0.98); }

.preview-wrap { position: relative; width: 160rpx; height: 160rpx; margin-bottom: 20rpx; display: flex; align-items: center; justify-content: center; }
.user-base-avatar { width: 130rpx; height: 130rpx; border-radius: 50%; border: 2rpx solid #f2f2f2; z-index: 1; }
.frame-overlay { position: absolute; top: -14%; left: -14%; width: 128%; height: 128%; z-index: 2; pointer-events: none; }

.owned-tag { 
  position: absolute; bottom: 0; right: -10rpx; 
  background: rgba(0,0,0,0.6); color: #fff; 
  font-size: 20rpx; padding: 4rpx 10rpx; border-radius: 10rpx;
  backdrop-filter: blur(2px); z-index: 3;
}
.no-frame-mask { position: absolute; font-size: 24rpx; color: #999; background: rgba(255,255,255,0.8); padding: 4rpx 10rpx; border-radius: 8rpx; z-index: 3; }

.goods-name { font-size: 28rpx; color: #333; font-weight: 600; margin-bottom: 16rpx; text-align: center; }

.action-area { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }

.price-row { display: flex; align-items: center; }
.price-symbol { width: 22rpx; height: 22rpx; margin-right: 4rpx; }
.price-num { font-size: 30rpx; color: #ff9800; font-weight: bold; font-family: DIN; }

.action-btn {
  width: 100%; height: 60rpx; line-height: 60rpx;
  font-size: 26rpx; font-weight: 600; 
  border-radius: 30rpx; margin: 0; padding: 0;
}
.action-btn::after { border: none; }

.btn-buy {
  background: linear-gradient(90deg, #ff2442, #ff5e6d);
  color: #fff;
  box-shadow: 0 4rpx 10rpx rgba(255, 36, 66, 0.2);
}
.btn-owned {
  background: #f5f5f5; color: #999; font-weight: 500;
}
.btn-use {
  background: #fff; color: #333; border: 2rpx solid #333;
}
.btn-wearing {
  background: #333; color: #f0c386; opacity: 1;
}

.empty-box { grid-column: span 2; padding: 100rpx 0; text-align: center; color: #999; font-size: 26rpx; }

.custom-modal-mask {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.4); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden; transition: all 0.2s ease-in-out;
  backdrop-filter: blur(4px);
}
.custom-modal-mask.show { opacity: 1; visibility: visible; }

.modal-box {
  width: 560rpx;
  background: rgba(255,255,255,0.95);
  border-radius: 28rpx;
  backdrop-filter: blur(10px);
  overflow: hidden;
  transform: scale(0.9); transition: transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.custom-modal-mask.show .modal-box { transform: scale(1); }

.modal-content { padding: 40rpx 40rpx 40rpx; display: flex; flex-direction: column; align-items: center; }
.m-title { font-size: 34rpx; font-weight: bold; color: #000; margin-bottom: 20rpx; }
.m-desc { font-size: 28rpx; color: #333; text-align: center; line-height: 1.5; }
.m-desc-sub { font-size: 28rpx; color: #666; text-align: center; margin-bottom: 30rpx; }
.highlight { color: #ff9800; font-weight: bold; margin: 0 8rpx; font-size: 32rpx; }

.m-preview { position: relative; width: 120rpx; height: 120rpx; margin-top: 10rpx; display: flex; align-items: center; justify-content: center; }
.m-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; opacity: 0.9; z-index: 1; }
.m-frame { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; transform: scale(1.15); }

.modal-btns { display: flex; border-top: 1rpx solid rgba(0,0,0,0.1); height: 88rpx; }
.m-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 32rpx;
}
.m-btn:active { background: rgba(0,0,0,0.05); }
.m-btn.cancel { color: #666; border-right: 1rpx solid rgba(0,0,0,0.1); }
.m-btn.confirm { color: #007aff; font-weight: 600; }
</style>