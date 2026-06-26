export type TextTransformMode = 'trim' | 'upper' | 'lower' | 'split' | 'regex' | 'replace' | 'slice'

export function runTextTransform(input: string, config: Record<string, string>): string {
  const mode = (config.mode ?? 'trim') as TextTransformMode

  switch (mode) {
    case 'trim':
      return input.trim()
    case 'upper':
      return input.toUpperCase()
    case 'lower':
      return input.toLowerCase()
    case 'split': {
      const sep = config.separator ?? '\n'
      const lines = input.split(sep).map((l) => l.trim()).filter(Boolean)
      return lines.join('\n')
    }
    case 'regex': {
      const pattern = config.pattern ?? ''
      if (!pattern) throw new Error('Regex mode requires a pattern in config')
      const flags = config.flags ?? 'g'
      const re = new RegExp(pattern, flags)
      const matches = input.match(re)
      return matches?.join('\n') ?? ''
    }
    case 'replace': {
      const pattern = config.pattern ?? ''
      const replacement = config.replacement ?? ''
      if (!pattern) throw new Error('Replace mode requires a pattern in config')
      const flags = config.flags ?? 'g'
      return input.replace(new RegExp(pattern, flags), replacement)
    }
    case 'slice': {
      const start = Number(config.start ?? 0)
      const end = config.end ? Number(config.end) : undefined
      return input.slice(start, end)
    }
    default:
      return input.trim()
  }
}
