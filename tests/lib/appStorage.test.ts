import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  clearAppStorageCategory,
  clearKeyPreference,
  clearModelCache,
  clearModelCooldowns,
  clearPrivacyConsent,
  clearAgentSetupAdvice,
  hasAgentSetupAdvice,
  markAgentSetupAdvice,
  clearTutorialProgress,
  clearUiPreferences,
  getAppStorageCategory,
  getStorageRetentionLabel,
  hasPrivacyConsent,
  markPrivacyConsent,
} from '../../src/lib/appStorage'
import { clearAllStoredApiKeys, saveKeyPersistencePreference } from '../../src/lib/keyStorage'
import { DEFAULT_KEY_PERSISTENCE } from '../../src/lib/keyPersistenceGuidance'
import { clearAllWorkflows } from '../../src/db'

vi.mock('../../src/db', () => ({
  clearAllWorkflows: vi.fn(async () => undefined),
}))

vi.mock('../../src/lib/keyStorage', () => ({
  clearAllStoredApiKeys: vi.fn(async () => undefined),
  saveKeyPersistencePreference: vi.fn(),
}))

describe('appStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('lists storage categories with metadata', () => {
    expect(getAppStorageCategory('api-keys')?.label).toBe('API keys')
    expect(getStorageRetentionLabel('session')).toBe('Closes with browser')
    expect(getStorageRetentionLabel('local')).toBe('Until you clear')
    expect(getStorageRetentionLabel('indexeddb')).toBe('Until you clear')
    expect(getStorageRetentionLabel('mixed', 'session')).toBe('Closes with browser')
    expect(getStorageRetentionLabel('mixed', 'local')).toBe('Until you clear')
    expect(getAppStorageCategory('missing' as never)).toBeUndefined()
  })

  it('tracks privacy consent', () => {
    expect(hasPrivacyConsent()).toBe(false)
    markPrivacyConsent()
    expect(hasPrivacyConsent()).toBe(true)
    clearPrivacyConsent()
    expect(hasPrivacyConsent()).toBe(false)
  })

  it('tracks agent setup advice', () => {
    expect(hasAgentSetupAdvice()).toBe(false)
    markAgentSetupAdvice()
    expect(hasAgentSetupAdvice()).toBe(true)
    clearAgentSetupAdvice()
    expect(hasAgentSetupAdvice()).toBe(false)
  })

  it('clears all quest completion keys', async () => {
    const { getTutorialCompletedKey, QUEST_IDS } = await import('../../src/lib/tutorialQuests')
    for (const id of QUEST_IDS) {
      localStorage.setItem(getTutorialCompletedKey(id), '1')
    }
    await clearAppStorageCategory('tutorial-progress')
    for (const id of QUEST_IDS) {
      expect(localStorage.getItem(getTutorialCompletedKey(id))).toBeNull()
    }
  })

  it('clears categories without injected callbacks', async () => {
    await clearAppStorageCategory('api-keys')
    expect(clearAllStoredApiKeys).toHaveBeenCalled()

    const resetWorkflowCanvas = vi.fn()
    await clearAppStorageCategory('workflows', { resetWorkflowCanvas })
    expect(clearAllWorkflows).toHaveBeenCalled()
    expect(resetWorkflowCanvas).toHaveBeenCalled()

    const resetKeyPersistence = vi.fn(async () => undefined)
    await clearAppStorageCategory('key-preference', { resetKeyPersistence })
    expect(resetKeyPersistence).toHaveBeenCalled()
    expect(saveKeyPersistencePreference).not.toHaveBeenCalled()

    await clearAppStorageCategory('tutorial-progress')
    await clearAppStorageCategory('ui-preferences')
    await clearAppStorageCategory('model-cache')
    await clearAppStorageCategory('model-cooldowns')
  })

  it('clears all app data categories', async () => {
    const { clearAllAppData, hasPrivacyConsent, markPrivacyConsent, hasAgentSetupAdvice, markAgentSetupAdvice } =
      await import('../../src/lib/appStorage')
    markPrivacyConsent()
    markAgentSetupAdvice()
    const clearApiKeys = vi.fn(async () => undefined)
    await clearAllAppData({ clearApiKeys, resetWorkflowCanvas: vi.fn() })
    expect(clearApiKeys).toHaveBeenCalled()
    expect(hasPrivacyConsent()).toBe(false)
    expect(hasAgentSetupAdvice()).toBe(false)
  })

  it('no-ops storage helpers when browser storage is unavailable', () => {
    const ls = globalThis.localStorage
    const ss = globalThis.sessionStorage
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    Object.defineProperty(globalThis, 'sessionStorage', { value: undefined, configurable: true })

    expect(hasPrivacyConsent()).toBe(true)
    expect(() => markPrivacyConsent()).not.toThrow()
    expect(() => clearPrivacyConsent()).not.toThrow()
    expect(() => markAgentSetupAdvice()).not.toThrow()
    expect(() => clearAgentSetupAdvice()).not.toThrow()
    expect(hasAgentSetupAdvice()).toBe(true)
    expect(() => clearTutorialProgress()).not.toThrow()
    expect(() => clearUiPreferences()).not.toThrow()
    expect(() => clearModelCache()).not.toThrow()
    expect(() => clearKeyPreference()).not.toThrow()
    expect(() => clearModelCooldowns()).not.toThrow()

    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true })
    Object.defineProperty(globalThis, 'sessionStorage', { value: ss, configurable: true })
  })

  it('defaults key preference reset to session mode', async () => {
    await clearAppStorageCategory('key-preference')
    expect(saveKeyPersistencePreference).toHaveBeenCalledWith(DEFAULT_KEY_PERSISTENCE)
  })

  it('skips dispatch when window is unavailable', async () => {
    const originalWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true })
    await clearAppStorageCategory('model-cooldowns')
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
  })
})
