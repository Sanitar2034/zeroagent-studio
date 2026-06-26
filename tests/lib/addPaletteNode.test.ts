import { describe, it, expect, beforeEach } from 'vitest'
import { addPaletteNodeAt, createNodeFromPaletteType } from '../../src/lib/addPaletteNode'
import { useWorkflowStore } from '../../src/stores/workflowStore'

describe('addPaletteNode', () => {
  beforeEach(() => {
    useWorkflowStore.getState().newWorkflow()
  })

  it('creates agent and chat nodes from palette types', () => {
    const agent = createNodeFromPaletteType('agent', { x: 10, y: 20 })
    expect(agent?.type).toBe('agent')
    expect(agent?.position).toEqual({ x: 10, y: 20 })

    const chat = createNodeFromPaletteType('chat', { x: 0, y: 0 })
    expect(chat?.type).toBe('chat')
  })

  it('creates manifest tool nodes from drag type', () => {
    const tool = createNodeFromPaletteType('tool-trim-text', { x: 5, y: 5 })
    expect(tool?.type).toBe('tool')
    expect(tool?.data).toMatchObject({ toolType: 'trim-text' })
  })

  it('returns null for unknown palette type', () => {
    expect(createNodeFromPaletteType('not-a-real-type', { x: 0, y: 0 })).toBeNull()
  })

  it('adds node to workflow store', () => {
    expect(addPaletteNodeAt('chat', { x: 100, y: 50 })).toBe(true)
    const nodes = useWorkflowStore.getState().nodes
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.type).toBe('chat')
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('returns false for unknown palette type', () => {
    expect(addPaletteNodeAt('unknown-type', { x: 0, y: 0 })).toBe(false)
    expect(useWorkflowStore.getState().nodes).toHaveLength(0)
  })
})
