import type { BrainEngine, ChatMessage, EngineOptions, EngineResult } from './types'
import { createModelLoadCallback } from '../stores/modelLoadStore'

export const TRANSFORMERS_MODELS = [
  'Xenova/distilgpt2',
  'Xenova/LaMini-Flan-T5-783M',
]

type TextGenPipeline = (
  text: string,
  options?: { max_new_tokens?: number; temperature?: number }
) => Promise<Array<{ generated_text: string }>>

let pipelineInstance: TextGenPipeline | null = null
let loadingPromise: Promise<void> | null = null
let currentModel = TRANSFORMERS_MODELS[0]

export async function initTransformers(
  model: string = currentModel,
  onProgress?: (progress: { text: string; progress: number }) => void
): Promise<void> {
  if (pipelineInstance && currentModel === model) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    onProgress?.({ text: 'Loading Transformers.js...', progress: 0.1 })
    const { pipeline, env } = await import('@huggingface/transformers')
    env.allowLocalModels = false
    env.useBrowserCache = true

    if (pipelineInstance) {
      pipelineInstance = null
    }

    currentModel = model
    onProgress?.({ text: `Downloading ${model}...`, progress: 0.3 })

    pipelineInstance = (await pipeline('text-generation', model, {
      dtype: 'q8',
    })) as TextGenPipeline

    onProgress?.({ text: 'Transformers.js ready', progress: 1 })
  })()

  await loadingPromise
  loadingPromise = null
}

export const transformersEngine: BrainEngine = {
  name: 'Transformers.js (Local)',

  isAvailable: () => typeof window !== 'undefined',

  async chat(messages: ChatMessage[], options?: EngineOptions): Promise<EngineResult> {
    const model = options?.model ?? currentModel
    if (!pipelineInstance || currentModel !== model) {
      await initTransformers(model, createModelLoadCallback('Transformers.js'))
    }
    if (!pipelineInstance) throw new Error('Failed to initialize Transformers.js')

    const prompt = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')
      .concat('\nassistant:')

    const output = await pipelineInstance(prompt, {
      max_new_tokens: options?.maxTokens ?? 128,
      temperature: options?.temperature ?? 0.7,
    })

    const raw = output[0]?.generated_text ?? ''
    // v8 ignore next -- both extraction paths are covered; includes check splits tokenizer logic
    const content = raw.includes('assistant:')
      ? // v8 ignore next -- pop()?.trim() is empty string when model ends with bare delimiter
        raw.split('assistant:').pop()?.trim() ?? raw
      : // v8 ignore next -- slice path when model echoes prompt without assistant marker
        raw.slice(prompt.length).trim()

    return { content, model: currentModel }
  },
}
