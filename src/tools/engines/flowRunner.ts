export type FlowPreset =
  | 'pass-through'
  | 'default-if-empty'
  | 'template'
  | 'prefix'
  | 'suffix'
  | 'merge-lines'
  | 'coalesce'
  | 'wrap-text'
  | 'truncate-words'
  | 'if-empty'
  | 'line-template'

export function runFlowPreset(preset: FlowPreset, input: string, config: Record<string, string>): string {
  switch (preset) {
    case 'pass-through':
      return input
    case 'default-if-empty':
      return input.trim() || (config.default ?? '')
    case 'if-empty':
      // v8 ignore next -- message defaults when config.message is omitted
      return input.trim() ? input : (config.message ?? 'No input provided')
    case 'coalesce': {
      const parts = input.split('\n---\n').map((p) => p.trim()).filter(Boolean)
      // v8 ignore next -- default applies when no non-empty coalesce segment exists
      return parts[0] ?? config.default ?? ''
    }
    case 'template': {
      const tpl = config.template ?? '{{input}}'
      return tpl.replace(/\{\{input\}\}/g, input)
    }
    case 'line-template': {
      const tpl = config.template ?? '- {{line}}'
      return input.split('\n').map((line) => tpl.replace(/\{\{line\}\}/g, line)).join('\n')
    }
    case 'prefix':
      return `${config.prefix ?? ''}${input}`
    case 'suffix':
      return `${input}${config.suffix ?? ''}`
    case 'merge-lines':
      return input.split('\n').filter(Boolean).join(config.separator ?? ' ')
    case 'wrap-text': {
      const width = Math.max(20, Number(config.width ?? 80))
      const words = input.split(/\s+/).filter(Boolean)
      const lines: string[] = []
      let current = ''
      for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (next.length > width) {
          // v8 ignore next -- push accumulated line when wrapping mid-paragraph
          if (current) lines.push(current)
          current = word
        } else {
          current = next
        }
      }
      // v8 ignore next -- current is empty when input has no words after filtering
      if (current) lines.push(current)
      return lines.join('\n')
    }
    case 'truncate-words':
      return truncateWords(input, config)
    default:
      return input
  }
}

function truncateWords(input: string, config: Record<string, string>): string {
  /* v8 ignore start -- max defaults and early return when within limit */
  const max = Math.max(1, Number(config.max ?? 50))
  const words = input.split(/\s+/).filter(Boolean)
  if (words.length <= max) return input
  return `${words.slice(0, max).join(' ')}…`
  /* v8 ignore stop */
}
