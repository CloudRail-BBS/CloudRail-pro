<template>
  <view class="admin-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bg"></view>
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image src="/static/icon/arrow-left-dark.svg" class="back-icon" mode="aspectFit"></image>
        </view>
        <view class="nav-title">管理中心</view>
        <view class="nav-right">
          <view class="nav-user" @click="showUserInfo">
            <image v-if="adminInfo.avatar" :src="adminInfo.avatar" class="nav-avatar-img" mode="aspectFill" />
            <image v-else src="/static/icon/user-circle-white.svg" class="user-icon" mode="aspectFit"></image>
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="main-scroll" scroll-y>
      <view class="nav-placeholder" :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

      <!-- 全站数据（红色渐变卡片） -->
      <view class="site-data-card">
        <view class="site-data-header">
          <text class="site-data-title">全站数据</text>
        </view>
        <view class="site-data-grid">
          <view class="site-data-item" v-for="(item, index) in siteStats" :key="index">
            <text class="site-data-num">{{ formatNum(item.value) }}</text>
            <text class="site-data-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 待办事项 -->
      <view class="todo-section">
        <view class="todo-header">
          <text class="todo-title">待办事项</text>
          <view class="todo-badge" v-if="totalTodo > 0">
            <text>{{ totalTodo > 99 ? '99+' : totalTodo }}</text>
          </view>
        </view>
        <view class="todo-grid">
          <view class="todo-item" v-for="(item, index) in filteredTodoItems" :key="index"
            @click="goTodo(item)">
            <view class="todo-content">
              <text class="todo-num">{{ item.value > 99 ? '99+' : item.value }}</text>
              <view class="todo-dot" v-if="item.value > 0">
                <text>{{ item.value > 99 ? '99+' : item.value }}</text>
              </view>
            </view>
            <text class="todo-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 常用管理 -->
      <view class="manage-section">
        <view class="manage-header">
          <text class="manage-title">常用管理</text>
        </view>
        <view class="manage-grid">
          <view class="manage-item" v-for="(item, index) in filteredManageItems" :key="index"
            @click="goManage(item)">
            <view class="manage-icon"><image class="manage-icon-img" :src="item.icon" mode="aspectFit" /></view>
            <text class="manage-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="admin-footer-tip">
        <text>管理人员谨慎操作，日志检查，非法操作封禁永久账号</text>
      </view>

      <!-- 底部留白 -->
      <view class="footer-space"></view>
    </scroll-view>

    <!-- HUD 加载提示 -->
    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>

    <!-- 操作弹窗 -->
    <view class="action-modal" v-if="showActionModal">
      <view class="modal-mask" @click="closeActionModal"></view>
      <view class="modal-content" @click.stop>
        <view class="modal-title">{{ actionModalTitle }}</view>
        <view class="modal-body">
          <view class="modal-desc">{{ actionModalDesc }}</view>
          <view v-if="actionModalType === 'grantVIP'" class="modal-input-row">
            <text class="input-label">赠送天数</text>
            <input class="modal-input" type="number" v-model="vipDays" placeholder="请输入天数" />
          </view>
          <view v-if="actionModalType === 'banUser'" class="modal-input-row">
            <text class="input-label">封禁天数（0为永久）</text>
            <input class="modal-input" type="number" v-model="banDays" placeholder="请输入天数" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeActionModal">取消</view>
          <view class="modal-btn confirm" @click="confirmAction">{{ actionModalConfirmText }}</view>
        </view>
      </view>
    </view>

    <!-- 用户信息弹窗 -->
    <view class="user-modal" v-if="showUserModal">
      <view class="modal-mask" @click="closeUserModal"></view>
      <view class="user-modal-content" @click.stop>
        <view class="um-header">
          <view class="um-avatar-wrap">
            <image v-if="adminInfo.avatar" :src="adminInfo.avatar" class="um-avatar" mode="aspectFill" />
            <text v-else class="um-avatar-fallback">A</text>
          </view>
          <text class="um-name">{{ adminInfo.nickname || '管理员' }}</text>
          <text class="um-role">{{ adminInfo.role || '管理员' }}</text>
        </view>
        <view class="um-body">
          <view class="um-row">
            <text class="um-label">签名</text>
            <text class="um-val">{{ adminInfo.signature || '暂无签名' }}</text>
          </view>
          <view class="um-row">
            <text class="um-label">用户ID</text>
            <text class="um-val">{{ adminInfo.id || '-' }}</text>
          </view>
          <view class="um-row">
            <text class="um-label">登录时间</text>
            <text class="um-val">{{ adminInfo.loginTime || '-' }}</text>
          </view>
        </view>
        <view class="um-close" @click="closeUserModal">
          <text>关闭</text>
        </view>
      </view>
    </view>

    <!-- 日志展示弹窗 -->
    <view class="logs-modal" v-if="showLogsModal">
      <view class="logs-mask" @click="closeLogsModal"></view>
      <view class="logs-content" @click.stop>
        <view class="logs-header">
          <view class="logs-title">
            <view class="logs-title-icon"><image class="logs-title-icon-img" :src="logsTitleIcon" mode="aspectFit" /></view>
            <text>操作日志</text>
          </view>
          <view class="logs-close" @click="closeLogsModal">
            <image src="/static/icon/x-white.svg" class="logs-close-icon" mode="aspectFit"></image>
          </view>
        </view>
        <scroll-view class="logs-scroll" scroll-y @scrolltolower="loadMoreLogs" v-if="logList.length > 0 || !logLoading">
          <view class="log-item" v-for="(item, idx) in logList" :key="idx">
            <view class="log-item-left">
              <view class="log-id">#{{ item.id }}</view>
              <view class="log-admin">{{ item.admin_name || '-' }}</view>
            </view>
            <view class="log-item-right">
              <view class="log-action">{{ item.action || '-' }}</view>
              <view class="log-detail">{{ item.detail || '-' }}</view>
              <view class="log-time">{{ item.create_time || '-' }}</view>
            </view>
          </view>
          <view class="log-loading-more" v-if="logLoading && logPage > 1">
            <text>加载中...</text>
          </view>
          <view class="log-no-more" v-if="logPage >= logTotalPages && !logLoading">
            <text>- 没有更多了 -</text>
          </view>
        </scroll-view>
        <view class="logs-empty" v-if="!logLoading && logList.length === 0">
          <text>暂无日志记录</text>
        </view>
        <view class="logs-loading" v-if="logLoading && logPage === 1">
          <text>加载中...</text>
        </view>
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
      currentTime: '',
      siteStats: [
        { value: 0, label: '帖子', key: 'posts' },
        { value: 0, label: '回帖', key: 'comments' },
        { value: 0, label: '用户', key: 'users' },
        { value: 0, label: '商品', key: 'products' },
        { value: 0, label: '待审核', key: 'pending' },
        { value: 0, label: '举报', key: 'reports' },
        { value: 0, label: 'VIP用户', key: 'vip' },
        { value: 0, label: '订单', key: 'orders' },
      ],
      todoItems: [
        { label: '待审帖子', value: 0, type: 'posts_pending', url: '/pages/admin/posts?status=2' },
        { label: '待审评论', value: 0, type: 'comments_pending', url: '/pages/admin/comments?status=2' },
        { label: '待处理举报', value: 0, type: 'reports', url: '/pages/admin/reports' },
        { label: '认证审核', value: 0, type: 'certifications', url: '/pages/admin/certifications' },
      ],
      manageItems: [
        {
          icon: '/static/icon/admin-file-text-333.svg',
          label: '帖子管理', type: 'posts', url: '/pages/admin/posts'
        },
        {
          icon: '/static/icon/admin-message-square-333.svg',
          label: '帖子评论', type: 'comments', url: '/pages/admin/comments'
        },
        {
          icon: '/static/icon/admin-shopping-cart-333.svg',
          label: '商品管理', type: 'market', url: '/pages/admin/market'
        },
        {
          icon: '/static/icon/admin-users-333.svg',
          label: '用户管理', type: 'users', url: '/pages/admin/users'
        },
        {
          icon: '/static/icon/admin-chat-bubble-333.svg',
          label: '聊天管理', type: 'chat', url: '/pages/admin/chat'
        },
        {
          icon: '/static/icon/admin-star-333.svg',
          label: '会员生成', type: 'vip_cards', url: '/pages/admin/vip_cards'
        },
        {
          icon: '/static/icon/admin-credit-card-333.svg',
          label: '余额生成', type: 'balance_cards', url: '/pages/admin/balance_cards'
        },
        {
          icon: '/static/icon/admin-send-333.svg',
          label: '系统公告', type: 'notices', url: '/pages/admin/notices'
        },
        {
          icon: '/static/icon/admin-file-text-corner-333.svg',
          label: '操作日志', type: 'logs', url: '/pages/admin/logs'
        },
        {
          icon: '/static/icon/admin-shield-check-333.svg',
          label: '靓号管理', type: 'fancy', url: '/pages/admin/fancy'
        },
        {
          icon: '/static/icon/admin-smartphone-333.svg',
          label: '软件管理', type: 'software', url: '/pages/admin/software'
        },
        {
          icon: '/static/icon/admin-globe-333.svg',
          label: '圈子管理', type: 'circles', url: '/pages/admin/circles'
        },
        {
          icon: '/static/icon/admin-image-333.svg',
          label: '横幅管理', type: 'banners', url: '/pages/admin/banners'
        },
        {
          icon: '/static/icon/admin-check-square-333.svg',
          label: '邀请码', type: 'invite_codes', url: '/pages/admin/invite_codes'
        },
        {
          icon: '/static/icon/admin-shield-check-variant-333.svg',
          label: '认证管理', type: 'certifications', url: '/pages/admin/certifications'
        },
        {
          icon: '/static/icon/admin-pencil-d68910.svg',
          label: '水印设置', type: 'settings', url: '/pages/admin/settings'
        },
      ],
      hud: { show: false, type: 'loading', text: '' },
      showActionModal: false,
      actionModalTitle: '',
      actionModalDesc: '',
      actionModalType: '',
      actionModalConfirmText: '确定',
      actionModalData: null,
      vipDays: 30,
      banDays: 7,
      adminInfo: {
        id: 0,
        nickname: '',
        avatar: '',
        signature: '',
        role: '',
        loginTime: '',
        currentRole: 'admin'
      },
      showUserModal: false,
      // 日志展示
      showLogsModal: false,
      logList: [],
      logLoading: false,
      logPage: 1,
      logTotalPages: 1,
      logMode: 'admin',
      logsTitleIcon: '/static/icon/file-text-white.svg',
    };
  },
  computed: {
    totalTodo() {
      return this.filteredTodoItems.reduce((sum, item) => sum + parseInt(item.value) || 0, 0);
    },
    /* 根据角色过滤待办事项 */
    filteredTodoItems() {
      const role = this.currentRole;
      if (role === 'auditor') {
        return this.todoItems.filter(item => ['posts_pending', 'comments_pending', 'certifications'].includes(item.type));
      }
      if (role === 'moderator') {
        return this.todoItems.filter(item => ['posts_pending', 'comments_pending'].includes(item.type));
      }
      return this.todoItems;
    },
    /* 根据角色过滤管理功能 */
    filteredManageItems() {
      const role = this.currentRole;
      if (role === 'auditor') {
        return this.manageItems.filter(item => ['posts', 'comments', 'certifications'].includes(item.type));
      }
      if (role === 'moderator') {
        return this.manageItems.filter(item => ['posts', 'comments', 'circles'].includes(item.type));
      }
      return this.manageItems;
    }
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.updateCurrentTime();
    // 从本地存储获取用户角色（不依赖异步接口，确保立即生效）
    try {
      const localUser = uni.getStorageSync('userInfo');
      if (localUser && localUser.role) {
        this.currentRole = localUser.role;
        this.adminInfo.role = localUser.role === 'moderator' ? '版主' : (localUser.role === 'auditor' ? '审核员' : '管理员');
        this.adminInfo.nickname = localUser.nickname || localUser.name || localUser.username || '';
        this.adminInfo.avatar = localUser.avatar || '';
      }
    } catch (e) {}
    this.loadData();
    setInterval(() => this.updateCurrentTime(), 60000);
  },
  methods: {
    updateCurrentTime() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const month = (now.getMonth() + 1) + '月' + now.getDate() + '日';
      const weekday = weekdays[now.getDay()];
      this.currentTime = `${month} ${weekday} ${hours}:${minutes}`;
    },
    goBack() {
      uni.navigateBack();
    },
    showUserInfo() {
      this.showUserModal = true;
    },
    closeUserModal() {
      this.showUserModal = false;
    },
    // 日志
    closeLogsModal() {
      this.showLogsModal = false;
      this.logList = [];
    },
    openLogsModal() {
      this.showLogsModal = true;
      this.logPage = 1;
      this.logList = [];
      this.loadLogs();
    },
    async loadLogs(page) {
      if (page) this.logPage = page;
      this.logLoading = true;
      try {
        const res = await request('logs.php', { action: 'get_admin_logs', page: this.logPage }, { method: 'GET', baseURL: bmsBaseUrl });
        if ((res.status === 'success' || res.code === 0) && res.data) {
          if (this.logPage === 1) {
            this.logList = res.data.list || [];
          } else {
            this.logList = [...this.logList, ...(res.data.list || [])];
          }
          const total = res.data.total || 0;
          this.logTotalPages = res.data.pages || Math.max(1, Math.ceil(total / 20));
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '加载失败', icon: 'none' });
        }
      } catch (e) {
        const msg = (e && (e.msg || e.message)) ? (e.msg || e.message) : '网络错误';
        uni.showToast({ title: msg, icon: 'none' });
      } finally {
        this.logLoading = false;
      }
    },
    loadMoreLogs() {
      if (this.logLoading || this.logPage >= this.logTotalPages) return;
      this.loadLogs(this.logPage + 1);
    },
    formatNum(n) {
      if (!n && n !== 0) return '0';
      if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
      return String(n);
    },
    async loadData() {
      this.showHud('loading', '加载数据中...');
      try {
        const [userRes, statsRes] = await Promise.all([
          request('user.php', { action: 'getUserInfo' }),
          request('dashboard.php', { action: 'get_stats' }, { baseURL: bmsBaseUrl })
        ]);

        if (userRes.code === 0 && userRes.data) {
          const user = userRes.data;
          this.adminInfo.id = user.id || 0;
          this.adminInfo.nickname = user.name || user.username || '管理员';
          this.adminInfo.avatar = user.avatar || '';
          this.adminInfo.signature = user.personal_signature || '';
          if (user.is_admin === 2) this.adminInfo.role = '超级管理员';
          else if (user.is_admin === 1) this.adminInfo.role = '管理员';
          else if (user.is_reviewer === 1) this.adminInfo.role = '审核员';
          else this.adminInfo.role = user.role || '管理员';
          // 优先从 role 字段获取，兼容 is_admin / is_reviewer 旧字段
          if (user.role) {
            this.currentRole = user.role;
          } else if (user.is_admin === 2 || user.is_admin === 1) {
            this.currentRole = 'admin';
          } else if (user.is_reviewer === 1) {
            this.currentRole = 'auditor';
          }
        }

        if (statsRes.status === 'success' && statsRes.data && statsRes.data.stats) {
          const stats = statsRes.data.stats;
          this.siteStats[0].value = stats.posts?.total || 0;
          this.siteStats[1].value = stats.comments?.total || 0;
          this.siteStats[2].value = stats.users?.total || 0;
          this.siteStats[3].value = stats.products?.total || 0;
          this.siteStats[4].value = (stats.pending?.posts || 0) + (stats.pending?.comments || 0);
          this.siteStats[5].value = stats.reports?.total || 0;
          this.siteStats[6].value = stats.vip?.total || 0;
          this.siteStats[7].value = stats.orders?.total || 0;

          this.todoItems[0].value = stats.pending?.posts || 0;
          this.todoItems[1].value = stats.pending?.comments || 0;
        }

        this.loadReportsPendingCount();
        this.loadCertPendingCount();
        this.loadMarketStats();
      } catch (e) {}
      this.hud.show = false;
    },
    refreshStats() {
      this.loadData();
      uni.showToast({ title: '已刷新', icon: 'success' });
    },
    async loadCertPendingCount() {
      try {
        const res = await request('certifications.php', { action: 'list', page: 1, status: 'pending' }, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data) {
          this.todoItems[3].value = res.data.pending_count || (res.data.list ? res.data.list.length : 0);
        } else {
          console.log('[认证待审数量加载异常]', res)
        }
      } catch (e) {
        console.log('[认证待审数量加载失败]', e)
      }
    },
    async loadReportsPendingCount() {
      try {
        const res = await request('reports.php', { action: 'get_reports', page: 1, status: '0' }, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data && res.data.list) {
          this.todoItems[2].value = res.data.list.length || 0;
        }
      } catch (e) {}
    },
    async loadMarketStats() {
      try {
        const res = await request('admin_market.php', { action: 'get_stats' }, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data) {
          const d = res.data;
          this.siteStats[3].value = d.total_products || this.siteStats[3].value;
          this.siteStats[7].value = d.total_orders || this.siteStats[7].value;
        }
      } catch (e) {}
    },
    goTodo(item) {
      if (item.url) uni.navigateTo({ url: item.url });
      else uni.showToast({ title: `功能开发中`, icon: 'none' });
    },
    goManage(item) {
      if (item.type === 'logs') {
        this.openLogsModal();
      } else if (item.url) uni.navigateTo({ url: item.url });
      else uni.showToast({ title: `功能开发中: ${item.label}`, icon: 'none' });
    },
    openActionModal(type, title, desc, data) {
      this.actionModalType = type;
      this.actionModalTitle = title;
      this.actionModalDesc = desc;
      this.actionModalData = data;
      this.actionModalConfirmText = type === 'grantVIP' ? '赠送' : '确定';
      this.showActionModal = true;
    },
    closeActionModal() {
      this.showActionModal = false;
      this.actionModalData = null;
    },
    async confirmAction() {
      this.showActionModal = false;
      try {
        let res;
        switch (this.actionModalType) {
          case 'grantVIP':
            res = await request('users.php', { action: 'update_user_full', id: this.actionModalData, vip_days: this.vipDays }, { baseURL: bmsBaseUrl });
            break;
          case 'banUser':
            res = await request('users.php', { action: 'update_user_full', id: this.actionModalData, ban_days: this.banDays }, { baseURL: bmsBaseUrl });
            break;
          case 'unbanUser':
            res = await request('users.php', { action: 'update_user_full', id: this.actionModalData, ban_days: 0 }, { baseURL: bmsBaseUrl });
            break;
        }
        if (res && res.status === 'success') {
          uni.showToast({ title: '操作成功', icon: 'success' });
          this.loadData();
        } else {
          uni.showToast({ title: res?.msg || '操作失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' });
      }
    },
    showHud(type, text) {
      this.hud = { show: true, type: type || 'loading', text };
    }
  }
};
</script>

<style scoped>
/* ====== 页面 ====== */
.admin-page {
  min-height: 100vh;
  background: #f5f6f8;
}

/* ====== 导航栏 ====== */
.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 999;
  background: #fff;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06);
}

.nav-content {
  position: relative;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
}

.nav-back {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
}
.back-icon {
  width: 40rpx; height: 40rpx;
}
.nav-title {
  font-size: 34rpx; font-weight: 700; color: #333; letter-spacing: 2rpx;
}
.nav-right {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
}
.nav-user {
  width: 60rpx; height: 60rpx;
  border-radius: 50%; overflow: hidden;
  border: 2rpx solid #e0e0e0;
}
.nav-avatar-img { width: 100%; height: 100%; }
.user-icon { width: 32rpx; height: 32rpx; }

.main-scroll { height: 100vh; }
.nav-placeholder {
  background: #fff;
}

/* ====== 全站数据卡片 ====== */
.site-data-card {
  margin: 20rpx;
  background: linear-gradient(135deg, #e83a5c 0%, #d62828 50%, #c73e3a 100%);
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(232, 58, 92, 0.35);
}
.site-data-header {
  margin-bottom: 20rpx;
  text-align: center;
}
.site-data-title {
  font-size: 28rpx; font-weight: 600; color: rgba(255,255,255,0.9);
}
.site-data-grid {
  display: flex; flex-wrap: wrap;
}
.site-data-item {
  width: 25%;
  text-align: center;
}
.site-data-num {
  display: block;
  font-size: 38rpx; font-weight: 800; color: #fff;
  line-height: 1.2;
}
.site-data-label {
  display: block;
  font-size: 20rpx; color: rgba(255,255,255,0.8);
  margin-top: 4rpx;
}

/* ====== 待办事项 ====== */
.todo-section {
  margin: 0 20rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.todo-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24rpx;
}
.todo-title {
  font-size: 30rpx; font-weight: 700; color: #222;
}
.todo-badge {
  background: linear-gradient(135deg, #ff4757, #ff6b81);
  color: #fff;
  font-size: 22rpx; font-weight: 700;
  padding: 4rpx 18rpx; border-radius: 18rpx;
  min-width: 40rpx; text-align: center;
}
.todo-grid {
  display: flex;
}
.todo-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 8rpx;
  transition: transform 0.15s;
}
.todo-item:active {
  transform: scale(0.96);
}
.todo-content {
  position: relative;
  display: inline-block;
}
.todo-num {
  display: block;
  font-size: 44rpx; font-weight: 800; color: #e83a5c;
  line-height: 1.2;
}
.todo-dot {
  position: absolute;
  top: -8rpx;
  right: -20rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: linear-gradient(135deg, #ff4757, #ff6b81);
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 71, 87, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
}
.todo-dot text {
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  line-height: 1;
}
.todo-label {
  display: block;
  font-size: 22rpx; color: #888;
  margin-top: 8rpx;
}

/* ====== 常用管理 ====== */
.manage-section {
  margin: 0 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 0;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.manage-header {
  margin-bottom: 24rpx;
  padding: 0 28rpx;
}
.manage-title {
  font-size: 30rpx; font-weight: 700; color: #222;
}
.manage-grid {
  display: flex; flex-wrap: wrap;
  padding: 0 8rpx;
}
.manage-item {
  width: 25%;
  box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center;
  padding: 16rpx 8rpx;
  transition: transform 0.15s;
}
.manage-item:active {
  transform: scale(0.94);
}
.manage-icon {
  width: 76rpx; height: 76rpx;
  background: #f5f6fa;
  border-radius: 18rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 10rpx;
  color: #333;
  transition: all 0.2s;
}
.manage-icon :deep(svg),
.manage-icon .manage-icon-img {
  width: 40rpx;
  height: 40rpx;
  display: block;
}
.manage-item:active .manage-icon {
  background: #eceef5;
  color: #000;
}
.manage-label {
  font-size: 22rpx; color: #555; font-weight: 500;
  text-align: center;
}

.footer-space { height: 60rpx; }

/* 底部提示小字 */
.admin-footer-tip {
  text-align: center;
  padding: 30rpx 40rpx 10rpx;
  font-size: 22rpx;
  color: #b0b3bf;
  line-height: 1.6;
  letter-spacing: 1rpx;
}

/* ====== 弹窗通用 ====== */
.modal-mask {
  position: absolute; width: 100%; height: 100%;
  background: rgba(0,0,0,0.45);
}
.modal-content {
  position: relative;
  width: 600rpx; background: #fff;
  border-radius: 24rpx; overflow: hidden;
}
.modal-title {
  padding: 32rpx;
  font-size: 32rpx; font-weight: 600; color: #333;
  text-align: center;
  border-bottom: 1rpx solid #f2f2f2;
}
.modal-body { padding: 32rpx; }
.modal-desc {
  font-size: 28rpx; color: #666; line-height: 1.6;
  margin-bottom: 24rpx;
}
.modal-input-row { margin-bottom: 16rpx; }
.input-label {
  display: block; font-size: 26rpx; color: #666;
  margin-bottom: 12rpx;
}
.modal-input {
  width: 100%; height: 80rpx;
  background: #f6f6f8; border-radius: 14rpx;
  padding: 0 24rpx; font-size: 28rpx;
}
.modal-footer {
  display: flex; border-top: 1rpx solid #f2f2f2;
}
.modal-btn {
  flex: 1; padding: 28rpx;
  text-align: center; font-size: 30rpx;
}
.modal-btn.cancel { color: #888; border-right: 1rpx solid #f2f2f2; }
.modal-btn.confirm { color: #667eea; font-weight: 600; }

/* ====== 用户弹窗 ====== */
.user-modal {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.user-modal-content {
  position: relative;
  width: 600rpx; background: #fff;
  border-radius: 28rpx; overflow: hidden;
}
.um-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 52rpx 32rpx 36rpx; text-align: center;
}
.um-avatar-wrap {
  width: 140rpx; height: 140rpx;
  margin: 0 auto 20rpx;
  background: rgba(255,255,255,0.25);
  border-radius: 50%;
  border: 4rpx solid rgba(255,255,255,0.4);
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.um-avatar { width: 100%; height: 100%; }
.um-avatar-fallback {
  font-size: 56rpx; font-weight: 800; color: #fff;
}
.um-name {
  font-size: 34rpx; font-weight: 700; color: #fff;
  display: block; margin-bottom: 6rpx;
}
.um-role {
  font-size: 24rpx; color: rgba(255,255,255,0.75);
  background: rgba(255,255,255,0.15);
  padding: 2rpx 20rpx; border-radius: 12rpx;
  display: inline-block;
}
.um-body { padding: 28rpx 32rpx; }
.um-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.um-row:last-child { border-bottom: none; }
.um-label { font-size: 27rpx; color: #999; }
.um-val { font-size: 27rpx; color: #333; font-weight: 500; max-width: 320rpx; text-align: right; word-break: break-all; }
.um-close {
  padding: 20rpx 32rpx 32rpx;
  text-align: center;
}
.um-close text {
  display: inline-block;
  padding: 16rpx 120rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; font-size: 28rpx; font-weight: 600;
  border-radius: 44rpx;
}

/* ====== HUD ====== */
.hud-mask {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.35);
  z-index: 2000;
  display: flex; align-items: center; justify-content: center;
}
.hud-toast {
  background: rgba(0,0,0,0.75);
  color: #fff; font-size: 28rpx;
  padding: 28rpx 48rpx; border-radius: 16rpx;
  display: flex; align-items: center; gap: 16rpx;
}

.spinner {
  width: 36rpx; height: 36rpx;
  border: 3rpx solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner.white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ====== 日志展示弹窗 ====== */
.logs-modal {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 1099;
  display: flex; flex-direction: column;
}
.logs-mask {
  position: absolute; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
}
.logs-content {
  position: relative;
  width: 100%; height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  margin-top: auto;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.logs-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx 32rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 32rpx 32rpx 0 0;
  flex-shrink: 0;
}
.logs-title {
  font-size: 32rpx; font-weight: 700; color: #fff;
  display: flex; align-items: center; gap: 12rpx;
}
.logs-title-icon {
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.logs-title-icon-img {
  width: 36rpx; height: 36rpx; display: block;
}
.logs-close {
  width: 56rpx; height: 56rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.logs-close text { color: #fff; font-size: 28rpx; }
.logs-close-icon { width: 28rpx; height: 28rpx; }
.logs-scroll {
  flex: 1; overflow-y: auto;
  padding: 20rpx 24rpx;
}
.log-item {
  display: flex; gap: 20rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #fafbff, #f5f7ff);
  border-radius: 18rpx;
  margin-bottom: 16rpx;
  border-left: 6rpx solid #667eea;
}
.log-item-left { flex-shrink: 0; width: 140rpx; }
.log-id {
  font-size: 22rpx; color: #bdc3c7;
  font-family: monospace; margin-bottom: 6rpx;
}
.log-admin {
  font-size: 26rpx; color: #333; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.log-item-right { flex: 1; min-width: 0; }
.log-action {
  font-size: 25rpx; color: #667eea; font-weight: 600;
  margin-bottom: 6rpx;
}
.log-detail {
  font-size: 24rpx; color: #555;
  line-height: 1.4; margin-bottom: 6rpx;
  word-break: break-all;
}
.log-time { font-size: 22rpx; color: #aaa; }
.log-loading-more, .log-no-more {
  text-align: center; padding: 20rpx;
  font-size: 24rpx; color: #bbb;
}
.logs-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #bbb; font-size: 28rpx;
}
.logs-loading {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #999; font-size: 26rpx;
}
</style>
