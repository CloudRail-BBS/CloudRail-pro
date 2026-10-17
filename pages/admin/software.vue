<template>
  <view class="software-page" :class="themeClass">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 顶部 Tab 切换 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: currentTab === 'list' }" @click="switchTab('list')">软件列表</view>
      <view class="tab-item" :class="{ active: currentTab === 'cat' }" @click="switchTab('cat')">分类管理</view>
      <view class="tab-item" :class="{ active: currentTab === 'channel' }" @click="switchTab('channel')">渠道管理</view>
    </view>

    <scroll-view class="main-scroll" scroll-y>
      <view class="nav-placeholder" style="height: 8rpx;"></view>

      <!-- ============ 软件列表 ============ -->
      <block v-if="currentTab === 'list'">
        <view class="search-bar">
          <input class="search-input" type="text" v-model="searchText" placeholder="搜索软件名称" @confirm="loadData" />
          <view class="search-action" @click="loadData">搜索</view>
        </view>

        <view class="filter-bar">
          <view class="filter-item" :class="{ active: statusFilter === 'all' }" @click="setStatus('all')">全部</view>
          <view class="filter-item" :class="{ active: statusFilter === '1' }" @click="setStatus('1')">已上线</view>
          <view class="filter-item" :class="{ active: statusFilter === '0' }" @click="setStatus('0')">待审核</view>
          <view class="filter-item" :class="{ active: statusFilter === '2' }" @click="setStatus('2')">已拒绝</view>
        </view>

        <view class="list">
          <view class="list-item" v-for="item in list" :key="item.id">
            <view class="item-header">
              <image class="item-logo" :src="item.logo" mode="aspectFill" />
              <view class="item-info">
                <text class="item-title">{{ item.name }}</text>
                <text class="item-version">v{{ item.version }} · {{ item.size }}</text>
              </view>
              <text class="item-status" :class="'status-' + item.status">{{ statusText(item.status) }}</text>
            </view>
            <view class="item-intro">{{ item.intro || '暂无简介' }}</view>
            <view class="item-meta">
              <text class="meta-tag">分类: {{ item.category_name || '未分类' }}</text>
              <text class="meta-tag">下载: {{ item.download_count || 0 }}</text>
              <text class="meta-tag">作者: {{ item.username || '-' }}</text>
            </view>
            <view class="item-actions">
              <view class="action-btn primary" @click="showDetail(item)">详情</view>
              <view class="action-btn success" @click="editItem(item)">编辑</view>
              <view class="action-btn warn" v-if="item.status === '2'" @click="updateStatus(item, '1')">通过</view>
              <view class="action-btn danger" v-if="item.status === '2'" @click="updateStatus(item, '0')">拒绝</view>
              <view class="action-btn info" v-if="item.status === '1'" @click="updateStatus(item, '0')">下架</view>
              <view class="action-btn info" v-if="item.status === '1'" @click="updateStatus(item, '2')">转待审</view>
              <view class="action-btn success" v-if="item.status === '0'" @click="updateStatus(item, '1')">上架</view>
              <view class="action-btn danger" @click="deleteItem(item)">删除</view>
            </view>
          </view>
        </view>

        <view class="load-more" v-if="hasMore">
          <view class="load-btn" @click="loadMore">
            <text>{{ loading ? '加载中...' : '加载更多' }}</text>
          </view>
        </view>

        <view class="empty-state" v-if="list.length === 0 && !loading">
          <image class="empty-icon-img" src="/static/icon/admin-smartphone-ccc.svg" mode="aspectFit" />
          <text class="empty-text">暂无软件数据</text>
        </view>
      </block>

      <!-- ============ 分类管理 ============ -->
      <view class="cat-section" v-if="currentTab === 'cat'">
        <view class="cat-head">
          <text class="cat-title">软件分类 ({{ categoryList.length }})</text>
          <view class="cat-add-btn" @click="openCategoryModal(null)">+ 新增分类</view>
        </view>
        <view class="cat-item" v-for="cat in categoryList" :key="'c' + cat.id">
          <view class="cat-info">
            <text class="cat-icon">{{ cat.icon || '📦' }}</text>
            <view class="cat-text">
              <text class="cat-name">{{ cat.name }}</text>
              <text class="cat-sort">排序 {{ cat.sort || 0 }}</text>
            </view>
            <text class="cat-status" :class="String(cat.status) === '1' ? 'on' : 'off'">{{ String(cat.status) === '1' ? '启用' : '停用' }}</text>
          </view>
          <view class="cat-actions">
            <view class="action-btn primary" @click="openCategoryModal(cat)">编辑</view>
            <view class="action-btn info" @click="toggleCategory(cat)">{{ String(cat.status) === '1' ? '停用' : '启用' }}</view>
            <view class="action-btn danger" @click="deleteCategory(cat)">删除</view>
          </view>
        </view>
        <view class="empty-state" v-if="categoryList.length === 0 && !loadingCat">
          <text class="empty-text">暂无分类，点击右上角新增</text>
        </view>
      </view>

      <!-- ============ 渠道管理 ============ -->
      <view class="cat-section" v-if="currentTab === 'channel'">
        <view class="cat-head">
          <text class="cat-title">软件渠道 ({{ channelList.length }})</text>
          <view class="cat-add-btn" @click="openChannelModal(null)">+ 新增渠道</view>
        </view>
        <view class="cat-item" v-for="ch in channelList" :key="'ch' + ch.id">
          <view class="cat-info">
            <text class="cat-icon">{{ ch.icon || '🏷️' }}</text>
            <view class="cat-text">
              <text class="cat-name">{{ ch.name }}</text>
              <text class="cat-sort">排序 {{ ch.sort || 0 }}</text>
            </view>
            <text class="cat-status" :class="String(ch.status) === '1' ? 'on' : 'off'">{{ String(ch.status) === '1' ? '启用' : '停用' }}</text>
          </view>
          <view class="cat-actions">
            <view class="action-btn primary" @click="openChannelModal(ch)">编辑</view>
            <view class="action-btn info" @click="toggleChannel(ch)">{{ String(ch.status) === '1' ? '停用' : '启用' }}</view>
            <view class="action-btn danger" @click="deleteChannel(ch)">删除</view>
          </view>
        </view>
        <view class="empty-state" v-if="channelList.length === 0 && !loadingChannel">
          <text class="empty-text">暂无渠道，点击右上角新增</text>
        </view>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>

    <!-- 软件详情弹窗 -->
    <view class="modal-mask" v-if="showDetailModal" @click="closeDetailModal">
      <view class="modal-content detail-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">软件详情</text>
          <view class="modal-close" @click="closeDetailModal">×</view>
        </view>
        <view class="modal-body" v-if="detailData">
          <view class="detail-header">
            <image class="detail-logo" :src="detailData.logo" mode="aspectFill" />
            <view class="detail-info">
              <text class="detail-name">{{ detailData.name }}</text>
              <text class="detail-version">版本: v{{ detailData.version }}</text>
              <text class="detail-size">大小: {{ detailData.size }}</text>
            </view>
          </view>
          <view class="detail-section">
            <text class="detail-label">简介</text>
            <text class="detail-content">{{ detailData.intro }}</text>
          </view>
          <view class="detail-section">
            <text class="detail-label">分类</text>
            <text class="detail-content">{{ detailData.category_name || '未分类' }}</text>
          </view>
          <view class="detail-section">
            <text class="detail-label">作者</text>
            <text class="detail-content">{{ detailData.username || '-' }}</text>
          </view>
          <view class="detail-section">
            <text class="detail-label">下载次数</text>
            <text class="detail-content">{{ detailData.download_count || 0 }}</text>
          </view>
          <view class="detail-section">
            <text class="detail-label">下载链接</text>
            <text class="detail-content link">{{ detailData.download_url }}</text>
          </view>
          <view class="detail-section" v-if="detailData.images_arr && detailData.images_arr.length > 0">
            <text class="detail-label">截图</text>
            <view class="detail-images">
              <image v-for="(img, idx) in detailData.images_arr" :key="idx" class="detail-image" :src="img" mode="widthFix" />
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeDetailModal">关闭</view>
        </view>
      </view>
    </view>

    <!-- 编辑软件弹窗 -->
    <view class="modal-mask" v-if="showEditModal" @click="closeEditModal">
      <view class="modal-content edit-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">编辑软件</text>
          <view class="modal-close" @click="closeEditModal">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">软件名称</text>
            <input class="form-input" v-model="editForm.name" placeholder="请输入软件名称" />
          </view>
          <view class="form-item">
            <text class="form-label">版本号</text>
            <input class="form-input" v-model="editForm.version" placeholder="请输入版本号" />
          </view>
          <view class="form-item">
            <text class="form-label">大小</text>
            <input class="form-input" v-model="editForm.size" placeholder="请输入大小" />
          </view>
          <view class="form-item">
            <text class="form-label">Logo URL</text>
            <input class="form-input" v-model="editForm.logo" placeholder="请输入Logo URL" />
          </view>
          <view class="form-item">
            <text class="form-label">简介</text>
            <textarea class="form-textarea" v-model="editForm.intro" placeholder="请输入软件简介"></textarea>
          </view>
          <view class="form-item">
            <text class="form-label">下载链接</text>
            <input class="form-input" v-model="editForm.download_url" placeholder="请输入下载链接" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeEditModal">取消</view>
          <view class="btn btn-confirm" @click="saveEdit">保存</view>
        </view>
      </view>
    </view>

    <!-- 新增/编辑分类弹窗 -->
    <view class="modal-mask" v-if="showCategoryModal" @click="closeCategoryModal">
      <view class="modal-content edit-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ categoryForm.id ? '编辑分类' : '新增分类' }}</text>
          <view class="modal-close" @click="closeCategoryModal">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">分类名称 *</text>
            <input class="form-input" v-model="categoryForm.name" placeholder="请输入分类名称" />
          </view>
          <view class="form-item">
            <text class="form-label">图标(emoji)</text>
            <input class="form-input" v-model="categoryForm.icon" placeholder="如 📦" />
          </view>
          <view class="form-item">
            <text class="form-label">排序</text>
            <input class="form-input" type="number" v-model="categoryForm.sort" placeholder="数字越小越靠前" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeCategoryModal">取消</view>
          <view class="btn btn-confirm" @click="saveCategory">保存</view>
        </view>
      </view>
    </view>

    <!-- 新增/编辑渠道弹窗 -->
    <view class="modal-mask" v-if="showChannelModal" @click="closeChannelModal">
      <view class="modal-content edit-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ channelForm.id ? '编辑渠道' : '新增渠道' }}</text>
          <view class="modal-close" @click="closeChannelModal">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">渠道名称 *</text>
            <input class="form-input" v-model="channelForm.name" placeholder="请输入渠道名称" />
          </view>
          <view class="form-item">
            <text class="form-label">图标(emoji)</text>
            <input class="form-input" v-model="channelForm.icon" placeholder="如 🏷️" />
          </view>
          <view class="form-item">
            <text class="form-label">排序</text>
            <input class="form-input" type="number" v-model="channelForm.sort" placeholder="数字越小越靠前" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeChannelModal">取消</view>
          <view class="btn btn-confirm" @click="saveChannel">保存</view>
        </view>
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
      currentTab: 'list',
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      searchText: '',
      statusFilter: 'all',
      hud: { show: false, type: 'loading', text: '' },
      showDetailModal: false,
      showEditModal: false,
      detailData: null,
      editForm: {
        id: 0,
        name: '',
        version: '',
        size: '',
        logo: '',
        intro: '',
        download_url: ''
      },
      categoryList: [],
      channelList: [],
      loadingCat: false,
      loadingChannel: false,
      showCategoryModal: false,
      showChannelModal: false,
      categoryForm: { id: 0, name: '', icon: '', sort: 0, status: 1 },
      channelForm: { id: 0, name: '', icon: '', sort: 0, status: 1 }
    };
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadData();
  },
  methods: {
    goBack() { uni.navigateBack(); },
    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text }; },
    statusText(status) {
      const map = { '0': '已下架', '1': '已上线', '2': '待审核' };
      return map[String(status)] || '未知';
    },
    setStatus(status) {
      this.statusFilter = status;
      this.loadData();
    },
    switchTab(tab) {
      this.currentTab = tab;
      if (tab === 'cat') this.loadCategories();
      else if (tab === 'channel') this.loadChannels();
    },
    async loadData() {
      if (this.loading) return;
      this.loading = true;
      this.page = 1;
      try {
        const res = await request('admin_software.php', {
          action: 'get_list',
          page: this.page,
          search: this.searchText,
          status: this.statusFilter
        }, { method: 'GET', baseURL: bmsBaseUrl });
        if (res.status === 'success' || res.code === 0) {
          this.list = res.data.list || [];
          this.hasMore = (res.data.list || []).length >= 10;
        }
      } catch (e) { }
      this.loading = false;
    },
    async loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page++;
      this.loading = true;
      try {
        const res = await request('admin_software.php', {
          action: 'get_list',
          page: this.page,
          search: this.searchText,
          status: this.statusFilter
        }, { method: 'GET', baseURL: bmsBaseUrl });
        if (res.status === 'success' || res.code === 0) {
          this.list = [...this.list, ...(res.data.list || [])];
          this.hasMore = (res.data.list || []).length >= 10;
        }
      } catch (e) { }
      this.loading = false;
    },
    async updateStatus(item, status) {
      this.showHud('loading', '处理中...');
      try {
        const res = await request('admin_software.php', { action: 'update_status', id: item.id, status: status }, { method: 'POST', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) { uni.showToast({ title: '操作成功', icon: 'success' }); this.loadData(); }
        else { uni.showToast({ title: (res && (res.msg || res.message)) || '操作失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '操作失败', icon: 'none' }); }
    },
    async deleteItem(item) {
      uni.showModal({ title: '确认删除', content: `确定删除软件 "${item.name}" 吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('admin_software.php', { action: 'delete', id: item.id }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success' || r.code === 0) { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadData(); }
            else { uni.showToast({ title: (r && (r.msg || r.message)) || '删除失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '删除失败', icon: 'none' }); }
        }
      }});
    },
    async showDetail(item) {
      this.showHud('loading', '加载中...');
      try {
        const res = await request('admin_software.php', { action: 'get_detail', id: item.id }, { method: 'GET', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) {
          this.detailData = res.data;
          this.showDetailModal = true;
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '获取详情失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: '获取详情失败', icon: 'none' });
      }
    },
    closeDetailModal() {
      this.showDetailModal = false;
      this.detailData = null;
    },
    editItem(item) {
      this.editForm = {
        id: item.id || 0,
        name: item.name || '',
        version: item.version || '',
        size: item.size || '',
        logo: item.logo || '',
        intro: item.intro || '',
        download_url: item.download_url || ''
      };
      this.showEditModal = true;
    },
    closeEditModal() {
      this.showEditModal = false;
      this.editForm = { id: 0, name: '', version: '', size: '', logo: '', intro: '', download_url: '' };
    },
    async saveEdit() {
      if (!this.editForm.name.trim()) {
        uni.showToast({ title: '请输入软件名称', icon: 'none' });
        return;
      }
      if (!this.editForm.version.trim()) {
        uni.showToast({ title: '请输入版本号', icon: 'none' });
        return;
      }
      this.showHud('loading', '保存中...');
      try {
        const res = await request('admin_software.php', {
          action: 'save',
          id: this.editForm.id,
          name: this.editForm.name,
          version: this.editForm.version,
          size: this.editForm.size,
          logo: this.editForm.logo,
          intro: this.editForm.intro,
          download_url: this.editForm.download_url
        }, { method: 'POST', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) {
          uni.showToast({ title: '保存成功', icon: 'success' });
          this.closeEditModal();
          this.loadData();
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '保存失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
    },

    /* ===== 分类管理 ===== */
    async loadCategories() {
      this.loadingCat = true;
      try {
        const res = await request('software_categories.php', { action: 'list', all: 1 }, { method: 'GET', baseURL: bmsBaseUrl });
        if (res.status === 'success' || res.code === 0) {
          const d = res.data;
          this.categoryList = Array.isArray(d) ? d : (d.list || []);
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '加载失败', icon: 'none' });
        }
      } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }); }
      this.loadingCat = false;
    },
    openCategoryModal(cat) {
      this.categoryForm = cat ? { id: cat.id, name: cat.name || '', icon: cat.icon || '', sort: cat.sort || 0, status: cat.status } : { id: 0, name: '', icon: '', sort: 0, status: 1 };
      this.showCategoryModal = true;
    },
    closeCategoryModal() {
      this.showCategoryModal = false;
      this.categoryForm = { id: 0, name: '', icon: '', sort: 0, status: 1 };
    },
    async saveCategory() {
      if (!this.categoryForm.name.trim()) { uni.showToast({ title: '请输入分类名称', icon: 'none' }); return; }
      this.showHud('loading', '保存中...');
      try {
        const payload = { name: this.categoryForm.name, icon: this.categoryForm.icon, sort: this.categoryForm.sort || 0 };
        let res;
        if (this.categoryForm.id) {
          payload.id = this.categoryForm.id;
          payload.status = this.categoryForm.status;
          res = await request('software_categories.php', { action: 'update', ...payload }, { method: 'POST', baseURL: bmsBaseUrl });
        } else {
          res = await request('software_categories.php', { action: 'create', ...payload }, { method: 'POST', baseURL: bmsBaseUrl });
        }
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) {
          uni.showToast({ title: '保存成功', icon: 'success' });
          this.closeCategoryModal();
          this.loadCategories();
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '保存失败', icon: 'none' });
        }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '保存失败', icon: 'none' }); }
    },
    async toggleCategory(cat) {
      this.showHud('loading', '处理中...');
      try {
        const res = await request('software_categories.php', {
          action: 'toggle_status',
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          sort: cat.sort || 0,
          status: String(cat.status) === '1' ? 0 : 1
        }, { method: 'POST', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) { uni.showToast({ title: '操作成功', icon: 'success' }); this.loadCategories(); }
        else { uni.showToast({ title: (res && (res.msg || res.message)) || '操作失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '操作失败', icon: 'none' }); }
    },
    deleteCategory(cat) {
      uni.showModal({ title: '确认删除', content: `确定删除分类 "${cat.name}" 吗? 该分类下的软件将变为未分类。`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('software_categories.php', { action: 'delete', id: cat.id }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success' || r.code === 0) { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadCategories(); }
            else { uni.showToast({ title: (r && (r.msg || r.message)) || '删除失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '删除失败', icon: 'none' }); }
        }
      }});
    },

    /* ===== 渠道管理 ===== */
    async loadChannels() {
      this.loadingChannel = true;
      try {
        const res = await request('software_categories.php', { action: 'channel_list', all: 1 }, { method: 'GET', baseURL: bmsBaseUrl });
        if (res.status === 'success' || res.code === 0) {
          const d = res.data || [];
          this.channelList = Array.isArray(d) ? d : (d.list || []);
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '加载失败', icon: 'none' });
        }
      } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }); }
      this.loadingChannel = false;
    },
    openChannelModal(ch) {
      this.channelForm = ch ? { id: ch.id, name: ch.name || '', icon: ch.icon || '', sort: ch.sort || 0, status: ch.status } : { id: 0, name: '', icon: '', sort: 0, status: 1 };
      this.showChannelModal = true;
    },
    closeChannelModal() {
      this.showChannelModal = false;
      this.channelForm = { id: 0, name: '', icon: '', sort: 0, status: 1 };
    },
    async saveChannel() {
      if (!this.channelForm.name.trim()) { uni.showToast({ title: '请输入渠道名称', icon: 'none' }); return; }
      this.showHud('loading', '保存中...');
      try {
        const payload = { name: this.channelForm.name, icon: this.channelForm.icon, sort: this.channelForm.sort || 0 };
        let res;
        if (this.channelForm.id) {
          payload.id = this.channelForm.id;
          payload.status = this.channelForm.status;
          res = await request('software_categories.php', { action: 'channel_update', ...payload }, { method: 'POST', baseURL: bmsBaseUrl });
        } else {
          res = await request('software_categories.php', { action: 'channel_create', ...payload }, { method: 'POST', baseURL: bmsBaseUrl });
        }
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) {
          uni.showToast({ title: '保存成功', icon: 'success' });
          this.closeChannelModal();
          this.loadChannels();
        } else {
          uni.showToast({ title: (res && (res.msg || res.message)) || '保存失败', icon: 'none' });
        }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '保存失败', icon: 'none' }); }
    },
    async toggleChannel(ch) {
      this.showHud('loading', '处理中...');
      try {
        const res = await request('software_categories.php', {
          action: 'channel_toggle_status',
          id: ch.id,
          name: ch.name,
          icon: ch.icon,
          sort: ch.sort || 0,
          status: String(ch.status) === '1' ? 0 : 1
        }, { method: 'POST', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) { uni.showToast({ title: '操作成功', icon: 'success' }); this.loadChannels(); }
        else { uni.showToast({ title: (res && (res.msg || res.message)) || '操作失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '操作失败', icon: 'none' }); }
    },
    deleteChannel(ch) {
      uni.showModal({ title: '确认删除', content: `确定删除渠道 "${ch.name}" 吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('software_categories.php', { action: 'channel_delete', id: ch.id }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success' || r.code === 0) { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadChannels(); }
            else { uni.showToast({ title: (r && (r.msg || r.message)) || '删除失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '删除失败', icon: 'none' }); }
        }
      }});
    }
  }
};
</script>

<style scoped>
.software-page { min-height: 100vh; background: var(--cr-surface-alt); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: var(--cr-surface-alt); }

/* 顶部 Tab */
.tab-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 998;
  display: flex; background: var(--cr-surface); box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.08);
}
.tab-item {
  flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; color: var(--cr-text-muted); font-weight: 600; border-bottom: 4rpx solid transparent; transition: all .2s;
}
.tab-item.active { color: #667eea; border-bottom-color: #667eea; }

.main-scroll { height: 100vh; padding-top: 132rpx; }

/* 搜索 */
.search-bar { display: flex; margin: 24rpx; gap: 16rpx; }
.search-input {
  flex: 1; height: 84rpx; background: var(--cr-surface); border-radius: 42rpx;
  padding: 0 32rpx; font-size: 28rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.08);
  border: 2rpx solid #f0f1f6; transition: all 0.3s ease;
}
.search-input:focus { border-color: #667eea; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.15); }
.search-action {
  width: 140rpx; height: 84rpx; background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border-radius: 42rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.3);
  transition: all 0.3s ease;
}
.search-action:active { transform: scale(0.96); }

/* 筛选 */
.filter-bar { display: flex; padding: 20rpx 24rpx; gap: 16rpx; flex-wrap: wrap; }
.filter-item {
  padding: 14rpx 28rpx; background: var(--cr-surface); border-radius: 32rpx;
  font-size: 26rpx; color: var(--cr-text-muted); font-weight: 500; border: 2rpx solid #e8e9ef;
  transition: all 0.3s ease;
}
.filter-item:active { transform: scale(0.96); }
.filter-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2); color: #fff;
  border-color: transparent; box-shadow: 0 6rpx 20rpx rgba(102,126,234,0.3);
}

/* 列表 */
.list { margin: 0 24rpx; }
.list-item {
  background: var(--cr-surface); border-radius: 22rpx; padding: 26rpx;
  margin-bottom: 18rpx; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.06);
  border: 1rpx solid #f5f6fa; transition: all 0.3s ease;
}
.list-item:active { transform: scale(0.99); box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.08); }
.item-header { display: flex; align-items: center; margin-bottom: 16rpx; }
.item-logo { width: 88rpx; height: 88rpx; border-radius: 18rpx; border: 2rpx solid #f0edff; box-shadow: 0 4rpx 12rpx rgba(102,126,234,0.1); }
.item-info { flex: 1; margin-left: 20rpx; min-width: 0; }
.item-title { display: block; font-size: 31rpx; font-weight: 700; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-version { display: block; font-size: 24rpx; color: var(--cr-text-muted); margin-top: 6rpx; }
.item-status { font-size: 23rpx; padding: 7rpx 18rpx; border-radius: 20rpx; font-weight: 600; }
.status-0 { background: linear-gradient(135deg, #fef5e7, #fdecd0); color: #8b4513; }
.status-1 { background: linear-gradient(135deg, #eef9f0, #d4edda); color: #155724; }
.status-2 { background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }
.item-intro { font-size: 27rpx; color: var(--cr-text-muted); line-height: 1.6; margin-bottom: 16rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.item-meta { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 16rpx; padding-top: 14rpx; border-top: 1rpx solid #f0f1f6; }
.meta-tag { font-size: 23rpx; color: var(--cr-text-muted); background: #f8f9fa; padding: 7rpx 16rpx; border-radius: 12rpx; }
.item-actions { display: flex; gap: 12rpx; justify-content: flex-end; flex-wrap: wrap; }
.action-btn { padding: 11rpx 24rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: 600; white-space: nowrap; transition: all 0.2s ease; }
.action-btn:active { transform: scale(0.96); }
.action-btn.warn { background: linear-gradient(135deg, #eef9f0, #d4edda); color: #27ae60; }
.action-btn.info { background: linear-gradient(135deg, #eef5ff, #cce5ff); color: #337ecc; }
.action-btn.danger { background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }
.action-btn.primary { background: linear-gradient(135deg, #eef5ff, #cce5ff); color: #337ecc; }
.action-btn.success { background: linear-gradient(135deg, #eef9f0, #d4edda); color: #27ae60; }

/* 分类 / 渠道 */
.cat-section { margin: 0 24rpx; }
.cat-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 8rpx 16rpx; }
.cat-title { font-size: 30rpx; font-weight: 700; color: var(--cr-text); }
.cat-add-btn {
  padding: 12rpx 28rpx; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff;
  border-radius: 32rpx; font-size: 25rpx; font-weight: 600; box-shadow: 0 6rpx 20rpx rgba(102,126,234,0.3);
}
.cat-add-btn:active { transform: scale(0.96); }
.cat-item {
  background: var(--cr-surface); border-radius: 20rpx; padding: 22rpx 24rpx;
  margin-bottom: 16rpx; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.06); border: 1rpx solid #f5f6fa;
}
.cat-info { display: flex; align-items: center; }
.cat-icon { font-size: 40rpx; margin-right: 18rpx; }
.cat-text { flex: 1; min-width: 0; }
.cat-name { display: block; font-size: 30rpx; font-weight: 700; color: #1a1a1a; }
.cat-sort { display: block; font-size: 23rpx; color: var(--cr-text-muted); margin-top: 4rpx; }
.cat-status { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 18rpx; font-weight: 600; }
.cat-status.on { background: linear-gradient(135deg, #eef9f0, #d4edda); color: #27ae60; }
.cat-status.off { background: linear-gradient(135deg, #f5f6fa, #e8e9ef); color: #999; }
.cat-actions { display: flex; gap: 12rpx; justify-content: flex-end; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f0f1f6; }

.load-more { margin: 24rpx; text-align: center; }
.load-btn { padding: 20rpx; background: var(--cr-surface); border-radius: 18rpx; font-size: 27rpx; color: var(--cr-text-muted); box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: var(--cr-text-muted); }
.footer-space { height: 40rpx; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }
.spinner.white { width: 32rpx; height: 32rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 9998; backdrop-filter: blur(4rpx); }
.modal-content { width: 100%; background: var(--cr-surface); border-radius: 24rpx 24rpx 0 0; max-height: 80vh; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 30rpx; border-bottom: 1rpx solid #f0f1f6; }
.modal-title { font-size: 32rpx; font-weight: 700; color: var(--cr-text); }
.modal-close { font-size: 40rpx; color: var(--cr-text-muted); line-height: 1; }
.modal-body { padding: 24rpx 30rpx; max-height: 60vh; overflow-y: auto; }
.modal-footer { display: flex; gap: 18rpx; padding: 24rpx 30rpx; border-top: 1rpx solid #f0f1f6; }
.btn { flex: 1; height: 84rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; }
.btn-cancel { background: var(--cr-surface-alt); color: #888; }
.btn-confirm { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.25); }
.form-item { margin-bottom: 22rpx; }
.form-label { display: block; font-size: 27rpx; color: var(--cr-text-muted); margin-bottom: 10rpx; font-weight: 500; }
.form-input { width: 100%; height: 84rpx; background: var(--cr-surface-alt); border-radius: 14rpx; padding: 0 24rpx; font-size: 28rpx; box-sizing: border-box; border: 2rpx solid transparent; }
.form-input:focus { border-color: #667eea; background: #fff; }
.form-textarea { width: 100%; height: 160rpx; background: var(--cr-surface-alt); border-radius: 14rpx; padding: 20rpx 24rpx; font-size: 28rpx; box-sizing: border-box; border: 2rpx solid transparent; }
.detail-modal .modal-body { padding-bottom: 32rpx; }
.detail-header { display: flex; margin-bottom: 22rpx; padding-bottom: 22rpx; border-bottom: 1rpx solid #f0f1f6; }
.detail-logo { width: 110rpx; height: 110rpx; border-radius: 16rpx; border: 1rpx solid #f0edff; }
.detail-info { flex: 1; margin-left: 18rpx; }
.detail-name { display: block; font-size: 31rpx; font-weight: 600; color: var(--cr-text); }
.detail-version, .detail-size { display: block; font-size: 25rpx; color: var(--cr-text-muted); margin-top: 6rpx; }
.detail-section { margin-bottom: 18rpx; }
.detail-label { display: block; font-size: 25rpx; color: var(--cr-text-muted); margin-bottom: 8rpx; }
.detail-content { font-size: 27rpx; color: #444; line-height: 1.5; word-break: break-all; }
.detail-content.link { color: #667eea; font-weight: 500; }
.detail-images { display: flex; flex-wrap: wrap; gap: 12rpx; }
.detail-image { width: calc(33.33% - 8rpx); border-radius: 12rpx; border: 1rpx solid #f0edff; }
.edit-modal { max-height: 85vh; }
</style>
