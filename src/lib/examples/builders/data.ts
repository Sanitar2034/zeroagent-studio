import type { Edge, Node } from '@xyflow/react'
import type { ToolNodeData } from '../../../types'
import { createAgentNode, createChatNode, createToolNode } from '../../../components/canvas/nodeFactory'
import { createWorkflowEdgeWithHandles } from '../../workflowEdges'
import { PLACEHOLDER_POSITION } from '../helpers'

const DIFF_REFERENCE_TEXT = 'The quick brown fox leaps over the sleepy dog.'

export function buildEncodeBoomerangWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const encode = createToolNode(PLACEHOLDER_POSITION, 'base64-encode')
  encode.data = { label: 'Base64 Encode', toolType: 'base64-encode' } as ToolNodeData
  const decode = createToolNode(PLACEHOLDER_POSITION, 'base64-decode')
  decode.data = { label: 'Base64 Decode', toolType: 'base64-decode' } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Decode Detective',
    role: 'Encoder',
    systemPrompt:
      'Confirm the user text survived a Base64 round-trip. Mention encode → decode briefly, then answer their question.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, encode, 'message', 'in', 'e-chat-encode'),
    createWorkflowEdgeWithHandles(encode, decode, 'out', 'in', 'e-encode-decode'),
    createWorkflowEdgeWithHandles(decode, agent, 'out', 'context', 'e-decode-agent'),
  ]
  return { nodes: [chat, encode, decode, agent], edges, name: 'Example — Encode boomerang' }
}

export function buildJwtInspectorWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const jwt = createToolNode(PLACEHOLDER_POSITION, 'jwt-decode')
  jwt.data = { label: 'JWT Decode', toolType: 'jwt-decode' } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Token Analyst',
    role: 'Security guide',
    systemPrompt:
      'Explain the decoded JWT payload in plain language. Mention this example does not verify signatures.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, jwt, 'message', 'in', 'e-chat-jwt'),
    createWorkflowEdgeWithHandles(jwt, agent, 'out', 'context', 'e-jwt-agent'),
  ]
  return { nodes: [chat, jwt, agent], edges, name: 'Example — JWT inspector' }
}

export function buildRegexHunterWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const regex = createToolNode(PLACEHOLDER_POSITION, 'regex-extract-emails')
  regex.data = { label: 'Regex Emails', toolType: 'regex-extract-emails' } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Pattern Scout',
    role: 'Analyst',
    systemPrompt:
      'Report emails found by the regex tool. Mention any URLs in the user text even if regex only extracted emails.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, regex, 'message', 'in', 'e-chat-regex'),
    createWorkflowEdgeWithHandles(regex, agent, 'out', 'context', 'e-regex-agent'),
  ]
  return { nodes: [chat, regex, agent], edges, name: 'Example — Regex hunter' }
}

export function buildDiffDetectiveWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const similarity = createToolNode(PLACEHOLDER_POSITION, 'similarity-ratio')
  similarity.data = {
    label: 'Similarity',
    toolType: 'similarity-ratio',
    config: { other: DIFF_REFERENCE_TEXT },
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Diff Detective',
    role: 'Editor',
    systemPrompt: `Compare the user text to the reference: "${DIFF_REFERENCE_TEXT}". Explain the similarity score and key wording differences.`,
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, similarity, 'message', 'in', 'e-chat-sim'),
    createWorkflowEdgeWithHandles(similarity, agent, 'out', 'context', 'e-sim-agent'),
  ]
  return { nodes: [chat, similarity, agent], edges, name: 'Example — Diff detective' }
}

export function buildIdFactoryWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const datetime = createToolNode(PLACEHOLDER_POSITION, 'datetime')
  datetime.data = {
    label: 'Date & Time',
    toolType: 'datetime',
    config: { mode: 'format-now' },
    autoRun: true,
  } as ToolNodeData
  const uuid = createToolNode(PLACEHOLDER_POSITION, 'uuid-v4')
  uuid.data = {
    label: 'UUID v4',
    toolType: 'uuid-v4',
    autoRun: true,
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'ID Clerk',
    role: 'Registrar',
    systemPrompt:
      'Format timestamp and UUID as a single support-ticket log line the user can paste into a ticket system.',
  }
  const output = createToolNode(PLACEHOLDER_POSITION, 'text-output')
  output.data = {
    label: 'Text Output',
    toolType: 'text-output',
    outputLog: [],
  } as ToolNodeData

  const edges = [
    createWorkflowEdgeWithHandles(datetime, agent, 'out', 'context', 'e-dt-agent'),
    createWorkflowEdgeWithHandles(uuid, agent, 'out', 'context', 'e-uuid-agent'),
    createWorkflowEdgeWithHandles(agent, output, 'out', 'in', 'e-agent-output'),
  ]
  return { nodes: [datetime, uuid, agent, output], edges, name: 'Example — ID factory' }
}
