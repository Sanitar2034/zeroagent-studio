import { describe, it, expect } from 'vitest'
import {
  upstreamClosure,
  downstreamClosure,
  forwardReachableAgents,
  resolveExecutionScope,
  getReachableNodeIds,
  canRunCaptureSink,
  hasChatOrAgentUpstream,
} from '../../src/orchestrator/executionScope'
import {
  makeChat,
  makeAgent,
  makeTool,
  edge,
  edgeWithHandles,
  buildDiamondWorkflow,
} from '../helpers/graphBuilders'

describe('executionScope', () => {
  it('upstreamClosure collects parallel tool feeding agent', () => {
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'dt', 'a', 'out', 'context'),
    ]
    const closure = upstreamClosure('a', edges)
    expect(closure.has('c')).toBe(true)
    expect(closure.has('dt')).toBe(true)
    expect(closure.size).toBe(2)
  })

  it('downstreamClosure collects serial post-agent tools', () => {
    const edges = [
      edgeWithHandles('e1', 'a', 't1', 'out', 'in'),
      edgeWithHandles('e2', 't1', 't2', 'out', 'in'),
    ]
    const closure = downstreamClosure('a', edges)
    expect(closure.has('t1')).toBe(true)
    expect(closure.has('t2')).toBe(true)
    expect(closure.size).toBe(2)
  })

  it('downstreamClosure deduplicates converging branches', () => {
    const edges = [
      edgeWithHandles('e1', 'a', 't1', 'out', 'in'),
      edgeWithHandles('e2', 'a', 't2', 'out', 'in'),
      edgeWithHandles('e3', 't1', 'merge', 'out', 'in'),
      edgeWithHandles('e4', 't2', 'merge', 'out', 'in'),
    ]
    const closure = downstreamClosure('a', edges)
    expect(closure.has('merge')).toBe(true)
    expect(closure.size).toBe(3)
  })

  it('resolveExecutionScope includes post-agent tool for chat trigger', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const trim = makeTool('t', 'trim-text')
    const nodes = [chat, agent, trim]
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'a', 't', 'out', 'in'),
    ]
    const scope = resolveExecutionScope(
      { kind: 'chat', nodeId: 'c', userInput: 'hi' },
      nodes,
      edges
    )
    expect(scope.has('t')).toBe(true)
    expect(scope.has('a')).toBe(true)
    expect(scope.has('c')).toBe(true)
  })

  it('resolveExecutionScope includes serial post-agent tools for agent trigger', () => {
    const agent = makeAgent('a')
    const trim = makeTool('t', 'trim-text')
    const speech = makeTool('sp', 'speech')
    const edges = [
      edgeWithHandles('e1', 'a', 't', 'out', 'in'),
      edgeWithHandles('e2', 't', 'sp', 'out', 'in'),
    ]
    const scope = resolveExecutionScope({ kind: 'agent', nodeId: 'a' }, [agent, trim, speech], edges)
    expect(scope.has('t')).toBe(true)
    expect(scope.has('sp')).toBe(true)
    expect(scope.has('a')).toBe(true)
    expect(scope.size).toBe(3)
  })

  it('resolveExecutionScope post-agent chains do not leak across parallel agents', () => {
    const chat = makeChat('c')
    const a1 = makeAgent('a1')
    const a2 = makeAgent('a2')
    const t1 = makeTool('t1', 'trim-text')
    const t2 = makeTool('t2', 'uppercase')
    const nodes = [chat, a1, a2, t1, t2]
    const edges = [
      edgeWithHandles('e1', 'c', 'a1', 'message', 'context'),
      edgeWithHandles('e2', 'c', 'a2', 'message', 'context'),
      edgeWithHandles('e3', 'a1', 't1', 'out', 'in'),
      edgeWithHandles('e4', 'a2', 't2', 'out', 'in'),
    ]
    const scope = resolveExecutionScope(
      { kind: 'chat', nodeId: 'c', userInput: 'x' },
      nodes,
      edges
    )
    expect(scope.has('t1')).toBe(true)
    expect(scope.has('t2')).toBe(true)
    expect(scope.has('a1')).toBe(true)
    expect(scope.has('a2')).toBe(true)
  })

  it('forwardReachableAgents finds agents downstream from chat', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const edges = [edge('e', 'c', 'a')]
    const agents = forwardReachableAgents('c', [chat, agent], edges)
    expect(agents).toEqual(['a'])
  })

  it('resolveExecutionScope includes parallel datetime for chat trigger', () => {
    const chat = makeChat('c')
    const dt = makeTool('dt', 'datetime')
    const agent = makeAgent('a')
    const nodes = [chat, dt, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'dt', 'a', 'out', 'context'),
    ]
    const scope = resolveExecutionScope(
      { kind: 'chat', nodeId: 'c', userInput: 'hi' },
      nodes,
      edges
    )
    expect(scope.has('dt')).toBe(true)
    expect(scope.has('a')).toBe(true)
    expect(scope.has('c')).toBe(true)
  })

  it('resolveExecutionScope for agent trigger omits chat', () => {
    const dt = makeTool('dt', 'datetime')
    const agent = makeAgent('a')
    const nodes = [dt, agent]
    const edges = [edgeWithHandles('e', 'dt', 'a', 'out', 'context')]
    const scope = resolveExecutionScope({ kind: 'agent', nodeId: 'a' }, nodes, edges)
    expect(scope.has('dt')).toBe(true)
    expect(scope.has('a')).toBe(true)
    expect(scope.size).toBe(2)
  })

  it('getReachableNodeIds stays downstream-only for backward compat', () => {
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'dt', 'a', 'out', 'context'),
    ]
    const reachable = getReachableNodeIds('c', edges)
    expect(reachable.has('a')).toBe(true)
    expect(reachable.has('dt')).toBe(false)
  })

  it('resolveExecutionScope falls back when chat has no agent sinks', () => {
    const chat = makeChat('c')
    const tool = makeTool('t', 'trim-text')
    const scope = resolveExecutionScope(
      { kind: 'chat', nodeId: 'c', userInput: 'x' },
      [chat, tool],
      [edge('e', 'c', 't')]
    )
    expect(scope.has('t')).toBe(true)
  })

  it('forwardReachableAgents tolerates missing node metadata', () => {
    const agents = forwardReachableAgents('ghost', [{ id: 'ghost', type: 'chat', position: { x: 0, y: 0 }, data: {} }], [])
    expect(agents).toEqual([])
  })

  it('forwardReachableAgents deduplicates diamond paths', () => {
    const { nodes, edges } = buildDiamondWorkflow()
    const agents = forwardReachableAgents('chat', nodes, edges)
    expect(agents).toContain('merge')
  })

  it('resolveExecutionScope sink includes upstream tools only', () => {
    const scraper = makeTool('sc', 'web-scraper')
    const html = makeTool('html', 'html-to-text')
    const output = makeTool('out', 'text-output')
    const nodes = [scraper, html, output]
    const edges = [
      edgeWithHandles('e1', 'sc', 'html', 'out', 'in'),
      edgeWithHandles('e2', 'html', 'out', 'out', 'in'),
    ]
    const scope = resolveExecutionScope({ kind: 'sink', nodeId: 'out' }, nodes, edges)
    expect(scope.has('sc')).toBe(true)
    expect(scope.has('html')).toBe(true)
    expect(scope.has('out')).toBe(true)
    expect(scope.size).toBe(3)
  })

  it('resolveExecutionScope sink omits Chat and Agent ancestors', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const trim = makeTool('t', 'trim-text')
    const output = makeTool('out', 'text-output')
    const nodes = [chat, agent, trim, output]
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'a', 't', 'out', 'in'),
      edgeWithHandles('e3', 't', 'out', 'out', 'in'),
    ]
    const scope = resolveExecutionScope({ kind: 'sink', nodeId: 'out' }, nodes, edges)
    expect(scope.has('t')).toBe(true)
    expect(scope.has('out')).toBe(true)
    expect(scope.has('c')).toBe(false)
    expect(scope.has('a')).toBe(false)
    expect(scope.size).toBe(2)
  })

  it('resolveExecutionScope tool includes downstream and agent context feeders', () => {
    const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
    const agent = makeAgent('a')
    const encode = makeTool('enc', 'base64-encode')
    const output = makeTool('out', 'text-output')
    const nodes = [dt, agent, encode, output]
    const edges = [
      edgeWithHandles('e1', 'dt', 'a', 'out', 'context'),
      edgeWithHandles('e2', 'a', 'enc', 'out', 'in'),
      edgeWithHandles('e3', 'enc', 'out', 'out', 'in'),
    ]
    const scope = resolveExecutionScope({ kind: 'tool', nodeId: 'dt' }, nodes, edges)
    expect(scope.has('dt')).toBe(true)
    expect(scope.has('a')).toBe(true)
    expect(scope.has('enc')).toBe(true)
    expect(scope.has('out')).toBe(true)
    expect(scope.size).toBe(4)
  })

  it('canRunCaptureSink requires tool-only upstream', () => {
    const scraper = makeTool('sc', 'web-scraper')
    const output = makeTool('out', 'text-output')
    const agent = makeAgent('a')
    const nodes = [scraper, output]
    const toolEdges = [edgeWithHandles('e1', 'sc', 'out', 'out', 'in')]
    expect(canRunCaptureSink('out', nodes, toolEdges)).toBe(true)

    const agentNodes = [agent, output]
    const agentEdges = [edgeWithHandles('e2', 'a', 'out', 'out', 'in')]
    expect(canRunCaptureSink('out', agentNodes, agentEdges)).toBe(false)
    expect(hasChatOrAgentUpstream('out', agentNodes, agentEdges)).toBe(true)
    expect(canRunCaptureSink('out', [output], [])).toBe(false)
  })

  it('forwardReachableAgents deduplicates converging branches', () => {
    const chat = makeChat('c')
    const left = makeAgent('left')
    const right = makeAgent('right')
    const sink = makeAgent('sink')
    const nodes = [chat, left, right, sink]
    const edges = [
      edge('e1', 'c', 'left'),
      edge('e2', 'c', 'right'),
      edge('e3', 'left', 'sink'),
      edge('e4', 'right', 'sink'),
    ]
    expect(forwardReachableAgents('c', nodes, edges).sort()).toEqual(['left', 'right', 'sink'])
  })
})
