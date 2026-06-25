import type { Node } from '@xyflow/react'
import { createAgentNode, createChatNode, createToolNode } from '../components/canvas/nodeFactory'
import { paletteDragTypeToToolId } from '../tools/registry'
import { useWorkflowStore } from '../stores/workflowStore'

export function createNodeFromPaletteType(
  type: string,
  position: { x: number; y: number }
): Node | null {
  switch (type) {
    case 'agent':
      return createAgentNode(position)
    case 'chat':
      return createChatNode(position)
    default: {
      const toolId = paletteDragTypeToToolId(type)
      if (!toolId) return null
      return createToolNode(position, toolId)
    }
  }
}

export function addPaletteNodeAt(type: string, position: { x: number; y: number }): boolean {
  const node = createNodeFromPaletteType(type, position)
  if (!node) return false
  useWorkflowStore.getState().addNode(node)
  return true
}
