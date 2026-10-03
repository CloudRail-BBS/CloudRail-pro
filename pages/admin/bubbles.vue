<template>
  <view class="bubble-admin-page">
    <!-- 滚动容器高度就是屏幕高度; 状态栏留白放在滚动内容里, 避免底部被裁 -->
    <scroll-view class="main-scroll" scroll-y>
      <view class="status-spacer" :style="{ height: (statusBarHeight + 8) + 'px' }"></view>

      <view class="search-bar">
        <input class="search-input" type="text" v-model="keyword" placeholder="搜索气泡名称" confirm-type="search" />
        <view class="search-action" @click="applyFilter">搜索</view>
        <view class="add-btn" @click="openAdd">添加</view>
      </view>

      <view class="tab-bar">
        <view class="tab-item" :class="{ active: activeTab === 'all' }" @click="switchTab('all')"><text>全部</text></view>
        <view class="tab-item" :class="{ active: activeTab === 'online' }" @click="switchTab('online')"><text>已上架</text></view>
        <view class="tab-item" :class="{ active: activeTab === 'offline' }" @click="switchTab('offline')"><text>已下架</text></view>
      </view>

      <view class="list">
        <view class="list-item" v-for="item in filteredList" :key="item.id">
          <view class="item-header">
            <view class="preview-area">
              <view class="bubble-mini" :class="item.style_class" :style="itemStyle(item)">
                <text v-if="itemDeco(item, 'before')" class="bubble-deco" :style="itemDeco(item, 'before').style">{{ itemDeco(item, 'before').text }}</text>
                <text>Hello</text>
                <text v-if="itemDeco(item, 'after')" class="bubble-deco" :style="itemDeco(item, 'after').style">{{ itemDeco(item, 'after').text }}</text>
              </view>
            </view>
            <view class="item-info">
              <text class="item-name">
                {{ item.name }}
                <text v-if="item.is_custom" class="custom-tag">自定义</text>
              </text>
              <text class="item-meta">{{ item.price }} 积分 · 排序 {{ item.sort }} · {{ item.owners || 0 }} 人拥有</text>
              <text class="item-class">类名 .{{ item.style_class }}</text>
            </view>
            <view class="item-status" :class="'status-' + item.status">
              <text class="status-dot"></text>
              <text>{{ item.status === 1 ? '上架中' : '已下架' }}</text>
            </view>
          </view>

          <view class="item-actions">
            <view class="action-btn edit" @click="openEdit(item)"><text>编辑</text></view>
            <view class="action-btn online" v-if="item.status !== 1" @click="toggleStatus(item, 1)"><text>上架</text></view>
            <view class="action-btn offline" v-else @click="toggleStatus(item, 0)"><text>下架</text></view>
            <view class="action-btn delete" @click="removeItem(item)"><text>删除</text></view>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="filteredList.length === 0 && !loading">
        <text class="empty-text">{{ keyword ? '没有匹配的气泡' : '还没有添加任何气泡' }}</text>
        <view class="empty-add-btn" @click="openAdd">+ 添加气泡</view>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal-mask" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingId ? '编辑气泡' : '添加气泡' }}</text>
          <view class="modal-close" @click="closeModal">×</view>
        </view>

        <scroll-view class="modal-scroll" scroll-y>
          <view class="form-item">
            <text class="form-label">气泡名称 *</text>
            <input class="form-input" type="text" v-model="form.name" maxlength="20" placeholder="例如：少女粉" />
          </view>

          <!-- 样式来源切换：内置样式 / 自定义代码 -->
          <view class="form-item">
            <text class="form-label">样式来源</text>
            <view class="mode-switch">
              <view class="mode-item" :class="{ active: mode === 'preset' }" @click="setMode('preset')">内置样式</view>
              <view class="mode-item" :class="{ active: mode === 'custom' }" @click="setMode('custom')">自定义代码</view>
            </view>
          </view>

          <!-- 预览 -->
          <view class="form-item">
            <text class="form-label">效果预览（实时）</text>
            <view class="preview-area big">
              <view class="bubble-mini" :class="effectiveClass" :style="previewStyle">
                <text v-if="previewSkin.before" class="bubble-deco" :style="previewSkin.before.style">{{ previewSkin.before.text }}</text>
                <text>Hello</text>
                <text v-if="previewSkin.after" class="bubble-deco" :style="previewSkin.after.style">{{ previewSkin.after.text }}</text>
              </view>
            </view>
            <text v-if="previewEmptyTip" class="code-tip">{{ previewEmptyTip }}</text>
          </view>

          <!-- 内置样式 -->
          <view class="form-item" v-if="mode === 'preset'">
            <text class="form-label">选择样式 *</text>
            <view class="style-grid">
              <view
                class="style-chip"
                v-for="s in styles"
                :key="s.value"
                :class="{ active: form.style_class === s.value }"
                @click="pickPreset(s.value)"
              >
                <view class="bubble-mini" :class="s.value"><text>Hello</text></view>
                <text class="style-label">{{ s.label }}</text>
              </view>
            </view>
          </view>

          <!-- 自定义代码 -->
          <view v-if="mode === 'custom'">
            <view class="form-item">
              <view class="code-head">
                <text class="form-label no-mb">自定义 CSS 代码 *</text>
                <view class="code-tools">
                  <text class="code-tool" @click="fillSample">插入示例</text>
                  <text class="code-tool" @click="form.custom_css = ''">清空</text>
                </view>
              </view>
              <textarea
                class="code-input"
                v-model="form.custom_css"
                placeholder=".bubble-my-color { background: linear-gradient(135deg,#ff9a9e,#fecfef); color:#7a2048; border-radius: 24rpx; }"
                maxlength="-1"
                auto-height
              />
              <text class="code-tip">
                类名不用手填，系统自动从代码里取：当前识别到
                <text class="auto-class">.{{ effectiveClass }}</text>
                （代码里没写类名时自动生成一个）。上面的「效果预览」边打字边变。
              </text>
            </view>
          </view>

          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">价格（积分）</text>
              <input class="form-input" type="number" v-model="form.price" placeholder="0" />
            </view>
            <view class="form-item half">
              <text class="form-label">排序（越小越前）</text>
              <input class="form-input" type="number" v-model="form.sort" placeholder="0" />
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">状态</text>
            <view class="form-select" @click="form.status = form.status === 1 ? 0 : 1">
              <text>{{ form.status === 1 ? '上架（用户可在商城看到）' : '下架（用户看不到）' }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="modal-footer">
          <view class="footer-btn cancel" @click="closeModal">取消</view>
          <view class="footer-btn confirm" @click="submitForm">{{ editingId ? '保存' : '添加' }}</view>
        </view>
      </view>
    </view>

    <!-- Toast -->
    <view class="hud-mask" v-if="hud.show">
      <view class="hud-toast">
        <view class="spinner" v-if="hud.type === 'loading'"></view>
        <text>{{ hud.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import { getScreenMetrics } from '../../common/screen.js'
import { ensureCustomBubbleCss, previewCustomBubbleCss, getBubbleSkins, bubbleSkinOf } from '../../common/bubble-style.js'

const PRESET_STYLES = [
  { value: 'bubble-default', label: '默认白' },
  { value: 'bubble-pink', label: '少女粉' },
  { value: 'bubble-neon', label: '霓虹青' },
  { value: 'bubble-sea', label: '深海蓝' },
  { value: 'bubble-gold', label: '土豪金' },
  { value: 'bubble-pixel', label: '像素风' },
  { value: 'bubble-rainbow', label: '彩虹渐变' },
  { value: 'bubble-mech', label: '机械绿' },
  { value: 'bubble-cloud', label: '云朵白' }
]

/**
 * 从自定义 CSS 代码里自动取类名（第一个类选择器），管理端不用手填。
 * 只认 `.xxx` 里以字母/下划线开头、后跟字母数字中划线下划线的；像 0.5s / .5 这种数值不会误判。
 * 找不到返回空串。
 */
function extractClassName(css) {
  const text = String(css || '')
  const matches = text.match(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)
  if (!matches || !matches.length) return ''
  const raw = matches[0].slice(1)
  return /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(raw) ? raw : ''
}

/** 随机兜底类名：代码里完全没写类名时用它 */
function genFallbackClass() {
  return 'bubble-custom-' + Math.floor(Math.random() * 900000 + 100000)
}

export default {
  data() {
    return {
      statusBarHeight: 0,
      keyword: '',
      activeTab: 'all',
      loading: false,
      list: [],
      styles: PRESET_STYLES.slice(),
      showModal: false,
      editingId: 0,
      mode: 'preset',
      /* 类名 -> {style, before, after}：列表预览一律用内联样式画，App 端插 <style> 不一定生效 */
      bubbleSkins: {},
      form: { name: '', style_class: 'bubble-default', custom_css: '', price: '0', sort: '0', status: 1 },
      hud: { show: false, text: '', type: 'loading' }
    }
  },
  computed: {
    filteredList() {
      let arr = this.list
      if (this.activeTab === 'online') arr = arr.filter(i => Number(i.status) === 1)
      else if (this.activeTab === 'offline') arr = arr.filter(i => Number(i.status) !== 1)
      const kw = this.keyword.trim().toLowerCase()
      if (kw) arr = arr.filter(i => String(i.name || '').toLowerCase().indexOf(kw) >= 0)
      return arr
    },
    /* 气泡实际用的样式类名：
       自定义模式下优先取代码里的类名（自动识别），代码里没写就用一个兜底类名；
       内置模式下就是选中的那个内置样式 */
    effectiveClass() {
      if (this.mode === 'custom') {
        const fromCss = extractClassName(this.form.custom_css)
        if (fromCss) return fromCss
        const cur = String(this.form.style_class || '').trim()
        if (cur && !PRESET_STYLES.some(s => s.value === cur)) return cur
        return 'bubble-custom'
      }
      return this.form.style_class || 'bubble-default'
    },
    /* 实时预览：把当前代码解析成可内联的皮肤，边打字边变（不依赖样式注入，任何端都有效） */
    previewSkin() {
      if (this.mode !== 'custom') return { style: '', before: null, after: null }
      return bubbleSkinOf(this.form.custom_css, this.effectiveClass)
    },
    previewStyle() {
      return this.previewSkin.style
    },
    previewEmptyTip() {
      if (this.mode !== 'custom') return ''
      if (!String(this.form.custom_css || '').trim()) return '把上面的 CSS 代码填进来，这里就能实时看到效果'
      if (!this.previewStyle) return '代码里没有解析到可预览的样式属性（支持的属性：背景/颜色/边框/圆角/阴影/字号/字重/内边距等）'
      return ''
    }
  },
  onLoad() {
    const metrics = getScreenMetrics()
    this.statusBarHeight = Number(metrics.statusBarHeight || 0)
    /* 列表预览也是用内联样式画的，进页面先拉一次最新皮肤 */
    ensureCustomBubbleCss(true).then(() => { this.bubbleSkins = getBubbleSkins() })
    this.loadData()
  },
  onUnload() {
    previewCustomBubbleCss('')
  },
  watch: {
    /* 边写边看：代码或类名一改就把预览样式重新注入一次
       （注入版支持 ::after 伪元素这种内联样式做不到的写法） */
    'form.custom_css'() {
      if (this.showModal && this.mode === 'custom') this.syncLivePreview()
    },
    effectiveClass() {
      if (this.showModal && this.mode === 'custom') this.syncLivePreview()
    }
  },
  methods: {
    showHud(text, type = 'loading') { this.hud = { show: true, text, type } },
    hideHud() { this.hud.show = false },
    toast(text) { uni.showToast({ title: text, icon: 'none' }) },
    applyFilter() { uni.hideKeyboard() },
    switchTab(t) { this.activeTab = t },

    async loadData() {
      this.loading = true
      try {
        const r = await request('bubbles.php', { action: 'get_bubbles' }, { method: 'GET' })
        if (r.code === 0) {
          this.list = (r.data && r.data.list) || []
          const st = (r.data && r.data.styles) || []
          if (st.length) this.styles = st
        } else {
          this.toast(r.msg || '加载失败')
        }
      } catch (e) {
        this.toast('网络错误')
      } finally {
        this.loading = false
      }
    },

    setMode(m) {
      this.mode = m
      if (m === 'custom') {
        /* 切到自定义时给个兜底类名，代码里写了类名会被自动识别覆盖掉 */
        const cur = String(this.form.style_class || '').trim()
        if (!cur || PRESET_STYLES.some(s => s.value === cur)) {
          this.form.style_class = genFallbackClass()
        }
      } else {
        const cur = String(this.form.style_class || '').trim()
        if (!PRESET_STYLES.some(s => s.value === cur)) this.form.style_class = 'bubble-default'
        previewCustomBubbleCss('')
      }
      this.syncLivePreview()
    },

    pickPreset(v) {
      this.form.style_class = v
    },

    /** 把当前代码注入到预览用的临时样式里（伪元素 ::after 这类内联样式做不到的写法靠它） */
    syncLivePreview() {
      if (this.mode !== 'custom') { previewCustomBubbleCss(''); return }
      const css = String(this.form.custom_css || '').trim()
      if (!css) { previewCustomBubbleCss(''); return }
      const cls = this.effectiveClass
      let hasSelector = false
      try {
        hasSelector = new RegExp('\\.' + cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(css)
      } catch (e) { hasSelector = false }
      previewCustomBubbleCss(hasSelector ? css : ('.' + cls + ' {\n' + css + '\n}'))
    },

    /* 列表里某个气泡的皮肤（内置和自定义都覆盖，统一走内联样式） */
    itemSkin(item) {
      if (!item) return null
      const cls = item.style_class
      if (this.bubbleSkins[cls]) return this.bubbleSkins[cls]
      return bubbleSkinOf(item.custom_css || '', cls)
    },
    itemStyle(item) {
      const s = this.itemSkin(item)
      return s && s.style ? s.style : ''
    },
    itemDeco(item, which) {
      const s = this.itemSkin(item)
      return s && s[which] ? s[which] : null
    },

    fillSample() {
      const cls = this.effectiveClass
      this.form.custom_css =
        '.' + cls + ' {\n' +
        '  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);\n' +
        '  color: #7a2048;\n' +
        '  border: 2rpx solid #ffd1dc;\n' +
        '  border-radius: 24rpx 24rpx 24rpx 6rpx;\n' +
        '}'
    },

    openAdd() {
      this.editingId = 0
      this.mode = 'preset'
      previewCustomBubbleCss('')
      this.form = {
        name: '',
        style_class: (this.styles[0] && this.styles[0].value) || 'bubble-default',
        custom_css: '',
        price: '0',
        sort: '0',
        status: 1
      }
      this.showModal = true
    },

    openEdit(item) {
      this.editingId = Number(item.id || 0)
      const custom = String(item.custom_css || '')
      const isPreset = PRESET_STYLES.some(s => s.value === item.style_class)
      this.mode = (!isPreset || custom) ? 'custom' : 'preset'
      let fallbackCls = item.style_class || 'bubble-default'
      /* 自定义模式下要有非内置的兜底类名（代码里写了类名会覆盖它） */
      if (this.mode === 'custom' && PRESET_STYLES.some(s => s.value === fallbackCls)) fallbackCls = genFallbackClass()
      this.form = {
        name: item.name || '',
        style_class: fallbackCls,
        custom_css: custom,
        price: String(item.price != null ? item.price : 0),
        sort: String(item.sort != null ? item.sort : 0),
        status: Number(item.status) === 1 ? 1 : 0
      }
      this.showModal = true
      this.$nextTick(() => this.syncLivePreview())
    },

    closeModal() {
      this.showModal = false
      this.editingId = 0
      previewCustomBubbleCss('')
    },

    async submitForm() {
      const name = String(this.form.name || '').trim()
      if (!name) return this.toast('请输入气泡名称')

      const isCustom = this.mode === 'custom'
      let cls = ''
      let css = String(this.form.custom_css || '').trim()
      if (isCustom) {
        if (!css) return this.toast('请填写自定义 CSS 代码')
        /* 类名从代码里自动识别；代码里没写类名就补上兜底类名，并把它包成选择器一起存下去 */
        cls = extractClassName(css)
        if (!cls) {
          const cur = String(this.form.style_class || '').trim()
          cls = (cur && !PRESET_STYLES.some(s => s.value === cur)) ? cur : genFallbackClass()
          css = '.' + cls + ' {\n' + css + '\n}'
        }
      }

      this.showHud(this.editingId ? '保存中...' : '添加中...')
      try {
        const payload = {
          action: this.editingId ? 'update' : 'create',
          name,
          style_class: isCustom ? cls : this.form.style_class,
          custom_css: isCustom ? css : '',
          price: Math.max(0, parseInt(this.form.price || '0', 10) || 0),
          sort: parseInt(this.form.sort || '0', 10) || 0,
          status: Number(this.form.status) === 1 ? 1 : 0
        }
        if (this.editingId) payload.id = this.editingId
        const r = await request('bubbles.php', payload, { method: 'POST' })
        this.hideHud()
        if (r.code === 0) {
          this.toast(this.editingId ? '已保存' : '添加成功')
          this.closeModal()
          /* 重新拉一次自定义样式并注入, 列表/商城的预览立刻用新代码 */
          ensureCustomBubbleCss(true)
          this.loadData()
        } else {
          this.toast(r.msg || '保存失败')
        }
      } catch (e) {
        this.hideHud()
        this.toast('网络错误')
      }
    },

    async toggleStatus(item, status) {
      this.showHud(status === 1 ? '上架中...' : '下架中...')
      try {
        const r = await request('bubbles.php', { action: 'update', id: item.id, status }, { method: 'POST' })
        this.hideHud()
        if (r.code === 0) {
          this.toast(status === 1 ? '已上架' : '已下架')
          ensureCustomBubbleCss(true)
          this.loadData()
        } else {
          this.toast(r.msg || '操作失败')
        }
      } catch (e) {
        this.hideHud()
        this.toast('网络错误')
      }
    },

    removeItem(item) {
      uni.showModal({
        title: '删除气泡',
        content: `确定删除「${item.name}」吗？已购买的用户会退回默认气泡。`,
        confirmColor: '#e74c3c',
        success: async (res) => {
          if (!res.confirm) return
          this.showHud('删除中...')
          try {
            const r = await request('bubbles.php', { action: 'delete_bubble', id: item.id }, { method: 'POST' })
            this.hideHud()
            if (r.code === 0) {
              this.toast('已删除')
              ensureCustomBubbleCss(true)
              this.loadData()
            } else {
              this.toast(r.message || r.msg || '删除失败')
            }
          } catch (e) {
            this.hideHud()
            this.toast('网络错误')
          }
        }
      })
    }
  }
}
</script>

<style scoped>
@import "@/common/bubble.css";

.bubble-admin-page { height: 100vh; background: #f5f6fa; }
.main-scroll { height: 100vh; }
.status-spacer { width: 100%; }

/* ===== 搜索栏 ===== */
.search-bar { display: flex; align-items: center; margin: 20rpx 24rpx 0; }
.search-input {
  flex: 1; min-width: 0; height: 80rpx; background: #fff; border-radius: 40rpx;
  padding: 0 32rpx; font-size: 28rpx; color: #333;
  box-shadow: 0 4rpx 24rpx rgba(102,126,234,0.06); border: 2rpx solid transparent;
}
.search-action {
  width: 120rpx; height: 80rpx; margin-left: 16rpx; background: #f0f0ff; color: #6c5ce7;
  border-radius: 40rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600;
}
.add-btn {
  width: 120rpx; height: 80rpx; margin-left: 16rpx; background: linear-gradient(135deg, #6c5ce7, #8e7bff);
  color: #fff; border-radius: 40rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 700;
}
.add-btn:active, .search-action:active { opacity: 0.85; }

/* ===== Tab ===== */
.tab-bar { display: flex; margin: 20rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 8rpx; }
.tab-item { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 12rpx; font-size: 26rpx; color: #666; }
.tab-item.active { background: #6c5ce7; color: #fff; font-weight: 600; }

/* ===== 列表 ===== */
.list { margin: 0 24rpx; }
.list-item { background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 20rpx; border: 1rpx solid #f0f0f0; }
.item-header { display: flex; align-items: center; }
.preview-area { width: 170rpx; height: 86rpx; display: flex; align-items: center; justify-content: center; background: #f7f8fb; border-radius: 16rpx; flex-shrink: 0; }
.preview-area.big { width: 100%; height: 130rpx; }
/* 自定义气泡的 ::before / ::after 装饰（内容与定位都在内联样式里） */
.bubble-deco { position: absolute; line-height: 1; }
.item-info { flex: 1; min-width: 0; margin: 0 16rpx; }
.item-name { font-size: 30rpx; font-weight: 700; color: #1f2937; display: block; }
.custom-tag { font-size: 20rpx; color: #6c5ce7; background: #f0f0ff; border-radius: 8rpx; padding: 2rpx 10rpx; margin-left: 8rpx; }
.item-meta { font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; display: block; }
.item-class { font-size: 20rpx; color: #c0c4cc; margin-top: 4rpx; display: block; }
.item-status { display: flex; align-items: center; font-size: 24rpx; flex-shrink: 0; }
.status-dot { width: 14rpx; height: 14rpx; border-radius: 50%; margin-right: 8rpx; }
.status-1 { color: #27ae60; }
.status-1 .status-dot { background: #27ae60; }
.status-0 { color: #999; }
.status-0 .status-dot { background: #bbb; }

.item-actions { display: flex; padding-top: 20rpx; margin-top: 20rpx; border-top: 1rpx solid #f5f6fa; }
.action-btn { flex: 1; height: 72rpx; margin-left: 12rpx; border-radius: 16rpx; background: #f5f6fa; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #4b5563; }
.action-btn:first-child { margin-left: 0; }
.action-btn.edit { background: #f0f0ff; color: #6c5ce7; }
.action-btn.online { background: #f0fff0; color: #27ae60; }
.action-btn.offline { background: #fff8e0; color: #f39c12; }
.action-btn.delete { background: #fff0f0; color: #e74c3c; }

/* ===== 空状态 ===== */
.empty-state { padding: 100rpx 40rpx; display: flex; flex-direction: column; align-items: center; }
.empty-text { font-size: 28rpx; color: #9ca3af; }
.empty-add-btn { margin-top: 32rpx; height: 80rpx; padding: 0 56rpx; background: #6c5ce7; color: #fff; border-radius: 40rpx; display: flex; align-items: center; font-size: 28rpx; font-weight: 600; }

.footer-space { height: 60rpx; }

/* ===== 弹窗 ===== */
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.modal-content { width: 100%; max-height: 82vh; background: #fff; border-radius: 32rpx; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 32rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: 700; color: #1f2937; }
.modal-close { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; font-size: 44rpx; color: #ccc; line-height: 1; }
/* 关键: 表单区必须有确定高度才能滚动, 否则内容超屏会被裁掉、底部按钮够不到 */
.modal-scroll { flex: 1; min-height: 0; height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 28rpx 32rpx; box-sizing: border-box; }
.modal-footer { flex-shrink: 0; display: flex; border-top: 1rpx solid #f0f0f0; }
.footer-btn { flex: 1; height: 100rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.footer-btn.cancel { color: #666; }
.footer-btn.confirm { color: #6c5ce7; font-weight: 700; border-left: 1rpx solid #f0f0f0; }

.form-item { margin-bottom: 28rpx; }
.form-item.half { flex: 1; min-width: 0; }
.form-row { display: flex; }
.form-row .form-item:first-child { margin-right: 20rpx; }
.form-label { font-size: 26rpx; color: #6b7280; display: block; margin-bottom: 12rpx; }
.form-label.no-mb { margin-bottom: 0; }
.form-input { width: 100%; height: 84rpx; background: #f7f8fb; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: #1f2937; box-sizing: border-box; }
.form-select { height: 84rpx; background: #f7f8fb; border-radius: 16rpx; padding: 0 24rpx; display: flex; align-items: center; font-size: 26rpx; color: #1f2937; }

.mode-switch { display: flex; background: #f0f1f6; border-radius: 16rpx; padding: 6rpx; }
.mode-item { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 12rpx; font-size: 26rpx; color: #666; }
.mode-item.active { background: #fff; color: #6c5ce7; font-weight: 700; }

.code-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.code-tools { display: flex; }
.code-tool { font-size: 24rpx; color: #6c5ce7; margin-left: 24rpx; }
.code-input {
  width: 100%; min-height: 260rpx; background: #1f2233; color: #a6e3a1;
  border-radius: 16rpx; padding: 20rpx; font-size: 24rpx; line-height: 1.6;
  font-family: Consolas, Menlo, monospace; box-sizing: border-box;
}
.code-tip { font-size: 22rpx; color: #9ca3af; margin-top: 12rpx; display: block; line-height: 1.6; }
.auto-class { color: #6c5ce7; font-weight: 700; }

.style-grid { display: flex; flex-wrap: wrap; }
.style-chip { width: 30.6%; margin: 0 4% 16rpx 0; border: 2rpx solid #eee; border-radius: 16rpx; padding: 14rpx 6rpx; display: flex; flex-direction: column; align-items: center; }
.style-chip:nth-child(3n) { margin-right: 0; }
.style-chip.active { border-color: #6c5ce7; background: #f6f4ff; }
.style-label { font-size: 22rpx; color: #666; margin-top: 10rpx; }

/* ===== Toast ===== */
.hud-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; }
.hud-toast { padding: 24rpx 48rpx; background: rgba(0,0,0,0.75); border-radius: 16rpx; display: flex; align-items: center; font-size: 28rpx; color: #fff; }
.spinner { width: 36rpx; height: 36rpx; border: 4rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; margin-right: 16rpx; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
