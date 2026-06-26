const ALLOWED = /^[0-9+\-*/().%\s]+$/

export function safeEvaluateMath(expression: string): number {
  const trimmed = expression.trim()
  if (!trimmed) throw new Error('No expression provided')
  if (!ALLOWED.test(trimmed)) {
    throw new Error('Expression contains unsupported characters')
  }

  const fn = new Function(`"use strict"; return (${trimmed});`)
  const result = fn()

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('Expression did not produce a finite number')
  }
  return result
}

export function runCalculator(input: string, config: Record<string, string>): string {
  const expression = config.expression?.trim() || input.trim()
  return String(safeEvaluateMath(expression))
}
