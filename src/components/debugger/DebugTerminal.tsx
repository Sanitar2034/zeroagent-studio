import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../../stores/debugStore'

const LEVEL_COLORS: Record<string, string> = {
  info: 'var(--accent-cyan)',
  warn: 'var(--accent-yellow)',
  error: 'var(--accent-red)',
  success: 'var(--accent-green)',
  thought: 'var(--accent-purple)',
}

function formatData(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

export default function DebugTerminal() {
  const logs = useDebugStore((s) => s.logs)
  const isOpen = useDebugStore((s) => s.isOpen)
  const togglePanel = useDebugStore((s) => s.togglePanel)
  const clearLogs = useDebugStore((s) => s.clearLogs)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={`debug-terminal ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="debug-header" onClick={togglePanel}>
        <span className="debug-title">
          <span className="debug-icon">▸</span>
          Activity log
          {logs.length > 0 && <span className="log-count">{logs.length}</span>}
        </span>
        <div className="debug-actions" onClick={(e) => e.stopPropagation()}>
          <button className="debug-btn" onClick={clearLogs}>Clear</button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="debug-body"
            ref={scrollRef}
            initial={{ height: 0 }}
            animate={{ height: 200 }}
            exit={{ height: 0 }}
          >
            {logs.length === 0 ? (
              <div className="debug-empty">Agent thoughts and API calls will appear here...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`debug-line level-${log.level}`}>
                  <div className="debug-line-main">
                    <span className="debug-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className="debug-level"
                      style={{ color: LEVEL_COLORS[log.level] }}
                    >
                      [{log.level}]
                    </span>
                    <span className="debug-source">{log.source}</span>
                    <span className="debug-message">{log.message}</span>
                    {log.data != null && (
                      <button
                        className="debug-expand-btn"
                        onClick={() => toggleExpanded(log.id)}
                      >
                        {expandedIds.has(log.id) ? '▼' : '▶'} data
                      </button>
                    )}
                  </div>
                  {log.data != null && expandedIds.has(log.id) && (
                    <pre className="debug-data">{formatData(log.data)}</pre>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
