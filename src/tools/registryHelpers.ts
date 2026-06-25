import type { ToolContext, ToolDefinition } from './registryTypes'
import { DEFAULT_TOOL_IO } from './registryTypes'
import type { ToolManifestEntry } from './manifests/index'
import { runStringPreset, type StringPreset } from './engines/stringRunner'
import { runEncodingPreset, type EncodingPreset } from './engines/encodingRunner'
import { runHashPreset, type HashPreset } from './engines/hashRunner'
import { runJsonPreset, type JsonPreset } from './engines/jsonRunner'
import { runListPreset, type ListPreset } from './engines/listRunner'
import { runMathPreset, type MathPreset } from './engines/mathRunner'
import { runDatePreset, type DatePreset } from './engines/dateRunner'
import { runValidatePreset, type ValidatePreset } from './engines/validateRunner'
import { runFlowPreset, type FlowPreset } from './engines/flowRunner'
import { runRegexPreset, type RegexPreset } from './engines/regexRunner'
import { runGeneratePreset, type GeneratePreset } from './engines/generateRunner'
import { runHtmlPreset, type HtmlPreset } from './engines/htmlRunner'
import { runMarkdownPreset, type MarkdownPreset } from './engines/markdownRunner'
import { runCsvPreset, type CsvPreset } from './engines/csvRunner'
import { runComparePreset, type ComparePreset } from './engines/compareRunner'
import { getPrimaryInput, singleTextOutput, type PortValue } from '../lib/ports'

async function runManifestEngine(
  entry: ToolManifestEntry,
  inputs: Record<string, import('../lib/ports').PortValue>,
  config: Record<string, string>
): Promise<string> {
  const input = getPrimaryInput(inputs)

  switch (entry.engine) {
    case 'string':
      return runStringPreset(entry.preset as StringPreset, input, config)
    case 'encoding':
      return runEncodingPreset(entry.preset as EncodingPreset, input)
    case 'hash':
      return runHashPreset(entry.preset as HashPreset, input)
    case 'json':
      return runJsonPreset(entry.preset as JsonPreset, input, config)
    case 'list':
      return runListPreset(entry.preset as ListPreset, input, config)
    case 'math':
      return runMathPreset(entry.preset as MathPreset, input, config)
    case 'date':
      return runDatePreset(entry.preset as DatePreset, input, config)
    case 'validate':
      return runValidatePreset(entry.preset as ValidatePreset, input, config)
    case 'flow':
      return runFlowPreset(entry.preset as FlowPreset, input, config)
    case 'regex':
      return runRegexPreset(entry.preset as RegexPreset, input, config)
    case 'generate':
      return runGeneratePreset(entry.preset as GeneratePreset, input, config)
    case 'html':
      return runHtmlPreset(entry.preset as HtmlPreset, input, config)
    case 'markdown':
      return runMarkdownPreset(entry.preset as MarkdownPreset, input, config)
    case 'csv':
      return runCsvPreset(entry.preset as CsvPreset, input, config)
    case 'compare':
      return runComparePreset(entry.preset as ComparePreset, input, config)
    default:
      return input
  }
}

export function manifestToToolDefinition(entry: ToolManifestEntry): ToolDefinition {
  const io = {
    inputs: entry.inputs ?? DEFAULT_TOOL_IO.inputs,
    outputs: entry.outputs ?? DEFAULT_TOOL_IO.outputs,
  }

  return {
    id: entry.id,
    label: entry.label,
    description: entry.description,
    icon: entry.icon,
    paletteGroup: entry.paletteGroup,
    browserSubcategory: entry.browserSubcategory,
    paletteDragType: `tool-${entry.id}`,
    requirement: entry.requirement ?? { kind: 'none' },
    engine: entry.engine,
    ...io,
    run: async (inputs, config) => {
      const result = await runManifestEngine(entry, inputs, config)
      return singleTextOutput(result)
    },
  }
}

export function manifestToToolDefinitions(entries: ToolManifestEntry[]): ToolDefinition[] {
  return entries.map(manifestToToolDefinition)
}

export function getPrimaryOutputValue(outputs: Record<string, PortValue>): string {
  return outputs.out?.value ?? Object.values(outputs)[0]?.value ?? ''
}

export async function runToolForPreview(
  tool: ToolDefinition,
  sampleInput: string,
  config: Record<string, string>,
  ctx: ToolContext
): Promise<string> {
  const outputs = await tool.run(
    { in: { type: 'text', value: sampleInput } },
    config,
    ctx
  )
  return getPrimaryOutputValue(outputs)
}
