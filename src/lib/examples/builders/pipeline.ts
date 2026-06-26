import type { Edge, Node } from '@xyflow/react'
import type { ToolNodeData } from '../../../types'
import { createAgentNode, createChatNode, createToolNode } from '../../../components/canvas/nodeFactory'
import { createWorkflowEdgeWithHandles } from '../../workflowEdges'
import { PLACEHOLDER_POSITION } from '../helpers'

const SCRIPT_UPPERCASE_ITEMS = `const data = helpers.jsonParse(input)
return data.items.map((item) => String(item).toUpperCase()).join(', ')`

export function buildScriptPipelineWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const json = createToolNode(PLACEHOLDER_POSITION, 'json-tool')
  json.data = {
    label: 'JSON Tool',
    toolType: 'json-tool',
    config: { mode: 'pretty' },
  } as ToolNodeData
  const script = createToolNode(PLACEHOLDER_POSITION, 'custom-script')
  script.data = {
    label: 'Custom Script',
    toolType: 'custom-script',
    config: { script: SCRIPT_UPPERCASE_ITEMS },
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Pipeline Explainer',
    role: 'Engineer',
    systemPrompt:
      'Explain what the Custom Script did to the JSON and show the transformed result. Keep it under 4 sentences.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, json, 'message', 'in', 'e-chat-json'),
    createWorkflowEdgeWithHandles(json, script, 'out', 'in', 'e-json-script'),
    createWorkflowEdgeWithHandles(script, agent, 'out', 'context', 'e-script-agent'),
  ]
  return { nodes: [chat, json, script, agent], edges, name: 'Example — Script laboratory' }
}

export function buildJsonGlowUpWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const json = createToolNode(PLACEHOLDER_POSITION, 'json-tool')
  json.data = {
    label: 'JSON Tool',
    toolType: 'json-tool',
    config: { mode: 'pretty' },
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'JSON Stylist',
    role: 'Analyst',
    systemPrompt:
      'Summarize the pretty-printed JSON in plain language. If the user pasted invalid JSON, say so kindly.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, json, 'message', 'in', 'e-chat-json'),
    createWorkflowEdgeWithHandles(json, agent, 'out', 'context', 'e-json-agent'),
  ]
  return { nodes: [chat, json, agent], edges, name: 'Example — JSON glow-up' }
}

export function buildContextBriefingWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
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
    label: 'Briefing Officer',
    role: 'Coordinator',
    systemPrompt:
      'Use every context block: user message, current timestamp, and generated UUID. Produce a one-line status update.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, agent, 'message', 'context', 'e-chat-agent'),
    createWorkflowEdgeWithHandles(datetime, agent, 'out', 'context', 'e-dt-agent'),
    createWorkflowEdgeWithHandles(uuid, agent, 'out', 'context', 'e-uuid-agent'),
  ]
  return { nodes: [chat, datetime, uuid, agent], edges, name: 'Example — Context briefing' }
}

export function buildToolOnlyWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const datetime = createToolNode(PLACEHOLDER_POSITION, 'datetime')
  datetime.data = {
    label: 'Date & Time',
    toolType: 'datetime',
    config: { mode: 'format-now' },
    autoRun: true,
  } as ToolNodeData
  const clipboard = createToolNode(PLACEHOLDER_POSITION, 'clipboard')
  clipboard.data = {
    label: 'Clipboard',
    toolType: 'clipboard',
    config: { mode: 'read' },
    autoRun: true,
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Standalone Agent',
    role: 'Reporter',
    systemPrompt:
      'Summarize clipboard text with a timestamp header. No Chat — run from the Agent inspector Run button.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(datetime, agent, 'out', 'context', 'e-dt-agent'),
    createWorkflowEdgeWithHandles(clipboard, agent, 'out', 'context', 'e-clip-agent'),
  ]
  return { nodes: [datetime, clipboard, agent], edges, name: 'Example — No chat needed' }
}
