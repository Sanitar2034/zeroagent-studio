export type DatePreset =
  | 'now-iso'
  | 'now-unix'
  | 'format'
  | 'parse-iso'
  | 'add-days'
  | 'diff-days'
  | 'to-utc'
  | 'weekday'
  | 'add-hours'
  | 'add-minutes'
  | 'start-of-day'
  | 'relative-days'
  | 'is-before'

function parseDate(input: string, fallback = new Date()): Date {
  const d = input.trim() ? new Date(input) : new Date(fallback)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d
}

export function runDatePreset(preset: DatePreset, input: string, config: Record<string, string>): string {
  const now = new Date()

  switch (preset) {
    case 'now-iso':
      return now.toISOString()
    case 'now-unix':
      return String(Math.floor(now.getTime() / 1000))
    case 'format': {
      const d = parseDate(input, now)
      const fmt = config.format ?? 'en-US'
      return d.toLocaleString(fmt)
    }
    case 'parse-iso':
      return parseDate(input).toISOString()
    case 'add-days': {
      const d = parseDate(input, now)
      d.setDate(d.getDate() + Number(config.days ?? 1))
      return d.toISOString()
    }
    case 'add-hours': {
      const d = parseDate(input, now)
      d.setHours(d.getHours() + Number(config.hours ?? 1))
      return d.toISOString()
    }
    case 'add-minutes': {
      const d = parseDate(input, now)
      d.setMinutes(d.getMinutes() + Number(config.minutes ?? 15))
      return d.toISOString()
    }
    case 'start-of-day': {
      const d = parseDate(input, now)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    case 'relative-days': {
      const days = Number(config.days ?? 0)
      const d = parseDate(input, now)
      d.setDate(d.getDate() + days)
      const label = days === 0 ? 'today' : days > 0 ? `in ${days} day(s)` : `${Math.abs(days)} day(s) ago`
      return `${d.toISOString()} (${label})`
    }
    case 'is-before': {
      const a = parseDate(input)
      const b = parseDate(config.other ?? now.toISOString())
      return String(a.getTime() < b.getTime())
    }
    case 'diff-days': {
      const a = parseDate(input)
      const b = parseDate(config.other ?? now.toISOString())
      return String(Math.round((a.getTime() - b.getTime()) / 86400000))
    }
    case 'to-utc':
      return parseDate(input).toUTCString()
    case 'weekday':
      return parseDate(input, now).toLocaleDateString('en-US', { weekday: 'long' })
    default:
      return now.toISOString()
  }
}
