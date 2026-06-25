import type { TutorialStep } from '../tutorialSteps'

export type TutorialQuestId =
  | 'snack'
  | 'pipeline'
  | 'encoding'
  | 'parallel'
  | 'writers-room'
  | 'url-detective'
  | 'voice-booth'
  | 'capture-desk'

export type QuestCategory = 'basics' | 'advanced'

export interface TutorialQuest {
  id: TutorialQuestId
  title: string
  subtitle: string
  steps: TutorialStep[]
}

/** Short labels and flows for welcome, header, and canvas — keep in sync everywhere. */
export interface QuestCatalogEntry {
  id: TutorialQuestId
  step: string
  shortLabel: string
  title: string
  flow: string
  description: string
  category: QuestCategory
  featured?: boolean
}
