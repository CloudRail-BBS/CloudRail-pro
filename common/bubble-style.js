/**
 * 聊天气泡样式（内置 + 后台自定义代码）
 * -------------------------------------------------
 * 关键结论：**App 端往 document 插 <style> 不一定作用到渲染层**。
 * 之前自定义气泡只在管理端弹窗里能看到效果（那里用的是内联样式），
 * 关掉弹窗、到列表/商城/聊天里就没效果了 —— 就是因为那边依赖样式注入。
 *
 * 所以这里统一改成：把气泡样式**解析成内联样式**，由页面绑到气泡元素上。
 * 内联样式任何端都一定生效（H5 / App / 小程序）。
 *
 * 注入 <style> 的方式仍然保留一份（H5 上能多做点内联做不到的事，比如 @keyframes 动画、
 * 复杂伪元素），但页面的实际外观不再依赖它，内联才是兜底。
 *
 * 内联做不到的：@keyframes 动画、@media、复杂选择器。
 * ::before / ::after 的 content 通过额外渲染一个小元素来还原。
 */
import { request } from './request.js'

const STYLE_ID = 'qx-custom-bubble-style'
const PREVIEW_STYLE_ID = 'qx-custom-bubble-preview'

/* 允许内联的属性白名单。布局类(宽高/z-index/overflow 等)不放进来，避免把气泡搞乱 */
const INLINE_OK = [
  'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
  'color', 'border', 'border-color', 'border-width', 'border-style', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'box-shadow', 'text-shadow', 'font-size', 'font-weight', 'font-family', 'font-style',
  'letter-spacing', 'line-height', 'padding', 'margin', 'opacity', 'filter', 'backdrop-filter',
  'text-align', 'max-width', 'min-width', 'white-space', 'word-break', 'word-wrap', 'overflow-wrap',
  'vertical-align', 'text-decoration', 'direction'
]
/* 伪元素额外允许定位 */
const DECO_OK = INLINE_OK.concat(['position', 'top', 'left', 'right', 'bottom', 'z-index', 'transform'])

/** 内置气泡皮肤（与 common/bubble.css 保持一致，内联兜底用） */
const BUILTIN_SKINS = {
  'bubble-pink': 'background-color:#fff0f5;border:2rpx solid #ffc0cb;color:#ff69b4;border-radius:24rpx 24rpx 24rpx 4rpx;',
  'bubble-neon': 'background-color:#222;border:2rpx solid #00ffff;color:#00ffff;border-radius:12rpx;box-shadow:0 0 8rpx rgba(0,255,255,.4);',
  'bubble-sea': 'background:linear-gradient(135deg,#e0c3fc 0%,#8ec5fc 100%);color:#1a365d;border-radius:20rpx 20rpx 20rpx 0;font-weight:500;',
  'bubble-gold': 'background:linear-gradient(to bottom,#fffdf0,#fcf5c8);border:2rpx solid #daa520;color:#8b4500;border-radius:16rpx;box-shadow:0 2rpx 4rpx rgba(218,165,32,.2);',
  'bubble-pixel': 'background:#fff;border:4rpx dashed #333;color:#333;font-family:monospace;border-radius:4rpx;',
  'bubble-rainbow': 'background:linear-gradient(270deg,#ff9a9e,#fad0c4,#fad0c4,#a18cd1,#fbc2eb);color:#fff;border-radius:16rpx;text-shadow:0 1px 2px rgba(0,0,0,.1);',
  'bubble-mech': 'background:#000;color:#0f0;border:2rpx solid #ff0000;border-radius:8rpx;font-family:monospace;',
  'bubble-cloud': 'background:#f0f8ff;color:#4682b4;border-radius:30rpx;border:2rpx solid #b0e0e6;box-shadow:4rpx 4rpx 0 #b0e0e6;'
}

/* H5 上注入 <style> 的增强版内置皮肤（能做动画；App 端注入不生效时不依赖它） */
const BUILTIN_INJECT_CSS = Object.keys(BUILTIN_SKINS)
  .map(cls => {
    const decls = BUILTIN_SKINS[cls]
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(d => d + ' !important')
      .join(';')
    return '.bubble-content.' + cls + '{' + decls + '}'
  })
  .join('\n')

let _cssByClass = {}     // 后台自定义：类名 -> CSS 片段
let _skinStyles = {}     // 类名 -> { style, before, after }（解析后的内联样式缓存）
let _loading = null      // 正在请求中的 Promise
let _loaded = false      // 是否已经成功拉过一次

function canInject() {
  return typeof document !== 'undefined' && !!document && !!document.head
}

function writeStyle(id, css) {
  if (!canInject()) return false
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('style')
    el.id = id
    el.setAttribute('type', 'text/css')
    document.head.appendChild(el)
  }
  el.textContent = String(css || '')
  return true
}

/* rpx → px：内联样式里 rpx 不一定被转换，这里自己算 */
function rpxToPx(value) {
  return String(value).replace(/(-?[\d.]+)rpx/gi, (m, n) => {
    const num = parseFloat(n) || 0
    let px = num / 2
    try {
      if (typeof uni !== 'undefined' && typeof uni.upx2px === 'function') px = uni.upx2px(num)
    } catch (e) { px = num / 2 }
    return (Math.round(px * 100) / 100) + 'px'
  })
}

/** 声明串 -> 内联样式串 */
function declsToInline(body, allowed, isDeco) {
  const okList = allowed || INLINE_OK
  return String(body || '')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const i = s.indexOf(':')
      if (i <= 0) return ''
      const prop = s.slice(0, i).trim().toLowerCase()
      let val = s.slice(i + 1).trim()
      if (!val) return ''
      if (prop === 'content') return ''                 // content 由伪元素单独处理
      if (/^animation/.test(prop) || prop === 'transition') return ''
      if (okList.indexOf(prop) < 0) return ''
      if (/[<>]/.test(val)) return ''
      /* 气泡本体不允许被定位成 absolute/fixed，否则整个布局会崩 */
      if (!isDeco && prop === 'position' && /absolute|fixed|sticky/i.test(val)) return ''
      /* 把换行/多余空格压平：多行写的 box-shadow 之类塞进 style 属性时才正常 */
      val = val.replace(/\s+/g, ' ').trim()
      val = rpxToPx(val)
      return prop + ':' + val
    })
    .filter(Boolean)
    .join(';')
}

/** 从 ::before / ::after 的声明里取出 content 文本 + 可内联样式 */
function decoFrom(body) {
  const m = /content\s*:\s*(['"])([\s\S]*?)\1/i.exec(String(body || ''))
  const text = m ? m[2] : ''
  if (!text) return null
  const style = declsToInline(body, DECO_OK, true)
  return { text, style }
}

/**
 * 把一段 CSS 代码解析成可内联的气泡样式。
 * @returns {{style:string, before:?{text:string,style:string}, after:?{text:string,style:string}}}
 */
export function bubbleSkinOf(css, cls) {
  const out = { style: '', before: null, after: null }
  const text = String(css || '').trim()
  if (!text) return out

  let safeCls = String(cls || '').trim()
  let block = ''
  let beforeBlock = ''
  let afterBlock = ''
  try {
    const name = safeCls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (name) {
      const mMain = new RegExp('\\.' + name + '\\s*\\{([^}]*)\\}', 'i').exec(text)
      const mBefore = new RegExp('\\.' + name + '\\s*::?before\\s*\\{([^}]*)\\}', 'i').exec(text)
      const mAfter = new RegExp('\\.' + name + '\\s*::?after\\s*\\{([^}]*)\\}', 'i').exec(text)
      if (mMain) block = mMain[1]
      if (mBefore) beforeBlock = mBefore[1]
      if (mAfter) afterBlock = mAfter[1]
    }
  } catch (e) { /* 正则异常就退化成整段解析 */ }

  if (!block) {
    const mAny = /\{([^}]*)\}/.exec(text)
    block = mAny ? mAny[1] : text
  }
  out.style = declsToInline(block, INLINE_OK, false)
  if (beforeBlock) out.before = decoFrom(beforeBlock)
  if (afterBlock) out.after = decoFrom(afterBlock)

  /* 有伪元素但没有定位参照时，补一个 relative，否则小星星会跑偏 */
  if ((out.before || out.after) && out.style.indexOf('position:') < 0) {
    out.style += ';position:relative'
  }
  return out
}

/** 供页面直接用：类名 -> 内联样式对象 */
export function getBubbleSkins() {
  return _skinStyles
}

function rebuildSkins() {
  _skinStyles = {}
  Object.keys(BUILTIN_SKINS).forEach(cls => {
    _skinStyles[cls] = bubbleSkinOf('.' + cls + '{' + BUILTIN_SKINS[cls] + '}', cls)
  })
  Object.keys(_cssByClass).forEach(cls => {
    _skinStyles[cls] = bubbleSkinOf(_cssByClass[cls], cls)
  })
}

/** 给注入用的 CSS 补 !important（H5 上让皮肤盖过聊天页的 scoped 基础样式） */
function boostCss(css) {
  return String(css || '').replace(/\{([^{}]*)\}/g, (m, body) => {
    const out = body
      .split(';')
      .map(decl => {
        const t = decl.trim()
        if (!t) return ''
        if (t.indexOf(':') <= 0) return t
        if (/!important\s*$/i.test(t)) return t
        return t + ' !important'
      })
      .filter(Boolean)
      .join(';')
    return '{' + out + '}'
  })
}

/**
 * 拉取后台自定义气泡样式。
 * 返回解析好的「类名 -> 内联样式」映射，页面存进 data 里绑定即可（任何端都生效）。
 * @param {boolean} force 忽略缓存强制重新拉取
 */
export async function ensureCustomBubbleCss(force = false) {
  if (_loading) return _loading
  if (_loaded && !force) return _skinStyles
  _loading = (async () => {
    try {
      const res = await request('bubble.php', { action: 'custom_css' }, 'GET')
      if (res && res.code === 0 && res.data) {
        const map = res.data.map && typeof res.data.map === 'object' ? res.data.map : {}
        _cssByClass = map
        rebuildSkins()
        _loaded = true
        /* 顺手也注入一份：H5 上能覆盖内联做不到的部分（动画、复杂伪元素） */
        writeStyle(STYLE_ID, BUILTIN_INJECT_CSS + '\n' + boostCss(String(res.data.css || '')))
      }
    } catch (e) {
      rebuildSkins()
    } finally {
      _loading = null
    }
    return _skinStyles
  })()
  return _loading
}

/** 管理端「效果预览」：把当前代码临时注入一份（H5 有效；内联那部分由页面自己绑） */
export function previewCustomBubbleCss(css) {
  const text = String(css || '').trim()
  if (!text) return writeStyle(PREVIEW_STYLE_ID, '')
  return writeStyle(PREVIEW_STYLE_ID, boostCss(text))
}
