import { describe, it, expect } from 'vitest'
import type { Node, NodeChange } from '@xyflow/react'
import {
  isLockedNodeChangeBlocked,
  isNodeCanvasLocked,
  NODE_CANVAS_LOCK_HINT,
  readNodeLocked,
  withNodeCanvasLockFlags,
} from '../../src/lib/nodeCanvasLock'

function makeNode(locked = false): Node {
  return {
    id: 'tool-1',
    type: 'tool',
    position: { x: 0, y: 0 },
    data: { label: 'Test', toolType: 'file-reader', locked },
  }
}

describe('nodeCanvasLock', () => {
  it('reads locked state from node data', () => {
    expect(isNodeCanvasLocked(makeNode(false))).toBe(false)
    expect(isNodeCanvasLocked(makeNode(true))).toBe(true)
    expect(isNodeCanvasLocked(undefined)).toBe(false)
  })

  it('syncs react-flow interaction flags', () => {
    expect(withNodeCanvasLockFlags(makeNode(false))).toMatchObject({
      draggable: true,
      connectable: true,
      deletable: true,
    })
    expect(withNodeCanvasLockFlags(makeNode(true))).toMatchObject({
      draggable: false,
      connectable: false,
      deletable: false,
    })
  })

  it('ignores changes without node ids', () => {
    const nodes = [makeNode(true)]
    expect(isLockedNodeChangeBlocked({ type: 'reset' } as unknown as NodeChange, nodes)).toBe(false)
  })

  it('blocks structural changes on locked nodes', () => {
    const nodes = [makeNode(true)]
    const remove: NodeChange = { id: 'tool-1', type: 'remove' }
    const position: NodeChange = { id: 'tool-1', type: 'position', position: { x: 1, y: 1 } }
    const dimensions: NodeChange = {
      id: 'tool-1',
      type: 'dimensions',
      dimensions: { width: 300, height: 200 },
      resizing: true,
    }
    const select: NodeChange = { id: 'tool-1', type: 'select', selected: true }

    expect(isLockedNodeChangeBlocked(remove, nodes)).toBe(true)
    expect(isLockedNodeChangeBlocked(position, nodes)).toBe(true)
    expect(isLockedNodeChangeBlocked(dimensions, nodes)).toBe(true)
    expect(isLockedNodeChangeBlocked(select, nodes)).toBe(false)
  })

  it('exports a user-facing lock hint', () => {
    expect(NODE_CANVAS_LOCK_HINT).toContain('lock')
  })

  it('reads locked flag from node data records', () => {
    expect(readNodeLocked({ locked: true })).toBe(true)
    expect(readNodeLocked({})).toBe(false)
  })
})
