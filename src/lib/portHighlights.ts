import type { Node } from '@xyflow/react'
import type { ToolNodeData } from '../types'
import { canConnect, type PortDef } from './ports'
import { getChatPorts, getAgentPorts, getToolPorts } from './nodePorts'
import { getPortDef } from './nodePorts'
import type { ConnectingFrom } from '../stores/connectionStore'

export type PortHighlightClass =
  | ''
  | 'port-handle--active'
  | 'port-handle--compatible'
  | 'port-handle--incompatible'

function highlightKey(nodeId: string, handleId: string, handleType: 'source' | 'target'): string {
  return `${nodeId}:${handleId}:${handleType}`
}

function portsForNode(node: Node): PortDef[] {
  if (node.type === 'chat') return getChatPorts()
  if (node.type === 'agent') return getAgentPorts()
  if (node.type === 'tool') return getToolPorts((node.data as ToolNodeData).toolType)
  return []
}

export function computePortHighlightMap(
  connectingFrom: ConnectingFrom | null,
  nodes: Node[]
): Record<string, PortHighlightClass> {
  if (!connectingFrom) return {}

  const map: Record<string, PortHighlightClass> = {}
  const otherNode = nodes.find((n) => n.id === connectingFrom.nodeId)
  if (!otherNode) return map

  const otherPort = getPortDef(
    otherNode,
    connectingFrom.handleId,
    connectingFrom.handleType === 'source' ? 'source' : 'target'
  )
  if (!otherPort) return map

  for (const node of nodes) {
    for (const port of portsForNode(node)) {
      const handleType: 'source' | 'target' = port.direction === 'out' ? 'source' : 'target'
      const key = highlightKey(node.id, port.id, handleType)

      if (connectingFrom.nodeId === node.id && connectingFrom.handleId === port.id) {
        map[key] = 'port-handle--active'
        continue
      }

      const thisPort = getPortDef(node, port.id, handleType)
      if (!thisPort) {
        map[key] = 'port-handle--incompatible'
        continue
      }

      if (connectingFrom.handleType === 'source' && handleType === 'target') {
        map[key] = canConnect(otherPort, thisPort) ? 'port-handle--compatible' : 'port-handle--incompatible'
      } else if (connectingFrom.handleType === 'target' && handleType === 'source') {
        map[key] = canConnect(thisPort, otherPort) ? 'port-handle--compatible' : 'port-handle--incompatible'
      } else {
        map[key] = 'port-handle--incompatible'
      }
    }
  }

  return map
}

export function portHighlightLookup(
  map: Record<string, PortHighlightClass>,
  nodeId: string,
  handleId: string,
  handleType: 'source' | 'target'
): PortHighlightClass {
  return map[highlightKey(nodeId, handleId, handleType)] ?? ''
}
