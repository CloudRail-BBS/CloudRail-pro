<template>
  <view class="rel-admin" :class="themeClass">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">返回</view>
      <text class="nav-title">关系建立</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view class="main-scroll" scroll-y>
      <!-- 统计 -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{ stats.total || 0 }}</text>
          <text class="stat-label">总记录</text>
        </view>
        <view class="stat-card">
          <text class="stat-num active">{{ stats.active || 0 }}</text>
          <text class="stat-label">已建立</text>
        </view>
        <view class="stat-card">
          <text class="stat-num warn">{{ stats.pending || 0 }}</text>
          <text class="stat-label">待确认</text>
        </view>
        <view class="stat-card">
          <text class="stat-num grey">{{ stats.ended || 0 }}</text>
          <text class="stat-label">已结束</text>
        </view>
        <view class="stat-card">
          <text class="stat-num purple">{{ stats.avg_intimacy || 0 }}</text>
          <text class="stat-label">平均亲密值</text>
        </view>
      </view>

      <!-- 筛选 -->
      <view class="filter-bar">
        <input class="search-input" type="text" v-model="q" placeholder="搜索双方昵称 / 栖屿号" @confirm="reset" />
        <view class="search-btn" @click="reset">搜索</view>
        <view class="create-btn" @click="openCreate">手动建立关系</view>
      </view>

      <view class="chips">
        <view v-for="s in statusOptions" :key="s.value" class="chip" :class="{ on: status === s.value }" @click="setStatus(s.value)">{{ s.label }}</view>
        <picker class="type-picker" :range="typeOptions" range-key="label" @change="onTypeChange">
          <view class="chip">{{ typeLabel }} ▾</view>
        </picker>
      </view>

      <!-- 列表 -->
      <view class="list">
        <view class="rel-item" v-for="item in list" :key="item.id">
          <view class="rel-pair">
            <view class="person">
              <image class="p-ava" :src="item.from.avatar || defaultAvatar" mode="aspectFill" />
              <text class="p-name">{{ item.from.name || item.from.uid }}</text>
              <text class="p-uid">{{ item.from.uid }}</text>
            </view>
            <view class="pair-mid">
              <text class="pair-type">{{ item.type_name }}</text>
              <text class="pair-heart">♡</text>
            </view>
            <view class="person">
              <image class="p-ava" :src="item.to.avatar || defaultAvatar" mode="aspectFill" />
              <text class="p-name">{{ item.to.name || item.to.uid }}</text>
              <text class="p-uid">{{ item.to.uid }}</text>
            </view>
          </view>

          <view class="rel-meta">
            <text class="tag" :class="'st-' + item.status">{{ item.status_text }}</text>
            <text class="tag lv">Lv.{{ item.level.level }} {{ item.level.level_name }}</text>
            <text class="tag">亲密值 {{ item.intimacy }}</text>
            <text class="tag">相伴 {{ item.days }} 天</text>
          </view>
          <view class="rel-time">建立于 {{ item.created_at }}</view>

          <view class="rel-actions">
            <view class="act-btn primary" @click="openEdit(item)">改亲密值 / 等级</view>
            <view class="act-btn" v-if="item.status !== 1" @click="setStatusOf(item, 1)">置为已建立</view>
            <view class="act-btn warn" v-else @click="setStatusOf(item, 3)">置为已解除</view>
            <view class="act-btn danger" @click="doDelete(item)">删除</view>
          </view>
        </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadData(false)">{{ loading ? '加载中...' : '加载更多' }}</view>
      </view>

      <view class="empty-state" v-if="list.length === 0 && !loading">
        <text class="empty-text">暂无关系记录</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view class="modal-mask" v-if="showEdit" @click="showEdit = false">
      <view class="modal-box" @click.stop>
        <view class="modal-head">
          <text class="modal-title">调整亲密度</text>
          <view class="modal-close" @click="showEdit = false">×</view>
        </view>
        <view class="modal-body">
          <view class="who-line">{{ editForm.who }}</view>

          <view class="form-item">
            <text class="form-label">当前亲密值</text>
            <text class="form-value">{{ editForm.intimacy }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">设为等级</text>
            <view class="lv-chips">
              <view v-for="l in levels" :key="l.lv" class="lv-chip" :class="{ on: editForm.set_level === l.lv }" @click="editForm.set_level = l.lv">
                Lv.{{ l.lv }} {{ l.name }}
              </view>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">或直接设亲密值</text>
            <input class="form-input" type="number" v-model="editForm.intimacy" placeholder="填 0 ~ 999999" />
          </view>

          <view class="form-item">
            <text class="form-label">快速加减</text>
            <view class="lv-chips">
              <view class="lv-chip" @click="editForm.delta = -100">-100</view>
              <view class="lv-chip" @click="editForm.delta = -10">-10</view>
              <view class="lv-chip" @click="editForm.delta = 10">+10</view>
              <view class="lv-chip" @click="editForm.delta = 100">+100</view>
              <view class="lv-chip" @click="editForm.delta = 1000">+1000</view>
              <view class="lv-chip" @click="editForm.delta = 0">不清空</view>
            </view>
            <text class="form-tip" v-if="editForm.delta">将在当前值上 {{ editForm.delta > 0 ? '+' : '' }}{{ editForm.delta }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">关系名称</text>
            <input class="form-input" v-model="editForm.type_name" maxlength="8" placeholder="如 情侣 / 死党" />
          </view>

          <view class="form-item">
            <text class="form-label">状态</text>
            <view class="lv-chips">
              <view v-for="s in statusOptions.slice(1)" :key="s.value" class="lv-chip" :class="{ on: editForm.status === s.value }" @click="editForm.status = s.value">{{ s.label }}</view>
            </view>
          </view>
        </view>
        <view class="modal-foot">
          <view class="foot-btn" @click="showEdit = false">取消</view>
          <view class="foot-btn primary" @click="saveEdit">保存</view>
        </view>
      </view>
    </view>

    <!-- 手动建立弹窗 -->
    <view class="modal-mask" v-if="showCreate" @click="showCreate = false">
      <view class="modal-box" @click.stop>
        <view class="modal-head">
          <text class="modal-title">手动建立关系</text>
          <view class="modal-close" @click="showCreate = false">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">用户 A</text>
            <input class="form-input" v-model="createForm.uid_a" placeholder="填栖屿号 / 账号 / 昵称" />
          </view>
          <view class="form-item">
            <text class="form-label">用户 B</text>
            <input class="form-input" v-model="createForm.uid_b" placeholder="填栖屿号 / 账号 / 昵称" />
          </view>
          <view class="form-item">
            <text class="form-label">关系类型</text>
            <picker :range="typeOptions" range-key="label" @change="onCreateType">
              <view class="form-picker">{{ createTypeLabel }} ▾</view>
            </picker>
          </view>
          <view class="form-item" v-if="createForm.type_key === 'custom'">
            <text class="form-label">自定义名称</text>
            <input class="form-input" v-model="createForm.type_name" maxlength="8" placeholder="最多 8 个字" />
          </view>
          <text class="form-tip">管理员直接建立的关系立即生效，不会给对方发确认卡片。</text>
        </view>
        <view class="modal-foot">
          <view class="foot-btn" @click="showCreate = false">取消</view>
          <view class="foot-btn primary" @click="submitCreate">建立</view>
        </view>
      </view>
    </view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <text>{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getScreenMetrics } from '../../common/screen.js';
import { request } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      total: 0,
      q: '',
      status: '1',
      typeKey: '',
      stats: {},
      types: [],
      levels: [],
      showEdit: false,
      editForm: { id: 0, who: '', type_name: '', intimacy: 0, status: 1, set_level: 0, delta: 0 },
      showCreate: false,
      createForm: { uid_a: '', uid_b: '', type_key: 'cp', type_name: '' },
      hud: { show: false, type: 'loading', text: '' },
      defaultAvatar: 'https://y.sgyunp.cn/f/6eXTL/IMG_5336.jpeg'
    };
  },
  computed: {
    statusOptions() {
      return [
        { value: '', label: '全部' },
        { value: '1', label: '已建立' },
        { value: '0', label: '待确认' },
        { value: '2', label: '已拒绝' },
        { value: '3', label: '已解除' }
      ];
    },
    /* 类型筛选下拉：加一个"全部类型"，自定义单列一项 */
    typeOptions() {
      const arr = [{ key: '', label: '全部类型' }];
      (this.types || []).forEach(t => arr.push({ key: t.key, label: t.name }));
      arr.push({ key: 'custom', label: '自定义' });
      return arr;
    },
    typeLabel() {
      const t = this.typeOptions.find(o => o.key === this.typeKey);
      return t ? t.label : '全部类型';
    },
    createTypeLabel() {
      const t = this.typeOptions.find(o => o.key === this.createForm.type_key);
      return t ? t.label : '请选择';
    }
  },
  onLoad() {
    const m = getScreenMetrics();
    this.statusBarHeight = m.statusBarHeight || 0;
    this.loadData(true);
  },
  methods: {
    goBack() { uni.navigateBack(); },
    showHud(text) { this.hud = { show: true, type: 'loading', text }; },
    hideHud() { this.hud = { show: false, type: 'loading', text: '' }; },
    toast(msg) { uni.showToast({ title: msg, icon: 'none' }); },

    async loadData(reset) {
      if (reset) { this.page = 1; this.hasMore = true; this.list = []; }
      if (this.loading || !this.hasMore) return;
      this.loading = true;
      try {
        const res = await request('admin/relations', {
          page: this.page,
          q: this.q,
          status: this.status,
          type_key: this.typeKey
        }, { method: 'GET' });
        if (res && res.code === 0 && res.data) {
          const d = res.data;
          const arr = d.list || [];
          this.list = reset ? arr : this.list.concat(arr);
          this.total = d.total || 0;
          this.stats = d.stats || {};
          if ((d.types || []).length) this.types = d.types;
          if ((d.levels || []).length) this.levels = d.levels;
          this.hasMore = this.list.length < this.total;
          if (this.hasMore) this.page++;
        } else {
          this.toast((res && (res.msg || res.message)) || '加载失败');
        }
      } catch (e) {
        this.toast((e && (e.msg || e.message)) || '加载失败');
      }
      this.loading = false;
    },
    reset() { this.loadData(true); },
    setStatus(v) { this.status = v; this.loadData(true); },
    onTypeChange(e) {
      const idx = Number(e.detail.value || 0);
      const t = this.typeOptions[idx];
      this.typeKey = t ? t.key : '';
      this.loadData(true);
    },
    onCreateType(e) {
      const idx = Number(e.detail.value || 0);
      const t = this.typeOptions[idx];
      this.createForm.type_key = (t && t.key) ? t.key : 'cp';
      if (this.createForm.type_key !== 'custom') this.createForm.type_name = '';
    },

    openEdit(item) {
      this.editForm = {
        id: item.id,
        who: (item.from.name || item.from.uid) + ' 与 ' + (item.to.name || item.to.uid) + '（' + item.type_name + '）',
        type_name: item.type_name,
        intimacy: item.intimacy,
        status: item.status === 0 ? 1 : item.status,
        set_level: 0,
        delta: 0
      };
      this.showEdit = true;
    },
    async saveEdit() {
      const f = this.editForm;
      const payload = { id: f.id };
      if (f.delta) payload.delta = Number(f.delta);
      else if (f.set_level > 0) payload.set_level = Number(f.set_level);
      else payload.intimacy = Number(f.intimacy) || 0;
      if (f.type_name) payload.type_name = f.type_name;
      if (f.status !== undefined && f.status !== null && f.status !== '') payload.status = f.status;

      this.showHud('保存中...');
      try {
        const res = await request('admin/relation/update', payload, { method: 'POST' });
        this.hideHud();
        if (res && res.code === 0) {
          this.showEdit = false;
          this.toast('已保存');
          this.loadData(true);
        } else {
          this.toast((res && (res.msg || res.message)) || '保存失败');
        }
      } catch (e) {
        this.hideHud();
        this.toast((e && (e.msg || e.message)) || '保存失败');
      }
    },

    setStatusOf(item, status) {
      const label = status === 1 ? '置为已建立' : '置为已解除';
      uni.showModal({
        title: label,
        content: '确定要把这条关系「' + label + '」吗？',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('admin/relation/update', { id: item.id, status }, { method: 'POST' });
            if (res && res.code === 0) { this.toast('已保存'); this.loadData(true); }
            else this.toast((res && (res.msg || res.message)) || '操作失败');
          } catch (e) {
            this.toast((e && (e.msg || e.message)) || '操作失败');
          }
        }
      });
    },

    doDelete(item) {
      uni.showModal({
        title: '删除关系',
        content: '删除后这条记录会彻底消失（不可恢复），确定吗？',
        success: async (r) => {
          if (!r.confirm) return
          try {
            const res = await request('admin/relation/delete', { id: item.id }, { method: 'POST' });
            if (res && res.code === 0) { this.toast('已删除'); this.loadData(true); }
            else this.toast((res && (res.msg || res.message)) || '删除失败');
          } catch (e) {
            this.toast((e && (e.msg || e.message)) || '删除失败');
          }
        }
      });
    },

    openCreate() {
      this.createForm = { uid_a: '', uid_b: '', type_key: 'cp', type_name: '' };
      this.showCreate = true;
    },
    async submitCreate() {
      const f = this.createForm;
      if (!f.uid_a || !f.uid_b) return this.toast('请填写两个用户');
      if (f.type_key === 'custom' && !f.type_name) return this.toast('请填写自定义关系名称');
      this.showHud('建立中...');
      try {
        const res = await request('admin/relation/create', {
          uid_a: f.uid_a,
          uid_b: f.uid_b,
          type_key: f.type_key,
          type_name: f.type_key === 'custom' ? f.type_name : ''
        }, { method: 'POST' });
        this.hideHud();
        if (res && res.code === 0) {
          this.showCreate = false;
          this.toast('关系已建立');
          this.loadData(true);
        } else {
          this.toast((res && (res.msg || res.message)) || '建立失败');
        }
      } catch (e) {
        this.hideHud();
        this.toast((e && (e.msg || e.message)) || '建立失败');
      }
    }
  }
};
</script>

<style scoped>
.rel-admin { min-height: 100vh; background: var(--cr-surface-alt); }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 28rpx; height: 56px; background: var(--cr-surface); border-bottom: 1rpx solid #eee; }
.nav-back { width: 120rpx; font-size: 28rpx; color: #667eea; font-weight: 500; }
.nav-title { font-size: 34rpx; font-weight: 700; color: var(--cr-text); letter-spacing: 2rpx; }
.nav-right { width: 120rpx; }

.main-scroll { height: calc(100vh - 56px); box-sizing: border-box; }

.stats-row { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 20rpx 24rpx; }
.stat-card { flex: 1; min-width: 120rpx; background: var(--cr-surface); border-radius: 16rpx; padding: 22rpx 10rpx; display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 34rpx; font-weight: 800; color: var(--cr-text); }
.stat-num.active { color: #4caf50; }
.stat-num.warn { color: #ff9800; }
.stat-num.grey { color: #9e9e9e; }
.stat-num.purple { color: #7c4dff; }
.stat-label { font-size: 21rpx; color: var(--cr-text-muted); margin-top: 8rpx; }

.filter-bar { display: flex; align-items: center; gap: 14rpx; padding: 0 24rpx 16rpx; }
.search-input { flex: 1; height: 72rpx; background: var(--cr-surface); border-radius: 36rpx; padding: 0 26rpx; font-size: 26rpx; }
.search-btn { height: 72rpx; padding: 0 30rpx; border-radius: 36rpx; background: #667eea; color: #fff; font-size: 26rpx; display: flex; align-items: center; }
.create-btn { height: 72rpx; padding: 0 30rpx; border-radius: 36rpx; background: #4caf50; color: #fff; font-size: 26rpx; display: flex; align-items: center; white-space: nowrap; }

.chips { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx 18rpx; }
.chip { padding: 0 24rpx; height: 60rpx; border-radius: 30rpx; background: var(--cr-surface); color: #666; font-size: 25rpx; display: flex; align-items: center; }
.chip.on { background: #667eea; color: #fff; font-weight: 600; }
.type-picker { display: inline-flex; }

.list { padding: 0 24rpx; }
.rel-item { background: var(--cr-surface); border-radius: 20rpx; padding: 26rpx; margin-bottom: 20rpx; }
.rel-pair { display: flex; align-items: center; justify-content: space-between; }
.person { flex: 1; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.p-ava { width: 96rpx; height: 96rpx; border-radius: 50%; background: #eee; }
.p-name { font-size: 25rpx; color: var(--cr-text); font-weight: 600; margin-top: 10rpx; max-width: 200rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.p-uid { font-size: 20rpx; color: var(--cr-text-muted); margin-top: 4rpx; }
.pair-mid { width: 180rpx; display: flex; flex-direction: column; align-items: center; }
.pair-type { font-size: 27rpx; font-weight: 800; color: #ff4d79; }
.pair-heart { font-size: 30rpx; color: #ffb3c9; margin-top: 4rpx; }

.rel-meta { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 22rpx; }
.tag { font-size: 21rpx; color: var(--cr-text-muted); background: #f2f3f5; padding: 6rpx 16rpx; border-radius: 999rpx; }
.tag.lv { color: #7c4dff; background: #f2ecff; }
.tag.st-1 { color: #2e7d32; background: #e8f5e9; }
.tag.st-0 { color: #b26a00; background: #fff7e6; }
.tag.st-2, .tag.st-3 { color: var(--cr-text-muted); }
.rel-time { font-size: 21rpx; color: var(--cr-text-muted); margin-top: 14rpx; }

.rel-actions { display: flex; flex-wrap: wrap; gap: 14rpx; margin-top: 22rpx; padding-top: 22rpx; border-top: 1rpx solid var(--cr-border); }
.act-btn { padding: 0 26rpx; height: 62rpx; border-radius: 31rpx; font-size: 24rpx; color: var(--cr-text-muted); background: #f5f6f8; display: flex; align-items: center; }
.act-btn.primary { background: #eef1ff; color: #667eea; font-weight: 600; }
.act-btn.warn { background: #fff7e6; color: #b26a00; }
.act-btn.danger { background: #ffebee; color: #d32f2f; }

.load-more { padding: 10rpx 24rpx 30rpx; }
.load-btn { height: 80rpx; border-radius: 40rpx; background: var(--cr-surface); color: #667eea; font-size: 27rpx; display: flex; align-items: center; justify-content: center; }
.empty-state { padding: 120rpx 0; display: flex; justify-content: center; }
.empty-text { font-size: 27rpx; color: var(--cr-text-muted); }
.footer-space { height: 60rpx; }

/* 弹窗 */
.modal-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .45); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-box { width: 640rpx; max-height: 82vh; background: var(--cr-surface); border-radius: 24rpx; overflow: hidden; display: flex; flex-direction: column; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 30rpx; border-bottom: 1rpx solid var(--cr-border); }
.modal-title { font-size: 30rpx; font-weight: 700; color: var(--cr-text); }
.modal-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: var(--cr-text-muted); }
.modal-body { padding: 24rpx 30rpx; overflow-y: auto; }
.who-line { font-size: 25rpx; color: #667eea; background: #f2f5ff; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 25rpx; color: var(--cr-text-muted); margin-bottom: 12rpx; }
.form-value { font-size: 34rpx; font-weight: 800; color: var(--cr-text); }
.form-input { height: 78rpx; background: var(--cr-surface-alt); border-radius: 14rpx; padding: 0 22rpx; font-size: 26rpx; color: var(--cr-text); }
.form-picker { height: 78rpx; background: var(--cr-surface-alt); border-radius: 14rpx; padding: 0 22rpx; font-size: 26rpx; color: var(--cr-text); display: flex; align-items: center; }
.form-tip { display: block; font-size: 22rpx; color: #b26a00; margin-top: 10rpx; }
.lv-chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.lv-chip { padding: 0 22rpx; height: 58rpx; border-radius: 29rpx; background: var(--cr-surface-alt); color: #666; font-size: 23rpx; display: flex; align-items: center; }
.lv-chip.on { background: #667eea; color: #fff; font-weight: 600; }
.modal-foot { display: flex; border-top: 1rpx solid var(--cr-border); }
.foot-btn { flex: 1; height: 92rpx; display: flex; align-items: center; justify-content: center; font-size: 29rpx; color: var(--cr-text-muted); }
.foot-btn.primary { color: #fff; background: #667eea; font-weight: 600; }

.hud-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10000; }
.hud-toast { background: rgba(0, 0, 0, .75); color: #fff; font-size: 27rpx; padding: 22rpx 36rpx; border-radius: 14rpx; }
</style>
