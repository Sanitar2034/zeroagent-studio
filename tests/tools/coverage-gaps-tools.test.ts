import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isBrowserFeatureAvailable } from '../../src/tools/registry'
import { CUSTOM_SCRIPT_HELPERS } from '../../src/tools/customScript'
import { runCalculator, safeEvaluateMath } from '../../src/tools/calculator'
import { runDatetimeTool } from '../../src/tools/datetimeTool'
import { runJsonTool } from '../../src/tools/jsonTool'
import { runTextTransform } from '../../src/tools/textTransform'
import { transcribeWithGroq } from '../../src/tools/groqTranscribe'
import { describeImageWithGemini, pickImageFile } from '../../src/tools/geminiVision'
import {
  fetchOpenRouterEmbeddingModels,
  OPENROUTER_EMBEDDINGS_CACHE_KEY,
} from '../../src/tools/openrouterEmbeddings'
import { DAGOrchestrator } from '../../src/orchestrator/dag'
import { makeChat, makeTool, edge } from '../helpers/graphBuilders'
import type { ToolNodeData } from '../../src/types'

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
    getState: () => ({ updateNodeData: vi.fn() }),
  },
}))

describe('tool branch coverage gaps', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('covers registry browser feature branches', async () => {
    const speech = await import('../../src/tools/speech')
    const clipboard = await import('../../src/tools/clipboardTool')
    vi.spyOn(speech, 'isSpeechSynthesisAvailable').mockReturnValue(true)
    vi.spyOn(clipboard, 'isClipboardAvailable').mockReturnValue(false)

    expect(
      isBrowserFeatureAvailable({ kind: 'browser', feature: 'speechSynthesis' })
    ).toBe(true)
    expect(isBrowserFeatureAvailable({ kind: 'browser', feature: 'clipboard' })).toBe(false)
    expect(
      isBrowserFeatureAvailable({ kind: 'browser', feature: 'unknown' as never })
    ).toBe(true)
  })

  it('exercises custom script helpers', () => {
    expect(CUSTOM_SCRIPT_HELPERS.trim(' hi ')).toBe('hi')
    expect(CUSTOM_SCRIPT_HELPERS.jsonParse('{"a":1}')).toEqual({ a: 1 })
    expect(CUSTOM_SCRIPT_HELPERS.jsonStringify({ b: 2 })).toBe('{"b":2}')
    expect(CUSTOM_SCRIPT_HELPERS.regex('\\d+').test('42')).toBe(true)
  })

  it('covers text transform default mode', () => {
    expect(runTextTransform('  hi  ', {})).toBe('hi')
  })

  it('covers calculator and datetime defaults', () => {
    expect(() => safeEvaluateMath('')).toThrow(/No expression/)
    expect(runCalculator('3+3', {})).toBe('6')
    expect(runDatetimeTool('', {})).toBeTruthy()
    expect(runDatetimeTool('', { mode: 'parse', value: '2024-06-01' })).toContain('2024')
    expect(runDatetimeTool('   ', { mode: 'parse', value: '2024-07-01' })).toContain('2024-07')
    expect(() => runJsonTool('{"a":1}', { mode: 'get' })).toThrow(/config.path/)
    expect(runJsonTool('{"a":1}', {})).toContain('\n')
  })

  it('uses custom regex flags and open-ended slice', () => {
    expect(runTextTransform('id:42', { mode: 'regex', pattern: '\\d+', flags: 'i' })).toBe('42')
    expect(runTextTransform('hello', { mode: 'slice', start: '1' })).toBe('ello')
  })

  it('covers text transform edge branches', () => {
    expect(runTextTransform('a\n\nb', { mode: 'split' })).toBe('a\nb')
    expect(runTextTransform('none', { mode: 'regex', pattern: 'zzz' })).toBe('')
    expect(runTextTransform('abc', { mode: 'slice', start: '1' })).toBe('bc')
    expect(() => runTextTransform('x', { mode: 'replace' })).toThrow(/pattern/)
  })

  it('handles empty groq transcript and gemini vision fallbacks', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
    const file = new File(['a'], 'a.webm')
    await expect(transcribeWithGroq('key', file)).resolves.toBe('')

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [] } }] }),
    } as Response)
    await expect(describeImageWithGemini('key', 'p', 'b', 'image/jpeg')).resolves.toBe('')

    const input = {
      type: '',
      accept: '',
      get files() {
        return [new File(['x'], 'pic.bin', { type: '' })] as unknown as FileList
      },
      click: vi.fn(() => queueMicrotask(() => input.onchange?.())),
      onchange: null as (() => void) | null,
    }
    vi.spyOn(document, 'createElement').mockReturnValue(input as unknown as HTMLInputElement)
    const picked = await pickImageFile()
    expect(picked.mimeType).toBe('image/jpeg')
  })

  it('ignores corrupt openrouter embedding cache', async () => {
    localStorage.setItem(OPENROUTER_EMBEDDINGS_CACHE_KEY, '{bad json')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'openai/text-embedding-3-small' }] }),
    } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models.length).toBeGreaterThan(0)
  })

  it('falls back when embedding model fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network'))
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models[0]).toBe('openai/text-embedding-3-small')
  })

  it('uses node id when tool label missing in DAG logs', async () => {
    const logs: { source: string; message: string; level: string }[] = []
    const registry = await import('../../src/tools/registry')
    const baseGetTool = registry.getTool
    vi.spyOn(registry, 'getTool').mockImplementation((id) => {
      const tool = baseGetTool(id)
      if (id !== 'text-transform') return tool
      return {
        ...tool,
        run: async (input, config, ctx) => {
          ctx.log('info', 'diagnostic')
          return baseGetTool('text-transform').run(input, config, ctx)
        },
      }
    })

    const chat = makeChat('c')
    const tool = makeTool('tool-node', 'text-transform', { mode: 'trim' })
    ;(tool.data as ToolNodeData).label = ''
    const orch = new DAGOrchestrator(
      [chat, tool],
      [edge('e', 'c', 'tool-node')],
      {},
      (e) => logs.push({ source: e.source, message: e.message, level: e.level })
    )
    await orch.execute('  ok  ')
    expect(logs.some((l) => l.source === 'tool-node' && l.message.includes('chars output'))).toBe(
      true
    )
    expect(logs.some((l) => l.source === 'tool-node' && l.message === 'diagnostic')).toBe(true)
    vi.restoreAllMocks()
  })
})
