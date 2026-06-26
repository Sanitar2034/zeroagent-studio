import { describe, it, expect, vi, beforeEach } from 'vitest'
import { embedTextWithGemini, runGeminiEmbeddings } from '../../src/tools/geminiEmbeddings'

describe('geminiEmbeddings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('embeds text', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [1, 0, 0] } }),
    } as Response)
    const vector = await embedTextWithGemini('key', 'hello')
    expect(vector).toEqual([1, 0, 0])
  })

  it('throws on API and empty embedding', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'fail',
    } as Response)
    await expect(embedTextWithGemini('key', 'x')).rejects.toThrow(/500/)

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [] } }),
    } as Response)
    await expect(embedTextWithGemini('key', 'x')).rejects.toThrow(/empty embedding/)
  })

  it('runs embed mode', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [1, 2, 3] } }),
    } as Response)
    const result = await runGeminiEmbeddings('key', 'hello', { mode: 'embed' })
    expect(result).toContain('Embedding')
  })

  it('requires API key and input text', async () => {
    await expect(runGeminiEmbeddings('', 'hello', {})).rejects.toThrow(/Gemini API key/)
    await expect(runGeminiEmbeddings('key', '  ', {})).rejects.toThrow(/No text/)
  })

  it('runs similarity mode', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [1, 0] } }),
    } as Response)
    const result = await runGeminiEmbeddings('key', 'hello', {
      mode: 'similarity',
      reference: 'hi',
    })
    expect(result).toContain('Similarity:')
  })

  it('requires reference for similarity', async () => {
    await expect(runGeminiEmbeddings('key', 'hello', { mode: 'similarity' })).rejects.toThrow(
      /reference/
    )
  })
})
