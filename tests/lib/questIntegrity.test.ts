import { describe, it, expect } from 'vitest'
import { getStepValidator } from '../../src/lib/tutorialValidators'
import {
  QUEST_IDS,
  TUTORIAL_QUESTS,
  getQuestCatalog,
  getTutorialCompletedKey,
  getAllQuestSteps,
} from '../../src/lib/tutorialQuests'
import { isKnownTutorialTarget } from '../../src/lib/questIntegrity'
import { APP_STORAGE_QUEST_IDS } from '../../src/lib/appStorage'

describe('questIntegrity', () => {
  it('every auto-advance step has a validator', () => {
    const missing: string[] = []
    for (const { questId, steps } of getAllQuestSteps()) {
      for (const step of steps) {
        if (step.advance !== 'auto') continue
        if (getStepValidator(step.id) === null) {
          missing.push(`${questId}:${step.id}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('every step target is a known spotlight id', () => {
    const unknown: string[] = []
    for (const { questId, steps } of getAllQuestSteps()) {
      for (const step of steps) {
        if (!step.target) continue
        if (!isKnownTutorialTarget(step.target)) {
          unknown.push(`${questId}:${step.id}:${step.target}`)
        }
      }
    }
    expect(unknown).toEqual([])
  })

  it('registry keys match TutorialQuestId union', () => {
    const registryIds = Object.keys(TUTORIAL_QUESTS).sort()
    expect(registryIds).toEqual([...QUEST_IDS].sort())
    expect(registryIds).toHaveLength(8)
  })

  it('QUEST_IDS matches app storage clear list', () => {
    expect([...APP_STORAGE_QUEST_IDS].sort()).toEqual([...QUEST_IDS].sort())
  })

  it('completion keys are unique per quest', () => {
    const keys = QUEST_IDS.map((id) => getTutorialCompletedKey(id))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('catalog short labels align with quest ids', () => {
    const catalog = getQuestCatalog()
    expect(catalog).toHaveLength(QUEST_IDS.length)
    const catalogIds = catalog.map((q) => q.id)
    expect(catalogIds).toEqual(QUEST_IDS)
    for (const entry of catalog) {
      expect(entry.shortLabel.length).toBeGreaterThan(0)
      expect(entry.flow).toBe(TUTORIAL_QUESTS[entry.id].subtitle)
    }
  })

  it('covers every quest id in catalog categories', () => {
    const catalog = getQuestCatalog()
    const basics = catalog.filter((q) => q.category === 'basics')
    const advanced = catalog.filter((q) => q.category === 'advanced')
    expect(basics).toHaveLength(4)
    expect(advanced).toHaveLength(4)
    const allIds = [...basics, ...advanced].map((q) => q.id)
    expect(allIds).toEqual(QUEST_IDS)
  })
})

describe('questIntegrity — isKnownTutorialTarget', () => {
  it('accepts static, palette, and inspector targets', () => {
    expect(isKnownTutorialTarget('canvas')).toBe(true)
    expect(isKnownTutorialTarget('palette')).toBe(true)
    expect(isKnownTutorialTarget('chat-input')).toBe(true)
    expect(isKnownTutorialTarget('palette-chat')).toBe(true)
    expect(isKnownTutorialTarget('inspector-role')).toBe(true)
    expect(isKnownTutorialTarget('unknown-target')).toBe(false)
  })
})
