<template>
  <view class="users-page">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-wrap">
          <image class="search-icon-img" src="/static/icon/admin-search-999.svg" mode="aspectFit" />
          <input class="search-input" type="text" v-model="searchKeyword" placeholder="搜索用户名、昵称或ID" @confirm="doSearch" />
        </view>
        <view class="search-action" @click="doSearch">搜索</view>
      </view>

      <!-- 统计概览 -->
      <view class="stats-row">
        <view class="stat-box">
          <text class="stat-val">{{ stats.total }}</text>
          <text class="stat-lbl">总用户</text>
        </view>
        <view class="stat-box">
          <text class="stat-val accent-green">{{ stats.today }}</text>
          <text class="stat-lbl">今日新增</text>
        </view>
        <view class="stat-box">
          <text class="stat-val accent-red">{{ stats.banned }}</text>
          <text class="stat-lbl">已封禁</text>
        </view>
      </view>

      <!-- 筛选标签 -->
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-items">
          <view class="filter-item" :class="{ active: currentFilter === 'all' }" @click="setFilter('all')">全部</view>
          <view class="filter-item" :class="{ active: currentFilter === 'normal' }" @click="setFilter('normal')">正常用户</view>
          <view class="filter-item" :class="{ active: currentFilter === 'banned' }" @click="setFilter('banned')">已封禁</view>
          <view class="filter-item" :class="{ active: currentFilter === 'vip' }" @click="setFilter('vip')">VIP用户</view>
        </view>
      </scroll-view>

      <!-- 用户列表 -->
      <view class="user-list">
        <view class="uc-card" v-for="item in userList" :key="item.id">
          <view class="uc-row">
            <view class="uc-left">
              <image class="uc-avatar" :src="item.avatar || '/static/logo.png'" mode="aspectFill" />
              <view class="uc-body">
                <view class="uc-header">
                  <text class="uc-name">{{ item.nickname || item.username }}</text>
                  <view class="uc-badges">
                    <text v-if="item.vip === 1" class="badge vip">VIP</text>
                    <text v-if="item.is_admin === 2" class="badge super">超管</text>
                    <text v-else-if="item.is_admin === 1" class="badge admin">管理员</text>
                  </view>
                </view>
                <view class="uc-meta">
                  <text>ID {{ item.id }}</text>
                  <text class="sep">·</text>
                  <text>Lv.{{ item.lv || 0 }}</text>
                  <text class="sep">·</text>
                  <text>{{ item.jifen || 0 }}积分</text>
                </view>
                <view class="uc-meta uc-ip">
                  <text class="uc-ip-city">IP属地：{{ item.ip_location || item.register_city || '未知' }}</text>
                  <text v-if="item.register_ip" class="uc-ip-addr">{{ item.register_ip }}</text>
                </view>
                <text class="uc-time">{{ formatTime(item.created_at) }} 注册</text>
              </view>
            </view>
            <view class="uc-actions" @click.stop>
              <view
                class="ua-btn edit"
                :class="{ disabled: item.is_admin >= 1 }"
                @click="item.is_admin >= 1 || editUser(item.id)"
              >{{ item.is_admin >= 1 ? '管理员' : '编辑' }}</view>
              <view
                v-if="item.status === 1"
                class="ua-btn ban"
                :class="{ disabled: item.is_admin >= 1 }"
                @click="item.is_admin >= 1 || banUser(item.id)"
              >{{ item.is_admin >= 1 ? '-' : '封禁' }}</view>
              <view
                v-if="item.status === 0"
                class="ua-btn unban"
                :class="{ disabled: item.is_admin >= 1 }"
                @click="item.is_admin >= 1 || unbanUser(item.id)"
              >{{ item.is_admin >= 1 ? '-' : '解封' }}</view>
              <view
                class="ua-btn vip-btn"
                :class="{ disabled: item.is_admin >= 1 }"
                @click="item.is_admin >= 1 || toggleVIP(item.id, item.vip)"
              >{{ item.is_admin >= 1 ? '-' : (parseInt(item.vip) === 1 ? '取消VIP' : '赠VIP') }}</view>
            </view>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore"><text>{{ loading ? '加载中...' : '加载更多' }}</text></view>
      </view>

      <view class="empty-state" v-if="userList.length === 0 && !loading">
        <view class="empty-emoji-img-wrap"><image class="empty-emoji-img" src="/static/icon/admin-users-ccc.svg" mode="aspectFit" /></view>
        <text class="empty-text">暂无用户数据</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- VIP 弹窗 -->
    <view class="modal-mask" v-if="showVipModal" @click="closeVipModal">
      <view class="vm-content" @click.stop>
        <view class="vm-head">
          <text class="vm-title">赠送VIP</text>
          <text class="vm-close" @click="closeVipModal">×</text>
        </view>
        <view class="vm-body">
          <view class="vm-grid">
            <view
              v-for="d in vipDurations" :key="d.value"
              class="vm-item" :class="{ active: selectedVipDuration === d.value }"
              @click="selectedVipDuration = d.value"
            >
              <text class="vm-label">{{ d.label }}</text>
              <text class="vm-desc">{{ d.desc }}</text>
            </view>
          </view>
          <text class="vm-tip">选择"永久"则不设置过期时间</text>
        </view>
        <view class="vm-foot">
          <view class="vm-btn cancel" @click="closeVipModal">取消</view>
          <view class="vm-btn confirm" @click="confirmVip">确定赠送</view>
        </view>
      </view>
    </view>

    <!-- HUD -->
    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request, bmsBaseUrl } from '../../common/request.js';
import { getScreenMetrics } from '../../common/screen.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      searchKeyword: '',
      currentFilter: 'all',
      userList: [],
      page: 1,
      hasMore: true,
      loading: false,
      stats: { total: 0, today: 0, banned: 0 },
      hud: { show: false, type: 'loading', text: '' },
      showVipModal: false,
      currentVipUserId: null,
      selectedVipDuration: 0,
      vipDurations: [
        { value: 0, label: '永久', desc: '不限时间' },
        { value: 7, label: '7天', desc: '一周' },
        { value: 30, label: '30天', desc: '一个月' },
        { value: 90, label: '90天', desc: '三个月' },
        { value: 180, label: '180天', desc: '半年' },
        { value: 365, label: '365天', desc: '一年' }
      ]
    };
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadUsers();
  },
  methods: {
    goBack() { uni.navigateBack(); },
    setFilter(filter) { this.currentFilter = filter; this.userList = []; this.page = 1; this.hasMore = true; this.loadUsers(); },
    doSearch() { this.userList = []; this.page = 1; this.hasMore = true; this.loadUsers(); },
    formatTime(timeStr) {
      if (!timeStr) return '';
      const date = new Date(timeStr.replace(/-/g, '/'));
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    },
    async loadUsers() {
      if (this.loading) return; this.loading = true;
      try {
        const params = { action: 'get_users', page: this.page, limit: 10 };
        if (this.searchKeyword) params.search = this.searchKeyword;
        // 通过后端参数过滤，避免前端二次过滤导致分页错乱
        if (this.currentFilter === 'vip') { params.action = 'get_vip_users'; params.vip = 1; }
        else if (this.currentFilter === 'banned') { params.action = 'get_banned_users'; params.status = 0; }

        const res = await request('users.php', params, { baseURL: bmsBaseUrl, method: 'GET' });

        if (res.status === 'success' && res.data && res.data.list) {
          let list = res.data.list;
          if (this.page === 1) {
            this.userList = list;
            this.stats = { total: res.data.total || 0, today: res.data.today || 0, banned: res.data.banned || 0 };
          } else this.userList = [...this.userList, ...list];
          this.hasMore = list.length >= 10;
        }
      } catch (e) {}
      this.loading = false;
    },
    loadMore() { if (!this.hasMore || this.loading) return; this.page++; this.loadUsers(); },
    editUser(userId) { uni.navigateTo({ url: `/pages/admin/user_edit?id=${userId}` }); },

    async banUser(userId) {
      uni.showModal({ title: '封禁用户', content: '确定要封禁此用户吗？', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '处理中');
          try {
            const r = await request('users.php', { action: 'update_user_full', id: userId, status: 0 }, { baseURL: bmsBaseUrl });
            if (r.status === 'success') { uni.showToast({ title: '封禁成功', icon: 'success' }); const u = this.userList.find(x => x.id === userId); if (u) u.status = 0; }
            else uni.showToast({ title: r?.msg || '操作失败', icon: 'none' });
          } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
          this.hud.show = false;
        }
      }});
    },
    async unbanUser(userId) {
      this.showHud('loading', '处理中');
      try {
        const r = await request('users.php', { action: 'update_user_full', id: userId, status: 1 }, { baseURL: bmsBaseUrl });
        if (r.status === 'success') { uni.showToast({ title: '解封成功', icon: 'success' }); const u = this.userList.find(x => x.id === userId); if (u) u.status = 1; }
        else uni.showToast({ title: r?.msg || '操作失败', icon: 'none' });
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
      this.hud.show = false;
    },
    async toggleVIP(userId, currentVip) {
      if (currentVip !== 1) { this.openVipModal(userId); return; }
      uni.showModal({ title: '取消VIP', content: '确定要取消该用户的VIP吗？', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '处理中');
          try {
            const r = await request('users.php', { action: 'update_user_full', id: userId, vip: 0 }, { baseURL: bmsBaseUrl });
            if (r.status === 'success') { uni.showToast({ title: '取消成功', icon: 'success' }); const u = this.userList.find(x => x.id === userId); if (u) u.vip = 0; }
            else uni.showToast({ title: r?.msg || '操作失败', icon: 'none' });
          } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
          this.hud.show = false;
        }
      }});
    },
    openVipModal(userId) { this.currentVipUserId = userId; this.selectedVipDuration = 0; this.showVipModal = true; },
    closeVipModal() { this.showVipModal = false; this.currentVipUserId = null; this.selectedVipDuration = 0; },
    async confirmVip() {
      if (!this.currentVipUserId) return;
      this.showVipModal = false; this.showHud('loading', '处理中');
      try {
        const params = { action: 'update_user_full', id: this.currentVipUserId, vip: 1 };
        if (this.selectedVipDuration > 0) {
          const et = new Date(); et.setDate(et.getDate() + this.selectedVipDuration);
          params.vip_expire_time = et.toISOString().slice(0, 19).replace('T', ' ');
          params.vip_type = 1;
        }
        const r = await request('users.php', params, { baseURL: bmsBaseUrl });
        if (r.status === 'success') {
          const t = this.selectedVipDuration === 0 ? '永久' : `${this.selectedVipDuration}天`;
          uni.showToast({ title: `赠送${t}VIP成功`, icon: 'success' });
          const u = this.userList.find(x => x.id === this.currentVipUserId); if (u) u.vip = 1;
        } else uni.showToast({ title: r?.msg || '操作失败', icon: 'none' });
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
      this.hud.show = false; this.currentVipUserId = null; this.selectedVipDuration = 0;
    },
    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text }; }
  }
};
</script>

<style scoped>
.users-page { min-height: 100vh; background: linear-gradient(180deg, #f5f7fa 0%, #e8ecf0 100%); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f5f7fa; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 搜索 */
.search-bar { display: flex; padding: 24rpx; gap: 16rpx; background: transparent; }
.search-wrap {
  flex: 1; height: 88rpx; background: #fff; border-radius: 44rpx;
  display: flex; align-items: center; padding: 0 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  border: 2rpx solid rgba(255,255,255,0.6);
}
.search-icon-img { width: 32rpx; height: 32rpx; display: block; margin-right: 16rpx; opacity: 0.6; }
.search-input { flex: 1; font-size: 28rpx; color: #333; }
.search-input::placeholder { color: #aaa; }
.search-action {
  width: 130rpx; height: 88rpx; background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 44rpx; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 28rpx; font-weight: 600;
  box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.4);
}
.search-action:active { transform: scale(0.96); box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.3); }

/* 统计 */
.stats-row { display: flex; gap: 20rpx; padding: 12rpx 24rpx 20rpx; }
.stat-box {
  flex: 1; background: #fff; border-radius: 24rpx; padding: 28rpx 16rpx;
  text-align: center; box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.06);
  position: relative; overflow: hidden;
}
.stat-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6rpx;
  background: linear-gradient(90deg, #667eea, #764ba2);
}
.stat-box:nth-child(2)::before { background: linear-gradient(90deg, #00b894, #00cec9); }
.stat-box:nth-child(3)::before { background: linear-gradient(90deg, #ff7675, #fdcb6e); }
.stat-val { display: block; font-size: 42rpx; font-weight: 800; color: #333; line-height: 1.3; }
.stat-val.accent-green { color: #00b894; }
.stat-val.accent-red { color: #ff7675; }
.stat-lbl { font-size: 24rpx; color: #888; margin-top: 8rpx; display: block; }

/* 筛选 */
.filter-scroll { white-space: nowrap; background: transparent; }
.filter-items { display: inline-flex; padding: 12rpx 28rpx 24rpx; gap: 20rpx; }
.filter-item {
  padding: 16rpx 36rpx; border-radius: 34rpx; font-size: 26rpx; color: #666;
  background: #fff; transition: all 0.25s ease; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.filter-item:active { transform: scale(0.96); }
.filter-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.4);
}

/* 用户卡片 */
.user-list { padding: 0 24rpx; }
.uc-card {
  background: #fff; border-radius: 28rpx; margin-bottom: 20rpx;
  overflow: hidden; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}
.uc-card:active { transform: scale(0.99); box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08); }
.uc-row { display: flex; align-items: center; padding: 22rpx; gap: 16rpx; }
.uc-left { flex: 1; display: flex; gap: 18rpx; min-width: 0; }
.uc-avatar {
  width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0;
  border: 4rpx solid #f0edff;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
}
.uc-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; gap: 8rpx; }
.uc-header { display: flex; align-items: center; gap: 10rpx; }
.uc-name { font-size: 29rpx; font-weight: 600; color: #222; }
.uc-badges { display: flex; gap: 8rpx; flex-shrink: 0; }
.badge { padding: 4rpx 12rpx; border-radius: 10rpx; font-size: 20rpx; font-weight: 600; white-space: nowrap; }
.badge.vip { background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); color: #b7791f; }
.badge.admin { background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%); color: #557feb; }
.badge.super { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }
.uc-meta { display: flex; gap: 12rpx; font-size: 23rpx; color: #888; flex-wrap: wrap; }
.uc-meta .sep { color: #ddd; }
.uc-ip { margin-top: 4rpx; gap: 10rpx; }
.uc-ip-city { color: #576b95; }
.uc-ip-addr { color: #aaa; font-size: 21rpx; }
.uc-time { font-size: 22rpx; color: #999; }

/* 操作按钮 - 右侧 */
.uc-actions { display: flex; flex-direction: column; gap: 10rpx; flex-shrink: 0; justify-content: center; align-items: center; }
.ua-btn {
  padding: 12rpx 24rpx; border-radius: 22rpx; font-size: 24rpx;
  text-align: center; font-weight: 600; transition: all 0.15s;
  min-width: 80rpx;
}
.ua-btn:active { transform: scale(0.92); }
.ua-btn.disabled { opacity: 0.35; pointer-events: none; }
.ua-btn.edit { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #666; }
.ua-btn.ban { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }
.ua-btn.unban { background: linear-gradient(135deg, #eef9f0 0%, #d4edda 100%); color: #27ae60; }
.ua-btn.vip-btn { background: linear-gradient(135deg, #f5eaff 0%, #ede7ff 100%); color: #7c6fff; }

/* 加载/空状态 */
.load-more { padding: 24rpx; }
.load-btn {
  background: #fff; padding: 26rpx; border-radius: 44rpx; text-align: center;
  font-size: 28rpx; color: #888; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.load-btn:active { transform: scale(0.98); }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-emoji-img-wrap { display: flex; align-items: center; justify-content: center; opacity: 0.6; }
.empty-emoji-img { width: 100rpx; height: 100rpx; display: block; }
.empty-text { font-size: 28rpx; color: #999; margin-top: 20rpx; }
.footer-space { height: 60rpx; }

/* VIP弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.vm-content { width: 88%; max-width: 620rpx; background: #fff; border-radius: 32rpx; overflow: hidden; box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.2); }
.vm-head { display: flex; align-items: center; justify-content: space-between; padding: 36rpx; background: linear-gradient(135deg, #667eea, #764ba2); }
.vm-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.vm-close { font-size: 48rpx; color: rgba(255,255,255,0.8); line-height: 1; }
.vm-body { padding: 32rpx; }
.vm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.vm-item {
  padding: 24rpx 16rpx; border: 2rpx solid #e8e8e8; border-radius: 20rpx;
  text-align: center; transition: all 0.25s;
}
.vm-item:active { transform: scale(0.98); }
.vm-item.active { 
  border-color: #667eea; 
  background: linear-gradient(135deg, #f5f0ff 0%, #ede7ff 100%);
  box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.15);
}
.vm-label { display: block; font-size: 28rpx; font-weight: 700; color: #333; }
.vm-desc { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; }
.vm-tip { display: block; font-size: 24rpx; color: #aaa; margin-top: 20rpx; text-align: center; }
.vm-foot { display: flex; border-top: 1rpx solid #f0f0f0; }
.vm-btn { flex: 1; padding: 28rpx; text-align: center; font-size: 30rpx; transition: all 0.2s; }
.vm-btn.cancel { color: #888; border-right: 1rpx solid #f0f0f0; }
.vm-btn.cancel:active { background: #f8f9fa; }
.vm-btn.confirm { color: #fff; background: linear-gradient(135deg, #667eea, #764ba2); font-weight: 600; }
.vm-btn.confirm:active { opacity: 0.9; }

/* HUD */
.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.hud-toast { background: rgba(0,0,0,0.8); color: #fff; font-size: 28rpx; padding: 32rpx 56rpx; border-radius: 20rpx; display: flex; align-items: center; gap: 16rpx; backdrop-filter: blur(10px); }
.spinner { width: 36rpx; height: 36rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner.white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
