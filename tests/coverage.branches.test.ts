import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGroqEngine } from '../src/engines/groq'
import { createGeminiEngine } from '../src/engines/gemini'
import { createOpenRouterEngine } from '../src/engines/openrouter'
import { resolveAgentBrain } from '../src/lib/brainResolver'
import { DAGOrchestrator } from '../src/orchestrator/dag'
import { makeChat, makeAgent, makeTool, edge } from './helpers/graphBuilders'
import { scrapeWebPage } from '../src/tools/webScraper'

const mockChat = vi.fn()
const mockEngine = {
  name: 'Mock',
  isAvailable: vi.fn(() => true),
  chat: mockChat,
}

vi.mock('../src/engines', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/engines')>()
  return { ...actual, getEngine: vi.fn(() => mockEngine) }
})

vi.mock('../src/tools/webScraper', () => ({
  scrapeWebPage: vi.fn(async () => ({ url: 'u', title: 'T', text: 'x', links: [] })),
}))

vi.mock('../src/tools/fileReader', () => ({
  readLocalFile: vi.fn(async () => ({ name: 'f', content: 'c', size: 1, type: 'text/plain' })),
}))

vi.mock('../src/tools/speech', () => ({
  runSpeechTool: vi.fn(async () => 'spoken'),
  isSpeechRecognitionAvailable: vi.fn(() => true),
  isSpeechSynthesisAvailable: vi.fn(() => true),
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

describe('branch coverage — nullish coalescing & DAG conditionals', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    mockChat.mockReset()
    mockChat.mockResolvedValue({
      content: 'A'.repeat(600),
      model: 'm',
      usage: { promptTokens: 1, completionTokens: 2 },
    })
  })

  describe('engine factories — empty key fallbacks', () => {
    it('Groq coalesces missing message content and null usage tokens', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{}],
          model: undefined,
          usage: { prompt_tokens: undefined, completion_tokens: undefined },
        }),
      } as Response)
      const result = await createGroqEngine('key').chat([{ role: 'user', content: 'x' }])
      expect(result.content).toBe('')
      expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
    })

    it('Gemini coalesces null usage token counts', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
          usageMetadata: {},
        }),
      } as Response)
      const result = await createGeminiEngine('key').chat([{ role: 'user', content: 'x' }])
      expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
    })

    it('OpenRouter coalesces null usage token counts', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: {} }],
          model: undefined,
          usage: {},
        }),
      } as Response)
      const result = await createOpenRouterEngine('key').chat([{ role: 'user', content: 'x' }])
      expect(result.content).toBe('')
      expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
    })
  })

  describe('brainResolver — model fallback branch', () => {
    it('preserves user model on successful brain resolution', () => {
      const result = resolveAgentBrain('transformers', {}, 'user-model')
      expect(result.model).toBe('user-model')
    })
  })

  describe('DAG — agent/tool logging branches', () => {
    it('logs agent without label using node id', async () => {
      const logs: { source: string }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('agent-id', { label: undefined, systemPrompt: '' })
      const orch = new DAGOrchestrator([chat, agent], [edge('e', 'c', 'agent-id')], {}, (e) =>
        logs.push({ source: e.source })
      )
      await orch.execute('hi')
      expect(logs.some((l) => l.source === 'agent-id')).toBe(true)
    })

    it('truncates thought log when response exceeds 500 chars', async () => {
      const logs: { level: string; message: string }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([chat, agent], [edge('e', 'c', 'a')], {}, (e) =>
        logs.push({ level: e.level, message: e.message })
      )
      await orch.execute('hi')
      const thought = logs.find((l) => l.level === 'thought' && l.message.includes('...'))
      expect(thought).toBeDefined()
    })

    it('logs non-Error throws as string in catch block', async () => {
      mockChat.mockRejectedValueOnce('string failure')
      const logs: { level: string; message: string }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([chat, agent], [edge('e', 'c', 'a')], {}, (e) =>
        logs.push({ level: e.level, message: e.message })
      )
      await orch.execute('hi')
      expect(logs.some((l) => l.level === 'error' && l.message.includes('string failure'))).toBe(
        true
      )
    })

    it('merges upstream toolResults into agent input', async () => {
      const chat = makeChat('c')
      const tool = makeTool('t', 'text-transform', { mode: 'trim' })
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator(
        [chat, tool, agent],
        [edge('e1', 'c', 't'), edge('e2', 't', 'a')],
        {}
      )
      await orch.execute('upstream')
      const userMsg = mockChat.mock.calls[0][0].find((m: { role: string }) => m.role === 'user')
      expect(userMsg.content).toContain('upstream')
    })

    it('web scraper uses config url when upstream input empty', async () => {
      const { scrapeWebPage } = await import('../src/tools/webScraper')
      const chat = makeChat('c')
      const scraper = makeTool('t', 'web-scraper', { url: 'docs.example.com' })
      const orch = new DAGOrchestrator([chat, scraper], [edge('e', 'c', 't')], {})
      await orch.execute('')
      expect(scrapeWebPage).toHaveBeenCalledWith('https://docs.example.com/')
    })

    it('web scraper keeps https URL without double prefix', async () => {
      const { scrapeWebPage } = await import('../src/tools/webScraper')
      const chat = makeChat('c')
      const scraper = makeTool('t', 'web-scraper')
      const orch = new DAGOrchestrator([chat, scraper], [edge('e', 'c', 't')], {})
      await orch.execute('https://already.secure.com')
      expect(scrapeWebPage).toHaveBeenCalledWith('https://already.secure.com/')
    })

    it('runs speech tool with default STT mode in DAG', async () => {
      const { runSpeechTool } = await import('../src/tools/speech')
      const chat = makeChat('c')
      const speech = makeTool('t', 'speech')
      const orch = new DAGOrchestrator([chat, speech], [edge('e', 'c', 't')], {})
      await orch.execute('say this')
      expect(runSpeechTool).toHaveBeenCalledWith(
        'say this',
        expect.objectContaining({ mode: 'stt', language: 'en-US' })
      )
    })

    it('agent includes system prompt when configured', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a', { systemPrompt: 'You are a tutor' })
      const orch = new DAGOrchestrator([chat, agent], [edge('e', 'c', 'a')], {})
      await orch.execute('teach me')
      const messages = mockChat.mock.calls[0][0]
      expect(messages.some((m: { role: string }) => m.role === 'system')).toBe(true)
    })

    it('stops agent when engine reports unavailable', async () => {
      mockEngine.isAvailable.mockReturnValueOnce(false)
      const logs: { level: string }[] = []
      const chat = makeChat('c')
      const agent = makeAgent('a')
      const orch = new DAGOrchestrator([chat, agent], [edge('e', 'c', 'a')], {}, (e) =>
        logs.push({ level: e.level })
      )
      await orch.execute('hi')
      expect(mockChat).not.toHaveBeenCalled()
      expect(logs.some((l) => l.level === 'error')).toBe(true)
    })

    it('uses agent node model when resolved brain omits model', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('a', { brain: 'transformers', model: 'Xenova/custom-tuned' })
      const orch = new DAGOrchestrator([chat, agent], [edge('e', 'c', 'a')], {})
      await orch.execute('run')
      expect(mockChat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ model: 'Xenova/custom-tuned' })
      )
    })

    it('logs tool node with id when label missing', async () => {
      const logs: { source: string }[] = []
      const chat = makeChat('c')
      const tool = {
        id: 'tool-raw',
        type: 'tool',
        position: { x: 0, y: 0 },
        data: { toolType: 'legacy-plugin' },
      }
      const orch = new DAGOrchestrator([chat, tool as never], [edge('e', 'c', 'tool-raw')], {}, (e) =>
        logs.push({ source: e.source })
      )
      await orch.execute('data')
      expect(logs.some((l) => l.source === 'tool-raw')).toBe(true)
    })

    it('appends assistant message when chat history is undefined', async () => {
      const chat = {
        id: 'c',
        type: 'chat',
        position: { x: 0, y: 0 },
        data: { label: 'Chat' },
      }
      const orch = new DAGOrchestrator([chat as never], [], {})
      await orch.execute('first message')
      expect(mockChat).not.toHaveBeenCalled()
    })

    it('skips agent not connected to chat trigger', async () => {
      const chat = makeChat('c')
      const agent = makeAgent('solo')
      const orch = new DAGOrchestrator([chat, agent], [], {})
      await orch.execute('hi')
      expect(mockChat).not.toHaveBeenCalled()
    })
  })
})

describe('webScraper — parser edge branches', () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import('../src/tools/webScraper')>(
      '../src/tools/webScraper'
    )
    vi.mocked(scrapeWebPage).mockImplementation(actual.scrapeWebPage)
    vi.stubGlobal('fetch', vi.fn())
  })

  function mockDirectHtml(html: string) {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) {
        return { ok: false, status: 502, text: async () => '' } as Response
      }
      return { ok: true, text: async () => html } as Response
    })
  }

  it('handles document without body element', async () => {
    const html = '<html><head><title>T</title></head></html>'
    mockDirectHtml(html)
    const result = await scrapeWebPage('https://no-body.test')
    expect(result.text).toBe('')
  })

  it('skips empty href values when collecting links', async () => {
    const html = `<html><body>
      <a href="">empty</a>
      <a href="https://valid.com">ok</a>
    </body></html>`
    mockDirectHtml(html)
    const result = await scrapeWebPage('https://href.test')
    expect(result.links).toEqual(['https://valid.com'])
  })

  it('normalizes whitespace-only body text to empty string', async () => {
    const html = '<html><body>     \n\t   </body></html>'
    mockDirectHtml(html)
    const result = await scrapeWebPage('https://blank.test')
    expect(result.text).toBe('')
  })

  it('throws generic error when proxies fail without capturing lastError', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) {
        return { ok: false, status: 502, text: async () => '' } as Response
      }
      if (!String(url).includes('proxy') && !String(url).includes('allorigins') && !String(url).includes('codetabs')) {
        throw new Error('CORS')
      }
      return { ok: false, status: 500, text: async () => '' } as Response
    })
    await expect(scrapeWebPage('https://fail.test')).rejects.toThrow(/Could not fetch|HTTP|500/)
  })

  it('limits collected links to 20 per page', async () => {
    const links = Array.from({ length: 25 }, (_, i) => `<a href="https://link${i}.com">L</a>`).join(
      ''
    )
    const html = `<html><body>${links}</body></html>`
    mockDirectHtml(html)
    const result = await scrapeWebPage('https://many-links.test')
    expect(result.links).toHaveLength(20)
  })

  it('filters relative links and null href attributes', async () => {
    const html = `<html><body>
      <a href="https://absolute.com">ok</a>
      <a href="/relative">skip</a>
      <a>no href</a>
    </body></html>`
    mockDirectHtml(html)
    const result = await scrapeWebPage('https://links.test')
    expect(result.links).toEqual(['https://absolute.com'])
  })
})
