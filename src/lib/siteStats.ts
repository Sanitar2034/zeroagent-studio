import { TOOL_REGISTRY, getToolCount } from '../tools/registry'
import { MANIFEST_TOOLS } from '../tools/manifests/index'
import { EXAMPLE_WORKFLOWS } from './exampleWorkflows'
import { QUEST_IDS } from './quests/registry'

export interface SiteStats {
  /** Registered tools in the palette (excludes Chat and Agent blocks). */
  totalTools: number
  manifestPresets: number
  curatedModules: number
  browserTools: number
  cloudTools: number
  customTools: number
  /** Chat + Agent + registry tools — everything draggable from the palette. */
  paletteBuildingBlocks: number
  guidedQuests: number
  exampleWorkflows: number
}

/**
 * Live counts derived from the tool registry — single source of truth for
 * README, Guide, and marketing copy. Do not hardcode these numbers elsewhere.
 */
export function getSiteStats(): SiteStats {
  const totalTools = getToolCount()
  const manifestPresets = MANIFEST_TOOLS.length
  const curatedModules = TOOL_REGISTRY.filter((t) => !t.engine).length
  const browserTools = TOOL_REGISTRY.filter((t) => t.paletteGroup === 'browser').length
  const cloudTools = TOOL_REGISTRY.filter((t) => t.paletteGroup === 'cloud').length
  const customTools = TOOL_REGISTRY.filter((t) => t.paletteGroup === 'custom').length

  return {
    totalTools,
    manifestPresets,
    curatedModules,
    browserTools,
    cloudTools,
    customTools,
    paletteBuildingBlocks: totalTools + 2,
    guidedQuests: QUEST_IDS.length,
    exampleWorkflows: EXAMPLE_WORKFLOWS.length,
  }
}
