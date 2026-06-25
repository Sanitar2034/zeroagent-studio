export const CUSTOM_SCRIPT_MAX_BYTES = 8 * 1024
export const CUSTOM_SCRIPT_TIMEOUT_MS = 8_000

export interface CustomScriptHelpers {
  jsonParse: (text: string) => unknown
  jsonStringify: (value: unknown) => string
  trim: (text: string) => string
  regex: (pattern: string, flags?: string) => RegExp
}

export const CUSTOM_SCRIPT_HELPERS: CustomScriptHelpers = {
  jsonParse: (text) => JSON.parse(text),
  jsonStringify: (value) => JSON.stringify(value),
  trim: (text) => text.trim(),
  regex: (pattern, flags) => new RegExp(pattern, flags),
}

const WORKER_SOURCE = `
self.importScripts = () => { throw new Error('importScripts is blocked in Custom Script'); };
self.fetch = () => { throw new Error('Network is not available in Custom Script'); };
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.Worker = function() { throw new Error('Nested workers are blocked in Custom Script'); };
self.SharedWorker = function() { throw new Error('Nested workers are blocked in Custom Script'); };

self.onmessage = async (event) => {
  const { code, input, config } = event.data;
  const helpers = {
    jsonParse: (text) => JSON.parse(text),
    jsonStringify: (value) => JSON.stringify(value),
    trim: (text) => text.trim(),
    regex: (pattern, flags) => new RegExp(pattern, flags),
  };
  const blockedFetch = () => { throw new Error('Network is not available in Custom Script'); };
  const blockedImport = () => { throw new Error('Dynamic import is blocked in Custom Script'); };
  const blockedWorker = () => { throw new Error('Nested workers are blocked in Custom Script'); };
  try {
    const fn = new Function(
      'input', 'config', 'helpers', 'fetch', 'dynamicImport', 'Worker', 'SharedWorker',
      'return (async () => {\\n' + code + '\\n})()'
    );
    const result = await fn(input, config, helpers, blockedFetch, blockedImport, blockedWorker, blockedWorker);
    self.postMessage({ ok: true, result: result == null ? '' : String(result) });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
`

const FORBIDDEN_SCRIPT_PATTERN =
  /\b(import\s*\(|importScripts\s*\(|new\s+Worker\s*\(|new\s+SharedWorker\s*\()/i

export function validateCustomScript(script: string): void {
  if (!script.trim()) throw new Error('Custom script is empty')
  if (script.length > CUSTOM_SCRIPT_MAX_BYTES) {
    throw new Error(`Script exceeds ${CUSTOM_SCRIPT_MAX_BYTES} byte limit`)
  }
  if (FORBIDDEN_SCRIPT_PATTERN.test(script)) {
    throw new Error('Custom script cannot use import(), importScripts, or nested Workers')
  }
}

export function runCustomScriptInWorker(
  script: string,
  input: string,
  config: Record<string, string>
): Promise<string> {
  validateCustomScript(script)

  return new Promise((resolve, reject) => {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    const worker = new Worker(blobUrl)

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Custom script timed out'))
    }, CUSTOM_SCRIPT_TIMEOUT_MS)

    const cleanup = () => {
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(blobUrl)
    }

    worker.onmessage = (event: MessageEvent<{ ok: boolean; result?: string; error?: string }>) => {
      cleanup()
      if (event.data.ok) resolve(event.data.result ?? '')
      else reject(new Error(event.data.error ?? 'Custom script failed'))
    }

    worker.onerror = () => {
      cleanup()
      reject(new Error('Custom script worker error'))
    }

    worker.postMessage({ code: script, input, config })
  })
}

export async function runCustomScript(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const script = config.script ?? ''
  return runCustomScriptInWorker(script, input, config)
}
