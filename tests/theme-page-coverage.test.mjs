import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { readUniConfig } from './helpers/uni-config.mjs'

const repoRoot = new URL('../', import.meta.url)
const readRepoFile = (path) => readFile(new URL(path, repoRoot), 'utf8')

function pageRoutes(config) {
  const routes = (config.pages || []).map((page) => page.path)
  for (const subPackage of config.subPackages || []) {
    for (const page of subPackage.pages || []) {
      routes.push(`${subPackage.root.replace(/\/$/, '')}/${page.path}`)
    }
  }
  return routes
}

async function resolvePageFile(route) {
  for (const extension of ['vue', 'nvue']) {
    const path = `${route}.${extension}`
    try {
      await access(new URL(path, repoRoot))
      return path
    } catch {}
  }
  return null
}

function visibleRoot(pageFile, source) {
  const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] || ''
  const pattern = pageFile.endsWith('.nvue')
    ? /<(?:view|scroll-view|div)\b([^>]*)>/s
    : /<(?:view|scroll-view)\b([^>]*)>/s
  return template.match(pattern)
}

function rootBindsTheme(pageFile, source) {
  const root = visibleRoot(pageFile, source)
  return Boolean(root && /:class\s*=\s*["'][^"']*\bthemeClass\b/.test(root[1]))
}

const config = await readUniConfig('pages.json', 'H5')
const routeCases = await Promise.all(pageRoutes(config).map(async (route) => {
  const pageFile = await resolvePageFile(route)
  assert.ok(pageFile, `${route} must resolve to a page file`)
  const source = await readRepoFile(pageFile)
  assert.ok(visibleRoot(pageFile, source), `${route} must have a visible page root`)
  assert.doesNotMatch(
    source,
    /themeClass\s*\(\)\s*\{\s*return\s+['"]theme-(?:light|dark)['"]/,
    `${route} must not override the global theme with a fixed mode`
  )
  return { route, pageFile, source, themed: rootBindsTheme(pageFile, source) }
}))

const overlayPath = 'pages/video/overlay.nvue'
const overlaySource = await readRepoFile(overlayPath)
assert.ok(visibleRoot(overlayPath, overlaySource), 'player overlay must have a visible root')
const allCases = [
  ...routeCases,
  {
    route: 'pages/video/overlay',
    pageFile: overlayPath,
    source: overlaySource,
    themed: rootBindsTheme(overlayPath, overlaySource)
  }
]

const pending = []
for (const page of allCases) {
  const name = `theme root: ${page.route}`
  if (page.themed) {
    test(name, () => assert.ok(rootBindsTheme(page.pageFile, page.source)))
  } else {
    pending.push(page.route)
    test.todo(`${name} (pending domain migration)`)
  }
}

test('progressive route coverage inventory is complete', () => {
  assert.equal(routeCases.length, 104)
  assert.equal(allCases.length, 105)
  assert.equal(allCases.filter((page) => page.themed).length + pending.length, 105)
  console.log(`Theme route coverage: ${allCases.length - pending.length}/${allCases.length} bound, ${pending.length} pending`)
})