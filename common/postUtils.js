import { baseUrl } from './request.js'

export function formatTime(timeStr) {
  if (!timeStr) return ''

  let date
  if (typeof timeStr === 'number') {
    if (String(timeStr).length === 10) timeStr = timeStr * 1000
    date = new Date(timeStr)
  } else {
    date = new Date(String(timeStr).replace(/-/g, '/'))
  }

  if (isNaN(date.getTime())) return String(timeStr)

  const now = new Date()
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (sec < 60) return '刚刚'
  if (sec < 3600) return Math.floor(sec / 60) + '分钟前'
  if (sec < 86400) return Math.floor(sec / 3600) + '小时前'
  if (sec < 259200) return Math.floor(sec / 86400) + '天前'

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return y === now.getFullYear() ? `${m}-${d}` : `${y}-${m}-${d}`
}

export function parseLinksToNodes(text) {
  const nodes = []
  if (!text) return nodes

  const reg = /(https?:\/\/[^\s]+)/g
  let last = 0
  let m

  while ((m = reg.exec(text)) !== null) {
    const before = text.slice(last, m.index)
    if (before) nodes.push({ type: 'text', text: before })
    nodes.push({ type: 'link', text: m[0], url: m[0] })
    last = reg.lastIndex
  }

  const rest = text.slice(last)
  if (rest) nodes.push({ type: 'text', text: rest })
  return nodes
}

export function parseRichTextToNodes(text) {
  if (!text) return []
  text = String(text)

  const nodes = []
  const mentionReg = /@\[(.*?)\]\(uid:(\d+)\)/g
  let lastIndex = 0
  let m

  while ((m = mentionReg.exec(text)) !== null) {
    const before = text.slice(lastIndex, m.index)
    if (before) nodes.push(...parseLinksToNodes(before))
    nodes.push({ type: 'mention', text: '@' + (m[1] || ''), userId: parseInt(m[2]) || 0 })
    lastIndex = mentionReg.lastIndex
  }

  const rest = text.slice(lastIndex)
  if (rest) nodes.push(...parseLinksToNodes(rest))
  return nodes
}

export function buildMediaUrl(url) {
  if (!url) return ''
  url = String(url).trim()

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) return url

  let root = baseUrl || ''
  root = root.replace(/\/API\/?$/i, '')
  if (root.endsWith('/')) root = root.slice(0, -1)
  if (!url.startsWith('/')) url = '/' + url

  return root + url
}
