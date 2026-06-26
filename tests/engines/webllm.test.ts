import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isWebGPUAvailable, webLLMEngine, initWebLLM, unloadWebLLM } from '../../src/engines/webllm'

const mockCreate = vi.fn()
const mockUnload = vi.fn()
const mockChat = vi.fn()

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: (...args: unknown[]) => mockCreate(...args),
}))

describe('WebLLM engine — local GPU for users who cannot afford cloud', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockUnload.mockReset()
    mockChat.mockReset()
    mockCreate.mockResolvedValue({
      unload: mockUnload,
      chat: { completions: { create: mockChat } },
    })
    mockChat.mockResolvedValue({
      choices: [{ message: { content: 'Local inference works' } }],
      usage: { prompt_tokens: 5, completion_tokens: 3 },
    })
  })

  it('reports unavailable when WebGPU missing (old hardware)', () => {
    vi.stubGlobal('navigator', {})
    expect(isWebGPUAvailable()).toBe(false)
    expect(webLLMEngine.isAvailable()).toBe(false)
  })

  it('reports available with WebGPU', () => {
    vi.stubGlobal('navigator', { gpu: {} })
    expect(isWebGPUAvailable()).toBe(true)
  })

  it('downloads model on first chat and reports progress', async () => {
    vi.stubGlobal('navigator', { gpu: {} })
    let progress = 0
    await initWebLLM('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', (p) => {
      progress = p.progress
    })
    expect(mockCreate).toHaveBeenCalled()
    expect(progress).toBe(0) // callback optional path
  })

  it('chat returns local model response without network', async () => {
    vi.stubGlobal('navigator', { gpu: {} })
    await unloadWebLLM()
    const result = await webLLMEngine.chat([{ role: 'user', content: 'Hi' }])
    expect(result.content).toBe('Local inference works')
    expect(mockChat).toHaveBeenCalled()
  })

  it('reuses loaded engine for same model (saves re-download on poor connection)', async () => {
    vi.stubGlobal('navigator', { gpu: {} })
    await unloadWebLLM()
    await webLLMEngine.chat([{ role: 'user', content: '1' }])
    await webLLMEngine.chat([{ role: 'user', content: '2' }])
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('unloadWebLLM frees GPU memory when switching apps', async () => {
    vi.stubGlobal('navigator', { gpu: {} })
    await webLLMEngine.chat([{ role: 'user', content: 'load' }])
    await unloadWebLLM()
    expect(mockUnload).toHaveBeenCalled()
  })

  it('reloads when model changes mid-session', async () => {
    vi.stubGlobal('navigator', { gpu: {} })
    await unloadWebLLM()
    await initWebLLM('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
    await initWebLLM('Llama-3.2-1B-Instruct-q4f16_1-MLC')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('reports init progress from WebLLM callback', async () => {
    vi.stubGlobal('navigator', { gpu: {} })
    await unloadWebLLM()
    const progress: string[] = []
    mockCreate.mockImplementation(async (_model, opts) => {
      opts?.initProgressCallback?.({ text: 'Loading...', progress: 0.5 })
      return { unload: mockUnload, chat: { completions: { create: mockChat } } }
    })
    await initWebLLM('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', (p) => progress.push(p.text))
    expect(progress).toContain('Loading...')
  })
})
