import type { BrainEngine, ChatMessage, EngineOptions, EngineResult } from './types'
import { AUTO_ROTATE_MODEL, buildRotationPlan, chatWithModelRotation } from '../lib/modelRotation'
import { geminiModelUrl, geminiRequestHeaders } from '../lib/geminiRequest'

export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

export const DEFAULT_GEMINI_MODEL = AUTO_ROTATE_MODEL

async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: EngineOptions
): Promise<EngineResult> {
  const systemParts = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
  const conversation = messages.filter((m) => m.role !== 'system')

  const contents = conversation.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 1024,
    },
  }

  if (systemParts.length > 0) {
    body.systemInstruction = { parts: [{ text: systemParts.join('\n\n') }] }
  }

  const response = await fetch(geminiModelUrl(model, 'generateContent'), {
    method: 'POST',
    headers: geminiRequestHeaders(apiKey),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const content =
    data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('') ?? ''

  const usage = data.usageMetadata
  return {
    content,
    model,
    usage: usage
      ? {
          promptTokens: usage.promptTokenCount ?? 0,
          completionTokens: usage.candidatesTokenCount ?? 0,
        }
      : undefined,
  }
}

export function createGeminiEngine(apiKey: string): BrainEngine {
  return {
    name: 'Gemini',

    isAvailable: () => !!apiKey,

    async chat(messages: ChatMessage[], options?: EngineOptions): Promise<EngineResult> {
      const preferred =
        !options?.model || options.model === AUTO_ROTATE_MODEL
          ? GEMINI_MODELS[0]
          : options.model

      const plan = buildRotationPlan(preferred, GEMINI_MODELS, { includeFreeRouter: false })

      const { result } = await chatWithModelRotation({
        plan,
        messages,
        options,
        onRetry: options?.onModelRetry,
        chatFn: (model, msgs, opts) => callGemini(apiKey, model, msgs, opts),
      })

      return result
    },
  }
}
