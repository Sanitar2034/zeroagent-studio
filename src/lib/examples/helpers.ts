import type { Node } from '@xyflow/react'
import type { ChatNodeData } from '../../types'
import type { ExampleWorkflowId } from './types'
import { getExampleWorkflowMeta } from './meta'

export const PLACEHOLDER_POSITION = { x: 0, y: 0 }

export function applyExampleTryPrompt(nodes: Node[], id: ExampleWorkflowId): Node[] {
  const meta = getExampleWorkflowMeta(id)
  if (!meta?.tryPrompt) return nodes

  return nodes.map((node) => {
    if (node.type !== 'chat') return node
    return {
      ...node,
      data: {
        ...(node.data as ChatNodeData),
        inputValue: meta.tryPrompt,
      },
    }
  })
}
