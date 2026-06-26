import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isSpeechRecognitionAvailable,
  listenForSpeech,
  speakText,
  runSpeechTool,
  previewListen,
  previewSpeak,
  stopSpeaking,
} from '../../src/tools/speech'

class MockRecognition {
  lang = ''
  interimResults = false
  maxAlternatives = 1
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn(() => {
    setTimeout(() => {
      this.onresult?.({ results: { 0: { 0: { transcript: 'hello prometheus' } } } })
      this.onend?.()
    }, 10)
  })
  stop = vi.fn()
}

describe('speech tool — accessibility for users without keyboards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('detects missing SpeechRecognition on unsupported browser', () => {
    vi.stubGlobal('window', {} as Window)
    expect(isSpeechRecognitionAvailable()).toBe(false)
  })

  it('uses webkit prefix on older Chrome', () => {
    vi.stubGlobal('window', {
      webkitSpeechRecognition: MockRecognition,
      speechSynthesis: { speak: vi.fn() },
    } as unknown as Window)
    expect(isSpeechRecognitionAvailable()).toBe(true)
  })

  it('listenForSpeech throws when API completely missing', () => {
    vi.stubGlobal('window', {} as Window)
    expect(() => listenForSpeech()).toThrow(/not supported/)
  })

  it('listenForSpeech resolves empty transcript when result missing', async () => {
    class EmptyResultRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => {
          this.onresult?.({ results: { length: 0 } as never })
        }, 5)
      })
    }
    vi.stubGlobal('window', { SpeechRecognition: EmptyResultRecognition } as unknown as Window)
    const promise = listenForSpeech('en-US', 5000)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('')
  })

  it('listenForSpeech handles recognition error event', async () => {
    class ErrorRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => this.onerror?.({ error: 'unknown' }), 5)
      })
    }
    vi.stubGlobal('window', { SpeechRecognition: ErrorRecognition } as unknown as Window)
    const promise = listenForSpeech('en-US', 5000)
    const assertion = expect(promise).rejects.toThrow(/failed/)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('listenForSpeech resolves transcript', async () => {
    vi.stubGlobal('window', {
      SpeechRecognition: MockRecognition,
    } as unknown as Window)

    const promise = listenForSpeech('pl-PL', 5000)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('hello prometheus')
  })

  it('listenForSpeech times out when user stays silent', async () => {
    class SilentRecognition extends MockRecognition {
      start = vi.fn()
    }
    vi.stubGlobal('window', { SpeechRecognition: SilentRecognition } as unknown as Window)

    const promise = listenForSpeech('en-US', 100)
    const assertion = expect(promise).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(150)
    await assertion
  })

  it('speakText rejects when speechSynthesis missing', async () => {
    vi.stubGlobal('window', {} as Window)
    await expect(speakText('hi')).rejects.toThrow(/not supported/)
  })

  it('speakText resolves on utterance end', async () => {
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onend?.({} as Event), 5)
    })
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: () => [],
        speaking: true,
      },
    } as unknown as Window)

    const promise = speakText('Free AI for all', 'en-US')
    await vi.runAllTimersAsync()
    await promise
  })

  it('speakText rejects on synthesis error', async () => {
    const speak = vi.fn((u: { onerror?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onerror?.({} as Event), 5)
    })
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: () => [{ lang: 'en-US', default: true }],
        speaking: false,
      },
    } as unknown as Window)
    const promise = speakText('fail')
    const assertion = expect(promise).rejects.toThrow(/failed/)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('runSpeechTool defaults to STT when mode omitted', async () => {
    vi.stubGlobal('window', { SpeechRecognition: MockRecognition } as unknown as Window)
    const promise = runSpeechTool('input', { language: 'en-US' })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toContain('Transcript:')
  })

  it('runSpeechTool STT mode captures voice input', async () => {
    vi.stubGlobal('window', { SpeechRecognition: MockRecognition } as unknown as Window)
    const promise = runSpeechTool('', { mode: 'stt', language: 'en-US' })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toContain('Transcript: hello prometheus')
  })

  it('runSpeechTool TTS throws without text (user forgot to connect upstream)', async () => {
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: () => [],
        speaking: true,
      },
    } as unknown as Window)
    await expect(runSpeechTool('  ', { mode: 'tts' })).rejects.toThrow(/No text/)
  })

  it('runSpeechTool both mode speaks transcript not upstream input', async () => {
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onend?.({} as Event), 5)
    })
    vi.stubGlobal('window', {
      SpeechRecognition: MockRecognition,
      speechSynthesis: { speak, cancel: vi.fn(), resume: vi.fn(), getVoices: () => [], speaking: true },
    } as unknown as Window)

    const promise = runSpeechTool('read this aloud', { mode: 'both' })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toContain('Transcript: hello prometheus')
    expect(result).toContain('Spoken: hello prometheus')
    expect(result).not.toMatch(/Spoken: read this aloud/)
  })

  it('maps not-allowed recognition error', async () => {
    class DeniedRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => this.onerror?.({ error: 'not-allowed' } as never), 5)
      })
    }
    vi.stubGlobal('window', { SpeechRecognition: DeniedRecognition } as unknown as Window)
    const promise = listenForSpeech('en-US', 5000)
    const assertion = expect(promise).rejects.toThrow(/permission denied/i)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('maps audio-capture recognition error', async () => {
    class ErrRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => this.onerror?.({ error: 'audio-capture' } as never), 5)
      })
    }
    vi.stubGlobal('window', { SpeechRecognition: ErrRecognition } as unknown as Window)
    const promise = listenForSpeech('en-US', 5000)
    const assertion = expect(promise).rejects.toThrow(/microphone found/i)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('maps network recognition error', async () => {
    class ErrRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => this.onerror?.({ error: 'network' } as never), 5)
      })
    }
    vi.stubGlobal('window', { SpeechRecognition: ErrRecognition } as unknown as Window)
    const promise = listenForSpeech('en-US', 5000)
    const assertion = expect(promise).rejects.toThrow(/network error/i)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('previewListen delegates to listenForSpeech', async () => {
    vi.stubGlobal('window', { SpeechRecognition: MockRecognition } as unknown as Window)
    const promise = previewListen('en-US')
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('hello prometheus')
  })

  it('previewSpeak requires text', async () => {
    await expect(previewSpeak('  ')).rejects.toThrow(/No text/)
  })

  it('previewSpeak speaks sample text', async () => {
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onend?.({} as Event), 5)
    })
    vi.stubGlobal('window', { speechSynthesis: { speak, cancel: vi.fn(), resume: vi.fn(), getVoices: () => [], speaking: true } } as unknown as Window)
    const promise = previewSpeak('hello')
    await vi.runAllTimersAsync()
    await promise
  })

  it('maps no-speech recognition error', async () => {
    class NoSpeechRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => this.onerror?.({ error: 'no-speech' } as never), 5)
      })
    }
    vi.stubGlobal('window', { SpeechRecognition: NoSpeechRecognition } as unknown as Window)
    const promise = listenForSpeech('en-US', 5000)
    const assertion = expect(promise).rejects.toThrow(/No speech detected/)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('runSpeechTool both mode falls back to options.text when transcript empty', async () => {
    class EmptyRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => this.onresult?.({ results: { 0: { 0: { transcript: '' } } } } as never), 5)
      })
    }
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onend?.({} as Event), 5)
    })
    vi.stubGlobal('window', {
      SpeechRecognition: EmptyRecognition,
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: () => [],
        speaking: true,
      },
    } as unknown as Window)

    const promise = runSpeechTool('fallback line', { mode: 'both', text: 'spoken fallback' })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toContain('spoken fallback')
  })

  it('stopSpeaking cancels synthesis safely', () => {
    const cancel = vi.fn()
    vi.stubGlobal('window', { speechSynthesis: { cancel } } as unknown as Window)
    stopSpeaking()
    expect(cancel).toHaveBeenCalled()
  })

  it('stopSpeaking is a no-op when synthesis is unavailable', () => {
    vi.stubGlobal('window', {} as Window)
    expect(() => stopSpeaking()).not.toThrow()
  })

  it('runSpeechTool both mode falls back to upstream input when transcript empty', async () => {
    class EmptyRecognition extends MockRecognition {
      start = vi.fn(() => {
        setTimeout(() => this.onresult?.({ results: { 0: { 0: { transcript: '' } } } } as never), 5)
      })
    }
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onend?.({} as Event), 5)
    })
    vi.stubGlobal('window', {
      SpeechRecognition: EmptyRecognition,
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: () => [],
        speaking: true,
      },
    } as unknown as Window)

    const promise = runSpeechTool('upstream line', { mode: 'both' })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toContain('upstream line')
  })

  it('speakText rejects when synthesis never starts after async agent work', async () => {
    const speak = vi.fn()
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: () => [{ lang: 'en-US', default: true }],
        speaking: false,
      },
    } as unknown as Window)

    const promise = speakText('queued reply')
    const assertion = expect(promise).rejects.toThrow(/did not start/)
    await vi.advanceTimersByTimeAsync(1300)
    await assertion
  })

  it('speakText keeps chrome queue alive while speaking', async () => {
    const pause = vi.fn()
    const resume = vi.fn()
    let speaking = true
    let utterance: { onend?: ((ev: Event) => void) | null } | null = null
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      utterance = u
    })
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume,
        pause,
        getVoices: () => [{ lang: 'en-US', default: true }],
        get speaking() {
          return speaking
        },
      },
    } as unknown as Window)

    const promise = speakText('still talking')
    await vi.advanceTimersByTimeAsync(8100)
    expect(pause).toHaveBeenCalled()
    expect(resume).toHaveBeenCalled()
    speaking = false
    ;(utterance as { onend?: ((ev: Event) => void) | null } | null)?.onend?.({} as Event)
    await promise
  })

  it('speakText works when getVoices is unavailable', async () => {
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onend?.({} as Event), 5)
    })
    vi.stubGlobal('window', {
      speechSynthesis: { speak, cancel: vi.fn(), resume: vi.fn(), speaking: true },
    } as unknown as Window)
    const promise = speakText('legacy browser')
    await vi.runAllTimersAsync()
    await promise
  })

  it('speakText waits for voiceschanged when voices load late', async () => {
    let voices: { lang: string; default?: boolean }[] = []
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      setTimeout(() => u.onend?.({} as Event), 5)
    })
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume: vi.fn(),
        get speaking() {
          return true
        },
        getVoices: () => voices,
        set onvoiceschanged(handler: (() => void) | null) {
          if (handler) {
            voices = [{ lang: 'pl-PL', default: true }]
            handler()
          }
        },
        get onvoiceschanged() {
          return null
        },
      },
    } as unknown as Window)

    const promise = speakText('dzien dobry', 'pl-PL')
    await vi.runAllTimersAsync()
    await promise
  })

  it('speakText keepalive interval no-ops when not speaking', async () => {
    const pause = vi.fn()
    const resume = vi.fn()
    let speaking = true
    let utterance: { onend?: ((ev: Event) => void) | null } | null = null
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      utterance = u
    })
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume,
        pause,
        getVoices: () => [{ lang: 'en-US', default: true }],
        get speaking() {
          return speaking
        },
      },
    } as unknown as Window)

    const promise = speakText('quiet queue')
    await vi.advanceTimersByTimeAsync(1300)
    speaking = false
    await vi.advanceTimersByTimeAsync(8000)
    expect(pause).not.toHaveBeenCalled()
    ;(utterance as { onend?: ((ev: Event) => void) | null } | null)?.onend?.({} as Event)
    await promise
  })

  it('ignores a second utterance completion after the first', async () => {
    const speak = vi.fn((u: { onend?: ((ev: Event) => void) | null }) => {
      u.onend?.({} as Event)
      u.onend?.({} as Event)
    })
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: () => [{ lang: 'en-US', default: true }],
        speaking: true,
      },
    } as unknown as Window)
    await speakText('done once')
  })
})
