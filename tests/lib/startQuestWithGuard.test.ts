import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as tutorialQuests from '../../src/lib/tutorialQuests'
import { startQuestWithGuard } from '../../src/lib/startQuestWithGuard'
import { useTutorialStore } from '../../src/stores/tutorialStore'
import { useWorkflowStore } from '../../src/stores/workflowStore'
import { useConfirmStore } from '../../src/stores/confirmStore'
import { makeChat } from '../helpers/graphBuilders'

describe('startQuestWithGuard', () => {
  beforeEach(() => {
    useWorkflowStore.getState().newWorkflow()
    useConfirmStore.setState({ pending: null })
    useTutorialStore.setState({ active: false, questId: 'snack', stepIndex: 0 })
  })

  it('starts quest immediately on empty canvas', async () => {
    const start = vi.spyOn(useTutorialStore.getState(), 'start')
    await startQuestWithGuard('pipeline')
    expect(start).toHaveBeenCalledWith({ resetCanvas: true, questId: 'pipeline' })
  })

  it('confirms before starting when canvas has work', async () => {
    useWorkflowStore.getState().setNodes([makeChat('c')])
    const start = vi.spyOn(useTutorialStore.getState(), 'start')
    const run = startQuestWithGuard('encoding')
    expect(useConfirmStore.getState().pending?.title).toContain('Encoding Chain')
    useConfirmStore.getState().respond(true)
    await run
    expect(start).toHaveBeenCalledWith({ resetCanvas: true, questId: 'encoding' })
  })

  it('falls back to quest id when catalog entry is missing', async () => {
    vi.spyOn(tutorialQuests, 'getQuestCatalog').mockReturnValue([])
    useWorkflowStore.getState().setNodes([makeChat('c')])
    const run = startQuestWithGuard('snack')
    expect(useConfirmStore.getState().pending?.title).toContain('snack')
    useConfirmStore.getState().respond(true)
    await run
  })
})
