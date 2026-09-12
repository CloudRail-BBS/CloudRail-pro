<template>
  <view class="publish-container">
    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="handleReset">
        <text class="nav-text">重置</text>
      </view>
      <view class="nav-title-wrap">
        <text class="nav-title">{{ isEditMode ? '编辑' : '发布' }}</text>
      </view>
      <view class="nav-right" @click="handleCancel">
        <text class="nav-text">取消</text>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view v-if="!isLogin" class="login-auth-wrap">
      <image src="/static/logo.png" mode="aspectFit" class="auth-logo animate-float"></image>
      <text class="auth-title">登录后分享你的精彩生活</text>
      <button class="auth-btn login" @click="goLogin">立即登录</button>
      <button class="auth-btn refresh" @click="refreshUserInfo">刷新状态</button>
    </view>

    <view v-else class="editor-main">
      <view class="author-row">
        <image :src="loginUser.avatar || '/static/logo.png'" class="author-avatar" mode="aspectFill"></image>
        <view class="author-meta">
          <text class="author-name">{{ loginUser.name || loginUser.username || '用户' }}</text>
          <text class="author-hint">分享此刻想法</text>
        </view>
      </view>
      <view class="title-block">
        <input
          v-model="title"
          placeholder="添加标题让更多人看见"
          placeholder-class="placeholder-title"
          type="text"
          maxlength="30"
          class="editor-title"
        />
        <text class="counter" :class="{ warning: title.length >= 30 }">{{ title.length }} / 30</text>
      </view>

      <!-- 正文 -->
      <view class="content-block">
        <textarea
          v-model="content"
          placeholder="此刻的想法、见闻或故事，输入 @ 艾特好友，用 # 标记话题"
          placeholder-class="placeholder-content"
          maxlength="1000"
          class="editor-content"
          auto-height
          :show-confirm-bar="false"
          :disable-default-padding="true"
          @input="handleContentInput"
        />
      </view>

      <!-- 内容中解析出的话题预览 -->
      <view class="inline-topics-preview" v-if="parsedTopics.length > 0">
        <view class="inline-topic-chip" v-for="(name, idx) in parsedTopics" :key="'inline-'+idx">
          <text>#{{ name }}</text>
        </view>
      </view>

      <view class="publish-side-toolbox">
        <view class="toolbox-btn" @click="openProductPicker">
          <text class="toolbox-icon">商</text>
          <text class="toolbox-text">商品</text>
        </view>
        <view class="toolbox-btn" @click="openLinkPanel">
          <text class="toolbox-icon link">链</text>
          <text class="toolbox-text">链接</text>
        </view>
        <view class="toolbox-btn" @click="openDouyinPanel">
          <text class="toolbox-icon douyin">抖</text>
          <text class="toolbox-text">抖音</text>
        </view>
      </view>

      <view class="share-preview-card" v-if="shareProduct || shareLinkUrl || douyinVideo">
        <view class="share-preview-main" v-if="shareProduct" @click="openProductPicker">
          <image :src="shareProduct.image || '/static/logo.png'" class="share-product-img" mode="aspectFill"></image>
          <view class="share-preview-info">
            <text class="share-preview-title">{{ shareProduct.title }}</text>
            <text class="share-preview-sub">¥{{ shareProduct.price }}</text>
          </view>
          <text class="share-remove" @click.stop="removeShareProduct">×</text>
        </view>
        <view class="share-preview-main link-card" v-if="shareLinkUrl" @click="openLinkPanel">
          <view class="share-link-icon">链</view>
          <view class="share-preview-info">
            <text class="share-preview-title">{{ shareLinkTitle || '外部链接' }}</text>
            <text class="share-preview-sub">{{ shareLinkUrl }}</text>
          </view>
          <text class="share-remove" @click.stop="removeShareLink">×</text>
        </view>
        <view class="share-preview-main douyin-card" v-if="douyinVideo" @click="openDouyinPanel">
          <image :src="douyinVideo.cover || '/static/logo.png'" class="douyin-video-cover" mode="aspectFill"></image>
          <view class="douyin-play-icon">
            <view class="douyin-triangle"></view>
          </view>
          <view class="share-preview-info">
            <text class="share-preview-title">{{ douyinVideo.title || '抖音视频' }}</text>
            <text class="share-preview-sub">{{ douyinVideo.author || '抖音用户' }}</text>
          </view>
          <text class="share-remove" @click.stop="removeDouyinVideo">×</text>
        </view>
      </view>

      <!-- 媒体上传 -->
      <view class="media-uploader">
        <block v-if="videoUrl">
          <view class="video-wrapper">
            <video
              v-if="showRealVideo"
              id="postVideo"
              :src="videoUrl"
              :poster="videoPoster"
              class="video-player"
              object-fit="cover"
              :controls="true"
              :show-fullscreen-btn="false"
              :show-center-play-btn="true"
              :autoplay="false"
            >
              <cover-view class="del-btn-cover" @click="handleDeleteVideo">
                <cover-view class="del-text">×</cover-view>
              </cover-view>
            </video>

            <view v-else class="video-placeholder" @click="playVideo">
              <image
                v-if="videoPoster"
                :src="videoPoster"
                class="video-cover-image"
                mode="aspectFill"
              ></image>

              <view v-else class="video-cover-empty"></view>
              <view class="video-cover-mask"></view>

              <view class="play-icon-wrap">
                <view class="play-triangle"></view>
              </view>

              <text class="placeholder-text">
                {{ videoPoster ? '点击播放' : '预览视频' }}
              </text>

              <view class="del-btn-view" @click.stop="handleDeleteVideo">
                <text class="del-text">×</text>
              </view>
            </view>
          </view>
        </block>

        <block v-else>
          <view class="img-grid">
            <view class="img-grid-inner">
              <view class="img-cell" v-for="(img, idx) in uploadImages" :key="idx">
                <image :src="img" class="uploaded-img" mode="aspectFill" @click="previewImage(uploadImages, idx)"></image>
                <view class="del-btn-view" @click.stop="handleDeleteImage(idx)">
                  <text class="del-text">×</text>
                </view>
              </view>
            </view>

            <view class="add-btn-group" v-if="uploadImages.length < maxPostImages">
              <view class="media-add-btn image-btn" @tap="chooseImage" hover-class="btn-hover-light">
                <view class="add-icon-box"><text class="add-icon-plus">+</text></view>
                <text class="add-txt">添加图片</text>
              </view>

              <view class="media-add-btn video-btn" @tap="chooseVideo" v-if="uploadImages.length === 0 && canUploadVideo" hover-class="btn-hover-light">
                <view class="add-icon-box video"><view class="add-icon-tri"></view></view>
                <text class="add-txt">上传视频</text>
              </view>
            </view>
          </view>

          <text class="upload-tip" v-if="uploadImages.length > 0">{{ uploadImages.length }} / {{ maxPostImages }}</text>
        </block>
      </view>
      <view class="setting-group">
        <view class="setting-row" @click="openCirclePicker">
          <view class="setting-label">
            <text class="setting-dot circle"></text>
            <text class="setting-title">圈子</text>
            <text class="setting-required">必选</text>
          </view>
          <view class="setting-value">
            <image v-if="circleList[circleIndex] && (circleList[circleIndex].image || circleList[circleIndex].icon)" :src="circleList[circleIndex].image || circleList[circleIndex].icon" class="setting-circle-icon" mode="aspectFill"></image>
            <text :class="['setting-text', { placeholder: !circleList[circleIndex] }]">
              {{ circleList[circleIndex]?.name || '选择圈子' }}
            </text>
            <text class="setting-arrow">›</text>
          </view>
        </view>

        <view class="setting-divider"></view>

        <view class="setting-row" @click="openCoCreatorPicker">
          <view class="setting-label">
            <text class="setting-dot cocreator"></text>
            <text class="setting-title">共创者</text>
          </view>
          <view class="setting-value">
            <text :class="['setting-text', { placeholder: coCreators.length === 0 }]">
              {{ coCreators.length > 0 ? ('已添加 ' + coCreators.length + ' 人') : '添加共创者' }}
            </text>
            <text class="setting-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="tags-display-area" v-if="coCreators.length > 0">
        <view class="tag-badge co-tag" v-for="(u, idx) in coCreators" :key="'co-'+u.id">
          <text>@{{ u.name || u.username }}</text>
          <view class="badge-close" @click="removeCoCreator(u.id)">×</view>
        </view>
      </view>
      <view class="setting-group pay-group">
        <view class="group-title">权限设置</view>
        <view class="setting-row" @click="togglePaid">
          <view class="setting-label">
            <view class="setting-icon-box paid"><text class="si-text">楼</text></view>
            <view class="setting-col">
              <text class="setting-title">付费查看</text>
              <text class="setting-sub">读者付费后才能查看全文</text>
            </view>
          </view>
          <view class="toggle-btn" :class="{ on: isPaid }">
            <view class="toggle-knob"></view>
          </view>
        </view>

        <view v-if="isPaid" class="pay-price-row">
          <text class="pay-price-label">价格</text>
          <view class="pay-price-input-wrap">
            <text class="pay-price-currency">¥</text>
            <input
              type="digit"
              v-model="postPrice"
              class="pay-price-input"
              placeholder="0.01 ~ 999"
              placeholder-class="pay-ph"
              maxlength="6"
            />
          </view>
        </view>

        <view class="setting-divider"></view>

        <view class="setting-row" @click="toggleCommentUnlock">
          <view class="setting-label">
            <view class="setting-icon-box comment"><text class="si-text">评</text></view>
            <view class="setting-col">
              <text class="setting-title">评论可见</text>
              <text class="setting-sub">评论后才能查看全部内容</text>
            </view>
          </view>
          <view class="toggle-btn" :class="{ on: isCommentUnlock }">
            <view class="toggle-knob"></view>
          </view>
        </view>
      </view>
      <view class="footer-spacer"></view>
    </view>

    <view class="floating-submit-bar" v-if="isLogin">
      <button class="submit-btn" :class="{ disabled: !canPublish || isSubmitting }" @click="publishPost" hover-class="btn-hover-active">
        <text class="btn-text">{{ isSubmitting ? '发布中...' : (isEditMode ? '保存' : '发布') }}</text>
        <view v-if="isSubmitting" class="btn-loading-spinner"></view>
      </button>
    </view>

    <view class="progress-mask" v-if="isUploading">
      <view class="progress-box-minimal">
        <text class="progress-percent-big">{{ uploadProgress }}<text class="percent-symbol">%</text></text>
        <text class="progress-note">上传中，请稍等...</text>
        <view class="progress-bar-bg-minimal">
          <view class="progress-bar-fill-minimal" :style="{ width: uploadProgress + '%' }"></view>
        </view>
      </view>
    </view>

    <view class="custom-picker" :class="{ show: showCirclePicker }" v-if="showCirclePicker || circleList.length > 0">
      <view class="picker-mask" @click="closeCirclePicker"></view>
      <view class="picker-panel">
        <view class="picker-header">
          <text class="ph-title">选择圈子</text>
          <text class="ph-close" @click="closeCirclePicker">×</text>
        </view>
        <scroll-view scroll-y class="picker-scroll">
          <view v-for="(group, gi) in groupedCircles" :key="'g' + gi" class="circle-group">
            <view class="circle-group-title">
              <image v-if="groupIconSrc(group)" :src="groupIconSrc(group)" class="circle-group-icon" mode="aspectFill"></image>
              <text v-else-if="group.icon" class="circle-group-emoji">{{ group.icon }}</text>
              <text class="circle-group-name">{{ group.name }}</text>
              <text class="circle-group-count">{{ group.items.length }}</text>
            </view>
            <view class="grid-options">
              <block v-for="item in group.items" :key="item.id">
                <view
                  v-if="checkCircleVisible(item)"
                  class="grid-item"
                  :class="{ selected: circleList[tempCircleIndex] && circleList[tempCircleIndex].id === item.id }"
                  @click="onSelectCircle(item)"
                >
                  <image v-if="circleIconSrc(item)" :src="circleIconSrc(item)" class="grid-circle-icon" mode="aspectFill"></image>
                  <view v-else-if="item.icon" class="grid-circle-emoji">{{ item.icon }}</view>
                  <view v-else class="grid-circle-fallback">{{ (item.name || '圈').slice(0, 1) }}</view>
                  <text class="grid-text">{{ item.name }}</text>
                  <text class="grid-desc">{{ item.description || '欢迎加入，一起交流分享' }}</text>
                  <image src="/static/icon/check-red.svg" class="grid-icon" v-if="circleList[tempCircleIndex] && circleList[tempCircleIndex].id === item.id" mode="aspectFit"></image>
                </view>
              </block>
            </view>
          </view>
          <view v-if="circleList.length === 0" class="empty-data">暂无圈子</view>
        </scroll-view>
      </view>
    </view>

    <view class="custom-picker" :class="{ show: showMentionPicker }" v-if="showMentionPicker">
      <view class="picker-mask" @click="closeMentionPicker"></view>
      <view class="picker-panel topic-panel">
        <view class="picker-header">
          <text class="ph-cancel" @click="closeMentionPicker">取消</text>
          <text class="ph-title">选择要 @ 的人</text>
          <text class="ph-confirm" @click="closeMentionPicker">关闭</text>
        </view>

        <view class="topic-input-area">
          <view class="hash-icon">@</view>
          <input
            v-model="mentionKeyword"
            placeholder="Search users"
            maxlength="20"
            class="topic-real-input"
            confirm-type="search"
            @input="searchMentionUsersDebounced"
            @confirm="searchMentionUsers"
          />
          <view class="topic-add-text active" @click="searchMentionUsers">搜索</view>
        </view>

        <scroll-view scroll-y class="picker-scroll topic-scroll-fix">
          <view class="topic-list-vertical">
            <view class="mention-user-item" v-for="u in mentionUserList" :key="u.id" @click="selectMentionUser(u)">
              <image :src="u.avatar || '/static/logo.png'" class="mention-avatar" mode="aspectFill"></image>
              <text class="mention-name">{{ u.name || u.username }}</text>
            </view>
            <view v-if="mentionUserList.length===0" class="empty-data">暂无结果</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="custom-picker" :class="{ show: showCoPicker }" v-if="showCoPicker">
      <view class="picker-mask" @click="closeCoCreatorPicker"></view>
      <view class="picker-panel topic-panel">
        <view class="picker-header">
          <text class="ph-cancel" @click="closeCoCreatorPicker">取消</text>
          <text class="ph-title">选择共创者</text>
          <text class="ph-confirm" @click="closeCoCreatorPicker">完成</text>
        </view>

        <view class="temp-selected-row" v-if="coCreators.length > 0">
          <view class="temp-tag co" v-for="u in coCreators" :key="'sel-'+u.id">
            @ {{ u.name || u.username }}
            <text class="del" @click.stop="removeCoCreator(u.id)">×</text>
          </view>
        </view>

        <scroll-view scroll-y class="picker-scroll topic-scroll-fix">
          <view class="topic-list-vertical">
            <view class="mention-user-item" v-for="u in coUserList" :key="'co-'+u.id" @click="toggleCoCreator(u)">
              <image :src="u.avatar || '/static/logo.png'" class="mention-avatar" mode="aspectFill"></image>
              <text class="mention-name">{{ u.name || u.username }}</text>
              <text class="mention-picked" v-if="coCreatorIds.includes(String(u.id))">已选</text>
            </view>
            <view v-if="coUserList.length===0" class="empty-data">暂无互相关注的用户</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="custom-picker" :class="{ show: showProductPicker }" v-if="showProductPicker">
      <view class="picker-mask" @click="closeProductPicker"></view>
      <view class="picker-panel topic-panel">
        <view class="picker-header">
          <text class="ph-cancel" @click="closeProductPicker">取消</text>
          <text class="ph-title">分享我的商品</text>
          <text class="ph-confirm" @click="closeProductPicker">完成</text>
        </view>
        <scroll-view scroll-y class="picker-scroll topic-scroll-fix">
          <view class="topic-list-vertical">
            <view class="product-pick-item" v-for="p in productList" :key="'prod-'+p.id" @click="selectShareProduct(p)">
              <image :src="p.image || '/static/logo.png'" class="product-pick-img" mode="aspectFill"></image>
              <view class="product-pick-info">
                <text class="product-pick-title">{{ p.title }}</text>
                <text class="product-pick-price">¥{{ p.price }}</text>
              </view>
              <text class="mention-picked" v-if="shareProduct && String(shareProduct.id) === String(p.id)">已选</text>
            </view>
            <view v-if="!productLoading && productList.length===0" class="empty-data">暂无可分享商品</view>
            <view v-if="productLoading" class="empty-data">加载中...</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="custom-picker" :class="{ show: showLinkPanel }" v-if="showLinkPanel">
      <view class="picker-mask" @click="closeLinkPanel"></view>
      <view class="picker-panel link-panel">
        <view class="picker-header">
          <text class="ph-cancel" @click="closeLinkPanel">取消</text>
          <text class="ph-title">插入链接</text>
          <text class="ph-confirm" @click="confirmLinkInsert">确定</text>
        </view>
        <view class="link-input-wrap">
          <input v-model="linkDraftTitle" class="link-input" placeholder="链接标题（可选）" maxlength="40" />
          <input v-model="linkDraftUrl" class="link-input" placeholder="https://..." maxlength="500" />
        </view>
      </view>
    </view>

    <view class="custom-picker" :class="{ show: showDouyinPanel }" v-if="showDouyinPanel">
      <view class="picker-mask" @click="closeDouyinPanel"></view>
      <view class="picker-panel douyin-panel">
        <view class="picker-header">
          <text class="ph-cancel" @click="closeDouyinPanel">取消</text>
          <text class="ph-title">插入抖音视频</text>
          <text class="ph-confirm" @click="confirmDouyinInsert">确定</text>
        </view>
        <view class="douyin-input-wrap">
          <view class="douyin-tip">
            <text>粘贴抖音分享链接</text>
            <text class="tip-hint">如：https://v.douyin.com/xxxx/</text>
          </view>
          <input 
            v-model="douyinDraftUrl" 
            class="douyin-input" 
            placeholder="请输入抖音视频链接" 
            maxlength="500" 
            :disabled="isDouyinParsing"
          />
          <view class="douyin-preview" v-if="douyinDraftData">
            <video
              :src="douyinDraftData.url"
              :poster="douyinDraftData.cover"
              class="douyin-preview-video"
              object-fit="cover"
              :controls="true"
              :show-fullscreen-btn="false"
              :show-center-play-btn="true"
              :autoplay="false"
            ></video>
            <view class="douyin-preview-info">
              <text class="preview-title">{{ douyinDraftData.title }}</text>
              <text class="preview-author">{{ douyinDraftData.author }}</text>
            </view>
          </view>
        </view>
        <view class="parse-btn" :class="{ loading: isDouyinParsing }" @click="parseDouyinLink">
          <text v-if="!isDouyinParsing">解析链接</text>
          <view v-else class="parse-loading"></view>
        </view>
      </view>
    </view>

    <view class="xhs-modal-mask" :class="{ show: xhsModal.show }" @touchmove.stop.prevent>
      <view class="xhs-modal-box">
        <view class="xhs-modal-title">{{ xhsModal.title }}</view>
        <view class="xhs-modal-content">{{ xhsModal.content }}</view>
        <view class="xhs-modal-footer">
          <view class="xhs-btn cancel" v-if="xhsModal.showCancel" @click="closeXhsModal">取消</view>
          <view style="flex:1;" class="xhs-btn confirm" :class="{ 'red-text': xhsModal.isDestructive }" @click="confirmXhsModal">
            {{ xhsModal.confirmText }}
          </view>
        </view>
      </view>
    </view>

    <view class="ios-hud-wrapper" v-if="hud.visible">
      <view class="ios-hud-box">
        <view v-if="hud.type === 'loading'" class="ios-spinner">
          <view
            class="ios-spinner-blade"
            v-for="n in 12"
            :key="n"
            :style="{ transform: `rotate(${(n-1)*30}deg) translate(0, -140%)` }"
          ></view>
        </view>
        <text class="ios-hud-text" :class="{ 'text-only': hud.type !== 'loading' }">{{ hud.message }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request, uploadFile } from '../../common/request.js';

export default {
  name: 'Publish',
  data() {
    const token = uni.getStorageSync('token');
    const userInfo = uni.getStorageSync('userInfo');

    return {
      statusBarHeight: 20,
      isLogin: !!token,
      loginUser: userInfo || {},
      runtimeConfig: {
        enable_video_feature: 0,
        max_post_images: 9
      },

      hud: { visible: false, type: 'loading', message: '' },

      circleList: [],
      circleIndex: -1,

      title: '',
      content: '',

      uploadImages: [],
      videoUrl: '',
      videoCoverUrl: '',

      tempCircleIndex: -1,

      isUploading: false,
      uploadProgress: 0,

      showCirclePicker: false,

      isSubmitting: false,
      isEditMode: false,
      editPostId: null,

      isPlayingVideo: false,
      preSelectCircleId: null,

      showMentionPicker: false,
      mentionKeyword: '',
      mentionUserList: [],
      mentionTimer: null,
      mentionInsertCursor: -1,

      showCoPicker: false,
      coKeyword: '',
      coUserList: [],
      coTimer: null,
      coCreators: [],
      coCreatorIds: [],

      isPaid: false,
      postPrice: '',
      isCommentUnlock: false,

      showProductPicker: false,
      productLoading: false,
      productList: [],
      shareProduct: null,

      showLinkPanel: false,
      linkDraftTitle: '',
      linkDraftUrl: '',
      shareLinkTitle: '',
      shareLinkUrl: '',

      showDouyinPanel: false,
      douyinDraftUrl: '',
      douyinDraftData: null,
      douyinVideo: null,
      isDouyinParsing: false,
      isDouyinVideoPlaying: false,

      xhsModal: {
        show: false,
        title: '',
        content: '',
        showCancel: false,
        confirmText: 'OK',
        isDestructive: false,
        onConfirm: null
      }
    };
  },

  computed: {
    isAdmin() {
      return this.loginUser && parseInt(this.loginUser.is_admin) === 1;
    },
    canUploadVideo() {
      return this.isVideoFeatureEnabled && this.loginUser && parseInt(this.loginUser.vip) === 1;
    },
    isVideoFeatureEnabled() {
      return parseInt(this.runtimeConfig.enable_video_feature ?? 1) === 1;
    },
    maxPostImages() {
      const n = parseInt(this.runtimeConfig.max_post_images ?? 9);
      return Math.min(99, Math.max(1, n || 9));
    },
    canPublish() {
      const hasCircle = this.circleIndex >= 0;
      const titleValid = this.title.trim().length >= 1;
      const hasMedia = (this.uploadImages.length > 0) || !!this.videoUrl || !!this.shareProduct || !!this.shareLinkUrl || !!this.douyinVideo;
      const hasContent = this.content.trim().length > 0;
      return hasCircle && titleValid && (hasContent || hasMedia);
    },
    // 从内容中解析 #话题（与动态发布页面一致）
    parsedTopics() {
      const text = this.content || '';
      if (!text) return [];
      const matches = text.match(/#([^\s#]{1,12})/g) || [];
      const seen = new Set();
      const result = [];
      matches.forEach(m => {
        const name = m.substring(1).trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          result.push(name);
        }
      });
      return result;
    },
    hasPopupOpen() {
      return this.showCirclePicker || this.xhsModal.show || this.isUploading || this.showMentionPicker || this.showCoPicker || this.showProductPicker || this.showLinkPanel || this.showDouyinPanel;
    },
    showRealVideo() {
      if (this.hasPopupOpen) return false;
      return this.isPlayingVideo;
    },
    videoPoster() {
      if (this.videoCoverUrl) return this.videoCoverUrl;
      if (Array.isArray(this.uploadImages) && this.uploadImages.length > 0) {
        return this.uploadImages[0];
      }
      return '';
    },
    // 圈子按分类分组（未分类 → 推荐圈子，与圈子页一致）
    groupedCircles() {
      const groups = [];
      const map = {};
      this.circleList.forEach(c => {
        const key = c.category_id || 0;
        if (!map[key]) {
          map[key] = { name: key === 0 ? '推荐圈子' : (c.category_name || '其他圈子'), icon: key === 0 ? '' : (c.category_icon || ''), items: [] };
          groups.push(map[key]);
        }
        map[key].items.push(c);
      });
      return groups;
    }
  },

  onLoad(options) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;

    if (options.circleId) {
      this.preSelectCircleId = parseInt(options.circleId);
    }
  },

  onShow() {
    this.loadRuntimeConfig();
    this.refreshUserInfo();
    this.initEditor();
  },

  methods: {
    showHUD(type, message) {
      this.hud.type = type;
      this.hud.message = message;
      this.hud.visible = true;
      if (type !== 'loading') {
        setTimeout(() => {
          this.hud.visible = false;
        }, 1500);
      }
    },

    hideHUD(delay = 0) {
      if (delay > 0) {
        setTimeout(() => {
          this.hud.visible = false;
        }, delay);
      } else {
        this.hud.visible = false;
      }
    },

    checkCircleVisible(circle) {
      if (this.isAdmin) return true;
      return parseInt(circle && circle.publish_admin_only ? circle.publish_admin_only : 0) !== 1;
    },

    playVideo() {
      this.isPlayingVideo = true;
    },

    async refreshUserInfo() {
      const t = uni.getStorageSync('token');
      if (t) {
        try {
          const res = await request('post.php?action=userInfo', {});
          if (res.code === 0) {
            this.loginUser = res.data;
            this.isLogin = true;
            uni.setStorageSync('userInfo', res.data);
          } else {
              // 刷新失败不再强制登出：保留本地登录态
              const u = uni.getStorageSync('userInfo') || {};
              if (u && (u.id || u.uid)) {
                this.isLogin = true;
                this.loginUser = u;
              } else {
                this.isLogin = false;
              }
            }
        } catch (e) {}
      } else {
        this.isLogin = false;
      }
    },

    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },

    async loadRuntimeConfig() {
      try {
        const res = await request('post.php?action=get_runtime_config', {});
        if (res && res.code === 0 && res.data) {
          this.runtimeConfig = {
            ...this.runtimeConfig,
            ...res.data
          };
          if (!this.isVideoFeatureEnabled && this.videoUrl) {
            this.handleDeleteVideo();
          }
          if (this.uploadImages.length > this.maxPostImages) {
            this.uploadImages = this.uploadImages.slice(0, this.maxPostImages);
          }
          return true;
        }
      } catch (e) {}
      return false;
    },

    async deleteFilePhysical(path) {
      if (!path || !path.startsWith('http')) return;
      try {
        await request('post.php?action=delete_file', { path });
      } catch (e) {}
    },

    async chooseImage() {
      if (!this.isLogin) return this.goLogin();
      if (this.isUploading) return this.showHUD('error', '图片正在上传中');
      this.loadRuntimeConfig().catch(() => {});
      if (this.uploadImages.length >= this.maxPostImages) {
        return this.showHUD('error', '最多上传 ' + this.maxPostImages + ' 张图片');
      }

      uni.chooseImage({
        count: this.maxPostImages - this.uploadImages.length,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const remain = this.maxPostImages - this.uploadImages.length;
          const tempPaths = (res.tempFilePaths || []).slice(0, remain);
          if (!tempPaths || tempPaths.length === 0) return;

          const startIndex = this.uploadImages.length;
          this.uploadImages.push(...tempPaths);

          this.isUploading = true;
          this.uploadProgress = 0;

          await new Promise(r => setTimeout(r, 300));

          for (let i = 0; i < tempPaths.length; i++) {
            const localPath = tempPaths[i];
            const currentIndex = startIndex + i;

            try {
              const up = await uploadFile(localPath, {
                type: 'post',
                current_count: currentIndex,
                convert_format: 'webp',
                compress_quality: '80'
              });
              const serverUrl = (up && typeof up === 'object')
                ? (up.url || up.avatarPath || '')
                : String(up || '');

              if (serverUrl && this.uploadImages[currentIndex] === localPath) {
                this.uploadImages.splice(currentIndex, 1, serverUrl);
              } else if (this.uploadImages[currentIndex] === localPath) {
                this.uploadImages.splice(currentIndex, 1);
                this.showHUD('error', '上传返回异常');
              }
            } catch (e) {
              if (e.code === -2) {
                this.isUploading = false;
                this.handleBan(e.msg);
                return;
              }
              if (this.uploadImages[currentIndex] === localPath) {
                this.uploadImages.splice(currentIndex, 1);
              }
              this.showHUD('error', e.msg || '图片上传失败，已自动移除');
            }

            const percent = Math.floor(((i + 1) / tempPaths.length) * 100);
            this.uploadProgress = percent;
          }

          this.uploadImages = this.uploadImages
            .filter(img => img.startsWith('http'))
            .slice(0, this.maxPostImages);

          setTimeout(() => {
            this.isUploading = false;
            this.hideHUD();
          }, 500);
        }
      });
    },

    async chooseVideo() {
      if (!this.isLogin) return this.goLogin();
      this.loadRuntimeConfig().catch(() => {});
      if (!this.isVideoFeatureEnabled) return this.showHUD('error', '视频发布功能已关闭');

      uni.chooseVideo({
        sourceType: ['camera', 'album'],
        compressed: true,
        maxDuration: 60,
        success: async (res) => {
          if (res.size > 150 * 1024 * 1024) {
            this.showHUD('error', '视频不能超过 150MB');
            return;
          }

          this.isUploading = true;
          this.uploadProgress = 0;

          const simulateTimer = setInterval(() => {
            if (this.uploadProgress < 90) this.uploadProgress += 5;
          }, 500);

          try {
            const up = await uploadFile(res.tempFilePath, { type: 'video' });

            clearInterval(simulateTimer);
            this.uploadProgress = 100;

            const videoUrl = (up && typeof up === 'object') ? (up.url || '') : String(up || '');
            let coverUrl = (up && typeof up === 'object')
              ? (up.cover || up.cover_url || up.poster || '')
              : '';

            if (!videoUrl) {
              throw { msg: '视频上传返回为空' };
            }

            if (!coverUrl) {
              const thumbPath = res.thumbTempFilePath || res.tempThumbPath || res.poster || '';
              if (thumbPath) {
                try {
                  const thumbUp = await uploadFile(thumbPath, {
                    type: 'post',
                    current_count: 0,
                    convert_format: 'webp',
                    compress_quality: '80'
                  });
                  coverUrl = (thumbUp && typeof thumbUp === 'object')
                    ? (thumbUp.url || thumbUp.cover || '')
                    : String(thumbUp || '');
                } catch (e) {}
              }
            }

            this.videoUrl = videoUrl;
            this.videoCoverUrl = coverUrl;

            if (this.videoCoverUrl) this.uploadImages = [this.videoCoverUrl];
            else this.uploadImages = [];

            this.isPlayingVideo = false;
          } catch (e) {
            clearInterval(simulateTimer);
            this.isUploading = false;
            if (e.code === -2) this.handleBan(e.msg);
            else this.showHUD('error', e.msg || '上传失败');
          } finally {
            if (this.isUploading) {
              setTimeout(() => {
                this.isUploading = false;
              }, 500);
            }
          }
        }
      });
    },

    handleBan(msg) {
      uni.showModal({
        title: '安全警告',
        content: msg,
        showCancel: false,
        confirmText: '退出',
        success: () => {
          uni.removeStorageSync('token');
          uni.removeStorageSync('userInfo');
          uni.reLaunch({ url: '/pages/login/login' });
        }
      });
    },

    handleDeleteImage(idx) {
      if (this.isUploading) return;
      const url = this.uploadImages[idx];
      if (!this.isEditMode && url && url.startsWith('http')) this.deleteFilePhysical(url);
      this.uploadImages.splice(idx, 1);
    },

    handleDeleteVideo() {
      if (this.isUploading) return;
      this.isPlayingVideo = false;

      const v = this.videoUrl;
      const c = this.videoCoverUrl;

      this.videoUrl = '';
      this.videoCoverUrl = '';
      this.uploadImages = [];

      if (!this.isEditMode) {
        setTimeout(() => {
          this.deleteFilePhysical(v);
          this.deleteFilePhysical(c);
        }, 200);
      }
    },

    previewImage(urls, idx) {
      uni.previewImage({ urls, current: urls[idx] });
    },

    handleContentInput(e) {
      const v = (e && e.detail && typeof e.detail.value === 'string')
        ? e.detail.value
        : (this.content || '');

      this.content = v;

      const cursor = (e && e.detail && typeof e.detail.cursor === 'number')
        ? e.detail.cursor
        : -1;

      if (cursor > 0 && v[cursor - 1] === '@') {
        this.mentionInsertCursor = cursor - 1;
        this.openMentionPicker();
      }
    },

    openMentionPicker() {
      if (!this.isLogin) return this.goLogin();
      this.showMentionPicker = true;
      this.mentionKeyword = '';
      this.mentionUserList = [];
    },

    closeMentionPicker() {
      this.showMentionPicker = false;
      this.mentionKeyword = '';
      this.mentionUserList = [];
      this.mentionInsertCursor = -1;
    },

    searchMentionUsersDebounced() {
      if (this.mentionTimer) clearTimeout(this.mentionTimer);
      this.mentionTimer = setTimeout(() => this.searchMentionUsers(), 300);
    },

    async searchMentionUsers() {
      const kw = (this.mentionKeyword || '').trim();
      if (!kw) {
        this.mentionUserList = [];
        return;
      }

      try {
        const res = await request('post.php?action=searchUser', { keyword: kw, limit: 20 });
        if (res && res.code === 0) this.mentionUserList = res.data || [];
        else this.mentionUserList = [];
      } catch (e) {
        this.mentionUserList = [];
      }
    },

    selectMentionUser(u) {
      if (!u || !u.id) return;

      const nick = u.name || u.username || '用户';
      const tag = `@[${nick}](uid:${u.id})`;

      const pos = this.mentionInsertCursor;
      if (pos >= 0) {
        const before = this.content.slice(0, pos);
        const after = this.content.slice(pos + 1);
        this.content = `${before}${tag} ${after}`;
      } else {
        this.content = `${this.content}${tag} `;
      }

      this.closeMentionPicker();
    },

    openCoCreatorPicker() {
      if (!this.isLogin) return this.goLogin();
      this.showCoPicker = true;
      this.coKeyword = '';
      // 打开时自动加载互相关注的用户
      this.loadMutualFollowUsers();
    },

    async loadMutualFollowUsers() {
      try {
        const res = await request('user.php', {
          action: 'mutual',
          page: 1
        });

        if (res && res.code === 0) {
          // 后端已直接返回互关列表，无需再过滤
          const arr = Array.isArray(res.data)
            ? res.data
            : (res.data && Array.isArray(res.data.list) ? res.data.list : []);
          this.coUserList = arr;
        } else {
          this.coUserList = [];
        }
      } catch (e) {
        this.coUserList = [];
      }
    },

    closeCoCreatorPicker() {
      this.showCoPicker = false;
      this.coKeyword = '';
      this.coUserList = [];
    },

    searchCoUsersDebounced() {
      if (this.coTimer) clearTimeout(this.coTimer);
      this.coTimer = setTimeout(() => this.searchCoUsers(), 300);
    },

    async searchCoUsers() {
      const kw = (this.coKeyword || '').trim();
      if (!kw) {
        // 清空关键词时恢复互关列表
        this.loadMutualFollowUsers();
        return;
      }

      try {
        // 用 user.php 的 search action 搜索，再本地过滤出互关的人
        const res = await request('user.php', { action: 'search', keyword: kw, limit: 50 });
        if (res && res.code === 0) {
          const arr = Array.isArray(res.data)
            ? res.data
            : (res.data && Array.isArray(res.data.list) ? res.data.list : []);
          this.coUserList = arr.filter(u => u.is_following === true && u.is_follower === true);
        } else {
          this.coUserList = [];
        }
      } catch (e) {
        this.coUserList = [];
      }
    },

    toggleCoCreator(u) {
      if (!u || !u.id) return;

      // 用户 id 是字符串 uid(如 2026083020290146FBAB), 不能用 parseInt 截断
      const id = String(u.id).trim();
      if (!id) return;

      const exists = this.coCreatorIds.includes(id);
      if (exists) {
        this.removeCoCreator(id);
        return;
      }

      if (this.coCreators.length >= 3) {
        this.showHUD('error', '共创者最多 3 人');
        return;
      }

      this.coCreators.push({
        id,
        name: u.name || u.username || '用户',
        username: u.username || '',
        avatar: u.avatar || '/static/logo.png'
      });
      this.coCreatorIds = this.coCreators.map(x => x.id);
    },

    removeCoCreator(id) {
      this.coCreators = this.coCreators.filter(x => String(x.id) !== String(id));
      this.coCreatorIds = this.coCreators.map(x => x.id);
    },

    async openProductPicker() {
      if (!this.isLogin) return this.goLogin();
      this.showProductPicker = true;
      if (this.productList.length > 0 || this.productLoading) return;
      this.productLoading = true;
      try {
        const res = await request('market.php?action=my_pub', { action: 'my_pub' }, 'POST');
        if (res && res.code === 0) {
          this.productList = (res.data || []).filter(p => parseInt(p.status) === 1);
        } else {
          this.showHUD('error', (res && res.msg) || '商品加载失败');
        }
      } catch (e) {
        this.showHUD('error', '商品加载失败');
      } finally {
        this.productLoading = false;
      }
    },

    closeProductPicker() {
      this.showProductPicker = false;
    },

    selectShareProduct(p) {
      if (!p || !p.id) return;
      this.shareProduct = {
        id: p.id,
        title: p.title || '商品',
        price: p.price || '0.00',
        image: p.image || ''
      };
      this.closeProductPicker();
    },

    removeShareProduct() {
      this.shareProduct = null;
    },

    openLinkPanel() {
      this.linkDraftTitle = this.shareLinkTitle || '';
      this.linkDraftUrl = this.shareLinkUrl || '';
      this.showLinkPanel = true;
    },

    closeLinkPanel() {
      this.showLinkPanel = false;
    },

    confirmLinkInsert() {
      const url = (this.linkDraftUrl || '').trim();
      const title = (this.linkDraftTitle || '').trim();
      if (!/^https?:\/\//i.test(url)) {
        this.showHUD('error', '请输入 http 或 https 链接');
        return;
      }
      this.shareLinkTitle = title;
      this.shareLinkUrl = url;
      this.closeLinkPanel();
    },

    removeShareLink() {
      this.shareLinkTitle = '';
      this.shareLinkUrl = '';
      this.linkDraftTitle = '';
      this.linkDraftUrl = '';
    },

    openDouyinPanel() {
      this.douyinDraftUrl = '';
      this.douyinDraftData = null;
      this.showDouyinPanel = true;
    },

    closeDouyinPanel() {
      this.showDouyinPanel = false;
      this.douyinDraftUrl = '';
      this.douyinDraftData = null;
    },

    extractDouyinUrl(text) {
      const patterns = [
        /https?:\/\/(?:v\.)?douyin\.com\/[a-zA-Z0-9]+\/?/gi,
        /https?:\/\/(?:www\.)?douyin\.com\/video\/\d+/gi,
        /https?:\/\/iesdouyin\.com\/share\/video\/\d+/gi,
        /https?:\/\/(?:www\.)?douyin\.com\/share\/video\/\d+/gi,
        /https?:\/\/douyin\.com\/.*video_id=[a-zA-Z0-9]+/gi
      ];

      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          return matches[0];
        }
      }
      return null;
    },

    async parseDouyinLink() {
      let url = (this.douyinDraftUrl || '').trim();
      
      if (!url) {
        this.showHUD('error', '请输入抖音链接');
        return;
      }

      const extractedUrl = this.extractDouyinUrl(url);
      if (!extractedUrl) {
        this.showHUD('error', '未能检测到有效的抖音链接');
        return;
      }

      url = extractedUrl;

      this.isDouyinParsing = true;
      this.showHUD('loading', '解析中...');

      try {
        const apiUrl = `https://api.xiaotuo.net/api/jiexi/?apikey=08af8a42-7511-83e1-17e8-10b71a207912afef78be&url=${encodeURIComponent(url)}`;
        const res = await uni.request({
          url: apiUrl,
          method: 'GET',
          timeout: 30000
        });
        
        if (res.statusCode !== 200) {
          throw { msg: '网络请求失败，状态码: ' + res.statusCode };
        }
        
        const data = res.data;
        
        if (!data) {
          throw { msg: '解析失败，返回数据为空' };
        }
        
        let playUrl = '';
        let cover = '';
        let title = '';
        let author = '';
        
        if (data.data && data.data.video_url) playUrl = data.data.video_url;
        else if (data.data && data.data.video) playUrl = data.data.video;
        else if (data.data && data.data.play) playUrl = data.data.play;
        else if (data.data && data.data.url) playUrl = data.data.url;
        else if (data.video_url) playUrl = data.video_url;
        else if (data.video) playUrl = data.video;
        else if (data.play) playUrl = data.play;
        else if (data.url) playUrl = data.url;
        
        if (data.data && data.data.cover_url) cover = data.data.cover_url;
        else if (data.data && data.data.cover) cover = data.data.cover;
        else if (data.data && data.data.img) cover = data.data.img;
        else if (data.cover_url) cover = data.cover_url;
        else if (data.cover) cover = data.cover;
        else if (data.img) cover = data.img;
        
        if (data.data && data.data.title) title = data.data.title;
        else if (data.title) title = data.title;
        
        if (data.data && data.data.nickname) author = data.data.nickname;
        else if (data.data && data.data.author) author = data.data.author;
        else if (data.nickname) author = data.nickname;
        else if (data.author) author = data.author;
        
        if (!playUrl) {
          throw { msg: '解析失败，未能获取视频链接' };
        }
        
        // 验证URL格式
        const urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/;
        if (!urlPattern.test(playUrl)) {
          throw { msg: '解析失败，视频链接格式无效' };
        }
        
        this.douyinDraftData = {
          url: playUrl,
          cover: cover,
          title: title,
          author: author,
          originalUrl: url
        };
        this.hideHUD();
      } catch (e) {
        this.showHUD('error', e.msg || '解析失败，请重试');
      } finally {
        this.isDouyinParsing = false;
      }
    },

    confirmDouyinInsert() {
      if (!this.douyinDraftData) {
        this.showHUD('error', '请先解析抖音链接');
        return;
      }
      this.douyinVideo = {
        url: this.douyinDraftData.url,
        cover: this.douyinDraftData.cover,
        title: this.douyinDraftData.title,
        author: this.douyinDraftData.author,
        originalUrl: this.douyinDraftUrl
      };
      this.closeDouyinPanel();
    },

    removeDouyinVideo() {
      this.douyinVideo = null;
      this.douyinDraftUrl = '';
      this.douyinDraftData = null;
    },

    togglePaid() {
      this.isPaid = !this.isPaid;
      if (this.isPaid) this.isCommentUnlock = false;
    },

    toggleCommentUnlock() {
      if (this.isPaid) return;
      this.isCommentUnlock = !this.isCommentUnlock;
    },

    async publishPost() {
      if (!this.isLogin) return this.goLogin();
      if (!this.canPublish || this.isSubmitting) return;

      const hasLocalPath = this.uploadImages.some(img => !img.startsWith('http'));
      if (hasLocalPath) {
        this.showHUD('error', '图片正在上传中');
        return;
      }

      if (this.uploadImages.length > this.maxPostImages) {
        this.showHUD('error', '最多上传 ' + this.maxPostImages + ' 张图片');
        return;
      }
      if (this.videoUrl && !this.isVideoFeatureEnabled) {
        this.showHUD('error', '视频发布功能已关闭');
        return;
      }

      if (this.isPaid) {
        const price = parseFloat(this.postPrice);
        if (!price || price < 0.01) return this.showHUD('error', '付费价格至少 ¥0.01');
        if (price > 999) return this.showHUD('error', '付费价格最高 ¥999');
      }

      this.isSubmitting = true;
      this.showHUD('loading', '正在发布...');

      try {
        const circle = this.circleList[this.circleIndex];
        // 话题完全从正文 #话题 自动解析
        const customNames = this.parsedTopics.join('||');
        const topicIds = customNames ? `|${customNames}` : '';
        const imagesStr = (this.uploadImages || []).join(',');

        const res = await request('post.php?action=' + (this.isEditMode ? 'updatePost' : 'publish'), {
          postId: this.isEditMode ? this.editPostId : '',
          userId: this.loginUser.id,
          circleId: circle.id,
          topicIds,
          title: this.title.trim(),
          content: this.content.trim(),
          images: imagesStr,
          video: this.videoUrl,
          coCreatorIds: (this.coCreatorIds || []).join(','),
          is_paid: this.isPaid ? 1 : 0,
          price: this.isPaid ? parseFloat(this.postPrice).toFixed(2) : '0.00',
          is_comment_unlock: (!this.isPaid && this.isCommentUnlock) ? 1 : 0,
          share_product_id: this.shareProduct ? this.shareProduct.id : 0,
          share_link_title: this.shareLinkTitle || '',
          share_link_url: this.shareLinkUrl || '',
          douyin_url: this.douyinVideo ? (this.douyinVideo.originalUrl || this.douyinVideo.url || '') : '',
          douyin_cover: this.douyinVideo ? (this.douyinVideo.cover || '') : '',
          douyin_title: this.douyinVideo ? (this.douyinVideo.title || '') : '',
          douyin_author: this.douyinVideo ? (this.douyinVideo.author || '') : '',
          douyin_original_url: ''
        });

        if (res.code !== 0) throw res;

        this.showHUD('success', '发布成功');

        setTimeout(() => {
          this.hideHUD();
          this.resetForm(false);
          uni.setStorageSync('_forceRefreshHome', '1');
          uni.navigateBack();
          this.isSubmitting = false;
        }, 1500);
      } catch (e) {
        this.showHUD('error', e.msg || '发布失败');
        setTimeout(() => {
          this.isSubmitting = false;
        }, 2000);

        if (e.code === -2) this.handleBan(e.msg || '账号异常');
      }
    },

    handleReset() {
      this.showXhsTips({
        title: '重置',
        content: '确定清空当前内容吗？',
        showCancel: true,
        confirmText: '清空',
        isDestructive: true,
        onConfirm: () => {
          const shouldClean = !this.isEditMode;
          this.resetForm(shouldClean);
        }
      });
    },

    resetForm(cleanFiles = false) {
      if (cleanFiles) {
        this.uploadImages.forEach(url => this.deleteFilePhysical(url));
        if (this.videoUrl) this.deleteFilePhysical(this.videoUrl);
        if (this.videoCoverUrl) this.deleteFilePhysical(this.videoCoverUrl);
      }

      this.title = '';
      this.content = '';
      this.uploadImages = [];
      this.videoUrl = '';
      this.videoCoverUrl = '';
      this.circleIndex = -1;
      this.tempCircleIndex = -1;
      this.isEditMode = false;
      this.editPostId = null;
      this.isPlayingVideo = false;
      this.isSubmitting = false;

      this.coCreators = [];
      this.coCreatorIds = [];

      this.isPaid = false;
      this.postPrice = '';
      this.isCommentUnlock = false;
      this.shareProduct = null;
      this.shareLinkTitle = '';
      this.shareLinkUrl = '';
      this.linkDraftTitle = '';
      this.linkDraftUrl = '';
      
      this.douyinVideo = null;
      this.douyinDraftUrl = '';
      this.douyinDraftData = null;

      if (this.preSelectCircleId && this.circleList.length > 0) {
        const idx = this.circleList.findIndex(c => c.id == this.preSelectCircleId);
        if (idx >= 0) this.circleIndex = idx;
      }
    },

    handleCancel() {
      if (this.title || this.content || this.uploadImages.length || this.videoUrl) {
        this.showXhsTips({
          title: '放弃编辑',
          content: '退出将丢失当前内容',
          showCancel: true,
          confirmText: '退出',
          isDestructive: true,
          onConfirm: () => {
            const shouldClean = !this.isEditMode;
            this.resetForm(shouldClean);
            uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
          }
        });
      } else {
        uni.navigateBack();
      }
    },

    getCircleList() {
      const userInfo = uni.getStorageSync('userInfo') || {}
      return request('circle.php?action=list', { userId: userInfo.id || 0 }).then(res => {
        if (res.code === 0) {
          const data = res.data
          this.circleList = Array.isArray(data) ? data : (data && data.list) || [];
          if (this.preSelectCircleId) {
            const idx = this.circleList.findIndex(c => c.id == this.preSelectCircleId);
            if (idx >= 0) this.circleIndex = idx;
          }
          return this.circleList
        }
        throw new Error(res.msg || '获取圈子失败')
      })
    },

    getPostDetail(postId) {
      return request('post.php?action=detail', { postId });
    },

    async openCirclePicker() {
      this.tempCircleIndex = this.circleIndex;
      if (!this.circleList.length) {
        uni.showLoading({ title: '加载中...' });
        try {
          await this.getCircleList();
        } catch (e) {
          uni.hideLoading();
          const msg = (e && e.message) || '获取圈子失败'
          uni.showToast({ title: msg, icon: 'none', duration: 2000 })
          return
        }
        uni.hideLoading();
      }
      this.showCirclePicker = true;
    },

    closeCirclePicker() {
      this.showCirclePicker = false;
    },

    onSelectCircle(item) {
      this.tempCircleIndex = this.circleList.findIndex(c => c.id === item.id);
      this.confirmCirclePicker();
    },

    // 圈子/分类图标: 仅 URL 返回, emoji/空 返回空串走文本兜底
    circleIconSrc(item) {
      const v = (item && (item.image || item.icon)) || '';
      return /^(https?:)?\/\//i.test(v) ? v : '';
    },
    groupIconSrc(group) {
      const v = (group && group.icon) || '';
      return /^(https?:)?\/\//i.test(v) ? v : '';
    },

    confirmCirclePicker() {
      this.circleIndex = this.tempCircleIndex;
      this.closeCirclePicker();
    },

    showXhsTips(conf) {
      this.xhsModal = {
        show: true,
        title: conf.title,
        content: conf.content,
        showCancel: !!conf.showCancel,
        confirmText: conf.confirmText,
        isDestructive: !!conf.isDestructive,
        onConfirm: conf.onConfirm
      };
    },

    closeXhsModal() {
      this.xhsModal.show = false;
    },

    confirmXhsModal() {
      const cb = this.xhsModal.onConfirm;
      this.closeXhsModal();
      if (cb) cb();
    },

    async initEditor() {
      const d = uni.getStorageSync('editPostData');

      if (d && d.postId) {
        this.isEditMode = true;
        this.editPostId = d.postId;
        uni.removeStorageSync('editPostData');

        this.showHUD('loading', '加载内容...');

        try {
          const detailRes = await this.getPostDetail(this.editPostId);
          if (!this.circleList.length) await this.getCircleList();

          this.hideHUD();

          if (detailRes.code === 0) {
            this.fillForm(detailRes.data);
          } else {
            this.showHUD('error', detailRes.msg || '加载失败');
            setTimeout(() => uni.navigateBack(), 2000);
          }
        } catch (e) {
          this.hideHUD();
        }
      }
    },

    fillForm(postData) {
      if (!postData) return;

      this.title = postData.title || '';
      this.content = postData.content || '';

      const imageList = Array.isArray(postData.images)
        ? [...postData.images]
        : (typeof postData.images === 'string' && postData.images.trim()
            ? postData.images.split(',').map(s => s.trim()).filter(Boolean)
            : []);

      this.uploadImages = imageList;
      this.videoUrl = postData.video || '';

      this.videoCoverUrl =
        postData.cover ||
        postData.video_cover ||
        postData.videoCover ||
        ((this.videoUrl && this.uploadImages.length > 0) ? this.uploadImages[0] : '');

      if (this.videoUrl && this.videoCoverUrl && this.uploadImages.length === 0) {
        this.uploadImages = [this.videoCoverUrl];
      }

      if (this.videoUrl) {
        this.isPlayingVideo = false;
      }

      const cIdx = this.circleList.findIndex(c => c.id == postData.circle_id);
      if (cIdx >= 0) this.circleIndex = cIdx;

      // 话题由正文 #话题 自动解析，编辑模式无需恢复原话题选择
      if (postData.co_creators && Array.isArray(postData.co_creators)) {
        this.coCreators = postData.co_creators.map(u => ({
          id: String(u.id).trim(),
          name: u.name || u.username || '用户',
          username: u.username || '',
          avatar: u.avatar || '/static/logo.png'
        })).filter(x => x.id);
        this.coCreatorIds = this.coCreators.map(x => x.id);
      } else {
        this.coCreators = [];
        this.coCreatorIds = [];
      }

      if (postData.share_product) {
        this.shareProduct = {
          id: postData.share_product.id,
          title: postData.share_product.title || '商品',
          price: postData.share_product.price || '0.00',
          image: postData.share_product.image || (postData.share_product.images && postData.share_product.images[0]) || ''
        };
      } else {
        this.shareProduct = null;
      }

      this.shareLinkTitle = postData.share_link_title || '';
      this.shareLinkUrl = postData.share_link_url || '';
      this.linkDraftTitle = this.shareLinkTitle;
      this.linkDraftUrl = this.shareLinkUrl;

      if (postData.douyin_url) {
        this.douyinVideo = {
          url: postData.douyin_url || '',
          cover: postData.douyin_cover || '',
          title: postData.douyin_title || '',
          author: postData.douyin_author || '',
          originalUrl: postData.douyin_original_url || ''
        };
      } else {
        this.douyinVideo = null;
      }
    }
  }
};
</script>

<style scoped>
.publish-container {
  --bg-color: #f7f7f9;
  --card-bg: #ffffff;
  --text-color: #1a1a1a;
  --sub-text-color: #8a8a8e;
  --placeholder-color: #b8b8bd;
  --border-color: #eceef1;
  --divider-color: #f2f3f5;
  --accent: #ff2e4d;
  --accent-soft: #fff1f3;
  --brand: #1a1a1a;
  --radius-lg: 20rpx;
  --radius-md: 16rpx;
  --radius-sm: 10rpx;

  min-height: 100vh;
  background: var(--bg-color);
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica, sans-serif;
}

.custom-nav-bar {
  height: 44px;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-color);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 100;
  box-sizing: border-box;
}

.nav-text {
  font-size: 28rpx;
  color: var(--sub-text-color);
  padding: 10rpx 14rpx;
  letter-spacing: 0.5rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: 1rpx;
}

.editor-main {
  padding: 8rpx 24rpx 0;
  flex: 1;
  overflow-y: auto;
  box-sizing: border-box;
  transform: translateZ(0);
}

/* ===== 作者行 ===== */
.author-row {
  display: flex;
  align-items: center;
  padding: 20rpx 8rpx 28rpx;
}
.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f0f0f0;
}
.author-meta {
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.author-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.2;
}
.author-hint {
  font-size: 22rpx;
  color: var(--sub-text-color);
  margin-top: 6rpx;
}

/* ===== 标题 / 正文 ===== */
.title-block {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 24rpx 28rpx 18rpx;
  position: relative;
  margin-bottom: 16rpx;
}
.editor-title {
  font-size: 36rpx;
  font-weight: 700;
  height: 64rpx;
  color: var(--text-color);
  width: 100%;
  letter-spacing: 0.5rpx;
}
.placeholder-title {
  color: var(--placeholder-color);
  font-weight: 600;
  font-size: 36rpx;
}
.counter {
  position: absolute;
  right: 28rpx;
  bottom: 16rpx;
  font-size: 22rpx;
  color: var(--placeholder-color);
  letter-spacing: 1rpx;
}
.counter.warning { color: var(--accent); }

.content-block {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 24rpx 28rpx 28rpx;
  margin-bottom: 20rpx;
}

/* 内容中 #话题 自动解析预览 */
.inline-topics-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 0 8rpx 20rpx;
}
.inline-topic-chip {
  height: 52rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
  background: #EBF2FF;
  color: #2b6cb0;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  border: 1rpx solid transparent;
}

.publish-side-toolbox {
  position: fixed;
  right: 18rpx;
  top: 36%;
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.toolbox-btn {
  width: 92rpx;
  height: 92rpx;
  border-radius: 24rpx;
  background: rgba(255,255,255,0.96);
  box-shadow: 0 10rpx 28rpx rgba(15,23,42,0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.toolbox-icon {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #ff2e4d;
  color: #fff;
  font-size: 20rpx;
  line-height: 34rpx;
  text-align: center;
  font-weight: 700;
}

.toolbox-icon.link {
  background: #2563eb;
}

.toolbox-text {
  font-size: 22rpx;
  color: #333;
  font-weight: 600;
}

.share-preview-card {
  margin-bottom: 20rpx;
}

.share-preview-main {
  background: #fff;
  border-radius: 18rpx;
  padding: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
  border: 1rpx solid #eef0f4;
}

.share-product-img {
  width: 92rpx;
  height: 92rpx;
  border-radius: 12rpx;
  background: #f3f4f6;
  flex-shrink: 0;
}

.share-preview-info {
  flex: 1;
  min-width: 0;
}

.share-preview-title {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-preview-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #ff2e4d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-remove {
  width: 46rpx;
  height: 46rpx;
  border-radius: 50%;
  background: #f3f4f6;
  color: #737373;
  text-align: center;
  line-height: 46rpx;
  font-size: 30rpx;
}

.share-link-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #eff6ff;
  color: #2563eb;
  font-size: 26rpx;
  line-height: 72rpx;
  text-align: center;
  font-weight: 700;
  flex-shrink: 0;
}
.editor-content {
  width: 100%;
  min-height: 260rpx;
  font-size: 30rpx;
  line-height: 1.7;
  color: var(--text-color);
  letter-spacing: 0.3rpx;
}
.placeholder-content {
  color: var(--placeholder-color);
  font-size: 30rpx;
  line-height: 1.7;
}

/* ===== 媒体上传 ===== */
.media-uploader {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.img-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.img-grid-inner, .add-btn-group { display: contents; }

.img-cell {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #f3f4f6;
  position: relative;
}
.uploaded-img { width: 100%; height: 100%; }

.media-add-btn {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  background: #fafafa;
  border: 1.5rpx dashed #d8d8dd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.add-icon-box {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #eceef1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
}
.add-icon-box.video { background: rgba(255,46,77,0.08); }
.add-icon-plus {
  font-size: 40rpx;
  color: var(--text-color);
  line-height: 1;
  font-weight: 300;
}
.add-icon-tri {
  width: 0;
  height: 0;
  border-left: 16rpx solid var(--accent);
  border-top: 10rpx solid transparent;
  border-bottom: 10rpx solid transparent;
  margin-left: 4rpx;
}
.add-txt {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--sub-text-color);
  letter-spacing: 0.5rpx;
}
.video-btn .add-txt { color: var(--accent); }

.btn-hover-light { opacity: 0.72; transform: scale(0.98); }

.video-wrapper {
  width: 100%;
  height: 420rpx;
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000;
}
.video-player { width: 100%; height: 100%; display: block; }

.video-placeholder {
  width: 100%;
  height: 100%;
  background: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26rpx;
  position: relative;
  overflow: hidden;
}
.video-cover-image { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 1; }
.video-cover-empty {
  position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 1;
  background: linear-gradient(135deg, #1f1f1f 0%, #3a3a3a 100%);
}
.video-cover-mask {
  position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 2;
  background: rgba(0, 0, 0, 0.22);
}
.play-icon-wrap {
  width: 96rpx; height: 96rpx;
  background: rgba(255,255,255,0.22);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20rpx;
  backdrop-filter: blur(6px);
  position: relative; z-index: 3;
}
.play-triangle {
  width: 0; height: 0;
  border-left: 26rpx solid #fff;
  border-top: 16rpx solid transparent;
  border-bottom: 16rpx solid transparent;
  margin-left: 8rpx;
}
.placeholder-text { position: relative; z-index: 3; color: #fff; font-size: 24rpx; letter-spacing: 1rpx; }

.del-btn-view, .del-btn-cover {
  position: absolute;
  top: 10rpx; right: 10rpx;
  width: 40rpx; height: 40rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 5;
}
.del-text { color: #fff; font-size: 26rpx; font-weight: 500; line-height: 1; }

.upload-tip {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: var(--placeholder-color);
  margin-top: 16rpx;
  letter-spacing: 1rpx;
}

/* ===== 设置分组 ===== */
.setting-group {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 8rpx 28rpx;
  margin-bottom: 16rpx;
}
.setting-group.pay-group { padding-top: 20rpx; }
.group-title {
  font-size: 24rpx;
  color: var(--sub-text-color);
  font-weight: 500;
  padding: 0 4rpx 8rpx;
  letter-spacing: 1rpx;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 96rpx;
  padding: 16rpx 0;
}
.setting-divider {
  height: 1rpx;
  background: var(--divider-color);
  margin-left: 0;
}
.setting-label {
  display: flex;
  align-items: center;
  flex: 1;
}
.setting-dot {
  width: 8rpx;
  height: 32rpx;
  border-radius: 4rpx;
  margin-right: 18rpx;
}
.setting-dot.circle { background: #1a1a1a; }
.setting-dot.topic { background: #ffb020; }
.setting-dot.cocreator { background: #18b894; }
.setting-title {
  font-size: 28rpx;
  color: var(--text-color);
  font-weight: 500;
}
.setting-required {
  display: inline-block;
  margin-left: 12rpx;
  font-size: 20rpx;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  line-height: 1.5;
}
.setting-value {
  display: flex;
  align-items: center;
  max-width: 55%;
}
.setting-circle-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  margin-right: 10rpx;
  flex-shrink: 0;
  background: #f2f3f5;
}
.setting-text {
  font-size: 26rpx;
  color: var(--text-color);
  max-width: 320rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.setting-text.placeholder { color: var(--placeholder-color); }
.setting-arrow {
  font-size: 34rpx;
  color: #cbcbd1;
  margin-left: 10rpx;
  line-height: 1;
  font-weight: 300;
}

.setting-icon-box {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}
.setting-icon-box.paid { background: linear-gradient(135deg, #fff3d6, #ffe5b4); }
.setting-icon-box.comment { background: linear-gradient(135deg, #e0f3ff, #c9e6ff); }
.setting-icon-box .si-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.setting-icon-box.paid .si-text { color: #b85c00; }
.setting-icon-box.comment .si-text { color: #1668dc; font-size: 24rpx; }
.setting-col {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.setting-sub {
  font-size: 22rpx;
  color: var(--sub-text-color);
  line-height: 1.3;
}

/* ===== 开关 ===== */
.toggle-btn {
  width: 88rpx;
  height: 52rpx;
  border-radius: 26rpx;
  background: #e6e7ea;
  position: relative;
  transition: background 0.2s;
}
.toggle-btn.on { background: #1a1a1a; }
.toggle-knob {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  transition: left 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15);
}
.toggle-btn.on .toggle-knob { left: 40rpx; }

.pay-price-row {
  display: flex;
  align-items: center;
  padding: 4rpx 0 20rpx;
  margin-left: 84rpx;
}
.pay-price-label {
  font-size: 26rpx;
  color: var(--sub-text-color);
  margin-right: 16rpx;
}
.pay-price-input-wrap {
  flex: 1;
  background: #f5f5f7;
  border-radius: 12rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  height: 64rpx;
}
.pay-price-currency {
  font-size: 28rpx;
  color: var(--text-color);
  margin-right: 6rpx;
  font-weight: 600;
}
.pay-price-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-color);
  font-weight: 600;
}
.pay-ph { color: var(--placeholder-color); font-size: 26rpx; font-weight: 400; }

/* ===== 标签气泡 ===== */
.tags-display-area {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 4rpx 4rpx 20rpx;
}
.tag-badge {
  height: 52rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  background: #fff;
  color: var(--text-color);
  border: 1rpx solid var(--border-color);
}
.tag-badge.co-tag { background: #e8faf4; color: #108f70; border-color: transparent; }

.badge-close {
  margin-left: 10rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  line-height: 1;
  color: #888;
}

/* ===== 底部提交 ===== */
.footer-spacer { height: 200rpx; }

.floating-submit-bar {
  position: fixed;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  left: 24rpx;
  right: 24rpx;
  z-index: 99;
}

.submit-btn {
  border-radius: 48rpx;
  height: 96rpx;
  background: #1a1a1a;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.18);
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  transition: all 0.25s;
}
.submit-btn.disabled {
  opacity: 0.45;
  box-shadow: none;
}

.btn-hover-active { transform: scale(0.98); opacity: 0.92; }

.btn-loading-spinner {
  width: 32rpx; height: 32rpx;
  border: 4rpx solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.progress-mask {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: var(--bg-color);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.progress-box-minimal { width: 60%; text-align: center; }
.progress-percent-big {
  font-size: 96rpx;
  font-weight: 800;
  color: var(--text-color);
  font-family: 'DIN Alternate', 'SF Pro Display', sans-serif;
  letter-spacing: 2rpx;
}
.percent-symbol { font-size: 40rpx; margin-left: 6rpx; font-weight: 500; }
.progress-note { display: block; margin-top: 14rpx; color: var(--sub-text-color); font-size: 24rpx; letter-spacing: 1rpx; }
.progress-bar-bg-minimal {
  height: 6rpx;
  background: var(--divider-color);
  border-radius: 3rpx;
  overflow: hidden;
  width: 100%;
  margin-top: 24rpx;
}
.progress-bar-fill-minimal {
  height: 100%;
  background: var(--text-color);
  transition: width 0.25s ease-out;
}

.login-auth-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.auth-logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 40rpx;
  border-radius: 36rpx;
}
.animate-float { animation: float 3s ease-in-out infinite; }
.auth-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 60rpx;
  letter-spacing: 1rpx;
}
.auth-btn {
  width: 400rpx;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  margin-bottom: 24rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}
.auth-btn.login { background: var(--text-color); color: #fff; }
.auth-btn.refresh { background: #f0f0f3; color: var(--sub-text-color); }

.custom-picker {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 900;
  visibility: hidden;
}

.custom-picker.show {
  visibility: visible;
}

.picker-mask {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  transition: opacity 0.3s;
  backdrop-filter: blur(2px);
}

.custom-picker.show .picker-mask {
  opacity: 1;
}

.picker-panel {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: var(--bg-color);
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.custom-picker.show .picker-panel {
  transform: translateY(0);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid var(--border-color);
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-color);
}

.ph-title {
  text-align: center;
  flex: 1;
}

.ph-close {
  color: #999;
}

.ph-cancel {
  color: #999;
}

.ph-confirm {
  color: var(--primary-color);
}

.picker-scroll {
  flex: 1;
  height: 48vh;
  max-height: 52vh;
  overflow-y: auto;
}

.grid-options {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20rpx;
  padding: 30rpx;
}

.circle-group {
  padding-bottom: 6rpx;
}

.circle-group-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 30rpx 0;
}

.circle-group-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #f2f3f5;
  flex-shrink: 0;
}

.circle-group-emoji {
  font-size: 26rpx;
  line-height: 1;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.circle-group-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-color);
}

.circle-group-count {
  font-size: 22rpx;
  color: #999;
  margin-left: auto;
  padding-right: 30rpx;
}

.grid-item {
  background: var(--capsule-bg);
  padding: 24rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: var(--text-color);
  border: 2rpx solid transparent;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.grid-circle-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f2f3f5;
}

.grid-circle-fallback {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8f0fe, #dbe7fd);
  color: #2563eb;
  font-size: 36rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-circle-emoji {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f2f3f5;
  font-size: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-icon {
  width: 28rpx;
  height: 28rpx;
  position: absolute;
  top: 8rpx;
  right: 8rpx;
}

.grid-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-color);
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.grid-desc {
  font-size: 20rpx;
  color: #999;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.grid-item.selected {
  background: var(--capsule-active-bg);
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: bold;
}

.empty-data {
  text-align: center;
  padding: 60rpx;
  color: var(--sub-text-color);
}

.topic-panel {
  display: flex;
  flex-direction: column;
  height: 80vh;
}

.topic-input-area {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin: 24rpx 30rpx;
  padding: 0 24rpx;
  background: #f7f7f7;
  border-radius: 16rpx;
  height: 88rpx;
}

.hash-icon {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 12rpx;
}

.topic-real-input {
  flex: 1;
  height: 88rpx;
  font-size: 30rpx;
  color: #333;
}

.topic-add-text {
  font-size: 28rpx;
  color: #999;
  font-weight: 600;
  padding: 10rpx 0 10rpx 20rpx;
}

.topic-add-text.active {
  color: var(--primary-color);
}

.temp-selected-row {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 30rpx 20rpx;
}

.temp-tag {
  font-size: 26rpx;
  color: var(--primary-color);
  background: var(--capsule-active-bg);
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
}

.temp-tag.custom {
  color: #eb2f96;
  background: #fff0f6;
}

.temp-tag.co {
  color: #2e7d32;
  background: #f1fff0;
}

.temp-tag .del {
  margin-left: 10rpx;
  font-size: 32rpx;
  opacity: 0.6;
}

.topic-scroll-fix {
  flex: 1;
  overflow-y: auto;
  height: 0;
  width: 100%;
}

.section-label {
  font-size: 28rpx;
  color: #999;
  margin: 30rpx 30rpx 20rpx;
}

.topic-list-vertical {
  padding: 0 30rpx 40rpx;
  padding-bottom: 100rpx;
}

.topic-list-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f9f9f9;
}

.item-hash {
  font-size: 30rpx;
  font-weight: bold;
  margin-right: 12rpx;
  color: #333;
}

.item-name {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.item-check {
  color: var(--primary-color);
  font-weight: bold;
  font-size: 32rpx;
}

.mention-user-item {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f3f3f3;
}

.mention-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  margin-right: 18rpx;
}

.mention-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.mention-picked {
  font-size: 24rpx;
  color: #2e7d32;
}

.product-pick-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1f2f4;
}

.product-pick-img {
  width: 92rpx;
  height: 92rpx;
  border-radius: 14rpx;
  background: #f3f4f6;
  flex-shrink: 0;
}

.product-pick-info {
  flex: 1;
  min-width: 0;
}

.product-pick-title {
  display: block;
  font-size: 28rpx;
  color: #222;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-pick-price {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #ff2e4d;
  font-weight: 700;
}

.link-panel {
  padding-bottom: 34rpx;
}

.link-input-wrap {
  padding: 24rpx;
}

.link-input {
  height: 88rpx;
  border-radius: 18rpx;
  background: #f7f8fa;
  padding: 0 24rpx;
  margin-bottom: 18rpx;
  font-size: 28rpx;
  color: #222;
}

.xhs-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: 0.2s;
  backdrop-filter: blur(3px);
}

.xhs-modal-mask.show {
  opacity: 1;
  pointer-events: auto;
}

.xhs-modal-box {
  width: 600rpx;
  background: var(--bg-color);
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.2);
}

.xhs-modal-title {
  padding: 28rpx 28rpx 10rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.xhs-modal-content {
  padding: 0 28rpx 24rpx;
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.xhs-modal-footer {
  display: flex;
  border-top: 1rpx solid #f1f1f1;
}

.xhs-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 30rpx;
  color: #333;
}

.xhs-btn.cancel {
  color: #999;
  border-right: 1rpx solid #f1f1f1;
}

.xhs-btn.confirm {
  color: var(--primary-color);
  font-weight: 700;
}

.red-text {
  color: #ff4d4f !important;
}

.ios-hud-wrapper {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ios-hud-box {
  width: 320rpx;
  background: rgba(0,0,0,0.72);
  border-radius: 24rpx;
  padding: 26rpx 22rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ios-spinner {
  position: relative;
  width: 60rpx;
  height: 60rpx;
  margin-bottom: 16rpx;
}

.ios-spinner-blade {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6rpx;
  height: 16rpx;
  background: rgba(255,255,255,0.85);
  border-radius: 4rpx;
  transform-origin: center 26rpx;
  opacity: 0.15;
  animation: iosFade 1s linear infinite;
}

.ios-spinner-blade:nth-child(1) { animation-delay: 0s; }
.ios-spinner-blade:nth-child(2) { animation-delay: -0.083s; }
.ios-spinner-blade:nth-child(3) { animation-delay: -0.166s; }
.ios-spinner-blade:nth-child(4) { animation-delay: -0.249s; }
.ios-spinner-blade:nth-child(5) { animation-delay: -0.332s; }
.ios-spinner-blade:nth-child(6) { animation-delay: -0.415s; }
.ios-spinner-blade:nth-child(7) { animation-delay: -0.498s; }
.ios-spinner-blade:nth-child(8) { animation-delay: -0.581s; }
.ios-spinner-blade:nth-child(9) { animation-delay: -0.664s; }
.ios-spinner-blade:nth-child(10) { animation-delay: -0.747s; }
.ios-spinner-blade:nth-child(11) { animation-delay: -0.83s; }
.ios-spinner-blade:nth-child(12) { animation-delay: -0.913s; }

.ios-hud-text {
  color: #fff;
  font-size: 26rpx;
  text-align: center;
  line-height: 1.5;
}

.ios-hud-text.text-only {
  margin-top: 4rpx;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
}

@keyframes iosFade {
  0% { opacity: 1; }
  100% { opacity: 0.15; }
}

/* 付费设置旧样式保留 */
.pay-settings-card { display: none; }

/* ===== 抖音视频相关样式 ===== */
.toolbox-icon.douyin {
  background: linear-gradient(135deg, #ff2c55, #ff0050);
}

.douyin-card {
  position: relative;
  overflow: hidden;
}

.douyin-video-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
}

.douyin-play-icon {
  position: absolute;
  left: 40rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 48rpx;
  height: 48rpx;
  background: rgba(255, 44, 85, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.douyin-triangle {
  width: 0;
  height: 0;
  border-left: 16rpx solid #fff;
  border-top: 10rpx solid transparent;
  border-bottom: 10rpx solid transparent;
  margin-left: 4rpx;
}

.douyin-card .share-preview-sub {
  color: #999;
}

.douyin-panel {
  padding-bottom: 34rpx;
}

.douyin-input-wrap {
  padding: 24rpx;
}

.douyin-tip {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
  font-size: 26rpx;
  color: #666;
}

.douyin-tip .tip-hint {
  color: #999;
  font-size: 22rpx;
}

.douyin-input {
  height: 88rpx;
  border-radius: 18rpx;
  background: #f7f8fa;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #222;
}

.douyin-preview {
  margin-top: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid #eee;
}

.douyin-preview-video {
  width: 100%;
  height: 360rpx;
}

.douyin-video-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.douyin-play-icon-big {
  width: 88rpx;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.douyin-play-triangle {
  width: 0;
  height: 0;
  border-left: 24rpx solid #ff2c55;
  border-top: 14rpx solid transparent;
  border-bottom: 14rpx solid transparent;
  margin-left: 6rpx;
}

.douyin-preview-cover {
  width: 100%;
  height: 320rpx;
}

.douyin-preview-info {
  padding: 16rpx 20rpx;
}

.douyin-preview-info .preview-title {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.douyin-preview-info .preview-author {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.parse-btn {
  margin: 0 24rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #ff2c55, #ff0050);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #fff;
  font-weight: 600;
}

.parse-btn.loading {
  background: #ccc;
}

.parse-loading {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>