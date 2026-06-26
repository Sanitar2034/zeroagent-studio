import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SESSION_API_KEYS_KEY,
  SESSION_VAULT_KEY,
  clearSessionKeyVault,
  decryptSessionApiKeys,
  encryptSessionApiKeys,
  parseLegacySessionApiKeys,
} from '../../src/lib/sessionKeyVault'

describe('sessionKeyVault', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('round-trips API keys with AES-GCM', async () => {
    const keys = { groq: 'gsk_secret', openrouter: 'sk-or_test' }
    const blob = await encryptSessionApiKeys(keys)
    expect(blob).toBeTruthy()
    expect(blob).not.toContain('gsk_secret')
    await expect(decryptSessionApiKeys(blob)).resolves.toEqual(keys)
  })

  it('returns null for invalid cipher blobs', async () => {
    await expect(decryptSessionApiKeys('not-base64')).resolves.toBeNull()
    await expect(decryptSessionApiKeys('YWJj')).resolves.toBeNull()
    const encrypted = await encryptSessionApiKeys({ gemini: 'AIza' })
    const tampered = `${encrypted.slice(0, -4)}AAAA`
    await expect(decryptSessionApiKeys(tampered)).resolves.toBeNull()
  })

  it('returns null when decrypted payload is not an object', async () => {
    const blob = await encryptSessionApiKeys({ groq: 'x' })
    vi.spyOn(crypto.subtle, 'decrypt').mockResolvedValueOnce(
      new TextEncoder().encode('null').buffer
    )
    await expect(decryptSessionApiKeys(blob)).resolves.toBeNull()
    vi.restoreAllMocks()
  })

  it('rejects corrupt vault keys', async () => {
    sessionStorage.setItem('zeroagent-session-vault-key', 'not-valid-base64!!!')
    await expect(encryptSessionApiKeys({ groq: 'x' })).rejects.toThrow(/Invalid vault key/)
  })

  it('clears session vault material', () => {
    sessionStorage.setItem(SESSION_VAULT_KEY, 'vault')
    sessionStorage.setItem(SESSION_API_KEYS_KEY, 'blob')
    clearSessionKeyVault()
    expect(sessionStorage.getItem(SESSION_VAULT_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_API_KEYS_KEY)).toBeNull()
  })

  it('parses legacy plain JSON payloads', () => {
    expect(parseLegacySessionApiKeys('{"groq":"legacy"}')).toEqual({ groq: 'legacy' })
    expect(parseLegacySessionApiKeys('{bad')).toBeNull()
    expect(parseLegacySessionApiKeys('[]')).toBeNull()
  })
})
