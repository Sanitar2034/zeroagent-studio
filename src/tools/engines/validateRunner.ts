export type ValidatePreset =
  | 'is-json'
  | 'is-url'
  | 'is-email'
  | 'matches-regex'
  | 'not-empty'
  | 'is-number'
  | 'is-integer'
  | 'in-range'
  | 'is-uuid'
  | 'is-ipv4'
  | 'is-hex'
  | 'is-base64'
  | 'min-length'
  | 'max-length'
  | 'contains'
  | 'equals-ignore-case'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/
const HEX_RE = /^[0-9a-fA-F]+$/
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/

export function runValidatePreset(preset: ValidatePreset, input: string, config: Record<string, string>): string {
  const text = input.trim()

  switch (preset) {
    case 'is-json':
      try {
        JSON.parse(text)
        return 'true'
      } catch {
        return 'false'
      }
    case 'is-url':
      try {
        const u = new URL(text)
        return String(u.protocol === 'http:' || u.protocol === 'https:')
      } catch {
        return 'false'
      }
    case 'is-email':
      return String(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
    case 'is-uuid':
      return String(UUID_RE.test(text))
    case 'is-ipv4':
      return String(IPV4_RE.test(text))
    case 'is-hex':
      return String(HEX_RE.test(text))
    case 'is-base64':
      return String(BASE64_RE.test(text))
    case 'matches-regex': {
      const pattern = config.pattern ?? ''
      if (!pattern) throw new Error('matches-regex requires config.pattern')
      const flags = config.flags ?? ''
      return String(new RegExp(pattern, flags).test(text))
    }
    case 'contains':
      return String(text.includes(config.text ?? ''))
    case 'equals-ignore-case':
      return String(text.toLowerCase() === (config.text ?? '').toLowerCase())
    case 'not-empty':
      return String(text.length > 0)
    case 'min-length':
      return String(text.length >= Number(config.min ?? 1))
    case 'max-length':
      return String(text.length <= Number(config.max ?? 100))
    case 'is-number':
      return String(Number.isFinite(Number(text)))
    case 'is-integer':
      return String(Number.isInteger(Number(text)))
    case 'in-range': {
      const n = Number(text)
      const min = Number(config.min ?? 0)
      const max = Number(config.max ?? 100)
      return String(Number.isFinite(n) && n >= min && n <= max)
    }
    default:
      return 'false'
  }
}
