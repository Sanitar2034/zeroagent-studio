import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGeminiEngine, GEMINI_MODELS } from '../../src/engines/gemini'
import { AUTO_ROTATE_MODEL } from '../../src/lib/modelRotation'

describe('Gemini engine', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('is unavailable without API key', () => {
    expect(createGeminiEngine('').isAvailable()).toBe(false)
  })

  it('maps assistant role to Gemini model role', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hello' }] } }],
      }),
    } as Response)

    const engine = createGeminiEngine('AIza_test')
    await engine.chat([
      { role: 'system', content: 'You are kind' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Previous' },
      { role: 'user', content: 'Follow up' },
    ])

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.systemInstruction.parts[0].text).toContain('You are kind')
    expect(body.contents[0].role).toBe('user')
    expect(body.contents[1].role).toBe('model')
  })

  it('defaults to flash model (free tier friendly)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'OK' }] } }],
      }),
    } as Response)

    const engine = createGeminiEngine('AIza_test')
    await engine.chat([{ role: 'user', content: 'Hi' }])
    const url = String(vi.mocked(fetch).mock.calls[0][0])
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(url).toContain(GEMINI_MODELS[0])
    expect(url).not.toContain('AIza_test')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIza_test')
  })

  it('parses usageMetadata from Gemini response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Counted' }] } }],
        usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 4 },
      }),
    } as Response)

    const result = await createGeminiEngine('AIza_test').chat([
      { role: 'user', content: 'Hi' },
    ])
    expect(result.usage).toEqual({ promptTokens: 11, completionTokens: 4 })
  })

  it('joins multi-part responses and skips parts without text', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'A' }, {}, { text: 'B' }] } }],
      }),
    } as Response)

    const result = await createGeminiEngine('AIza_test').chat([
      { role: 'user', content: 'Hi' },
    ])
    expect(result.content).toBe('AB')
  })

  it('handles safety-blocked empty candidates', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    } as Response)

    const result = await createGeminiEngine('AIza_test').chat([
      { role: 'user', content: 'Hi' },
    ])
    expect(result.content).toBe('')
  })

  it('throws on invalid API key (403)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'API key invalid',
    } as Response)

    await expect(
      createGeminiEngine('bad').chat([{ role: 'user', content: 'Hi' }])
    ).rejects.toThrow(/403/)
  })

  it('uses explicit model when specified', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Lite' }] } }],
      }),
    } as Response)

    await createGeminiEngine('AIza_test').chat(
      [{ role: 'user', content: 'Hi' }],
      { model: GEMINI_MODELS[1] }
    )
    expect(String(fetchMock.mock.calls[0][0])).toContain(GEMINI_MODELS[1])
  })

  it('honors auto rotate sentinel model option', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Auto' }] } }],
      }),
    } as Response)

    await createGeminiEngine('AIza_test').chat(
      [{ role: 'user', content: 'Hi' }],
      { model: AUTO_ROTATE_MODEL }
    )
    expect(String(fetchMock.mock.calls[0][0])).toContain(GEMINI_MODELS[0])
  })
})
