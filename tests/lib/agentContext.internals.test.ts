import { describe, it, expect } from 'vitest'
import { __testOnly } from '../../src/lib/agentContext'

describe('agentContext internals', () => {
  const { getNodeOutputValue, blockKindForNode, getNodeLabel } = __testOnly

  it('getNodeOutputValue resolves out port and legacy fallback', () => {
    expect(
      getNodeOutputValue('n', 'out', {
        variables: { n: { out: { type: 'text', value: 'from-out' } } },
        toolResults: {},
        legacyVariables: { n: 'legacy' },
      })
    ).toBe('from-out')
    expect(
      getNodeOutputValue('n', 'in', {
        variables: {},
        toolResults: { n: { out: { type: 'text', value: 'via-out-fallback' } } },
        legacyVariables: {},
      })
    ).toBe('via-out-fallback')
    expect(
      getNodeOutputValue('n', 'missing', {
        variables: {},
        toolResults: { n: { alt: { type: 'text', value: 'alt' } } },
        legacyVariables: { n: 'legacy' },
      })
    ).toBe('alt')
    expect(
      getNodeOutputValue('n', 'missing', {
        variables: {},
        toolResults: { n: { alt: { type: 'text', value: '' } } },
        legacyVariables: { n: 'legacy' },
      })
    ).toBe('legacy')
  })

  it('blockKindForNode and getNodeLabel cover node type branches', () => {
    expect(blockKindForNode({ id: 'c', type: 'chat', position: { x: 0, y: 0 }, data: {} })).toBe(
      'chat'
    )
    expect(blockKindForNode({ id: 'a', type: 'agent', position: { x: 0, y: 0 }, data: {} })).toBe(
      'agent'
    )
    expect(blockKindForNode({ id: 'x', type: 'other', position: { x: 0, y: 0 }, data: {} })).toBe(
      'tool'
    )
    expect(
      getNodeLabel({ id: 'id-only', type: 'tool', position: { x: 0, y: 0 }, data: {} })
    ).toBe('id-only')
  })
})
