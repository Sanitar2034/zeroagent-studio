import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import { getQuestSteps } from '../lib/tutorialQuests'
import type { TutorialQuestId } from '../lib/tutorialQuests'
import {
  getTutorialCompletedKey,
  LEGACY_TUTORIAL_COMPLETED_KEY,
  QUEST_IDS,
} from '../lib/tutorialQuests'
import {
  isStepComplete,
  isSuccessfulAssistantReply,
  type TutorialSnapshot,
} from '../lib/tutorialValidators'
import type { AgentNodeData, ToolNodeData } from '../types'
import { useConnectionStore } from './connectionStore'

export type { TutorialQuestId } from '../lib/tutorialQuests'

/** @deprecated Use getTutorialCompletedKey('snack') */
export const TUTORIAL_COMPLETED_KEY = getTutorialCompletedKey('snack')

export interface TutorialState {
  active: boolean
  questId: TutorialQuestId
  stepIndex: number
  showFinale: boolean
  showLaunchSplash: boolean
  runAttempted: boolean
  runFinished: boolean
  start: (options?: { resetCanvas?: boolean; questId?: TutorialQuestId }) => void
  next: () => void
  skip: () => void
  complete: () => void
  dismissFinale: () => void
  showLaunchSplashAction: () => void
  dismissLaunchSplash: () => void
  checkAutoAdvance: (snapshot: Omit<TutorialSnapshot, 'runAttempted' | 'runFinished'>) => void
  trackExecution: (isRunning: boolean, nodes: Node[]) => void
  isCompleted: (questId?: TutorialQuestId) => boolean
}

type WorkflowActions = {
  newWorkflow: () => void
  nodes: Node[]
  edges: Edge[]
  workflowName: string
}

let workflowAccessor: (() => WorkflowActions) | null = null

export function registerTutorialWorkflowAccessor(getter: () => WorkflowActions): void {
  workflowAccessor = getter
}

function readCompleted(questId: TutorialQuestId): boolean {
  if (typeof localStorage === 'undefined') return false
  const key = getTutorialCompletedKey(questId)
  if (localStorage.getItem(key) === '1') return true
  if (questId === 'snack' && localStorage.getItem(LEGACY_TUTORIAL_COMPLETED_KEY) === '1') {
    localStorage.setItem(key, '1')
    localStorage.removeItem(LEGACY_TUTORIAL_COMPLETED_KEY)
    return true
  }
  return false
}

function persistCompleted(questId: TutorialQuestId): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(getTutorialCompletedKey(questId), '1')
  }
}

function buildSnapshot(
  state: Pick<TutorialState, 'runAttempted' | 'runFinished'>,
  partial: Omit<TutorialSnapshot, 'runAttempted' | 'runFinished'>
): TutorialSnapshot {
  return {
    ...partial,
    runAttempted: state.runAttempted,
    runFinished: state.runFinished,
  }
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: false,
  questId: 'snack',
  stepIndex: 0,
  showFinale: false,
  showLaunchSplash: false,
  runAttempted: false,
  runFinished: false,

  start: (options) => {
    const questId = options?.questId ?? 'snack'
    if (options?.resetCanvas !== false) {
      workflowAccessor?.().newWorkflow()
    }
    useConnectionStore.getState().resetRejections()
    set({
      active: true,
      questId,
      stepIndex: 0,
      showFinale: false,
      runAttempted: false,
      runFinished: false,
    })
  },

  next: () => {
    const { stepIndex, active, questId } = get()
    if (!active) return
    const steps = getQuestSteps(questId)
    const nextIndex = stepIndex + 1
    if (nextIndex >= steps.length) {
      get().complete()
      return
    }
    set({ stepIndex: nextIndex })
  },

  skip: () => {
    const { questId } = get()
    persistCompleted(questId)
    set({
      active: false,
      showFinale: false,
      runAttempted: false,
      runFinished: false,
    })
  },

  complete: () => {
    const { questId } = get()
    persistCompleted(questId)
    set({
      active: false,
      showFinale: true,
      runAttempted: false,
      runFinished: false,
    })
  },

  dismissFinale: () => {
    set({ showFinale: false })
  },

  showLaunchSplashAction: () => {
    set({ showLaunchSplash: true })
  },

  dismissLaunchSplash: () => {
    set({ showLaunchSplash: false })
  },

  checkAutoAdvance: (partial) => {
    const { active, stepIndex, questId } = get()
    if (!active) return
    const step = getQuestSteps(questId)[stepIndex]
    if (!step || step.advance !== 'auto') return

    const snapshot = buildSnapshot(get(), partial)
    if (isStepComplete(step.id, snapshot)) {
      get().next()
    }
  },

  trackExecution: (isRunning, nodes) => {
    const { active, runAttempted, runFinished } = get()
    if (!active) return

    if (isRunning && !runAttempted) {
      set({ runAttempted: true })
    }

    if (runAttempted && !isRunning && !runFinished) {
      const chat = nodes.find((n) => n.type === 'chat')
      const messages =
        (chat?.data as { messages?: { role: string; content?: string; id?: string }[] } | undefined)
          ?.messages ?? []
      const assistant = [...messages].reverse().find((m) => m.role === 'assistant')
      if (
        assistant &&
        isSuccessfulAssistantReply(assistant.content ?? '', assistant.id)
      ) {
        set({ runFinished: true })
        return
      }

      const textOutput = nodes.find(
        (n) => n.type === 'tool' && (n.data as ToolNodeData).toolType === 'text-output'
      )
      if (textOutput && ((textOutput.data as ToolNodeData).outputLog?.length ?? 0) > 0) {
        set({ runFinished: true })
        return
      }

      const agentWithOutput = nodes.some(
        (n) =>
          n.type === 'agent' && Boolean((n.data as AgentNodeData).lastOutput?.trim())
      )
      if (agentWithOutput) {
        set({ runFinished: true })
      }
    }
  },

  isCompleted: (questId = 'snack') => readCompleted(questId),
}))

export function resetTutorialWorkflowAccessorForTests(): void {
  workflowAccessor = null
}

export function resetTutorialStorageForTests(): void {
  if (typeof localStorage !== 'undefined') {
    for (const questId of QUEST_IDS) {
      localStorage.removeItem(getTutorialCompletedKey(questId))
    }
    localStorage.removeItem(LEGACY_TUTORIAL_COMPLETED_KEY)
  }
}
