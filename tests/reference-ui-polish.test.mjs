import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')

test('CloudRail reference-inspired visual baseline is scoped to product tokens', async () => {
  const app = await readRepoFile('App.vue')
  assert.match(app, /--cr-canvas:\s*#f4f4f4/)
  assert.match(app, /--cr-surface:\s*#ffffff/)
  assert.match(app, /--cr-panel-radius:\s*28rpx/)
  assert.match(app, /--cr-panel-shadow:/)
  assert.match(app, /--cr-glass:/)
  assert.match(app, /--cr-canvas:\s*#0a0a0a/)
})

test('home navigation and bottom navigation use the refined hierarchy', async () => {
  const home = await readRepoFile('pages/index/index.vue')
  const tabBar = await readRepoFile('components/CustomTabBar.vue')
  assert.match(home, /\.custom-app-bar[\s\S]*?backdrop-filter:\s*blur/)
  assert.match(home, /\.nav-center-tabs[\s\S]*?gap:\s*24rpx/)
  assert.match(home, /\.active-line[\s\S]*?width:\s*20rpx/)
  assert.match(tabBar, /\.tab-bar-panel[\s\S]*?backdrop-filter:\s*blur/)
  assert.match(tabBar, /\.tab-text-large\.active[\s\S]*?color:\s*var\(--cr-text\)/)
  assert.match(tabBar, /\.publish-btn[\s\S]*?background:\s*var\(--cr-action\)/)
})

test('content cards use the quieter reference-inspired surface treatment', async () => {
  const waterfall = await readRepoFile('components/WaterfallTheme.vue')
  const textFlow = await readRepoFile('components/HomeTextFlowTheme.vue')
  const dynamicFeed = await readRepoFile('components/DynamicFeed.vue')
  for (const source of [waterfall, textFlow, dynamicFeed]) {
    assert.match(source, /border-radius:\s*(?:24|28)rpx/)
    assert.match(source, /var\(--cr-surface\)/)
  }
  assert.match(waterfall, /\.post-card[\s\S]*?box-shadow:\s*var\(--cr-panel-shadow\)/)
  assert.match(textFlow, /\.feed-card[\s\S]*?box-shadow:\s*var\(--cr-panel-shadow\)/)
  assert.match(dynamicFeed, /\.dynamic-item[\s\S]*?box-shadow:\s*var\(--cr-panel-shadow\)/)
})
test('home quick entries inherit the product text theme', async () => {
  for (const path of ['components/HomeTextFlowTheme.vue', 'components/WaterfallTheme.vue']) {
    const source = await readRepoFile(path)
    assert.match(source, /\.quick-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(6,\s*1fr\)/)
    assert.match(source, /\.quick-grid\s*\{[\s\S]*?gap:\s*12rpx/)
    assert.match(source, /\.quick-item\s*\{[\s\S]*?gap:\s*12rpx/)
    assert.match(source, /\.quick-title\s*\{[\s\S]*?color:\s*var\(--cr-text\)/)
  }
})

test('home avatar uses a neutral placeholder instead of the brand logo', async () => {
  const home = await readRepoFile('pages/index/index.vue')
  assert.match(home, /nav-avatar-placeholder/)
  assert.match(home, /user-circle-white\.svg/)
  assert.doesNotMatch(home, /defaultAvatar:\s*'\/static\/logo\.png'/)
})

test('main-flow icon containers use one restrained visual treatment', async () => {
  for (const path of ['components/HomeTextFlowTheme.vue', 'components/WaterfallTheme.vue']) {
    const source = await readRepoFile(path)
    assert.match(source, /\.quick-icon\s*\{[\s\S]*?border:\s*1rpx solid rgba\(255, 255, 255, 0\.22\)/)
    assert.match(source, /\.quick-icon-svg\s*\{[\s\S]*?width:\s*44rpx;[\s\S]*?height:\s*44rpx;/)
  }
})
