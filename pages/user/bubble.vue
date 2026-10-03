<template>
  <view class="store-container">
    <custom-nav-bar
      title="气泡商城"
      :showBack="true"
      :placeholder="true"
      @init="onNavInit"
    />

    <view class="content-wrapper">
      <view class="header-card">
        <view class="balance-box">
          <text class="label">我的积分</text>
          <text class="value">{{ userPoints }}</text>
        </view>
        <text class="tips">个性气泡，彰显独特魅力</text>
      </view>

      <view class="grid-container">
        <view
          class="bubble-card"
          v-for="(item, index) in list"
          :key="index"
          :class="{ equipped: item.is_equipped, active: selectedId === item.id }"
          @click="selectItem(item)"
        >
          <view class="preview-area">
            <view class="bubble-mini" :class="item.style_class" :style="skinStyle(item.style_class)">
              <text v-if="skinDeco(item.style_class, 'before')" class="bubble-deco" :style="skinDeco(item.style_class, 'before').style">{{ skinDeco(item.style_class, 'before').text }}</text>
              <text>Hello</text>
              <text v-if="skinDeco(item.style_class, 'after')" class="bubble-deco" :style="skinDeco(item.style_class, 'after').style">{{ skinDeco(item.style_class, 'after').text }}</text>
            </view>
          </view>

          <text class="name">{{ item.name }}</text>

          <view class="status-badge" v-if="item.is_equipped">使用中</view>
          <view class="price-tag" v-else-if="item.is_owned">已拥有</view>
          <view class="price-tag cost" v-else>{{ item.price }} 积分</view>
        </view>
      </view>
    </view>

    <view
      class="bottom-bar"
      :style="{ paddingBottom: safeAreaBottom + 'px' }"
    >
      <view class="selected-info" v-if="selectedItem">
        <text class="s-name">{{ selectedItem.name }}</text>
        <text class="s-price" v-if="!selectedItem.is_owned">{{ selectedItem.price }} 积分</text>
      </view>

      <view class="selected-info" v-else>
        <text class="s-name">请选择气泡</text>
      </view>

      <button
        class="action-btn"
        :class="{ disabled: !selectedItem }"
        :disabled="!selectedItem"
        @click="handleAction"
      >
        {{ btnText }}
      </button>
    </view>
    <view class="modal-mask" :class="{ show: showPwdModal }" v-if="showPwdModal">
      <view class="modal-box">
        <view class="m-title">安全验证</view>
        <view class="m-content">
          <text class="m-tip">
            购买 "{{ targetItem?.name }}" 需消耗
            <text style="color:#ff2442;font-weight:bold">{{ targetItem?.price }}</text>
            积分
          </text>

          <input
            type="password"
            v-model="password"
            class="m-input"
            placeholder="请输入支付密码"
            :focus="showPwdModal"
            cursor-spacing="100"
          />
        </view>

        <view class="m-btns">
          <view class="m-btn cancel" @click="closeModal">取消</view>
          <view class="m-btn confirm" @click="confirmBuy">确认支付</view>
        </view>
      </view>
    </view>
    <view class="hud-mask" v-if="isLoading">
      <view class="hud-box">
        <view class="hud-spinner"></view>
        <text class="hud-text">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '@/common/request.js';
import CustomNavBar from '@/components/bubble.vue';
import { ensureCustomBubbleCss, getBubbleSkins } from '@/common/bubble-style.js';

export default {
  components: {
    CustomNavBar
  },
  data() {
    return {
      list: [],
      userPoints: 0,
      /* 类名 -> {style, before, after}：App 端插 <style> 不一定生效，气泡外观走内联样式 */
      bubbleSkins: {},
      selectedId: 0,
      selectedItem: null,
      showPwdModal: false,
      password: '',
      targetItem: null,
      isLoading: true,
      loadingText: '加载中',
      safeAreaBottom: 0,
      navInfo: {
        statusBarHeight: 20,
        navBarHeight: 44,
        navTotalHeight: 64
      }
    };
  },
  computed: {
    btnText() {
      if (!this.selectedItem) return '请选择';
      if (this.selectedItem.is_equipped) return '正在使用';
      if (this.selectedItem.is_owned) return '立即佩戴';
      return '立即购买';
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.safeAreaBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0;
    /* 后台写的自定义气泡样式要重新拉一次，否则新加的自定义气泡在商城里还是默认样子。
       拉回来的是「类名 -> 内联样式」，绑到气泡元素上（不依赖注入 <style>） */
    ensureCustomBubbleCss(true).then(() => { this.bubbleSkins = getBubbleSkins(); });
    this.loadData();
  },
  methods: {
    onNavInit(e) {
      this.navInfo = e;
    },

    /* 气泡皮肤内联样式（App 端插 <style> 不一定生效，所以外观走内联） */
    skinStyle(cls) {
      const s = this.bubbleSkins[cls];
      return s && s.style ? s.style : '';
    },
    /* 气泡的 ::before / ::after（如左上角小星星），用额外小元素还原 */
    skinDeco(cls, which) {
      const s = this.bubbleSkins[cls];
      if (!s || !s[which]) return null;
      return s[which];
    },

    showHUD(text = '加载中') {
      this.loadingText = text;
      this.isLoading = true;
    },

    hideHUD() {
      this.isLoading = false;
    },

    async loadData() {
      this.showHUD('加载中...');
      try {
        const res = await request('bubble.php', { action: 'list' }, 'POST');
        if (res.code === 0) {
          this.list = res.data.list || [];
          this.userPoints = Number(res.data.points || 0);
          /* 选中的那条要在刷新后换成新对象, 否则按钮状态(已拥有/使用中)不会更新 */
          if (this.selectedId) {
            const fresh = this.list.find(i => i.id === this.selectedId);
            if (fresh) this.selectedItem = fresh;
          }
          const equipped = this.list.find(i => i.is_equipped);
          if (equipped && !this.selectedItem) {
            this.selectItem(equipped);
          }
        } else {
          uni.showToast({
            title: res.msg || '加载失败',
            icon: 'none'
          });
        }
      } catch (e) {
        uni.showToast({
          title: '网络异常',
          icon: 'none'
        });
      } finally {
        this.hideHUD();
      }
    },

    selectItem(item) {
      this.selectedId = item.id;
      this.selectedItem = item;
    },

    handleAction() {
      if (!this.selectedItem) return;

      if (this.selectedItem.is_equipped) {
        uni.showToast({
          title: '当前正在使用中',
          icon: 'none'
        });
      } else if (this.selectedItem.is_owned) {
        this.doEquip(this.selectedItem.id);
      } else {
        this.targetItem = this.selectedItem;
        this.password = '';
        this.showPwdModal = true;
      }
    },

    async doEquip(id) {
      this.showHUD('设置中...');
      try {
        const res = await request(
          'bubble.php',
          { action: 'equip', bubbleId: id },
          'POST'
        );

        if (res.code === 0) {
          uni.showToast({
            title: '已佩戴',
            icon: 'success'
          });
          this.loadData();
        } else {
          uni.showToast({
            title: res.msg || '设置失败',
            icon: 'none'
          });
        }
      } catch (e) {
        uni.showToast({
          title: '网络异常',
          icon: 'none'
        });
      } finally {
        this.hideHUD();
      }
    },

    closeModal() {
      this.showPwdModal = false;
      this.password = '';
    },

    async confirmBuy() {
      if (!this.password) {
        return uni.showToast({
          title: '请输入支付密码',
          icon: 'none'
        });
      }

      const pwdToSend = this.password;
      const bubbleId = this.targetItem?.id;

      this.closeModal();
      this.showHUD('交易中...');

      try {
        const res = await request(
          'bubble.php',
          {
            action: 'buy',
            bubbleId,
            pay_password: pwdToSend
          },
          'POST'
        );

        if (res.code === 0) {
          uni.showToast({
            title: res.msg || '购买成功',
            icon: 'success'
          });
          this.loadData();
        } else if (res.code === -4) {
          /* 还没设置支付密码: 引导去设置, 而不是把"随便输的密码"当成功 */
          uni.showModal({
            title: '未设置支付密码',
            content: res.msg || '请先前往账户安全设置支付密码',
            confirmText: '去设置',
            cancelText: '取消',
            success: (r) => {
              if (r.confirm) uni.navigateTo({ url: '/pages/user/pay-password' });
            }
          });
        } else {
          uni.showToast({
            title: res.msg || '购买失败',
            icon: 'none'
          });
        }
      } catch (e) {
        uni.showToast({
          title: '网络异常',
          icon: 'none'
        });
      } finally {
        this.hideHUD();
      }
    }
  }
};
</script>

<style scoped>
@import "@/common/bubble.css";

.store-container {
  min-height: 100vh;
  background: #f8f9fb;
  box-sizing: border-box;
  padding-bottom: 160rpx;
}

.content-wrapper {
  box-sizing: border-box;
}

.header-card {
  background: #fff;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
}

.balance-box {
  display: flex;
  align-items: baseline;
  margin-bottom: 10rpx;
}

.label {
  font-size: 28rpx;
  color: #666;
  margin-right: 20rpx;
}

.value {
  font-size: 48rpx;
  font-weight: bold;
  color: #ff2442;
}

.tips {
  font-size: 24rpx;
  color: #999;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  padding: 20rpx;
  box-sizing: border-box;
}

.bubble-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid transparent;
  transition: all 0.2s;
  position: relative;
  box-sizing: border-box;
}

.bubble-card.active {
  border-color: #ff2442;
  background: #fff5f7;
}

.preview-area {
  width: 100%;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

/* 自定义气泡的 ::before / ::after 装饰（内容与定位都在内联样式里） */
.bubble-deco {
  position: absolute;
  line-height: 1;
}

.name {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.status-badge {
  font-size: 22rpx;
  color: #ff2442;
  background: rgba(255, 36, 66, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.price-tag {
  font-size: 24rpx;
  color: #999;
}

.price-tag.cost {
  color: #ff9800;
  font-weight: bold;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  min-height: 110rpx;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
  box-sizing: border-box;
}

.selected-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.s-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.s-price {
  font-size: 24rpx;
  color: #ff9800;
}

.action-btn {
  background: #ff2442;
  color: #fff;
  font-size: 28rpx;
  border-radius: 40rpx;
  padding: 0 50rpx;
  height: 72rpx;
  line-height: 72rpx;
  border: none;
}

.action-btn.disabled {
  background: #ccc;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1800;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: 0.2s;
}

.modal-mask.show {
  opacity: 1;
  visibility: visible;
}

.modal-box {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  padding-top: 40rpx;
  transform: scale(0.9);
  transition: 0.2s;
}

.modal-mask.show .modal-box {
  transform: scale(1);
}

.m-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
}

.m-content {
  padding: 0 40rpx;
}

.m-tip {
  display: block;
  text-align: center;
  color: #666;
  font-size: 28rpx;
  margin-bottom: 30rpx;
}

.m-input {
  background: #f5f7fa;
  height: 88rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 30rpx;
  margin-bottom: 40rpx;
}

.m-btns {
  display: flex;
  border-top: 1rpx solid #eee;
  height: 100rpx;
}

.m-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

.m-btn.confirm {
  color: #ff2442;
  font-weight: bold;
  border-left: 1rpx solid #eee;
}

.hud-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hud-box {
  width: 200rpx;
  height: 200rpx;
  background: rgba(40, 40, 40, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.hud-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: hud-spin 0.8s linear infinite;
  margin-bottom: 20rpx;
}

.hud-text {
  font-size: 26rpx;
  color: #ffffff;
  letter-spacing: 1px;
}

@keyframes hud-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
