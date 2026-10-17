<template>
  <view class="report-container" :class="themeClass">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-icon" @click="goBack"><image src="/static/icon/x-gray.svg" class="nav-icon-img" mode="aspectFit"></image></view>
        <view class="nav-title">举报{{ typeText }}</view>
        <view class="nav-icon"></view> 
    </view>

    <view class="content-body">
        <view class="section-title">请选择举报原因</view>
        
        <view class="reason-grid">
            <view 
                class="reason-item" 
                :class="{ active: currentReason === item }"
                v-for="(item, index) in reasons" 
                :key="index"
                @click="selectReason(item)"
            >
                {{ item }}
            </view>
        </view>

        <view class="section-title mt-40">详细描述 (选填)</view>
        <view class="textarea-wrap">
            <textarea 
                v-model="description" 
                class="desc-input" 
                placeholder="请详细描述违规行为，有助于我们快速处理..." 
                maxlength="200"
            ></textarea>
            <view class="word-count">{{ description.length }}/200</view>
        </view>

        <view class="submit-btn" :class="{ disabled: !currentReason }" @click="submitReport">
            提交反馈
        </view>
        
        <view class="tips">
            <text>您的举报信息将严格保密，我们将在24小时内核实处理。</text>
        </view>
    </view>
    

    <view class="hud-mask" v-if="hud.show" @touchmove.stop.prevent>
        <view class="hud-box">
            <view class="hud-spinner" v-if="hud.type === 'loading'"></view>
            <view class="hud-success-icon" v-if="hud.type === 'success'"><view class="check-mark"></view></view>
            <view class="hud-info-icon" v-if="hud.type === 'info'">!</view>
            <text class="hud-text">{{ hud.text }}</text>
        </view>
    </view>

  </view>
</template>

<script>
import { request } from '../../common/request.js';

export default {
    data() {
        return {
            statusBarHeight: 20,
            targetId: 0,
            reportType: 'user', // 'user' | 'post' | 'comment'
            currentReason: '',
            description: '',
            reasons: [
                '发布不良/违法信息', '存在欺诈骗钱行为', 
                '发布广告/垃圾信息', '恶意攻击他人', 
                '头像/昵称违规', '盗用他人作品',
                '诱导点赞/关注', '其他违规行为'
            ],
            isSubmitting: false,
            hud: { show: false, type: 'loading', text: '' }
        }
    },
    computed: {
        typeText() {
            const map = { 'user': '用户', 'post': '帖子', 'comment': '评论' };
            return map[this.reportType] || '内容';
        }
    },
    onLoad(options) {
        const sys = uni.getSystemInfoSync();
        this.statusBarHeight = sys.statusBarHeight || 20;

        if (options.postId) {
            this.targetId = options.postId;
            this.reportType = 'post';
        } else if (options.commentId) {
            this.targetId = options.commentId;
            this.reportType = 'comment';
        } else if (options.userId) {
            this.targetId = options.userId;
            this.reportType = 'user';
        } else {
            this.showHud('info', '参数缺失', 1500);
            setTimeout(() => uni.navigateBack(), 1500);
        }
    },
    methods: {
        goBack() { uni.navigateBack(); },
        selectReason(val) { this.currentReason = val; },
        
        showHud(type, text, duration = 0) {
            this.hud = { show: true, type, text };
            if (duration > 0) setTimeout(() => { this.hud.show = false; }, duration);
        },
        
        async submitReport() {
            if (!this.currentReason) return;
            if (this.isSubmitting) return;
            
            const myInfo = uni.getStorageSync('userInfo');
            if (!myInfo) return uni.navigateTo({ url: '/pages/login/login' });

            this.isSubmitting = true;
            this.showHud('loading', '提交中...');

            try {
            
                const res = await request('report.php', {
                    action: 'submit',
                    userId: myInfo.id,       // 举报人ID
                    targetId: this.targetId, // 被举报的目标ID (帖子ID/用户ID/评论ID)
                    type: this.reportType,   // 类型: 'post' | 'user' | 'comment'
                    reason: this.currentReason,
                    description: this.description
                }, 'POST');

                this.isSubmitting = false;

                if (res.code === 0) {
                    this.showHud('success', '举报成功', 1500);
                    setTimeout(() => uni.navigateBack(), 1500);
                } else {
            
                    this.showHud('info', res.msg || '提交失败', 2000);
                }
            } catch (e) {
                this.isSubmitting = false;
                this.showHud('info', (e && e.msg) || '网络请求失败', 2500);
            }
        }
    }
}
</script>

<style scoped>
.report-container { background: var(--cr-surface); min-height: 100vh; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; height: 88rpx; border-bottom: 1rpx solid #f5f5f5; }
.nav-title { font-size: 32rpx; font-weight: bold; color: var(--cr-text); }
.nav-icon { padding: 10rpx; width: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon-img { width: 36rpx; height: 36rpx; }
.content-body { padding: 40rpx 30rpx; }
.section-title { font-size: 28rpx; font-weight: bold; color: var(--cr-text); margin-bottom: 24rpx; }
.mt-40 { margin-top: 40rpx; }
.reason-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.reason-item { width: 48%; background: var(--cr-surface-alt); color: #666; font-size: 26rpx; height: 80rpx; display: flex; align-items: center; justify-content: center; border-radius: 8rpx; margin-bottom: 20rpx; border: 1px solid transparent; transition: all 0.2s; }
.reason-item.active { background: #fff5f6; color: #ff2442; border-color: #ff2442; font-weight: 600; }
.textarea-wrap { background: var(--cr-surface-alt); padding: 24rpx; border-radius: 12rpx; position: relative; }
.desc-input { width: 100%; height: 200rpx; font-size: 28rpx; color: var(--cr-text); line-height: 1.5; }
.word-count { text-align: right; font-size: 22rpx; color: var(--cr-border-strong); margin-top: 10rpx; }
.submit-btn { margin-top: 60rpx; height: 88rpx; background: #ff2442; color: #fff; font-size: 30rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; }
.submit-btn:active { transform: scale(0.98); }
.submit-btn.disabled { background: #e0e0e0; color: #aaa; pointer-events: none; }
.tips { margin-top: 30rpx; text-align: center; font-size: 22rpx; color: var(--cr-border-strong); }

.hud-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center; background: transparent; }
.hud-box { width: 240rpx; height: 240rpx; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(10px); border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; animation: fadeInScale 0.2s ease-out; }
.hud-spinner { width: 70rpx; height: 70rpx; border: 6rpx solid rgba(255, 255, 255, 0.3); border-top: 6rpx solid #fff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20rpx; }
.hud-success-icon { width: 80rpx; height: 80rpx; margin-bottom: 10rpx; position: relative; display: flex; align-items: center; justify-content: center; }
.check-mark { width: 30rpx; height: 50rpx; border-bottom: 6rpx solid #fff; border-right: 6rpx solid #fff; transform: rotate(45deg); margin-bottom: 10rpx; animation: checkAnim 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
.hud-info-icon { font-size: 60rpx; font-weight: bold; color: #fff; width: 70rpx; height: 70rpx; border: 4rpx solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.hud-text { font-size: 28rpx; letter-spacing: 2rpx; text-align: center; padding: 0 10rpx; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes checkAnim { from { width: 0; height: 0; opacity: 0; } to { width: 30rpx; height: 50rpx; opacity: 1; } }
</style>
