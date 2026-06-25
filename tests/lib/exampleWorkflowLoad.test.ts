import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getExampleWorkflowMeta,
  getExampleLoadGuardOptions,
  requestLoadExampleWorkflow,
  requestLoadQuickStartExample,
  QUICK_START_EXAMPLE_ID,
} from '../../src/lib/exampleWorkflowLoad'
import type { ExampleWorkflowId } from '../../src/lib/exampleWorkflows'
import { EXAMPLE_TRY_PROMPT_HINT_KEY, EXAMPLE_LOADED_EVENT } from '../../src/lib/appStorage'
import { useWorkflowStore } from '../../src/stores/workflowStore'

const confirm = vi.fn()

vi.mock('../../src/stores/confirmStore', () => ({
  useConfirmStore: {
    getState: () => ({ confirm }),
  },
}))

describe('exampleWorkflowLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWorkflowStore.getState().newWorkflow()
    confirm.mockResolvedValue(true)
  })

  it('exposes quick-start id and metadata', () => {
    expect(QUICK_START_EXAMPLE_ID).toBe('quick-start')
    expect(getExampleWorkflowMeta('quick-start')?.name).toBe('Hello, Agent')
  })

  it('builds discard guard options from example metadata', () => {
    expect(getExampleLoadGuardOptions('encode-boomerang')).toEqual({
      title: 'Load Encode boomerang?',
      message: expect.stringContaining('Base64 round-trip'),
      confirmLabel: 'Load example',
    })
  })

  it('falls back when example metadata is missing', () => {
    expect(getExampleLoadGuardOptions('missing-id' as ExampleWorkflowId)).toEqual({
      title: 'Load example?',
      message: 'This replaces your current canvas.',
      confirmLabel: 'Load example',
    })
  })

  it('loads an example after discard confirmation', async () => {
    useWorkflowStore.getState().setNodes([{ id: 'n', type: 'chat', position: { x: 0, y: 0 }, data: {} }])
    await requestLoadExampleWorkflow('quick-start')
    expect(confirm).toHaveBeenCalled()
    expect(useWorkflowStore.getState().workflowName).toContain('Hello, Agent')
  })

  it('skips confirm on an empty canvas', async () => {
    await requestLoadQuickStartExample()
    expect(confirm).not.toHaveBeenCalled()
    expect(useWorkflowStore.getState().workflowName).toContain('Hello, Agent')
  })

  it('runs afterLoad callback', async () => {
    const afterLoad = vi.fn()
    await requestLoadQuickStartExample(afterLoad)
    expect(afterLoad).toHaveBeenCalled()
  })

  it('sets try-prompt hint session flag when example has tryPrompt', async () => {
    sessionStorage.removeItem(EXAMPLE_TRY_PROMPT_HINT_KEY)
    await requestLoadQuickStartExample()
    expect(sessionStorage.getItem(EXAMPLE_TRY_PROMPT_HINT_KEY)).toBe('1')
  })

  it('dispatches example loaded event when hint state changes', async () => {
    const listener = vi.fn()
    window.addEventListener(EXAMPLE_LOADED_EVENT, listener)
    await requestLoadQuickStartExample()
    expect(listener).toHaveBeenCalled()
    window.removeEventListener(EXAMPLE_LOADED_EVENT, listener)
  })

  it('clears try-prompt hint when example has no tryPrompt', async () => {
    sessionStorage.setItem(EXAMPLE_TRY_PROMPT_HINT_KEY, '1')
    await requestLoadExampleWorkflow('hacker-headlines')
    expect(sessionStorage.getItem(EXAMPLE_TRY_PROMPT_HINT_KEY)).toBeNull()
  })

  it('skips session hint bookkeeping when sessionStorage is unavailable', async () => {
    const original = globalThis.sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: undefined,
    })
    await requestLoadQuickStartExample()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: original,
    })
    expect(useWorkflowStore.getState().workflowName).toContain('Hello, Agent')
  })
})
