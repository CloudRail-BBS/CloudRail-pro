import { readFile } from 'node:fs/promises'

const repoRoot = new URL('../../', import.meta.url)

export async function readUniConfig(path, platform) {
  const source = await readFile(new URL(path, repoRoot), 'utf8')
  const active = [true]
  const output = []

  for (const line of source.split(/\r?\n/)) {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef)\s+(.+)\s*$/)
    if (directive) {
      const targets = directive[2].split(/\s*\|\|\s*/).map((target) => target.trim())
      const matches = targets.includes(platform)
      active.push(active.at(-1) && (directive[1] === 'ifdef' ? matches : !matches))
      continue
    }

    if (/^\s*\/\/\s*#endif\s*$/.test(line)) {
      if (active.length === 1) throw new Error('unmatched #endif')
      active.pop()
      continue
    }

    if (active.at(-1)) output.push(line)
  }

  if (active.length !== 1) throw new Error('unclosed platform conditional')
  return JSON.parse(output.join('\n'))
}