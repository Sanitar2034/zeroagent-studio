import type { TargetRect } from './useTutorialTargetRect'

interface TutorialSpotlightProps {
  targetRect: TargetRect | null
  centerMode?: boolean
}

export default function TutorialSpotlight({ targetRect, centerMode }: TutorialSpotlightProps) {
  if (centerMode || !targetRect) {
    return <div className="tutorial-spotlight tutorial-spotlight--full" aria-hidden />
  }

  const pad = 8
  const top = Math.max(0, targetRect.top - pad)
  const left = Math.max(0, targetRect.left - pad)
  const width = targetRect.width + pad * 2
  const height = targetRect.height + pad * 2

  const clip = `polygon(
    0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
    ${left}px 0%,
    ${left}px ${top}px,
    ${left + width}px ${top}px,
    ${left + width}px ${top + height}px,
    ${left}px ${top + height}px,
    ${left}px 0%
  )`

  return (
    <div
      className="tutorial-spotlight"
      style={{ clipPath: clip, WebkitClipPath: clip }}
      aria-hidden
    />
  )
}
