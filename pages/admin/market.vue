<template>
  <view class="market-page" :class="themeClass">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <!-- Tab切换 -->
      <view class="tab-bar">
        <view class="tab-item" :class="{ active: activeTab === 'products' }" @click="switchTab('products')">
          <text class="tab-text">商品管理</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'orders' }" @click="switchTab('orders')">
          <text class="tab-text">订单管理</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'categories' }" @click="switchTab('categories')">
          <text class="tab-text">分类管理</text>
        </view>
      </view>

      <!-- 商品管理 -->
      <view v-if="activeTab === 'products'">
        <view class="stats-row">
          <view class="stat-box">
            <text class="stat-value">{{ productStats.total }}</text>
            <text class="stat-label">商品总数</text>
          </view>
          <view class="stat-box">
            <text class="stat-value">{{ productStats.active }}</text>
            <text class="stat-label">在售中</text>
          </view>
          <view class="stat-box">
            <text class="stat-value">{{ productStats.off }}</text>
            <text class="stat-label">已下架</text>
          </view>
        </view>

        <view class="search-bar">
          <input class="search-input" type="text" v-model="productSearch" placeholder="搜索商品标题" @confirm="loadProducts" />
          <view class="search-action" @click="loadProducts">搜索</view>
        </view>

        <view class="filter-bar">
          <scroll-view scroll-x class="filter-scroll">
            <view class="filter-items">
              <view class="filter-item" :class="{ active: productStatus === 'all' }" @click="setProductStatus('all')">全部</view>
              <view class="filter-item" :class="{ active: productStatus === '1' }" @click="setProductStatus('1')">在售</view>
              <view class="filter-item" :class="{ active: productStatus === '0' }" @click="setProductStatus('0')">下架</view>
              <view class="filter-item" :class="{ active: productStatus === '2' }" @click="setProductStatus('2')">已售</view>
            <view class="filter-item" :class="{ active: productStatus === '3' }" @click="setProductStatus('3')">退款</view>
            </view>
          </scroll-view>
        </view>

        <view class="list">
          <view class="list-item" v-for="item in productList" :key="item.id">
            <image class="item-image" :src="item.image || '/static/logo.png'" mode="aspectFill" />
            <view class="item-info">
              <view class="item-title">{{ item.title }}</view>
              <view class="item-meta">
                <text class="item-price">¥{{ item.price }}</text>
                <text class="item-type">{{ item.product_type == 1 ? '实体' : '虚拟' }}</text>
                <text class="item-status" :class="'status-' + item.status">{{ productStatusText(item.status) }}</text>
              </view>
              <view class="item-seller">卖家: {{ item.seller_name || '未知' }} | 分类: {{ item.category_name || '未分类' }}</view>
            </view>
            <view class="item-actions">
              <view class="action-btn warn" v-if="item.status == 1" @click="toggleProductStatus(item)">下架</view>
              <view class="action-btn warn" v-else-if="item.status == 0" @click="toggleProductStatus(item)">上架</view>
              <view class="action-btn disabled" v-else-if="item.status == 2">已售完</view>
              <view class="action-btn disabled" v-else-if="item.status == 3">已退款</view>
              <view class="action-btn danger" @click="deleteProduct(item.id)">删除</view>
            </view>
          </view>
        </view>

        <view class="load-more" v-if="productHasMore">
          <view class="load-btn" @click="loadMoreProducts">
            <text>{{ productLoading ? '加载中...' : '加载更多' }}</text>
          </view>
        </view>

        <view class="empty-state" v-if="productList.length === 0 && !productLoading">
          <image class="empty-icon-img" src="/static/icon/admin-shopping-cart-ccc.svg" mode="aspectFit" />
          <text class="empty-text">暂无商品</text>
        </view>
      </view>

      <!-- 订单管理 -->
      <view v-if="activeTab === 'orders'">
        <view class="stats-row">
          <view class="stat-box">
            <text class="stat-value">{{ orderStats.pending }}</text>
            <text class="stat-label">待处理</text>
          </view>
          <view class="stat-box">
            <text class="stat-value">{{ orderStats.shipped }}</text>
            <text class="stat-label">已发货</text>
          </view>
          <view class="stat-box">
            <text class="stat-value">{{ orderStats.completed }}</text>
            <text class="stat-label">已完成</text>
          </view>
          <view class="stat-box">
            <text class="stat-value">{{ orderStats.refunded }}</text>
            <text class="stat-label">已退款</text>
          </view>
        </view>

        <view class="search-bar">
          <input class="search-input" type="text" v-model="orderSearch" placeholder="搜索订单号或商品名称" @confirm="loadOrders" />
          <view class="search-action" @click="loadOrders">搜索</view>
        </view>

        <view class="filter-bar">
          <scroll-view scroll-x class="filter-scroll">
            <view class="filter-items">
              <view class="filter-item" :class="{ active: orderStatus === 'all' }" @click="setOrderStatus('all')">全部</view>
              <view class="filter-item" :class="{ active: orderStatus === '0' }" @click="setOrderStatus('0')">待处理</view>
              <view class="filter-item" :class="{ active: orderStatus === '1' }" @click="setOrderStatus('1')">已发货</view>
              <view class="filter-item" :class="{ active: orderStatus === '2' }" @click="setOrderStatus('2')">已完成</view>
              <view class="filter-item" :class="{ active: orderStatus === '3' }" @click="setOrderStatus('3')">已退款</view>
            </view>
          </scroll-view>
        </view>

        <view class="list">
          <view class="list-item order-item" v-for="item in orderList" :key="item.id">
            <view class="order-header">
              <text class="order-no">订单: {{ item.order_no }}</text>
              <text class="order-status" :class="'status-' + item.status">{{ orderStatusText(item.status) }}</text>
            </view>
            <view class="order-body">
              <view class="order-product">
                <text class="product-title">{{ item.product_title || '商品已失效' }}</text>
                <text class="product-price">¥{{ item.amount }}</text>
              </view>
              <view class="order-users">
                <text class="user-tag">买家: {{ item.buyer_name || '-' }}</text>
                <text class="user-tag">卖家: {{ item.seller_name || '-' }}</text>
              </view>
              <view class="order-time">{{ item.create_time }}</view>
            </view>
            <view class="item-actions" v-if="item.status != 3">
              <view v-if="item.status == 0 || item.status == 1 || item.status == 2" class="action-btn warn" @click="refundOrder(item.id)">退款</view>
              <view v-if="item.status == 1 && item.logistics_company" class="action-btn info" @click="viewLogistics(item.id)">物流</view>
              <view v-if="item.status == 2 || item.status == 3" class="action-btn danger" @click="deleteOrder(item.id)">删除</view>
            </view>
          </view>
        </view>

        <view class="load-more" v-if="orderHasMore">
          <view class="load-btn" @click="loadMoreOrders">
            <text>{{ orderLoading ? '加载中...' : '加载更多' }}</text>
          </view>
        </view>

        <view class="empty-state" v-if="orderList.length === 0 && !orderLoading">
          <image class="empty-icon-img" src="/static/icon/admin-file-text-ccc.svg" mode="aspectFit" />
          <text class="empty-text">暂无订单</text>
        </view>
      </view>

      <!-- 分类管理 -->
      <view v-if="activeTab === 'categories'">
        <view class="cat-toolbar">
          <text class="cat-tip">共 {{ categoryList.length }} 个分类</text>
          <view class="action-btn warn add-cat-btn" @click="openCatAdd()">新增分类</view>
        </view>

        <view class="list">
          <view class="list-item cat-item" v-for="item in categoryList" :key="item.id">
            <view class="item-info">
              <view class="item-title">{{ (item.icon ? (item.icon + ' ') : '') + item.name }}</view>
              <view class="item-meta">
                <text class="item-type">排序: {{ item.sort == null ? 0 : item.sort }}</text>
                <text class="item-status" :class="'status-' + item.status">{{ parseInt(item.status) === 1 ? '启用' : '下架' }}</text>
              </view>
            </view>
            <view class="item-actions">
              <view class="action-btn warn" v-if="parseInt(item.status) === 1" @click="toggleCategory(item)">下架</view>
              <view class="action-btn warn" v-else @click="toggleCategory(item)">启用</view>
              <view class="action-btn info" @click="openCatEdit(item)">编辑</view>
              <view class="action-btn danger" @click="deleteCategory(item.id)">删除</view>
            </view>
          </view>
        </view>

        <view class="empty-state" v-if="categoryList.length === 0">
          <text class="empty-text">暂无分类，请点击右上角新增</text>
        </view>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 分类弹窗 -->
    <view class="hud-mask" v-if="catModal.visible" @click.self="closeCatModal">
      <view class="cat-modal">
        <view class="cat-modal-title">{{ catModal.id ? '编辑分类' : '新增分类' }}</view>
        <view class="cat-modal-row">
          <text class="cat-modal-label">分类名称</text>
          <input class="cat-modal-input" type="text" v-model="catModal.name" placeholder="请输入分类名称" />
        </view>
        <view class="cat-modal-row">
          <text class="cat-modal-label">图标(可选)</text>
          <input class="cat-modal-input" type="text" v-model="catModal.icon" placeholder="如 🛒" />
        </view>
        <view class="cat-modal-row">
          <text class="cat-modal-label">排序(小在前)</text>
          <input class="cat-modal-input" type="text" v-model="catModal.sortText" placeholder="0" />
        </view>
        <view class="cat-modal-actions">
          <view class="cat-modal-btn cancel" @click="closeCatModal">取消</view>
          <view class="cat-modal-btn confirm" @click="saveCategory">保存</view>
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
import { request, bmsBaseUrl } from '../../common/request.js';
import { getScreenMetrics } from '../../common/screen.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      activeTab: 'products',
      // 商品
      productList: [],
      productPage: 1,
      productHasMore: true,
      productLoading: false,
      productSearch: '',
      productStatus: 'all',
      productStats: { total: 0, active: 0, off: 0 },
      // 订单
      orderList: [],
      orderPage: 1,
      orderHasMore: true,
      orderLoading: false,
      orderSearch: '',
      orderStatus: 'all',
      orderStats: { pending: 0, shipped: 0, completed: 0, refunded: 0 },
      // 分类
      categoryList: [],
      catModal: { visible: false, id: 0, name: '', icon: '', sortText: '0' },
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  onLoad(options) {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    if (options && options.tab === 'orders') {
      this.activeTab = 'orders';
      this.loadOrders();
    } else if (options && options.tab === 'categories') {
      this.activeTab = 'categories';
      this.loadCategories();
    } else {
      this.loadProducts();
    }
    this.loadStats();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    switchTab(tab) {
      this.activeTab = tab;
      if (tab === 'products' && this.productList.length === 0) {
        this.loadProducts();
      }
      if (tab === 'orders' && this.orderList.length === 0) {
        this.loadOrders();
      }
      if (tab === 'categories' && this.categoryList.length === 0) {
        this.loadCategories();
      }
    },
    showHud(type, text) {
      this.hud = { show: true, type: type || 'loading', text };
    },
    getHeaders() {
      const token = uni.getStorageSync('token') || '';
      return {
        'content-type': 'application/x-www-form-urlencoded',
        'token': token,
        'Authorization': token ? 'Bearer ' + token : ''
      };
    },
    async loadStats() {
      try {
        const res = await request('admin_market.php', { action: 'get_stats' }, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data) {
          const d = res.data;
          this.productStats = {
            total: d.total_products || 0,
            active: d.active_products || 0,
            off: (d.total_products || 0) - (d.active_products || 0)
          };
          this.orderStats = {
            pending: d.pending_orders || 0,
            shipped: d.shipped_orders || 0,
            completed: d.completed_orders || 0,
            refunded: d.refunded_orders || 0
          };
        }
      } catch (e) {
      }
    },
    // 商品管理
    setProductStatus(status) {
      this.productStatus = status;
      this.productPage = 1;
      this.productHasMore = true;
      this.productList = [];
      this.loadProducts();
    },
    async loadProducts() {
      if (this.productLoading) return;
      this.productLoading = true;
      try {
        const params = { action: 'get_products', page: this.productPage };
        if (this.productSearch) params.search = this.productSearch;
        if (this.productStatus !== 'all') params.status = this.productStatus;

        const res = await request('admin_market.php', params, { baseURL: bmsBaseUrl, method: 'GET' });

        if (res.status === 'success' && res.data) {
          const list = res.data.list || [];
          if (this.productPage === 1) {
            this.productList = list;
          } else {
            this.productList = [...this.productList, ...list];
          }
          this.productHasMore = list.length >= 10;
        }
      } catch (e) {
      }
      this.productLoading = false;
    },
    loadMoreProducts() {
      if (!this.productHasMore || this.productLoading) return;
      this.productPage++;
      this.loadProducts();
    },
    productStatusText(status) {
      const map = { '0': '下架', '1': '在售', '2': '已售', '3': '退款', '-1': '删除' };
      return map[String(status)] || '未知';
    },
    async toggleProductStatus(item) {
      const newStatus = item.status == 1 ? 0 : 1;
      const actionText = newStatus == 1 ? '上架' : '下架';
      uni.showModal({
        title: '确认' + actionText,
        content: `确定要${actionText}该商品吗？`,
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '处理中...');
            try {
              const r = await request('admin_market.php', { action: 'update_product_status', id: item.id, status: newStatus }, { baseURL: bmsBaseUrl });
              this.hud.show = false;
              if (r.status === 'success') {
                uni.showToast({ title: actionText + '成功', icon: 'success' });
                item.status = newStatus;
                this.loadStats();
              } else {
                uni.showToast({ title: r?.msg || '操作失败', icon: 'none' });
              }
            } catch (e) {
              this.hud.show = false;
              uni.showToast({ title: '操作失败', icon: 'none' });
            }
          }
        }
      });
    },
    deleteProduct(id) {
      uni.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定删除该商品吗？',
        confirmColor: '#FF2442',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '删除中...');
            try {
              const r = await request('admin_market.php', { action: 'delete_product', id: id }, { baseURL: bmsBaseUrl });
              this.hud.show = false;
              if (r.status === 'success') {
                uni.showToast({ title: '删除成功', icon: 'success' });
                this.productList = this.productList.filter(p => p.id != id);
                this.loadStats();
              } else {
                uni.showToast({ title: r?.msg || '删除失败', icon: 'none' });
              }
            } catch (e) {
              this.hud.show = false;
              uni.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        }
      });
    },
    // 分类管理
    async loadCategories() {
      this.showHud('loading', '加载中...');
      try {
        const res = await request('market.php', { action: 'categories_admin' });
        this.hud.show = false;
        if (res.code === 0) {
          this.categoryList = (res.data && res.data.list) || [];
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: '加载失败', icon: 'none' });
      }
    },
    getCategoryStatus(item) {
      return parseInt(item.status) === 1;
    },
    async toggleCategory(item) {
      const newStatus = parseInt(item.status) === 1 ? 0 : 1;
      const actionText = newStatus === 1 ? '启用' : '下架';
      uni.showModal({
        title: '确认' + actionText,
        content: `确定要${actionText}该分类吗？`,
        success: async (res) => {
          if (!res.confirm) return;
          this.showHud('loading', '处理中...');
          try {
            const r = await request('market.php', { action: 'category_update', id: item.id, name: item.name, icon: item.icon || '', sort: item.sort || 0, status: newStatus });
            this.hud.show = false;
            if (r.code === 0) {
              uni.showToast({ title: actionText + '成功', icon: 'success' });
              this.loadCategories();
            } else {
              uni.showToast({ title: r.msg || '操作失败', icon: 'none' });
            }
          } catch (e) {
            this.hud.show = false;
            uni.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      });
    },
    openCatAdd() {
      this.catModal = { visible: true, id: 0, name: '', icon: '', sortText: '0' };
    },
    openCatEdit(item) {
      this.catModal = { visible: true, id: item.id, name: item.name || '', icon: item.icon || '', sortText: String(item.sort == null ? 0 : item.sort) };
    },
    closeCatModal() {
      this.catModal.visible = false;
    },
    async saveCategory() {
      const name = (this.catModal.name || '').trim();
      if (!name) {
        uni.showToast({ title: '请输入分类名称', icon: 'none' });
        return;
      }
      const params = {
        name,
        icon: (this.catModal.icon || '').trim(),
        sort: parseInt(this.catModal.sortText) || 0
      };
      params.action = this.catModal.id ? 'category_update' : 'category_create';
      if (this.catModal.id) params.id = this.catModal.id;
      this.closeCatModal();
      this.showHud('loading', '保存中...');
      try {
        const res = await request('market.php', params);
        this.hud.show = false;
        if (res.code === 0) {
          uni.showToast({ title: '保存成功', icon: 'success' });
          this.loadCategories();
        } else {
          uni.showToast({ title: res.msg || '保存失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
    },
    deleteCategory(id) {
      uni.showModal({
        title: '确认删除',
        content: '删除分类后，该分类下的商品会变为未分类，确定删除吗？',
        confirmColor: '#FF2442',
        success: async (res) => {
          if (!res.confirm) return;
          this.showHud('loading', '删除中...');
          try {
            const r = await request('market.php', { action: 'category_delete', id: id });
            this.hud.show = false;
            if (r.code === 0) {
              uni.showToast({ title: '删除成功', icon: 'success' });
              this.loadCategories();
            } else {
              uni.showToast({ title: r.msg || '删除失败', icon: 'none' });
            }
          } catch (e) {
            this.hud.show = false;
            uni.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      });
    },
    // 订单管理
    setOrderStatus(status) {
      this.orderStatus = status;
      this.orderPage = 1;
      this.orderHasMore = true;
      this.orderList = [];
      this.loadOrders();
    },
    async loadOrders() {
      if (this.orderLoading) return;
      this.orderLoading = true;
      try {
        const params = { action: 'get_orders', page: this.orderPage };
        if (this.orderSearch) params.search = this.orderSearch;
        if (this.orderStatus !== 'all') params.status = this.orderStatus;

        const res = await request('admin_market.php', params, { baseURL: bmsBaseUrl, method: 'GET' });

        if (res.status === 'success' && res.data) {
          const list = res.data.list || [];
          if (this.orderPage === 1) {
            this.orderList = list;
          } else {
            this.orderList = [...this.orderList, ...list];
          }
          this.orderHasMore = list.length >= 10;
        }
      } catch (e) {
      }
      this.orderLoading = false;
    },
    loadMoreOrders() {
      if (!this.orderHasMore || this.orderLoading) return;
      this.orderPage++;
      this.loadOrders();
    },
    orderStatusText(status) {
      const map = { '0': '待处理', '1': '已发货', '2': '已完成', '3': '已退款' };
      return map[String(status)] || '未知';
    },
    refundOrder(id) {
      uni.showModal({
        title: '确认退款',
        content: '确定要对该订单进行退款操作吗？',
        confirmColor: '#FF2442',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '退款中...');
            try {
              const r = await request('admin_market.php', { action: 'refund_order', id: id }, { baseURL: bmsBaseUrl });
              this.hud.show = false;
              if (r.status === 'success') {
                uni.showToast({ title: '退款成功', icon: 'success' });
                this.loadOrders();
                this.loadStats();
              } else {
                uni.showToast({ title: r?.msg || '退款失败', icon: 'none' });
              }
            } catch (e) {
              this.hud.show = false;
              uni.showToast({ title: '退款失败', icon: 'none' });
            }
          }
        }
      });
    },
    deleteOrder(id) {
      uni.showModal({
        title: '确认删除',
        content: '确定删除该订单记录吗？',
        confirmColor: '#FF2442',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '删除中...');
            try {
              const r = await request('admin_market.php', { action: 'delete_order', id: id }, { baseURL: bmsBaseUrl });
              this.hud.show = false;
              if (r.status === 'success') {
                uni.showToast({ title: '删除成功', icon: 'success' });
                this.orderList = this.orderList.filter(o => o.id != id);
                this.loadStats();
              } else {
                uni.showToast({ title: r?.msg || '删除失败', icon: 'none' });
              }
            } catch (e) {
              this.hud.show = false;
              uni.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        }
      });
    },
    async viewLogistics(orderId) {
      this.showHud('loading', '查询物流中...');
      try {
        const r = await request('admin_market.php', { action: 'get_logistics_admin', order_id: orderId }, { baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (r.status === 'success' && r.data) {
          const data = r.data;
          let content = '';
          if (data.list && data.list.length > 0) {
            content = data.list.map(d => `${d.time}\n${d.context}`).join('\n\n');
          } else {
            content = '暂无物流轨迹信息';
          }
          uni.showModal({
            title: '物流信息',
            content: content,
            showCancel: false
          });
        } else {
          uni.showToast({ title: r?.msg || '查询失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: '查询失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.market-page { min-height: 100vh; background: linear-gradient(180deg, #f5f7fa 0%, #e8ecf0 100%); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f5f7fa; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* Tab */
.tab-bar {
  display: flex;
  margin: 24rpx;
  background: var(--cr-surface);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.08);
}
.tab-item { flex: 1; text-align: center; padding: 26rpx 0; position: relative; transition: all 0.25s; }
.tab-item:active { transform: scale(0.98); }
.tab-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.3);
}
.tab-item.active .tab-text { color: #fff; font-weight: 700; }
.tab-text { font-size: 30rpx; color: var(--cr-text-muted); }

/* 统计 */
.stats-row { display: flex; margin: 0 24rpx 24rpx; gap: 16rpx; }
.stat-box {
  flex: 1; background: var(--cr-surface); border-radius: 24rpx; padding: 26rpx 16rpx; text-align: center;
  box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.06);
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
.stat-box:nth-child(2)::before { background: linear-gradient(90deg, #27ae60, #00b894); }
.stat-box:nth-child(3)::before { background: linear-gradient(90deg, #e67e22, #f39c12); }
.stat-box:nth-child(4)::before { background: linear-gradient(90deg, #e74c3c, #c0392b); }
.stat-value { display: block; font-size: 40rpx; font-weight: 800; color: var(--cr-text); }
.stat-label { font-size: 24rpx; color: var(--cr-text-muted); margin-top: 8rpx; display: block; }

/* 搜索 */
.search-bar { display: flex; margin: 0 24rpx 20rpx; gap: 16rpx; }
.search-input {
  flex: 1; height: 88rpx; background: var(--cr-surface); border-radius: 44rpx;
  padding: 0 32rpx; font-size: 28rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  border: 2rpx solid rgba(255,255,255,0.6);
}
.search-action {
  width: 130rpx; height: 88rpx; background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border-radius: 44rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.4);
}
.search-action:active { transform: scale(0.96); }

/* 筛选 */
.filter-bar { margin: 0 24rpx 20rpx; }
.filter-scroll { white-space: nowrap; }
.filter-items { display: flex; gap: 20rpx; }
.filter-item {
  display: inline-block; padding: 16rpx 32rpx; background: var(--cr-surface);
  border-radius: 34rpx; font-size: 26rpx; color: var(--cr-text-muted); font-weight: 600;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.filter-item:active { transform: scale(0.96); }
.filter-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.4);
}

/* 列表 */
.list { margin: 0 24rpx; }
.list-item {
  display: flex; align-items: flex-start; background: var(--cr-surface);
  border-radius: 28rpx; padding: 24rpx; margin-bottom: 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}
.list-item:active { transform: scale(0.99); box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08); }
.item-image { width: 130rpx; height: 130rpx; border-radius: 18rpx; flex-shrink: 0; background: linear-gradient(135deg, #f5f7fa, #e8ecf0); border: 2rpx solid #f0edff; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08); }
.item-info { flex: 1; margin-left: 20rpx; min-width: 0; }
.item-title { font-size: 29rpx; font-weight: 600; color: var(--cr-text); margin-bottom: 10rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { display: flex; align-items: center; gap: 12rpx; margin-bottom: 10rpx; flex-wrap: wrap; }
.item-price { font-size: 30rpx; font-weight: 700; color: #e74c3c; }
.item-type { font-size: 22rpx; color: var(--cr-text-muted); background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 6rpx 14rpx; border-radius: 12rpx; }
.item-status { font-size: 22rpx; padding: 6rpx 14rpx; border-radius: 12rpx; font-weight: 600; }
.item-status.status-1 { background: linear-gradient(135deg, #eef9f0 0%, #d4edda 100%); color: #27ae60; }
.item-status.status-0 { background: linear-gradient(135deg, #fef5e7 0%, #faebcc 100%); color: #e67e22; }
.item-status.status-2 { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }
.item-status.status-3 { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }
.item-seller { font-size: 24rpx; color: var(--cr-text-muted); }
.item-actions { display: flex; flex-direction: column; gap: 10rpx; margin-left: 16rpx; flex-shrink: 0; }
.action-btn { padding: 12rpx 24rpx; border-radius: 22rpx; font-size: 24rpx; text-align: center; font-weight: 600; white-space: nowrap; transition: all 0.15s; }
.action-btn:active { transform: scale(0.92); }
.action-btn.warn { background: linear-gradient(135deg, #fef5e7 0%, #faebcc 100%); color: #e67e22; }
.action-btn.danger { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }
.action-btn.disabled { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #bbb; }
.action-btn.info { background: linear-gradient(135deg, #eef5ff 0%, #dbe4ff 100%); color: #337ecc; }

/* 分类 */
.cat-toolbar { display: flex; align-items: center; justify-content: space-between; margin: 0 24rpx 20rpx; }
.cat-tip { font-size: 26rpx; color: var(--cr-text-muted); }
.add-cat-btn { padding: 16rpx 32rpx; }
.cat-item { align-items: center; }

/* 分类弹窗 */
.cat-modal { width: 600rpx; background: var(--cr-surface); border-radius: 24rpx; padding: 32rpx; }
.cat-modal-title { font-size: 32rpx; font-weight: 700; color: var(--cr-text); text-align: center; margin-bottom: 24rpx; }
.cat-modal-row { display: flex; align-items: center; margin-bottom: 24rpx; }
.cat-modal-label { width: 160rpx; font-size: 28rpx; color: var(--cr-text-muted); flex-shrink: 0; }
.cat-modal-input { flex: 1; height: 80rpx; background: #f5f7fa; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: var(--cr-text); }
.cat-modal-actions { display: flex; gap: 20rpx; margin-top: 16rpx; }
.cat-modal-btn { flex: 1; height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; }
.cat-modal-btn.cancel { background: var(--cr-surface-alt); color: #666; }
.cat-modal-btn.confirm { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.4); }
.cat-modal-btn:active { transform: scale(0.97); }

/* 订单项 */
.order-item { flex-direction: column; }
.order-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 16rpx; padding-bottom: 16rpx; border-bottom: 2rpx solid #f0f1f6; }
.order-no { font-size: 26rpx; color: var(--cr-text-muted); }
.order-status { font-size: 22rpx; padding: 6rpx 14rpx; border-radius: 12rpx; font-weight: 600; }
.order-status.status-0 { background: linear-gradient(135deg, #fef5e7 0%, #faebcc 100%); color: #e67e22; }
.order-status.status-1 { background: linear-gradient(135deg, #eef5ff 0%, #dbe4ff 100%); color: #337ecc; }
.order-status.status-2 { background: linear-gradient(135deg, #eef9f0 0%, #d4edda 100%); color: #27ae60; }
.order-status.status-3 { background: linear-gradient(135deg, #fce8ec 0%, #f8d7da 100%); color: #e74c3c; }
.order-body { width: 100%; }
.order-product { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.product-title { font-size: 28rpx; font-weight: 600; color: var(--cr-text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.product-price { font-size: 28rpx; font-weight: 700; color: #e74c3c; margin-left: 16rpx; }
.order-users { display: flex; gap: 16rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.user-tag { font-size: 24rpx; color: var(--cr-text-muted); }
.order-time { font-size: 22rpx; color: var(--cr-text-muted); }
.order-item .item-actions { flex-direction: row; margin-top: 16rpx; margin-left: 0; width: 100%; justify-content: flex-end; gap: 12rpx; }

.load-more { margin: 24rpx; text-align: center; }
.load-btn { padding: 26rpx; background: var(--cr-surface); border-radius: 44rpx; font-size: 28rpx; color: var(--cr-text-muted); box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05); }
.load-btn:active { transform: scale(0.98); }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 28rpx; color: var(--cr-text-muted); }
.footer-space { height: 60rpx; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(10rpx); }
.hud-toast { background: rgba(0,0,0,0.8); color: #fff; padding: 32rpx 56rpx; border-radius: 20rpx; font-size: 28rpx; display: flex; align-items: center; gap: 16rpx; }
.spinner.white { width: 36rpx; height: 36rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>