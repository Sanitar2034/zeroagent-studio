import { describe, it, expect } from 'vitest'
import {
  setJsonPath,
  deleteJsonPath,
  flattenJson,
} from '../../src/tools/jsonTool'

describe('jsonTool path helpers', () => {
  it('setJsonPath with empty path returns value', () => {
    expect(setJsonPath({ a: 1 }, '', 'replaced')).toBe('replaced')
  })

  it('deleteJsonPath with empty path returns object', () => {
    expect(deleteJsonPath({ a: 1 }, '')).toEqual({ a: 1 })
  })

  it('setJsonPath works from array and non-object roots', () => {
    expect(setJsonPath([1, 2], 'x.y', 3)).toEqual({ x: { y: 3 } })
    expect(deleteJsonPath(null, 'a')).toEqual({})
  })

  it('setJsonPath creates nested objects from scalars', () => {
    const out = setJsonPath({}, 'a.b', 1) as Record<string, unknown>
    expect((out.a as Record<string, unknown>).b).toBe(1)
  })

  it('deleteJsonPath no-ops on missing intermediate path', () => {
    const out = deleteJsonPath({ a: 1 }, 'b.c') as Record<string, unknown>
    expect(out.a).toBe(1)
  })

  it('flattenJson handles null and primitives', () => {
    expect(flattenJson(null)['value']).toBe('null')
    expect(flattenJson(42)['value']).toBe('42')
  })

  it('flattenJson indexes arrays without prefix', () => {
    expect(flattenJson([10, 20])['0']).toBe('10')
    expect(flattenJson([10, 20])['1']).toBe('20')
  })

  it('setJsonPath adds nested values', () => {
    const out = setJsonPath({ user: { name: 'Ada' } }, 'user.score', 99) as Record<string, unknown>
    expect((out.user as Record<string, unknown>).score).toBe(99)
  })

  it('deleteJsonPath removes keys', () => {
    const out = deleteJsonPath({ a: 1, secret: 'x' }, 'secret') as Record<string, unknown>
    expect(out.secret).toBeUndefined()
    expect(out.a).toBe(1)
  })

  it('flattenJson produces dot keys', () => {
    const flat = flattenJson({ user: { name: 'Ada', tags: ['a', 'b'] } })
    expect(flat['user.name']).toBe('Ada')
    expect(flat['user.tags.0']).toBe('a')
  })
})
