function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Split untrusted text into plain-text segments for safe template rendering. */
export function splitHighlightedText(value, keyword) {
  const text = value == null ? '' : String(value)
  const search = String(keyword || '').trim()
  if (!text || !search) return [{ text, highlighted: false }]

  const matcher = new RegExp(escapeRegExp(search), 'gi')
  const segments = []
  let lastIndex = 0
  let match

  while ((match = matcher.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), highlighted: false })
    }
    segments.push({ text: match[0], highlighted: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false })
  }

  return segments.length ? segments : [{ text, highlighted: false }]
}
