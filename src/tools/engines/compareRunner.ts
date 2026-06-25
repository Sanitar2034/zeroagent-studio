export type ComparePreset =
  | 'equals'
  | 'contains'
  | 'starts-with'
  | 'ends-with'
  | 'line-diff-count'
  | 'similarity'

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= a.length; j++) matrix[0]![j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        // v8 ignore next -- matrix cells are always initialized before this access
        (matrix[i - 1]![j] ?? 0) + 1,
        // v8 ignore next
        (matrix[i]![j - 1] ?? 0) + 1,
        // v8 ignore next
        (matrix[i - 1]![j - 1] ?? 0) + cost
      )
    }
  }
  // v8 ignore next -- matrix dimensions guarantee this cell exists
  return matrix[b.length]![a.length] ?? 0
}

export function runComparePreset(preset: ComparePreset, input: string, config: Record<string, string>): string {
  const text = input
  const other = config.other ?? ''

  switch (preset) {
    case 'equals':
      return String(text === other)
    case 'contains':
      return String(text.includes(other))
    case 'starts-with':
      return String(text.startsWith(other))
    case 'ends-with':
      return String(text.endsWith(other))
    case 'line-diff-count': {
      const a = new Set(text.split('\n').map((l) => l.trim()).filter(Boolean))
      const b = new Set(other.split('\n').map((l) => l.trim()).filter(Boolean))
      let diff = 0
      for (const line of a) if (!b.has(line)) diff++
      for (const line of b) if (!a.has(line)) diff++
      return String(diff)
    }
    case 'similarity': {
      const maxLen = Math.max(text.length, other.length, 1)
      const dist = levenshtein(text, other)
      return String(Math.round((1 - dist / maxLen) * 100))
    }
    default:
      return 'false'
  }
}
