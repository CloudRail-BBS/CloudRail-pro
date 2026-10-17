<template>
  <view class="members-page" :class="themeClass">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">{{ pageTitle }}</text>
      <view class="nav-right">
        <text class="count-text">{{ totalCount }} 人</text>
      </view>
    </view>

    <scroll-view class="main-scroll" scroll-y @scrolltolower="loadMore">
      <view class="member-list" v-if="list.length > 0">
        <view class="member-item" v-for="(item, idx) in list" :key="item.uid || idx" @click="goUserProfile(item)">
          <view class="member-avatar-box">
            <image :src="item.avatar || '/static/default-avatar.png'" class="member-avatar" mode="aspectFill"></image>
            <image v-if="item.frame_img" :src="item.frame_img" class="member-frame" mode="aspectFit"></image>
            <text class="moderator-mark" v-if="item.is_moderator">版</text>
          </view>
          <view class="member-info">
            <view class="member-name-row">
              <text class="member-name">{{ item.name || item.nickname || item.username || '用户' }}</text>
              <text class="auth-badge" v-if="item.auth_badge_label">{{ item.auth_badge_label }}</text>
              <text class="vip-badge" v-if="item.is_vip == 1 || item.vip == 1">VIP</text>
            </view>
            <text class="member-uid">UID: {{ item.uid || item.id }}</text>
            <text class="member-bio" v-if="item.bio || item.personal_signature">{{ item.bio || item.personal_signature }}</text>
          </view>
          <view class="member-right">
            <text class="member-level" v-if="item.level || item.lv">Lv.{{ item.level || item.lv }}</text>
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="list.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-globe-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无{{ type === 'moderators' ? '版主' : '成员' }}</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import { getScreenMetrics } from '../../common/screen.js';
import { request } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      circleId: 0,
      circleName: '',
      type: 'members', // members | moderators
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      totalCount: 0
    };
  },
  computed: {
    pageTitle() {
      if (this.type === 'moderators') return '圈子版主';
      return '圈子成员';
    }
  },
  onLoad(opt) {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.circleId = parseInt(opt.id || opt.circle_id || 0);
    this.circleName = decodeURIComponent(opt.name || '');
    this.type = opt.type || 'members';
    this.loadData(true);
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    async loadData(refresh = false) {
      if (this.loading) return;
      if (refresh) {
        this.page = 1;
        this.list = [];
        this.hasMore = true;
      }
      if (!this.hasMore) return;

      this.loading = true;
      try {
        let res;
        if (this.type === 'moderators') {
          // 获取版主列表
          res = await request('circle.php', {
            action: 'get_circle_moderators',
            circle_id: this.circleId
          });
          if (res.code === 0 && res.data) {
            const modList = res.data.list || res.data || [];
            this.list = modList.map(m => ({
              ...m,
              uid: m.uid || m.user_id || m.id,
              id: m.uid || m.user_id || m.id,
              name: m.nickname || m.name || m.username || '版主',
              is_moderator: true
            }));
            this.totalCount = this.list.length;
            this.hasMore = false;
          }
        } else {
          // 获取成员列表
          res = await request('circle.php', {
            action: 'getMembers',
            circle_id: this.circleId,
            limit: 50,
            page: this.page
          });
          if (res.code === 0 && res.data) {
            const dataList = Array.isArray(res.data) ? res.data : (res.data.list || []);
            if (refresh) {
              this.list = dataList;
            } else {
              this.list = [...this.list, ...dataList];
            }
            this.totalCount = this.list.length;
            this.hasMore = dataList.length >= 50;
            this.page++;
          }
        }
      } catch (e) {
        console.log('加载列表失败', e);
      }
      this.loading = false;
    },
    loadMore() {
      if (this.type === 'moderators') return;
      this.loadData(false);
    },
    goUserProfile(user) {
      const uid = user.uid || user.id;
      if (!uid) return;
      uni.navigateTo({
        url: `/pages/user/profile?userId=${uid}`
      });
    }
  }
};
</script>

<style scoped>
.members-page {
  min-height: 100vh;
  background: var(--cr-canvas);
}

.status-bar-placeholder {
  width: 100%;
  background: var(--cr-surface);
}

.nav-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  background: var(--cr-surface);
  padding: 0 24rpx;
  border-bottom: 1rpx solid var(--cr-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: var(--cr-text);
  font-weight: bold;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--cr-text);
}

.nav-right {
  width: 120rpx;
  text-align: right;
}

.count-text {
  font-size: 24rpx;
  color: var(--cr-text-muted);
}

.main-scroll {
  height: calc(100vh - 88rpx);
}

.member-list {
  padding: 20rpx 24rpx;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: var(--cr-surface);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}

.member-avatar-box {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.member-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #eee;
}

.member-frame {
  position: absolute;
  inset: -18%;
  width: 136%;
  height: 136%;
  pointer-events: none;
}

.moderator-mark {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 36rpx;
  height: 36rpx;
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  color: #fff;
  font-size: 20rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 2rpx solid #fff;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}

.member-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--cr-text);
  max-width: 300rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-badge {
  font-size: 20rpx;
  color: #fff;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.vip-badge {
  font-size: 20rpx;
  color: #fff;
  background: linear-gradient(135deg, #f6d365, #fda085);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.member-uid {
  font-size: 22rpx;
  color: var(--cr-text-muted);
  display: block;
  margin-bottom: 4rpx;
}

.member-bio {
  font-size: 24rpx;
  color: var(--cr-text-muted);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400rpx;
}

.member-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.member-level {
  font-size: 22rpx;
  color: #ff9500;
  background: #fff7e6;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.arrow-icon {
  font-size: 36rpx;
  color: var(--cr-border-strong);
}

.load-more {
  padding: 30rpx;
  text-align: center;
}

.load-btn {
  display: inline-block;
  padding: 16rpx 48rpx;
  background: var(--cr-surface);
  border-radius: 30rpx;
  font-size: 26rpx;
  color: var(--cr-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon-img {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: var(--cr-text-muted);
}

.footer-space {
  height: 60rpx;
}
</style>
