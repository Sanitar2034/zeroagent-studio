export type RegexPreset =
  | 'extract-first'
  | 'extract-all'
  | 'replace'
  | 'split'
  | 'test'
  | 'capture-groups'
  | 'escape'
  | 'extract-emails'

function regexFromConfig(config: Record<string, string>): RegExp {
  const pattern = config.pattern ?? ''
  if (!pattern) throw new Error('Regex requires config.pattern')
  return new RegExp(pattern, config.flags ?? '')
}

export function runRegexPreset(preset: RegexPreset, input: string, config: Record<string, string>): string {
  switch (preset) {
    case 'extract-first': {
      const match = input.match(regexFromConfig(config))
      return match?.[0] ?? ''
    }
    case 'extract-all': {
      const re = regexFromConfig(config)
      const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
      const global = new RegExp(re.source, flags)
      return [...input.matchAll(global)].map((m) => m[0]).join('\n')
    }
    case 'replace':
      return input.replace(regexFromConfig(config), config.replacement ?? '')
    case 'split':
      return input.split(regexFromConfig(config)).join('\n')
    case 'test':
      return String(regexFromConfig(config).test(input))
    case 'capture-groups': {
      const match = input.match(regexFromConfig(config))
      if (!match) return '[]'
      return JSON.stringify(match.slice(1), null, 2)
    }
    case 'escape':
      return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    case 'extract-emails':
      return [...input.matchAll(/[^\s@]+@[^\s@]+\.[^\s@]+/gi)].map((m) => m[0]).join('\n')
    default:
      return input
  }
}
