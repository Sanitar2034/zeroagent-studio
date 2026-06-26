import type { Edge, Node } from '@xyflow/react'
import type { ToolNodeData } from '../../../types'
import { createAgentNode, createChatNode, createToolNode } from '../../../components/canvas/nodeFactory'
import { createWorkflowEdgeWithHandles } from '../../workflowEdges'
import { PLACEHOLDER_POSITION } from '../helpers'

export function buildScraperCleanupWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const scraper = createToolNode(PLACEHOLDER_POSITION, 'web-scraper')
  scraper.data = {
    label: 'Web Scraper',
    toolType: 'web-scraper',
    config: { url: 'https://en.wikipedia.org/wiki/Photosynthesis' },
    autoRun: true,
  } as ToolNodeData
  const html = createToolNode(PLACEHOLDER_POSITION, 'html-to-text')
  html.data = { label: 'HTML To Text', toolType: 'html-to-text' } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Summary Agent',
    role: 'Narrator',
    systemPrompt: 'Summarize the cleaned page text in 2–3 sentences, plain language.',
  }
  const speech = createToolNode(PLACEHOLDER_POSITION, 'speech')
  speech.data = {
    label: 'Speech',
    toolType: 'speech',
    config: { mode: 'tts', language: 'en-US' },
  } as ToolNodeData

  const edges = [
    createWorkflowEdgeWithHandles(scraper, html, 'out', 'in', 'e-scrape-html'),
    createWorkflowEdgeWithHandles(html, agent, 'out', 'context', 'e-html-agent'),
    createWorkflowEdgeWithHandles(agent, speech, 'out', 'in', 'e-agent-speech'),
  ]
  return { nodes: [scraper, html, agent, speech], edges, name: 'Example — Wiki to podcast' }
}

export function buildVoiceReplyWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Voice Buddy',
    role: 'Guide',
    systemPrompt: 'Answer in two short sentences suitable for text-to-speech.',
  }
  const speech = createToolNode(PLACEHOLDER_POSITION, 'speech')
  speech.data = {
    label: 'Speech',
    toolType: 'speech',
    config: { mode: 'tts', language: 'en-US' },
  } as ToolNodeData

  const edges = [
    createWorkflowEdgeWithHandles(chat, agent, 'message', 'context', 'e-chat-agent'),
    createWorkflowEdgeWithHandles(agent, speech, 'out', 'in', 'e-agent-speech'),
  ]
  return { nodes: [chat, agent, speech], edges, name: 'Example — Voice reply' }
}
