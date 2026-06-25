import type { Edge, Node } from '@xyflow/react'
import { getExecutionOrder } from '../orchestrator/dag'

export const WORKFLOW_LAYOUT_COLUMN_WIDTH = 300
export const WORKFLOW_LAYOUT_ROW_HEIGHT = 180
export const WORKFLOW_LAYOUT_PADDING_X = 48
export const WORKFLOW_LAYOUT_PADDING_Y = 48

/** Column index per node — longest-path layering from upstream edges. */
export function computeWorkflowNodeLayers(
  nodes: Node[],
  edges: Edge[],
  executionOrder = getExecutionOrder(nodes, edges)
): Map<string, number> {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const layers = new Map<string, number>()

  for (const node of executionOrder) {
    const predecessorLayers = edges
      .filter((edge) => edge.target === node.id && nodeIds.has(edge.source))
      .map((edge) => layers.get(edge.source) ?? 0)
    const layer = predecessorLayers.length > 0 ? Math.max(...predecessorLayers) + 1 : 0
    layers.set(node.id, layer)
  }

  for (const node of nodes) {
    if (!layers.has(node.id)) {
      layers.set(node.id, 0)
    }
  }

  return layers
}

/** Spread nodes into readable columns — same idea as saved workflow positions. */
export function layoutWorkflowNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  const executionOrder = getExecutionOrder(nodes, edges)
  const layers = computeWorkflowNodeLayers(nodes, edges, executionOrder)
  const orderIndex = new Map(executionOrder.map((node, index) => [node.id, index]))
  const nodesByLayer = new Map<number, Node[]>()

  const orderFor = (id: string): number => (orderIndex.has(id) ? orderIndex.get(id)! : 0)

  for (const node of nodes) {
    const layer = layers.get(node.id)!
    let column = nodesByLayer.get(layer)
    if (!column) {
      column = []
      nodesByLayer.set(layer, column)
    }
    column.push(node)
  }

  const sortedLayers = [...nodesByLayer.entries()].sort(([a], [b]) => a - b)
  const positioned = new Map<string, Node>()

  for (const [layer, column] of sortedLayers) {
    const sortedColumn = [...column].sort((a, b) => orderFor(a.id) - orderFor(b.id))
    const stackHeight = Math.max(0, sortedColumn.length - 1) * WORKFLOW_LAYOUT_ROW_HEIGHT
    const startY = WORKFLOW_LAYOUT_PADDING_Y - stackHeight / 2

    sortedColumn.forEach((node, index) => {
      positioned.set(node.id, {
        ...node,
        position: {
          x: WORKFLOW_LAYOUT_PADDING_X + layer * WORKFLOW_LAYOUT_COLUMN_WIDTH,
          y: startY + index * WORKFLOW_LAYOUT_ROW_HEIGHT,
        },
      })
    })
  }

  return nodes.map((node) => positioned.get(node.id)!)
}

/** True when no two nodes share the same column and row slot. */
export function areWorkflowNodePositionsSeparated(
  positions: { x: number; y: number }[]
): boolean {
  const minColumnGap = WORKFLOW_LAYOUT_COLUMN_WIDTH * 0.9
  const minRowGap = WORKFLOW_LAYOUT_ROW_HEIGHT * 0.9

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i]!
      const b = positions[j]!
      const sameColumn = Math.abs(a.x - b.x) < minColumnGap
      const sameRow = Math.abs(a.y - b.y) < minRowGap
      if (sameColumn && sameRow) return false
    }
  }

  return true
}
