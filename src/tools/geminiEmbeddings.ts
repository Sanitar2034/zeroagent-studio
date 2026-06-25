import { cosineSimilarity, summarizeVector } from '../lib/vectorMath'
import { geminiModelUrl, geminiRequestHeaders } from '../lib/geminiRequest'

export const GEMINI_EMBEDDING_MODEL = 'text-embedding-004'

export async function embedTextWithGemini(apiKey: string, text: string): Promise<number[]> {
  const response = await fetch(geminiModelUrl(GEMINI_EMBEDDING_MODEL, 'embedContent'), {
    method: 'POST',
    headers: geminiRequestHeaders(apiKey),
    body: JSON.stringify({
      content: { parts: [{ text }] },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini embeddings error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const values = data.embedding?.values as number[] | undefined
  if (!values?.length) throw new Error('Gemini returned empty embedding')
  return values
}

export async function runGeminiEmbeddings(
  apiKey: string,
  input: string,
  config: Record<string, string>
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Add a Gemini API key in Settings to use embeddings')
  }

  const mode = config.mode ?? 'similarity'
  const text = input.trim()
  if (!text) throw new Error('No text provided for embedding')

  if (mode === 'embed') {
    const vector = await embedTextWithGemini(apiKey, text)
    return `Embedding ${summarizeVector(vector)}`
  }

  const reference = config.reference?.trim()
  if (!reference) throw new Error('Similarity mode requires config.reference text')

  const [a, b] = await Promise.all([
    embedTextWithGemini(apiKey, text),
    embedTextWithGemini(apiKey, reference),
  ])
  const score = cosineSimilarity(a, b)
  return `Similarity: ${score.toFixed(4)} (0 = unrelated, 1 = identical meaning)`
}
