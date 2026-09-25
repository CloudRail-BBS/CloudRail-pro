<template>
  <view class="circles-page">
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view class="main-scroll" scroll-y>

      <view class="search-bar">
        <input class="search-input" type="text" v-model="searchText" placeholder="搜索圈子名称" @confirm="loadData" />
        <view class="search-action" @click="loadData">搜索</view>
        <view class="cat-action" @click="manageCategories">分类管理</view>
        <view class="add-action" @click="addCircle">新增圈子</view>
      </view>

      <view class="list">
        <view class="list-item" v-for="item in list" :key="item.id">
              <view class="item-header">
                <image class="item-cover" :src="item.image" mode="aspectFill" />
                <view class="item-info">
                  <text class="item-title">{{ item.name || '-' }}</text>
                  <text class="item-desc">{{ item.desc || '暂无描述' }}</text>
                </view>
                <text class="item-status" :class="'status-' + item.status">{{ statusText(item.status) }}</text>
              </view>
              <view class="item-meta">
                <text class="meta-tag cat-tag" v-if="item.category_id">{{ item.category_name || '分类' }}</text>
                <text class="meta-tag">排序: {{ item.sort || 0 }}</text>
                <text class="meta-tag" v-if="item.publish_admin_only">仅管理员发帖</text>
                <text class="meta-tag" v-if="item.is_top">置顶</text>
                <text class="meta-tag level-tag" v-if="item.level && item.level > 0">Lv.{{ item.level }}</text>
                <text class="meta-tag vip-tag" v-if="item.vip && item.vip > 0">VIP专属</text>
              </view>
              <view class="item-actions">
                <view class="action-btn primary" @click="editCircle(item)">编辑</view>
                <view class="action-btn warn" v-if="!item.is_top" @click="toggleRecommend(item, 1)">置顶</view>
                <view class="action-btn info" v-if="item.is_top" @click="toggleRecommend(item, 0)">取消置顶</view>
                <view class="action-btn success" @click="manageModerators(item)">管理版主</view>
                <view class="action-btn danger" @click="deleteCircle(item)">删除</view>
              </view>
            </view>
      </view>

      <view class="load-more" v-if="hasMore">
        <view class="load-btn" @click="loadMore">
          <text>{{ loading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="list.length === 0 && !loading">
        <image class="empty-icon-img" src="/static/icon/admin-globe-ccc.svg" mode="aspectFit" />
        <text class="empty-text">暂无圈子数据</text>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>

    <view class="modal-mask" v-if="showEditModal" @click="closeEditModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editForm.id ? '编辑圈子' : '新增圈子' }}</text>
          <view class="modal-close" @click="closeEditModal">×</view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">名称</text>
            <input class="form-input" v-model="editForm.name" placeholder="请输入圈子名称" />
          </view>
          <view class="form-item">
            <text class="form-label">描述</text>
            <textarea class="form-textarea" v-model="editForm.desc" placeholder="请输入圈子描述"></textarea>
          </view>
          <view class="form-item">
            <text class="form-label">图标</text>
            <view style="display:flex;align-items:center;gap:10px;">
              <input class="form-input" style="flex:1;" v-model="editForm.image" placeholder="请输入图标URL或点击上传" />
              <view class="upload-btn" @click="chooseImage">上传图片</view>
            </view>
            <view v-if="editForm.image" class="image-preview">
              <image class="preview-img" :src="editForm.image" mode="aspectFill" />
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">所属分类</text>
            <view class="form-picker" @click="showCatPicker = true">
              <text class="picker-value">{{ catName(editForm.category_id) }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">排序值</text>
            <input class="form-input" type="number" v-model="editForm.sort" placeholder="请输入排序值" />
          </view>
          <view class="form-item">
            <text class="form-label">仅管理员发帖</text>
            <view class="form-switch" @click="editForm.publish_admin_only = editForm.publish_admin_only ? 0 : 1">
              <view class="switch-track" :class="{ active: editForm.publish_admin_only }">
                <view class="switch-thumb"></view>
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">进入等级限制</text>
            <view class="form-picker" @click="showLevelPicker = true">
              <text class="picker-value">{{ levelOptions.find(o => o.value == editForm.level)?.label || '无限制' }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">VIP限制</text>
            <view class="form-switch" @click="editForm.vip = editForm.vip ? 0 : 1">
              <view class="switch-track" :class="{ active: editForm.vip }">
                <view class="switch-thumb"></view>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeEditModal">取消</view>
          <view class="btn btn-confirm" @click="saveCircle">保存</view>
        </view>
      </view>
    </view>

    <view class="modal-mask" v-if="showLevelPicker" @click="showLevelPicker = false">
      <view class="modal-content level-picker-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择等级限制</text>
          <view class="modal-close" @click="showLevelPicker = false">×</view>
        </view>
        <view class="picker-body">
          <view class="picker-item" v-for="opt in levelOptions" :key="opt.value" @click="selectLevel(opt)">
            <text class="picker-item-text">{{ opt.label }}</text>
            <image src="/static/icon/check-purple.svg" class="picker-check" v-if="editForm.level == opt.value" mode="aspectFit"></image>
          </view>
        </view>
      </view>
    </view>

    <view class="modal-mask" v-if="showCatPicker" @click="showCatPicker = false">
      <view class="modal-content level-picker-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择分类</text>
          <view class="modal-close" @click="showCatPicker = false">×</view>
        </view>
        <view class="picker-body">
          <view class="picker-item" @click="selectCategory(0)">
            <text class="picker-item-text">未分类</text>
            <image src="/static/icon/check-purple.svg" class="picker-check" v-if="editForm.category_id == 0" mode="aspectFit"></image>
          </view>
          <view class="picker-item" v-for="cat in categories" :key="cat.id" @click="selectCategory(cat.id)">
            <text class="picker-item-text">{{ cat.name }}</text>
            <image src="/static/icon/check-purple.svg" class="picker-check" v-if="editForm.category_id == cat.id" mode="aspectFit"></image>
          </view>
          <view class="empty-state" v-if="categories.length === 0">
            <text class="empty-text">暂无分类，可先去"分类管理"添加</text>
          </view>
        </view>
      </view>
    </view>

    <view class="modal-mask" v-if="showCatModal" @click="closeCatModal">
      <view class="modal-content cat-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">圈子分类管理</text>
          <view class="modal-close" @click="closeCatModal">×</view>
        </view>
        <view class="modal-body">
          <view class="cat-add-row">
            <input class="form-input" v-model="catForm.name" :placeholder="catEditingId ? '修改分类名称' : '输入新分类名称'" />
            <view class="cat-add-btn" @click="saveCategory">{{ catEditingId ? '保存' : '添加' }}</view>
            <view class="cat-cancel-btn" v-if="catEditingId" @click="cancelCatEdit">取消</view>
          </view>
          <view class="cat-list" v-if="categories.length > 0">
            <view class="cat-item" v-for="cat in categories" :key="cat.id">
              <view class="cat-info">
                <text class="cat-name">{{ cat.name }}</text>
                <text class="cat-count">{{ cat.count }} 个圈子</text>
              </view>
              <view class="cat-actions">
                <view class="action-btn small primary" @click="editCategory(cat)">编辑</view>
                <view class="action-btn small danger" @click="deleteCategory(cat)">删除</view>
              </view>
            </view>
          </view>
          <view class="empty-state" v-else>
            <text class="empty-text">暂无分类，先添加一个吧</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeCatModal">关闭</view>
        </view>
      </view>
    </view>

    <view class="modal-mask" v-if="showModeratorModal" @click="closeModeratorModal">
      <view class="modal-content moderator-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">管理版主 - {{ currentCircle?.name }}</text>
          <view class="modal-close" @click="closeModeratorModal">×</view>
        </view>
        <view class="modal-body">
          <view class="search-bar small">
            <input class="search-input" v-model="moderatorKeyword" placeholder="搜索用户名或UID" @confirm="searchModeratorUsers" />
            <view class="search-action" @click="searchModeratorUsers">搜索</view>
          </view>
          <view class="moderator-list" v-if="moderatorList.length > 0">
            <view class="moderator-item" v-for="item in moderatorList" :key="item.id">
              <image class="moderator-avatar" :src="item.avatar" mode="aspectFill" />
              <view class="moderator-info">
                <text class="moderator-name">{{ item.name || item.username }}</text>
                <text class="moderator-uid">UID: {{ item.id }}</text>
              </view>
              <view class="moderator-action">
                <view class="action-btn small danger" v-if="item.is_moderator" @click="removeModerator(item)">移除</view>
                <view class="action-btn small success" v-if="!item.is_moderator" @click="addModerator(item)">添加</view>
              </view>
            </view>
          </view>
          <view class="empty-state" v-if="moderatorList.length === 0">
            <text class="empty-text">{{ searching ? '搜索中...' : '暂无数据' }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeModeratorModal">关闭</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getScreenMetrics } from '../../common/screen.js';
import { request, bmsBaseUrl, uploadSigned } from '../../common/request.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      searchText: '',
      hud: { show: false, type: 'loading', text: '' },
      showEditModal: false,
      showLevelPicker: false,
      showModeratorModal: false,
      showCatPicker: false,
      showCatModal: false,
      categories: [],
      catForm: { name: '' },
      catEditingId: 0,
      levelOptions: [
        { label: '无限制', value: 0 },
        { label: 'Lv.1', value: 1 },
        { label: 'Lv.2', value: 2 },
        { label: 'Lv.3', value: 3 },
        { label: 'Lv.4', value: 4 },
        { label: 'Lv.5', value: 5 },
        { label: 'Lv.6', value: 6 },
        { label: 'Lv.7', value: 7 },
        { label: 'Lv.8', value: 8 },
        { label: 'Lv.9', value: 9 },
        { label: 'Lv.10', value: 10 }
      ],
      editForm: {
        id: 0,
        name: '',
        desc: '',
        image: '',
        sort: 0,
        is_top: 0,
        publish_admin_only: 0,
        level: 0,
        vip: 0,
        category_id: 0
      },
      currentCircle: null,
      moderatorKeyword: '',
      moderatorList: [],
      searching: false
    };
  },
  onLoad() {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    this.loadData();
    this.loadCategories();
  },
  methods: {
    goBack() { uni.navigateBack(); },
    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text }; },
    statusText(status) {
      const map = { 'active': '正常', 'disabled': '禁用', 'pending': '待审核' };
      return map[status] || status;
    },
    async loadCategories() {
      try {
        const res = await request('circle/categories', {}, { method: 'GET' });
        if (res.code === 0 && res.data) {
          this.categories = Array.isArray(res.data) ? res.data : (res.data.list || []);
        }
      } catch (e) { }
    },
    catName(id) {
      const cat = this.categories.find(c => c.id === id);
      return cat ? cat.name : '未分类';
    },
    selectCategory(id) {
      this.editForm.category_id = id;
      this.showCatPicker = false;
    },
    manageCategories() {
      this.catForm.name = '';
      this.catEditingId = 0;
      this.showCatModal = true;
      this.loadCategories();
    },
    editCategory(cat) {
      this.catForm.name = cat.name;
      this.catEditingId = cat.id;
    },
    cancelCatEdit() {
      this.catForm.name = '';
      this.catEditingId = 0;
    },
    closeCatModal() {
      this.showCatModal = false;
    },
    async saveCategory() {
      const name = (this.catForm.name || '').trim();
      if (!name) { uni.showToast({ title: '请输入分类名称', icon: 'none' }); return; }
      this.showHud('loading', this.catEditingId ? '保存中...' : '添加中...');
      try {
        let res;
        if (this.catEditingId) {
          res = await request('misc.php', { action: 'circle_category_update', id: this.catEditingId, name }, { method: 'POST', baseURL: bmsBaseUrl });
        } else {
          res = await request('misc.php', { action: 'circle_category_create', name }, { method: 'POST', baseURL: bmsBaseUrl });
        }
        this.hud.show = false;
        if (res.status === 'success') {
          uni.showToast({ title: this.catEditingId ? '修改成功' : '添加成功', icon: 'success' });
          this.catForm.name = '';
          this.catEditingId = 0;
          this.loadCategories();
        } else {
          uni.showToast({ title: res.msg || (this.catEditingId ? '修改失败' : '添加失败'), icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: this.catEditingId ? '修改失败' : '添加失败', icon: 'none' });
      }
    },
    deleteCategory(cat) {
      uni.showModal({ title: '确认删除', content: `确定删除分类"${cat.name}"吗?该分类下的圈子将变为未分类。`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('misc.php', { action: 'circle_category_delete', id: cat.id }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success') {
              uni.showToast({ title: '删除成功', icon: 'success' });
              this.loadCategories();
              this.loadData();
            } else {
              uni.showToast({ title: r.msg || '删除失败', icon: 'none' });
            }
          } catch (e) {
            this.hud.show = false;
            uni.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }});
    },
    async loadData() {
      if (this.loading) return;
      this.loading = true;
      this.page = 1;
      try {
        const res = await request('circle/list', {
          page: this.page,
          limit: 20,
          q: this.searchText
        }, { method: 'GET' });
        if (res.code === 0 && res.data) {
          const dataList = Array.isArray(res.data) ? res.data : (res.data.list || []);
          this.list = dataList;
          this.hasMore = dataList.length >= 20;
        }
      } catch (e) { console.log('圈子列表加载失败', e); }
      this.loading = false;
    },
    async loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page++;
      this.loading = true;
      try {
        const res = await request('circle/list', {
          page: this.page,
          limit: 20,
          q: this.searchText
        }, { method: 'GET' });
        if (res.code === 0 && res.data) {
          const dataList = Array.isArray(res.data) ? res.data : (res.data.list || []);
          this.list = [...this.list, ...dataList];
          this.hasMore = dataList.length >= 20;
        }
      } catch (e) { }
      this.loading = false;
    },
    async toggleRecommend(item, isRecommend) {
      this.showHud('loading', '处理中...');
      try {
        const res = await request('misc.php', { action: 'edit_misc', table: 'circles', id: item.id, is_top: isRecommend, name: item.name || '', desc: item.desc || '', image: item.image || '', sort: item.sort || 0, publish_admin_only: item.publish_admin_only || 0 }, { method: 'POST', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res.status === 'success') { uni.showToast({ title: '操作成功', icon: 'success' }); this.loadData(); }
        else { uni.showToast({ title: res.msg || '操作失败', icon: 'none' }); }
      } catch (e) { this.hud.show = false; uni.showToast({ title: '操作失败', icon: 'none' }); }
    },
    async deleteCircle(item) {
      uni.showModal({ title: '确认删除', content: `确定删除圈子 "${item.name}" 吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '删除中...');
          try {
            const r = await request('misc.php', { action: 'delete_misc', table: 'circles', id: item.id }, { method: 'POST', baseURL: bmsBaseUrl });
            this.hud.show = false;
            if (r.status === 'success') { uni.showToast({ title: '删除成功', icon: 'success' }); this.loadData(); }
            else { uni.showToast({ title: r.msg || '删除失败', icon: 'none' }); }
          } catch (e) { this.hud.show = false; uni.showToast({ title: '删除失败', icon: 'none' }); }
        }
      }});
    },
    addCircle() {
      this.editForm = { id: 0, name: '', desc: '', image: '', sort: 0, is_top: 0, publish_admin_only: 0, level: 0, vip: 0, category_id: 0 };
      this.showEditModal = true;
    },
    editCircle(item) {
      this.editForm = {
        id: item.id || 0,
        name: item.name || '',
        desc: item.desc || '',
        image: item.image || '',
        sort: item.sort || 0,
        is_top: item.is_top || 0,
        publish_admin_only: item.publish_admin_only || 0,
        level: item.level || 0,
        vip: item.vip || 0,
        category_id: item.category_id || 0
      };
      this.showEditModal = true;
    },
    selectLevel(opt) {
      this.editForm.level = opt.value;
      this.showLevelPicker = false;
    },
    closeEditModal() {
      this.showEditModal = false;
      this.editForm = { id: 0, name: '', desc: '', image: '', sort: 0, is_top: 0, publish_admin_only: 0, level: 0, vip: 0, category_id: 0 };
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          uni.showLoading({ title: '上传中...' });
          try {
            const result = await uploadSigned({ filePath: tempFilePath, type: 'post' });
            if (result.url) {
              this.editForm.image = result.url;
              uni.showToast({ title: '上传成功', icon: 'success' });
            } else {
              uni.showToast({ title: '上传失败', icon: 'none' });
            }
          } catch (e) {
            uni.showToast({ title: e && e.msg ? e.msg : '上传失败', icon: 'none' });
          } finally {
            uni.hideLoading();
          }
        },
        fail: () => {
          // 用户取消选择
        }
      });
    },
    async saveCircle() {
      if (!this.editForm.name.trim()) {
        uni.showToast({ title: '请输入名称', icon: 'none' });
        return;
      }
      this.showHud('loading', '保存中...');
      try {
        const action = this.editForm.id ? 'edit_misc' : 'add_misc';
        const res = await request('misc.php', {
          action: action,
          table: 'circles',
          id: this.editForm.id,
          name: this.editForm.name,
          desc: this.editForm.desc,
          image: this.editForm.image,
          sort: parseInt(this.editForm.sort) || 0,
          is_top: this.editForm.is_top ? 1 : 0,
          publish_admin_only: this.editForm.publish_admin_only ? 1 : 0,
          level: parseInt(this.editForm.level) || 0,
          vip: this.editForm.vip ? 1 : 0,
          category_id: parseInt(this.editForm.category_id) || 0
        }, { method: 'POST', baseURL: bmsBaseUrl });
        this.hud.show = false;
        if (res && res.status === 'success') {
          uni.showToast({ title: '保存成功', icon: 'success' });
          this.closeEditModal();
          this.loadData();
        } else {
          uni.showToast({ title: (res && res.msg) ? res.msg : '保存失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: (e && e.msg) ? e.msg : '保存失败', icon: 'none' });
      }
    },
    async manageModerators(item) {
      this.currentCircle = item;
      this.moderatorKeyword = '';
      this.moderatorList = [];
      this.showModeratorModal = true;
      // 自动加载当前圈子的版主列表
      this.loadCircleModerators();
    },
    async loadCircleModerators() {
      if (!this.currentCircle) return;
      this.searching = true;
      try {
        const modRes = await request('circle/get_circle_moderators', {
          circle_id: this.currentCircle.id
        }, { method: 'GET' });
        if (modRes.code === 0 && modRes.data) {
          const modList = modRes.data.list || modRes.data || [];
          this.moderatorList = modList.map(m => ({
            ...m,
            id: m.uid || m.user_id || m.id,
            uid: m.uid || m.user_id || m.id,
            name: m.nickname || m.name || m.username || '版主',
            username: m.username || '',
            avatar: m.avatar || '',
            is_moderator: true
          }));
        }
      } catch (e) { console.log('加载版主列表失败', e); }
      this.searching = false;
    },
    closeModeratorModal() {
      this.showModeratorModal = false;
      this.currentCircle = null;
      this.moderatorKeyword = '';
      this.moderatorList = [];
    },
    async searchModeratorUsers() {
      if (!this.currentCircle) return;
      const keyword = this.moderatorKeyword.trim();
      this.searching = true;
      try {
        // 先获取当前圈子的版主列表
        let modIds = [];
        try {
          const modRes = await request('circle/get_circle_moderators', {
            circle_id: this.currentCircle.id
          }, { method: 'GET' });
          if (modRes.code === 0 && modRes.data) {
            const modList = modRes.data.list || modRes.data || [];
            modIds = modList.map(m => m.uid || m.user_id || m.id);
          }
        } catch (e) {}

        if (keyword) {
          // 有关键词时搜索用户
          const res = await request('user/search', { keyword }, { method: 'GET' });
          if (res.code === 0 && res.data) {
            const userList = res.data.list || res.data || [];
            this.moderatorList = userList.map(u => ({
              ...u,
              id: u.uid || u.id,
              uid: u.uid || u.id,
              name: u.nickname || u.name || u.username,
              avatar: u.avatar || '',
              is_moderator: modIds.includes(u.uid || u.id)
            }));
          }
        } else {
          // 没有关键词时，直接显示当前圈子的版主
          this.loadCircleModerators();
          return;
        }
      } catch (e) { console.log('搜索用户失败', e); }
      this.searching = false;
    },
    async addModerator(user) {
      if (!this.currentCircle) return;
      this.showHud('loading', '添加中...');
      try {
        const res = await request('circle/add_circle_moderator', {
          circle_id: this.currentCircle.id,
          user_id: user.uid || user.id
        }, { method: 'POST' });
        this.hud.show = false;
        if (res.code === 0) {
          uni.showToast({ title: '添加成功', icon: 'success' });
          user.is_moderator = true;
        } else {
          uni.showToast({ title: res.msg || res.message || '添加失败', icon: 'none' });
        }
      } catch (e) {
        this.hud.show = false;
        uni.showToast({ title: '添加失败', icon: 'none' });
      }
    },
    async removeModerator(user) {
      if (!this.currentCircle) return;
      uni.showModal({ title: '确认移除', content: `确定移除 "${user.name || user.username}" 的版主权限吗?`, confirmColor: '#FF2442', success: async (res) => {
        if (res.confirm) {
          this.showHud('loading', '移除中...');
          try {
            const r = await request('circle/remove_circle_moderator', {
              circle_id: this.currentCircle.id,
              user_id: user.uid || user.id
            }, { method: 'POST' });
            this.hud.show = false;
            if (r.status === 'success') {
              uni.showToast({ title: '移除成功', icon: 'success' });
              user.is_moderator = false;
            } else {
              uni.showToast({ title: r.msg || '移除失败', icon: 'none' });
            }
          } catch (e) {
            this.hud.show = false;
            uni.showToast({ title: '移除失败', icon: 'none' });
          }
        }
      }});
    }
  }
};
</script>

<style scoped>
.circles-page { min-height: 100vh; background: #f0f1f6; }

/* 状态栏占位 */
.status-bar-placeholder { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #f0f1f6; }

.main-scroll { height: 100vh; padding-top: 44px; }

/* 搜索 */
.search-bar { display: flex; margin: 24rpx; gap: 14rpx; }
.search-input { flex: 1; height: 76rpx; background: #fff; border-radius: 38rpx; padding: 0 28rpx; font-size: 27rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.search-action { width: 130rpx; height: 76rpx; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 38rpx; display: flex; align-items: center; justify-content: center; font-size: 27rpx; font-weight: 500; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.25); }
.add-action { width: 140rpx; height: 76rpx; background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; border-radius: 38rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; box-shadow: 0 4rpx 16rpx rgba(39,174,96,0.25); }

/* 列表 */
.list { margin: 0 24rpx; }
.list-item {
  background: #fff; border-radius: 18rpx; padding: 22rpx;
  margin-bottom: 14rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.05);
}
.item-header { display: flex; margin-bottom: 12rpx; }
.item-cover { width: 96rpx; height: 96rpx; border-radius: 16rpx; flex-shrink: 0; border: 1rpx solid #f0edff; }
.item-info { flex: 1; margin-left: 16rpx; min-width: 0; }
.item-title { display: block; font-size: 29rpx; font-weight: 600; color: #222; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-desc { display: block; font-size: 24rpx; color: #aaa; margin-top: 6rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.45; }
.item-status { font-size: 22rpx; padding: 5rpx 14rpx; border-radius: 12rpx; height: fit-content; font-weight: 500; }
.status-active { background: #eef9f0; color: #27ae60; }
.status-disabled { background: #fce8ec; color: #e74c3c; }
.status-pending { background: #fef5e7; color: #e67e22; }
.item-meta { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 12rpx; }
.meta-tag { font-size: 22rpx; color: #888; background: #f5f6fa; padding: 5rpx 14rpx; border-radius: 10rpx; }
.meta-tag.level-tag { background: #eef5ff; color: #337ecc; }
.meta-tag.vip-tag { background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%); color: #ff9800; font-weight: 600; }
.item-actions { display: flex; gap: 8rpx; justify-content: flex-end; flex-wrap: wrap; }
.action-btn { padding: 9rpx 20rpx; border-radius: 18rpx; font-size: 23rpx; font-weight: 500; white-space: nowrap; }
.action-btn.warn { background: #fef5e7; color: #e67e22; }
.action-btn.info { background: #eef5ff; color: #337ecc; }
.action-btn.danger { background: #fce8ec; color: #e74c3c; }
.action-btn.primary { background: #eef5ff; color: #337ecc; }
.action-btn.success { background: #eef9f0; color: #27ae60; }
.action-btn.small { padding: 6rpx 14rpx; font-size: 21rpx; }

.load-more { margin: 24rpx; text-align: center; }
.load-btn { padding: 20rpx; background: #fff; border-radius: 18rpx; font-size: 27rpx; color: #999; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-img { width: 96rpx; height: 96rpx; display: block; margin: 0 auto 20rpx; opacity: 0.6; }
.empty-text { font-size: 27rpx; color: #bbb; }
.footer-space { height: 40rpx; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }
.spinner.white { width: 32rpx; height: 32rpx; border: 3rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 弹窗 */
.cat-action { width: 150rpx; height: 76rpx; background: linear-gradient(135deg, #ff9a3c, #ff6b35); color: #fff; border-radius: 38rpx; display: flex; align-items: center; justify-content: center; font-size: 25rpx; font-weight: 500; box-shadow: 0 4rpx 16rpx rgba(255,154,60,0.25); }
.meta-tag.cat-tag { background: linear-gradient(135deg, rgba(255,154,60,0.15) 0%, rgba(255,107,53,0.15) 100%); color: #ff6b35; font-weight: 600; }
.cat-modal { max-height: 70vh; }
.cat-add-row { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.cat-add-row .form-input { flex: 1; }
.cat-add-btn { padding: 0 32rpx; height: 84rpx; background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; border-radius: 14rpx; font-size: 28rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; white-space: nowrap; }
.cat-list { max-height: 45vh; overflow-y: auto; }
.cat-item { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 4rpx; border-bottom: 1rpx solid #f0f1f6; }
.cat-actions { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.cat-cancel-btn { padding: 0 24rpx; height: 84rpx; background: #f5f6fa; color: #888; border-radius: 14rpx; font-size: 26rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; white-space: nowrap; }
.cat-item:last-child { border-bottom: none; }
.cat-info { flex: 1; min-width: 0; }
.cat-name { display: block; font-size: 29rpx; color: #222; font-weight: 600; }
.cat-count { display: block; font-size: 23rpx; color: #bbb; margin-top: 6rpx; }
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 9998; backdrop-filter: blur(4rpx); }
.modal-content { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 80vh; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 30rpx; border-bottom: 1rpx solid #f0f1f6; }
.modal-title { font-size: 32rpx; font-weight: 700; color: #222; }
.modal-close { font-size: 40rpx; color: #bbb; line-height: 1; }
.modal-body { padding: 24rpx 30rpx; max-height: 60vh; overflow-y: auto; }
.modal-footer { display: flex; gap: 18rpx; padding: 24rpx 30rpx; border-top: 1rpx solid #f0f1f6; }
.btn { flex: 1; height: 84rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; }
.btn-cancel { background: #f5f6fa; color: #888; }
.btn-confirm { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.25); }
.form-item { margin-bottom: 22rpx; }
.form-label { display: block; font-size: 27rpx; color: #666; margin-bottom: 10rpx; font-weight: 500; }
.form-input { width: 100%; height: 84rpx; background: #f8f9fa; border-radius: 14rpx; padding: 0 24rpx; font-size: 28rpx; box-sizing: border-box; border: 2rpx solid transparent; }
.form-input:focus { border-color: #667eea; background: #fff; }
.form-textarea { width: 100%; height: 160rpx; background: #f8f9fa; border-radius: 14rpx; padding: 20rpx 24rpx; font-size: 28rpx; box-sizing: border-box; border: 2rpx solid transparent; }
.form-switch { margin-top: 8rpx; }
.switch-track { width: 100rpx; height: 56rpx; background: #ddd; border-radius: 28rpx; padding: 4rpx; transition: background 0.3s; }
.switch-track.active { background: linear-gradient(135deg, #667eea, #764ba2); }
.switch-thumb { width: 48rpx; height: 48rpx; background: #fff; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15); }
.switch-track.active .switch-thumb { transform: translateX(44rpx); }

.form-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 84rpx;
  background: #f8f9fa;
  border-radius: 14rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}
.picker-value { color: #333; }
.picker-arrow { color: #bbb; font-size: 36rpx; }

.level-picker-modal { max-height: 70vh; }
.picker-body { padding: 10rpx 0; max-height: 50vh; overflow-y: auto; }
.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  font-size: 29rpx;
  color: #333;
}
.picker-item:active { background: #f5f6fa; }
.picker-item-text { flex: 1; }
.picker-check { width: 28rpx; height: 28rpx; }
.search-bar.small { margin: 0 0 24rpx 0; }
.moderator-modal { max-height: 70vh; }
.moderator-list { max-height: 40vh; overflow-y: auto; }
.moderator-item { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #f0f1f6; }
.moderator-item:last-child { border-bottom: none; }
.moderator-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; border: 2rpx solid #f0edff; }
.moderator-info { flex: 1; margin-left: 14rpx; }
.moderator-name { display: block; font-size: 27rpx; color: #222; font-weight: 500; }
.moderator-uid { display: block; font-size: 23rpx; color: #bbb; margin-top: 4rpx; }
.moderator-action { margin-left: auto; }

/* 图片上传 */
.upload-btn {
  padding: 0 24rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-radius: 12rpx;
  font-size: 25rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.image-preview {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}
.preview-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  border: 1rpx solid #e5e7eb;
}
</style>
