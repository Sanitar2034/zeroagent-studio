import type { Edge, Node } from '@xyflow/react'
import type { ApiKeys } from '../types'
import {
  runWorkflowFromAgent,
  runWorkflowFromTool,
  runWorkflowToSink,
} from '../orchestrator/dag'
import type { WorkflowStarterKind } from './workflowStarters'

export type WorkflowRunStatus = { tone: 'ok' | 'warn'; text: string }

const STEP_ERRORS_MARKER = '⚠ Some workflow steps failed'

function previewWorkflowResult(result: string): string {
  const trimmed = result.trim()
  const markerIndex = trimmed.indexOf(STEP_ERRORS_MARKER)
  const body = markerIndex >= 0 ? trimmed.slice(0, markerIndex).trimEnd() : trimmed
  return body.slice(0, 240)
}

export function formatWorkflowRunResult(
  result: string,
  kind: WorkflowStarterKind
): WorkflowRunStatus {
  const trimmed = result.trim()
  const hasStepErrors = trimmed.includes(STEP_ERRORS_MARKER)
  const preview = previewWorkflowResult(result)

  if (kind === 'sink') {
    return {
      tone: hasStepErrors ? 'warn' : 'ok',
      text: preview
        ? `${hasStepErrors ? 'Partial capture' : 'Captured'}: ${preview}${result.length > 240 ? '…' : ''}`
        : hasStepErrors
          ? 'Capture finished with errors — see activity log.'
          : 'Capture run finished.',
    }
  }

  return {
    tone: hasStepErrors ? 'warn' : 'ok',
    text: preview
      ? `${hasStepErrors ? 'Partial run' : 'Done'}: ${preview}${result.length > 240 ? '…' : ''}`
      : hasStepErrors
        ? 'Workflow finished with errors — see activity log.'
        : 'Workflow run finished.',
  }
}

export function formatWorkflowRunError(err: unknown): WorkflowRunStatus {
  return {
    tone: 'warn',
    text: err instanceof Error ? err.message : String(err),
  }
}

export async function runWorkflowStarter(
  kind: WorkflowStarterKind,
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  apiKeys: ApiKeys
): Promise<string> {
  if (kind === 'agent') {
    return runWorkflowFromAgent(nodes, edges, nodeId, apiKeys)
  }
  if (kind === 'tool') {
    return runWorkflowFromTool(nodes, edges, nodeId, apiKeys)
  }
  return runWorkflowToSink(nodes, edges, nodeId, apiKeys)
}
