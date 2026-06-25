import type { Node, Edge } from '@xyflow/react'
import type { AgentNodeData, ToolNodeData, ChatNodeData } from '../../src/types'

export function makeNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
  position = { x: 0, y: 0 }
): Node {
  return { id, type, position, data }
}

export function makeAgent(
  id: string,
  overrides: Partial<AgentNodeData> = {}
): Node {
  return makeNode(id, 'agent', {
    label: 'Agent',
    role: 'Assistant',
    systemPrompt: 'Be helpful',
    brain: 'transformers',
    model: 'Xenova/distilgpt2',
    ...overrides,
  })
}

export function makeChat(id: string, messages: ChatNodeData['messages'] = []): Node {
  return makeNode(id, 'chat', { label: 'Chat', messages, inputValue: '' })
}

export function makeTool(
  id: string,
  toolType: ToolNodeData['toolType'],
  config?: Record<string, string>
): Node {
  return makeNode(id, 'tool', { label: 'Tool', toolType, config })
}

export function edge(id: string, source: string, target: string): Edge {
  return { id, source, target }
}

export function edgeWithHandles(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string
): Edge {
  return { id, source, target, sourceHandle, targetHandle }
}

/** Real-life: student research pipeline */
export function buildStudentResearchWorkflow() {
  const chat = makeChat('chat-1')
  const researcher = makeAgent('agent-research', {
    label: 'Researcher',
    role: 'Researcher',
    brain: 'openrouter',
    systemPrompt: 'Extract key facts',
  })
  const scraper = makeTool('tool-scrape', 'web-scraper', { url: 'example.com' })
  const summarizer = makeAgent('agent-sum', {
    label: 'Summarizer',
    role: 'Summarizer',
    brain: 'transformers',
  })
  const nodes = [chat, researcher, scraper, summarizer]
  const edges = [
    edge('e1', 'chat-1', 'agent-research'),
    edge('e2', 'agent-research', 'tool-scrape'),
    edge('e3', 'tool-scrape', 'agent-sum'),
  ]
  return { nodes, edges }
}

/** Real-life: cyclic peer-review workflow (invalid) */
export function buildCyclicPeerReviewWorkflow() {
  const a = makeAgent('a1', { label: 'Reviewer A' })
  const b = makeAgent('a2', { label: 'Reviewer B' })
  const nodes = [makeChat('c'), a, b]
  const edges = [
    edge('e1', 'c', 'a1'),
    edge('e2', 'a1', 'a2'),
    edge('e3', 'a2', 'a1'),
  ]
  return { nodes, edges }
}

/** Diamond: one chat fans out to two agents, merges into one */
export function buildDiamondWorkflow() {
  const chat = makeChat('chat')
  const left = makeAgent('left', { label: 'Analyst' })
  const right = makeAgent('right', { label: 'Critic' })
  const merge = makeAgent('merge', { label: 'Synthesizer' })
  const nodes = [chat, left, right, merge]
  const edges = [
    edge('e1', 'chat', 'left'),
    edge('e2', 'chat', 'right'),
    edge('e3', 'left', 'merge'),
    edge('e4', 'right', 'merge'),
  ]
  return { nodes, edges }
}
