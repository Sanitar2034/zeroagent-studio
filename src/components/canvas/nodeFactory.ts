import type { AgentNodeData, ToolNodeData, ChatNodeData } from '../../types'
import { getDefaultAgentBrain } from '../../lib/brainResolver'
import { getTool } from '../../tools/registry'
import { useSettingsStore } from '../../stores/settingsStore'
import { getDefaultNodeSize } from '../../lib/nodeDimensions'

let nodeIdCounter = 0

export function createAgentNode(position: { x: number; y: number }) {
  const id = `agent-${++nodeIdCounter}`
  const defaults = getDefaultAgentBrain(useSettingsStore.getState().apiKeys)
  const size = getDefaultNodeSize('agent')
  return {
    id,
    type: 'agent',
    position,
    width: size.width,
    height: size.height,
    data: {
      label: 'New Agent',
      role: 'Assistant',
      systemPrompt: 'You are a helpful AI assistant. Be concise and practical.',
      brain: defaults.brain,
      model: defaults.model,
    } satisfies AgentNodeData,
  }
}

export function createToolNode(
  position: { x: number; y: number },
  toolType: ToolNodeData['toolType'] = 'file-reader'
) {
  const id = `tool-${++nodeIdCounter}`
  const meta = getTool(toolType)
  const size = getDefaultNodeSize('tool')
  return {
    id,
    type: 'tool',
    position,
    width: size.width,
    height: size.height,
    data: {
      label: meta.label,
      toolType,
      ...(toolType === 'text-output' ? { outputLog: [] as ToolNodeData['outputLog'] } : {}),
    } satisfies ToolNodeData,
  }
}

export function createChatNode(position: { x: number; y: number }) {
  const id = `chat-${++nodeIdCounter}`
  const size = getDefaultNodeSize('chat')
  return {
    id,
    type: 'chat',
    position,
    width: size.width,
    height: size.height,
    data: {
      label: 'Chat',
      messages: [],
      inputValue: '',
    } satisfies ChatNodeData,
  }
}
