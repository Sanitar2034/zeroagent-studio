import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  transcribeWithGroq,
  runGroqTranscribe,
  pickAudioFile,
  GROQ_WHISPER_MODEL,
} from '../../src/tools/groqTranscribe'

function mockFileInput(files: File[] | null) {
  const input = {
    type: '',
    accept: '',
    get files() {
      return files as unknown as FileList
    },
    click: vi.fn(() => {
      queueMicrotask(() => input.onchange?.())
    }),
    onchange: null as (() => void) | null,
  }
  vi.spyOn(document, 'createElement').mockReturnValue(input as unknown as HTMLInputElement)
  return input
}

describe('groqTranscribe', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('posts multipart transcription request', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'hello world' }),
    } as Response)

    const file = new File(['audio'], 'test.webm', { type: 'audio/webm' })
    const text = await transcribeWithGroq('gsk_test', file, 'en')
    expect(text).toBe('hello world')
    expect(GROQ_WHISPER_MODEL).toBe('whisper-large-v3-turbo')
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('throws without API key', async () => {
    await expect(runGroqTranscribe('', {})).rejects.toThrow(/Groq API key/)
  })

  it('throws on API error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'bad key',
    } as Response)
    const file = new File(['audio'], 'a.webm')
    await expect(transcribeWithGroq('bad', file)).rejects.toThrow(/401/)
  })

  it('pickAudioFile resolves selected file', async () => {
    const file = new File(['a'], 'clip.webm', { type: 'audio/webm' })
    mockFileInput([file] as unknown as File[])
    await expect(pickAudioFile()).resolves.toBe(file)
  })

  it('pickAudioFile rejects cancel and oversized files', async () => {
    mockFileInput([])
    await expect(pickAudioFile()).rejects.toThrow(/No audio file/)

    const huge = new File([new Uint8Array(26 * 1024 * 1024)], 'big.webm')
    mockFileInput([huge] as unknown as File[])
    await expect(pickAudioFile()).rejects.toThrow(/25MB/)
  })

  it('runGroqTranscribe picks file and transcribes', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'done' }),
    } as Response)
    const file = new File(['a'], 'speech.webm')
    mockFileInput([file] as unknown as File[])
    const out = await runGroqTranscribe('gsk', { language: 'en' })
    expect(out).toContain('speech.webm')
    expect(out).toContain('done')
  })
})
