import { describe, it, expect, vi } from 'vitest'
import {
  formatWorkflowRunResult,
  formatWorkflowRunError,
  runWorkflowStarter,
} from '../../src/lib/workflowRun'
import * as dag from '../../src/orchestrator/dag'
import { workflowStarterHint } from '../../src/lib/workflowStarters'

describe('workflowRun', () => {
  it('formats successful workflow run', () => {
    const status = formatWorkflowRunResult('Hello world', 'tool')
    expect(status.tone).toBe('ok')
    expect(status.text).toContain('Done')
    expect(status.text).toContain('Hello world')
  })

  it('formats partial workflow run with step errors', () => {
    const status = formatWorkflowRunResult('Output\n\n⚠ Some workflow steps failed', 'tool')
    expect(status.tone).toBe('warn')
    expect(status.text).toContain('Partial run')
  })

  it('formats capture run', () => {
    const status = formatWorkflowRunResult('Captured text', 'sink')
    expect(status.tone).toBe('ok')
    expect(status.text).toContain('Captured')
  })

  it('formats empty successful run', () => {
    const status = formatWorkflowRunResult('   ', 'agent')
    expect(status.text).toBe('Workflow run finished.')
  })

  it('formats workflow run with step errors only in footer', () => {
    const status = formatWorkflowRunResult('ok\n\n⚠ Some workflow steps failed', 'tool')
    expect(status.tone).toBe('warn')
    expect(status.text).toContain('Partial run')
    expect(status.text).toContain('ok')
  })

  it('formats run with only step errors marker', () => {
    const status = formatWorkflowRunResult('⚠ Some workflow steps failed', 'tool')
    expect(status.tone).toBe('warn')
    expect(status.text).toBe('Workflow finished with errors — see activity log.')
  })

  it('formats empty capture run', () => {
    expect(formatWorkflowRunResult('', 'sink').text).toBe('Capture run finished.')
  })

  it('formats successful capture preview', () => {
    const status = formatWorkflowRunResult('saved text', 'sink')
    expect(status.tone).toBe('ok')
    expect(status.text).toBe('Captured: saved text')
  })

  it('formats capture with only step errors marker', () => {
    const status = formatWorkflowRunResult('⚠ Some workflow steps failed', 'sink')
    expect(status.tone).toBe('warn')
    expect(status.text).toBe('Capture finished with errors — see activity log.')
  })

  it('formats partial capture with footer errors', () => {
    const status = formatWorkflowRunResult('text\n\n⚠ Some workflow steps failed', 'sink')
    expect(status.tone).toBe('warn')
    expect(status.text).toBe('Partial capture: text')
  })

  it('truncates long capture preview with ellipsis', () => {
    const long = 'y'.repeat(300)
    const status = formatWorkflowRunResult(long, 'sink')
    expect(status.text).toContain('…')
  })

  it('truncates long preview with ellipsis', () => {
    const long = 'x'.repeat(300)
    const status = formatWorkflowRunResult(long, 'tool')
    expect(status.text).toContain('…')
  })

  it('formats errors', () => {
    expect(formatWorkflowRunError(new Error('boom')).text).toBe('boom')
    expect(formatWorkflowRunError('nope').text).toBe('nope')
  })

  it('runWorkflowStarter dispatches by kind', async () => {
    const agentSpy = vi.spyOn(dag, 'runWorkflowFromAgent').mockResolvedValue('agent-out')
    const toolSpy = vi.spyOn(dag, 'runWorkflowFromTool').mockResolvedValue('tool-out')
    const sinkSpy = vi.spyOn(dag, 'runWorkflowToSink').mockResolvedValue('sink-out')

    await expect(runWorkflowStarter('agent', 'a', [], [], {})).resolves.toBe('agent-out')
    await expect(runWorkflowStarter('tool', 't', [], [], {})).resolves.toBe('tool-out')
    await expect(runWorkflowStarter('sink', 's', [], [], {})).resolves.toBe('sink-out')

    expect(agentSpy).toHaveBeenCalledWith([], [], 'a', {})
    expect(toolSpy).toHaveBeenCalledWith([], [], 't', {})
    expect(sinkSpy).toHaveBeenCalledWith([], [], 's', {})
  })
})

describe('workflowStarterHint', () => {
  it('describes each starter kind', () => {
    expect(workflowStarterHint('agent')).toContain('agent')
    expect(workflowStarterHint('tool')).toContain('downstream')
    expect(workflowStarterHint('sink')).toContain('capture')
  })
})
