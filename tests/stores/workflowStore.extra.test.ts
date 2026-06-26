import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkflowStore } from '../../src/stores/workflowStore'

vi.mock('../../src/db', () => ({
  saveWorkflow: vi.fn(async (w: { id?: number }) => w.id ?? 99),
  loadWorkflows: vi.fn(async () => []),
  deleteWorkflow: vi.fn(),
}))

describe('workflowStore — react-flow integration paths', () => {
  beforeEach(() => {
    useWorkflowStore.getState().newWorkflow()
  })

  it('addNode appends and marks dirty', () => {
    useWorkflowStore.getState().addNode({
      id: 'n1',
      type: 'chat',
      position: { x: 0, y: 0 },
      data: {},
    })
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('onNodesChange and onEdgesChange update graph state', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().onNodesChange([
      { id: 'a', type: 'select', selected: true },
    ])
    expect(useWorkflowStore.getState().nodes[0].selected).toBe(true)

    useWorkflowStore.getState().setEdges([
      { id: 'e1', source: 'a', target: 'b' },
    ])
    useWorkflowStore.getState().onEdgesChange([{ id: 'e1', type: 'select', selected: true }])
    expect(useWorkflowStore.getState().edges[0].selected).toBe(true)
  })

  it('updateNodeData leaves other nodes untouched', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'B' } },
    ])
    useWorkflowStore.getState().updateNodeData('a', { label: 'Changed' })
    expect(useWorkflowStore.getState().nodes[0].data.label).toBe('Changed')
    expect(useWorkflowStore.getState().nodes[1].data.label).toBe('B')
  })

  it('saveCurrentWorkflow preserves existing workflow id on update', async () => {
    const { saveWorkflow } = await import('../../src/db')
    useWorkflowStore.setState({ workflowId: 7, workflowName: 'Existing' })
    await useWorkflowStore.getState().saveCurrentWorkflow()
    expect(saveWorkflow).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }))
  })

  it('removeWorkflow keeps canvas when deleting different workflow', async () => {
    useWorkflowStore.setState({
      workflowId: 3,
      nodes: [{ id: 'x', type: 'chat', position: { x: 0, y: 0 }, data: {} }],
    })
    await useWorkflowStore.getState().removeWorkflow(99)
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
  })

  it('onConnect rejects canvas-locked endpoints', () => {
    useWorkflowStore.getState().setNodes([
      {
        id: 'c',
        type: 'chat',
        position: { x: 0, y: 0 },
        data: { label: 'Chat', messages: [] },
      },
      {
        id: 'a',
        type: 'agent',
        position: { x: 0, y: 0 },
        data: { label: 'A', role: 'r', systemPrompt: '', brain: 'transformers', locked: true },
      },
    ])
    useWorkflowStore.getState().onConnect({
      source: 'c',
      target: 'a',
      sourceHandle: 'message',
      targetHandle: 'context',
    })
    expect(useWorkflowStore.getState().edges).toHaveLength(0)
  })

  it('onEdgesChange blocks removing wires on locked nodes', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: { locked: true } },
      { id: 'b', type: 'agent', position: { x: 0, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().setEdges([{ id: 'e1', source: 'a', target: 'b' }])
    useWorkflowStore.getState().onEdgesChange([{ id: 'e1', type: 'remove' }])
    expect(useWorkflowStore.getState().edges).toHaveLength(1)
  })

  it('onNodesChange blocks resize on locked nodes', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'tool', position: { x: 0, y: 0 }, width: 260, height: 132, data: { locked: true } },
    ])
    useWorkflowStore.getState().onNodesChange([
      {
        id: 'a',
        type: 'dimensions',
        dimensions: { width: 300, height: 200 },
        resizing: true,
      },
    ])
    expect(useWorkflowStore.getState().nodes[0].width).toBe(260)
  })

  it('onEdgesChange blocks removing wires when target node is locked', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'agent', position: { x: 0, y: 0 }, data: { locked: true } },
    ])
    useWorkflowStore.getState().setEdges([{ id: 'e1', source: 'a', target: 'b' }])
    useWorkflowStore.getState().onEdgesChange([{ id: 'e1', type: 'remove' }])
    expect(useWorkflowStore.getState().edges).toHaveLength(1)
  })

  it('onEdgesChange ignores remove for unknown edge ids', () => {
    useWorkflowStore.getState().setEdges([{ id: 'e1', source: 'a', target: 'b' }])
    useWorkflowStore.getState().onEdgesChange([{ id: 'missing', type: 'remove' }])
    expect(useWorkflowStore.getState().edges).toHaveLength(1)
  })

  it('onConnect adds edge between nodes', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'agent', position: { x: 100, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().onConnect({
      source: 'a',
      target: 'b',
      sourceHandle: null,
      targetHandle: null,
    })
    expect(useWorkflowStore.getState().edges).toHaveLength(1)
  })

  it('removeWorkflow clears canvas when deleting active workflow', async () => {
    const { deleteWorkflow } = await import('../../src/db')
    useWorkflowStore.setState({ workflowId: 5, nodes: [{ id: 'x', type: 'chat', position: { x: 0, y: 0 }, data: {} }] })
    await useWorkflowStore.getState().removeWorkflow(5)
    expect(deleteWorkflow).toHaveBeenCalledWith(5)
    expect(useWorkflowStore.getState().nodes).toHaveLength(0)
  })

  it('loadWorkflow sets workflowId null when stored record id is null', async () => {
    const { loadWorkflows } = await import('../../src/db')
    vi.mocked(loadWorkflows).mockResolvedValueOnce([
      {
        id: null,
        name: 'NoId',
        nodes: [{ id: 'n', type: 'chat', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        createdAt: 1,
        updatedAt: 2,
      },
    ] as never)
    await useWorkflowStore.getState().loadWorkflow(null as unknown as number)
    expect(useWorkflowStore.getState().workflowName).toBe('NoId')
    expect(useWorkflowStore.getState().workflowId).toBeNull()
  })

  it('loadWorkflow no-ops when id not found', async () => {
    useWorkflowStore.getState().setWorkflowName('Before')
    await useWorkflowStore.getState().loadWorkflow(999)
    expect(useWorkflowStore.getState().workflowName).toBe('Before')
  })
})
