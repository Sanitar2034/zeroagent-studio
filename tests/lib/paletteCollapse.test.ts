import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  paletteSectionId,
  paletteSectionDomId,
  readPaletteCollapsedSections,
  writePaletteCollapsedSections,
  togglePaletteCollapsedSection,
  getPaletteSectionsForTool,
  getPaletteRevealSectionsForHighlights,
  resolvePaletteCollapsedSections,
  isPaletteSectionCollapsed,
  PALETTE_COLLAPSED_STORAGE_KEY,
} from '../../src/lib/paletteCollapse'
import type { ToolDefinition } from '../../src/tools/registryTypes'

const sampleTool = (patch: Partial<ToolDefinition>): ToolDefinition =>
  ({
    id: 'trim-text',
    label: 'Trim',
    description: 'Trim text',
    icon: '✂️',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-trim-text',
    inputs: [],
    outputs: [],
    requirement: { kind: 'none' },
    ...patch,
  }) as ToolDefinition

describe('paletteCollapse', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds stable section ids', () => {
    expect(paletteSectionId('group', 'browser')).toBe('group:browser')
    expect(paletteSectionDomId('sub:text')).toBe('palette-section-sub-text')
  })

  it('reads empty storage as an empty set', () => {
    expect(localStorage.getItem(PALETTE_COLLAPSED_STORAGE_KEY)).toBeNull()
    expect(readPaletteCollapsedSections()).toEqual(new Set())
  })

  it('persists collapsed sections', () => {
    writePaletteCollapsedSections(new Set(['group:cloud']))
    expect(readPaletteCollapsedSections()).toEqual(new Set(['group:cloud']))
    expect(localStorage.getItem(PALETTE_COLLAPSED_STORAGE_KEY)).toBe(JSON.stringify(['group:cloud']))
  })

  it('ignores corrupt storage', () => {
    localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, '{not json')
    expect(readPaletteCollapsedSections()).toEqual(new Set())
  })

  it('ignores non-array storage payloads', () => {
    localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, '{"collapsed":true}')
    expect(readPaletteCollapsedSections()).toEqual(new Set())
  })

  it('filters non-string entries from storage', () => {
    localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, JSON.stringify(['group:browser', 1, null]))
    expect(readPaletteCollapsedSections()).toEqual(new Set(['group:browser']))
  })

  it('swallows localStorage write failures', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writePaletteCollapsedSections(new Set(['group:custom']))).not.toThrow()
    spy.mockRestore()
  })

  it('toggles collapsed sections', () => {
    const next = togglePaletteCollapsedSection(new Set(), paletteSectionId('sub', 'json'))
    expect(next).toEqual(new Set(['sub:json']))
    expect(togglePaletteCollapsedSection(next, paletteSectionId('sub', 'json'))).toEqual(new Set())
  })

  it('maps tools to group and browser sub sections', () => {
    expect(getPaletteSectionsForTool(sampleTool({ paletteGroup: 'cloud' }))).toEqual(['group:cloud'])
    expect(getPaletteSectionsForTool(sampleTool({ browserSubcategory: 'json' }))).toEqual([
      'group:browser',
      'sub:json',
    ])
    expect(
      getPaletteSectionsForTool(sampleTool({ browserSubcategory: undefined as never }))
    ).toEqual(['group:browser', 'sub:curated'])
  })

  it('returns no reveal sections without highlights', () => {
    expect(getPaletteRevealSectionsForHighlights([], undefined)).toEqual(new Set())
    expect(getPaletteRevealSectionsForHighlights([], [])).toEqual(new Set())
  })

  it('reveals sections for palette highlights', () => {
    const tools = [
      sampleTool({ paletteDragType: 'tool-trim-text', browserSubcategory: 'text' }),
      sampleTool({ id: 'datetime', paletteDragType: 'tool-datetime', browserSubcategory: 'date' }),
    ]
    const reveal = getPaletteRevealSectionsForHighlights(tools, ['tool-trim-text'])
    expect(reveal).toEqual(new Set(['group:browser', 'sub:text']))
  })

  it('resolves effective collapsed state with reveal overrides', () => {
    const stored = new Set(['group:browser', 'sub:text'])
    const effective = resolvePaletteCollapsedSections(stored, {
      accordionsEnabled: true,
      revealSections: new Set(['sub:text']),
    })
    expect(isPaletteSectionCollapsed('group:browser', effective)).toBe(true)
    expect(isPaletteSectionCollapsed('sub:text', effective)).toBe(false)
  })

  it('disables collapse while search is active', () => {
    const stored = new Set(['group:browser'])
    const effective = resolvePaletteCollapsedSections(stored, { accordionsEnabled: false })
    expect(isPaletteSectionCollapsed('group:browser', effective)).toBe(false)
  })

  it('keeps stored collapse state when nothing is revealed', () => {
    const stored = new Set(['group:custom'])
    const effective = resolvePaletteCollapsedSections(stored, { accordionsEnabled: true })
    expect(isPaletteSectionCollapsed('group:custom', effective)).toBe(true)
  })
})
