export type ExampleWorkflowId =
  | 'quick-start'
  | 'snack-verdict'
  | 'writer-editor'
  | 'explain-my-url'
  | 'meme-math'
  | 'research-stack'
  | 'hacker-headlines'
  | 'readme-reader'
  | 'capture-only'
  | 'script-pipeline'
  | 'json-glow-up'
  | 'context-briefing'
  | 'tool-only'
  | 'encode-boomerang'
  | 'jwt-inspector'
  | 'regex-hunter'
  | 'diff-detective'
  | 'id-factory'
  | 'scraper-cleanup'
  | 'voice-reply'
  | 'describe-image'
  | 'transcribe-me'

export type ExampleCategory = 'starter' | 'research' | 'pipeline' | 'data' | 'voice' | 'power'

export type ExampleDifficulty = 'easy' | 'medium' | 'advanced'

export type ExampleRequiresKey = 'groq' | 'gemini' | 'openrouter'

export interface ExampleWorkflowMeta {
  id: ExampleWorkflowId
  name: string
  description: string
  flow: string
  category: ExampleCategory
  difficulty: ExampleDifficulty
  featured?: boolean
  requiresKey?: ExampleRequiresKey
  tryPrompt?: string
}

export type ExampleWorkflowGroup =
  | { kind: 'featured'; label: string; items: ExampleWorkflowMeta[] }
  | { kind: 'category'; category: ExampleCategory; label: string; items: ExampleWorkflowMeta[] }
