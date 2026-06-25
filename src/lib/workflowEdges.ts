import type { Edge, Node } from '@xyflow/react'
import { getDefaultSourceHandle, getDefaultTargetHandle } from '../lib/nodePorts'

export function createWorkflowEdge(
  source: Node,
  target: Node,
  id?: string
): Edge {
  return {
    id: id ?? `e-${source.id}-${target.id}`,
    source: source.id,
    target: target.id,
    sourceHandle: getDefaultSourceHandle(source),
    targetHandle: getDefaultTargetHandle(target),
    type: 'animated',
  }
}

export function createWorkflowEdgeWithHandles(
  source: Node,
  target: Node,
  sourceHandle: string,
  targetHandle: string,
  id?: string
): Edge {
  return {
    id: id ?? `e-${source.id}-${target.id}`,
    source: source.id,
    target: target.id,
    sourceHandle,
    targetHandle,
    type: 'animated',
  }
}
