import { describe, it, expect, vi } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import * as dag from '../../src/orchestrator/dag'
import {
  computeWorkflowNodeLayers,
  layoutWorkflowNodes,
  areWorkflowNodePositionsSeparated,
  WORKFLOW_LAYOUT_COLUMN_WIDTH,
  WORKFLOW_LAYOUT_PADDING_X,
  WORKFLOW_LAYOUT_ROW_HEIGHT,
} from '../../src/lib/workflowLayout'

function node(id: string): Node {
  return { id, type: 'tool', position: { x: 0, y: 0 }, data: {} }
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('workflowLayout', () => {
  it('assigns increasing layers along a chain', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('a', 'b'), edge('b', 'c')]
    const layers = computeWorkflowNodeLayers(nodes, edges)
    expect(layers.get('a')).toBe(0)
    expect(layers.get('b')).toBe(1)
    expect(layers.get('c')).toBe(2)
  })

  it('stacks parallel sources in the same column', () => {
    const nodes = [node('chat'), node('dt'), node('agent')]
    const edges = [edge('chat', 'agent'), edge('dt', 'agent')]
    const layers = computeWorkflowNodeLayers(nodes, edges)
    expect(layers.get('chat')).toBe(0)
    expect(layers.get('dt')).toBe(0)
    expect(layers.get('agent')).toBe(1)
  })

  it('spaces nodes into distinct columns and rows', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('a', 'c'), edge('b', 'c')]
    const laidOut = layoutWorkflowNodes(nodes, edges)
    const byId = new Map(laidOut.map((n) => [n.id, n.position]))

    expect(byId.get('a')?.x).toBe(WORKFLOW_LAYOUT_PADDING_X)
    expect(byId.get('b')?.x).toBe(WORKFLOW_LAYOUT_PADDING_X)
    expect(byId.get('c')?.x).toBe(WORKFLOW_LAYOUT_PADDING_X + WORKFLOW_LAYOUT_COLUMN_WIDTH)
    expect(byId.get('a')?.y).not.toBe(byId.get('b')?.y)
    expect(Math.abs((byId.get('a')?.y ?? 0) - (byId.get('b')?.y ?? 0))).toBeGreaterThanOrEqual(
      WORKFLOW_LAYOUT_ROW_HEIGHT
    )
  })

  it('returns empty input unchanged', () => {
    expect(layoutWorkflowNodes([], [])).toEqual([])
  })

  it('defaults nodes missing from execution order to layer zero', () => {
    const nodes = [node('skipped'), node('seen')]
    vi.spyOn(dag, 'getExecutionOrder').mockReturnValue([nodes[1]!])

    const layers = computeWorkflowNodeLayers(nodes, [])
    expect(layers.get('skipped')).toBe(0)
    expect(layers.get('seen')).toBe(0)

    vi.restoreAllMocks()
  })

  it('handles out-of-order execution when resolving predecessor layers', () => {
    const a = node('a')
    const b = node('b')
    vi.spyOn(dag, 'getExecutionOrder').mockReturnValue([b, a])

    const layers = computeWorkflowNodeLayers([a, b], [edge('a', 'b')])
    expect(layers.get('b')).toBe(1)

    vi.restoreAllMocks()
  })

  it('sorts parallel nodes by execution order within a column', () => {
    const chat = node('chat')
    const datetime = node('datetime')
    const agent = node('agent')
    vi.spyOn(dag, 'getExecutionOrder').mockReturnValue([datetime, chat, agent])

    const laidOut = layoutWorkflowNodes([chat, datetime, agent], [
      edge('chat', 'agent'),
      edge('datetime', 'agent'),
    ])
    const byId = new Map(laidOut.map((n) => [n.id, n.position]))
    expect(byId.get('datetime')!.y).toBeLessThan(byId.get('chat')!.y)

    vi.restoreAllMocks()
  })

  it('places nodes missing from execution order before known nodes in a column', () => {
    const filler = node('filler')
    const known = node('known')
    const unknown = node('unknown')
    vi.spyOn(dag, 'getExecutionOrder').mockReturnValue([filler, known])

    const laidOut = layoutWorkflowNodes([unknown, known], [])
    const byId = new Map(laidOut.map((n) => [n.id, n.position]))
    expect(byId.get('unknown')!.y).toBeLessThan(byId.get('known')!.y)

    vi.restoreAllMocks()
  })

  it('detects overlapping positions', () => {
    expect(areWorkflowNodePositionsSeparated([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(false)
    expect(areWorkflowNodePositionsSeparated([{ x: 0, y: 0 }, { x: 300, y: 0 }])).toBe(true)
  })
})
