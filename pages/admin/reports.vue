<template>
  <view class="reports-page">
    <view class="header-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="page-title">举报处理 · 处罚版</view>
      <view class="tab-bar">
        <view 
          class="tab-item" 
          v-for="(tab, index) in tabs" 
          :key="index"
          @click="switchTab(tab.value)"
          :class="{ active: activeTab === tab.value }"
        >
          <text class="tab-label">{{ tab.label }}</text>
          <view class="tab-badge" v-if="tab.count > 0">{{ tab.count }}</view>
        </view>
      </view>
    </view>

    <scroll-view class="main-scroll" scroll-y :style="{ paddingTop: (statusBarHeight + 92) + 'px' }">
      <view class="list-container">
        <view class="report-card" v-for="report in reportList" :key="report.id" @click="showReportDetail(report)">
          <view class="report-header">
            <view class="report-type" :class="getReportTypeClass(report.type)">{{ getReportTypeName(report.type) }}</view>
            <text class="report-time">{{ formatTime(report.create_time) }}</text>
          </view>

          <text class="report-title">{{ report.post_title || report.target_name || '无标题' }}</text>

          <view class="report-reason">
            <text class="reason-label">举报类型：</text>
            <text class="reason-value red-text">{{ report.report_reason || report.reason || '无' }}</text>
          </view>
          <view class="report-desc-container">
            <text class="desc-label">举报内容：</text>
            <text class="desc-value red-text">{{ report.description || '无' }}</text>
          </view>

          <view class="report-meta">
            <view class="meta-item"><image class="meta-icon-img" src="/static/icon/admin-user-aaa.svg" mode="aspectFit" /><text class="meta-text">{{ report.reporter_name }}</text></view>
            <view v-if="report.target_id" class="meta-item"><image class="meta-icon-img" src="/static/icon/admin-file-text-corner-aaa.svg" mode="aspectFit" /><text class="meta-text">帖子: {{ report.post_title || report.target_name || 'ID:' + report.target_id }}</text></view>
          </view>

          <view class="report-result" v-if="Number(report.status) !== 0 && report.result">
            <text class="result-label">处理结果：</text>
            <text class="result-value">{{ report.result }}</text>
          </view>

          <view class="report-result reply-box" v-if="report.reply">
            <text class="result-label reply-label">客服回复：</text>
            <text class="result-value reply-value">{{ report.reply }}</text>
          </view>

          <view class="report-footer">
            <view class="report-status" :class="getReportStatusClass(report.status)">{{ getReportStatusName(report.status) }}</view>
            <view class="report-actions">
              <view class="action-btn edit" v-if="report.type === 'post'" @click.stop="editPost(report.target_id)">编辑帖子</view>
              <view class="action-btn block" v-if="canTakeDown(report)" @click.stop="takeDown(report)">下架内容</view>
              <view class="action-btn ban" v-if="canBan(report)" @click.stop="openBan(report)">封禁用户</view>
              <view class="action-btn" @click.stop="openPunish(report)">处理</view>
              <view class="action-btn reply" v-if="Number(report.status) !== 0" @click.stop="replyReport(report)">回复</view>
              <view class="action-btn reject" v-if="Number(report.status) === 0" @click.stop="ignoreReport(report)">忽略</view>
            </view>
          </view>
        </view>

        <view class="empty-state" v-if="reportList.length === 0">
          <image class="empty-icon-img" src="/static/icon/admin-inbox-ccc.svg" mode="aspectFit" />
          <text class="empty-text">暂无举报</text>
        </view>

        <view class="load-more" v-if="hasMore">
          <text class="load-more-text" @click="loadMore">加载更多</text>
        </view>
      </view>
    </scroll-view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>

    <view class="detail-modal" v-if="showDetail">
      <view class="modal-mask" @click="closeDetail"></view>
      <view class="modal-content detail-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">举报详情</text>
          <view class="modal-close" @click="closeDetail"><image src="/static/icon/x-light-gray.svg" class="modal-close-icon" mode="aspectFit"></image></view>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view class="detail-section">
            <view class="detail-label">举报类型</view>
            <view class="detail-value">
              <view class="type-tag" :class="getReportTypeClass(selectedReport?.type)">
                {{ getReportTypeName(selectedReport?.type) }}
              </view>
            </view>
          </view>
          <view class="detail-section">
            <view class="detail-label">举报时间</view>
            <view class="detail-value">{{ formatTime(selectedReport?.create_time) }}</view>
          </view>
          <view class="detail-section">
            <view class="detail-label">举报人</view>
            <view class="detail-value">{{ selectedReport?.reporter_name }} (ID: {{ selectedReport?.reporter_id }})</view>
          </view>
          <view class="detail-section">
            <view class="detail-label">目标内容</view>
            <view class="detail-value">帖子: {{ selectedReport?.post_title || selectedReport?.target_name || 'ID:' + selectedReport?.target_id }}</view>
          </view>
          <view class="detail-section">
            <view class="detail-label">举报标题</view>
            <view class="detail-value">
              <text class="red-text">{{ selectedReport?.reason || selectedReport?.report_reason || '无' }}</text>
            </view>
          </view>
          <view class="detail-section">
            <view class="detail-label">举报内容</view>
            <view class="detail-value text-area">
              <text class="red-text">{{ selectedReport?.description || '无' }}</text>
            </view>
          </view>
          <view class="detail-section">
            <view class="detail-label">处理状态</view>
            <view class="detail-value">
              <view class="status-tag" :class="getReportStatusClass(selectedReport?.status)">
                {{ getReportStatusName(selectedReport?.status) }}
              </view>
            </view>
          </view>
          <view class="detail-section" v-if="selectedReport && selectedReport.result">
            <view class="detail-label">处理结果</view>
            <view class="detail-value text-area"><text class="green-text">{{ selectedReport.result }}</text></view>
          </view>
          <view class="detail-section" v-if="selectedReport && selectedReport.reply">
            <view class="detail-label">客服回复</view>
            <view class="detail-value text-area"><text class="reply-text">{{ selectedReport.reply }}</text></view>
          </view>

          <!-- 处罚设置(仅待处理举报可操作) -->
          <view class="punish-panel" v-if="selectedReport && Number(selectedReport.status) === 0">
            <view class="punish-title">处罚设置</view>
            <view class="punish-row" v-if="canTakeDown(selectedReport)">
              <text class="punish-label">下架/删除被举报内容</text>
              <switch class="punish-switch" :checked="punishForm.takeDown" color="#FF2442" @change="onTakeDownChange" />
            </view>
            <view class="punish-row" v-if="canBan(selectedReport)">
              <text class="punish-label">封禁被举报用户</text>
              <switch class="punish-switch" :checked="punishForm.banDays > 0" color="#FF2442" @change="onBanSwitch" />
            </view>
            <view class="ban-days" v-if="punishForm.banDays > 0">
              <view class="day-chip" v-for="d in banDayOptions" :key="d" :class="{ active: punishForm.banDays === d }" @click="punishForm.banDays = d">{{ d }}天</view>
            </view>
            <input class="punish-input" v-if="punishForm.banDays > 0" v-model="punishForm.banReason" placeholder="封禁原因(选填)" maxlength="50" />
            <textarea class="punish-textarea" v-model="punishForm.reply" placeholder="客服回复(选填，举报人在「我的举报」中可见)" maxlength="200" />
            <input class="punish-input" v-model="punishForm.remark" placeholder="内部处理说明(选填)" maxlength="60" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeDetail">关闭</view>
          <view class="modal-btn reject-btn" v-if="selectedReport && Number(selectedReport.status) === 0" @click="ignoreReport(selectedReport)">忽略</view>
          <view class="modal-btn confirm" v-if="selectedReport && Number(selectedReport.status) === 0" @click="submitPunish">处理并回复</view>
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
      activeTab: 'all',
      tabs: [
        { value: 'all', label: '全部', count: 0 },
        { value: 'pending', label: '待处理', count: 0 },
        { value: 'handled', label: '已处理', count: 0 },
      ],
      reportList: [],
      page: 1,
      hasMore: true,
      hud: { show: false, type: 'loading', text: '' },
      showDetail: false,
      selectedReport: null,
      showFilterModal: false,
      /* 处罚表单: 下架内容 / 封禁天数(0=不封禁) / 封禁原因 / 客服回复 / 处理说明 */
      punishForm: { takeDown: false, banDays: 0, banReason: '', reply: '', remark: '' },
      banDayOptions: [1, 3, 7, 30, 365]
    };
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadReports();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    async loadReports(refresh = false) {
      if (refresh) {
        this.page = 1;
        this.reportList = [];
        this.hasMore = true;
      }
      
      if (!this.hasMore) return;
      
      this.showHud('loading', '加载中...');
      
      try {
        const status = this.activeTab === 'pending' ? 'pending' : (this.activeTab === 'handled' ? 'handled' : 'all');
        const res = await request('reports.php', { action: 'get_reports', page: this.page, status: status }, { baseURL: bmsBaseUrl, method: 'GET' });
        
        if (res && (res.code === 0 || res.status === 'success') && res.data) {
          const list = res.data.list || [];
          if (list.length < 20) {
            this.hasMore = false;
          }
          this.reportList = refresh ? list : [...this.reportList, ...list];
          // 更新tab计数（第一页时返回）
          if (refresh || this.page === 1) {
            this.tabs[0].count = res.data.all_count || 0;
            this.tabs[1].count = res.data.pending_count || 0;
            this.tabs[2].count = res.data.handled_count || 0;
          }
          this.page++;
        }
      } catch (e) {
      }
      this.hud.show = false;
    },
    loadMore() {
      this.loadReports();
    },
    getReportTypeClass(type) {
      const classes = {
        'spam': 'spam',
        'inappropriate': 'inappropriate',
        'advertisement': 'advertisement',
        'post': 'post',
        'user': 'user',
        'other': 'other'
      };
      return classes[type] || 'other';
    },
    getReportTypeName(type) {
      const names = {
        'spam': '垃圾信息',
        'inappropriate': '不当内容',
        'advertisement': '广告推广',
        'post': '帖子举报',
        'user': '用户举报',
        'other': '其他'
      };
      return names[type] || '其他';
    },
    getReportStatusClass(status) {
      return Number(status) === 0 ? 'pending' : 'handled';
    },
    getReportStatusName(status) {
      const s = Number(status);
      if (s === 0) return '待处理';
      if (s === 2) return '已忽略';
      return '已处理';
    },
    formatTime(time) {
      if (!time) return '';
      const date = new Date(String(time).replace(/-/g, '/'));
      if (isNaN(date.getTime())) return time;
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    },
    switchTab(value) {
      if (this.activeTab === value) return;
      this.activeTab = value;
      this.loadReports(true);
    },
    /* 是否可下架内容(帖子/动态/评论) */
    canTakeDown(report) {
      if (!report) return false;
      const t = String(report.type || report.target_type || '');
      return t === 'post' || t === 'moment' || t === 'comment';
    },
    /* 是否可封禁被举报用户 */
    canBan(report) {
      if (!report) return false;
      return !!report.target_uid && !Number(report.target_banned);
    },
    showReportDetail(report) {
      this.selectedReport = report;
      this.punishForm = { takeDown: false, banDays: 0, banReason: '', reply: '', remark: '' };
      this.showDetail = true;
    },
    closeDetail() {
      this.showDetail = false;
      this.selectedReport = null;
    },
    editPost(postId) {
      uni.setStorageSync('editPostData', { postId: postId });
      uni.navigateTo({ url: '/pages/publish/publish' });
    },
    /* 打开处理面板(带处罚设置) */
    openPunish(report) {
      if (!report) return;
      this.selectedReport = report;
      this.punishForm = {
        takeDown: this.canTakeDown(report),
        banDays: 0,
        banReason: '',
        reply: '',
        remark: ''
      };
      this.showDetail = true;
    },
    onTakeDownChange(e) {
      this.punishForm.takeDown = !!(e && e.detail && e.detail.value);
    },
    onBanSwitch(e) {
      const on = !!(e && e.detail && e.detail.value);
      this.punishForm.banDays = on ? (this.punishForm.banDays > 0 ? this.punishForm.banDays : 7) : 0;
    },
    /* 提交处理: 可同时下架内容 + 封禁作者, 结果写入举报记录并通知举报人 */
    async submitPunish() {
      const report = this.selectedReport;
      if (!report) return;
      const tips = [];
      if (this.punishForm.takeDown) tips.push('下架被举报内容');
      if (this.punishForm.banDays > 0) tips.push(`封禁该作者 ${this.punishForm.banDays} 天`);
      if (this.punishForm.reply) tips.push('回复举报人');
      uni.showModal({
        title: '确认处理',
        content: tips.length ? `将执行：${tips.join('、')}，确定吗？` : '确定将该举报标记为已处理吗？',
        success: async (res) => {
          if (!res.confirm) return;
          this.showHud('loading', '处理中...');
          try {
            const result = await request('reports.php', {
              action: 'handle_report',
              id: report.id,
              take_down: this.punishForm.takeDown ? 1 : 0,
              ban_days: this.punishForm.banDays > 0 ? this.punishForm.banDays : 0,
              ban_reason: this.punishForm.banReason,
              reply: this.punishForm.reply,
              remark: this.punishForm.remark
            }, { baseURL: bmsBaseUrl });
            if (result && (result.code === 0 || result.status === 'success')) {
              uni.showToast({ title: '处理成功', icon: 'success' });
              this.closeDetail();
              this.loadReports(true);
            } else {
              uni.showToast({ title: (result && result.msg) || '处理失败', icon: 'none' });
            }
          } catch (e) {
            uni.showToast({ title: (e && e.msg) || '处理失败', icon: 'none' });
          }
          this.hud.show = false;
        }
      });
    },
    /* 仅客服回复(不改变举报状态), 举报人在「我的举报」可见 */
    replyReport(report) {
      if (!report) return;
      uni.showModal({
        title: '客服回复',
        editable: true,
        placeholderText: '请输入回复内容(举报人可见)',
        success: async (res) => {
          if (!res.confirm) return;
          const text = (res.content || '').trim();
          if (!text) return uni.showToast({ title: '请填写回复内容', icon: 'none' });
          this.showHud('loading', '发送中...');
          try {
            const result = await request('reports.php', {
              action: 'reply_report',
              id: report.id,
              reply: text
            }, { baseURL: bmsBaseUrl });
            if (result && (result.code === 0 || result.status === 'success')) {
              uni.showToast({ title: '回复已发送', icon: 'success' });
              this.loadReports(true);
            } else {
              uni.showToast({ title: (result && result.msg) || '发送失败', icon: 'none' });
            }
          } catch (e) {
            uni.showToast({ title: (e && e.msg) || '发送失败', icon: 'none' });
          }
          this.hud.show = false;
        }
      });
    },
    /* 忽略举报(不成立) */
    ignoreReport(report) {
      if (!report) return;
      uni.showModal({
        title: '确认忽略',
        content: '确定忽略该举报吗？将通知举报人处理结果。',
        success: async (res) => {
          if (!res.confirm) return;
          this.showHud('loading', '处理中...');
          try {
            const result = await request('reports.php', {
              action: 'ignore_report',
              id: report.id
            }, { baseURL: bmsBaseUrl });
            if (result && (result.code === 0 || result.status === 'success')) {
              uni.showToast({ title: '已忽略该举报', icon: 'success' });
              this.closeDetail();
              this.loadReports(true);
            } else {
              uni.showToast({ title: (result && result.msg) || '操作失败', icon: 'none' });
            }
          } catch (e) {
            uni.showToast({ title: (e && e.msg) || '操作失败', icon: 'none' });
          }
          this.hud.show = false;
        }
      });
    },
    /* 仅下架被举报内容 */
    takeDown(report) {
      if (!report) return;
      uni.showModal({
        title: '确认下架',
        content: '确定下架该被举报内容吗？下架后用户端不再显示。',
        success: async (res) => {
          if (!res.confirm) return;
          this.showHud('loading', '处理中...');
          try {
            const result = await request('reports.php', {
              action: 'take_down',
              id: report.id
            }, { baseURL: bmsBaseUrl });
            if (result && (result.code === 0 || result.status === 'success')) {
              uni.showToast({ title: '已下架该内容', icon: 'success' });
              this.loadReports(true);
            } else {
              uni.showToast({ title: (result && result.msg) || '下架失败', icon: 'none' });
            }
          } catch (e) {
            uni.showToast({ title: (e && e.msg) || '下架失败', icon: 'none' });
          }
          this.hud.show = false;
        }
      });
    },
    /* 仅封禁被举报用户 */
    openBan(report) {
      if (!report) return;
      const items = this.banDayOptions.map(d => `封禁 ${d} 天`);
      items.push('解除封禁');
      uni.showActionSheet({
        itemList: items,
        success: (res) => {
          const idx = res.tapIndex;
          const days = idx < this.banDayOptions.length ? this.banDayOptions[idx] : 0;
          this.doBan(report, days);
        }
      });
    },
    async doBan(report, days) {
      this.showHud('loading', '处理中...');
      try {
        const result = await request('reports.php', {
          action: 'ban_user',
          id: report.id,
          ban_days: days,
          ban_reason: days > 0 ? '违反社区规范' : ''
        }, { baseURL: bmsBaseUrl });
        if (result && (result.code === 0 || result.status === 'success')) {
          uni.showToast({ title: days > 0 ? `已封禁 ${days} 天` : '已解除封禁', icon: 'success' });
          this.loadReports(true);
        } else {
          uni.showToast({ title: (result && result.msg) || '操作失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: (e && e.msg) || '操作失败', icon: 'none' });
      }
      this.hud.show = false;
    },
    showHud(type, text) {
      this.hud = { show: true, type: type || 'loading', text };
    }
  }
};
</script>

<style scoped>
.reports-page { min-height: 100vh; background: #f0f1f6; }

/* 顶部固定区（标题 + Tab） */
.header-wrap {
  position: fixed; top: 0; left: 0; right: 0; z-index: 998;
  background: #fff;
  box-shadow: 0 2rpx 16rpx rgba(102,126,234,0.08);
}
.page-title {
  height: 88rpx; line-height: 88rpx; text-align: center;
  font-size: 33rpx; font-weight: 700; color: #222;
}

/* Tab */
.tab-bar {
  display: flex;
  background: #fff;
}
.tab-item { flex: 1; padding: 22rpx 0; text-align: center; position: relative; }
.tab-label { font-size: 27rpx; color: #999; font-weight: 500; }
.tab-item.active .tab-label { color: #667eea; font-weight: 700; }
.tab-item.active::after {
  content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 48rpx; height: 5rpx; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 6rpx;
}
.tab-badge { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 19rpx; padding: 2rpx 12rpx; border-radius: 14rpx; margin-left: 8rpx; }

.main-scroll { height: 100vh; box-sizing: border-box; }

/* 卡片 */
.list-container { padding: 0 24rpx 40rpx; }
.report-card {
  background: #fff; border-radius: 20rpx; padding: 22rpx;
  margin-bottom: 16rpx; overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);
}
.report-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.report-type { padding: 6rpx 18rpx; border-radius: 20rpx; font-size: 23rpx; font-weight: 600; white-space: nowrap; }
.report-type.spam { background: #fff7e6; color: #fa8c16; }
.report-type.inappropriate { background: #fff0f0; color: #ff4d4f; }
.report-type.advertisement { background: #f6ffed; color: #52c41a; }
.report-type.other { background: #f5f6fa; color: #666; }
.report-time { font-size: 23rpx; color: #bbb; }

.report-title { display: block; font-size: 29rpx; font-weight: 600; color: #222; margin-bottom: 12rpx; line-height: 1.45; }
.report-reason, .report-desc-container { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.reason-label, .desc-label { font-size: 24rpx; color: #aaa; flex-shrink: 0; }
.reason-value, .desc-value { font-size: 24rpx; flex: 1; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.report-meta { display: flex; gap: 20rpx; margin-top: 14rpx; padding-top: 14rpx; border-top: 1rpx solid #f0f1f6; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 6rpx; }
.meta-icon-img { width: 28rpx; height: 28rpx; display: block; }
.meta-text { font-size: 23rpx; color: #aaa; }

.report-footer { display: flex; align-items: center; margin-top: 14rpx; gap: 10rpx; flex-wrap: nowrap; }
.report-status { padding: 5rpx 18rpx; border-radius: 18rpx; font-size: 22rpx; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.report-status.pending { background: #fef5e7; color: #e67e22; }
.report-status.handled { background: #eef9f0; color: #27ae60; }
.report-actions { display: flex; gap: 8rpx; flex-wrap: nowrap; }
.action-btn { padding: 7rpx 16rpx; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 18rpx; font-size: 21rpx; white-space: nowrap; font-weight: 500; }
.action-btn.reject { background: #f5f6fa; color: #888; }
.action-btn.block { background: linear-gradient(135deg, #e67e22, #f39c12); color: #fff; }
.action-btn.ban { background: linear-gradient(135deg, #ff4d4f, #cf1322); color: #fff; }
.action-btn.reply { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; }
.reply-text { color: #2f6fed; }

/* 处理结果 */
.report-result { margin-top: 12rpx; padding: 12rpx 16rpx; background: #f4fbf6; border-radius: 12rpx; display: flex; }
.result-label { font-size: 23rpx; color: #27ae60; flex-shrink: 0; }
.result-value { font-size: 23rpx; color: #27ae60; flex: 1; line-height: 1.5; }
.report-result.reply-box { background: #f2f6ff; }
.reply-label { color: #2f6fed; }
.reply-value { color: #2f6fed; }
.punish-textarea { margin-top: 12rpx; width: 100%; min-height: 130rpx; background: #fff; border: 1rpx solid #e5e6eb; border-radius: 12rpx; padding: 16rpx 18rpx; font-size: 25rpx; color: #333; box-sizing: border-box; }
.green-text { color: #27ae60; font-weight: 500; }

/* 处罚设置面板 */
.punish-panel { margin-top: 22rpx; padding: 20rpx; background: #fafbff; border: 1rpx solid #eef0f8; border-radius: 16rpx; }
.punish-title { font-size: 26rpx; font-weight: 700; color: #333; margin-bottom: 14rpx; }
.punish-row { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; }
.punish-label { font-size: 26rpx; color: #444; }
.punish-switch { transform: scale(0.75); transform-origin: right center; }
.ban-days { display: flex; flex-wrap: wrap; gap: 12rpx; margin: 10rpx 0 6rpx; }
.day-chip { padding: 8rpx 20rpx; border-radius: 24rpx; background: #fff; border: 1rpx solid #e5e6eb; font-size: 23rpx; color: #666; }
.day-chip.active { background: #fff0f2; border-color: #FF2442; color: #FF2442; font-weight: 600; }
.punish-input { margin-top: 12rpx; height: 68rpx; background: #fff; border: 1rpx solid #e5e6eb; border-radius: 12rpx; padding: 0 18rpx; font-size: 25rpx; color: #333; }
.modal-btn.reject-btn { color: #999; font-weight: 500; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: #bbb; }
.load-more { padding: 28rpx; text-align: center; }
.load-more-text { font-size: 27rpx; color: #667eea; font-weight: 500; }

/* HUD */
.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }
.spinner { width: 30rpx; height: 30rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 详情弹窗 */
.detail-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-mask { position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.45); backdrop-filter: blur(4rpx); }
.modal-content { position: relative; width: 88%; max-width: 640rpx; background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 24rpx 64rpx rgba(0,0,0,0.15); }
.detail-content { max-height: 80vh; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 30rpx; border-bottom: 1rpx solid #f0f1f6; }
.modal-title { font-size: 31rpx; font-weight: 700; color: #222; }
.modal-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.modal-close-icon { width: 32rpx; height: 32rpx; }
.modal-close:active { background: #f5f6fa; }
.modal-body { padding: 24rpx 30rpx; max-height: 50vh; overflow-y: auto; }
.detail-section { margin-bottom: 22rpx; }
.detail-section:last-child { margin-bottom: 0; }
.detail-label { font-size: 24rpx; color: #aaa; margin-bottom: 6rpx; }
.detail-value { font-size: 27rpx; color: #333; line-height: 1.5; }
.detail-value.text-area { line-height: 1.6; word-break: break-all; }
.type-tag, .status-tag { display: inline-block; padding: 6rpx 18rpx; border-radius: 20rpx; font-size: 23rpx; font-weight: 500; }
.status-tag.pending { background: #fef5e7; color: #e67e22; }
.status-tag.handled { background: #eef9f0; color: #27ae60; }
.red-text { color: #e74c3c; font-weight: 500; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f1f6; }
.modal-btn { flex: 1; padding: 28rpx; text-align: center; font-size: 29rpx; font-weight: 500; }
.modal-btn.cancel { color: #999; border-right: 1rpx solid #f0f1f6; }
.modal-btn.confirm { color: #667eea; font-weight: 700; }
</style>