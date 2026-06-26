import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  describeImageWithGemini,
  runGeminiVision,
  pickImageFile,
} from '../../src/tools/geminiVision'

function mockImageInput(file: File | null) {
  const input = {
    type: '',
    accept: '',
    get files() {
      return file ? ([file] as unknown as FileList) : ([] as unknown as FileList)
    },
    click: vi.fn(() => {
      queueMicrotask(() => input.onchange?.())
    }),
    onchange: null as (() => void) | null,
  }
  vi.spyOn(document, 'createElement').mockReturnValue(input as unknown as HTMLInputElement)
  return input
}

describe('geminiVision', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('calls generateContent with inline image', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'A pizza slice' }] } }],
      }),
    } as Response)

    const text = await describeImageWithGemini('key', 'Describe', 'abc', 'image/jpeg')
    expect(text).toBe('A pizza slice')
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.contents[0].parts[1].inline_data.mime_type).toBe('image/jpeg')
  })

  it('uses default prompt when empty', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
    } as Response)
    await describeImageWithGemini('key', '', 'abc', 'image/png')
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.contents[0].parts[0].text).toContain('Describe this image')
  })

  it('throws on API error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'bad',
    } as Response)
    await expect(describeImageWithGemini('k', 'p', 'b', 'image/jpeg')).rejects.toThrow(/400/)
  })

  it('requires API key', async () => {
    await expect(runGeminiVision('', 'hi', {})).rejects.toThrow(/Gemini API key/)
  })

  it('pickImageFile encodes image as base64', async () => {
    const file = new File(['hi'], 'pic.png', { type: 'image/png' })
    mockImageInput(file)
    const picked = await pickImageFile()
    expect(picked.file.name).toBe('pic.png')
    expect(picked.mimeType).toBe('image/png')
    expect(picked.base64.length).toBeGreaterThan(0)
  })

  it('pickImageFile rejects missing and oversized images', async () => {
    mockImageInput(null)
    await expect(pickImageFile()).rejects.toThrow(/No image/)

    const huge = new File([new Uint8Array(21 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    mockImageInput(huge)
    await expect(pickImageFile()).rejects.toThrow(/20MB/)
  })

  it('runGeminiVision uses config prompt when input empty', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'caption' }] } }] }),
    } as Response)
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    mockImageInput(file)
    const out = await runGeminiVision('key', '', { prompt: 'What is this?' })
    expect(out).toContain('caption')
  })

  it('runGeminiVision uses input prompt when provided', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'yes' }] } }] }),
    } as Response)
    const file = new File(['x'], 'b.jpg', { type: 'image/jpeg' })
    mockImageInput(file)
    const out = await runGeminiVision('key', 'Describe colors', {})
    expect(out).toContain('yes')
  })

  it('returns empty string when gemini omits candidates', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
    await expect(describeImageWithGemini('key', 'p', 'b', 'image/jpeg')).resolves.toBe('')
  })

  it('maps gemini parts without text fields', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{}, { text: 'visible' }] } }],
      }),
    } as Response)
    await expect(describeImageWithGemini('key', 'p', 'b', 'image/jpeg')).resolves.toBe('visible')
  })

  it('runGeminiVision uses default prompt when input and config empty', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'fallback' }] } }] }),
    } as Response)
    const file = new File(['x'], 'c.jpg', { type: 'image/jpeg' })
    mockImageInput(file)
    const out = await runGeminiVision('key', '  ', {})
    expect(out).toContain('fallback')
  })
})
