import { describe, it, expect, beforeEach } from 'vitest'
import { useExecutionStore } from '../../src/stores/executionStore'

describe('executionStore — visual feedback during run', () => {
  beforeEach(() => {
    useExecutionStore.setState({
      isRunning: false,
      currentNodeId: null,
      thinkingNodes: new Set(),
      edgeTransfers: {},
      flowingEdges: new Set(),
    })
  })

  it('tracks multiple thinking nodes in parallel branches', () => {
    useExecutionStore.getState().addThinkingNode('a')
    useExecutionStore.getState().addThinkingNode('b')
    expect(useExecutionStore.getState().thinkingNodes.size).toBe(2)
    useExecutionStore.getState().removeThinkingNode('a')
    expect(useExecutionStore.getState().thinkingNodes.has('b')).toBe(true)
  })

  it('clearThinking resets animated edges', () => {
    useExecutionStore.getState().addThinkingNode('x')
    useExecutionStore.getState().clearThinking()
    expect(useExecutionStore.getState().thinkingNodes.size).toBe(0)
  })

  it('setRunning guards UI while workflow executes', () => {
    useExecutionStore.getState().setRunning(true)
    expect(useExecutionStore.getState().isRunning).toBe(true)
  })

  it('records edge transfers and flowing state for connector preview', () => {
    useExecutionStore.getState().recordEdgeTransfer({
      edgeId: 'e1',
      sourceNodeId: 'a',
      targetNodeId: 'b',
      sourceHandle: 'out',
      targetHandle: 'in',
      value: '2+2',
      dataType: 'text',
      timestamp: Date.now(),
    })
    useExecutionStore.getState().setFlowingEdges(['e1', 'e2'])

    expect(useExecutionStore.getState().edgeTransfers.e1?.value).toBe('2+2')
    expect(useExecutionStore.getState().flowingEdges.has('e1')).toBe(true)
    useExecutionStore.getState().clearFlowingEdges()
    expect(useExecutionStore.getState().flowingEdges.size).toBe(0)
    useExecutionStore.getState().clearEdgeTransfers()
    expect(useExecutionStore.getState().edgeTransfers).toEqual({})
    useExecutionStore.getState().resetExecutionVisuals()
    expect(useExecutionStore.getState().currentNodeId).toBeNull()
  })
})
