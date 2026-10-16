<template>
  <view class="page-container" :class="themeClass" :style="themeVars">
    <view v-if="initialLoading" class="init-loading-mask">
      <view class="spinner"></view>
    </view>

    <view class="nav-bar" :style="navBarStyle">
      <view class="nav-content">
        <view class="nav-side nav-side-left">
          <view class="nav-btn" @click="goBack">
            <image class="nav-icon" src="/static/icon/fanhui.png" mode="aspectFit"></image>
          </view>
        </view>

        <view class="nav-title" :style="{ opacity: navOpacity }">
          {{ userInfo.name || userInfo.username }}
          <image v-if="isVip" src="/static/icon/rz.png" class="nav-vip-icon" mode="aspectFit"></image>
        </view>

        <view class="nav-side nav-side-right">
          <view v-if="isMe" class="nav-btn" @click="openScan">
            <image class="nav-icon" src="/static/icon/sss.png" mode="aspectFit"></image>
          </view>
          <view v-else class="nav-btn" @click="openActionMenu">
            <image class="nav-icon" src="/static/icon/gengduo.png" mode="aspectFit"></image>
          </view>
        </view>
      </view>
    </view>

    <!-- 关系选择弹窗：选一个预设关系，或者自己写一个 -->
    <view v-if="relPickerShow" class="rel-mask" @click="closeRelationPicker">
      <view class="rel-sheet" @click.stop>
        <text class="rel-sheet-title">选择你们的关系</text>
        <view class="rel-grid">
          <view
            v-for="t in relTypes"
            :key="t.key"
            class="rel-chip"
            :class="{ picked: relPicked === t.key && relCustomName === '' }"
            @click="pickRelation(t.key)"
          >{{ t.name }}</view>
        </view>
        <input
          class="rel-input"
          v-model="relCustomName"
          maxlength="8"
          placeholder="也可以自己写一个（最多 8 个字）"
          placeholder-class="rel-input-ph"
          @input="onCustomRelationInput"
        />
        <view class="rel-sheet-actions">
          <view class="rel-sheet-btn cancel" @click="closeRelationPicker">取消</view>
          <view class="rel-sheet-btn ok" :class="{ disabled: relSending }" @click="submitRelation">{{ relSending ? '发送中...' : '发送申请' }}</view>
        </view>
      </view>
    </view>

    <scroll-view
      class="main-scroll"
      scroll-y
      enable-back-to-top
      @scroll="onScroll"
      @scrolltolower="onReachBottom"
    >
      <view class="header-bg-box">
        <image
          class="header-image"
          :src="userInfo.background_image || defaultBg"
          mode="aspectFill"
        ></image>
        <view class="header-gradient"></view>
      </view>

      <view class="profile-card">
        <view class="profile-top">
          <view class="avatar-wrapper">
            <image class="avatar-img" :src="userInfo.avatar || defaultAvatar" mode="aspectFill"></image>
            <image
              v-if="userInfo.current_frame_img"
              :src="userInfo.current_frame_img"
              class="avatar-frame"
              mode="aspectFit"
            ></image>
            <!-- 认证: 右下角 V 标 SVG (来自 phpmailer691/红v.svg 个人认证 / 蓝v.svg 企业认证) -->
            <image
              v-if="userInfo.auth_badge_label"
              :src="userInfo.auth_badge_type === 'enterprise' ? '/static/v/blue-v.svg' : '/static/v/red-v.svg'"
              class="avatar-auth-badge"
              mode="aspectFit"
            ></image>
            <!-- 在线状态: 左下角小圆点（查看自己主页时不显示） -->
            <view v-if="!isMe" class="avatar-online-dot" :class="{ 'is-on': userOnline }"></view>

            <!-- 头像旁边"抱"着的那位：有多段关系就随机挑一段，点它进对方主页 -->
            <view v-if="hugPartners.length" class="hug-wrap">
              <image
                v-for="(h, hi) in hugPartners"
                :key="'hug' + hi"
                class="hug-ava"
                :src="h.avatar || defaultAvatar"
                mode="aspectFill"
                @click.stop="goHugUser(h.uid)"
              ></image>
            </view>
          </view>

          <view class="action-buttons">
            <block v-if="!isMe">
              <view v-if="userInfo.status == 0" class="btn disabled">已封禁</view>
              <view v-else-if="userInfo.is_private == 1 || privateBlocked" class="btn disabled">私密账号</view>
              <view
                v-else
                class="btn"
                :class="[isFollowing ? 'secondary' : 'primary', { 'btn-loading': actionLock }]"
                @click="handleFollow"
              >
                {{ isFollowing ? (isFollower ? '互相关注' : '已关注') : (isFollower ? '回关' : '关注') }}
              </view>

              <view class="btn secondary" :class="{ 'icon-btn': isVip }" @click="handleChat">
                <image
                  v-if="isVip"
                  src="/static/icon/siliao.png"
                  class="btn-icon"
                  mode="aspectFit"
                ></image>
                <text v-else>私信</text>
              </view>

              <!-- 关系入口：只有互相关注、且双方都还没有关系时才出现 -->
              <view v-if="canApplyRelation" class="btn relation-btn" @click.stop="openRelationPicker">建立关系</view>
            </block>

            <view v-else-if="userInfo.status == 0" class="btn disabled">已封禁</view>
            <view v-else class="btn secondary" @click="goEditProfile">编辑资料</view>
          </view>
        </view>

        <view class="profile-info">
          <view class="name-line">
            <text class="user-name" :class="{ 'fancy-text': userInfo.is_fancy == 1, 'vip-rainbow-text': isVip }">{{ userInfo.name || userInfo.username }}</text>
            <!-- 性别图标 -->
            <image v-if="userInfo.gender && userInfo.gender != 0" class="gender-icon-only" :src="genderIconUrl" mode="aspectFit"></image>
            <view v-if="isVip" class="vip-sole-icon vip-inline">
              <view class="vip-badge-inner">
                <image class="vip-badge-crown-img" src="/static/icon/crown-white.svg" mode="aspectFit" />
                <text class="vip-badge-text">VIP</text>
              </view>
            </view>
            <view class="level-tag" :class="'lv-tier-' + getLevelTier(levelDisplay)">
              <image class="level-star-img" src="/static/icon/star-white.svg" mode="aspectFit" />
              <text class="lv-text">Lv.{{ levelDisplay }}</text>
            </view>
          </view>

          <!-- 关系入口：始终显示。有关系的显示徽章（点了直接进这段关系的详情，看的是对方），
               没关系的给一条引导，点了进关系页 -->
          <view class="relation-lines">
            <view
              v-for="(r, ri) in displayRelations"
              :key="'rel' + ri"
              class="relation-line"
              @click.stop="goRelationDetail(r)"
            >
              <image class="relation-ava" :src="(r.with && r.with.avatar) || defaultAvatar" mode="aspectFill"></image>
              <text class="relation-type">{{ r.type_name }}</text>
              <text class="relation-name">{{ (r.with && r.with.name) || '对方' }}</text>
            </view>
            <view v-if="!displayRelations.length" class="relation-line ghost" @click.stop="onGhostRelationClick">
              <text class="relation-type ghost-type">关系</text>
              <text class="relation-name">{{ viewingSelf ? '还没有亲密关系，点这里去建立' : 'TA 还没有公开的亲密关系' }}</text>
            </view>
          </view>

          <!-- 徽章行：靓号 + 头衔 + 个人认证 + 企业认证。独立一行，不跟名字/VIP/等级挤在同一行，杜绝重叠 -->
          <view class="badges-row">
            <view v-if="userInfo.is_fancy == 1" class="fancy-badge-inline">
              <image src="/static/vip/lianghao.webp" class="fbi-icon" mode="aspectFit"></image>
              <text class="fbi-num">{{ userInfo.display_number }}</text>
            </view>
            <view v-if="userInfo.user_title" class="title-row">
              <image class="title-icon-img" src="/static/icon/check-white.svg" mode="aspectFit" />
              <text class="title-text">{{ userInfo.user_title }}</text>
            </view>
            <view
              v-if="Number(userInfo.personal_verified || 0) === 1 || userInfo.auth_badge_type === 'personal'"
              class="personal-auth-btn"
            >
              <text class="personal-auth-icon">实</text>
              <text class="personal-auth-text">个人认证</text>
            </view>
            <view
              v-if="(Number(userInfo.enterprise_verified || 0) === 1 && (userInfo.enterprise_name || userInfo.auth_badge_type === 'enterprise')) || (userInfo.auth_badge_type === 'enterprise' && userInfo.auth_badge_label === '企')"
              class="enterprise-auth-btn"
              @click.stop="showEnterpriseInfo"
            >
              <text class="enterprise-auth-icon">企</text>
              <text class="enterprise-auth-text">{{ userInfo.enterprise_name || '企业认证' }}</text>
            </view>
          </view>

          <view class="sub-info-row" v-if="!userInfo.is_fancy && userInfo.display_number">
            <text class="ordinary-num-inline">{{ userInfo.display_number }}</text>
          </view>

          <view class="bio-line" :class="{ 'vip-rainbow-text': isVip }">
            {{ userInfo.personal_signature || '这个人很懒，什么都没写...' }}
          </view>

          <!-- IP属地 -->
          <view class="ip-location-row" v-if="userInfo.ip_location && userInfo.ip_location !== '未知'">
            <text class="ip-location-icon"></text>
            <text class="ip-location-text">IP属地：{{ userInfo.ip_location }}</text>
          </view>
        </view>

        <view class="stats-row">
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.follow_count) }}</text>
            <text class="label">关注</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.fans_count) }}</text>
            <text class="label">粉丝</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.total_like) }}</text>
            <text class="label">获赞</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.post_count) }}</text>
            <text class="label">帖子</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ formatNum(userInfo.total_view_count) }}</text>
            <text class="label">曝光</text>
          </view>
        </view>

        <!-- 被封禁提示横幅 -->
        <view v-if="userInfo.status == 0" class="ban-notice-banner">
          <view class="ban-notice-icon">⚠</view>
          <view class="ban-notice-content">
            <text class="ban-notice-title">{{ isMe ? '您的账号已被封禁' : '该账号已被封禁' }}</text>
            <text v-if="userInfo.ban_reason" class="ban-notice-reason">原因：{{ userInfo.ban_reason }}</text>
            <text v-if="userInfo.ban_expire_time" class="ban-notice-expire">解封时间：{{ userInfo.ban_expire_time }}</text>
            <text v-if="isMe" class="ban-notice-tip">封禁期间可浏览内容和查看通知，但无法发帖、评论、点赞等操作</text>
          </view>
        </view>

        <!-- 圈子版主标识 -->
        <view class="moderator-circles-section" v-if="moderatorCircles.length > 0">
          <view class="mod-circles-header">
            <view class="mod-circles-title-wrap">
              <text class="mod-circles-icon">🛡</text>
              <text class="mod-circles-title">圈子版主</text>
              <text class="mod-circles-count">{{ moderatorCircles.length }} 个圈子</text>
            </view>
          </view>
          <scroll-view scroll-x class="mod-circles-scroll" :show-scrollbar="false">
            <view class="mod-circles-list">
              <view
                class="mod-circle-card"
                v-for="circle in moderatorCircles"
                :key="circle.id"
                @click="goCircleDetail(circle)"
              >
                <image :src="circle.image || circle.icon || '/static/default-avatar.png'" class="mod-circle-avatar" mode="aspectFill"></image>
                <view class="mod-circle-info">
                  <text class="mod-circle-name">{{ circle.name }}</text>
                  <text class="mod-circle-meta">{{ circle.member_count }}成员 · {{ circle.post_count }}帖子</text>
                </view>
                <text class="mod-circle-badge">版主</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <view class="content-area">
        <view class="sticky-tabs" :style="{ top: stickyTabsTop + 'px' }">
          <view class="tab-item" :class="{ active: curTab === 0 }" @click="switchTab(0)">
            帖子
            <view v-if="curTab === 0" class="active-bar"></view>
          </view>
          <view class="tab-item" :class="{ active: curTab === 1 }" @click="switchTab(1)">
            动态
            <view v-if="curTab === 1" class="active-bar"></view>
          </view>
          <view class="tab-item" :class="{ active: curTab === 2 }" @click="switchTab(2)">
            商品橱窗
            <view v-if="curTab === 2" class="active-bar"></view>
          </view>
        </view>

        <view class="list-container">
          <block v-if="curTab === 0">
            <view v-if="userInfo.is_private == 1 || privateBlocked || userInfo.status == 0" class="lock-view">
              <image class="lock-icon" src="/static/icon/nullu.png" mode="widthFix"></image>
              <text class="lock-text">{{ userInfo.status == 0 ? (isMe ? '您的账号已被封禁，部分功能暂不可用' : '该账号已封禁') : '该账号已开启私密模式' }}</text>
              <text v-if="isMe && userInfo.status == 0 && userInfo.ban_reason" class="ban-reason-text">封禁原因：{{ userInfo.ban_reason }}</text>
              <text v-if="isMe && userInfo.status == 0 && userInfo.ban_expire_time" class="ban-expire-text">解封时间：{{ userInfo.ban_expire_time }}</text>
            </view>

            <block v-else>
              <view v-if="list.length === 0 && !loading" class="empty-box">
                <text class="empty-text">暂时没有发布内容</text>
              </view>

              <view v-else class="waterfall-box">
                <view class="card-item" v-for="item in list" :key="item.id" @click="goPostDetail(item.id)">
                  <block v-if="item.douyin_url && item.douyin_cover">
                    <view class="card-douyin-wrap" @click.stop="openPostVideo(item)">
                      <image :src="item.douyin_cover" class="card-douyin-cover" mode="aspectFill"></image>
                      <view class="card-douyin-play-btn">
                        <view class="card-douyin-play-icon"></view>
                      </view>
                      <view class="card-douyin-info">
                        <text class="card-douyin-title">{{ item.douyin_title || '抖音视频' }}</text>
                      </view>
                    </view>
                    <view class="card-info">
                      <view class="card-title" :class="{ 'fancy-text': parseInt(item.is_fancy || 0) === 1 }">{{ item.title }}</view>
                      <view class="card-meta">
                        <view class="meta-user">
                          <image :src="item.user_avatar || userInfo.avatar || defaultAvatar" class="meta-avatar"></image>
                          <text class="meta-name">{{ item.name || userInfo.name || userInfo.username }}</text>
                        </view>
                        <view class="meta-stats">
                          <view class="meta-like">
                            <image src="/static/icon/eye-gray.svg" class="like-icon" mode="aspectFit"></image>
                            {{ formatNum(item.view_count) }}
                          </view>
                          <view class="meta-like">
                            <image src="/static/post/xih1.png" class="like-icon" mode="aspectFit"></image>
                            {{ item.like_count }}
                          </view>
                        </view>
                      </view>
                    </view>
                  </block>

                  <block v-else-if="item.cover_img || item.isVideo">
                    <view class="card-image-box">
                      <image class="card-cover" :src="item.cover_img" mode="aspectFill" lazy-load></image>
                      <image v-if="item.isVideo" src="/static/icon/video.png" class="video-badge-img"></image>
                    </view>
                    <view class="card-info">
                      <view class="card-title" :class="{ 'fancy-text': parseInt(item.is_fancy || 0) === 1 }">{{ item.title }}</view>
                      <view class="card-meta">
                        <view class="meta-user">
                          <image :src="item.user_avatar || userInfo.avatar || defaultAvatar" class="meta-avatar"></image>
                          <text class="meta-name">{{ item.name || userInfo.name || userInfo.username }}</text>
                        </view>
                        <view class="meta-stats">
                          <view class="meta-like">
                            <image src="/static/icon/eye-gray.svg" class="like-icon" mode="aspectFit"></image>
                            {{ formatNum(item.view_count) }}
                          </view>
                          <view class="meta-like">
                            <image src="/static/post/xih1.png" class="like-icon" mode="aspectFit"></image>
                            {{ item.like_count }}
                          </view>
                        </view>
                      </view>
                    </view>
                  </block>

                  <block v-else>
                    <view class="text-cover-card" :style="{ background: (item.textCoverData && item.textCoverData.gradient) || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }">
                      <view class="text-cover-inner">
                        <text class="text-cover-title" v-if="item.textCoverData">{{ item.textCoverData.title }}</text>
                        <text class="text-cover-subtitle" v-if="item.textCoverData && item.textCoverData.subtitle">{{ isLockedPost(item) ? getLockedPlaceholderText(item) : item.textCoverData.subtitle }}</text>
                      </view>
                      <view v-if="isLockedPost(item)" class="text-cover-lock">
                        <image src="/static/icon/lock-white.svg" class="lock-text-icon" mode="aspectFit"></image>
                      </view>
                    </view>
                    <view class="card-info">
                      <view class="card-title" :class="{ 'fancy-text': parseInt(item.is_fancy || 0) === 1 }">{{ item.title }}</view>
                      <view class="card-meta">
                        <view class="meta-user">
                          <image :src="item.user_avatar || userInfo.avatar || defaultAvatar" class="meta-avatar"></image>
                          <text class="meta-name">{{ item.name || userInfo.name || userInfo.username }}</text>
                        </view>
                        <view class="meta-stats">
                          <view class="meta-like">
                            <image src="/static/icon/eye-gray.svg" class="like-icon" mode="aspectFit"></image>
                            {{ formatNum(item.view_count) }}
                          </view>
                          <view class="meta-like">
                            <image src="/static/post/xih1.png" class="like-icon" mode="aspectFit"></image>
                            {{ item.like_count }}
                          </view>
                        </view>
                      </view>
                    </view>
                  </block>
                </view>
              </view>

              <view class="loading-more">
                <view v-if="loading" class="spinner small"></view>
                <text v-if="!hasMore && list.length > 0" class="no-more">没有更多了</text>
              </view>
            </block>
          </block>

          <!-- 动态 -->
          <block v-if="curTab === 1">
            <view v-if="userInfo.is_private == 1 || privateBlocked || userInfo.status == 0" class="lock-view">
              <image class="lock-icon" src="/static/icon/nullu.png" mode="widthFix"></image>
              <text class="lock-text">{{ userInfo.status == 0 ? (isMe ? '您的账号已被封禁，部分功能暂不可用' : '该账号已封禁') : '该账号已开启私密模式' }}</text>
              <text v-if="isMe && userInfo.status == 0 && userInfo.ban_reason" class="ban-reason-text">封禁原因：{{ userInfo.ban_reason }}</text>
              <text v-if="isMe && userInfo.status == 0 && userInfo.ban_expire_time" class="ban-expire-text">解封时间：{{ userInfo.ban_expire_time }}</text>
            </view>
            <block v-else>
            <view v-if="dynList.length === 0 && !dynLoading" class="empty-box">
              <text class="empty-text">暂时没有发布动态</text>
            </view>
            <view v-else class="dyn-list">
              <view class="dyn-item" v-for="item in dynList" :key="item.id" @click="goDynDetail(item.id)">
                <view class="dyn-content" v-if="item.content">{{ item.content }}</view>
                <view class="dyn-images" v-if="item.images && item.images.length > 0">
                  <image
                    v-for="(img, idx) in (item.images.length > 3 ? item.images.slice(0, 3) : item.images)"
                    :key="idx"
                    :src="img"
                    class="dyn-img"
                    mode="aspectFill"
                  ></image>
                </view>
                <view class="dyn-meta">
                  <text class="dyn-time">{{ formatDynTime(item.created_at) }}</text>
                  <view class="dyn-stats">
                    <view class="dyn-stat"><image src="/static/post/pl.png" class="dyn-stat-icon" mode="aspectFit"></image><text>{{ item.comment_count || 0 }}</text></view>
                    <view class="dyn-stat"><image src="/static/post/xih1.png" class="dyn-stat-icon" mode="aspectFit"></image><text>{{ item.like_count || 0 }}</text></view>
                  </view>
                </view>
              </view>
            </view>
            <view class="loading-more">
              <view v-if="dynLoading" class="spinner small"></view>
              <text v-if="!dynHasMore && dynList.length > 0" class="no-more">没有更多了</text>
            </view>
            </block>
          </block>

          <block v-if="curTab === 2">
            <view v-if="userInfo.is_private == 1 || privateBlocked || userInfo.status == 0" class="lock-view">
              <image class="lock-icon" src="/static/icon/nullu.png" mode="widthFix"></image>
              <text class="lock-text">{{ userInfo.status == 0 ? (isMe ? '您的账号已被封禁，部分功能暂不可用' : '该账号已封禁') : '该账号已开启私密模式' }}</text>
              <text v-if="isMe && userInfo.status == 0 && userInfo.ban_reason" class="ban-reason-text">封禁原因：{{ userInfo.ban_reason }}</text>
              <text v-if="isMe && userInfo.status == 0 && userInfo.ban_expire_time" class="ban-expire-text">解封时间：{{ userInfo.ban_expire_time }}</text>
            </view>
            <block v-else>
            <view v-if="shopList.length === 0 && !shopLoading" class="empty-box">
              <text class="empty-text">暂无在售商品</text>
            </view>
            <view v-else class="shop-grid">
              <view class="shop-card" v-for="item in shopList" :key="item.id" @click="goShopDetail(item.id)">
                <image :src="item.image" class="shop-img" mode="aspectFill"></image>
                <view class="shop-info">
                  <text class="shop-title">{{ item.title }}</text>
                  <view class="shop-bottom">
                    <text class="shop-price">￥{{ item.price }}</text>
                    <view class="shop-type-tag" :class="item.product_type == 1 ? 'physical' : 'virtual'">
                      {{ item.product_type == 1 ? '实体' : '虚拟' }}
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view class="loading-more">
              <view v-if="shopLoading" class="spinner small"></view>
              <text v-if="!shopHasMore && shopList.length > 0" class="no-more">没有更多了</text>
            </view>
            </block>
          </block>
        </view>
      </view>
    </scroll-view>

    <view class="sheet-mask" :class="{ show: showMenu }" @click="closeActionMenu">
      <view class="sheet-panel" @click.stop>
        <view v-if="!isMe" class="sheet-opt" @click="toggleBlock">{{ blockedByMe ? '取消拉黑' : '拉黑用户' }}</view>
        <view class="sheet-opt warning" @click="handleAction('report')">举报该用户</view>
        <view class="sheet-opt" @click="handleAction('copy')">复制主页链接</view>
        <view class="sheet-gap"></view>
        <view class="sheet-opt cancel" @click="closeActionMenu">取消</view>
      </view>
    </view>

    <DouyinPlayer
      :show="showDouyinPlayer"
      :videoList="douyinVideoList"
      :userInfo="userInfo"
      @update:show="showDouyinPlayer = $event"
    />
  </view>
</template>

<script>
import { request, webBaseUrl } from '../../common/request.js'
import { getLevelDisplay as calcLevelDisplay } from '../../common/level.js'
import presence from '../../common/presence.js'
import DouyinPlayer from '../../components/DouyinPlayer.vue'
import { buildDouyinVideoList } from '../../common/douyinPlayer.js'

export default {
  components: {
    DouyinPlayer
  },
  data() {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      navOpacity: 0,
      targetUserId: 0,
      initialLoading: true,
      showDouyinPlayer: false,
      douyinVideoList: [],
      moderatorCircles: [],

      /* ===== 关系系统（情侣 / 闺蜜 / 死党 / 自定义） ===== */
      relationsBetween: [],      // 我和主页这个人已建立的关系（可能多段）
      targetRelations: [],       // 主页这个人自己的全部关系（看别人主页时，头像旁边贴的就是 TA 的关系对象）
      myRelations: [],           // 我自己的全部关系（看自己主页时显示）
      relationPending: null,     // 我和他之间待确认的申请
      canApplyRelation: false,   // 当前是否可以发起关系申请
      relTypes: [],              // 预设关系类型（后端下发）
      relPickerShow: false,      // 关系选择弹窗显隐
      relPicked: '',             // 选中的预设类型 key
      relCustomName: '',         // 自定义关系名称
      relSending: false,

      userInfo: {
        id: 0,
        username: '',
        name: '',
        avatar: '',
        background_image: '',
        personal_signature: '',
        lv: 0,
        vip: 0,
        is_private: 0,
        status: 1,
        fans_count: 0,
        follow_count: 0,
        total_like: 0,
        total_view_count: 0,
        post_count: 0,
        current_frame_img: '',
        user_title: '',
        enterprise_verified: 0,
        enterprise_name: '',
        personal_verified: 0,
        auth_status: 0,
        auth_type: '',
        auth_badge_type: '',
        auth_badge_label: '',
        can_message: 1
      },

      privateBlocked: false,
      blockedByMe: false,
      blockedMe: false,
      canMessage: false,
      messageReason: '',
      isFollowing: false,
      actionLock: false,
      userOnline: false,

      defaultAvatar: 'https://y.sgyunp.cn/f/6eXTL/IMG_5336.jpeg',
      defaultBg: 'https://y.sgyunp.cn/f/6eXTL/IMG_5336.jpeg',

      list: [],
      page: 1,
      hasMore: true,
      loading: false,

      curTab: 0,
      shopList: [],
      shopPage: 1,
      shopHasMore: true,
      shopLoading: false,

      dynList: [],
      dynPage: 1,
      dynHasMore: true,
      dynLoading: false,

      showMenu: false,
      textCoverGradients: [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
        'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
        'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
      ]
    }
  },

  computed: {
    genderIconUrl() {
      const g = Number(this.userInfo.gender || 0);
      const map = { 1: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTAiIGN5PSIxNCIgcj0iNSIgc3Ryb2tlPSIjNEE5MEQ5IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8cGF0aCBkPSJNMTQgMTBMMjAgNE0yMCA0SDE1TTIwIDRWOSIgc3Ryb2tlPSIjNEE5MEQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=', 2: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSI5IiByPSI1IiBzdHJva2U9IiNFODRBN0YiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0xMiAxNFYyME05IDE3SDE1IiBzdHJva2U9IiNFODRBN0YiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg==', 3: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTAiIGN5PSIxNCIgcj0iNSIgc3Ryb2tlPSIjOUI1OUI2IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8cGF0aCBkPSJNMTQgMTBMMjAgNE0yMCA0SDE1TTIwIDRWOSIgc3Ryb2tlPSIjOUI1OUI2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik0xMCAxOVYyMk03IDIwLjVIMTMiIHN0cm9rZT0iIzlCNTlCNiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+', 4: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSI5IiByPSI1IiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0xMiAxNFYyME05IDE3SDE1IiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHBhdGggZD0iTTE3IDZMMjIgMU0yMiAxSDE3TTIyIDFWNiIgc3Ryb2tlPSIjRTY3RTIyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=', 5: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIgc3Ryb2tlPSIjMUFCQzlDIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiBmaWxsPSIjMUFCQzlDIi8+Cjwvc3ZnPg==' };
      return map[g] || '';
    },
    /* 是不是在看自己的主页（没传 userId 也算自己）
       注意：本地存的用户信息里主键字段是 uid（栖屿号），只有部分场景才有 id / user_id，
       三个都试一遍；否则看自己的主页会被当成看别人，头像旁边会贴上自己的头像。 */
    viewingSelf() {
      const uid = String(this.targetUserId || '')
      const my = uni.getStorageSync('userInfo') || {}
      const ids = [my.uid, my.id, my.user_id]
        .filter(v => v !== null && v !== undefined && String(v) !== '')
        .map(v => String(v))
      return !uid || ids.indexOf(uid) >= 0
    },
    /* 对方有没有关注我（后端 is_follower 可能是 true/'true'/1/'1'，统一成布尔） */
    isFollower() {
      const v = this.userInfo ? this.userInfo.is_follower : 0
      if (v === true || v === 'true') return true
      return parseInt(v || 0, 10) === 1
    },
    /* 头像旁边"抱"着的那位：只要有一段生效的关系就会贴出来（不限等级）。
       有多段关系时随机挑一个，每次进这个页面挑到的都可能不一样；
       只贴一个，避免多个头像叠在一起糊成一团。
       看自己的主页 -> 从我自己的关系里挑；看别人的主页 -> 从那个人的关系里挑。 */
    hugPartners() {
      const me = uni.getStorageSync('userInfo') || {}
      const myUid = String(me.uid || me.id || me.user_id || '')
      const targetUid = String(this.targetUserId || '')
      let cands = []

      if (this.viewingSelf) {
        /* 看自己的主页：贴我自己的关系对象 */
        cands = (this.myRelations || [])
          .filter(r => r && r.with && r.with.uid)
          .map(r => ({ uid: String(r.with.uid), avatar: r.with.avatar, name: r.with.name }))
      } else {
        /* 看别人的主页：贴「那个人的关系对象」（后端 target_relations 给的就是 TA 的关系列表） */
        cands = (this.targetRelations || [])
          .filter(r => r && r.with && r.with.uid)
          .map(r => ({ uid: String(r.with.uid), avatar: r.with.avatar, name: r.with.name }))
        /* 拿不到 TA 的关系列表时，退一步只贴「我」——我和 TA 有关系，我本来就是 TA 的关系对象之一。
           千万不能贴 TA 自己的头像，否则会变成「TA 和 TA 拥抱」。 */
        if (!cands.length && (this.relationsBetween || []).length && myUid && myUid !== targetUid) {
          cands = [{ uid: myUid, avatar: me.avatar || '', name: me.nickname || me.username || '我' }]
        }
      }

      /* 兜底护栏：绝不能把主页主人自己当成"旁边那位"，否则就是自己和自己拥抱 */
      cands = cands.filter(c => c.uid && c.uid !== targetUid)
      if (!cands.length) return []
      return [cands[Math.floor(Math.random() * cands.length)]]
    },
    /* 主页上显示的关系：看自己的主页显示「我的全部关系」，
       看别人的主页显示「TA 公开的亲密关系」（后端只返回双方同意展示的 visible=1 段） */
    displayRelations() {
      if (this.viewingSelf) return this.myRelations || []
      return (this.targetRelations || []).filter(r => !!r).map(r => ({
        id: r.id,
        type_name: r.type_name,
        with: r.with || {}
      }))
    },
    /* 和 viewingSelf 一个意思，直接复用，避免两处判断标准不一致
       （以前只看 id / user_id，看自己主页时会被当成看别人） */
    isMe() {
      return this.viewingSelf
    },

    isVip() {
      // 以服务端 userPublic 返回的 vip / is_vip 真源为准；
      // 服务端已处理：vip_expire_time 有值且过期 -> 掉, 手开无到期时间 -> 仍为 VIP
      if (!this.userInfo) return false
      if (parseInt(this.userInfo.vip) === 1) return true
      if (parseInt(this.userInfo.is_vip) === 1) return true
      const vipExpire = this.userInfo.vip_expire_time || this.userInfo.expire_time || null
      if (!vipExpire) return false
      const ts = new Date(String(vipExpire).replace(/-/g, '/')).getTime()
      return !Number.isNaN(ts) && ts > Date.now()
    },

    levelDisplay() {
      return calcLevelDisplay(this.userInfo.lv)
    },

    navBarTotalHeight() {
      return this.statusBarHeight + this.navBarHeight
    },

    stickyTabsTop() {
      return this.navBarTotalHeight - 1
    },

    navBarStyle() {
      return {
        paddingTop: this.statusBarHeight + 'px',
        height: this.navBarTotalHeight + 'px',
        background: this.navBgStyle,
        boxSizing: 'border-box'
      }
    },

    navBgStyle() {
      return `rgba(var(--nav-rgb), ${this.navOpacity})`
    },

    themeClass() {
      // 资料页统一使用白色主题，不做VIP黑色主题区分
      return 'theme-light'
    },

    themeVars() {
      // 资料页强制使用白色主题，保留顶部背景图原样显示
      // VIP身份标识（vip图标、渐变文字、金色按钮）不受影响，由各自样式控制
      return {
        '--bg-color': '#FFFFFF',
        '--container-bg': '#FFFFFF',
        '--card-bg': '#FFFFFF',
        '--text-main': '#333333',
        '--text-sub': '#999999',
        '--accent': '#FF2442',
        '--border': '#EEEEEE',
        '--nav-rgb': '255, 255, 255',
        '--tag-bg': '#F5F5F5',
        '--btn-sec-bg': '#FFFFFF',
        '--btn-sec-text': '#333333'
      }
    }
  },

  onLoad(options) {
    const sys = uni.getSystemInfoSync()
    this.statusBarHeight = sys.statusBarHeight || 20

    if (options.userId) this.targetUserId = String(options.userId || "")

    /* 关系：看自己的主页要显示「我的关系对象」，看别人的主页显示「我和他的关系」，
       所以无论看谁都得查一次，不能只在看别人时查。 */
    this.loadRelation()
    this.loadRelationTypes()

    if (options.userId) {
      this.fetchData()
      this.loadModeratorCircles()
      /* 在线状态: 进入页面查一次(WS 会实时推送, 这里是兜底), 之后每 10 秒兜底刷新 */
      this.refreshUserOnline()
      this._onlineTimer = setInterval(() => this.refreshUserOnline(), 10000)
      uni.$off('presence_changed', this._onPresence)
      uni.$on('presence_changed', this._onPresence)
    }
  },

  onUnload() {
    if (this._onlineTimer) { clearInterval(this._onlineTimer); this._onlineTimer = null }
    uni.$off('presence_changed', this._onPresence)
  },

  methods: {
    /* ==================== 关系系统 ==================== */
    /* 查我和主页这个人的关系状态：是否互关 / 能否申请 / 已建立的关系 */
    async loadRelation() {
      const uid = String(this.targetUserId || '')
      /* 不传 uid 时后端返回我自己的关系，所以这里不提前 return */
      try {
        const res = await request('relation.php', uid ? { action: 'info', uid } : { action: 'info' }, 'GET')
        if (res && res.code === 0 && res.data) {
          this.relationsBetween = res.data.relations || []
          this.targetRelations = res.data.target_relations || []
          this.myRelations = res.data.my_relations || []
          this.relationPending = res.data.pending || null
          this.canApplyRelation = !!res.data.can_apply
        }
      } catch (e) {}
    },
    /* 打开关系选择弹窗：先把弹窗弹出来，类型再后台补。
       之前是"先等网络拉类型、成功了才弹窗"，网络一慢就看起来像点了没反应 */
    openRelationPicker() {
      if (!this.canApplyRelation) return
      this.relPicked = ''
      this.relCustomName = ''
      this.relPickerShow = true
      if (!(this.relTypes || []).length) this.loadRelationTypes()
    },
    async loadRelationTypes() {
      try {
        const res = await request('relation.php', { action: 'types' }, 'GET')
        if (res && res.code === 0 && res.data && res.data.list && res.data.list.length) {
          this.relTypes = res.data.list
          return
        }
      } catch (e) {}
      /* 后端取不到就用本地兜底一份，保证弹窗里一定有可选项 */
      if (!(this.relTypes || []).length) {
        this.relTypes = [
          { key: 'cp', name: '情侣' }, { key: 'cp2', name: 'CP' },
          { key: 'bestie', name: '闺蜜' }, { key: 'buddy', name: '死党' },
          { key: 'brother', name: '兄弟' }, { key: 'sister', name: '姐妹' },
          { key: 'close', name: '挚友' }, { key: 'partner', name: '搭档' },
          { key: 'master', name: '师徒' }, { key: 'soulmate', name: '灵魂伴侣' }
        ]
      }
    },
    closeRelationPicker() {
      if (this.relSending) return
      this.relPickerShow = false
    },
    pickRelation(key) {
      this.relPicked = key
      this.relCustomName = ''
    },
    /* 一填写自定义名称，就取消预设的选中态 */
    onCustomRelationInput() {
      if (String(this.relCustomName || '').trim() !== '') this.relPicked = ''
    },
    async submitRelation() {
      if (this.relSending) return
      const custom = String(this.relCustomName || '').trim()
      const typeKey = custom !== '' ? 'custom' : this.relPicked
      if (typeKey === '') return uni.showToast({ title: '请选择或填写关系', icon: 'none' })
      const uid = String(this.targetUserId || '')
      /* 不传 uid 时后端返回我自己的关系，所以这里不提前 return */
      this.relSending = true
      try {
        const res = await request('relation.php', {
          action: 'apply',
          uid,
          type_key: typeKey,
          type_name: typeKey === 'custom' ? custom : ''
        }, 'POST')
        if (res && res.code === 0) {
          this.relPickerShow = false
          uni.showToast({ title: '申请已发出，等待对方确认', icon: 'none' })
          this.loadRelation()
        } else {
          uni.showToast({ title: (res && (res.message || res.msg)) || '发送失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误，请稍后再试', icon: 'none' })
      }
      this.relSending = false
    },
    /* 点头像旁边"抱"着的那个人，进 TA 的主页 */
    goHugUser(uid) {
      if (!uid) return
      uni.navigateTo({ url: '/pages/user/profile?userId=' + uid })
    },
    /* 点关系徽章：自己主页 → 我的关系页；别人主页 → 围观「他们两个」的这段关系 */
    goRelationDetail(r) {
      if (!this.viewingSelf) {
        const rid = r && r.id
        if (rid) {
          uni.navigateTo({ url: '/pages/relation/detail?relationId=' + rid })
        }
        return
      }
      this.goRelationBoard()
    },
    /* 关系区空着时的引导条：自己主页去建立，别人主页只提示 */
    onGhostRelationClick() {
      if (this.viewingSelf) {
        this.goRelationBoard()
      } else {
        uni.showToast({ title: 'TA 还没有公开的亲密关系', icon: 'none' })
      }
    },
    /* 进「我的关系」页：可以在里面解除、也可以建立新的；
       看别人主页时带上 viewUid，进去展示的是 TA 的亲密关系，并且可以给 TA 打 call */
    goRelationBoard() {
      if (!this.viewingSelf && this.targetUserId) {
        const nm = this.userInfo.name || this.userInfo.nickname || this.userInfo.username || ''
        uni.navigateTo({
          url: '/pages/relation/index?viewUid=' + this.targetUserId + '&viewName=' + encodeURIComponent(nm)
        })
        return
      }
      uni.navigateTo({ url: '/pages/relation/index' })
    },

    /* WS 推来在线变化时立刻改状态, 不走网络 */
    _onPresence() {
      if (!this.targetUserId) return
      const v = presence.getCached(this.targetUserId)
      if (v !== null) this.userOnline = v
    },
    /* 兜底: 每 10 秒查一次(WS 正常时缓存已是新值, 基本不会发请求) */
    async refreshUserOnline() {
      if (!this.targetUserId) return
      try {
        const map = await presence.fetchOnline([this.targetUserId])
        this.userOnline = !!map[String(this.targetUserId)]
      } catch (e) {
        /* 查询失败时保留上一次的状态，不要谎报离线 */
      }
    },
    // 等级分层配色（参考B站等级体系）
    getLevelTier(lv) {
      const n = parseInt(lv) || 0
      if (n <= 2) return 1
      if (n <= 4) return 2
      if (n <= 6) return 3
      if (n <= 8) return 4
      if (n <= 10) return 5
      return 6
    },
    normalizePostItem(item) {
      const DEFAULT_VIDEO_COVER = '/static/logo.png'
      const post = item || {}
      const isPaid = parseInt(post.is_paid || 0)
      const isCommentUnlock = parseInt(post.is_comment_unlock || 0)
      
      const isUsableMedia = (url) => {
        const value = String(url || '').trim()
        if (!value) return false
        const lowered = value.toLowerCase()
        return !['null', 'undefined', 'false', '[]', '[object object]'].includes(lowered)
      }
      
      let imgs = []
      if (post.images && post.images !== 'NULL') {
        if (Array.isArray(post.images)) {
          imgs = post.images
        } else if (typeof post.images === 'string') {
          try {
            imgs = post.images.startsWith('[') ? JSON.parse(post.images) : post.images.split(',')
          } catch (e) {
            imgs = post.images.split(',')
          }
        }
      }
      
      imgs = imgs
        .map(img => String(img || '').trim())
        .filter(img => isUsableMedia(img))
      
      let coverImage = imgs[0] || post.cover_img || post.coverImage || post.douyin_cover || ''
      if (!isUsableMedia(coverImage)) coverImage = ''

      const isVideo = !!(post.video && isUsableMedia(post.video)) || !!(post.douyin_cover && isUsableMedia(post.douyin_cover))
      if (isVideo && !coverImage) coverImage = DEFAULT_VIDEO_COVER

      // 纯文字卡片随机渐变背景
      const isTextOnly = !coverImage && !isVideo && !post.douyin_cover
      let plainContent = (post.plain_content || post.content || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (plainContent.length > 70) plainContent = plainContent.substring(0, 70) + '...'
      const textCoverData = isTextOnly ? {
        gradient: this.textCoverGradients[(post.id || 0) % 12],
        title: ((post.title || '').trim() || plainContent || '文字内容').substring(0, 20),
        subtitle: (plainContent || '点击查看详情').substring(0, 40)
      } : null

      return {
        ...post,
        cover_img: coverImage,
        coverImage: coverImage,
        images: imgs,
        video: post.video || '',
        isVideo: isVideo,
        douyin_cover: post.douyin_cover || '',
        is_paid: isPaid,
        is_comment_unlock: isCommentUnlock,
        price: Number(post.price || 0),
        is_unlocked: !!(post.is_unlocked || (!isPaid && !isCommentUnlock)),
        isTextOnly,
        textCoverData,
        plainContent
      }
    },

    isLockedPost(item) {
      if (!item) return false
      return (parseInt(item.is_paid || 0) === 1 || parseInt(item.is_comment_unlock || 0) === 1) && !item.is_unlocked
    },

    getLockedPlaceholderText(item) {
      return parseInt(item && item.is_paid ? item.is_paid : 0) === 1 ? '付费可见' : '评论可见'
    },

    goBack() {
      uni.navigateBack()
    },

    async loadModeratorCircles() {
      if (!this.targetUserId) return
      try {
        const res = await request('circle.php', {
          action: 'get_user_moderator_circles',
          uid: this.targetUserId
        })
        if (res.code === 0 && res.data) {
          this.moderatorCircles = res.data.list || res.data || []
        }
      } catch (e) {
        console.log('加载版主圈子失败', e)
      }
    },

    goCircleDetail(circle) {
      if (!circle || !circle.id) return
      const name = encodeURIComponent(circle.name || '')
      uni.navigateTo({
        url: `/pages/circle/detail?id=${circle.id}&name=${name}`
      })
    },

    openScan() {
      // #ifdef H5
      uni.showToast({
        title: '请使用APP扫一扫',
        icon: 'none'
      })
      // #endif

      // #ifndef H5
      uni.scanCode({
        success: (res) => {},
        fail: () => {}
      })
      // #endif
    },

    goPostDetail(id) {
      if (this.userInfo.status == 0) {
        uni.showToast({ title: '该账号已封禁', icon: 'none' })
        return
      }

      if (this.privateBlocked || parseInt(this.userInfo.is_private) === 1) {
        uni.showToast({ title: '该账号已开启私密模式', icon: 'none' })
        return
      }

      uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${id}` })
    },

    async openPostVideo(item) {
      if (!item || !item.douyin_url) return
      uni.showLoading({ title: '解析中...', mask: true })
      try {
        const videoList = await buildDouyinVideoList(item)
        if (!videoList || videoList.length === 0) return
        this.douyinVideoList = videoList
        this.showDouyinPlayer = true
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '播放失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    goEditProfile() {
      uni.navigateTo({ url: '/pages/user/setting' })
    },
    showEnterpriseInfo() {
      if (!this.userInfo.enterprise_name) return
      uni.showModal({
        title: '企业认证',
        content: this.userInfo.enterprise_name,
        showCancel: false,
        confirmText: '我知道了'
      })
    },

    openActionMenu() {
      this.showMenu = true
    },

    closeActionMenu() {
      this.showMenu = false
    },

    handleAction(type) {
      this.closeActionMenu()

      if (type === 'report') {
        uni.navigateTo({ url: `/pages/user/report?userId=${this.targetUserId}` })
        return
      }

      if (type === 'copy') {
        uni.setClipboardData({
          data: `${webBaseUrl}#/pages/user/profile?userId=${this.targetUserId}`,
          success: () => {
            uni.showToast({ title: '链接已复制', icon: 'none' })
          }
        })
      }
    },

    async refreshBlockState() {
      const my = uni.getStorageSync('userInfo')
      if (!my || this.isMe || !this.targetUserId) {
        this.blockedByMe = false
        this.blockedMe = false
        return
      }

      try {
        const res = await request(
          'message.php',
          {
            action: 'getChatProfile',
            targetId: this.targetUserId
          },
          'GET'
        )

        if (res.code === 0) {
          this.blockedByMe = !!res.data.blocked_by_me
          this.blockedMe = !!res.data.blocked_me
        }
      } catch (e) {}
    },

    async toggleBlock() {
      this.closeActionMenu()
      const my = uni.getStorageSync('userInfo')
      if (!my) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      if (this.isMe) return

      const willBlock = !this.blockedByMe

      try {
        const res = await request(
          'message.php',
          {
            action: 'setBlock',
            targetId: this.targetUserId,
            block: willBlock ? 1 : 0
          },
          'POST'
        )

        if (res.code === 0) {
          this.blockedByMe = willBlock

          if (willBlock) {
            this.canMessage = false
            this.messageReason = '你已拉黑该用户'
          } else {
            await this.fetchData()
          }

          await this.refreshBlockState()
          uni.showToast({ title: res.msg || '操作成功', icon: 'none' })
          return
        }

        uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e?.msg || '操作失败', icon: 'none' })
      }
    },

    handleChat() {
      const my = uni.getStorageSync('userInfo')
      if (!my) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      const targetId = this.targetUserId
      const name = this.userInfo.name || this.userInfo.username || '用户'
      const avatar = this.userInfo.avatar || this.defaultAvatar

      uni.navigateTo({
        url: `/pages/message/chat?targetId=${targetId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`,
        fail: () => {
          uni.showToast({ title: '打开聊天页失败', icon: 'none' })
        }
      })
    },

    async fetchData() {
      this.initialLoading = true
      this.list = []
      this.page = 1
      this.hasMore = true
      this.privateBlocked = false
      this.blockedByMe = false
      this.blockedMe = false
      this.canMessage = false
      this.messageReason = ''

      try {
        const res = await request('user.php', {
          action: 'profileHomeBundle',
          targetId: this.targetUserId
        })

        if (res.code === 0) {
          this.userInfo = res.data.userInfo || this.userInfo

          // 靓号兜底：后端 userPublic 若因 functions.php 版本旧未返回 is_fancy/display_number，
          // 则单独查该用户的靓号合并进来，保证别人查看主页也能看到靓号
          if (!this.userInfo.is_fancy && this.targetUserId) {
            try {
              const fr = await request('fancy.php', { action: 'user_number', targetId: this.targetUserId })
              if (fr.code === 0 && fr.data) {
                this.userInfo = Object.assign({}, this.userInfo, { is_fancy: parseInt(fr.data.is_fancy || 0), display_number: fr.data.display_number || '' })
              }
            } catch (e) {}
          }

          const followStatus = res.data.isFollowing
          this.isFollowing = followStatus === true || followStatus === 'true' || followStatus === 1 || followStatus === '1'

          this.privateBlocked = !!res.data.private_blocked
          this.canMessage = parseInt(res.data.canMessage) === 1
          this.messageReason = res.data.messageReason || ''

          this.list = (res.data.postList || []).map(item => this.normalizePostItem(item))
          this.hasMore = !!res.data.postHasMore
          this.page = parseInt(res.data.nextPage || (this.list.length > 0 ? 2 : 1))

          await this.refreshBlockState()
        } else {
          uni.showToast({ title: res.msg || '用户加载失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e?.msg || '用户加载失败', icon: 'none' })
      } finally {
        this.initialLoading = false
      }
    },

    async loadList() {
      if (this.loading || !this.hasMore) return
      if (parseInt(this.userInfo.is_private) === 1 || this.privateBlocked || this.userInfo.status == 0) return

      this.loading = true
      try {
        const res = await request('user.php', {
          action: 'getOtherUserPosts',
          targetId: this.targetUserId,
          page: this.page
        })

        if (res.code === 0) {
          const arr = (res.data || []).map(item => this.normalizePostItem(item))

          if (res.extra && res.extra.private_blocked) {
            this.privateBlocked = true
            this.list = []
            this.hasMore = false
            return
          }

          this.list = [...this.list, ...arr]
          this.hasMore = !!(res.extra ? res.extra.hasMore : arr.length >= 10)
          if (arr.length > 0) this.page++
        }
      } finally {
        this.loading = false
      }
    },

    async handleFollow() {
      if (this.userInfo.status == 0) {
        uni.showToast({ title: '用户已封禁', icon: 'none' })
        return
      }

      if (this.actionLock) return

      if (parseInt(this.userInfo.is_private) === 1 || this.privateBlocked) {
        uni.showToast({ title: '该账号已开启私密模式', icon: 'none' })
        return
      }

      this.actionLock = true

      try {
        const res = await request('user.php', {
          action: 'toggleFollow',
          targetId: this.targetUserId
        })

        if (res.code === 0) {
          const data = res.data || {}
          let newStatus = data.status
          if (typeof newStatus === 'undefined') {
            newStatus = data.following ? 'followed' : 'unfollowed'
          }

          if (newStatus === 'followed') {
            this.isFollowing = true
            this.userInfo.fans_count = parseInt(this.userInfo.fans_count || 0) + 1
            uni.showToast({ title: '关注成功', icon: 'none' })
          } else if (newStatus === 'unfollowed') {
            this.isFollowing = false
            this.userInfo.fans_count = Math.max(0, parseInt(this.userInfo.fans_count || 0) - 1)
            uni.showToast({ title: '已取消关注', icon: 'none' })
          }
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e?.msg || '网络请求失败', icon: 'none' })
      } finally {
        setTimeout(() => {
          this.actionLock = false
        }, 500)
      }
    },

    onScroll(e) {
      const top = e.detail.scrollTop
      const opacity = Math.min(top / 60, 1)
      // 立即响应：直接更新透明度，确保上滑时导航栏能即时淡出
      this.navOpacity = opacity
    },

    onReachBottom() {
      if (this.curTab === 0) {
        this.loadList()
      } else if (this.curTab === 1) {
        this.loadDyn()
      } else if (this.curTab === 2) {
        this.loadShop()
      }
    },

    switchTab(i) {
      if (this.curTab === i) return
      this.curTab = i
      if (i === 1 && this.dynList.length === 0) {
        this.loadDyn(true)
      } else if (i === 2 && this.shopList.length === 0) {
        this.loadShop(true)
      }
    },

    goShopDetail(id) {
      uni.navigateTo({ url: `/pages/market/detail?id=${id}` })
    },

    goDynDetail(id) {
      uni.navigateTo({ url: `/pages/dynamic/detail?id=${id}` })
    },

    formatDynTime(t) {
      if (!t) return ''
      // 后端返回 'YYYY-MM-DD HH:mm:ss'，去掉秒
      return t.length >= 16 ? t.substring(0, 16) : t
    },

    async loadDyn(reset = false) {
      if (this.dynLoading || (!this.dynHasMore && !reset)) return

      if (reset) {
        this.dynPage = 1
        this.dynList = []
        this.dynHasMore = true
      }

      this.dynLoading = true
      try {
        const res = await request('dynamic.php', {
          action: 'myList',
          target_user_id: this.targetUserId,
          page: this.dynPage,
          pageSize: 20
        }, 'GET')

        if (res.code === 0) {
          const arr = (res.data && res.data.list) || []
          this.dynList = [...this.dynList, ...arr]
          this.dynHasMore = arr.length >= 20
          if (arr.length > 0) this.dynPage++
        }
      } catch (e) {
        console.log('[profile] loadDyn error', e)
      } finally {
        this.dynLoading = false
      }
    },

    async loadShop(reset = false) {
      if (this.shopLoading || (!this.shopHasMore && !reset)) return

      if (reset) {
        this.shopPage = 1
        this.shopList = []
        this.shopHasMore = true
      }

      this.shopLoading = true
      try {
        const res = await request('market.php', {
          action: 'get_user_products',
          user_id: this.targetUserId,
          page: this.shopPage
        })

        if (res.code === 0) {
          const arr = (res.data && res.data.list) || []
          this.shopList = reset ? arr : [...this.shopList, ...arr]
          if (arr.length < 10) this.shopHasMore = false
          if (arr.length > 0) this.shopPage++
        }
      } catch (e) {
      } finally {
        this.shopLoading = false
      }
    },

    formatNum(n) {
      n = parseInt(n) || 0
      return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n
    },

    formatTime(time) {
      if (!time) return ''

      const date = new Date(String(time).replace(/-/g, '/'))
      const now = new Date()
      const diff = (now.getTime() - date.getTime()) / 1000

      if (diff < 60) return '刚刚'
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
      if (diff < 2592000) return Math.floor(diff / 86400) + '天前'

      const m = (date.getMonth() + 1).toString().padStart(2, '0')
      const d = date.getDate().toString().padStart(2, '0')
      return `${date.getFullYear()}-${m}-${d}`
    }
  }
}
</script>

<style scoped>
/* ==================== 关系系统（情侣 / 闺蜜 / 死党 / 自定义） ==================== */
.relation-lines {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}
.relation-line {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 18rpx 6rpx 6rpx;
  border-radius: 999rpx;
  background: rgba(255, 90, 140, .12);
  border: 1rpx solid rgba(255, 90, 140, .3);
}
.relation-ava {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
}
.relation-type {
  font-size: 22rpx;
  font-weight: 800;
  color: #ff4d79;
}
/* 还没有关系时的那条引导 */
.relation-line.ghost {
  background: rgba(0, 0, 0, .04);
  border-color: rgba(0, 0, 0, .06);
}
.relation-line.ghost .ghost-type { color: #999; }
.relation-line.ghost .relation-name { color: #aaa; }
.relation-name {
  font-size: 22rpx;
  color: var(--text-sub, #666);
  max-width: 220rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.relation-btn {
  background: linear-gradient(135deg, #ff6f9c, #ff4d79) !important;
  color: #fff !important;
}
/* 关系选择弹窗 */
.rel-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, .48);
  z-index: 999999;
  display: flex;
  align-items: flex-end;
}
.rel-sheet {
  width: 100%;
  box-sizing: border-box;
  max-height: 78vh;
  overflow-y: auto;
  background: var(--card-bg, #fff);
  border-radius: 28rpx 28rpx 0 0;
  padding: 36rpx 28rpx 44rpx;
}
.rel-sheet-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 800;
  color: var(--text-main, #222);
  margin-bottom: 26rpx;
}
.rel-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.rel-chip {
  padding: 14rpx 26rpx;
  border-radius: 999rpx;
  background: rgba(128, 128, 128, .12);
  color: var(--text-sub, #444);
  font-size: 26rpx;
}
.rel-chip.picked {
  background: linear-gradient(135deg, #ff6f9c, #ff4d79);
  color: #fff;
  font-weight: 700;
}
.rel-input {
  margin-top: 26rpx;
  height: 84rpx;
  padding: 0 26rpx;
  border-radius: 18rpx;
  background: rgba(128, 128, 128, .12);
  font-size: 27rpx;
  color: var(--text-main, #222);
}
.rel-input-ph {
  color: #aaa;
}
.rel-sheet-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}
.rel-sheet-btn {
  flex: 1;
  height: 86rpx;
  line-height: 86rpx;
  text-align: center;
  border-radius: 18rpx;
  font-size: 29rpx;
  font-weight: 700;
}
.rel-sheet-btn.cancel {
  background: rgba(128, 128, 128, .14);
  color: var(--text-sub, #555);
}
.rel-sheet-btn.ok {
  background: linear-gradient(135deg, #ff6f9c, #ff4d79);
  color: #fff;
}
.rel-sheet-btn.disabled {
  opacity: .6;
}

.page-container {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-main);
  transition: background-color 0.3s;
}

.init-loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #ffffff;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(128, 128, 128, 0.3);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.small {
  width: 32rpx;
  height: 32rpx;
  border-width: 3rpx;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  transition: background 0.1s;
  box-sizing: border-box;
}

.nav-content {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  box-sizing: border-box;
}

.nav-side {
  min-width: 88rpx;
  display: flex;
  align-items: center;
}

.nav-side-left {
  justify-content: flex-start;
}

.nav-side-right {
  justify-content: flex-end;
}

.nav-title {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
  font-size: 32rpx;
  font-weight: bold;
  opacity: 0;
  color: var(--text-main);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav-vip-icon {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.nav-vip-tag {
  font-size: 20rpx;
  background: var(--accent);
  color: #000;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 44rpx;
  height: 44rpx;
}

.main-scroll {
  height: 100vh;
  position: relative;
  z-index: 1;
}

.header-bg-box {
  width: 100%;
  height: 500rpx;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  pointer-events: none;
}

.header-image {
  width: 100%;
  height: 100%;
}

.header-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200rpx;
  background: linear-gradient(to bottom, transparent, var(--container-bg));
  pointer-events: none;
}

.profile-card {
  margin-top: 360rpx;
  position: relative;
  padding: 0 32rpx;
  z-index: 10;
  margin-bottom: 20rpx;
}

.profile-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24rpx;
}

.avatar-wrapper {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: var(--card-bg);
  padding: 6rpx;
  position: relative;
  overflow: visible;
}
/* 头像旁边"抱"着的那位：紧贴在我头像右侧、稍微压住一点。
   位置偏中间，避开右上角 VIP 王冠和右下角认证标；
   z-index 也压在认证标(5) / 在线点(6) 之下，保证认证小图标不被挡住。 */
.hug-wrap {
  position: absolute;
  left: 118rpx;
  bottom: 30rpx;
  display: flex;
  align-items: center;
  z-index: 4;
}
.hug-ava {
  width: 98rpx;
  height: 98rpx;
  border-radius: 50%;
  background: #eee;
  border: 5rpx solid #fff;
  box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, .14);
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #eee;
  display: block;
}

.avatar-frame {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  z-index: 2;
  pointer-events: none;
}

/* 认证图标：头像右下角圆形小徽标 企/实 */
/* 认证 V 标：头像右下角，跟 VIP 王冠(右上)位置错开 */
.avatar-auth-badge {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  border: 3rpx solid var(--card-bg);
  z-index: 5;
  box-shadow: 0 4rpx 14rpx rgba(0,0,0,0.22);
  background: #fff;
}

/* 在线状态: 左下角小圆点（右下角已被认证徽标占用，故放左下角） */
.avatar-online-dot {
  position: absolute;
  left: -4rpx;
  bottom: -4rpx;
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #c9ced6;
  border: 4rpx solid var(--card-bg);
  box-sizing: border-box;
  z-index: 6;
}

.avatar-online-dot.is-on {
  background: #22c55e;
  box-shadow: 0 0 0 2rpx rgba(34, 197, 94, 0.25);
}

.action-buttons {
  display: flex;
  gap: 16rpx;
  padding-bottom: 10rpx;
}

.btn {
  height: 64rpx;
  padding: 0 32rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.btn:active {
  opacity: 0.8;
}

.btn.primary {
  background: var(--accent);
  color: #fff;
  border: none;
}

.theme-dark .btn.primary {
  color: #000;
  background: linear-gradient(90deg, #D4AF37, #FDB931);
}

.btn.secondary {
  background: var(--btn-sec-bg);
  color: var(--btn-sec-text);
  border: 1px solid var(--border);
}

.btn.disabled {
  background: #eee;
  color: #999;
  border: none;
}

.btn-loading {
  opacity: 0.7;
  pointer-events: none;
}

.icon-btn {
  padding: 0;
  width: 64rpx;
}

.btn-icon {
  width: 36rpx;
  height: 36rpx;
}

.profile-info {
  margin-bottom: 40rpx;
}

.name-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.sub-info-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.user-name {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--text-main);
}

/* 性别图标 */
.gender-icon-only {
  width: 40rpx;
  height: 40rpx;
  margin-left: 10rpx;
  flex-shrink: 0;
}

/* IP属地 */
.ip-location-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.ip-location-icon {
  font-size: 22rpx;
  opacity: 0.7;
}
.ip-location-text {
  font-size: 22rpx;
  color: var(--text-sub);
  opacity: 0.8;
}

.fancy-text {
  color: #ff2442 !important;
  font-weight: 900 !important;
}

.vip-rainbow-text {
  background: linear-gradient(90deg, #ff2442, #ff7a00, #ffd400, #00c853, #00b0ff, #aa00ff, #ff2442);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: vipRainbowMove 4s linear infinite;
  font-weight: 900 !important;
}

@keyframes vipRainbowMove {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

/* 等级标签：渐变胶囊 + 星星 + Lv数字（参考B站等级体系） */
.level-tag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  padding: 4rpx 14rpx 4rpx 10rpx;
  min-height: 40rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
}
.level-tag .level-star-img {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}
/* 6 档等级配色 */
.lv-tier-1 { background: linear-gradient(135deg, #90a4ae 0%, #607d8b 100%); }
.lv-tier-2 { background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%); }
.lv-tier-3 { background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%); }
.lv-tier-4 { background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%); }
.lv-tier-5 { background: linear-gradient(135deg, #ffb74d 0%, #fb8c00 100%); }
.lv-tier-6 {
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 50%, #ee0979 100%);
  box-shadow: 0 2rpx 8rpx rgba(238, 9, 121, 0.35);
}

.lv-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

/* 徽章行：独立一行，防止与姓名/VIP/等级挤在一起出现重叠 */
.badges-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 8rpx;
  margin-bottom: 6rpx;
}

/* VIP 徽章：金红渐变胶囊 + 王冠 + VIP字样 + 流光动画（参考QQ会员风格） */
.vip-sole-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  border-radius: 22rpx;
}
/* 跟在名字后面的 VIP 缩小版，防止和等级/头衔挤成一团 */
.vip-sole-icon.vip-inline .vip-badge-inner {
  min-height: 32rpx;
  padding: 2rpx 12rpx 2rpx 8rpx;
  border-radius: 18rpx;
}
.vip-sole-icon.vip-inline .vip-badge-crown-img {
  width: 22rpx;
  height: 22rpx;
}
.vip-sole-icon.vip-inline .vip-badge-text {
  font-size: 20rpx;
}
.vip-sole-icon .vip-badge-inner {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  min-height: 40rpx;
  padding: 4rpx 16rpx 4rpx 10rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #ff5e3a 0%, #ff2a68 30%, #ffb300 65%, #ffd54f 100%);
  box-shadow: 0 2rpx 10rpx rgba(255, 46, 104, 0.5), inset 0 1rpx 0 rgba(255,255,255,0.4);
  border: 1rpx solid rgba(255, 220, 100, 0.7);
  position: relative;
  overflow: hidden;
}
.vip-sole-icon .vip-badge-inner::before {
  content: '';
  position: absolute;
  top: 0; left: -150%;
  width: 80%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%);
  transform: skewX(-25deg);
  animation: vipShine 3s ease-in-out infinite;
}
@keyframes vipShine {
  0% { left: -150%; }
  60% { left: 200%; }
  100% { left: 200%; }
}
.vip-sole-icon .vip-badge-crown-img {
  width: 26rpx;
  height: 26rpx;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1rpx 2rpx rgba(0,0,0,0.3));
}
.vip-sole-icon .vip-badge-text {
  font-size: 22rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 1rpx;
  line-height: 1;
  text-shadow: 0 1rpx 2rpx rgba(140, 30, 0, 0.6);
  position: relative;
  z-index: 1;
}

.uid-line {
  font-size: 22rpx;
  color: var(--text-sub);
  margin-bottom: 12rpx;
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

/* 靓号徽章：暗金底色 + 金色边框 + 王冠 + 靓字（参考QQ靓号图标风格） */
.fancy-badge-inline {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  background: linear-gradient(135deg, #1a1300 0%, #2e2200 40%, #1a1300 100%);
  border: 1rpx solid rgba(255, 200, 80, 0.55);
  padding: 5rpx 14rpx 5rpx 8rpx;
  border-radius: 22rpx;
  box-shadow: 0 2rpx 10rpx rgba(212, 175, 55, 0.28), inset 0 1rpx 0 rgba(255, 220, 80, 0.18);
  position: relative;
  overflow: hidden;
}
.fancy-badge-inline::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 215, 100, 0.25) 50%, transparent 100%);
  transform: skewX(-25deg);
  animation: fancyShine 4s ease-in-out infinite 1s;
}
@keyframes fancyShine {
  0% { left: -100%; }
  50% { left: 200%; }
  100% { left: 200%; }
}
.fbi-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 1;
  position: relative;
  z-index: 1;
}
.fbi-num {
  font-size: 22rpx;
  font-weight: 800;
  color: #ffd76b;
  letter-spacing: 1.5rpx;
  font-family: monospace;
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.5);
  position: relative;
  z-index: 1;
}

/* 靓号ID（普通号码显示）：暗金背景 + 金色文字（参考QQ靓号ID） */
.ordinary-num-inline {
  font-size: 22rpx;
  color: #b89035;
  font-weight: 600;
}

.auth-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

/* 认证图标：青蓝渐变胶囊 + 勾 */
.title-row {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  padding: 4rpx 14rpx 4rpx 10rpx;
  min-height: 40rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  color: #fff;
  box-shadow: 0 2rpx 6rpx rgba(79, 172, 254, 0.3);
}

.title-icon-img {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

.title-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 700;
}

/* 企业认证：青蓝渐变胶囊 + 企字图标 + 企业名（可见才显示）*/
.enterprise-auth-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 5rpx 14rpx 5rpx 10rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #00b8d9 0%, #1976d2 100%);
  border: 1rpx solid rgba(255,255,255,0.4);
  box-shadow: 0 2rpx 8rpx rgba(25, 118, 210, 0.3);
  color: #fff;
  flex-shrink: 0;
  cursor: pointer;
}
.enterprise-auth-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  color: #1976d2;
  font-size: 18rpx;
  font-weight: 900;
  line-height: 1;
  flex-shrink: 0;
}
.enterprise-auth-text {
  font-size: 22rpx;
  font-weight: 700;
  max-width: 260rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
}

/* 个人认证：绿渐变胶囊 + 实字图标 */
.personal-auth-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 5rpx 14rpx 5rpx 10rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  border: 1rpx solid rgba(255,255,255,0.4);
  box-shadow: 0 2rpx 8rpx rgba(39, 174, 96, 0.3);
  color: #fff;
  flex-shrink: 0;
}
.personal-auth-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  color: #27ae60;
  font-size: 18rpx;
  font-weight: 900;
  line-height: 1;
  flex-shrink: 0;
}
.personal-auth-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.bio-line {
  font-size: 28rpx;
  color: var(--text-main);
  line-height: 1.5;
  white-space: pre-wrap;
}

.stats-row {
  display: flex;
  gap: 40rpx;
}

/* 圈子版主标识 */
.moderator-circles-section {
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
  background: rgba(255,255,255,0.95);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
}
.mod-circles-header {
  margin-bottom: 20rpx;
}
.mod-circles-title-wrap {
  display: flex;
  align-items: center;
}
.mod-circles-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}
.mod-circles-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.mod-circles-count {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}
.mod-circles-scroll {
  width: 100%;
  white-space: nowrap;
}
.mod-circles-list {
  display: flex;
  gap: 16rpx;
  padding-right: 10rpx;
}
.mod-circle-card {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #f8f9ff 0%, #eef1ff 100%);
  border-radius: 16rpx;
  border: 1rpx solid #e0e5ff;
  flex-shrink: 0;
  min-width: 280rpx;
  position: relative;
}
.mod-circle-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
  margin-right: 16rpx;
}
.mod-circle-info {
  flex: 1;
  min-width: 0;
}
.mod-circle-name {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160rpx;
}
.mod-circle-meta {
  display: block;
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}
.mod-circle-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  font-size: 18rpx;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item .num {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--text-main);
}

.stat-item .label {
  font-size: 22rpx;
  color: var(--text-sub);
  margin-top: 2rpx;
}

.content-area {
  border-radius: 32rpx 32rpx 0 0;
  background-color: var(--container-bg);
  min-height: 500rpx;
  position: relative;
  z-index: 20;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.sticky-tabs {
  position: sticky;
  z-index: 100;
  display: flex;
  height: 88rpx;
  background-color: var(--container-bg);
  border-bottom: 1rpx solid var(--border);
}

.tab-item {
  padding: 0 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: var(--text-sub);
  position: relative;
  font-weight: 500;
}

.tab-item.active {
  color: var(--text-main);
  font-weight: bold;
  font-size: 30rpx;
}

.active-bar {
  position: absolute;
  bottom: 0;
  width: 32rpx;
  height: 4rpx;
  background: var(--accent);
  border-radius: 4rpx;
}

.list-container {
  padding: 24rpx;
  min-height: 400rpx;
  background-color: var(--container-bg);
}

.lock-view {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.lock-icon {
  width: 80rpx;
  height: 80rpx;
  opacity: 0.6;
}

.lock-text {
  color: var(--text-sub);
  font-size: 28rpx;
  font-weight: bold;
}

.ban-reason-text {
  color: #e03131;
  font-size: 24rpx;
  margin-top: 8rpx;
}

.ban-expire-text {
  color: #868e96;
  font-size: 24rpx;
  margin-top: 4rpx;
}

/* 被封禁提示横幅 */
.ban-notice-banner {
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #fff5f5, #fff);
  border: 2rpx solid #ffc9c9;
  border-radius: 16rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.ban-notice-icon {
  font-size: 40rpx;
  line-height: 1;
  flex-shrink: 0;
}

.ban-notice-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.ban-notice-title {
  color: #e03131;
  font-size: 30rpx;
  font-weight: bold;
}

.ban-notice-reason {
  color: #495057;
  font-size: 26rpx;
}

.ban-notice-expire {
  color: #868e96;
  font-size: 24rpx;
}

.ban-notice-tip {
  color: #adb5bd;
  font-size: 22rpx;
  margin-top: 4rpx;
}

.waterfall-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.card-item {
  width: 48.5%;
  background: var(--card-bg);
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
  position: relative;
}

.card-image-box {
  width: 100%;
  height: 340rpx;
  background: var(--border);
  position: relative;
}

.video-badge-img {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 40rpx;
  height: 40rpx;
  opacity: 0.9;
}

.card-douyin-wrap {
  position: relative;
  width: 100%;
  height: 340rpx;
}

.card-douyin-cover {
  width: 100%;
  height: 100%;
}

.card-douyin-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-douyin-play-icon {
  width: 0;
  height: 0;
  border-top: 16rpx solid transparent;
  border-bottom: 16rpx solid transparent;
  border-left: 24rpx solid #fff;
  margin-left: 4rpx;
}

.card-douyin-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.card-douyin-title {
  display: block;
  color: #fff;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-cover {
  width: 100%;
  height: 100%;
}
.card-cover-lock {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%);
}
.card-cover-lock-text {
  font-size: 28rpx;
  color: #6b7280;
  font-weight: 700;
  text-align: center;
  line-height: 1.4;
}

.card-info {
  padding: 20rpx 16rpx;
}

.card-title {
  font-size: 28rpx;
  color: var(--text-main);
  line-height: 1.4;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 500;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20rpx;
  color: var(--text-sub);
}

.meta-user {
  display: flex;
  align-items: center;
  gap: 8rpx;
  max-width: 65%;
}
.meta-avatar {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #eee;
}
.meta-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.meta-like {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.meta-stats {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.like-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 6rpx;
}

.text-cover-card {
  position: relative;
  width: 100%;
  height: 340rpx;
  overflow: hidden;
}
.text-cover-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 28rpx;
  box-sizing: border-box;
  text-align: center;
}
.text-cover-title {
  font-size: 36rpx;
  color: #fff;
  font-weight: 700;
  line-height: 1.4;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.text-cover-subtitle {
  margin-top: 14rpx;
  font-size: 26rpx;
  color: rgba(255,255,255,0.92);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.text-cover-lock {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: rgba(0,0,0,0.5);
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lock-text-icon {
  width: 24rpx;
  height: 24rpx;
}

.empty-box {
  padding-top: 100rpx;
  text-align: center;
}

.empty-text {
  color: var(--text-sub);
  font-size: 26rpx;
}

.loading-more {
  padding: 30rpx 0;
  text-align: center;
  display: flex;
  justify-content: center;
}

.no-more {
  color: var(--text-sub);
  font-size: 22rpx;
}

.sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.sheet-mask.show {
  opacity: 1;
  visibility: visible;
}

.sheet-panel {
  width: 100%;
  background: #f8f8f8;
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.3s;
}

.sheet-mask.show .sheet-panel {
  transform: translateY(0);
}

.sheet-opt {
  background: #fff;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #333;
  border-bottom: 1rpx solid #eee;
}

.sheet-opt:active {
  background: #f0f0f0;
}

.sheet-opt.warning {
  color: #ff2442;
}

.sheet-gap {
  height: 12rpx;
  background: #f8f8f8;
}

.sheet-opt.cancel {
  border-bottom: none;
  font-weight: 600;
}

.shop-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: var(--container-bg);
}

/* 动态列表 */
.dyn-list {
  padding: 20rpx 24rpx;
  background: var(--container-bg);
}
.dyn-item {
  background: var(--card-bg);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid var(--border);
}
.dyn-item:active { opacity: 0.85; }
.dyn-content {
  font-size: 28rpx;
  color: var(--text-main);
  line-height: 1.6;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dyn-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.dyn-img {
  width: calc(33.33% - 6rpx);
  height: 200rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
}
.dyn-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dyn-time {
  font-size: 24rpx;
  color: var(--text-sub);
}
.dyn-stats {
  display: flex;
  gap: 24rpx;
}
.dyn-stat {
  font-size: 24rpx;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.dyn-stat-icon {
  width: 24rpx;
  height: 24rpx;
}

.shop-card {
  width: calc(50% - 8rpx);
  background: var(--card-bg);
  border-radius: 14rpx;
  overflow: hidden;
  border: 1rpx solid var(--border);
}

.shop-card:active {
  opacity: 0.85;
}

.shop-img {
  width: 100%;
  height: 220rpx;
  display: block;
  background: #eee;
}

.shop-info {
  padding: 14rpx 16rpx 16rpx;
}

.shop-title {
  font-size: 24rpx;
  color: var(--text-main);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  margin-bottom: 12rpx;
  display: block;
}

.shop-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shop-price {
  font-size: 28rpx;
  font-weight: 800;
  color: #ff2f00;
}

.shop-type-tag {
  font-size: 18rpx;
  padding: 3rpx 10rpx;
  border-radius: 4rpx;
  font-weight: 500;
}

.shop-type-tag.physical {
  background: #eaf3ff;
  color: #1677ff;
}

.shop-type-tag.virtual {
  background: #fff4e5;
  color: #ff6900;
}
</style>
