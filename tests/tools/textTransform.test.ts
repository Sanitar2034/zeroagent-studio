import { describe, it, expect } from 'vitest'
import { runTextTransform } from '../../src/tools/textTransform'

describe('textTransform tool', () => {
  it('trims and changes case', () => {
    expect(runTextTransform('  hi  ', { mode: 'trim' })).toBe('hi')
    expect(runTextTransform('Hi', { mode: 'upper' })).toBe('HI')
    expect(runTextTransform('Hi', { mode: 'lower' })).toBe('hi')
  })

  it('splits and regex extracts', () => {
    expect(runTextTransform('a,b,c', { mode: 'split', separator: ',' })).toBe('a\nb\nc')
    expect(runTextTransform('id:42', { mode: 'regex', pattern: '\\d+' })).toBe('42')
    expect(runTextTransform('foo bar', { mode: 'replace', pattern: 'bar', replacement: 'baz' })).toBe(
      'foo baz'
    )
  })

  it('slices text', () => {
    expect(runTextTransform('hello', { mode: 'slice', start: '1', end: '4' })).toBe('ell')
    expect(runTextTransform('hello', { mode: 'slice', start: '0', end: '3' })).toBe('hel')
  })

  it('falls back to trim for unknown mode', () => {
    expect(runTextTransform('  x  ', { mode: 'unknown' as never })).toBe('x')
  })

  it('defaults slice start to zero', () => {
    expect(runTextTransform('hello', { mode: 'slice', end: '2' })).toBe('he')
  })

  it('treats falsy end config as open slice', () => {
    expect(runTextTransform('hello', { mode: 'slice', start: '0', end: '' })).toBe('hello')
    expect(runTextTransform('hello', { mode: 'slice', start: '0', end: '0' })).toBe('')
  })

  it('slices through end of string when end omitted', () => {
    expect(runTextTransform('hello', { mode: 'slice', start: '2' })).toBe('llo')
  })

  it('requires pattern for regex modes', () => {
    expect(() => runTextTransform('x', { mode: 'regex' })).toThrow(/pattern/)
    expect(() => runTextTransform('x', { mode: 'replace' })).toThrow(/pattern/)
  })
})
