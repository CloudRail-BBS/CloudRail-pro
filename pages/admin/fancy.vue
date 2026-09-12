<template>
  <view class="fancy-page">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="search-bar">
        <input class="search-input" type="text" v-model="searchText" placeholder="搜索靓号或用户名" @confirm="loadData" />
        <view class="search-action" @click="loadData">搜索</view>
        <view class="add-btn" @click="showAddModal = true">添加</view>
      </view>

      <view class="tab-bar">
        <view class="tab-item" :class="{ active: activeTab === 'all' }" @click="switchTab('all')">
          <text>全部</text>
          <text class="tab-count" v-if="tabCounts.all">{{ tabCounts.all }}</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'available' }" @click="switchTab('available')">
          <text>已上架</text>
          <text class="tab-count" v-if="tabCounts.available">{{ tabCounts.available }}</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'sold' }" @click="switchTab('sold')">
          <text>已售出</text>
          <text class="tab-count" v-if="tabCounts.sold">{{ tabCounts.sold }}</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'offline' }" @click="switchTab('offline')">
          <text>已下架</text>
          <text class="tab-count" v-if="tabCounts.offline">{{ tabCounts.offline }}</text>
        </view>
      </view>

      <view class="list">
        <view class="list-item" v-for="item in list" :key="item.id" :class="'item-' + item.status">
          <view class="item-accent"></view>
          <view class="item-main">
            <view class="item-header">
              <view class="number-box">
                <text class="number-label">VIP 靓号</text>
                <text class="number-value">{{ item.number }}</text>
              </view>
              <view class="item-status" :class="'status-' + item.status">
                <text class="status-dot"></text>
                <text>{{ statusText(item.status) }}</text>
              </view>
            </view>
            <view class="item-row">
              <view class="item-meta">
                <view class="price-box">
                  <text class="price-symbol">¥</text>
                  <text class="price-value">{{ item.price }}</text>
                </view>
                <view class="owner-box" v-if="item.owner_name">
                  <text class="owner-name">{{ item.owner_name }}</text>
                </view>
                <view class="owner-box available" v-else>
                  <text class="owner-name">可购买</text>
                </view>
              </view>
              <view class="item-actions">
                <view class="action-btn edit" v-if="item.status === 'available'" @click="showEditModal(item)">
                  <image class="btn-icon-img" src="/static/icon/admin-pencil-d68910.svg" mode="aspectFit" />
                  <text>编辑</text>
                </view>
                <view class="action-btn online" v-if="item.status === 'offline'" @click="toggleItemStatus(item, 'available')">
                  <text class="btn-icon">▲</text>
                  <text>上架</text>
                </view>
                <view class="action-btn offline" v-if="item.status === 'available'" @click="toggleItemStatus(item, 'offline')">
                  <text class="btn-icon">▼</text>
                  <text>下架</text>
                </view>
                <view class="action-btn release" v-if="item.status === 'sold'" @click="releaseNumber(item)">
                  <text class="btn-icon">◉</text>
                  <text>释放</text>
                </view>
                <view class="action-btn delete" @click="deleteNumber(item)">
                  <text class="btn-icon">×</text>
                  <text>删除</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="list.length === 0 && !loading">
        <view class="empty-icon-img-wrap"><image class="empty-icon-img" src="/static/icon/admin-shield-check-ccc.svg" mode="aspectFit" /></view>
        <text class="empty-text">暂无靓号数据</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal-mask" v-if="showAddModal || showEditModalFlag" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingItem ? '编辑靓号' : '添加靓号' }}</text>
          <view class="modal-close" @click="closeModal">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item" v-if="!editingItem">
            <text class="form-label">靓号 (1-7位数字) *</text>
            <input class="form-input" type="text" v-model="formData.number" placeholder="请输入靓号" maxlength="7" />
          </view>
          <view class="form-item">
            <text class="form-label">价格 (0.01-99999.99) *</text>
            <input class="form-input" type="digit" v-model="formData.price" placeholder="请输入价格" />
          </view>
          <view class="form-item" v-if="editingItem">
            <text class="form-label">状态</text>
            <view class="form-select" @click="toggleStatus">
              <text>{{ formData.status === 'available' ? '上架' : '下架' }}</text>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeModal">取消</view>
          <view class="modal-btn confirm" @click="submitForm">{{ editingItem ? '保存' : '添加' }}</view>
        </view>
      </view>
    </view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getScreenMetrics } from '../../common/screen.js';
import { request, bmsBaseUrl } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      searchText: '',
      activeTab: 'all',
      tabCounts: { all: 0, available: 0, sold: 0, offline: 0 },
      showAddModal: false,
      showEditModalFlag: false,
      editingItem: null,
      formData: {
        number: '',
        price: '',
        status: 'available'
      },
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadData();
  },
  methods: {
    goBack() { uni.navigateBack(); },
    showHud(type, text) {
      this.hud = { show: true, type: type || 'loading', text };
    },
    statusText(status) {
      const map = { 'available': '上架', 'offline': '下架', 'sold': '已售' };
      return map[status] || status;
    },
    // 后端 status 是整数(0下架/1可售/2已售), 转成前端字符串便于模板/操作
    normalizeItem(item) {
      const map = { 1: 'available', 0: 'offline', 2: 'sold' };
      return { ...item, status: map[item.status] !== undefined ? map[item.status] : 'offline' };
    },
    statusToInt(status) {
      const map = { available: 1, offline: 0, sold: 2 };
      return map[status] !== undefined ? map[status] : 1;
    },
    switchTab(tab) {
      if (this.activeTab === tab) return;
      this.activeTab = tab;
      this.loadData();
    },
    async loadData() {
      if (this.loading) return;
      this.loading = true;
      this.page = 1;
      try {
        const params = {
          action: 'get_list',
          page: this.page,
          status: this.activeTab,
          search: this.searchText
        };
        const res = await request('admin_fancy.php', params, { method: 'GET', baseURL: bmsBaseUrl });
        if (res.status === 'success' || res.code === 0) {
          this.list = (res.data.list || []).map(item => this.normalizeItem(item));
          this.hasMore = (res.data.list || []).length >= 20;
          if (res.data.counts) { this.tabCounts = res.data.counts; }
        }
      } catch (e) { }
      this.loading = false;
    },
    async loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page++;
      this.loading = true;
      try {
        const params = {
          action: 'get_list',
          page: this.page,
          status: this.activeTab,
          search: this.searchText
        };
        const res = await request('admin_fancy.php', params, { method: 'GET', baseURL: bmsBaseUrl });
        if (res.status === 'success' || res.code === 0) {
          this.list = [...this.list, ...(res.data.list || []).map(item => this.normalizeItem(item))];
          this.hasMore = (res.data.list || []).length >= 20;
        }
      } catch (e) { }
      this.loading = false;
    },
    showEditModal(item) {
      this.editingItem = item;
      this.formData = { price: String(item.price), status: item.status };
      this.showEditModalFlag = true;
    },
    async toggleItemStatus(item, status) {
      const text = status === 'available' ? '上架' : '下架';
      uni.showModal({ title: `确认${text}`, content: `确定将靓号 ${item.number} ${text}吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '处理中...');
          try {
            const r = await request('admin_fancy.php', { action: 'update', id: item.id, price: item.price, status: this.statusToInt(status) }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success') { uni.showToast({ title: `${text}成功`, icon: 'success' }); this.loadData(); }
            else { uni.showToast({ title: r.msg || '操作失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '操作失败', icon: 'none' }); }
        }
      }});
    },
    closeModal() {
      this.showAddModal = false;
      this.showEditModalFlag = false;
      this.editingItem = null;
      this.formData = { number: '', price: '', status: 'available' };
    },
    toggleStatus() {
      this.formData.status = this.formData.status === 'available' ? 'offline' : 'available';
    },
    async submitForm() {
      if (!this.editingItem) {
        if (!this.formData.number || !/^\d{1,7}$/.test(this.formData.number)) {
          uni.showToast({ title: '靓号只能是1-7位数字', icon: 'none' }); return;
        }
      }
      if (!this.formData.price || parseFloat(this.formData.price) < 0.01) {
        uni.showToast({ title: '价格不能小于0.01', icon: 'none' }); return;
      }
      this.showHud('loading', '处理中...');
      try {
        const data = { action: this.editingItem ? 'update' : 'add', price: this.formData.price };
        if (this.editingItem) { data.id = this.editingItem.id; data.status = this.statusToInt(this.formData.status); }
        else { data.number = this.formData.number; }
        const res = await request('admin_fancy.php', data, { method: 'POST', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success') {
          uni.showToast({ title: '操作成功', icon: 'success' });
          this.closeModal();
          this.loadData();
        } else { uni.showToast({ title: res.msg || '操作失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '操作失败', icon: 'none' }); }
    },
    async releaseNumber(item) {
      uni.showModal({ title: '确认释放', content: `确定释放靓号 ${item.number} 吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '释放中...');
          try {
            const r = await request('admin_fancy.php', { action: 'release', id: item.id }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success') { uni.showToast({ title: '释放成功', icon: 'success' }); this.loadData(); }
            else { uni.showToast({ title: r.msg || '释放失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '释放失败', icon: 'none' }); }
        }
      }});
    },
    async deleteNumber(item) {
      if (item.status === 'sold') { uni.showToast({ title: '已售出的靓号需先释放', icon: 'none' }); return; }
      uni.showModal({ title: '确认删除', content: `确定删除靓号 ${item.number} 吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('admin_fancy.php', { action: 'delete', id: item.id }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success') { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadData(); }
            else { uni.showToast({ title: r.msg || '删除失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '删除失败', icon: 'none' }); }
        }
      }});
    }
  }
};
</script>

<style scoped>
.fancy-page { min-height: 100vh; background: linear-gradient(180deg, #fafafa 0%, #f0f1f6 100%); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #fafafa; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 搜索栏 */
.search-bar { display: flex; margin: 24rpx; gap: 16rpx; align-items: center; }
.search-input { flex: 1; height: 80rpx; background: #fff; border-radius: 40rpx; padding: 0 32rpx; font-size: 28rpx; box-shadow: 0 4rpx 24rpx rgba(102,126,234,0.06); border: 2rpx solid transparent; }
.search-input:focus { border-color: #667eea; }
.search-action { width: 120rpx; height: 80rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.25); }
.search-action:active { opacity: 0.85; }
.add-btn {
  width: 110rpx; height: 80rpx; background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff; border-radius: 40rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 700; box-shadow: 0 4rpx 16rpx rgba(39,174,96,0.25);
}
.add-btn:active { opacity: 0.85; }

/* ===== Tab栏 ===== */
.tab-bar { display: flex; margin: 0 24rpx 20rpx; background: #fff; border-radius: 16rpx; padding: 8rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.05); }
.tab-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 16rpx 0; border-radius: 12rpx; font-size: 26rpx; color: #666; font-weight: 500; position: relative; }
.tab-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; box-shadow: 0 4rpx 12rpx rgba(102,126,234,0.2); }
.tab-count { font-size: 20rpx; background: rgba(255, 255, 255, 0.25); color: inherit; padding: 2rpx 10rpx; border-radius: 12rpx; }
.tab-item.active .tab-count { background: rgba(255, 255, 255, 0.3); }

/* ===== 列表 ===== */
.list { margin: 0 24rpx; }
.list-item { 
  background: #fff; border-radius: 26rpx; margin-bottom: 22rpx; 
  box-shadow: 0 8rpx 32rpx rgba(102,126,234,0.08); display: flex; overflow: hidden; 
  position: relative; border: 1rpx solid #f5f6fa;
  transition: all 0.3s ease;
}
.list-item:active { transform: scale(0.99); box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.1); }
.list-item::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5rpx; border-radius: 26rpx 26rpx 0 0; }
.item-available::before { background: linear-gradient(90deg, #27ae60, #55c27a); }
.item-offline::before { background: linear-gradient(90deg, #e67e22, #f5a623); }
.item-sold::before { background: linear-gradient(90deg, #337ecc, #5dade2); }

.item-accent { width: 10rpx; flex-shrink: 0; border-radius: 0 26rpx 26rpx 0; }
.item-available .item-accent { background: linear-gradient(180deg, #27ae60, #2ecc71); }
.item-offline .item-accent { background: linear-gradient(180deg, #e67e22, #f39c12); }
.item-sold .item-accent { background: linear-gradient(180deg, #337ecc, #5a9fd4); }

.item-main { flex: 1; padding: 26rpx; min-width: 0; }

/* 头部 */
.item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16rpx; }
.number-box { display: flex; flex-direction: column; min-width: 0; }
.number-label { font-size: 20rpx; color: #888; margin-bottom: 4rpx; letter-spacing: 1rpx; }
.number-value { font-size: 40rpx; font-weight: 800; color: #1a1a1a; letter-spacing: 2rpx; font-family: 'SF Mono', 'DIN Alternate', 'Helvetica Neue', sans-serif; text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05); }

.item-status { display: flex; align-items: center; gap: 8rpx; font-size: 21rpx; padding: 6rpx 16rpx; border-radius: 20rpx; font-weight: 600; flex-shrink: 0; }
.status-dot { width: 12rpx; height: 12rpx; border-radius: 50%; flex-shrink: 0; }
.status-available { background: linear-gradient(135deg, #d4edda, #c3e6cb); color: #155724; }
.status-available .status-dot { background: #27ae60; box-shadow: 0 0 8rpx rgba(39,174,96,0.4); }
.status-offline { background: linear-gradient(135deg, #fef5e7, #fdecd0); color: #8b4513; }
.status-offline .status-dot { background: #e67e22; box-shadow: 0 0 8rpx rgba(230,126,34,0.4); }
.status-sold { background: linear-gradient(135deg, #cce5ff, #b8daff); color: #004085; }
.status-sold .status-dot { background: #337ecc; box-shadow: 0 0 8rpx rgba(51,126,204,0.4); }

.item-row { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.item-meta { display: flex; align-items: center; gap: 20rpx; flex: 1; min-width: 0; }
.price-box { display: flex; align-items: baseline; flex-shrink: 0; }
.price-symbol { font-size: 24rpx; color: #e74c3c; font-weight: 700; }
.price-value { font-size: 36rpx; color: #e74c3c; font-weight: 800; margin-left: 4rpx; }
.owner-box { display: flex; align-items: center; gap: 8rpx; background: #f5f6fa; padding: 6rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.owner-box.available { background: linear-gradient(135deg, #eef9f0, #d4edda); }
.owner-name { font-size: 24rpx; color: #555; font-weight: 600; }
.owner-box.available .owner-name { color: #1e7e34; }

/* 操作按钮 */
.item-actions { display: flex; gap: 12rpx; flex-shrink: 0; }
.action-btn { display: flex; align-items: center; justify-content: center; gap: 6rpx; padding: 10rpx 18rpx; border-radius: 24rpx; font-size: 23rpx; font-weight: 600; transition: all 0.2s ease; }
.action-btn:active { opacity: 0.8; transform: scale(0.96); }
.btn-icon { font-size: 22rpx; display: flex; align-items: center; justify-content: center; }
.btn-icon-img { width: 32rpx; height: 32rpx; display: block; }
.action-btn.edit { background: linear-gradient(135deg, #fef5e7, #fdecd0); color: #d68910; }
.action-btn.online { background: linear-gradient(135deg, #eef9f0, #d4edda); color: #27ae60; }
.action-btn.offline { background: linear-gradient(135deg, #eef5ff, #cce5ff); color: #337ecc; }
.action-btn.release { background: linear-gradient(135deg, #f5f1ff, #ebe5ff); color: #764ba2; }
.action-btn.delete { background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }

/* 加载更多 */
.load-more { margin: 32rpx 24rpx; text-align: center; }
.load-btn { padding: 24rpx; background: #fff; border-radius: 16rpx; font-size: 28rpx; color: #666; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.06); font-weight: 500; }
.load-btn:active { background: #fafafa; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon-img-wrap { display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; opacity: 0.6; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; }
.empty-text { font-size: 30rpx; color: #bbb; font-weight: 500; }
.footer-space { height: 60rpx; }

/* ===== 弹窗 ===== */
.modal-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.modal-content { width: 88%; max-width: 600rpx; background: #fff; border-radius: 32rpx; overflow: hidden; box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 32rpx 36rpx; border-bottom: 1rpx solid #f0f1f6; }
.modal-title { font-size: 34rpx; font-weight: 700; color: #333; }
.modal-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #ccc; border-radius: 50%; }
.modal-close:active { background: #f5f6fa; }
.modal-body { padding: 32rpx 36rpx; }
.form-item { margin-bottom: 28rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; font-weight: 500; }
.form-input { width: 100%; height: 88rpx; background: #f8f8f8; border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; color: #333; border: 2rpx solid transparent; }
.form-input:focus { border-color: #667eea; background: #fff; }
.form-select { width: 100%; height: 88rpx; background: #f8f8f8; border-radius: 16rpx; padding: 0 24rpx; display: flex; align-items: center; font-size: 30rpx; color: #333; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f1f6; padding: 16rpx; gap: 16rpx; }
.modal-btn { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; border-radius: 16rpx; }
.modal-btn.cancel { color: #666; background: #f5f6fa; }
.modal-btn.cancel:active { background: #eaeaea; }
.modal-btn.confirm { color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.25); }
.modal-btn.confirm:active { opacity: 0.85; }

/* ===== HUD ===== */
.hud-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 9999; }
.hud-toast { background: rgba(0, 0, 0, 0.78); color: #fff; padding: 32rpx 48rpx; border-radius: 20rpx; font-size: 30rpx; display: flex; align-items: center; gap: 16rpx; backdrop-filter: blur(8rpx); }
.spinner.white { width: 32rpx; height: 32rpx; border: 4rpx solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
