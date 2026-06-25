import { describe, it, expect } from 'vitest'
import { collectContextBlocks, formatAgentPrompt } from '../../src/lib/agentContext'
import { makeChat, makeAgent, makeTool, edgeWithHandles } from '../helpers/graphBuilders'
import type { ExecutionContext } from '../../src/types'

describe('agentContext', () => {
  const ctx: ExecutionContext = {
    variables: {
      c: { message: { type: 'text', value: 'What day is it?' } },
    },
    toolResults: {
      dt: { out: { type: 'text', value: 'Jun 22, 2026' } },
    },
    legacyVariables: {},
  }

  it('collectContextBlocks prepends user message on chat trigger', () => {
    const chat = makeChat('c')
    const dt = makeTool('dt', 'datetime')
    const agent = makeAgent('a')
    const nodes = [chat, dt, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'dt', 'a', 'out', 'context'),
    ]
    const blocks = collectContextBlocks(
      'a',
      nodes,
      edges,
      ctx,
      { kind: 'chat', nodeId: 'c', userInput: 'What day is it?' }
    )
    expect(blocks[0].kind).toBe('user_message')
    expect(blocks.some((b) => b.toolId === 'datetime')).toBe(true)
  })

  it('formatAgentPrompt includes labeled sections and JSON', () => {
    const prompt = formatAgentPrompt('Helper', [
      {
        nodeId: 'c',
        label: 'User message',
        kind: 'user_message',
        portId: 'message',
        value: 'Hello',
      },
      {
        nodeId: 'dt',
        label: 'Date & Time',
        kind: 'tool',
        toolId: 'datetime',
        portId: 'out',
        value: 'Jun 22, 2026',
      },
    ])
    expect(prompt).toContain('Role: Helper')
    expect(prompt).toContain('## User message')
    expect(prompt).toContain('## Date & Time')
    expect(prompt).toContain('Structured context (JSON)')
    expect(prompt).toContain('"toolId":"datetime"')
  })

  it('deduplicates chat wired to context when same as trigger message', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const nodes = [chat, agent]
    const edges = [edgeWithHandles('e', 'c', 'a', 'message', 'context')]
    const blocks = collectContextBlocks(
      'a',
      nodes,
      edges,
      {
        variables: { c: { message: { type: 'text', value: 'Hi' } } },
        toolResults: {},
        legacyVariables: { c: 'Hi' },
      },
      { kind: 'chat', nodeId: 'c', userInput: 'Hi' }
    )
    const userBlocks = blocks.filter((b) => b.kind === 'user_message' || b.kind === 'chat')
    expect(userBlocks).toHaveLength(1)
  })

  it('includes upstream agent output as agent kind block', () => {
    const draft = makeAgent('draft', { label: 'Drafter' })
    const final = makeAgent('final', { label: 'Editor' })
    const nodes = [draft, final]
    const edges = [edgeWithHandles('e', 'draft', 'final', 'out', 'context')]
    const blocks = collectContextBlocks(
      'final',
      nodes,
      edges,
      {
        variables: { draft: { out: { type: 'text', value: 'draft text' } } },
        toolResults: {},
        legacyVariables: { draft: 'draft text' },
      },
      { kind: 'agent', nodeId: 'final' }
    )
    expect(blocks.some((b) => b.kind === 'agent' && b.value === 'draft text')).toBe(true)
  })

  it('reads custom port values from tool results map', () => {
    const tool = makeTool('t', 'trim-text')
    const agent = makeAgent('a')
    const nodes = [tool, agent]
    const edges = [edgeWithHandles('e', 't', 'a', 'custom', 'context')]
    const blocks = collectContextBlocks(
      'a',
      nodes,
      edges,
      {
        variables: {},
        toolResults: { t: { custom: { type: 'text', value: 'from-custom' } } },
        legacyVariables: {},
      },
      { kind: 'agent', nodeId: 'a' }
    )
    expect(blocks.some((b) => b.value === 'from-custom')).toBe(true)
  })

  it('skips empty values and uses registry label for tools', () => {
    const tool = makeTool('t', 'trim-text')
    const agent = makeAgent('a')
    const nodes = [tool, agent]
    const edges = [edgeWithHandles('e', 't', 'a', 'meta', 'context')]
    const blocks = collectContextBlocks(
      'a',
      nodes,
      edges,
      {
        variables: {},
        toolResults: { t: { meta: { type: 'text', value: 'meta-value' } } },
        legacyVariables: {},
      },
      { kind: 'agent', nodeId: 'a' }
    )
    expect(blocks.some((b) => b.value === 'meta-value' && b.label === 'Trim Text')).toBe(true)
  })

  it('uses first map value when out port missing and handles unknown node kinds', () => {
    const mystery = {
      id: 'm',
      type: 'plugin',
      position: { x: 0, y: 0 },
      data: {},
    }
    const agent = makeAgent('a')
    const nodes = [mystery as never, agent]
    const edges = [edgeWithHandles('e', 'm', 'a', 'out', 'context')]
    const blocks = collectContextBlocks(
      'a',
      nodes,
      edges,
      {
        variables: {},
        toolResults: { m: { meta: { type: 'text', value: 'plugin-out' } } },
        legacyVariables: {},
      },
      { kind: 'agent', nodeId: 'a' }
    )
    expect(blocks.some((b) => b.value === 'plugin-out' && b.label === 'm')).toBe(true)
  })

  it('ignores edges whose source node is missing from the graph', () => {
    const agent = makeAgent('a')
    const nodes = [agent]
    const edges = [edgeWithHandles('e', 'missing', 'a', 'out', 'context')]
    const blocks = collectContextBlocks(
      'a',
      nodes,
      edges,
      { variables: {}, toolResults: {}, legacyVariables: {} },
      { kind: 'agent', nodeId: 'a' }
    )
    expect(blocks).toHaveLength(0)
  })

  it('skips blocks with whitespace-only values', () => {
    const tool = makeTool('t', 'trim-text')
    const agent = makeAgent('a')
    const nodes = [tool, agent]
    const edges = [edgeWithHandles('e', 't', 'a', 'out', 'context')]
    const blocks = collectContextBlocks(
      'a',
      nodes,
      edges,
      {
        variables: {},
        toolResults: { t: { out: { type: 'text', value: '   ' } } },
        legacyVariables: {},
      },
      { kind: 'agent', nodeId: 'a' }
    )
    expect(blocks).toHaveLength(0)
  })
})
