export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface EngineOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  onModelRetry?: (from: string, to: string, error: string) => void
}

export interface EngineResult {
  content: string
  model: string
  usage?: { promptTokens: number; completionTokens: number }
}

export interface BrainEngine {
  name: string
  isAvailable: () => boolean | Promise<boolean>
  chat: (messages: ChatMessage[], options?: EngineOptions) => Promise<EngineResult>
}
