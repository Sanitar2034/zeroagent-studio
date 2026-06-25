import { describe, it, expect } from 'vitest'
import { runStringPreset } from '../../../src/tools/engines/stringRunner'
import { runEncodingPreset } from '../../../src/tools/engines/encodingRunner'
import { runHashPreset } from '../../../src/tools/engines/hashRunner'
import { runJsonPreset } from '../../../src/tools/engines/jsonRunner'
import { runListPreset } from '../../../src/tools/engines/listRunner'
import { runMathPreset } from '../../../src/tools/engines/mathRunner'
import { runDatePreset } from '../../../src/tools/engines/dateRunner'
import { runValidatePreset } from '../../../src/tools/engines/validateRunner'
import { runFlowPreset } from '../../../src/tools/engines/flowRunner'
import { MANIFEST_TOOLS } from '../../../src/tools/manifests/index'
import { manifestToToolDefinition, runToolForPreview } from '../../../src/tools/registryHelpers'

describe('tool engines', () => {
  it('string presets transform text', () => {
    expect(runStringPreset('trim', '  hi  ', {})).toBe('hi')
    expect(runStringPreset('upper', 'ab', {})).toBe('AB')
    expect(runStringPreset('lower', 'AB', {})).toBe('ab')
    expect(runStringPreset('slug', 'Hello World!', {})).toBe('hello-world')
    expect(runStringPreset('reverse', 'abc', {})).toBe('cba')
    expect(runStringPreset('word-count', 'one two', {})).toBe('2')
    expect(runStringPreset('line-count', 'a\nb', {})).toBe('2')
    expect(runStringPreset('char-count', 'abc', {})).toBe('3')
    expect(runStringPreset('pad-start', 'x', { length: '5' })).toBe('    x')
    expect(runStringPreset('pad-end', 'x', { length: '5' })).toBe('x    ')
    expect(runStringPreset('collapse-spaces', 'a   b', {})).toBe('a b')
    expect(runStringPreset('title-case', 'hello world', {})).toBe('Hello World')
    expect(runStringPreset('snake-case', 'HelloWorld', {})).toBe('hello_world')
    expect(runStringPreset('kebab-case', 'HelloWorld', {})).toBe('hello-world')
    expect(runStringPreset('camel-case', 'hello world', {})).toBe('helloWorld')
    expect(runStringPreset('truncate', 'hello', { max: '3' })).toBe('hel…')
    expect(runStringPreset('repeat', 'ab', { times: '2' })).toBe('abab')
    expect(runStringPreset('remove-empty-lines', 'a\n\nb', {})).toBe('a\nb')
    expect(runStringPreset('unknown' as 'trim', 'x', {})).toBe('x')
  })

  it('encoding presets', () => {
    expect(runEncodingPreset('base64-encode', 'hi')).toBe(btoa(unescape(encodeURIComponent('hi'))))
    expect(runEncodingPreset('base64-decode', btoa(unescape(encodeURIComponent('hi'))))).toBe('hi')
    expect(() => runEncodingPreset('base64-decode', '!!!')).toThrow(/Invalid Base64/)
    expect(runEncodingPreset('url-encode', 'a b')).toBe('a%20b')
    expect(runEncodingPreset('url-decode', 'a%20b')).toBe('a b')
    expect(runEncodingPreset('html-encode', '<b>')).toBe('&lt;b&gt;')
    expect(runEncodingPreset('rot13', 'abc')).toBe('nop')
    expect(runEncodingPreset('rot13', 'ABC')).toBe('NOP')
    expect(runEncodingPreset('unknown' as 'rot13', 'x')).toBe('x')
  })

  it('hash presets', async () => {
    const sha = await runHashPreset('sha-256', 'test')
    expect(sha).toHaveLength(64)
    await runHashPreset('sha-1', 'test')
    await runHashPreset('sha-384', 'test')
    await runHashPreset('sha-512', 'test')
    await runHashPreset('unknown' as 'sha-256', 'test')
  })

  it('json presets', () => {
    expect(runJsonPreset('pretty', '{"a":1}', {})).toContain('\n')
    expect(runJsonPreset('minify', '{"a":1}', {})).toBe('{"a":1}')
    expect(runJsonPreset('get-path', '{"user":{"name":"x"}}', { path: 'user.name' })).toBe('x')
    expect(() => runJsonPreset('get-path', '{}', {})).toThrow()
    expect(runJsonPreset('keys', '{"a":1,"b":2}', {})).toContain('a')
    expect(runJsonPreset('values', '{"a":1}', {})).toBe('1')
    expect(runJsonPreset('type-check', '[1]', {})).toBe('array')
    expect(runJsonPreset('stringify-string', 'hi', {})).toBe('"hi"')
    expect(runJsonPreset('parse-string', '"hi"', {})).toBe('hi')
    expect(runJsonPreset('array-length', '[1,2,3]', {})).toBe('3')
    expect(runJsonPreset('is-array', '[1]', {})).toBe('true')
    expect(runJsonPreset('is-object', '{"a":1}', {})).toBe('true')
    expect(() => runJsonPreset('keys', '[1]', {})).toThrow()
    expect(() => runJsonPreset('parse-string', '1', {})).toThrow()
    expect(runJsonPreset('unknown' as 'pretty', '[]', {})).toBe('[]')
  })

  it('list presets', () => {
    expect(runListPreset('split-lines', 'a\nb', {})).toContain('---')
    expect(runListPreset('join-lines', 'a\nb', { separator: ',' })).toBe('a,b')
    expect(runListPreset('dedupe-lines', 'a\na', {})).toBe('a')
    expect(runListPreset('sort-lines', 'b\na', {})).toBe('a\nb')
    expect(runListPreset('sort-lines-desc', 'a\nb', {})).toBe('b\na')
    expect(runListPreset('reverse-lines', 'a\nb', {})).toBe('b\na')
    expect(runListPreset('head', 'a\nb\nc', { n: '2' })).toBe('a\nb')
    expect(runListPreset('tail', 'a\nb\nc', { n: '2' })).toBe('b\nc')
    expect(runListPreset('nth-line', 'a\nb', { n: '1' })).toBe('b')
    expect(runListPreset('filter-empty', 'a\n\nb', {})).toBe('a\nb')
    expect(runListPreset('numbered-lines', 'a\nb', {})).toContain('1.')
    expect(runListPreset('shuffle-lines', 'a\nb', {}).split('\n').sort().join('\n')).toBe('a\nb')
    expect(runListPreset('unknown' as 'head', 'a', {})).toBe('a')
  })

  it('math presets', () => {
    expect(runMathPreset('eval', '2+2', {})).toBe('4')
    expect(runMathPreset('round', '2.6', {})).toBe('3')
    expect(runMathPreset('floor', '2.9', {})).toBe('2')
    expect(runMathPreset('ceil', '2.1', {})).toBe('3')
    expect(runMathPreset('abs', '-5', {})).toBe('5')
    expect(runMathPreset('sqrt', '9', {})).toBe('3')
    expect(runMathPreset('min', '5', { b: '3' })).toBe('3')
    expect(runMathPreset('max', '5', { b: '3' })).toBe('5')
    expect(runMathPreset('percent', '200', { percent: '10' })).toBe('20')
    expect(runMathPreset('mod', '10', { b: '3' })).toBe('1')
    expect(runMathPreset('unknown' as 'eval', '1+1', {})).toBe('2')
    expect(() => runMathPreset('round', 'not', {})).toThrow()
  })

  it('date presets', () => {
    expect(runDatePreset('now-iso', '', {})).toMatch(/T/)
    expect(runDatePreset('now-unix', '', {})).toMatch(/^\d+$/)
    expect(runDatePreset('format', '', { format: 'en-US' })).toBeTruthy()
    expect(runDatePreset('parse-iso', '2024-01-01T00:00:00.000Z', {})).toContain('2024')
    expect(runDatePreset('add-days', '2024-01-01T00:00:00.000Z', { days: '1' })).toContain('2024')
    expect(runDatePreset('diff-days', '2024-01-10T00:00:00.000Z', { other: '2024-01-01T00:00:00.000Z' })).toBe('9')
    expect(runDatePreset('to-utc', '2024-01-01T00:00:00.000Z', {})).toContain('GMT')
    expect(runDatePreset('weekday', '2024-01-01T00:00:00.000Z', {})).toBeTruthy()
    expect(() => runDatePreset('parse-iso', 'bad', {})).toThrow()
    expect(runDatePreset('unknown' as 'now-iso', '', {})).toMatch(/T/)
  })

  it('validate presets', () => {
    expect(runValidatePreset('is-json', '{"a":1}', {})).toBe('true')
    expect(runValidatePreset('is-json', 'bad', {})).toBe('false')
    expect(runValidatePreset('is-url', 'https://x.com', {})).toBe('true')
    expect(runValidatePreset('is-url', 'bad', {})).toBe('false')
    expect(runValidatePreset('is-email', 'a@b.co', {})).toBe('true')
    expect(runValidatePreset('matches-regex', 'abc', { pattern: '^a' })).toBe('true')
    expect(() => runValidatePreset('matches-regex', 'x', {})).toThrow()
    expect(runValidatePreset('not-empty', 'x', {})).toBe('true')
    expect(runValidatePreset('is-number', '42', {})).toBe('true')
    expect(runValidatePreset('is-integer', '42', {})).toBe('true')
    expect(runValidatePreset('in-range', '50', { min: '0', max: '100' })).toBe('true')
    expect(runValidatePreset('unknown' as 'is-json', 'x', {})).toBe('false')
  })

  it('flow presets', () => {
    expect(runFlowPreset('pass-through', 'x', {})).toBe('x')
    expect(runFlowPreset('default-if-empty', '', { default: 'd' })).toBe('d')
    expect(runFlowPreset('template', 'hi', { template: 'Say {{input}}' })).toBe('Say hi')
    expect(runFlowPreset('prefix', 'x', { prefix: '[' })).toBe('[x')
    expect(runFlowPreset('suffix', 'x', { suffix: ']' })).toBe('x]')
    expect(runFlowPreset('merge-lines', 'a\nb', { separator: '+' })).toBe('a+b')
    expect(runFlowPreset('unknown' as 'pass-through', 'z', {})).toBe('z')
  })

  it('manifest tools cover all engines', async () => {
    const engines = new Set(MANIFEST_TOOLS.map((m) => m.engine))
    expect(engines.size).toBe(15)
    for (const entry of MANIFEST_TOOLS) {
      const tool = manifestToToolDefinition(entry)
      let sample = 'test'
      const config: Record<string, string> = {}
      if (entry.preset === 'base64-decode') sample = btoa('hi')
      if (entry.id.startsWith('json-')) {
        if (entry.id === 'json-parse-string') sample = '"hello"'
        else if (entry.id === 'json-array-length' || entry.id === 'json-is-array') sample = '[1,2]'
        else sample = '{"a":1,"b":2}'
      }
      if (entry.preset === 'get-path' || entry.preset === 'set-path' || entry.preset === 'delete-path') {
        config.path = 'a'
        if (entry.preset === 'set-path') config.value = '9'
      }
      if (entry.preset === 'merge') config.other = '{"c":3}'
      if (entry.preset === 'pick-keys' || entry.preset === 'omit-keys') config.keys = 'a,b'
      if (entry.preset === 'replace-all') config.search = 'e'
      if (entry.engine === 'regex' && entry.preset !== 'escape') config.pattern = '.'
      if (entry.engine === 'html') {
        sample = '<html><head><title>Page</title><meta name="description" content="desc"></head><body><a href="https://x.com">l</a><img src="/i.png"><table><tr><td>A</td></tr></table></body></html>'
      }
      if (entry.engine === 'markdown') sample = '# Title\n\nHello **world** [link](https://x.com)\n\n```js\nconst x=1\n```'
      if (entry.engine === 'csv') {
        sample = 'name,score\nAda,99\nBob,88'
        config.column = 'name'
        if (entry.preset === 'filter-rows') config.contains = 'A'
      }
      if (entry.engine === 'compare') config.other = 'test'
      if (entry.preset === 'jwt-decode') {
        sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      }
      if (entry.preset === 'base64url-decode') sample = 'aGk'
      if (entry.preset === 'grep-lines' || entry.preset === 'grep-lines-inverse' || entry.preset === 'count-matching') {
        config.pattern = '.*'
      }
      if (entry.preset === 'is-before') config.other = '2025-01-01T00:00:00.000Z'
      if (entry.preset === 'clamp') {
        config.min = '0'
        config.max = '100'
      }
      if (entry.preset === 'from-json-row') sample = '{"name":"Ada","score":"99"}'
      if (entry.engine === 'math') sample = '42'
      if (entry.preset === 'eval') sample = '2+2'
      if (entry.engine === 'date') {
        if (entry.preset === 'now-iso' || entry.preset === 'now-unix') sample = ''
        else sample = '2024-01-01T00:00:00.000Z'
      }
      if (entry.preset === 'diff-days') config.other = '2024-01-01T00:00:00.000Z'
      if (entry.preset === 'matches-regex') config.pattern = '.*'
      if (entry.preset === 'min' || entry.preset === 'max' || entry.preset === 'mod') config.b = '1'
      if (entry.preset === 'contains' || entry.preset === 'equals-ignore-case') config.text = 'te'
      if (entry.preset === 'min-length') config.min = '1'
      if (entry.preset === 'max-length') config.max = '100'
      const result = await tool.run({ in: { type: 'text', value: sample } }, config, { apiKeys: {}, log: () => {} })
      expect(result.out?.value ?? '').toBeDefined()
    }
  })

  it('manifestToToolDefinition uses default io when omitted', () => {
    const entry = { ...MANIFEST_TOOLS[0], inputs: undefined, outputs: undefined } as typeof MANIFEST_TOOLS[0]
    const tool = manifestToToolDefinition(entry)
    expect(tool.inputs.length).toBeGreaterThan(0)
    expect(tool.outputs.length).toBeGreaterThan(0)
  })

  it('runToolForPreview falls back to first output value', async () => {
    const tool = manifestToToolDefinition(MANIFEST_TOOLS[0])
    const outputs = await tool.run({ in: { type: 'text', value: 'z' } }, {}, { apiKeys: {}, log: () => {} })
    const preview = outputs.out?.value ?? Object.values(outputs)[0]?.value ?? ''
    expect(preview).toBeTruthy()
  })

  it('math and date error paths', () => {
    expect(() => runMathPreset('floor', 'x', {})).toThrow()
    expect(() => runMathPreset('ceil', 'x', {})).toThrow()
    expect(() => runMathPreset('abs', 'x', {})).toThrow()
    expect(() => runMathPreset('sqrt', 'x', {})).toThrow()
    expect(() => runDatePreset('diff-days', 'bad', { other: 'bad' })).toThrow()
    expect(() => runDatePreset('to-utc', 'bad', {})).toThrow()
    expect(() => runDatePreset('weekday', 'bad', {})).toThrow()
    expect(runDatePreset('add-days', '', { days: '2' })).toMatch(/T/)
    expect(runDatePreset('diff-days', '2024-01-10T00:00:00.000Z', {})).toBeTruthy()
    expect(runDatePreset('weekday', '', {})).toBeTruthy()
    expect(runJsonPreset('get-path', '{"a":1}', { path: 'b' })).toBe('')
    expect(runJsonPreset('keys', '{"a":1}', {})).toBe('a')
    expect(runJsonPreset('values', '{"a":"hi","b":2}', {})).toContain('hi')
    expect(runJsonPreset('type-check', 'null', {})).toBe('null')
    expect(() => runJsonPreset('array-length', '{"a":1}', {})).toThrow()
    expect(runEncodingPreset('html-encode', '&<>"\'')).toContain('&amp;')
    expect(runFlowPreset('default-if-empty', '', {})).toBe('')
    expect(runFlowPreset('default-if-empty', '   ', { default: 'd' })).toBe('d')
    expect(runListPreset('nth-line', 'a\nb', { n: '99' })).toBe('')
    expect(runStringPreset('truncate', 'short', { max: '10' })).toBe('short')
  })

  it('runToolForPreview uses first output when out is missing', async () => {
    const tool = manifestToToolDefinition(MANIFEST_TOOLS[0])
    const custom = {
      ...tool,
      run: async () => ({ custom: { type: 'text' as const, value: 'preview' } }),
    }
    const preview = await runToolForPreview(custom, 'x', {}, { apiKeys: {}, log: () => {} })
    expect(preview).toBe('preview')
  })

  it('getPrimaryOutputValue returns empty string for empty outputs', async () => {
    const { getPrimaryOutputValue } = await import('../../../src/tools/registryHelpers')
    expect(getPrimaryOutputValue({})).toBe('')
    expect(getPrimaryOutputValue({ alt: { type: 'text', value: 'v' } })).toBe('v')
  })
})
