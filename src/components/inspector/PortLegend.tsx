import type { PortDef } from '../../lib/ports'
import { portTypeColor } from '../../lib/ports'

export function PortLegend({ inputs, outputs }: { inputs: PortDef[]; outputs: PortDef[] }) {
  return (
    <div className="port-legend">
      <span className="port-legend-label">Ports</span>
      <div className="port-legend-chips">
        {inputs.map((p) => (
          <span
            key={`in-${p.id}`}
            className="port-legend-chip"
            style={{ borderColor: portTypeColor(p.dataType) }}
            title={`Input: ${p.label}`}
          >
            ← {p.label} ({p.dataType})
          </span>
        ))}
        {outputs.map((p) => (
          <span
            key={`out-${p.id}`}
            className="port-legend-chip"
            style={{ borderColor: portTypeColor(p.dataType) }}
            title={`Output: ${p.label}`}
          >
            {p.label} ({p.dataType}) →
          </span>
        ))}
      </div>
    </div>
  )
}
