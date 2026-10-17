<template>
  <view class="follows-page" :class="themeClass">
    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: navBarHeight + 'px' }">
        <view class="nav-back" @click="goBack" :style="{ top: (statusBarHeight + (navBarHeight-32)/2) + 'px' }">
            <image src="/static/icon/arrow-left-dark.svg" class="back-icon" mode="aspectFit"></image>
        </view>
        <view class="nav-title">我的关注</view>
    </view>
    <view class="list-container" :style="{ paddingTop: navTotalHeight + 'px' }">
        
        <block v-if="userList.length > 0">
            <view class="user-item" v-for="(u, idx) in userList" :key="idx" @click="goUserProfile(u)">
                <view class="avatar-box">
                    <image :src="u.avatar || defaultAvatar" class="u-avatar" mode="aspectFill"></image>
                    <image v-if="u.current_frame_img" :src="u.current_frame_img" class="u-frame" mode="aspectFit"></image>
                </view>

                <view class="u-info">
                    <view class="u-top-row">
                        <text class="u-nickname">{{ u.name || u.username }}</text>
                        <view class="title-tag" v-if="u.user_title">{{ u.user_title }}</view>
                    </view>
                    <view class="u-sub-row">
                        <view v-if="u.is_fancy == 1" class="fancy-num"><image src="/static/icon/star-gold.svg" class="fancy-star" mode="aspectFit"></image><text style="color:#f59e0b;font-weight:700;">{{ u.display_number }}</text></view>
                        <text v-else-if="u.display_number" style="color:#aaa;">{{ u.display_number }}</text>
                        <text class="divider">|</text>
                        <text>粉丝 {{ u.fans_count || 0 }}</text>
                    </view>
             
                </view>

                <view class="action-btn" v-if="!u.is_deleted" @click.stop="handleToggle(u, idx)">
                    <view class="btn-inner" :class="u.is_following ? (u.is_followed_by ? 'btn-mutual' : 'btn-gray') : (u.is_followed_by ? 'btn-back' : 'btn-red')">
                        {{ u.is_following ? (u.is_followed_by ? '互相关注' : '已关注') : (u.is_followed_by ? '回关' : '关注') }}
                    </view>
                </view>
            </view>
            
            <view class="loading-state" v-if="loading">
                <view class="loading-circle"></view>
            </view>
            <view class="no-more" v-if="!hasMore && userList.length > 0">
                <text>- END -</text>
            </view>
        </block>

        <view class="empty-holder" v-else-if="!loading">
            <text class="emp-txt">暂无关注的人</text>
        </view>

    </view>

  </view>
</template>

<script>
import { request } from '../../common/request.js';
import { applyH5ViewportHeightVar, getScreenMetrics } from '../../common/screen.js';

export default {
    data() {
        return {
            statusBarHeight: 0, navBarHeight: 44, navTotalHeight: 44,
            userId: 0,
            userList: [],
            page: 1,
            hasMore: true,
            loading: false,
            defaultAvatar: '/static/icon/default_avatar.png'
        }
    },
    onLoad(opt = {}) {
        applyH5ViewportHeightVar();
        const metrics = getScreenMetrics();
        const userInfo = uni.getStorageSync('userInfo') || {};
        this.userId = Number(opt.userId || userInfo.id || 0);
        this.statusBarHeight = metrics.statusBarHeight;
        this.navBarHeight = metrics.navBarHeight;
        this.navTotalHeight = this.statusBarHeight + this.navBarHeight;
        this.fetchList();
    },
    onReachBottom() {
        this.fetchList();
    },
    methods: {
        goBack() { uni.navigateBack(); },
        
        async fetchList() {
            if (this.loading || !this.hasMore) return;
            this.loading = true;
            try {
                const res = await request('user.php', { 
                    action: 'getMyFollows', 
                    userId: this.userId,
                    page: this.page 
                });
                if (res.code === 0) {
                    const arr = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.list) ? res.data.list : []);
                    this.userList = [...this.userList, ...arr];
                    if (arr.length < 20) this.hasMore = false;
                    else this.page++;
                } else {
                    uni.showToast({ title: res.msg || '关注列表获取失败', icon: 'none' });
                }
            } catch (e) {
                const msg = e && e.msg ? e.msg : '关注列表获取失败';
                uni.showToast({ title: msg, icon: 'none' });
                if (e && e.code === -2) {
                    setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 600);
                }
            } finally {
                this.loading = false;
            }
        },

        async handleToggle(item, index) {
            const originalState = item.is_following;
            item.is_following = !originalState;
            
            try {
                const res = await request('user.php', {
                    action: 'toggleFollow',
                    targetId: item.id
                });
                if (res.code !== 0) {
                    item.is_following = originalState;
                    uni.showToast({title: res.msg, icon:'none'});
                }
            } catch(e) {
                item.is_following = originalState;
            }
        },

        goUserProfile(user) {
            if (!user || user.is_deleted) {
                uni.showToast({ title: '该用户已注销或不存在', icon: 'none' });
                return;
            }
            uni.navigateTo({ url: `/pages/user/profile?userId=${user.id}` }); 
        }
    }
}
</script>

<style scoped>
.follows-page { min-height: var(--tcy-vh, 100vh); background: var(--cr-surface); }
.custom-nav-bar { position: fixed; top: 0; left: 0; width: 100%; z-index: 999; display: flex; align-items: center; justify-content: center; background: var(--cr-surface); border-bottom: 1rpx solid #f7f7f7; }
.nav-title { font-size: 32rpx; font-weight: bold; color: var(--cr-text); }
.nav-back { position: fixed; left: 24rpx; z-index: 1000; width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.back-icon { font-size: 36rpx; color: var(--cr-text); font-weight: bold; padding-bottom: 4rpx; }

.list-container { padding-bottom: 40rpx; }
.user-item { display: flex; align-items: center; padding: 24rpx 30rpx; border-bottom: 1rpx solid #f9f9f9; }

.avatar-box { position: relative; width: 100rpx; height: 100rpx; margin-right: 24rpx; flex-shrink: 0; }
.u-avatar { width: 100%; height: 100%; border-radius: 50%; border: 1rpx solid var(--cr-border); }
.u-frame { position: absolute; width: 130%; height: 130%; top: -15%; left: -15%; pointer-events: none; }

.u-info { flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden; margin-right: 20rpx; }
.u-top-row { display: flex; align-items: center; margin-bottom: 6rpx; }
.u-nickname { font-size: 30rpx; font-weight: 600; color: var(--cr-text); margin-right: 12rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 260rpx; }

.title-tag {
    font-size: 18rpx;
    color: #ffeae9;
    background: linear-gradient(90deg, #473f26 0%, #ffeefa 100%);
    padding: 2rpx 10rpx;
    border-radius: 20rpx;
    margin-right: 12rpx;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28rpx;
    box-shadow: 0 2rpx 4rpx rgba(246, 211, 101, 0.2);
}

.u-sub-row { font-size: 24rpx; color: var(--cr-text-muted); margin-bottom: 8rpx; display: flex; align-items: center; }
.divider { margin: 0 10rpx; font-size: 20rpx; color: #ddd; }
.u-bio { font-size: 24rpx; color: var(--cr-text-muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.action-btn { flex-shrink: 0; }
.btn-inner { width: 140rpx; height: 56rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 600; transition: all 0.2s; }
.btn-red { background: #ff2442; color: #fff; }
.btn-gray { background: var(--cr-surface-alt); color: #999; border: 1rpx solid var(--cr-border); }
.btn-mutual { background: #e8f5e9; color: #4caf50; border: 1rpx solid #c8e6c9; }
.btn-back { background: var(--cr-surface); color: #ff2442; border: 2rpx solid #ff2442; }
.btn-inner:active { transform: scale(0.95); opacity: 0.8; }

.empty-holder { padding-top: 200rpx; display: flex; flex-direction: column; align-items: center; color: var(--cr-border-strong); }
.emp-emoji { font-size: 80rpx; margin-bottom: 20rpx; opacity: 0.6; }
.emp-txt { font-size: 28rpx; color: var(--cr-text-muted); }

.loading-state { padding: 30rpx; display: flex; justify-content: center; }
.loading-circle { width: 36rpx; height: 36rpx; border: 4rpx solid var(--cr-border); border-top-color: #ff2442; border-radius: 50%; animation: rotate 0.8s linear infinite; }
.no-more { text-align: center; color: var(--cr-border-strong); font-size: 24rpx; padding: 30rpx; }
@keyframes rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.fancy-num {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.fancy-star {
  width: 24rpx;
  height: 24rpx;
}
.divider {
  margin: 0 12rpx;
  color: #ddd;
}
</style>
