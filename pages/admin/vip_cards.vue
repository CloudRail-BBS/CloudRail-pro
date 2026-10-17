<template>
  <view class="vipcards-page" :class="themeClass">
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
      </view>

      <view class="filter-bar">
        <view class="filter-item" :class="{ active: filter === 'all' }" @click="setFilter('all')">全部</view>
        <view class="filter-item" :class="{ active: filter === 'unused' }" @click="setFilter('unused')">未使用</view>
        <view class="filter-item" :class="{ active: filter === 'used' }" @click="setFilter('used')">已使用</view>
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
              <text class="item-card">{{ item.card_no }}</text>
              <text class="item-type">{{ item.type_name || '会员卡密' }}</text>
            </view>
            <text class="item-status" :class="'status-' + item.status">{{ item.status === 'unused' ? '未使用' : '已使用' }}</text>
          </view>
          <view class="item-meta">
            <text class="meta-tag" v-if="item.used_by">使用者: {{ item.used_by }}</text>
            <text class="meta-tag">有效期: {{ item.days || 30 }}天</text>
            <text class="meta-tag">创建: {{ item.created_at }}</text>
          </view>
          <view class="item-actions" v-if="item.status === 'unused'">
            <view class="action-btn danger" @click="deleteCard(item)">删除</view>
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
          <text class="modal-title">生成会员卡密</text>
          <view class="modal-close" @click="showGenerateModal = false">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">卡密类型</text>
            <view class="form-picker" @click="showTypeOptions = !showTypeOptions">
              <text>{{ typeOptions[typeIndex].name }}</text>
              <text class="picker-arrow" :class="{ expanded: showTypeOptions }">›</text>
            </view>
            <view class="type-options" v-if="showTypeOptions">
              <view class="type-option" v-for="(opt, idx) in typeOptions" :key="idx" :class="{ active: idx === typeIndex }" @click="selectType(idx)">
                {{ opt.name }}
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">生成数量</text>
            <input class="form-input" type="number" v-model="generateCount" placeholder="请输入数量(1-100)" min="1" max="100" />
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
              <text class="code-type">{{ card.type_name }}</text>
              <text class="code-no">{{ card.card_no }}</text>
            </view>
            <text class="code-copy" @click="copyCode(card.card_no)">复制</text>
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
      loading: false,
      filter: 'all',
      stats: { total: 0, unused: 0, used: 0 },
      showGenerateModal: false,
      generateCount: 1,
      typeIndex: 0,
      typeOptions: [
        { type: 'month', name: '月卡(30天)', days: 30 },
        { type: 'year', name: '年卡(365天)', days: 365 },
        { type: 'permanent', name: '永久卡', days: 0 }
      ],
      showTypeOptions: false,
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
    onTypeChange(e) { this.typeIndex = e.detail.value; },
    selectType(idx) {
      this.typeIndex = idx;
      this.showTypeOptions = false;
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
              const r = await request('extensions/vip_card.php', { action: 'clear_used' }, { method: 'POST', baseURL: baseUrl });
              this.hud.show = false;
              if (r.status === 'success' || r.code === 0) {
                uni.showToast({ title: '清空成功', icon: 'success' });
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
      const unusedCards = this.list.filter(c => c.status === 'unused');
      if (unusedCards.length === 0) {
        uni.showToast({ title: '没有可导出的卡密', icon: 'none' });
        return;
      }
      
      let csv = '卡密,类型,有效期(天),创建时间\n';
      unusedCards.forEach(c => {
        csv += `"${c.card_no}","${c.type_name}","${c.days}","${c.created_at}"\n`;
      });
      
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `会员卡密_未使用_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      uni.showToast({ title: '导出成功', icon: 'success' });
    },
    copyCode(code) {
      uni.setClipboardData({ data: code, success: () => uni.showToast({ title: '已复制', icon: 'success' }) });
    },
    async loadData() {
      this.loading = true;
      try {
        const res = await request('extensions/vip_card.php', { action: 'list' }, { method: 'GET', baseURL: baseUrl });
        if (res.status === 'success' || res.code === 0) {
          const list = (res.data && res.data.list) ? res.data.list : [];
          this.list = list.map(item => ({
            ...item,
            card_no: item.code,
            type_name: this.getTypeName(item.type),
            used_by: item.username,
            created_at: item.create_time,
            days: this.getDays(item.type)
          }));
          this.stats.total = res.data.total || this.list.length;
          this.stats.unused = this.list.filter(c => c.status === 'unused').length;
          this.stats.used = this.list.filter(c => c.status === 'used').length;
        }
      } catch (e) { }
      this.loading = false;
    },
    getTypeName(type) {
      const map = { 'month': '月卡', 'year': '年卡', 'permanent': '永久卡' };
      return map[type] || type;
    },
    getDays(type) {
      const map = { 'month': 30, 'year': 365, 'permanent': 0 };
      return map[type] || 30;
    },
    async generateCards() {
      let count = parseInt(this.generateCount) || 1;
      if (count < 1) count = 1;
      if (count > 100) count = 100;
      const type = this.typeOptions[this.typeIndex];
      this.showHud('loading', '生成中...');
      try {
        const res = await request('extensions/vip_card.php', {
          action: 'generate',
          count: count,
          type: type.type
        }, { method: 'POST', baseURL: baseUrl });
        this.hud.show = false;
        if (res.status === 'success' || res.code === 0) {
          this.generatedCards = (res.data || []).map(item => ({
            ...item,
            card_no: item.code,
            type_name: this.getTypeName(item.type)
          }));
          this.showGenerateModal = false;
          this.loadData();
        } else { uni.showToast({ title: res.msg || '生成失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '生成失败', icon: 'none' }); }
    },
    async deleteCard(item) {
      uni.showModal({ title: '确认删除', content: '确定删除此卡密吗?', confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('extensions/vip_card.php', { action: 'delete', id: item.id }, { method: 'POST', baseURL: baseUrl });
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
.vipcards-page { min-height: 100vh; background: var(--cr-surface-alt); }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: var(--cr-surface-alt); }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 统计 */
.stats-bar { display: flex; margin: 24rpx; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 24rpx; padding: 32rpx 24rpx; box-shadow: 0 12rpx 32rpx rgba(102,126,234,0.35); }
.stat-item { flex: 1; text-align: center; color: #fff; position: relative; }
.stat-item:not(:last-child)::after { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 1rpx; height: 60%; background: rgba(255,255,255,0.3); }
.stat-value { display: block; font-size: 36rpx; font-weight: 700; text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1); }
.stat-label { display: block; font-size: 24rpx; opacity: 0.9; margin-top: 8rpx; letter-spacing: 1rpx; }

/* 筛选 */
.filter-bar { display: flex; padding: 0 24rpx 20rpx; gap: 16rpx; flex-wrap: wrap; }
.filter-item { padding: 14rpx 32rpx; background: var(--cr-surface); border-radius: 32rpx; font-size: 26rpx; color: var(--cr-text-muted); border: 2rpx solid #e8e9ef; transition: all 0.3s ease; }
.filter-item:active { transform: scale(0.96); }
.filter-item.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-color: transparent; box-shadow: 0 6rpx 20rpx rgba(102,126,234,0.3); }

.action-bar { display: flex; gap: 16rpx; padding: 0 24rpx 20rpx; }
.action-btn { flex: 1; padding: 18rpx 24rpx; border-radius: 18rpx; font-size: 27rpx; text-align: center; font-weight: 600; transition: all 0.3s ease; }
.action-btn:active { transform: scale(0.98); }
.action-btn.danger { background: var(--cr-surface); color: #e74c3c; border: 2rpx solid #f0cdd3; }
.action-btn.danger:active { background: #fef5f6; }
.action-btn.primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 6rpx 20rpx rgba(102,126,234,0.3); }
.action-btn.success { background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; box-shadow: 0 6rpx 20rpx rgba(39,174,96,0.3); }

/* 列表 */
.list { margin: 0 24rpx; }
.list-item {
  background: var(--cr-surface); border-radius: 22rpx; padding: 28rpx;
  margin-bottom: 18rpx; box-shadow: 0 6rpx 24rpx rgba(102,126,234,0.06);
  border: 1rpx solid #f5f6fa; transition: all 0.3s ease;
}
.list-item:active { transform: scale(0.99); box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.08); }
.item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16rpx; }
.item-info { flex: 1; }
.item-card { display: block; font-size: 31rpx; font-weight: 700; color: #1a1a1a; font-family: 'SF Mono', monospace; letter-spacing: 2rpx; }
.item-type { display: inline-block; font-size: 22rpx; color: #fff; background: linear-gradient(135deg, #764ba2, #9b59b6); padding: 4rpx 12rpx; border-radius: 8rpx; margin-top: 8rpx; }
.item-status { font-size: 23rpx; padding: 7rpx 18rpx; border-radius: 20rpx; font-weight: 600; }
.status-unused { background: linear-gradient(135deg, #d4edda, #c3e6cb); color: #155724; }
.status-used { background: linear-gradient(135deg, #cce5ff, #b8daff); color: #004085; }
.item-meta { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 16rpx; padding-top: 14rpx; border-top: 1rpx solid #f5f6fa; }
.meta-tag { font-size: 23rpx; color: var(--cr-text-muted); background: #f8f9fa; padding: 7rpx 16rpx; border-radius: 12rpx; }
.item-actions { display: flex; justify-content: flex-end; }
.item-actions .action-btn { padding: 12rpx 28rpx; border-radius: 20rpx; font-size: 25rpx; font-weight: 600; background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: var(--cr-text-muted); }
.footer-space { height: 40rpx; }

/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(8rpx); }
.modal-content { width: 90%; max-width: 620rpx; max-height: 85vh; background: var(--cr-surface); border-radius: 28rpx; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 28rpx 80rpx rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx 32rpx; border-bottom: 1rpx solid #f0f1f6; flex-shrink: 0; background: linear-gradient(135deg, #fafafc, #f5f6fa); }
.modal-title { font-size: 32rpx; font-weight: 700; color: #1a1a1a; letter-spacing: 1rpx; }
.modal-close { font-size: 40rpx; color: var(--cr-text-muted); line-height: 1; padding: 8rpx; }
.modal-close:active { background: rgba(0,0,0,0.05); border-radius: 50%; }
.modal-body { padding: 28rpx 32rpx; overflow-y: auto; }
.form-item { margin-bottom: 28rpx; }
.form-label { display: block; font-size: 28rpx; color: #555; margin-bottom: 14rpx; font-weight: 600; }
.form-picker { display: flex; justify-content: space-between; align-items: center; height: 88rpx; background: var(--cr-surface-alt); border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: var(--cr-text); border: 2rpx solid #e8e9ef; transition: all 0.3s ease; }
.form-picker:active { border-color: #667eea; background: #fff; }
.picker-arrow { font-size: 36rpx; color: var(--cr-text-muted); transition: transform 0.3s; }
.picker-arrow.expanded { transform: rotate(90deg); }
.type-options { margin-top: 14rpx; background: var(--cr-surface); border: 2rpx solid #e8e9ef; border-radius: 16rpx; overflow: hidden; }
.type-option { padding: 22rpx 24rpx; font-size: 28rpx; color: var(--cr-text); }
.type-option.active { background: linear-gradient(135deg, #fef5e7, #fdecd0); color: #d68910; font-weight: 600; }
.type-option:active { background: var(--cr-surface-alt); }
.form-input { width: 100%; height: 88rpx; background: var(--cr-surface-alt); border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; border: 2rpx solid #e8e9ef; transition: all 0.3s ease; }
.form-input:focus { border-color: #667eea; background: #fff; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f1f6; flex-shrink: 0; }
.modal-btn { flex: 1; height: 92rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; transition: all 0.3s ease; }
.modal-btn:active { background: rgba(0,0,0,0.04); }
.modal-btn.cancel { color: var(--cr-text-muted); border-right: 1rpx solid #f0f1f6; }
.modal-btn.confirm { color: #fff; background: linear-gradient(135deg, #667eea, #764ba2); }

.code-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 16rpx; border-bottom: 1rpx solid #f0f1f6; }
.code-item:last-child { border-bottom: none; }
.code-item:active { background: #fafafc; }
.code-info { flex: 1; }
.code-type { display: inline-block; font-size: 22rpx; color: #fff; background: linear-gradient(135deg, #764ba2, #9b59b6); padding: 4rpx 12rpx; border-radius: 8rpx; margin-bottom: 8rpx; }
.code-no { display: block; font-size: 27rpx; font-weight: 700; color: #1a1a1a; font-family: 'SF Mono', monospace; letter-spacing: 1rpx; }
.code-copy { font-size: 26rpx; color: #667eea; font-weight: 600; padding: 8rpx 20rpx; background: #f0f4ff; border-radius: 16rpx; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }
.spinner.white { width: 32rpx; height: 32rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
