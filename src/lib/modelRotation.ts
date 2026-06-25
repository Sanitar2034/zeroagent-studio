import type { ChatMessage, EngineOptions, EngineResult } from '../engines/types'

export const MODEL_COOLDOWN_KEY = 'zeroagent-model-cooldowns'
export const COOLDOWN_MS = 60_000

export const OPENROUTER_FREE_ROUTER = 'openrouter/free'
export const AUTO_ROTATE_MODEL = 'auto'

export function isRetryableApiError(status: number, body: string): boolean {
  if (status === 404 || status === 429 || status === 402 || status === 503) {
    return true
  }
  const lower = body.toLowerCase()
  return (
    lower.includes('rate limit') ||
    lower.includes('no endpoints found') ||
    lower.includes('quota') ||
    lower.includes('overloaded')
  )
}

export function parseApiErrorStatus(message: string): number | null {
  const match = message.match(/API error:\s*(\d{3})/i)
  return match ? Number(match[1]) : null
}

export function parseApiErrorBody(message: string): string {
  const dash = message.indexOf(' - ')
  return dash >= 0 ? message.slice(dash + 3) : message
}

type CooldownMap = Record<string, number>

function readCooldowns(): CooldownMap {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(MODEL_COOLDOWN_KEY)
    return raw ? (JSON.parse(raw) as CooldownMap) : {}
  } catch {
    return {}
  }
}

function writeCooldowns(map: CooldownMap): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(MODEL_COOLDOWN_KEY, JSON.stringify(map))
}

export function markModelCooldown(model: string, now = Date.now()): void {
  const map = readCooldowns()
  map[model] = now + COOLDOWN_MS
  writeCooldowns(map)
}

export function isModelOnCooldown(model: string, now = Date.now()): boolean {
  const until = readCooldowns()[model]
  return typeof until === 'number' && until > now
}

export function resetModelCooldownsForTests(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(MODEL_COOLDOWN_KEY)
  }
}

export interface RotationPlanOptions {
  includeFreeRouter?: boolean
}

export function buildRotationPlan(
  preferredModel: string | undefined,
  catalog: string[],
  options: RotationPlanOptions = {}
): string[] {
  const includeRouter = options.includeFreeRouter ?? true
  const ordered: string[] = []

  const add = (model: string) => {
    if (!model || ordered.includes(model)) return
    ordered.push(model)
  }

  if (preferredModel && preferredModel !== AUTO_ROTATE_MODEL) {
    add(preferredModel)
  }

  if (includeRouter) {
    add(OPENROUTER_FREE_ROUTER)
  }

  for (const model of catalog) {
    add(model)
  }

  return ordered
}

export function rotateOnFailure(
  plan: string[],
  failedModel: string,
  now = Date.now()
): string | null {
  markModelCooldown(failedModel, now)
  const failedIndex = plan.indexOf(failedModel)

  for (let i = failedIndex + 1; i < plan.length; i++) {
    const candidate = plan[i]
    if (!isModelOnCooldown(candidate, now)) {
      return candidate
    }
  }

  for (let i = 0; i < failedIndex; i++) {
    const candidate = plan[i]
    if (!isModelOnCooldown(candidate, now)) {
      return candidate
    }
  }

  return null
}

export interface RotationAttempt {
  model: string
  error: string
}

export interface RotationChatResult {
  result: EngineResult
  modelUsed: string
  attempts: RotationAttempt[]
}

export interface ChatWithRotationParams {
  plan: string[]
  messages: ChatMessage[]
  options?: EngineOptions
  chatFn: (model: string, messages: ChatMessage[], options?: EngineOptions) => Promise<EngineResult>
  onRetry?: (from: string, to: string, error: string) => void
}

export async function chatWithModelRotation(
  params: ChatWithRotationParams
): Promise<RotationChatResult> {
  const { plan, messages, options, chatFn, onRetry } = params
  if (plan.length === 0) {
    throw new Error('No models available for rotation')
  }

  const attempts: RotationAttempt[] = []
  let currentModel = plan.find((m) => !isModelOnCooldown(m)) ?? plan[0]
  let lastError = 'All models failed'

  while (true) {
    try {
      const result = await chatFn(currentModel, messages, options)
      return { result, modelUsed: currentModel, attempts }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      attempts.push({ model: currentModel, error: message })

      const status = parseApiErrorStatus(message)
      const body = parseApiErrorBody(message)
      if (status !== null && !isRetryableApiError(status, body)) {
        throw err
      }
      if (status === null && !isRetryableApiError(0, message)) {
        throw err
      }

      const next = rotateOnFailure(plan, currentModel)
      if (!next) {
        throw new Error(lastError, { cause: err })
      }

      onRetry?.(currentModel, next, message)
      lastError = message
      currentModel = next
    }
  }
}
