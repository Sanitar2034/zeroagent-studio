export type StringPreset =
  | 'trim'
  | 'upper'
  | 'lower'
  | 'slug'
  | 'reverse'
  | 'word-count'
  | 'line-count'
  | 'char-count'
  | 'pad-start'
  | 'pad-end'
  | 'collapse-spaces'
  | 'title-case'
  | 'snake-case'
  | 'kebab-case'
  | 'camel-case'
  | 'truncate'
  | 'repeat'
  | 'remove-empty-lines'
  | 'extract-urls'
  | 'extract-emails'
  | 'split-words'
  | 'join-words'
  | 'replace-all'
  | 'normalize-spaces'
  | 'strip-bom'
  | 'indent-lines'

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/gi

export function runStringPreset(preset: StringPreset, input: string, config: Record<string, string>): string {
  const text = input

  switch (preset) {
    case 'trim':
      return text.trim()
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'slug':
      return text
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    case 'reverse':
      return [...text].reverse().join('')
    case 'word-count':
      return String(text.trim().split(/\s+/).filter(Boolean).length)
    case 'line-count':
      return String(text.split('\n').length)
    case 'char-count':
      return String(text.length)
    case 'pad-start': {
      const len = Number(config.length ?? 20)
      const ch = config.char ?? ' '
      return text.padStart(len, ch)
    }
    case 'pad-end': {
      const len = Number(config.length ?? 20)
      const ch = config.char ?? ' '
      return text.padEnd(len, ch)
    }
    case 'collapse-spaces':
      return text.replace(/\s+/g, ' ').trim()
    case 'title-case':
      return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    case 'snake-case':
      return text
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .toLowerCase()
        .replace(/^_|_$/g, '')
    case 'kebab-case':
      return text
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .toLowerCase()
        .replace(/^-|-$/g, '')
    case 'camel-case': {
      const parts = text.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean)
      if (parts.length === 0) return ''
      return parts
        .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
        .join('')
    }
    case 'truncate': {
      const max = Number(config.max ?? 100)
      return text.length > max ? `${text.slice(0, max)}…` : text
    }
    case 'repeat': {
      const n = Math.min(Number(config.times ?? 2), 50)
      return text.repeat(Math.max(1, n))
    }
    case 'remove-empty-lines':
      return text.split('\n').filter((l) => l.trim()).join('\n')
    case 'extract-urls':
      return (text.match(URL_RE) ?? []).join('\n')
    case 'extract-emails':
      return (text.match(EMAIL_RE) ?? []).join('\n')
    case 'split-words':
      return text.trim().split(/\s+/).filter(Boolean).join('\n')
    case 'join-words':
      return text.split('\n').filter(Boolean).join(config.separator ?? ' ')
    case 'replace-all': {
      const search = config.search ?? ''
      if (!search) throw new Error('Replace All requires config.search')
      return text.split(search).join(config.replace ?? '')
    }
    case 'normalize-spaces':
      return text.normalize('NFKC').replace(/\s+/g, ' ').trim()
    case 'strip-bom':
      return text.replace(/^\uFEFF/, '')
    case 'indent-lines': {
      const prefix = config.prefix ?? '  '
      return text.split('\n').map((line) => `${prefix}${line}`).join('\n')
    }
    default:
      return text.trim()
  }
}
