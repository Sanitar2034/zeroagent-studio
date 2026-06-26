import { describe, it, expect } from 'vitest'
import {
  describeConnectionRejection,
  isValidWorkflowConnection,
  normalizeConnection,
} from '../../src/lib/connectionValidation'
import { makeChat, makeAgent, makeTool, edge } from '../helpers/graphBuilders'

describe('connectionValidation', () => {
  const chat = makeChat('c')
  const agent = makeAgent('a')
  const tool = makeTool('t', 'trim-text')
  const nodes = [chat, agent, tool]

  it('normalizes missing handles', () => {
    const conn = normalizeConnection({ source: 'c', target: 'a' }, nodes)
    expect(conn?.sourceHandle).toBe('message')
    expect(conn?.targetHandle).toBe('context')
  })

  it('allows compatible text connection', () => {
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'a', sourceHandle: 'message', targetHandle: 'context' },
        nodes,
        []
      )
    ).toBe(true)
  })

  it('returns false for missing nodes after normalization', () => {
    expect(
      isValidWorkflowConnection(
        { source: 'a', target: 'b', sourceHandle: 'message', targetHandle: 'context' },
        [],
        []
      )
    ).toBe(false)
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'missing', sourceHandle: 'message', targetHandle: 'context' },
        [chat],
        []
      )
    ).toBe(false)
  })

  it('rejects chat as target and self-loop', () => {
    expect(isValidWorkflowConnection({ source: 'c', target: 'c' }, nodes, [])).toBe(false)
    expect(isValidWorkflowConnection({ source: 'a', target: 'c' }, nodes, [])).toBe(false)
    expect(
      isValidWorkflowConnection(
        { source: 'a', target: 'c', sourceHandle: 'out', targetHandle: 'message' },
        nodes,
        []
      )
    ).toBe(false)
  })

  it('rejects duplicate single-input port', () => {
    const edges = [edge('e1', 'c', 't')]
    expect(
      isValidWorkflowConnection({ source: 'a', target: 't', sourceHandle: 'out', targetHandle: 'in' }, nodes, edges)
    ).toBe(false)
  })

  it('returns false for missing nodes', () => {
    expect(isValidWorkflowConnection({ source: 'x', target: 'y' }, nodes, [])).toBe(false)
  })

  it('allows reconnecting the same source handle on a single-input port', () => {
    const edges = [
      { id: 'e1', source: 'c', target: 't', sourceHandle: 'message', targetHandle: 'in' },
    ]
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 't', sourceHandle: 'message', targetHandle: 'in' },
        nodes,
        edges
      )
    ).toBe(true)
  })

  it('describeConnectionRejection returns null for valid wires', () => {
    expect(
      describeConnectionRejection(
        { source: 'c', target: 'a', sourceHandle: 'message', targetHandle: 'context' },
        nodes,
        []
      )
    ).toBeNull()
  })

  it('describeConnectionRejection explains invalid wires', () => {
    const msg = describeConnectionRejection(
      { source: 'c', target: 'c', sourceHandle: 'message', targetHandle: 'message' },
      nodes,
      []
    )
    expect(msg).toMatch(/itself/)

    const jsonMsg = describeConnectionRejection(
      { source: 'c', target: 'j', sourceHandle: 'message', targetHandle: 'in' },
      [makeChat('c'), makeTool('j', 'json-pretty')],
      []
    )
    expect(jsonMsg).toMatch(/Cannot connect/)

    const chatTarget = describeConnectionRejection(
      { source: 'a', target: 'c', sourceHandle: 'out', targetHandle: 'message' },
      nodes,
      []
    )
    expect(chatTarget).toMatch(/Chat only sends/)

    const missingHandles = describeConnectionRejection(
      { source: 'a', target: 'c' },
      [makeAgent('a'), makeChat('c')],
      []
    )
    expect(missingHandles).toMatch(/Could not resolve/)

    const unknownPort = describeConnectionRejection(
      { source: 'c', target: 't', sourceHandle: 'bogus', targetHandle: 'in' },
      nodes,
      []
    )
    expect(unknownPort).toMatch(/Unknown port/)

    const duplicate = describeConnectionRejection(
      { source: 'chat2', target: 't', sourceHandle: 'message', targetHandle: 'in' },
      [...nodes, makeChat('chat2')],
      [{ id: 'e1', source: 'c', target: 't', sourceHandle: 'message', targetHandle: 'in' }]
    )
    expect(duplicate).toMatch(/already has/)

    const missingSource = describeConnectionRejection(
      { source: '', target: 'a' },
      nodes,
      []
    )
    expect(missingSource).toMatch(/source and a target/)
  })

  it('allows Chat to curated JSON Tool', () => {
    const jsonCurated = makeTool('jt', 'json-tool')
    const withJson = [...nodes, jsonCurated]
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'jt', sourceHandle: 'message', targetHandle: 'in' },
        withJson,
        []
      )
    ).toBe(true)
  })

  it('rejects connections involving canvas-locked nodes', () => {
    const lockedAgent = { ...agent, data: { ...agent.data, locked: true } }
    const lockedNodes = [chat, lockedAgent, tool]
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'a', sourceHandle: 'message', targetHandle: 'context' },
        lockedNodes,
        []
      )
    ).toBe(false)
    expect(
      describeConnectionRejection(
        { source: 'c', target: 'a', sourceHandle: 'message', targetHandle: 'context' },
        lockedNodes,
        []
      )
    ).toMatch(/lock/i)
  })
})
