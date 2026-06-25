export type MarkdownPreset =
  | 'to-text'
  | 'strip'
  | 'extract-headings'
  | 'extract-links'
  | 'extract-code'
  | 'to-bullets'
  | 'word-count'
  | 'read-time'

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function runMarkdownPreset(preset: MarkdownPreset, input: string, config: Record<string, string>): string {
  switch (preset) {
    case 'to-text':
    case 'strip':
      return stripMarkdown(input)
    case 'extract-headings':
      return [...input.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1]!.trim()).join('\n')
    case 'extract-links':
      return [...input.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
        .map((m) => `${m[1]}: ${m[2]}`)
        .join('\n')
    case 'extract-code':
      return [...input.matchAll(/```[\w]*\n?([\s\S]*?)```/g)].map((m) => m[1]!.trim()).join('\n\n---\n\n')
    case 'to-bullets':
      return input
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `- ${stripMarkdown(l)}`)
        .join('\n')
    case 'word-count': {
      const words = stripMarkdown(input).split(/\s+/).filter(Boolean)
      return String(words.length)
    }
    case 'read-time': {
      const words = stripMarkdown(input).split(/\s+/).filter(Boolean).length
      const wpm = Number(config.wpm ?? 200)
      const minutes = Math.max(1, Math.ceil(words / wpm))
      return `${minutes} min read (${words} words)`
    }
    default:
      return stripMarkdown(input)
  }
}
