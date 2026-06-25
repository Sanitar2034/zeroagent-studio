import { describe, it, expect, beforeEach } from 'vitest'
import { recordEdgeTransfersForNode, setFlowingEdgesForNode, __testOnly } from '../../src/lib/edgeTransfers'
import { useExecutionStore } from '../../src/stores/executionStore'
import { textPortValue } from '../../src/lib/ports'
import type { ExecutionContext } from '../../src/types'

describe('edgeTransfers', () => {
  beforeEach(() => {
    useExecutionStore.setState({
      edgeTransfers: {},
      flowingEdges: new Set(),
    })
  })

  it('records upstream payload per edge when a node consumes inputs', () => {
    const nodes = [
      { id: 'chat-1', type: 'chat', data: { label: 'Chat' } },
      { id: 'calc-1', type: 'tool', data: { toolType: 'calculator', label: 'Calc' } },
    ]
    const edges = [
      {
        id: 'e1',
        source: 'chat-1',
        target: 'calc-1',
        sourceHandle: 'message',
        targetHandle: 'in',
      },
    ]
    const context: ExecutionContext = {
      variables: { 'chat-1': { message: textPortValue('2+2') } },
      toolResults: {},
      legacyVariables: { 'chat-1': '2+2' },
    }

    recordEdgeTransfersForNode('calc-1', ['in'], nodes as never[], edges as never[], context)

    const transfer = useExecutionStore.getState().edgeTransfers.e1
    expect(transfer?.value).toBe('2+2')
    expect(transfer?.targetHandle).toBe('in')
  })

  it('marks edges touching a node as flowing', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'x', target: 'y' },
    ]

    setFlowingEdgesForNode('b', edges as never[])

    const flowing = useExecutionStore.getState().flowingEdges
    expect(flowing.has('e1')).toBe(true)
    expect(flowing.has('e2')).toBe(true)
    expect(flowing.has('e3')).toBe(false)
  })

  it('reads output from explicit out port when present', () => {
    const nodes = [
      { id: 'agent-1', type: 'agent', data: { label: 'Agent' } },
      { id: 'speech-1', type: 'tool', data: { toolType: 'speech', label: 'Speech' } },
    ]
    const edges = [
      {
        id: 'e1',
        source: 'agent-1',
        target: 'speech-1',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ]
    const context: ExecutionContext = {
      variables: { 'agent-1': { out: textPortValue('Hello world') } },
      toolResults: {},
      legacyVariables: {},
    }

    recordEdgeTransfersForNode('speech-1', ['in'], nodes as never[], edges as never[], context)
    expect(useExecutionStore.getState().edgeTransfers.e1?.value).toBe('Hello world')
  })

  it('reads non-out port values when out is missing', () => {
    const nodes = [
      { id: 'chat-1', type: 'chat', data: { label: 'Chat' } },
      { id: 'calc-1', type: 'tool', data: { toolType: 'calculator', label: 'Calc' } },
    ]
    const edges = [
      {
        id: 'e2',
        source: 'chat-1',
        target: 'calc-1',
        sourceHandle: 'message',
        targetHandle: 'in',
      },
    ]
    const context: ExecutionContext = {
      variables: { 'chat-1': { message: textPortValue('3*3') } },
      toolResults: {},
      legacyVariables: {},
    }

    recordEdgeTransfersForNode('calc-1', ['in'], nodes as never[], edges as never[], context)
    expect(useExecutionStore.getState().edgeTransfers.e2?.value).toBe('3*3')
  })

  it('falls back to legacy variable output when port map is empty', () => {
    const nodes = [
      { id: 'chat-1', type: 'chat', data: { label: 'Chat' } },
      { id: 'calc-1', type: 'tool', data: { toolType: 'calculator', label: 'Calc' } },
    ]
    const edges = [
      {
        id: 'e3',
        source: 'chat-1',
        target: 'calc-1',
        sourceHandle: 'message',
        targetHandle: 'in',
      },
    ]
    const context: ExecutionContext = {
      variables: {},
      toolResults: {},
      legacyVariables: { 'chat-1': '5+5' },
    }

    recordEdgeTransfersForNode('calc-1', ['in'], nodes as never[], edges as never[], context)
    expect(useExecutionStore.getState().edgeTransfers.e3?.value).toBe('5+5')
  })

  it('reads the first port value when out is absent on tool results', () => {
    const nodes = [
      { id: 'tool-1', type: 'tool', data: { toolType: 'text-transform', label: 'Text' } },
      { id: 'calc-1', type: 'tool', data: { toolType: 'calculator', label: 'Calc' } },
    ]
    const edges = [
      {
        id: 'e4',
        source: 'tool-1',
        target: 'calc-1',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ]
    const context: ExecutionContext = {
      variables: {},
      toolResults: { 'tool-1': { preview: textPortValue('8/2') } },
      legacyVariables: {},
    }

    recordEdgeTransfersForNode('calc-1', ['in'], nodes as never[], edges as never[], context)
    expect(useExecutionStore.getState().edgeTransfers.e4?.value).toBe('8/2')
  })

  it('falls back to legacy when wired port values are empty', () => {
    const nodes = [
      { id: 'tool-1', type: 'tool', data: { toolType: 'text-transform', label: 'Text' } },
      { id: 'calc-1', type: 'tool', data: { toolType: 'calculator', label: 'Calc' } },
    ]
    const edges = [
      {
        id: 'e5',
        source: 'tool-1',
        target: 'calc-1',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ]
    const context: ExecutionContext = {
      variables: {},
      toolResults: { 'tool-1': { preview: { type: 'text', value: '' } } },
      legacyVariables: { 'tool-1': 'recovered output' },
    }

    recordEdgeTransfersForNode('calc-1', ['in'], nodes as never[], edges as never[], context)
    expect(useExecutionStore.getState().edgeTransfers.e5?.value).toBe('recovered output')
  })

  it('getNodeOutputValue covers tool, variable, and legacy fallbacks', () => {
    const context: ExecutionContext = {
      variables: { a: { out: textPortValue('var-out') } },
      toolResults: {
        b: { out: textPortValue('tool-out') },
        c: { alt: textPortValue('tool-alt') },
        d: {},
      },
      legacyVariables: { e: 'legacy' },
    }

    expect(__testOnly.getNodeOutputValue('a', context)).toBe('var-out')
    expect(__testOnly.getNodeOutputValue('b', context)).toBe('tool-out')
    expect(__testOnly.getNodeOutputValue('c', context)).toBe('tool-alt')
    expect(__testOnly.getNodeOutputValue('d', context)).toBe('')
    expect(__testOnly.getNodeOutputValue('e', context)).toBe('legacy')
    expect(__testOnly.getNodeOutputValue('missing', context)).toBe('')
  })
})
