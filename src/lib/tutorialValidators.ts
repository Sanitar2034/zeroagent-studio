import type { Node, Edge } from '@xyflow/react'
import type { AgentNodeData, ToolNodeData, ChatNodeData } from '../types'
import { resolveEdgeSourceHandle, resolveEdgeTargetHandle } from './nodePorts'

export const DEFAULT_WORKFLOW_NAME = 'Untitled Workflow'
export const DEFAULT_AGENT_ROLE = 'Assistant'

export interface TutorialSnapshot {
  nodes: Node[]
  edges: Edge[]
  workflowName: string
  isRunning: boolean
  runAttempted: boolean
  runFinished: boolean
  connectionRejectionCount: number
}

export function hasNodeType(
  nodes: Node[],
  type: string,
  toolType?: ToolNodeData['toolType']
): boolean {
  return nodes.some((n) => {
    if (n.type !== type) return false
    if (type === 'tool' && toolType) {
      return (n.data as ToolNodeData).toolType === toolType
    }
    return true
  })
}

export function hasValidEdge(
  nodes: Node[],
  edges: Edge[],
  fromId: string,
  toId: string,
  sourceHandle: string,
  targetHandle: string
): boolean {
  return edges.some((e) => {
    if (e.source !== fromId || e.target !== toId) return false
    return (
      resolveEdgeSourceHandle(e, nodes) === sourceHandle &&
      resolveEdgeTargetHandle(e, nodes) === targetHandle
    )
  })
}

export function hasSnackInvestigatorPath(nodes: Node[], edges: Edge[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  const scraper = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'web-scraper'
  )
  const agent = nodes.find((n) => n.type === 'agent')
  if (!chat || !scraper || !agent) return false

  return (
    hasValidEdge(nodes, edges, chat.id, scraper.id, 'message', 'in') &&
    hasValidEdge(nodes, edges, scraper.id, agent.id, 'out', 'context')
  )
}

export function hasDataPipelinePath(nodes: Node[], edges: Edge[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  const jsonTool = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'json-tool'
  )
  const script = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'custom-script'
  )
  const agent = nodes.find((n) => n.type === 'agent')
  if (!chat || !jsonTool || !script || !agent) return false

  return (
    hasValidEdge(nodes, edges, chat.id, jsonTool.id, 'message', 'in') &&
    hasValidEdge(nodes, edges, jsonTool.id, script.id, 'out', 'in') &&
    hasValidEdge(nodes, edges, script.id, agent.id, 'out', 'context')
  )
}

export function hasEncodingChainPath(nodes: Node[], edges: Edge[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  const encoder = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'base64-encode'
  )
  const decoder = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'base64-decode'
  )
  const agent = nodes.find((n) => n.type === 'agent')
  if (!chat || !encoder || !decoder || !agent) return false

  return (
    hasValidEdge(nodes, edges, chat.id, encoder.id, 'message', 'in') &&
    hasValidEdge(nodes, edges, encoder.id, decoder.id, 'out', 'in') &&
    hasValidEdge(nodes, edges, decoder.id, agent.id, 'out', 'context')
  )
}

export function customScriptConfigured(nodes: Node[]): boolean {
  const script = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'custom-script'
  )
  if (!script) return false
  const code = ((script.data as ToolNodeData).config?.script ?? '').trim()
  return code.length > 0
}

export function chatJsonEvidenceDropped(nodes: Node[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  if (!chat) return false
  const input = ((chat.data as ChatNodeData).inputValue ?? '').trim()
  if (!input) return false
  try {
    const parsed = JSON.parse(input) as unknown
    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
}

export function hasTwoAgents(nodes: Node[]): boolean {
  return nodes.filter((n) => n.type === 'agent').length >= 2
}

export function hasWritersRoomPath(nodes: Node[], edges: Edge[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  const agents = nodes.filter((n) => n.type === 'agent')
  if (!chat || agents.length < 2) return false
  const [writer, editor] = agents
  return (
    hasValidEdge(nodes, edges, chat.id, writer.id, 'message', 'context') &&
    hasValidEdge(nodes, edges, writer.id, editor.id, 'out', 'context')
  )
}

export function twoAgentsRoleBriefed(nodes: Node[]): boolean {
  const agents = nodes.filter((n) => n.type === 'agent')
  if (agents.length < 2) return false
  return agents.every((n) => {
    const role = (n.data as AgentNodeData).role?.trim() ?? ''
    return role.length > 0 && role !== DEFAULT_AGENT_ROLE
  })
}

export function writersPromptDropped(nodes: Node[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  if (!chat) return false
  const input = ((chat.data as ChatNodeData).inputValue ?? '').trim().toLowerCase()
  return /tagline|workflow/.test(input)
}

export function hasUrlDetectivePath(nodes: Node[], edges: Edge[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  const parseUrl = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'parse-url'
  )
  const agent = nodes.find((n) => n.type === 'agent')
  if (!chat || !parseUrl || !agent) return false

  return (
    hasValidEdge(nodes, edges, chat.id, parseUrl.id, 'message', 'in') &&
    hasValidEdge(nodes, edges, parseUrl.id, agent.id, 'out', 'context')
  )
}

export function urlEvidenceDropped(nodes: Node[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  if (!chat) return false
  const input = ((chat.data as ChatNodeData).inputValue ?? '').trim()
  if (!input) return false
  return /https?:\/\//.test(input) || input.includes('.')
}

export function hasVoiceBoothPath(nodes: Node[], edges: Edge[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  const agent = nodes.find((n) => n.type === 'agent')
  const speech = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'speech'
  )
  if (!chat || !agent || !speech) return false

  return (
    hasValidEdge(nodes, edges, chat.id, agent.id, 'message', 'context') &&
    hasValidEdge(nodes, edges, agent.id, speech.id, 'out', 'in')
  )
}

export function speechConfigured(nodes: Node[]): boolean {
  const speech = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'speech'
  )
  if (!speech) return false
  return (speech.data as ToolNodeData).config?.mode === 'tts'
}

export function hasCaptureDeskPath(nodes: Node[], edges: Edge[]): boolean {
  const datetime = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'datetime'
  )
  const uuid = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'uuid-v4'
  )
  const agent = nodes.find((n) => n.type === 'agent')
  const output = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'text-output'
  )
  if (!datetime || !uuid || !agent || !output) return false

  return (
    hasValidEdge(nodes, edges, datetime.id, agent.id, 'out', 'context') &&
    hasValidEdge(nodes, edges, uuid.id, agent.id, 'out', 'context') &&
    hasValidEdge(nodes, edges, agent.id, output.id, 'out', 'in')
  )
}

export function captureAgentRan(snapshot: TutorialSnapshot): boolean {
  return snapshot.runAttempted
}

export function captureDeskCompleted(snapshot: TutorialSnapshot): boolean {
  const output = snapshot.nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'text-output'
  )
  if (!output) return false
  return ((output.data as ToolNodeData).outputLog?.length ?? 0) > 0
}

export function hasParallelContextPath(nodes: Node[], edges: Edge[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  const datetime = nodes.find(
    (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'datetime'
  )
  const agent = nodes.find((n) => n.type === 'agent')
  if (!chat || !datetime || !agent) return false

  return (
    hasValidEdge(nodes, edges, chat.id, agent.id, 'message', 'context') &&
    hasValidEdge(nodes, edges, datetime.id, agent.id, 'out', 'context')
  )
}

export function parallelQuestionDropped(nodes: Node[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  if (!chat) return false
  const input = ((chat.data as ChatNodeData).inputValue ?? '').trim().toLowerCase()
  return /what day|today|date/.test(input)
}

export function chatTextEvidenceDropped(nodes: Node[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  if (!chat) return false
  return Boolean(((chat.data as ChatNodeData).inputValue ?? '').trim())
}

export function agentRoleBriefed(nodes: Node[]): boolean {
  const agents = nodes.filter((n) => n.type === 'agent')
  return agents.some((n) => {
    const role = (n.data as AgentNodeData).role?.trim() ?? ''
    if (!role) return false
    if (/critic/i.test(role)) return true
    return role !== DEFAULT_AGENT_ROLE
  })
}

export function workflowNamed(snapshot: TutorialSnapshot): boolean {
  return snapshot.workflowName.trim() !== DEFAULT_WORKFLOW_NAME
}

export function chatEvidenceDropped(nodes: Node[]): boolean {
  const chat = nodes.find((n) => n.type === 'chat')
  if (!chat) return false
  const input = ((chat.data as ChatNodeData).inputValue ?? '').trim().toLowerCase()
  if (!input) return false
  return /wiki|\.org|\.com|http/.test(input)
}

export function portBlockingLessonSeen(snapshot: TutorialSnapshot): boolean {
  return snapshot.connectionRejectionCount > 0
}

const WORKFLOW_ERROR_MARKER = '⚠ Some workflow steps failed'

export function isSuccessfulAssistantReply(content: string, messageId?: string): boolean {
  if (messageId?.endsWith('-err')) return false
  const trimmed = content.trim()
  if (!trimmed) return false
  if (trimmed.includes(WORKFLOW_ERROR_MARKER)) return false
  if (/^(workflow failed|no free brain|could not fetch)/i.test(trimmed)) return false
  return true
}

export function investigationLaunched(snapshot: TutorialSnapshot): boolean {
  if (!snapshot.runFinished) return false
  const chat = snapshot.nodes.find((n) => n.type === 'chat')
  if (!chat) return false
  const messages = (chat.data as ChatNodeData).messages ?? []
  const assistant = [...messages].reverse().find((m) => m.role === 'assistant')
  if (!assistant) return false
  return isSuccessfulAssistantReply(assistant.content, assistant.id)
}

export function voiceRunCompleted(snapshot: TutorialSnapshot): boolean {
  if (!snapshot.runFinished) return false
  if (investigationLaunched(snapshot)) return true
  const agent = snapshot.nodes.find((n) => n.type === 'agent')
  if (!agent) return false
  const lastOutput = (agent.data as AgentNodeData).lastOutput?.trim() ?? ''
  return lastOutput.length > 0
}

export function getStepValidator(
  stepId: string
): ((snapshot: TutorialSnapshot) => boolean) | null {
  switch (stepId) {
    case 'drag-chat':
      return (s) => hasNodeType(s.nodes, 'chat')
    case 'drag-scraper':
      return (s) => hasNodeType(s.nodes, 'tool', 'web-scraper')
    case 'drag-agent':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'wire-nodes':
      return (s) => hasSnackInvestigatorPath(s.nodes, s.edges)
    case 'brief-agent':
      return (s) => agentRoleBriefed(s.nodes)
    case 'name-quest':
      return (s) => workflowNamed(s)
    case 'drop-evidence':
      return (s) => chatEvidenceDropped(s.nodes)
    case 'launch':
      return (s) => investigationLaunched(s)
    case 'pipeline-drag-chat':
      return (s) => hasNodeType(s.nodes, 'chat')
    case 'pipeline-drag-json':
      return (s) => hasNodeType(s.nodes, 'tool', 'json-tool')
    case 'pipeline-drag-script':
      return (s) => hasNodeType(s.nodes, 'tool', 'custom-script')
    case 'pipeline-drag-agent':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'pipeline-ports-lesson':
      return (s) =>
        portBlockingLessonSeen(s) || hasDataPipelinePath(s.nodes, s.edges)
    case 'pipeline-wire':
      return (s) => hasDataPipelinePath(s.nodes, s.edges)
    case 'pipeline-script':
      return (s) => customScriptConfigured(s.nodes)
    case 'pipeline-drop-json':
      return (s) => chatJsonEvidenceDropped(s.nodes)
    case 'pipeline-launch':
      return (s) => investigationLaunched(s)
    case 'encoding-drag-chat':
      return (s) => hasNodeType(s.nodes, 'chat')
    case 'encoding-drag-encode':
      return (s) => hasNodeType(s.nodes, 'tool', 'base64-encode')
    case 'encoding-drag-decode':
      return (s) => hasNodeType(s.nodes, 'tool', 'base64-decode')
    case 'encoding-drag-agent':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'encoding-wire':
      return (s) => hasEncodingChainPath(s.nodes, s.edges)
    case 'encoding-drop-text':
      return (s) => chatTextEvidenceDropped(s.nodes)
    case 'encoding-launch':
      return (s) => investigationLaunched(s)
    case 'parallel-drag-chat':
      return (s) => hasNodeType(s.nodes, 'chat')
    case 'parallel-drag-datetime':
      return (s) => hasNodeType(s.nodes, 'tool', 'datetime')
    case 'parallel-drag-agent':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'parallel-wire':
      return (s) => hasParallelContextPath(s.nodes, s.edges)
    case 'parallel-drop-question':
      return (s) => parallelQuestionDropped(s.nodes)
    case 'parallel-launch':
      return (s) => investigationLaunched(s)
    case 'writers-drag-chat':
      return (s) => hasNodeType(s.nodes, 'chat')
    case 'writers-drag-writer':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'writers-drag-editor':
      return (s) => hasTwoAgents(s.nodes)
    case 'writers-wire':
      return (s) => hasWritersRoomPath(s.nodes, s.edges)
    case 'writers-roles':
      return (s) => twoAgentsRoleBriefed(s.nodes)
    case 'writers-drop-prompt':
      return (s) => writersPromptDropped(s.nodes)
    case 'writers-launch':
      return (s) => investigationLaunched(s)
    case 'url-drag-chat':
      return (s) => hasNodeType(s.nodes, 'chat')
    case 'url-drag-parse':
      return (s) => hasNodeType(s.nodes, 'tool', 'parse-url')
    case 'url-drag-agent':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'url-wire':
      return (s) => hasUrlDetectivePath(s.nodes, s.edges)
    case 'url-drop-url':
      return (s) => urlEvidenceDropped(s.nodes)
    case 'url-launch':
      return (s) => investigationLaunched(s)
    case 'voice-drag-chat':
      return (s) => hasNodeType(s.nodes, 'chat')
    case 'voice-drag-agent':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'voice-drag-speech':
      return (s) => hasNodeType(s.nodes, 'tool', 'speech')
    case 'voice-wire':
      return (s) => hasVoiceBoothPath(s.nodes, s.edges)
    case 'voice-configure':
      return (s) => speechConfigured(s.nodes)
    case 'voice-drop-prompt':
      return (s) => chatTextEvidenceDropped(s.nodes)
    case 'voice-launch':
      return (s) => voiceRunCompleted(s)
    case 'capture-drag-datetime':
      return (s) => hasNodeType(s.nodes, 'tool', 'datetime')
    case 'capture-drag-uuid':
      return (s) => hasNodeType(s.nodes, 'tool', 'uuid-v4')
    case 'capture-drag-agent':
      return (s) => hasNodeType(s.nodes, 'agent')
    case 'capture-drag-output':
      return (s) => hasNodeType(s.nodes, 'tool', 'text-output')
    case 'capture-wire':
      return (s) => hasCaptureDeskPath(s.nodes, s.edges)
    case 'capture-brief-agent':
      return (s) => agentRoleBriefed(s.nodes)
    case 'capture-run-agent':
      return (s) => captureAgentRan(s)
    case 'capture-run-capture':
      return (s) => captureDeskCompleted(s)
    default:
      return null
  }
}

export function isStepComplete(stepId: string, snapshot: TutorialSnapshot): boolean {
  const validator = getStepValidator(stepId)
  if (!validator) return false
  return validator(snapshot)
}
