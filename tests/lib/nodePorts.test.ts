import { describe, it, expect } from 'vitest'
import {
  getChatPorts,
  getAgentPorts,
  getToolPorts,
  getNodePorts,
  getPortDef,
  getDefaultSourceHandle,
  getDefaultTargetHandle,
} from '../../src/lib/nodePorts'
import { makeChat, makeAgent, makeTool } from '../helpers/graphBuilders'

describe('nodePorts', () => {
  it('returns chat, agent, and tool ports', () => {
    expect(getChatPorts()).toHaveLength(1)
    expect(getAgentPorts().some((p) => p.id === 'context')).toBe(true)
    expect(getToolPorts('trim-text').some((p) => p.id === 'in')).toBe(true)
  })

  it('getNodePorts by node type', () => {
    expect(getNodePorts(makeChat('c'))[0].id).toBe('message')
    expect(getNodePorts(makeAgent('a'))[0].direction).toBe('in')
    expect(getNodePorts(makeTool('t', 'json-pretty'))).toBeTruthy()
  })

  it('getPortDef resolves handle direction', () => {
    const chat = makeChat('c')
    expect(getPortDef(chat, 'message', 'source')?.direction).toBe('out')
    expect(getPortDef(chat, 'message', 'target')).toBeNull()
  })

  it('default handles for chat and agent', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    expect(getDefaultSourceHandle(chat)).toBe('message')
    expect(getDefaultTargetHandle(agent)).toBe('context')
  })

  it('getNodePorts falls back when tool node has no toolType', () => {
    const ports = getNodePorts({ id: 't', type: 'tool', position: { x: 0, y: 0 }, data: {} })
    expect(ports).toHaveLength(2)
  })

  it('getDefaultSourceHandleForPorts falls back when no output port', async () => {
    const { getDefaultSourceHandleForPorts, resolveEdgeSourceHandle, resolveEdgeTargetHandle } = await import('../../src/lib/nodePorts')
    expect(getDefaultSourceHandleForPorts([{ id: 'in', label: 'In', direction: 'in', dataType: 'text' }])).toBe('out')
    expect(resolveEdgeSourceHandle({ source: 'missing' }, [])).toBe('out')
    expect(resolveEdgeTargetHandle({ target: 'missing' }, [])).toBe('in')
  })
})
