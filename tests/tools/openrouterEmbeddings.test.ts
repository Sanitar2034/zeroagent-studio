import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  embedTextWithOpenRouter,
  fetchOpenRouterEmbeddingModels,
  runOpenRouterEmbeddings,
  resetOpenRouterEmbeddingsCacheForTests,
  OPENROUTER_EMBEDDINGS_CACHE_KEY,
} from '../../src/tools/openrouterEmbeddings'

describe('openrouterEmbeddings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    resetOpenRouterEmbeddingsCacheForTests()
  })

  it('fetches embedding models and caches them', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'openai/text-embedding-3-small' }] }),
    } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk-or-test')
    expect(models).toContain('openai/text-embedding-3-small')
    await fetchOpenRouterEmbeddingModels('sk-or-test')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns default model without API key', async () => {
    const models = await fetchOpenRouterEmbeddingModels('')
    expect(models[0]).toBe('openai/text-embedding-3-small')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('falls back when fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models).toContain('openai/text-embedding-3-small')
  })

  it('uses stale cache when fetch fails after cache write', async () => {
    localStorage.setItem(
      OPENROUTER_EMBEDDINGS_CACHE_KEY,
      JSON.stringify({
        models: ['cached/model'],
        fetchedAt: Date.now() - 48 * 60 * 60 * 1000,
      })
    )
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models).toContain('cached/model')
  })

  it('embeds via OpenRouter API', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.5, 0.5] }] }),
    } as Response)
    const vector = await embedTextWithOpenRouter('sk', 'hello', 'openai/text-embedding-3-small')
    expect(vector.length).toBe(2)
  })

  it('throws on embed API error and empty vector', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'nope',
    } as Response)
    await expect(embedTextWithOpenRouter('sk', 'x', 'm')).rejects.toThrow(/401/)

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [] }] }),
    } as Response)
    await expect(embedTextWithOpenRouter('sk', 'x', 'm')).rejects.toThrow(/empty embedding/)
  })

  it('runs embed and similarity modes', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('/models')) {
        return {
          ok: true,
          json: async () => ({ data: [{ id: 'openai/text-embedding-3-small' }] }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({ data: [{ embedding: [1, 0] }] }),
      } as Response
    })

    const embed = await runOpenRouterEmbeddings('sk', 'hello', { mode: 'embed' })
    expect(embed).toContain('Embedding')

    const sim = await runOpenRouterEmbeddings('sk', 'hello', {
      mode: 'similarity',
      reference: 'hi',
    })
    expect(sim).toContain('Similarity')
  })

  it('requires API key, text, and reference', async () => {
    await expect(runOpenRouterEmbeddings('', 'hello', {})).rejects.toThrow(/OpenRouter/)
    await expect(runOpenRouterEmbeddings('sk', ' ', {})).rejects.toThrow(/No text/)
    await expect(
      runOpenRouterEmbeddings('sk', 'hello', { mode: 'similarity' })
    ).rejects.toThrow(/reference/)
  })

  it('uses explicit embedding model from config', async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes('/models')) {
        return {
          ok: true,
          json: async () => ({ data: [{ id: 'openai/text-embedding-3-small' }] }),
        } as Response
      }
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.model).toBe('custom/model')
      return {
        ok: true,
        json: async () => ({ data: [{ embedding: [1, 0] }] }),
      } as Response
    })
    const out = await runOpenRouterEmbeddings('sk', 'hello', {
      mode: 'embed',
      model: 'custom/model',
    })
    expect(out).toContain('custom/model')
  })

  it('handles API response without data array', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models[0]).toBe('openai/text-embedding-3-small')
  })

  it('skips blank model ids from API list', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: '' }, { id: 'openai/text-embedding-3-small' }] }),
    } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models).toEqual(['openai/text-embedding-3-small'])
  })

  it('uses default model when cached list is empty', async () => {
    localStorage.setItem(
      OPENROUTER_EMBEDDINGS_CACHE_KEY,
      JSON.stringify({ models: [], fetchedAt: Date.now() })
    )
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models).toEqual([])

    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes('/models')) {
        return { ok: false, status: 500 } as Response
      }
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.model).toBe('openai/text-embedding-3-small')
      return {
        ok: true,
        json: async () => ({ data: [{ embedding: [1] }] }),
      } as Response
    })
    const out = await runOpenRouterEmbeddings('sk', 'hello', { mode: 'embed' })
    expect(out).toContain('openai/text-embedding-3-small')
  })

  it('handles missing localStorage during cache write', async () => {
    vi.stubGlobal('localStorage', undefined)
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'vendor/model' }] }),
    } as Response)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models).toEqual(['vendor/model'])
  })

  it('handles missing localStorage', async () => {
    vi.stubGlobal('localStorage', undefined)
    const models = await fetchOpenRouterEmbeddingModels('sk')
    expect(models[0]).toBe('openai/text-embedding-3-small')
    resetOpenRouterEmbeddingsCacheForTests()
  })
})
