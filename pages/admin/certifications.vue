<template>
  <view class="certifications-page">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="search-bar">
        <input class="search-input" type="text" v-model="searchKeyword" placeholder="搜索用户名或认证信息" @confirm="doSearch" />
        <view class="search-action" @click="doSearch">搜索</view>
      </view>

      <view class="filter-bar">
        <scroll-view scroll-x class="filter-scroll">
          <view class="filter-items">
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'all' }"
              @click="setFilter('all')"
            >
              全部
            </view>
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'pending' }"
              @click="setFilter('pending')"
            >
              待审核({{ pendingCount }})
            </view>
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'approved' }"
              @click="setFilter('approved')"
            >
              已通过
            </view>
            <view 
              class="filter-item" 
              :class="{ active: currentFilter === 'rejected' }"
              @click="setFilter('rejected')"
            >
              已拒绝
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="filter-row">
        <view class="filter-group">
          <text class="filter-label">类型筛选</text>
          <view class="filter-options">
            <view 
              class="filter-option" 
              :class="{ active: certType === 'all' }"
              @click="setCertType('all')"
            >
              全部类型
            </view>
            <view 
              class="filter-option" 
              :class="{ active: certType === 'personal' }"
              @click="setCertType('personal')"
            >
              个人认证
            </view>
            <view 
              class="filter-option" 
              :class="{ active: certType === 'enterprise' }"
              @click="setCertType('enterprise')"
            >
              企业认证
            </view>
          </view>
        </view>
      </view>

      <view class="cert-list">
        <view class="cert-item" v-for="item in certList" :key="item.id">
          <view class="cert-header">
            <view class="user-info">
              <image class="user-avatar" :src="item.avatar || '/static/logo.png'" mode="aspectFill" />
              <view class="user-detail">
                <text class="user-name">{{ item.name || item.username }}</text>
                <text class="user-id">ID: {{ item.user_id }}</text>
              </view>
            </view>
            <view class="cert-type" :class="item.cert_type">
              {{ item.cert_type === 'enterprise' ? '企业认证' : '个人认证' }}
            </view>
          </view>
          
          <view class="cert-content">
            <view class="cert-info">
              <text class="info-label">认证信息</text>
              <text class="info-value">{{ item.cert_type === 'enterprise' ? item.company_name : item.apply_title }}</text>
            </view>
            <view class="cert-info" v-if="item.contact_name">
              <text class="info-label">联系人</text>
              <text class="info-value">{{ item.contact_name }} {{ item.contact_phone }}</text>
            </view>
            <view class="cert-info" v-if="item.remark">
              <text class="info-label">备注说明</text>
              <text class="info-value">{{ item.remark }}</text>
            </view>
          </view>

          <view v-if="item.license_image" class="cert-image">
            <image :src="item.license_image" mode="widthFix" @click="previewImage(item.license_image)" />
          </view>

          <view class="cert-footer">
            <view class="cert-status" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </view>
            <view class="cert-time">{{ formatTime(item.created_at) }}</view>
            <view class="cert-actions">
              <view
                v-if="item.status === 'pending'"
                class="action-btn approve"
                @click="approveCert(item)"
              >通过</view>
              <view
                v-if="item.status === 'pending'"
                class="action-btn reject"
                @click="rejectCert(item)"
              >拒绝</view>
              <!-- 所有状态(通过/拒绝/待审核)都可以删除认证记录，同时后端会同步清空 users 上的认证标记 -->
              <view
                class="action-btn delete"
                @click="deleteCert(item)"
              >删除</view>
            </view>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="certList.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-file-text-ccc.svg" mode="aspectFit" />
        <text class="empty-text">{{ loadError || '暂无认证申请' }}</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

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
      certType: 'all',
      certList: [],
      page: 1,
      hasMore: true,
      loading: false,
      loadError: '',
      pendingCount: 0,
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadCerts();
    this.loadPendingCount();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    setFilter(filter) {
      this.currentFilter = filter;
      this.certList = [];
      this.page = 1;
      this.hasMore = true;
      this.loadCerts();
    },
    setCertType(type) {
      this.certType = type;
      this.certList = [];
      this.page = 1;
      this.hasMore = true;
      this.loadCerts();
    },
    doSearch() {
      this.certList = [];
      this.page = 1;
      this.hasMore = true;
      this.loadCerts();
    },
    getStatusClass(status) {
      switch (status) {
        case 'approved': return 'approved';
        case 'pending': return 'pending';
        case 'rejected': return 'rejected';
        default: return '';
      }
    },
    getStatusText(status) {
      switch (status) {
        case 'approved': return '已通过';
        case 'pending': return '待审核';
        case 'rejected': return '已拒绝';
        default: return '未知';
      }
    },
    formatTime(timeStr) {
      if (!timeStr) return '';
      const date = new Date(timeStr.replace(/-/g, '/'));
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
          const minutes = Math.floor(diff / (1000 * 60));
          return minutes <= 0 ? '刚刚' : `${minutes}分钟前`;
        }
        return `${hours}小时前`;
      }
      if (days < 7) return `${days}天前`;
      return `${date.getMonth() + 1}/${date.getDate()}`;
    },
    async loadPendingCount() {
      try {
        const res = await request('certifications.php', { action: 'list', page: 1, status: 'pending' }, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data) {
          this.pendingCount = res.data.pending_count || (res.data.list ? res.data.list.length : 0);
        }
      } catch (e) {
        const msg = (e && (e.msg || e.message)) || '获取待审核数量失败'
        console.log('[认证待审数量加载失败]', e)
        uni.showToast({ title: msg, icon: 'none' })
      }
    },
    async loadCerts() {
      if (this.loading) return;
      this.loading = true;
      this.loadError = '';

      try {
        const params = {
          action: 'list',
          page: this.page,
          status: this.getStatusValue(this.currentFilter),
          cert_type: this.certType
        };

        if (this.searchKeyword) {
          params.keyword = this.searchKeyword;
        }

        const res = await request('certifications.php', params, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data && res.data.list) {
          if (this.page === 1) {
            this.certList = res.data.list;
            if (res.data.pending_count !== undefined) {
              this.pendingCount = res.data.pending_count;
            }
          } else {
            this.certList = [...this.certList, ...res.data.list];
          }
          this.hasMore = res.data.list.length >= 10;
        }
      } catch (e) {
        const msg = (e && (e.msg || e.message)) || '加载认证列表失败'
        console.log('[认证列表加载失败]', e)
        this.loadError = msg
        uni.showToast({ title: msg, icon: 'none' })
      }
      
      this.loading = false;
    },
    getStatusValue(filter) {
      switch (filter) {
        case 'all': return 'all';
        case 'pending': return 'pending';
        case 'approved': return 'approved';
        case 'rejected': return 'rejected';
        default: return 'all';
      }
    },
    loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page++;
      this.loadCerts();
    },
    previewImage(url) {
      uni.previewImage({
        urls: [url],
        current: url
      });
    },
    async approveCert(item) {
      uni.showModal({
        title: '通过认证',
        content: `确定要通过${item.cert_type === 'enterprise' ? '企业' : '个人'}认证申请吗？`,
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '处理中');
            try {
              const result = await request('certifications.php', {
                action: 'review',
                id: item.id,
                decision: 'approve',
                review_note: ''
              }, { baseURL: bmsBaseUrl });
              if (result.status === 'success') {
                uni.showToast({ title: '审核通过', icon: 'success' });
                item.status = 'approved';
                this.pendingCount = Math.max(0, this.pendingCount - 1);
              } else {
                uni.showToast({ title: result?.msg || '审核失败', icon: 'none' });
              }
            } catch (e) {
              uni.showToast({ title: '审核失败', icon: 'none' });
            }
            this.hud.show = false;
          }
        }
      });
    },
    async rejectCert(item) {
      uni.showModal({
        title: '拒绝认证',
        content: `确定要拒绝${item.cert_type === 'enterprise' ? '企业' : '个人'}认证申请吗？`,
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '处理中');
            try {
              const result = await request('certifications.php', {
                action: 'review',
                id: item.id,
                decision: 'reject',
                review_note: ''
              }, { baseURL: bmsBaseUrl });
              if (result.status === 'success') {
                uni.showToast({ title: '已拒绝', icon: 'success' });
                item.status = 'rejected';
                this.pendingCount = Math.max(0, this.pendingCount - 1);
              } else {
                uni.showToast({ title: result?.msg || '操作失败', icon: 'none' });
              }
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' });
            }
            this.hud.show = false;
          }
        }
      });
    },
    async deleteCert(item) {
      const typeName = item.cert_type === 'enterprise' ? '企业' : '个人'
      uni.showModal({
        title: '删除认证',
        content: `确定删除这条${typeName}认证记录吗？\n\n删除后用户资料页的认证图标/认证名称会同步消失，且无法恢复。`,
        confirmText: '确认删除',
        confirmColor: '#d93026',
        success: async (res) => {
          if (!res.confirm) return
          this.showHud('loading', '删除中')
          try {
            const result = await request('certifications.php', {
              action: 'delete',
              id: item.id,
              // 兼容老路由（certifications/review 只接收 review 动作，新 DELETE 约定传 action=delete）
              type: 'delete'
            }, { baseURL: bmsBaseUrl, method: 'POST' })
            if (result.status === 'success') {
              uni.showToast({ title: '已删除', icon: 'success' })
              // 从当前列表移除，同时同步 tab 数量
              this.certList = this.certList.filter(x => x.id !== item.id)
              if (item.status === 'pending') {
                this.pendingCount = Math.max(0, this.pendingCount - 1)
              }
            } else {
              uni.showToast({ title: result?.msg || '删除失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '删除失败', icon: 'none' })
          }
          this.hud.show = false
        }
      })
    },
    showHud(type, text) {
      this.hud = { show: true, type, text };
    }
  }
};
</script>

<style lang="scss" scoped>
.certifications-page { min-height: 100vh; background: #f0f1f6; }

/* 导航栏 */
/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f0f1f6; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 搜索 */
.search-bar {
  display: flex; padding: 20rpx 24rpx; gap: 16rpx; background: #f0f1f6;
}
.search-input {
  flex: 1; height: 80rpx; background: #fff; border-radius: 40rpx;
  padding: 0 32rpx; font-size: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.search-action {
  width: 130rpx; height: 80rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.3);
}

/* 筛选 */
.filter-bar { background: #fff; padding: 14rpx 0; margin-bottom: 8rpx; }
.filter-scroll { white-space: nowrap; }
.filter-items { display: inline-flex; padding: 0 24rpx; gap: 14rpx; }
.filter-item {
  padding: 10rpx 26rpx; background: #f5f6fa; border-radius: 32rpx;
  font-size: 25rpx; color: #666; font-weight: 500; white-space: nowrap;

  &.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 4rpx 12rpx rgba(102,126,234,0.25); }
}

.filter-row { background: #fff; padding: 18rpx 24rpx; margin-top: 8rpx; }
.filter-group {
  .filter-label { font-size: 25rpx; color: #aaa; margin-bottom: 10rpx; display: block; }
}
.filter-options { display: flex; gap: 12rpx; flex-wrap: wrap; }
.filter-option {
  padding: 9rpx 20rpx; background: #f5f6fa; border-radius: 28rpx;
  font-size: 25rpx; color: #666; font-weight: 400;

  &.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
}

/* 列表 */
.cert-list { padding: 8rpx 24rpx; }
.cert-item {
  background: #fff; border-radius: 20rpx; padding: 22rpx;
  margin-bottom: 16rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.cert-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14rpx; }
.user-info { display: flex; align-items: center; gap: 14rpx; }
.user-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; border: 2rpx solid #f0edff; }
.user-detail {
  .user-name { font-size: 27rpx; font-weight: 600; color: #222; display: block; }
  .user-id { font-size: 22rpx; color: #bbb; margin-top: 4rpx; display: block; }
}
.cert-type {
  padding: 5rpx 14rpx; border-radius: 12rpx; font-size: 21rpx; font-weight: 500;

  &.personal { background: #eef5ff; color: #337ecc; }
  &.enterprise { background: #fef5e7; color: #e67e22; }
}

.cert-content { padding: 14rpx 0; border-top: 1rpx solid #f0f1f6; border-bottom: 1rpx solid #f0f1f6; }
.cert-info {
  display: flex; margin-bottom: 10rpx;
  &:last-child { margin-bottom: 0; }
  .info-label { width: 120rpx; font-size: 25rpx; color: #aaa; flex-shrink: 0; }
  .info-value { flex: 1; font-size: 25rpx; color: #444; word-break: break-all; line-height: 1.45; }
}
.cert-image {
  padding: 14rpx 0;
  image { width: 100%; max-height: 300rpx; border-radius: 14rpx; border: 1rpx solid #f0edff; }
}

.cert-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 14rpx; flex-wrap: wrap; gap: 8rpx; }
.cert-status {
  padding: 5rpx 14rpx; border-radius: 14rpx; font-size: 22rpx; font-weight: 500;

  &.approved { background: #eef9f0; color: #27ae60; }
  &.pending { background: #fef5e7; color: #e67e22; }
  &.rejected { background: #fce8ec; color: #e74c3c; }
}
.cert-time { font-size: 22rpx; color: #bbb; }
.cert-actions { display: flex; gap: 10rpx; }
.action-btn {
  padding: 9rpx 22rpx; border-radius: 20rpx; font-size: 23rpx; font-weight: 500;

  &.approve { background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; }
  &.reject { background: #f5f6fa; color: #888; }
  &.delete { background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; box-shadow: 0 3rpx 10rpx rgba(231,76,60,0.25); }
}

.load-more { padding: 24rpx; text-align: center; }
.load-btn { display: inline-block; padding: 18rpx 36rpx; background: #fff; border-radius: 32rpx; font-size: 26rpx; color: #999; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80rpx 20rpx;
  .empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin-bottom: 16rpx; opacity: 0.6; }
  .empty-text { font-size: 27rpx; color: #bbb; }
}
.footer-space { height: 30rpx; }

.hud-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4rpx); }
.hud-toast { display: flex; flex-direction: column; align-items: center; padding: 30rpx 48rpx; background: rgba(0,0,0,0.78); border-radius: 18rpx; color: #fff; font-size: 27rpx; }
.spinner { width: 32rpx; height: 32rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12rpx; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>