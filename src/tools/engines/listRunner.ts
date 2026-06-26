export type ListPreset =
  | 'split-lines'
  | 'join-lines'
  | 'dedupe-lines'
  | 'sort-lines'
  | 'sort-lines-desc'
  | 'reverse-lines'
  | 'head'
  | 'tail'
  | 'nth-line'
  | 'filter-empty'
  | 'numbered-lines'
  | 'shuffle-lines'
  | 'grep-lines'
  | 'grep-lines-inverse'
  | 'count-matching'
  | 'unique-lines'
  | 'group-by-prefix'
  | 'zip-lines'
  | 'enumerate-lines'
  | 'sample-lines'

function lines(input: string): string[] {
  return input.split('\n')
}

function regexFromConfig(config: Record<string, string>): RegExp {
  const pattern = config.pattern ?? ''
  if (!pattern) throw new Error('Pattern is required in config.pattern')
  return new RegExp(pattern, config.flags ?? '')
}

export function runListPreset(preset: ListPreset, input: string, config: Record<string, string>): string {
  switch (preset) {
    case 'split-lines':
      return lines(input).join('\n---\n')
    case 'join-lines': {
      const sep = config.separator ?? '\n'
      return lines(input).join(sep)
    }
    case 'dedupe-lines':
      return [...new Set(lines(input))].join('\n')
    case 'unique-lines':
      return [...new Set(lines(input).map((l) => l.trim()).filter(Boolean))].join('\n')
    case 'sort-lines':
      return [...lines(input)].sort((a, b) => a.localeCompare(b)).join('\n')
    case 'sort-lines-desc':
      return [...lines(input)].sort((a, b) => b.localeCompare(a)).join('\n')
    case 'reverse-lines':
      return [...lines(input)].reverse().join('\n')
    case 'head': {
      const n = Number(config.n ?? 5)
      return lines(input).slice(0, n).join('\n')
    }
    case 'tail': {
      const n = Number(config.n ?? 5)
      return lines(input).slice(-n).join('\n')
    }
    case 'nth-line': {
      const n = Number(config.n ?? 0)
      const arr = lines(input)
      return arr[n] ?? ''
    }
    case 'filter-empty':
      return lines(input).filter((l) => l.trim()).join('\n')
    case 'numbered-lines':
      return lines(input).map((l, i) => `${i + 1}. ${l}`).join('\n')
    case 'enumerate-lines':
      return lines(input).map((l, i) => `${i}: ${l}`).join('\n')
    case 'shuffle-lines': {
      const arr = [...lines(input)]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
      }
      return arr.join('\n')
    }
    case 'grep-lines': {
      const re = regexFromConfig(config)
      return lines(input).filter((l) => re.test(l)).join('\n')
    }
    case 'grep-lines-inverse': {
      const re = regexFromConfig(config)
      return lines(input).filter((l) => !re.test(l)).join('\n')
    }
    case 'count-matching': {
      const re = regexFromConfig(config)
      return String(lines(input).filter((l) => re.test(l)).length)
    }
    case 'group-by-prefix': {
      const delimiter = config.delimiter ?? '/'
      const groups = new Map<string, string[]>()
      for (const line of lines(input).filter(Boolean)) {
        // v8 ignore next -- lines without delimiter use the full line as prefix
        const prefix = line.split(delimiter)[0] ?? line
        const bucket = groups.get(prefix) ?? []
        bucket.push(line)
        groups.set(prefix, bucket)
      }
      return [...groups.entries()].map(([key, vals]) => `${key} (${vals.length})\n${vals.join('\n')}`).join('\n\n')
    }
    case 'zip-lines': {
      const other = (config.other ?? '').split('\n')
      return lines(input)
        .map((line, i) => `${line}${config.separator ?? ' | '}${other[i] ?? ''}`)
        .join('\n')
    }
    case 'sample-lines': {
      const n = Math.max(1, Number(config.n ?? 3))
      const arr = lines(input).filter(Boolean)
      const picked: string[] = []
      const pool = [...arr]
      while (picked.length < n && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length)
        picked.push(pool.splice(idx, 1)[0]!)
      }
      return picked.join('\n')
    }
    default:
      return input
  }
}
