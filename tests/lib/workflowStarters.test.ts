import { describe, it, expect } from 'vitest'
import { getWorkflowStarterKind, workflowStarterLabel } from '../../src/lib/workflowStarters'
import { makeAgent, makeTool, edgeWithHandles } from '../helpers/graphBuilders'

describe('workflowStarters', () => {
  it('returns agent for connected agent nodes', () => {
    const agent = makeAgent('a')
    const tool = makeTool('t', 'trim-text')
    const edges = [edgeWithHandles('e1', 't', 'a', 'out', 'context')]
    expect(getWorkflowStarterKind(agent, [agent, tool], edges, {})).toBe('agent')
  })

  it('returns null for orphan agent without wires', () => {
    const agent = makeAgent('a')
    expect(getWorkflowStarterKind(agent, [agent], [], {})).toBeNull()
  })

  it('returns tool for datetime with downstream chain', () => {
    const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
    const agent = makeAgent('a')
    const edges = [edgeWithHandles('e1', 'dt', 'a', 'out', 'context')]
    expect(getWorkflowStarterKind(dt, [dt, agent], edges, {})).toBe('tool')
  })

  it('returns sink for text-output with tool-only upstream', () => {
    const scraper = makeTool('sc', 'web-scraper', { url: 'https://example.com' })
    const output = makeTool('out', 'text-output')
    const edges = [edgeWithHandles('e1', 'sc', 'out', 'out', 'in')]
    expect(getWorkflowStarterKind(output, [scraper, output], edges, {})).toBe('sink')
  })

  it('returns null for trim-text without upstream capability', () => {
    const trim = makeTool('t', 'trim-text')
    const agent = makeAgent('a')
    const edges = [edgeWithHandles('e1', 't', 'a', 'out', 'context')]
    expect(getWorkflowStarterKind(trim, [trim, agent], edges, {})).toBeNull()
  })

  it('returns null for starters without downstream', () => {
    const dt = makeTool('dt', 'datetime', { mode: 'format-now' })
    expect(getWorkflowStarterKind(dt, [dt], [], {})).toBeNull()
  })

  it('returns null for text-output when capture is unavailable', () => {
    const agent = makeAgent('a')
    const output = makeTool('out', 'text-output')
    const edges = [edgeWithHandles('e1', 'a', 'out', 'out', 'in')]
    expect(getWorkflowStarterKind(output, [agent, output], edges, {})).toBeNull()
  })

  it('returns null for non-tool nodes', () => {
    const chat = { id: 'c', type: 'chat', position: { x: 0, y: 0 }, data: {} }
    expect(getWorkflowStarterKind(chat as never, [chat as never], [], {})).toBeNull()
  })

  it('returns null when tool is locked', () => {
    const vision = makeTool('v', 'gemini-vision')
    const agent = makeAgent('a')
    const edges = [edgeWithHandles('e1', 'v', 'a', 'out', 'context')]
    expect(getWorkflowStarterKind(vision, [vision, agent], edges, {})).toBeNull()
  })

  it('labels sink vs workflow', () => {
    expect(workflowStarterLabel('sink')).toBe('Run capture')
    expect(workflowStarterLabel('tool')).toBe('Run workflow')
  })
})
