import type { Edge, Node } from '@xyflow/react'
import type { ToolNodeData } from '../../../types'
import { createAgentNode, createChatNode, createToolNode } from '../../../components/canvas/nodeFactory'
import { createWorkflowEdgeWithHandles } from '../../workflowEdges'
import { PLACEHOLDER_POSITION } from '../helpers'

export function buildResearchStackWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const scraper = createToolNode(PLACEHOLDER_POSITION, 'web-scraper')
  scraper.data = {
    label: 'Web Scraper',
    toolType: 'web-scraper',
    config: { url: 'https://en.wikipedia.org/wiki/Pizza' },
    autoRun: true,
  } as ToolNodeData
  const datetime = createToolNode(PLACEHOLDER_POSITION, 'datetime')
  datetime.data = {
    label: 'Date & Time',
    toolType: 'datetime',
    config: { mode: 'format-now' },
    autoRun: true,
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Research Agent',
    role: 'Researcher',
    systemPrompt:
      'Combine the user question, scraped page, and current timestamp into a concise research summary.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, agent, 'message', 'context', 'e-chat-agent'),
    createWorkflowEdgeWithHandles(scraper, agent, 'out', 'context', 'e-scrape-agent'),
    createWorkflowEdgeWithHandles(datetime, agent, 'out', 'context', 'e-dt-agent'),
  ]
  return { nodes: [chat, scraper, datetime, agent], edges, name: 'Example — Research party' }
}

export function buildHackerHeadlinesWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const fetchJson = createToolNode(PLACEHOLDER_POSITION, 'fetch-json')
  fetchJson.data = {
    label: 'Fetch JSON',
    toolType: 'fetch-json',
    config: { url: 'https://jsonplaceholder.typicode.com/posts?_limit=3' },
    autoRun: true,
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Headline Editor',
    role: 'News desk',
    systemPrompt:
      'Summarize the fetched JSON posts as three punchy headline-style bullets. No chat block — run from Agent or capture.',
  }
  const output = createToolNode(PLACEHOLDER_POSITION, 'text-output')
  output.data = {
    label: 'Text Output',
    toolType: 'text-output',
    outputLog: [],
  } as ToolNodeData

  const edges = [
    createWorkflowEdgeWithHandles(fetchJson, agent, 'out', 'context', 'e-fetch-agent'),
    createWorkflowEdgeWithHandles(agent, output, 'out', 'in', 'e-agent-output'),
  ]
  return { nodes: [fetchJson, agent, output], edges, name: 'Example — Hacker headlines' }
}

export function buildReadmeReaderWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const fileReader = createToolNode(PLACEHOLDER_POSITION, 'file-reader')
  fileReader.data = { label: 'File Reader', toolType: 'file-reader' } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Notes Summarizer',
    role: 'Editor',
    systemPrompt:
      'Summarize the file contents in 3 bullets. Tell the user to pick a .txt or .md file in the File Reader inspector, then Run workflow.',
  }
  const output = createToolNode(PLACEHOLDER_POSITION, 'text-output')
  output.data = {
    label: 'Text Output',
    toolType: 'text-output',
    outputLog: [],
  } as ToolNodeData

  const edges = [
    createWorkflowEdgeWithHandles(fileReader, agent, 'out', 'context', 'e-file-agent'),
    createWorkflowEdgeWithHandles(agent, output, 'out', 'in', 'e-agent-output'),
  ]
  return { nodes: [fileReader, agent, output], edges, name: 'Example — Read my notes' }
}

export function buildCaptureOnlyWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const scraper = createToolNode(PLACEHOLDER_POSITION, 'web-scraper')
  scraper.data = {
    label: 'Web Scraper',
    toolType: 'web-scraper',
    config: { url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
    autoRun: true,
  } as ToolNodeData
  const html = createToolNode(PLACEHOLDER_POSITION, 'html-to-text')
  html.data = { label: 'HTML To Text', toolType: 'html-to-text' } as ToolNodeData
  const output = createToolNode(PLACEHOLDER_POSITION, 'text-output')
  output.data = {
    label: 'Text Output',
    toolType: 'text-output',
    outputLog: [],
  } as ToolNodeData

  const edges = [
    createWorkflowEdgeWithHandles(scraper, html, 'out', 'in', 'e-scrape-html'),
    createWorkflowEdgeWithHandles(html, output, 'out', 'in', 'e-html-output'),
  ]
  return { nodes: [scraper, html, output], edges, name: 'Example — Silent scraper' }
}
