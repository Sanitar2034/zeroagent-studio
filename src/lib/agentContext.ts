import type { Edge, Node } from '@xyflow/react'
import type { ToolNodeData, WorkflowTrigger, ExecutionContext } from '../types'
import { getTool } from '../tools/registry'
import type { ToolType } from '../tools/registry'
import { getNodeOutputValue } from './nodeOutputValue'
import { resolveEdgeSourceHandle, resolveEdgeTargetHandle } from './nodePorts'

export interface ContextBlock {
  nodeId: string
  label: string
  kind: 'user_message' | 'chat' | 'tool' | 'agent'
  toolId?: string
  portId: string
  value: string
}

function getNodeLabel(node: Node): string {
  const data = node.data as { label?: string }
  return data.label || node.id
}

function blockKindForNode(node: Node): ContextBlock['kind'] {
  if (node.type === 'chat') return 'chat'
  if (node.type === 'tool') return 'tool'
  if (node.type === 'agent') return 'agent'
  return 'tool'
}

export function collectContextBlocks(
  agentNodeId: string,
  nodes: Node[],
  edges: Edge[],
  context: ExecutionContext,
  trigger: WorkflowTrigger
): ContextBlock[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const blocks: ContextBlock[] = []
  const seenValues = new Set<string>()

  if (trigger.kind === 'chat' && trigger.userInput.trim()) {
    blocks.push({
      nodeId: trigger.nodeId,
      label: 'User message',
      kind: 'user_message',
      portId: 'message',
      value: trigger.userInput.trim(),
    })
    seenValues.add(trigger.userInput.trim())
  }

  const upstreamEdges = edges.filter((e) => {
    if (e.target !== agentNodeId) return false
    const handle = resolveEdgeTargetHandle(e, nodes)
    return handle === 'context' || handle === 'in'
  })

  for (const edge of upstreamEdges) {
    const sourceNode = nodeById.get(edge.source)
    if (!sourceNode) continue

    const sourceHandle = resolveEdgeSourceHandle(edge, nodes)
    const value = getNodeOutputValue(edge.source, context, sourceHandle)
    if (!value.trim()) continue

    // Skip duplicate chat message when wired to context
    if (sourceNode.type === 'chat' && seenValues.has(value.trim())) continue

    const label = getNodeLabel(sourceNode)
    const kind = blockKindForNode(sourceNode)
    const toolId =
      sourceNode.type === 'tool'
        ? (sourceNode.data as ToolNodeData).toolType
        : undefined

    blocks.push({
      nodeId: edge.source,
      label: sourceNode.type === 'tool' && toolId ? getTool(toolId as ToolType).label : label,
      kind,
      toolId,
      portId: sourceHandle,
      value: value.trim(),
    })
    seenValues.add(value.trim())
  }

  return blocks
}

export function formatAgentPrompt(role: string, blocks: ContextBlock[]): string {
  const sections: string[] = [`Role: ${role}`, '']

  for (const block of blocks) {
    sections.push(`## ${block.label}`)
    sections.push(block.value)
    sections.push('')
  }

  const jsonPayload = {
    blocks: blocks.map((b) => ({
      kind: b.kind,
      nodeId: b.nodeId,
      label: b.label,
      toolId: b.toolId,
      portId: b.portId,
      value: b.value,
    })),
  }

  sections.push('---')
  sections.push('Structured context (JSON):')
  sections.push(JSON.stringify(jsonPayload))

  return sections.join('\n')
}

/** @internal for tests */
export const __testOnly = {
  getNodeOutputValue: (nodeId: string, sourceHandle: string, context: ExecutionContext) =>
    getNodeOutputValue(nodeId, context, sourceHandle),
  blockKindForNode,
  getNodeLabel,
}
