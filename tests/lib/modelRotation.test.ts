import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isRetryableApiError,
  buildRotationPlan,
  rotateOnFailure,
  markModelCooldown,
  isModelOnCooldown,
  resetModelCooldownsForTests,
  chatWithModelRotation,
  OPENROUTER_FREE_ROUTER,
  AUTO_ROTATE_MODEL,
  parseApiErrorStatus,
  parseApiErrorBody,
  MODEL_COOLDOWN_KEY,
} from '../../src/lib/modelRotation'
import type { EngineResult } from '../../src/engines/types'

const CATALOG = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen3-4b:free',
]

describe('modelRotation', () => {
  beforeEach(() => {
    resetModelCooldownsForTests()
  })

  it('detects retryable HTTP statuses and messages', () => {
    expect(isRetryableApiError(404, 'No endpoints found')).toBe(true)
    expect(isRetryableApiError(429, '')).toBe(true)
    expect(isRetryableApiError(402, '')).toBe(true)
    expect(isRetryableApiError(503, '')).toBe(true)
    expect(isRetryableApiError(401, 'unauthorized')).toBe(false)
    expect(isRetryableApiError(0, 'rate limit exceeded')).toBe(true)
  })

  it('builds rotation plan with preferred model and free router', () => {
    const plan = buildRotationPlan('stale/model:free', CATALOG)
    expect(plan[0]).toBe('stale/model:free')
    expect(plan[1]).toBe(OPENROUTER_FREE_ROUTER)
    expect(plan).toContain('qwen/qwen3-4b:free')
  })

  it('auto mode starts with openrouter/free', () => {
    const plan = buildRotationPlan(AUTO_ROTATE_MODEL, CATALOG)
    expect(plan[0]).toBe(OPENROUTER_FREE_ROUTER)
  })

  it('rotates to next model and marks cooldown', () => {
    const plan = buildRotationPlan('a:free', ['a:free', 'b:free', 'c:free'], {
      includeFreeRouter: false,
    })
    const next = rotateOnFailure(plan, 'a:free', 1_000)
    expect(next).toBe('b:free')
    expect(isModelOnCooldown('a:free', 1_000)).toBe(true)
    expect(isModelOnCooldown('a:free', 1_000 + 61_000)).toBe(false)
  })

  it('returns null when all models are on cooldown', () => {
    const plan = ['a:free', 'b:free']
    markModelCooldown('a:free', 1_000)
    markModelCooldown('b:free', 1_000)
    expect(rotateOnFailure(plan, 'a:free', 1_000)).toBeNull()
  })

  it('chatWithModelRotation retries on 404 then succeeds', async () => {
    const calls: string[] = []
    const result = await chatWithModelRotation({
      plan: ['stale:free', 'good:free'],
      messages: [{ role: 'user', content: 'hi' }],
      chatFn: async (model) => {
        calls.push(model)
        if (model === 'stale:free') {
          throw new Error('OpenRouter API error: 404 - No endpoints found')
        }
        return { content: 'ok', model } satisfies EngineResult
      },
      onRetry: () => {},
    })

    expect(result.modelUsed).toBe('good:free')
    expect(result.result.content).toBe('ok')
    expect(calls).toEqual(['stale:free', 'good:free'])
    expect(result.attempts).toHaveLength(1)
  })

  it('throws immediately on non-retryable errors', async () => {
    await expect(
      chatWithModelRotation({
        plan: ['a:free', 'b:free'],
        messages: [{ role: 'user', content: 'hi' }],
        chatFn: async () => {
          throw new Error('OpenRouter API error: 401 - Invalid key')
        },
      })
    ).rejects.toThrow(/401/)
  })

  it('throws when rotation is exhausted', async () => {
    await expect(
      chatWithModelRotation({
        plan: ['a:free'],
        messages: [{ role: 'user', content: 'hi' }],
        chatFn: async () => {
          throw new Error('OpenRouter API error: 429 - rate limit')
        },
      })
    ).rejects.toThrow()
  })

  it('parses API error status from message', () => {
    expect(parseApiErrorStatus('OpenRouter API error: 404 - gone')).toBe(404)
    expect(parseApiErrorStatus('network fail')).toBeNull()
  })

  it('throws when plan is empty', async () => {
    await expect(
      chatWithModelRotation({
        plan: [],
        messages: [{ role: 'user', content: 'hi' }],
        chatFn: async () => ({ content: '', model: 'x' }),
      })
    ).rejects.toThrow(/No models available/)
  })

  it('wraps rotation to earlier models when later ones are on cooldown', () => {
    const plan = ['a:free', 'b:free', 'c:free']
    markModelCooldown('b:free', 1_000)
    markModelCooldown('c:free', 1_000)
    expect(rotateOnFailure(plan, 'c:free', 1_000)).toBe('a:free')
  })

  it('invokes onRetry callback', async () => {
    const onRetry = vi.fn()
    await chatWithModelRotation({
      plan: ['bad:free', 'good:free'],
      messages: [{ role: 'user', content: 'hi' }],
      onRetry,
      chatFn: async (model) => {
        if (model === 'bad:free') throw new Error('OpenRouter API error: 429 - limit')
        return { content: 'ok', model }
      },
    })
    expect(onRetry).toHaveBeenCalled()
  })

  it('handles corrupt cooldown storage', () => {
    sessionStorage.setItem(MODEL_COOLDOWN_KEY, 'not-json')
    expect(isModelOnCooldown('x', Date.now())).toBe(false)
  })

  it('does not retry generic non-API failures', async () => {
    await expect(
      chatWithModelRotation({
        plan: ['a:free'],
        messages: [{ role: 'user', content: 'hi' }],
        chatFn: async () => {
          throw new Error('unexpected bug')
        },
      })
    ).rejects.toThrow('unexpected bug')
  })

  it('parses API error body text', () => {
    expect(parseApiErrorBody('OpenRouter API error: 404 - gone')).toBe('gone')
    expect(parseApiErrorBody('plain error')).toBe('plain error')
  })

  it('rotateOnFailure when failed model is not in plan', () => {
    expect(rotateOnFailure(['a:free', 'b:free'], 'missing:free', 1_000)).toBe('a:free')
  })

  it('starts on first available model when earlier ones are cooled down', async () => {
    markModelCooldown('a:free', Date.now())
    const result = await chatWithModelRotation({
      plan: ['a:free', 'b:free'],
      messages: [{ role: 'user', content: 'hi' }],
      chatFn: async (model) => ({ content: 'ok', model }),
    })
    expect(result.modelUsed).toBe('b:free')
  })

  it('handles missing sessionStorage for cooldown persistence', () => {
    const storage = globalThis.sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    markModelCooldown('offline-model', Date.now())
    expect(isModelOnCooldown('offline-model')).toBe(false)
    resetModelCooldownsForTests()
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: storage,
      configurable: true,
      writable: true,
    })
  })

  it('skips cooled models in wrap-around search', () => {
    const plan = ['a:free', 'b:free', 'c:free']
    markModelCooldown('a:free', 1_000)
    expect(rotateOnFailure(plan, 'c:free', 1_000)).toBe('b:free')
  })

  it('uses first plan entry when every model is on cooldown at start', async () => {
    markModelCooldown('a:free', Date.now())
    markModelCooldown('b:free', Date.now())
    const result = await chatWithModelRotation({
      plan: ['a:free', 'b:free'],
      messages: [{ role: 'user', content: 'hi' }],
      chatFn: async (model) => ({ content: 'ok', model }),
    })
    expect(result.modelUsed).toBe('a:free')
  })

  it('handles non-Error throws in chatFn', async () => {
    await expect(
      chatWithModelRotation({
        plan: ['a:free'],
        messages: [{ role: 'user', content: 'hi' }],
        chatFn: async () => {
          throw 'plain string failure'
        },
      })
    ).rejects.toBe('plain string failure')
  })
})
