import type { Edge, Node } from '@xyflow/react'
import type { ToolNodeData } from '../../../types'
import { createAgentNode, createChatNode, createToolNode } from '../../../components/canvas/nodeFactory'
import { createWorkflowEdgeWithHandles } from '../../workflowEdges'
import { PLACEHOLDER_POSITION } from '../helpers'

export function buildDescribeImageWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const vision = createToolNode(PLACEHOLDER_POSITION, 'gemini-vision')
  vision.data = {
    label: 'Gemini Vision',
    toolType: 'gemini-vision',
    config: { prompt: 'Describe this image in detail.' },
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Photo Guide',
    role: 'Curator',
    systemPrompt:
      'Turn the vision model description into a friendly caption. Add a free Gemini key in Privacy & keys if the tool is locked.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, vision, 'message', 'in', 'e-chat-vision'),
    createWorkflowEdgeWithHandles(vision, agent, 'out', 'context', 'e-vision-agent'),
  ]
  return { nodes: [chat, vision, agent], edges, name: 'Example — Describe a photo' }
}

export function buildTranscribeMeWorkflow(): { nodes: Node[]; edges: Edge[]; name: string } {
  const chat = createChatNode(PLACEHOLDER_POSITION)
  const transcribe = createToolNode(PLACEHOLDER_POSITION, 'groq-transcribe')
  transcribe.data = {
    label: 'Groq Transcribe',
    toolType: 'groq-transcribe',
    config: { language: 'en' },
  } as ToolNodeData
  const agent = createAgentNode(PLACEHOLDER_POSITION)
  agent.data = {
    ...agent.data,
    label: 'Reply Coach',
    role: 'Assistant',
    systemPrompt:
      'Summarize the transcription from context and suggest a friendly reply. Add a free Groq key in Privacy & keys if the tool is locked.',
  }

  const edges = [
    createWorkflowEdgeWithHandles(chat, transcribe, 'message', 'in', 'e-chat-transcribe'),
    createWorkflowEdgeWithHandles(transcribe, agent, 'out', 'context', 'e-transcribe-agent'),
  ]
  return { nodes: [chat, transcribe, agent], edges, name: 'Example — Transcribe me' }
}
