import { GEMINI_MODELS } from '../engines/gemini'
import { geminiModelUrl, geminiRequestHeaders } from '../lib/geminiRequest'

const MAX_INLINE_BYTES = 20 * 1024 * 1024
const VISION_MODEL = GEMINI_MODELS[0]

export async function pickImageFile(): Promise<{ file: File; base64: string; mimeType: string }> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'

  return new Promise((resolve, reject) => {
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No image selected'))
        return
      }
      if (file.size > MAX_INLINE_BYTES) {
        reject(new Error('Image exceeds Gemini 20MB inline limit'))
        return
      }
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      resolve({
        file,
        base64: btoa(binary),
        mimeType: file.type || 'image/jpeg',
      })
    }
    input.click()
  })
}

export async function describeImageWithGemini(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  mimeType: string,
  model = VISION_MODEL
): Promise<string> {
  const response = await fetch(geminiModelUrl(model, 'generateContent'), {
    method: 'POST',
    headers: geminiRequestHeaders(apiKey),
    body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt || 'Describe this image in detail.' },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini vision error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.map((p: { text?: string }) => p.text ?? '').join('').trim()
}

export async function runGeminiVision(
  apiKey: string,
  input: string,
  config: Record<string, string>
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Add a Gemini API key in Settings to use vision')
  }

  const { file, base64, mimeType } = await pickImageFile()
  const prompt = input.trim() || config.prompt?.trim() || 'Describe this image.'
  const description = await describeImageWithGemini(apiKey, prompt, base64, mimeType)
  return `Image: ${file.name}\n\n${description}`
}
