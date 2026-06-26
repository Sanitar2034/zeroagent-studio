import { describe, it, expect } from 'vitest'
import { __testOnly } from '../../src/orchestrator/dag'
import { getNodeOutputValue } from '../../src/lib/nodeOutputValue'

describe('dag internals', () => {
  it('re-exports getNodeOutputValue from nodeOutputValue', () => {
    expect(__testOnly.getNodeOutputValue).toBe(getNodeOutputValue)
  })
})
