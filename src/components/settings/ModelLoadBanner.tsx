import { motion, AnimatePresence } from 'framer-motion'
import { useModelLoadStore } from '../../stores/modelLoadStore'

export default function ModelLoadBanner() {
  const isLoading = useModelLoadStore((s) => s.isLoading)
  const engineName = useModelLoadStore((s) => s.engineName)
  const progress = useModelLoadStore((s) => s.progress)
  const statusText = useModelLoadStore((s) => s.statusText)

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="model-load-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="model-load-header">
            <span>First-time AI download — {engineName}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="model-load-bar">
            <div className="model-load-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          {statusText && <div className="model-load-status">{statusText}</div>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
