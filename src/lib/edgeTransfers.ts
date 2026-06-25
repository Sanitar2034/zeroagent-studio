import type { Edge, Node } from '@xyflow/react'
import type { ExecutionContext } from '../types'
import { textPortValue, type PortDataType } from './ports'
import { resolveUpstreamPortValue } from './portMerge'
import { getNodeOutputValue } from './nodeOutputValue'
import { resolveEdgeSourceHandle, resolveEdgeTargetHandle } from './nodePorts'
import { useExecutionStore } from '../stores/executionStore'

export const __testOnly = { getNodeOutputValue }

export function recordEdgeTransfersForNode(
  nodeId: string,
  inputPortIds: string[],
  nodes: Node[],
  edges: Edge[],
  context: ExecutionContext
): void {
  const store = useExecutionStore.getState()
  const upstreamEdges = edges.filter((e) => e.target === nodeId)

  for (const portId of inputPortIds) {
    const matching = upstreamEdges.filter((e) => resolveEdgeTargetHandle(e, nodes) === portId)

    for (const edge of matching) {
      const sourceHandle = resolveEdgeSourceHandle(edge, nodes)
      const fromTool = context.toolResults[edge.source]?.[sourceHandle]
      const fromVar = context.variables[edge.source]?.[sourceHandle]
      const portValue = resolveUpstreamPortValue(
        fromTool,
        fromVar,
        textPortValue(getNodeOutputValue(edge.source, context, sourceHandle))
      )

      store.recordEdgeTransfer({
        edgeId: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceHandle,
        targetHandle: portId,
        value: portValue.value,
        dataType: portValue.type as PortDataType,
        timestamp: Date.now(),
      })
    }
  }
}

export function setFlowingEdgesForNode(nodeId: string, edges: Edge[]): void {
  const flowing = edges
    .filter((e) => e.source === nodeId || e.target === nodeId)
    .map((e) => e.id)
  useExecutionStore.getState().setFlowingEdges(flowing)
}
