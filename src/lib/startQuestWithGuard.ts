import type { TutorialQuestId } from './tutorialQuests'
import { runWithDiscardGuard } from './workflowGuard'
import { useTutorialStore } from '../stores/tutorialStore'
import { getQuestCatalog } from './tutorialQuests'

function questLabel(questId: TutorialQuestId): string {
  return getQuestCatalog().find((q) => q.id === questId)?.shortLabel ?? questId
}

export async function startQuestWithGuard(questId: TutorialQuestId): Promise<void> {
  await runWithDiscardGuard(
    () => {
      useTutorialStore.getState().start({ resetCanvas: true, questId })
    },
    {
      title: `Start ${questLabel(questId)}?`,
      message:
        'Starting a guided quest clears the canvas and replaces it with a fresh tutorial workflow.',
      confirmLabel: 'Start quest',
    }
  )
}
