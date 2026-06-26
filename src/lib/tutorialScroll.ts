import { fitWorkflowView, focusFlowNode } from './flowCanvasRegistry'

/** Retry scroll while accordions expand and palette layout settles. */
export const TUTORIAL_SCROLL_RETRY_MS = [0, 80, 200, 450] as const

export function findTutorialTargetElement(targetId: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`[data-tutorial-target="${CSS.escape(targetId)}"]`)
}

function getFlowNodeId(el: HTMLElement): string | null {
  const node = el.closest('.react-flow__node')
  return node?.getAttribute('data-id') ?? null
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function scrollTutorialTargetIntoView(targetId: string): void {
  if (typeof document === 'undefined') return

  if (targetId === 'canvas') {
    fitWorkflowView({ padding: 0.2, duration: prefersReducedMotion() ? 0 : 280 })
    return
  }

  const el = findTutorialTargetElement(targetId)
  if (!el) return

  const nodeId = getFlowNodeId(el)
  if (nodeId) {
    focusFlowNode(nodeId, {
      padding: 0.4,
      duration: prefersReducedMotion() ? 0 : 280,
    })
  }

  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
    inline: 'nearest',
  })
}

export function scheduleTutorialTargetScroll(targetId: string | undefined, active: boolean): () => void {
  if (!active || !targetId) return () => undefined

  const timeouts: number[] = []

  for (const delay of TUTORIAL_SCROLL_RETRY_MS) {
    if (delay === 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollTutorialTargetIntoView(targetId))
      })
    } else {
      timeouts.push(window.setTimeout(() => scrollTutorialTargetIntoView(targetId), delay))
    }
  }

  return () => {
    for (const id of timeouts) {
      window.clearTimeout(id)
    }
  }
}
