import type { ToolContext } from './registryTypes'

export function isClipboardAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.clipboard
}

export async function runClipboardTool(
  input: string,
  config: Record<string, string>,
  ctx?: ToolContext
): Promise<string> {
  if (!isClipboardAvailable()) {
    throw new Error('Clipboard API is not available in this browser')
  }

  const mode = config.mode ?? 'read'

  if (mode === 'read') {
    const text = await navigator.clipboard.readText()
    return text
  }

  if (mode === 'write') {
    const text = input.trim() || config.text?.trim()
    if (!text) throw new Error('Write mode needs upstream input or config.text')
    await navigator.clipboard.writeText(text)
    ctx?.log('info', `Copied ${text.length} characters to clipboard`)
    return text
  }

  throw new Error(`Unknown clipboard mode: ${mode}`)
}
