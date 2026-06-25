/** Returns true when an IPv4 quad is in a private, loopback, or link-local range. */
function isPrivateIpv4(a: number, b: number): boolean {
  if (a === 0 || a === 127) return true
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  return false
}

/** Hostnames used for DNS rebinding to private addresses. */
const REBINDING_SUFFIXES = ['.nip.io', '.sslip.io', '.xip.io', '.localtest.me'] as const

function looksLikeRebindingHostname(host: string): boolean {
  const lower = host.toLowerCase()
  if (!REBINDING_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return false
  return /(?:^|[.-])(?:127|10|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:[.-]|$)/.test(lower)
    || lower.includes('localhost')
}

/** Decimal-encoded IPv4 hostnames (e.g. 2130706433 → 127.0.0.1). */
function isDecimalEncodedIpv4Host(host: string): boolean {
  if (!/^\d+$/.test(host)) return false
  const num = Number(host)
  if (!Number.isFinite(num) || num < 0 || num > 0xffffffff) return false
  const a = (num >>> 24) & 0xff
  const b = (num >>> 16) & 0xff
  return isPrivateIpv4(a, b)
}

/** Hostnames we refuse to fetch — local/private targets must not be scraped via proxies. */
export function isBlockedFetchHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  if (host === 'metadata.google.internal' || host.endsWith('.internal')) return true
  if (host === '0.0.0.0' || host === '::' || host === '::1') return true
  if (host.startsWith('127.')) return true
  if (host.startsWith('10.')) return true
  if (host.startsWith('192.168.')) return true
  if (host.startsWith('169.254.')) return true
  if (host.startsWith('fe80:')) return true
  if (host.includes('127.0.0.1') || host.includes('0.0.0.0')) return true

  if (looksLikeRebindingHostname(host)) return true
  if (isDecimalEncodedIpv4Host(host)) return true

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const octets = ipv4.slice(1, 5).map(Number) as [number, number, number, number]
    if (octets.some((n) => n > 255)) return true
    const [a, b] = octets
    if (isPrivateIpv4(a, b)) return true
  }

  // IPv4-mapped IPv6 loopback/private
  if (/^::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(host)) return true

  return false
}

/** True when hostname is a legitimate *.wikipedia.org host (e.g. en.wikipedia.org). */
export function isWikipediaHostname(hostname: string): boolean {
  const labels = hostname.toLowerCase().split('.')
  if (labels.length < 2) return false
  return labels[labels.length - 1] === 'org' && labels[labels.length - 2] === 'wikipedia'
}

/** Normalize and validate a user-provided URL for http(s) public fetching only. */
export function normalizeHttpUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('No URL provided for web scraper')
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error('Only http and https URLs are supported')
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withProtocol)
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`)
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded login credentials are not supported')
  }

  if (isBlockedFetchHostname(parsed.hostname)) {
    throw new Error(
      'This URL points to a local or private network address. Use a public https:// page instead.'
    )
  }

  return parsed.href
}
