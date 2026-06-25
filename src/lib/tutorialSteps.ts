import type { TutorialQuestId } from './tutorialQuests'
import {
  SNACK_QUEST_STEPS,
  PIPELINE_QUEST_STEPS,
  ENCODING_QUEST_STEPS,
  getQuestSteps,
} from './tutorialQuests'

export type { TutorialQuestId } from './tutorialQuests'
export {
  SNACK_QUEST_STEPS,
  PIPELINE_QUEST_STEPS,
  ENCODING_QUEST_STEPS,
  TUTORIAL_QUESTS,
  getTutorialQuest,
  getQuestSteps,
  getTutorialCompletedKey,
  LEGACY_TUTORIAL_COMPLETED_KEY,
} from './tutorialQuests'

export type TutorialPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'
export type TutorialAdvance = 'manual' | 'auto'

export interface TutorialStep {
  id: string
  title: string
  body: string
  target?: string
  placement: TutorialPlacement
  advance: TutorialAdvance
  /** Palette drag types to highlight (e.g. chat, tool-web-scraper) */
  highlightPalette?: string[]
}

/** Default snack quest steps (backward compatible) */
export const TUTORIAL_STEPS = SNACK_QUEST_STEPS

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length

export function getTutorialStep(
  index: number,
  questId: TutorialQuestId = 'snack'
): TutorialStep | undefined {
  return getQuestSteps(questId)[index]
}

export function getTutorialStepById(id: string, questId?: TutorialQuestId): TutorialStep | undefined {
  if (questId) {
    return getQuestSteps(questId).find((s) => s.id === id)
  }
  return (
    SNACK_QUEST_STEPS.find((s) => s.id === id) ??
    PIPELINE_QUEST_STEPS.find((s) => s.id === id) ??
    ENCODING_QUEST_STEPS.find((s) => s.id === id)
  )
}
