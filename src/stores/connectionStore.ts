import { create } from 'zustand'
import { useWorkflowStore } from './workflowStore'
import { computePortHighlightMap, type PortHighlightClass } from '../lib/portHighlights'

export interface ConnectingFrom {
  nodeId: string
  handleId: string
  handleType: 'source' | 'target'
}

interface ConnectionState {
  connectingFrom: ConnectingFrom | null
  portHighlights: Record<string, PortHighlightClass>
  rejectionCount: number
  lastRejectionMessage: string | null
  setConnectingFrom: (from: ConnectingFrom | null) => void
  recordRejection: (message: string) => void
  resetRejections: () => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connectingFrom: null,
  portHighlights: {},
  rejectionCount: 0,
  lastRejectionMessage: null,
  setConnectingFrom: (connectingFrom) => {
    const nodes = useWorkflowStore.getState().nodes
    const portHighlights = computePortHighlightMap(connectingFrom, nodes)
    set({ connectingFrom, portHighlights })
  },
  recordRejection: (message) =>
    set((s) => ({
      rejectionCount: s.rejectionCount + 1,
      lastRejectionMessage: message,
    })),
  resetRejections: () => set({ rejectionCount: 0, lastRejectionMessage: null }),
}))
