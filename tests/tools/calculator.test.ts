import { describe, it, expect } from 'vitest'
import { runCalculator, safeEvaluateMath } from '../../src/tools/calculator'

describe('calculator tool', () => {
  it('evaluates safe math expressions', () => {
    expect(safeEvaluateMath('(2 + 3) * 4')).toBe(20)
    expect(runCalculator('', { expression: '10 / 2' })).toBe('5')
  })

  it('rejects unsafe characters', () => {
    expect(() => safeEvaluateMath('alert(1)')).toThrow(/unsupported/)
  })

  it('rejects non-finite results', () => {
    expect(() => safeEvaluateMath('1/0')).toThrow(/finite number/)
  })
})
