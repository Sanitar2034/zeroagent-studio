/** Tutorial spotlight targets that are not palette-prefixed or inspector-prefixed. */
const STATIC_TUTORIAL_TARGETS = new Set([
  'canvas',
  'workflow-name',
  'chat-input',
  'chat-send',
  'palette',
])

export function isKnownTutorialTarget(target: string): boolean {
  if (STATIC_TUTORIAL_TARGETS.has(target)) return true
  if (target.startsWith('palette-')) return true
  if (target.startsWith('inspector-')) return true
  return false
}
