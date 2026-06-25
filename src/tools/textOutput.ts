import type { OutputLogEntry } from '../types'

export const DEFAULT_OUTPUT_LOG_MAX = 50

export function parseOutputLogMaxEntries(config?: Record<string, string>): number {
  const raw = config?.maxEntries?.trim()
  if (!raw) return DEFAULT_OUTPUT_LOG_MAX
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_OUTPUT_LOG_MAX
  return Math.min(n, 500)
}

/** Append a capture entry; newest first; trim to maxEntries. */
export function appendOutputLog(
  existing: OutputLogEntry[] | undefined,
  text: string,
  timestamp: number,
  maxEntries: number
): OutputLogEntry[] {
  const trimmed = text.trim()
  if (!trimmed) return existing ?? []

  const next: OutputLogEntry[] = [{ text: trimmed, timestamp }, ...(existing ?? [])]
  if (next.length <= maxEntries) return next
  return next.slice(0, maxEntries)
}

/** Trim existing history when maxEntries is lowered in the inspector. */
export function trimOutputLog(
  log: OutputLogEntry[] | undefined,
  maxEntries: number
): OutputLogEntry[] {
  if (!log?.length || log.length <= maxEntries) return log ?? []
  return log.slice(0, maxEntries)
}

export function runTextOutputTool(input: string): string {
  return input.trim()
}

export function formatOutputLogForCopy(log: OutputLogEntry[] | undefined): string {
  if (!log?.length) return ''
  return [...log]
    .reverse()
    .map((e) => `[${new Date(e.timestamp).toISOString()}]\n${e.text}`)
    .join('\n\n---\n\n')
}
