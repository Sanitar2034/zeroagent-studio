import { describe, it, expect } from 'vitest'
import type { Node } from '@xyflow/react'
import {
  summarizeWorkflowPrivacy,
  buildChatPrivacyWarning,
} from '../../src/lib/workflowPrivacy'

const agent = (brain: string, label = 'My Agent'): Node => ({
  id: `agent-${brain}`,
  type: 'agent',
  position: { x: 0, y: 0 },
  data: { label, brain, model: undefined, systemPrompt: '', tools: [] },
})

const tool = (toolType: string): Node => ({
  id: `tool-${toolType}`,
  type: 'tool',
  position: { x: 0, y: 0 },
  data: { label: toolType, toolType },
})

describe('workflowPrivacy', () => {
  it('reports local-only workflow', () => {
    const summary = summarizeWorkflowPrivacy([agent('transformers')])
    expect(summary.maySendDataToCloud).toBe(false)
    expect(buildChatPrivacyWarning([agent('transformers')])).toBeNull()
  })

  it('flags cloud agent brains when configured', () => {
    const summary = summarizeWorkflowPrivacy(
      [agent('openrouter', 'Router Agent')],
      { openrouter: 'sk-or' }
    )
    expect(summary.maySendDataToCloud).toBe(true)
    expect(summary.cloudAgents).toEqual([{ label: 'Router Agent', brain: 'openrouter' }])
    expect(summary.providers).toEqual(['openrouter'])
    const warning = buildChatPrivacyWarning(
      [agent('openrouter', 'Router Agent')],
      { openrouter: 'sk-or' }
    )
    expect(warning).toMatch(/openrouter/i)
    expect(warning).toMatch(/Router Agent/)
  })

  it('ignores cloud agents without keys', () => {
    expect(summarizeWorkflowPrivacy([agent('openrouter')], {}).maySendDataToCloud).toBe(false)
    expect(buildChatPrivacyWarning([agent('groq')], {})).toBeNull()
  })

  it('flags cloud API tools on canvas when key is saved', () => {
    const nodes = [tool('groq-transcribe')]
    const summary = summarizeWorkflowPrivacy(nodes, { groq: 'gsk' })
    expect(summary.cloudTools).toEqual([{ label: 'Groq Transcribe', provider: 'groq' }])
    expect(buildChatPrivacyWarning(nodes, { groq: 'gsk' })).toMatch(/groq/i)
  })

  it('ignores cloud tools without keys', () => {
    expect(summarizeWorkflowPrivacy([tool('groq-transcribe')], {}).maySendDataToCloud).toBe(false)
  })

  it('merges multiple providers', () => {
    const nodes = [agent('gemini'), tool('groq-transcribe')]
    const summary = summarizeWorkflowPrivacy(nodes, { gemini: 'AIza', groq: 'gsk' })
    expect(summary.providers.sort()).toEqual(['gemini', 'groq'])
  })

  it('defaults missing agent label and skips non-cloud tools', () => {
    const nodes: Node[] = [
      {
        id: 'agent-no-label',
        type: 'agent',
        position: { x: 0, y: 0 },
        data: { brain: 'groq', model: undefined, systemPrompt: '', tools: [] },
      },
      {
        id: 'tool-empty',
        type: 'tool',
        position: { x: 0, y: 0 },
        data: { label: 'Empty' },
      },
      tool('file-reader'),
    ]
    expect(summarizeWorkflowPrivacy(nodes, {}).cloudAgents).toEqual([])
    const withKey = summarizeWorkflowPrivacy(nodes, { groq: 'gsk' })
    expect(withKey.cloudAgents).toEqual([{ label: 'Agent', brain: 'groq' }])
    expect(withKey.cloudTools).toEqual([])
  })

  it('builds warning with agents and cloud tools together', () => {
    const nodes = [agent('openrouter', 'A1'), tool('gemini-vision')]
    const warning = buildChatPrivacyWarning(nodes, { openrouter: 'sk', gemini: 'AIza' })
    expect(warning).toMatch(/A1 \(openrouter\)/)
    expect(warning).toMatch(/cloud tools: Gemini Vision/)
  })
})
