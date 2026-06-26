import { create } from 'zustand'
import type { DebugLogEntry } from '../types'

interface DebugState {
  logs: DebugLogEntry[]
  isOpen: boolean
  activeNodeId: string | null
  addLog: (entry: Omit<DebugLogEntry, 'id' | 'timestamp'>) => void
  clearLogs: () => void
  togglePanel: () => void
  setActiveNode: (nodeId: string | null) => void
}

let logCounter = 0

export const useDebugStore = create<DebugState>((set, get) => ({
  logs: [],
  isOpen: false,
  activeNodeId: null,

  addLog: (entry) => {
    const log: DebugLogEntry = {
      ...entry,
      id: `log-${++logCounter}`,
      timestamp: Date.now(),
    }
    set({ logs: [...get().logs, log].slice(-500) })
  },

  clearLogs: () => set({ logs: [] }),
  togglePanel: () => set({ isOpen: !get().isOpen }),
  setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
}))
