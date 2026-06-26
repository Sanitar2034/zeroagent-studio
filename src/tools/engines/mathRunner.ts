import { safeEvaluateMath } from '../calculator'

export type MathPreset =
  | 'eval'
  | 'round'
  | 'floor'
  | 'ceil'
  | 'abs'
  | 'sqrt'
  | 'min'
  | 'max'
  | 'percent'
  | 'mod'
  | 'clamp'
  | 'sum-lines'
  | 'avg-lines'
  | 'format-number'
  | 'parse-number'

function parseNum(input: string): number {
  const cleaned = input.trim().replace(/,/g, '')
  const num = Number(cleaned)
  if (!Number.isFinite(num)) throw new Error('Input must be a number')
  return num
}

export function runMathPreset(preset: MathPreset, input: string, config: Record<string, string>): string {
  const expr = config.expression?.trim() || input.trim()

  switch (preset) {
    case 'eval':
      return String(safeEvaluateMath(expr))
    case 'round':
      return String(Math.round(parseNum(expr)))
    case 'floor':
      return String(Math.floor(parseNum(expr)))
    case 'ceil':
      return String(Math.ceil(parseNum(expr)))
    case 'abs':
      return String(Math.abs(parseNum(expr)))
    case 'sqrt':
      return String(Math.sqrt(parseNum(expr)))
    case 'min': {
      const b = Number(config.b ?? 0)
      return String(Math.min(parseNum(expr), b))
    }
    case 'max': {
      const b = Number(config.b ?? 0)
      return String(Math.max(parseNum(expr), b))
    }
    case 'percent': {
      const pct = Number(config.percent ?? 10)
      return String((parseNum(expr) * pct) / 100)
    }
    case 'mod': {
      const b = Number(config.b ?? 1)
      return String(parseNum(expr) % b)
    }
    case 'clamp': {
      const min = Number(config.min ?? 0)
      const max = Number(config.max ?? 100)
      return String(Math.min(max, Math.max(min, parseNum(expr))))
    }
    case 'sum-lines': {
      const total = input
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .reduce((sum, line) => sum + parseNum(line), 0)
      return String(total)
    }
    case 'avg-lines': {
      const nums = input
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => parseNum(line))
      if (nums.length === 0) return '0'
      return String(nums.reduce((a, b) => a + b, 0) / nums.length)
    }
    case 'format-number': {
      const locale = config.locale ?? 'en-US'
      const digits = Number(config.fractionDigits ?? 2)
      return parseNum(expr).toLocaleString(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    }
    case 'parse-number':
      return String(parseNum(expr))
    default:
      return String(safeEvaluateMath(expr))
  }
}
