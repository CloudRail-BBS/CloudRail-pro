<template>
  <view class="vipcards-page">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-value">{{ stats.total }}</text>
          <text class="stat-label">总卡密数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.unused }}</text>
          <text class="stat-label">未使用</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.used }}</text>
          <text class="stat-label">已使用</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.disabled }}</text>
          <text class="stat-label">已禁用</text>
        </view>
      </view>

      <view class="filter-bar">
        <view class="filter-item" :class="{ active: filter === 'all' }" @click="setFilter('all')">全部</view>
        <view class="filter-item" :class="{ active: filter === 0 }" @click="setFilter(0)">未使用</view>
        <view class="filter-item" :class="{ active: filter === 1 }" @click="setFilter(1)">已使用</view>
        <view class="filter-item" :class="{ active: filter === 2 }" @click="setFilter(2)">已禁用</view>
      </view>

      <view class="action-bar">
        <view class="action-btn danger" v-if="stats.used > 0" @click="clearUsedCards">清空已使用</view>
        <view class="action-btn primary" v-if="stats.unused > 0" @click="exportUnusedCards">导出未使用</view>
        <view class="action-btn success" @click="showGenerateModal = true">生成</view>
      </view>

      <view class="list">
        <view class="list-item" v-for="item in filteredList" :key="item.id">
          <view class="item-header">
            <view class="item-info">
              <text class="item-card">{{ item.card_code_fmt }}</text>
              <text class="item-value">¥{{ formatValue(item.face_value) }}</text>
            </view>
            <text class="item-status" :class="'status-' + statusKey(item.status)">{{ statusText(item.status) }}</text>
          </view>
          <view class="item-meta">
            <text class="meta-tag" v-if="item.used_by_nickname">使用者: {{ item.used_by_nickname }}</text>
            <text class="meta-tag">过期: {{ item.expire_time || '永久' }}</text>
            <text class="meta-tag">创建: {{ item.created_time }}</text>
          </view>
          <view class="item-actions">
            <view class="action-btn item-action warn" v-if="item.status === 0" @click="disableCard(item)">禁用</view>
            <view class="action-btn item-action danger" @click="deleteCard(item)">删除</view>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="filteredList.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-credit-card-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无卡密数据</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 生成卡密弹窗 -->
    <view class="modal-mask" v-if="showGenerateModal" @click="showGenerateModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">生成余额卡密</text>
          <view class="modal-close" @click="showGenerateModal = false">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">面额（元）</text>
            <input class="form-input" type="number" v-model="generateFaceValue" placeholder="请输入面额" min="0.01" step="0.01" />
          </view>
          <view class="form-item">
            <text class="form-label">生成数量</text>
            <input class="form-input" type="number" v-model="generateCount" placeholder="请输入数量(1-100)" min="1" max="100" />
          </view>
          <view class="form-item">
            <text class="form-label">有效期天数（0=永久）</text>
            <input class="form-input" type="number" v-model="generateExpireDays" placeholder="0=永久" min="0" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="showGenerateModal = false">取消</view>
          <view class="modal-btn confirm" @click="generateCards">生成</view>
        </view>
      </view>
    </view>

    <!-- 生成的卡密弹窗 -->
    <view class="modal-mask" v-if="generatedCards.length > 0" @click="generatedCards = []">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">已生成的卡密</text>
          <view class="modal-close" @click="generatedCards = []">×</view>
        </view>
        <view class="modal-body">
          <view class="code-item" v-for="(card, idx) in generatedCards" :key="idx">
            <view class="code-info">
              <text class="code-value">¥{{ formatValue(card.face_value) }}</text>
              <text class="code-no">{{ card.card_code_fmt }}</text>
            </view>
            <text class="code-copy" @click="copyCode(card.card_code_fmt)">复制</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="generatedCards = []">关闭</view>
          <view class="modal-btn confirm" @click="copyAllCodes">复制全部</view>
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
      loading: false,
      filter: 'all',
      stats: { total: 0, unused: 0, used: 0, disabled: 0 },
      showGenerateModal: false,
      generateFaceValue: 10,
      generateCount: 1,
      generateExpireDays: 0,
      generatedCards: [],
      hud: { show: false, type: 'loading', text: '' }
    };
  },
  computed: {
    filteredList() {
      if (this.filter === 'all') return this.list;
      return this.list.filter(c => c.status === this.filter);
    }
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadData();
  },
  methods: {
    goBack() { uni.navigateBack(); },
    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text }; },
    setFilter(f) { this.filter = f; },
    statusText(status) {
      if (status === 0) return '未使用';
      if (status === 1) return '已使用';
      if (status === 2) return '已禁用';
      return '-';
    },
    statusKey(status) {
      if (status === 0) return 'unused';
      if (status === 1) return 'used';
      if (status === 2) return 'disabled';
      return 'used';
    },
    formatValue(v) {
      const n = parseFloat(v);
      return isNaN(n) ? '0.00' : n.toFixed(2);
    },
    async clearUsedCards() {
      uni.showModal({
        title: '确认清空',
        content: '确定要清空所有已使用的卡密吗？此操作不可恢复！',
        confirmColor: '#FF2442',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '清空中...');
            try {
              const r = await request('extensions/balance_card.php', { action: 'clear_used' }, { method: 'POST', baseURL: baseUrl });
              this.hud.show = false;
              if (r.status === 'success' || r.code === 0) {
                const deleted = (r.data && r.data.deleted) ? r.data.deleted : 0;
                uni.showToast({ title: `已清空${deleted}条`, icon: 'success' });
                this.loadData();
              } else {
                uni.showToast({ title: r.msg || '清空失败', icon: 'none' });
              }
            } catch (e) {
              this.hud.show = false;
              uni.showToast({ title: '清空失败', icon: 'none' });
            }
          }
        }
      });
    },
    exportUnusedCards() {
      const unusedCards = this.list.filter(c => c.status === 0);
      if (unusedCards.length === 0) {
        uni.showToast({ title: '没有可导出的卡密', icon: 'none' });
        return;
      }

      let csv = '卡密,面额,状态,批次号,创建时间\n';
      unusedCards.forEach(c => {
        csv += `"${c.card_code_fmt}","${this.formatValue(c.face_value)}","未使用","${c.batch_no || ''}","${c.created_time || ''}"\n`;
      });

      const d = new Date();
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `余额卡密_未使用_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      uni.showToast({ title: '导出成功', icon: 'success' });
    },
    copyCode(code) {
      uni.setClipboardData({ data: code, success: () => uni.showToast({ title: '已复制', icon: 'success' }) });
    },
    copyAllCodes() {
      const text = this.generatedCards.map(c => c.card_code_fmt).join('\n');
      uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制全部', icon: 'success' }) });
    },
    async loadData() {
      this.loading = true;
      try {
        const res = await request('extensions/balance_card.php', { action: 'list', page: 1, limit: 10000 }, { method: 'GET', baseURL: baseUrl });
        if (res.status === 'success' || res.code === 0) {
          const list = (res.data && res.data.list) ? res.data.list : [];
          this.list = list;
          this.stats.total = res.data.total || this.list.length;
          this.stats.unused = this.list.filter(c => c.status === 0).length;
          this.stats.used = this.list.filter(c => c.status === 1).length;
          this.stats.disabled = this.list.filter(c => c.status === 2).length;
        }
      } catch (e) { }
      this.loading = false;
    },
    async generateCards() {
      let faceValue = parseFloat(this.generateFaceValue);
      if (isNaN(faceValue) || faceValue < 0.01) {
        uni.showToast({ title: '面额至少0.01元', icon: 'none' });
        return;
      }
      let count = parseInt(this.generateCount) || 1;
      if (count < 1) count = 1;
      if (count > 100) count = 100;
      let expireDays = parseInt(this.generateExpireDays);
      if (isNaN(expireDays) || expireDays < 0) expireDays = 0;
      this.showHud('loading', '生成中...');
      try {
        const res = await request('extensions/balance_card.php', {
          action: 'generate',
          face_value: faceValue,
          count: count,
          expire_days: expireDays
        }, { method: 'POST', baseURL: baseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) {
          const cards = (res.data && res.data.cards) ? res.data.cards : (Array.isArray(res.data) ? res.data : []);
          this.generatedCards = cards;
          this.showGenerateModal = false;
          this.loadData();
        } else { uni.showToast({ title: res.msg || '生成失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '生成失败', icon: 'none' }); }
    },
    async disableCard(item) {
      uni.showModal({
        title: '确认禁用',
        content: '确定禁用此卡密吗？禁用后将无法使用。',
        confirmColor: '#FF2442',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '禁用中...');
            try {
              const r = await request('extensions/balance_card.php', { action: 'disable', id: item.id }, { method: 'POST', baseURL: baseUrl });
              this.hud.show = false;
              if (r.status === 'success' || r.code === 0) {
                uni.showToast({ title: '禁用成功', icon: 'success' });
                this.loadData();
              } else {
                uni.showToast({ title: r.msg || '禁用失败', icon: 'none' });
              }
            } catch (e) {
              this.hud.show = false;
              uni.showToast({ title: '禁用失败', icon: 'none' });
            }
          }
        }
      });
    },
    async deleteCard(item) {
      uni.showModal({ title: '确认删除', content: '确定删除此卡密吗?', confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('extensions/balance_card.php', { action: 'delete', id: item.id }, { method: 'POST', baseURL: baseUrl });
            this.hud.show = false;
            if (r.status === 'success' || r.code === 0) { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadData(); }
            else { uni.showToast({ title: r.msg || '删除失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '删除失败', icon: 'none' }); }
        }
      }});
    }
  }
};
</script>

<style scoped>
.vipcards-page { min-height: 100vh; background: #f0f1f6; }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f0f1f6; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 统计 */
.stats-bar { display: flex; margin: 24rpx; background: linear-gradient(135deg, #ff6b6b, #ee5a24); border-radius: 24rpx; padding: 32rpx 24rpx; box-shadow: 0 12rpx 32rpx rgba(238,90,36,0.35); }
.stat-item { flex: 1; text-align: center; color: #fff; position: relative; }
.stat-item:not(:last-child)::after { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 1rpx; height: 60%; background: rgba(255,255,255,0.3); }
.stat-value { display: block; font-size: 36rpx; font-weight: 700; text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1); }
.stat-label { display: block; font-size: 24rpx; opacity: 0.9; margin-top: 8rpx; letter-spacing: 1rpx; }

/* 筛选 */
.filter-bar { display: flex; padding: 0 24rpx 20rpx; gap: 16rpx; flex-wrap: wrap; }
.filter-item { padding: 14rpx 32rpx; background: #fff; border-radius: 32rpx; font-size: 26rpx; color: #666; border: 2rpx solid #e8e9ef; transition: all 0.3s ease; }
.filter-item:active { transform: scale(0.96); }
.filter-item.active { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: #fff; border-color: transparent; box-shadow: 0 6rpx 20rpx rgba(238,90,36,0.3); }

.action-bar { display: flex; gap: 16rpx; padding: 0 24rpx 20rpx; }
.action-btn { flex: 1; padding: 18rpx 24rpx; border-radius: 18rpx; font-size: 27rpx; text-align: center; font-weight: 600; transition: all 0.3s ease; }
.action-btn:active { transform: scale(0.98); }
.action-btn.danger { background: #fff; color: #e74c3c; border: 2rpx solid #f0cdd3; }
.action-btn.danger:active { background: #fef5f6; }
.action-btn.primary { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: #fff; box-shadow: 0 6rpx 20rpx rgba(238,90,36,0.3); }
.action-btn.success { background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; box-shadow: 0 6rpx 20rpx rgba(39,174,96,0.3); }

/* 列表 */
.list { margin: 0 24rpx; }
.list-item {
  background: #fff; border-radius: 22rpx; padding: 28rpx;
  margin-bottom: 18rpx; box-shadow: 0 6rpx 24rpx rgba(238,90,36,0.06);
  border: 1rpx solid #f5f6fa; transition: all 0.3s ease;
}
.list-item:active { transform: scale(0.99); box-shadow: 0 4rpx 16rpx rgba(238,90,36,0.08); }
.item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16rpx; }
.item-info { flex: 1; }
.item-card { display: block; font-size: 31rpx; font-weight: 700; color: #e74c3c; font-family: 'SF Mono', monospace; letter-spacing: 2rpx; }
.item-value { display: inline-block; font-size: 26rpx; font-weight: 700; color: #27ae60; margin-top: 8rpx; }
.item-status { font-size: 23rpx; padding: 7rpx 18rpx; border-radius: 20rpx; font-weight: 600; }
.status-unused { background: linear-gradient(135deg, #d4edda, #c3e6cb); color: #155724; }
.status-used { background: linear-gradient(135deg, #e9ecef, #dee2e6); color: #6c757d; }
.status-disabled { background: linear-gradient(135deg, #f8d7da, #f5c2c7); color: #842029; }
.item-meta { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 16rpx; padding-top: 14rpx; border-top: 1rpx solid #f5f6fa; }
.meta-tag { font-size: 23rpx; color: #888; background: #f8f9fa; padding: 7rpx 16rpx; border-radius: 12rpx; }
.item-actions { display: flex; justify-content: flex-end; gap: 14rpx; }
.item-action { padding: 12rpx 28rpx; border-radius: 20rpx; font-size: 25rpx; font-weight: 600; }
.item-action.warn { background: linear-gradient(135deg, #fff3e0, #ffe0b2); color: #e65100; }
.item-action.danger { background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: #bbb; }
.footer-space { height: 40rpx; }

/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(8rpx); }
.modal-content { width: 90%; max-width: 620rpx; max-height: 85vh; background: #fff; border-radius: 28rpx; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 28rpx 80rpx rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx 32rpx; border-bottom: 1rpx solid #f0f1f6; flex-shrink: 0; background: linear-gradient(135deg, #fafafc, #f5f6fa); }
.modal-title { font-size: 32rpx; font-weight: 700; color: #1a1a1a; letter-spacing: 1rpx; }
.modal-close { font-size: 40rpx; color: #999; line-height: 1; padding: 8rpx; }
.modal-close:active { background: rgba(0,0,0,0.05); border-radius: 50%; }
.modal-body { padding: 28rpx 32rpx; overflow-y: auto; }
.form-item { margin-bottom: 28rpx; }
.form-label { display: block; font-size: 28rpx; color: #555; margin-bottom: 14rpx; font-weight: 600; }
.form-input { width: 100%; height: 88rpx; background: #f8f9fa; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; border: 2rpx solid #e8e9ef; transition: all 0.3s ease; box-sizing: border-box; }
.form-input:focus { border-color: #ff6b6b; background: #fff; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f1f6; flex-shrink: 0; }
.modal-btn { flex: 1; height: 92rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; transition: all 0.3s ease; }
.modal-btn:active { background: rgba(0,0,0,0.04); }
.modal-btn.cancel { color: #888; border-right: 1rpx solid #f0f1f6; }
.modal-btn.confirm { color: #fff; background: linear-gradient(135deg, #ff6b6b, #ee5a24); }

.code-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 16rpx; border-bottom: 1rpx solid #f0f1f6; }
.code-item:last-child { border-bottom: none; }
.code-item:active { background: #fafafc; }
.code-info { flex: 1; }
.code-value { display: inline-block; font-size: 22rpx; color: #fff; background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 4rpx 12rpx; border-radius: 8rpx; margin-bottom: 8rpx; }
.code-no { display: block; font-size: 27rpx; font-weight: 700; color: #e74c3c; font-family: 'SF Mono', monospace; letter-spacing: 1rpx; }
.code-copy { font-size: 26rpx; color: #ee5a24; font-weight: 600; padding: 8rpx 20rpx; background: #fff0ed; border-radius: 16rpx; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }
.spinner.white { width: 32rpx; height: 32rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
