import { describe, it, expect } from 'vitest'
import { getNodeOutputValue } from '../../src/lib/nodeOutputValue'
import { textPortValue } from '../../src/lib/ports'
import type { ExecutionContext } from '../../src/types'

describe('nodeOutputValue', () => {
  const ctx: ExecutionContext = {
    variables: {
      c: { message: textPortValue('from-message') },
      o: { out: textPortValue('from-out') },
    },
    toolResults: {
      t: { custom: textPortValue('from-custom') },
    },
    legacyVariables: { x: 'legacy' },
  }

  it('reads explicit handles, non-out ports, and legacy fallback', () => {
    expect(getNodeOutputValue('c', ctx)).toBe('from-message')
    expect(getNodeOutputValue('t', ctx)).toBe('from-custom')
    expect(getNodeOutputValue('x', ctx)).toBe('legacy')
    expect(getNodeOutputValue('missing', ctx)).toBe('')
    expect(getNodeOutputValue('o', { variables: {}, toolResults: {}, legacyVariables: {} })).toBe(
      ''
    )
    expect(
      getNodeOutputValue('empty', {
        variables: { empty: { out: { type: 'text', value: '' } } },
        toolResults: {},
        legacyVariables: {},
      })
    ).toBe('')
    expect(getNodeOutputValue('c', ctx, 'message')).toBe('from-message')
  })

  it('ignores whitespace-only ports and uses legacy agent output', () => {
    expect(
      getNodeOutputValue('agent', {
        variables: { agent: { out: { type: 'text', value: '   ' } } },
        toolResults: {},
        legacyVariables: { agent: 'Recovered agent reply' },
      })
    ).toBe('Recovered agent reply')
  })
})
