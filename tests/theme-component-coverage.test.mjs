import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')

async function componentFiles() {
  const entries = await readdir(new URL('components/', repoRoot), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.vue')) files.push(`components/${entry.name}`)
    if (entry.isDirectory()) {
      for (const child of await readdir(new URL(`components/${entry.name}/`, repoRoot))) {
        if (child.endsWith('.vue')) files.push(`components/${entry.name}/${child}`)
      }
    }
  }
  return files.sort()
}

function rootBindsTheme(source) {
  const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] || ''
  const root = template.match(/<(?:view|scroll-view|div)\b([^>]*)>/s)
  return Boolean(root && /\bthemeClass\b/.test(root[1]))
}

const files = await componentFiles()
for (const path of files) {
  test(`theme root: ${path}`, async () => {
    const source = await readRepoFile(path)
    assert.ok(rootBindsTheme(source), `${path} root must bind themeClass`)
  })
}

test('script setup components import the shared theme class', async () => {
  for (const path of files) {
    const source = await readRepoFile(path)
    if (!source.includes('<script setup')) continue
    if (!rootBindsTheme(source)) continue
    if (path.endsWith('czy712-liquidglass.vue')) continue
    assert.match(source, /import \{ themeClass \} from '\.\.\/common\/theme\.js'/, path)
  }
})

test('shared neutral theme layer defines both required palettes', async () => {
  const source = await readRepoFile('App.vue')
  for (const pair of [
    ['--cr-canvas: #fafafa', '--cr-canvas: #0a0a0a'],
    ['--cr-surface: #ffffff', '--cr-surface: #111111'],
    ['--cr-text: #171717', '--cr-text: #ededed'],
    ['--cr-text-muted: #666666', '--cr-text-muted: #a1a1a1'],
    ['--cr-border: #e0e0e0', '--cr-border: #2e2e2e'],
    ['--cr-action: #000000', '--cr-action: #ffffff']
  ]) {
    assert.ok(source.includes(pair[0]), `missing light token: ${pair[0]}`)
    assert.ok(source.includes(pair[1]), `missing dark token: ${pair[1]}`)
  }
})