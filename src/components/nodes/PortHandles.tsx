import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { PortDef } from '../../lib/ports'
import { portTypeColor } from '../../lib/ports'
import { useConnectionStore } from '../../stores/connectionStore'
import { portHighlightLookup } from '../../lib/portHighlights'

interface PortHandlesProps {
  nodeId: string
  ports: PortDef[]
  connectable?: boolean
}

function portOffset(index: number, total: number): string {
  if (total <= 1) return '50%'
  const pct = ((index + 1) / (total + 1)) * 100
  return `${pct}%`
}

function PortHandlesComponent({ nodeId, ports, connectable = true }: PortHandlesProps) {
  const portHighlights = useConnectionStore((s) => s.portHighlights)
  const connectingFrom = useConnectionStore((s) => s.connectingFrom)

  const inputs = ports.filter((p) => p.direction === 'in')
  const outputs = ports.filter((p) => p.direction === 'out')

  const highlightFor = (portId: string, handleType: 'source' | 'target'): string => {
    if (!connectingFrom) return ''
    return portHighlightLookup(portHighlights, nodeId, portId, handleType)
  }

  return (
    <>
      {inputs.map((port, i) => (
        <div
          key={`in-${port.id}`}
          className="port-handle-wrap port-handle-wrap--left"
          style={{ top: portOffset(i, inputs.length) }}
        >
          <Handle
            id={port.id}
            type="target"
            position={Position.Left}
            isConnectable={connectable}
            className={`node-handle port-handle port-handle--${port.dataType} ${highlightFor(port.id, 'target')}`}
            style={{ borderColor: portTypeColor(port.dataType) }}
            title={`${port.label} (${port.dataType})`}
          />
          <span className="port-label port-label--left" style={{ color: portTypeColor(port.dataType) }}>
            {port.label}
          </span>
        </div>
      ))}
      {outputs.map((port, i) => (
        <div
          key={`out-${port.id}`}
          className="port-handle-wrap port-handle-wrap--right"
          style={{ top: portOffset(i, outputs.length) }}
        >
          <span className="port-label port-label--right" style={{ color: portTypeColor(port.dataType) }}>
            {port.label}
          </span>
          <Handle
            id={port.id}
            type="source"
            position={Position.Right}
            isConnectable={connectable}
            className={`node-handle port-handle port-handle--${port.dataType} ${highlightFor(port.id, 'source')}`}
            style={{ borderColor: portTypeColor(port.dataType) }}
            title={`${port.label} (${port.dataType})`}
          />
        </div>
      ))}
    </>
  )
}

export const PortHandles = memo(PortHandlesComponent)
