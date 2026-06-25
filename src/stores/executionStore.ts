import { create } from 'zustand'
import type { PortDataType } from '../lib/ports'

export interface EdgeTransferRecord {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string
  targetHandle: string
  value: string
  dataType: PortDataType
  timestamp: number
}

interface ExecutionState {
  isRunning: boolean
  currentNodeId: string | null
  thinkingNodes: Set<string>
  edgeTransfers: Record<string, EdgeTransferRecord>
  flowingEdges: Set<string>
  setRunning: (running: boolean) => void
  setCurrentNode: (nodeId: string | null) => void
  addThinkingNode: (nodeId: string) => void
  removeThinkingNode: (nodeId: string) => void
  clearThinking: () => void
  recordEdgeTransfer: (record: EdgeTransferRecord) => void
  setFlowingEdges: (edgeIds: string[]) => void
  clearFlowingEdges: () => void
  clearEdgeTransfers: () => void
  resetExecutionVisuals: () => void
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isRunning: false,
  currentNodeId: null,
  thinkingNodes: new Set(),
  edgeTransfers: {},
  flowingEdges: new Set(),

  setRunning: (running) => set({ isRunning: running }),
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),

  addThinkingNode: (nodeId) => {
    const next = new Set(get().thinkingNodes)
    next.add(nodeId)
    set({ thinkingNodes: next })
  },

  removeThinkingNode: (nodeId) => {
    const next = new Set(get().thinkingNodes)
    next.delete(nodeId)
    set({ thinkingNodes: next })
  },

  clearThinking: () => set({ thinkingNodes: new Set() }),

  recordEdgeTransfer: (record) => {
    set({
      edgeTransfers: {
        ...get().edgeTransfers,
        [record.edgeId]: record,
      },
    })
  },

  setFlowingEdges: (edgeIds) => set({ flowingEdges: new Set(edgeIds) }),

  clearFlowingEdges: () => set({ flowingEdges: new Set() }),

  clearEdgeTransfers: () => set({ edgeTransfers: {} }),

  resetExecutionVisuals: () =>
    set({
      thinkingNodes: new Set(),
      flowingEdges: new Set(),
      edgeTransfers: {},
      currentNodeId: null,
    }),
}))
