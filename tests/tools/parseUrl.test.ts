import { describe, it, expect } from 'vitest'
import { parseUrlTool } from '../../src/tools/parseUrl'

describe('parseUrlTool', () => {
  it('parses URL components as JSON', () => {
    const out = parseUrlTool('https://example.com/path?q=1&x=2#frag')
    const parsed = JSON.parse(out)
    expect(parsed.hostname).toBe('example.com')
    expect(parsed.pathname).toBe('/path')
    expect(parsed.params.q).toBe('1')
    expect(parsed.hash).toBe('#frag')
  })

  it('throws without input', () => {
    expect(() => parseUrlTool('  ')).toThrow(/No URL/)
  })
})
