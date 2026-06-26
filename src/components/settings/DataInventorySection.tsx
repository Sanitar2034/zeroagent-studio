import {
  APP_STORAGE_CATEGORIES,
  type AppStorageCategoryId,
  clearAppStorageCategory,
  clearAllAppData,
  getStorageRetentionLabel,
} from '../../lib/appStorage'
import { useConfirmStore } from '../../stores/confirmStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkflowStore } from '../../stores/workflowStore'
import StorageRetentionLegend from './StorageRetentionLegend'

export default function DataInventorySection({
  onReplayPrivacyConsent,
  onReplayAgentAdvice,
}: {
  onReplayPrivacyConsent: () => void
  onReplayAgentAdvice: () => void
}) {
  const keyPersistence = useSettingsStore((s) => s.keyPersistence)
  const clearApiKeys = useSettingsStore((s) => s.clearApiKeys)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const setKeyPersistence = useSettingsStore((s) => s.setKeyPersistence)
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow)
  const confirm = useConfirmStore((s) => s.confirm)

  const clearOptions = {
    clearApiKeys,
    resetWorkflowCanvas: () => newWorkflow(),
    resetKeyPersistence: async () => {
      await setKeyPersistence('session')
      await loadSettings()
    },
  }

  const handleClearCategory = async (id: AppStorageCategoryId, label: string) => {
    const ok = await confirm({
      title: `Clear ${label}?`,
      message: `This removes ${label.toLowerCase()} from this browser. You can always add it back later.`,
      confirmLabel: `Clear ${label}`,
      variant: 'danger',
    })
    if (!ok) return
    await clearAppStorageCategory(id, clearOptions)
    if (id === 'key-preference' || id === 'api-keys') {
      await loadSettings()
    }
  }

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Clear everything?',
      message:
        'This wipes API keys, saved workflows, quest progress, UI preferences, caches, and resets key save mode. Your current canvas will be cleared too.',
      confirmLabel: 'Clear everything',
      variant: 'danger',
    })
    if (!ok) return
    await clearAllAppData(clearOptions)
    await loadSettings()
    newWorkflow()
  }

  return (
    <section className="settings-section settings-data" id="settings-data-section">
      <h3>Your data on this device</h3>
      <p className="settings-hint">
        Everything below lives in your browser on this computer — never on our servers. Tags show{' '}
        <strong>when</strong> each item goes away, not a different machine.
      </p>
      <StorageRetentionLegend />

      <ul className="data-inventory-list">
        {APP_STORAGE_CATEGORIES.map((category) => {
          const badge =
            category.id === 'api-keys'
              ? getStorageRetentionLabel(category.storageType, keyPersistence)
              : getStorageRetentionLabel(category.storageType)

          return (
            <li key={category.id} className="data-inventory-item">
              <div className="data-inventory-copy">
                <div className="data-inventory-head">
                  <strong>{category.label}</strong>
                  <span className="data-inventory-badge">{badge}</span>
                </div>
                <p>{category.description}</p>
                <p className="data-inventory-security">{category.securityNote}</p>
              </div>
              <button
                type="button"
                className="data-inventory-clear"
                onClick={() => void handleClearCategory(category.id, category.label)}
              >
                Clear
              </button>
            </li>
          )
        })}
      </ul>

      <div className="data-inventory-footer">
        <button type="button" className="settings-clear-btn" onClick={() => void handleClearAll()}>
          Clear everything
        </button>
        <button type="button" className="data-inventory-link" onClick={onReplayPrivacyConsent}>
          View startup privacy notice
        </button>
        <button type="button" className="data-inventory-link" onClick={onReplayAgentAdvice}>
          View startup performance advice
        </button>
      </div>
    </section>
  )
}
