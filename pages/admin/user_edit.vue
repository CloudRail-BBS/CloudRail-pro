<template>
  <view class="user-edit-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="nav-title">{{ isEdit ? '编辑用户' : '新建用户' }}</view>
      </view>
    </view>

    <scroll-view class="main-scroll" scroll-y>
      <view class="nav-placeholder" :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

      <view class="user-header" v-if="userInfo">
        <view class="avatar-wrapper">
          <image class="user-avatar" :src="userInfo.avatar || '/static/icon/default_avatar.png'" mode="aspectFill" />
          <view class="user-badge" v-if="userInfo.is_admin === 1">管理员</view>
          <view class="user-badge reviewer" v-if="userInfo.is_reviewer === 1">审核员</view>
        </view>
        <view class="user-info">
          <text class="user-name">{{ userInfo.username || '未设置' }}</text>
          <text class="user-id">ID: {{ userInfo.id }}</text>
        </view>
      </view>

      <view class="form-card">
        <view class="card-section">
          <view class="section-title">权限设置</view>
          <view class="permission-warning">
            <image class="warning-icon-img" src="/static/icon/admin-alert-triangle-e67e22.svg" mode="aspectFit" />
            <text class="warning-text">禁止随意改动，日志检测，查到永久封禁账户</text>
          </view>
          
          <view class="form-item-row-4">
            <view class="form-item-quarter">
              <text class="form-label">审核员</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.is_reviewer === 1" @change="toggleReviewer" />
              </view>
            </view>
            <view class="form-item-quarter">
              <text class="form-label">VIP</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.vip === 1" @change="toggleVIP" />
              </view>
            </view>
            <view class="form-item-quarter">
              <text class="form-label">正常状态</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.status === 1" @change="toggleStatus" />
              </view>
            </view>
            <view class="form-item-quarter">
              <text class="form-label">允许登录</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.can_login === 1" @change="toggleCanLogin" />
              </view>
            </view>
          </view>

          <view class="form-item-row-4">
            <view class="form-item-quarter">
              <text class="form-label">允许发帖</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.can_post === 1" @change="toggleCanPost" />
              </view>
            </view>
            <view class="form-item-quarter">
              <text class="form-label">允许评论</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.can_comment === 1" @change="toggleCanComment" />
              </view>
            </view>
            <view class="form-item-quarter">
              <text class="form-label">允许私信</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.can_message === 1" @change="toggleCanMessage" />
              </view>
            </view>
            <view class="form-item-quarter">
              <text class="form-label">允许发视频</text>
              <view class="switch-wrapper">
                <switch class="form-switch" :checked="userForm.can_video === 1" @change="toggleCanVideo" />
              </view>
            </view>
          </view>
        </view>

        <view class="card-section">
          <view class="section-title">用户信息</view>
          
          <view class="form-item-row-2">
            <view class="form-item-half">
              <text class="form-label">用户名 *</text>
              <input class="form-input" v-model="userForm.username" placeholder="请输入用户名" />
            </view>
            <view class="form-item-half">
              <text class="form-label">昵称</text>
              <input class="form-input" v-model="userForm.nickname" placeholder="请输入昵称" />
            </view>
          </view>

          <view class="form-item-row-2">
            <view class="form-item-half">
              <text class="form-label">邮箱</text>
              <input class="form-input" type="email" v-model="userForm.email" placeholder="请输入邮箱" />
            </view>
            <view class="form-item-half">
              <text class="form-label">手机号</text>
              <input class="form-input" type="number" v-model="userForm.phone" placeholder="请输入手机号" />
            </view>
          </view>

          <view class="form-item-row-2">
            <view class="form-item-half">
              <text class="form-label">等级</text>
              <input class="form-input" type="number" v-model="userForm.lv" placeholder="请输入等级" />
            </view>
            <view class="form-item-half">
              <text class="form-label">经验值</text>
              <input class="form-input" type="number" v-model="userForm.exp" placeholder="请输入经验值" />
            </view>
          </view>

          <view class="form-item-row-2">
            <view class="form-item-half">
              <text class="form-label">头衔</text>
              <input class="form-input" v-model="userForm.user_title" placeholder="请输入头衔" />
            </view>
            <view class="form-item-half">
              <text class="form-label">操作</text>
              <view class="reset-password-btn" @click="resetPassword">重置密码</view>
            </view>
          </view>
        </view>
      </view>

      <view class="save-btn-wrapper">
        <view class="save-btn" @click="saveUser">保存</view>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner white" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>

    <view class="action-modal" v-if="showBanModal">
      <view class="modal-mask" @click="closeBanModal"></view>
      <view class="modal-content" @click.stop>
        <view class="modal-title">封禁用户</view>
        <view class="modal-body">
          <view class="modal-input-row">
            <text class="input-label">封禁原因</text>
            <textarea class="modal-textarea" v-model="banReason" placeholder="请输入封禁原因，如：发布违规内容"></textarea>
          </view>
          <view class="ban-tip">
            <text>封禁后用户将无法登录，封禁时长为永久</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeBanModal">取消</view>
          <view class="modal-btn confirm danger" @click="confirmBan">确认封禁</view>
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
      isEdit: false,
      userId: 0,
      userInfo: null,
      userForm: {
        username: '',
        nickname: '',
        email: '',
        phone: '',
        is_admin: 0,
        is_reviewer: 0,
        vip: 0,
        status: 1,
        can_post: 1,
        can_comment: 1,
        can_message: 1,
        can_login: 1,
        can_video: 0,
        jifen: 0,
        lv: 0,
        exp: 0,
        balance: '0.00',
        user_title: ''
      },
      hud: { show: false, type: 'loading', text: '' },
      showBanModal: false,
      banDays: 7,
      banReason: '',
      banDaysOptions: [
        { value: 1, label: '1天' },
        { value: 3, label: '3天' },
        { value: 7, label: '7天' },
        { value: 15, label: '15天' },
        { value: 30, label: '30天' },
        { value: -1, label: '永久' }
      ]
    };
  },
  onLoad(options) {
    const metrics = getScreenMetrics();
    this.statusBarHeight = metrics.statusBarHeight;
    
    if (options && options.id) {
      this.isEdit = true;
      this.userId = parseInt(options.id);
      this.loadUserDetail();
    }
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    async loadUserDetail() {
      this.showHud('loading', '加载中...');
      try {
        const res = await request('users.php', { action: 'get_user_detail', id: this.userId }, { baseURL: bmsBaseUrl, method: 'GET' });
        if (res.status === 'success' && res.data) {
          const user = res.data;
          this.userInfo = user;
          this.userForm.username = user.username || '';
          this.userForm.nickname = user.nickname || user.name || '';
          this.userForm.email = user.email || '';
          this.userForm.phone = user.phone || '';
          this.userForm.is_admin = user.is_admin || 0;
          this.userForm.is_reviewer = user.is_reviewer || 0;
          this.userForm.vip = user.vip || 0;
          this.userForm.status = user.status || 1;
          this.userForm.can_post = user.can_post || 1;
          this.userForm.can_comment = user.can_comment || 1;
          this.userForm.can_message = user.can_message || 1;
          this.userForm.can_login = user.can_login || 1;
          this.userForm.can_video = user.can_video || 0;
          this.userForm.jifen = user.jifen || 0;
          this.userForm.lv = user.lv || 0;
          this.userForm.exp = user.exp || 0;
          this.userForm.balance = user.balance || '0.00';
          this.userForm.user_title = user.user_title || '';
        }
      } catch (e) {
      }
      this.hud.show = false;
    },
    toggleAdmin(e) {
      this.userForm.is_admin = e.detail.value ? 1 : 0;
    },
    toggleReviewer(e) {
      this.userForm.is_reviewer = e.detail.value ? 1 : 0;
    },
    toggleVIP(e) {
      this.userForm.vip = e.detail.value ? 1 : 0;
    },
    toggleCanPost(e) {
      this.userForm.can_post = e.detail.value ? 1 : 0;
    },
    toggleCanComment(e) {
      this.userForm.can_comment = e.detail.value ? 1 : 0;
    },
    toggleCanMessage(e) {
      this.userForm.can_message = e.detail.value ? 1 : 0;
    },
    toggleCanLogin(e) {
      this.userForm.can_login = e.detail.value ? 1 : 0;
    },
    toggleCanVideo(e) {
      this.userForm.can_video = e.detail.value ? 1 : 0;
    },
    toggleStatus(e) {
      const newValue = e.detail.value ? 1 : 0;
      if (newValue === 0) {
        this.showBanModal = true;
      } else {
        this.userForm.status = 1;
      }
    },
    closeBanModal() {
      this.showBanModal = false;
      this.banDays = 7;
      this.banReason = '';
      this.userForm.status = 1;
    },
    confirmBan() {
      this.userForm.status = 0;
      this.closeBanModal();
      uni.showToast({ title: '已标记为封禁', icon: 'none' });
    },
    async resetPassword() {
      uni.showModal({
        title: '重置密码',
        content: '确定要将该用户的密码重置为 123456 吗？',
        success: async (res) => {
          if (res.confirm) {
            this.showHud('loading', '重置中...');
            try {
              const result = await request('users.php', {
                action: 'reset_password',
                uid: this.userId
              }, { baseURL: bmsBaseUrl });
              
              if (result.status === 'success') {
                uni.showToast({ title: '密码已重置为 123456', icon: 'success' });
              } else {
                uni.showToast({ title: result?.msg || '重置失败', icon: 'none' });
              }
            } catch (e) {
              uni.showToast({ title: '重置失败', icon: 'none' });
            }
            this.hud.show = false;
          }
        }
      });
    },
    async saveUser() {
      if (!this.userForm.username.trim()) {
        uni.showToast({ title: '请输入用户名', icon: 'none' });
        return;
      }

      this.showHud('loading', '保存中...');
      
      try {
        let banExpireTime = null;
        let banReason = '';
        
        if (this.userForm.status === 0) {
          banExpireTime = '9999-12-31 23:59:59';
          banReason = this.banReason;
        }
        
        const data = {
          action: 'update_user_full',
          id: this.userId,
          username: this.userForm.username,
          name: this.userForm.nickname,
          email: this.userForm.email,
          phone: this.userForm.phone,
          is_admin: this.userForm.is_admin,
          is_reviewer: this.userForm.is_reviewer,
          vip: this.userForm.vip,
          status: this.userForm.status,
          can_post: this.userForm.can_post,
          can_comment: this.userForm.can_comment,
          can_message: this.userForm.can_message,
          can_login: this.userForm.status === 0 ? 0 : this.userForm.can_login,
          can_video: this.userForm.can_video,
          jifen: parseInt(this.userForm.jifen) || 0,
          lv: parseInt(this.userForm.lv) || 0,
          exp: parseInt(this.userForm.exp) || 0,
          balance: parseFloat(this.userForm.balance) || 0,
          user_title: this.userForm.user_title,
          ban_expire_time: banExpireTime,
          ban_reason: banReason
        };
        
        const res = await request('users.php', data, { baseURL: bmsBaseUrl });
        
        if (res.status === 'success') {
          uni.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } else {
          uni.showToast({ title: res?.msg || '保存失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '保存失败', icon: 'none' });
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
.user-edit-page { min-height: 100vh; background: #f0f1f6; }

/* 导航栏 */
.nav-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #fff; border-bottom: 1rpx solid #eee; }
.nav-content { position: relative; height: 44px; display: flex; align-items: center; justify-content: center; padding: 0 28rpx; }
.nav-back { position: absolute; left: 20rpx; width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.nav-back:active { background: rgba(0,0,0,0.05); }
.back-icon { font-size: 40rpx; color: #333; font-weight: bold; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #333; letter-spacing: 2rpx; }

.main-scroll { height: 100vh; }
.nav-placeholder { background: #fff; }

/* 用户头部 */
.user-header { margin: 24rpx; background: #fff; border-radius: 22rpx; padding: 28rpx; display: flex; align-items: center; gap: 22rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.05); }
.avatar-wrapper { position: relative; }
.user-avatar { width: 110rpx; height: 110rpx; border-radius: 50%; border: 3rpx solid #f0edff; }
.user-badge { position: absolute; top: -6rpx; right: -6rpx; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 19rpx; padding: 4rpx 11rpx; border-radius: 14rpx; font-weight: 500; }
.user-badge.reviewer { background: linear-gradient(135deg, #e67e22, #f39c12); }
.user-info { flex: 1; }
.user-name { display: block; font-size: 32rpx; font-weight: 600; color: #222; }
.user-id { font-size: 23rpx; color: #bbb; }

/* 保存按钮 */
.save-btn-wrapper { display: flex; justify-content: center; margin: 0 24rpx 24rpx; }
.save-btn { 
  width: 100%; height: 96rpx; background: linear-gradient(135deg, #667eea, #764ba2); 
  border-radius: 48rpx; display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; font-weight: 700; color: #fff;
  box-shadow: 0 8rpx 32rpx rgba(102,126,234,0.4);
}
.save-btn:active { transform: scale(0.98); opacity: 0.9; }

/* 表单卡片 */
.form-card { margin: 24rpx; }
.card-section { background: #fff; border-radius: 22rpx; padding: 22rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 20rpx rgba(102,126,234,0.04); }
.section-title { font-size: 27rpx; font-weight: 600; color: #667eea; margin-bottom: 20rpx; padding-left: 14rpx; border-left: 5rpx solid #667eea; }

.level-info-card { background: linear-gradient(135deg, #f0edff 0%, #ffffff 100%); }
.level-info-content { padding: 14rpx 0; }
.level-info-row { display: flex; align-items: center; justify-content: center; gap: 22rpx; }
.level-info-label { font-size: 30rpx; font-weight: 600; color: #667eea; }
.level-info-value { font-size: 27rpx; color: #888; }

.form-item { margin-bottom: 24rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-item-row { display: flex; gap: 20rpx; }
.form-item-row-2 { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.form-item-row-2:last-child { margin-bottom: 0; }
.form-item-half { flex: 1; }
.reset-password-btn {
  display: flex; align-items: center; justify-content: center;
  height: 84rpx; background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; font-size: 26rpx; font-weight: 600;
  border-radius: 14rpx; letter-spacing: 2rpx;
  box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.3);
}
.form-item-row-4 { display: flex; gap: 14rpx; margin-bottom: 24rpx; }
.form-item-row-4:last-child { margin-bottom: 0; }
.form-item-quarter { flex: 1; }
.status-option-small { padding: 7rpx 14rpx; border-radius: 10rpx; font-size: 22rpx; border: 2rpx solid #eee; }

.form-label { display: block; font-size: 27rpx; font-weight: 600; color: #555; margin-bottom: 10rpx; }
.form-input { width: 100%; height: 84rpx; background: #fff; border-radius: 14rpx; padding: 0 22rpx; font-size: 27rpx; border: 2rpx solid #eee; box-sizing: border-box; }
.form-input:focus { border-color: #667eea; background: #fafbff; }

.switch-wrapper { display: flex; align-items: center; gap: 14rpx; }
.form-switch { transform: scale(0.82); }
.switch-desc { font-size: 23rpx; color: #bbb; }

.status-options { display: flex; gap: 14rpx; }
.status-option { flex: 1; padding: 18rpx; text-align: center; background: #f8f9fa; border-radius: 14rpx; font-size: 26rpx; color: #888; border: 2rpx solid transparent; }
.status-option.active { background: #f0edff; border-color: #667eea; color: #667eea; font-weight: 500; }
.status-option.danger.active { background: #fce8ec; border-color: #e74c3c; color: #e74c3c; }

.footer-space { height: 56rpx; }

.hud-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4rpx); }
.hud-toast { background: rgba(0,0,0,0.78); padding: 30rpx 44rpx; border-radius: 18rpx; color: #fff; font-size: 27rpx; display: flex; align-items: center; gap: 14rpx; }

.permission-warning {
  display: flex; align-items: center; gap: 12rpx;
  padding: 20rpx 24rpx; background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  border-radius: 14rpx; margin-bottom: 24rpx;
  border-left: 6rpx solid #e67e22;
}
.warning-icon-img { width: 56rpx; height: 56rpx; display: block; }
.warning-text { font-size: 25rpx; color: #856404; font-weight: 600; }
</style>