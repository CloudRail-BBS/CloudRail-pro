<template>
  <view class="banners-page" :class="themeClass">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="list">
        <view class="list-item" v-for="item in list" :key="item.id">
          <image class="item-image" :src="item.image" mode="aspectFill" @click="previewImage(item.image)" />
          <view class="item-footer">
            <text class="item-link" v-if="item.link">链接: {{ item.link }}</text>
            <text class="item-link" v-else>无链接</text>
            <view class="item-actions">
              <view class="action-btn warn" @click="editItem(item)">编辑</view>
              <view class="action-btn danger" @click="deleteItem(item)">删除</view>
            </view>
          </view>
        </view>

        <view class="add-banner-wrapper">
          <view class="add-banner-btn" @click="showAddModal = true">+ 添加横幅</view>
        </view>
      </view>

      <view class="empty-state" v-if="list.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-image-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无横幅数据</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal-mask" v-if="showAddModal || editingItem" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingItem ? '编辑横幅' : '添加横幅' }}</text>
          <view class="modal-close" @click="closeModal">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">图片链接 *</text>
            <input class="form-input" type="text" v-model="formData.image" placeholder="请输入图片URL" />
          </view>
          <view class="form-item">
            <text class="form-label">跳转链接</text>
            <input class="form-input" type="text" v-model="formData.link" placeholder="点击横幅跳转的链接(选填)" />
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
      loading: false,
      showAddModal: false,
      editingItem: null,
      formData: { image: '', link: '', sort: 0 },
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
    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text }; },
    previewImage(url) {
      uni.previewImage({ urls: [url], current: url });
    },
    async loadData() {
      this.loading = true;
      try {
        const res = await request('misc.php', { action: 'get_misc_list', table: 'banners', page: 1 }, { method: 'GET', baseURL: bmsBaseUrl });
        if (res.status === 'success') {
          this.list = res.data.list || [];
        }
      } catch (e) { }
      this.loading = false;
    },
    editItem(item) {
      this.editingItem = item;
      this.formData = { image: item.image, link: item.link || '', sort: item.sort || 0 };
    },
    closeModal() {
      this.showAddModal = false;
      this.editingItem = null;
      this.formData = { image: '', link: '', sort: 0 };
    },
    async submitForm() {
      if (!this.formData.image) {
        uni.showToast({ title: '请输入图片链接', icon: 'none' }); return;
      }
      this.showHud('loading', '处理中...');
      try {
        const data = { action: this.editingItem ? 'edit_misc' : 'add_misc', table: 'banners', image: this.formData.image, link: this.formData.link };
        if (this.editingItem) data.id = this.editingItem.id;
        const res = await request('misc.php', data, { baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success') {
          uni.showToast({ title: '操作成功', icon: 'success' });
          this.closeModal();
          this.loadData();
        } else { uni.showToast({ title: res.msg || '操作失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '操作失败', icon: 'none' }); }
    },
    async deleteItem(item) {
      uni.showModal({ title: '确认删除', content: '确定删除此横幅吗?', confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('misc.php', { action: 'delete_misc', table: 'banners', id: item.id }, { baseURL: bmsBaseUrl });
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
.banners-page { min-height: 100vh; background: var(--cr-surface-alt); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: var(--cr-surface-alt); }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 列表 */
.list { margin: 24rpx; }
.list-item {
  background: var(--cr-surface); border-radius: 18rpx; overflow: hidden;
  margin-bottom: 16rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.07);
}
.item-image { width: 100%; height: 280rpx; object-fit: cover; }
.item-footer { padding: 20rpx; }
.item-link { display: block; font-size: 25rpx; color: var(--cr-text-muted); margin-bottom: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-actions { display: flex; gap: 10rpx; justify-content: flex-end; }
.action-btn { padding: 9rpx 22rpx; border-radius: 18rpx; font-size: 24rpx; font-weight: 500; }
.action-btn.warn { background: #fef5e7; color: #e67e22; }
.action-btn.danger { background: #fce8ec; color: #e74c3c; }

/* 添加横幅按钮 */
.add-banner-wrapper { margin-top: 24rpx; }
.add-banner-btn {
  width: 100%; height: 96rpx; background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 22rpx; display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: 700; color: #fff;
  box-shadow: 0 8rpx 32rpx rgba(102,126,234,0.4);
}
.add-banner-btn:active { transform: scale(0.98); opacity: 0.9; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: var(--cr-text-muted); }
.footer-space { height: 40rpx; }

/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.modal-content { width: 88%; max-width: 600rpx; background: var(--cr-surface); border-radius: 24rpx; overflow: hidden; box-shadow: 0 24rpx 64rpx rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 26rpx 30rpx; border-bottom: 1rpx solid #f0f1f6; }
.modal-title { font-size: 31rpx; font-weight: 700; color: var(--cr-text); }
.modal-close { font-size: 38rpx; color: var(--cr-text-muted); line-height: 1; }
.modal-body { padding: 24rpx 30rpx; }
.form-item { margin-bottom: 22rpx; }
.form-label { display: block; font-size: 27rpx; color: var(--cr-text-muted); margin-bottom: 10rpx; font-weight: 500; }
.form-input { width: 100%; height: 80rpx; background: var(--cr-surface-alt); border-radius: 14rpx; padding: 0 22rpx; font-size: 27rpx; border: 2rpx solid transparent; }
.form-input:focus { border-color: #667eea; background: #fff; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f1f6; }
.modal-btn { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; font-size: 29rpx; font-weight: 500; }
.modal-btn.cancel { color: var(--cr-text-muted); border-right: 1rpx solid #f0f1f6; }
.modal-btn.confirm { color: #667eea; font-weight: 700; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }
.spinner.white { width: 32rpx; height: 32rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
