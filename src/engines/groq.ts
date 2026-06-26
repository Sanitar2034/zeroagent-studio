import type { BrainEngine, ChatMessage, EngineOptions, EngineResult } from './types'
import { AUTO_ROTATE_MODEL, buildRotationPlan, chatWithModelRotation } from '../lib/modelRotation'

export const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
]

export const DEFAULT_GROQ_MODEL = AUTO_ROTATE_MODEL

async function callGroq(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: EngineOptions
): Promise<EngineResult> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? model,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
        }
      : undefined,
  }
}

export function createGroqEngine(apiKey: string): BrainEngine {
  return {
    name: 'Groq',

    isAvailable: () => !!apiKey,

    async chat(messages: ChatMessage[], options?: EngineOptions): Promise<EngineResult> {
      const preferred =
        !options?.model || options.model === AUTO_ROTATE_MODEL
          ? GROQ_MODELS[1]
          : options.model

      const plan = buildRotationPlan(preferred, GROQ_MODELS, { includeFreeRouter: false })

      const { result } = await chatWithModelRotation({
        plan,
        messages,
        options,
        onRetry: options?.onModelRetry,
        chatFn: (model, msgs, opts) => callGroq(apiKey, model, msgs, opts),
      })

      return result
    },
  }
}
