export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    throw new Error('Vectors must be non-empty and the same length')
  }

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0
  return dot / denom
}

export function summarizeVector(values: number[], preview = 8): string {
  const head = values.slice(0, preview).map((v) => v.toFixed(4)).join(', ')
  const suffix = values.length > preview ? ` … (${values.length} dims)` : ` (${values.length} dims)`
  return `[${head}${suffix}]`
}
