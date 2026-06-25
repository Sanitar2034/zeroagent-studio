import { textPortValue, type PortValue } from './ports'

export function mergePortInputValues(values: PortValue[]): PortValue {
  const value = values.map((v) => v.value).filter(Boolean).join('\n\n')
  const type = values.length > 0 ? values[0].type : 'text'
  return { type, value }
}

export function truncateForLog(text: string, max = 200): string {
  return text.slice(0, max)
}

export function toolSkipMessage(reason?: string): string {
  return reason || 'Skipped — no input and auto-run disabled'
}

export function resolveUpstreamPortValue(
  fromTool: PortValue | undefined,
  fromVar: PortValue | undefined,
  fallback: PortValue
): PortValue {
  const pick = (value: PortValue | undefined): PortValue | undefined => {
    if (value?.value?.trim()) return value
    return undefined
  }
  return pick(fromTool) ?? pick(fromVar) ?? (fallback.value?.trim() ? fallback : textPortValue(''))
}
