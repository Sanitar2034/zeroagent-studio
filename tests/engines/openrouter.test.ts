import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createOpenRouterEngine,
  OPENROUTER_FREE_ROUTER,
  fetchOpenRouterFreeModels,
  resetOpenRouterModelsCacheForTests,
} from '../../src/engines/openrouter'
import { resetModelCooldownsForTests } from '../../src/lib/modelRotation'

function mockModelsThenChat(...chatResponses: Response[]) {
  let chatIndex = 0
  vi.mocked(fetch).mockImplementation(async (url, init) => {
    if (String(url).includes('/api/v1/models')) {
      return { ok: true, json: async () => ({ data: [] }) } as Response
    }
    if (init?.method === 'POST') {
      const response = chatResponses[chatIndex++]
      if (!response) throw new Error('Unexpected chat call')
      return response
    }
    return { ok: false, status: 404, text: async () => '' } as Response
  })
}

describe('OpenRouter engine — free tier with rotation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } } as Window & typeof globalThis)
    resetModelCooldownsForTests()
    resetOpenRouterModelsCacheForTests()
  })

  it('is unavailable without key', () => {
    expect(createOpenRouterEngine('').isAvailable()).toBe(false)
  })

  it('defaults to openrouter/free auto router', async () => {
    mockModelsThenChat({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Free response' } }],
        model: OPENROUTER_FREE_ROUTER,
      }),
    } as Response)

    const engine = createOpenRouterEngine('sk-or-test')
    const result = await engine.chat([{ role: 'user', content: 'Hi' }])

    expect(result.content).toBe('Free response')
    const postCall = vi.mocked(fetch).mock.calls.find((c) => (c[1] as RequestInit)?.method === 'POST')
    const body = JSON.parse((postCall?.[1] as RequestInit).body as string)
    expect(body.model).toBe(OPENROUTER_FREE_ROUTER)
  })

  it('retries on 404 with next free model', async () => {
    mockModelsThenChat(
      {
        ok: false,
        status: 404,
        text: async () => 'No endpoints found for stale/model:free',
      } as Response,
      {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Recovered' } }],
          model: 'meta-llama/llama-3.2-3b-instruct:free',
        }),
      } as Response
    )

    const retries: string[] = []
    const engine = createOpenRouterEngine('sk-or-test')
    const result = await engine.chat(
      [{ role: 'user', content: 'Hi' }],
      {
        model: 'stale/model:free',
        onModelRetry: (from, to) => retries.push(`${from}->${to}`),
      }
    )

    expect(result.content).toBe('Recovered')
    expect(retries.length).toBeGreaterThan(0)
  })

  it('throws on non-retryable 401', async () => {
    mockModelsThenChat({
      ok: false,
      status: 401,
      text: async () => 'Invalid key',
    } as Response)

    await expect(
      createOpenRouterEngine('sk-or-test').chat([{ role: 'user', content: 'Hi' }])
    ).rejects.toThrow(/401/)
  })

  it('fetches and caches free models from API', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'test/model:free', pricing: { prompt: '0', completion: '0' } },
          { id: 'paid/model', pricing: { prompt: '1', completion: '1' } },
        ],
      }),
    } as Response)

    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models).toContain('test/model:free')
    expect(models).not.toContain('paid/model')
  })

  it('reuses fresh local cache without calling models API again', async () => {
    const { OPENROUTER_MODELS_CACHE_KEY } = await import('../../src/engines/openrouter')
    localStorage.setItem(
      OPENROUTER_MODELS_CACHE_KEY,
      JSON.stringify({
        models: ['cached/model:free'],
        fetchedAt: Date.now(),
      })
    )

    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models).toEqual(['cached/model:free'])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('respects custom model when specified', async () => {
    mockModelsThenChat({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
        model: 'qwen/qwen3-4b:free',
      }),
    } as Response)

    await createOpenRouterEngine('sk-or-test').chat(
      [{ role: 'user', content: 'Hi' }],
      { model: 'qwen/qwen3-4b:free' }
    )
    const postCall = vi.mocked(fetch).mock.calls.find((c) => (c[1] as RequestInit)?.method === 'POST')
    const body = JSON.parse((postCall?.[1] as RequestInit).body as string)
    expect(body.model).toBe('qwen/qwen3-4b:free')
  })

  it('returns curated list when API key is empty', async () => {
    const models = await fetchOpenRouterFreeModels('')
    expect(models.length).toBeGreaterThan(0)
  })

  it('falls back to cache when models API fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'error',
    } as Response)
    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models.length).toBeGreaterThan(0)
  })

  it('handles corrupt models cache in localStorage', async () => {
    const { OPENROUTER_MODELS_CACHE_KEY, getCachedOpenRouterFreeModels } = await import(
      '../../src/engines/openrouter'
    )
    localStorage.setItem(OPENROUTER_MODELS_CACHE_KEY, '{bad json')
    expect(getCachedOpenRouterFreeModels().length).toBeGreaterThan(0)
  })

  it('reads fresh models from valid cache', async () => {
    const { OPENROUTER_MODELS_CACHE_KEY, getCachedOpenRouterFreeModels } = await import(
      '../../src/engines/openrouter'
    )
    localStorage.setItem(
      OPENROUTER_MODELS_CACHE_KEY,
      JSON.stringify({ models: ['cached/model:free'], fetchedAt: Date.now() })
    )
    expect(getCachedOpenRouterFreeModels()).toEqual(['cached/model:free'])
  })

  it('handles network throw when fetching models', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models.length).toBeGreaterThan(0)
  })

  it('falls back when API returns no free models', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'paid/model', pricing: { prompt: '1', completion: '1' } }],
      }),
    } as Response)
    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models.length).toBeGreaterThan(0)
  })

  it('filters models with zero pricing and :free suffix', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'test/model:free' },
          { id: 'zero/priced:free', pricing: { prompt: '0', completion: '0' } },
          { id: 'openrouter/free' },
        ],
      }),
    } as Response)
    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models).toContain('test/model:free')
    expect(models).toContain('zero/priced:free')
    expect(models).not.toContain('openrouter/free')
  })

  it('returns empty content when API omits choices', async () => {
    mockModelsThenChat({
      ok: true,
      json: async () => ({ choices: [] }),
    } as Response)
    const result = await createOpenRouterEngine('sk-or-test').chat([{ role: 'user', content: 'Hi' }])
    expect(result.content).toBe('')
  })

  it('filters zero-priced models without :free suffix', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'provider/zero-only', pricing: { prompt: '0', completion: '0' } }],
      }),
    } as Response)
    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models).toContain('provider/zero-only')
  })

  it('omits HTTP-Referer when window is undefined', async () => {
    const prevWindow = globalThis.window
    // @ts-expect-error non-browser test environment
    delete globalThis.window
    mockModelsThenChat({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
        model: OPENROUTER_FREE_ROUTER,
      }),
    } as Response)
    await createOpenRouterEngine('sk-or-test').chat([{ role: 'user', content: 'Hi' }])
    const postCall = vi.mocked(fetch).mock.calls.find((c) => (c[1] as RequestInit)?.method === 'POST')
    const headers = (postCall?.[1] as RequestInit).headers as Record<string, string>
    expect(headers['HTTP-Referer']).toBe('')
    globalThis.window = prevWindow
  })

  it('resetOpenRouterModelsCacheForTests tolerates missing localStorage', () => {
    const storage = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    expect(() => resetOpenRouterModelsCacheForTests()).not.toThrow()
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    })
  })

  it('handles missing localStorage for cache read and write', async () => {
    const storage = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    const { getCachedOpenRouterFreeModels } = await import('../../src/engines/openrouter')
    expect(getCachedOpenRouterFreeModels().length).toBeGreaterThan(0)

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'cached-on-missing-storage:free', pricing: { prompt: '0', completion: '0' } }],
      }),
    } as Response)
    const models = await fetchOpenRouterFreeModels('sk-or-test')
    expect(models).toContain('cached-on-missing-storage:free')

    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    })
  })
})
