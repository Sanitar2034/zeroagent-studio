import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import type { AgentNodeData } from '../../types'
import { useExecutionStore } from '../../stores/executionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getAgentBrainBadgeLabel } from '../../lib/brainSetup'
import { getAgentPorts } from '../../lib/nodePorts'
import { PortHandles } from './PortHandles'
import { readNodeLocked } from '../../lib/nodeCanvasLock'
import { NodeActionBar } from './NodeActionBar'
import { NodeResizeControls } from './NodeResizeControls'
import './nodes.css'

function AgentNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData
  const isThinking = useExecutionStore((s) => s.thinkingNodes.has(id))
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const brainBadge = getAgentBrainBadgeLabel(nodeData.brain, apiKeys, nodeData.model)
  const canvasLocked = readNodeLocked(nodeData)

  return (
    <motion.div
      className={`custom-node agent-node ${selected ? 'selected' : ''} ${isThinking ? 'thinking' : ''} ${brainBadge.locked ? 'node-setup-locked' : ''} ${canvasLocked ? 'node-canvas-locked' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <NodeResizeControls nodeType="agent" selected={selected} locked={canvasLocked} />
      <NodeActionBar nodeId={id} selected={selected} locked={canvasLocked} />
      <PortHandles nodeId={id} ports={getAgentPorts()} connectable={!canvasLocked} />
      <div className="custom-node__inner">
        <div className="node-header">
          <span className="node-icon">🤖</span>
          <span className="node-type">Agent</span>
          {isThinking && <span className="thinking-indicator" />}
        </div>
        <div className="node-body">
          <div className="node-label">{nodeData.label || 'Agent'}</div>
          <div className="node-meta">
            <span className="role-badge">{nodeData.role || 'Assistant'}</span>
            <span className={`brain-badge ${brainBadge.locked ? 'brain-badge--locked' : ''}`}>
              {brainBadge.text}
            </span>
          </div>
          {nodeData.lastOutput && (
            <div className="node-output-preview">{nodeData.lastOutput}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default memo(AgentNodeComponent)
