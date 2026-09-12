<template>
  <view class="agreement-mask" :class="{ show: visible }" @click="handleClose">
    <view class="agreement-box" @click.stop>
      <view class="agreement-header">
        <view class="header-left" @click="handleClose">
          <image src="/static/icon/fanhui.png" class="back-icon" mode="aspectFit"></image>
        </view>
        <text class="header-title">{{ title }}</text>
        <view class="header-right"></view>
      </view>
      
      <scroll-view scroll-y class="agreement-content">
        <view class="content-wrap">
          <view class="agreement-text">
            <text v-if="type === 'privacy'">
              <view class="section">
                <text class="section-title">一、用户信息收集</text>
                <text class="section-text">我们会收集您在使用本服务过程中主动提供的信息，包括但不限于：昵称、头像、手机号码、地理位置信息等。</text>
              </view>
              
              <view class="section">
                <text class="section-title">二、信息使用</text>
                <text class="section-text">我们将严格按照本隐私政策使用您的个人信息，不会向第三方出售或转让您的个人信息。</text>
              </view>
              
              <view class="section">
                <text class="section-title">三、信息保护</text>
                <text class="section-text">我们采用业界标准的安全技术措施来保护您的个人信息安全，防止信息泄露、滥用或篡改。</text>
              </view>
              
              <view class="section">
                <text class="section-title">四、您的权利</text>
                <text class="section-text">您有权访问、更正、删除您的个人信息，并有权撤回您的同意。</text>
              </view>
              
              <view class="section">
                <text class="section-title">五、联系我们</text>
                <text class="section-text">如您对本隐私政策有任何疑问，请通过APP内的联系渠道与我们取得联系。</text>
              </view>
            </text>
            
            <text v-else>
              <view class="section">
                <text class="section-title">一、服务条款</text>
                <text class="section-text">欢迎您使用本社区服务。在使用本服务前，请您仔细阅读并理解本用户协议的全部内容。</text>
              </view>
              
              <view class="section">
                <text class="section-title">二、用户行为规范</text>
                <text class="section-text">您在使用本服务时，应遵守相关法律法规，不得发布违法、违规、侵权或其他不当内容。</text>
              </view>
              
              <view class="section">
                <text class="section-title">三、内容所有权</text>
                <text class="section-text">您在本平台发布的原创内容，其知识产权归您所有。平台有权在合理范围内展示和推广您的内容。</text>
              </view>
              
              <view class="section">
                <text class="section-title">四、账号管理</text>
                <text class="section-text">请妥善保管您的账号信息，因保管不善造成的损失由您自行承担。</text>
              </view>
              
              <view class="section">
                <text class="section-title">五、免责声明</text>
                <text class="section-text">平台对不可抗力、第三方原因等造成的服务中断或损失不承担责任。</text>
              </view>
            </text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'XhsAgreement',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'privacy'
    },
    title: {
      type: String,
      default: '隐私政策'
    }
  },
  methods: {
    handleClose() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.agreement-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.agreement-mask.show {
  opacity: 1;
  pointer-events: auto;
}

.agreement-box {
  width: 100%;
  max-width: 600px;
  height: 80vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;
}

.agreement-mask.show .agreement-box {
  transform: translateY(0);
}

.agreement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
  border-bottom: 1rpx solid #f5f5f5;
  flex-shrink: 0;
}

.header-left, .header-right {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  width: 24px;
  height: 24px;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.agreement-content {
  flex: 1;
  overflow-y: auto;
}

.content-wrap {
  padding: 20px;
}

.agreement-text {
  line-height: 1.8;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  display: block;
}

.section-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  display: block;
}
</style>
