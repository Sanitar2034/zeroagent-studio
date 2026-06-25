import { create } from 'zustand'
import type { ApiKeys } from '../types'
import {
  type KeyPersistence,
  resolveKeyPersistencePreference,
  loadStoredApiKeys,
  persistStoredApiKeys,
  clearAllStoredApiKeys,
  saveKeyPersistencePreference,
} from '../lib/keyStorage'
import { DEFAULT_KEY_PERSISTENCE } from '../lib/keyPersistenceGuidance'

export type SettingsFocus = 'privacy' | 'data' | 'keys'

interface SettingsState {
  apiKeys: ApiKeys
  keyPersistence: KeyPersistence
  isSettingsOpen: boolean
  /** Scroll target when opening Privacy & keys. */
  settingsFocus: SettingsFocus | null
  privacyConsentOpen: boolean
  agentAdviceOpen: boolean
  isLoaded: boolean
  setApiKey: (provider: keyof ApiKeys, key: string) => void
  setKeyPersistence: (mode: KeyPersistence) => Promise<void>
  clearApiKeys: () => Promise<void>
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
  openSettings: (focus?: SettingsFocus) => void
  closeSettings: () => void
  openPrivacyConsentDialog: () => void
  closePrivacyConsentDialog: () => void
  openAgentSetupAdviceDialog: () => void
  closeAgentSetupAdviceDialog: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: {},
  keyPersistence: DEFAULT_KEY_PERSISTENCE,
  isSettingsOpen: false,
  settingsFocus: null,
  privacyConsentOpen: false,
  agentAdviceOpen: false,
  isLoaded: false,

  setApiKey: (provider, key) => {
    const apiKeys = { ...get().apiKeys, [provider]: key }
    set({ apiKeys })
    void persistStoredApiKeys(get().keyPersistence, apiKeys)
  },

  setKeyPersistence: async (mode) => {
    const current = get().keyPersistence
    if (current === mode) return
    const apiKeys = get().apiKeys
    saveKeyPersistencePreference(mode)
    await clearAllStoredApiKeys()
    await persistStoredApiKeys(mode, apiKeys)
    set({ keyPersistence: mode })
  },

  clearApiKeys: async () => {
    await clearAllStoredApiKeys()
    set({ apiKeys: {} })
  },

  loadSettings: async () => {
    const keyPersistence = await resolveKeyPersistencePreference()
    const apiKeys = await loadStoredApiKeys(keyPersistence)
    set({ apiKeys, keyPersistence, isLoaded: true })
  },

  saveSettings: async () => {
    await persistStoredApiKeys(get().keyPersistence, get().apiKeys)
  },

  openSettings: (focus) => set({ isSettingsOpen: true, settingsFocus: focus ?? null }),
  closeSettings: () => set({ isSettingsOpen: false, settingsFocus: null }),
  openPrivacyConsentDialog: () => set({ privacyConsentOpen: true }),
  closePrivacyConsentDialog: () => set({ privacyConsentOpen: false }),
  openAgentSetupAdviceDialog: () => set({ agentAdviceOpen: true }),
  closeAgentSetupAdviceDialog: () => set({ agentAdviceOpen: false }),
}))
