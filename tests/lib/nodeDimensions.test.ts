import { describe, it, expect } from 'vitest'
import {
  ensureNodeDimensions,
  getDefaultNodeSize,
  getNodeResizeLimits,
  resolveWorkflowNodeType,
} from '../../src/lib/nodeDimensions'
import { makeAgent, makeChat, makeTool } from '../helpers/graphBuilders'

describe('nodeDimensions', () => {
  it('resolves known workflow node types', () => {
    expect(resolveWorkflowNodeType('agent')).toBe('agent')
    expect(resolveWorkflowNodeType('tool')).toBe('tool')
    expect(resolveWorkflowNodeType('chat')).toBe('chat')
    expect(resolveWorkflowNodeType('unknown')).toBe('tool')
  })

  it('returns stable default sizes per node type', () => {
    expect(getDefaultNodeSize('agent')).toEqual({ width: 260, height: 148 })
    expect(getDefaultNodeSize('tool')).toEqual({ width: 260, height: 132 })
    expect(getDefaultNodeSize('chat')).toEqual({ width: 340, height: 240 })
  })

  it('returns resize limits that include defaults', () => {
    const limits = getNodeResizeLimits('agent')
    expect(limits.width).toBe(260)
    expect(limits.height).toBe(148)
    expect(limits.minWidth).toBeLessThanOrEqual(limits.width)
    expect(limits.maxWidth).toBeGreaterThanOrEqual(limits.width)
  })

  it('adds default width and height to legacy nodes', () => {
    const legacy = makeAgent('a1')
    expect(legacy.width).toBeUndefined()

    const sized = ensureNodeDimensions(legacy)
    expect(sized.width).toBe(260)
    expect(sized.height).toBe(148)
  })

  it('preserves user-resized dimensions', () => {
    const sized = ensureNodeDimensions({ ...makeTool('t1', 'speech'), width: 320, height: 180 })
    expect(sized.width).toBe(320)
    expect(sized.height).toBe(180)
  })

  it('replaces invalid dimensions with defaults', () => {
    const sized = ensureNodeDimensions({ ...makeChat('c1'), width: 0, height: -5 })
    expect(sized.width).toBe(340)
    expect(sized.height).toBe(240)
  })
})
