import type { ApiKeys } from '../types'
import { deleteApiKeys, hasIndexedDbApiKeys, loadApiKeys, saveApiKeys } from '../db'
import { DEFAULT_KEY_PERSISTENCE } from './keyPersistenceGuidance'
import {
  SESSION_API_KEYS_KEY,
  decryptSessionApiKeys,
  encryptSessionApiKeys,
  clearSessionKeyVault,
  parseLegacySessionApiKeys,
} from './sessionKeyVault'

export { SESSION_API_KEYS_KEY }

export type KeyPersistence = 'session' | 'local'

export const KEY_PREFERENCE_STORAGE_KEY = 'zeroagent-key-persistence'

export function getStoredKeyPersistencePreference(): KeyPersistence | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(KEY_PREFERENCE_STORAGE_KEY)
  if (raw === 'session' || raw === 'local') return raw
  return null
}

export function saveKeyPersistencePreference(mode: KeyPersistence): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY_PREFERENCE_STORAGE_KEY, mode)
}

async function readSessionApiKeys(): Promise<ApiKeys> {
  if (typeof sessionStorage === 'undefined') return {}
  const raw = sessionStorage.getItem(SESSION_API_KEYS_KEY)
  if (!raw) return {}
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const decrypted = await decryptSessionApiKeys(raw)
    if (decrypted) return decrypted
  }
  return parseLegacySessionApiKeys(raw) ?? {}
}

async function writeSessionApiKeys(keys: ApiKeys): Promise<void> {
  if (typeof sessionStorage === 'undefined') return
  const hasAny = !!(keys.openrouter?.trim() || keys.groq?.trim() || keys.gemini?.trim())
  if (!hasAny) {
    sessionStorage.removeItem(SESSION_API_KEYS_KEY)
    return
  }
  if (typeof crypto === 'undefined' || !crypto.subtle) return
  sessionStorage.setItem(SESSION_API_KEYS_KEY, await encryptSessionApiKeys(keys))
}

function clearSessionApiKeys(): void {
  clearSessionKeyVault()
}

export async function resolveKeyPersistencePreference(): Promise<KeyPersistence> {
  const stored = getStoredKeyPersistencePreference()
  if (stored) return stored
  const legacy = await hasIndexedDbApiKeys()
  const mode: KeyPersistence = legacy ? 'local' : DEFAULT_KEY_PERSISTENCE
  saveKeyPersistencePreference(mode)
  return mode
}

export async function loadStoredApiKeys(persistence: KeyPersistence): Promise<ApiKeys> {
  if (persistence === 'session') return readSessionApiKeys()
  return loadApiKeys()
}

export async function persistStoredApiKeys(
  persistence: KeyPersistence,
  keys: ApiKeys
): Promise<void> {
  if (persistence === 'session') {
    await writeSessionApiKeys(keys)
    await deleteApiKeys()
    return
  }
  clearSessionApiKeys()
  await saveApiKeys(keys)
}

export async function clearAllStoredApiKeys(): Promise<void> {
  clearSessionApiKeys()
  await deleteApiKeys()
}

export { hasIndexedDbApiKeys }
