import { describe, it, expect } from 'vitest'
import { normalizeHttpUrl, isBlockedFetchHostname, isWikipediaHostname } from '../../src/lib/validateUrl'

describe('isWikipediaHostname', () => {
  it('accepts language subdomains of wikipedia.org', () => {
    expect(isWikipediaHostname('en.wikipedia.org')).toBe(true)
    expect(isWikipediaHostname('pl.wikipedia.org')).toBe(true)
    expect(isWikipediaHostname('wikipedia.org')).toBe(true)
  })

  it('rejects lookalike hostnames', () => {
    expect(isWikipediaHostname('evilwikipedia.org')).toBe(false)
    expect(isWikipediaHostname('en.wikipedia.org.evil.com')).toBe(false)
    expect(isWikipediaHostname('not-wikipedia.org')).toBe(false)
    expect(isWikipediaHostname('wikipedia')).toBe(false)
  })
})

describe('isBlockedFetchHostname', () => {
  it('blocks localhost and private ranges', () => {
    expect(isBlockedFetchHostname('localhost')).toBe(true)
    expect(isBlockedFetchHostname('127.0.0.1')).toBe(true)
    expect(isBlockedFetchHostname('192.168.1.1')).toBe(true)
    expect(isBlockedFetchHostname('10.0.0.5')).toBe(true)
    expect(isBlockedFetchHostname('172.16.0.1')).toBe(true)
    expect(isBlockedFetchHostname('example.com')).toBe(false)
  })

  it('blocks private IPv4 ranges via decimal hostname encoding', () => {
    expect(isBlockedFetchHostname('167772161')).toBe(true) // 10.0.0.1
    expect(isBlockedFetchHostname('3232235777')).toBe(true) // 192.168.1.1
    expect(isBlockedFetchHostname('2851995649')).toBe(true) // 169.254.1.1
  })

  it('blocks metadata and internal hostnames', () => {
    expect(isBlockedFetchHostname('metadata.google.internal')).toBe(true)
    expect(isBlockedFetchHostname('service.corp.internal')).toBe(true)
  })

  it('allows public decimal-encoded hostnames', () => {
    expect(isBlockedFetchHostname('134744072')).toBe(false)
  })

  it('blocks rebinding hostnames that embed localhost', () => {
    expect(isBlockedFetchHostname('app.localhost.nip.io')).toBe(true)
  })

  it('allows rebinding suffix without private IP pattern', () => {
    expect(isBlockedFetchHostname('public.example.nip.io')).toBe(false)
  })

  it('blocks invalid dotted quads', () => {
    expect(isBlockedFetchHostname('999.999.999.999')).toBe(true)
  })

  it('blocks IPv4-mapped IPv6 private addresses', () => {
    expect(isBlockedFetchHostname('::ffff:127.0.0.1')).toBe(true)
    expect(isBlockedFetchHostname('::ffff:10.0.0.1')).toBe(true)
  })

  it('blocks link-local and zero addresses', () => {
    expect(isBlockedFetchHostname('169.254.169.254')).toBe(true)
    expect(isBlockedFetchHostname('fe80::1')).toBe(true)
    expect(isBlockedFetchHostname('0.0.0.0')).toBe(true)
    expect(isBlockedFetchHostname('::')).toBe(true)
    expect(isBlockedFetchHostname('host.local')).toBe(true)
    expect(isBlockedFetchHostname('prefix127.0.0.1.suffix.example')).toBe(true)
  })

  it('covers private IPv4 edge cases in the blocklist', () => {
    expect(isBlockedFetchHostname('0.1.2.3')).toBe(true)
    expect(isBlockedFetchHostname('172.15.0.1')).toBe(false)
    expect(isBlockedFetchHostname('192.167.1.1')).toBe(false)
    expect(isBlockedFetchHostname('169.253.1.1')).toBe(false)
    expect(isBlockedFetchHostname('::ffff:8.8.8.8')).toBe(false)
  })

  it('ignores non-decimal and out-of-range numeric hostnames', () => {
    expect(isBlockedFetchHostname('4294967296')).toBe(false)
    expect(isBlockedFetchHostname('abcdef')).toBe(false)
  })

  it('blocks common DNS rebinding hostnames', () => {
    expect(isBlockedFetchHostname('127.0.0.1.nip.io')).toBe(true)
  })
})

describe('normalizeHttpUrl', () => {
  it('adds https to bare domains', () => {
    expect(normalizeHttpUrl('example.com')).toBe('https://example.com/')
  })

  it('preserves existing https URLs', () => {
    expect(normalizeHttpUrl('https://already.secure.com/path')).toBe(
      'https://already.secure.com/path'
    )
  })

  it('rejects localhost and private network URLs', () => {
    expect(() => normalizeHttpUrl('http://localhost:8080')).toThrow(/local or private/i)
    expect(() => normalizeHttpUrl('http://192.168.0.1/admin')).toThrow(/local or private/i)
    expect(() => normalizeHttpUrl('http://2130706433/')).toThrow(/local or private/i)
    expect(() => normalizeHttpUrl('http://127.0.0.1.nip.io/')).toThrow(/local or private/i)
  })

  it('rejects URLs with embedded credentials', () => {
    expect(() => normalizeHttpUrl('https://user:pass@example.com')).toThrow(/credentials/i)
  })

  it('rejects empty input', () => {
    expect(() => normalizeHttpUrl('   ')).toThrow(/no url/i)
  })

  it('rejects non-http schemes', () => {
    expect(() => normalizeHttpUrl('javascript:alert(1)')).toThrow(/only http/i)
    expect(() => normalizeHttpUrl('file:///etc/passwd')).toThrow(/only http/i)
  })

  it('rejects malformed URLs', () => {
    expect(() => normalizeHttpUrl('not a url!!!')).toThrow(/invalid url/i)
  })
})
