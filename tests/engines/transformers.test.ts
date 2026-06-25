import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPipeline = vi.fn()

vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: false, useBrowserCache: true },
}))

describe('Transformers.js — runs on potato PCs', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockPipeline.mockReset()
    mockPipeline.mockResolvedValue((text: string) =>
      Promise.resolve([{ generated_text: text + '\nassistant: Yes, for free.' }])
    )
  })

  async function loadEngine() {
    const mod = await import('../../src/engines/transformers')
    return mod.transformersEngine
  }

  it('is always available in browser (no GPU required)', async () => {
    const engine = await loadEngine()
    expect(engine.isAvailable()).toBe(true)
  })

  it('extracts assistant reply from generated text', async () => {
    const engine = await loadEngine()
    const result = await engine.chat([{ role: 'user', content: 'Can I use AI for free?' }])
    expect(result.content).toBe('Yes, for free.')
  })

  it('handles model without assistant delimiter', async () => {
    mockPipeline.mockResolvedValue((text: string) =>
      Promise.resolve([{ generated_text: `${text}extra tokens` }])
    )
    const engine = await loadEngine()
    const result = await engine.chat([{ role: 'user', content: 'Hi' }])
    expect(result.content).toContain('extra tokens')
  })

  it('loads pipeline with browser cache on first chat', async () => {
    const engine = await loadEngine()
    await engine.chat([{ role: 'user', content: 'Trigger load' }])
    expect(mockPipeline).toHaveBeenCalledWith(
      'text-generation',
      expect.stringContaining('Xenova'),
      { dtype: 'q8' }
    )
  })

  it('reloads pipeline when model changes', async () => {
    const mod = await import('../../src/engines/transformers')
    await mod.initTransformers('Xenova/distilgpt2')
    mockPipeline.mockClear()
    mockPipeline.mockResolvedValue((text: string) =>
      Promise.resolve([{ generated_text: text }])
    )
    await mod.initTransformers('Xenova/LaMini-Flan-T5-783M')
    expect(mockPipeline).toHaveBeenCalled()
  })
})
