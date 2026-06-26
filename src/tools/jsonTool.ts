export function getJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function setJsonPath(obj: unknown, path: string, value: unknown): unknown {
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) return value
  const root = typeof obj === 'object' && obj !== null && !Array.isArray(obj) ? { ...(obj as Record<string, unknown>) } : {}
  let current: Record<string, unknown> = root
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    const next = current[key]
    if (typeof next === 'object' && next !== null && !Array.isArray(next)) {
      current[key] = { ...(next as Record<string, unknown>) }
    } else {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[parts[parts.length - 1]!] = value
  return root
}

export function deleteJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) return obj
  const root = typeof obj === 'object' && obj !== null ? JSON.parse(JSON.stringify(obj)) : {}
  let current: Record<string, unknown> = root as Record<string, unknown>
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    const next = current[key]
    if (typeof next !== 'object' || next === null) return root
    current = next as Record<string, unknown>
  }
  delete current[parts[parts.length - 1]!]
  return root
}

export function flattenJson(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  if (obj === null || obj === undefined) {
    out[prefix || 'value'] = String(obj)
    return out
  }
  if (typeof obj !== 'object') {
    out[prefix || 'value'] = String(obj)
    return out
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      Object.assign(out, flattenJson(item, prefix ? `${prefix}.${index}` : String(index)))
    })
    return out
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    Object.assign(out, flattenJson(value, prefix ? `${prefix}.${key}` : key))
  }
  return out
}

export function runJsonTool(input: string, config: Record<string, string>): string {
  const mode = config.mode ?? 'pretty'

  if (mode === 'pretty') {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed, null, 2)
  }

  if (mode === 'get') {
    const path = config.path ?? ''
    if (!path) throw new Error('Get mode requires config.path (dot notation)')
    const parsed = JSON.parse(input)
    const value = getJsonPath(parsed, path)
    if (value === undefined) return ''
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }

  if (mode === 'minify') {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed)
  }

  throw new Error(`Unknown JSON tool mode: ${mode}`)
}
