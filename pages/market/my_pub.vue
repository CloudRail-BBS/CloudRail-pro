<template>
  <view class="manage-container">
    <view class="nav-bar-fixed">
        <view :style="{ height: statusBarHeight + 'px' }"></view>
        <view class="nav-content">
            <view class="nav-btn" @click="goBack"><image src="/static/icon/fanhui.png" class="nav-icon"></image></view>
            <text class="nav-title">管理发布</text>
            <view class="nav-btn"></view>
        </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>
    <view class="list">
        <view class="item" v-for="(item, index) in list" :key="index">
            <image :src="item.image" class="i-img" mode="aspectFill"></image>
            <view class="i-info">
                <text class="i-title">{{ item.title }}</text>
                <text class="i-price">¥{{ item.price }}</text>

                <view class="i-status" :class="'s-'+item.status">{{ statusText(item.status) }}</view>
            </view>

            <view class="i-act">
                <view class="act-btn edit" @click="doEdit(item.id)">编辑</view>
                <block v-if="parseInt(item.status) === 1">
                    <view class="act-btn" @click="doOffShelf(item.id)">下架</view>
                </block>

                <block v-else>
                    <view class="act-btn del" @click="askDelete(item.id)">删除</view>
                    <view class="act-btn" @click="doRelist(item.id)">重新上架</view>
                </block>
            </view>
        </view>
        <view v-if="list.length===0" class="empty">暂无发布记录</view>
    </view>
    <view class="ios-mask transparent" v-if="hud.visible" @touchmove.stop.prevent>
        <view class="ios-hud">
            <view v-if="hud.type === 'loading'" class="hud-spinner"></view>
            <view v-if="hud.type === 'success'" class="hud-success-mark"></view>
            <text class="hud-text">{{ hud.text }}</text>
        </view>
    </view>
    <XhsConfirm
        :visible="confirmDialog.visible"
        :title="confirmDialog.title"
        :message="confirmDialog.message"
        :confirm-text="confirmDialog.confirmText"
        :cancel-text="confirmDialog.cancelText"
        :mask-closable="false"
        @confirm="handleConfirmOk"
        @cancel="handleConfirmCancel"
    />
  </view>
</template>

<script>
import { baseUrl, request } from '../../common/request.js';
import XhsConfirm from '../../components/XhsConfirm.vue';

export default {
    components: { XhsConfirm },
    data() {
        return {
            statusBarHeight: 20,
            list: [],
            token: '',
            isLogin: false,
            delId: 0,
            confirmDialog: {
                visible: false,
                title: '',
                message: '',
                confirmText: '确定',
                cancelText: '取消',
                resolve: null
            },
            hud: { visible: false, type: 'loading', text: '' }
        };
    },
    onLoad() {
        this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20;
        this.checkLoginState();
    },
    onShow() {
        this.checkLoginState();
        if (this.isLogin) {
            this.loadList();
        } else {
            this.requireLogin();
        }
    },
    methods: {
        goBack() { uni.navigateBack(); },

        checkLoginState() {
            const u = uni.getStorageSync('userInfo');
            const t = uni.getStorageSync('token');
            if(u && t && u.id) {
                this.isLogin = true;
                this.token = t;
            } else {
                this.isLogin = false;
                this.token = '';
            }
        },

        requireLogin() {
            uni.showToast({ title: '请先登录', icon: 'none' });
            setTimeout(() => {
                uni.navigateTo({ url: '/pages/login/login' });
            }, 1000);
        },

        doEdit(id) {
            if(!this.isLogin) return this.requireLogin();
            uni.navigateTo({ url: '/pages/market/publish?id=' + id });
        },

        statusText(s) {
            const statusInt = parseInt(s);
            const map = {
                0: '已下架',
                1: '出售中',
                2: '已售出',
                3: '已关闭'
            };
            return map[statusInt] !== undefined ? map[statusInt] : '状态异常';
        },

        showHud(text, type='loading') {
            this.hud = {visible:true, text, type};
            if(type!=='loading') setTimeout(()=>this.hud.visible=false, 1500);
        },

        showConfirmDialog(options) {
            return new Promise((resolve) => {
                this.confirmDialog = {
                    visible: true,
                    title: options.title || '',
                    message: options.message || '',
                    confirmText: options.confirmText || '确定',
                    cancelText: options.cancelText || '取消',
                    resolve
                };
            });
        },
        closeConfirmDialog(result) {
            const resolve = this.confirmDialog.resolve;
            this.confirmDialog = {
                visible: false,
                title: '',
                message: '',
                confirmText: '确定',
                cancelText: '取消',
                resolve: null
            };
            if (resolve) resolve(result);
        },
        handleConfirmOk() { this.closeConfirmDialog(true); },
        handleConfirmCancel() { this.closeConfirmDialog(false); },

        async loadList() {
            if(!this.isLogin) return;
            try {
                const res = await request('market.php', { action: 'my_pub' });
                if(res.code===0) {
                    this.list = (res.data && res.data.list) || res.data || [];
                } else if (res.code === -2) {
                    this.isLogin = false;
                    this.requireLogin();
                }
            } catch(e) {}
        },

        async doOffShelf(id) {
            if(!this.isLogin) return this.requireLogin();
            this.showHud('下架中...');
            try {
                const res = await request('market.php', { action: 'off_shelf', id: id });
                if(res.code===0) {
                    this.showHud('已下架', 'success');
                    this.loadList();
                } else {
                    this.showHud(res.msg, 'error');
                }
            } catch(e) {
                this.showHud('网络错误', 'error');
            }
        },

        async doRelist(id) {
            if(!this.isLogin) return this.requireLogin();
            this.showHud('上架中...');
            try {
                const res = await request('market.php', { action: 'relist', id: id });
                if(res.code===0) {
                    this.showHud('已上架', 'success');
                    this.loadList();
                } else {
                    this.showHud(res.msg, 'error');
                }
            } catch(e) {
                this.showHud('网络错误', 'error');
            }
        },
        async askDelete(id) {
            if(!this.isLogin) return this.requireLogin();
            const ok = await this.showConfirmDialog({
                title: '确认删除？',
                message: '删除后商品将无法恢复。',
                confirmText: '删除'
            });
            if (!ok) return;
            this.delId = id;
            this.confirmDelete();
        },

        async confirmDelete() {
            if(!this.isLogin) return this.requireLogin();
            this.showHud('删除中...');
            try {
                const res = await request('market.php', { action: 'delete', id: this.delId });
                if(res.code===0) {
                    this.showHud('已删除', 'success');
                    this.loadList();
                } else {
                    this.showHud(res.msg, 'error');
                }
            } catch(e) {
                this.showHud('网络错误', 'error');
            }
        }
    }
}
</script>

<style scoped>
.manage-container{background:#F7F8FA;min-height:100vh}
.nav-bar-fixed{position:fixed;top:0;left:0;width:100%;background:#fff;z-index:99;border-bottom:1rpx solid #eee}
.nav-content{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 30rpx}
.nav-btn{width:60rpx;height:100%;display:flex;align-items:center}.nav-icon{width:44rpx;height:44rpx}
.nav-title{font-size:34rpx;font-weight:600}

.list{padding:20rpx 20rpx 30rpx}
.item{background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:20rpx;display:flex;align-items:center;position:relative}
.i-img{width:160rpx;height:160rpx;border-radius:12rpx;background:#eee;margin-right:20rpx}
.i-info{flex:1;height:160rpx;display:flex;flex-direction:column;justify-content:space-between}
.i-title{font-size:28rpx;color:#333;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.i-price{font-size:32rpx;font-weight:bold;color:#FF2442}
.i-status{font-size:24rpx;color:#999}

/* 状态颜色 */
.s-0{color:#999}       /* 下架 */
.s-1{color:#52C41A}    /* 出售中 */
.s-2{color:#FF9500}    /* 已售出 */
.s-3{color:#FF3B30}    /* 已关闭/退款 */

.i-act{position:absolute;bottom:20rpx;right:20rpx;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:14rpx;max-width:520rpx}
.act-btn{padding:8rpx 24rpx;border:1rpx solid #DDD;border-radius:30rpx;font-size:24rpx;color:#333;background:#fff}
.act-btn:active{background:#f5f5f5}
.act-btn.del{color:#FF3B30;border-color:#FF3B30}
.act-btn.edit{color:#FF2442;border-color:#FF2442}

.empty{text-align:center;color:#999;margin-top:100rpx}

/* Common Modal & HUD CSS */
.ios-mask{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}.ios-mask.transparent{background:transparent;backdrop-filter:none}
.ios-modal-box{width:560rpx;background:rgba(255,255,255,0.95);border-radius:28rpx;overflow:hidden;backdrop-filter:blur(10px);animation:popUp 0.2s ease-out}
.modal-text{padding:40rpx 30rpx;text-align:center}.m-title{display:block;font-size:34rpx;font-weight:600;margin-bottom:10rpx}.m-desc{display:block;font-size:26rpx;color:#666}
.modal-footer{display:flex;border-top:1rpx solid rgba(0,0,0,0.1)}.m-btn{flex:1;height:90rpx;line-height:90rpx;text-align:center;font-size:34rpx;color:#007AFF}.m-btn:active{background:rgba(0,0,0,0.05)}.m-btn.confirm{border-left:1rpx solid rgba(0,0,0,0.1);font-weight:600}.m-btn.destructive{color:#FF3B30}
.ios-hud{padding:30rpx;min-width:200rpx;background:rgba(30,30,30,0.85);backdrop-filter:blur(15px);border-radius:24rpx;display:flex;flex-direction:column;align-items:center}
.hud-text{color:#fff;font-size:28rpx;margin-top:10rpx}.hud-spinner{width:60rpx;height:60rpx;border:6rpx solid rgba(255,255,255,0.3);border-top:6rpx solid #fff;border-radius:50%;animation:iosSpin 1s linear infinite}.hud-success-mark{width:30rpx;height:50rpx;border-bottom:6rpx solid #fff;border-right:6rpx solid #fff;transform:rotate(45deg);margin-bottom:10rpx}
@keyframes popUp{from{transform:scale(1.1);opacity:0}to{transform:scale(1);opacity:1}}@keyframes iosSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
</style>