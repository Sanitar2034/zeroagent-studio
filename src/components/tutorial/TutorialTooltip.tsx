import { useRef, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { TutorialStep } from '../../lib/tutorialSteps'
import type { TutorialPlacement } from '../../lib/tutorialSteps'
import type { TargetRect } from './useTutorialTargetRect'
import { computeTooltipPosition } from './tutorialLayout'
import { navigateTo } from '../../lib/appRoute'

interface TutorialTooltipProps {
  step: TutorialStep
  stepIndex: number
  totalSteps: number
  targetRect: TargetRect | null
  placement: TutorialPlacement
  onNext: () => void
  onSkip: () => void
  onComplete: () => void
  onLayoutMeasured?: (rect: DOMRect) => void
}

function formatBody(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function TutorialTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  placement,
  onNext,
  onSkip,
  onComplete,
  onLayoutMeasured,
}: TutorialTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setPos(computeTooltipPosition(placement, targetRect, box.width, box.height))
    onLayoutMeasured?.(box)
  }, [placement, targetRect, step.id, onLayoutMeasured])

  const isEpilogue = step.id.endsWith('epilogue')
  const isBriefing =
    step.id === 'briefing' ||
    step.id === 'pipeline-briefing' ||
    step.id === 'encoding-briefing'
  const primaryLabel = isEpilogue
    ? "I'm ready to build"
    : isBriefing
      ? 'Accept quest'
      : 'Got it'

  return (
    <div
      ref={ref}
      className={`tutorial-tooltip tutorial-tooltip--${placement}`}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-labelledby="tutorial-title"
    >
      <div className="tutorial-tooltip-badge">Quest log · {stepIndex + 1}/{totalSteps}</div>
      <h2 id="tutorial-title" className="tutorial-tooltip-title">
        {step.title}
      </h2>
      <p className="tutorial-tooltip-body">{formatBody(step.body)}</p>

      {isEpilogue && (
        <div className="tutorial-tooltip-links">
          <button
            type="button"
            className="tutorial-btn tutorial-btn--ghost"
            onClick={() => {
              onComplete()
              navigateTo('guide')
            }}
          >
            Read the Guide
          </button>
          <a
            className="tutorial-btn tutorial-btn--ghost"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contribute on GitHub
          </a>
        </div>
      )}

      <div className="tutorial-tooltip-actions">
        <button type="button" className="tutorial-btn tutorial-btn--primary" onClick={isEpilogue ? onComplete : onNext}>
          {primaryLabel}
        </button>
        <button type="button" className="tutorial-btn tutorial-btn--skip" onClick={onSkip}>
          Skip quest
        </button>
      </div>

      <div className="tutorial-progress" aria-hidden>
        {Array.from({ length: totalSteps }, (_, i) => (
          <span key={i} className={`tutorial-progress-dot ${i <= stepIndex ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
