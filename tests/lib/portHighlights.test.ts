import { describe, it, expect, vi } from 'vitest'
import type { Node } from '@xyflow/react'
import { computePortHighlightMap, portHighlightLookup } from '../../src/lib/portHighlights'
import * as nodePorts from '../../src/lib/nodePorts'
import * as ports from '../../src/lib/ports'
import { makeChat, makeAgent, makeTool } from '../helpers/graphBuilders'

describe('portHighlights', () => {
  const chat = makeChat('c')
  const agent = makeAgent('a')
  const nodes = [chat, agent]

  it('returns empty map when not connecting', () => {
    expect(computePortHighlightMap(null, nodes)).toEqual({})
  })

  it('marks compatible target ports when dragging from chat', () => {
    const map = computePortHighlightMap(
      { nodeId: 'c', handleId: 'message', handleType: 'source' },
      nodes
    )
    expect(portHighlightLookup(map, 'c', 'message', 'source')).toBe('port-handle--active')
    expect(portHighlightLookup(map, 'a', 'context', 'target')).toBe('port-handle--compatible')
  })

  it('includes tool nodes and reverse drag direction', () => {
    const tool = makeTool('t', 'trim-text')
    const map = computePortHighlightMap(
      { nodeId: 'a', handleId: 'context', handleType: 'target' },
      [chat, agent, tool]
    )
    expect(portHighlightLookup(map, 'c', 'message', 'source')).toBe('port-handle--compatible')
    expect(portHighlightLookup(map, 't', 'in', 'target')).not.toBe('port-handle--active')
  })

  it('marks same-direction ports incompatible', () => {
    const map = computePortHighlightMap(
      { nodeId: 'c', handleId: 'message', handleType: 'source' },
      nodes
    )
    expect(portHighlightLookup(map, 'a', 'out', 'source')).toBe('port-handle--incompatible')
  })

  it('returns empty map when source node is missing', () => {
    expect(
      computePortHighlightMap({ nodeId: 'ghost', handleId: 'message', handleType: 'source' }, nodes)
    ).toEqual({})
  })

  it('returns empty map when the active handle is unknown', () => {
    expect(
      computePortHighlightMap({ nodeId: 'c', handleId: 'bogus', handleType: 'source' }, nodes)
    ).toEqual({})
  })

  it('marks strict json inputs incompatible with text sources', () => {
    const jsonTool = makeTool('j', 'json-pretty')
    const map = computePortHighlightMap(
      { nodeId: 'c', handleId: 'message', handleType: 'source' },
      [chat, jsonTool]
    )
    expect(portHighlightLookup(map, 'j', 'in', 'target')).toBe('port-handle--incompatible')
  })

  it('marks incompatible sources when reverse drag cannot connect', () => {
    const spy = vi.spyOn(ports, 'canConnect').mockReturnValue(false)
    const map = computePortHighlightMap(
      { nodeId: 'a', handleId: 'context', handleType: 'target' },
      nodes
    )
    expect(portHighlightLookup(map, 'c', 'message', 'source')).toBe('port-handle--incompatible')
    spy.mockRestore()
  })

  it('ignores unknown node types', () => {
    const weird = { id: 'w', type: 'unknown', position: { x: 0, y: 0 }, data: {} } as Node
    const map = computePortHighlightMap(
      { nodeId: 'c', handleId: 'message', handleType: 'source' },
      [chat, weird, agent]
    )
    expect(portHighlightLookup(map, 'a', 'context', 'target')).toBe('port-handle--compatible')
  })

  it('marks ports incompatible when metadata is missing', () => {
    const spy = vi.spyOn(nodePorts, 'getPortDef')
    spy.mockImplementation((node, handleId, handleType) => {
      if (node.id === 'a' && handleId === 'context' && handleType === 'target') {
        return { id: 'context', label: 'Context', direction: 'in', dataType: 'text' }
      }
      return null
    })
    const map = computePortHighlightMap(
      { nodeId: 'a', handleId: 'context', handleType: 'target' },
      nodes
    )
    expect(portHighlightLookup(map, 'c', 'message', 'source')).toBe('port-handle--incompatible')
    spy.mockRestore()
  })

  it('ignores unknown lookup keys', () => {
    expect(portHighlightLookup({}, 'x', 'y', 'source')).toBe('')
  })
})
