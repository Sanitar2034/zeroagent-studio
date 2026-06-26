import { useWorkflowStore } from '../../stores/workflowStore'
import { useTutorialStore } from '../../stores/tutorialStore'
import { navigateTo } from '../../lib/appRoute'
import { startQuestWithGuard } from '../../lib/startQuestWithGuard'
import {
  requestLoadExampleWorkflow,
  requestLoadQuickStartExample,
  WRITER_EDITOR_EXAMPLE_ID,
} from '../../lib/exampleWorkflowLoad'
import { getQuestCatalog } from '../../lib/tutorialQuests'

export default function CanvasEmptyState({ hidden = false }: { hidden?: boolean }) {
  const nodes = useWorkflowStore((s) => s.nodes)
  const tutorialActive = useTutorialStore((s) => s.active)
  const snackQuestLabel =
    getQuestCatalog().find((quest) => quest.id === 'snack')?.shortLabel ?? 'Snack Investigator'

  if (hidden || nodes.length > 0 || tutorialActive) return null

  return (
    <div className="canvas-empty" role="region" aria-label="Empty canvas">
      <div className="canvas-empty-glow" aria-hidden />
      <div className="canvas-empty-card">
        <p className="canvas-empty-eyebrow">Your workshop</p>
        <h2 className="canvas-empty-title">Drag blocks here to begin</h2>
        <p className="canvas-empty-desc">
          Pick <strong>Chat</strong> and <strong>Agent</strong> from the left, connect their ports, then
          type a message. Or try a showcase example below, browse header <strong>Examples</strong>, or start
          a guided quest.
        </p>
        <div className="canvas-empty-actions">
          <button
            type="button"
            className="canvas-empty-btn primary"
            onClick={() => void startQuestWithGuard('snack')}
          >
            {snackQuestLabel}
          </button>
          <button
            type="button"
            className="canvas-empty-btn"
            onClick={() => void requestLoadExampleWorkflow(WRITER_EDITOR_EXAMPLE_ID)}
          >
            Writer &amp; editor
          </button>
          <button
            type="button"
            className="canvas-empty-btn ghost"
            onClick={() => void requestLoadQuickStartExample()}
          >
            Hello, Agent
          </button>
          <button type="button" className="canvas-empty-btn ghost" onClick={() => navigateTo('guide')}>
            Read guide
          </button>
        </div>
      </div>
    </div>
  )
}
