import type { Edge, Node } from '@xyflow/react'
import type { ApiKeys, ToolNodeData } from '../types'
import {
  canRunCaptureSink,
  downstreamClosure,
  upstreamClosure,
} from '../orchestrator/executionScope'
import {
  getTool,
  isToolAvailableForConfig,
  canToolRunWithoutUpstreamInput,
} from '../tools/registry'

export type WorkflowStarterKind = 'agent' | 'tool' | 'sink'

/** Whether this node can start a workflow run from the canvas or inspector. */
export function getWorkflowStarterKind(
  node: Node,
  nodes: Node[],
  edges: Edge[],
  apiKeys: ApiKeys
): WorkflowStarterKind | null {
  if (node.type === 'agent') {
    const hasConnections =
      upstreamClosure(node.id, edges).size > 0 || downstreamClosure(node.id, edges).size > 0
    return hasConnections ? 'agent' : null
  }

  if (node.type !== 'tool') {
    return null
  }

  const data = node.data as ToolNodeData
  const tool = getTool(data.toolType)
  if (!isToolAvailableForConfig(tool, apiKeys, data.config)) {
    return null
  }

  if (data.toolType === 'text-output') {
    return canRunCaptureSink(node.id, nodes, edges) ? 'sink' : null
  }

  if (downstreamClosure(node.id, edges).size === 0) {
    return null
  }

  if (!canToolRunWithoutUpstreamInput(tool, data.config)) {
    return null
  }

  return 'tool'
}

export function workflowStarterLabel(kind: WorkflowStarterKind): string {
  return kind === 'sink' ? 'Run capture' : 'Run workflow'
}

export function workflowStarterHint(kind: WorkflowStarterKind): string {
  switch (kind) {
    case 'sink':
      return 'Run upstream tools and append output to this capture block'
    case 'tool':
      return 'Run this tool and everything wired downstream'
    case 'agent':
      return 'Run this agent with wired context and downstream tools'
  }
}
