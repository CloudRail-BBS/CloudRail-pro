<template>
  <view class="market-section" :class="{ embedded }">
    <view class="search-bar-wrap">
      <view class="search-box">
        <view class="si-wrap">
          <view class="si-c"></view>
          <view class="si-s"></view>
        </view>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索好物"
          placeholder-class="search-ph"
          confirm-type="search"
          @confirm="onSearchConfirm"
        />
        <view v-if="keyword" class="search-clear" @click="clearSearch">
          <text>×</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-x class="cat-scroll" show-scrollbar="false">
      <view class="cat-list">
        <view class="cat-item" :class="{ active: activeCat === 0 }" @click="switchCat(0)">全部</view>
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="cat-item"
          :class="{ active: activeCat === cat.id }"
          @click="switchCat(cat.id)"
        >
          <text v-if="cat.icon">{{ cat.icon }}</text>
          <text>{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="goodsList.length > 0" class="goods-grid">
      <view class="goods-card" v-for="item in goodsList" :key="item.id" @click="goDetail(item.id)">
        <view class="img-wrapper">
          <image :src="item.image || '/static/logo.png'" class="g-img" mode="aspectFill" lazy-load></image>
          <view class="soldout-tag" v-if="Number(item.stock) <= 0">已售罄</view>
        </view>
        <view class="g-info">
          <text class="g-title">{{ item.title || '未命名商品' }}</text>
          <view class="g-bottom">
            <view class="price-box">
              <text class="currency">¥</text>
              <text class="num">{{ formatPrice(item.price) }}</text>
            </view>
            <view class="seller-box">
              <image :src="item.avatar || '/static/logo.png'" class="s-avatar" mode="aspectFill"></image>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text>暂无商品，快来发布吧</text>
    </view>

    <view style="height: 120rpx;"></view>
  </view>
</template>

<script>
import { request, baseUrl } from '../common/request.js'

export default {
  name: 'MarketShopSection',
  props: {
    embedded: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      goodsList: [],
      categories: [],
      activeCat: 0,
      keyword: '',
      loading: false,
      dbInited: false
    }
  },
  mounted() {
    this.ensureMarketDb()
    this.loadCategories()
    this.getList()
  },
  methods: {
    ensureMarketDb() {
      // Go API uses GORM auto-migration, no init_db needed
      this.dbInited = true
    },

    async loadCategories() {
      try {
        const res = await request('market.php', { action: 'get_categories' })
        if (res.code === 0) {
          const data = res.data
          this.categories = Array.isArray(data) ? data : (data && data.list) || []
        }
      } catch (e) {}
    },

    async getList() {
      this.loading = true
      try {
        const data = { action: 'get_list' }
        if (this.activeCat > 0) data.category_id = this.activeCat
        if (this.keyword.trim()) data.keyword = this.keyword.trim()
        const res = await request('market.php', data)
        if (res.code === 0) this.goodsList = Array.isArray(res.data) ? res.data : ((res.data && res.data.list) || [])
      } catch (e) {
        this.goodsList = []
      } finally {
        this.loading = false
      }
    },

    switchCat(catId) {
      const nextId = Number(catId || 0)
      if (this.activeCat === nextId) return
      this.activeCat = nextId
      this.getList()
    },

    onSearchConfirm() {
      this.getList()
    },

    clearSearch() {
      this.keyword = ''
      this.getList()
    },

    goDetail(id) {
      if (!id) return
      uni.navigateTo({ url: '/pages/market/detail?id=' + id })
    },

    formatPrice(value) {
      const num = Number(value || 0)
      return Number.isFinite(num) ? num.toFixed(2).replace(/\.00$/, '') : '0'
    }
  }
}
</script>

<style scoped>
.market-section {
  min-height: 100%;
  background: #f7f8fa;
}

.market-section.embedded {
  padding-bottom: 18rpx;
}

.search-bar-wrap {
  padding: 16rpx 24rpx 0;
  background: #fff;
}

.search-box {
  display: flex;
  align-items: center;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 20rpx;
}

.si-wrap {
  position: relative;
  width: 30rpx;
  height: 30rpx;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.si-c {
  width: 18rpx;
  height: 18rpx;
  border: 2rpx solid #aaa;
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 0;
}

.si-s {
  width: 2rpx;
  height: 9rpx;
  background: #aaa;
  position: absolute;
  bottom: 0;
  right: 4rpx;
  transform: rotate(-45deg);
  border-radius: 2rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  background: transparent;
}

.search-ph {
  color: #bbb;
  font-size: 28rpx;
}

.search-clear {
  width: 36rpx;
  height: 36rpx;
  background: #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-clear text {
  color: #fff;
  font-size: 24rpx;
  line-height: 1;
}

.cat-scroll {
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.cat-list {
  display: flex;
  flex-direction: row;
  padding: 16rpx 20rpx;
  white-space: nowrap;
}

.cat-item {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 28rpx;
  margin-right: 12rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  border-radius: 30rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.cat-item.active {
  background: #1d1d1f;
  color: #fff;
  font-weight: 600;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  padding: 20rpx;
  box-sizing: border-box;
}

.goods-card {
  background: #fff;
  border-radius: 18rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.goods-card:active {
  opacity: 0.9;
}

.img-wrapper {
  position: relative;
  width: 100%;
  height: 220rpx;
  background: #f2f4f7;
  overflow: hidden;
}
.soldout-tag {
  position: absolute;
  left: 0; top: 0;
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 20rpx; font-weight: 600;
  padding: 6rpx 14rpx;
  border-radius: 0 0 14rpx 0;
  z-index: 2;
}

.g-img {
  width: 100%;
  height: 100%;
  display: block;
}

.g-info {
  padding: 16rpx;
}

.g-title {
  font-size: 26rpx;
  color: #1d1d1f;
  font-weight: 500;
  line-height: 1.4;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 72rpx;
}

.g-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
}

.price-box {
  display: flex;
  align-items: baseline;
  color: #ff2442;
  font-weight: 700;
  min-width: 0;
}

.currency {
  font-size: 22rpx;
  margin-right: 4rpx;
}

.num {
  font-size: 30rpx;
}

.seller-box {
  display: flex;
  align-items: center;
}

.s-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #eee;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 180rpx;
  font-size: 28rpx;
}

@media screen and (max-width: 375px) {
  .goods-grid {
    padding: 16rpx;
    gap: 14rpx;
  }

  .img-wrapper {
    height: 200rpx;
  }
}
</style>
