import { describe, it, expect, vi } from 'vitest'
import { getEngine } from '../../src/engines'
import { createGroqEngine } from '../../src/engines/groq'
import { createGeminiEngine } from '../../src/engines/gemini'
import { webLLMEngine } from '../../src/engines/webllm'
import { transformersEngine } from '../../src/engines/transformers'
import { createOpenRouterEngine } from '../../src/engines/openrouter'

vi.mock('../../src/engines/groq', () => ({
  createGroqEngine: vi.fn((key: string) => ({ name: 'Groq', key })),
  GROQ_MODELS: [],
}))
vi.mock('../../src/engines/gemini', () => ({
  createGeminiEngine: vi.fn((key: string) => ({ name: 'Gemini', key })),
  GEMINI_MODELS: [],
}))
vi.mock('../../src/engines/openrouter', () => ({
  createOpenRouterEngine: vi.fn((key: string) => ({ name: 'OR', key })),
  OPENROUTER_FREE_MODELS: [],
}))
vi.mock('../../src/engines/webllm', () => ({
  webLLMEngine: { name: 'WebLLM' },
}))
vi.mock('../../src/engines/transformers', () => ({
  transformersEngine: { name: 'Transformers' },
}))

describe('getEngine factory — all provider routes', () => {
  it('routes groq with user key', () => {
    const engine = getEngine('groq', { groq: 'gsk_x' })
    expect(createGroqEngine).toHaveBeenCalledWith('gsk_x')
    expect(engine.name).toBe('Groq')
  })

  it('routes gemini with user key', () => {
    const engine = getEngine('gemini', { gemini: 'AIza_x' })
    expect(createGeminiEngine).toHaveBeenCalledWith('AIza_x')
    expect(engine.name).toBe('Gemini')
  })

  it('routes local WebLLM engine', () => {
    expect(getEngine('local', {})).toBe(webLLMEngine)
  })

  it('routes transformers local engine', () => {
    expect(getEngine('transformers', {})).toBe(transformersEngine)
  })

  it('routes openrouter', () => {
    getEngine('openrouter', { openrouter: 'sk-or' })
    expect(createOpenRouterEngine).toHaveBeenCalledWith('sk-or')
  })

  it('passes empty string when api key fields are missing', () => {
    getEngine('openrouter', {})
    getEngine('groq', {})
    getEngine('gemini', {})
    expect(createOpenRouterEngine).toHaveBeenCalledWith('')
    expect(createGroqEngine).toHaveBeenCalledWith('')
    expect(createGeminiEngine).toHaveBeenCalledWith('')
  })

  it('falls back to WebLLM for unknown brain type', () => {
    expect(getEngine('unknown' as never, {})).toBe(webLLMEngine)
  })
})
