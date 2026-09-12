<template>
  <view class="task-page">
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px', height: navBarHeight + 'px' }">
      <view class="nav-content" :style="{ height: menuButtonHeight + 'px' }">
        <view class="nav-back" @click="goBack">
          <image src="/static/icon/arrow-left-dark.svg" class="back-icon" mode="aspectFit"></image>
        </view>
        <text class="nav-title">任务中心</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="header-container" :style="{ paddingTop: (navTotalHeight + 10) + 'px' }">
      <view class="user-score-card">
        <view class="score-top">
          <view class="avatar-box">
             <image src="/static/icon/task/jf.png" class="score-icon" mode="aspectFit"></image>
          </view>
          <view class="score-info">
             <text class="score-label">当前可用积分</text>
             <text class="score-val">{{ userInfo.jifen || 0 }}</text>
          </view>
          
          <button class="mall-btn" @click="toMall">兑换商城 ></button>
        </view>
        
        <view class="level-area">
           <view class="lv-row">
             <text class="curr-lv">Lv.{{ currentLevel }} <text v-if="isMaxLevel" style="font-size: 20rpx; margin-left: 6rpx; opacity: 0.8;">(MAX)</text></text>
             <text class="next-tips">{{ levelTips }}</text>
           </view>
           <view class="progress-bg">
             <view class="progress-active" :style="{ width: progressPercent + '%' }"></view>
           </view>
        </view>
      </view>
    </view>

    <view class="task-list-wrap">
      <view class="section-head">
        <text class="sect-title">做任务·赢积分</text>
      </view>

      <view class="task-card" :class="{ 'vip-task': item.vip_days > 0 }" v-for="(item, index) in taskList" :key="index">
        <view class="card-icon-area">
          <view class="icon-wrap task-icon" :class="[getTaskIconClass(item.key), { 'vip-icon-wrap': item.vip_days > 0 }]">
            <view class="task-icon-svg">
              <image v-if="item.key === 'daily_sign'" class="task-icon-img" src="/static/icon/calendar-check-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'daily_dynamic'" class="task-icon-img" src="/static/icon/image-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'streak_5_vip'" class="task-icon-img" src="/static/icon/crown-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'bind_email'" class="task-icon-img" src="/static/icon/shield-check-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'daily_post'" class="task-icon-img" src="/static/icon/file-text-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'daily_comment'" class="task-icon-img" src="/static/icon/message-dots-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'daily_like'" class="task-icon-img" src="/static/icon/heart-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'comment_30'" class="task-icon-img" src="/static/icon/award-white.svg" mode="aspectFit" />
              <image v-else-if="item.key === 'streak_10'" class="task-icon-img" src="/static/icon/flame-white.svg" mode="aspectFit" />
              <image v-else class="task-icon-img" src="/static/icon/gift-white.svg" mode="aspectFit" />
            </view>
          </view>
          <view class="vip-badge" v-if="item.vip_days > 0">
            <image class="vip-badge-svg-img" src="/static/icon/crown-white.svg" mode="aspectFit" />
          </view>
        </view>

        <view class="card-info">
          <view class="info-header">
            <text class="t-title">{{ item.title }}</text>
            <view class="vip-tag" v-if="item.vip_days > 0">
                 <text class="vip-tag-text">送{{ item.vip_days }}天VIP</text>
               </view>
          </view>

          <text class="t-desc">{{ item.desc }}</text>

          <view class="info-footer">
            <view class="reward-area">
              <view class="reward-item reward-item-jf" v-if="item.reward.jf > 0">
                <image class="reward-icon-svg-img reward-jf-img" src="/static/icon/gem-blue.svg" mode="aspectFit" />
                <text class="reward-num">{{ item.reward.jf }}</text>
                <text class="reward-unit">积分</text>
              </view>
              <view class="reward-item reward-item-exp" v-if="item.reward.exp > 0">
                <image class="reward-icon-svg-img reward-exp-img" src="/static/icon/star-gold.svg" mode="aspectFit" />
                <text class="reward-num">{{ item.reward.exp }}</text>
                <text class="reward-unit">经验</text>
              </view>
            </view>

            <view class="progress-area" v-if="item.target > 1">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: Math.min((item.current / item.target) * 100, 100) + '%' }"></view>
              </view>
              <text class="progress-text">{{ item.current }}/{{ item.target }}</text>
            </view>
          </view>
        </view>

        <view class="card-action">
          <button
            class="task-btn"
            :class="{
              'btn-todo': item.status == 0,
              'btn-get': item.status == 1,
              'btn-done': item.status == 2,
              'btn-vip': item.vip_days > 0 && item.status == 1
            }"
            @click="handleTask(item)"
          >
            {{ item.btn_text }}
          </button>
        </view>
      </view>

      <view class="empty-state" v-if="taskList.length === 0">
        <image class="empty-icon-svg-img" src="/static/icon/file-lines-gray.svg" mode="aspectFit" />
        <text class="empty-text">暂无任务</text>
      </view>
    </view>

    <view class="modal-mask" :class="{ show: showRewardModal }" @click="showRewardModal=false">
      <view class="modal-body" @click.stop>
        <image class="gift-svg-img" src="/static/icon/gift-red.svg" mode="aspectFit" />
        <text class="m-title">恭喜获得</text>
        <view class="m-rewards">
          <view class="mr-item">
            <image class="mr-icon-svg-img mr-icon-jf-img" src="/static/icon/gem-blue.svg" mode="aspectFit" />
            <text class="mr-num">+{{ rewardInfo.jifen }}</text>
            <text class="mr-lbl">积分</text>
          </view>

          <view class="divider-v" v-if="rewardInfo.exp > 0"></view>
          <view class="mr-item" v-if="rewardInfo.exp > 0">
            <image class="mr-icon-svg-img mr-icon-exp-img" src="/static/icon/star-gold.svg" mode="aspectFit" />
            <text class="mr-num">+{{ rewardInfo.exp }}</text>
            <text class="mr-lbl">经验</text>
          </view>

          <view class="divider-v" v-if="rewardInfo.vip_days > 0"></view>
          <view class="mr-item mr-vip" v-if="rewardInfo.vip_days > 0">
            <image class="mr-icon-svg-img mr-icon-vip-img" src="/static/icon/crown-orange.svg" mode="aspectFit" />
            <text class="mr-num">+{{ rewardInfo.vip_days }}</text>
            <text class="mr-lbl">天VIP</text>
          </view>

        </view>
        <view class="vip-skip-tip" v-if="rewardInfo.vip_skipped">
          <text>您已是永久VIP，本次VIP奖励已自动跳过</text>
        </view>
        <button class="m-btn" @click="showRewardModal=false">开心收下</button>
      </view>
    </view>
    
  </view>
</template>

<script>
import { request } from '../../common/request.js';
import {
  getLevelDisplay,
  getLevelNeedExp,
  getLevelProgressPercent,
  isMaxLevel as checkIsMaxLevel,
  saveLevelConfig
} from '../../common/level.js';

export default {
  data() {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      menuButtonHeight: 32,
      navTotalHeight: 64,

      userInfo: { jifen: 0, lv: 0 },
      taskList: [],
      showRewardModal: false,
      rewardInfo: { jifen: 0, exp: 0, vip_days: 0, vip_skipped: false }
    };
  },
  computed: {
    currentLevel() {
      return getLevelDisplay(this.userInfo.lv);
    },
    isMaxLevel() {
      return checkIsMaxLevel(this.userInfo.lv);
    },

    progressPercent() {
      return getLevelProgressPercent(this.userInfo.exp);
    },
    levelTips() {
      if (this.isMaxLevel) return '已满级';
      return `距升级还需 ${getLevelNeedExp(this.userInfo.exp)} 经验`;
    }
  },
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight;
    // #ifdef MP-WEIXIN
    const menu = uni.getMenuButtonBoundingClientRect();
    this.menuButtonHeight = menu.height;
    this.navBarHeight = (menu.top - this.statusBarHeight) * 2 + this.menuButtonHeight;
    // #endif
    this.navTotalHeight = this.statusBarHeight + this.navBarHeight;
  },
  onShow() {
    this.loadData();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    async loadData() {
      const user = uni.getStorageSync('userInfo');
      if(!user) return this.smartNav('/pages/login/login');
      
      try {
        const res = await request('task.php', { action:'getTaskList', userId:user.id });
        if(res.code===0) {
          this.userInfo = res.data.user;
          this.taskList = res.data.tasks;
          if (res.data.level_config) {
            saveLevelConfig(res.data.level_config);
          }
          const local = uni.getStorageSync('userInfo') || {};
          local.jifen = res.data.user.jifen;
          local.lv = res.data.user.lv;
          uni.setStorageSync('userInfo', local);
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' });
        }
      } catch(e){
        console.error('加载任务失败:', e);
        uni.showToast({ title: '网络请求失败', icon: 'none' });
      }
    },
    smartNav(url) {
      uni.navigateTo({
        url,
        fail: () => {
          uni.reLaunch({ url });
        }
      });
    },

    toMall() {
        this.smartNav('/pages/myTopic/myTopic');
    },

    // 任务图标配色：根据任务key返回对应颜色类
    getTaskIconClass(key) {
      const map = {
        daily_sign: 'ti-blue',
        daily_dynamic: 'ti-purple',
        streak_5_vip: 'ti-gold',
        bind_email: 'ti-cyan',
        daily_post: 'ti-red',
        daily_comment: 'ti-green',
        daily_like: 'ti-pink',
        comment_30: 'ti-orange',
        streak_10: 'ti-fire'
      };
      return map[key] || 'ti-blue';
    },

    async handleTask(item) {
      if(item.status == 0) {
        if(item.key === 'bind_email') {
          this.smartNav('/pages/user/email');
        } else if(item.key === 'daily_post' || item.key === 'streak_10') {
          this.smartNav('/pages/publish/publish');
        } else if(item.key === 'streak_5_vip' || item.key === 'daily_sign') {
          // 累计签到奖VIP / 每日签到：引导用户去完成每日签到
          uni.showToast({ title: '请先完成每日签到', icon: 'none' });
          // 尝试找到每日签到任务并自动领取
          const signTask = this.taskList.find(t => t.key === 'daily_sign');
          if (signTask && signTask.status === 1) {
            setTimeout(() => this.doClaim(signTask), 800);
          }
        } else {
          uni.setStorageSync('_forceRefreshHome', '1');
          uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
        }
      }
      else if(item.status == 1) {
        this.doClaim(item);
      }
    },

    async doClaim(item) {
      if (item.status === 2) return;
      const user = uni.getStorageSync('userInfo');
      // 乐观更新：先标记已完成，防止UI不同步
      const prevStatus = item.status;
      const prevText = item.btn_text;
      item.status = 2;
      item.btn_text = '已完成';

      uni.showLoading({ title:'领取中' });
      try {
        const res = await request('task.php', { action:'claimReward', userId:user.id, taskKey:item.key }, 'POST');
        uni.hideLoading();
        if(res.code===0) {
          const d = res.data || {};
          const reward = d.reward || res.reward || {};
          this.rewardInfo = {
            jifen: reward.jifen || 0,
            exp: reward.exp || 0,
            vip_days: reward.vip_days || 0,
            vip_skipped: d.vip_skipped === true
          };
          const lc = d.level_config || res.level_config;
          if (lc) {
            saveLevelConfig(lc);
          }
          // 立即用后端返回的最新等级/经验/积分同步顶部进度条
          // 避免随后的 loadData 命中 request.js 2秒去重缓存导致进度条不刷新
          const nextLv  = (typeof d.user_level === 'number') ? d.user_level : this.userInfo.lv;
          const nextExp = (typeof d.user_exp  === 'number') ? d.user_exp  : this.userInfo.exp;
          const nextJf  = (this.userInfo.jifen || 0) + (reward.jifen || 0);
          this.userInfo = {
            ...this.userInfo,
            lv: nextLv,
            exp: nextExp,
            jifen: nextJf
          };
          // 同步写入本地缓存
          const local = uni.getStorageSync('userInfo') || {};
          local.lv = nextLv;
          local.exp = nextExp;
          local.jifen = nextJf;
          uni.setStorageSync('userInfo', local);

          this.showRewardModal = true;
          // 延迟刷新任务列表，避开 request 2秒去重缓存，确保拿到签到后的最新任务状态
          setTimeout(() => { this.loadData(); }, 2100);
        } else {
          // 后端明确拒绝，回退状态
          item.status = prevStatus;
          item.btn_text = prevText;
          uni.showToast({ title:res.msg || '领取失败', icon:'none' });
        }
      } catch(e) {
        uni.hideLoading();
        // 请求异常但后端可能已处理，不回退状态，仅提示
        uni.showToast({ title:'若已扣除则无需重复领取', icon:'none' });
        setTimeout(() => { this.loadData(); }, 2100);
      }
    }
  }
};
</script>

<style scoped>
.task-page {
  min-height: 100vh;
  background-color: #F6F7F9;
  padding-bottom: 60rpx;
}
.custom-navbar {
  position: fixed; top: 0; left: 0; width: 100%; z-index: 999;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
}
.nav-content { display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; position: relative; }
.nav-back { width: 60rpx; height: 100%; display: flex; align-items: center; }
.back-icon { width: 40rpx; height: 40rpx; }
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; position: absolute; left: 50%; transform: translateX(-50%); }
.nav-placeholder { width: 60rpx; }

.header-container { padding: 0 30rpx; margin-bottom: 30rpx; }
.user-score-card {
  background: #2a2a2a; 
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.15);
  color: #fff;
  position: relative;
  overflow: hidden;
}
.user-score-card::after {
  content: ''; position: absolute; top: -50rpx; right: -50rpx;
  width: 200rpx; height: 200rpx; border-radius: 50%;
  background: rgba(255,255,255,0.05); pointer-events: none;
}

.score-top { display: flex; align-items: center; margin-bottom: 40rpx; }
.avatar-box { width: 100rpx; height: 100rpx; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 24rpx; }
.score-icon { width: 60rpx; height: 60rpx; }
.score-info { flex: 1; display: flex; flex-direction: column; }
.score-label { font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 6rpx; }
.score-val { font-size: 56rpx; font-weight: bold; font-family: DIN, sans-serif; color: #f0c386; }
.mall-btn { 
  background: rgba(255,255,255,0.15); color: #f0c386; 
  font-size: 24rpx; padding: 8rpx 24rpx; border-radius: 30rpx; font-weight: 500;
  margin: 0; line-height: 1.5; border: 1rpx solid rgba(240, 195, 134, 0.3);
}

.level-area { background: rgba(0,0,0,0.2); border-radius: 16rpx; padding: 20rpx; }
.lv-row { display: flex; justify-content: space-between; font-size: 24rpx; margin-bottom: 12rpx; }
.curr-lv { color: #f0c386; font-weight: bold; display: flex; align-items: center; }
.next-tips { color: rgba(255,255,255,0.5); }
.progress-bg { width: 100%; height: 10rpx; background: rgba(255,255,255,0.1); border-radius: 5rpx; overflow: hidden; }
.progress-active { height: 100%; background: linear-gradient(90deg, #f0c386, #ffdb99); border-radius: 5rpx; transition: width 0.5s ease; }

.task-list-wrap { padding: 0 30rpx; }
.section-head { margin-bottom: 24rpx; }
.sect-title { font-size: 32rpx; font-weight: 800; color: #333; }

.task-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  border: 2rpx solid #e8e8e8;
}

.card-icon-area {
  position: relative;
  margin-right: 24rpx;
  flex-shrink: 0;
}
.icon-wrap {
  width: 88rpx; height: 88rpx; border-radius: 20rpx;
  background: #f5f5f5; display: flex; align-items: center; justify-content: center;
}
.task-icon {
  color: #fff;
}
.task-icon-svg {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.task-icon-svg .task-icon-img {
  width: 100%;
  height: 100%;
}
/* 任务图标配色（彩色背景+白色图标） */
.ti-blue   { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3); }
.ti-purple { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.3); }
.ti-gold   { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); box-shadow: 0 4rpx 12rpx rgba(245, 158, 11, 0.35); }
.ti-cyan   { background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%); box-shadow: 0 4rpx 12rpx rgba(6, 182, 212, 0.3); }
.ti-red    { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); box-shadow: 0 4rpx 12rpx rgba(239, 68, 68, 0.3); }
.ti-green  { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.3); }
.ti-pink   { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); box-shadow: 0 4rpx 12rpx rgba(236, 72, 153, 0.3); }
.ti-orange { background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); box-shadow: 0 4rpx 12rpx rgba(249, 115, 22, 0.3); }
.ti-fire   { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); box-shadow: 0 4rpx 12rpx rgba(234, 88, 12, 0.35); }
.t-icon { width: 52rpx; height: 52rpx; }
.vip-badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff5722 0%, #ff9800 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(255, 87, 34, 0.4);
  border: 2rpx solid #fff;
}
.vip-badge-svg-img {
  width: 22rpx;
  height: 22rpx;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}
.info-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.t-title { 
  font-size: 30rpx; 
  font-weight: 600; 
  color: #1a1a1a; 
}
.vip-tag {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%);
  padding: 4rpx 12rpx; 
  border-radius: 16rpx;
}
.vip-tag-text { 
  font-size: 20rpx; 
  color: #ff9800; 
  font-weight: 600; 
}
.t-desc { 
  font-size: 24rpx; 
  color: #999; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}

.info-footer {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.reward-area {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.reward-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #f8f9fa;
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
}
.reward-item-jf {
  background: rgba(59, 130, 246, 0.1);
}
.reward-item-exp {
  background: rgba(255, 184, 0, 0.12);
}
.reward-icon-svg-img {
  width: 26rpx;
  height: 26rpx;
}
.reward-item-jf .reward-icon-svg { color: #3b82f6; }
.reward-item-exp .reward-icon-svg { color: #ffb300; }
.reward-item-jf .reward-num { color: #3b82f6; }
.reward-item-exp .reward-num { color: #d97706; }
.reward-num {
  font-size: 22rpx;
  font-weight: 600;
  color: #333;
}
.reward-unit {
  font-size: 20rpx;
  color: #999;
}

.progress-area {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.progress-bar {
  flex: 1;
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
}

.card-action {
  margin-left: 20rpx;
  flex-shrink: 0;
}
.task-btn {
  width: 140rpx; 
  height: 64rpx; 
  line-height: 64rpx;
  border-radius: 32rpx; 
  font-size: 26rpx; 
  font-weight: 600;
  padding: 0; 
  margin: 0; 
  border: none; 
  outline: none;
}
.task-btn::after { border: none; }

.btn-todo { 
  background: #fff; 
  color: #333; 
  border: 2rpx solid #ddd; 
}
.btn-get { 
  background: linear-gradient(135deg, #ff2442 0%, #ff4757 100%); 
  color: #fff; 
  box-shadow: 0 4rpx 16rpx rgba(255, 36, 66, 0.3); 
  animation: pulse 1.5s infinite; 
}
@keyframes pulse { 0%{transform:scale(1);} 50%{transform:scale(1.05);} 100%{transform:scale(1);} }
.btn-done { 
  background: #f0f0f0; 
  color: #bbb; 
}

/* VIP任务样式 */
.task-card.vip-task {
  background: linear-gradient(145deg, #fffbf5 0%, #fff5e6 100%);
  border: 2rpx solid #ffc107;
  box-shadow: 0 6rpx 24rpx rgba(255, 193, 7, 0.18);
}
.vip-icon-wrap {
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  box-shadow: 0 4rpx 16rpx rgba(255, 193, 7, 0.4);
}
.vip-icon-wrap .t-icon {
  filter: drop-shadow(0 2rpx 4rpx rgba(0,0,0,0.15));
}
.btn-vip { 
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); 
  color: #fff; 
  box-shadow: 0 4rpx 16rpx rgba(255, 193, 7, 0.4);
}
.btn-vip:active {
  opacity: 0.9;
}

/* 进度条颜色区分 */
.task-card.vip-task .progress-fill {
  background: linear-gradient(90deg, #ff9800 0%, #ffc107 100%);
}

.modal-mask {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden; transition: all 0.3s;
}
.modal-mask.show { opacity: 1; visibility: visible; }
.modal-body {
  width: 560rpx; background: #fff; border-radius: 40rpx;
  padding: 50rpx 40rpx; display: flex; flex-direction: column; align-items: center;
  transform: scale(0.8); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-mask.show .modal-body { transform: scale(1); }

.gift-svg-img {
  width: 140rpx;
  height: 140rpx;
  margin-bottom: 24rpx;
}
.m-title { font-size: 36rpx; font-weight: 800; color: #333; margin-bottom: 12rpx; }
.m-rewards { display: flex; align-items: center; gap: 40rpx; margin-bottom: 30rpx; margin-top: 20rpx; }
.mr-item { display: flex; flex-direction: column; align-items: center; }
.mr-icon-svg-img {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 8rpx;
}
.mr-icon-jf { color: #3b82f6; }
.mr-icon-exp { color: #ffb300; }
.mr-icon-vip { color: #ff5722; }
.mr-num { font-size: 40rpx; font-weight: bold; color: #ff2442; font-family: DIN; }
.mr-lbl { font-size: 24rpx; color: #666; margin-top: 6rpx; }
.divider-v { width: 2rpx; height: 40rpx; background: #eee; }

.vip-skip-tip {
  width: 100%;
  text-align: center;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 16rpx;
}
.vip-skip-tip text {
  font-size: 24rpx;
  color: #ff9800;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}
.empty-icon-svg-img {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 16rpx;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
}

.m-btn {
  width: 100%; height: 80rpx; line-height: 80rpx;
  background: #ff2442; color: #fff; border-radius: 40rpx;
  font-size: 30rpx; font-weight: 600;
}
</style>
