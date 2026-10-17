import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')

test('theme selection is local and exposes all preference modes', async () => {
  const source = await readRepoFile('pages/user/setting.vue')
  const adapter = await readRepoFile('common/theme.js')

  assert.match(source, /外观/)
  assert.match(source, /跟随系统/)
  assert.match(source, /浅色/)
  assert.match(source, /深色/)
  assert.match(source, /themeState\.mode/)
  assert.match(source, /setThemeMode\(/)
  assert.match(source, /themeOptions/)

  const chooseThemeBody = source.match(/chooseTheme\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] || ''
  assert.match(chooseThemeBody, /setThemeMode\(/)
  assert.doesNotMatch(chooseThemeBody, /\brequest\s*\(/)
  assert.doesNotMatch(source, /request\([^)]*theme/i)
  assert.match(adapter, /export function setThemeMode\(mode\)/)
  assert.match(adapter, /export const themeState/)
  assert.match(adapter, /writePreference/)
})

test('settings page root and both neutral palettes are explicit', async () => {
  const source = await readRepoFile('pages/user/setting.vue')
  const root = source.match(/<view\b[^>]*>/)?.[0] || ''
  assert.match(root, /:class="themeClass"/)
  assert.match(source, /\.theme-dark\.setting-page\s*\{[^}]*background:\s*#0a0a0a/i)
  assert.match(source, /\.theme-dark \.cell-group\s*\{[^}]*background:\s*#111111/i)
  assert.match(source, /\.theme-dark \.cell-label\s*\{[^}]*color:\s*#ededed/i)
})