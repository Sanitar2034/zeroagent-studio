import type { BrainType } from '../types'
import type { BrainEngine } from './types'
import { webLLMEngine } from './webllm'
import { transformersEngine } from './transformers'
import { createOpenRouterEngine } from './openrouter'
import { createGroqEngine } from './groq'
import { createGeminiEngine } from './gemini'
import type { ApiKeys } from '../types'

export function getEngine(brain: BrainType, apiKeys: ApiKeys): BrainEngine {
  switch (brain) {
    case 'local':
      return webLLMEngine
    case 'transformers':
      return transformersEngine
    case 'openrouter':
      return createOpenRouterEngine(apiKeys.openrouter ?? '')
    case 'groq':
      return createGroqEngine(apiKeys.groq ?? '')
    case 'gemini':
      return createGeminiEngine(apiKeys.gemini ?? '')
    default:
      return webLLMEngine
  }
}

export { webLLMEngine, transformersEngine, createOpenRouterEngine, createGroqEngine, createGeminiEngine }
export { AVAILABLE_LOCAL_MODELS } from './webllm'
export { TRANSFORMERS_MODELS } from './transformers'
export { OPENROUTER_FREE_MODELS, OPENROUTER_FREE_ROUTER, getCachedOpenRouterFreeModels } from './openrouter'
export { GROQ_MODELS } from './groq'
export { GEMINI_MODELS } from './gemini'
