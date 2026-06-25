export function geminiModelUrl(model: string, action: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}`
}

export function geminiRequestHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  }
}
