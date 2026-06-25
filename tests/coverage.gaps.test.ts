import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveAgentBrain } from '../src/lib/brainResolver'
import { DAGOrchestrator } from '../src/orchestrator/dag'
import { makeChat, makeAgent, edge } from './helpers/graphBuilders'
import { useModelLoadStore } from '../src/stores/modelLoadStore'

const mockCreate = vi.fn()
const mockUnload = vi.fn()
const mockChatCompletions = vi.fn()

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: (...args: unknown[]) => mockCreate(...args),
}))

const mockPipeline = vi.fn()

vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: false, useBrowserCache: true },
}))

const mockEngineChat = vi.fn<
  (
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string }
  ) => Promise<{ content: string; model: string }>
>(async () => ({ content: 'ok', model: 'm' }))
const mockEngine = {
  name: 'Mock',
  isAvailable: vi.fn(() => true),
  chat: mockEngineChat,
}

vi.mock('../src/engines', () => ({
  getEngine: vi.fn(() => mockEngine),
}))

vi.mock('../src/tools', () => ({
  readLocalFile: vi.fn(async () => ({ name: 'f', content: 'c', size: 1, type: 'text/plain' })),
  scrapeWebPage: vi.fn(async () => ({ url: 'u', title: 'T', text: 'x', links: [] })),
  runSpeechTool: vi.fn(async () => 'speech out'),
}))

vi.mock('../src/stores/executionStore', () => ({
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

vi.mock('../src/stores/workflowStore', () => ({
  useWorkflowStore: {
    getState: () => ({ updateNodeData: vi.fn() }),
  },
}))

describe('coverage gaps — edge paths & branch completeness', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockUnload.mockReset()
    mockChatCompletions.mockReset()
    mockPipeline.mockReset()
    mockCreate.mockResolvedValue({
      unload: mockUnload,
      chat: { completions: { create: mockChatCompletions } },
    })
    mockChatCompletions.mockResolvedValue({
      choices: [{ message: { content: 'GPU reply' } }],
    })
    mockPipeline.mockResolvedValue((text: string) =>
      Promise.resolve([{ generated_text: `${text}\nassistant: CPU reply` }])
    )
    vi.stubGlobal('navigator', { gpu: {} })
  })

  afterEach(async () => {
    const { unloadWebLLM } = await import('../src/engines/webllm')
    await unloadWebLLM()
    vi.resetModules()
  })

  describe('brainResolver — invalid brain type paths', () => {
    it('falls back for unknown brain type (corrupted workflow JSON)', () => {
      vi.stubGlobal('navigator', {})
      const result = resolveAgentBrain('hacker-brain' as never, {})
      expect(['local', 'transformers']).toContain(result.brain)
      expect(result.fallbackNote).toBeDefined()
    })
  })

  describe('WebLLM — singleton & concurrency paths', () => {
    it('skips re-init when same model already loaded', async () => {
      const { initWebLLM, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      await initWebLLM('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
      mockCreate.mockClear()
      await initWebLLM('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('deduplicates concurrent init calls (slow download on 3G)', async () => {
      const { initWebLLM, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      let resolveCreate!: (v: unknown) => void
      const pending = new Promise((resolve) => {
        resolveCreate = resolve
      })
      mockCreate.mockReturnValue(pending)
      const p1 = initWebLLM('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
      await Promise.resolve()
      const p2 = initWebLLM('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
      resolveCreate({
        unload: mockUnload,
        chat: { completions: { create: mockChatCompletions } },
      })
      await Promise.all([p1, p2])
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('throws when engine fails to initialize after download', async () => {
      const { webLLMEngine, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      mockCreate.mockResolvedValue(null)
      await expect(webLLMEngine.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        /Failed to initialize WebLLM/
      )
    })

    it('returns response without usage block when API omits tokens', async () => {
      const { webLLMEngine, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      mockCreate.mockResolvedValue({
        unload: mockUnload,
        chat: { completions: { create: mockChatCompletions } },
      })
      mockChatCompletions.mockResolvedValue({
        choices: [{ message: { content: 'No usage field' } }],
      })
      const result = await webLLMEngine.chat([{ role: 'user', content: 'Hi' }])
      expect(result.content).toBe('No usage field')
      expect(result.usage).toBeUndefined()
    })

    it('handles empty choices content in WebLLM response', async () => {
      vi.stubGlobal('navigator', { gpu: {} })
      mockChatCompletions.mockResolvedValue({ choices: [{}] })
      const { webLLMEngine, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      mockCreate.mockResolvedValue({
        unload: mockUnload,
        chat: { completions: { create: mockChatCompletions } },
      })
      const result = await webLLMEngine.chat([{ role: 'user', content: 'Hi' }])
      expect(result.content).toBe('')
    })

    it('reloads engine when chat requests different model', async () => {
      const { webLLMEngine, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      await webLLMEngine.chat([{ role: 'user', content: 'first' }])
      mockCreate.mockClear()
      await webLLMEngine.chat(
        [{ role: 'user', content: 'second' }],
        { model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC' }
      )
      expect(mockCreate).toHaveBeenCalled()
    })

    it('reports usage tokens when API includes them', async () => {
      const { webLLMEngine, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      mockCreate.mockResolvedValue({
        unload: mockUnload,
        chat: { completions: { create: mockChatCompletions } },
      })
      mockChatCompletions.mockResolvedValue({
        choices: [{ message: { content: 'Counted' } }],
        usage: { prompt_tokens: 9, completion_tokens: 3 },
      })
      const result = await webLLMEngine.chat([{ role: 'user', content: 'Hi' }])
      expect(result.usage).toEqual({ promptTokens: 9, completionTokens: 3 })
    })

    it('coalesces null usage token fields to zero', async () => {
      const { webLLMEngine, unloadWebLLM } = await import('../src/engines/webllm')
      await unloadWebLLM()
      mockCreate.mockResolvedValue({
        unload: mockUnload,
        chat: { completions: { create: mockChatCompletions } },
      })
      mockChatCompletions.mockResolvedValue({
        choices: [{ message: { content: 'OK' } }],
        usage: { prompt_tokens: null, completion_tokens: null },
      })
      const result = await webLLMEngine.chat([{ role: 'user', content: 'Hi' }])
      expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
    })
  })

  describe('Transformers.js — singleton & failure paths', () => {
    it('skips re-init when same model already loaded', async () => {
      vi.resetModules()
      const { initTransformers } = await import('../src/engines/transformers')
      await initTransformers('Xenova/distilgpt2')
      mockPipeline.mockClear()
      await initTransformers('Xenova/distilgpt2')
      expect(mockPipeline).not.toHaveBeenCalled()
    })

    it('deduplicates concurrent pipeline downloads', async () => {
      vi.resetModules()
      const { initTransformers } = await import('../src/engines/transformers')
      let resolvePipe!: (v: unknown) => void
      const pending = new Promise((resolve) => {
        resolvePipe = resolve
      })
      mockPipeline.mockReturnValue(pending)
      const p1 = initTransformers('Xenova/distilgpt2')
      await Promise.resolve()
      const p2 = initTransformers('Xenova/distilgpt2')
      resolvePipe((text: string) => Promise.resolve([{ generated_text: text }]))
      await Promise.all([p1, p2])
      expect(mockPipeline).toHaveBeenCalledTimes(1)
    })

    it('throws when pipeline fails to initialize', async () => {
      vi.resetModules()
      mockPipeline.mockResolvedValue(null)
      const { transformersEngine } = await import('../src/engines/transformers')
      await expect(
        transformersEngine.chat([{ role: 'user', content: 'Hi' }])
      ).rejects.toThrow(/Failed to initialize/)
    })

    it('handles empty generated output array', async () => {
      vi.resetModules()
      mockPipeline.mockResolvedValue(() => Promise.resolve([]))
      const { transformersEngine } = await import('../src/engines/transformers')
      const result = await transformersEngine.chat([{ role: 'user', content: 'Hi' }])
      expect(result.content).toBe('')
    })

    it('uses raw fallback when assistant split yields empty trimmed segment', async () => {
      vi.resetModules()
      mockPipeline.mockResolvedValue((text: string) =>
        Promise.resolve([{ generated_text: `${text}\nassistant:` }])
      )
      const { transformersEngine } = await import('../src/engines/transformers')
      const result = await transformersEngine.chat([{ role: 'user', content: 'Hi' }])
      expect(result.content).toBe('')
    })

    it('reuses pipeline for consecutive chats with same model', async () => {
      vi.resetModules()
      const { transformersEngine } = await import('../src/engines/transformers')
      await transformersEngine.chat([{ role: 'user', content: 'first' }])
      mockPipeline.mockClear()
      await transformersEngine.chat([{ role: 'user', content: 'second' }])
      expect(mockPipeline).not.toHaveBeenCalled()
    })

    it('reloads pipeline when chat requests different model', async () => {
      vi.resetModules()
      const mod = await import('../src/engines/transformers')
      await mod.transformersEngine.chat([{ role: 'user', content: 'first' }])
      mockPipeline.mockClear()
      await mod.transformersEngine.chat(
        [{ role: 'user', content: 'second' }],
        { model: 'Xenova/LaMini-Flan-T5-783M' }
      )
      expect(mockPipeline).toHaveBeenCalled()
    })
  })

  describe('DAG orchestrator — remaining execution paths', () => {
    beforeEach(() => {
      mockEngineChat.mockReset()
      mockEngineChat.mockResolvedValue({ content: 'ok', model: 'mock' })
    })

    it('uses explicit startNodeId when workflow has multiple chat triggers', async () => {
      const chatA = makeChat('chat-a')
      const chatB = makeChat('chat-b')
      const agent = makeAgent('agent')
      const orch = new DAGOrchestrator(
        [chatA, chatB, agent],
        [edge('e1', 'chat-b', 'agent')],
        {}
      )
      const out = await orch.execute('from B', 'chat-b')
      expect(out).toBe('ok')
    })

    it('executes secondary chat node returning its stored variable', async () => {
      const primary = makeChat('primary')
      const secondary = makeChat('secondary')
      const orch = new DAGOrchestrator(
        [primary, secondary],
        [edge('e', 'primary', 'secondary')],
        {}
      )
      const out = await orch.execute('trigger text')
      expect(out).toBe('trigger text')
    })

    it('reports error for unknown tool type while preserving trigger input', async () => {
      const chat = makeChat('c')
      const customTool = {
        id: 't',
        type: 'tool',
        position: { x: 0, y: 0 },
        data: { label: 'OCR', toolType: 'legacy-plugin' },
      }
      const orch = new DAGOrchestrator(
        [chat, customTool as never],
        [edge('e', 'c', 't')],
        {}
      )
      const out = await orch.execute('raw document text')
      expect(out).toContain('raw document text')
      expect(out).toContain('Unknown tool: legacy-plugin')
    })

    it('works with default noop logger when log omitted', async () => {
      const chat = makeChat('c')
      const orch = new DAGOrchestrator([chat], [], {})
      await expect(orch.execute('silent run')).resolves.toBe('silent run')
    })

    it('agent with no upstream edges receives user message context', async () => {
      const chat = makeChat('c')
      const orphanAgent = makeAgent('orphan')
      const orch = new DAGOrchestrator(
        [chat, orphanAgent],
        [edge('e', 'c', 'orphan')],
        {}
      )
      await orch.execute('hello')
      expect(mockEngineChat).toHaveBeenCalled()
      const firstCall = mockEngineChat.mock.calls[0]
      expect(firstCall).toBeDefined()
      const messages = firstCall![0] as Array<{ role: string; content: string }>
      const userMsg = messages.find((m) => m.role === 'user')
      expect(userMsg?.content).toContain('## User message')
      expect(userMsg?.content).toContain('hello')
      expect(mockEngineChat).toHaveBeenCalledOnce()
    })
  })
})

describe('modelLoadStore — setLoading branches', () => {
  it('clears loading state when setLoading(false)', () => {
    useModelLoadStore.getState().setLoading(true, 'WebLLM')
    useModelLoadStore.getState().setLoading(false)
    expect(useModelLoadStore.getState().isLoading).toBe(false)
    expect(useModelLoadStore.getState().progress).toBe(0)
  })
})
