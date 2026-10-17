# CloudRail-pro UI 主题统一实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 CloudRail-pro 的 104 条页面路由、自有组件和视频子视图提供统一的浅色、深色及系统跟随体验。

**Architecture:** `common/themeCore.js` 保存可单测的主题状态解析、palette 与偏好逻辑，`common/theme.js` 连接 uni-app 平台事件并暴露响应式主题状态。Vue 应用级 mixin 向页面和组件提供 `themeClass` 与当前 `themeTokens`；每个页面根节点绑定该类，局部样式按语义添加深色规则；nvue 单独处理。设置页保存本机 `system/light/dark` 偏好，应用启动及回到前台时同步系统主题和平台导航外观。

**Tech Stack:** uni-app Vue 3、JavaScript、SCSS/CSS、Node.js 内置 `node:test`、HBuilderX 可用的平台构建/预览。

**Spec:** `docs/superpowers/specs/2026-10-17-cloudrail-pro-ui-theme-design.md`

## Global Constraints

- 主题偏好为 `system`、`light`、`dark`，默认 `system`；偏好保存在本机，不依赖服务器账号或网络。
- 覆盖 `pages.json` 的全部 104 条注册路由、`pages/video/overlay.nvue`、App 级样式与自有 `components/**`。
- 浅色页面画布为 `#fafafa`，主表面 `#ffffff`，主文字 `#171717`，次级文字 `#666666`，危险 `#da2f35`，成功 `#297c3b`。
- 深色页面画布为 `#0a0a0a`，主表面 `#111111`，次级表面 `#1a1a1a`，主文字 `#ededed`，次级文字 `#a1a1a1`，危险 `#ff6166`，成功 `#62c073`。
- 黑白为主要操作色；红、绿仅承担危险、成功等语义。保留游戏、VIP/商品、抽奖、用户上传图片、应用图标、视频内容等有明确内容含义的色彩。
- 保留接口、权限、路由和业务逻辑；不新增服务端主题同步，不依赖仅 H5 可用的 DOM 修改来驱动全端主题。
- `uni.scss` 中 Sass 值是编译期样式，不能作为运行时主题状态；逐页迁移局部 scoped 样式和 inline 样式，不只做 App 全局覆盖。
- App、H5、微信小程序及支付宝/百度/抖音目标分别验证；无系统主题通知能力的平台在应用启动和回到前台时重新读取系统状态。系统状态不可读时仅 `system` 偏好回退浅色。DCloud 的 `theme.json` 只提供平台原生外观的系统主题默认值；运行时主题 controller 必须按用户保存的 system/light/dark 再同步平台支持的导航栏 API，避免原生默认主题覆盖手动选择。
- 每个页面域验收后运行 `git diff --check`；最终运行全部 `node --test tests/*.test.mjs`、JSON 解析、路由覆盖检查及可用平台构建/预览。

---

## 文件结构与责任

| 文件/目录 | 责任 |
| --- | --- |
| `common/themeCore.js` | 无平台依赖的主题值规范化、有效主题解析、偏好存储异常处理和订阅状态机 |
| `common/theme.js` | 单例响应式状态、uni-app/H5 系统主题读取与监听、原生导航/状态栏同步 |
| `main.js` | Vue 3 应用级 mixin，为页面和组件提供 `themeClass` 与 `themeTokens` |
| `App.vue` | 在启动时初始化主题，在前台恢复时刷新系统主题 |
| `manifest.json`, `theme.json`, `pages.json`, `uni.scss` | 为支持的平台同步原生外观；设置静态浅色默认值和主题配置 |
| `pages/user/setting.vue` | 增加外观分组与三种主题偏好单选项 |
| `components/**/*.vue` | 自有共享导航、卡片、表单、反馈弹层和播放器外围主题 |
| `pages/**/*.vue`, `pages/**/*.nvue` | 所有页面根类、页面局部中性色及必要的排版/分组统一 |
| `tests/theme.test.mjs` | 核心主题解析、持久化、事件更新和回退行为 |
| `tests/theme-page-coverage.test.mjs` | 核对 104 条路由及 `subNVues` 播放器子视图均绑定主题根类 |
| `tests/theme-component-coverage.test.mjs` | 核对自有可视组件均绑定主题根类 |
| `tests/theme-settings.test.mjs` | 核对设置页三种偏好及调用主题状态 API |
| `tests/helpers/uni-config.mjs` | 仅在测试中按目标平台展开 pages.json 的条件编译行 |
| `tests/theme-config.test.mjs` | 验证各目标平台展开后的配置可解析，主题变量只出现于支持的平台 |

页面迁移按功能域分批，每个迁移任务只编辑该任务列出的页面目录；共用导航或组件由共享组件任务维护，避免多个任务同时改同一文件。逐页检查 template 中的 `:style`/`:class`、脚本计算出来的颜色、CSS 自定义属性、scoped 与非 scoped 样式，避免只改 CSS hex 却留下浅色动态 inline 样式。每页按 Quiet Cards 统一标题/分区/正文/辅助字层级、内容留白、控件触达区和卡片边界：适合分组的内容使用 24rpx 圆角和 32rpx 内距；设置与管理列表使用分组及细线，不给每个行项叠卡片；密集数据和全屏游戏保留合适密度。

**每个页面的迁移循环：** 下列页面任务中的样式步骤按文件重复，每次只做一项：绑定根主题类；迁移画布/表面/边框；迁移正文/说明/占位文字；迁移按钮/表单/选中/禁用状态；检查固定导航/安全区/弹层。每项预期 2–5 分钟，大页面按上述样式区域拆开。每个表格批次单独运行该路径的覆盖测试和 `git diff --check`，通过后提交并审阅；不把整个目录积累成一次不可审阅的补丁。

**提交规范：** 每个实现任务及每个页面批次通过检查后，按 Files 列表精确 `git add <路径>`，再执行 `git commit -m "feat(ui): <本批交付内容>"`；文档、测试、主题核心与页面迁移分别提交，不使用 `git add .` 包含无关内容。当前目录由用户明确指定，不创建新工作树。

## 实施任务

### Task 1: 先写主题状态机测试

**Files:**
- Create: `tests/theme.test.mjs`
- Test: `common/themeCore.js`

**Interfaces:**
- Consumes: 设计说明的 `system/light/dark` 偏好和浅色回退规则。
- Produces: `createThemeController({ readPreference, writePreference, readSystemTheme, subscribeSystemTheme })` 的行为契约。

- [ ] **Step 1: 写默认模式、手动覆盖、系统事件、palette 和异常回退测试**

在测试文件内定义读取器和 data URL 导入器，再写主题断言。断言 `normalizeThemeMode(null) === 'system'`，`resolveEffectiveTheme('dark','light') === 'dark'`，`resolveEffectiveTheme('light','dark') === 'light'`，`resolveEffectiveTheme('system','dark') === 'dark'`，非法系统值回退到 `light`；同时断言浅/深 palette 的 canvas、surface、text、danger、success 值与 Global Constraints 一致。构造 controller 假存储与可手动触发的系统主题 listener，验证系统事件只影响 system 模式、手动选择立即保存并发出状态快照、存储读写异常不会中断主题切换。

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')
async function importSourceModule(path) {
  const source = await readRepoFile(path)
  const encoded = Buffer.from(source, 'utf8').toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}
```

```js
test('manual preference wins over system changes', async () => {
  const { createThemeController } = await importSourceModule('common/themeCore.js')
  let systemListener
  let saved = ''
  const controller = createThemeController({
    readPreference: () => saved,
    writePreference: (value) => { saved = value },
    readSystemTheme: () => 'light',
    subscribeSystemTheme: (listener) => { systemListener = listener; return () => {} }
  })
  controller.initialize()
  controller.setMode('dark')
  systemListener('light')
  assert.deepEqual(controller.getSnapshot(), { mode: 'dark', systemTheme: 'light', effectiveTheme: 'dark' })
  assert.equal(saved, 'dark')
})
```

- [ ] **Step 2: 运行测试并确认因模块尚未创建而失败**

Run: `node --test tests/theme.test.mjs`
Expected: FAIL，错误指出 `common/themeCore.js` 不存在。

### Task 2: 实现可单测的主题核心

**Files:**
- Create: `common/themeCore.js`
- Test: `tests/theme.test.mjs`

**Interfaces:**
- Consumes: Task 1 的状态机契约。
- Produces: `THEME_MODE_KEY: string`、`THEME_PALETTES: { light: Palette, dark: Palette }`、`normalizeThemeMode(value): 'system'|'light'|'dark'`、`normalizeSystemTheme(value): 'light'|'dark'`、`resolveEffectiveTheme(mode, systemTheme): 'light'|'dark'` 和 `createThemeController(dependencies): ThemeController`。

- [ ] **Step 1: 实现纯主题解析函数与 controller**

使用存储键 `cloudrail_theme_mode`。controller 暴露 `initialize()`、`setMode(mode)`、`refreshSystemTheme()`、`getSnapshot()`、`subscribe(listener)` 和 `destroy()`；所有对存储与平台依赖的调用使用传入的 dependency 函数并以 try/catch 隔离。`getSnapshot()` 返回 `{ mode, systemTheme, effectiveTheme }` 的新对象。监听器 unsubscribe 只注册一个，`destroy()` 可重复调用。

`initialize(): Snapshot` 幂等初始化；`setMode(mode): Snapshot` 规范化输入、更新快照并保存偏好；`refreshSystemTheme(): Snapshot` 重读系统状态而不改偏好；`subscribe((snapshot: Snapshot) => void): () => void` 立即发送当前快照并在后续实际状态变化时通知；`destroy(): void` 解除系统监听，允许之后重新初始化。依赖中的 `subscribeSystemTheme((theme: string) => void): (() => void)|undefined` 仅传主题名称，平台事件对象由运行时 adapter 解包。

Palette 字段如下，所有页面按含义取值而不按原 hex 机械替换：

```js
export const THEME_PALETTES = {
  light: {
    canvas: '#fafafa', surface: '#ffffff', surfaceAlt: '#f2f2f2',
    selected: '#ebebeb', hover: '#f2f2f2', text: '#171717', textMuted: '#666666',
    border: '#e0e0e0', borderStrong: '#c9c9c9', navRgb: '255, 255, 255',
    action: '#000000', actionText: '#ffffff', danger: '#da2f35', success: '#297c3b'
  },
  dark: {
    canvas: '#0a0a0a', surface: '#111111', surfaceAlt: '#1a1a1a',
    selected: '#1f1f1f', hover: '#111111', text: '#ededed', textMuted: '#a1a1a1',
    border: '#2e2e2e', borderStrong: '#454545', navRgb: '17, 17, 17',
    action: '#ffffff', actionText: '#000000', danger: '#ff6166', success: '#62c073'
  }
}
```

```js
export function resolveEffectiveTheme(mode, systemTheme) {
  if (mode === 'light' || mode === 'dark') return mode
  return normalizeSystemTheme(systemTheme)
}
```

- [ ] **Step 2: 运行核心测试并确认全绿**

Run: `node --test tests/theme.test.mjs`
Expected: 所有主题状态、事件和异常回退测试通过。

### Task 3: 接入运行时主题与 Vue 响应式状态

**Files:**
- Create: `common/theme.js`
- Modify: `main.js`
- Modify: `App.vue`

**Interfaces:**
- Consumes: `common/themeCore.js` 的 controller。
- Produces: `themeState: reactive<Snapshot>`、`initTheme(): Snapshot`、`setThemeMode(mode): Snapshot`、`refreshSystemTheme(): Snapshot`、`themeClass: computed<string>`、`themeTokens: computed<Palette>`，以及 `themeState`/`themeClass`/`themeTokens` 三个同名 mixin 属性。

- [ ] **Step 1: 添加运行时适配器**

`common/theme.js` 使用 Vue `reactive` 包装主题快照并订阅 controller。H5 适配器读取 `window.matchMedia('(prefers-color-scheme: dark)')` 并注册/移除 `change` listener（旧浏览器在 API 存在时回退到 `addListener`/`removeListener`）；App 与微信小程序读取 `uni.getSystemInfoSync().theme`，在 API 可用时注册 `uni.onThemeChange`/`uni.offThemeChange`；支付宝、百度和抖音在 `refreshSystemTheme()` 中重读系统信息，不访问 `window` 或 `document`。平台 API 不可用时返回 `light`。

```js
import { computed, reactive } from 'vue'
export const themeState = reactive({ mode: 'system', systemTheme: 'light', effectiveTheme: 'light' })
export const themeClass = computed(() => `theme-${themeState.effectiveTheme}`)
export const themeTokens = computed(() => THEME_PALETTES[themeState.effectiveTheme])
```

运行时模块创建 `createThemeController`，订阅后用 `Object.assign(themeState, snapshot)` 同步状态；mixin 读取 `themeClass.value` 和 `themeTokens.value`。这样普通 Vue 页使用类选择器，nvue 可把 token 对象绑定到受支持的动态 style。

- [ ] **Step 2: 在 Vue 应用中安装主题 mixin**

在 `main.js` 的 `createSSRApp(App)` 后安装 mixin，使 `themeState`、`themeClass` 与 `themeTokens` 在所有 Options API 页面和共享组件模板中可用；Vue 3 是当前 `manifest.json` 目标。对 Vue 2 条件编译分支保持构建安全，不向该分支加入未用 API。`App.vue` 在 `onLaunch` 第一项 UI 初始化前调用 `initTheme()`、在 `onShow` 调用 `refreshSystemTheme()`；不改变现有登录、WebSocket、启动广告或路由处理顺序。

```js
app.mixin({ computed: {
  themeState() { return themeState },
  themeClass() { return themeClass.value },
  themeTokens() { return themeTokens.value }
} })
```

主题模块导入放在 `// #ifdef VUE3` 编译块内：`import { themeState, themeClass, themeTokens } from './common/theme.js'`。`App.vue` 在模板根 `app-container` 绑定 `:class="themeClass"`；其启动顺序保持 `initTheme()` → 既有 `hideNativeTabBar()` 等工作。

- [ ] **Step 3: 同步原生状态栏和页面导航颜色**

`common/theme.js` adapter 在主题快照更新后仅调用当前目标平台支持的 uni-app `uni.setNavigationBarColor`（及经文档验证的平台原生状态栏 API）；自定义导航由页面组件自行着色。不要使用不存在或未核实的 `plus.nativeUI.setUIStyle`。同步失败时继续使用自有页面导航主题，不阻断启动。`themeState` 初始化值是浅色，controller 在首屏前同步读取本地偏好与系统主题。

- [ ] **Step 4: 运行主题测试和现有安全回归测试**

Run: `node --test tests/theme.test.mjs tests/security-hardening.test.mjs`
Expected: 两组测试通过，主题测试不需要网络或 HBuilderX。

### Task 4: 建立全路由主题绑定检查

**Files:**
- Create: `tests/theme-page-coverage.test.mjs`
- Create: `tests/helpers/uni-config.mjs`
- Test: `pages.json`, 所有路由 Vue 文件和 `pages/video/overlay.nvue`

**Interfaces:**
- Consumes: `pages.json` 中的页面路径及全局 `themeClass` mixin。
- Produces: 每一条页面路由和播放器覆盖层均绑定根主题类的机器检查。

- [ ] **Step 1: 写失败的路由覆盖测试**

`tests/helpers/uni-config.mjs` 导出 `readUniConfig(path, platform)`：逐行读取 JSONC 文本，按条件栈展开项目使用的 `// #ifdef A || B`、`// #ifndef A || B`、`// #endif` 指令；`#ifdef` 的目标集合任一与 `platform` 相等即保留，`#ifndef` 则取反；保留父级激活状态，移除指令行后解析 JSON。读取器只实现本仓库这些条件指令，不引入通用预处理依赖。先用当前无条件的 `pages.json` 验证该 helper，后续主题配置条件由 Task 6 覆盖。

```js
import { readFile } from 'node:fs/promises'
const repoRoot = new URL('../../', import.meta.url)

export async function readUniConfig(path, platform) {
  const source = await readFile(new URL(path, repoRoot), 'utf8')
  const active = [true]
  const output = []
  for (const line of source.split(/\r?\n/)) {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef)\s+(.+)\s*$/)
    if (directive) {
      const matches = directive[2].split(/\s*\|\|\s*/).includes(platform)
      active.push(active.at(-1) && (directive[1] === 'ifdef' ? matches : !matches))
    } else if (/^\s*\/\/\s*#endif\s*$/.test(line)) {
      if (active.length === 1) throw new Error('unmatched #endif')
      active.pop()
    } else if (active.at(-1)) {
      output.push(line)
    }
  }
  if (active.length !== 1) throw new Error('unclosed platform conditional')
  return JSON.parse(output.join('\n'))
}
```

从 `pages` 和 `subPackages[].pages` 汇总路径，为每条路由尝试 `<path>.vue`，再尝试 `<path>.nvue`；每个页面必须在其首个可视页面根节点 class 中引用 `themeClass`。一般根元素接受 `<view>`/`<scroll-view>`，`.nvue` 可接受 `<view>`/`<div>`。`pages/video/overlay.nvue` 不在 `pages[]` 路由数组中，而是 `fullplay` 的 `subNVues`；额外加入检查。将每个路径注册成一个以完整路径命名的 `node:test` case，后续可用 `--test-name-pattern` 只跑已迁移域。

```js
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] || ''
const rootPattern = pageFile.endsWith('.nvue') ? /<(?:view|scroll-view|div)\b([^>]*)>/s : /<(?:view|scroll-view)\b([^>]*)>/s
const rootNode = template.match(rootPattern)
assert.ok(rootNode && /:class\s*=\s*["'][^"']*\bthemeClass\b/.test(rootNode[1]), `${pagePath} root must bind themeClass`)
assert.doesNotMatch(source, /themeClass\s*\(\)\s*\{\s*return\s+['"]theme-(?:light|dark)['"]/, `${pagePath} must not override the global theme with a fixed mode`)
```

- [ ] **Step 2: 运行检查并确认覆盖检查当前失败**

Run: `node --test tests/theme-page-coverage.test.mjs`
Expected: FAIL 并列出当前未绑定主题类的路由。

### Task 5: 增加系统 / 浅色 / 深色设置

**Files:**
- Modify: `pages/user/setting.vue`
- Create: `tests/theme-settings.test.mjs`
- Test: `common/theme.js` exports `themeState` and `setThemeMode(mode)` via source-contract assertions; do not import the Vue-bound adapter in Node's data-URL test harness.

**Interfaces:**
- Consumes: `themeState`、`setThemeMode(mode)`、`themeClass`。
- Produces: 外观设置单选项、切换即时生效和本机持久化。

- [ ] **Step 1: 添加设置页契约测试**

在测试文件内定义 `readRepoFile` helper 并读取设置源码。检查设置模板包含“外观”、“跟随系统”、“浅色”、“深色”，选项绑定当前 `themeState.mode` 并调用 `setThemeMode`；不向后台发送主题偏好。初次进入设置时显示已保存值，不以有效深浅色误代偏好值。测试 Node 可读的 `common/theme.js` 源码契约，不用 data URL 动态导入含 `vue` 依赖的运行时 adapter。

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')
test('theme selection is local and exposes all modes', async () => {
const source = await readRepoFile('pages/user/setting.vue')
assert.match(source, /跟随系统/)
assert.match(source, /setThemeMode\(/)
assert.match(source, /themeState\.mode/)
const chooseThemeBody = source.match(/chooseTheme\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] || ''
assert.match(chooseThemeBody, /setThemeMode\(/)
assert.doesNotMatch(chooseThemeBody, /\brequest\s*\(/)
})
```

- [ ] **Step 2: 绑定设置页根节点并将外观分组放在账号安全之后**

为设置页首个页面根 `<view>` 添加 `:class="themeClass"`。新增清楚的单选列表和当前选择标记，触控区域沿用现有设置行规范；“外观”分组位于“账号安全”之后、“我的资产”之前，避免改变其他设置功能。

```vue
<view class="group-title">外观</view>
<view class="cell-group">
  <view v-for="option in themeOptions" :key="option.value" class="cell-item" @click="chooseTheme(option.value)">
    <text class="cell-label">{{ option.label }}</text>
    <text v-if="themeState.mode === option.value" class="theme-check">✓</text>
  </view>
</view>
```

- [ ] **Step 3: 为浅色与深色设置分组选中样式并运行测试**

Run: `node --test tests/theme-settings.test.mjs tests/theme.test.mjs`
Run: `node --test --test-name-pattern='pages/user/setting' tests/theme-page-coverage.test.mjs`
Expected: 设置项、事件调用、本机存储及主题状态测试全部通过。

### Task 6: 主题化应用配置

**Files:**
- Modify: `manifest.json`
- Create: `theme.json`
- Modify: `pages.json`
- Modify: `uni.scss`
- Modify: `App.vue`
- Modify: `tests/helpers/uni-config.mjs`
- Create: `tests/theme-config.test.mjs`

**Interfaces:**
- Consumes: 主题运行时提供的浅/深有效主题。
- Produces: 主题化静态默认值和受支持平台原生页框配置。

- [ ] **Step 1: 定义主题配置并开启受支持平台的暗色模式**

`theme.json` 定义浅/深变量（例如 `navBgColor`、`navTextStyle`、`pageBgColor`）；`pages.json` 使用 `@navBgColor`、`@navTextStyle`、`@pageBgColor` 引用变量。在 `manifest.json` 仅为 DCloud 暗黑模式文档支持的 App、H5、微信小程序配置 `darkmode` 和 `themeLocation`。支付宝、百度、抖音保持当前 manifest 结构，不能添加未确认支持的键。更新 `uni.scss` 的浅色默认值。此平台配置用于系统主题原生默认外观；手动模式切换由运行时主题适配处理。

```json
{
  "light": { "navBgColor": "#ffffff", "pageBgColor": "#fafafa", "navTextStyle": "black" },
  "dark": { "navBgColor": "#111111", "pageBgColor": "#0a0a0a", "navTextStyle": "white" }
}
```

在现有 `manifest.json` 对应对象内保留原字段并增加：`app-plus.darkmode: true`、`app-plus.themeLocation: "theme.json"`；`h5.darkmode: true`、`h5.themeLocation: "theme.json"`；`mp-weixin.darkmode: true`、`mp-weixin.themeLocation: "theme.json"`。不覆盖这些对象中的 appid、编译器、权限或平台选项。

`pages.json` 用条件编译将变量引用限制在支持的平台，其他目标继续使用静态浅色默认值。保留其他全局键及每页路由配置。

```jsonc
// #ifdef APP-PLUS || H5 || MP-WEIXIN
"navigationBarBackgroundColor": "@navBgColor",
"navigationBarTextStyle": "@navTextStyle",
"backgroundColor": "@pageBgColor",
// #endif
// #ifndef APP-PLUS || H5 || MP-WEIXIN
"navigationBarBackgroundColor": "#ffffff",
"navigationBarTextStyle": "black",
"backgroundColor": "#fafafa",
// #endif
"navigationBarTitleText": "CloudRail-pro"
```

DCloud 暗黑模式字段及 `uni.setNavigationBarColor` / `uni.onThemeChange` 的平台支持范围需按[官方暗黑模式说明](https://uniapp.dcloud.net.cn/tutorial/darkmode.html)、[导航栏 API](https://uniapp.dcloud.net.cn/api/ui/navigationbar.html)和[主题事件 API](https://uniapp.dcloud.net.cn/api/system/theme.html)逐项确认。

- [ ] **Step 2: 给 App 根节点及通用排版建立视觉基线**

`App.vue` 根节点绑定 `themeClass`，将当前 page 的 `#f6f7f9` 默认背景改为 `#fafafa`。保留字体家族；标题 36rpx/600、分组标题 28rpx/500、正文 28rpx/400/1.6、说明 24rpx/400/1.5。页面标准左右留白 32rpx、分组间距 24rpx、普通面板圆角 24rpx、主要列表行最小高度 88rpx；密集管理表与游戏桌面保留适合内容的尺寸。这些尺寸写入 `uni.scss` 作为 Sass 常量，页面局部样式逐批引用或使用对应值；不把 Sass 当运行时状态。

```scss
$cr-page-inset: 32rpx;
$cr-section-gap: 24rpx;
$cr-panel-radius: 24rpx;
$cr-row-min-height: 88rpx;
$cr-title-size: 36rpx;
$cr-body-size: 28rpx;
$cr-caption-size: 24rpx;
```

- [ ] **Step 3: 增加平台配置展开测试**

`tests/helpers/uni-config.mjs` 暴露 `readUniConfig(path, platform)`：读取源码，按行处理现有 `// #ifdef A || B`、`// #ifndef A || B`、`// #endif` 指令，用布尔栈保留目标有效行，去掉指令行后 `JSON.parse`。它只服务当前项目的这三种行指令，不引入通用预处理器。用同一函数读取 coverage tests 中的 `pages.json`。为 APP-PLUS、H5、MP-WEIXIN、MP-ALIPAY、MP-BAIDU、MP-TOUTIAO 各写一项配置测试，断言 104 条路由保留、支持目标原生主题变量正确，其他目标无 `@` 值。

```js
test('MP-ALIPAY keeps static native frame colors', async () => {
  const config = await readUniConfig('pages.json', 'MP-ALIPAY')
  assert.equal(config.globalStyle.backgroundColor, '#fafafa')
  assert.equal(config.globalStyle.navigationBarTextStyle, 'black')
  assert.equal(config.pages.length, 104)
})
```

- [ ] **Step 4: 解析配置并运行自动化检查**

Run: `node --test tests/theme-config.test.mjs`
Run: `node -e "for (const f of ['manifest.json','theme.json']) JSON.parse(require('node:fs').readFileSync(f,'utf8'))"`
Expected: 退出码 0；全局主题测试通过。

### Task 7: 迁移共享组件和通用反馈层

**Files:**
- Modify: `components/bubble.vue`, `components/CustomTabBar.vue`, `components/PayPasswordModal.vue`, `components/PublishModal.vue`, `components/RedPacketModal.vue`, `components/SplashAd.vue`
- Modify: `components/FadeSwitch.vue`, `components/OnlineNotifyCard.vue`, `components/PostCommentList.vue`, `components/TcyRefresher.vue`
- Modify: `components/XhsAgreement.vue`, `components/XhsConfirm.vue`, `components/XhsHUD.vue`, `components/XhsModal.vue`, `components/XhsSkeleton.vue`
- Modify: `components/easy-scancode/easy-scancode.vue`, `components/czy712-liquidglass/czy712-liquidglass.vue`
- Create: `tests/theme-component-coverage.test.mjs`

**Interfaces:**
- Consumes: Vue mixin `themeClass` 和主题语义色。
- Produces: 可被页面反复使用的双主题导航、弹层、输入、空/加载态。

- [ ] **Step 1: 添加共享组件根节点覆盖测试**

递归扫描 `components/**/*.vue`，为每个可视 Vue 组件建立独立测试 case，检查组件 shell 的首个根节点是否引用 `themeClass`。六个 `<script setup>` 组件直接从 `common/theme.js` 导入主题状态，合并现有 class/style 绑定；不能假定全局 Options API mixin 的属性在 setup 模板中可用。`XhsSkeleton.vue` 保持 `v-if` skeleton / `v-else` slot 两个根分支，不为通过测试添加外层 wrapper；测试只检查 skeleton shell，slot 分支原样透传调用方节点。纯逻辑 TypeScript 文件与静态资源不属于可视组件，不建 case。

```js
test(`theme root: ${componentPath}`, async () => {
  const source = await readRepoFile(componentPath)
  const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] || ''
  const rootNode = template.match(/<(?:view|scroll-view|div)\b([^>]*)>/s)
  assert.ok(rootNode && /:class\s*=\s*["'][^"']*\bthemeClass\b/.test(rootNode[1]), `${componentPath} root must bind themeClass`)
})
```

- [ ] **Step 2: 为每个共享组件根节点绑定 `themeClass`**

确保弹层/独立渲染根也绑定主题类；不改组件 props 和现有事件契约。`czy712-liquidglass.vue` 默认 tone 跟随有效主题，显式 `tone="light"` / `tone="dark"` 仍尊重调用方选择。CSS 使用明确的语义选择器，不以全局 `view` 规则覆盖组件内容。`CustomTabBar.vue` 移除独立的 `matchMedia`/系统主题读取与监听，改用共享 `themeState.effectiveTheme` 或根 `themeClass`；保留原有导航点击、未读数和徽标行为。

```vue
<view class="modal-root" :class="themeClass">
```

- [ ] **Step 3: 迁移通用中性色与输入状态**

浅色基样式改为本计划 light token；在同一 style 块末尾补充 `.theme-dark` 中性表面、正文、占位、边框、遮罩和禁用态。保留用户上传图像、游戏奖品、红包状态和组件自身标识色。

```css
.modal-surface { background: #fff; color: #171717; border-color: #e0e0e0; }
.theme-dark .modal-surface { background: #111; color: #ededed; border-color: #2e2e2e; }
```

- [ ] **Step 4: 运行共享组件相关检查**

Run: `node --test --test-name-pattern='components/(bubble|CustomTabBar|PayPasswordModal|PublishModal|RedPacketModal|SplashAd|FadeSwitch|OnlineNotifyCard|PostCommentList|TcyRefresher|Xhs|easy-scancode|czy712-liquidglass)' tests/theme-component-coverage.test.mjs`
Run: `node --test tests/theme.test.mjs tests/theme-settings.test.mjs`
Expected: Task 7 的 17 个组件 case、设置和主题核心通过；`git diff --check` 无空白错误。其余 7 个页面域组件在对应页面任务中按文件路径过滤测试，最终全量组件覆盖推迟到 Task 18。

### Task 8: 迁移首页与社区内容流

**Files:**
- Modify: `pages/index/index.vue`, `pages/circle/*.vue`, `pages/dynamic/*.vue`
- Modify: `pages/post-detail/post-detail.vue`, `pages/publish/publish.vue`, `pages/myTopic/myTopic.vue`
- Modify: `pages/search/search.vue`, `pages/relation/*.vue`, `pages/blackhole/blackhole.vue`, `pages/mission/mission.vue`
- Modify: `components/DynamicFeed.vue`, `components/HomeTextFlowTheme.vue`, `components/WaterfallTheme.vue`

**Interfaces:**
- Consumes: 应用级 `themeClass` 与通用组件主题规则。
- Produces: 社区内容、帖子、列表、搜索与发布流程的浅/深主题表面。

- [ ] **Step 1: 给本任务所有页面根节点绑定主题类**

首页、3 个圈子页、3 个动态页、帖子详情、发布、我的话题、搜索、2 个关系页、黑洞和任务页逐个绑定全局 `themeClass`。

```vue
<view class="index-container" :class="themeClass">
```

- [ ] **Step 2: 迁移中性 surface、正文、说明及输入控件**

将动态、评论、帖子文本、底色、分割线和输入框按语义映射到 token；为 feed 卡片、 skeleton、loading、搜索栏和发布弹层加对应深色状态。首页现有“瀑布流/文字流”偏好是内容布局选项，保留原有行为，不与系统主题偏好合并。

```css
.feed-card { background: #fff; color: #171717; }
.theme-dark .feed-card { background: #111; color: #ededed; }
```

- [ ] **Step 3: 运行主题状态测试并逐域预览**

Run: `node --test --test-name-pattern='pages/(index|circle|dynamic|post-detail|publish|myTopic|search|relation|blackhole|mission)/' tests/theme-page-coverage.test.mjs`
Run: `node --test --test-name-pattern='components/(DynamicFeed|HomeTextFlowTheme|WaterfallTheme)' tests/theme-component-coverage.test.mjs`
Expected: 主题状态通过；H5 预览首页、圈子、帖子详情及发布流程两套主题，确认图片/头像没有滤色。

### Task 9: 迁移消息、聊天与通知页面

**Files:**
- Modify: `pages/message/message.vue`, `chat.vue`, `call.vue`, `details.vue`, `system-notices.vue`
- Modify: `pages/message/group-chat.vue`, `group-create.vue`, `group-info.vue`, `group-list.vue`, `group-members.vue`, `group-profile.vue`, `group-search.vue`

**Interfaces:**
- Consumes: `themeClass`、通用输入框和弹层主题。
- Produces: 消息列表、私聊、群聊、通话和通知在双主题下可读。

- [ ] **Step 1: 给 12 个路由根节点绑定主题类**

私聊/群聊输入区、通话控制条和长按菜单均作为该页面的主题后代；不改消息发送、通话、WebSocket 或未读数逻辑。

```vue
<view class="chat-page" :class="themeClass">
```

- [ ] **Step 2: 为会话、消息气泡和输入区增加深色规则**

浅色使用主表面和次级文字 token；深色区分自己/对方气泡、选中行、时间戳、输入框和底部操作。保持气泡发送状态、撤回/失败提示和未读 badge 的语义区分。

```css
.chat-input-panel { background: #fff; border-color: #e0e0e0; }
.theme-dark .chat-input-panel { background: #111; border-color: #2e2e2e; }
```

- [ ] **Step 3: 检查聊天长页与键盘布局**

Run: `node --test --test-name-pattern='pages/message/' tests/theme-page-coverage.test.mjs`
Expected: 主题测试通过；H5/目标运行器中检查输入区、键盘顶起、弹层和消息图片在浅/深色均正常。

### Task 10: 迁移个人中心和账号资料页

**Files:**
- Modify: `pages/mine/mine.vue`
- Modify: `pages/user/bubble.vue`, `fans.vue`, `follows.vue`, `fried.vue`, `profile.vue`, `qrcode.vue`, `zhuanye.vue`
- Modify: `pages/user/my-reports.vue`, `report.vue`, `review-posts.vue`, `cancellation.vue`
- Modify: `pages/user/wallet.vue`, `withdraw.vue`, `withdraw-records.vue`, `email.vue`, `phone.vue`, `pay-password.vue`

**Interfaces:**
- Consumes: `themeClass`、共用卡片、表单和弹层主题。
- Produces: 账户、资料、粉丝关系、钱包及安全表单视图。

- [ ] **Step 1: 绑定所有本任务页面根节点**

为 mine 与 17 个用户资料/业务页面根节点添加 `themeClass`；`pages/user/setting.vue` 已在 Task 5 处理，不重复编辑。`pages/user/profile.vue` 当前定义同名 `themeClass()` 固定返回 `theme-light`，会覆盖 app mixin；删除该本地固定方法，并把 `themeVars()` 的白色 CSS 变量改为从 `this.themeTokens` 动态映射 canvas、surface、text、textMuted、border、surfaceAlt、action 等字段，使用 palette `navRgb` 更新透明导航背景。保留 `navOpacity`、封面、VIP 标识与渐变内容色。

```vue
<view class="profile-page" :class="themeClass">
```

- [ ] **Step 2: 按内容与状态语义迁移样式**

将资料卡、行项目、钱包记录、输入框、模态层和帮助文字映射为主题 token；保留头像、二维码图像、货币金额正负、审核/申诉状态的含义色。

```css
.setting-row { color: #171717; border-bottom-color: #e0e0e0; }
.theme-dark .setting-row { color: #ededed; border-bottom-color: #2e2e2e; }
```

- [ ] **Step 3: 测试安全表单、钱包和用户资料两套主题**

Run: `node --test --test-name-pattern='pages/(mine|user)/' tests/theme-page-coverage.test.mjs`
Run: `node --test tests/theme.test.mjs tests/security-hardening.test.mjs`
Expected: 主题及现有安全回归通过；页面流程、金额状态和用户图像保持原行为。

### Task 11: 迁移登录、注册和 OAuth WebView

**Files:**
- Modify: `pages/login/login.vue`, `pages/register/register.vue`, `pages/forget-pwd/forget-pwd.vue`, `pages/webview/webview.vue`

**Interfaces:**
- Consumes: `themeClass` 与主题化通用表单。
- Produces: 登录注册、找回密码和 OAuth 外围界面双主题显示。

- [ ] **Step 1: 给页面根节点绑定 `themeClass`**

不改 OAuth state、WebView 拦截、登录回调或密码处理。

```vue
<view class="login-page" :class="themeClass">
```

- [ ] **Step 2: 迁移表单、提示、按钮和导航中性色**

浅色输入框使用白色表面；深色输入框/验证码区使用 `#1a1a1a`，文字与边界分别映射主文字和弱分隔线。OAuth/注册图标与产品插画保留资产原色。

```css
.login-input { background: #fff; color: #171717; }
.theme-dark .login-input { background: #1a1a1a; color: #ededed; }
```

- [ ] **Step 3: 运行登录安全与主题测试**

Run: `node --test --test-name-pattern='pages/(login|register|forget-pwd|webview)/' tests/theme-page-coverage.test.mjs`
Run: `node --test tests/security-hardening.test.mjs tests/theme.test.mjs`
Expected: 原有 OAuth 安全测试和主题测试通过。

### Task 12: 迁移市场与软件列表/编辑

**Files:**
- Modify: `pages/market/shop.vue`, `detail.vue`, `my_pub.vue`, `orders.vue`, `publish.vue`
- Modify: `pages/software/library.vue`, `detail.vue`, `my_pub.vue`, `publish.vue`
- Modify: `pages/app-detail/app-detail.vue`
- Modify: `components/MarketShopSection.vue`, `components/SoftwareLibrarySection.vue`

**Interfaces:**
- Consumes: `themeClass`、表单、卡片和提示弹层。
- Produces: 商品/软件浏览、订单、详情和发布流程主题化。

- [ ] **Step 1: 绑定页面及 section 组件的主题根类**

每个 route root 和两个共享列表 section 根节点都应用 `themeClass`；保留购买、下载、发布和订单逻辑。

```vue
<view class="market-page" :class="themeClass">
```

- [ ] **Step 2: 迁移表面与操作控件**

商品/应用图片和品牌封面原样显示；标题、价格说明、输入控件、列表背景、按钮边界和选中态使用主题 token。价格正负和交易成功/失败保留状态色语义。

```css
.market-card { background: #fff; color: #171717; }
.theme-dark .market-card { background: #111; color: #ededed; }
```

- [ ] **Step 3: 验证详情、订单与发布页面**

Run: `node --test --test-name-pattern='pages/(market|software|app-detail)/' tests/theme-page-coverage.test.mjs`
Run: `node --test --test-name-pattern='components/(MarketShopSection|SoftwareLibrarySection)' tests/theme-component-coverage.test.mjs`
Run: `node --test tests/theme.test.mjs`
Expected: 主题测试通过；商品图、应用图标、交易状态在两套模式清楚可辨。

### Task 13: 迁移管理后台数据页

**Files:**
- Modify: `pages/admin/index.vue`, `posts.vue`, `users.vue`, `user_edit.vue`, `comments.vue`
- Modify: `pages/admin/reports.vue`, `certifications.vue`, `relations.vue`, `chat.vue`

**Interfaces:**
- Consumes: `themeClass` 和统一表格/表单 surface 规则。
- Produces: 管理后台概览、用户/内容/审核/关系/聊天数据页的双主题界面。

- [ ] **Step 1: 为 9 个后台数据页绑定根主题类**

```vue
<view class="admin-page" :class="themeClass">
```

- [ ] **Step 2: 迁移表格/列表、查询栏、表单和审核状态**

交替行与选中行仍可区分；只将中性底色和文字迁移到 palette。审核通过、待审核、拒绝、封禁等状态继续使用明确状态符号/标签，不统一刷成灰色。

```css
.admin-panel { background: #fff; color: #171717; border-color: #e0e0e0; }
.theme-dark .admin-panel { background: #111; color: #ededed; border-color: #2e2e2e; }
```

- [ ] **Step 3: 核对关键数据页并运行回归**

Run: `node --test tests/theme.test.mjs tests/security-hardening.test.mjs`
Expected: 两组测试通过；用户编辑、审核和管理聊天功能未改动。

### Task 14: 迁移管理后台配置和商品页

**Files:**
- Modify: `pages/admin/balance_cards.vue`, `banners.vue`, `bubbles.vue`, `circles.vue`, `fancy.vue`, `invite_codes.vue`
- Modify: `pages/admin/market.vue`, `notices.vue`, `settings.vue`, `software.vue`, `splash.vue`, `vip_cards.vue`

**Interfaces:**
- Consumes: 全局主题和后台数据页样式规范。
- Produces: 后台商品配置、运营通知、常用设置、素材和会员卡编辑双主题界面。

- [ ] **Step 1: 为 12 个配置页根节点绑定主题类**

```vue
<view class="admin-config-page" :class="themeClass">
```

- [ ] **Step 2: 迁移输入、开关、确认弹层与列表 surface**

危险删除使用危险色，保存/成功采用成功状态反馈；输入与开关轨道在深色下保持边界和选中态可见。会员和商品插画保留金色/紫色专属色。

```css
.admin-field { background: #fff; color: #171717; border-color: #e0e0e0; }
.theme-dark .admin-field { background: #1a1a1a; color: #ededed; border-color: #454545; }
```

- [ ] **Step 3: 检查后台样式与配置 JSON**

Run: `node --test tests/theme-config.test.mjs`
Expected: 退出码 0；配置保存/删除流程与原来一致。

### Task 15: 迁移游戏和全屏玩法外围

**Files:**
- Modify: `pages/game/ddz.vue`, `pages/game/ddz/index.vue`, `hall.vue`, `mail.vue`, `records.vue`
- Modify: `pages/game/replay.vue`, `room.vue`, `zha.vue`, `zjh/index.vue`
- Modify: `pages/duel-game/index.vue`, `pages/rps-game/index.vue`, `pages/hub/hub.vue`, `pages/hub/game-fullscreen.vue`

**Interfaces:**
- Consumes: `themeClass` 和公共导航/弹层主题。
- Produces: 游戏 lobby、记录、帮助和通用外围使用主题，牌桌资产保持原样。

- [ ] **Step 1: 给 13 个游戏与 hub 页面根节点绑定主题类**

```vue
<view class="game-page" :class="themeClass">
```

- [ ] **Step 2: 只迁移页面外围，不重画游戏桌面和牌面**

大厅、排行榜、游戏说明、记录列表、通用弹层与导航使用主题 token；牌桌、筹码、牌面、胜负动画和游戏状态色保持原样。空态与普通说明文字在深色时须可读。

```css
.game-history-panel { background: #fff; color: #171717; }
.theme-dark .game-history-panel { background: #111; color: #ededed; }
```

- [ ] **Step 3: 检查游戏入口和全屏返回路径**

Run: `node --test tests/theme.test.mjs`
Expected: 核心主题测试通过；H5/设备预览中确认全屏退出、牌桌颜色和外围导航均正常。

### Task 16: 迁移 VIP、商城装饰与抽奖页

**Files:**
- Modify: `pages/vip/index.vue`, `pages/fancy/shop.vue`, `pages/lottery/index.vue`

**Interfaces:**
- Consumes: `themeClass` 和语义状态色。
- Produces: 三个专属视觉页面的外围控件、文字和 surface 适配双主题。

- [ ] **Step 1: 绑定页面根主题类**

```vue
<view class="vip-page" :class="themeClass">
```

- [ ] **Step 2: 保持会员金紫与奖级色，迁移通用控件**

只迁移页面底色、文字、普通说明卡、表单、导航和弹层；VIP 权益金紫色、商品图案、奖牌、奖级和中奖反馈维持各自语义。深色页面不得降低奖级和金额标签对比度。

```css
.vip-description { background: #fff; color: #171717; }
.theme-dark .vip-description { background: #111; color: #ededed; }
```

- [ ] **Step 3: 对比浅/深主题截图**

Run: `node --test tests/theme.test.mjs`
Expected: 核心测试通过；VIP 资产色彩、奖级层次及通用文本在两套主题中保留。

### Task 17: 迁移视频播放器与 nvue 覆盖层

**Files:**
- Modify: `pages/video/video.vue`, `detail.vue`, `search.vue`, `parser-setting.vue`, `play-history.vue`, `fullplay.vue`
- Modify: `pages/videoplayer/douyin.nvue`, `pages/video/overlay.nvue`
- Modify: `components/DouyinPlayer.vue`, `components/HlsVideoPlayer.vue`

**Interfaces:**
- Consumes: 双主题状态和媒体内容保留规则。
- Produces: 视频页面外围、播放器控制/评论层、nvue 子视图的主题适配。

- [ ] **Step 1: 绑定 Vue 页面与播放器组件主题类**

`fullplay.vue` 当前使用非 scoped style，按现有编译方式显式限定其主题选择器，避免污染其它页面。`overlay.nvue` 是 `fullplay` 的 subNVue 页面，不假设它会继承父页 mixin 或 class；直接从 `common/theme.js` 订阅 `themeState`，应用有效主题到自己的根和面板样式。两个 `.nvue` 页面须显式处理系统主题事件后立即更新的状态。

```vue
<view class="video-container" :class="themeClass">
```

- [ ] **Step 2: 使用 nvue 支持的数组 class 与内联样式**

给 `douyin.nvue`、`overlay.nvue` 根节点采用 nvue 支持的 class 数组写法；不要使用 CSS 媒体查询、H5 document DOM 或 Vue 页面全局样式作为 nvue 主题实现。对 nvue 控制条、评论面板、输入行和遮罩依据 `themeState.effectiveTheme` 绑定受支持的属性值。

```vue
<view :class="['page', themeClass]">
```

- [ ] **Step 3: 迁移播放器界面，同时保护视频图像**

统一控制条、评论/分享/打赏面板、普通文案和表单背景；视频帧、封面、用户头像及播放状态图标不加色调滤镜。

```css
.comment-sheet { background: #fff; color: #171717; }
.theme-dark .comment-sheet { background: #111; color: #ededed; }
```

- [ ] **Step 4: 验证全屏和播放器覆盖层**

Run: `node --test --test-name-pattern='pages/(video|videoplayer)/' tests/theme-page-coverage.test.mjs`
Run: `node --test --test-name-pattern='components/(DouyinPlayer|HlsVideoPlayer)' tests/theme-component-coverage.test.mjs`
Run: `node --test tests/theme.test.mjs`
Expected: 核心测试通过；目标平台检查播放器打开/关闭、评论面板、状态栏和覆盖层没有白底残留或布局跳动。

### Task 18: 完成路由覆盖与中性色遗留扫描

**Files:**
- Modify: 本计划中所有路由页面与共享组件
- Test: `tests/theme-page-coverage.test.mjs`, `tests/theme-component-coverage.test.mjs`, `tests/theme-config.test.mjs`, `tests/theme-settings.test.mjs`
- Test: `tests/security-hardening.test.mjs`

**Interfaces:**
- Consumes: 全部页面根主题类和主题语义规则。
- Produces: 全量注册路由、子视图、设置入口和现有安全行为的最终回归结果。

- [ ] **Step 1: 运行路由主题覆盖测试并修复缺失根节点**

Run: `node --test tests/theme-page-coverage.test.mjs tests/theme-component-coverage.test.mjs`
Expected: 104 条路由、`pages/video/overlay.nvue` 和 24 个可视 Vue 组件均通过根节点绑定检查。

- [ ] **Step 2: 搜索残留硬编码中性色并逐项判定**

Run: `rg -n -i "#[0-9a-f]{3,8}|rgba?\(" pages components App.vue uni.scss`
Expected: 每个残留颜色均归类为主题 token、内容资产/游戏/VIP语义色、遮罩/透明叠层，或继续迁移的遗漏；没有未分类的页面背景、主文字、输入框或分隔线颜色。

- [ ] **Step 3: 运行完整自动化与配置校验**

Run: `node --test tests/*.test.mjs`
Run: `node -e "for (const f of ['manifest.json','theme.json']) JSON.parse(require('node:fs').readFileSync(f,'utf8'))"`
Expected: 所有测试通过；manifest/theme.json 可解析，pages.json 在六个目标平台展开后均可解析且保留 104 条路由。

- [ ] **Step 4: 做代表性页面两主题视觉验收**

H5/可用运行器逐页验收首页、圈子/帖子、消息聊天、个人中心/设置、登录、管理页、商品、游戏、VIP、抽奖和视频播放器；确认文字对比、表单反馈、安全区和图像原色。若 HBuilderX 不可用，记录缺失的平台运行验证，不以静态测试代替视觉通过声明。

## 完成条件

`system/light/dark` 三种偏好行为正确；所有注册路由和播放器子视图覆盖主题类；设置偏好即时生效且本机保存；页面通用中性色、分组和控件在浅/深模式一致；内容专属色及业务行为保留；全部自动测试、配置解析和可用平台视觉验收结果有明确记录。
