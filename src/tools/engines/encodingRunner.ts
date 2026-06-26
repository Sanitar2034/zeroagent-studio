export type EncodingPreset =
  | 'base64-encode'
  | 'base64-decode'
  | 'url-encode'
  | 'url-decode'
  | 'html-encode'
  | 'html-decode'
  | 'hex-encode'
  | 'hex-decode'
  | 'unicode-escape'
  | 'unicode-unescape'
  | 'rot13'
  | 'binary-encode'
  | 'base64url-encode'
  | 'base64url-decode'
  | 'jwt-decode'
  | 'crc32'

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function htmlEncode(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]!)
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
}

function htmlDecode(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (entity, body: string) => {
    if (body.startsWith('#x')) return String.fromCharCode(parseInt(body.slice(2), 16))
    if (body.startsWith('#')) return String.fromCharCode(Number(body.slice(1)))
    const named = NAMED_HTML_ENTITIES[body.toLowerCase()]
    return named ?? entity
  })
}

function rot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
  })
}

function base64UrlEncode(text: string): string {
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? padded : padded + '='.repeat(4 - (padded.length % 4))
  try {
    return decodeURIComponent(escape(atob(pad)))
  } catch {
    throw new Error('Invalid Base64URL input')
  }
}

function crc32(text: string): string {
  let crc = 0xffffffff
  const bytes = new TextEncoder().encode(text)
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

function decodeJwtPayload(token: string): string {
  const parts = token.trim().split('.')
  if (parts.length < 2) throw new Error('Invalid JWT format')
  const payload = base64UrlDecode(parts[1]!)
  const parsed = JSON.parse(payload)
  return JSON.stringify(parsed, null, 2)
}

export function runEncodingPreset(preset: EncodingPreset, input: string): string {
  const text = input

  switch (preset) {
    case 'base64-encode':
      return btoa(unescape(encodeURIComponent(text)))
    case 'base64-decode':
      try {
        return decodeURIComponent(escape(atob(text.trim())))
      } catch {
        throw new Error('Invalid Base64 input')
      }
    case 'base64url-encode':
      return base64UrlEncode(text)
    case 'base64url-decode':
      return base64UrlDecode(text)
    case 'jwt-decode':
      return decodeJwtPayload(text)
    case 'crc32':
      return crc32(text)
    case 'url-encode':
      return encodeURIComponent(text)
    case 'url-decode':
      return decodeURIComponent(text)
    case 'html-encode':
      return htmlEncode(text)
    case 'html-decode':
      return htmlDecode(text)
    case 'hex-encode':
      return [...new TextEncoder().encode(text)].map((b) => b.toString(16).padStart(2, '0')).join('')
    case 'hex-decode': {
      const hex = text.replace(/\s/g, '')
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [])
      return new TextDecoder().decode(bytes)
    }
    case 'unicode-escape':
      return text.replace(/[^\x20-\x7E]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)
    case 'unicode-unescape':
      return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    case 'rot13':
      return rot13(text)
    case 'binary-encode':
      return [...new TextEncoder().encode(text)].map((b) => b.toString(2).padStart(8, '0')).join(' ')
    default:
      return text
  }
}
