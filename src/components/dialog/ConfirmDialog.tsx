import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfirmStore } from '../../stores/confirmStore'

export default function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending)
  const respond = useConfirmStore((s) => s.respond)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pending) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') respond(false)
      if (e.key === 'Enter') respond(true)
    }
    document.addEventListener('keydown', onKeyDown)
    const focusCancel = pending.variant === 'danger' && !pending.alertOnly
    const timer = window.setTimeout(() => {
      if (focusCancel) cancelRef.current?.focus()
      else confirmRef.current?.focus()
    }, 0)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(timer)
    }
  }, [pending, respond])

  const handleBackdropClick = () => {
    if (!pending || pending.alertOnly) return
    if (pending.variant === 'danger') return
    respond(false)
  }

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          className="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          role="presentation"
        >
          <motion.div
            className={`confirm-dialog confirm-dialog--${pending.variant ?? 'default'}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="confirm-dialog-title">
              {pending.title}
            </h2>
            <p id="confirm-dialog-desc" className="confirm-dialog-message">
              {pending.message}
            </p>
            <div className="confirm-dialog-actions">
              {!pending.alertOnly && (
                <button
                  ref={cancelRef}
                  type="button"
                  className="confirm-btn confirm-btn--ghost"
                  onClick={() => respond(false)}
                >
                  {pending.cancelLabel ?? 'Cancel'}
                </button>
              )}
              <button
                ref={confirmRef}
                type="button"
                className={`confirm-btn ${
                  pending.variant === 'danger' && !pending.alertOnly
                    ? 'confirm-btn--danger'
                    : 'confirm-btn--primary'
                }`}
                onClick={() => respond(true)}
              >
                {pending.confirmLabel ?? 'OK'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
