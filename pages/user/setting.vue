<template>
  <view class="setting-page" :class="themeClass">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @click="goBack">
        <image src="/static/icon/arrow-left-dark.svg" class="back-arrow" mode="aspectFit"></image>
      </view>
      <text class="nav-title">设置</text>
      <view class="nav-right"></view>
    </view>
    <view class="content" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <view class="group-title">账号资料</view>
      <view class="cell-group">
        <view class="cell-item" @click="openNameModal">
          <text class="cell-label">修改昵称</text>
          <view class="cell-right">
            <text class="cell-val">{{ userInfo.name || userInfo.nickname || userInfo.username }}</text>
            <text class="arrow">></text>
          </view>
        </view>
        <view class="cell-item" @click="openGenderModal">
          <text class="cell-label">性别</text>
          <view class="cell-right">
            <text class="cell-val">{{ genderLabel }}</text>
            <text class="arrow">></text>
          </view>
        </view>
      </view>

      <view class="group-title">账号安全</view>
      <view class="cell-group">
        <view class="cell-item" @click="toBindPhone">
          <text class="cell-label">手机号</text>
          <view class="cell-right">
            <text class="cell-val">{{ security.has_phone ? security.phone_masked : '未绑定' }}</text>
            <text class="arrow">></text>
          </view>
        </view>
        <view class="cell-item" @click="toBindEmail">
          <text class="cell-label">邮箱</text>
          <view class="cell-right">
            <text class="cell-val">{{ security.has_email ? security.email_masked : '未绑定' }}</text>
            <text class="arrow">></text>
          </view>
        </view>
        <view class="cell-item" @click="handleWxBind">
          <text class="cell-label">微信</text>
          <view class="cell-right">
            <text class="cell-val" :class="{ 'status-bind': security.has_wx }">
                {{ security.has_wx ? '已绑定' : '未绑定' }}
            </text>
            <text class="arrow">></text>
          </view>
        </view>
        <view class="cell-item" @click="handleQQBind">
          <text class="cell-label">QQ</text>
          <view class="cell-right">
            <text class="cell-val" :class="{ 'status-bind': security.has_qq }">
                {{ security.has_qq ? '已绑定' : '未绑定' }}
            </text>
            <text class="arrow">></text>
          </view>
        </view>
        <view class="cell-item" @click="toPwd">
          <view class="label-box">
            <text class="cell-label">{{ isSocialUserNoPwd ? '设置初始密码' : '修改/找回密码' }}</text>
            <text class="cell-desc" v-if="isSocialUserNoPwd">当前为快捷登录账号，建议设置密码以便独立登录</text>
          </view>
          <view class="cell-right"><text class="arrow">></text></view>
        </view>
        <view class="cell-item" @click="toPayPassword">
          <text class="cell-label">支付密码</text>
          <view class="cell-right">
            <text class="cell-val">{{ security.has_pay_password ? '已设置' : '未设置' }}</text>
            <text class="arrow">></text>
          </view>
        </view>
      </view>

      <view class="group-title">外观</view>
      <view class="cell-group appearance-group">
        <view
          v-for="option in themeOptions"
          :key="option.value"
          class="cell-item theme-option"
          :class="{ active: themeState.mode === option.value }"
          hover-class="theme-option-hover"
          @click="chooseTheme(option.value)"
        >
          <view class="theme-option-copy">
            <text class="cell-label">{{ option.label }}</text>
            <text class="cell-desc neutral">{{ option.description }}</text>
          </view>
          <view class="theme-option-indicator" :class="{ checked: themeState.mode === option.value }">
            <text v-if="themeState.mode === option.value" class="theme-option-check">✓</text>
          </view>
        </view>
      </view>

      <view class="group-title">我的资产</view>
      <view class="cell-group">
        <view class="cell-item" @click="topay">
          <text class="cell-label">我的钱包</text>
          <view class="cell-right"><text class="arrow">></text></view>
        </view>
        <view class="cell-item" @click="toorder">
          <text class="cell-label">我的订单</text>
          <view class="cell-right"><text class="arrow">></text></view>
        </view>
        <view class="cell-item" @click="toqpsc">
          <text class="cell-label">气泡商城</text>
          <view class="cell-right"><text class="arrow">></text></view>
        </view>
      </view>

      <view class="group-title">隐私设置</view>
      <view class="cell-group">
        <view class="cell-item">
          <view class="label-box">
            <text class="cell-label">私密账号</text>
            <text class="cell-desc">私密模式他人无法查看你的帖子及私信等...</text>
          </view>
          <switch :checked="isPrivate" color="#ff2442" style="transform:scale(0.8)" @change="togglePrivate" />
        </view>
        <view class="cell-item">
          <view class="label-box">
            <text class="cell-label">关闭评论区</text>
            <text class="cell-desc">所有帖子禁止他人新评论</text>
          </view>
          <switch :checked="closeComment" color="#ff2442" style="transform:scale(0.8)" @change="toggleComment" />
        </view>
      </view>

      <view class="group-title">通知设置</view>
      <view class="cell-group">
        <view class="cell-item">
          <view class="label-box">
            <text class="cell-label">评论通知邮件</text>
            <text class="cell-desc">收到评论或回复时发送邮件提醒</text>
          </view>
          <switch :checked="notifyComment" color="#ff2442" style="transform:scale(0.8)" @change="e => toggleNotify('notify_comment', e.detail.value, 'notifyComment')" />
        </view>
        <view class="cell-item">
          <view class="label-box">
            <text class="cell-label">点赞通知邮件</text>
            <text class="cell-desc">收到点赞时发送邮件提醒</text>
          </view>
          <switch :checked="notifyLike" color="#ff2442" style="transform:scale(0.8)" @change="e => toggleNotify('notify_like', e.detail.value, 'notifyLike')" />
        </view>
        <view class="cell-item">
          <view class="label-box">
            <text class="cell-label">私信通知邮件</text>
            <text class="cell-desc">收到私信时发送邮件提醒</text>
          </view>
          <switch :checked="notifyMessage" color="#ff2442" style="transform:scale(0.8)" @change="e => toggleNotify('notify_message', e.detail.value, 'notifyMessage')" />
        </view>
      </view>

      <view class="group-title">关于与帮助</view>
      <view class="cell-group">
        <view class="cell-item" @click="toCustomerService">
          <text class="cell-label">联系客服</text>
          <view class="cell-right"><text class="arrow">></text></view>
        </view>
        <view class="cell-item" @click="openAbout">
          <text class="cell-label">关于我们</text>
          <view class="cell-right"><text class="arrow">></text></view>
        </view>
      </view>

      <view class="group-title">账号管理</view>
      <view class="cell-group">
        <view class="cell-item" @click="toCancellation">
          <text class="cell-label" style="color:#ff2442">注销账号</text>
          <view class="cell-right"><text class="arrow">></text></view>
        </view>
      </view>

      <view class="switch-btn" hover-class="btn-hover" @click="openSwitchModal">切换账号</view>
      <view class="logout-btn" hover-class="btn-hover" @click="askLogout">退出登录</view>
      <view class="safe-bottom"></view>
    </view>

    <view class="modal-mask" :class="{show: showUnbindModal}" v-if="showUnbindModal" @click="showUnbindModal=false">
        <view class="modal-box" @click.stop>
            <view class="modal-title">解绑{{ unbindType === 'qq' ? 'QQ' : '微信' }}</view>
            <view class="modal-content">解绑后将无法使用{{ unbindType === 'qq' ? 'QQ' : '微信' }}快捷登录。确定要解绑吗？</view>
            <view class="modal-btns">
                <view class="m-btn cancel" hover-class="m-btn-hover" @click="showUnbindModal=false">取消</view>
                <view class="m-btn confirm" hover-class="m-btn-hover" @click="confirmUnbind">确定解绑</view>
            </view>
        </view>
    </view>

    <view class="modal-mask" :class="{ show: showNameModal }" v-if="showNameModal" @click="closeNameModal">
      <view class="modal-box" @click.stop>
        <view class="modal-title">修改昵称</view>
        <view class="modal-content">昵称将展示给其他用户（不影响登录账号）</view>
        <view class="modal-input-area">
          <input class="modal-input" type="text" v-model="editingName" maxlength="12" placeholder="请输入新昵称" :cursor-spacing="140" />
        </view>
        <view class="modal-btns">
          <view class="m-btn cancel" hover-class="m-btn-hover" @click="closeNameModal">取消</view>
          <view class="m-btn confirm" hover-class="m-btn-hover" @click="confirmName">保存</view>
        </view>
      </view>
    </view>

    <view class="modal-mask" :class="{ show: showGenderModal }" v-if="showGenderModal" @click="closeGenderModal">
      <view class="modal-box" @click.stop>
        <view class="modal-title">选择性别</view>
        <view class="modal-content">性别将用于群聊成员统计（女生/男生人数占比）</view>
        <view class="gender-list">
          <view class="gender-option" :class="{ active: Number(userInfo.gender) === 0 }" @click="saveGender(0)">
            <view class="gender-option-left">
              <image class="gender-icon-img" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPHJlY3QgeD0iNCIgeT0iMTAiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMSIgcng9IjIiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CiAgPHBhdGggZD0iTTggMTBWN0M4IDQuNzkgOS43OSAzIDEyIDNDMTQuMjEgMyAxNiA0Ljc5IDE2IDdWMTAiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+" mode="aspectFit"></image>
              <text class="gender-option-text">保密</text>
            </view>
            <text class="gender-check" v-if="Number(userInfo.gender) === 0">✓</text>
          </view>
          <view class="gender-option" :class="{ active: Number(userInfo.gender) === 1 }" @click="saveGender(1)">
            <view class="gender-option-left">
              <image class="gender-icon-img" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTAiIGN5PSIxNCIgcj0iNSIgc3Ryb2tlPSIjNEE5MEQ5IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8cGF0aCBkPSJNMTQgMTBMMjAgNE0yMCA0SDE1TTIwIDRWOSIgc3Ryb2tlPSIjNEE5MEQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=" mode="aspectFit"></image>
              <text class="gender-option-text">男</text>
            </view>
            <text class="gender-check" v-if="Number(userInfo.gender) === 1">✓</text>
          </view>
          <view class="gender-option" :class="{ active: Number(userInfo.gender) === 2 }" @click="saveGender(2)">
            <view class="gender-option-left">
              <image class="gender-icon-img" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSI5IiByPSI1IiBzdHJva2U9IiNFODRBN0YiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0xMiAxNFYyME05IDE3SDE1IiBzdHJva2U9IiNFODRBN0YiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg==" mode="aspectFit"></image>
              <text class="gender-option-text">女</text>
            </view>
            <text class="gender-check" v-if="Number(userInfo.gender) === 2">✓</text>
          </view>
          <view class="gender-option" :class="{ active: Number(userInfo.gender) === 3 }" @click="saveGender(3)">
            <view class="gender-option-left">
              <image class="gender-icon-img" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTAiIGN5PSIxNCIgcj0iNSIgc3Ryb2tlPSIjOUI1OUI2IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8cGF0aCBkPSJNMTQgMTBMMjAgNE0yMCA0SDE1TTIwIDRWOSIgc3Ryb2tlPSIjOUI1OUI2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik0xMCAxOVYyMk03IDIwLjVIMTMiIHN0cm9rZT0iIzlCNTlCNiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+" mode="aspectFit"></image>
              <text class="gender-option-text">男跨女 <text class="gender-option-sub">MTF</text></text>
            </view>
            <text class="gender-check" v-if="Number(userInfo.gender) === 3">✓</text>
          </view>
          <view class="gender-option" :class="{ active: Number(userInfo.gender) === 4 }" @click="saveGender(4)">
            <view class="gender-option-left">
              <image class="gender-icon-img" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSI5IiByPSI1IiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0xMiAxNFYyME05IDE3SDE1IiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHBhdGggZD0iTTE3IDZMMjIgMU0yMiAxSDE3TTIyIDFWNiIgc3Ryb2tlPSIjRTY3RTIyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=" mode="aspectFit"></image>
              <text class="gender-option-text">女跨男 <text class="gender-option-sub">FTM</text></text>
            </view>
            <text class="gender-check" v-if="Number(userInfo.gender) === 4">✓</text>
          </view>
          <view class="gender-option" :class="{ active: Number(userInfo.gender) === 5 }" @click="saveGender(5)">
            <view class="gender-option-left">
              <image class="gender-icon-img" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIgc3Ryb2tlPSIjMUFCQzlDIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiBmaWxsPSIjMUFCQzlDIi8+Cjwvc3ZnPg==" mode="aspectFit"></image>
              <text class="gender-option-text">其他</text>
            </view>
            <text class="gender-check" v-if="Number(userInfo.gender) === 5">✓</text>
          </view>
        </view>
        <view class="modal-btns">
          <view class="m-btn cancel" hover-class="m-btn-hover" @click="closeGenderModal">关闭</view>
        </view>
      </view>
    </view>

    <view class="modal-mask" :class="{ show: showAboutModal }" v-if="showAboutModal" @click="closeAbout">
      <view class="modal-box modal-box-about" @click.stop>
        <view class="modal-title">关于我们</view>
        <scroll-view scroll-y class="about-scroll">
          <view v-if="aboutLoading" class="about-loading">
            <view class="ios-spinner"></view>
            <text class="about-loading-text">加载中...</text>
          </view>
          <view v-else-if="aboutContent" class="about-content">{{ aboutContent }}</view>
          <view v-else class="about-content about-empty">暂无内容</view>
        </scroll-view>
        <view class="modal-btns">
          <view class="m-btn confirm" hover-class="m-btn-hover" @click="closeAbout" style="flex:1;">关闭</view>
        </view>
      </view>
    </view>

    <view class="modal-mask" :class="{ show: showLogoutModal }" v-if="showLogoutModal" @click="showLogoutModal = false">
      <view class="modal-box" @click.stop>
        <view class="modal-title">提示</view>
        <view class="modal-content">确定要退出当前登录账号吗？</view>
        <view class="modal-btns">
          <view class="m-btn cancel" hover-class="m-btn-hover" @click="showLogoutModal = false">取消</view>
          <view class="m-btn confirm" hover-class="m-btn-hover" @click="confirmLogout">确定</view>
        </view>
      </view>
    </view>

        <view class="modal-mask" :class="{show: showSwitchModal}" v-if="showSwitchModal" @click="closeSwitchModal">
      <view class="modal-box switch-box" @click.stop>
        <view class="modal-title">切换账号</view>
        <scroll-view scroll-y class="switch-list">
          <view class="switch-item" v-for="(a,i) in accounts" :key="a.uid" @click="doSwitch(a)">
            <image class="switch-avatar" :src="a.avatar || '/static/logo.png'" mode="aspectFill"></image>
            <view class="switch-info">
              <text class="switch-name">{{ a.name }}</text>
              <text class="switch-uid">ID: {{ a.uid }}</text>
            </view>
            <text v-if="currentUid === a.uid" class="switch-current">当前</text>
            <view v-else class="switch-del" @click.stop="delAccount(a.uid)">删除</view>
          </view>
        </scroll-view>
        <view class="modal-btns">
          <view class="m-btn cancel" hover-class="m-btn-hover" @click="closeSwitchModal">取消</view>
          <view class="m-btn confirm" hover-class="m-btn-hover" @click="addAccount">添加账号</view>
        </view>
      </view>
    </view>
<view class="ios-hud-mask" v-if="hud.show" @click="hideHud()">
      <view class="ios-hud-box">
        <view v-if="hud.type === 'loading'" class="ios-spinner"></view>
        <view v-if="hud.type === 'success'" class="ios-success-icon"><view class="ios-checkmark"></view></view>
        <view v-if="hud.type === 'error'" class="ios-error-icon"><view class="ios-error-mark"></view></view>
        <text class="ios-hud-text">{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request, getKefuUrl } from '../../common/request.js';
import { getAccounts, switchAccount, removeAccount } from '../../common/auth.js';
import { setThemeMode, themeState } from '../../common/theme.js';
export default {
  data() {
    return {
      statusBarHeight: 20,
      userInfo: { id: 0, username: '', name: '', email: '', is_private: 0, close_comment: 0 },
      isPrivate: false,
      closeComment: false,
      notifyComment: true,
      notifyLike: true,
      notifyMessage: true,
      security: {
        has_phone: false, phone_masked: '',
        has_email: false, email_masked: '',
        has_wx: false, has_qq: false,
        has_pay_password: false
      },
      showUnbindModal: false,
      unbindType: '',
      showLogoutModal: false,
      showNameModal: false,
      editingName: '',
      showGenderModal: false,
      hud: { show: false, type: 'loading', text: '' },
      kefuLink: '',
      showAboutModal: false,
      accounts: [],
      showSwitchModal: false,
      aboutContent: '',
      aboutLoading: false,
      themeOptions: [
        { value: 'system', label: '跟随系统', description: '随设备外观自动切换' },
        { value: 'light', label: '浅色', description: '始终使用明亮界面' },
        { value: 'dark', label: '深色', description: '始终使用深色界面' }
      ]
    };
  },
  computed: {
    isSocialUserNoPwd() {
      const s = this.security;
      return (s.has_qq || s.has_wx) && (!s.has_email && !s.has_phone);
    },
    currentUid() {
      const u = uni.getStorageSync('userInfo');
      return u ? String(u.id || u.uid || '') : '';
    },
    /* 性别展示: 0保密 1男 2女 3男跨女 4女跨男 5其他 */
    genderLabel() {
      const g = Number(this.userInfo.gender || 0);
      const labels = { 0: '保密', 1: '男', 2: '女', 3: '男跨女', 4: '女跨男', 5: '其他' };
      return labels[g] || '保密';
    }
  },
  onLoad(opt) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    if (opt.bindSuccess) {
      this.showHud('success', '绑定成功');
      setTimeout(() => {
        this.hideHud();
        this.loadData();
      }, 1500);
    }
    if (opt.bindError) {
      const msg = decodeURIComponent(opt.bindError);
      this.showHud('error', msg || '绑定失败');
      setTimeout(() => this.hideHud(), 2000);
    }
  },
  onShow() {
    if (this.hud.show && this.hud.type === 'loading') this.hideHud();
    this.loadData();
  },
  methods: {
    goBack() { uni.navigateBack(); },
    chooseTheme(mode) {
      if (!['system', 'light', 'dark'].includes(mode)) return;
      setThemeMode(mode);
    },
    // 将QQ头像转换为高清版本
    convertToHighQualityAvatar(avatarUrl) {
      if (!avatarUrl) return avatarUrl;
      // QQ头像URL通常包含大小参数，如 /100 表示100x100像素
      // 替换为大尺寸头像
      return avatarUrl.replace(/\/(\d+)\/?$/, '/400/');
    },
    showHud(type, text) { this.hud = { show: true, type: type || 'loading', text: text || '' }; },
    hideHud(delayMs = 0) { delayMs ? setTimeout(() => (this.hud.show = false), delayMs) : (this.hud.show = false); },
    async loadData() {
      try {
        const uRes = await request('user.php', { action: 'getUserInfo' });
        if (uRes.code === 0) {
          this.userInfo = uRes.data || this.userInfo;
          if (!this.userInfo.name) this.userInfo.name = this.userInfo.username;
          this.isPrivate = (this.userInfo.is_private == 1);
          this.closeComment = (this.userInfo.close_comment == 1);
        }
        const sRes = await request('user.php', { action: 'getAccountSecurity' });
        if (sRes.code === 0) {
          this.security = Object.assign({}, this.security, sRes.data || {});
          this.notifyComment = (sRes.data.notify_comment ?? 1) == 1;
          this.notifyLike    = (sRes.data.notify_like    ?? 1) == 1;
          this.notifyMessage = (sRes.data.notify_message ?? 1) == 1;
        }
      } catch (e) {}
    },
    toBindEmail() { uni.navigateTo({ url: '/pages/user/email' }); },
    toBindPhone() { uni.navigateTo({ url: '/pages/user/phone' }); },
    toPayPassword() { uni.navigateTo({ url: '/pages/user/pay-password' }); },
    topay() { uni.navigateTo({ url: '/pages/user/wallet', fail: () => { this.showHud('error', '跳转失败'); this.hideHud(1000); } }); },
    toorder() { uni.navigateTo({ url: '/pages/market/orders', fail: () => { this.showHud('error', '跳转失败'); this.hideHud(1000); } }); },
    toPwd() { uni.navigateTo({ url: '/pages/forget-pwd/forget-pwd', fail: () => { this.showHud('error', '跳转失败'); this.hideHud(1000); } }); },
    toqpsc() { uni.navigateTo({ url: '/pages/user/bubble', fail: () => { this.showHud('error', '跳转失败'); this.hideHud(1000); } }); },
    handleQQBind() {
      if (this.security.has_qq) this.checkBeforeUnbind('qq');
      else this.doBindQQ();
    },
    handleWxBind() {
      if (this.security.has_wx) this.checkBeforeUnbind('wx');
      else this.doBindWeixin();
    },
    checkBeforeUnbind(type) {
      if (!this.security.has_email && !this.security.has_phone) {
        this.showHud('error', '为确保账号安全，请先绑定手机/邮箱或设置密码');
        return this.hideHud(2000);
      }
      this.unbindType = type;
      this.showUnbindModal = true;
    },
    // 微信绑定（使用uniapp官方API）
    doBindWeixin() {
      // #ifdef APP-PLUS
      this.showHud('loading', '微信授权中...');
      uni.login({
        provider: 'weixin',
        success: (loginRes) => {
          uni.getUserInfo({
            provider: 'weixin',
            success: (infoRes) => {
              this.bindSocial('wx', loginRes.code, infoRes.userInfo);
            },
            fail: () => {
              this.showHud('error', '获取用户信息失败');
              this.hideHud(1500);
            }
          });
        },
        fail: () => {
          this.showHud('error', '微信授权失败');
          this.hideHud(1500);
        }
      });
      // #endif
      // #ifdef H5
      this.doBindSocialH5('wx');
      // #endif
      // #ifdef MP-WEIXIN
      this.showHud('loading', '微信授权中...');
      uni.login({
        provider: 'weixin',
        success: (loginRes) => {
          uni.getUserProfile({
            desc: '用于绑定微信账号',
            success: (infoRes) => {
              this.bindSocial('wx', loginRes.code, infoRes.userInfo);
            },
            fail: () => {
              this.showHud('error', '请授权用户信息');
              this.hideHud(1500);
            }
          });
        },
        fail: () => {
          this.showHud('error', '微信授权失败');
          this.hideHud(1500);
        }
      });
      // #endif
      // #ifdef MP
      this.showHud('error', '小程序暂不支持此操作');
      this.hideHud(1500);
      // #endif
    },
    // QQ绑定（使用uniapp官方API）
    doBindQQ() {
      // #ifdef APP-PLUS
      this.showHud('loading', 'QQ授权中...');
      uni.login({
        provider: 'qq',
        success: (loginRes) => {
          uni.getUserInfo({
            provider: 'qq',
            success: (infoRes) => {
              // 将 openid 合并到 userInfo 中
              const userInfoWithOpenId = {
                ...infoRes.userInfo,
                openid: loginRes.openid || loginRes.openId || '',
                // 处理QQ头像为高清版本
                avatarUrl: this.convertToHighQualityAvatar(infoRes.userInfo.avatarUrl)
              }
              this.bindSocial('qq', loginRes.code, userInfoWithOpenId);
            },
            fail: () => {
              // 如果获取用户信息失败，也尝试用 openid 绑定
              const userInfoWithOpenId = {
                openid: loginRes.openid || loginRes.openId || ''
              }
              this.bindSocial('qq', loginRes.code, userInfoWithOpenId);
            }
          });
        },
        fail: () => {
          this.showHud('error', 'QQ授权失败');
          this.hideHud(1500);
        }
      });
      // #endif
      // #ifdef H5
      this.doBindSocialH5('qq');
      // #endif
      // #ifdef MP
      this.showHud('error', '小程序暂不支持此操作');
      this.hideHud(1500);
      // #endif
    },
    // H5端绑定（跳转到SDK页面）
    async doBindSocialH5(type) {
      this.showHud('loading', '正在唤起...');
      try {
        const res = await request('user.php', { action: 'getBindSocialUrl', type: type });
        if (res.code === 0 && res.data.url) {
          window.location.href = res.data.url;
        } else {
          this.showHud('error', res.msg || '获取链接失败');
          this.hideHud(1500);
        }
      } catch (e) {
        this.showHud('error', '网络错误');
        this.hideHud(1500);
      }
    },
    // 绑定社交账号到当前用户
    async bindSocial(type, code, userInfo) {
      this.showHud('loading', '绑定中...');
      try {
        const res = await request('user.php', {
          action: 'bindSocial',
          type: type,
          code: code,
          userInfo: JSON.stringify(userInfo)
        });
        if (res.code === 0) {
          if (type === 'qq') this.security.has_qq = true;
          if (type === 'wx') this.security.has_wx = true;
          this.showHud('success', '绑定成功');
          this.hideHud(1500);
        } else {
          console.error('绑定失败:', res.msg);
          this.showHud('error', res.msg || '绑定失败');
          this.hideHud(1500);
        }
      } catch (e) {
        console.error('绑定异常:', e);
        // 检查是否是HTTP错误或网络错误
        if (e && e.msg) {
          this.showHud('error', e.msg);
        } else {
          this.showHud('error', '绑定失败，请检查网络后重试');
        }
        this.hideHud(1500);
      }
    },
    async confirmUnbind() {
      this.showUnbindModal = false;
      const type = this.unbindType;
      this.showHud('loading', '解绑中...');
      try {
        const res = await request('user.php', { action: 'unbindSocial', type: type });
        if (res.code === 0) {
          if (type === 'qq') this.security.has_qq = false;
          if (type === 'wx') this.security.has_wx = false;
          this.showHud('success', '已解绑');
          this.hideHud(1500);
        } else {
          this.showHud('error', res.msg || '解绑失败');
          this.hideHud(1500);
        }
      } catch (e) {
        this.showHud('error', '异常');
        this.hideHud(1500);
      }
    },
    async toCustomerService() {
      const link = await getKefuUrl()
      if (!link) {
        this.showHud('error', '客服未配置')
        this.hideHud(1500)
        return
      }
      this.kefuLink = link
      // #ifdef APP-PLUS
      plus.runtime.openURL(link, () => { this.showHud('error', '无法打开链接'); });
      // #endif
      // #ifdef H5
      window.location.href = link;
      // #endif
      // #ifdef MP
      uni.setClipboardData({
        data: link,
        success: () => { this.showHud('success', '链接已复制，请在浏览器打开'); }
      });
      // #endif
    },
    async openAbout() {
      // 已有内容则直接展示，避免重复请求
      if (this.aboutContent) {
        this.showAboutModal = true;
        return;
      }
      this.showAboutModal = true;
      this.aboutLoading = true;
      try {
        const res = await request('post.php?action=get_runtime_config', {}, 'GET');
        if (res.code === 0 && res.data) {
          this.aboutContent = (res.data.about_us || '').trim();
        } else {
          this.aboutContent = '';
        }
      } catch (e) {
        this.aboutContent = '';
      } finally {
        this.aboutLoading = false;
      }
    },
    closeAbout() {
      this.showAboutModal = false;
    },
    openNameModal() { this.editingName = (this.userInfo.name || this.userInfo.username || '').trim(); this.showNameModal = true; },
    /* ===== 性别设置(男/女) ===== */
    openGenderModal() { this.showGenderModal = true; },
    closeGenderModal() { this.showGenderModal = false; },
    async saveGender(g) {
      g = Number(g);
      if (g < 0 || g > 5) return;
      if (g === Number(this.userInfo.gender || 0)) { this.showGenderModal = false; return; }
      this.showHud('loading', '保存中...');
      try {
        const res = await request('user.php', { action: 'update', gender: g });
        if (res.code === 0) {
          this.userInfo.gender = g;
          const localUser = uni.getStorageSync('userInfo') || {};
          localUser.gender = g;
          uni.setStorageSync('userInfo', localUser);
          this.showGenderModal = false;
          this.showHud('success', '修改成功'); this.hideHud(1200);
        } else { this.showHud('error', res.msg || '修改失败'); this.hideHud(1400); }
      } catch (e) { this.showHud('error', '网络异常'); this.hideHud(1400); }
    },
    closeNameModal() { this.showNameModal = false; },
    async confirmName() {
      const newName = (this.editingName || '').trim();
      if (!newName) { this.showHud('error', '昵称不能为空'); return this.hideHud(1200); }
      if (newName.length > 12) { this.showHud('error', '昵称最多12个字'); return this.hideHud(1200); }
      this.showHud('loading', '保存中...');
      try {
        const res = await request('user.php', { action: 'updateNickname', newNickname: newName });
        if (res.code === 0) {
          this.userInfo.name = newName;
          const localUser = uni.getStorageSync('userInfo') || {};
          localUser.name = newName;
          uni.setStorageSync('userInfo', localUser);
          this.showNameModal = false;
          this.showHud('success', '修改成功'); this.hideHud(1200);
        } else { this.showHud('error', res.msg || '修改失败'); this.hideHud(1400); }
      } catch (e) { this.showHud('error', '网络异常'); this.hideHud(1400); }
    },
    async togglePrivate(e) {
      const val = e.detail.value ? 1 : 0; const old = this.isPrivate; this.isPrivate = e.detail.value;
      try {
        const res = await request('user.php', { action: 'update_privacy_setting', key: 'is_private', value: val });
        if (res.code !== 0) { this.isPrivate = old; this.showHud('error', res.msg || '设置失败'); this.hideHud(1200); }
      } catch (e2) { this.isPrivate = old; this.showHud('error', '网络异常'); this.hideHud(1200); }
    },
    async toggleComment(e) {
      const val = e.detail.value ? 1 : 0; const old = this.closeComment; this.closeComment = e.detail.value;
      try {
        const res = await request('user.php', { action: 'update_privacy_setting', key: 'close_comment', value: val });
        if (res.code !== 0) { this.closeComment = old; this.showHud('error', res.msg || '设置失败'); this.hideHud(1200); }
      } catch (e2) { this.closeComment = old; this.showHud('error', '网络异常'); this.hideHud(1200); }
    },
    async toggleNotify(key, newVal, prop) {
      const val = newVal ? 1 : 0; const old = this[prop]; this[prop] = newVal;
      try {
        const res = await request('user.php', { action: 'update_privacy_setting', key, value: val });
        if (res.code !== 0) { this[prop] = old; this.showHud('error', res.msg || '设置失败'); this.hideHud(1200); }
      } catch (e2) { this[prop] = old; this.showHud('error', '网络异常'); this.hideHud(1200); }
    },
    toCancellation() {
      uni.navigateTo({ url: '/pages/user/cancellation' });
    },
    askLogout() { this.showLogoutModal = true; },
    loadAccounts() { this.accounts = getAccounts(); },
    openSwitchModal() { this.loadAccounts(); this.showSwitchModal = true; },
    closeSwitchModal() { this.showSwitchModal = false; },
    async doSwitch(a) {
      if (!a || !a.token) return;
      if (String(a.uid) === this.currentUid) { this.showSwitchModal = false; return; }
      switchAccount(a.uid);
      this.closeSwitchModal();
      this.showHud('loading', '切换中...');
      try {
        const res = await request('user.php', { action: 'getUserInfo' });
        if (res.code === 0) { this.userInfo = res.data || this.userInfo; }
      } catch (e) {}
      this.hideHud();
      this.showHud('success', '已切换'); this.hideHud(500);
      uni.setStorageSync('_forceRefreshHome', '1');
      setTimeout(() => { uni.reLaunch({ url: '/pages/index/index' }); }, 300);
    },
    delAccount(uid) {
      const cur = this.currentUid;
      removeAccount(uid);
      this.accounts = getAccounts();
      if (cur === String(uid)) {
        uni.removeStorageSync('userInfo'); uni.removeStorageSync('token');
        this.showSwitchModal = false;
        this.showHud('success', '已删除当前账号');
        setTimeout(() => { uni.reLaunch({ url: '/pages/login/login' }); }, 600);
      }
    },
    addAccount() { this.closeSwitchModal(); try { uni.setStorageSync('login_add_mode', '1'); } catch (e) {} uni.reLaunch({ url: '/pages/login/login?add=1' }); },
    async confirmLogout() {
      this.showLogoutModal = false;
      try { await request('user.php', { action: 'logout' }); } catch (e) {}
      uni.removeStorageSync('userInfo'); uni.removeStorageSync('token');
      this.showHud('success', '已退出'); this.hideHud(800);
      setTimeout(() => { uni.reLaunch({ url: '/pages/login/login' }); }, 600);
    }
  }
};
</script>

<style scoped>
.setting-page { min-height: 100vh; background: var(--cr-canvas); color: #171717; }
.nav-bar { position: fixed; top: 0; left: 0; width: 100%; height: 44px; background: var(--cr-surface); z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; box-sizing: border-box; border-bottom: 1rpx solid var(--cr-border); }
.nav-left { width: 60rpx; height: 100%; display: flex; align-items: center; }
.back-arrow { width: 24px; height: 24px; }
.nav-title { font-size: 34rpx; font-weight: 600; color: var(--cr-text); letter-spacing: -0.02em; }
.nav-right { width: 60rpx; }
.content { padding: 24rpx 32rpx 0; }
.group-title { font-size: 24rpx; font-weight: 500; color: var(--cr-text-muted); margin: 32rpx 8rpx 14rpx; }
.cell-group { background: var(--cr-surface); border: 1rpx solid #e0e0e0; border-radius: 24rpx; overflow: hidden; }
.cell-item { display: flex; justify-content: space-between; align-items: center; min-height: 88rpx; padding: 24rpx 28rpx; border-bottom: 1rpx solid var(--cr-border); box-sizing: border-box; }
.cell-item:last-child { border-bottom: none; }
.cell-label { font-size: 28rpx; color: var(--cr-text); }
.cell-right { display: flex; align-items: center; color: var(--cr-text-muted); font-size: 26rpx; }
.cell-val { margin-right: 8rpx; color: var(--cr-text-muted); max-width: 360rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.arrow { font-size: 24rpx; color: #a8a8a8; margin-left: 4rpx; }
.label-box { display: flex; flex-direction: column; max-width: 80%; }
.cell-desc { font-size: 24rpx; color: #da2f35; margin-top: 8rpx; line-height: 1.5; }`r`n.cell-desc.neutral { color: var(--cr-text-muted); }
.logout-btn { margin-top: 48rpx; background: var(--cr-surface); border: 1rpx solid #e0e0e0; text-align: center; color: var(--cr-text); font-size: 28rpx; min-height: 88rpx; line-height: 88rpx; border-radius: 24rpx; }

.switch-btn { margin-bottom: 20rpx; background: var(--cr-surface); border: 1rpx solid #e0e0e0; text-align: center; color: var(--cr-text); font-size: 28rpx; min-height: 88rpx; line-height: 88rpx; border-radius: 24rpx; }
.switch-list { max-height: 50vh; }
.switch-item { display: flex; align-items: center; padding: 22rpx 8rpx; border-bottom: 1rpx solid #f5f5f5; }
.switch-avatar { width: 84rpx; height: 84rpx; border-radius: 50%; margin-right: 20rpx; background: var(--cr-surface-alt); }
.switch-info { flex: 1; display: flex; flex-direction: column; }
.switch-name { font-size: 30rpx; color: var(--cr-text); font-weight: 500; }
.switch-uid { font-size: 22rpx; color: var(--cr-text-muted); margin-top: 6rpx; }
.switch-current { font-size: 24rpx; color: #ff2442; font-weight: 600; }
.switch-del { font-size: 24rpx; color: #ff2442; border: 1rpx solid #ff2442; padding: 8rpx 24rpx; border-radius: 26rpx; }
.btn-hover { opacity: 0.8; background-color: var(--cr-surface-alt); }
.safe-bottom { height: calc(24px + env(safe-area-inset-bottom)); }
.status-bind { color: #ff2442 !important; font-weight: 500; }
.modal-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24rpx; box-sizing: border-box; visibility: hidden; opacity: 0; transition: all 0.2s; }
.modal-mask.show { visibility: visible; opacity: 1; }
.modal-box { width: 560rpx; max-width: 92vw; background: var(--cr-surface); color: #171717; border: 1rpx solid var(--cr-border); border-radius: 24rpx; overflow: hidden; transform: scale(0.96); transition: transform 0.2s; max-height: 80vh; display: flex; flex-direction: column; }
.modal-mask.show .modal-box { transform: scale(1); }
.modal-title { text-align: center; font-size: 34rpx; font-weight: 600; color: var(--cr-text); padding: 40rpx 0 10rpx; }
.modal-content { text-align: center; font-size: 26rpx; color: var(--cr-text-muted); padding: 0 40rpx 20rpx; line-height: 1.6; overflow: auto; }
.modal-input-area { padding: 0 40rpx 40rpx; }
/* 性别选择 */
.gender-list { padding: 0 40rpx 40rpx; }
.gender-option { display: flex; align-items: center; justify-content: space-between; height: 96rpx; padding: 0 32rpx; margin-bottom: 20rpx; background: var(--cr-surface-alt); border-radius: 16rpx; border: 2rpx solid transparent; }
.gender-option.active { background: rgba(255, 36, 66, 0.08); border-color: #FF2442; }
.gender-option-left { display: flex; align-items: center; gap: 16rpx; }
.gender-option-text { font-size: 30rpx; color: var(--cr-text); }
.gender-option-sub { font-size: 22rpx; color: var(--cr-text-muted); margin-left: 8rpx; }
.gender-icon-img { width: 48rpx; height: 48rpx; }
.gender-check { font-size: 30rpx; color: #FF2442; font-weight: 600; }
.modal-input { background: var(--cr-surface-alt); height: 88rpx; border-radius: 12rpx; padding: 0 24rpx; font-size: 30rpx; color: var(--cr-text); }
.modal-btns { display: flex; height: 104rpx; border-top: 1rpx solid var(--cr-border); flex-shrink: 0; }
.m-btn { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.m-btn.cancel { color: var(--cr-text-muted); border-right: 1rpx solid #eee; font-weight: 400; }
.m-btn.confirm { color: #ff2442; font-weight: 600; }
.m-btn-hover { background-color: var(--cr-surface-alt); }
/* 关于我们弹窗 */
.modal-box-about { width: 620rpx; }
.about-scroll { max-height: 60vh; padding: 10rpx 40rpx 24rpx; box-sizing: border-box; }
.about-content { font-size: 28rpx; color: #444; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.about-empty { text-align: center; color: var(--cr-text-muted); }
.about-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60rpx 0; }
.about-loading .ios-spinner { width: 48rpx; height: 48rpx; border: 5rpx solid rgba(255,36,66,0.2); border-top-color: #ff2442; }
.about-loading-text { font-size: 26rpx; color: var(--cr-text-muted); margin-top: 16rpx; }
.ios-hud-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; display: flex; align-items: center; justify-content: center; background: transparent; }
.ios-hud-box { min-width: 220rpx; min-height: 220rpx; background: rgba(30, 30, 30, 0.75); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30rpx; }
.ios-hud-text { font-size: 28rpx; color: #fff; margin-top: 24rpx; text-align: center; max-width: 360rpx; line-height: 1.4; }
.ios-spinner { width: 60rpx; height: 60rpx; border: 6rpx solid rgba(255,255,255,0.3); border-top: 6rpx solid #fff; border-radius: 50%; animation: iosRotate 0.8s linear infinite; }
@keyframes iosRotate { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
.ios-success-icon { width: 64rpx; height: 64rpx; position: relative; }
.ios-checkmark { width: 100%; height: 100%; border-radius: 50%; border: 3rpx solid #fff; position: relative; }
.ios-checkmark::after { content: ''; position: absolute; top: 50%; left: 50%; width: 20rpx; height: 36rpx; border-bottom: 5rpx solid #fff; border-right: 5rpx solid #fff; transform: translate(-50%, -60%) rotate(45deg); }
.ios-error-icon { width: 64rpx; height: 64rpx; position: relative; }
.ios-error-mark { width: 100%; height: 100%; border-radius: 50%; border: 3rpx solid #fff; position: relative; }
.ios-error-mark::before, .ios-error-mark::after { content: ''; position: absolute; top: 50%; left: 50%; width: 36rpx; height: 5rpx; background: var(--cr-surface); transform-origin: center; }
.ios-error-mark::before { transform: translate(-50%, -50%) rotate(45deg); }
.ios-error-mark::after { transform: translate(-50%, -50%) rotate(-45deg); }
.theme-option { cursor: pointer; transition: background-color 160ms ease; }
.theme-option-hover { background: var(--cr-surface-alt); }
.theme-option.active { background: var(--cr-surface-alt); }
.theme-option-copy { display: flex; flex-direction: column; min-width: 0; }
.theme-option-indicator { width: 38rpx; height: 38rpx; border: 2rpx solid var(--cr-border-strong); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.theme-option-indicator.checked { background: #000000; border-color: #000000; }
.theme-option-check { color: #ffffff; font-size: 24rpx; line-height: 1; }
.theme-dark.setting-page { background: #0a0a0a; color: #ededed; }
.theme-dark .nav-bar { background: #111111; border-bottom-color: #2e2e2e; }
.theme-dark .nav-title { color: #ededed; }
.theme-dark .group-title { color: #a1a1a1; }
.theme-dark .cell-group { background: #111111; border-color: #2e2e2e; }
.theme-dark .cell-item { border-bottom-color: #2e2e2e; }
.theme-dark .cell-label { color: #ededed; }
.theme-dark .cell-right, .theme-dark .cell-val, .theme-dark .cell-desc.neutral { color: #a1a1a1; }
.theme-dark .cell-desc { color: #ff6166; }
.theme-dark .arrow { color: #707070; }
.theme-dark .theme-option-hover, .theme-dark .theme-option.active { background: #1f1f1f; }
.theme-dark .theme-option-indicator { border-color: #454545; }
.theme-dark .theme-option-indicator.checked { background: var(--cr-surface); border-color: #ffffff; }
.theme-dark .theme-option-check { color: #000000; }
.theme-dark .switch-btn, .theme-dark .logout-btn { background: #111111; border-color: #2e2e2e; color: #ededed; }
.theme-dark .modal-box { background: #111111; color: #ededed; border-color: #2e2e2e; }
.theme-dark .modal-title { color: #ededed; }
.theme-dark .modal-content, .theme-dark .about-content { color: #a1a1a1; }
.theme-dark .modal-input { background: #1a1a1a; color: #ededed; }
.theme-dark .modal-btns, .theme-dark .m-btn.cancel { border-color: #2e2e2e; }
.theme-dark .m-btn.cancel { color: #a1a1a1; }
.theme-dark .gender-option { background: #1a1a1a; }
.theme-dark .gender-option-text { color: #ededed; }
.theme-dark .gender-option-sub { color: #a1a1a1; }
.theme-dark .switch-item { border-bottom-color: #2e2e2e; }
.theme-dark .switch-name { color: #ededed; }
.theme-dark .switch-uid, .theme-dark .about-empty, .theme-dark .about-loading-text { color: #a1a1a1; }
.theme-dark .btn-hover, .theme-dark .m-btn-hover { background-color: #1f1f1f; }</style>