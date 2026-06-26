import { describe, it, expect } from 'vitest'
import { useDebugStore } from '../../src/stores/debugStore'
import { useExecutionStore } from '../../src/stores/executionStore'

describe('store edge cases', () => {
  it('debugStore tracks active node for inspector sync', () => {
    useDebugStore.getState().setActiveNode('agent-42')
    expect(useDebugStore.getState().activeNodeId).toBe('agent-42')
    useDebugStore.getState().setActiveNode(null)
    expect(useDebugStore.getState().activeNodeId).toBeNull()
  })

  it('executionStore tracks current node id', () => {
    useExecutionStore.getState().setCurrentNode('tool-1')
    expect(useExecutionStore.getState().currentNodeId).toBe('tool-1')
  })
})
