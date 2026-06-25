import { describe, it, expect } from 'vitest'
import {
  EXAMPLE_WORKFLOWS,
  EXAMPLE_CATEGORY_ORDER,
  EXAMPLE_CATEGORY_LABELS,
  groupExampleWorkflows,
  getExampleKeyBadgeLabel,
  getExampleWorkflowMeta,
  sortExampleWorkflows,
} from '../../src/lib/exampleWorkflows'

describe('exampleWorkflowMeta', () => {
  it('defines metadata for every example', () => {
    for (const example of EXAMPLE_WORKFLOWS) {
      expect(example.flow.length).toBeGreaterThan(0)
      expect(EXAMPLE_CATEGORY_ORDER).toContain(example.category)
      expect(EXAMPLE_CATEGORY_LABELS[example.category]).toBeTruthy()
      expect(['easy', 'medium', 'advanced']).toContain(example.difficulty)
    }
  })

  it('sorts featured examples first, then by category and difficulty', () => {
    const sorted = sortExampleWorkflows([...EXAMPLE_WORKFLOWS].reverse())
    expect(sorted[0]?.featured).toBe(true)
    expect(sorted.filter((item) => item.featured).length).toBeGreaterThanOrEqual(3)
  })

  it('groups examples into featured and category sections without duplicates', () => {
    const groups = groupExampleWorkflows()
    const ids = groups.flatMap((group) => group.items.map((item) => item.id))
    expect(ids).toHaveLength(EXAMPLE_WORKFLOWS.length)
    expect(new Set(ids).size).toBe(EXAMPLE_WORKFLOWS.length)
    expect(groups[0]?.kind).toBe('featured')
  })

  it('omits featured section when no examples are featured', () => {
    const groups = groupExampleWorkflows(
      EXAMPLE_WORKFLOWS.map((item) => ({ ...item, featured: false }))
    )
    expect(groups.every((group) => group.kind === 'category')).toBe(true)
    expect(groups.some((group) => group.label === 'Featured')).toBe(false)
  })

  it('skips empty categories when grouping a narrow workflow list', () => {
    const groups = groupExampleWorkflows([
      {
        id: 'quick-start',
        name: 'Hello, Agent',
        description: 'Test',
        flow: 'Chat → Agent',
        category: 'starter',
        difficulty: 'easy',
      },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.kind).toBe('category')
    expect(groups[0]?.label).toBe('Starter')
  })

  it('returns key badge labels for power examples only', () => {
    expect(getExampleKeyBadgeLabel('gemini')).toBe('Gemini key')
    expect(getExampleKeyBadgeLabel('groq')).toBe('Groq key')
    expect(getExampleKeyBadgeLabel('openrouter')).toBe('API key')
    expect(getExampleKeyBadgeLabel(undefined)).toBeNull()
  })

  it('looks up example metadata by id', () => {
    const meta = getExampleWorkflowMeta('snack-verdict')
    expect(meta?.name).toBe('Snack verdict')
    expect(meta?.tryPrompt).toContain('healthy snack')
  })
})
