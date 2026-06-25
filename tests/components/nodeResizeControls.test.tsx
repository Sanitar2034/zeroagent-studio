import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { NodeResizeControls } from '../../src/components/nodes/NodeResizeControls'

const { nodeResizerSpy } = vi.hoisted(() => ({
  nodeResizerSpy: vi.fn(),
}))

vi.mock('@xyflow/react', () => ({
  NodeResizer: (props: Record<string, unknown>) => {
    nodeResizerSpy(props)
    return null
  },
}))

describe('NodeResizeControls', () => {
  it('passes resize limits and visibility to NodeResizer', () => {
    nodeResizerSpy.mockClear()
    render(<NodeResizeControls nodeType="agent" selected />)

    expect(nodeResizerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: true,
        minWidth: 200,
        minHeight: 108,
        maxWidth: 480,
        maxHeight: 400,
        lineClassName: 'node-resizer-line',
        handleClassName: 'node-resizer-handle',
      })
    )
  })

  it('hides resizer when node is not selected', () => {
    nodeResizerSpy.mockClear()
    render(<NodeResizeControls nodeType="tool" selected={false} />)

    expect(nodeResizerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: false,
        minWidth: 200,
        maxHeight: 400,
      })
    )
  })

  it('hides resizer when node is canvas-locked', () => {
    nodeResizerSpy.mockClear()
    render(<NodeResizeControls nodeType="agent" selected locked />)

    expect(nodeResizerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: false,
      })
    )
  })
})
