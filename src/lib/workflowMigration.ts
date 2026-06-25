import type { Edge, Node } from '@xyflow/react'
import { getDefaultSourceHandle, getDefaultTargetHandle } from './nodePorts'
import { ensureNodeDimensions } from './nodeDimensions'
import { withNodeCanvasLockFlags } from './nodeCanvasLock'

export const WORKFLOW_SCHEMA_VERSION = 2

export function migrateWorkflowEdges(nodes: Node[], edges: Edge[]): Edge[] {
  return edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    if (!sourceNode || !targetNode) return edge

    return {
      ...edge,
      sourceHandle: edge.sourceHandle ?? getDefaultSourceHandle(sourceNode),
      targetHandle: edge.targetHandle ?? getDefaultTargetHandle(targetNode),
    }
  })
}

export function migrateWorkflow(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const sized = nodes.map((node) => withNodeCanvasLockFlags(ensureNodeDimensions(node)))
  return {
    nodes: sized,
    edges: migrateWorkflowEdges(sized, edges),
  }
}
