import { useEffect, useState, useCallback } from 'react'
import { scheduleTutorialTargetScroll } from '../../lib/tutorialScroll'

export interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

export function useTutorialTargetRect(targetId: string | undefined, active: boolean): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null)

  const measure = useCallback(() => {
    if (!targetId || !active) {
      setRect(null)
      return
    }
    const el = document.querySelector(`[data-tutorial-target="${CSS.escape(targetId)}"]`)
    if (!el) {
      setRect(null)
      return
    }
    const box = el.getBoundingClientRect()
    setRect({
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
    })
  }, [targetId, active])

  useEffect(() => {
    if (!active) {
      const clearFrame = requestAnimationFrame(() => setRect(null))
      return () => cancelAnimationFrame(clearFrame)
    }

    const cancelScroll = scheduleTutorialTargetScroll(targetId, active)

    let frame = 0
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    scheduleMeasure()
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('scroll', scheduleMeasure, true)
    const interval = window.setInterval(scheduleMeasure, 400)

    return () => {
      cancelScroll()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('scroll', scheduleMeasure, true)
      window.clearInterval(interval)
    }
  }, [active, targetId, measure])

  return rect
}
