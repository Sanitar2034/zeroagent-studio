import { describe, it, expect } from 'vitest'
import {
  getTool,
  resolveToolAutoRun,
  shouldSkipToolExecution,
  canToolRunWithoutUpstreamInput,
} from '../../src/tools/registry'
import type { ToolNodeData } from '../../src/types'
import { textPortValue } from '../../src/lib/ports'

describe('tool autoRun', () => {
  it('datetime format-now defaults autoRun on', () => {
    const tool = getTool('datetime')
    const data: ToolNodeData = { label: 'DT', toolType: 'datetime', config: { mode: 'format-now' } }
    expect(resolveToolAutoRun(data, tool)).toBe(true)
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(false)
  })

  it('datetime parse runs without input when autoRun off (tool throws)', () => {
    const tool = getTool('datetime')
    const data: ToolNodeData = {
      label: 'DT',
      toolType: 'datetime',
      config: { mode: 'parse' },
      autoRun: false,
    }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(false)
  })

  it('web-scraper auto-runs when url in config', () => {
    const tool = getTool('web-scraper')
    const data: ToolNodeData = {
      label: 'Scraper',
      toolType: 'web-scraper',
      config: { url: 'https://example.com' },
    }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(false)
  })

  it('text-transform runs without input (errors at tool level)', () => {
    const tool = getTool('trim-text')
    const data: ToolNodeData = { label: 'Trim', toolType: 'trim-text' }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(false)
  })

  it('runs when upstream input present', () => {
    const tool = getTool('trim-text')
    const data: ToolNodeData = { label: 'Trim', toolType: 'trim-text' }
    expect(
      shouldSkipToolExecution(data, tool, { in: textPortValue('  hi  ') }).skip
    ).toBe(false)
  })

  it('respects per-node autoRun override', () => {
    const tool = getTool('datetime')
    const data: ToolNodeData = {
      label: 'DT',
      toolType: 'datetime',
      config: { mode: 'format-now' },
      autoRun: false,
    }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(true)
  })

  it('text-output skips when there is no upstream input', () => {
    const tool = getTool('text-output')
    const data: ToolNodeData = { label: 'Out', toolType: 'text-output', outputLog: [] }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(true)
  })

  it('speech TTS skips when there is no upstream input', () => {
    const tool = getTool('speech')
    const data: ToolNodeData = {
      label: 'Speech',
      toolType: 'speech',
      config: { mode: 'tts', language: 'en-US' },
    }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(true)
  })

  it('speech both mode skips when there is no upstream input', () => {
    const tool = getTool('speech')
    const data: ToolNodeData = {
      label: 'Speech',
      toolType: 'speech',
      config: { mode: 'both', language: 'en-US' },
    }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(true)
  })

  it('speech STT can run without upstream when autoRun is enabled', () => {
    const tool = getTool('speech')
    const data: ToolNodeData = {
      label: 'Speech',
      toolType: 'speech',
      config: { mode: 'stt' },
      autoRun: true,
    }
    expect(shouldSkipToolExecution(data, tool, {}).skip).toBe(false)
    expect(getTool('speech').autoRun?.canRunWithoutInput({ mode: 'stt' })).toBe(true)
    expect(getTool('speech').autoRun?.canRunWithoutInput({ mode: 'tts' })).toBe(false)
  })

  it('manifest generate tools can start without upstream input', () => {
    expect(canToolRunWithoutUpstreamInput(getTool('uuid-v4'), {})).toBe(true)
  })

  it('evaluates canRunWithoutInput helpers on curated tools', () => {
    expect(getTool('file-reader').autoRun?.canRunWithoutInput({})).toBe(true)
    expect(getTool('web-scraper').autoRun?.canRunWithoutInput({ url: 'https://x.com' })).toBe(true)
    expect(getTool('web-scraper').autoRun?.canRunWithoutInput({})).toBe(false)
    expect(getTool('speech').autoRun?.canRunWithoutInput({})).toBe(true)
    expect(getTool('text-output').autoRun?.canRunWithoutInput({})).toBe(false)
    expect(getTool('calculator').autoRun?.canRunWithoutInput({ expression: '1+1' })).toBe(true)
    expect(getTool('clipboard').autoRun?.canRunWithoutInput({ mode: 'read' })).toBe(true)
    expect(getTool('clipboard').autoRun?.canRunWithoutInput({})).toBe(true)
    expect(getTool('clipboard').autoRun?.canRunWithoutInput({ mode: 'write' })).toBe(false)
    expect(getTool('datetime').autoRun?.canRunWithoutInput({ mode: 'format-now' })).toBe(true)
    expect(getTool('datetime').autoRun?.canRunWithoutInput({})).toBe(true)
    expect(getTool('datetime').autoRun?.canRunWithoutInput({ mode: 'parse' })).toBe(false)
    expect(getTool('calculator').autoRun?.canRunWithoutInput({})).toBe(false)
    expect(resolveToolAutoRun({ label: 'Trim', toolType: 'trim-text' }, getTool('trim-text'))).toBe(
      false
    )
  })
})
