import type { TutorialPlacement } from '../../lib/tutorialSteps'
import type { TargetRect } from './useTutorialTargetRect'

export function computeTooltipPosition(
  placement: TutorialPlacement,
  targetRect: TargetRect | null,
  tooltipW: number,
  tooltipH: number
): { top: number; left: number } {
  const margin = 16
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (placement === 'center' || !targetRect) {
    return {
      top: Math.max(margin, (vh - tooltipH) / 2),
      left: Math.max(margin, (vw - tooltipW) / 2),
    }
  }

  let top = targetRect.top
  let left = targetRect.left

  switch (placement) {
    case 'right':
      left = targetRect.left + targetRect.width + margin
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2
      break
    case 'left':
      left = targetRect.left - tooltipW - margin
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2
      break
    case 'top':
      top = targetRect.top - tooltipH - margin
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2
      break
    case 'bottom':
      top = targetRect.top + targetRect.height + margin
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2
      break
    default:
      break
  }

  return {
    top: Math.min(Math.max(margin, top), vh - tooltipH - margin),
    left: Math.min(Math.max(margin, left), vw - tooltipW - margin),
  }
}
