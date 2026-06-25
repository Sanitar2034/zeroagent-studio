import type { ToolDefinition } from '../tools/registryTypes'

export const PALETTE_COLLAPSED_STORAGE_KEY = 'zeroagent-palette-collapsed'

export type PaletteSectionKind = 'group' | 'sub'

export function paletteSectionId(kind: PaletteSectionKind, key: string): string {
  return `${kind}:${key}`
}

export function paletteSectionDomId(id: string): string {
  return `palette-section-${id.replace(/:/g, '-')}`
}

export function readPaletteCollapsedSections(): Set<string> {
  try {
    const raw = localStorage.getItem(PALETTE_COLLAPSED_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'))
    }
  } catch {
    // Ignore corrupt storage
  }
  return new Set()
}

export function writePaletteCollapsedSections(sections: Set<string>) {
  try {
    localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, JSON.stringify([...sections]))
  } catch {
    // Ignore quota errors
  }
}

export function togglePaletteCollapsedSection(sections: Set<string>, sectionId: string): Set<string> {
  const next = new Set(sections)
  if (next.has(sectionId)) {
    next.delete(sectionId)
  } else {
    next.add(sectionId)
  }
  return next
}

export function getPaletteSectionsForTool(tool: ToolDefinition): string[] {
  const sections = [paletteSectionId('group', tool.paletteGroup)]
  if (tool.paletteGroup === 'browser') {
    sections.push(paletteSectionId('sub', tool.browserSubcategory ?? 'curated'))
  }
  return sections
}

/** Sections that must stay open (e.g. tutorial highlights or active search). */
export function getPaletteRevealSectionsForHighlights(
  tools: ToolDefinition[],
  highlights: string[] | undefined
): Set<string> {
  const reveal = new Set<string>()
  if (!highlights?.length) return reveal

  const highlightSet = new Set(highlights)
  for (const tool of tools) {
    if (!highlightSet.has(tool.paletteDragType)) continue
    for (const sectionId of getPaletteSectionsForTool(tool)) {
      reveal.add(sectionId)
    }
  }
  return reveal
}

export function resolvePaletteCollapsedSections(
  stored: Set<string>,
  options: { accordionsEnabled: boolean; revealSections?: Set<string> }
): Set<string> {
  if (!options.accordionsEnabled) return new Set()

  const effective = new Set(stored)
  for (const sectionId of options.revealSections ?? []) {
    effective.delete(sectionId)
  }
  return effective
}

export function isPaletteSectionCollapsed(sectionId: string, effectiveCollapsed: Set<string>): boolean {
  return effectiveCollapsed.has(sectionId)
}
