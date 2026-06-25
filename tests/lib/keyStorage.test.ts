import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DEFAULT_KEY_PERSISTENCE } from '../../src/lib/keyPersistenceGuidance'
import { SESSION_VAULT_KEY } from '../../src/lib/sessionKeyVault'
import {
  KEY_PREFERENCE_STORAGE_KEY,
  SESSION_API_KEYS_KEY,
  clearAllStoredApiKeys,
  getStoredKeyPersistencePreference,
  loadStoredApiKeys,
  persistStoredApiKeys,
  resolveKeyPersistencePreference,
  saveKeyPersistencePreference,
} from '../../src/lib/keyStorage'

vi.mock('../../src/db', () => ({
  loadApiKeys: vi.fn(async () => ({ openrouter: 'sk-or-db' })),
  saveApiKeys: vi.fn(),
  deleteApiKeys: vi.fn(),
  hasIndexedDbApiKeys: vi.fn(async () => false),
}))

describe('keyStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('defaults to session when no legacy keys exist', async () => {
    const mode = await resolveKeyPersistencePreference()
    expect(mode).toBe(DEFAULT_KEY_PERSISTENCE)
    expect(getStoredKeyPersistencePreference()).toBe(DEFAULT_KEY_PERSISTENCE)
  })

  it('returns stored preference without re-resolving', async () => {
    saveKeyPersistencePreference('local')
    await expect(resolveKeyPersistencePreference()).resolves.toBe('local')
  })

  it('migrates existing IndexedDB keys to local persistence', async () => {
    const db = await import('../../src/db')
    vi.mocked(db.hasIndexedDbApiKeys).mockResolvedValueOnce(true)
    const mode = await resolveKeyPersistencePreference()
    expect(mode).toBe('local')
  })

  it('persists keys to session storage and clears IndexedDB', async () => {
    const db = await import('../../src/db')
    await persistStoredApiKeys('session', { groq: 'gsk_test' })
    const stored = sessionStorage.getItem(SESSION_API_KEYS_KEY)
    expect(stored).toBeTruthy()
    expect(stored).not.toContain('gsk_test')
    await expect(loadStoredApiKeys('session')).resolves.toEqual({ groq: 'gsk_test' })
    expect(db.deleteApiKeys).toHaveBeenCalled()
    expect(db.saveApiKeys).not.toHaveBeenCalled()
  })

  it('persists keys to IndexedDB in local mode', async () => {
    const db = await import('../../src/db')
    await persistStoredApiKeys('local', { gemini: 'AIza_x' })
    expect(db.saveApiKeys).toHaveBeenCalledWith({ gemini: 'AIza_x' })
    expect(sessionStorage.getItem(SESSION_API_KEYS_KEY)).toBeNull()
  })

  it('loads from the correct backing store', async () => {
    sessionStorage.setItem(SESSION_API_KEYS_KEY, JSON.stringify({ openrouter: 'sk-or-sess' }))
    saveKeyPersistencePreference('session')
    await expect(loadStoredApiKeys('session')).resolves.toEqual({ openrouter: 'sk-or-sess' })
    await expect(loadStoredApiKeys('local')).resolves.toEqual({ openrouter: 'sk-or-db' })
  })

  it('clears both session and IndexedDB stores', async () => {
    const db = await import('../../src/db')
    sessionStorage.setItem(SESSION_API_KEYS_KEY, JSON.stringify({ groq: 'x' }))
    await clearAllStoredApiKeys()
    expect(sessionStorage.getItem(SESSION_API_KEYS_KEY)).toBeNull()
    expect(db.deleteApiKeys).toHaveBeenCalled()
  })

  it('removes session keys when all providers are blank', async () => {
    sessionStorage.setItem(SESSION_API_KEYS_KEY, JSON.stringify({ openrouter: 'old' }))
    await persistStoredApiKeys('session', { openrouter: '   ', groq: '' })
    expect(sessionStorage.getItem(SESSION_API_KEYS_KEY)).toBeNull()
  })

  it('returns empty session keys when nothing stored', async () => {
    await expect(loadStoredApiKeys('session')).resolves.toEqual({})
  })

  it('ignores corrupt session payloads', async () => {
    sessionStorage.setItem(SESSION_API_KEYS_KEY, '{not-json')
    await expect(loadStoredApiKeys('session')).resolves.toEqual({})
    sessionStorage.setItem(SESSION_API_KEYS_KEY, '"nope"')
    await expect(loadStoredApiKeys('session')).resolves.toEqual({})
    sessionStorage.setItem(SESSION_API_KEYS_KEY, '42')
    await expect(loadStoredApiKeys('session')).resolves.toEqual({})
    sessionStorage.setItem(SESSION_API_KEYS_KEY, '[]')
    await expect(loadStoredApiKeys('session')).resolves.toEqual({})
  })

  it('reads and writes persistence preference', () => {
    expect(getStoredKeyPersistencePreference()).toBeNull()
    saveKeyPersistencePreference('local')
    expect(localStorage.getItem(KEY_PREFERENCE_STORAGE_KEY)).toBe('local')
    expect(getStoredKeyPersistencePreference()).toBe('local')
  })

  it('loads legacy JSON when Web Crypto is unavailable', async () => {
    sessionStorage.setItem(SESSION_API_KEYS_KEY, JSON.stringify({ groq: 'legacy_key' }))
    vi.stubGlobal('crypto', { subtle: undefined })
    await expect(loadStoredApiKeys('session')).resolves.toEqual({ groq: 'legacy_key' })
    vi.unstubAllGlobals()
  })

  it('skips session write when Web Crypto is unavailable', async () => {
    vi.stubGlobal('crypto', { subtle: undefined })
    await persistStoredApiKeys('session', { groq: 'gsk_no_crypto' })
    expect(sessionStorage.getItem(SESSION_API_KEYS_KEY)).toBeNull()
    vi.unstubAllGlobals()
  })

  it('clears vault material when all session keys are wiped', async () => {
    await persistStoredApiKeys('session', { groq: 'gsk_test' })
    expect(sessionStorage.getItem(SESSION_VAULT_KEY)).toBeTruthy()
    await clearAllStoredApiKeys()
    expect(sessionStorage.getItem(SESSION_API_KEYS_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_VAULT_KEY)).toBeNull()
  })

  it('no-ops when browser storage is unavailable', async () => {
    vi.stubGlobal('localStorage', undefined)
    vi.stubGlobal('sessionStorage', undefined)
    expect(getStoredKeyPersistencePreference()).toBeNull()
    saveKeyPersistencePreference('session')
    await expect(loadStoredApiKeys('session')).resolves.toEqual({})
    await expect(persistStoredApiKeys('session', { groq: 'gsk_x' })).resolves.toBeUndefined()
    await expect(clearAllStoredApiKeys()).resolves.toBeUndefined()
    vi.unstubAllGlobals()
  })
})
