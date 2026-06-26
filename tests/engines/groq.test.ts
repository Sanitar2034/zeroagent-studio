import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGroqEngine, GROQ_MODELS } from '../../src/engines/groq'
import { AUTO_ROTATE_MODEL, resetModelCooldownsForTests } from '../../src/lib/modelRotation'

describe('Groq engine', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    resetModelCooldownsForTests()
  })

  it('rejects empty key', () => {
    expect(createGroqEngine('').isAvailable()).toBe(false)
  })

  it('uses fast 8b instant model by default (good for weak hardware + free tier)', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Fast' } }],
        model: GROQ_MODELS[1],
      }),
    } as Response)

    const engine = createGroqEngine('gsk_test')
    await engine.chat([{ role: 'user', content: 'Quick answer' }])
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe(GROQ_MODELS[1])
  })

  it('retries on 429 rate limit with next model', async () => {
    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OK' } }],
          model: GROQ_MODELS[0],
        }),
      } as Response)

    const result = await createGroqEngine('gsk_test').chat([{ role: 'user', content: 'Hi' }])
    expect(result.content).toBe('OK')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('parses usage metadata when Groq returns token counts', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'With usage' } }],
        model: GROQ_MODELS[1],
        usage: { prompt_tokens: 42, completion_tokens: 7 },
      }),
    } as Response)

    const result = await createGroqEngine('gsk_test').chat([{ role: 'user', content: 'Hi' }])
    expect(result.usage).toEqual({ promptTokens: 42, completionTokens: 7 })
  })

  it('handles response without usage metadata', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'No usage' } }],
        model: 'test',
      }),
    } as Response)

    const result = await createGroqEngine('gsk_test').chat([{ role: 'user', content: 'Hi' }])
    expect(result.usage).toBeUndefined()
  })

  it('uses explicit model when specified', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Custom' } }],
        model: GROQ_MODELS[0],
      }),
    } as Response)

    await createGroqEngine('gsk_test').chat(
      [{ role: 'user', content: 'Hi' }],
      { model: GROQ_MODELS[0] }
    )
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe(GROQ_MODELS[0])
  })

  it('honors auto rotate sentinel model option', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Auto' } }],
        model: GROQ_MODELS[1],
      }),
    } as Response)

    await createGroqEngine('gsk_test').chat(
      [{ role: 'user', content: 'Hi' }],
      { model: AUTO_ROTATE_MODEL }
    )
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe(GROQ_MODELS[1])
  })
})
