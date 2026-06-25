import type { Node } from '@xyflow/react'
import type { AgentNodeData, ApiKeys, ToolNodeData } from '../types'
import { getTool } from '../tools/registry'
import { isBrainAvailable } from './brainResolver'
import type { CloudProviderId } from './cloudPrivacy'

const CLOUD_BRAINS = new Set<string>(['openrouter', 'groq', 'gemini'])

export interface WorkflowPrivacySummary {
  /** True when canvas includes cloud Agents or cloud API tools */
  maySendDataToCloud: boolean
  cloudAgents: { label: string; brain: CloudProviderId }[]
  cloudTools: { label: string; provider: CloudProviderId }[]
  providers: CloudProviderId[]
}

export function summarizeWorkflowPrivacy(nodes: Node[], apiKeys: ApiKeys = {}): WorkflowPrivacySummary {
  const cloudAgents: WorkflowPrivacySummary['cloudAgents'] = []
  const cloudTools: WorkflowPrivacySummary['cloudTools'] = []
  const providerSet = new Set<CloudProviderId>()

  for (const node of nodes) {
    if (node.type === 'agent') {
      const data = node.data as AgentNodeData
      if (CLOUD_BRAINS.has(data.brain) && isBrainAvailable(data.brain as AgentNodeData['brain'], apiKeys)) {
        const brain = data.brain as CloudProviderId
        cloudAgents.push({ label: data.label || 'Agent', brain })
        providerSet.add(brain)
      }
    }
    if (node.type === 'tool') {
      const data = node.data as ToolNodeData
      if (!data.toolType) continue
      const tool = getTool(data.toolType)
      if (tool.requirement.kind === 'apiKey') {
        const provider = tool.requirement.provider as CloudProviderId
        if (!apiKeys[provider]?.trim()) continue
        cloudTools.push({ label: tool.label, provider })
        providerSet.add(provider)
      }
    }
  }

  return {
    maySendDataToCloud: cloudAgents.length > 0 || cloudTools.length > 0,
    cloudAgents,
    cloudTools,
    providers: [...providerSet],
  }
}

export function buildChatPrivacyWarning(nodes: Node[], apiKeys: ApiKeys = {}): string | null {
  const summary = summarizeWorkflowPrivacy(nodes, apiKeys)
  if (!summary.maySendDataToCloud) return null

  const parts: string[] = []
  if (summary.cloudAgents.length) {
    parts.push(
      summary.cloudAgents.map((a) => `${a.label} (${a.brain})`).join(', ')
    )
  }
  if (summary.cloudTools.length) {
    parts.push(
      `cloud tools: ${summary.cloudTools.map((t) => t.label).join(', ')}`
    )
  }

  return `Cloud path active — sending may transmit your message and upstream content to ${summary.providers.join(', ')} (${parts.join('; ')}). Open Privacy & keys → Privacy & cloud providers for official settings.`
}
