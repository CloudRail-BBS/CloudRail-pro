<template>
  <view class="invites-page">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-value">{{ stats.total }}</text>
          <text class="stat-label">总数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.unused }}</text>
          <text class="stat-label">未使用</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.used }}</text>
          <text class="stat-label">已使用</text>
        </view>
      </view>

      <view class="action-bar">
        <view class="action-btn danger" v-if="stats.used > 0" @click="clearUsedCodes">清空已使用</view>
        <view class="action-btn primary" v-if="stats.unused > 0" @click="exportUnusedCodes">导出未使用</view>
        <view class="action-btn success" @click="showGenerateModal = true">生成</view>
      </view>

      <view class="list">
        <view class="list-item" v-for="item in list" :key="item.id">
          <view class="item-header">
            <text class="item-code">{{ item.code }}</text>
            <text class="item-status" :class="'status-' + item.status">{{ item.status === 'unused' ? '未使用' : '已使用' }}</text>
          </view>
          <view class="item-meta">
            <text class="meta-tag" v-if="item.used_by">使用者: {{ item.used_by }}</text>
            <text class="meta-tag" v-if="item.used_at">使用时间: {{ item.used_at }}</text>
            <text class="meta-tag">创建时间: {{ item.created_at }}</text>
          </view>
          <view class="item-actions" v-if="item.status === 'unused'">
            <view class="action-btn danger" @click="deleteCode(item)">删除</view>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="list.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-ticket-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无邀请码数据</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 生成邀请码弹窗 -->
    <view class="modal-mask" v-if="showGenerateModal" @click="showGenerateModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">生成邀请码</text>
          <view class="modal-close" @click="showGenerateModal = false">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">生成数量</text>
            <input class="form-input" type="number" v-model="generateCount" placeholder="请输入数量(1-100)" min="1" max="100" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="showGenerateModal = false">取消</view>
          <view class="modal-btn confirm" @click="generateCodes">生成</view>
        </view>
      </view>
    </view>

    <!-- 生成的邀请码弹窗 -->
    <view class="modal-mask" v-if="generatedCodes.length > 0" @click="generatedCodes = []">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">已生成的邀请码</text>
          <view class="modal-close" @click="generatedCodes = []">×</view>
        </view>
        <view class="modal-body">
          <view class="code-item" v-for="(code, idx) in generatedCodes" :key="idx">
            <text class="code-text">{{ code }}</text>
            <text class="code-copy" @click="copyCode(code)">复制</text>
          </view>
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
import { request, baseUrl } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      stats: { total: 0, unused: 0, used: 0 },
      showGenerateModal: false,
      generateCount: 1,
      generatedCodes: [],
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
    copyCode(code) {
      uni.setClipboardData({ data: code, success: () => uni.showToast({ title: '已复制', icon: 'success' }) });
    },
    async loadData() {
      if (this.loading) return;
      this.loading = true;
      try {
        const res = await request('extensions/invite_code.php', { action: 'list_codes', page: this.page, limit: 100 }, { method: 'GET', baseURL: baseUrl });
        if (res.status === 'success' || res.code === 0) {
          const data = res.data || {};
          this.list = (data.list || []).map(item => ({
            ...item,
            status: parseInt(item.used) === 1 ? 'used' : 'unused',
            used_by: item.used_username || item.used_name
          }));
          this.stats.total = data.total || 0;
          this.stats.unused = this.list.filter(c => c.status === 'unused').length;
          this.stats.used = this.list.filter(c => c.status === 'used').length;
          this.hasMore = false;
        }
      } catch (e) { }
      this.loading = false;
    },
    async loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page++;
      this.loadData();
    },
    async generateCodes() {
      let count = parseInt(this.generateCount) || 1;
      if (count < 1) count = 1;
      if (count > 100) count = 100;
      this.showHud('loading', '生成中...');
      try {
        const res = await request('extensions/invite_code.php', { action: 'generate_codes', count: count }, { method: 'POST', baseURL: baseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) {
          this.generatedCodes = res.data?.codes || [];
          this.showGenerateModal = false;
          this.loadData();
        } else { uni.showToast({ title: res.msg || '生成失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '生成失败', icon: 'none' }); }
    },
    async deleteCode(item) {
      uni.showModal({ title: '确认删除', content: `确定删除邀请码 ${item.code} 吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('extensions/invite_code.php', { action: 'delete_code', id: item.id }, { method: 'POST', baseURL: baseUrl });
            this.hud.show = false;
            if (r.status === 'success' || r.code === 0) { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadData(); }
            else { uni.showToast({ title: r.msg || '删除失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '删除失败', icon: 'none' }); }
        }
      }});
    },
    async clearUsedCodes() {
      uni.showModal({ 
        title: '确认清空', 
        content: '确定要清空所有已使用的邀请码吗？此操作不可恢复！', 
        confirmColor: '#FF2442',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '清空中...');
            try {
              const r = await request('extensions/invite_code.php', { action: 'clear_used' }, { method: 'POST', baseURL: baseUrl });
              this.hud.show = false;
              if (r.status === 'success' || r.code === 0) { 
                uni.showToast({ title: '清空成功', icon: 'success' }); 
                this.loadData(); 
              }
              else { uni.showToast({ title: r.msg || '清空失败', icon: 'none' }); }
            } catch (e) { this.hud.show = false; uni.showToast({ title: '清空失败', icon: 'none' }); }
          }
        }
      });
    },
    exportUnusedCodes() {
      const unusedCodes = this.list.filter(c => c.status === 'unused');
      if (unusedCodes.length === 0) {
        uni.showToast({ title: '没有可导出的邀请码', icon: 'none' });
        return;
      }
      
      let csv = '邀请码,创建时间\n';
      unusedCodes.forEach(c => {
        csv += `"${c.code}","${c.created_at}"\n`;
      });
      
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `邀请码_未使用_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      uni.showToast({ title: '导出成功', icon: 'success' });
    }
  }
};
</script>

<style scoped>
.invites-page { min-height: 100vh; background: #f0f1f6; }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f0f1f6; }

.main-scroll { height: 100vh; padding-top: 44px; }
.nav-placeholder { background: linear-gradient(135deg, #667eea, #764ba2); }

/* 统计 */
.stats-bar { display: flex; margin: 24rpx; background: #fff; border-radius: 18rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.06); }
.stat-item { flex: 1; text-align: center; }
.stat-value { display: block; font-size: 34rpx; font-weight: 700; color: #667eea; }
.stat-label { display: block; font-size: 23rpx; color: #bbb; margin-top: 6rpx; }

/* 列表 */
.list { margin: 0 24rpx; }
.list-item {
  background: #fff; border-radius: 18rpx; padding: 22rpx;
  margin-bottom: 14rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.05);
}
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.item-code { font-size: 30rpx; font-weight: 700; color: #222; font-family: monospace; letter-spacing: 2rpx; }
.item-status { font-size: 22rpx; padding: 5rpx 14rpx; border-radius: 12rpx; font-weight: 500; }
.status-unused { background: #eef9f0; color: #27ae60; }
.status-used { background: #eef5ff; color: #337ecc; }
.item-meta { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 12rpx; }
.meta-tag { font-size: 22rpx; color: #bbb; }
.item-actions { display: flex; justify-content: flex-end; }

.action-bar { display: flex; gap: 14rpx; margin: 0 24rpx 24rpx; }
.action-btn { padding: 15rpx 22rpx; border-radius: 16rpx; font-size: 27rpx; flex: 1; text-align: center; font-weight: 500; }
.action-btn.danger { background: #fce8ec; color: #e74c3c; }
.action-btn.primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 4rpx 12rpx rgba(102,126,234,0.25); }
.action-btn.success { background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; box-shadow: 0 4rpx 12rpx rgba(39,174,96,0.25); }

.load-more { margin: 24rpx; text-align: center; }
.load-btn { padding: 20rpx; background: #fff; border-radius: 18rpx; font-size: 27rpx; color: #999; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: #bbb; }
.footer-space { height: 40rpx; }

/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.modal-content { width: 88%; max-width: 600rpx; max-height: 80vh; background: #fff; border-radius: 24rpx; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 24rpx 64rpx rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 26rpx 30rpx; border-bottom: 1rpx solid #f0f1f6; flex-shrink: 0; }
.modal-title { font-size: 31rpx; font-weight: 700; color: #222; }
.modal-close { font-size: 38rpx; color: #bbb; line-height: 1; }
.modal-body { padding: 24rpx 30rpx; overflow-y: auto; }
.form-item { margin-bottom: 22rpx; }
.form-label { display: block; font-size: 27rpx; color: #666; margin-bottom: 10rpx; font-weight: 500; }
.form-input { width: 100%; height: 80rpx; background: #f8f9fa; border-radius: 14rpx; padding: 0 22rpx; font-size: 27rpx; border: 2rpx solid transparent; }
.form-input:focus { border-color: #667eea; background: #fff; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f1f6; flex-shrink: 0; }
.modal-btn { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; font-size: 29rpx; font-weight: 500; }
.modal-btn.cancel { color: #999; border-right: 1rpx solid #f0f1f6; }
.modal-btn.confirm { color: #667eea; font-weight: 700; }

.code-item { display: flex; justify-content: space-between; align-items: center; padding: 15rpx 0; border-bottom: 1rpx solid #f0f1f6; }
.code-text { font-size: 27rpx; font-weight: 600; color: #222; font-family: monospace; }
.code-copy { font-size: 25rpx; color: #667eea; font-weight: 500; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }
.spinner.white { width: 32rpx; height: 32rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
