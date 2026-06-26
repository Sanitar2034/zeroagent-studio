import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fitWorkflowView,
  focusFlowNode,
  getFlowCanvasInstance,
  getViewportCenterPosition,
  setFlowCanvasInstance,
} from '../../src/lib/flowCanvasRegistry'

describe('flowCanvasRegistry', () => {
  beforeEach(() => {
    setFlowCanvasInstance(null)
  })

  afterEach(() => {
    setFlowCanvasInstance(null)
    document.querySelector('.flow-canvas')?.remove()
  })

  it('returns fallback position when canvas is not registered', () => {
    expect(getViewportCenterPosition()).toEqual({ x: 250, y: 200 })
  })

  it('returns fallback when pane element is missing', () => {
    setFlowCanvasInstance({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    } as never)

    expect(getViewportCenterPosition()).toEqual({ x: 250, y: 200 })
  })

  it('converts viewport center to flow coordinates', () => {
    const pane = document.createElement('div')
    pane.className = 'flow-canvas'
    document.body.appendChild(pane)
    pane.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        width: 400,
        height: 300,
        right: 500,
        bottom: 350,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }) as DOMRect

    setFlowCanvasInstance({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x: x - 100, y: y - 50 }),
    } as never)

    expect(getViewportCenterPosition()).toEqual({ x: 200, y: 150 })
  })

  it('fitWorkflowView is a no-op without a canvas instance', () => {
    expect(() => fitWorkflowView()).not.toThrow()
  })

  it('fitWorkflowView calls fitView on the registered instance', async () => {
    const fitView = vi.fn()
    setFlowCanvasInstance({ fitView } as never)

    fitWorkflowView({ padding: 0.3, duration: 0 })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(fitView).toHaveBeenCalledWith({ padding: 0.3, duration: 0 })
  })

  it('fitWorkflowView uses default padding and duration', async () => {
    const fitView = vi.fn()
    setFlowCanvasInstance({ fitView } as never)

    fitWorkflowView()
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 200 })
  })

  it('fitWorkflowView survives canvas unregister before animation frame', async () => {
    const fitView = vi.fn()
    setFlowCanvasInstance({ fitView } as never)

    const originalRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
      setFlowCanvasInstance(null)
      callback(0)
      return 0
    }

    expect(() => fitWorkflowView()).not.toThrow()
    expect(fitView).not.toHaveBeenCalled()

    globalThis.requestAnimationFrame = originalRaf
  })

  it('exposes the registered flow instance', () => {
    expect(getFlowCanvasInstance()).toBeNull()
    const instance = { fitView: vi.fn() }
    setFlowCanvasInstance(instance as never)
    expect(getFlowCanvasInstance()).toBe(instance)
  })

  it('focusFlowNode is a no-op without a canvas instance', () => {
    expect(() => focusFlowNode('chat-1')).not.toThrow()
  })

  it('focusFlowNode frames a single node', async () => {
    const fitView = vi.fn()
    setFlowCanvasInstance({ fitView } as never)

    focusFlowNode('agent-1', { padding: 0.5, duration: 0, maxZoom: 1.1 })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(fitView).toHaveBeenCalledWith({
      nodes: [{ id: 'agent-1' }],
      padding: 0.5,
      duration: 0,
      maxZoom: 1.1,
    })
  })

  it('focusFlowNode uses default zoom and padding', async () => {
    const fitView = vi.fn()
    setFlowCanvasInstance({ fitView } as never)

    focusFlowNode('chat-1')
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(fitView).toHaveBeenCalledWith({
      nodes: [{ id: 'chat-1' }],
      padding: 0.4,
      duration: 280,
      maxZoom: 1.15,
    })
  })
})
