import {
  deleteJsonPath,
  flattenJson,
  getJsonPath,
  setJsonPath,
} from '../jsonTool'

export type JsonPreset =
  | 'pretty'
  | 'minify'
  | 'get-path'
  | 'keys'
  | 'values'
  | 'type-check'
  | 'stringify-string'
  | 'parse-string'
  | 'array-length'
  | 'is-array'
  | 'is-object'
  | 'merge'
  | 'set-path'
  | 'delete-path'
  | 'pick-keys'
  | 'omit-keys'
  | 'flatten'
  | 'sort-keys'
  | 'wrap-array'

function parseJson(input: string): unknown {
  return JSON.parse(input)
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys)
  if (typeof value !== 'object' || value === null) return value
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key])
  }
  return sorted
}

export function runJsonPreset(preset: JsonPreset, input: string, config: Record<string, string>): string {
  switch (preset) {
    case 'pretty': {
      const parsed = parseJson(input)
      return JSON.stringify(parsed, null, 2)
    }
    case 'minify': {
      const parsed = parseJson(input)
      return JSON.stringify(parsed)
    }
    case 'get-path': {
      const path = config.path ?? ''
      if (!path) throw new Error('Get path requires config.path')
      const parsed = parseJson(input)
      const value = getJsonPath(parsed, path)
      if (value === undefined) return ''
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    }
    case 'set-path': {
      const path = config.path ?? ''
      if (!path) throw new Error('Set path requires config.path')
      const parsed = input.trim() ? parseJson(input) : {}
      // v8 ignore next -- config.value defaults to empty string when omitted
      const valueRaw = config.value ?? ''
      let value: unknown
      try {
        value = JSON.parse(valueRaw)
      } catch {
        value = valueRaw
      }
      return JSON.stringify(setJsonPath(parsed, path, value), null, 2)
    }
    case 'delete-path': {
      const path = config.path ?? ''
      if (!path) throw new Error('Delete path requires config.path')
      const parsed = parseJson(input)
      return JSON.stringify(deleteJsonPath(parsed, path), null, 2)
    }
    case 'merge': {
      const otherRaw = config.other ?? '{}'
      const base = input.trim() ? parseJson(input) : {}
      const other = JSON.parse(otherRaw)
      if (typeof base !== 'object' || base === null || Array.isArray(base)) {
        throw new Error('Base input must be a JSON object')
      }
      if (typeof other !== 'object' || other === null || Array.isArray(other)) {
        throw new Error('config.other must be a JSON object')
      }
      return JSON.stringify({ ...(base as Record<string, unknown>), ...(other as Record<string, unknown>) }, null, 2)
    }
    case 'pick-keys': {
      const parsed = parseJson(input)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Input must be a JSON object')
      }
      const keys = (config.keys ?? '').split(',').map((k) => k.trim()).filter(Boolean)
      const out: Record<string, unknown> = {}
      for (const key of keys) {
        if (key in (parsed as Record<string, unknown>)) {
          out[key] = (parsed as Record<string, unknown>)[key]
        }
      }
      return JSON.stringify(out, null, 2)
    }
    case 'omit-keys': {
      const parsed = parseJson(input)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Input must be a JSON object')
      }
      const keys = new Set((config.keys ?? '').split(',').map((k) => k.trim()).filter(Boolean))
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (!keys.has(key)) out[key] = value
      }
      return JSON.stringify(out, null, 2)
    }
    case 'flatten': {
      const parsed = parseJson(input)
      const flat = flattenJson(parsed)
      return JSON.stringify(flat, null, 2)
    }
    case 'sort-keys': {
      const parsed = parseJson(input)
      return JSON.stringify(sortObjectKeys(parsed), null, 2)
    }
    case 'wrap-array': {
      const parsed = input.trim() ? parseJson(input) : input
      return JSON.stringify([parsed], null, 2)
    }
    case 'keys': {
      const parsed = parseJson(input)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Input must be a JSON object')
      }
      return Object.keys(parsed as Record<string, unknown>).join('\n')
    }
    case 'values': {
      const parsed = parseJson(input)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Input must be a JSON object')
      }
      return Object.values(parsed as Record<string, unknown>)
        .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
        .join('\n')
    }
    case 'type-check': {
      const parsed = parseJson(input)
      if (Array.isArray(parsed)) return 'array'
      if (parsed === null) return 'null'
      return typeof parsed
    }
    case 'stringify-string':
      return JSON.stringify(input)
    case 'parse-string': {
      const parsed = parseJson(input)
      if (typeof parsed !== 'string') throw new Error('JSON value is not a string')
      return parsed
    }
    case 'array-length': {
      const parsed = parseJson(input)
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array')
      return String(parsed.length)
    }
    case 'is-array': {
      try {
        return String(Array.isArray(parseJson(input)))
      } catch {
        return 'false'
      }
    }
    case 'is-object': {
      try {
        const parsed = parseJson(input)
        return String(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
      } catch {
        return 'false'
      }
    }
    default:
      return input
  }
}
