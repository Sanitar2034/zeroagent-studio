import { runWithDiscardGuard, type DiscardGuardOptions } from './workflowGuard'
import { EXAMPLE_TRY_PROMPT_HINT_KEY, EXAMPLE_LOADED_EVENT } from './appStorage'
import {
  loadExampleWorkflow,
  getExampleWorkflowMeta,
  type ExampleWorkflowId,
} from './exampleWorkflows'

export { getExampleWorkflowMeta }

export const QUICK_START_EXAMPLE_ID = 'quick-start' as const satisfies ExampleWorkflowId
export const SNACK_VERDICT_EXAMPLE_ID = 'snack-verdict' as const satisfies ExampleWorkflowId
export const WRITER_EDITOR_EXAMPLE_ID = 'writer-editor' as const satisfies ExampleWorkflowId

export function getExampleLoadGuardOptions(id: ExampleWorkflowId): DiscardGuardOptions {
  const meta = getExampleWorkflowMeta(id)
  return {
    title: `Load ${meta?.name ?? 'example'}?`,
    message: meta?.description ?? 'This replaces your current canvas.',
    confirmLabel: 'Load example',
  }
}

function syncExampleTryPromptHint(id: ExampleWorkflowId): void {
  if (typeof sessionStorage === 'undefined') return
  const meta = getExampleWorkflowMeta(id)
  if (meta?.tryPrompt) {
    sessionStorage.setItem(EXAMPLE_TRY_PROMPT_HINT_KEY, '1')
  } else {
    sessionStorage.removeItem(EXAMPLE_TRY_PROMPT_HINT_KEY)
  }
  window.dispatchEvent(new CustomEvent(EXAMPLE_LOADED_EVENT))
}

export async function requestLoadExampleWorkflow(
  id: ExampleWorkflowId,
  afterLoad?: () => void
): Promise<void> {
  await runWithDiscardGuard(
    () => {
      loadExampleWorkflow(id)
      syncExampleTryPromptHint(id)
      afterLoad?.()
    },
    getExampleLoadGuardOptions(id)
  )
}

export async function requestLoadQuickStartExample(afterLoad?: () => void): Promise<void> {
  await requestLoadExampleWorkflow(QUICK_START_EXAMPLE_ID, afterLoad)
}
