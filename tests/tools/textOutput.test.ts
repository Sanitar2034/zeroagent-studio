import { describe, it, expect } from 'vitest'
import {
  appendOutputLog,
  parseOutputLogMaxEntries,
  runTextOutputTool,
  formatOutputLogForCopy,
  DEFAULT_OUTPUT_LOG_MAX,
  trimOutputLog,
} from '../../src/tools/textOutput'

describe('textOutput', () => {
  it('runTextOutputTool passes through trimmed text', () => {
    expect(runTextOutputTool('  hello  ')).toBe('hello')
    expect(runTextOutputTool('   ')).toBe('')
  })

  it('parseOutputLogMaxEntries clamps invalid values', () => {
    expect(parseOutputLogMaxEntries()).toBe(DEFAULT_OUTPUT_LOG_MAX)
    expect(parseOutputLogMaxEntries({ maxEntries: '10' })).toBe(10)
    expect(parseOutputLogMaxEntries({ maxEntries: '9999' })).toBe(500)
    expect(parseOutputLogMaxEntries({ maxEntries: 'nope' })).toBe(DEFAULT_OUTPUT_LOG_MAX)
  })

  it('appendOutputLog prepends newest and trims to max', () => {
    const t = 1000
    let log = appendOutputLog(undefined, 'first', t, 3)
    expect(log.map((e) => e.text)).toEqual(['first'])
    log = appendOutputLog(log, 'second', t + 1, 3)
    log = appendOutputLog(log, 'third', t + 2, 3)
    log = appendOutputLog(log, 'fourth', t + 3, 3)
    expect(log.map((e) => e.text)).toEqual(['fourth', 'third', 'second'])
    expect(appendOutputLog(log, '   ', t + 4, 3)).toEqual(log)
    expect(appendOutputLog(undefined, '   ', t, 3)).toEqual([])
  })

  it('formatOutputLogForCopy orders oldest first with timestamps', () => {
    const text = formatOutputLogForCopy([
      { text: 'new', timestamp: 2000 },
      { text: 'old', timestamp: 1000 },
    ])
    expect(text).toContain('old')
    expect(text.indexOf('old')).toBeLessThan(text.indexOf('new'))
    expect(formatOutputLogForCopy([])).toBe('')
  })

  it('trimOutputLog drops oldest when over max', () => {
    const log = [
      { text: 'new', timestamp: 3 },
      { text: 'mid', timestamp: 2 },
      { text: 'old', timestamp: 1 },
    ]
    expect(trimOutputLog(log, 2).map((e) => e.text)).toEqual(['new', 'mid'])
    expect(trimOutputLog(log, 5)).toEqual(log)
    expect(trimOutputLog(undefined, 3)).toEqual([])
  })
})
