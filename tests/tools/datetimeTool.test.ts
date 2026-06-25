import { describe, it, expect } from 'vitest'
import { runDatetimeTool } from '../../src/tools/datetimeTool'

describe('datetimeTool', () => {
  it('formats current time', () => {
    expect(runDatetimeTool('', { mode: 'format-now', format: 'iso' })).toMatch(/T/)
  })

  it('parses date strings', () => {
    const iso = runDatetimeTool('2024-01-15', { mode: 'parse' })
    expect(iso).toContain('2024')
  })

  it('formats date-only and datetime styles', () => {
    expect(runDatetimeTool('', { mode: 'format-now', format: 'date' })).toBeTruthy()
    expect(runDatetimeTool('', { mode: 'format-now', format: 'datetime', timeZone: 'UTC' })).toBeTruthy()
  })

  it('parses from config.value', () => {
    const iso = runDatetimeTool('', { mode: 'parse', value: '2024-06-01' })
    expect(iso).toContain('2024')
  })

  it('formats with custom locale', () => {
    expect(runDatetimeTool('', { mode: 'format-now', format: 'date', locale: 'de-DE' })).toBeTruthy()
  })

  it('throws on unknown mode', () => {
    expect(() => runDatetimeTool('', { mode: 'invalid' as never })).toThrow(/Unknown datetime/)
  })

  it('throws when parse mode has no input', () => {
    expect(() => runDatetimeTool('', { mode: 'parse' })).toThrow(/needs upstream/)
  })

  it('throws on invalid parse input', () => {
    expect(() => runDatetimeTool('not-a-date', { mode: 'parse' })).toThrow()
  })
})
