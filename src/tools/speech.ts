export type SpeechMode = 'stt' | 'tts' | 'both'

export interface SpeechOptions {
  mode?: SpeechMode
  language?: string
  text?: string
}

type RecognitionResultList = {
  [index: number]: { [index: number]: { transcript: string } }
  length: number
}

interface RecognitionErrorEvent extends Event {
  error: string
}

interface RecognitionEvent extends Event {
  results: RecognitionResultList
}

interface RecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => RecognitionInstance
    webkitSpeechRecognition?: new () => RecognitionInstance
  }
}

function getSpeechRecognition(): (new () => RecognitionInstance) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognition() !== null
}

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function mapRecognitionError(error: string): string {
  switch (error) {
    case 'not-allowed':
      return 'Microphone permission denied'
    case 'no-speech':
      return 'No speech detected'
    case 'audio-capture':
      return 'No microphone found'
    case 'network':
      return 'Speech recognition network error'
    default:
      return 'Speech recognition failed'
  }
}

export function listenForSpeech(language = 'en-US', timeoutMs = 15000): Promise<string> {
  const SpeechRecognition = getSpeechRecognition()
  if (!SpeechRecognition) {
    throw new Error('Speech recognition is not supported in this browser')
  }

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    const timer = setTimeout(() => {
      recognition.stop()
      reject(new Error('Speech recognition timed out'))
    }, timeoutMs)

    recognition.onresult = (event) => {
      clearTimeout(timer)
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      resolve(transcript)
    }

    recognition.onerror = (event) => {
      clearTimeout(timer)
      reject(new Error(mapRecognitionError(event.error)))
    }

    recognition.onend = () => clearTimeout(timer)
    recognition.start()
  })
}

function waitForVoices(timeoutMs = 500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    if (!synth?.getVoices) {
      resolve([])
      return
    }

    const existing = synth.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }

    let settled = false
    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return
      settled = true
      synth.onvoiceschanged = null
      resolve(voices)
    }

    synth.onvoiceschanged = () => finish(synth.getVoices())
    setTimeout(() => finish(synth.getVoices()), timeoutMs)
  })
}

function pickVoice(language: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const langPrefix = language.split('-')[0]?.toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ??
    voices.find((v) => v.default) ??
    voices[0]
  )
}

/** Strip markdown / JSON appendix so TTS reads a natural reply, not the full agent prompt. */
export function extractSpeakableText(raw: string, maxLength = 800): string {
  let text = raw.trim()
  if (!text) return ''

  const structuredDivider = text.indexOf('\n---\n')
  if (structuredDivider > 0) {
    text = text.slice(0, structuredDivider).trim()
  }

  text = text
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length > maxLength) {
    const slice = text.slice(0, maxLength)
    const lastSpace = slice.lastIndexOf(' ')
    text = (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim() + '…'
  }

  return text
}

export async function speakText(text: string, language = 'en-US'): Promise<void> {
  if (!isSpeechSynthesisAvailable()) {
    throw new Error('Speech synthesis is not supported in this browser')
  }

  const synth = window.speechSynthesis
  synth.cancel?.()
  synth.resume?.()

  const voices = await waitForVoices()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language
  const voice = pickVoice(language, voices)
  if (voice) utterance.voice = voice

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const timers: {
      keepAlive?: ReturnType<typeof setInterval>
      watchdog?: ReturnType<typeof setTimeout>
    } = {}

    const finish = (ok: boolean, error?: Error) => {
      if (settled) return
      settled = true
      if (timers.keepAlive !== undefined) clearInterval(timers.keepAlive)
      if (timers.watchdog !== undefined) clearTimeout(timers.watchdog)
      if (ok) resolve()
      else reject(error ?? new Error('Speech synthesis failed'))
    }

    utterance.onend = () => finish(true)
    utterance.onerror = () => finish(false)

    synth.speak(utterance)

    timers.keepAlive = setInterval(() => {
      if (synth.speaking) {
        synth.pause()
        synth.resume()
      }
    }, 8000)

    timers.watchdog = setTimeout(() => {
      if (!synth.speaking && !settled) {
        finish(false, new Error('Speech synthesis did not start — try clicking Play in the inspector'))
      }
    }, 1200)
  })
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel?.()
  }
}

export async function previewListen(language = 'en-US'): Promise<string> {
  return listenForSpeech(language)
}

export async function previewSpeak(text: string, language = 'en-US'): Promise<void> {
  if (!text.trim()) throw new Error('No text to speak')
  await speakText(text, language)
}

export async function runSpeechTool(input: string, options: SpeechOptions = {}): Promise<string> {
  const mode = options.mode ?? 'stt'
  const language = options.language ?? 'en-US'
  const parts: string[] = []
  let transcript = ''

  if (mode === 'stt' || mode === 'both') {
    parts.push(input.trim() || 'Listening... (speak now)')
    transcript = await listenForSpeech(language)
    parts.push(`Transcript: ${transcript}`)
  }

  if (mode === 'tts' || mode === 'both') {
    const rawText =
      mode === 'both'
        ? transcript || options.text?.trim() || input.trim()
        : options.text?.trim() || input.trim()
    const textToSpeak = extractSpeakableText(rawText)
    if (!textToSpeak) throw new Error('No text provided for speech synthesis')
    await speakText(textToSpeak, language)
    parts.push(`Spoken: ${textToSpeak.slice(0, 500)}`)
  }

  return parts.join('\n\n')
}
