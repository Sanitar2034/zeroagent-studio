import { describe, it, expect } from 'vitest'
import { runJsonTool, getJsonPath } from '../../src/tools/jsonTool'

describe('jsonTool', () => {
  it('pretty prints and minifies JSON', () => {
    const pretty = runJsonTool('{"a":1}', { mode: 'pretty' })
    expect(pretty).toContain('\n')
    expect(runJsonTool('{"a":1}', { mode: 'minify' })).toBe('{"a":1}')
  })

  it('gets nested fields', () => {
    expect(runJsonTool('{"user":{"name":"Ada"}}', { mode: 'get', path: 'user.name' })).toBe('Ada')
    expect(getJsonPath({ a: { b: 1 } }, 'a.b')).toBe(1)
  })

  it('returns empty string for missing path values', () => {
    expect(runJsonTool('{"a":1}', { mode: 'get', path: 'missing' })).toBe('')
    expect(getJsonPath({ a: 1 }, 'a.b')).toBeUndefined()
  })

  it('stringifies object values from path', () => {
    const out = runJsonTool('{"user":{"name":"Ada","id":1}}', { mode: 'get', path: 'user' })
    expect(out).toContain('Ada')
  })

  it('throws on unknown mode', () => {
    expect(() => runJsonTool('{}', { mode: 'nope' as never })).toThrow(/Unknown JSON/)
  })
})
