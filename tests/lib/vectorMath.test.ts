import { describe, it, expect } from 'vitest'
import { cosineSimilarity, summarizeVector } from '../../src/lib/vectorMath'

describe('vectorMath', () => {
  it('computes cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('throws on mismatched vectors', () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow()
    expect(() => cosineSimilarity([], [1])).toThrow()
  })

  it('returns zero when a vector has zero magnitude', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })

  it('summarizes vectors for display', () => {
    const summary = summarizeVector([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], 3)
    expect(summary).toContain('…')
    expect(summarizeVector([1, 2])).toContain('2 dims')
  })
})
