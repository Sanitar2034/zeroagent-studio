export function InspectorSetupNotice({
  message,
  onOpenPrivacyKeys,
  onOpenPrivacy,
}: {
  message: string
  onOpenPrivacyKeys?: () => void
  onOpenPrivacy?: () => void
}) {
  return (
    <aside className="inspector-setup-notice" role="status" aria-labelledby="inspector-setup-title">
      <p id="inspector-setup-title" className="inspector-setup-notice-title">
        Setup required
      </p>
      <p className="inspector-setup-notice-body">{message}</p>
      {(onOpenPrivacyKeys || onOpenPrivacy) && (
        <div className="inspector-setup-notice-actions">
          {onOpenPrivacyKeys && (
            <button type="button" className="inspector-setup-notice-btn" onClick={onOpenPrivacyKeys}>
              Open Privacy &amp; keys
            </button>
          )}
          {onOpenPrivacy && (
            <button
              type="button"
              className="inspector-setup-notice-btn inspector-setup-notice-btn--secondary"
              onClick={onOpenPrivacy}
            >
              Privacy &amp; cloud providers
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
