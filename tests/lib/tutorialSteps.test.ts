import { describe, it, expect } from 'vitest'
import {
  TUTORIAL_STEPS,
  TUTORIAL_STEP_COUNT,
  getTutorialStep,
  getTutorialStepById,
  getQuestSteps,
  PIPELINE_QUEST_STEPS,
  ENCODING_QUEST_STEPS,
} from '../../src/lib/tutorialSteps'
import { TUTORIAL_QUESTS } from '../../src/lib/tutorialQuests'

describe('tutorialSteps', () => {
  it('defines snack and pipeline quests', () => {
    expect(TUTORIAL_STEP_COUNT).toBe(11)
    expect(TUTORIAL_STEPS).toHaveLength(11)
    expect(getQuestSteps('pipeline')).toHaveLength(12)
    expect(getQuestSteps('encoding')).toHaveLength(10)
    expect(TUTORIAL_QUESTS.snack.title).toMatch(/Snack Investigator/)
    expect(TUTORIAL_QUESTS.pipeline.title).toMatch(/Pipeline/)
    expect(TUTORIAL_QUESTS.encoding.title).toMatch(/Encoding/)
  })

  it('every step has id, title, body, placement, and advance mode', () => {
    for (const step of [...TUTORIAL_STEPS, ...PIPELINE_QUEST_STEPS, ...ENCODING_QUEST_STEPS]) {
      expect(step.id.length).toBeGreaterThan(0)
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.body.length).toBeGreaterThan(0)
      expect(['top', 'bottom', 'left', 'right', 'center']).toContain(step.placement)
      expect(['manual', 'auto']).toContain(step.advance)
    }
  })

  it('snack auto steps wire to known validator ids', () => {
    const autoIds = TUTORIAL_STEPS.filter((s) => s.advance === 'auto').map((s) => s.id)
    expect(autoIds).toEqual([
      'drag-chat',
      'drag-scraper',
      'drag-agent',
      'wire-nodes',
      'brief-agent',
      'name-quest',
      'drop-evidence',
      'launch',
    ])
  })

  it('pipeline auto steps wire to known validator ids', () => {
    const autoIds = PIPELINE_QUEST_STEPS.filter((s) => s.advance === 'auto').map((s) => s.id)
    expect(autoIds).toEqual([
      'pipeline-drag-chat',
      'pipeline-drag-json',
      'pipeline-drag-script',
      'pipeline-drag-agent',
      'pipeline-ports-lesson',
      'pipeline-wire',
      'pipeline-script',
      'pipeline-drop-json',
      'pipeline-launch',
    ])
  })

  it('encoding auto steps wire to known validator ids', () => {
    const autoIds = ENCODING_QUEST_STEPS.filter((s) => s.advance === 'auto').map((s) => s.id)
    expect(autoIds).toEqual([
      'encoding-drag-chat',
      'encoding-drag-encode',
      'encoding-drag-decode',
      'encoding-drag-agent',
      'encoding-wire',
      'encoding-drop-text',
      'encoding-launch',
    ])
  })

  it('getTutorialStep returns by index', () => {
    expect(getTutorialStep(0)?.id).toBe('briefing')
    expect(getTutorialStep(0, 'pipeline')?.id).toBe('pipeline-briefing')
    expect(getTutorialStep(99)).toBeUndefined()
  })

  it('getTutorialStepById finds epilogues', () => {
    expect(getTutorialStepById('epilogue')?.title).toMatch(/Case Closed/)
    expect(getTutorialStepById('pipeline-epilogue')?.title).toMatch(/Pipeline Online/)
    expect(getTutorialStepById('briefing', 'snack')?.id).toBe('briefing')
    expect(getTutorialStepById('pipeline-briefing', 'pipeline')?.id).toBe('pipeline-briefing')
    expect(getTutorialStepById('encoding-epilogue')?.title).toMatch(/Round Trip/)
  })

  it('each quest ends with an epilogue step id', () => {
    expect(TUTORIAL_STEPS.at(-1)?.id).toBe('epilogue')
    expect(PIPELINE_QUEST_STEPS.at(-1)?.id).toBe('pipeline-epilogue')
    expect(ENCODING_QUEST_STEPS.at(-1)?.id).toBe('encoding-epilogue')
    expect(TUTORIAL_STEPS.at(-1)?.id.endsWith('epilogue')).toBe(true)
    expect(PIPELINE_QUEST_STEPS.at(-1)?.id.endsWith('epilogue')).toBe(true)
  })
})
