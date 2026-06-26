import type { ExecutionContext } from '../types'

/** Resolve upstream text for a node port, ignoring whitespace-only port maps. */
export function getNodeOutputValue(
  nodeId: string,
  context: ExecutionContext,
  sourceHandle = 'out'
): string {
  const fromTool = context.toolResults[nodeId]?.[sourceHandle]
  const fromVar = context.variables[nodeId]?.[sourceHandle]
  if (fromTool?.value?.trim()) return fromTool.value
  if (fromVar?.value?.trim()) return fromVar.value

  const map = context.toolResults[nodeId] ?? context.variables[nodeId]
  if (map?.out?.value?.trim()) return map.out.value
  if (map) {
    for (const port of Object.values(map)) {
      if (port?.value?.trim()) return port.value
    }
  }
  return context.legacyVariables?.[nodeId]?.trim() ? context.legacyVariables[nodeId]! : ''
}
