import type { Edge, Node } from '@xyflow/react'
import type { ToolNodeData } from '../../../types'
import { createAgentNode, createChatNode, createToolNode } from '../../../components/canvas/nodeFactory'
import { createWorkflowEdgeWithHandles } from '../../workflowEdges'
import { PLACEHOLDER_POSITION } from '../helpers'

export function buildQuickStartWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Hello Agent',
    role: 'Helper',
    systemPrompt: 'You are a helpful assistant. Answer clearly and briefly.',
  }

  const edges = [createWorkflowEdgeWithHandles(chat, agent, 'message', 'context', 'e-quick-agent')]
  return { nodes: [chat, agent], edges, name: 'Example — Hello, Agent' }
}

export function buildSnackVerdictWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const scraper = createToolNode(PLACEHOLDER_POSITION, 'web-scraper')
  scraper.data = {
    label: 'Web Scraper',
    toolType: 'web-scraper',
    config: { url: 'https://en.wikipedia.org/wiki/Pizza' },
    autoRun: true,
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Snack Critic',
    role: 'Food reviewer',
    systemPrompt:
      'You are a witty snack critic. Use the scraped page as evidence. Give a clear verdict in 3 short bullets.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, agent, 'message', 'context', 'e-chat-agent'),
    createWorkflowEdgeWithHandles(scraper, agent, 'out', 'context', 'e-scrape-agent'),
  ]
  return { nodes: [chat, scraper, agent], edges, name: 'Example — Snack verdict' }
}

export function buildWriterEditorWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const writer = createAgentNode(PLACEHOLDER_POSITION)
  writer.data = {
    ...writer.data,
    label: 'Writer',
    role: 'Copywriter',
    systemPrompt: 'Write a concise first draft based on the user request. Two sentences max.',
  }
  const editor = createAgentNode(PLACEHOLDER_POSITION)
  editor.data = {
    ...editor.data,
    label: 'Editor',
    role: 'Editor',
    systemPrompt:
      'Polish the writer draft from context. Keep the same meaning but make it sharper and more memorable.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, writer, 'message', 'context', 'e-chat-writer'),
    createWorkflowEdgeWithHandles(writer, editor, 'out', 'context', 'e-writer-editor'),
  ]
  return { nodes: [chat, writer, editor], edges, name: 'Example — Writer & editor' }
}

export function buildExplainMyUrlWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const parseUrl = createToolNode(PLACEHOLDER_POSITION, 'parse-url')
  parseUrl.data = { label: 'Parse URL', toolType: 'parse-url' } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Link Explainer',
    role: 'Guide',
    systemPrompt:
      'Explain the parsed URL JSON in plain language: host, path, and query parameters. Keep it friendly and short.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, parseUrl, 'message', 'in', 'e-chat-parse'),
    createWorkflowEdgeWithHandles(parseUrl, agent, 'out', 'context', 'e-parse-agent'),
  ]
  return { nodes: [chat, parseUrl, agent], edges, name: 'Example — Explain my link' }
}

export function buildMemeMathWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const calculator = createToolNode(PLACEHOLDER_POSITION, 'calculator')
  calculator.data = { label: 'Calculator', toolType: 'calculator' } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Math Hotline',
    role: 'Tutor',
    systemPrompt:
      'You are a witty math tutor. Use the calculator result in your answer. Keep it short and fun.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, calculator, 'message', 'in', 'e-chat-calc'),
    createWorkflowEdgeWithHandles(calculator, agent, 'out', 'context', 'e-calc-agent'),
  ]
  return { nodes: [chat, calculator, agent], edges, name: 'Example — Math hotline' }
}
