import { describe, it, expect } from 'vitest'
import { getBrainDisplayName } from '../../src/lib/brainLabels'

describe('brainLabels — human-readable engine names', () => {
  it('maps every supported brain to plain language', () => {
    expect(getBrainDisplayName('transformers')).toContain('local')
    expect(getBrainDisplayName('local')).toContain('WebLLM')
    expect(getBrainDisplayName('openrouter')).toContain('recommended')
    expect(getBrainDisplayName('groq')).toContain('Groq')
    expect(getBrainDisplayName('gemini')).toContain('Gemini')
  })

  it('falls back to raw id for unknown values (corrupted saved data)', () => {
    expect(getBrainDisplayName('legacy-engine' as never)).toBe('legacy-engine')
  })
})
