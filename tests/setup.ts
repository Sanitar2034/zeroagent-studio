import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach, vi } from 'vitest'

class SpeechSynthesisUtteranceMock {
  lang = ''
  onend: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  text: string

  constructor(text: string) {
    this.text = text
  }
}

vi.stubGlobal('SpeechSynthesisUtterance', SpeechSynthesisUtteranceMock)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.stubGlobal('SpeechSynthesisUtterance', SpeechSynthesisUtteranceMock)
  localStorage.clear()
})
