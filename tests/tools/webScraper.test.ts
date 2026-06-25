import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrapeWebPage, fetchUrl, previewScrapeText } from '../../src/tools/webScraper'

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Free AI Resources</title></head>
<body>
  <script>alert('xss')</script>
  <h1>  Community   Guide  </h1>
  <p>Open source models for everyone.</p>
  <a href="https://huggingface.co">HF</a>
</body>
</html>
`

function okHtml(html = SAMPLE_HTML): Response {
  return { ok: true, text: async () => html } as Response
}

function failStatus(status: number): Response {
  return { ok: false, status, text: async () => '' } as Response
}

function fetchUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

describe('webScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('wikipedia uses desktop page URL when API provides content_urls', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Pizza',
        extract: 'Pizza is a dish of Italian origin.',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Pizza' } },
      }),
    } as Response)

    const result = await scrapeWebPage('https://en.wikipedia.org/wiki/Pizza')
    expect(result.url).toBe('https://en.wikipedia.org/wiki/Pizza')
  })

  it('wikipedia falls back to parsed title when API omits title', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        extract: 'Article body without title field.',
      }),
    } as Response)

    const result = await scrapeWebPage('https://en.wikipedia.org/wiki/Pizza')
    expect(result.title).toBe('Pizza')
  })

  it('skips Jina when extracted text is too short', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) {
        return { ok: true, text: async () => 'short' } as Response
      }
      return okHtml()
    })

    const result = await scrapeWebPage('https://short-jina.test')
    expect(result.title).toBe('Free AI Resources')
  })

  it('uses third proxy after earlier proxies fail', async () => {
    let proxyCalls = 0
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      if (u.includes('allorigins') || u.includes('corsproxy')) {
        proxyCalls++
        return failStatus(502)
      }
      if (u.includes('codetabs')) return okHtml()
      throw new Error('CORS')
    })

    const result = await scrapeWebPage('https://needs-third-proxy.test')
    expect(result.title).toBe('Free AI Resources')
    expect(proxyCalls).toBeGreaterThan(0)
  })

  it('records non-Error proxy failures', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      if (u.includes('proxy') || u.includes('allorigins') || u.includes('codetabs')) {
        throw 'proxy blew up'
      }
      throw new Error('CORS')
    })

    await expect(scrapeWebPage('https://proxy-string-error.test')).rejects.toThrow()
  })

  it('parseHtml handles pages without a title element', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return okHtml('<html><body>Content only</body></html>')
    })

    const result = await scrapeWebPage('https://no-title-element.test')
    expect(result.title).toBe('')
    expect(result.text).toContain('Content only')
  })

  it('falls through when wikipedia API returns error status', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/api/rest_v1/')) return failStatus(404)
      if (u.includes('r.jina.ai')) return failStatus(502)
      return okHtml()
    })

    const result = await scrapeWebPage('https://en.wikipedia.org/wiki/Missing')
    expect(result.title).toBe('Free AI Resources')
  })

  it('tries next proxy when a proxy returns non-ok HTTP status', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      if (u.includes('allorigins')) return failStatus(500)
      if (u.includes('corsproxy')) return okHtml()
      throw new Error('CORS')
    })

    const result = await scrapeWebPage('https://proxy-non-ok.test')
    expect(result.title).toBe('Free AI Resources')
  })

  it('parseHtml treats empty title tags as blank title', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return okHtml('<html><head><title>   </title></head><body>Body</body></html>')
    })

    const result = await scrapeWebPage('https://blank-title.test')
    expect(result.title).toBe('')
    expect(result.text).toContain('Body')
  })

  it('uses Wikipedia API for wikipedia.org URLs', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Pizza',
        extract: 'Pizza is a dish of Italian origin.',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Pizza' } },
      }),
    } as Response)

    const result = await scrapeWebPage('https://en.wikipedia.org/wiki/Pizza')
    expect(result.title).toBe('Pizza')
    expect(result.text).toContain('Italian origin')
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/api/rest_v1/page/summary/')
  })

  it('uses direct fetch when CORS allows', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return okHtml()
    })

    const result = await scrapeWebPage('https://example.com/guide')
    expect(result.title).toBe('Free AI Resources')
    expect(result.text).toContain('Community Guide')
  })

  it('falls back to proxy when direct fetch throws', async () => {
    let calls = 0
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      calls++
      if (calls === 1) throw new Error('CORS blocked')
      return okHtml()
    })

    const result = await scrapeWebPage('https://blocked-site.org')
    expect(result.title).toBe('Free AI Resources')
  })

  it('uses Jina reader when direct fails and Jina succeeds', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) {
        return {
          ok: true,
          text: async () => 'Title: Jina Page\n\nLong article text here.',
        } as Response
      }
      throw new Error('CORS')
    })

    const result = await scrapeWebPage('https://news.example.com')
    expect(result.text).toContain('Long article text')
    expect(result.title).toBe('Jina Page')
  })

  it('uses Jina text without title line when Title header missing', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) {
        return {
          ok: true,
          text: async () => 'Plain article without title header.',
        } as Response
      }
      throw new Error('CORS')
    })

    const result = await scrapeWebPage('https://plain.example.com')
    expect(result.title).toBe('')
    expect(result.text).toContain('Plain article')
  })

  it('throws friendly 403 message when proxies fail', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      if (fetchUrlHostname(u) === 'forbidden.com') {
        return failStatus(403)
      }
      return failStatus(403)
    })

    await expect(scrapeWebPage('https://forbidden.com')).rejects.toThrow(/403|blocked/i)
  })

  it('truncates huge pages to 8000 chars', async () => {
    const huge = '<html><body>' + 'word '.repeat(5000) + '</body></html>'
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return okHtml(huge)
    })

    const result = await scrapeWebPage('https://huge.com')
    expect(result.text.length).toBeLessThanOrEqual(8000)
  })

  it('fetchUrl returns formatted summary string', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return okHtml()
    })

    const out = await fetchUrl('https://example.com')
    expect(out).toContain('Title: Free AI Resources')
  })

  it('previewScrapeText truncates long content', () => {
    const preview = previewScrapeText({
      url: 'https://x.com',
      title: 'T',
      text: 'x'.repeat(1000),
      links: [],
    })
    expect(preview).toContain('…')
  })

  it('previewScrapeText omits ellipsis for short content', () => {
    const preview = previewScrapeText({
      url: 'https://x.com',
      title: 'Short',
      text: 'brief',
      links: [],
    })
    expect(preview).not.toContain('…')
    expect(preview).toContain('brief')
  })

  it('skips invalid wikipedia URLs', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return okHtml(SAMPLE_HTML)
    })
    const result = await scrapeWebPage('https://en.wikipedia.org/not-wiki-path')
    expect(result.title).toBe('Free AI Resources')
  })

  it('falls through when wikipedia summary has no extract', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/api/rest_v1/')) {
        return { ok: true, json: async () => ({ title: 'Empty' }) } as Response
      }
      if (u.includes('r.jina.ai')) return failStatus(502)
      return okHtml(SAMPLE_HTML)
    })
    const result = await scrapeWebPage('https://en.wikipedia.org/wiki/Empty')
    expect(result.text).toContain('Community')
  })

  it('recovers from direct 403 via proxy', async () => {
    let direct = true
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      if (direct && u === 'https://blocked403.com') {
        direct = false
        return failStatus(403)
      }
      return okHtml()
    })
    const result = await scrapeWebPage('https://blocked403.com')
    expect(result.title).toBe('Free AI Resources')
  })

  it('returns via proxy branch when direct fetch is 403', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      if (u === 'https://needs-proxy.example/') return failStatus(403)
      return okHtml()
    })
    const result = await scrapeWebPage('https://needs-proxy.example/')
    expect(result.title).toBe('Free AI Resources')
  })

  it('throws when 403 and all proxies fail', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return failStatus(403)
    })
    await expect(scrapeWebPage('https://hard403.com')).rejects.toThrow(/403|refused|forbid/i)
  })

  it('throws when all proxies fail without recording lastError', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      throw 'string failure'
    })
    await expect(scrapeWebPage('https://proxy-fail.test')).rejects.toThrow()
  })

  it('uses proxy when direct fetch returns 500', async () => {
    let calls = 0
    vi.mocked(fetch).mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('r.jina.ai')) return failStatus(502)
      calls++
      if (calls === 1) return failStatus(500)
      return okHtml()
    })
    const result = await scrapeWebPage('https://server-error.com')
    expect(result.title).toBe('Free AI Resources')
  })

  it('returns null when wikipedia URL parsing fails internally', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('wikipedia.org/api')) return failStatus(404)
      if (String(url).includes('r.jina.ai')) return failStatus(502)
      return okHtml()
    })
    const result = await scrapeWebPage('https://en.wikipedia.org/wiki/%E0%A4%A')
    expect(result.title).toBe('Free AI Resources')
  })

  it('rejects malformed URLs before fetching', async () => {
    await expect(scrapeWebPage('http://%zz')).rejects.toThrow(/invalid url/i)
  })
})
