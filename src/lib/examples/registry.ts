import type { Edge, Node } from '@xyflow/react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { layoutWorkflowNodes } from '../workflowLayout'
import { fitWorkflowView } from '../flowCanvasRegistry'
import { applyExampleTryPrompt } from './helpers'
import type { ExampleWorkflowId } from './types'
import {
  buildQuickStartWorkflow,
  buildSnackVerdictWorkflow,
  buildWriterEditorWorkflow,
  buildExplainMyUrlWorkflow,
  buildMemeMathWorkflow,
} from './builders/starter'
import {
  buildResearchStackWorkflow,
  buildHackerHeadlinesWorkflow,
  buildReadmeReaderWorkflow,
  buildCaptureOnlyWorkflow,
} from './builders/research'
import {
  buildScriptPipelineWorkflow,
  buildJsonGlowUpWorkflow,
  buildContextBriefingWorkflow,
  buildToolOnlyWorkflow,
} from './builders/pipeline'
import {
  buildEncodeBoomerangWorkflow,
  buildJwtInspectorWorkflow,
  buildRegexHunterWorkflow,
  buildDiffDetectiveWorkflow,
  buildIdFactoryWorkflow,
} from './builders/data'
import { buildScraperCleanupWorkflow, buildVoiceReplyWorkflow } from './builders/voice'
import { buildDescribeImageWorkflow, buildTranscribeMeWorkflow } from './builders/power'

const BUILDERS: Record<
  ExampleWorkflowId,
  () => { nodes: Node[]; edges: Edge[]; name: string }
> = {
  'quick-start': buildQuickStartWorkflow,
  'snack-verdict': buildSnackVerdictWorkflow,
  'writer-editor': buildWriterEditorWorkflow,
  'explain-my-url': buildExplainMyUrlWorkflow,
  'meme-math': buildMemeMathWorkflow,
  'research-stack': buildResearchStackWorkflow,
  'hacker-headlines': buildHackerHeadlinesWorkflow,
  'readme-reader': buildReadmeReaderWorkflow,
  'capture-only': buildCaptureOnlyWorkflow,
  'script-pipeline': buildScriptPipelineWorkflow,
  'json-glow-up': buildJsonGlowUpWorkflow,
  'context-briefing': buildContextBriefingWorkflow,
  'tool-only': buildToolOnlyWorkflow,
  'encode-boomerang': buildEncodeBoomerangWorkflow,
  'jwt-inspector': buildJwtInspectorWorkflow,
  'regex-hunter': buildRegexHunterWorkflow,
  'diff-detective': buildDiffDetectiveWorkflow,
  'id-factory': buildIdFactoryWorkflow,
  'scraper-cleanup': buildScraperCleanupWorkflow,
  'voice-reply': buildVoiceReplyWorkflow,
  'describe-image': buildDescribeImageWorkflow,
  'transcribe-me': buildTranscribeMeWorkflow,
}

export function buildExampleWorkflow(id: ExampleWorkflowId): {
  nodes: Node[]
  edges: Edge[]
  name: string
} {
  const built = BUILDERS[id]()
  return {
    ...built,
    nodes: applyExampleTryPrompt(layoutWorkflowNodes(built.nodes, built.edges), id),
  }
}

export function loadExampleWorkflow(id: ExampleWorkflowId): void {
  const { nodes, edges, name } = buildExampleWorkflow(id)
  const store = useWorkflowStore.getState()
  store.setNodes(nodes)
  store.setEdges(edges)
  store.setWorkflowName(name)
  useWorkflowStore.setState({ workflowId: null, isDirty: true })
  fitWorkflowView()
}
