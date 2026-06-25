import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildExampleWorkflow,
  EXAMPLE_WORKFLOWS,
  listExampleWorkflows,
  sortExampleWorkflows,
  loadExampleWorkflow,
} from '../../src/lib/exampleWorkflows'
import { resolveExecutionScope } from '../../src/orchestrator/executionScope'
import { useWorkflowStore } from '../../src/stores/workflowStore'
import type { ChatNodeData, ToolNodeData } from '../../src/types'
import {
  WORKFLOW_LAYOUT_PADDING_X,
  areWorkflowNodePositionsSeparated,
} from '../../src/lib/workflowLayout'
import { EXAMPLE_TRY_PROMPT_HINT_KEY } from '../../src/lib/appStorage'

describe('exampleWorkflows', () => {
  beforeEach(() => {
    sessionStorage.removeItem(EXAMPLE_TRY_PROMPT_HINT_KEY)
  })

  it('lists twenty-two example workflows', () => {
    expect(EXAMPLE_WORKFLOWS).toHaveLength(22)
  })

  it('puts featured examples first in the menu list', () => {
    const listed = listExampleWorkflows()
    expect(listed[0]?.id).toBe('quick-start')
    expect(listed[0]?.featured).toBe(true)
  })

  it('sorts featured examples ahead when registry order is reversed', () => {
    const sorted = sortExampleWorkflows([...EXAMPLE_WORKFLOWS].reverse())
    expect(sorted[0]?.id).toBe('quick-start')
  })

  it.each(EXAMPLE_WORKFLOWS.map((e) => e.id))('builds %s with nodes and edges', (id) => {
    const { nodes, edges, name } = buildExampleWorkflow(id)
    expect(nodes.length).toBeGreaterThan(1)
    expect(edges.length).toBeGreaterThan(0)
    expect(name).toMatch(/^Example —/)
  })

  it.each(EXAMPLE_WORKFLOWS.map((e) => e.id))('lays out %s without overlapping positions', (id) => {
    const { nodes } = buildExampleWorkflow(id)
    const positions = nodes.map((node) => node.position)

    expect(areWorkflowNodePositionsSeparated(positions)).toBe(true)
    expect(positions.some((position) => position.x >= WORKFLOW_LAYOUT_PADDING_X)).toBe(true)
  })

  it('quick-start wires chat to agent and pre-fills try prompt', () => {
    const { nodes, edges } = buildExampleWorkflow('quick-start')
    const chat = nodes.find((n) => n.type === 'chat')
    const agent = nodes.find((n) => n.type === 'agent')
    expect(chat).toBeDefined()
    expect(agent).toBeDefined()
    expect(edges.some((e) => e.source === chat?.id && e.target === agent?.id)).toBe(true)
    expect((chat?.data as ChatNodeData).inputValue).toContain('help me build')
  })

  it('snack-verdict wires chat and scraper in parallel to agent', () => {
    const { nodes, edges } = buildExampleWorkflow('snack-verdict')
    const chat = nodes.find((n) => n.type === 'chat')
    const scraper = nodes.find((n) => (n.data as ToolNodeData).toolType === 'web-scraper')
    const agent = nodes.find((n) => n.type === 'agent')
    expect(chat).toBeDefined()
    expect(scraper).toBeDefined()
    expect(agent).toBeDefined()
    expect(edges.some((e) => e.source === chat?.id && e.target === agent?.id)).toBe(true)
    expect(edges.some((e) => e.source === scraper?.id && e.target === agent?.id)).toBe(true)
    expect(edges.some((e) => e.source === chat?.id && e.target === scraper?.id)).toBe(false)
  })

  it('writer-editor chains two agents', () => {
    const { nodes, edges } = buildExampleWorkflow('writer-editor')
    const agents = nodes.filter((n) => n.type === 'agent')
    expect(agents).toHaveLength(2)
    expect(edges.some((e) => e.source === agents[0]?.id && e.target === agents[1]?.id)).toBe(true)
  })

  it('script-pipeline includes custom script between json and agent', () => {
    const { nodes, edges } = buildExampleWorkflow('script-pipeline')
    const json = nodes.find((n) => (n.data as ToolNodeData).toolType === 'json-tool')
    const script = nodes.find((n) => (n.data as ToolNodeData).toolType === 'custom-script')
    const agent = nodes.find((n) => n.type === 'agent')
    expect(json).toBeDefined()
    expect(script).toBeDefined()
    expect((script?.data as ToolNodeData).config?.script).toContain('jsonParse')
    expect(edges.some((e) => e.source === json?.id && e.target === script?.id)).toBe(true)
    expect(edges.some((e) => e.source === script?.id && e.target === agent?.id)).toBe(true)
  })

  it('json-glow-up pretty-prints json before the agent', () => {
    const { nodes, edges } = buildExampleWorkflow('json-glow-up')
    const json = nodes.find((n) => (n.data as ToolNodeData).toolType === 'json-tool')
    const agent = nodes.find((n) => n.type === 'agent')
    expect(json).toBeDefined()
    expect((json?.data as ToolNodeData).config?.mode).toBe('pretty')
    expect(edges.some((e) => e.source === json?.id && e.target === agent?.id)).toBe(true)
  })

  it('meme-math includes calculator in the chain', () => {
    const { nodes } = buildExampleWorkflow('meme-math')
    expect(nodes.some((n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'calculator')).toBe(
      true
    )
  })

  it('encode-boomerang chains base64 tools', () => {
    const { nodes, edges } = buildExampleWorkflow('encode-boomerang')
    const encode = nodes.find((n) => (n.data as ToolNodeData).toolType === 'base64-encode')
    const decode = nodes.find((n) => (n.data as ToolNodeData).toolType === 'base64-decode')
    expect(encode).toBeDefined()
    expect(decode).toBeDefined()
    expect(edges.some((e) => e.source === encode?.id && e.target === decode?.id)).toBe(true)
  })

  it('context-briefing wires chat, datetime, and uuid to agent context', () => {
    const { nodes, edges } = buildExampleWorkflow('context-briefing')
    const agent = nodes.find((n) => n.type === 'agent')
    const contextEdges = edges.filter((e) => e.target === agent?.id)
    expect(contextEdges.length).toBeGreaterThanOrEqual(3)
  })

  it('tool-only has no chat node', () => {
    const { nodes } = buildExampleWorkflow('tool-only')
    expect(nodes.some((n) => n.type === 'chat')).toBe(false)
    expect(nodes.some((n) => n.type === 'agent')).toBe(true)
  })

  it('capture-only has text-output sink without chat or agent', () => {
    const { nodes } = buildExampleWorkflow('capture-only')
    expect(nodes.some((n) => n.type === 'chat')).toBe(false)
    expect(nodes.some((n) => n.type === 'agent')).toBe(false)
    expect(
      nodes.some((n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'text-output')
    ).toBe(true)
  })

  it('id-factory captures agent output', () => {
    const { nodes, edges } = buildExampleWorkflow('id-factory')
    const agent = nodes.find((n) => n.type === 'agent')
    const output = nodes.find((n) => (n.data as ToolNodeData).toolType === 'text-output')
    expect(agent).toBeDefined()
    expect(output).toBeDefined()
    expect(edges.some((e) => e.source === agent?.id && e.target === output?.id)).toBe(true)
  })

  it('scraper-cleanup includes Speech in agent trigger scope', () => {
    const { nodes, edges } = buildExampleWorkflow('scraper-cleanup')
    const agent = nodes.find((n) => n.type === 'agent')
    const speech = nodes.find(
      (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'speech'
    )
    expect(agent).toBeDefined()
    expect(speech).toBeDefined()
    const scope = resolveExecutionScope({ kind: 'agent', nodeId: agent!.id }, nodes, edges)
    expect(scope.has(speech!.id)).toBe(true)
  })

  it('power examples include cloud tools', () => {
    const vision = buildExampleWorkflow('describe-image')
    expect(
      vision.nodes.some((n) => (n.data as ToolNodeData).toolType === 'gemini-vision')
    ).toBe(true)
    const transcribe = buildExampleWorkflow('transcribe-me')
    expect(
      transcribe.nodes.some((n) => (n.data as ToolNodeData).toolType === 'groq-transcribe')
    ).toBe(true)
  })

  it('loadExampleWorkflow updates workflow store', () => {
    useWorkflowStore.getState().setNodes([])
    useWorkflowStore.setState({ workflowId: 42 })
    loadExampleWorkflow('quick-start')
    const state = useWorkflowStore.getState()
    expect(state.workflowName).toContain('Hello, Agent')
    expect(state.nodes.length).toBeGreaterThan(1)
    expect(state.workflowId).toBeNull()
    expect(state.isDirty).toBe(true)
  })
})
