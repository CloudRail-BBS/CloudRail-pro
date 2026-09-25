<template>
  <view class="mr-page">
    <!-- 固定顶部: 导航 + 筛选 -->
    <view class="nav-fixed" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-icon" @click="goBack">
          <image src="/static/icon/arrow-left-dark.svg" class="nav-icon-img" mode="aspectFit"></image>
        </view>
        <view class="nav-title">我的举报</view>
        <view class="nav-icon"></view>
      </view>
      <view class="tab-bar">
        <view
          class="tab-item"
          v-for="tab in tabs"
          :key="tab.value"
          :class="{ active: activeTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          <text class="tab-label">{{ tab.label }}</text>
          <view class="tab-badge" v-if="tab.count > 0">{{ tab.count }}</view>
        </view>
      </view>
    </view>
    <view class="nav-holder" :style="{ height: (statusBarHeight + 44 + 88) + 'px' }"></view>

    <view class="list-wrap">
      <view class="report-card" v-for="item in list" :key="item.id">
        <view class="card-head">
          <view class="type-tag" :class="typeClass(item.target_type)">{{ item.target_type_name || typeName(item.target_type) }}</view>
          <view class="status-tag" :class="statusClass(item.status)">{{ item.status_text || statusText(item.status) }}</view>
        </view>

        <view class="target-name">{{ item.target_name || ('内容ID:' + item.target_id) }}</view>

        <view class="line">
          <text class="line-label">举报原因：</text>
          <text class="line-value">{{ item.reason || '无' }}</text>
        </view>

        <view class="line result-line" v-if="item.result">
          <text class="line-label result-label">处理结果：</text>
          <text class="line-value result-value">{{ item.result }}</text>
        </view>
        <view class="line result-line" v-else-if="Number(item.status) === 0">
          <text class="line-label result-label">处理结果：</text>
          <text class="line-value pending-value">管理员正在核实处理中</text>
        </view>

        <!-- 管理员客服回复 -->
        <view class="reply-box" v-if="item.reply">
          <view class="reply-head">
            <text class="reply-title">管理员回复</text>
            <text class="reply-time" v-if="item.reply_at">{{ item.reply_at }}</text>
          </view>
          <text class="reply-text">{{ item.reply }}</text>
        </view>

        <view class="card-foot">
          <text class="time-text">{{ item.time_ago || item.create_time }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="!loading && list.length === 0">
        <text class="empty-title">还没有举报记录</text>
        <text class="empty-tip">发现违规内容时可在帖子、评论或用户主页点击举报</text>
      </view>

      <view class="foot-tip" v-if="loading">
        <view class="mini-spinner"></view>
        <text class="foot-text">加载中...</text>
      </view>
      <view class="foot-tip" v-else-if="list.length > 0 && !hasMore">
        <text class="foot-text">没有更多了</text>
      </view>
    </view>

    <view class="hud-mask" v-if="hud.show" @touchmove.stop.prevent>
      <view class="hud-box">
        <view class="hud-spinner" v-if="hud.type === 'loading'"></view>
        <text class="hud-text">{{ hud.text }}</text>
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
      activeTab: 'all',
      tabs: [
        { value: 'all', label: '全部', count: 0 },
        { value: 'pending', label: '处理中', count: 0 },
        { value: 'handled', label: '已处理', count: 0 },
      ],
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadList(true);
  },
  onShow() {
    if (this.loaded) this.loadList(true);
    this.loaded = true;
  },
  onReachBottom() {
    this.loadList(false);
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    switchTab(value) {
      if (this.activeTab === value) return;
      this.activeTab = value;
      this.loadList(true);
    },
    typeName(type) {
      const map = { post: '帖子', user: '用户', moment: '动态', comment: '评论' };
      return map[type] || '内容';
    },
    typeClass(type) {
      const map = { post: 'post', user: 'user', moment: 'moment', comment: 'comment' };
      return map[type] || 'post';
    },
    statusText(status) {
      const s = Number(status);
      if (s === 0) return '处理中';
      if (s === 2) return '已忽略';
      return '已处理';
    },
    statusClass(status) {
      return Number(status) === 0 ? 'pending' : 'handled';
    },
    async loadList(refresh) {
      if (this.loading) return;
      if (!refresh && !this.hasMore) return;
      if (refresh) {
        this.page = 1;
        this.list = [];
        this.hasMore = true;
      }
      this.loading = true;
      try {
        const res = await request('report.php', {
          action: 'my',
          page: this.page,
          status: this.activeTab
        }, { method: 'GET' });

        if (res && (res.code === 0 || res.status === 'success') && res.data) {
          const pageList = res.data.list || [];
          this.list = refresh ? pageList : this.list.concat(pageList);
          if (pageList.length < 20) this.hasMore = false;
          this.page++;
          this.tabs[0].count = res.data.total || 0;
          this.tabs[1].count = res.data.pending_count || 0;
          this.tabs[2].count = res.data.handled_count || 0;
        } else {
          uni.showToast({ title: (res && res.msg) || '加载失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '网络请求失败', icon: 'none' });
      }
      this.loading = false;
    }
  }
};
</script>

<style scoped>
.mr-page { min-height: 100vh; background: #f5f6fa; }

/* 固定头部 */
.nav-fixed { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04); }
.nav-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.nav-title { font-size: 33rpx; font-weight: 700; color: #222; }
.nav-icon { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon-img { width: 38rpx; height: 38rpx; }

.tab-bar { display: flex; border-top: 1rpx solid #f5f5f7; }
.tab-item { flex: 1; padding: 20rpx 0; display: flex; align-items: center; justify-content: center; position: relative; }
.tab-label { font-size: 28rpx; color: #999; }
.tab-item.active .tab-label { color: #FF2442; font-weight: 700; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 44rpx; height: 5rpx; background: #FF2442; border-radius: 4rpx; }
.tab-badge { margin-left: 8rpx; min-width: 30rpx; height: 30rpx; line-height: 30rpx; text-align: center; padding: 0 8rpx; background: #FF2442; color: #fff; font-size: 20rpx; border-radius: 15rpx; }

.list-wrap { padding: 20rpx 24rpx calc(40rpx + env(safe-area-inset-bottom)); }
.report-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 18rpx; box-shadow: 0 2rpx 14rpx rgba(0,0,0,0.03); }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.type-tag { padding: 4rpx 16rpx; border-radius: 20rpx; font-size: 22rpx; font-weight: 600; background: #fff0f2; color: #FF2442; }
.type-tag.user { background: #eef4ff; color: #2f6fed; }
.type-tag.moment { background: #f3f0ff; color: #7a5af8; }
.type-tag.comment { background: #f0f9f2; color: #27ae60; }
.status-tag { padding: 4rpx 16rpx; border-radius: 20rpx; font-size: 22rpx; font-weight: 500; }
.status-tag.pending { background: #fff7e8; color: #e67e22; }
.status-tag.handled { background: #eef9f0; color: #27ae60; }

.target-name { font-size: 29rpx; font-weight: 600; color: #222; line-height: 1.45; margin-bottom: 12rpx; word-break: break-all; }
.line { display: flex; margin-bottom: 8rpx; }
.line-label { font-size: 25rpx; color: #aaa; flex-shrink: 0; }
.line-value { font-size: 25rpx; color: #666; flex: 1; line-height: 1.5; word-break: break-all; }
.result-line .result-label { color: #27ae60; }
.result-line .result-value { color: #27ae60; font-weight: 500; }
.result-line .pending-value { color: #e67e22; }

.card-foot { margin-top: 14rpx; padding-top: 14rpx; border-top: 1rpx solid #f5f6fa; }
.time-text { font-size: 23rpx; color: #bbb; }

/* 管理员客服回复 */
.reply-box { margin-top: 16rpx; padding: 16rpx 18rpx; background: #f2f6ff; border-left: 6rpx solid #2f6fed; border-radius: 12rpx; }
.reply-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.reply-title { font-size: 24rpx; color: #2f6fed; font-weight: 700; }
.reply-time { font-size: 21rpx; color: #9bb2e0; }
.reply-text { font-size: 25rpx; color: #37507f; line-height: 1.6; word-break: break-all; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 60rpx 0; }
.empty-title { font-size: 29rpx; color: #999; margin-bottom: 14rpx; }
.empty-tip { font-size: 24rpx; color: #c8c8c8; text-align: center; line-height: 1.6; }
.foot-tip { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 0 10rpx; }
.foot-text { font-size: 24rpx; color: #bbb; }
.mini-spinner { width: 26rpx; height: 26rpx; border: 3rpx solid #e5e5e5; border-top-color: #FF2442; border-radius: 50%; animation: mr-spin 0.8s linear infinite; }
@keyframes mr-spin { to { transform: rotate(360deg); } }

.hud-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center; }
.hud-box { min-width: 220rpx; padding: 40rpx 30rpx; background: rgba(0,0,0,0.75); border-radius: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hud-spinner { width: 56rpx; height: 56rpx; border: 5rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: mr-spin 0.8s linear infinite; margin-bottom: 18rpx; }
.hud-text { font-size: 27rpx; color: #fff; }
</style>
