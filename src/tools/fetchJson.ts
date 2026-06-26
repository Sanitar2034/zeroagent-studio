export async function fetchJsonTool(input: string, config: Record<string, string>): Promise<string> {
  const url = (config.url?.trim() || input.trim())
  if (!url) throw new Error('No URL provided — wire upstream or set URL in inspector')
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported')
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    throw new Error('Response is not valid JSON')
  }
}
