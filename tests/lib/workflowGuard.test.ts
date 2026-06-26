import { describe, it, expect, vi, beforeEach } from 'vitest'
import { canvasHasWork, runWithDiscardGuard } from '../../src/lib/workflowGuard'
import { useWorkflowStore } from '../../src/stores/workflowStore'
import { useConfirmStore } from '../../src/stores/confirmStore'
import { makeChat } from '../helpers/graphBuilders'

describe('workflowGuard', () => {
  beforeEach(() => {
    useWorkflowStore.getState().newWorkflow()
    useConfirmStore.setState({ pending: null })
  })

  it('detects canvas work', () => {
    expect(canvasHasWork()).toBe(false)
    useWorkflowStore.getState().setNodes([makeChat('c')])
    expect(canvasHasWork()).toBe(true)
  })

  it('runs action immediately on empty canvas', async () => {
    const action = vi.fn()
    await runWithDiscardGuard(action, { title: 'T' })
    expect(action).toHaveBeenCalled()
    expect(useConfirmStore.getState().pending).toBeNull()
  })

  it('asks before discarding work', async () => {
    useWorkflowStore.getState().setNodes([makeChat('c')])
    const action = vi.fn()
    const run = runWithDiscardGuard(action, { title: 'Replace?' })
    expect(useConfirmStore.getState().pending?.title).toBe('Replace?')
    useConfirmStore.getState().respond(false)
    await run
    expect(action).not.toHaveBeenCalled()
  })

  it('runs action when user confirms discard', async () => {
    useWorkflowStore.getState().markDirty()
    const action = vi.fn()
    const run = runWithDiscardGuard(action, { title: 'Replace?' })
    useConfirmStore.getState().respond(true)
    await run
    expect(action).toHaveBeenCalled()
  })

  it('honors skipIf', async () => {
    useWorkflowStore.getState().setNodes([makeChat('c')])
    const action = vi.fn()
    await runWithDiscardGuard(action, {
      title: 'Skip',
      skipIf: () => true,
    })
    expect(action).toHaveBeenCalled()
  })
})
