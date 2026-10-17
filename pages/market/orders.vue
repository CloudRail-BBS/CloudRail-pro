<template>
  <view class="order-container" :class="themeClass">
    <view class="nav-bar-fixed">
        <view :style="{ height: statusBarHeight + 'px' }"></view>
        <view class="nav-content">
            <view class="nav-btn" @click="goBack"><image src="/static/icon/fanhui.png" class="nav-icon"></image></view>
            <text class="nav-title">集市订单</text>
            <view class="nav-btn"></view>
        </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>
    <view class="tabs">
        <view class="tab" :class="{active: type===1}" @click="switchType(1)">我买到的</view>
        <view class="tab" :class="{active: type===2}" @click="switchType(2)">我卖出的</view>
    </view>
    <view class="list">
        <view class="item" v-for="(item, index) in list" :key="index">
            <view class="i-head">
                <text class="i-no">订单号: {{ item.order_no }}</text>
                <text class="i-status" :class="'st-'+item.status">{{ statusText(item.status) }}</text>
            </view>
            <view class="i-body">
                <image :src="item.image" class="i-img" mode="aspectFill"></image>
                <view class="i-info">
                    <text class="i-title">{{ item.title }}</text>
                    <text class="i-price">¥{{ item.amount }}</text>
                </view>
            </view>
            
            <view class="i-ship" v-if="item.status > 0 && item.status < 3 && item.product_type==1">
                <text class="ship-label">快递:</text>
                <text class="ship-val">{{ item.logistics_company }} {{ item.logistics_no }}</text>
                <text class="ship-arrow">></text>
            </view>

            <view class="i-foot">
                <block v-if="type===2">
                    <view class="btn action" v-if="item.status==0 && item.product_type==1" @click="openShip(item)">立即发货</view>
                    <view class="btn action" v-if="item.status==0 && item.product_type==0" @click="openSendVirtual(item)">发送内容</view>
                    <view class="btn normal" v-if="item.status!=3" @click="askRefund(item.id)">退款</view>
                </block>
                
                <block v-if="type===1">
                    <view class="btn action" v-if="item.status==1 && item.product_type==1" @click="askConfirmReceipt(item.id)">确认收货</view>
                    <view class="btn normal" v-if="item.status>=1 && item.status<3 && item.product_type==1" @click="openLogistics(item)">查看物流</view>
                    <view class="btn action" v-if="item.status==1 && item.product_type==0" @click="askConfirmReceipt(item.id)">确认收货</view>
                    <view class="btn normal" v-if="item.status>=1 && item.status<3 && item.product_type==0" @click="openVirtualContent(item)">查看内容</view>
                </block>
                
                <view class="btn delete" v-if="item.status==2 || item.status==3" @click="askDelete(item.id)">删除订单</view>
            </view>
        </view>
        
        <view v-if="list.length===0" class="empty">暂无相关订单</view>
    </view>

    <view class="ios-mask" v-if="showShip" @touchmove.stop.prevent>
        <view class="ios-modal-box">
            <view class="modal-text">
                <text class="m-title">填写发货信息</text>
                <view style="text-align:left;margin-top:10rpx">
                    <text style="font-size:26rpx;color:#666;display:block;margin-bottom:10rpx">快递公司</text>
                    <view class="company-scroll">
                        <view class="company-item" :class="{selected: shipCompany===c.code}" v-for="c in companies" :key="c.code" @click="shipCompany=c.code">{{ c.name }}</view>
                    </view>
                    <text style="font-size:26rpx;color:#666;display:block;margin:20rpx 0 10rpx">快递单号</text>
                    <input class="ship-no-input" v-model="shipNo" placeholder="请输入快递单号" :show-confirm-bar="false" />
                </view>
            </view>
            <view class="modal-footer">
                <view class="m-btn cancel" @click="showShip=false">取消</view>
                <view class="m-btn confirm" @click="doShip">确认发货</view>
            </view>
        </view>
    </view>
    <view class="ios-mask" v-if="showVirtualSend" @touchmove.stop.prevent>
        <view class="ios-modal-box">
            <view class="modal-text">
                <text class="m-title">发送虚拟内容</text>
                <textarea class="ship-area" v-model="virtualContent" placeholder="请输入要发送给买家的内容（卡密/链接/账号等）..." :show-confirm-bar="false"></textarea>
            </view>
            <view class="modal-footer">
                <view class="m-btn cancel" @click="showVirtualSend=false">取消</view>
                <view class="m-btn confirm" @click="doSendVirtual">确认发送</view>
            </view>
        </view>
    </view>

    <view class="ios-mask" v-if="showLogModal" @click="showLogModal=false">
        <view class="ios-modal-box detail-modal" @click.stop>
            <view class="modal-text">
                <text class="m-title">物流轨迹</text>
                <text style="color:#666;font-size:26rpx;display:block;margin-bottom:16rpx" v-if="logStatus">当前状态：{{ logStatus }}</text>
                <scroll-view scroll-y style="max-height:500rpx;">
                    <view class="log-item" v-for="(ev, i) in logList" :key="i">
                        <text class="log-time">{{ ev.time }}</text>
                        <text class="log-desc">{{ ev.desc }}</text>
                    </view>
                    <view v-if="logLoading" style="text-align:center;color:#999;padding:30rpx">加载中...</view>
                    <view v-if="!logLoading && logList.length===0" style="text-align:center;color:#999;padding:30rpx">暂无轨迹数据</view>
                </scroll-view>
            </view>
            <view class="modal-footer">
                <view class="m-btn confirm" @click="showLogModal=false">关闭</view>
            </view>
        </view>
    </view>
    <view class="ios-mask" v-if="showVirtualView" @click="showVirtualView=false">
        <view class="ios-modal-box" @click.stop>
            <view class="modal-text">
                <text class="m-title">虚拟商品内容</text>
                <text class="m-content-scroll">{{ currentVirtualContent }}</text>
            </view>
            <view class="modal-footer">
                <view class="m-btn confirm" @click="copyText(currentVirtualContent)">复制</view>
                <view class="m-btn cancel" @click="showVirtualView=false">关闭</view>
            </view>
        </view>
    </view>

    <view class="ios-mask" v-if="showPhoneModal" @touchmove.stop.prevent>
        <view class="ios-modal-box">
            <view class="modal-text">
                <text class="m-title">需要手机号验证</text>
                <text class="m-desc" style="margin-bottom:24rpx">{{ phoneHint || '该快递公司需要验证手机号，请输入收件人或寄件人手机号后4位' }}</text>
                <input class="ship-no-input" v-model="phoneInput" type="number" maxlength="4" placeholder="请输入手机号后4位" :show-confirm-bar="false" />
            </view>
            <view class="modal-footer">
                <view class="m-btn cancel" @click="showPhoneModal=false;phoneInput=''">取消</view>
                <view class="m-btn confirm" @click="retryLogisticsWithPhone">查询</view>
            </view>
        </view>
    </view>
    <view class="ios-mask transparent" v-if="hud.visible" @touchmove.stop.prevent>
        <view class="ios-hud">
            <view v-if="hud.type === 'loading'" class="hud-spinner"></view>
            <view v-if="hud.type === 'success'" class="hud-success-mark"></view>
            <view v-if="hud.type === 'error'" class="hud-error-mark">!</view>
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
            type: 1,
            list: [],

            token: '',
            isLogin: false,

            showShip: false, shipId: 0, shipCompany: 'sf', shipNo: '',
            showVirtualSend: false, virtualSendId: 0, virtualContent: '',
            showLogModal: false, logLoading: false, logList: [], logStatus: '',
            showPhoneModal: false, phoneInput: '', phoneHint: '', currentLogisticsItem: null,
            showVirtualView: false, currentVirtualContent: '',
            showDetailModal: false, currentDetailText: '',
            delId: 0,
            refundId: 0,
            confirmId: 0,
            confirmDialog: {
                visible: false,
                title: '',
                message: '',
                confirmText: '确定',
                cancelText: '取消',
                resolve: null
            },

            companies: [
                { code: 'sf', name: '顺丰' }, { code: 'yt', name: '圆通' },
                { code: 'sto', name: '申通' }, { code: 'yunda', name: '韵达' },
                { code: 'zto', name: '中通' }, { code: 'jd', name: '京东' },
                { code: 'ems', name: 'EMS' }, { code: 'jt', name: '极兔' },
                { code: 'debangwuliu', name: '德邦' }, { code: 'youzhengbk', name: '邮政包裹' },
            ],

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
        
        // 登录检查
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
            setTimeout(() => { uni.navigateTo({ url: '/pages/login/login' }); }, 1000);
        },

        switchType(t) { 
            this.type = t; 
            this.list = []; 
            if(this.isLogin) this.loadList(); 
        },
        
        statusText(s) { 
            // 0待发货 1已发货 2已完成 3已退款
            return ['待发货', '已发货', '交易完成', '已退款'][s]; 
        },
        
        showHud(text, type = 'loading') { 
            this.hud = { visible: true, text, type }; 
            if (type !== 'loading') setTimeout(() => { this.hud.visible = false; }, 1500); 
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

        // 加载列表
        async loadList() {
            if(!this.isLogin) return;
            try {
                const res = await request('market.php', { action: 'my_orders', type: this.type });
                if(res.code===0) {
                    // 后端无订单时可能返回 null，统一兜底为空数组
                    const d = res.data;
                    this.list = Array.isArray(d) ? d : (d && Array.isArray(d.list) ? d.list : []);
                } else if (res.code === -2) {
                    this.isLogin = false;
                    this.requireLogin();
                }
            } catch(e) {}
        },
        

        openShip(item) { this.shipId = item.id; this.shipCompany = 'sf'; this.shipNo = ''; this.showShip = true; },
        async doShip() {
            if(!this.isLogin) return this.requireLogin();
            if(!this.shipNo.trim()) return this.showHud('请输入快递单号', 'error');
            if(!this.shipCompany) return this.showHud('请选择快递公司', 'error');

            this.showHud('提交中...');
            try {
                const res = await request('market.php', { action: 'ship', id: this.shipId, logistics_company: this.shipCompany, logistics_no: this.shipNo });
                if(res.code === 0) {
                    this.showShip = false;
                    this.showHud('发货成功', 'success');
                    this.loadList();
                } else { this.showHud(res.msg, 'error'); }
            } catch(e) { this.showHud('网络错误', 'error'); }
        },

     
        openSendVirtual(item) { this.virtualSendId = item.id; this.virtualContent = ''; this.showVirtualSend = true; },
        async doSendVirtual() {
            if(!this.isLogin) return this.requireLogin();
            if(!this.virtualContent.trim()) return this.showHud('请输入要发送的内容', 'error');

            this.showHud('发送中...');
            try {
                const res = await request('market.php', { action: 'send_virtual', order_id: this.virtualSendId, virtual_content: this.virtualContent });
                if(res.code === 0) {
                    this.showVirtualSend = false;
                    this.showHud('发送成功', 'success');
                    this.loadList();
                } else { this.showHud(res.msg, 'error'); }
            } catch(e) { this.showHud('网络错误', 'error'); }
        },

 
        openLogistics(item) {
            this.logList = []; this.logStatus = ''; this.logLoading = true;
            this.currentLogisticsItem = item;
            this.showLogModal = true;
            this._doQueryLogistics(item.id, '');
        },

        async _doQueryLogistics(orderId, phone) {
            const data = { action: 'get_logistics', order_id: orderId };
            if (phone) data.phone = phone;
            try {
                const res = await request('market.php', data);
                this.logLoading = false;
                if (res.code === 0) {
                    this.logList = res.data.list || [];
                    this.logStatus = res.data.status || '';
                } else if (res.code === -3) {
                    // 需要手机号验证
                    this.showLogModal = false;
                    this.phoneHint = res.msg || '';
                    this.phoneInput = '';
                    this.showPhoneModal = true;
                } else {
                    this.logStatus = res.msg || '查询失败';
                }
            } catch(e) {
                this.logLoading = false; this.logStatus = '网络错误';
            }
        },

        retryLogisticsWithPhone() {
            const phone = this.phoneInput.trim();
            if (!/^\d{4}$/.test(phone)) {
                this.showHud('请输入4位数字手机号', 'error');
                return;
            }
            this.showPhoneModal = false;
            this.phoneInput = '';
            if (!this.currentLogisticsItem) return;
            this.logList = []; this.logStatus = ''; this.logLoading = true;
            this.showLogModal = true;
            this._doQueryLogistics(this.currentLogisticsItem.id, phone);
        },

       
        openVirtualContent(item) {
            this.currentVirtualContent = item.virtual_content || '内容为空';
            this.showVirtualView = true;
        },

  
        async askConfirmReceipt(id) {
            if(!this.isLogin) return this.requireLogin();
            const ok = await this.showConfirmDialog({
                title: '确认收货？',
                message: '确认收到商品后，资金将直接打入卖家账户，该操作无法撤销。',
                confirmText: '确认收货'
            });
            if (!ok) return;
            this.confirmId = id;
            this.doConfirmReceipt();
        },
        async doConfirmReceipt() {
            this.showHud('处理中...');
            try {
                const res = await request('market.php', { action: 'confirm_receipt', id: this.confirmId });
                if(res.code === 0) {
                    this.showHud('交易完成', 'success');
                    this.loadList();
                } else {
                    this.showHud(res.msg, 'error');
                }
            } catch(e) {
                this.showHud('网络错误', 'error');
            }
        },

        async askRefund(id) {
            if(!this.isLogin) return this.requireLogin();
            const ok = await this.showConfirmDialog({
                title: '确认退款？',
                message: '资金将原路返回给买家，订单将关闭。',
                confirmText: '确认退款'
            });
            if (!ok) return;
            this.refundId = id;
            this.doRefund();
        },
        async doRefund() {
            if(!this.isLogin) return this.requireLogin();
            this.showHud('退款处理中...');
            try {
                const res = await request('market.php', { action: 'refund', id: this.refundId });
                if(res.code === 0) {
                    this.showHud('退款成功', 'success');
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
                title: '删除订单？',
                message: '删除后将无法查看该订单记录。',
                confirmText: '确认删除'
            });
            if (!ok) return;
            this.delId = id;
            this.doDelete();
        },
        async doDelete() {
            if(!this.isLogin) return this.requireLogin();
            this.showHud('删除中...');
            try {
                const res = await request('market.php', { action: 'delete_order', id: this.delId, type: this.type });
                if(res.code === 0) {
                    this.showHud('已删除', 'success');
                    this.loadList();
                } else {
                    this.showHud(res.msg, 'error');
                }
            } catch(e) {
                this.showHud('网络错误', 'error');
            }
        },

        showShipDetail(text) {
            this.currentDetailText = text;
            this.showDetailModal = true;
        },
        copyText(text) {
            uni.setClipboardData({
                data: text,
                success: () => {
                    uni.hideToast(); 
                    this.showHud('已复制', 'success'); 
                    this.showDetailModal = false; 
                }
            });
        }
    }
}
</script>

<style scoped>
.order-container{background: var(--cr-surface-alt);min-height:100vh}
.nav-bar-fixed{position:fixed;top:0;left:0;width:100%;background: var(--cr-surface);z-index:99;border-bottom: 1rpx solid var(--cr-border)}
.nav-content{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 30rpx}
.nav-btn{width:60rpx;height:100%;display:flex;align-items:center}.nav-icon{width:44rpx;height:44rpx}
.nav-title{font-size:34rpx;font-weight:600}
.tabs{display:flex;background: var(--cr-surface);padding:20rpx 0;margin-bottom:20rpx}
.tab{flex:1;text-align:center;font-size:30rpx;color: var(--cr-text-muted);position:relative}
.tab.active{color: var(--cr-text);font-weight:bold}
.tab.active:after{content:'';position:absolute;bottom:-10rpx;left:50%;transform:translateX(-50%);width:40rpx;height:6rpx;background:#FF2442;border-radius:3rpx}

.list{padding:20rpx}
.item{background: var(--cr-surface);border-radius:16rpx;padding:30rpx;margin-bottom:20rpx}
.i-head{display:flex;justify-content:space-between;font-size:24rpx;color: var(--cr-text-muted);border-bottom:1rpx solid #F9F9F9;padding-bottom:20rpx;margin-bottom:20rpx}
.i-status{color: var(--cr-text); font-weight: 500;}
.st-0{color:#FF2442} /* 待发货 */
.st-1{color:#007AFF} /* 已发货 */
.st-2{color:#52C41A} /* 完成 */
.st-3{color: var(--cr-text-muted)}    /* 退款 */

.i-body{display:flex;}
.i-img{width:120rpx;height:120rpx;border-radius:10rpx;background:#eee;margin-right:20rpx}
.i-info{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.i-title{font-size:28rpx;color: var(--cr-text);font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.i-price{font-size:32rpx;font-weight:bold;color: var(--cr-text)}

.i-ship{background: var(--cr-surface-alt);padding:20rpx;border-radius:8rpx;font-size:26rpx;color: var(--cr-text-muted);margin-top:20rpx;display:flex;align-items:center;}
.ship-label{font-weight:bold;margin-right:10rpx;flex-shrink:0;}
.ship-val{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-right:10rpx;}
.ship-arrow{color: var(--cr-text-muted);}

.i-foot{border-top:1rpx solid #F9F9F9;padding-top:20rpx;margin-top:20rpx;display:flex;justify-content:flex-end;gap:20rpx;flex-wrap:wrap}
.btn{display:inline-block;padding:10rpx 30rpx;border-radius:30rpx;font-size:26rpx;}
.btn.normal{background: var(--cr-surface);color:#333;border: 1rpx solid var(--cr-border-strong);}
.btn.action{background:#1D1D1F;color:#fff;border:1rpx solid #1D1D1F;}
.btn.delete{background: var(--cr-surface);color:#FF3B30;border:1rpx solid #FF3B30;}

.company-scroll{display:flex;flex-wrap:wrap;gap:12rpx;margin-bottom:10rpx}
.company-item{padding:8rpx 20rpx;background: var(--cr-surface-alt);border-radius:20rpx;font-size:24rpx;color: var(--cr-text);border:2rpx solid transparent}
.company-item.selected{background:#1D1D1F;color:#fff}
.ship-no-input{width:100%;height:72rpx;background: var(--cr-surface-alt);border-radius:10rpx;padding:0 20rpx;font-size:28rpx;font-weight:bold}
.detail-modal{max-height:80vh}
.log-item{padding:16rpx 0;border-bottom:1rpx solid #F5F5F5;text-align:left}
.log-time{font-size:22rpx;color: var(--cr-text-muted);display:block;margin-bottom:6rpx}
.log-desc{font-size:26rpx;color: var(--cr-text);display:block}

.empty{text-align:center;color: var(--cr-text-muted);margin-top:100rpx}

/* iOS Modal & HUD */
.ios-mask{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}.ios-mask.transparent{background:transparent;backdrop-filter:none}
.ios-modal-box{width:560rpx;background:rgba(255,255,255,0.95);border-radius:28rpx;overflow:hidden;backdrop-filter:blur(10px);animation:popUp 0.2s ease-out}
.modal-text{padding:40rpx 30rpx;text-align:center}.m-title{display:block;font-size:34rpx;font-weight:600;margin-bottom:20rpx}
.m-desc{color: var(--cr-text-muted);font-size:26rpx;}
.m-content-scroll{display:block;font-size:28rpx;color: var(--cr-text);text-align:left;max-height:400rpx;overflow-y:auto;line-height:1.5;background: var(--cr-surface-alt);padding:20rpx;border-radius:10rpx;}

.ship-area{width:100%;height:160rpx;background: var(--cr-surface-alt);border-radius:10rpx;padding:15rpx;box-sizing:border-box;font-size:28rpx;text-align:left}
.modal-footer{display:flex;border-top:1rpx solid rgba(0,0,0,0.1)}.m-btn{flex:1;height:90rpx;line-height:90rpx;text-align:center;font-size:34rpx;color:#007AFF}.m-btn:active{background:rgba(0,0,0,0.05)}.m-btn.confirm{border-right:1rpx solid rgba(0,0,0,0.1);font-weight:600}.m-btn.destructive{color:#FF3B30;font-weight:600}
.ios-hud{padding:30rpx;min-width:200rpx;background:rgba(30,30,30,0.85);backdrop-filter:blur(15px);border-radius:24rpx;display:flex;flex-direction:column;align-items:center}
.hud-text{color:#fff;font-size:28rpx;margin-top:10rpx}.hud-spinner{width:60rpx;height:60rpx;border:6rpx solid rgba(255,255,255,0.3);border-top:6rpx solid #fff;border-radius:50%;animation:iosSpin 1s linear infinite}.hud-success-mark{width:30rpx;height:50rpx;border-bottom:6rpx solid #fff;border-right:6rpx solid #fff;transform:rotate(45deg);margin-bottom:10rpx}.hud-error-mark{font-size:40rpx;color:#fff;border:4rpx solid #fff;border-radius:50%;width:60rpx;height:60rpx;text-align:center;line-height:52rpx}
@keyframes popUp{from{transform:scale(1.1);opacity:0}to{transform:scale(1);opacity:1}}@keyframes iosSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
</style>
