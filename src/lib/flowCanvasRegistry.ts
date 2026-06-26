import type { ReactFlowInstance } from '@xyflow/react'

let flowInstance: ReactFlowInstance | null = null

export function setFlowCanvasInstance(instance: ReactFlowInstance | null): void {
  flowInstance = instance
}

export function getFlowCanvasInstance(): ReactFlowInstance | null {
  return flowInstance
}

export function getViewportCenterPosition(): { x: number; y: number } {
  if (!flowInstance) return { x: 250, y: 200 }

  const pane = document.querySelector('.flow-canvas')
  if (!pane) return { x: 250, y: 200 }

  const rect = pane.getBoundingClientRect()
  return flowInstance.screenToFlowPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  })
}

/** Frame the current graph after programmatic loads (examples, imports). */
export function fitWorkflowView(options?: { padding?: number; duration?: number }): void {
  if (!flowInstance) return

  const padding = options?.padding ?? 0.2
  const duration = options?.duration ?? 200

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flowInstance?.fitView({ padding, duration })
    })
  })
}

/** Pan/zoom so a single node (e.g. Chat during a quest) stays in view. */
export function focusFlowNode(
  nodeId: string,
  options?: { padding?: number; duration?: number; maxZoom?: number }
): void {
  if (!flowInstance) return

  const padding = options?.padding ?? 0.4
  const duration = options?.duration ?? 280
  const maxZoom = options?.maxZoom ?? 1.15

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flowInstance?.fitView({
        nodes: [{ id: nodeId }],
        padding,
        duration,
        maxZoom,
      })
    })
  })
}
