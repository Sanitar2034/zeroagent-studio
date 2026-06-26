import { describe, it, expect } from 'vitest'
import { mergePortInputValues, truncateForLog, toolSkipMessage, resolveUpstreamPortValue } from '../../src/lib/portMerge'
import { textPortValue, jsonPortValue } from '../../src/lib/ports'

describe('portMerge', () => {
  it('mergePortInputValues joins values and picks first type', () => {
    expect(mergePortInputValues([textPortValue('a'), textPortValue('b')])).toEqual({
      type: 'text',
      value: 'a\n\nb',
    })
    expect(mergePortInputValues([])).toEqual({ type: 'text', value: '' })
    expect(mergePortInputValues([jsonPortValue('{}')])).toEqual({ type: 'json', value: '{}' })
  })

  it('truncateForLog caps long strings', () => {
    expect(truncateForLog('short')).toBe('short')
    expect(truncateForLog('x'.repeat(250))).toHaveLength(200)
  })

  it('toolSkipMessage uses default when reason missing', () => {
    expect(toolSkipMessage('Custom')).toBe('Custom')
    expect(toolSkipMessage()).toContain('auto-run')
    expect(toolSkipMessage('')).toContain('auto-run')
  })

  it('resolveUpstreamPortValue prefers tool then variable then fallback', () => {
    const fallback = textPortValue('fb')
    const fromVar = textPortValue('var')
    const fromTool = textPortValue('tool')
    expect(resolveUpstreamPortValue(fromTool, fromVar, fallback)).toEqual(fromTool)
    expect(resolveUpstreamPortValue(undefined, fromVar, fallback)).toEqual(fromVar)
    expect(resolveUpstreamPortValue(undefined, undefined, fallback)).toEqual(fallback)
  })

  it('resolveUpstreamPortValue ignores whitespace-only ports and uses fallback', () => {
    const fallback = textPortValue('agent reply')
    expect(resolveUpstreamPortValue(textPortValue('   '), undefined, fallback)).toEqual(fallback)
    expect(resolveUpstreamPortValue(undefined, textPortValue(''), fallback)).toEqual(fallback)
  })
})
