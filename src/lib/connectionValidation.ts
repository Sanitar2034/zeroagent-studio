import type { Connection, Edge, Node } from '@xyflow/react'
import { canConnect } from './ports'
import { getDefaultSourceHandle, getDefaultTargetHandle, getPortDef } from './nodePorts'
import { isNodeCanvasLocked, NODE_CANVAS_LOCK_HINT } from './nodeCanvasLock'

export type WorkflowConnection = {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export function normalizeConnection(
  connection: WorkflowConnection,
  nodes: Node[]
): Connection | null {
  const sourceNode = nodes.find((n) => n.id === connection.source)
  const targetNode = nodes.find((n) => n.id === connection.target)
  if (!sourceNode || !targetNode) return null

  return {
    ...connection,
    sourceHandle: connection.sourceHandle ?? getDefaultSourceHandle(sourceNode),
    targetHandle: connection.targetHandle ?? getDefaultTargetHandle(targetNode),
  }
}

export function describeConnectionRejection(
  connection: {
    source?: string | null
    target?: string | null
    sourceHandle?: string | null
    targetHandle?: string | null
  },
  nodes: Node[],
  edges: Edge[]
): string | null {
  if (isValidWorkflowConnection(connection, nodes, edges)) return null

  if (!connection.source || !connection.target) {
    return 'Connection needs both a source and a target block.'
  }
  if (connection.source === connection.target) {
    return 'A block cannot connect to itself.'
  }

  const sourceNodeEarly = nodes.find((n) => n.id === connection.source)
  const targetNodeEarly = nodes.find((n) => n.id === connection.target)
  if (isNodeCanvasLocked(sourceNodeEarly) || isNodeCanvasLocked(targetNodeEarly)) {
    return NODE_CANVAS_LOCK_HINT
  }

  const normalized = normalizeConnection(
    {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    },
    nodes
  )
  if (!normalized?.sourceHandle || !normalized.targetHandle) {
    return 'Could not resolve port handles for this connection.'
  }

  const sourceNode = nodes.find((n) => n.id === normalized.source)!
  const targetNode = nodes.find((n) => n.id === normalized.target)!

  if (targetNode.type === 'chat') {
    return 'Chat only sends — drag from its Message port to another block.'
  }

  const sourcePort = getPortDef(sourceNode, normalized.sourceHandle, 'source')
  const targetPort = getPortDef(targetNode, normalized.targetHandle, 'target')
  if (!sourcePort || !targetPort) {
    return 'Unknown port — connect colored dots with matching types.'
  }
  if (!canConnect(sourcePort, targetPort)) {
    return `Cannot connect ${sourcePort.dataType} (${sourcePort.label}) to ${targetPort.dataType} (${targetPort.label}). Use matching port types.`
  }

  return 'This input port already has a connection.'
}

export function isValidWorkflowConnection(
  connection: {
    source?: string | null
    target?: string | null
    sourceHandle?: string | null
    targetHandle?: string | null
  },
  nodes: Node[],
  edges: Edge[]
): boolean {
  if (!connection.source || !connection.target) return false
  if (connection.source === connection.target) return false

  const sourceNode = nodes.find((n) => n.id === connection.source)
  const targetNode = nodes.find((n) => n.id === connection.target)
  if (!sourceNode || !targetNode) return false
  if (isNodeCanvasLocked(sourceNode) || isNodeCanvasLocked(targetNode)) return false

  const normalized = normalizeConnection(
    {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    },
    nodes
  )
  if (!normalized?.sourceHandle || !normalized.targetHandle) return false

  if (targetNode.type === 'chat') return false

  const sourcePort = getPortDef(sourceNode, normalized.sourceHandle, 'source')
  const targetPort = getPortDef(targetNode, normalized.targetHandle, 'target')
  if (!sourcePort || !targetPort) return false
  if (!canConnect(sourcePort, targetPort)) return false

  if (!targetPort.multiple) {
    const duplicate = edges.some(
      (e) =>
        e.target === normalized.target &&
        (e.targetHandle ?? getDefaultTargetHandle(targetNode)) === normalized.targetHandle &&
        !(e.source === normalized.source && e.sourceHandle === normalized.sourceHandle)
    )
    if (duplicate) return false
  }

  return true
}
