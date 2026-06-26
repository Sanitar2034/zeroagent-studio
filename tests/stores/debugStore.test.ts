import { describe, it, expect, beforeEach } from 'vitest'
import { useDebugStore } from '../../src/stores/debugStore'

describe('debugStore — agent thought stream', () => {
  beforeEach(() => {
    useDebugStore.setState({ logs: [], isOpen: false, activeNodeId: null })
  })

  it('caps logs at 500 entries (weak PC memory protection)', () => {
    for (let i = 0; i < 510; i++) {
      useDebugStore.getState().addLog({
        level: 'info',
        source: 'test',
        message: `log ${i}`,
      })
    }
    expect(useDebugStore.getState().logs.length).toBe(500)
    expect(useDebugStore.getState().logs[0].message).toBe('log 10')
  })

  it('clears logs on user request', () => {
    useDebugStore.getState().addLog({ level: 'thought', source: 'a', message: 'thinking' })
    useDebugStore.getState().clearLogs()
    expect(useDebugStore.getState().logs).toHaveLength(0)
  })

  it('toggles debug panel', () => {
    useDebugStore.getState().togglePanel()
    expect(useDebugStore.getState().isOpen).toBe(true)
  })
})
