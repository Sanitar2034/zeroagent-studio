export type PortDataType = 'text' | 'json' | 'number' | 'boolean' | 'binary' | 'embedding' | 'any'

export interface PortDef {
  id: string
  label: string
  direction: 'in' | 'out'
  dataType: PortDataType
  required?: boolean
  multiple?: boolean
}

export interface PortValue {
  type: PortDataType
  value: string
}

export const TEXT_IN: PortDef = {
  id: 'in',
  label: 'In',
  direction: 'in',
  dataType: 'text',
  required: false,
}

export const TEXT_OUT: PortDef = {
  id: 'out',
  label: 'Out',
  direction: 'out',
  dataType: 'text',
}

export const JSON_IN: PortDef = {
  id: 'in',
  label: 'In',
  direction: 'in',
  dataType: 'json',
  required: false,
}

export const JSON_OUT: PortDef = {
  id: 'out',
  label: 'Out',
  direction: 'out',
  dataType: 'json',
}

export const EMBEDDING_IN: PortDef = {
  id: 'in',
  label: 'In',
  direction: 'in',
  dataType: 'text',
  required: true,
}

export const EMBEDDING_OUT: PortDef = {
  id: 'out',
  label: 'Out',
  direction: 'out',
  dataType: 'embedding',
}

export const BINARY_IN: PortDef = {
  id: 'in',
  label: 'In',
  direction: 'in',
  dataType: 'text',
  required: false,
}

export const BINARY_OUT: PortDef = {
  id: 'out',
  label: 'Out',
  direction: 'out',
  dataType: 'text',
}

export function textPortValue(value: string): PortValue {
  return { type: 'text', value }
}

export function jsonPortValue(value: string): PortValue {
  return { type: 'json', value }
}

export function getPrimaryInput(inputs: Record<string, PortValue>): string {
  return inputs.in?.value ?? inputs.context?.value ?? Object.values(inputs)[0]?.value ?? ''
}

export function singleTextOutput(value: string): Record<string, PortValue> {
  return { out: textPortValue(value) }
}

export function canConnectTypes(sourceType: PortDataType, targetType: PortDataType): boolean {
  if (sourceType === 'any' || targetType === 'any') return true
  if (sourceType === targetType) return true
  if (sourceType === 'json' && targetType === 'text') return true
  if (sourceType === 'text' && targetType === 'number') return true
  if (sourceType === 'number' && targetType === 'text') return true
  return false
}

export function canConnect(source: PortDef, target: PortDef): boolean {
  if (source.direction !== 'out' || target.direction !== 'in') return false
  return canConnectTypes(source.dataType, target.dataType)
}

export function portTypeColor(type: PortDataType): string {
  switch (type) {
    case 'text':
      return 'var(--accent-cyan)'
    case 'json':
      return 'var(--accent-green)'
    case 'number':
      return '#f59e0b'
    case 'boolean':
      return '#a78bfa'
    case 'binary':
      return '#f472b6'
    case 'embedding':
      return '#818cf8'
    case 'any':
      return 'var(--text-muted)'
    default:
      return 'var(--text-muted)'
  }
}
