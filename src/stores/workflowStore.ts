import { create } from 'zustand'
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, Connection } from '@xyflow/react'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'
import type { AgentNodeData, ToolNodeData, ChatNodeData } from '../types'
import { saveWorkflow, loadWorkflows, deleteWorkflow } from '../db'
import { migrateWorkflow } from '../lib/workflowMigration'
import {
  applyImportedWorkflow,
  buildWorkflowExportDocument,
  downloadWorkflowExport,
  type WorkflowExportDocument,
} from '../lib/workflowIo'
import {
  describeConnectionRejection,
  isValidWorkflowConnection,
  normalizeConnection,
} from '../lib/connectionValidation'
import {
  isLockedNodeChangeBlocked,
  isNodeCanvasLocked,
  NODE_CANVAS_LOCK_HINT,
  withNodeCanvasLockFlags,
} from '../lib/nodeCanvasLock'
import { useConnectionStore } from './connectionStore'
import { useDebugStore } from './debugStore'
import { fitWorkflowView } from '../lib/flowCanvasRegistry'

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  workflowId: number | null
  workflowName: string
  isDirty: boolean
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  updateNodeData: (nodeId: string, data: Partial<AgentNodeData | ToolNodeData | ChatNodeData>) => void
  setWorkflowName: (name: string) => void
  markDirty: () => void
  saveCurrentWorkflow: () => Promise<void>
  loadWorkflow: (id: number) => Promise<void>
  newWorkflow: () => void
  getWorkflowList: () => Promise<{ id: number; name: string; updatedAt: number }[]>
  removeWorkflow: (id: number) => Promise<void>
  deleteNode: (nodeId: string) => void
  toggleNodeLock: (nodeId: string) => void
  deleteSelectedNodes: () => void
  exportWorkflowFile: () => void
  importWorkflowDocument: (document: WorkflowExportDocument) => void
  hasCanvasWork: () => boolean
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isDirty: false,

  onNodesChange: (changes) => {
    const nodes = get().nodes
    const filtered = changes.filter((change) => !isLockedNodeChangeBlocked(change, nodes))
    set({ nodes: applyNodeChanges(filtered, nodes), isDirty: true })
  },

  onEdgesChange: (changes) => {
    const nodes = get().nodes
    const edges = get().edges
    let blockedLockedRemove = false
    const filtered = changes.filter((change) => {
      if (change.type !== 'remove') return true
      const edge = edges.find((e) => e.id === change.id)
      if (!edge) return true
      const source = nodes.find((n) => n.id === edge.source)
      const target = nodes.find((n) => n.id === edge.target)
      const blocked = isNodeCanvasLocked(source) || isNodeCanvasLocked(target)
      if (blocked) blockedLockedRemove = true
      return !blocked
    })
    if (blockedLockedRemove) {
      useConnectionStore.getState().recordRejection(NODE_CANVAS_LOCK_HINT)
      useDebugStore.getState().addLog({
        level: 'warn',
        source: 'Canvas',
        message: NODE_CANVAS_LOCK_HINT,
      })
    }
    set({ edges: applyEdgeChanges(filtered, edges), isDirty: true })
  },

  onConnect: (connection: Connection) => {
    const nodes = get().nodes
    const edges = get().edges
    const sourceNode = nodes.find((n) => n.id === connection.source)
    const targetNode = nodes.find((n) => n.id === connection.target)
    if (isNodeCanvasLocked(sourceNode) || isNodeCanvasLocked(targetNode)) {
      useConnectionStore.getState().recordRejection(NODE_CANVAS_LOCK_HINT)
      useDebugStore.getState().addLog({
        level: 'warn',
        source: 'Canvas',
        message: NODE_CANVAS_LOCK_HINT,
      })
      return
    }
    const normalized = normalizeConnection(connection, nodes)
    if (!normalized || !isValidWorkflowConnection(normalized, nodes, edges)) {
      const reason = describeConnectionRejection(connection, nodes, edges)
      if (reason) {
        useConnectionStore.getState().recordRejection(reason)
        useDebugStore.getState().addLog({
          level: 'warn',
          source: 'Canvas',
          message: reason,
        })
      }
      return
    }
    set({
      edges: addEdge({ ...normalized, type: 'animated' }, edges),
      isDirty: true,
    })
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    set({ nodes: [...get().nodes, withNodeCanvasLockFlags(node)], isDirty: true })
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n
        const next = { ...n, data: { ...n.data, ...data } }
        return withNodeCanvasLockFlags(next)
      }),
      isDirty: true,
    })
  },

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),
  markDirty: () => set({ isDirty: true }),

  saveCurrentWorkflow: async () => {
    const { nodes, edges, workflowId, workflowName } = get()
    let createdAt = Date.now()
    if (workflowId != null) {
      const existing = (await loadWorkflows()).find((w) => w.id === workflowId)
      if (existing) createdAt = existing.createdAt
    }
    const id = await saveWorkflow({
      id: workflowId ?? undefined,
      name: workflowName,
      nodes: nodes as never[],
      edges: edges as never[],
      createdAt,
      updatedAt: Date.now(),
    })
    set({ workflowId: id, isDirty: false })
  },

  loadWorkflow: async (id) => {
    const workflows = await loadWorkflows()
    const workflow = workflows.find((w) => w.id === id)
    if (workflow) {
      const nodes = workflow.nodes as unknown as Node[]
      const migrated = migrateWorkflow(nodes, workflow.edges as Edge[])
      set({
        nodes: migrated.nodes,
        edges: migrated.edges,
        workflowId: workflow.id ?? null,
        workflowName: workflow.name,
        isDirty: false,
      })
      fitWorkflowView()
    }
  },

  newWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      workflowId: null,
      workflowName: 'Untitled Workflow',
      isDirty: false,
    })
  },

  getWorkflowList: async () => {
    const workflows = await loadWorkflows()
    return workflows.map((w) => ({
      id: w.id!,
      name: w.name,
      updatedAt: w.updatedAt,
    }))
  },

  removeWorkflow: async (id) => {
    await deleteWorkflow(id)
    if (get().workflowId === id) {
      get().newWorkflow()
    }
  },

  deleteNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    if (isNodeCanvasLocked(node)) return
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      isDirty: true,
    })
  },

  toggleNodeLock: (nodeId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n
        const locked = !isNodeCanvasLocked(n)
        return withNodeCanvasLockFlags({ ...n, data: { ...n.data, locked } })
      }),
      isDirty: true,
    })
  },

  deleteSelectedNodes: () => {
    const ids = new Set(
      get()
        .nodes.filter((n) => n.selected && !isNodeCanvasLocked(n))
        .map((n) => n.id)
    )
    if (ids.size === 0) return
    set({
      nodes: get().nodes.filter((n) => !ids.has(n.id)),
      edges: get().edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      isDirty: true,
    })
  },

  hasCanvasWork: () => {
    const { nodes, isDirty } = get()
    return nodes.length > 0 || isDirty
  },

  exportWorkflowFile: () => {
    const { nodes, edges, workflowName } = get()
    const doc = buildWorkflowExportDocument(workflowName, nodes, edges)
    downloadWorkflowExport(doc)
    useDebugStore.getState().addLog({
      level: 'success',
      source: 'Workflow',
      message: `Exported "${doc.workflow.name}" to .zeroagent.json`,
    })
  },

  importWorkflowDocument: (document) => {
    const applied = applyImportedWorkflow(document)
    set({
      nodes: applied.nodes,
      edges: applied.edges,
      workflowName: applied.name,
      workflowId: null,
      isDirty: true,
    })
    useDebugStore.getState().addLog({
      level: 'success',
      source: 'Workflow',
      message: `Imported "${applied.name}" (${applied.nodes.length} blocks)`,
    })
    fitWorkflowView()
  },
}))
