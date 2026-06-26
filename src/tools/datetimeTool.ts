export function runDatetimeTool(input: string, config: Record<string, string>): string {
  const mode = config.mode ?? 'format-now'
  const locale = config.locale ?? 'en-US'
  const timeZone = config.timeZone || undefined

  if (mode === 'format-now') {
    const format = config.format ?? 'datetime'
    const now = new Date()
    if (format === 'iso') return now.toISOString()
    if (format === 'date') {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(now)
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(now)
  }

  if (mode === 'parse') {
    const text = input.trim() || config.value?.trim()
    if (!text) throw new Error('Parse mode needs upstream input or config.value')
    const parsed = new Date(text)
    if (Number.isNaN(parsed.getTime())) throw new Error(`Could not parse date: ${text}`)
    return parsed.toISOString()
  }

  throw new Error(`Unknown datetime mode: ${mode}`)
}
