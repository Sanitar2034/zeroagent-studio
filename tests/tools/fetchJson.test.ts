import { describe, it, expect, vi } from 'vitest'
import { fetchJsonTool } from '../../src/tools/fetchJson'

describe('fetchJsonTool', () => {
  it('fetches and pretty-prints JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{"ok":true}',
      }))
    )
    const out = await fetchJsonTool('', { url: 'https://api.example.com/data' })
    expect(out).toContain('"ok": true')
    vi.unstubAllGlobals()
  })

  it('throws on invalid JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'not-json',
      }))
    )
    await expect(fetchJsonTool('https://api.example.com/data', {})).rejects.toThrow(/not valid JSON/)
    vi.unstubAllGlobals()
  })

  it('throws on non-http URL', async () => {
    await expect(fetchJsonTool('file:///tmp/x', {})).rejects.toThrow(/http/)
  })

  it('throws when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Error',
        text: async () => '',
      }))
    )
    await expect(fetchJsonTool('https://api.example.com/data', {})).rejects.toThrow(/Fetch failed/)
    vi.unstubAllGlobals()
  })

  it('throws without URL', async () => {
    await expect(fetchJsonTool('  ', {})).rejects.toThrow(/No URL/)
  })
})
