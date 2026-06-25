import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsStore } from '../../src/stores/settingsStore'
import * as keyStorage from '../../src/lib/keyStorage'

vi.mock('../../src/lib/keyStorage', () => ({
  persistStoredApiKeys: vi.fn(),
  loadStoredApiKeys: vi.fn(async () => ({ openrouter: 'sk-or-loaded' })),
  resolveKeyPersistencePreference: vi.fn(async () => 'session' as const),
  clearAllStoredApiKeys: vi.fn(),
  saveKeyPersistencePreference: vi.fn(),
}))

describe('settingsStore — BYOK keys stay optional', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({
      apiKeys: {},
      keyPersistence: 'session',
      isSettingsOpen: false,
      settingsFocus: null,
      privacyConsentOpen: false,
      agentAdviceOpen: false,
      isLoaded: false,
    })
  })

  it('loads keys with resolved persistence on startup', async () => {
    await useSettingsStore.getState().loadSettings()
    expect(useSettingsStore.getState().apiKeys.openrouter).toBe('sk-or-loaded')
    expect(useSettingsStore.getState().keyPersistence).toBe('session')
    expect(useSettingsStore.getState().isLoaded).toBe(true)
  })

  it('setApiKey merges and auto-persists', () => {
    useSettingsStore.getState().setApiKey('groq', 'gsk_1')
    useSettingsStore.getState().setApiKey('openrouter', 'sk-or_2')
    expect(useSettingsStore.getState().apiKeys).toEqual({
      groq: 'gsk_1',
      openrouter: 'sk-or_2',
    })
    expect(keyStorage.persistStoredApiKeys).toHaveBeenCalled()
  })

  it('switches persistence mode and migrates keys', async () => {
    useSettingsStore.setState({ apiKeys: { gemini: 'AIza_x' }, keyPersistence: 'session' })
    await useSettingsStore.getState().setKeyPersistence('local')
    expect(keyStorage.clearAllStoredApiKeys).toHaveBeenCalled()
    expect(keyStorage.persistStoredApiKeys).toHaveBeenCalledWith('local', { gemini: 'AIza_x' })
    expect(useSettingsStore.getState().keyPersistence).toBe('local')
  })

  it('clears all stored keys', async () => {
    useSettingsStore.setState({ apiKeys: { groq: 'gsk_1' } })
    await useSettingsStore.getState().clearApiKeys()
    expect(keyStorage.clearAllStoredApiKeys).toHaveBeenCalled()
    expect(useSettingsStore.getState().apiKeys).toEqual({})
  })

  it('saveSettings persists current keys', async () => {
    useSettingsStore.setState({ apiKeys: { openrouter: 'sk-or_1' }, keyPersistence: 'local' })
    await useSettingsStore.getState().saveSettings()
    expect(keyStorage.persistStoredApiKeys).toHaveBeenCalledWith('local', { openrouter: 'sk-or_1' })
  })

  it('ignores redundant persistence changes', async () => {
    await useSettingsStore.getState().setKeyPersistence('session')
    expect(keyStorage.clearAllStoredApiKeys).not.toHaveBeenCalled()
  })

  it('toggles settings panel and privacy focus', () => {
    useSettingsStore.getState().openSettings()
    expect(useSettingsStore.getState().settingsFocus).toBeNull()
    useSettingsStore.getState().openSettings('privacy')
    expect(useSettingsStore.getState().isSettingsOpen).toBe(true)
    expect(useSettingsStore.getState().settingsFocus).toBe('privacy')
    useSettingsStore.getState().openSettings('data')
    expect(useSettingsStore.getState().settingsFocus).toBe('data')
    useSettingsStore.getState().closeSettings()
    expect(useSettingsStore.getState().isSettingsOpen).toBe(false)
    expect(useSettingsStore.getState().settingsFocus).toBeNull()
  })

  it('opens privacy consent dialog for replay', () => {
    useSettingsStore.getState().openPrivacyConsentDialog()
    expect(useSettingsStore.getState().privacyConsentOpen).toBe(true)
    useSettingsStore.getState().closePrivacyConsentDialog()
    expect(useSettingsStore.getState().privacyConsentOpen).toBe(false)
  })

  it('opens agent setup advice dialog for replay', () => {
    useSettingsStore.getState().openAgentSetupAdviceDialog()
    expect(useSettingsStore.getState().agentAdviceOpen).toBe(true)
    useSettingsStore.getState().closeAgentSetupAdviceDialog()
    expect(useSettingsStore.getState().agentAdviceOpen).toBe(false)
  })

  it('opens settings with data and keys focus targets', () => {
    useSettingsStore.getState().openSettings('keys')
    expect(useSettingsStore.getState().settingsFocus).toBe('keys')
  })
})
