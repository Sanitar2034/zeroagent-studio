import type { Node, NodeChange } from '@xyflow/react'

export interface CanvasLockableNodeData {
  locked?: boolean
}

export function isNodeCanvasLocked(node: Node | undefined): boolean {
  if (!node) return false
  return !!(node.data as CanvasLockableNodeData).locked
}

/** Sync React Flow interaction flags from `data.locked`. */
export function withNodeCanvasLockFlags(node: Node): Node {
  const locked = isNodeCanvasLocked(node)
  return {
    ...node,
    draggable: !locked,
    connectable: !locked,
    deletable: !locked,
  }
}

export function isLockedNodeChangeBlocked(change: NodeChange, nodes: Node[]): boolean {
  if (!('id' in change)) return false
  const node = nodes.find((n) => n.id === change.id)
  if (!isNodeCanvasLocked(node)) return false
  return change.type === 'remove' || change.type === 'dimensions' || change.type === 'position'
}

export const NODE_CANVAS_LOCK_HINT = 'Unlock the block first (click the lock icon on the toolbar).'

export function readNodeLocked(data: Record<string, unknown> | { locked?: boolean }): boolean {
  return !!(data as { locked?: boolean }).locked
}
