import { describe, it, expect } from 'vitest'
import { createWorkflowEdge, createWorkflowEdgeWithHandles } from '../../src/lib/workflowEdges'
import { makeChat, makeAgent } from '../helpers/graphBuilders'

describe('workflowEdges', () => {
  it('creates edge with port handles', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const e = createWorkflowEdge(chat, agent, 'e-test')
    expect(e.id).toBe('e-test')
    expect(e.sourceHandle).toBe('message')
    expect(e.targetHandle).toBe('context')
    expect(e.type).toBe('animated')
  })

  it('createWorkflowEdgeWithHandles uses default id when omitted', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const e = createWorkflowEdgeWithHandles(chat, agent, 'message', 'context')
    expect(e.id).toBe('e-c-a')
    expect(e.sourceHandle).toBe('message')
    expect(e.targetHandle).toBe('context')
  })
})
