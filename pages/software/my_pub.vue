<template>
  <view class="manage-container" :class="themeClass">
    <view class="nav-bar-fixed">
      <view :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content">
        <view class="nav-btn" @click="goBack"><image src="/static/icon/fanhui.png" class="nav-icon"></image></view>
        <text class="nav-title">管理软件</text>
        <view class="nav-btn"></view>
      </view>
    </view>
    <view :style="{ height: (statusBarHeight + 44) + 'px' }"></view>

    <view class="list">
      <view class="item" v-for="item in list" :key="item.id">
        <image :src="item.logo || '/static/logo.png'" class="i-logo" mode="aspectFill"></image>
        <view class="i-info" @click="goDetail(item.id)">
          <text class="i-title">{{ item.name }}</text>
          <view class="i-meta-row">
            <text class="i-meta">{{ item.category_name || '未分类' }}</text>
            <text class="i-meta">v{{ item.version || '-' }}</text>
            <text class="i-meta">{{ item.size || '-' }}</text>
          </view>
          <text class="i-status" :class="'s-' + item.status">{{ statusText(item.status) }}</text>
        </view>
        <view class="i-act">
          <view class="act-btn" @click="editItem(item.id)">编辑</view>
          <view v-if="parseInt(item.status) === 1" class="act-btn" @click="setStatus(item.id, 'off_shelf')">下架</view>
          <view v-else class="act-btn" @click="setStatus(item.id, 'relist')">上架</view>
          <view class="act-btn del" @click="deleteItem(item.id)">删除</view>
        </view>
      </view>
      <view v-if="list.length === 0" class="empty">暂无发布记录</view>
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
import { request } from '../../common/request.js'
import XhsConfirm from '../../components/XhsConfirm.vue'

export default {
  components: {
    XhsConfirm
  },
  data() {
    return {
      statusBarHeight: 20,
      list: [],
      confirmDialog: {
        visible: false,
        title: '',
        message: '',
        confirmText: '确定',
        cancelText: '取消',
        resolve: null
      }
    }
  },
  onLoad() {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
  },
  onShow() {
    this.loadList()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async loadList() {
      try {
        const res = await request('software.php', { action: 'my_pub' })
        if (res.code === 0) {
          this.list = Array.isArray(res.data) ? res.data : []
        } else {
          uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络异常', icon: 'none' })
      }
    },
    statusText(status) {
      const map = {
        0: '已下架',
        1: '已上架',
        2: '待审核'
      }
      return map[parseInt(status)] || '状态异常'
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/software/detail?id=' + id })
    },
    editItem(id) {
      uni.navigateTo({ url: '/pages/software/publish?id=' + id })
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
        }
      })
    },
    closeConfirmDialog(result) {
      const resolve = this.confirmDialog.resolve
      this.confirmDialog = {
        visible: false,
        title: '',
        message: '',
        confirmText: '确定',
        cancelText: '取消',
        resolve: null
      }
      if (resolve) resolve(result)
    },
    handleConfirmOk() {
      this.closeConfirmDialog(true)
    },
    handleConfirmCancel() {
      this.closeConfirmDialog(false)
    },
    async setStatus(id, action) {
      try {
        const res = await request('software.php', { action, id })
        uni.showToast({ title: res.msg || '操作完成', icon: 'none' })
        if (res.code === 0) this.loadList()
      } catch (e) {
        uni.showToast({ title: e.msg || '网络异常', icon: 'none' })
      }
    },
    async deleteItem(id) {
      const ok = await this.showConfirmDialog({
        title: '确认删除',
        message: '删除后不可恢复，确定继续吗？',
        confirmText: '删除'
      })
      if (!ok) return
      try {
        const ret = await request('software.php', { action: 'delete', id })
        uni.showToast({ title: ret.msg || '操作完成', icon: 'none' })
        if (ret.code === 0) this.loadList()
      } catch (e) {
        uni.showToast({ title: e.msg || '网络异常', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.manage-container { background: var(--cr-surface-alt); min-height: 100vh; }
.nav-bar-fixed { position: fixed; top: 0; left: 0; width: 100%; background: var(--cr-surface); z-index: 99; border-bottom: 1rpx solid var(--cr-border); }
.nav-content { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; }
.nav-btn { width: 60rpx; height: 100%; display: flex; align-items: center; }
.nav-icon { width: 44rpx; height: 44rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; }
.list { padding: 20rpx; }
.item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 22rpx;
  margin-bottom: 18rpx;
  border-radius: 18rpx;
  background: var(--cr-surface);
}
.i-logo {
  width: 126rpx;
  height: 126rpx;
  border-radius: 26rpx;
  background: #eee;
  margin-right: 20rpx;
}
.i-info {
  flex: 1;
  min-width: 0;
}
.i-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--cr-text);
}
.i-meta-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 10rpx;
}
.i-meta {
  font-size: 22rpx;
  color: var(--cr-text-muted);
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: var(--cr-surface-alt);
}
.i-status {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
}
.s-0 { color: var(--cr-text-muted); }
.s-1 { color: #52c41a; }
.s-2 { color: #ff9500; }
.i-act {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-left: 20rpx;
}
.act-btn {
  min-width: 104rpx;
  text-align: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--cr-border);
  font-size: 22rpx;
  color: var(--cr-text);
}
.act-btn.del {
  color: #ff3b30;
  border-color: #ff3b30;
}
.empty {
  text-align: center;
  color: var(--cr-text-muted);
  margin-top: 120rpx;
  font-size: 28rpx;
}
</style>
