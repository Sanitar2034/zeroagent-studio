import { useWorkflowStore } from '../../stores/workflowStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useExecutionStore } from '../../stores/executionStore'
import { useDebugStore } from '../../stores/debugStore'
import {
  getWorkflowStarterKind,
  workflowStarterLabel,
  workflowStarterHint,
} from '../../lib/workflowStarters'
import { runWorkflowStarter, formatWorkflowRunError } from '../../lib/workflowRun'

function LockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-1" />
    </svg>
  )
}

export function NodeActionBar({
  nodeId,
  selected,
  locked = false,
}: {
  nodeId: string
  selected?: boolean
  locked?: boolean
}) {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const deleteNode = useWorkflowStore((s) => s.deleteNode)
  const toggleNodeLock = useWorkflowStore((s) => s.toggleNodeLock)
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const addLog = useDebugStore((s) => s.addLog)

  const node = nodes.find((n) => n.id === nodeId)
  const starterKind = node ? getWorkflowStarterKind(node, nodes, edges, apiKeys) : null

  if (!starterKind && !selected) {
    return null
  }

  const handleRun = async () => {
    if (!starterKind || isRunning) return
    try {
      await runWorkflowStarter(starterKind, nodeId, nodes, edges, apiKeys)
    } catch (err) {
      const status = formatWorkflowRunError(err)
      addLog({ level: 'error', source: 'Workflow', message: status.text })
    }
  }

  return (
    <div className="node-action-bar">
      {starterKind && (
        <button
          type="button"
          className="node-run-workflow-btn"
          disabled={isRunning}
          title={workflowStarterHint(starterKind)}
          onClick={(e) => {
            e.stopPropagation()
            void handleRun()
          }}
        >
          {isRunning ? '…' : workflowStarterLabel(starterKind)}
        </button>
      )}
      {selected && (
        <>
          <button
            type="button"
            className={`node-toolbar-btn node-lock-btn ${locked ? 'node-lock-btn--active' : ''}`}
            title={locked ? 'Unlock block (allow move, resize, delete, wires)' : 'Lock block'}
            aria-label={locked ? 'Unlock block' : 'Lock block'}
            aria-pressed={locked}
            onClick={(e) => {
              e.stopPropagation()
              toggleNodeLock(nodeId)
            }}
          >
            <LockIcon locked={locked} />
          </button>
          {!locked && (
            <button
              type="button"
              className="node-toolbar-btn node-delete-btn"
              title="Delete block"
              aria-label="Delete block"
              onClick={(e) => {
                e.stopPropagation()
                deleteNode(nodeId)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  )
}