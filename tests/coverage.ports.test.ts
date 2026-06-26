import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DAGOrchestrator } from '../src/orchestrator/dag'
import { makeChat, makeAgent, makeTool } from './helpers/graphBuilders'
import { isValidWorkflowConnection, normalizeConnection } from '../src/lib/connectionValidation'
import { getNodePorts, getPortDef } from '../src/lib/nodePorts'
import { createWorkflowEdge } from '../src/lib/workflowEdges'
import { migrateWorkflowEdges } from '../src/lib/workflowMigration'
import { manifestToToolDefinition } from '../src/tools/registryHelpers'
import { MANIFEST_TOOLS } from '../src/tools/manifests/index'
import { runEncodingPreset } from '../src/tools/engines/encodingRunner'
import { runJsonPreset } from '../src/tools/engines/jsonRunner'
import { runValidatePreset } from '../src/tools/engines/validateRunner'
import { runHashPreset } from '../src/tools/engines/hashRunner'
import { runStringPreset } from '../src/tools/engines/stringRunner'
import { runDatePreset } from '../src/tools/engines/dateRunner'
import { runMathPreset } from '../src/tools/engines/mathRunner'
import { runFlowPreset } from '../src/tools/engines/flowRunner'
import { runToolForPreview } from '../src/tools/registryHelpers'
import type { ManifestEngine } from '../src/tools/manifests/index'

const mockChat = vi.fn()

vi.mock('../src/engines', () => ({
  getEngine: vi.fn(() => ({
    name: 'Mock',
    isAvailable: vi.fn(() => true),
    chat: (...args: unknown[]) => mockChat(...args),
  })),
}))

vi.mock('../src/stores/executionStore', () => ({
  useExecutionStore: {
    getState: () => ({
      setRunning: vi.fn(),
      clearThinking: vi.fn(),
      setCurrentNode: vi.fn(),
      addThinkingNode: vi.fn(),
      removeThinkingNode: vi.fn(),
      clearEdgeTransfers: vi.fn(),
      clearFlowingEdges: vi.fn(),
      recordEdgeTransfer: vi.fn(),
      setFlowingEdges: vi.fn(),
    }),
  },
}))

vi.mock('../src/stores/workflowStore', () => ({
  useWorkflowStore: {
    getState: () => ({ updateNodeData: vi.fn(), nodes: [] }),
  },
}))

describe('coverage gaps — ports and connections', () => {
  beforeEach(() => {
    mockChat.mockResolvedValue({ content: 'agent reply', model: 'm' })
  })

  it('dag legacy input fallback when handles mismatch', async () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const orch = new DAGOrchestrator(
      [chat, agent],
      [
        {
          id: 'e1',
          source: 'c',
          target: 'a',
          sourceHandle: 'message',
          targetHandle: 'nonexistent',
        },
      ],
      {},
      vi.fn()
    )
    const out = await orch.execute('hello', 'c')
    expect(out).toContain('agent reply')
  })

  it('dag runs trim-text with port handles', async () => {
    const chat = makeChat('c')
    const tool = makeTool('t', 'trim-text')
    const agent = makeAgent('a')
    const orch = new DAGOrchestrator(
      [chat, tool, agent],
      [
        { id: 'e1', source: 'c', target: 't', sourceHandle: 'message', targetHandle: 'in' },
        { id: 'e2', source: 't', target: 'a', sourceHandle: 'out', targetHandle: 'context' },
      ],
      {},
      vi.fn()
    )
    const out = await orch.execute('  spaced  ', 'c')
    expect(out).toContain('agent reply')
  })

  it('connection validation rejects incompatible port types', () => {
    const chat = makeChat('c')
    const jsonTool = makeTool('j', 'json-pretty')
    const curatedJson = makeTool('jt', 'json-tool')
    const nodes = [chat, jsonTool, curatedJson]
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'j', sourceHandle: 'message', targetHandle: 'in' },
        nodes,
        []
      )
    ).toBe(false)
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'jt', sourceHandle: 'message', targetHandle: 'in' },
        nodes,
        []
      )
    ).toBe(true)
  })

  it('connection validation rejects missing ports', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'a', sourceHandle: 'bad', targetHandle: 'context' },
        [chat, agent],
        []
      )
    ).toBe(false)
  })

  it('normalizeConnection returns null for missing nodes', () => {
    expect(normalizeConnection({ source: 'x', target: 'y' }, [])).toBeNull()
  })

  it('getNodePorts falls back for unknown node type', () => {
    const ports = getNodePorts({ id: 'x', type: 'unknown', position: { x: 0, y: 0 }, data: {} })
    expect(ports).toHaveLength(2)
  })

  it('getPortDef returns null for unknown handle', () => {
    const chat = makeChat('c')
    expect(getPortDef(chat, 'nope', 'source')).toBeNull()
  })

  it('createWorkflowEdge auto-generates id', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const e = createWorkflowEdge(chat, agent)
    expect(e.id).toBe('e-c-a')
  })

  it('migrateWorkflowEdges keeps edge when node missing', () => {
    const edges = migrateWorkflowEdges([], [{ id: 'e', source: 'a', target: 'b' }])
    expect(edges[0].source).toBe('a')
  })

  it('manifest unknown engine returns input', async () => {
    const entry = { ...MANIFEST_TOOLS[0], engine: 'bogus' as ManifestEngine }
    const tool = manifestToToolDefinition(entry)
    const result = await tool.run({ in: { type: 'text', value: 'keep' } }, {}, { apiKeys: {}, log: vi.fn() })
    expect(result.out?.value).toBe('keep')
  })

  it('encoding branches html decode hex unicode', () => {
    expect(runEncodingPreset('html-decode', '&lt;b&gt;')).toBe('<b>')
    expect(runEncodingPreset('html-decode', '&#65;')).toBe('A')
    expect(runEncodingPreset('html-decode', '&#x41;')).toBe('A')
    expect(runEncodingPreset('html-decode', '&unknown;')).toBe('&unknown;')
    const hex = runEncodingPreset('hex-encode', 'ab')
    expect(runEncodingPreset('hex-decode', hex)).toBe('ab')
    expect(runEncodingPreset('unicode-escape', 'é')).toContain('\\u')
    expect(runEncodingPreset('unicode-unescape', '\\u00e9')).toBe('é')
    expect(runEncodingPreset('binary-encode', 'ab')).toContain(' ')
  })

  it('json and validate error branches', () => {
    expect(runJsonPreset('is-array', 'not json', {})).toBe('false')
    expect(runJsonPreset('is-object', 'not json', {})).toBe('false')
    expect(runValidatePreset('is-json', 'bad', {})).toBe('false')
    expect(runValidatePreset('is-url', 'bad', {})).toBe('false')
    expect(runValidatePreset('is-number', 'x', {})).toBe('false')
    expect(runValidatePreset('is-integer', '1.5', {})).toBe('false')
    expect(runValidatePreset('in-range', '200', { min: '0', max: '100' })).toBe('false')
  })

  it('hash default branch', async () => {
    const h = await runHashPreset('bogus' as 'sha-256', 'x')
    expect(h).toHaveLength(64)
  })

  it('json values rejects non-object', () => {
    expect(() => runJsonPreset('values', '[1]', {})).toThrow()
  })

  it('dag merges multiple context inputs', async () => {
    const chat = makeChat('c')
    const t1 = makeTool('t1', 'trim-text')
    const t2 = makeTool('t2', 'uppercase')
    const agent = makeAgent('a')
    const orch = new DAGOrchestrator(
      [chat, t1, t2, agent],
      [
        { id: 'e1', source: 'c', target: 't1', sourceHandle: 'message', targetHandle: 'in' },
        { id: 'e2', source: 'c', target: 't2', sourceHandle: 'message', targetHandle: 'in' },
        { id: 'e3', source: 't1', target: 'a', sourceHandle: 'out', targetHandle: 'context' },
        { id: 'e4', source: 't2', target: 'a', sourceHandle: 'out', targetHandle: 'context' },
      ],
      {},
      vi.fn()
    )
    const out = await orch.execute('hi', 'c')
    expect(out).toContain('agent reply')
  })

  it('connection allows multiple edges on context port', () => {
    const chat = makeChat('c')
    const t1 = makeTool('t1', 'trim-text')
    const agent = makeAgent('a')
    const nodes = [chat, t1, agent]
    const edges = [{ id: 'e1', source: 'c', target: 't1', sourceHandle: 'message', targetHandle: 'in' }]
    expect(
      isValidWorkflowConnection(
        { source: 't1', target: 'a', sourceHandle: 'out', targetHandle: 'context' },
        nodes,
        edges
      )
    ).toBe(true)
    expect(
      isValidWorkflowConnection(
        { source: 'c', target: 'a', sourceHandle: 'message', targetHandle: 'context' },
        nodes,
        [{ id: 'e0', source: 'x', target: 'a', targetHandle: 'context' }]
      )
    ).toBe(true)
  })

  it('connection rejects duplicate single-input port', () => {
    const chat = makeChat('c')
    const tool = makeTool('t', 'trim-text')
    const nodes = [chat, tool]
    const edges = [{ id: 'e1', source: 'c', target: 't', sourceHandle: 'message', targetHandle: 'in' }]
    expect(
      isValidWorkflowConnection(
        { source: 'chat2', target: 't', sourceHandle: 'message', targetHandle: 'in' },
        [...nodes, makeChat('chat2')],
        edges
      )
    ).toBe(false)
  })

  it('engine branch coverage extras', () => {
    expect(runStringPreset('camel-case', '', {})).toBe('')
    expect(runFlowPreset('default-if-empty', 'has', { default: 'd' })).toBe('has')
    expect(() => runDatePreset('format', 'bad-date', {})).toThrow()
    expect(() => runMathPreset('round', 'not', {})).toThrow()
    expect(runEncodingPreset('hex-decode', '')).toBe('')
  })

  it('runToolForPreview reads first output port', async () => {
    const tool = manifestToToolDefinition(MANIFEST_TOOLS[0])
    const out = await runToolForPreview(tool, '  x  ', {}, { apiKeys: {}, log: vi.fn() })
    expect(out).toBe('x')
  })

  it('connection rejects empty source or target', () => {
    expect(isValidWorkflowConnection({ source: '', target: 'a' }, [makeAgent('a')], [])).toBe(false)
    expect(isValidWorkflowConnection({ source: 'a', target: '' }, [makeAgent('a')], [])).toBe(false)
    expect(isValidWorkflowConnection({ source: 'c', target: 'a' }, [makeChat('c')], [])).toBe(false)
  })

  it('dag skips legacy merge when upstream output is empty', async () => {
    const chat = makeChat('c')
    const tool = makeTool('t', 'trim-text')
    const agent = makeAgent('a')
    const orch = new DAGOrchestrator(
      [chat, tool, agent],
      [
        { id: 'e1', source: 'c', target: 't', sourceHandle: 'message', targetHandle: 'in' },
        { id: 'e2', source: 't', target: 'a', sourceHandle: 'out', targetHandle: 'wrong-port' },
      ],
      {},
      vi.fn()
    )
    const out = await orch.execute('', 'c')
    expect(out).toContain('agent reply')
  })

  it('registry getToolCount', async () => {
    const { getToolCount } = await import('../src/tools/registry')
    expect(getToolCount()).toBeGreaterThanOrEqual(100)
  })
})
