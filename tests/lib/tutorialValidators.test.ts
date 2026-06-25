import { describe, it, expect } from 'vitest'
import {
  hasNodeType,
  hasSnackInvestigatorPath,
  hasDataPipelinePath,
  hasEncodingChainPath,
  hasParallelContextPath,
  hasWritersRoomPath,
  hasTwoAgents,
  twoAgentsRoleBriefed,
  writersPromptDropped,
  hasUrlDetectivePath,
  urlEvidenceDropped,
  hasVoiceBoothPath,
  speechConfigured,
  hasCaptureDeskPath,
  captureAgentRan,
  captureDeskCompleted,
  voiceRunCompleted,
  parallelQuestionDropped,
  customScriptConfigured,
  chatJsonEvidenceDropped,
  chatTextEvidenceDropped,
  agentRoleBriefed,
  workflowNamed,
  chatEvidenceDropped,
  investigationLaunched,
  isSuccessfulAssistantReply,
  isStepComplete,
  getStepValidator,
  DEFAULT_WORKFLOW_NAME,
} from '../../src/lib/tutorialValidators'
import { makeChat, makeAgent, makeTool, edge, edgeWithHandles } from '../helpers/graphBuilders'
import type { ToolNodeData } from '../../src/types'
import type { TutorialSnapshot } from '../../src/lib/tutorialValidators'
import { getAllQuestSteps } from '../../src/lib/tutorialQuests'

function snapshot(overrides: Partial<TutorialSnapshot> = {}): TutorialSnapshot {
  return {
    nodes: [],
    edges: [],
    workflowName: DEFAULT_WORKFLOW_NAME,
    isRunning: false,
    runAttempted: false,
    runFinished: false,
    connectionRejectionCount: 0,
    ...overrides,
  }
}

describe('tutorialValidators — snack investigator quest', () => {
  it('detects chat, scraper, and agent nodes', () => {
    const chat = makeChat('c')
    const scraper = makeTool('t', 'web-scraper')
    const agent = makeAgent('a')
    const nodes = [chat, scraper, agent]

    expect(hasNodeType(nodes, 'chat')).toBe(true)
    expect(hasNodeType(nodes, 'tool', 'web-scraper')).toBe(true)
    expect(hasNodeType(nodes, 'tool', 'speech')).toBe(false)
    expect(hasNodeType(nodes, 'agent')).toBe(true)
  })

  it('requires Chat → Scraper → Agent wiring', () => {
    const chat = makeChat('c')
    const scraper = makeTool('t', 'web-scraper')
    const agent = makeAgent('a')
    const nodes = [chat, scraper, agent]

    expect(hasSnackInvestigatorPath(nodes, [])).toBe(false)
    expect(
      hasSnackInvestigatorPath(nodes, [
        edgeWithHandles('e1', 'c', 't', 'message', 'in'),
        edgeWithHandles('e2', 't', 'a', 'out', 'context'),
      ])
    ).toBe(true)
    expect(
      hasSnackInvestigatorPath(nodes, [edge('e1', 'c', 't'), edge('e2', 't', 'a')])
    ).toBe(true)
    expect(
      hasSnackInvestigatorPath(nodes, [edge('e1', 'c', 'a'), edge('e2', 'a', 't')])
    ).toBe(false)
  })

  it('accepts Snack Critic role or any non-default role', () => {
    expect(agentRoleBriefed([makeAgent('a', { role: 'Assistant' })])).toBe(false)
    expect(agentRoleBriefed([makeAgent('a', { role: 'Snack Critic' })])).toBe(true)
    expect(agentRoleBriefed([makeAgent('a', { role: 'Midnight Judge' })])).toBe(true)
  })

  it('detects renamed workflow', () => {
    expect(workflowNamed(snapshot())).toBe(false)
    expect(workflowNamed(snapshot({ workflowName: 'Snack Quest' }))).toBe(true)
  })

  it('detects URL-like evidence in chat input', () => {
    const chat = makeChat('c')
    ;(chat.data as { inputValue: string }).inputValue = 'en.wikipedia.org/wiki/Pizza'
    expect(chatEvidenceDropped([chat])).toBe(true)

    const empty = makeChat('e')
    expect(chatEvidenceDropped([empty])).toBe(false)
  })

  it('detects completed investigation run', () => {
    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'user', content: 'hi', timestamp: 1 },
      { id: '2', role: 'assistant', content: 'Verdict: yes', timestamp: 2 },
    ]
    expect(
      investigationLaunched(
        snapshot({ nodes: [chat], runFinished: true })
      )
    ).toBe(true)
    expect(
      investigationLaunched(
        snapshot({ nodes: [chat], runFinished: false })
      )
    ).toBe(false)
  })

  it('rejects failed investigation runs with workflow errors', () => {
    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'user', content: 'hi', timestamp: 1 },
      {
        id: '2',
        role: 'assistant',
        content: 'Partial output\n\n⚠ Some workflow steps failed:\n• Scraper: blocked',
        timestamp: 2,
      },
    ]
    expect(
      investigationLaunched(snapshot({ nodes: [chat], runFinished: true }))
    ).toBe(false)
  })

  it('rejects chat-level error replies', () => {
    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      {
        id: 'msg-1-err',
        role: 'assistant',
        content: 'No free brain available',
        timestamp: 1,
      },
    ]
    expect(
      investigationLaunched(snapshot({ nodes: [chat], runFinished: true }))
    ).toBe(false)
  })

  it('isSuccessfulAssistantReply filters empty and failure replies', () => {
    expect(isSuccessfulAssistantReply('')).toBe(false)
    expect(isSuccessfulAssistantReply('   ')).toBe(false)
    expect(isSuccessfulAssistantReply('Could not fetch page')).toBe(false)
    expect(isSuccessfulAssistantReply('Workflow failed at step 2')).toBe(false)
    expect(isSuccessfulAssistantReply('Looks good', 'msg-ok')).toBe(true)
  })

  it('isStepComplete delegates to step validators', () => {
    const chat = makeChat('c')
    expect(isStepComplete('drag-chat', snapshot({ nodes: [chat] }))).toBe(true)
    expect(isStepComplete('briefing', snapshot())).toBe(false)
    expect(isStepComplete('unknown-step', snapshot())).toBe(false)
    expect(getStepValidator('briefing')).toBeNull()
  })

  it('validates every auto-advance quest step', () => {
    const chat = makeChat('c')
    const scraper = makeTool('t', 'web-scraper')
    const agent = makeAgent('a', { role: 'Snack Critic' })
    const nodes = [chat, scraper, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 't', 'message', 'in'),
      edgeWithHandles('e2', 't', 'a', 'out', 'context'),
    ]

    expect(isStepComplete('drag-scraper', snapshot({ nodes: [chat, scraper] }))).toBe(true)
    expect(isStepComplete('drag-agent', snapshot({ nodes }))).toBe(true)
    expect(isStepComplete('wire-nodes', snapshot({ nodes, edges }))).toBe(true)
    expect(isStepComplete('brief-agent', snapshot({ nodes }))).toBe(true)
    expect(isStepComplete('name-quest', snapshot({ nodes, workflowName: 'Snack Quest' }))).toBe(true)

    ;(chat.data as { inputValue: string }).inputValue = 'en.wikipedia.org/wiki/Pizza'
    expect(isStepComplete('drop-evidence', snapshot({ nodes: [chat] }))).toBe(true)

    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'verdict', timestamp: 1 },
    ]
    expect(
      isStepComplete('launch', snapshot({ nodes: [chat], runFinished: true }))
    ).toBe(true)
  })

  it('hasNodeType returns false for wrong tool type', () => {
    expect(hasNodeType([makeTool('t', 'speech')], 'tool', 'web-scraper')).toBe(false)
    expect(hasNodeType([makeTool('t', 'speech')], 'tool')).toBe(true)
  })

  it('hasSnackInvestigatorPath requires chat, scraper, and agent', () => {
    const chat = makeChat('c')
    const scraper = makeTool('t', 'web-scraper')
    expect(hasSnackInvestigatorPath([chat], [])).toBe(false)
    expect(hasSnackInvestigatorPath([chat, scraper], [])).toBe(false)
  })
})

describe('tutorialValidators — pipeline quest', () => {
  it('requires Chat → JSON Tool → Custom Script → Agent wiring', () => {
    const chat = makeChat('c')
    const json = makeTool('j', 'json-tool')
    const script = makeTool('s', 'custom-script')
    const agent = makeAgent('a')
    const nodes = [chat, json, script, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 'j', 'message', 'in'),
      edgeWithHandles('e2', 'j', 's', 'out', 'in'),
      edgeWithHandles('e3', 's', 'a', 'out', 'context'),
    ]
    expect(hasDataPipelinePath(nodes, edges)).toBe(true)
    expect(hasDataPipelinePath(nodes, [edge('e1', 'c', 'j')])).toBe(false)
    expect(hasDataPipelinePath([chat, json, script], edges)).toBe(false)
    expect(customScriptConfigured([])).toBe(false)
    expect(chatJsonEvidenceDropped([])).toBe(false)
    const chatOnly = makeChat('x')
    expect(chatJsonEvidenceDropped([chatOnly])).toBe(false)
    delete (chatOnly.data as { inputValue?: string }).inputValue
    expect(chatJsonEvidenceDropped([chatOnly])).toBe(false)
  })

  it('detects custom script configuration and JSON chat input', () => {
    const script = makeTool('s', 'custom-script')
    expect(customScriptConfigured([script])).toBe(false)
    ;(script.data as { config: Record<string, string> }).config = {
      script: 'return input',
    }
    expect(customScriptConfigured([script])).toBe(true)

    const chat = makeChat('c')
    ;(chat.data as { inputValue: string }).inputValue = '{"snack":"pizza"}'
    expect(chatJsonEvidenceDropped([chat])).toBe(true)
    ;(chat.data as { inputValue: string }).inputValue = 'not json'
    expect(chatJsonEvidenceDropped([chat])).toBe(false)
    ;(chat.data as { inputValue: string }).inputValue = '"just a string"'
    expect(chatJsonEvidenceDropped([chat])).toBe(false)
  })

  it('completes pipeline auto steps', () => {
    const chat = makeChat('c')
    const json = makeTool('j', 'json-tool')
    const script = makeTool('s', 'custom-script', { script: 'return input' })
    const agent = makeAgent('a')
    const nodes = [chat, json, script, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 'j', 'message', 'in'),
      edgeWithHandles('e2', 'j', 's', 'out', 'in'),
      edgeWithHandles('e3', 's', 'a', 'out', 'context'),
    ]

    expect(isStepComplete('pipeline-ports-lesson', snapshot({ connectionRejectionCount: 1 }))).toBe(
      true
    )
    expect(isStepComplete('pipeline-ports-lesson', snapshot({ nodes, edges }))).toBe(true)
    expect(isStepComplete('pipeline-ports-lesson', snapshot())).toBe(false)

    expect(isStepComplete('pipeline-drag-chat', snapshot({ nodes: [chat] }))).toBe(true)
    expect(isStepComplete('pipeline-drag-json', snapshot({ nodes: [chat, json] }))).toBe(true)
    expect(isStepComplete('pipeline-drag-script', snapshot({ nodes: [chat, json, script] }))).toBe(
      true
    )
    expect(isStepComplete('pipeline-drag-agent', snapshot({ nodes }))).toBe(true)
    expect(isStepComplete('pipeline-wire', snapshot({ nodes, edges }))).toBe(true)
    expect(isStepComplete('pipeline-script', snapshot({ nodes }))).toBe(true)
    ;(chat.data as { inputValue: string }).inputValue = '{"snack":"pizza"}'
    expect(isStepComplete('pipeline-drop-json', snapshot({ nodes }))).toBe(true)
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'pizza rules', timestamp: 1 },
    ]
    expect(
      isStepComplete('pipeline-launch', snapshot({ nodes, runFinished: true }))
    ).toBe(true)
  })
})

describe('tutorialValidators — encoding quest', () => {
  it('requires Chat → Base64 Encode → Base64 Decode → Agent with handles', () => {
    const chat = makeChat('c')
    const enc = makeTool('e', 'base64-encode')
    const dec = makeTool('d', 'base64-decode')
    const agent = makeAgent('a')
    const nodes = [chat, enc, dec, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 'e', 'message', 'in'),
      edgeWithHandles('e2', 'e', 'd', 'out', 'in'),
      edgeWithHandles('e3', 'd', 'a', 'out', 'context'),
    ]
    expect(hasEncodingChainPath(nodes, edges)).toBe(true)
    expect(hasEncodingChainPath(nodes, [])).toBe(false)
    expect(hasEncodingChainPath([chat, enc, dec], edges)).toBe(false)
    expect(hasEncodingChainPath([chat, enc, agent], edges)).toBe(false)

    const chatOnly = makeChat('x')
    ;(chatOnly.data as { inputValue: string }).inputValue = 'Hello'
    expect(chatTextEvidenceDropped([chatOnly])).toBe(true)
    expect(chatTextEvidenceDropped([])).toBe(false)
    expect(chatTextEvidenceDropped([makeChat('empty')])).toBe(false)
    const noInput = makeChat('no-input')
    delete (noInput.data as { inputValue?: string }).inputValue
    expect(chatTextEvidenceDropped([noInput])).toBe(false)
    expect(isStepComplete('encoding-wire', snapshot({ nodes, edges }))).toBe(true)
    expect(isStepComplete('encoding-drag-chat', snapshot({ nodes: [chat] }))).toBe(true)
    expect(isStepComplete('encoding-drag-encode', snapshot({ nodes: [chat, enc] }))).toBe(true)
    expect(isStepComplete('encoding-drag-decode', snapshot({ nodes: [chat, enc, dec] }))).toBe(true)
    expect(isStepComplete('encoding-drag-agent', snapshot({ nodes }))).toBe(true)
    expect(isStepComplete('encoding-drop-text', snapshot({ nodes: [chatOnly] }))).toBe(true)
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'decoded', timestamp: 1 },
    ]
    expect(isStepComplete('encoding-launch', snapshot({ nodes, runFinished: true }))).toBe(true)
  })
})

describe('tutorialValidators — parallel context quest', () => {
  it('validates parallel chat and datetime wires plus launch', () => {
    const chat = makeChat('c')
    const dt = makeTool('d', 'datetime')
    const agent = makeAgent('a')
    const nodes = [chat, dt, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'd', 'a', 'out', 'context'),
    ]
    expect(hasParallelContextPath(nodes, edges)).toBe(true)
    expect(hasParallelContextPath(nodes, [])).toBe(false)
    expect(hasParallelContextPath([chat, dt], edges)).toBe(false)
    expect(hasParallelContextPath([chat, agent], edges)).toBe(false)

    const chatQ = makeChat('q')
    ;(chatQ.data as { inputValue: string }).inputValue = 'What day is today?'
    expect(parallelQuestionDropped([chatQ])).toBe(true)
    expect(parallelQuestionDropped([makeChat('empty')])).toBe(false)
    expect(parallelQuestionDropped([])).toBe(false)
    const chatHello = makeChat('h')
    ;(chatHello.data as { inputValue: string }).inputValue = 'hello there'
    expect(parallelQuestionDropped([chatHello])).toBe(false)
    const chatSpaces = makeChat('spaces')
    ;(chatSpaces.data as { inputValue: string }).inputValue = '   '
    expect(parallelQuestionDropped([chatSpaces])).toBe(false)
    const bareChat = makeChat('bare')
    delete (bareChat.data as { inputValue?: string }).inputValue
    expect(parallelQuestionDropped([bareChat])).toBe(false)

    expect(isStepComplete('parallel-wire', snapshot({ nodes, edges }))).toBe(true)
    expect(isStepComplete('parallel-drag-chat', snapshot({ nodes: [chat] }))).toBe(true)
    expect(isStepComplete('parallel-drag-datetime', snapshot({ nodes: [chat, dt] }))).toBe(true)
    expect(isStepComplete('parallel-drag-agent', snapshot({ nodes }))).toBe(true)
    expect(isStepComplete('parallel-drop-question', snapshot({ nodes: [chatQ] }))).toBe(true)
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'Today is Saturday', timestamp: 1 },
    ]
    expect(isStepComplete('parallel-launch', snapshot({ nodes, runFinished: true }))).toBe(true)
  })
})

describe('tutorialValidators — snack investigator quest (continued)', () => {
  it('agentRoleBriefed rejects blank roles', () => {
    expect(agentRoleBriefed([makeAgent('a', { role: '   ' })])).toBe(false)
    expect(agentRoleBriefed([])).toBe(false)
    const noRole = makeAgent('a')
    delete (noRole.data as { role?: string }).role
    expect(agentRoleBriefed([noRole])).toBe(false)
  })

  it('chatEvidenceDropped handles missing chat and empty input', () => {
    expect(chatEvidenceDropped([])).toBe(false)
    expect(chatEvidenceDropped([makeChat('c')])).toBe(false)
    const chat = makeChat('c')
    delete (chat.data as { inputValue?: string }).inputValue
    expect(chatEvidenceDropped([chat])).toBe(false)
    ;(chat.data as { inputValue: string }).inputValue = 'plain snack notes'
    expect(chatEvidenceDropped([chat])).toBe(false)
  })

  it('investigationLaunched requires assistant reply after run', () => {
    expect(investigationLaunched(snapshot())).toBe(false)
    expect(investigationLaunched(snapshot({ runFinished: true, nodes: [] }))).toBe(false)
    const chat = makeChat('c')
    ;(chat.data as { messages: [] }).messages = []
    expect(investigationLaunched(snapshot({ runFinished: true, nodes: [chat] }))).toBe(false)
    const noMessages = makeChat('n')
    delete (noMessages.data as { messages?: unknown }).messages
    expect(
      investigationLaunched(snapshot({ runFinished: true, nodes: [noMessages] }))
    ).toBe(false)
  })
})

describe('tutorialValidators — writers room quest', () => {
  it('validates multi-agent path, roles, and launch', () => {
    const chat = makeChat('c')
    const writer = makeAgent('w', { role: 'Copywriter' })
    const editor = makeAgent('e', { role: 'Editor' })
    const nodes = [chat, writer, editor]
    const edges = [
      edgeWithHandles('e1', 'c', 'w', 'message', 'context'),
      edgeWithHandles('e2', 'w', 'e', 'out', 'context'),
    ]
    expect(hasTwoAgents(nodes)).toBe(true)
    expect(hasTwoAgents([chat, writer])).toBe(false)
    expect(hasWritersRoomPath(nodes, edges)).toBe(true)
    expect(twoAgentsRoleBriefed(nodes)).toBe(true)
    expect(twoAgentsRoleBriefed([writer, makeAgent('x', { role: 'Assistant' })])).toBe(false)
    ;(chat.data as { inputValue: string }).inputValue = 'Write a tagline for our workflow app'
    expect(writersPromptDropped([chat])).toBe(true)
    expect(isStepComplete('writers-wire', snapshot({ nodes, edges }))).toBe(true)
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'Sharp tagline here', timestamp: 1 },
    ]
    expect(isStepComplete('writers-launch', snapshot({ nodes, runFinished: true }))).toBe(true)
  })
})

describe('tutorialValidators — url detective quest', () => {
  it('validates parse-url path and URL evidence', () => {
    const chat = makeChat('c')
    const parseUrl = makeTool('p', 'parse-url')
    const agent = makeAgent('a')
    const nodes = [chat, parseUrl, agent]
    const edges = [
      edgeWithHandles('e1', 'c', 'p', 'message', 'in'),
      edgeWithHandles('e2', 'p', 'a', 'out', 'context'),
    ]
    expect(hasUrlDetectivePath(nodes, edges)).toBe(true)
    ;(chat.data as { inputValue: string }).inputValue = 'https://github.com/zeroclaw/zeroclaw'
    expect(urlEvidenceDropped([chat])).toBe(true)
    expect(isStepComplete('url-wire', snapshot({ nodes, edges }))).toBe(true)
  })
})

describe('tutorialValidators — voice booth quest', () => {
  it('validates speech path, TTS config, and voice completion', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a', { lastOutput: 'Hello there' })
    const speech = makeTool('s', 'speech', { mode: 'tts' })
    const nodes = [chat, agent, speech]
    const edges = [
      edgeWithHandles('e1', 'c', 'a', 'message', 'context'),
      edgeWithHandles('e2', 'a', 's', 'out', 'in'),
    ]
    expect(hasVoiceBoothPath(nodes, edges)).toBe(true)
    expect(speechConfigured(nodes)).toBe(true)
    expect(speechConfigured([makeTool('x', 'speech', { mode: 'stt' })])).toBe(false)
    expect(voiceRunCompleted(snapshot({ nodes, runFinished: true }))).toBe(true)
    expect(isStepComplete('voice-wire', snapshot({ nodes, edges }))).toBe(true)
  })
})

describe('tutorialValidators — capture desk quest', () => {
  it('validates capture path, agent run, and output log', () => {
    const datetime = makeTool('d', 'datetime')
    const uuid = makeTool('u', 'uuid-v4')
    const agent = makeAgent('a', { role: 'ID Clerk' })
    const output = makeTool('o', 'text-output')
    ;(output.data as ToolNodeData).outputLog = [{ text: 'ticket line', timestamp: 1 }]
    const nodes = [datetime, uuid, agent, output]
    const edges = [
      edgeWithHandles('e1', 'd', 'a', 'out', 'context'),
      edgeWithHandles('e2', 'u', 'a', 'out', 'context'),
      edgeWithHandles('e3', 'a', 'o', 'out', 'in'),
    ]
    expect(hasCaptureDeskPath(nodes, edges)).toBe(true)
    expect(captureAgentRan(snapshot({ runAttempted: true }))).toBe(true)
    expect(captureDeskCompleted(snapshot({ nodes }))).toBe(true)
    expect(isStepComplete('capture-wire', snapshot({ nodes, edges }))).toBe(true)
    expect(isStepComplete('capture-run-capture', snapshot({ nodes }))).toBe(true)
  })
})

describe('tutorialValidators — coverage for new helpers', () => {
  it('covers false branches on path and completion helpers', () => {
    expect(captureDeskCompleted(snapshot())).toBe(false)
    expect(captureDeskCompleted(snapshot({ nodes: [makeTool('o', 'text-output')] }))).toBe(false)
    expect(captureAgentRan(snapshot())).toBe(false)
    expect(voiceRunCompleted(snapshot())).toBe(false)
    expect(voiceRunCompleted(snapshot({ runFinished: true, nodes: [] }))).toBe(false)
    expect(
      voiceRunCompleted(snapshot({ runFinished: true, nodes: [makeAgent('a')] }))
    ).toBe(false)
    expect(hasWritersRoomPath([], [])).toBe(false)
    expect(hasUrlDetectivePath([], [])).toBe(false)
    expect(hasVoiceBoothPath([], [])).toBe(false)
    expect(hasCaptureDeskPath([], [])).toBe(false)
    expect(speechConfigured([])).toBe(false)
    expect(urlEvidenceDropped([])).toBe(false)
    expect(writersPromptDropped([])).toBe(false)
    expect(twoAgentsRoleBriefed([makeAgent('a')])).toBe(false)
    const blankRolePair = [makeAgent('a', { role: 'Writer' }), makeAgent('b', { role: '   ' })]
    expect(twoAgentsRoleBriefed(blankRolePair)).toBe(false)
    const noRole = makeAgent('n')
    delete (noRole.data as { role?: string }).role
    expect(twoAgentsRoleBriefed([noRole, makeAgent('e', { role: 'Editor' })])).toBe(false)
    const promptChat = makeChat('p')
    delete (promptChat.data as { inputValue?: string }).inputValue
    expect(writersPromptDropped([promptChat])).toBe(false)
    ;(promptChat.data as { inputValue: string }).inputValue = 'hello only'
    expect(urlEvidenceDropped([promptChat])).toBe(false)
    ;(promptChat.data as { inputValue: string }).inputValue = '   '
    expect(urlEvidenceDropped([promptChat])).toBe(false)
    const urlChat = makeChat('u')
    delete (urlChat.data as { inputValue?: string }).inputValue
    expect(urlEvidenceDropped([urlChat])).toBe(false)
  })

  it('invokes every auto-step validator function', () => {
    for (const { steps } of getAllQuestSteps()) {
      for (const step of steps) {
        if (step.advance !== 'auto') continue
        const validator = getStepValidator(step.id)
        expect(validator).not.toBeNull()
        validator!(snapshot())
      }
    }
  })

  it('voiceRunCompleted accepts investigationLaunched path', () => {
    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'heard', timestamp: 1 },
    ]
    expect(
      voiceRunCompleted(snapshot({ runFinished: true, nodes: [chat, makeAgent('a')] }))
    ).toBe(true)
  })
})
