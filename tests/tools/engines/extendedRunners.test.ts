import { describe, it, expect } from 'vitest'
import { runStringPreset } from '../../../src/tools/engines/stringRunner'
import { runValidatePreset } from '../../../src/tools/engines/validateRunner'
import { runRegexPreset } from '../../../src/tools/engines/regexRunner'
import { runComparePreset } from '../../../src/tools/engines/compareRunner'
import { runCsvPreset } from '../../../src/tools/engines/csvRunner'
import { runHtmlPreset } from '../../../src/tools/engines/htmlRunner'
import { runGeneratePreset } from '../../../src/tools/engines/generateRunner'
import { runFlowPreset } from '../../../src/tools/engines/flowRunner'
import { runJsonPreset } from '../../../src/tools/engines/jsonRunner'
import { runListPreset } from '../../../src/tools/engines/listRunner'
import { runMarkdownPreset } from '../../../src/tools/engines/markdownRunner'
import { runMathPreset } from '../../../src/tools/engines/mathRunner'
import { runDatePreset } from '../../../src/tools/engines/dateRunner'
import { runEncodingPreset } from '../../../src/tools/engines/encodingRunner'
import { runHashPreset } from '../../../src/tools/engines/hashRunner'

describe('extended engine coverage', () => {
  it('regex presets cover branches', () => {
    expect(runRegexPreset('extract-first', 'abc', { pattern: 'z' })).toBe('')
    expect(runRegexPreset('extract-first', 'abc', { pattern: 'b' })).toBe('b')
    expect(runRegexPreset('extract-all', 'a1 a2', { pattern: '\\d', flags: 'g' })).toContain('1')
    expect(runRegexPreset('extract-all', 'a1', { pattern: '\\d' })).toContain('1')
    expect(runRegexPreset('replace', 'abc', { pattern: 'b', replacement: 'X' })).toBe('aXc')
    expect(runRegexPreset('split', 'a,b', { pattern: ',' })).toBe('a\nb')
    expect(runRegexPreset('test', 'abc', { pattern: '^a' })).toBe('true')
    expect(runRegexPreset('capture-groups', 'no match', { pattern: '(\\d+)' })).toBe('[]')
    expect(runRegexPreset('capture-groups', '12-34', { pattern: '(\\d+)-(\\d+)' })).toContain('12')
    expect(runRegexPreset('escape', 'a.b', {})).toContain('\\')
    expect(runRegexPreset('extract-emails', 'x@y.com', {})).toBe('x@y.com')
    expect(runRegexPreset('unknown' as 'escape', 'x', {})).toBe('x')
    expect(() => runRegexPreset('test', 'x', {})).toThrow(/pattern/)
  })

  it('compare presets cover branches', () => {
    expect(runComparePreset('equals', 'a', { other: 'a' })).toBe('true')
    expect(runComparePreset('contains', 'abc', { other: 'b' })).toBe('true')
    expect(runComparePreset('starts-with', 'abc', { other: 'a' })).toBe('true')
    expect(runComparePreset('ends-with', 'abc', { other: 'c' })).toBe('true')
    expect(runComparePreset('line-diff-count', 'a\nb', { other: 'b\nc' })).toBe('2')
    expect(runComparePreset('similarity', 'kitten', { other: 'sitting' })).toMatch(/^\d+$/)
    expect(runComparePreset('unknown' as 'equals', 'x', {})).toBe('false')
  })

  it('csv presets cover quoting and defaults', () => {
    const quoted = 'name,note\nAda,"say ""hi"""\nBob,ok'
    expect(runCsvPreset('parse-header', quoted, {})).toBe('name\nnote')
    expect(runCsvPreset('to-json-rows', quoted, {})).toContain('Ada')
    expect(runCsvPreset('from-json-row', '{"name":"Ada","score":"99"}', {})).toContain('Ada')
    expect(runCsvPreset('select-column', 'name,score\nAda,99', { column: 'name' })).toBe('Ada')
    expect(runCsvPreset('filter-rows', 'name,score\nAda,99\nBob,88', { column: 'name', contains: 'A' })).toContain('Ada')
    expect(runCsvPreset('sort-rows', 'name,score\nBob,88\nAda,99', { column: 'name' })).toMatch(/Ada/)
    expect(runCsvPreset('dedupe-rows', 'name,score\nAda,99\nAda,99', { column: 'name' })).not.toContain('Ada,99\nAda,99')
    expect(runCsvPreset('tsv-to-csv', 'a\tb\nc\td', {})).toBe('a,b\nc,d')
    expect(runCsvPreset('unknown' as 'parse-header', 'x', {})).toBe('x')
    expect(() => runCsvPreset('select-column', 'a,b', {})).toThrow(/column/)
    expect(() => runCsvPreset('select-column', 'a,b', { column: 'missing' })).toThrow(/not found/)
    expect(() => runCsvPreset('filter-rows', 'a,b', { column: 'missing', contains: 'x' })).toThrow(/not found/)
    expect(() => runCsvPreset('sort-rows', 'a,b', { column: 'missing' })).toThrow(/not found/)
    expect(() => runCsvPreset('dedupe-rows', 'a,b', { column: 'missing' })).toThrow(/not found/)
    expect(runCsvPreset('filter-rows', 'name;score\nAda;99', { column: 'name', contains: 'A', delimiter: ';' })).toContain('Ada')
    expect(runCsvPreset('sort-rows', 'name;score\nBob;88\nAda;99', { column: 'name', delimiter: ';' })).toMatch(/Ada/)
    expect(runCsvPreset('dedupe-rows', 'name;score\nAda;99\nAda;99', { column: 'name', delimiter: ';' })).toContain('Ada')
    expect(runCsvPreset('to-json-rows', 'col\n"x,y"', {})).toContain('x,y')
    expect(runCsvPreset('from-json-row', '{"a":"1","b":null}', {})).toContain('a')
  })

  it('html presets cover defaults', () => {
    const html = '<html><head><title>T</title><meta name="description" content="d"></head><body><a href="/x">l</a><img src="/i.png"><table><tr><td>A</td></tr></table></body></html>'
    expect(runHtmlPreset('to-text', html, {})).toContain('l')
    expect(runHtmlPreset('strip-tags', '<b>x</b>', {})).toBe('x')
    expect(runHtmlPreset('extract-links', html, {})).toBe('/x')
    expect(runHtmlPreset('extract-title', html, {})).toBe('T')
    expect(runHtmlPreset('extract-meta', html, { name: 'description' })).toBe('d')
    expect(runHtmlPreset('extract-images', html, {})).toBe('/i.png')
    expect(runHtmlPreset('unescape-entities', '&amp;lt;', {})).toBeTruthy()
    expect(runHtmlPreset('table-to-lines', html, {})).toContain('A')
    expect(runHtmlPreset('unknown' as 'to-text', 'x', {})).toBe('x')
  })

  it('generate presets cover branches', () => {
    expect(runGeneratePreset('uuid-v4', '', {})).toMatch(/-/)
    expect(runGeneratePreset('random-int', '', { min: '1', max: '2' })).toMatch(/^[12]$/)
    expect(runGeneratePreset('random-string', '', { length: '4' })).toHaveLength(4)
    expect(runGeneratePreset('random-hex', '', { bytes: '2' })).toHaveLength(4)
    expect(runGeneratePreset('timestamp-id', '', {})).toContain('-')
    expect(runGeneratePreset('nonce', '', {})).toHaveLength(32)
    expect(runGeneratePreset('pick-line', '', {})).toBe('')
    expect(runGeneratePreset('pick-line', 'a\nb', {})).toMatch(/^[ab]$/)
    expect(runGeneratePreset('lorem', '', { words: '3' })).toContain('lorem')
    expect(runGeneratePreset('unknown' as 'uuid-v4', '', {})).toMatch(/-/)
  })

  it('flow presets cover new branches', () => {
    expect(runFlowPreset('if-empty', '', { message: 'empty' })).toBe('empty')
    expect(runFlowPreset('coalesce', 'a\n---\n\n---\nb', {})).toBe('a')
    expect(runFlowPreset('coalesce', '\n---\n', { default: 'fallback' })).toBe('fallback')
    expect(runFlowPreset('line-template', 'a\nb', { template: '* {{line}}' })).toContain('* a')
    expect(runFlowPreset('wrap-text', '   ', {})).toBe('')
    expect(runFlowPreset('wrap-text', 'one two three four five six', { width: '10' })).toContain('\n')
    expect(runFlowPreset('truncate-words', 'one two three four five', { max: '2' })).toContain('…')
    expect(runFlowPreset('truncate-words', 'one two', { max: '5' })).toBe('one two')
    expect(runFlowPreset('unknown' as 'pass-through', 'z', {})).toBe('z')
  })

  it('json presets cover new paths', () => {
    expect(runJsonPreset('set-path', '{"a":1}', { path: 'b.c', value: 'plain' })).toContain('plain')
    expect(runJsonPreset('set-path', '', { path: 'x', value: '1' })).toContain('"x": 1')
    expect(runJsonPreset('delete-path', '{"a":{"b":1}}', { path: 'a.b' })).not.toContain('"b"')
    expect(() => runJsonPreset('get-path', '{}', {})).toThrow(/path/)
    expect(() => runJsonPreset('set-path', '{}', {})).toThrow(/path/)
    expect(() => runJsonPreset('delete-path', '{}', {})).toThrow(/path/)
    expect(runJsonPreset('merge', '', { other: '{"b":2}' })).toContain('"b": 2')
    expect(runJsonPreset('sort-keys', '[{"b":1},{"a":2}]', {})).toContain('"a"')
    expect(() => runJsonPreset('merge', '[1]', { other: '{}' })).toThrow(/object/)
    expect(() => runJsonPreset('merge', '{}', { other: '[]' })).toThrow(/object/)
    expect(runJsonPreset('pick-keys', '{"a":1}', {})).toBe('{}')
    expect(runJsonPreset('omit-keys', '{"a":1,"b":2}', {})).toContain('"a"')
    expect(runJsonPreset('set-path', '{"a":1}', { path: 'b', value: '' })).toContain('"b": ""')
    expect(runJsonPreset('merge', '{"a":1}', {})).toContain('"a": 1')
    expect(runJsonPreset('pick-keys', '{"a":1,"b":2}', { keys: 'missing' })).toBe('{}')
    expect(() => runJsonPreset('pick-keys', '[]', { keys: 'a' })).toThrow(/object/)
    expect(runJsonPreset('omit-keys', '{"a":1,"b":2}', { keys: 'a' })).not.toContain('"a"')
    expect(runJsonPreset('wrap-array', '', {})).toContain('""')
    expect(() => runJsonPreset('omit-keys', '[]', { keys: 'a' })).toThrow(/object/)
    expect(runJsonPreset('flatten', '{"a":{"b":1}}', {})).toContain('a.b')
    expect(runJsonPreset('sort-keys', '{"b":1,"a":2}', {})).toMatch(/"a"/)
    expect(runJsonPreset('wrap-array', '"x"', {})).toContain('"x"')
    expect(runJsonPreset('unknown' as 'pretty', '[]', {})).toBe('[]')
  })

  it('list presets cover grep and grouping', () => {
    expect(() => runListPreset('grep-lines', 'a', {})).toThrow(/pattern/)
    expect(runListPreset('grep-lines', 'a\nb', { pattern: '^a' })).toBe('a')
    expect(runListPreset('grep-lines-inverse', 'a\nb', { pattern: '^a' })).toBe('b')
    expect(runListPreset('count-matching', 'a\nb', { pattern: '^a' })).toBe('1')
    expect(runListPreset('group-by-prefix', 'a/1\na/2\nb/3', { delimiter: '/' })).toContain('a (2)')
    expect(runListPreset('zip-lines', 'a\nb', { other: '1\n2', separator: ':' })).toContain('a:1')
    expect(runListPreset('sample-lines', 'a\nb\nc', { n: '2' })).toContain('\n')
    expect(runListPreset('unique-lines', 'a\na\n', {})).toBe('a')
    expect(runListPreset('enumerate-lines', 'a', {})).toBe('0: a')
    expect(runListPreset('unknown' as 'head', 'x', {})).toBe('x')
  })

  it('markdown presets cover defaults', () => {
    const md = '# H\n\nHello **w** [l](https://x.com)\n\n```js\nx=1\n```'
    expect(runMarkdownPreset('to-text', md, {})).toContain('Hello')
    expect(runMarkdownPreset('extract-headings', md, {})).toBe('H')
    expect(runMarkdownPreset('extract-links', md, {})).toContain('l: https://x.com')
    expect(runMarkdownPreset('extract-code', md, {})).toContain('x=1')
    expect(runMarkdownPreset('to-bullets', 'line', {})).toContain('- line')
    expect(runMarkdownPreset('word-count', md, {})).toMatch(/^\d+$/)
    expect(runMarkdownPreset('read-time', md, { wpm: '100' })).toContain('min read')
    expect(runMarkdownPreset('unknown' as 'to-text', md, {})).toContain('Hello')
  })

  it('math presets cover extended operations', () => {
    expect(runMathPreset('min', '5', {})).toBe('0')
    expect(runMathPreset('max', '5', {})).toBe('5')
    expect(runMathPreset('percent', '200', {})).toBe('20')
    expect(runMathPreset('mod', '10', {})).toBe('0')
    expect(runMathPreset('clamp', '150', { min: '0', max: '100' })).toBe('100')
    expect(runMathPreset('sum-lines', '1\n2\n3', {})).toBe('6')
    expect(runMathPreset('avg-lines', '', {})).toBe('0')
    expect(runMathPreset('avg-lines', '2\n4', {})).toBe('3')
    expect(runMathPreset('format-number', '1234.5', { fractionDigits: '1' })).toContain('1')
    expect(runMathPreset('parse-number', '42', {})).toBe('42')
  })

  it('date presets cover relative labels', () => {
    const iso = '2024-06-01T12:00:00.000Z'
    expect(runDatePreset('start-of-day', iso, {})).toContain('T')
    expect(runDatePreset('relative-days', iso, { days: '0' })).toContain('today')
    expect(runDatePreset('relative-days', iso, { days: '2' })).toContain('in 2')
    expect(runDatePreset('relative-days', iso, { days: '-3' })).toContain('ago')
    expect(runDatePreset('is-before', '2024-01-01T00:00:00.000Z', { other: '2025-01-01T00:00:00.000Z' })).toBe('true')
  })

  it('csv presets cover short rows and missing cells', () => {
    expect(runCsvPreset('to-json-rows', 'name,score\nAda', {})).toContain('"score": ""')
    expect(runCsvPreset('select-column', 'name,score\nAda', { column: 'score' })).toBe('')
  })

  it('compare handles empty strings in similarity', () => {
    expect(runComparePreset('similarity', '', { other: '' })).toBe('100')
    expect(runComparePreset('similarity', 'abc', { other: 'abc' })).toBe('100')
    expect(runComparePreset('similarity', 'a', { other: 'b' })).toBe('0')
    expect(runComparePreset('similarity', 'ab', { other: 'ac' })).toMatch(/^\d+$/)
    expect(runComparePreset('line-diff-count', '', { other: '' })).toBe('0')
  })

  it('string and validate presets cover added branches', () => {
    expect(runStringPreset('replace-all', 'a-b-a', { search: '-', replace: '+' })).toBe('a+b+a')
    expect(() => runStringPreset('replace-all', 'x', {})).toThrow(/search/)
    expect(runStringPreset('split-words', 'a b', {})).toBe('a\nb')
    expect(runStringPreset('join-words', 'a\nb', { separator: '+' })).toBe('a+b')
    expect(runValidatePreset('contains', 'abc', {})).toBe('true')
    expect(runValidatePreset('equals-ignore-case', '', {})).toBe('true')
    expect(runValidatePreset('min-length', 'ab', { min: '3' })).toBe('false')
    expect(runValidatePreset('max-length', 'abcdef', { max: '3' })).toBe('false')
    expect(runValidatePreset('is-number', '3.14', {})).toBe('true')
    expect(runValidatePreset('is-integer', '3.14', {})).toBe('false')
    expect(runValidatePreset('min-length', 'a', {})).toBe('true')
    expect(runValidatePreset('max-length', 'a', {})).toBe('true')
    expect(runValidatePreset('in-range', '50', {})).toBe('true')
  })

  it('flow coalesce and if-empty branches', () => {
    expect(runFlowPreset('if-empty', 'has text', { message: 'empty' })).toBe('has text')
    expect(runFlowPreset('coalesce', '\n---\n   \n---\n', { default: 'fb' })).toBe('fb')
    expect(runFlowPreset('truncate-words', 'one two three four five', { max: '2' })).toContain('…')
    expect(runFlowPreset('truncate-words', 'short', {})).toBe('short')
  })

  it('html handles minimal documents', () => {
    expect(runHtmlPreset('to-text', '<html></html>', {})).toBe('')
    expect(runHtmlPreset('extract-title', '<html></html>', {})).toBe('')
    expect(runHtmlPreset('extract-meta', '<meta property="og:title" content="t">', { name: 'og:title' })).toBe('t')
    expect(runHtmlPreset('extract-links', '<p>no links</p>', {})).toBe('')
    expect(runHtmlPreset('extract-images', '<p>no images</p>', {})).toBe('')
  })

  it('encoding padding and jwt errors', () => {
    expect(runEncodingPreset('base64url-decode', 'YWJj')).toBe('abc')
    expect(() => runEncodingPreset('jwt-decode', 'notjwt')).toThrow(/JWT/)
  })

  it('list zip-lines handles short other list', () => {
    expect(runListPreset('zip-lines', 'a\nb\nc', { other: '1' })).toContain('a | 1')
    expect(runListPreset('group-by-prefix', 'plain', { delimiter: '/' })).toContain('plain (1)')
  })

  it('math clamp uses defaults', () => {
    expect(runMathPreset('clamp', '5', {})).toBe('5')
  })

  it('date is-before uses now when other missing', () => {
    expect(runDatePreset('is-before', '2099-01-01T00:00:00.000Z', {})).toBe('false')
  })

  it('encoding and hash presets cover new paths', async () => {
    expect(runEncodingPreset('base64url-encode', 'hi')).toBeTruthy()
    expect(runEncodingPreset('base64url-decode', 'aGk')).toBe('hi')
    expect(() => runEncodingPreset('base64url-decode', '!!!')).toThrow(/Base64URL/)
    expect(runEncodingPreset('crc32', 'test')).toMatch(/^[0-9a-f]{8}$/)
    expect(runEncodingPreset('jwt-decode', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')).toContain('sub')
    const md5short = await runHashPreset('md5', '')
    const md5long = await runHashPreset('md5', 'a'.repeat(80))
    expect(md5short).toHaveLength(32)
    expect(md5long).toHaveLength(32)
  })
})
