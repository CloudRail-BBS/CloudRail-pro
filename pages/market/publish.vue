<template>
  <view class="page-container" :class="themeClass">

    <view class="nav-bar-fixed">
        <view :style="{ height: statusBarHeight + 'px' }"></view>
        <view class="nav-content">
            <view class="nav-btn left" @click="handleBack">
                <image src="/static/icon/fanhui.png" class="nav-icon"></image>
            </view>
            <text class="nav-title">{{ isEdit ? '编辑商品' : '发布商品' }}</text>
            <view class="nav-btn right"></view>
        </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>
    <view class="scroll-content">
        
        <view class="section-card upload-section">
            <view class="image-wrapper" @click="uploadImg" :class="{ 'has-img': images.length > 0 }">
                <scroll-view scroll-x class="images-scroll" v-if="images.length > 0">
                    <view class="image-item" v-for="(img, idx) in images" :key="idx" @click.stop="">
                        <image :src="img" mode="aspectFill" class="uploaded-img"></image>
                        <view class="delete-btn" @click="deleteImage(idx)">×</view>
                    </view>
                    <view v-if="images.length < maxProductImages" class="add-more-btn" @click.stop="uploadImg">
                        <text class="plus-symbol">+</text>
                    </view>
                </scroll-view>
                <view v-else class="placeholder-box">
                    <view class="icon-circle">
                        <text class="plus-symbol">+</text>
                    </view>
                    <text class="tip-text">添加商品图片</text>
                    <text class="sub-tip">最多可上传 {{ maxProductImages }} 张</text>
                </view>
            </view>
        </view>
        <view class="section-card form-section">
            <view class="input-row">
                <input 
                    class="main-input" 
                    v-model="title" 
                    placeholder="品牌型号 宝贝名称" 
                    placeholder-class="ph-style" 
                    maxlength="40"
                />
            </view>
            <view class="divider"></view>
            <view class="input-row">
                <textarea 
                    class="desc-input" 
                    v-model="content" 
                    placeholder="描述一下宝贝的转手原因、入手渠道和新旧程度..." 
                    placeholder-class="ph-style" 
                    maxlength="500"
                    :disable-default-padding="true"
                    :show-confirm-bar="false"
                ></textarea>
                <text class="word-counter">{{ content.length }}/500</text>
            </view>
        </view>
        <view class="section-card price-section">
            <view class="price-row">
                <view class="label-wrap">
                    <image src="/static/icon/shop.png" class="label-icon"></image>
                    <text class="label-text">出售价格</text>
                </view>
                <view class="price-input-wrap">
                    <text class="currency-symbol">￥</text>
                    <input
                        type="digit"
                        class="price-input"
                        v-model="price"
                        placeholder="0.00"
                        placeholder-class="ph-price"
                    />
                </view>
            </view>
        </view>


        <view class="section-card extra-section">
            <view class="extra-row">
                <text class="extra-label">商品类型</text>
                <view class="type-radio-group">
                    <view class="type-radio" :class="{selected: product_type===1}" @click="product_type=1">实体商品</view>
                    <view class="type-radio" :class="{selected: product_type===0}" @click="product_type=0">虚拟商品</view>
                </view>
            </view>
            <view class="divider"></view>

            <view class="extra-row">
                <text class="extra-label">商品份数/库存</text>
                <view class="stock-input-wrap">
                    <input class="stock-input" type="number" v-model="stock" placeholder="0" placeholder-class="ph-style" />
                </view>
            </view>
            <view class="extra-row v-tip-row" v-if="product_type===0">
                <text class="extra-label v-tip">份数按下方卡密条数自动计算</text>
            </view>

            <view class="divider"></view>

            <view class="cards-block" v-if="product_type===0">
                <view class="cards-head">
                    <text class="cards-label">卡密内容（每行一个）</text>
                    <text class="cards-count">{{ cardsCount }} 份</text>
                </view>
                <textarea
                    class="cards-input"
                    v-model="cards"
                    placeholder="每行填写一个卡密/兑换码，买家付款后自动发货"
                    placeholder-class="ph-style"
                    maxlength="2000"
                    :disable-default-padding="true"
                    :show-confirm-bar="false"
                ></textarea>
            </view>

            <view class="divider"></view>
            <view class="extra-row" @click="openCatPicker">
                <text class="extra-label">选择分类</text>
                <view class="cat-pick-right">
                    <text class="cat-pick-val">{{ selectedCatName }}</text>
                    <text class="arrow-right">›</text>
                </view>
            </view>
        </view>


        <view class="bottom-spacer"></view>
    </view>

    <view
      class="cat-sheet-mask"
      :class="{ show: showCatSheet }"
      @tap="closeCatSheet"
    >
      <view class="cat-sheet-panel" @tap.stop="">
        <view class="cat-sheet-title-bar">
          <text class="cat-sheet-title">选择分类</text>
        </view>
        <scroll-view scroll-y class="cat-sheet-scroll">
          <view
            v-for="(cat, idx) in catPickerRange"
            :key="cat.id"
            class="cat-sheet-item"
            :class="{
              'cat-first': idx === 0,
              'cat-active': category_id === cat.id
            }"
            @tap="selectCat(cat)"
          >
            <text>{{ (cat.icon ? cat.icon + ' ' : '') + cat.name }}</text>
            <view v-if="category_id === cat.id" class="cat-check"></view>
          </view>
        </scroll-view>
        <view class="cat-sheet-gap"></view>
        <view class="cat-sheet-cancel" @tap="closeCatSheet">
          <text>取消</text>
        </view>
      </view>
    </view>

    <view class="bottom-fixed-area">
        <view class="pub-btn" @click="submit" :class="{ disabled: uploading || !canSubmit }">
            <view v-if="uploading" class="loading-ring"></view>
            <text>{{ uploading ? (isEdit ? '保存中...' : '发布中...') : (isEdit ? '保存修改' : '确认发布') }}</text>
        </view>
    </view>

    <view class="ios-mask transparent" v-if="hud.visible" @touchmove.stop.prevent>
        <view class="ios-hud">
            <view v-if="hud.type === 'loading'" class="hud-spinner"></view>
            <view v-if="hud.type === 'success'" class="hud-success-mark"></view>
            <view v-if="hud.type === 'error'" class="hud-error-mark">!</view>
            <text v-if="hud.text" class="hud-text">{{ hud.text }}</text>
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
import { baseUrl, request, uploadFile } from '../../common/request.js';
import XhsConfirm from '../../components/XhsConfirm.vue';

export default {
    components: { XhsConfirm },
    data() {
        return {
            statusBarHeight: 20,
            

            token: '',
            isLogin: false,

            title: '',
            content: '',
            price: '',
            stock: '',
            cards: '',
            editId: 0,
            isEdit: false,
            image: '',
            images: [],
            maxProductImages: 9,
            product_type: 1,
            category_id: 0,
            categories: [],
            catPickerRange: [{ id: 0, name: '未分类' }],
            catPickerIndex: 0,
            showCatPicker: false,
            showCatSheet: false,
            uploading: false,
            submitSuccess: false,
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
    computed: {
        canSubmit() {
            const base = this.title.length > 0 && this.content.length > 0 && this.price.length > 0 && this.images.length > 0;
            if (!base) return false;
            return this.product_type === 1 ? parseInt(this.stock) > 0 : this.cardsCount > 0;
        },
        cardsCount() {
            return this.cards ? this.cards.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean).length : 0;
        },
        selectedCatName() {
            if (!this.category_id) return '未分类';
            const c = this.categories.find(x => x.id == this.category_id);
            return c ? ((c.icon ? c.icon + ' ' : '') + c.name) : '未分类';
        }
    },
    onLoad(options) {
        const sys = uni.getSystemInfoSync();
        this.statusBarHeight = sys.statusBarHeight || 20;
        this.checkLoginState();
        this.loadRuntimeConfig();
        this.loadCategories();
        if (options && options.id) {
            this.editId = Number(options.id);
            this.isEdit = true;
            this.loadProduct(this.editId);
        }
    },
    onShow() {
     
        this.checkLoginState();
        if (!this.isLogin) {
            this.requireLogin();
        }
    },
    onBackPress(e) {
        if (e.from === 'navigateBack') return false;
        if (this.hasUnsavedChanges()) {
            this.askExit();
            return true; 
        }
    },
    methods: {
    
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

        async loadCategories() {
            try {
                const res = await request('market.php', { action: 'get_categories' });
                if (res.code === 0) {
                    this.categories = (res.data && res.data.list) || [];
                    this.catPickerRange = [{ id: 0, name: '未分类' }, ...this.categories];
                }
            } catch (e) {}
        },

        async loadRuntimeConfig() {
            try {
                const res = await request('market.php', { action: 'get_runtime_config' });
                if (res && res.code === 0 && res.data) {
                    const n = parseInt(res.data.max_product_images ?? 9);
                    this.maxProductImages = Math.min(99, Math.max(1, n || 9));
                    if (this.images.length > this.maxProductImages) {
                        this.images = this.images.slice(0, this.maxProductImages);
                        this.image = this.images[0] || '';
                    }
                    return true;
                }
            } catch (e) {}
            return false;
        },

        openCatPicker() {
            this.showCatSheet = true;
        },

        selectCat(cat) {
            this.category_id = cat ? cat.id : 0;
            this.showCatSheet = false;
        },

        closeCatSheet() {
            this.showCatSheet = false;
        },

        onCatChange(e) {
            const picked = this.catPickerRange[e.detail.value];
            this.category_id = picked ? picked.id : 0;
        },

        requireLogin() {
            uni.showToast({ title: '请先登录', icon: 'none' });
            setTimeout(() => {
                uni.navigateTo({ url: '/pages/login/login' });
            }, 1000);
        },

        normalizeHudText(text, type = 'loading') {
            if (typeof text === 'string') {
                const trimmed = text.trim();
                if (trimmed) return trimmed;
            }
            if (typeof text === 'number') {
                return String(text);
            }
            if (text && typeof text === 'object') {
                const msg = text.msg || text.message || text.error;
                if (typeof msg === 'string' && msg.trim()) {
                    return msg.trim();
                }
            }
            if (type === 'success') return '操作成功';
            if (type === 'error') return '操作失败';
            return '处理中...';
        },
        showHud(text, type = 'loading') {
            this.hud = { visible: true, text: this.normalizeHudText(text, type), type };
            if (type !== 'loading') {
                setTimeout(() => { this.hud.visible = false; }, 1500);
            }
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
        hideHud() {
            this.hud.visible = false;
        },
        hasUnsavedChanges() {
            return (this.title || this.content || this.price || this.images.length > 0) && !this.submitSuccess;
        },
        async askExit() {
            if (this.confirmDialog.visible) return;
            const ok = await this.showConfirmDialog({
                title: '确定退出吗？',
                message: '内容尚未发布，退出后数据将丢失且无法恢复。',
                confirmText: '退出'
            });
            if (ok) this.confirmExit();
        },
        handleBack() {
            if (this.hasUnsavedChanges()) {
                this.askExit();
            } else {
                uni.navigateBack();
            }
        },
        async confirmExit() {
            if (this.images.length > 0) {
                this.showHud('清理中...', 'loading');
                for (let img of this.images) {
                    await this.deleteServerImage(img);
                }
                this.hideHud();
            }
            uni.navigateBack();
        },
        async deleteServerImage(url) {
            try {
                await request('market.php', { action: 'delete_file', url: url });
                return true;
            } catch (e) {
                return false;
            }
        },
        deleteImage(index) {
            this.deleteServerImage(this.images[index]);
            this.images.splice(index, 1);
        },
        async loadProduct(id) {
            if (!this.isLogin) return;
            try {
                const res = await request('market.php', { action: 'my_product_detail', id: id });
                if (res.code === 0 && res.data) {
                    const d = res.data;
                    this.title = d.title || '';
                    this.content = d.description || '';
                    this.price = String(d.price || '');
                    this.images = (d.images && d.images.length) ? d.images.slice() : [];
                    this.image = this.images[0] || '';
                    this.product_type = d.type === 'virtual' ? 0 : 1;
                    this.category_id = d.category_id || 0;
                    this.stock = this.product_type === 1 ? String(d.stock || '') : '';
                    this.cards = (d.cards && d.cards.length) ? d.cards.join('\n') : '';
                } else if (res.code === -2) {
                    this.requireLogin();
                }
            } catch (e) {}
        },
        async uploadImg() {
            if (!this.isLogin) return this.requireLogin();
            this.loadRuntimeConfig().catch(() => {});
            if (this.uploading) return;
            if (this.images.length >= this.maxProductImages) {
                return this.showHud('最多上传 ' + this.maxProductImages + ' 张图片', 'error');
            }
            
            uni.chooseImage({
                count: Math.min(10, this.maxProductImages - this.images.length),
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: async (res) => {
                    const remain = this.maxProductImages - this.images.length;
                    const files = (res.tempFilePaths || []).slice(0, remain);
                    for (let filePath of files) {
                        if (this.images.length >= this.maxProductImages) break;
                        await this.doUpload(filePath);
                    }
                }
            });
        },
        doUpload(filePath) {
            if (this.images.length >= this.maxProductImages) return Promise.resolve(false);

            this.uploading = true;
            this.showHud('上传中...');
            // 复用通用上传封装：自动拼正确地址 upload/image、带 token 与 X-Api-Key
            return uploadFile({ filePath, type: 'product', extraFormData: { current_count: this.images.length } })
                .then((d) => {
                    const url = (d && d.url) || (d && d.path) || '';
                    if (url && this.images.length < this.maxProductImages) {
                        this.images.push(url);
                        if (this.images.length === 1) this.image = url;
                    } else if (url) {
                        this.deleteServerImage(url);
                    }
                    this.hideHud();
                    return true;
                })
                .catch((e) => {
                    this.showHud((e && e.msg) || '上传失败', 'error');
                    return false;
                })
                .finally(() => { this.uploading = false; });
        },
        async submit() {
            if (!this.isLogin) return this.requireLogin();
            if (this.uploading) return;
            if (this.images.length === 0) return this.showHud('请上传商品图片', 'error');
            if (!this.title.trim()) return this.showHud('请输入标题', 'error');
            if (!this.content.trim()) return this.showHud('请输入描述', 'error');
            if (!this.price || parseFloat(this.price) <= 0) return this.showHud('请输入价格', 'error');
            if (this.images.length > this.maxProductImages) return this.showHud('最多上传 ' + this.maxProductImages + ' 张图片', 'error');
            if (this.product_type === 1 && parseInt(this.stock) <= 0) return this.showHud('请输入商品份数', 'error');
            if (this.product_type === 0 && this.cardsCount === 0) return this.showHud('请至少填写一份卡密', 'error');

            this.uploading = true;
            this.showHud('发布中...');
            try {
                const params = {
                    title: this.title,
                    content: this.content,
                    price: this.price,
                    image: this.images[0],
                    images: this.images.join(','),
                    product_type: this.product_type,
                    category_id: this.category_id,
                    description: this.content,
                    stock: this.product_type === 1 ? this.stock : '',
                    cards: this.product_type === 0 ? this.cards : ''
                };
                params.action = this.editId ? 'update' : 'publish';
                if (this.editId) params.id = this.editId;
                const res = await request('market.php', params);
                this.uploading = false;
                if (res.code === 0) {
                    this.submitSuccess = true;
                    this.showHud((this.isEdit ? '保存成功' : '发布成功'), 'success');
                    setTimeout(() => { uni.redirectTo({ url: '/pages/market/my_pub' }); }, 1500);
                } else if (res.code === -2) {
                    this.showHud('登录已过期', 'error');
                    setTimeout(() => { uni.redirectTo({ url: '/pages/login/login' }); }, 1500);
                } else {
                    this.showHud(res.msg, 'error');
                }
            } catch (e) {
                this.uploading = false;
                this.showHud('网络错误', 'error');
            }
        }
    }
}
</script>

<style scoped>
/* 椤甸潰瀹瑰櫒 */
.page-container { background-color: var(--cr-surface-alt); min-height: 100vh; display: flex; flex-direction: column; }

/* 瀵艰埅鏍?*/
.nav-bar-fixed { position: fixed; top: 0; left: 0; width: 100%; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px); z-index: 999; border-bottom: 1rpx solid rgba(0,0,0,0.05); }
.nav-content { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; }
.nav-btn { width: 80rpx; height: 100%; display: flex; align-items: center; }
.nav-icon { width: 44rpx; height: 44rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: var(--cr-text); }

/* 鍐呭鍖?*/
.scroll-content { flex: 1; padding: 30rpx; box-sizing: border-box; }
.section-card { background: var(--cr-surface); border-radius: 24rpx; overflow: hidden; margin-bottom: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.02); }

/* 涓婁紶鍖?*/
.upload-section { height: 400rpx; display: flex; align-items: center; justify-content: center; position: relative; }
.image-wrapper { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; }
.uploaded-img { width: 100%; height: 100%; }
.placeholder-box { display: flex; flex-direction: column; align-items: center; }
.icon-circle { width: 90rpx; height: 90rpx; background: var(--cr-surface-alt); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.plus-symbol { font-size: 50rpx; color: var(--cr-text-muted); font-weight: 300; margin-top: -6rpx; }
.tip-text { font-size: 30rpx; font-weight: 600; color: var(--cr-text); margin-bottom: 8rpx; }
.sub-tip { font-size: 24rpx; color: var(--cr-text-muted); }
.replace-mask { position: absolute; bottom: 0; left: 0; width: 100%; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); padding: 20rpx 0; text-align: center; }
.replace-mask text { color: #fff; font-size: 24rpx; font-weight: 500; }

/* 琛ㄥ崟 */
.form-section { padding: 0 30rpx; }
.input-row { padding: 30rpx 0; position: relative; }
.main-input { height: 60rpx; font-size: 34rpx; font-weight: bold; color: var(--cr-text); width: 100%; }
.divider { height: 1rpx; background: var(--cr-surface-alt); transform: scaleY(0.5); }
.desc-input { width: 100%; height: 240rpx; font-size: 30rpx; line-height: 1.6; color: var(--cr-text); }
.ph-style { color: var(--cr-text-muted); font-weight: 400; }
.word-counter { position: absolute; bottom: 10rpx; right: 0; font-size: 22rpx; color: var(--cr-border-strong); }

/* 浠锋牸 */
.price-section { padding: 0 30rpx; }
.price-row { display: flex; align-items: center; justify-content: space-between; height: 120rpx; }
.label-wrap { display: flex; align-items: center; }
.label-icon { width: 36rpx; height: 36rpx; margin-right: 16rpx; }
.label-text { font-size: 30rpx; font-weight: 600; color: var(--cr-text); }
.price-input-wrap { display: flex; align-items: center; }
.currency-symbol { font-size: 36rpx; font-weight: bold; color: #FF2442; margin-right: 10rpx; }
.price-input { width: 200rpx; text-align: right; font-size: 40rpx; font-weight: bold; color: #FF2442; height: 60rpx; }
.ph-price { font-size: 32rpx; color: #DDD; font-weight: 400; }

/* 搴曢儴鎸夐挳 */
.bottom-spacer { height: calc(140rpx + env(safe-area-inset-bottom)); width: 100%; }

/* 鍟嗗搧绫诲瀷 & 鍒嗙被 */
.extra-section { padding: 0 30rpx; }
.extra-row { display: flex; align-items: center; justify-content: space-between; height: 96rpx; }
.extra-label { font-size: 30rpx; font-weight: 600; color: var(--cr-text); }
.type-radio-group { display: flex; gap: 16rpx; }
.type-radio { padding: 10rpx 28rpx; border-radius: 30rpx; font-size: 26rpx; color: var(--cr-text-muted); background: #F5F5F5; border: 2rpx solid transparent; }
.type-radio.selected { background: #1D1D1F; color: #fff; }
.tip-virtual { font-size: 24rpx; color: #FF8C00; background: #FFF8EE; padding: 12rpx 20rpx; border-radius: 10rpx; margin-bottom: 10rpx; }
.cat-pick-right { display: flex; align-items: center; }
.cat-pick-val { font-size: 28rpx; color: var(--cr-text-muted); margin-right: 8rpx; }
.arrow-right { font-size: 36rpx; color: var(--cr-border-strong); }
.bottom-fixed-area {
    position: fixed; bottom: 0; left: 0; width: 100%;
    background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px);
    z-index: 99; box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.03);
    padding: 20rpx 40rpx; box-sizing: border-box;
    padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
.pub-btn {
    width: 100%; height: 88rpx; line-height: 88rpx;
    background: linear-gradient(135deg, #FF2442 0%, #FF5060 100%);
    color: #fff; text-align: center; border-radius: 44rpx;
    font-size: 32rpx; font-weight: 600; letter-spacing: 2rpx;
    box-shadow: 0 10rpx 20rpx rgba(255, 36, 66, 0.25);
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.pub-btn:active { transform: scale(0.98); opacity: 0.9; }
.pub-btn.disabled { background: #E0E0E0; color: #999; box-shadow: none; pointer-events: none; }
.loading-ring {
    width: 32rpx; height: 32rpx; border: 4rpx solid rgba(255,255,255,0.3);
    border-top: 4rpx solid #fff; border-radius: 50%; margin-right: 12rpx;
    animation: iosSpin 0.8s linear infinite;
}

/* Modal */
.ios-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.ios-mask.transparent { background: transparent; backdrop-filter: none; }
.ios-modal-box { width: 560rpx; background: rgba(255,255,255,0.95); border-radius: 28rpx; overflow: hidden; backdrop-filter: blur(10px); animation: popUp 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-text { padding: 40rpx 30rpx; text-align: center; }
.m-title { display: block; font-size: 34rpx; font-weight: 600; color: #000; margin-bottom: 10rpx; }
.m-desc { display: block; font-size: 26rpx; color: var(--cr-text-muted); line-height: 1.4; }
.modal-footer { display: flex; border-top: 1rpx solid rgba(0,0,0,0.1); }
.m-btn { flex: 1; height: 90rpx; line-height: 90rpx; text-align: center; font-size: 34rpx; color: #007AFF; }
.m-btn:active { background: rgba(0,0,0,0.05); }
.m-btn.confirm { border-left: 1rpx solid rgba(0,0,0,0.1); font-weight: 600; }
.m-btn.destructive { color: #FF3B30; }

/* HUD 鏍峰紡 */
.ios-hud {
    padding: 30rpx 34rpx; min-width: 220rpx; max-width: 420rpx;
    background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(15px);
    border-radius: 24rpx; display: flex; flex-direction: column;
    align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out;
}
.hud-text {
    display: block;
    max-width: 352rpx;
    margin-top: 14rpx;
    font-size: 28rpx;
    line-height: 1.45;
    color: #fff;
    font-weight: 500;
    text-align: center;
    white-space: normal;
    word-break: break-all;
}

/* 绾疌SS缁樺埗鍥炬爣 */
/* 1. Loading */
.hud-spinner {
    width: 60rpx; height: 60rpx;
    border: 6rpx solid rgba(255,255,255,0.3); border-top: 6rpx solid #fff;
    border-radius: 50%; animation: iosSpin 1s linear infinite; margin-bottom: 20rpx;
}
/* 2. Success 瀵瑰嬀 */
.hud-success-mark {
    width: 30rpx; height: 50rpx;
    border-bottom: 6rpx solid #fff; border-right: 6rpx solid #fff;
    transform: rotate(45deg); margin-bottom: 24rpx; margin-top: -10rpx;
}
/* 3. Error 鎰熷徆鍙?*/
.hud-error-mark {
    width: 60rpx; height: 60rpx;
    border: 4rpx solid #fff; border-radius: 50%;
    color: #fff; font-size: 40rpx; font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20rpx;
}

@keyframes popUp { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes iosSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* 鍒嗙被閫夋嫨寮瑰眰 */
.cat-sheet-mask {
  position: fixed; inset: 0; z-index: 6000;
  background: rgba(0,0,0,0); pointer-events: none;
  transition: background 0.2s ease;
}
.cat-sheet-mask.show {
  background: rgba(0,0,0,0.36); pointer-events: auto;
}
.cat-sheet-panel {
  position: absolute; left: 20rpx; right: 20rpx;
  bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  transform: translateY(120%);
  transition: transform 0.22s ease;
}
.cat-sheet-mask.show .cat-sheet-panel {
  transform: translateY(0);
}
.cat-sheet-title-bar {
  background: var(--cr-surface);
  border-top-left-radius: 24rpx; border-top-right-radius: 24rpx;
  padding: 24rpx 0 20rpx;
  display: flex; align-items: center; justify-content: center;
  border-bottom: 1rpx solid #f1f2f4;
}
.cat-sheet-title {
  font-size: 24rpx; color: var(--cr-text-muted); font-weight: 500;
}
.cat-sheet-scroll {
  max-height: 480rpx; background: var(--cr-surface);
}
.cat-sheet-item {
  height: 96rpx; background: var(--cr-surface);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32rpx;
  border-bottom: 1rpx solid #f1f2f4;
}
.cat-sheet-item text { font-size: 30rpx; color: var(--cr-text); }
.cat-sheet-item.cat-active text { color: var(--cr-text); font-weight: 700; }
.cat-check {
  width: 36rpx; height: 36rpx; flex-shrink: 0;
  border: 4rpx solid #111827; border-radius: 50%;
  position: relative;
}
.cat-check::after {
  content: '';
  position: absolute; left: 7rpx; top: 3rpx;
  width: 12rpx; height: 20rpx;
  border-right: 4rpx solid #111827;
  border-bottom: 4rpx solid #111827;
  transform: rotate(45deg);
}
.cat-sheet-gap { height: 14rpx; }
.cat-sheet-cancel {
  height: 96rpx; background: var(--cr-surface); border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
}
.cat-sheet-cancel text { font-size: 30rpx; color: var(--cr-text); font-weight: 700; }

/* 澶氬浘涓婁紶鏍峰紡 */
.images-scroll { display: flex; padding: 30rpx 20rpx; }
.image-item { position: relative; width: 200rpx; height: 200rpx; margin-right: 20rpx; flex-shrink: 0; border-radius: 12rpx; overflow: hidden; }
.image-item .uploaded-img { width: 100%; height: 100%; }
.delete-btn { position: absolute; top: -10rpx; right: -10rpx; width: 50rpx; height: 50rpx; background: rgba(255, 52, 52, 0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 40rpx; font-weight: bold; }
.add-more-btn { width: 200rpx; height: 200rpx; margin-right: 20rpx; flex-shrink: 0; background: var(--cr-surface-alt); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.add-more-btn .plus-symbol { font-size: 50rpx; color: var(--cr-text-muted); }

</style>

