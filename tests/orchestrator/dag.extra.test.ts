import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DAGOrchestrator,
  runWorkflow,
  getDownstreamNodes,
} from '../../src/orchestrator/dag'
import { makeChat, makeAgent, makeTool, edge } from '../helpers/graphBuilders'
import { useDebugStore } from '../../src/stores/debugStore'

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
    name: 'essay.txt',
    content: 'My homework content',
    size: 100,
    type: 'text/plain',
  })),
}))

vi.mock('../../src/tools/speech', () => ({
  runSpeechTool: vi.fn(async () => 'Transcript: test'),
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

vi.mock('../../src/stores/workflowStore', () => ({
  useWorkflowStore: {
    getState: () => ({
      updateNodeData: vi.fn(),
    }),
  },
}))

describe('DAG orchestrator — remaining paths', () => {
  beforeEach(() => {
    mockChat.mockReset()
    mockChat.mockResolvedValue({ content: 'ok', model: 'm' })
    useDebugStore.setState({ logs: [] })
  })

  it('runWorkflow wires debug store logger', async () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    await runWorkflow([chat, agent], [edge('e', 'c', 'a')], 'hello', {})
    expect(useDebugStore.getState().logs.length).toBeGreaterThan(0)
  })

  it('executes file-reader tool (student uploads homework locally)', async () => {
    const { readLocalFile } = await import('../../src/tools/fileReader')
    const chat = makeChat('c')
    const tool = makeTool('t', 'file-reader')
    const agent = makeAgent('a')
    const orch = new DAGOrchestrator(
      [chat, tool, agent],
      [edge('e1', 'c', 't'), edge('e2', 't', 'a')],
      {},
      vi.fn()
    )
    await orch.execute('go')
    expect(readLocalFile).toHaveBeenCalled()
    const call = mockChat.mock.calls[0][0].find((m: { role: string }) => m.role === 'user')
    expect(call.content).toContain('essay.txt')
  })

  it('executes speech tool with STT config', async () => {
    const { runSpeechTool } = await import('../../src/tools/speech')
    const chat = makeChat('c')
    const tool = makeTool('t', 'speech', { mode: 'stt', language: 'pl-PL' })
    const orch = new DAGOrchestrator([chat, tool], [edge('e', 'c', 't')], {}, vi.fn())
    await orch.execute('listen')
    expect(runSpeechTool).toHaveBeenCalledWith(
      'listen',
      expect.objectContaining({ mode: 'stt', language: 'pl-PL' })
    )
  })

  it('getDownstreamNodes lists children', () => {
    expect(getDownstreamNodes('a', [edge('e', 'a', 'b'), edge('e2', 'a', 'c')])).toEqual([
      'b',
      'c',
    ])
  })

  it('handles unknown node type gracefully', async () => {
    const chat = makeChat('c')
    const mystery = { id: 'm', type: 'custom-plugin', position: { x: 0, y: 0 }, data: {} }
    const orch = new DAGOrchestrator(
      [chat, mystery as never],
      [edge('e', 'c', 'm')],
      {},
      vi.fn()
    )
    const result = await orch.execute('x')
    expect(result).toBe('x')
  })

  it('rejects cloud tools without API keys', async () => {
    const chat = makeChat('c')
    const tool = makeTool('t', 'groq-transcribe')
    const orch = new DAGOrchestrator([chat, tool], [edge('e', 'c', 't')], {}, vi.fn())
    const out = await orch.execute('audio')
    expect(out).toContain('Groq API key')
  })

  it('forwards tool context log to orchestrator', async () => {
    const logs: { level: string; message: string }[] = []
    const registry = await import('../../src/tools/registry')
    const baseGetTool = registry.getTool
    vi.spyOn(registry, 'getTool').mockImplementation((id) => {
      const tool = baseGetTool(id)
      if (id !== 'text-transform') return tool
      return {
        ...tool,
        run: async (input, config, ctx) => {
          ctx.log('warn', 'tool diagnostic')
          return baseGetTool('text-transform').run(input, config, ctx)
        },
      }
    })

    const chat = makeChat('c')
    const tool = makeTool('t', 'text-transform', { mode: 'trim' })
    const orch = new DAGOrchestrator(
      [chat, tool],
      [edge('e', 'c', 't')],
      {},
      (e) => logs.push({ level: e.level, message: e.message })
    )
    await orch.execute('  hi  ')
    expect(logs.some((l) => l.level === 'warn' && l.message === 'tool diagnostic')).toBe(true)
    vi.restoreAllMocks()
  })

  it('throws generic unavailable when tool gate fails without detail', async () => {
    const registry = await import('../../src/tools/registry')
    vi.spyOn(registry, 'isToolAvailableForConfig').mockReturnValue(false)
    vi.spyOn(registry, 'getToolAvailabilityMessage').mockReturnValue('')

    const chat = makeChat('c')
    const tool = makeTool('t', 'web-scraper')
    const orch = new DAGOrchestrator([chat, tool], [edge('e', 'c', 't')], {}, vi.fn())
    const out = await orch.execute('x')
    expect(out).toContain('Tool unavailable')
    vi.restoreAllMocks()
  })
})
