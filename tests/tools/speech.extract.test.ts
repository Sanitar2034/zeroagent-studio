import { describe, it, expect } from 'vitest'
import { extractSpeakableText } from '../../src/tools/speech'

describe('extractSpeakableText', () => {
  it('strips structured JSON appendix from agent replies', () => {
    const raw = 'Hello there!\n\n---\nStructured context (JSON):\n{"blocks":[]}'
    expect(extractSpeakableText(raw)).toBe('Hello there!')
  })

  it('truncates without a word boundary when the slice is short', () => {
    expect(extractSpeakableText('abcdefghijklmnop', 8)).toBe('abcdefgh…')
  })

  it('truncates on a word boundary when there is room', () => {
    const text = Array.from({ length: 24 }, (_, index) => `term${index}`).join(' ')
    const spoken = extractSpeakableText(text, 60)
    expect(spoken.endsWith('…')).toBe(true)
    expect(spoken.includes('term23')).toBe(false)
  })
})
