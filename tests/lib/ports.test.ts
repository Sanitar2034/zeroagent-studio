import { describe, it, expect } from 'vitest'
import {
  canConnect,
  canConnectTypes,
  getPrimaryInput,
  jsonPortValue,
  portTypeColor,
  singleTextOutput,
  textPortValue,
} from '../../src/lib/ports'
import { TEXT_IN, TEXT_OUT, JSON_IN } from '../../src/lib/ports'

describe('ports', () => {
  it('canConnectTypes allows any and same-type', () => {
    expect(canConnectTypes('any', 'text')).toBe(true)
    expect(canConnectTypes('text', 'any')).toBe(true)
    expect(canConnectTypes('text', 'text')).toBe(true)
    expect(canConnectTypes('json', 'text')).toBe(true)
    expect(canConnectTypes('text', 'number')).toBe(true)
    expect(canConnectTypes('number', 'text')).toBe(true)
    expect(canConnectTypes('text', 'json')).toBe(false)
    expect(canConnectTypes('binary', 'text')).toBe(false)
  })

  it('canConnect checks direction', () => {
    expect(canConnect(TEXT_OUT, TEXT_IN)).toBe(true)
    expect(canConnect(TEXT_IN, TEXT_OUT)).toBe(false)
    expect(canConnect(JSON_IN, TEXT_IN)).toBe(false)
  })

  it('getPrimaryInput prefers in then context', () => {
    expect(getPrimaryInput({ in: textPortValue('a') })).toBe('a')
    expect(getPrimaryInput({ context: textPortValue('b') })).toBe('b')
    expect(getPrimaryInput({})).toBe('')
  })

  it('singleTextOutput wraps value', () => {
    expect(singleTextOutput('hi').out.value).toBe('hi')
  })

  it('jsonPortValue sets type', () => {
    expect(jsonPortValue('{}').type).toBe('json')
  })

  it('portTypeColor returns colors for all types', () => {
    for (const t of ['text', 'json', 'number', 'boolean', 'binary', 'embedding', 'any'] as const) {
      expect(portTypeColor(t).length).toBeGreaterThan(0)
    }
    expect(portTypeColor('unknown' as 'text').length).toBeGreaterThan(0)
  })
})
