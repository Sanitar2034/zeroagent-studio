import type { TargetRect } from './useTutorialTargetRect'
import type { TutorialPlacement } from '../../lib/tutorialSteps'

interface TutorialArrowProps {
  targetRect: TargetRect | null
  tooltipRect: DOMRect | null
  placement: TutorialPlacement
}

export default function TutorialArrow({
  targetRect,
  tooltipRect,
  placement,
}: TutorialArrowProps) {
  if (!targetRect || !tooltipRect || placement === 'center') return null

  const tx = targetRect.left + targetRect.width / 2
  const ty = targetRect.top + targetRect.height / 2
  const bx = tooltipRect.left + tooltipRect.width / 2
  const by = tooltipRect.top + tooltipRect.height / 2

  const path = `M ${bx} ${by} Q ${(bx + tx) / 2} ${(by + ty) / 2 - 30} ${tx} ${ty}`

  return (
    <svg className="tutorial-arrow" aria-hidden>
      <defs>
        <marker
          id="tutorial-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" className="tutorial-arrowhead" />
        </marker>
      </defs>
      <path d={path} className="tutorial-arrow-path" markerEnd="url(#tutorial-arrowhead)" />
    </svg>
  )
}
