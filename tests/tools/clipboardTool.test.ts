import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runClipboardTool, isClipboardAvailable } from '../../src/tools/clipboardTool'

describe('clipboardTool', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn(async () => 'copied text'),
        writeText: vi.fn(async () => undefined),
      },
    })
  })

  it('detects clipboard availability', () => {
    expect(isClipboardAvailable()).toBe(true)
  })

  it('reads clipboard with default mode', async () => {
    const text = await runClipboardTool('', {})
    expect(text).toBe('copied text')
  })

  it('reads clipboard text', async () => {
    const text = await runClipboardTool('', { mode: 'read' })
    expect(text).toBe('copied text')
  })

  it('writes using config.text and passes through for downstream', async () => {
    const logs: string[] = []
    const result = await runClipboardTool(
      '',
      { mode: 'write', text: 'from config' },
      { apiKeys: {}, log: (_l, m) => logs.push(m) }
    )
    expect(result).toBe('from config')
    expect(logs.some((m) => m.includes('Copied'))).toBe(true)
  })

  it('throws when clipboard unavailable', async () => {
    vi.stubGlobal('navigator', {})
    await expect(runClipboardTool('', { mode: 'read' })).rejects.toThrow(/not available/)
  })

  it('throws on unknown mode and empty write', async () => {
    await expect(runClipboardTool('', { mode: 'write' })).rejects.toThrow(/needs upstream/)
    await expect(runClipboardTool('', { mode: 'nope' as never })).rejects.toThrow(/Unknown clipboard/)
  })
})
