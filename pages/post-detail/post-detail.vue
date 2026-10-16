<template>
  <view
    class="detail-page-root"
    :class="{
      'is-video-page': isImmersiveVideoPage || videoFullscreen,
      'drawer-open': showCommentDrawer
    }"
  >
    <!-- 沉浸式全屏视频播放器(H5+App 均编译, 手机端不再黑屏) -->
    <view v-show="(isImmersiveVideoPage || videoFullscreen) && postInfo" class="video-detail-page">
      <video
        id="xhsVideoPlayer"
        :key="'vf' + videoKey"
        v-show="!isAppOverlayOpen"
        class="xhs-video-player"
        :src="isHls ? '' : postInfo.video"
        :poster="posterImage"
        :autoplay="true"
        :loop="true"
        :muted="isMuted && !isAppPlus"
        :controls="false"
        :show-center-play-btn="false"
        :show-play-btn="false"
        :show-fullscreen-btn="false"
        :enable-progress-gesture="false"
        object-fit="contain"
        playsinline
        webkit-playsinline
        x5-playsinline
        @tap="toggleVideoPlay"
        @play="onVideoPlay"
        @pause="onVideoPause"
        @error="onVideoFullscreenError"
      ></video>

      <view class="video-top-gradient"></view>
      <view class="video-bottom-gradient"></view>

      <!-- 锁定遮罩：视频本身也不能直接看 -->
      <view v-if="isContentLocked && !isOwner && !isAdmin" class="video-lock-overlay"></view>

      <!-- #ifndef APP-PLUS -->
      <view class="video-top-safe" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="video-top-bar" :style="{ height: navBarHeight + 'px' }">
          <view class="video-top-btn video-back-btn" @tap="goBack">
            <text class="video-top-btn-text">‹</text>
          </view>

          <view class="video-top-btn video-more-btn" @tap="openActionSheet">
            <view class="more-dots white-dots"><view class="more-dot"></view><view class="more-dot"></view><view class="more-dot"></view></view>
          </view>
        </view>
      </view>

      <view
        v-if="!isPlaying"
        class="video-center-play-layer"
        @tap="toggleVideoPlay"
      >
        <view class="video-center-play-btn">
          <view class="video-play-svg-wrap">
            <view class="video-play-triangle"></view>
          </view>
        </view>
      </view>

      <view class="video-side-actions">
        <view class="video-side-avatar-outer" @tap="toUserHome">
          <view class="video-side-avatar-wrap">
            <image
              class="video-side-avatar"
              :src="postInfo?.avatar || '/static/logo.png'"
              mode="scaleToFill"
            ></image>
            <image
              v-if="postInfo.current_frame_img"
              :src="postInfo.current_frame_img"
              class="video-side-avatar-frame"
              mode="scaleToFill"
            ></image>
          </view>
        </view>

        <view
          v-if="showVideoFollowBtn"
          class="video-follow-plus"
          @tap="handleFollowAuthor"
        >
          <text class="video-follow-plus-text">+</text>
        </view>

        <view
          class="video-action-item"
          :class="{ disabled: likeLock }"
          @tap="handleLike"
        >
          <image
            class="video-action-icon"
            :src="isLiked ? '/static/post/xih1.png' : '/static/post/xih0.png'"
            mode="aspectFit"
          ></image>
          <text class="video-action-text">{{ postInfo.like_count || 0 }}</text>
        </view>

        <view class="video-action-item" @tap="openCommentDrawer">
          <image
            class="video-action-icon"
            src="/static/post/pl.png"
            mode="aspectFit"
          ></image>
          <text class="video-action-text">{{ commentCount }}</text>
        </view>

        <view class="video-action-item" :class="{ disabled: rewardLock }" @tap="openRewardModal">
          <image src="/static/icon/gift-white.svg" class="video-reward-icon" mode="aspectFit"></image>
          <text class="video-action-text">{{ postInfo.reward_count || 0 }}</text>
        </view>

        <view v-if="!isAppPlus" class="video-action-item" @tap="toggleMute">
          <text class="video-action-text">{{ isMuted ? '静音' : '有声' }}</text>
        </view>

        <view class="video-action-item" @tap="openActionSheet">
          <view class="more-dots white-dots"><view class="more-dot"></view><view class="more-dot"></view><view class="more-dot"></view></view>
          <text class="video-action-text">更多</text>
        </view>
      </view>

      <view class="video-info-panel">
        <view class="video-author-line">
          <view class="video-bottom-avatar-box" @tap="toUserHome">
            <image
              class="video-bottom-avatar"
              :src="postInfo?.avatar || '/static/logo.png'"
              mode="aspectFill"
            ></image>
            <image
              v-if="postInfo.current_frame_img"
              :src="postInfo.current_frame_img"
              class="video-bottom-avatar-frame"
              mode="scaleToFill"
            ></image>
          </view>

          <view class="video-author-meta">
            <view class="author-name-row on-dark">
              <text class="video-author-name" :class="{ 'fancy-pink': parseInt(postInfo.is_fancy || 0) === 1, 'vip-red-text': parseInt(postInfo.vip || 0) === 1 }">{{ postInfo.name || '匿名' }}</text>
            </view>
            <text class="video-author-time">{{ formatTime(postInfo.create_time) }}</text>
          </view>
        </view>

        <view
          v-if="postInfo.co_creators && postInfo.co_creators.length > 0"
          class="video-co-creator-row"
        >
          <text class="video-co-creator-label">共创</text>
          <view
            v-for="u in postInfo.co_creators"
            :key="'video-co-' + u.id"
            class="video-co-creator-chip"
            @tap="toUserHomeById(u.id)"
          >
            <image
              class="video-co-creator-avatar"
              :src="u.avatar || '/static/logo.png'"
              mode="aspectFill"
            ></image>
            <text class="video-co-creator-name">{{ u.name || u.username || '用户' }}</text>
          </view>
        </view>

        <view v-if="isAnyMasked && !isOwner && !canManagePost" class="video-mask-tip">
          <text>{{ maskStatusText }}</text>
        </view>

        <view v-else class="video-content-info">
          <text class="video-title" :class="{ 'fancy-pink': parseInt(postInfo?.is_fancy || 0) === 1 }">{{ postInfo?.title || '' }}</text>

          <text
            v-if="postInfo.plain_content || postInfo.content"
            class="video-desc"
          >{{ postInfo.plain_content || postInfo.content }}</text>

          <view
            v-if="postInfo.topic_names && postInfo.topic_names.length > 0"
            class="video-topic-row"
          >
            <text
              v-for="(topic, idx) in postInfo.topic_names"
              :key="'v-topic-' + idx"
              class="video-topic"
              @click="goTopicSearch(topic)"
            >#{{ topic }}</text>
          </view>
        </view>
      </view>


      <!-- #endif -->
      <!-- #ifdef APP-PLUS -->
      <!-- App端: video 是系统原生组件, 会盖住普通 view; 操作栏必须用 cover-view 覆盖在视频上。
           vue3 兼容: cover-view 内禁用 v-if(用 v-show), 禁用空元素(必须有子节点), 文本必须用 cover-view 包裹 -->
      <cover-view class="cv-top-safe" :style="{ paddingTop: statusBarHeight + 'px' }">
        <cover-view class="cv-top-bar" :style="{ height: navBarHeight + 'px' }">
          <cover-view class="cv-top-btn cv-back-btn" @tap="goBack">
            <cover-view class="cv-back-text">‹</cover-view>
          </cover-view>
          <cover-view class="cv-top-btn cv-more-btn" @tap="openActionSheet">
            <cover-view class="cv-dots">
              <cover-view class="cv-dot">&#xFEFF;</cover-view>
              <cover-view class="cv-dot">&#xFEFF;</cover-view>
              <cover-view class="cv-dot">&#xFEFF;</cover-view>
            </cover-view>
          </cover-view>
        </cover-view>
      </cover-view>

      <cover-view v-show="!isPlaying" class="cv-center-play-layer" @tap="toggleVideoPlay">
        <cover-view class="cv-center-play-btn">
          <cover-view class="cv-play-icon">▶</cover-view>
        </cover-view>
      </cover-view>

      <cover-view class="cv-side-actions">
        <cover-view class="cv-avatar-outer" @tap="toUserHome">
          <cover-view class="cv-avatar-wrap">
            <cover-image class="cv-avatar" :src="postInfo?.avatar || '/static/logo.png'" mode="scaleToFill"></cover-image>
          </cover-view>
        </cover-view>
        <cover-view v-show="showVideoFollowBtn" class="cv-follow-plus" @tap="handleFollowAuthor">
          <cover-view class="cv-plus-text">+</cover-view>
        </cover-view>
        <cover-view class="cv-action-item" @tap="handleLike">
          <cover-image class="cv-action-icon" :src="isLiked ? '/static/post/xih1.png' : '/static/post/xih0.png'" mode="aspectFit"></cover-image>
          <cover-view class="cv-action-text">{{ postInfo.like_count || 0 }}</cover-view>
        </cover-view>
        <cover-view class="cv-action-item" @tap="openCommentDrawer">
          <cover-image class="cv-action-icon" src="/static/post/pl.png" mode="aspectFit"></cover-image>
          <cover-view class="cv-action-text">{{ commentCount }}</cover-view>
        </cover-view>
        <cover-view class="cv-action-item" @tap="openRewardModal">
          <cover-image src="/static/icon/gift-white.svg" class="cv-reward-icon" mode="aspectFit"></cover-image>
          <cover-view class="cv-action-text">{{ postInfo.reward_count || 0 }}</cover-view>
        </cover-view>
        <cover-view class="cv-action-item" @tap="openActionSheet">
          <cover-view class="cv-dots">
            <cover-view class="cv-dot">&#xFEFF;</cover-view>
            <cover-view class="cv-dot">&#xFEFF;</cover-view>
            <cover-view class="cv-dot">&#xFEFF;</cover-view>
          </cover-view>
          <cover-view class="cv-action-text">更多</cover-view>
        </cover-view>
      </cover-view>

      <cover-view class="cv-info-panel">
        <cover-view class="cv-author-line">
          <cover-view class="cv-author-avatar-box" @tap="toUserHome">
            <cover-image class="cv-author-avatar" :src="postInfo?.avatar || '/static/logo.png'" mode="aspectFill"></cover-image>
          </cover-view>
          <cover-view class="cv-author-meta">
            <cover-view class="cv-author-name">{{ postInfo.name || '匿名' }}</cover-view>
            <cover-view class="cv-author-time">{{ formatTime(postInfo.create_time) }}</cover-view>
          </cover-view>
        </cover-view>
        <cover-view class="cv-content-info">
          <cover-view class="cv-title">{{ postInfo?.title || '' }}</cover-view>
          <cover-view v-show="postInfo.plain_content || postInfo.content" class="cv-desc">{{ postInfo.plain_content || postInfo.content }}</cover-view>
          <cover-view v-show="postInfo.topic_names && postInfo.topic_names.length > 0" class="cv-topic-row">
            <cover-view v-for="(topic, idx) in postInfo.topic_names" :key="'cv-topic-' + idx" class="cv-topic" @tap="goTopicSearch(topic)">#{{ topic }}</cover-view>
          </cover-view>
        </cover-view>
      </cover-view>

      <cover-view class="cv-comment-entry" @tap="focusComment">
        <cover-view class="cv-comment-pill">
          <cover-view class="cv-comment-placeholder">{{ computedPlaceholder }}</cover-view>
        </cover-view>
      </cover-view>
      <!-- #endif -->
    </view>
    <view
      v-if="!isImmersiveVideoPage && postInfo"
      class="normal-detail-page"
    >
      <view
        class="custom-nav-bar"
        :class="{ 'nav-glass': showFrostedNav }"
        :style="{ paddingTop: statusBarHeight + 'px', height: navTotalHeight + 'px' }"
      >
        <view class="xhs-nav-content" :style="{ height: navBarHeight + 'px' }">
          <!-- 左：返回 -->
          <view class="xhs-nav-back" @tap="goBack">
            <text class="xhs-nav-back-icon">‹</text>
          </view>

          <!-- 中：作者头像 + 昵称（小红书是常驻显示，不随滚动淡入淡出） -->
          <view class="xhs-nav-user" @tap="toUserHome">
            <view class="xhs-nav-avatar-box">
              <image
                class="xhs-nav-avatar"
                :src="postInfo?.avatar || '/static/logo.png'"
                mode="aspectFill"
              ></image>
              <image
                v-if="postInfo.current_frame_img"
                :src="postInfo.current_frame_img"
                class="xhs-nav-avatar-frame"
                mode="scaleToFill"
              ></image>
            </view>
            <text class="xhs-nav-name" :class="{ 'fancy-pink': parseInt(postInfo.is_fancy || 0) === 1, 'vip-red-text': parseInt(postInfo.vip || 0) === 1 }">{{ postInfo.name || '匿名' }}</text>
          </view>

          <!-- 右：关注 + 更多 -->
          <view class="xhs-nav-right">
            <view
              v-if="showFollowBtn"
              class="xhs-nav-follow"
              :class="{ followed: isFollowingAuthor }"
              @tap.stop="handleFollowAuthor"
            >
              <text>{{ isFollowingAuthor ? '已关注' : '关注' }}</text>
            </view>

            <view class="xhs-nav-more" @tap="openActionSheet">
              <view class="more-dots dark-dots"><view class="more-dot"></view><view class="more-dot"></view><view class="more-dot"></view></view>
            </view>
          </view>
        </view>
      </view>

      <view class="xhs-main" :style="{ paddingTop: navTotalHeight + 'px' }">
        <view
          v-if="(isOwner || canManagePost) && isAnyMasked"
          class="post-status-bar"
          :class="maskStatusClass"
        >
          <text>当前状态：{{ maskStatusText }}，内容仅您可见</text>
        </view>

        <!-- 内容被屏蔽: 小红书风格居中白底提示 -->
        <view v-if="isAnyMasked && !isOwner && !canManagePost" class="masked-box">
          <text class="masked-title">{{ maskStatusText }}</text>
          <text class="masked-sub">该内容暂时无法查看</text>
        </view>

        <!-- 媒体区: 满宽出血(无左右内边距、无圆角)，与小红书一致 -->
        <view
          v-if="(!isAnyMasked || isOwner || canManagePost) && (postInfo.video || imagesVisible)"
          class="xhs-media-box"
        >
          <view v-if="postInfo.video" class="normal-video-box">
            <!-- #ifdef APP-PLUS -->
            <video
              v-if="!isAnyOverlayOpen"
              id="detailVideo"
              class="normal-video"
              :src="postInfo.video"
              :poster="videoCover"
              :controls="true"
              object-fit="cover"
              @loadedmetadata="onVideoLoaded"
              :style="{ height: videoStyleHeight }"
            ></video>
            <view
              v-if="isAnyOverlayOpen"
              class="normal-video-placeholder"
              :style="{ height: videoStyleHeight }"
            ></view>
            <!-- #endif -->
            <!-- #ifndef APP-PLUS -->
            <video
              id="detailVideo"
              class="normal-video"
              :src="isHls ? '' : postInfo.video"
              :poster="videoCover"
              :controls="true"
              object-fit="cover"
              @loadedmetadata="onVideoLoaded"
              :style="{ height: videoStyleHeight }"
            ></video>
            <!-- #endif -->
          </view>

          <template v-else-if="imagesVisible">
            <!-- 单图: 满宽、高度自适应 -->
            <image
              v-if="postInfo.images.length === 1"
              class="xhs-single-image"
              :src="getCachedImage(postInfo.images[0])"
              mode="widthFix"
              @tap="previewImage(postInfo.images, 0)"
              @error="handleImgError(postInfo.images[0])"
            ></image>

            <!-- 多图: 横向滑动 + 右下角页码，和笔记一样 -->
            <view v-else class="xhs-swiper-wrap">
              <swiper
                class="xhs-image-swiper"
                :style="{ height: imageSwiperHeight }"
                :current="imageIndex"
                :duration="220"
                @change="onImageSwiperChange"
              >
                <swiper-item v-for="(img, index) in postInfo.images" :key="'img-' + index">
                  <image
                    class="xhs-swiper-image"
                    :src="getCachedImage(img)"
                    mode="aspectFill"
                    @tap="previewImage(postInfo.images, index)"
                    @error="handleImgError(img)"
                  ></image>
                </swiper-item>
              </swiper>
              <view class="xhs-image-counter">
                <text>{{ imageIndex + 1 }}/{{ postInfo.images.length }}</text>
              </view>
            </view>
          </template>
        </view>

        <view class="xhs-body">
          <text v-if="postInfo.circle_name" class="xhs-circle-tag">{{ postInfo.circle_name }}</text>

          <view
            v-if="postInfo.co_creators && postInfo.co_creators.length > 0"
            class="co-creator-row"
          >
            <text class="co-creator-label">共创</text>
            <view class="co-creator-list">
              <view
                v-for="u in postInfo.co_creators"
                :key="'co-' + u.id"
                class="co-creator-chip"
                @tap="toUserHomeById(u.id)"
              >
                <image
                  class="co-creator-avatar"
                  :src="u.avatar || '/static/logo.png'"
                  mode="aspectFill"
                ></image>
                <text class="co-creator-name">{{ u.name || u.username || '用户' }}</text>
              </view>
            </view>
          </view>

          <view v-if="!isAnyMasked || isOwner || canManagePost" class="post-body">
            <text class="post-title" :class="{ 'fancy-pink': parseInt(postInfo?.is_fancy || 0) === 1, 'vip-red-text': parseInt(postInfo?.vip || 0) === 1 }" selectable>{{ postInfo?.title || '' }}</text>

            <!-- 内容已加密: 显示提示而不是乱码 -->
            <view v-if="isContentEncrypted && !isOwner && !isAdmin" class="content-encrypted-box">
              <view class="content-encrypted-icon">🔒</view>
              <text class="content-encrypted-title">内容已加密</text>
              <text class="content-encrypted-desc">发表评论后即可查看完整内容</text>
              <view class="content-encrypted-btn" @click="focusCommentInput">
                <text>去评论</text>
              </view>
            </view>
            <view v-else class="post-content-text" :class="{ 'content-lock-preview': isContentLocked && !isOwner && !isAdmin }">
              <template v-for="(node, idx) in postInfo.contentNodes">
                <text
                  v-if="node.type === 'text'"
                  :key="'text-' + idx"
                  class="rich-text-normal"
                  selectable
                >{{ node.text }}</text>

                <text
                  v-else-if="node.type === 'link' && !isContentLocked"
                  :key="'link-' + idx"
                  class="rich-text-link"
                  selectable
                  @tap="openExternalLink(node.url)"
                >{{ node.text }}</text>

                <text
                  v-else-if="node.type === 'mention'"
                  :key="'mention-' + idx"
                  class="rich-text-mention"
                  selectable
                  @tap="toUserHomeById(node.userId)"
                >{{ node.text }}</text>

                <text
                  v-else-if="node.type === 'topic'"
                  :key="'topic-' + idx"
                  class="rich-text-topic"
                  selectable
                  @tap="goTopicSearch(node.value)"
                >{{ node.text }}</text>
              </template>
              <view v-if="isContentLocked && !isOwner && !isAdmin" class="content-lock-fade"></view>
            </view>

              <view v-if="postInfo.share_product" class="shared-product-card" @tap="goMarketProduct(postInfo.share_product.id)">
                <image :src="postInfo.share_product.image || (postInfo.share_product.images && postInfo.share_product.images[0]) || '/static/logo.png'" class="shared-product-img" mode="aspectFill" lazy-load></image>
                <view class="shared-product-info">
                  <text class="shared-product-label">分享商品</text>
                  <text class="shared-product-title">{{ postInfo.share_product.title }}</text>
                  <text class="shared-product-price">¥{{ postInfo.share_product.price }}</text>
                </view>
                <text class="shared-product-arrow">›</text>
              </view>

              <view v-if="postInfo.share_link_url && !isContentLocked" class="shared-link-card" @tap="openExternalLink(postInfo.share_link_url)">
                <view class="shared-link-icon">链</view>
                <view class="shared-product-info">
                  <text class="shared-product-label">外部链接</text>
                  <text class="shared-product-title">{{ postInfo.share_link_title || postInfo.share_link_url }}</text>
                  <text class="shared-link-url">{{ postInfo.share_link_url }}</text>
                </view>
                <text class="shared-product-arrow">›</text>
              </view>

            <view v-if="isPaidLocked" class="unlock-card-bottom paid-card">
              <text class="unlock-title">付费内容</text>
              <text class="unlock-desc">花费 <text class="unlock-price">¥{{ postInfo.price }}</text> 解锁隐藏链接</text>
              <view class="unlock-btn" :class="{ loading: unlocking }" @click="handleBuyPost">
                <text>{{ unlocking ? '处理中...' : '立即解锁' }}</text>
              </view>
            </view>
            <view v-if="isCommentLocked" class="unlock-card-bottom comment-card">
              <text class="unlock-title">评论后可见</text>
              <text class="unlock-desc">发表评论后即可查看隐藏链接</text>
              <view class="unlock-btn" @click="focusCommentInput">
                <text>去评论</text>
              </view>
            </view>
            <view v-if="vipPrivilegeUnlocked" class="unlock-card-bottom vip-privilege-card">
              <view class="vip-privilege-row">
                <image src="/static/icon/crown-gold.svg" class="vip-privilege-icon" mode="aspectFit"></image>
                <text class="vip-privilege-text">当前您正在享受VIP免评论查看特权</text>
              </view>
            </view>

            <view
              v-if="postInfo.topic_names && postInfo.topic_names.length > 0"
              class="topic-row"
            >
              <text
                v-for="(topic, idx) in postInfo.topic_names"
                :key="'topic-' + idx"
                class="topic-item"
                @click="goTopicSearch(topic)"
              >#{{ topic }}</text>
            </view>
          </view>

          <!-- 发布时间(小红书放在正文下面，灰色小字) -->
          <view class="xhs-time-row">
            <text class="xhs-time">{{ formatTime(postInfo.create_time) }}</text>
          </view>

          <!-- 打赏者头像 + 浏览数: 打赏按钮已移到底部操作栏 -->
          <view v-if="(!isAnyMasked || isOwner || canManagePost) && (rewarders.length > 0 || postInfo.view_count)" class="xhs-stat-row">
            <view class="xhs-stat-left">
              <view v-if="rewarders.length > 0" class="rewarders-section">
                <view class="rewarders-list">
                  <view
                    v-for="(user, idx) in displayRewarders"
                    :key="'rewarder-' + user.id"
                    class="rewarder-avatar-wrapper"
                    @tap="toUserHomeById(user.id)"
                  >
                    <image
                      class="rewarder-avatar"
                      :src="user.avatar || '/static/logo.png'"
                      mode="aspectFill"
                    ></image>
                  </view>
                  <view v-if="rewarders.length > 3" class="rewarders-more" @tap="showRewardersModal = true">
                    <text class="rewarders-more-text">+{{ rewarders.length - 3 }}</text>
                  </view>
                </view>
              </view>
            </view>

            <text class="xhs-view-count">浏览 {{ postInfo.view_count || 0 }}</text>
          </view>
        </view>

        <!-- 免责声明 -->
        <view class="disclaimer-section" v-if="!isImmersiveVideoPage">
          <view class="disclaimer-content">
            <text class="disclaimer-title">免责声明</text>
            <text class="disclaimer-text">本平台所有内容均由用户发布，不代表本平台观点。用户发布的内容由用户自行负责，本平台不承担任何法律责任。帖子发布的内容真假自行辨别，仅供学习测试使用，禁止传播、储存，请在学习后的24小时内删除有关内容，如有违规内容，请及时联系我们处理。</text>
          </view>
        </view>

        <view v-if="!isAnyMasked || isOwner || canManagePost" class="comment-section">
          <view class="comment-title-row">
            <text class="comment-title">共 {{ commentCount }} 条评论</text>
          </view>

          <view v-if="commentLoading" class="comment-loading">
            <text>评论加载中...</text>
          </view>

          <view v-else-if="nestedComments.length > 0" class="comment-list">
            <view
              v-for="item in nestedComments"
              :key="'comment-' + item.id"
              class="comment-item"
            >
              <view class="comment-avatar-wrapper">
                <image
                  class="comment-avatar"
                  :src="item.avatar || '/static/logo.png'"
                  mode="scaleToFill"
                  lazy-load
                  @tap="toUserHomeById(item.user_id)"
                ></image>
              </view>

              <view class="comment-main">
                <view class="comment-head">
                  <view class="comment-name-line">
                    <text class="comment-name" :style="item.is_vip ? 'color:#ff2442 !important;font-weight:700 !important;' : ''" @tap="toUserHomeById(item.user_id)">
                      {{ item.name || item.username || '匿名' }}
                    </text>

                    <text
                      v-if="String(item.user_id) === String(postInfo.user_id)"
                      class="badge author"
                    >作者</text>

                    <text
                      v-if="parseInt(item.is_pinned) === 1"
                      class="badge pinned"
                    >置顶</text>

                    <text
                      v-if="parseInt(item.status) === 0"
                      class="badge banned"
                    >已屏蔽</text>

                    <text
                      v-if="parseInt(item.status) === 2"
                      class="badge pending"
                    >待审</text>
                  </view>

                  <text
                    v-if="(isOwner || canManagePost) && String(item.parent_id) === '0'"
                    class="pin-btn"
                    @tap="togglePin(item)"
                  >
                    {{ pinLoadingId === item.id ? '处理中' : (parseInt(item.is_pinned) === 1 ? '取消置顶' : '置顶') }}
                  </text>
                </view>

                <view class="comment-bubble" @tap="setReplyTarget(item)">
                  <template v-for="(n, ni) in getCommentNodes(item)">
                    <text
                      v-if="n.type === 'text'"
                      :key="'c-text-' + item.id + '-' + ni"
                      class="comment-text"
                      :style="item.is_vip ? 'color:#ff2442 !important;font-weight:700 !important;' : ''"
                    >{{ n.text }}</text>

                    <text
                      v-else-if="n.type === 'link'"
                      :key="'c-link-' + item.id + '-' + ni"
                      class="comment-link"
                      @tap.stop="openExternalLink(n.url)"
                    >{{ n.text }}</text>

                    <text
                      v-else-if="n.type === 'mention'"
                      :key="'c-mention-' + item.id + '-' + ni"
                      class="comment-mention"
                      @tap.stop="toUserHomeById(n.userId)"
                    >{{ n.text }}</text>
                  </template>
                </view>

                <view class="comment-actions">
                  <text class="comment-time">{{ formatTime(item.create_time) }}</text>
                  <text class="comment-reply" @tap.stop="setReplyTarget(item)">回复</text>
                  <text
                    v-if="canDelete(item)"
                    class="comment-delete"
                    @tap.stop="askDeleteComment(item.id)"
                  >删除</text>
                </view>

                <view
                  v-if="item.children && item.children.length > 0"
                  class="sub-comment-list"
                >
                  <view
                    v-for="sub in getVisibleChildren(item)"
                    :key="'sub-' + sub.id"
                    class="sub-comment-item"
                    @tap="setReplyTarget(sub)"
                  >
                    <view class="sub-comment-head">
                      <text class="sub-name" :style="sub.is_vip ? 'color:#ff2442 !important;font-weight:700 !important;' : ''" @tap.stop="toUserHomeById(sub.user_id)">
                        {{ sub.name || sub.username || '匿名' }}
                      </text>

                      <text v-if="sub.reply_to_name" class="reply-to"> 回复 </text>

                      <text
                        v-if="sub.reply_to_name"
                        class="sub-name"
                        @tap.stop="toUserHomeById(sub.reply_to_user_id)"
                      >{{ sub.reply_to_name }}</text>
                    </view>

                    <view class="sub-comment-content">
                      <template v-for="(n, ni) in getCommentNodes(sub)">
                        <text
                          v-if="n.type === 'text'"
                          :key="'s-text-' + sub.id + '-' + ni"
                          class="comment-text"
                        >{{ n.text }}</text>

                        <text
                          v-else-if="n.type === 'link'"
                          :key="'s-link-' + sub.id + '-' + ni"
                          class="comment-link"
                          @tap.stop="openExternalLink(n.url)"
                        >{{ n.text }}</text>

                        <text
                          v-else-if="n.type === 'mention'"
                          :key="'s-mention-' + sub.id + '-' + ni"
                          class="comment-mention"
                          @tap.stop="toUserHomeById(n.userId)"
                        >{{ n.text }}</text>
                      </template>
                    </view>

                    <view class="sub-actions">
                      <text>{{ formatTime(sub.create_time) }}</text>
                      <text @tap.stop="setReplyTarget(sub)">回复</text>
                      <text
                        v-if="canDelete(sub)"
                        class="comment-delete"
                        @tap.stop="askDeleteComment(sub.id)"
                      >删除</text>
                    </view>
                  </view>

                  <view
                    v-if="shouldShowReplyToggle(item)"
                    class="reply-toggle"
                    @tap="toggleReplies(item)"
                  >
                    <text>{{ getReplyToggleText(item) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-else class="empty-comment">
            <text>暂时还没有人评论哦~</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 普通详情页底部操作栏: 小红书式「说点什么… + 点赞 + 收藏 + 评论」 -->
    <view
      v-if="!isImmersiveVideoPage && postInfo && (!isAnyMasked || isOwner || canManagePost)"
      class="bottom-input-bar"
      :style="{ bottom: keyboardHeight + 'px' }"
    >
      <template v-if="!isCommentDisabled">
        <input
          v-model="commentContent"
          class="bottom-input"
          :placeholder="computedPlaceholder"
          placeholder-style="color:#bfbfbf"
          :focus="commentFocus"
          confirm-type="send"
          maxlength="500"
          :adjust-position="false"
          @confirm="publishComment"
          @input="onCommentInput"
          @focus="onCommentFocus"
          @blur="onCommentBlur"
        />
        <!-- 有内容时出现发送按钮，不用再按手机键盘上的发送键 -->
        <view
          v-if="commentContent && commentContent.trim()"
          class="bottom-send"
          @tap="publishComment"
        >发送</view>
      </template>

      <text v-else class="comment-disabled-text">{{ computedPlaceholder }}</text>

      <view class="xhs-bar-actions">
        <view class="xhs-bar-action" :class="{ active: isLiked, disabled: likeLock }" @tap="handleLike">
          <image
            class="xhs-bar-icon"
            :src="isLiked ? '/static/post/xih1.png' : '/static/post/xih0.png'"
            mode="aspectFit"
          ></image>
          <text class="xhs-bar-count" :class="{ active: isLiked }">{{ postInfo.like_count || 0 }}</text>
        </view>

        <view class="xhs-bar-action" :class="{ active: isCollected }" @tap="handleCollect">
          <image
            class="xhs-bar-icon"
            :src="isCollected ? '/static/icon/star-yellow.svg' : '/static/icon/star-line.svg'"
            mode="aspectFit"
          ></image>
          <text class="xhs-bar-count" :class="{ active: isCollected }">{{ postInfo.collect_count || 0 }}</text>
        </view>

        <view class="xhs-bar-action" @tap="focusComment">
          <image class="xhs-bar-icon" src="/static/post/pl.png" mode="aspectFit"></image>
          <text class="xhs-bar-count">{{ commentCount }}</text>
        </view>

        <view class="xhs-bar-action" :class="{ disabled: rewardLock }" @tap="openRewardModal">
          <image class="xhs-bar-icon" src="/static/icon/gift-gray.svg" mode="aspectFit"></image>
          <text class="xhs-bar-count">{{ postInfo.reward_count || 0 }}</text>
        </view>
      </view>
    </view>


    <!-- 沉浸式评论抽屉(H5+App 均编译) -->
    <view
      v-if="isImmersiveVideoPage && showCommentDrawer"
      class="drawer-mask"
      @tap="closeCommentDrawer"
    >
      <view class="comment-drawer" @tap="safeStop">
        <view class="drawer-handle"></view>

        <view class="drawer-header">
          <text class="drawer-title">评论 {{ commentCount }}</text>
          <text class="drawer-close" @tap="closeCommentDrawer">关闭</text>
        </view>

        <scroll-view scroll-y class="drawer-scroll" :show-scrollbar="false">
          <view v-if="commentLoading" class="comment-loading">
            <text>评论加载中...</text>
          </view>

          <view v-else-if="nestedComments.length > 0" class="comment-list drawer-comment-list">
            <view
              v-for="item in nestedComments"
              :key="'drawer-comment-' + item.id"
              class="comment-item"
            >
              <view class="comment-avatar-wrapper">
                <image
                  class="comment-avatar"
                  :src="item.avatar || '/static/logo.png'"
                  mode="scaleToFill"
                  lazy-load
                  @tap="toUserHomeById(item.user_id)"
                ></image>
              </view>

              <view class="comment-main">
                <view class="comment-head">
                  <view class="comment-name-line">
                    <text class="comment-name" :style="item.is_vip ? 'color:#ff2442 !important;font-weight:700 !important;' : ''">{{ item.name || item.username || '匿名' }}</text>

                    <text
                      v-if="String(item.user_id) === String(postInfo.user_id)"
                      class="badge author"
                    >作者</text>

                    <text
                      v-if="parseInt(item.is_pinned) === 1"
                      class="badge pinned"
                    >置顶</text>
                  </view>
                </view>

                <view class="comment-bubble" @tap="setReplyTarget(item)">
                  <template v-for="(n, ni) in getCommentNodes(item)">
                    <text
                      v-if="n.type === 'text'"
                      :key="'dc-text-' + item.id + '-' + ni"
                      class="comment-text"
                    >{{ n.text }}</text>

                    <text
                      v-else-if="n.type === 'link'"
                      :key="'dc-link-' + item.id + '-' + ni"
                      class="comment-link"
                      @tap.stop="openExternalLink(n.url)"
                    >{{ n.text }}</text>

                    <text
                      v-else-if="n.type === 'mention'"
                      :key="'dc-mention-' + item.id + '-' + ni"
                      class="comment-mention"
                      @tap.stop="toUserHomeById(n.userId)"
                    >{{ n.text }}</text>
                  </template>
                </view>

                <view class="comment-actions">
                  <text class="comment-time">{{ formatTime(item.create_time) }}</text>
                  <text class="comment-reply" @tap.stop="setReplyTarget(item)">回复</text>
                  <text
                    v-if="canDelete(item)"
                    class="comment-delete"
                    @tap.stop="askDeleteComment(item.id)"
                  >删除</text>
                </view>

                <view
                  v-if="item.children && item.children.length > 0"
                  class="sub-comment-list"
                >
                  <view
                    v-for="sub in getVisibleChildren(item)"
                    :key="'drawer-sub-' + sub.id"
                    class="sub-comment-item"
                    @tap="setReplyTarget(sub)"
                  >
                    <view class="sub-comment-head">
                      <text class="sub-name" :style="sub.is_vip ? 'color:#ff2442 !important;font-weight:700 !important;' : ''" @tap.stop="toUserHomeById(sub.user_id)">
                        {{ sub.name || sub.username || '匿名' }}
                      </text>

                      <text v-if="sub.reply_to_name" class="reply-to"> 回复 </text>

                      <text
                        v-if="sub.reply_to_name"
                        class="sub-name"
                        :style="sub.reply_to_vip ? 'color:#ff2442 !important;font-weight:700 !important;' : ''"
                        @tap.stop="toUserHomeById(sub.reply_to_user_id)"
                      >{{ sub.reply_to_name }}</text>
                    </view>

                    <view class="sub-comment-content">
                      <template v-for="(n, ni) in getCommentNodes(sub)">
                        <text
                          v-if="n.type === 'text'"
                          :key="'ds-text-' + sub.id + '-' + ni"
                          class="comment-text"
                          :style="sub.is_vip ? 'color:#ff2442 !important;font-weight:700 !important;' : ''"
                        >{{ n.text }}</text>

                        <text
                          v-else-if="n.type === 'link'"
                          :key="'ds-link-' + sub.id + '-' + ni"
                          class="comment-link"
                          @tap.stop="openExternalLink(n.url)"
                        >{{ n.text }}</text>

                        <text
                          v-else-if="n.type === 'mention'"
                          :key="'ds-mention-' + sub.id + '-' + ni"
                          class="comment-mention"
                          @tap.stop="toUserHomeById(n.userId)"
                        >{{ n.text }}</text>
                      </template>
                    </view>

                    <view class="sub-actions">
                      <text>{{ formatTime(sub.create_time) }}</text>
                      <text @tap.stop="setReplyTarget(sub)">回复</text>
                      <text
                        v-if="canDelete(sub)"
                        class="comment-delete"
                        @tap.stop="askDeleteComment(sub.id)"
                      >删除</text>
                    </view>
                  </view>

                  <view
                    v-if="shouldShowReplyToggle(item)"
                    class="reply-toggle"
                    @tap="toggleReplies(item)"
                  >
                    <text>{{ getReplyToggleText(item) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-else class="empty-comment">
            <text>暂时还没有人评论哦~</text>
          </view>

          <view style="height: 40rpx;"></view>
        </scroll-view>

        <view class="drawer-input-bar">
          <template v-if="!isCommentDisabled">
            <input
              v-model="commentContent"
              class="drawer-input"
              :placeholder="computedPlaceholder"
              placeholder-style="color:#999"
              :focus="commentFocus"
              confirm-type="send"
              maxlength="500"
              @confirm="publishComment"
              @input="onCommentInput"
            />

            <view class="drawer-send" @tap="publishComment">
              <text>发送</text>
            </view>
          </template>

          <text v-else class="comment-disabled-text">{{ computedPlaceholder }}</text>
        </view>
      </view>
    </view>

    <!-- @ 用户弹层 -->
    <view
      v-if="mentionSheet.show"
      class="mention-mask"
      @tap="closeMentionSheet"
    >
      <view class="mention-panel" @tap="safeStop">
        <view class="mention-header">
          <text class="mention-title">@ 选择用户</text>
          <text class="mention-close" @tap="closeMentionSheet">关闭</text>
        </view>

        <view class="mention-search">
          <input
            v-model="mentionSheet.keyword"
            class="mention-input"
            placeholder="输入昵称/用户名搜索"
            confirm-type="search"
            @input="searchMentionDebounced"
            @confirm="searchMentionNow"
          />

          <view class="mention-search-btn" @tap="searchMentionNow">
            <text>搜索</text>
          </view>
        </view>

        <scroll-view scroll-y class="mention-list">
          <view
            v-for="u in mentionSheet.list"
            :key="'mention-' + u.id"
            class="mention-item"
            @tap="pickMentionUser(u)"
          >
            <image
              class="mention-avatar"
              :src="u.avatar || '/static/logo.png'"
              mode="aspectFill"
            ></image>
            <text class="mention-name">{{ u.name || u.username }}</text>
          </view>

          <view v-if="mentionSheet.list.length === 0" class="mention-empty">
            <text>暂无结果</text>
          </view>
        </scroll-view>
      </view>
    </view>
    <view
      v-if="modal.show"
      class="modal-mask"
      @tap="closeModal"
    >
      <view class="modal-box" @tap="safeStop">
        <view class="modal-title">提示</view>
        <view class="modal-content">{{ modal.content }}</view>

        <view class="modal-actions">
          <view class="modal-btn cancel" @tap="closeModal">
            <text>取消</text>
          </view>

          <view class="modal-btn confirm" @tap="confirmAction">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>
    <view
      class="action-sheet-mask"
      :class="{ show: showActionMenu }"
      @tap="closeActionSheet"
    >
      <view class="action-sheet-panel" @tap="safeStop">
        <view
          v-if="isOwner || canManagePost"
          class="sheet-item"
          @tap="handleEditPost"
        >
          <text>编辑帖子</text>
        </view>

        <view
          v-if="isOwner || isAdmin"
          class="sheet-item danger"
          @tap="handleDeletePostAsk"
        >
          <text>删除帖子</text>
        </view>

        <!-- 举报入口常驻显示(管理员/审核员/作者本人都能看到) -->
        <view
          class="sheet-item danger"
          @tap="handleReportPost"
        >
          <text>举报该帖子</text>
        </view>

        <view class="sheet-item" @tap="handleCopyLink">
          <text>分享帖子</text>
        </view>

        <view class="sheet-gap"></view>

        <view class="sheet-item cancel" @tap="closeActionSheet">
          <text>取消</text>
        </view>
      </view>
    </view>

    <view v-if="detailLoading && !firstScreenReady" class="page-loading">
      <view class="loading-spinner"></view>
    </view>

    <!-- 支付密码弹窗 -->
    <view class="pay-pwd-mask" v-if="showPayModal" @touchmove.stop.prevent>
      <view class="pay-pwd-box">
        <text class="pay-pwd-title">支付确认</text>
        <text class="pay-pwd-desc">花费 ¥{{ postInfo && postInfo.price }} 解锁此付费内容</text>
        <input
          class="pay-pwd-input"
          type="number"
          v-model="buyPayPwd"
          placeholder="请输入6位支付密码"
          placeholder-class="pay-pwd-ph"
          maxlength="6"
          password
        />
        <view class="pay-pwd-btns">
          <view class="pay-pwd-cancel" @click="showPayModal = false"><text>取消</text></view>
          <view class="pay-pwd-confirm" @click="doBuyPost"><text>确认支付</text></view>
        </view>
      </view>
    </view>

    <!-- 打赏弹窗 -->
    <view class="reward-mask" v-if="showRewardModal" @touchmove.stop.prevent @tap="showRewardModal = false">
      <view class="reward-box" @tap="safeStop">
        <view class="reward-title-row">
          <image src="/static/icon/gift-red.svg" class="reward-title-icon" mode="aspectFit"></image>
          <text class="reward-title">打赏作者</text>
        </view>
        <text class="reward-author">打赏给：{{ postInfo && (postInfo.name || '匿名') }}</text>
        
        <view class="reward-amount-grid" @tap.stop>
          <view
            v-for="amount in [100, 200, 500, 1000]"
            :key="amount"
            class="reward-amount-chip"
            :class="{ active: rewardAmount === amount && !isCustomReward }"
            @tap.stop="selectRewardAmount(amount)"
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
              @focus.stop="selectCustomReward"
              @input.stop="onCustomRewardInput"
              @blur.stop="safeStop"
            />
          </view>
        </view>

        <view class="reward-balance">
          <text>当前积分：{{ userInfo && userInfo.jifen || 0 }}</text>
        </view>

        <view class="reward-btns">
          <view class="reward-cancel" @click="showRewardModal = false"><text>取消</text></view>
          <view class="reward-confirm" :class="{ disabled: rewardLock }" @click.stop="doReward"><text>确认打赏</text></view>
        </view>
      </view>
    </view>

    <!-- 打赏者列表弹窗 -->
    <view class="reward-mask" v-if="showRewardersModal" @touchmove.stop.prevent @tap="showRewardersModal = false">
      <view class="rewarders-modal-box" @tap="safeStop">
        <view class="rewarders-modal-header">
          <text class="rewarders-modal-title">打赏列表</text>
          <view class="rewarders-modal-close" @tap="showRewardersModal = false">
            <text class="close-icon">×</text>
          </view>
        </view>
        <scroll-view class="rewarders-modal-list" scroll-y>
          <view 
            v-for="(user, idx) in rewarders" 
            :key="'rewarder-item-' + user.id"
            class="rewarder-item"
            @tap="toUserHomeById(user.id)"
          >
            <image 
              class="rewarder-item-avatar" 
              :src="user.avatar || '/static/logo.png'" 
              mode="aspectFill"
            ></image>
            <view class="rewarder-item-info">
              <text class="rewarder-item-name">{{ user.name || '用户' }}</text>
              <text class="rewarder-item-amount">打赏 {{ user.amount }} 积分</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 支付密码未设置确认框 -->
    <XhsConfirm
      :visible="pwdNotSetConfirmVisible"
      title="提示"
      message="您尚未设置支付密码，是否前往设置？"
      confirmText="去设置"
      cancelText="取消"
      @confirm="onPwdNotSetConfirm"
      @cancel="onPwdNotSetCancel"
    />

    <!-- 抖音视频播放器弹窗 -->
    <DouyinPlayer
      :show="showDouyinPlayer"
      :videoList="douyinVideoList"
      :initialIndex="currentDouyinIndex"
      :userInfo="userInfo"
      :postTitle="postInfo?.title"
      :postAuthorAvatar="postInfo?.avatar"
      @update:show="showDouyinPlayer = $event"
      @close="showDouyinPlayer = false"
      @like="onDouyinLike"
      @comment="onDouyinComment"
      @reward="onDouyinReward"
      @follow="onDouyinFollow"
      @loadComments="onLoadDouyinComments"
    />
  </view>
</template>

<script>
import { request, baseUrl, webBaseUrl, getShareText } from '../../common/request.js'
import XhsConfirm from '../../components/XhsConfirm.vue'
import DouyinPlayer from '../../components/DouyinPlayer.vue'
import { getLevelDisplay as calcLevelDisplay } from '../../common/level.js'
import { getScreenMetrics } from '../../common/screen.js'

const DEFAULT_VIDEO_COVER = '/static/logo.png'
const IMG_CACHE_KEY = 'app_local_images_map'
const POST_DETAIL_PREVIEW_PREFIX = 'post_detail_preview_'

export default {
  name: 'PostDetail',

  components: { XhsConfirm, DouyinPlayer },

  data() {
    return {
      postId: 0,
      postInfo: null,
      userInfo: null,

      detailLoading: false,
      firstScreenReady: false,
      commentLoading: false,
      detailReqVersion: 0,

      isLiked: false,
      likeLock: false,
      collectLock: false,

      /* 多图横滑当前页(0 基)，对应小红书右下角 "1/9" 页码 */
      imageIndex: 0,

      commentContent: '',
      commentFocus: false,
      keyboardHeight: 0,
      replyTarget: null,
      nestedComments: [],

      statusBarHeight: 20,
      navBarHeight: 44,
      navTotalHeight: 64,
      showFrostedNav: false,

      showActionMenu: false,
      showCommentDrawer: false,

      isPlaying: false,
      /* 静音自动播放: H5 浏览器拦截带声音的自动播放, 静音才能自动播; 用户点"有声"恢复(和抖音一致) */
      isMuted: true,
      videoCtx: null,
      hlsPlayers: {},

      douyinVideoLoaded: false,
      douyinVideoError: false,

      isAppPlus: false,

      videoCover: '',
      videoStyleHeight: '450rpx',

      cachedImagesMap: {},

      isFollowingAuthor: false,
      followActionLock: false,

      collapsedReplyMap: {},
      expandedReplyMap: {},
      fullyExpandedMap: {},

      pinLock: false,
      pinLoadingId: 0,

      isUnlocked: false,
      isContentEncrypted: false,
      vipPrivilegeUnlocked: false,
      unlocking: false,
      showPayModal: false,
      buyPayPwd: '',
      pwdNotSetConfirmVisible: false,

      rewardLock: false,
      showRewardModal: false,
      rewardAmount: 100,
      isCustomReward: false,
      customRewardAmount: '',
      rewarders: [],
      showRewardersModal: false,

      mentionSheet: {
        show: false,
        keyword: '',
        list: [],
        timer: null,
        insertPos: -1
      },

      modal: {
        show: false,
        content: '',
        type: '',
        targetId: null
      },

      showDouyinPlayer: false,
      douyinVideoList: [],
      currentDouyinIndex: 0,

      /* 视频全屏播放(抖音式) */
      videoFullscreen: false,
      videoKey: 0
    }
  },

  watch: {
    isAppOverlayOpen(val) {
      /* App端: 弹层关闭后恢复视频播放 */
      if (!val && this.isAppPlus && this.postInfo) {
        setTimeout(() => {
          try {
            if (!this.videoCtx) this.initVideoContext()
            if (this.videoCtx) this.videoCtx.play()
            this.isPlaying = true
          } catch (e) {}
        }, 300)
      }
    }
  },

  computed: {
    isVideoPost() {
      if (!this.postInfo || !this.postInfo.video) return false
      const v = String(this.postInfo.video).trim()
      if (!v || v === 'null' || v === 'undefined' || v === '0') return false
      if (!v.startsWith('http') && !v.startsWith('/')) return false
      if (this.postInfo.images && this.postInfo.images.length > 0) return false
      return true
    },

    isHls() {
      const v = this.postInfo && this.postInfo.video
      return !!(v && /\.m3u8(\?|$)/i.test(v))
    },

// 判断
    isImmersiveVideoPage() {
      /* 视频帖和普通帖一样走普通详情页, 页面内带播放器, 不跳转全屏 */
      return false
    },

    posterImage() {
      if (!this.postInfo) return DEFAULT_VIDEO_COVER

      if (this.postInfo.images && this.postInfo.images.length > 0) {
        return this.postInfo.images[0]
      }

      return this.postInfo?.avatar || DEFAULT_VIDEO_COVER
    },

    commentCount() {
      if (!this.postInfo) return 0

      if (typeof this.postInfo.comment_count !== 'undefined') {
        return Number(this.postInfo.comment_count) || 0
      }

      if (Array.isArray(this.postInfo.comments)) {
        return this.postInfo.comments.length
      }

      return this.nestedComments.length
    },

    displayRewarders() {
      return this.rewarders.slice(0, 3)
    },

    isOwner() {
      return !!(
        this.userInfo &&
        this.postInfo &&
        String(this.postInfo.user_id) === String(this.userInfo.id)
      )
    },

    isAdmin() {
      return !!(this.userInfo && this.userInfo.is_admin == 1)
    },

    isReviewer() {
      return !!(this.userInfo && this.userInfo.is_reviewer == 1)
    },

    canManagePost() {
      return this.isAdmin || this.isReviewer
    },

    showFollowBtn() {
      if (!this.postInfo) return false

      if (!this.userInfo) return true

      return String(this.postInfo.user_id || 0) !== String(this.userInfo.id || 0)
    },

    showVideoFollowBtn() {
      return this.isImmersiveVideoPage &&
        this.showFollowBtn &&
        !this.isFollowingAuthor
    },

    isAnyMasked() {
      if (!this.postInfo) return false

      return !!(
        this.postInfo.status === 0 ||
        this.postInfo.status === 2 ||
        this.postInfo.is_banned ||
        this.postInfo.is_pending ||
        this.postInfo.is_masked
      )
    },

    isPaidLocked() {
      if (!this.postInfo) return false
      return parseInt(this.postInfo.is_paid) === 1 && !this.isUnlocked && !this.isOwner
    },

    isCommentLocked() {
      if (!this.postInfo) return false
      return parseInt(this.postInfo.is_comment_unlock) === 1 && parseInt(this.postInfo.is_paid) !== 1 && !this.isUnlocked && !this.isOwner
    },

    isContentLocked() {
      return this.isPaidLocked || this.isCommentLocked
    },

    imagesVisible() {
      if (!this.postInfo) return false
      // 锁定帖子（付费/评论可见）也显示图片，仅隐藏链接
      return Array.isArray(this.postInfo.images) && this.postInfo.images.length > 0
    },

    /* 是否已收藏(后端 post/detail 返回 is_collected) */
    isCollected() {
      if (!this.postInfo) return false
      return this.parseBoolLike(this.postInfo.is_collected)
    },

    /* 多图横滑容器高度: 小红书是 4:5 竖图比例 */
    imageSwiperHeight() {
      let w = 375
      try {
        const sys = uni.getSystemInfoSync ? (uni.getSystemInfoSync() || {}) : {}
        w = Number(sys.windowWidth) || 375
      } catch (e) {}
      return Math.round(w * 1.25) + 'px'
    },

    maskStatusText() {
      if (!this.postInfo) return ''

      if (this.postInfo.status === 0 || this.postInfo.is_banned) {
        return '内容违规已屏蔽'
      }

      if (this.postInfo.status === 2 || this.postInfo.is_pending) {
        return '内容正在审核中'
      }

      if (this.postInfo.is_masked) {
        return '内容暂不可见'
      }

      return '内容不可见'
    },

    maskStatusClass() {
      if (!this.postInfo) return ''

      if (this.postInfo.status === 0 || this.postInfo.is_banned) {
        return 'status-red'
      }

      if (this.postInfo.status === 2 || this.postInfo.is_pending) {
        return 'status-orange'
      }

      return 'status-gray'
    },

    isCommentDisabled() {
      return !!(
        !this.postInfo ||
        this.postInfo.system_close_comment ||
        this.postInfo.author_close_comment
      )
    },

    isAnyOverlayOpen() {
      return this.showActionMenu || this.modal.show || this.mentionSheet.show
    },

    isAppOverlayOpen() {
      /* App端: 原生 video 层级最高会盖住弹层; 弹层(评论/打赏/菜单/弹窗)打开时先隐藏视频 */
      return !!(this.showCommentDrawer || this.showRewardModal || this.showRewardersModal || this.showActionMenu || this.modal.show || this.mentionSheet.show)
    },
    computedPlaceholder() {
      if (!this.postInfo) return '说点什么...'
      if (this.postInfo.system_close_comment) return '系统已关闭评论区'
      if (this.postInfo.author_close_comment) return '作者已关闭评论区'
      if (this.replyTarget) return '回复 @' + (this.replyTarget.name || '') + '：'
      return '说点什么...'
    }
  },

  onLoad(options) {
    const metrics = getScreenMetrics()

    // 确保 statusBarHeight 有一个合理的默认值，避免为0导致导航栏与状态栏重叠
    this.statusBarHeight = metrics.statusBarHeight || 20
    this.navBarHeight = metrics.navBarHeight || 44
    this.navTotalHeight = this.statusBarHeight + this.navBarHeight

    // 动态设置 CSS 变量，确保布局正确
    // #ifdef APP-PLUS
    uni.setNavigationBarTitle({ title: '' })
    const map = uni.getStorageSync(IMG_CACHE_KEY)
    if (map) this.cachedImagesMap = map
    // #endif

    this.userInfo = uni.getStorageSync('userInfo') || null

    const pid = options.postId || options.id || 0
    this.postId = parseInt(pid)

    if (!this.postId) {
      this.showToast('帖子不存在')
      setTimeout(() => {
        this.goBack()
      }, 1200)
      return
    }

    // 监听键盘高度变化
    if (typeof uni.onKeyboardHeightChange === 'function') {
      this._keyboardHandler = (e) => {
        this.keyboardHeight = e && e.height ? e.height : 0
      }
      uni.onKeyboardHeightChange(this._keyboardHandler)
    }

    // #ifdef H5
    if (window.visualViewport) {
      this._vpHandler = () => {
        const kbH = Math.max(0, window.innerHeight - window.visualViewport.height)
        this.keyboardHeight = kbH
      }
      window.visualViewport.addEventListener('resize', this._vpHandler)
    }
    // #endif

    this.restorePreviewData()
    this.getPostDetail()
    this.reportBrowse()

    if (this.userInfo) {
      this.checkIsLiked()
    }
  },

  onShow() {
    const u = uni.getStorageSync('userInfo')
    if (u) this.userInfo = u
    if (u) this.refreshCurrentUserInfo()

    if (this.postInfo && this.userInfo) {
      this.refreshFollowStateFromApi()
    }

    if (this.isImmersiveVideoPage) {
      this.$nextTick(() => {
        setTimeout(() => {
          this.initVideoContext()
          this.initHlsPlayer('xhsVideoPlayer')
        }, 200)
      })
    }
  },

  onPageScroll(e) {
    if (this.isImmersiveVideoPage) return
    
    const scrollTop = e.scrollTop
    
    // 清除之前的定时器
    if (this._scrollTimer) {
      clearTimeout(this._scrollTimer)
    }
    
    // 使用防抖，减少状态更新频率
    this._scrollTimer = setTimeout(() => {
      this.showFrostedNav = scrollTop > 40
      this._scrollTimer = null
    }, 30)
  },

  onPullDownRefresh() {
    this.getPostDetail(true)
  },

  onUnload() {
    if (this.mentionSheet.timer) {
      clearTimeout(this.mentionSheet.timer)
      this.mentionSheet.timer = null
    }

    try {
      if (this.videoCtx) this.videoCtx.pause()
    } catch (e) {}

    this.destroyHlsPlayers()


    // 清理键盘监听
    if (this._keyboardHandler && typeof uni.offKeyboardHeightChange === 'function') {
      uni.offKeyboardHeightChange(this._keyboardHandler)
      this._keyboardHandler = null
    }

    // #ifdef H5
    if (this._vpHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this._vpHandler)
    }
    // #endif
  },

  methods: {
    safeStop(e) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
      if (e && typeof e.preventDefault === 'function') e.preventDefault()
    },

    isSuccessRes(res) {
      return !!(
        res &&
        (
          res.code === 0 ||
          res.code === '0' ||
          res.status === 0 ||
          res.status === '0' ||
          res.success === true
        )
      )
    },

    getResMsg(res, fallback = '操作失败') {
      return (res && (res.msg || res.message || res.error)) || fallback
    },

    getLevelDisplay(lv) {
      return calcLevelDisplay(lv)
    },

    parseBoolLike(value) {
      return !!(
        value === true ||
        value === 1 ||
        value === '1' ||
        value === 'true' ||
        value === 'yes' ||
        value === 'followed'
      )
    },

    getCurrentUserId() {
      return this.userInfo ? (this.userInfo.id || this.userInfo.user_id || 0) : 0
    },

    async refreshCurrentUserInfo() {
      try {
        const res = await request('user.php', { action: 'getUserInfo' }, 'GET')
        if (this.isSuccessRes(res) && res.data) {
          this.userInfo = res.data
          uni.setStorageSync('userInfo', res.data)
        }
      } catch (e) {}
    },

    restorePreviewData() {
      try {
        const preview = uni.getStorageSync(`${POST_DETAIL_PREVIEW_PREFIX}${this.postId}`)
        if (!preview) return

        const imgs = Array.isArray(preview.images)
          ? preview.images.map(x => this.buildMediaUrl(x))
          : []

        this.postInfo = {
          ...preview,
          images: imgs,
          video: preview.video
            ? this.buildMediaUrl(preview.video)
            : (preview.douyin_url && preview.douyin_url !== '0' ? preview.douyin_url : ''),
          topic_names: preview.topic_names || [],
          like_count: Number(preview.like_count) || 0,
          comments: [],
          co_creators: this.normalizeCoCreators(preview.co_creators),
          contentNodes: this.parseRichTextToNodes(
            this.stripAutoShareLinkText(
              preview.content || preview.plain_content || '',
              preview.share_link_url,
              preview.share_link_title
            )
          ),
          current_frame_img: preview.current_frame_img || ''
        }

        this.videoCover = this.postInfo.video ? (imgs[0] || DEFAULT_VIDEO_COVER) : ''
        this.firstScreenReady = true
      } catch (e) {}
    },

    reportBrowse() {
      request('post.php', {
        action: 'browse',
        postId: this.postId,
        id: this.postId
      }, 'POST').then((res) => {
        if (res && res.code === 0 && res.data) {
          const vc = Number(res.data.view_count) || Number(res.data.views) || 0
          if (vc > 0 && this.postInfo) {
            this.postInfo.view_count = vc
            this.postInfo.views = vc
          }
          // 同步首页列表缓存, 返回后列表浏览数与详情页一致
          if (vc > 0) {
            uni.setStorageSync('last_view_update', { postId: this.postId, view_count: vc })
          }
        }
      }).catch(() => {})
    },

    async getPostDetail(isRefresh = false) {
      const reqId = ++this.detailReqVersion

      if (!isRefresh) this.detailLoading = true

      try {
        const res = await request('post.php', {
          action: 'detail',
          postId: this.postId,
          id: this.postId,
          userId: this.getCurrentUserId()
        }, 'GET')

        if (reqId !== this.detailReqVersion) return

        if (this.isSuccessRes(res)) {
          const d = res.data || {}

          let rawImgs = []
          if (Array.isArray(d.images) && d.images.length > 0) {
            rawImgs = d.images
          } else if (typeof d.images === 'string' && d.images.startsWith('[')) {
            try { rawImgs = JSON.parse(d.images) || [] } catch(e) {}
          } else if (typeof d.images === 'string' && d.images && d.images !== 'null' && d.images !== 'undefined' && (d.images.startsWith('http') || d.images.startsWith('/'))) {
            rawImgs = d.images.split(',').map(s => s.trim()).filter(s => s)
          }
          if ((!rawImgs || rawImgs.length === 0) && Array.isArray(d.images_arr) && d.images_arr.length > 0) {
            rawImgs = d.images_arr
          }
          if ((!rawImgs || rawImgs.length === 0) && typeof d.images_arr === 'string' && d.images_arr.startsWith('[')) {
            try { rawImgs = JSON.parse(d.images_arr) || [] } catch(e) {}
          }
          if ((!rawImgs || rawImgs.length === 0) && d.coverImage) {
            rawImgs = [d.coverImage]
          }
          const imgs = (rawImgs || []).map(x => this.buildMediaUrl(x))

          const structuredTopics = Array.isArray(d.topic_names) ? d.topic_names : []

          const customTopics = Array.isArray(d.customTopics)
            ? d.customTopics
            : (d.custom_topics ? String(d.custom_topics).split('||').filter(t => t.trim()) : [])

          const topicNames = Array.from(new Set(structuredTopics.concat(customTopics)))

          this.postInfo = {
            ...d,
            images: imgs,
            /* 视频帖: 接口返回的 douyin_url(直链/代理)直接作为 video, 触发沉浸式全屏播放 */
            video: d.video
              ? this.buildMediaUrl(d.video)
              : (d.douyin_url && d.douyin_url !== '0' ? d.douyin_url : ''),
            share_product: d.share_product ? {
              ...d.share_product,
              image: this.buildMediaUrl(d.share_product.image || (Array.isArray(d.share_product.images) ? d.share_product.images[0] : '')),
              images: Array.isArray(d.share_product.images) ? d.share_product.images.map(x => this.buildMediaUrl(x)) : []
            } : null,
            co_creators: this.normalizeCoCreators(d.co_creators),
            topic_names: topicNames,
            like_count: Number(d.like_count) || 0,
            comment_count: Number(d.comment_count) || 0,
            comments: Array.isArray(d.comments) ? d.comments : [],
            contentNodes: this.parseRichTextToNodes(
              this.stripAutoShareLinkText(
                d.content || d.plain_content || '',
                d.share_link_url,
                d.share_link_title
              )
            ),
            current_frame_img: d.current_frame_img || ''
          }

          // 付费/评论可见解锁状态
          this.isUnlocked = !!(d.is_unlocked || d.is_purchased)
          this.isContentEncrypted = !!d.is_content_encrypted
          this.vipPrivilegeUnlocked = !!d.vip_privilege_unlocked

        
          if (typeof d.is_liked !== 'undefined') {
            this.isLiked = this.parseBoolLike(d.is_liked)
          } else if (typeof d.isLiked !== 'undefined') {
            this.isLiked = this.parseBoolLike(d.isLiked)
          } else if (typeof d.liked !== 'undefined') {
            this.isLiked = this.parseBoolLike(d.liked)
          }

          /**
           * 关注状态兼容
           */
          const hasFollowField =
            typeof d.is_following !== 'undefined' ||
            typeof d.isFollowing !== 'undefined' ||
            typeof d.followed !== 'undefined' ||
            typeof d.has_followed !== 'undefined'

          if (typeof d.is_following !== 'undefined') {
            this.isFollowingAuthor = this.parseBoolLike(d.is_following)
          } else if (typeof d.isFollowing !== 'undefined') {
            this.isFollowingAuthor = this.parseBoolLike(d.isFollowing)
          } else if (typeof d.followed !== 'undefined') {
            this.isFollowingAuthor = this.parseBoolLike(d.followed)
          } else if (typeof d.has_followed !== 'undefined') {
            this.isFollowingAuthor = this.parseBoolLike(d.has_followed)
          } else if (!this.userInfo) {
            this.isFollowingAuthor = false
          }

          this.videoCover = this.postInfo.video ? (imgs[0] || DEFAULT_VIDEO_COVER) : ''
          this.firstScreenReady = true
          // 通知首页更新该帖子的阅读数
          uni.setStorageSync('last_view_update', { postId: this.postId, view_count: Number(d.view_count) || 0 })

          this.commentLoading = true
          setTimeout(() => {
            this.nestedComments = this.buildCommentTree(this.postInfo.comments || [])
            this.commentLoading = false
          }, 20)

          this.startImageCaching(imgs)

          if (this.userInfo && !this.isOwner && !hasFollowField) {
            this.refreshFollowStateFromApi()
          }

          this.getRewarders()
        } else if (this.isImmersiveVideoPage) {
          this.$nextTick(() => {
            setTimeout(() => {
              this.initVideoContext()
              this.initHlsPlayer('xhsVideoPlayer')
            }, 200)
          })
        } else if (this.postInfo.video) {
          this.$nextTick(() => {
            setTimeout(() => {
              this.initHlsPlayer('detailVideo')
            }, 200)
          })
        } else {
          this.showToast(this.getResMsg(res, '加载失败'))

          if (!this.postInfo) {
            setTimeout(() => {
              this.goBack()
            }, 1200)
          }
        }
      } catch (e) {
        this.showToast('网络异常')
      } finally {
        this.detailLoading = false
        if (isRefresh) uni.stopPullDownRefresh()
      }
    },

    async refreshFollowStateFromApi() {
      if (!this.userInfo || !this.postInfo || !this.postInfo.user_id) return

      if (String(this.postInfo.user_id) === String(this.getCurrentUserId())) {
        this.isFollowingAuthor = false
        return
      }

      try {
        const res = await request('user.php', {
          action: 'getOtherUserInfo',
          targetId: this.postInfo.user_id,
          userId: this.getCurrentUserId()
        }, 'GET')

        if (this.isSuccessRes(res)) {
          const data = res.data || {}

          if (typeof data.isFollowing !== 'undefined') {
            this.isFollowingAuthor = this.parseBoolLike(data.isFollowing)
          } else if (typeof data.is_following !== 'undefined') {
            this.isFollowingAuthor = this.parseBoolLike(data.is_following)
          }
        }
      } catch (e) {
      }
    },

    initVideoContext() {
      try {
        this.videoCtx = uni.createVideoContext('xhsVideoPlayer', this)
      } catch (e) {}
    },

    initHlsPlayer(videoId) {
      // #ifdef H5
      if (!this.isHls || !this.postInfo || !this.postInfo.video) return
      const src = this.postInfo.video
      this.$nextTick(() => {
        const el = document.getElementById(videoId)
        if (!el) return
        if (this.hlsPlayers[videoId]) {
          try { this.hlsPlayers[videoId].destroy() } catch (e) {}
          delete this.hlsPlayers[videoId]
        }
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
          hls.loadSource(src)
          hls.attachMedia(el)
          this.hlsPlayers[videoId] = hls
        } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = src
        } else {
          el.src = src
        }
      })
      // #endif
    },

    destroyHlsPlayers() {
      // #ifdef H5
      Object.keys(this.hlsPlayers).forEach(id => {
        try { this.hlsPlayers[id].destroy() } catch (e) {}
      })
      this.hlsPlayers = {}
      // #endif
    },

    onVideoPlay() {
      this.isPlaying = true
    },

    onVideoPause() {
      this.isPlaying = false
    },

    toggleVideoPlay() {
      if (!this.isImmersiveVideoPage) return

      if (!this.videoCtx) this.initVideoContext()
      if (!this.videoCtx) return

      try {
        if (this.isPlaying) {
          this.videoCtx.pause()
          this.isPlaying = false
        } else {
          this.videoCtx.play()
          this.isPlaying = true
        }
      } catch (e) {}
    },

    toggleMute() {
      this.isMuted = !this.isMuted

      this.$nextTick(() => {
        try {
          if (!this.videoCtx) this.initVideoContext()
          if (this.videoCtx) this.videoCtx.play()
          this.isPlaying = true
        } catch (e) {}
      })
    },

    onVideoLoaded(e) {
      const width = e && e.detail ? e.detail.width : 0
      const height = e && e.detail ? e.detail.height : 0
      if (!width || !height) return

      const sys = uni.getSystemInfoSync()
      const containerWidth = sys.windowWidth - uni.upx2px(48)
      let calcHeight = height / width * containerWidth

      const maxHeight = sys.windowHeight * 0.75
      const minHeight = uni.upx2px(320)

      if (calcHeight > maxHeight) calcHeight = maxHeight
      if (calcHeight < minHeight) calcHeight = minHeight

      this.videoStyleHeight = calcHeight + 'px'
    },

    buildMediaUrl(url) {
      if (!url) return ''

      url = String(url).trim()

      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('blob:') ||
        url.startsWith('data:')
      ) {
        return url
      }

      let root = baseUrl || ''

      root = root.replace(/\/API\/?$/i, '')

      if (root.endsWith('/')) root = root.slice(0, -1)
      if (!url.startsWith('/')) url = '/' + url

      return root + url
    },

    normalizeCoCreators(list) {
      if (!Array.isArray(list)) return []

      // 用户 id 是字符串 uid(如 2026083020290146FBAB), 不能用 parseInt 截断
      return list.map(item => ({
        ...item,
        id: String(item.id || '').trim(),
        avatar: this.buildMediaUrl(item.avatar || '')
      })).filter(item => item.id !== '')
    },

    stripAutoShareLinkText(text, shareLinkUrl, shareLinkTitle) {
      const raw = String(text || '')
      const url = String(shareLinkUrl || '').trim()
      const title = String(shareLinkTitle || '').trim()

      if (!raw || !url) return raw

      const escapeReg = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const candidates = [url]

      if (title) {
        candidates.push(`${title} ${url}`)
      }

      let cleaned = raw

      candidates.forEach(pattern => {
        const reg = new RegExp(`(^|\\n)${escapeReg(pattern)}(?=\\n|$)`, 'g')
        cleaned = cleaned.replace(reg, '$1')
      })

      cleaned = cleaned.replace(new RegExp(escapeReg(url), 'g'), '')
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

      return cleaned.trim()
    },

    getCachedImage(url) {
      if (!url) return ''

      // #ifdef APP-PLUS
      if (this.cachedImagesMap[url]) return this.cachedImagesMap[url]
      // #endif

      return url
    },

    startImageCaching(images) {
      // #ifdef APP-PLUS
      if (!images || images.length === 0) return

      const uncachedImages = images.filter(img => img && !this.cachedImagesMap[img])
      const maxConcurrent = 2
      let index = 0
      let downloading = 0

      const downloadNext = () => {
        if (index >= uncachedImages.length) return

        const remoteUrl = uncachedImages[index++]
        
        downloading++
        uni.downloadFile({
          url: remoteUrl,
          success: res => {
            if (res.statusCode === 200) {
              uni.saveFile({
                tempFilePath: res.tempFilePath,
                success: saveRes => {
                  if (this.$set) {
                    this.$set(this.cachedImagesMap, remoteUrl, saveRes.savedFilePath)
                  } else {
                    this.cachedImagesMap[remoteUrl] = saveRes.savedFilePath
                  }
                },
                complete: () => {
                  downloading--
                  setTimeout(downloadNext, 500)
                }
              })
            } else {
              downloading--
              setTimeout(downloadNext, 500)
            }
          },
          fail: () => {
            downloading--
            setTimeout(downloadNext, 800)
          },
          complete: () => {
            if (!downloading && index >= uncachedImages.length) {
              try {
                uni.setStorageSync(IMG_CACHE_KEY, this.cachedImagesMap)
              } catch (e) {}
            }
          }
        })
      }

      for (let i = 0; i < Math.min(maxConcurrent, uncachedImages.length); i++) {
        setTimeout(() => downloadNext(), i * 300)
      }
      // #endif
    },

    handleImgError(url) {
      if (this.cachedImagesMap[url]) {
        if (this.$delete) {
          this.$delete(this.cachedImagesMap, url)
        } else {
          delete this.cachedImagesMap[url]
        }

        // #ifdef APP-PLUS
        uni.setStorageSync(IMG_CACHE_KEY, this.cachedImagesMap)
        // #endif
      }
    },

    formatTime(timeStr) {
      if (!timeStr) return ''

      let date

      if (typeof timeStr === 'number') {
        if (String(timeStr).length === 10) {
          timeStr = timeStr * 1000
        }
        date = new Date(timeStr)
      } else {
        date = new Date(String(timeStr).replace(/-/g, '/'))
      }

      if (isNaN(date.getTime())) return String(timeStr)

      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const sec = Math.floor(diff / 1000)

      if (sec < 60) return '刚刚'
      if (sec < 3600) return Math.floor(sec / 60) + '分钟前'
      if (sec < 86400) return Math.floor(sec / 3600) + '小时前'
      if (sec < 259200) return Math.floor(sec / 86400) + '天前'

      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')

      if (y === now.getFullYear()) return `${m}-${d}`
      return `${y}-${m}-${d}`
    },

    parseRichTextToNodes(text) {
      if (!text) return []

      text = String(text)

      const nodes = []
      const mentionReg = /@\[(.*?)\]\(uid:(\d+)\)/g
      let lastIndex = 0
      let m

      while ((m = mentionReg.exec(text)) !== null) {
        const before = text.slice(lastIndex, m.index)
        if (before) nodes.push(...this.parseLinksToNodes(before))

        nodes.push({
          type: 'mention',
          text: '@' + (m[1] || ''),
          userId: parseInt(m[2]) || 0
        })

        lastIndex = mentionReg.lastIndex
      }

      const rest = text.slice(lastIndex)
      if (rest) nodes.push(...this.parseLinksToNodes(rest))

      return nodes
    },

    parseLinksToNodes(text) {
      const nodes = []
      if (!text) return nodes

      const reg = /(https?:\/\/[^\s]+)/g
      let last = 0
      let m

      while ((m = reg.exec(text)) !== null) {
        const before = text.slice(last, m.index)
        if (before) nodes.push(...this.parseTopicsToNodes(before))

        nodes.push({
          type: 'link',
          text: m[0],
          url: m[0]
        })

        last = reg.lastIndex
      }

      const rest = text.slice(last)
      if (rest) nodes.push(...this.parseTopicsToNodes(rest))

      return nodes
    },

    parseTopicsToNodes(text) {
      const nodes = []
      if (!text) return nodes
      const reg = /#([^\s#]{1,12})/g
      let last = 0
      let m
      while ((m = reg.exec(text)) !== null) {
        if (m.index > last) {
          nodes.push({ type: 'text', text: text.slice(last, m.index) })
        }
        nodes.push({ type: 'topic', text: '#' + m[1], value: m[1] })
        last = reg.lastIndex
      }
      if (last === 0) {
        nodes.push({ type: 'text', text: text })
      } else if (last < text.length) {
        nodes.push({ type: 'text', text: text.slice(last) })
      }
      return nodes
    },

    openExternalLink(url) {
      if (!url) return

      // #ifdef H5
      window.open(url, '_blank')
      // #endif

      // #ifdef APP-PLUS
      try {
        plus.runtime.openURL(url)
      } catch (e) {
        uni.setClipboardData({
          data: url,
          success: () => this.showToast('链接已复制')
        })
      }
      // #endif

      // #ifdef MP
      uni.setClipboardData({
        data: url,
        success: () => this.showToast('链接已复制')
      })
      // #endif
    },

    onDouyinVideoLoaded() {
      this.douyinVideoLoaded = true
      this.douyinVideoError = false
    },

    onDouyinVideoError() {
      this.douyinVideoLoaded = true
      this.douyinVideoError = true
    },



    playVideo() {
      const videoContext = uni.createVideoContext('douyin-video', this)
      if (videoContext) {
        videoContext.play()
      }
    },

    onDouyinPlay() {},

    onDouyinLoaded() {},

    onDouyinError() {},

    openDouyinPlayer() {
      if (!this.postInfo || !this.postInfo.douyin_url) return
      // 点击视频卡片 → 抖音式全屏播放
      const extractedUrl = this.extractUrlFromText(this.postInfo.douyin_url)
      let targetUrl = extractedUrl || this.postInfo.douyin_url
      if (!this.isValidUrl(targetUrl)) {
        uni.showToast({ title: '视频链接无效', icon: 'none' })
        return
      }
      // 抖音/西瓜分享链接 → 解析出直链后再全屏
      if (targetUrl.includes('douyin.com') || targetUrl.includes('v.douyin.com') || targetUrl.includes('ixigua.com')) {
        this.postInfo.douyin_url = targetUrl
        this.parseDouyinUrlAndPlay()
        return
      }
      // 直链/代理地址 → 直接进入抖音式全屏播放
      this.playVideoFullscreen(targetUrl)
    },

    /* 进入抖音式全屏播放(竖屏整屏视频+右侧操作列) */
    playVideoFullscreen(url) {
      if (!url) return
      this.postInfo.video = url
      /* 自动播放策略: App端(video是原生组件)支持带声自动播放, 直接有声;
         H5浏览器拦截带声音的自动播放, 只能静音自动播, 用户点"有声"恢复(和抖音一致) */
      this.isMuted = this.isAppPlus ? false : true
      this.videoFullscreen = true
      this.videoKey++
      /* 先显示中央播放按钮兜底: 自动播放成功后 onVideoPlay 会隐藏 */
      this.isPlaying = false
      this.$nextTick(() => {
        try {
          this.videoCtx = uni.createVideoContext('xhsVideoPlayer', this)
          this.videoCtx.play()
        } catch (e) {}
      })
    },

    /* 全屏播放失败(直链过期/被拦) → 自动切分享链接代理兜底 */
    onVideoFullscreenError() {
      if (!this.postInfo) return
      try {
        /* 通用链接提取(兼容快手/抖音/西瓜分享链接, 不依赖只认抖音的 extractUrlFromText) */
        const pickLink = (text) => {
          if (!text) return ''
          const m = String(text).match(/https?:\/\/[^\s"'<>]+/)
          return m ? m[0].replace(/[.,;:!?，。、；：]+$/, '').trim() : ''
        }
        const ori = pickLink(this.postInfo.douyin_original_url)
        let fallbackUrl = ori && this.isValidUrl(ori) ? this.buildProxyUrl(ori) : ''
        /* 也尝试 douyin_url 本身是分享链接的情况 */
        if (!fallbackUrl) {
          const du = pickLink(this.postInfo.douyin_url)
          if (du && this.isValidUrl(du) && (du.includes('kuaishou.com') || du.includes('douyin.com') || du.includes('iesdouyin.com'))) {
            fallbackUrl = this.buildProxyUrl(du)
          }
        }
        if (fallbackUrl && fallbackUrl !== this.postInfo.video) {
          this.postInfo.video = fallbackUrl
          this.videoKey++
          this.isPlaying = false
          this.$nextTick(() => {
            try {
              this.videoCtx = uni.createVideoContext('xhsVideoPlayer', this)
              this.videoCtx.play()
            } catch (e) {}
          })
          return
        }
      } catch (e) {}
      uni.showToast({ title: '视频加载失败', icon: 'none' })
      this.isPlaying = false
    },

    /* 拼代理地址(分享链接 → 后端重新解析出最新直链) */
    buildProxyUrl(url) {
      try {
        const base = (typeof baseUrl !== 'undefined' && baseUrl) ? String(baseUrl) : ''
        const cleanBase = base.replace(/\/+$/, '')
        return cleanBase + '/video/proxy?url=' + encodeURIComponent(url)
      } catch (e) {
        return ''
      }
    },

    loadDouyinVideoList() {
      try {
        if (!this.postInfo.douyin_url) {
          uni.showToast({ title: '视频链接为空', icon: 'none' })
          return
        }
        
        let douyinUrl = this.postInfo.douyin_url
        const extractedUrl = this.extractUrlFromText(douyinUrl)
        if (extractedUrl) {
          douyinUrl = extractedUrl
        }
        
        const isValidUrl = this.isValidUrl(douyinUrl)
        if (!isValidUrl) {
          uni.showToast({ title: '视频链接无效', icon: 'none' })
          return
        }
        
        const isOriginalDouyinUrl = douyinUrl.includes('douyin.com') || 
                                   douyinUrl.includes('v.douyin.com') ||
                                   douyinUrl.includes('ixigua.com')
        
        if (isOriginalDouyinUrl) {
          this.postInfo.douyin_url = douyinUrl
          this.parseDouyinUrlAndPlay()
        } else {
          this.douyinVideoList = [{
            id: this.postInfo.id,
            url: douyinUrl,
            cover: this.postInfo.douyin_cover,
            title: this.postInfo.douyin_title || '抖音视频',
            author: this.postInfo.name || this.postInfo.username || '匿名',
            authorId: this.postInfo.user_id,
            authorAvatar: this.postInfo?.avatar || '/static/logo.png',
            likeCount: this.postInfo.like_count || 0,
            commentCount: this.postInfo.comment_count || 0,
            rewardCount: this.postInfo.reward_count || 0,
            isLiked: this.isLiked,
            isFollowed: this.isFollowingAuthor,
            comments: this.nestedComments
          }]
          this.showDouyinPlayer = true
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    
    async parseDouyinUrlAndPlay() {
      try {
        uni.showLoading({ title: '解析中...' })
        
        const parseApiUrl = 'https://api.xiaotuo.net/api/jiexi/?apikey=YOUR-XIAOTUO-APIKEY&url=' + encodeURIComponent(this.postInfo.douyin_url)
        
        const res = await uni.request({
          url: parseApiUrl,
          method: 'GET',
          timeout: 30000
        })
        
        uni.hideLoading()
        
        if (res.statusCode !== 200) {
          throw { msg: '解析请求失败' }
        }
        
        const data = res.data
        
        const isSuccess = (!data.code || data.code === 0 || data.code === '0' || data.code === 200 || data.success === true || data.success === 'true')
        if (!data || !isSuccess) {
          throw { msg: data.msg || data.message || '解析失败' }
        }
        
        let playUrl = ''
        let cover = this.postInfo.douyin_cover
        let title = this.postInfo.douyin_title
        let author = this.postInfo.douyin_author
        
        const resultData = data.data || data
        
        if (resultData.video_url) playUrl = resultData.video_url
        else if (resultData.video) playUrl = resultData.video
        else if (resultData.play) playUrl = resultData.play
        else if (resultData.url) playUrl = resultData.url
        else if (resultData.playUrl) playUrl = resultData.playUrl
        else if (resultData.download_url) playUrl = resultData.download_url
        
        if (!cover) {
          if (resultData.cover_url) cover = resultData.cover_url
          else if (resultData.cover) cover = resultData.cover
          else if (resultData.img) cover = resultData.img
          else if (resultData.thumbnail) cover = resultData.thumbnail
        }
        
        if (!title && resultData.title) title = resultData.title
        
        if (!author) {
          if (resultData.nickname) author = resultData.nickname
          else if (resultData.author) author = resultData.author
        }
        
        if (!playUrl) {
          throw { msg: '解析失败，未能获取视频链接' }
        }
        
        this.douyinVideoList = [{
          id: this.postInfo.id,
          url: playUrl,
          cover: cover || '/static/logo.png',
          title: title || '抖音视频',
          author: author || (this.postInfo.name || this.postInfo.username || '匿名'),
          authorId: this.postInfo.user_id,
          authorAvatar: this.postInfo?.avatar || '/static/logo.png',
          likeCount: this.postInfo.like_count || 0,
          commentCount: this.postInfo.comment_count || 0,
          rewardCount: this.postInfo.reward_count || 0,
          isLiked: this.isLiked,
          isFollowed: this.isFollowingAuthor,
          comments: this.nestedComments
        }]
        // 解析成功 → 抖音式全屏播放
        this.playVideoFullscreen(playUrl)
        
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '解析失败', icon: 'none' })
      }
    },
    
    isValidUrl(url) {
      if (!url || typeof url !== 'string') return false
      if (url === '0' || url === 'null' || url === 'undefined') return false
      const urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/
      return urlPattern.test(url)
    },
    
    extractUrlFromText(text) {
      // 从文本中提取抖音/西瓜视频链接
      const urlPattern = /https?:\/\/(?:v\.)?(douyin|ixigua)\.com\/[^\s]+/gi
      const matches = text.match(urlPattern)
      if (matches && matches.length > 0) {
        return matches[0].trim()
      }
      return null
    },

    onDouyinLike({ video, index, liked }) {
      const currentVideo = this.douyinVideoList[index]
      if (!currentVideo) return

      if (video.id === this.postInfo.id) {
        this.handleLike()
      } else {
        this.$emit('likePost', { postId: video.id, liked })
      }
    },

    onDouyinComment({ video, content }) {
      if (video.id === this.postInfo.id) {
        if (content && content.trim()) {
          this.submitComment(content)
        } else {
          this.focusComment()
        }
      } else {
        this.$emit('commentPost', { postId: video.id, content })
      }
    },

    onDouyinReward({ video, amount }) {
      if (video.id === this.postInfo.id) {
        this.rewardAmount = amount
        this.isCustomReward = false
        this.customRewardAmount = ''
        this.doReward()
      } else {
        this.$emit('rewardPost', { postId: video.id, amount })
      }
    },

    onDouyinFollow(video) {
      if (video.id === this.postInfo.id) {
        const index = this.douyinVideoList.findIndex(v => v.id === video.id)
        if (index !== -1) {
          this.$set(this.douyinVideoList[index], 'isFollowed', !this.douyinVideoList[index].isFollowed)
        }
        this.handleFollowAuthor()
      } else {
        this.$emit('followUser', video.authorId)
      }
    },

    onLoadDouyinComments(video) {
      if (video.id !== this.postInfo.id) {
        this.loadPostComments(video.id)
      }
    },

    async loadPostComments(postId) {
      try {
        const res = await request({
          url: '/api/post/comments',
          method: 'GET',
          data: {
            post_id: postId,
            page: 1,
            limit: 20
          }
        })

        if (res.code === 0 && res.data) {
          const videoIndex = this.douyinVideoList.findIndex(v => v.id === postId)
          if (videoIndex !== -1) {
            this.$set(this.douyinVideoList[videoIndex], 'comments', res.data.list || [])
          }
        }
      } catch (e) {
      }
    },

    goMarketProduct(id) {
      if (!id) return
      uni.navigateTo({ url: '/pages/market/detail?id=' + id })
    },

    previewImage(images, index) {
      uni.previewImage({
        urls: images,
        current: index
      })
    },

    buildCommentTree(list) {
      if (!Array.isArray(list) || list.length === 0) return []

      const map = {}
      const roots = []

      for (let i = 0; i < list.length; i++) {
        const raw = list[i]
        const c = {
          ...raw,
          children: [],
          is_pinned: parseInt(raw.is_pinned) || 0,
          status: parseInt(raw.status),
          contentNodes: null,
          _content: raw.content || ''
        }
        map[c.id] = c
      }

      for (const id in map) {
        const c = map[id]
        const parentId = String(c.parent_id || '0')
        
        if (parentId === '0') {
          roots.push(c)
        } else if (map[parentId]) {
          if (!map[parentId].children) {
            map[parentId].children = []
          }
          map[parentId].children.push(c)
        } else {
          roots.push(c)
        }
      }

      for (let i = 0; i < roots.length; i++) {
        const root = roots[i]
        if (root.children && root.children.length > 1) {
          root.children.sort(this.compareCommentByTime)
        }
      }

      if (roots.length > 1) {
        roots.sort(this.compareRootComments)
      }

      return roots
    },
    compareCommentByTime(a, b) {
      const at = this.parseCommentTime(a.create_time)
      const bt = this.parseCommentTime(b.create_time)
      return at - bt
    },
    compareRootComments(a, b) {
      const pinnedA = parseInt(a.is_pinned)
      const pinnedB = parseInt(b.is_pinned)

      if (pinnedA !== pinnedB) {
        return pinnedB - pinnedA
      }

      const at = this.parseCommentTime(a.pinned_time || a.create_time)
      const bt = this.parseCommentTime(b.pinned_time || b.create_time)

      return bt - at
    },
    parseCommentTime(timeStr) {
      if (!timeStr) return 0
      try {
        return new Date(String(timeStr).replace(/-/g, '/')).getTime()
      } catch (e) {
        return 0
      }
    },
    parseContentNodes(content) {
      if (!content) return []
      return this.parseRichTextToNodes(content)
    },
    getCommentNodes(item) {
      if (!item) return []
      if (item.contentNodes) return item.contentNodes
      if (!item._content) return []

      try {
        const nodes = this.parseRichTextToNodes(item._content)
        item.contentNodes = nodes
        return nodes
      } catch (e) {
        return [{ type: 'text', text: item._content }]
      }
    },

    shouldShowReplyToggle(item) {
      return !!(item && item.children && item.children.length > 0)
    },

    getVisibleChildren(item) {
      if (!item || !item.children) return []

      const expanded = this.expandedReplyMap[item.id] === true
      // 抖音风格：默认收缩不显示子评论
      if (!expanded) return []

      const fullyExpanded = this.fullyExpandedMap[item.id] === true
      // 展开后默认只显示3条，完全展开显示全部
      if (fullyExpanded || item.children.length <= 3) {
        return item.children
      }
      return item.children.slice(0, 3)
    },

    getReplyToggleText(item) {
      if (!this.shouldShowReplyToggle(item)) return ''

      const expanded = this.expandedReplyMap[item.id] === true
      if (!expanded) {
        return `展开 ${item.children.length} 条回复`
      }

      const fullyExpanded = this.fullyExpandedMap[item.id] === true
      if (!fullyExpanded && item.children.length > 3) {
        return `查看更多回复（${item.children.length - 3}条）`
      }
      return '收起回复'
    },

    toggleReplies(item) {
      if (!item || !item.id) return
      const id = item.id
      const expanded = this.expandedReplyMap[id] === true
      const fullyExpanded = this.fullyExpandedMap[id] === true

      if (!expanded) {
        // 第一次点击：展开显示3条
        if (this.$set) {
          this.$set(this.expandedReplyMap, id, true)
        } else {
          this.expandedReplyMap[id] = true
        }
      } else if (!fullyExpanded && item.children.length > 3) {
        // 第二次点击：完全展开
        if (this.$set) {
          this.$set(this.fullyExpandedMap, id, true)
        } else {
          this.fullyExpandedMap[id] = true
        }
      } else {
        // 第三次点击：收起
        if (this.$set) {
          this.$set(this.expandedReplyMap, id, false)
          this.$set(this.fullyExpandedMap, id, false)
        } else {
          this.expandedReplyMap[id] = false
          this.fullyExpandedMap[id] = false
        }
      }
    },

    canDelete(item) {
      return !!(
        this.userInfo &&
        item &&
        (
          String(item.user_id) === String(this.getCurrentUserId()) ||
          this.isAdmin ||
          this.isOwner
        )
      )
    },

    setReplyTarget(item) {
      if (!item) return
      if (this.isCommentDisabled) return

      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      const parentId = item.id

      this.replyTarget = {
        parentId,
        replyToCommentId: item.id,
        name: item.name || item.username || ''
      }

      if (this.isImmersiveVideoPage) {
        this.openCommentDrawer()
      }

      this.$nextTick(() => {
        this.commentFocus = true
      })
    },

    focusComment() {
      if (this.isCommentDisabled) return

      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      if (this.isImmersiveVideoPage) {
        this.openCommentDrawer()
      }

      this.$nextTick(() => {
        this.commentFocus = true
      })
    },

    onCommentFocus() {
      this.commentFocus = true
    },

    onCommentBlur() {
      this.commentFocus = false
    },

    openCommentDrawer() {
      if (!this.isImmersiveVideoPage) return

      this.showCommentDrawer = true

      this.$nextTick(() => {
        this.commentFocus = false
      })
    },

    closeCommentDrawer() {
      this.showCommentDrawer = false
      this.commentFocus = false
      this.replyTarget = null
    },

    onCommentInput(e) {
      const val = e && e.detail && typeof e.detail.value === 'string'
        ? e.detail.value
        : this.commentContent

      this.commentContent = val

      const atPos = val.lastIndexOf('@')
      if (atPos >= 0 && val.slice(atPos + 1).length === 0) {
        this.mentionSheet.insertPos = atPos
        this.openMentionSheet()
      }
    },

    openMentionSheet() {
      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      this.mentionSheet.show = true
      this.mentionSheet.keyword = ''
      this.mentionSheet.list = []
    },

    closeMentionSheet() {
      this.mentionSheet.show = false
      this.mentionSheet.insertPos = -1
    },

    searchMentionDebounced() {
      if (this.mentionSheet.timer) {
        clearTimeout(this.mentionSheet.timer)
      }

      this.mentionSheet.timer = setTimeout(() => {
        this.searchMentionNow()
      }, 300)
    },

    async searchMentionNow() {
      const keyword = (this.mentionSheet.keyword || '').trim()

      try {
        const res = await request('user.php', {
          action: 'searchUser',
          keyword,
          page: 1,
          pageSize: 20
        }, 'GET')

        if (this.isSuccessRes(res)) {
          this.mentionSheet.list = Array.isArray(res.data)
            ? res.data
            : ((res.data && res.data.list) || [])
        } else {
          this.mentionSheet.list = []
        }
      } catch (e) {
        this.mentionSheet.list = []
      }
    },

    pickMentionUser(user) {
      if (!user) return

      const name = user.name || user.username || '用户'
      const uid = user.id || 0
      const mentionText = `@[${name}](uid:${uid}) `

      let content = this.commentContent || ''
      const pos = this.mentionSheet.insertPos

      if (pos >= 0) {
        content = content.slice(0, pos) + mentionText + content.slice(pos + 1)
      } else {
        content += mentionText
      }

      this.commentContent = content
      this.closeMentionSheet()

      this.$nextTick(() => {
        this.commentFocus = true
      })
    },

    async publishComment() {
      if (this.isCommentDisabled) return

      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      const content = (this.commentContent || '').trim()

      if (!content) {
        this.showToast('请输入评论内容')
        return
      }

      if (content.length > 500) {
        this.showToast('评论内容不能超过500字')
        return
      }

      try {
        uni.showLoading({ title: '发送中...' })

        const payload = {
          action: 'comment',
          postId: this.postId,
          id: this.postId,
          userId: this.getCurrentUserId(),
          content
        }

        if (this.replyTarget) {
          payload.parentId = this.replyTarget.parentId
          payload.replyToCommentId = this.replyTarget.replyToCommentId
        }

        const res = await request('post.php', payload, 'POST')

        if (this.isSuccessRes(res)) {
          this.commentContent = ''
          this.replyTarget = null
          this.commentFocus = false

          this.showToast(this.getResMsg(res, '评论成功'))
          await this.getPostDetail(true)

          // 评论可见：评论成功后自动解锁
          if (this.postInfo && this.postInfo.is_comment_unlock && !this.isUnlocked && !this.isOwner) {
            try {
              const unlockRes = await request('post.php', { action: 'unlock_by_comment', post_id: this.postId })
              if (this.isSuccessRes(unlockRes)) this.isUnlocked = true
            } catch (e) { /* ignore */ }
          }
        } else {
          this.showToast(this.getResMsg(res, '评论失败'))
        }
      } catch (e) {
        this.showToast('网络异常')
      } finally {
        uni.hideLoading()
      }
    },

    askDeleteComment(commentId) {
      this.modal = {
        show: true,
        content: '确定要删除这条评论吗？',
        type: 'deleteComment',
        targetId: commentId
      }
    },

    async deleteComment(commentId) {
      try {
        uni.showLoading({ title: '删除中...' })

        const res = await request('post.php', {
          action: 'deleteComment',
          commentId,
          id: commentId,
          userId: this.getCurrentUserId()
        }, 'POST')

        if (this.isSuccessRes(res)) {
          this.showToast('删除成功')
          await this.getPostDetail(true)
        } else {
          this.showToast(this.getResMsg(res, '删除失败'))
        }
      } catch (e) {
        this.showToast('网络异常')
      } finally {
        uni.hideLoading()
      }
    },

    async togglePin(item) {
      if (!this.isOwner || this.pinLock || !item) return

      this.pinLock = true
      this.pinLoadingId = item.id

      const pinned = parseInt(item.is_pinned) === 1
      const action = pinned ? 'unpinComment' : 'pinComment'

      try {
        const res = await request('post.php', {
          action,
          commentId: item.id,
          postId: this.postId,
          userId: this.getCurrentUserId()
        }, 'POST')

        if (this.isSuccessRes(res)) {
          this.showToast(this.getResMsg(res, pinned ? '已取消置顶' : '置顶成功'))
          await this.getPostDetail(true)
        } else {
          this.showToast(this.getResMsg(res, '操作失败'))
        }
      } catch (e) {
        this.showToast('网络异常')
      } finally {
        this.pinLoadingId = 0
        this.pinLock = false
      }
    },

    async checkIsLiked() {
      if (!this.userInfo || !this.postId) return

      try {
        const res = await request('post.php', {
          action: 'checkLike',
          postId: this.postId,
          id: this.postId,
          userId: this.getCurrentUserId()
        }, 'GET')

        if (this.isSuccessRes(res)) {
          const data = res.data || {}
          this.isLiked = this.parseBoolLike(
            data.isLiked !== undefined
              ? data.isLiked
              : data.is_liked !== undefined
                ? data.is_liked
                : data.liked
          )
        }
      } catch (e) {
      }
    },


    async handleLike() {
      if (this.likeLock) return

      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      if (!this.postInfo) return

      this.likeLock = true

      const oldLiked = this.isLiked
      const oldCount = Number(this.postInfo.like_count) || 0
      const nextLiked = !oldLiked

      this.isLiked = nextLiked
      this.postInfo.like_count = nextLiked
        ? oldCount + 1
        : Math.max(0, oldCount - 1)

      const payload = {
        postId: this.postId,
        id: this.postId,
        userId: this.getCurrentUserId()
      }

      try {
        // 直接调用后端唯一点赞接口 (like 为切换: 已赞则取消, 未赞则点赞)
        const res = await request('post.php', {
          ...payload,
          action: 'like'
        }, 'POST')

        if (!this.isSuccessRes(res)) {
          this.isLiked = oldLiked
          this.postInfo.like_count = oldCount
          this.showToast(this.getResMsg(res, '操作失败'))
          return
        }

        const data = res.data || {}

        if (typeof data.like_count !== 'undefined') {
          this.postInfo.like_count = Number(data.like_count) || 0
        } else if (typeof data.likes !== 'undefined') {
          this.postInfo.like_count = Number(data.likes) || 0
        }

        if (typeof data.isLiked !== 'undefined') {
          this.isLiked = this.parseBoolLike(data.isLiked)
        } else if (typeof data.is_liked !== 'undefined') {
          this.isLiked = this.parseBoolLike(data.is_liked)
        } else if (typeof data.status !== 'undefined') {
          this.isLiked = this.parseBoolLike(data.status)
        }
      } catch (e) {
        this.isLiked = oldLiked
        this.postInfo.like_count = oldCount
        this.showToast('网络异常')
      } finally {
        setTimeout(() => {
          this.likeLock = false
        }, 250)
      }
    },

    async handleCollect() {
      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      if (!this.postInfo) return
      if (this.collectLock) return

      const oldCollected = this.isCollected
      const oldCount = Number(this.postInfo.collect_count) || 0
      const nextCollected = !oldCollected

      // 乐观更新
      this.collectLock = true
      this.$set(this.postInfo, 'is_collected', nextCollected ? 1 : 0)
      this.postInfo.collect_count = nextCollected ? oldCount + 1 : Math.max(0, oldCount - 1)

      try {
        /* 后端 post/collect 本身就是「收藏/取消收藏」的切换接口，
           不要传 uncollect —— 该 action 没有映射，会导致取消收藏失败 */
        const res = await request('post.php', {
          action: 'collect',
          postId: this.postId
        }, 'POST')

        if (!this.isSuccessRes(res)) {
          this.$set(this.postInfo, 'is_collected', oldCollected ? 1 : 0)
          this.postInfo.collect_count = oldCount
          this.showToast(this.getResMsg(res, '操作失败'))
        } else {
          // 以服务端返回为准，避免乐观更新和真实状态不一致
          const d = (res && res.data) || {}
          if (typeof d.collected !== 'undefined') {
            const real = this.parseBoolLike(d.collected)
            this.$set(this.postInfo, 'is_collected', real ? 1 : 0)
            this.postInfo.collect_count = real
              ? (oldCollected ? oldCount : oldCount + 1)
              : (oldCollected ? Math.max(0, oldCount - 1) : oldCount)
          }
        }
      } catch (e) {
        this.$set(this.postInfo, 'is_collected', oldCollected ? 1 : 0)
        this.postInfo.collect_count = oldCount
        this.showToast('网络异常')
      } finally {
        setTimeout(() => { this.collectLock = false }, 250)
      }
    },

    /* 多图横滑翻页 → 更新右下角页码 */
    onImageSwiperChange(e) {
      const cur = e && e.detail ? Number(e.detail.current) : 0
      this.imageIndex = cur >= 0 ? cur : 0
    },

    async submitComment(content) {
      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      if (!content.trim()) {
        this.showToast('请输入评论内容')
        return
      }

      try {
        const res = await request('post.php', {
          action: 'addComment',
          postId: this.postId,
          content: content.trim(),
          userId: this.getCurrentUserId()
        }, 'POST')

        if (this.isSuccessRes(res)) {
          this.showToast('评论成功')
          await this.getPostDetail(true)
        } else {
          this.showToast(this.getResMsg(res, '评论失败'))
        }
      } catch (e) {
        this.showToast('网络异常')
      }
    },

    /**
     * 关注修复版：
     * 1. 点击后乐观更新
     * 2. 补 userId / targetId / targetUserId
     * 3. 接口返回 followed / unfollowed 时同步状态
     * 4. 成功关注后按钮自动消失
     */
    openRewardModal() {
      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      if (!this.postInfo || !this.postInfo.user_id) {
        uni.showToast({ title: '无法获取作者信息', icon: 'none' })
        return
      }
      this.showRewardModal = true
    },

    async doReward() {
      if (!this.userInfo || !this.postInfo) return
      if (this.rewardLock) return
      if (!this.postId) {
        uni.showToast({ title: '帖子ID未设置', icon: 'none' })
        return
      }

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
        // 打赏接口：post.php?action=reward_post（api-map里已映射到wallet/tip/send）
        const authorUid = this.postInfo && (this.postInfo.uid || this.postInfo.user_id)
        const res = await request('post.php', {
          action: 'reward_post',
          target_type: 'post',
          target_id: this.postId,
          amount: actualAmount,
          currency: 'points',
          post_id: this.postId,
          target_user_id: authorUid,
          receiver_uid: authorUid,
          remark: ''
        }, 'POST')

        if (this.isSuccessRes(res)) {
          uni.showToast({ title: '打赏成功', icon: 'success' })

          if (this.postInfo.reward_count != null) {
            this.postInfo.reward_count = Number(this.postInfo.reward_count) + 1
          } else {
            this.postInfo.reward_count = 1
          }
          // 标记帖子"已被打赏过", 让 UI 文案/徽章可以显示
          this.$set(this.postInfo, 'is_rewarded', 1)

          // 同步更新本地积分 (优先以后端返回的 balance_after 为准, 兜底本地减 actualAmount)
          let newJifen
          if (res && res.data && res.data.balance_after != null) {
            newJifen = Number(res.data.balance_after)
          } else {
            const b = Number((this.userInfo && this.userInfo.jifen) || (this.userInfo && this.userInfo.points) || 0)
            newJifen = Math.max(0, b - actualAmount)
          }
          this.userInfo.jifen   = newJifen
          this.userInfo.points  = newJifen
          this.userInfo.score   = newJifen
          // 持久化 userInfo，回首页/切页面后仍为最新积分，避免 SWR 60s 内显示老积分
          uni.setStorageSync('userInfo', this.userInfo)

          this.rewardAmount = 100
          this.isCustomReward = false
          this.customRewardAmount = ''
        } else {
          uni.showToast({ title: (res && res.msg) || '打赏失败', icon: 'none' })
        }
      } catch (e) {
        console.error('打赏失败详情:', e)
        const errMsg = (e && (e.message || e.errMsg || (e.data && e.data.msg))) || '网络异常'
        uni.showToast({ title: '打赏失败: ' + errMsg, icon: 'none', duration: 3000 })
      } finally {
        this.rewardLock = false
      }
    },

    selectRewardAmount(amount) {
      this.isCustomReward = false
      this.rewardAmount = amount
      this.customRewardAmount = ''
    },

    selectCustomReward() {
      this.isCustomReward = true
    },

    onCustomRewardInput() {
      const val = this.customRewardAmount.trim()
      if (!val) {
        this.isCustomReward = false
        return
      }
      const num = Number(val)
      if (num > 0) {
        this.isCustomReward = true
        this.rewardAmount = num
      }
    },

    getActualRewardAmount() {
      if (this.isCustomReward && this.customRewardAmount.trim()) {
        return Number(this.customRewardAmount) || 0
      }
      return this.rewardAmount
    },

    async getRewarders() {
      try {
        const res = await request('post.php', {
          action: 'get_rewarders',
          post_id: this.postId
        })
        if (this.isSuccessRes(res)) {
          this.rewarders = res.data || []
        }
      } catch (e) {
      }
    },

    async handleBuyPost() {
      if (!this.userInfo) { uni.navigateTo({ url: '/pages/login/login' }); return; }
      if (this.unlocking) return;
      this.buyPayPwd = '';
      this.showPayModal = true;
    },

    async doBuyPost() {
      if (!this.buyPayPwd.trim()) {
        uni.showToast({ title: '请输入支付密码', icon: 'none' });
        return;
      }
      this.showPayModal = false;
      this.unlocking = true;
      try {
        const res = await request('post.php', { action: 'buy_post', post_id: this.postInfo.id, pay_password: this.buyPayPwd });
        if (res.code === 0) {
          this.isUnlocked = true;
          uni.showToast({ title: '解锁成功', icon: 'success' });
        } else if (res.code === -4) {
          this.showPayModal = false;
          this.pwdNotSetConfirmVisible = true;
        } else {
          uni.showToast({ title: res.msg || '购买失败', icon: 'none', duration: 2000 });
        }
      } catch (e) {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        this.unlocking = false;
      }
    },

    focusCommentInput() {
      this.commentFocus = true;
    },

    onPwdNotSetConfirm() {
      this.pwdNotSetConfirmVisible = false;
      uni.navigateTo({ url: '/pages/user/pay-password' });
    },

    onPwdNotSetCancel() {
      this.pwdNotSetConfirmVisible = false;
    },

    async handleFollowAuthor() {
      if (!this.postInfo || !this.postInfo.user_id) return

      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      if (this.followActionLock || this.isOwner) return

      this.followActionLock = true

      const old = this.isFollowingAuthor
      const next = !old

      this.isFollowingAuthor = next

      try {
        let res
        try {
          res = await request('user.php', {
            action: 'toggleFollow',
            userId: this.getCurrentUserId(),
            targetId: this.postInfo.user_id,
            targetUserId: this.postInfo.user_id
          }, 'POST')
        } catch (e1) {
          res = await request('user.php', {
            action: next ? 'follow' : 'unfollow',
            userId: this.getCurrentUserId(),
            targetId: this.postInfo.user_id,
            targetUserId: this.postInfo.user_id
          }, 'POST')
        }

        if (!this.isSuccessRes(res)) {
          this.isFollowingAuthor = old
          this.showToast(this.getResMsg(res, '操作失败'))
          return
        }

        const data = res.data || {}

        if (typeof data.status !== 'undefined') {
          if (data.status === 'followed') this.isFollowingAuthor = true
          if (data.status === 'unfollowed') this.isFollowingAuthor = false
        } else if (typeof data.isFollowing !== 'undefined') {
          this.isFollowingAuthor = this.parseBoolLike(data.isFollowing)
        } else if (typeof data.is_following !== 'undefined') {
          this.isFollowingAuthor = this.parseBoolLike(data.is_following)
        } else if (typeof data.followed !== 'undefined') {
          this.isFollowingAuthor = this.parseBoolLike(data.followed)
        }

        this.showToast(this.isFollowingAuthor ? '关注成功' : '已取消关注')
      } catch (e) {

        this.isFollowingAuthor = old
        this.showToast('网络异常')
      } finally {
        this.followActionLock = false
      }
    },

    openActionSheet() {
      this.showActionMenu = true
    },

    closeActionSheet() {
      this.showActionMenu = false
    },

    handleEditPost() {
      this.closeActionSheet()

      uni.setStorageSync('editPostData', { postId: this.postId })

      uni.navigateTo({
        url: '/pages/publish/publish'
      })
    },

    handleDeletePostAsk() {
      this.closeActionSheet()

      this.modal = {
        show: true,
        content: '确定要删除这篇帖子吗？删除后不可恢复。',
        type: 'deletePost',
        targetId: this.postId
      }
    },

    async deletePost() {
      if (!this.userInfo) return

      try {
        uni.showLoading({ title: '删除中...' })

        const res = await request('post.php', {
          action: 'deletePost',
          postId: this.postId,
          id: this.postId,
          userId: this.getCurrentUserId()
        }, 'POST')

        if (this.isSuccessRes(res)) {
          this.showToast('删除成功')
          setTimeout(() => {
            this.goBack()
          }, 700)
        } else {
          this.showToast(this.getResMsg(res, '删除失败'))
        }
      } catch (e) {
        this.showToast('网络异常')
      } finally {
        uni.hideLoading()
      }
    },

    handleReportPost() {
      this.closeActionSheet()

      if (!this.userInfo) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      if (this.isOwner) {
        this.showToast('不能举报自己的帖子')
        return
      }

      const postId = this.postId
      const userId = this.postInfo ? this.postInfo.user_id : 0

      uni.navigateTo({
        url: `/pages/user/report?type=post&targetId=${postId}&postId=${postId}&userId=${userId}`
      })
    },

    async handleCopyLink() {
      this.closeActionSheet()

      const link = `${webBaseUrl}/#/pages/post-detail/post-detail?postId=${this.postId}`
      const title = (this.postInfo && this.postInfo.title) ? this.postInfo.title : '这个帖子不错'
      // 从后端获取分享文案模板，替换占位符
      const tpl = await getShareText()
      const shareText = tpl
        .replace(/\{title\}/g, title)
        .replace(/\{link\}/g, link)

      uni.setClipboardData({
        data: shareText,
        success: () => this.showToast('分享帖子文案已复制')
      })
    },

    closeModal() {
      this.modal = {
        show: false,
        content: '',
        type: '',
        targetId: null
      }
    },

    confirmAction() {
      const type = this.modal.type
      const id = this.modal.targetId

      this.closeModal()

      if (type === 'deleteComment') {
        this.deleteComment(id)
      }

      if (type === 'deletePost') {
        this.deletePost()
      }
    },

    goBack() {
      try {
        if (this.videoCtx) this.videoCtx.pause()
      } catch (e) {}

      /* 全屏播放中 → 先退出全屏回详情页 */
      if (this.videoFullscreen) {
        this.videoFullscreen = false
        this.isPlaying = false
        return
      }

      const pages = getCurrentPages()

      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },

    toUserHome() {
      if (!this.postInfo || !this.postInfo.user_id) return
      this.toUserHomeById(this.postInfo.user_id)
    },

    toUserHomeById(userId) {
      if (!userId) return

      uni.navigateTo({
        url: `/pages/user/profile?userId=${userId}`
      })
    },

    goTopicSearch(topicName) {
      if (!topicName) return
      uni.navigateTo({ url: `/pages/dynamic/topic-result?name=${encodeURIComponent(topicName)}` })
    },

    showToast(title) {
      uni.showToast({
        title: title || '提示',
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.detail-page-root {
  min-height: 100vh;
  background: #fff;
  color: #222;
  overflow-x: hidden;
}

.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.page-loading {
  position: fixed;
  left: 50%;
  top: 48rpx;
  transform: translateX(-50%);
  z-index: 2000;
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.is-video-page {
  background: #000;
  min-height: 100vh;
  overflow: hidden;
}

.video-detail-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
  /* 必须盖住详情页导航栏(100)/底部输入栏(120), 否则全屏被压成黑屏 */
  z-index: 2000;
}

.xhs-video-player {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  width: 100vw;
  height: 100vh;
  background: #000;
}
/* #ifdef APP-PLUS */
/* App端: 视频全屏; 操作栏已用 cover-view 覆盖在视频上(cover-view 可盖住原生 video) */
.xhs-video-player {
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
}
/* #endif */

.video-top-gradient {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 5;
  width: 100%;
  height: 260rpx;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0));
  pointer-events: none;
}

.video-bottom-gradient {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 5;
  width: 100%;
  height: 520rpx;
  background: linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0));
  pointer-events: none;
}

.video-top-safe {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 30;
  width: 100%;
  pointer-events: none;
}

.video-top-bar {
  position: relative;
  width: 100%;
}

.video-top-btn {
  position: absolute;
  top: 10rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.video-back-btn {
  left: 24rpx;
}

.video-more-btn {
  right: 24rpx;
}

.video-top-btn-text {
  color: #fff;
  font-size: 52rpx;
  line-height: 48rpx;
  margin-top: -4rpx;
}

/* .video-more-text removed — replaced with CSS dots */

.video-center-play-layer {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-center-play-btn {
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 3rpx solid rgba(255,255,255,0.25);
}

.video-play-svg-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.video-play-triangle {
  width: 0;
  height: 0;
  border-top: 24rpx solid transparent;
  border-bottom: 24rpx solid transparent;
  border-left: 42rpx solid #ffffff;
  margin-left: 10rpx;
  filter: drop-shadow(0 2rpx 6rpx rgba(0,0,0,0.35));
}

.video-side-actions {
  position: absolute;
  right: 18rpx;
  bottom: 176rpx;
  z-index: 25;
  width: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-side-avatar-outer {
  position: relative;
  width: 84rpx;
  height: 84rpx;
}

.video-side-avatar-wrap {
  position: relative;
  width: 84rpx;
  height: 84rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: rgba(255,255,255,0.2);
  border: 3rpx solid rgba(255,255,255,0.85);
}

.video-side-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 999rpx;
  display: block;
}

.video-side-avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 168%;
  height: 168%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.video-follow-plus {
  margin-top: -16rpx;
  margin-bottom: 12rpx;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #ff2442;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.video-follow-plus-text {
  color: #fff;
  font-size: 32rpx;
  line-height: 30rpx;
  font-weight: 700;
}

.video-action-item {
  width: 100rpx;
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-action-icon {
  width: 52rpx;
  height: 52rpx;
}

.video-sound-icon {
  font-size: 42rpx;
  line-height: 1;
}

/* .video-side-more removed — replaced with CSS dots */

.video-action-text {
  margin-top: 8rpx;
  color: #fff;
  font-size: 22rpx;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.55);
  text-align: center;
}

.video-info-panel {
  position: absolute;
  left: 24rpx;
  right: 148rpx;
  bottom: 126rpx;
  z-index: 20;
  color: #fff;
}

.video-author-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 18rpx;
  width: 100%;
}

.video-bottom-avatar-box {
  position: relative;
  width: 66rpx;
  height: 66rpx;
  flex-shrink: 0;
  overflow: visible;
}

.video-bottom-avatar {
  width: 66rpx;
  height: 66rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(255,255,255,0.75);
  flex-shrink: 0;
}

.video-bottom-avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 168%;
  height: 168%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.video-author-meta {
  margin-left: 14rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  max-width: 100%;
}

.author-name-row.on-dark {
  gap: 10rpx;
}

.author-name-row.compact {
  gap: 6rpx;
}

.author-name-row.full {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
  flex-wrap: wrap;
}

.author-title-row.inline {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.author-badges-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 6rpx;
}

.author-name-badge {
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}

.author-name-badge.small {
  width: 16rpx;
  height: 16rpx;
  transform: scale(2.7);
  margin-right: 16rpx;
}

.author-level-tag {
  flex-shrink: 0;
  height: 34rpx;
  min-width: 80rpx;
  padding: 0 16rpx;
  border-radius: 16rpx;
  margin-left: 8rpx;
  background: transparent;
  border: 1rpx solid rgba(0,0,0,0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.author-level-tag.dark {
  background: transparent;
  border-color: rgba(0,0,0,0.3);
}

.author-level-tag.compact {
  height: 24rpx;
  min-width: 58rpx;
  padding: 0 10rpx;
}

.author-level-text {
  font-size: 16rpx;
  color: #000;
  font-weight: 700;
  letter-spacing: 0.2rpx;
  line-height: 1;
}

.author-level-text.dark {
  color: #000;
}

.author-level-text.compact {
  font-size: 13rpx;
}

.author-title-row {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
  margin-left: 8rpx;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  border: 1rpx solid #eee;
  background: #f5f5f5;
  max-width: 260rpx;
}

.author-title-row.dark {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.18);
}

.author-title-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.author-title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 20rpx;
  line-height: 1.2;
  color: #333;
  font-weight: 600;
}

.author-title-text.dark {
  color: rgba(255, 255, 255, 0.92);
}

.video-author-name {
  color: #fff;
  font-size: 29rpx;
  font-weight: 700;
  max-width: 260rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-author-time {
  margin-top: 5rpx;
  color: rgba(255,255,255,0.72);
  font-size: 21rpx;
}

.video-title {
  display: block;
  color: #fff;
  font-size: 34rpx;
  line-height: 1.45;
  font-weight: 700;
  word-break: break-word;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.55);
}

.fancy-pink {
  color: #ff2442 !important;
  font-weight: 900 !important;
}
.vip-red-text,
.comment-name.vip-red-text,
.sub-name.vip-red-text,
.comment-text.vip-red-text {
  color: #ff2442 !important;
  font-weight: 700 !important;
}
.video-desc {
  display: block;
  margin-top: 10rpx;
  color: rgba(255,255,255,0.92);
  font-size: 26rpx;
  line-height: 1.6;
  word-break: break-word;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.5);
}

.video-topic-row {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
}

.video-co-creator-row {
  margin: -4rpx 0 16rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10rpx;
}

.video-co-creator-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.68);
}

.video-co-creator-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 14rpx 8rpx 8rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.14);
}

.video-co-creator-avatar {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
}

.video-co-creator-name {
  font-size: 22rpx;
  color: #fff;
}

.video-topic {
  color: #9bdcff;
  font-size: 24rpx;
  margin-right: 14rpx;
  margin-bottom: 8rpx;
}

.video-mask-tip {
  background: rgba(0,0,0,0.35);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
}

.video-mask-tip text {
  color: #fff;
  font-size: 28rpx;
}

.video-comment-entry {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 32rpx;
  z-index: 22;
}

.video-comment-pill {
  height: 70rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.14);
  display: flex;
  align-items: center;
  padding: 0 28rpx;
}

.video-comment-placeholder {
  color: rgba(255,255,255,0.82);
  font-size: 25rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 普通详情页 */

.normal-detail-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 140rpx;
}

/* 顶部导航白底常驻(小红书样式)，而不是随滚动才显示 */
.custom-nav-bar {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  width: 100%;
  /* 必须 border-box: 元素同时设了 height:navTotalHeight + paddingTop:statusBarHeight,
     而 navTotalHeight 本身已包含状态栏高度. 若按 content-box 计算, 导航栏实际高度会多出
     一个状态栏高度, 白底会把正文顶部盖住(无图帖子正好盖住「共创」那一行, 看起来只显示一半) */
  box-sizing: border-box;
  background: #fff;
  transition: background 0.2s ease;
}

.custom-nav-bar.nav-glass {
  background: #fff;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
}

/* ==================== 小红书风格详情页 ==================== */

/* 顶部导航: 返回 + 作者头像昵称 + 关注 + 更多 */
.xhs-nav-content {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}

.xhs-nav-back {
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.xhs-nav-back-icon {
  font-size: 52rpx;
  line-height: 48rpx;
  color: #222;
  margin-top: -4rpx;
}

.xhs-nav-user {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  margin-left: 6rpx;
}

.xhs-nav-avatar-box {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  margin-right: 14rpx;
  flex-shrink: 0;
  overflow: visible;
}

.xhs-nav-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  overflow: hidden;
  background: #eee;
}

.xhs-nav-avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 168%;
  height: 168%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.xhs-nav-name {
  max-width: 260rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xhs-nav-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.xhs-nav-follow {
  height: 56rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  border: 2rpx solid #ff2442;
  display: flex;
  align-items: center;
  justify-content: center;
}

.xhs-nav-follow text {
  font-size: 26rpx;
  color: #ff2442;
  font-weight: 600;
}

.xhs-nav-follow.followed {
  border-color: #e5e6eb;
}

.xhs-nav-follow.followed text {
  color: #999;
  font-weight: 400;
}

.xhs-nav-more {
  width: 56rpx;
  height: 56rpx;
  margin-left: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 主体: 无左右内边距，媒体满宽出血 */
.xhs-main {
  min-height: 100vh;
}

.xhs-media-box {
  width: 100%;
  background: #f7f8fa;
  overflow: hidden;
}

.xhs-single-image {
  width: 100%;
  display: block;
  background: #f7f8fa;
}

.xhs-swiper-wrap {
  position: relative;
  width: 100%;
}

.xhs-image-swiper {
  width: 100%;
}

.xhs-swiper-image {
  width: 100%;
  height: 100%;
  display: block;
  background: #f7f8fa;
}

.xhs-image-counter {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  height: 44rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.xhs-image-counter text {
  font-size: 24rpx;
  line-height: 1;
  color: #fff;
}

/* 正文区: 左右 32rpx 内边距 */
.xhs-body {
  padding: 26rpx 32rpx 0;
}

.xhs-circle-tag {
  display: inline-block;
  height: 40rpx;
  line-height: 40rpx;
  padding: 0 16rpx;
  margin-bottom: 16rpx;
  border-radius: 8rpx;
  background: #f2f3f5;
  color: #666;
  font-size: 22rpx;
}

.xhs-time-row {
  margin-top: 24rpx;
}

.xhs-time {
  font-size: 24rpx;
  color: #9ca3af;
}

/* 打赏 + 浏览数: 功能保留、视觉弱化 */
.xhs-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f2f3f5;
}

.xhs-stat-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.xhs-reward-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #fff5f5;
  border: 1rpx solid #ffd9df;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.xhs-view-count {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #9ca3af;
}

/* 满宽媒体之后: 这些区块自带左右内边距 */
.post-status-bar,
.masked-box,
.disclaimer-section {
  margin-left: 32rpx;
  margin-right: 32rpx;
}

/* 免责声明弱化: 去掉灰底、字号调小 */
.disclaimer-section {
  background: transparent;
  padding: 24rpx 0;
}

.disclaimer-title {
  font-size: 24rpx;
  font-weight: 400;
  color: #bbb;
}

.disclaimer-text {
  font-size: 22rpx;
  color: #c4c7cc;
}

/* 评论区: 顶部分隔线 + 纯文本列表(去掉气泡和卡片) */
.comment-section {
  margin: 0 32rpx;
  border-top: 1rpx solid #f0f1f4;
  padding: 24rpx 0 40rpx;
}

.comment-title-row {
  padding: 0 0 8rpx;
}

.comment-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #222;
}

.comment-list {
  background: transparent;
  border-radius: 0;
  padding: 0;
}

.comment-item {
  padding: 22rpx 0;
}

.comment-item + .comment-item {
  border-top: none;
}

.comment-bubble {
  margin-top: 8rpx;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
}

.empty-comment {
  background: transparent;
  padding: 40rpx 0;
}

/* 底部操作栏: 说点什么… + 点赞 + 收藏 + 评论 */
.bottom-input-bar {
  background: #fff;
  border-top: 1rpx solid #f0f1f4;
  padding: 14rpx 24rpx calc(env(safe-area-inset-bottom) + 14rpx);
}

.bottom-input {
  flex: 1;
  height: 72rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #f2f3f5;
  padding: 0 28rpx;
  color: #222;
  font-size: 26rpx;
}

.xhs-bar-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.xhs-bar-action {
  display: flex;
  align-items: center;
  margin-left: 26rpx;
}

.xhs-bar-action.disabled {
  opacity: 0.6;
}

.xhs-bar-icon {
  width: 46rpx;
  height: 46rpx;
}

.xhs-bar-count {
  margin-left: 8rpx;
  font-size: 26rpx;
  color: #333;
}

.xhs-bar-count.active {
  color: #ff2442;
}

.comment-disabled-text {
  flex: 1;
  width: auto;
  text-align: left;
  color: #999;
  font-size: 25rpx;
}

.normal-nav-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.normal-nav-btn {
  position: absolute;
  top: 50%;
  width: 60rpx;
  height: 60rpx;
  transform: translateY(-50%);
  border-radius: 50%;
  background: rgba(255,255,255,0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}

.normal-nav-btn.left {
  left: 20rpx;
}

.normal-nav-btn.right {
  right: 20rpx;
}

.normal-back-text {
  font-size: 52rpx;
  line-height: 48rpx;
  color: #222;
  margin-top: -4rpx;
}

/* .normal-more-text removed — replaced with CSS dots */

.normal-nav-user {
  display: flex;
  align-items: center;
  max-width: 380rpx;
  transition: opacity 0.2s ease;
}

.normal-nav-avatar-box {
  position: relative;
  width: 52rpx;
  height: 52rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
  overflow: visible;
}

.normal-nav-avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  overflow: hidden;
  background: #eee;
}

.normal-nav-avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 168%;
  height: 168%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.normal-nav-meta {
  min-width: 0;
  display: flex;
  align-items: center;
}

.normal-nav-name {
  max-width: 200rpx;
  font-size: 26rpx;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.normal-main {
  padding-left: 24rpx;
  padding-right: 24rpx;
}

.post-status-bar {
  margin-bottom: 18rpx;
  border-radius: 18rpx;
  padding: 18rpx 20rpx;
}

.post-status-bar text {
  font-size: 24rpx;
  color: #555;
}

.status-red {
  background: rgba(255, 77, 109, 0.12);
}

.status-orange {
  background: rgba(255, 159, 67, 0.16);
}

.status-gray {
  background: rgba(100, 116, 139, 0.12);
}

.post-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 26rpx 24rpx;
}

.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-author {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
}

.normal-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #eee;
  overflow: hidden;
}

.normal-avatar-box {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
}

.normal-avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 168%;
  height: 168%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.post-author-info {
  margin-left: 16rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.post-author-name {
  max-width: 240rpx;
  color: #222;
  font-size: 30rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-time {
  margin-top: 8rpx;
  color: #999;
  font-size: 22rpx;
}

.circle-name {
  flex-shrink: 0;
  margin-left: 16rpx;
  height: 46rpx;
  line-height: 46rpx;
  border-radius: 999rpx;
  padding: 0 18rpx;
  background: #f1f2f4;
  color: #666;
  font-size: 22rpx;
}

.co-creator-row {
  margin-top: 18rpx;
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
}

.co-creator-label {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #8f959e;
  line-height: 48rpx;
}

.co-creator-list {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.co-creator-chip {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 16rpx 8rpx 10rpx;
  border-radius: 999rpx;
  background: #f5f7fb;
}

.co-creator-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #eee;
}

.co-creator-name {
  font-size: 23rpx;
  color: #4b5563;
}

.masked-box {
  margin-top: 28rpx;
  padding: 70rpx 30rpx;
  border-radius: 24rpx;
  background: #f7f8fa;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.masked-title {
  color: #222;
  font-size: 32rpx;
  font-weight: 700;
}

.masked-sub {
  margin-top: 12rpx;
  color: #999;
  font-size: 24rpx;
}

/* ── 付费/评论可见解锁 ── */
.unlock-banner { position: relative; margin: 20rpx 0; border-radius: 20rpx; overflow: hidden; min-height: 200rpx; display: flex; align-items: center; justify-content: center; }
.unlock-preview-mask { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.95)); z-index: 1; }
.paid-banner { background: linear-gradient(135deg, #fff5f5, #fef2f2); border: 1rpx solid #fecaca; }
.comment-banner { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1rpx solid #bae6fd; }
.unlock-card { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; padding: 40rpx 28rpx; gap: 12rpx; }
.unlock-icon { font-size: 56rpx; }
.unlock-title { font-size: 30rpx; font-weight: 900; color: #111827; }
.unlock-desc { font-size: 24rpx; color: #6b7280; text-align: center; }
.unlock-price { color: #ff2442; font-weight: 900; font-size: 28rpx; }
.unlock-btn { margin-top: 8rpx; padding: 18rpx 56rpx; background: linear-gradient(135deg, #ff2442, #ef4444); border-radius: 40rpx; box-shadow: 0 6rpx 20rpx rgba(255,36,66,0.3); }
.comment-banner .unlock-btn { background: linear-gradient(135deg, #0ea5e9, #3b82f6); box-shadow: 0 6rpx 20rpx rgba(14,165,233,0.3); }
.unlock-btn text { font-size: 28rpx; font-weight: 900; color: #fff; }
.unlock-btn.loading { opacity: 0.6; }

/* VIP免评论查看特权提示 */
.vip-privilege-card {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1rpx solid #fcd34d;
  padding: 24rpx 28rpx;
}
.vip-privilege-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.vip-privilege-icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}
.vip-privilege-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #92400e;
  flex: 1;
}

.post-body {
  margin-top: 26rpx;
}

/* 底部解锁卡片 */
.unlock-card-bottom {
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.unlock-card-bottom.paid-card {
  background: linear-gradient(135deg, #fff5f5, #fef2f2);
  border: 1rpx solid #fecaca;
}
.unlock-card-bottom.comment-card {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 1rpx solid #bae6fd;
}
.unlock-card-bottom .unlock-title {
  font-size: 28rpx;
  font-weight: 900;
  color: #111827;
}
.unlock-card-bottom .unlock-desc {
  font-size: 24rpx;
  color: #6b7280;
  text-align: center;
}
.unlock-card-bottom .unlock-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #ff2442, #ef4444);
  border-radius: 36rpx;
  box-shadow: 0 6rpx 16rpx rgba(255,36,66,0.25);
}
.unlock-card-bottom.comment-card .unlock-btn {
  background: linear-gradient(135deg, #0ea5e9, #3b82f6);
  box-shadow: 0 6rpx 16rpx rgba(14,165,233,0.25);
}
.unlock-card-bottom .unlock-btn text {
  font-size: 26rpx;
  font-weight: 900;
  color: #fff;
}

/* 内容加密提示 */
.content-encrypted-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
  margin-top: 20rpx;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 24rpx;
  border: 2rpx dashed #c7d2fe;
}
.content-encrypted-icon {
  font-size: 64rpx;
  margin-bottom: 20rpx;
}
.content-encrypted-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12rpx;
}
.content-encrypted-desc {
  font-size: 26rpx;
  color: #64748b;
  margin-bottom: 30rpx;
}
.content-encrypted-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  padding: 18rpx 60rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
}

/* 锁定内容预览 */
.content-lock-preview {
  position: relative;
  max-height: 200rpx;
  overflow: hidden;
  margin-top: 18rpx;
}
.content-lock-fade {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 130rpx;
  background: linear-gradient(to bottom, transparent, #fff);
  pointer-events: none;
}

.post-title {
  display: block;
  color: #111;
  font-size: 38rpx;
  line-height: 1.5;
  font-weight: 700;
  word-break: break-word;
}

.post-content-text {
  margin-top: 18rpx;
  color: #333;
  font-size: 30rpx;
  line-height: 1.9;
  word-break: break-word;
  white-space: pre-wrap;
}

.rich-text-normal,
.rich-text-link,
.rich-text-mention {
  font-size: 30rpx;
  line-height: 1.9;
}

.rich-text-normal {
  color: #333;
}

.rich-text-link {
  color: #3b82f6;
}

.rich-text-mention {
  color: #7c3aed;
}

.rich-text-topic {
  color: #2b6cb0;
}

.normal-video-box {
  margin-top: 24rpx;
}

.normal-video {
  width: 100%;
  border-radius: 24rpx;
  background: #000;
  overflow: hidden;
}

.normal-video-placeholder {
  width: 100%;
  border-radius: 24rpx;
  background: #000;
  min-height: 450rpx;
}

.image-grid {
  margin-top: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.image-grid-item {
  width: calc((100% - 24rpx) / 3);
  aspect-ratio: 1 / 1;
  border-radius: 20rpx;
  overflow: hidden;
  background: #f1f2f4;
}

/* 1张图：全宽，高度自适应 */
.image-grid.grid-1 .image-grid-item {
  width: 100%;
  aspect-ratio: auto;
}

.image-grid.grid-1 .post-image {
  width: 100%;
  height: auto;
}

/* 2张图：一行2张 */
.image-grid.grid-2 .image-grid-item {
  width: calc((100% - 12rpx) / 2);
}

.post-image {
  width: 100%;
  height: 100%;
  display: block;
}

.shared-product-card,
.shared-link-card {
  margin-top: 24rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: #f8fafc;
  border: 1rpx solid #edf0f4;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.shared-product-img {
  width: 108rpx;
  height: 108rpx;
  border-radius: 16rpx;
  background: #eef0f3;
  flex-shrink: 0;
}

.shared-link-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  background: #eff6ff;
  color: #2563eb;
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
  line-height: 88rpx;
  flex-shrink: 0;
}

.shared-product-info {
  flex: 1;
  min-width: 0;
}

.shared-product-label {
  display: block;
  font-size: 22rpx;
  color: #8a8f99;
  margin-bottom: 6rpx;
}

.shared-product-title {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shared-product-price {
  display: block;
  margin-top: 8rpx;
  color: #ff2e4d;
  font-size: 26rpx;
  font-weight: 800;
}

.shared-link-url {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shared-product-arrow {
  color: #a3a8b1;
  font-size: 42rpx;
}

.topic-row {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
}

.topic-item {
  color: #3b82f6;
  font-size: 24rpx;
  margin-right: 16rpx;
  margin-bottom: 8rpx;
}

.post-actions {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f1f4;
  display: flex;
  align-items: center;
}

.post-action {
  margin-right: 52rpx;
  display: flex;
  align-items: center;
}

.post-action-icon {
  width: 42rpx;
  height: 42rpx;
  margin-right: 10rpx;
}

.post-action text {
  color: #555;
  font-size: 26rpx;
}

.post-action text.active {
  color: #ff2442;
}


.comment-section {
  margin-top: 20rpx;
  padding-bottom: 40rpx;
}

.disclaimer-section {
  margin-top: 40rpx;
  padding: 30rpx 24rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
}

.disclaimer-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.disclaimer-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #666;
  text-align: center;
}

.disclaimer-text {
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
}

.comment-title-row {
  padding: 10rpx 4rpx 18rpx;
}

.comment-title {
  color: #222;
  font-size: 30rpx;
  font-weight: 700;
}

.comment-loading,
.empty-comment {
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 30rpx;
  text-align: center;
}

.comment-loading text,
.empty-comment text {
  color: #999;
  font-size: 25rpx;
}

.comment-list {
  background: #fff;
  border-radius: 24rpx;
  padding: 6rpx 20rpx;
  contain: content;
}

.comment-item {
  display: flex;
  padding: 24rpx 0;
  contain: layout style;
}

.comment-item + .comment-item {
  border-top: 1rpx solid #f0f1f4;
}

.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #eee;
}

.comment-avatar-wrapper {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}

.comment-main {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}

.comment-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-name-line {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.comment-name {
  color: #555;
  font-size: 26rpx;
  font-weight: 600;
  max-width: 260rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comment-name-line .comment-name.vip-red-text,
.comment-list .comment-name.vip-red-text {
  color: #ff2442 !important;
  font-weight: 700 !important;
}

.badge {
  margin-left: 8rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  line-height: 1.5;
}

.badge.author {
  color: #2563eb;
  background: rgba(59,130,246,0.12);
}

.badge.pinned {
  color: #a16207;
  background: rgba(250,204,21,0.18);
}

.badge.banned {
  color: #e11d48;
  background: rgba(255, 77, 109, 0.12);
}

.badge.pending {
  color: #d97706;
  background: rgba(255, 159, 67, 0.14);
}

.pin-btn {
  margin-left: 12rpx;
  color: #3b82f6;
  font-size: 22rpx;
  flex-shrink: 0;
}

.comment-bubble {
  display: inline-block;
  max-width: 100%;
  margin-top: 10rpx;
  border-radius: 18rpx;
  background: #f6f7fb;
  padding: 16rpx 18rpx;
  word-break: break-word;
  white-space: pre-wrap;
}

.comment-text,
.comment-link,
.comment-mention {
  font-size: 28rpx;
  line-height: 1.8;
}

.comment-text {
  color: #222;
}
.comment-bubble .comment-text.vip-red-text {
  color: #ff2442 !important;
  font-weight: 700 !important;
}

.comment-link {
  color: #3b82f6;
}

.comment-mention {
  color: #7c3aed;
}

.comment-actions {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.comment-time,
.comment-reply,
.comment-delete {
  color: #999;
  font-size: 22rpx;
  margin-right: 24rpx;
}

.comment-delete {
  color: #ff2442;
}

.sub-comment-list {
  margin-top: 16rpx;
  padding-left: 12rpx;
  border-left: 4rpx solid #f1f2f4;
}

.sub-comment-item {
  padding: 14rpx 0;
  contain: layout style;
}

.sub-comment-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.sub-name {
  color: #555;
  font-size: 24rpx;
  font-weight: 600;
}
.sub-comment-head .sub-name.vip-red-text {
  color: #ff2442 !important;
  font-weight: 700 !important;
}

.reply-to {
  color: #999;
  font-size: 22rpx;
  margin: 0 8rpx;
}

.sub-comment-content {
  margin-top: 8rpx;
  border-radius: 16rpx;
  background: #f7f8fa;
  padding: 14rpx 16rpx;
  word-break: break-word;
  white-space: pre-wrap;
}
.sub-comment-content .comment-text.vip-red-text {
  color: #ff2442 !important;
  font-weight: 700 !important;
}

.sub-actions {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
}

.sub-actions text {
  color: #999;
  font-size: 21rpx;
  margin-right: 22rpx;
}

.reply-toggle {
  padding: 12rpx 0 4rpx;
}

.reply-toggle text {
  color: #3b82f6;
  font-size: 23rpx;
}



.bottom-input-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  background: rgba(255,255,255,0.98);
  border-top: 1rpx solid #edf0f3;
  padding: 16rpx 20rpx calc(env(safe-area-inset-bottom) + 16rpx);
  display: flex;
  align-items: center;
}

.bottom-input {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  background: #f2f3f5;
  padding: 0 24rpx;
  color: #222;
  font-size: 26rpx;
}




/* 评论输入框右侧的发送按钮（有内容时才出现，和输入框同高） */
.bottom-send {
  flex-shrink: 0;
  margin-left: 14rpx;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #ff2442;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
}

.drawer-open {
  overflow: hidden;
}

.drawer-mask,
.mention-mask,
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
}

.drawer-mask {
  z-index: 3000;
  display: flex;
  align-items: flex-end;
}

.comment-drawer {
  width: 100%;
  height: 76vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-handle {
  width: 90rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  margin: 14rpx auto 8rpx;
}

.drawer-header {
  padding: 18rpx 24rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title {
  color: #222;
  font-size: 30rpx;
  font-weight: 700;
}

.drawer-close {
  color: #666;
  font-size: 24rpx;
}

.drawer-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 20rpx;
}

.drawer-comment-list {
  border-radius: 0;
  padding: 0;
  background: #fff;
  contain: content;
}

.drawer-input-bar {
  padding: 16rpx 20rpx calc(env(safe-area-inset-bottom) + 16rpx);
  border-top: 1rpx solid #eef0f3;
  background: #fff;
  display: flex;
  align-items: center;
}

.drawer-input {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  background: #f2f3f5;
  padding: 0 24rpx;
  color: #222;
  font-size: 26rpx;
}

.drawer-send {
  margin-left: 16rpx;
  width: 104rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-send text {
  color: #fff;
  font-size: 26rpx;
}

.mention-mask {
  z-index: 4000;
  display: flex;
  align-items: flex-end;
}

.mention-panel {
  width: 100%;
  height: 70vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mention-header {
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mention-title {
  color: #222;
  font-size: 30rpx;
  font-weight: 700;
}

.mention-close {
  color: #666;
  font-size: 24rpx;
}

.mention-search {
  padding: 0 24rpx 18rpx;
  display: flex;
  align-items: center;
}

.mention-input {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  background: #f2f3f5;
  padding: 0 24rpx;
  color: #222;
  font-size: 26rpx;
}

.mention-search-btn {
  margin-left: 14rpx;
  width: 100rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mention-search-btn text {
  color: #fff;
  font-size: 24rpx;
}

.mention-list {
  flex: 1;
  min-height: 0;
  padding: 0 24rpx 24rpx;
}

.mention-item {
  height: 88rpx;
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f1f2f4;
}

.mention-avatar {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.mention-name {
  color: #222;
  font-size: 26rpx;
}

.mention-empty {
  padding: 80rpx 0;
  text-align: center;
}

.mention-empty text {
  color: #999;
  font-size: 24rpx;
}

.modal-mask {
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-box {
  width: 620rpx;
  max-width: calc(100vw - 80rpx);
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
}

.modal-title {
  padding: 32rpx 24rpx 12rpx;
  text-align: center;
  color: #222;
  font-size: 32rpx;
  font-weight: 700;
}

.modal-content {
  padding: 10rpx 36rpx 32rpx;
  text-align: center;
  color: #555;
  font-size: 27rpx;
  line-height: 1.7;
}

.modal-actions {
  display: flex;
  border-top: 1rpx solid #eef0f3;
}

.modal-btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-btn text {
  font-size: 28rpx;
}

.modal-btn.cancel text {
  color: #666;
}

.modal-btn.confirm {
  border-left: 1rpx solid #eef0f3;
}

.modal-btn.confirm text {
  color: #111827;
  font-weight: 700;
}

/* ================= 操作菜单 ================= */

.action-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 6000;
  background: rgba(0,0,0,0);
  pointer-events: none;
  transition: background 0.2s ease;
}

.action-sheet-mask.show {
  background: rgba(0,0,0,0.36);
  pointer-events: auto;
}

.action-sheet-panel {
  position: absolute;
  left: 20rpx;
  right: 20rpx;
  bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  transform: translateY(120%);
  transition: transform 0.22s ease;
}

.action-sheet-mask.show .action-sheet-panel {
  transform: translateY(0);
}

.sheet-item {
  height: 96rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid #f1f2f4;
}

.sheet-item:first-child {
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
}

.sheet-item text {
  color: #222;
  font-size: 28rpx;
}

.sheet-item.danger text {
  color: #ff2442;
}

.sheet-item.cancel {
  border-radius: 24rpx;
  border-bottom: none;
}

.sheet-item.cancel text {
  font-weight: 700;
}

.sheet-gap {
  height: 14rpx;
}

@media screen and (max-width: 375px) {
  .video-info-panel {
    right: 136rpx;
  }

  .video-title {
    font-size: 32rpx;
  }

  .video-desc {
    font-size: 24rpx;
  }

  .post-title {
    font-size: 35rpx;
  }

  .post-content-text,
  .rich-text-normal,
  .rich-text-link,
  .rich-text-mention {
    font-size: 28rpx;
  }
}

/* CSS dots for action sheet trigger — avoids font rendering diff across Android */
.more-dots { display: flex; flex-direction: row; align-items: center; gap: 6rpx; }
.more-dot { width: 9rpx; height: 9rpx; border-radius: 50%; flex-shrink: 0; }
.white-dots .more-dot { background: #fff; }
.dark-dots .more-dot { background: #222; }

/* 沉浸式视频锁定遮罩 */
.video-lock-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: rgba(0,0,0,0.68);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  pointer-events: none;
}

/* 沉浸式视频锁定提示 */
.video-lock-tip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
  background: rgba(0,0,0,0.38);
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
}
.video-lock-title {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}
.video-lock-desc {
  color: rgba(255,255,255,0.82);
  font-size: 24rpx;
}
.video-unlock-btn {
  margin-top: 10rpx;
  padding: 14rpx 40rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #ff2442, #ef4444);
}
.video-unlock-btn text {
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

/* 普通详情页浏览量 */
.post-view-count {
  margin-left: auto;
  margin-right: 0;
}
.post-view-count text {
  color: #bbb;
  font-size: 23rpx;
}

/* 打赏容器 */
.reward-container {
  display: flex;
  align-items: center;
  gap: -8rpx;
}

/* 打赏按钮 */
.reward-action {
  position: relative;
}
.reward-icon-wrapper {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 140, 0, 0.3);
}
.reward-icon-text {
  font-size: 24rpx;
  font-weight: 800;
  color: #fff;
}

/* 打赏者列表 */
.rewarders-section {
  margin-top: 0;
  padding-left: 0;
}
.rewarders-list {
  display: flex;
  align-items: center;
  gap: 2rpx;
}
.rewarder-avatar-wrapper {
  position: relative;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  border: 3rpx solid #ffd700;
  overflow: hidden;
}
.rewarder-avatar {
  width: 100%;
  height: 100%;
}
.rewarder-amount-tag {
  position: absolute;
  bottom: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  padding: 2rpx 8rpx;
  border-radius: 10rpx;
  white-space: nowrap;
}
.rewarders-more {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #e5e7eb;
}
.rewarders-more-text {
  font-size: 20rpx;
  color: #9ca3af;
  font-weight: 600;
}

/* Pay password modal */
.pay-pwd-mask { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.pay-pwd-box { width: 580rpx; background: #fff; border-radius: 28rpx; padding: 44rpx 36rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.pay-pwd-title { font-size: 32rpx; font-weight: 900; color: #111827; }
.pay-pwd-desc { font-size: 26rpx; color: #6b7280; text-align: center; }
.pay-pwd-input { width: 100%; height: 88rpx; border-radius: 16rpx; background: #f8f9fb; padding: 0 24rpx; font-size: 32rpx; font-weight: 700; color: #111827; text-align: center; letter-spacing: 8rpx; }
.pay-pwd-ph { color: #d1d5db; font-size: 26rpx; letter-spacing: 0; }
.pay-pwd-btns { display: flex; width: 100%; gap: 16rpx; margin-top: 8rpx; }
.pay-pwd-cancel { flex: 1; height: 80rpx; border-radius: 20rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.pay-pwd-cancel text { font-size: 28rpx; color: #6b7280; font-weight: 700; }
.pay-pwd-confirm { flex: 1; height: 80rpx; border-radius: 20rpx; background: linear-gradient(135deg, #ff2442, #ef4444); display: flex; align-items: center; justify-content: center; }
.pay-pwd-confirm text { font-size: 28rpx; color: #fff; font-weight: 800; }

/* 打赏弹窗样式 */
.reward-mask { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.reward-box { width: 580rpx; background: #fff; border-radius: 28rpx; padding: 44rpx 36rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.reward-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.reward-title-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 8rpx;
}
.reward-title { font-size: 34rpx; font-weight: 900; color: #111827; }
.reward-author { font-size: 26rpx; color: #6b7280; }

/* 打赏者列表弹窗样式 */
.rewarders-modal-box { width: 600rpx; max-height: 70vh; background: #fff; border-radius: 28rpx; display: flex; flex-direction: column; overflow: hidden; }
.rewarders-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 36rpx; border-bottom: 1rpx solid #f3f4f6; }
.rewarders-modal-title { font-size: 32rpx; font-weight: 800; color: #111827; }
.rewarders-modal-close { width: 56rpx; height: 56rpx; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.close-icon { font-size: 40rpx; color: #6b7280; line-height: 1; }
.rewarders-modal-list { flex: 1; padding: 16rpx 0; max-height: 60vh; }
.rewarder-item { display: flex; align-items: center; padding: 20rpx 36rpx; gap: 20rpx; }
.rewarder-item:active { background: #f9fafb; }
.rewarder-item-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; border: 2rpx solid #e5e7eb; }
.rewarder-item-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.rewarder-item-name { font-size: 28rpx; font-weight: 700; color: #111827; }
.rewarder-item-amount { font-size: 24rpx; color: #9ca3af; }
.reward-amount-grid { display: flex; flex-wrap: wrap; gap: 20rpx; width: 100%; justify-content: center; }
.reward-amount-chip { width: 220rpx; height: 80rpx; border-radius: 16rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border: 3rpx solid transparent; }
.reward-amount-chip.active { background: #fff0f0; border-color: #ff2442; }
.reward-amount-chip text { font-size: 28rpx; color: #374151; font-weight: 700; }
.reward-amount-chip.active text { color: #ff2442; }
.reward-amount-chip.custom-chip { border: 3rpx dashed #d1d5db; }
.reward-amount-chip.custom-chip.active { border-style: solid; border-color: #ff2442; background: #fff0f0; }
.custom-reward-input { width: 100%; height: 100%; text-align: center; font-size: 28rpx; font-weight: 700; color: #374151; }
.reward-chip-ph { color: #9ca3af; font-weight: 400; }
.reward-balance { font-size: 24rpx; color: #9ca3af; }
.reward-btns { display: flex; width: 100%; gap: 16rpx; margin-top: 12rpx; }
.reward-cancel { flex: 1; height: 80rpx; border-radius: 20rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.reward-cancel text { font-size: 28rpx; color: #6b7280; font-weight: 700; }
.reward-confirm { flex: 1; height: 80rpx; border-radius: 20rpx; background: linear-gradient(135deg, #ff2442, #ef4444); display: flex; align-items: center; justify-content: center; }
.reward-confirm.disabled { opacity: 0.5; }
.reward-confirm text { font-size: 28rpx; color: #fff; font-weight: 800; }

/* 打赏图标 */
.reward-icon { font-size: 40rpx; }
.video-reward-icon { width: 48rpx; height: 48rpx; }

/* 抖音视频卡片 */
.douyin-video-card {
  margin-top: 24rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background: #000;
  position: relative;
}

.douyin-card-video {
  width: 100%;
  height: 420rpx;
}

.douyin-card-info {
  padding: 20rpx;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.8));
}

.douyin-card-title {
  display: block;
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.douyin-card-author {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
  gap: 10rpx;
}

.douyin-author-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  background: linear-gradient(135deg, #ff2c55, #ff0050);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  text-align: center;
  line-height: 36rpx;
}

.douyin-author-name {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.douyin-video-poster {
  width: 100%;
  height: 420rpx;
}

.douyin-play-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 420rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.play-btn {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.play-icon {
  color: #fff;
  font-size: 0;
  width: 0;
  height: 0;
  border-top: 18rpx solid transparent;
  border-bottom: 18rpx solid transparent;
  border-left: 28rpx solid #fff;
  border-radius: 4rpx;
  margin-left: 6rpx;
}

.play-tip {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.douyin-video-loading {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 420rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}

.douyin-video-error {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 420rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
}

.error-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #ff4444;
  font-size: 40rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #fff;
}

.error-hint {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}
</style>

<style lang="scss">
/* ================= App端 cover-view 覆盖层样式(必须非 scoped: cover-view 元素不带 data-v 属性) ================= */
.cv-top-safe { position: absolute; left: 0; top: 0; width: 100%; z-index: 30; }
.cv-top-bar { position: relative; width: 100%; }
.cv-top-btn { position: absolute; top: 10rpx; width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(0,0,0,0.38); display: flex; align-items: center; justify-content: center; }
.cv-back-btn { left: 24rpx; }
.cv-more-btn { right: 24rpx; }
.cv-dots { display: flex; flex-direction: row; align-items: center; justify-content: center; }
.cv-dot { width: 9rpx; height: 9rpx; border-radius: 50%; background: #fff; margin: 0 3rpx; flex-shrink: 0; }
.cv-center-play-layer { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 12; }
.cv-center-play-btn { width: 132rpx; height: 132rpx; border-radius: 50%; background: rgba(0,0,0,0.48); display: flex; align-items: center; justify-content: center; }
.cv-play-icon { color: #fff; font-size: 56rpx; line-height: 56rpx; margin-left: 8rpx; }
.cv-back-text { color: #fff; font-size: 52rpx; line-height: 48rpx; margin-top: -4rpx; }
.cv-plus-text { color: #fff; font-size: 32rpx; line-height: 30rpx; font-weight: 700; }
.cv-side-actions { position: absolute; right: 18rpx; bottom: 176rpx; width: 112rpx; display: flex; flex-direction: column; align-items: center; z-index: 25; }
.cv-avatar-outer { position: relative; width: 84rpx; height: 84rpx; margin-bottom: 4rpx; }
.cv-avatar-wrap { width: 84rpx; height: 84rpx; border-radius: 999rpx; overflow: hidden; background: rgba(255,255,255,0.2); border: 3rpx solid rgba(255,255,255,0.85); display: flex; align-items: center; justify-content: center; }
.cv-avatar { width: 84rpx; height: 84rpx; border-radius: 999rpx; }
.cv-follow-plus { margin-top: -16rpx; margin-bottom: 12rpx; width: 34rpx; height: 34rpx; border-radius: 50%; background: #ff2442; display: flex; align-items: center; justify-content: center; }
.cv-action-item { width: 100rpx; margin-top: 24rpx; display: flex; flex-direction: column; align-items: center; }
.cv-action-icon { width: 52rpx; height: 52rpx; }
.cv-reward-icon { width: 48rpx; height: 48rpx; }
.cv-action-text { display: block; margin-top: 8rpx; color: #fff; font-size: 22rpx; text-align: center; width: 100%; }
.cv-info-panel { position: absolute; left: 24rpx; right: 148rpx; bottom: 126rpx; z-index: 20; }
.cv-author-line { display: flex; align-items: flex-start; margin-bottom: 18rpx; }
.cv-author-avatar-box { width: 66rpx; height: 66rpx; flex-shrink: 0; }
.cv-author-avatar { width: 66rpx; height: 66rpx; border-radius: 999rpx; border: 2rpx solid rgba(255,255,255,0.75); }
.cv-author-meta { margin-left: 14rpx; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
.cv-author-name { display: block; color: #fff; font-size: 29rpx; font-weight: 700; max-width: 260rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-author-time { display: block; margin-top: 5rpx; color: rgba(255,255,255,0.72); font-size: 21rpx; }
.cv-content-info { margin-top: 6rpx; }
.cv-title { display: block; color: #fff; font-size: 34rpx; line-height: 1.45; font-weight: 700; word-break: break-word; }
.cv-desc { display: block; margin-top: 10rpx; color: rgba(255,255,255,0.92); font-size: 26rpx; line-height: 1.6; word-break: break-word; }
.cv-topic-row { margin-top: 14rpx; display: flex; flex-wrap: wrap; }
.cv-topic { display: inline-block; color: #9bdcff; font-size: 24rpx; margin-right: 14rpx; margin-bottom: 8rpx; }
.cv-comment-entry { position: absolute; left: 24rpx; right: 24rpx; bottom: 32rpx; z-index: 22; }
.cv-comment-pill { height: 70rpx; border-radius: 999rpx; background: rgba(255,255,255,0.14); display: flex; align-items: center; padding: 0 28rpx; }
.cv-comment-placeholder { display: block; color: rgba(255,255,255,0.82); font-size: 25rpx; }
</style>
