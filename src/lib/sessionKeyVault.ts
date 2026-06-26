import type { ApiKeys } from '../types'

const SESSION_VAULT_KEY = 'zeroagent-session-vault-key'
export const SESSION_API_KEYS_KEY = 'zeroagent-api-keys'
export { SESSION_VAULT_KEY }

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(blob: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(blob), (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

function packCipher(iv: Uint8Array, cipher: ArrayBuffer): string {
  const merged = new Uint8Array(iv.length + cipher.byteLength)
  merged.set(iv, 0)
  merged.set(new Uint8Array(cipher), iv.length)
  return bytesToBase64(merged)
}

function unpackCipher(blob: string): { iv: Uint8Array; cipher: Uint8Array } | null {
  const bytes = base64ToBytes(blob)
  if (!bytes || bytes.length < 13) return null
  return { iv: bytes.slice(0, 12), cipher: bytes.slice(12) }
}

async function importVaultKey(rawB64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(rawB64)
  if (!raw) throw new Error('Invalid vault key')
  const keyBytes = new Uint8Array(raw)
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function getOrCreateVaultKey(): Promise<CryptoKey> {
  let raw = sessionStorage.getItem(SESSION_VAULT_KEY)
  if (!raw) {
    raw = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    sessionStorage.setItem(SESSION_VAULT_KEY, raw)
  }
  return importVaultKey(raw)
}

export async function encryptSessionApiKeys(keys: ApiKeys): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await getOrCreateVaultKey()
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(JSON.stringify(keys))
  )
  return packCipher(iv, cipher)
}

export async function decryptSessionApiKeys(blob: string): Promise<ApiKeys | null> {
  const packed = unpackCipher(blob)
  if (!packed) return null
  try {
    const key = await getOrCreateVaultKey()
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(packed.iv) },
      key,
      new Uint8Array(packed.cipher)
    )
    const parsed: unknown = JSON.parse(textDecoder.decode(plain))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as ApiKeys
  } catch {
    return null
  }
}

export function clearSessionKeyVault(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(SESSION_VAULT_KEY)
  sessionStorage.removeItem(SESSION_API_KEYS_KEY)
}

/** Plain JSON session payloads from releases before AES-GCM vault storage. */
export function parseLegacySessionApiKeys(raw: string): ApiKeys | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as ApiKeys
  } catch {
    return null
  }
}
