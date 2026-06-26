import { motion } from 'framer-motion'
import {
  APP_STORAGE_CATEGORIES,
  getStorageRetentionLabel,
  LOCAL_DATA_PRIVACY,
} from '../../lib/appStorage'
import { DEFAULT_KEY_PERSISTENCE } from '../../lib/keyPersistenceGuidance'
import { useSettingsStore } from '../../stores/settingsStore'
import StorageRetentionLegend from '../settings/StorageRetentionLegend'

interface PrivacyConsentDialogProps {
  onAccept: () => void
  onOpenSettings: () => void
}

export default function PrivacyConsentDialog({ onAccept, onOpenSettings }: PrivacyConsentDialogProps) {
  const keyPersistence = useSettingsStore((s) =>
    s.isLoaded ? s.keyPersistence : DEFAULT_KEY_PERSISTENCE
  )

  return (
    <>
      <motion.div
        className="privacy-consent-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <div className="privacy-consent-anchor">
        <motion.div
          className="privacy-consent-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-consent-title"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          <h2 id="privacy-consent-title">{LOCAL_DATA_PRIVACY.title}</h2>
          <p className="privacy-consent-lead">{LOCAL_DATA_PRIVACY.lead}</p>
          <StorageRetentionLegend className="data-inventory-legend privacy-consent-legend" />
          <ul className="data-inventory-list privacy-consent-storage-list">
            {APP_STORAGE_CATEGORIES.map((category) => {
              const badge =
                category.id === 'api-keys'
                  ? getStorageRetentionLabel(category.storageType, keyPersistence)
                  : getStorageRetentionLabel(category.storageType)

              return (
                <li key={category.id} className="data-inventory-item privacy-consent-storage-item">
                  <div className="data-inventory-copy">
                    <div className="data-inventory-head">
                      <strong>{category.label}</strong>
                      <span className="data-inventory-badge">{badge}</span>
                    </div>
                    <p>{category.description}</p>
                    <p className="data-inventory-security">{category.securityNote}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="privacy-consent-note">
            You can change what is saved, delete categories individually, or wipe everything in{' '}
            <strong>Privacy &amp; keys</strong> (header).
          </p>
          <div className="privacy-consent-actions">
            <button type="button" className="privacy-consent-btn primary" onClick={onAccept}>
              Got it
            </button>
            <button type="button" className="privacy-consent-btn" onClick={onOpenSettings}>
              Open Privacy &amp; keys
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}
