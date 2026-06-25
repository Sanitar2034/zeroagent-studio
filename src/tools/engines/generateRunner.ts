export type GeneratePreset =
  | 'uuid-v4'
  | 'random-int'
  | 'random-string'
  | 'random-hex'
  | 'timestamp-id'
  | 'nonce'
  | 'pick-line'
  | 'lorem'

const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ')

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function runGeneratePreset(preset: GeneratePreset, input: string, config: Record<string, string>): string {
  switch (preset) {
    case 'uuid-v4':
      return crypto.randomUUID()
    case 'random-int': {
      const min = Number(config.min ?? 0)
      const max = Number(config.max ?? 100)
      return String(randomInt(min, max))
    }
    case 'random-string': {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const len = Math.min(Math.max(1, Number(config.length ?? 12)), 256)
      return Array.from({ length: len }, () => chars[randomInt(0, chars.length - 1)]).join('')
    }
    case 'random-hex': {
      const bytes = Math.min(Math.max(1, Number(config.bytes ?? 8)), 64)
      const arr = new Uint8Array(bytes)
      crypto.getRandomValues(arr)
      return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    case 'timestamp-id':
      return `${Date.now()}-${randomInt(1000, 9999)}`
    case 'nonce':
      return runGeneratePreset('random-hex', '', { bytes: '16' })
    case 'pick-line': {
      const arr = input.split('\n').filter(Boolean)
      if (arr.length === 0) return ''
      return arr[randomInt(0, arr.length - 1)]!
    }
    case 'lorem': {
      const count = Math.min(Math.max(1, Number(config.words ?? 20)), 200)
      const words: string[] = []
      for (let i = 0; i < count; i++) {
        words.push(LOREM[i % LOREM.length]!)
      }
      return words.join(' ')
    }
    default:
      return crypto.randomUUID()
  }
}
