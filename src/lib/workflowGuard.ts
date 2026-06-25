import { useConfirmStore } from '../stores/confirmStore'
import { useWorkflowStore } from '../stores/workflowStore'

export function canvasHasWork(): boolean {
  const { nodes, isDirty } = useWorkflowStore.getState()
  return nodes.length > 0 || isDirty
}

function discardMessage(): string {
  if (useWorkflowStore.getState().isDirty) {
    return 'You have unsaved changes on this canvas. Save first (header → Save), or continue to discard them.'
  }
  return 'This will clear the current canvas and cannot be undone.'
}

export interface DiscardGuardOptions {
  title: string
  message?: string
  confirmLabel?: string
  skipIf?: () => boolean
}

export async function runWithDiscardGuard(
  action: () => void | Promise<void>,
  options: DiscardGuardOptions
): Promise<void> {
  if (options.skipIf?.()) {
    await action()
    return
  }
  if (!canvasHasWork()) {
    await action()
    return
  }

  const confirmed = await useConfirmStore.getState().confirm({
    title: options.title,
    message: options.message ?? discardMessage(),
    confirmLabel: options.confirmLabel ?? 'Discard & continue',
    variant: 'danger',
  })
  if (confirmed) await action()
}
