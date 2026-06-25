import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DAGOrchestrator,
  getExecutionOrder,
  getUpstreamNodes,
  getDownstreamNodes,
  getReachableNodeIds,
  runWorkflowFromAgent,
  runWorkflowToSink,
  runWorkflowFromTool,
} from '../../src/orchestrator/dag'
import {
  buildStudentResearchWorkflow,
  buildCyclicPeerReviewWorkflow,
  buildDiamondWorkflow,
  makeAgent,
  makeChat,
  makeTool,
  edge,
  edgeWithHandles,
} from '../helpers/graphBuilders'
import * as executionScope from '../../src/orchestrator/executionScope'

const mockChat = vi.fn()
const mockEngine = {
  name: 'Mock Engine',
  isAvailable: vi.fn(() => true),
  chat: mockChat,
}

vi.mock('../../src/engines', () => ({
  getEngine: vi.fn(() => mockEngine),
}))

vi.mock('../../src/tools/fileReader', () => ({
  readLocalFile: vi.fn(async () => ({
    name: 'notes.txt',
    content: 'Chapter 1: Photosynthesis',
    size: 28,
    type: 'text/plain',
  })),
}))

vi.mock('../../src/tools/webScraper', () => ({
  scrapeWebPage: vi.fn(async (url: string) => ({
    url,
    title: 'Wikipedia',
    text: 'Long article about plants',
    links: ['https://example.com/ref'],
  })),
}))

vi.mock('../../src/tools/speech', () => ({
  runSpeechTool: vi.fn(async () => 'Transcript: hello world'),
  isSpeechRecognitionAvailable: vi.fn(() => true),
  isSpeechSynthesisAvailable: vi.fn(() => true),
}))

vi.mock('../../src/stores/executionStore', () => ({
  useExecutionStore: {
    getState: () => ({
      setRunning: vi.fn(),
      clearThinking: vi.fn(),
      setCurrentNode: vi.fn(),
      addThinkingNode: vi.fn(),
      removeThinkingNode: vi.fn(),
      clearEdgeTransfers: vi.fn(),
      clearFlowingEdges: vi.fn(),
      recordEdgeTransfer: vi.fn(),
      setFlowingEdges: vi.fn(),
    }),
  },
}))

const workflowNodes: unknown[] = []
let storeNodes: ReturnType<typeof makeChat>[] | 'omit' = []
vi.mock('../../src/stores/workflowStore', () => ({
  useWorkflowStore: {
    getState: () => ({
      nodes: storeNodes === 'omit' ? undefined : storeNodes,
      updateNodeData: vi.fn((id: string, data: unknown) => {
        workflowNodes.push(data)
        if (storeNodes === 'omit') return
        storeNodes = storeNodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...(data as object) } } : n
        ) as typeof storeNodes
      }),
    }),
  },
}))

vi.mock('../../src/stores/debugStore', () => ({
  useDebugStore: {
    getState: () => ({ addLog: vi.fn() }),
  },
}))

describe('DAG orchestrator — graph theory & real workflows', () => {
  beforeEach(async () => {
    mockChat.mockReset()
    mockChat.mockResolvedValue({ content: 'AI says hi', model: 'mock' })
    workflowNodes.length = 0
    storeNodes = []
    const { scrapeWebPage } = await import('../../src/tools/webScraper')
    vi.mocked(scrapeWebPage).mockClear()
  })

  describe('topological sort via getExecutionOrder', () => {
    it('orders student research pipeline: chat → researcher → scraper → summarizer', () => {
      const { nodes, edges } = buildStudentResearchWorkflow()
      const order = getExecutionOrder(nodes, edges).map((n) => n.id)
      expect(order.indexOf('chat-1')).toBeLessThan(order.indexOf('agent-research'))
      expect(order.indexOf('agent-research')).toBeLessThan(order.indexOf('tool-scrape'))
      expect(order.indexOf('tool-scrape')).toBeLessThan(order.indexOf('agent-sum'))
    })

    it('topological sort handles edge to missing node id (corrupted workflow)', () => {
      const chat = makeChat('c')
      const edges = [edge('e', 'c', 'deleted-node')]
      const order = getExecutionOrder([chat], edges)
      expect(order.map((n) => n.id)).toContain('c')
    })

    it('throws on cyclic peer-review (A reviews B reviews A)', () => {
      const { nodes, edges } = buildCyclicPeerReviewWorkflow()
      expect(() => getExecutionOrder(nodes, edges)).toThrow(/cycle/i)
    })

    it('handles diamond merge — both branches before synthesizer', () => {
      const { nodes, edges } = buildDiamondWorkflow()
      const order = getExecutionOrder(nodes, edges).map((n) => n.id)
      const mergeIdx = order.indexOf('merge')
      expect(order.indexOf('left')).toBeLessThan(mergeIdx)
      expect(order.indexOf('right')).toBeLessThan(mergeIdx)
    })

    it('includes disconnected orphan nodes (user forgot to wire them)', () => {
      const chat = makeChat('c')
      const orphan = makeAgent('orphan')
      const connected = makeAgent('connected')
      const nodes = [chat, orphan, connected]
      const edges = [edge('e1', 'c', 'connected')]
      const order = getExecutionOrder(nodes, edges)
      expect(order).toHaveLength(3)
    })
  })

  describe('getUpstreamNodes / getDownstreamNodes', () => {
    it('finds multiple upstream parents in diamond graph', () => {
      const { edges } = buildDiamondWorkflow()
      expect(getUpstreamNodes('merge', edges).sort()).toEqual(['left', 'right'])
      expect(getDownstreamNodes('chat', edges).sort()).toEqual(['left', 'right'])
    })

    it('getReachableNodeIds deduplicates diamond merge paths', () => {
      const { edges } = buildDiamondWorkflow()
      const reachable = getReachableNodeIds('chat', edges)
      expect(reachable.has('merge')).toBe(true)
      expect(reachable.size).toBe(4)
    })

    it('returns empty for root chat node upstream', () => {
      expect(getUpstreamNodes('chat', [edge('e', 'chat', 'left')])).toEqual([])
    })
  })

  describe('DAGOrchestrator.execute — integration scenarios', () => {
    it('logs tool failure using node id when label missing', async () => {
      const logs: { level: string; source: string }[] = []
      const chat = makeChat('c')
      const scraper = makeTool('scraper-id', 'web-scraper')
      Object.assign(scraper.data, { label: undefined })
      const orch = new DAGOrchestrator(
        [chat, scraper],
        [edge('e', 'c', 'scraper-id')],
        {},
        (e) => logs.push({ level: e.level, source: e.source })
      )
      await orch.execute('   ')
      expect(logs.some((l) => l.level === 'error' && l.source === 'scraper-id')).toBe(true)
    })
    it('rejects workflow with no chat node (user only added agents)', async () => {
      const orch = new DAGOrchestrator(
        [makeAgent('solo')],
        [],
        {},
        vi.fn()
      )
      await expect(orch.execute('hello')).rejects.toThrow(/no chat/i)
    })

    it('logs fallback warning using node id when agent label missing', async () => {
      const logs: { level: string; source: string }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('bare-agent', { brain: 'openrouter', label: undefined })
      const orch = new DAGOrchestrator(
        [chat, agent],
        [edge('e', 'c', 'bare-agent')],
        {},
        (e) => logs.push({ level: e.level, source: e.source })
      )
      await orch.execute('hi')
      expect(logs.some((l) => l.level === 'warn' && l.source === 'bare-agent')).toBe(true)
    })

    it('runs minimal chat → agent pipeline for broke student', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a', { brain: 'transformers' })
      const logs: string[] = []
      const orch = new DAGOrchestrator(
        [chat, agent],
        [edge('e', 'c', 'a')],
        {},
        (e) => logs.push(e.message)
      )

      const out = await orch.execute('Explain photosynthesis in 2 sentences')
      expect(out).toBe('AI says hi')
      expect(mockChat).toHaveBeenCalledOnce()
      const userMsg = mockChat.mock.calls[0][0].find((m: { role: string }) => m.role === 'user')
      expect(userMsg.content).toContain('Explain photosynthesis')
    })

    it('passes scraped content from tool into downstream agent input', async () => {
      const { scrapeWebPage } = await import('../../src/tools/webScraper')
      const chat = makeChat('c')
      const scraper = makeTool('t', 'web-scraper', { url: 'plants.org' })
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, scraper, agent],
        [edge('e1', 'c', 't'), edge('e2', 't', 'a')],
        {},
        vi.fn()
      )

      await orch.execute('')
      expect(scrapeWebPage).toHaveBeenCalledWith('https://plants.org/')
      const agentCall = mockChat.mock.calls[0][0].find((m: { role: string }) => m.role === 'user')
      expect(agentCall.content).toContain('Wikipedia')
    })

    it('prepends https when user types bare domain in scraper upstream', async () => {
      const { scrapeWebPage } = await import('../../src/tools/webScraper')
      const chat = makeChat('c')
      const scraper = makeTool('t', 'web-scraper')
      const orch = new DAGOrchestrator(
        [chat, scraper],
        [edge('e', 'c', 't')],
        {},
        vi.fn()
      )
      await orch.execute('example.com')
      expect(scrapeWebPage).toHaveBeenCalledWith('https://example.com/')
    })

    it('throws when web scraper has no URL anywhere', async () => {
      const chat = makeChat('c')
      const scraper = makeTool('t', 'web-scraper')
      const logs: { level: string; message: string }[] = []
      const orch = new DAGOrchestrator(
        [chat, scraper],
        [edge('e', 'c', 't')],
        {},
        (e) => logs.push({ level: e.level, message: e.message })
      )
      await orch.execute('   ')
      expect(logs.some((l) => l.level === 'error' && l.message.includes('URL'))).toBe(true)
    })

    it('continues pipeline when one agent fails and surfaces error in final output', async () => {
      mockChat
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({ content: 'Recovered summary', model: 'mock' })

      const chat = makeChat('c')
      const failAgent = makeAgent('fail')
      const okAgent = makeAgent('ok')
      const orch = new DAGOrchestrator(
        [chat, failAgent, okAgent],
        [edge('e1', 'c', 'fail'), edge('e2', 'fail', 'ok')],
        {},
        vi.fn()
      )
      const result = await orch.execute('test')
      expect(result).toContain('Recovered summary')
      expect(result).toContain('Rate limit exceeded')
    })

    it('logs warn not success when workflow finishes with errors', async () => {
      mockChat.mockRejectedValueOnce(new Error('OpenRouter API error: 404 - gone'))
      const logs: { level: string; message: string }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, agent],
        [edge('e', 'c', 'a')],
        {},
        (e) => logs.push({ level: e.level, message: e.message })
      )
      await orch.execute('hi')
      expect(logs.some((l) => l.level === 'warn' && l.message.includes('errors'))).toBe(true)
      expect(logs.some((l) => l.level === 'success' && l.message.includes('completed'))).toBe(false)
    })

    it('skips orphan nodes not connected to chat', async () => {
      const chat = makeChat('c')
      const orphan = makeAgent('orphan')
      const connected = makeAgent('connected')
      const orch = new DAGOrchestrator(
        [chat, orphan, connected],
        [edge('e1', 'c', 'connected')],
        {},
        vi.fn()
      )
      await orch.execute('hello')
      expect(mockChat).toHaveBeenCalledOnce()
    })

    it('passes undefined model when resolver omits explicit model', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a', { brain: 'groq', model: undefined })
      const orch = new DAGOrchestrator(
        [chat, agent],
        [edge('e', 'c', 'a')],
        { groq: 'gsk-key' }
      )
      await orch.execute('hi')
      expect(mockChat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ model: undefined })
      )
    })

    it('passes onModelRetry callback to engine.chat', async () => {
      const logs: { level: string; message: string; data?: unknown }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('a', { brain: 'openrouter', label: undefined })
      const orch = new DAGOrchestrator(
        [chat, agent],
        [edge('e', 'c', 'a')],
        { openrouter: 'sk-or-key' },
        (e) => logs.push({ level: e.level, message: e.message, data: e.data })
      )
      await orch.execute('hi')
      const options = mockChat.mock.calls[0]?.[1] as {
        onModelRetry?: (from: string, to: string, error: string) => void
      }
      expect(options?.onModelRetry).toBeTypeOf('function')
      options?.onModelRetry?.('stale/model', 'openrouter/free', 'x'.repeat(250))
      expect(logs.some((l) => l.message.includes('trying openrouter/free'))).toBe(true)
      options?.onModelRetry?.('a', 'b', 'short')
      options?.onModelRetry?.('a', 'b', 'x'.repeat(200))
    })

    it('logs fallback warning when OpenRouter requested without key', async () => {
      const logs: { level: string; message: string }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('a', { brain: 'openrouter' })
      const orch = new DAGOrchestrator(
        [chat, agent],
        [edge('e', 'c', 'a')],
        {},
        (e) => logs.push({ level: e.level, message: e.message })
      )
      await orch.execute('hi')
      expect(logs.some((l) => l.level === 'warn' && l.message.includes('OpenRouter'))).toBe(true)
    })

    it('throws when no brain is available at all', async () => {
      mockEngine.isAvailable.mockReturnValueOnce(false)
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([chat, agent], [edge('e', 'c', 'a')], {}, vi.fn())
      await orch.execute('hi')
      // execute swallows node errors — verify via mock not called
      expect(mockChat).not.toHaveBeenCalled()
    })

    it('truncates long user input in start log (DoS-ish paste)', async () => {
      const logs: string[] = []
      const chat = makeChat('c')
      const orch = new DAGOrchestrator([chat], [], {}, (e) => logs.push(e.message))
      const longInput = 'A'.repeat(500)
      await orch.execute(longInput)
      const startLog = logs.find((m) => m.includes('Starting execution'))
      expect(startLog!.length).toBeLessThan(500)
    })

    it('runs parallel datetime tool wired to agent context', async () => {
      const chat = makeChat('c')
      const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, dt, agent],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'dt', 'a', 'out', 'context'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('What day is it?')
      expect(mockChat).toHaveBeenCalledOnce()
      const userMsg = mockChat.mock.calls[0][0].find((m: { role: string }) => m.role === 'user')
      expect(userMsg.content).toContain('What day is it?')
      expect(userMsg.content).toContain('## User message')
    })

    it('preserves chat message in serial Chat → Tool → Agent chain', async () => {
      const chat = makeChat('c')
      const trim = makeTool('t', 'trim-text')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, trim, agent],
        [
          edgeWithHandles('e1', 'c', 't', 'message', 'in'),
          edgeWithHandles('e2', 't', 'a', 'out', 'context'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('  hello world  ')
      const userMsg = mockChat.mock.calls[0][0].find((m: { role: string }) => m.role === 'user')
      expect(userMsg.content).toContain('hello world')
      expect(userMsg.content).toContain('## User message')
    })

    it('runWorkflowFromAgent executes without chat', async () => {
      const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
      const agent = makeAgent('a')
      Object.assign(agent.data, { label: undefined })
      const logs: string[] = []
      const orch = new DAGOrchestrator(
        [dt, agent],
        [edgeWithHandles('e', 'dt', 'a', 'out', 'context')],
        {},
        (e) => logs.push(e.message)
      )
      await orch.executeWithTrigger({ kind: 'agent', nodeId: 'a' })
      expect(logs.some((m) => m.includes('a') && m.includes('Starting execution'))).toBe(true)
      const out = await runWorkflowFromAgent([dt, agent], [edgeWithHandles('e', 'dt', 'a', 'out', 'context')], 'a', {})
      expect(out).toBe('AI says hi')
      expect(mockChat).toHaveBeenCalled()
    })

    it('skips flow-edge hold when execution scope is empty', async () => {
      vi.useFakeTimers()
      const scopeSpy = vi
        .spyOn(executionScope, 'resolveExecutionScope')
        .mockReturnValue(new Set())
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([agent], [], {}, vi.fn())
      const run = orch.executeWithTrigger({ kind: 'agent', nodeId: 'a' })
      await vi.runAllTimersAsync()
      await expect(run).resolves.toBe('')
      scopeSpy.mockRestore()
      vi.useRealTimers()
    })

    it('runWorkflow throws when no chat node exists', async () => {
      const agent = makeAgent('a')
      const { runWorkflow } = await import('../../src/orchestrator/dag')
      await expect(runWorkflow([agent], [], 'hi', {})).rejects.toThrow(/no chat/i)
    })

    it('runWorkflowFromAgent throws for missing agent', async () => {
      const { runWorkflowFromAgent } = await import('../../src/orchestrator/dag')
      await expect(runWorkflowFromAgent([], [], 'missing', {})).rejects.toThrow(/no agent/i)
    })

    it('skips auto-run tool with warn when disabled and no input', async () => {
      const logs: { level: string; message: string }[] = []
      const chat = makeChat('c')
      const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
      Object.assign(dt.data, { autoRun: false })
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, dt, agent],
        [edgeWithHandles('e1', 'c', 'a', 'message', 'context'), edgeWithHandles('e2', 'dt', 'a', 'out', 'context')],
        {},
        (e) => logs.push({ level: e.level, message: e.message })
      )
      await orch.execute('hi')
      expect(logs.some((l) => l.level === 'warn' && l.message.includes('auto-run'))).toBe(true)
    })

    it('executeWithTrigger rejects invalid chat and agent triggers', async () => {
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([agent], [], {}, vi.fn())
      await expect(
        orch.executeWithTrigger({ kind: 'chat', nodeId: 'a', userInput: 'x' })
      ).rejects.toThrow(/no chat/i)
      await expect(
        orch.executeWithTrigger({ kind: 'agent', nodeId: 'missing' })
      ).rejects.toThrow(/no agent/i)
    })

    it('legacy port input fallback joins upstream for tools with mismatched handles', async () => {
      const chat = makeChat('c')
      const trim = makeTool('t', 'trim-text')
      const orch = new DAGOrchestrator(
        [chat, trim],
        [{ id: 'e', source: 'c', target: 't', sourceHandle: 'message', targetHandle: 'wrong-port' }],
        {},
        vi.fn()
      )
      const out = await orch.execute('  padded  ')
      expect(out.length).toBeGreaterThan(0)
    })

    it('merges duplicate upstream edges on the same input port', async () => {
      const chat = makeChat('c')
      const trim = makeTool('t', 'trim-text')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, trim, agent],
        [
          edgeWithHandles('e1', 'c', 't', 'message', 'in'),
          edgeWithHandles('e2', 'c', 't', 'message', 'in'),
          edgeWithHandles('e3', 't', 'a', 'out', 'context'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('dup')
      expect(mockChat).toHaveBeenCalled()
    })

    it('merges multiple upstream values on the same tool input port', async () => {
      const chat = makeChat('c')
      const t1 = makeTool('t1', 'trim-text')
      const t2 = makeTool('t2', 'uppercase')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, t1, t2, agent],
        [
          edgeWithHandles('e1', 'c', 't1', 'message', 'in'),
          edgeWithHandles('e2', 'c', 't2', 'message', 'in'),
          edgeWithHandles('e3', 't1', 't2', 'out', 'in'),
          edgeWithHandles('e4', 't2', 'a', 'out', 'context'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('merge me')
      expect(mockChat).toHaveBeenCalled()
    })

    it('logs default skip reason when tool auto-run returns skip without reason', async () => {
      const registry = await import('../../src/tools/registry')
      vi.spyOn(registry, 'shouldSkipToolExecution')
        .mockReturnValueOnce({ skip: true, reason: 'Custom skip message' })
        .mockReturnValueOnce({ skip: true })
      const logs: { level: string; message: string }[] = []
      const chat = makeChat('c')
      const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
      const dt2 = makeTool('dt2', 'clipboard', { mode: 'read' })
      Object.assign(dt.data, { label: undefined })
      Object.assign(dt2.data, { autoRun: false })
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, dt, dt2, agent],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'dt', 'a', 'out', 'context'),
          edgeWithHandles('e3', 'dt2', 'a', 'out', 'context'),
        ],
        {},
        (e) => logs.push({ level: e.level, message: e.message })
      )
      await orch.execute('hi')
      expect(logs.some((l) => l.message === 'Custom skip message')).toBe(true)
      expect(logs.some((l) => l.message.includes('auto-run disabled'))).toBe(true)
      vi.restoreAllMocks()
    })

    it('runs post-agent tool chain Chat → Agent → trim-text', async () => {
      const logs: string[] = []
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const trim = makeTool('t', 'trim-text')
      const orch = new DAGOrchestrator(
        [chat, agent, trim],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'a', 't', 'out', 'in'),
        ],
        {},
        (e) => logs.push(e.message)
      )
      const out = await orch.execute('hello')
      expect(out).toBe('AI says hi')
      expect(logs.some((m) => m.includes('Running tool: trim-text'))).toBe(true)
    })

    it('keeps agent reply in chat when post-agent Speech TTS runs', async () => {
      const { runSpeechTool } = await import('../../src/tools/speech')
      vi.mocked(runSpeechTool).mockResolvedValueOnce('Spoken: synthesized reply')

      const chat = makeChat('c')
      const agent = makeAgent('a')
      const speech = makeTool('sp', 'speech', { mode: 'tts', language: 'en-US' })
      const orch = new DAGOrchestrator(
        [chat, agent, speech],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'a', 'sp', 'out', 'in'),
        ],
        {},
        vi.fn()
      )
      const out = await orch.execute('read this aloud')
      expect(out).toBe('AI says hi')
      expect(runSpeechTool).toHaveBeenCalledWith(
        'AI says hi',
        expect.objectContaining({ mode: 'tts', text: 'AI says hi' })
      )
    })

    it('feeds agent output to Speech when Agent fans out to Text Output and Speech', async () => {
      const { runSpeechTool } = await import('../../src/tools/speech')
      vi.mocked(runSpeechTool).mockResolvedValueOnce('Spoken: hi')

      const chat = makeChat('c')
      const agent = makeAgent('a')
      const output = makeTool('cap', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [] })
      const speech = makeTool('sp', 'speech', { mode: 'tts', language: 'en-US' })
      storeNodes = [chat, agent, output, speech]
      const orch = new DAGOrchestrator(
        [chat, agent, output, speech],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'a', 'cap', 'out', 'in'),
          edgeWithHandles('e3', 'a', 'sp', 'out', 'in'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('hello')
      expect(runSpeechTool).toHaveBeenCalledWith(
        'AI says hi',
        expect.objectContaining({ mode: 'tts' })
      )
    })

    it('feeds agent output through Text Output into Speech', async () => {
      const { runSpeechTool } = await import('../../src/tools/speech')
      vi.mocked(runSpeechTool).mockResolvedValueOnce('Spoken: hi')

      const chat = makeChat('c')
      const agent = makeAgent('a')
      const output = makeTool('cap', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [] })
      const speech = makeTool('sp', 'speech', { mode: 'tts', language: 'en-US' })
      storeNodes = [chat, agent, output, speech]
      const orch = new DAGOrchestrator(
        [chat, agent, output, speech],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'a', 'cap', 'out', 'in'),
          edgeWithHandles('e3', 'cap', 'sp', 'out', 'in'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('hello')
      expect(runSpeechTool).toHaveBeenCalledWith(
        'AI says hi',
        expect.objectContaining({ mode: 'tts' })
      )
    })

    it('runWorkflowFromAgent runs post-agent Speech in scraper-cleanup pattern', async () => {
      const { runSpeechTool } = await import('../../src/tools/speech')
      vi.mocked(runSpeechTool).mockResolvedValueOnce('Spoken: summary')

      const scraper = makeTool('sc', 'web-scraper', { url: 'https://example.com' })
      const html = makeTool('html', 'html-to-text')
      const agent = makeAgent('a', { label: 'Summary Agent' })
      const speech = makeTool('sp', 'speech', { mode: 'tts', language: 'en-US' })
      const nodes = [scraper, html, agent, speech]
      const edges = [
        edgeWithHandles('e1', 'sc', 'html', 'out', 'in'),
        edgeWithHandles('e2', 'html', 'a', 'out', 'context'),
        edgeWithHandles('e3', 'a', 'sp', 'out', 'in'),
      ]
      const out = await runWorkflowFromAgent(nodes, edges, 'a', {})
      expect(out).toBe('Spoken: summary')
      expect(runSpeechTool).toHaveBeenCalled()
    })

    it('appends outputLog when Chat → Agent → Text Output runs', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [] })
      storeNodes = [chat, agent, output]
      const orch = new DAGOrchestrator(
        [chat, agent, output],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'a', 'out', 'out', 'in'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('log this')
      const outNode = storeNodes.find((n) => n.id === 'out')
      const log = (outNode?.data as { outputLog?: { text: string }[] }).outputLog
      expect(log?.length).toBe(1)
      expect(log?.[0].text).toBe('AI says hi')
    })

    it('runWorkflowToSink rejects missing capture node', async () => {
      await expect(runWorkflowToSink([], [], 'missing', {})).rejects.toThrow(/capture tool/i)
    })

    it('runWorkflowToSink captures upstream into text-output without chat', async () => {
      const scraper = makeTool('sc', 'web-scraper', { url: 'https://example.com' })
      const html = makeTool('html', 'html-to-text')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [], autoRun: true })
      storeNodes = [scraper, html, output]
      const nodes = [scraper, html, output]
      const edges = [
        edgeWithHandles('e1', 'sc', 'html', 'out', 'in'),
        edgeWithHandles('e2', 'html', 'out', 'out', 'in'),
      ]
      await runWorkflowToSink(nodes, edges, 'out', {})
      const outNode = storeNodes.find((n) => n.id === 'out')
      const log = (outNode?.data as { outputLog?: { text: string }[] }).outputLog
      expect(log?.length).toBe(1)
      expect(log?.[0].text.length).toBeGreaterThan(0)
    })

    it('executeWithTrigger rejects invalid sink node', async () => {
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([agent], [], {}, vi.fn())
      await expect(orch.executeWithTrigger({ kind: 'sink', nodeId: 'a' })).rejects.toThrow(
        /capture tool/i
      )
    })

    it('executeWithTrigger rejects sink on non-text-output tool', async () => {
      const trim = makeTool('t', 'trim-text')
      const orch = new DAGOrchestrator([trim], [], {}, vi.fn())
      await expect(orch.executeWithTrigger({ kind: 'sink', nodeId: 't' })).rejects.toThrow(
        /Text Output/i
      )
    })

    it('runWorkflowToSink rejects non-text-output tool', async () => {
      const trim = makeTool('t', 'trim-text')
      await expect(runWorkflowToSink([trim], [], 't', {})).rejects.toThrow(/Text Output/i)
    })

    it('runWorkflowFromTool rejects invalid starter preconditions', async () => {
      const trim = makeTool('t', 'trim-text')
      const agent = makeAgent('a')
      const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
      await expect(runWorkflowFromTool([trim], [], 'missing', {})).rejects.toThrow(/tool trigger/i)
      await expect(
        runWorkflowFromTool([trim, agent], [edgeWithHandles('e1', 't', 'a', 'out', 'context')], 't', {})
      ).rejects.toThrow(/upstream input/i)
      await expect(runWorkflowFromTool([dt], [], 'dt', {})).rejects.toThrow(/downstream/i)
    })

    it('runWorkflowFromTool rejects locked tools', async () => {
      const vision = makeTool('v', 'gemini-vision')
      const agent = makeAgent('a')
      const edges = [edgeWithHandles('e1', 'v', 'a', 'out', 'context')]
      await expect(runWorkflowFromTool([vision, agent], edges, 'v', {})).rejects.toThrow(
        /Configure API keys/i
      )
    })

    it('executeWithTrigger rejects invalid tool trigger node', async () => {
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([agent], [], {}, vi.fn())
      await expect(orch.executeWithTrigger({ kind: 'tool', nodeId: 'a' })).rejects.toThrow(
        /tool trigger/i
      )
    })

    it('tool trigger logs node id when starter tool has no label', async () => {
      const logs: { message: string }[] = []
      const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
      Object.assign(dt.data, { label: undefined })
      const orch = new DAGOrchestrator([dt], [], {}, (e) => logs.push({ message: e.message }))
      await orch.executeWithTrigger({ kind: 'tool', nodeId: 'dt' })
      expect(logs.some((l) => l.message.includes('dt'))).toBe(true)
    })

    it('runWorkflowFromTool runs datetime through agent to text-output', async () => {
      const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
      const agent = makeAgent('a')
      const encode = makeTool('enc', 'base64-encode')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [] })
      storeNodes = [dt, agent, encode, output]
      const nodes = [dt, agent, encode, output]
      const edges = [
        edgeWithHandles('e1', 'dt', 'a', 'out', 'context'),
        edgeWithHandles('e2', 'a', 'enc', 'out', 'in'),
        edgeWithHandles('e3', 'enc', 'out', 'out', 'in'),
      ]
      await runWorkflowFromTool(nodes, edges, 'dt', {})
      expect(mockChat).toHaveBeenCalled()
      const outNode = storeNodes.find((n) => n.id === 'out')
      const log = (outNode?.data as { outputLog?: { text: string }[] }).outputLog
      expect(log?.length).toBeGreaterThan(0)
    })

    it('runWorkflowToSink rejects when Chat or Agent is upstream', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const trim = makeTool('t', 'trim-text')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [] })
      const nodes = [chat, agent, trim, output]
      const edges = [
        edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
        edgeWithHandles('e2', 'a', 't', 'out', 'in'),
        edgeWithHandles('e3', 't', 'out', 'out', 'in'),
      ]
      await expect(runWorkflowToSink(nodes, edges, 'out', {})).rejects.toThrow(/tool-only/i)
      expect(mockChat).not.toHaveBeenCalled()
    })

    it('runWorkflowToSink rejects direct Agent upstream wire', async () => {
      const agent = makeAgent('a')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [] })
      const edges = [edgeWithHandles('e1', 'a', 'out', 'out', 'in')]
      await expect(runWorkflowToSink([agent, output], edges, 'out', {})).rejects.toThrow(/tool-only/i)
    })

    it('sink trigger logs node id when capture tool has no label', async () => {
      const logs: { message: string }[] = []
      const output = makeTool('cap', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', label: undefined, outputLog: [] })
      storeNodes = [output]
      const orch = new DAGOrchestrator([output], [], {}, (e) => logs.push({ message: e.message }))
      await orch.executeWithTrigger({ kind: 'sink', nodeId: 'cap' })
      expect(logs.some((l) => l.message.includes('cap'))).toBe(true)
    })

    it('text-output uses orchestrator nodes when workflow store has no nodes', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, { toolType: 'text-output', outputLog: [] })
      storeNodes = 'omit'
      const orch = new DAGOrchestrator(
        [chat, agent, output],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'a', 'out', 'out', 'in'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('capture me')
      expect(workflowNodes.some((d) => (d as { outputLog?: unknown[] }).outputLog?.length === 1)).toBe(
        true
      )
    })

    it('text-output falls back to node outputLog when store entry omits history', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, {
        toolType: 'text-output',
        outputLog: [{ text: 'seed', timestamp: 1 }],
      })
      storeNodes = [
        {
          id: 'out',
          type: 'tool',
          position: { x: 0, y: 0 },
          data: { toolType: 'text-output', label: 'Cap' },
        },
      ]
      const orch = new DAGOrchestrator(
        [chat, agent, output],
        [
          edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
          edgeWithHandles('e2', 'a', 'out', 'out', 'in'),
        ],
        {},
        vi.fn()
      )
      await orch.execute('hi')
      const updated = workflowNodes.find((d) => (d as { outputLog?: { text: string }[] }).outputLog)
      const log = (updated as { outputLog?: { text: string }[] })?.outputLog
      expect(log?.map((e) => e.text)).toEqual(['AI says hi', 'seed'])
    })

    it('text-output skips log append when tool output is whitespace only', async () => {
      const chat = makeChat('c')
      const output = makeTool('out', 'text-output')
      Object.assign(output.data, {
        toolType: 'text-output',
        outputLog: [{ text: 'kept', timestamp: 1 }],
      })
      storeNodes = [chat, output]
      const orch = new DAGOrchestrator(
        [chat, output],
        [edgeWithHandles('e1', 'c', 'out', 'message', 'in')],
        {},
        vi.fn()
      )
      await orch.execute('   ')
      const outNode = storeNodes.find((n) => n.id === 'out')
      const log = (outNode?.data as { outputLog?: { text: string }[] }).outputLog
      expect(log).toHaveLength(1)
      expect(log?.[0].text).toBe('kept')
    })
  })
})
