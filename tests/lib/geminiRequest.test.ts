import { describe, it, expect } from 'vitest'
import { geminiModelUrl, geminiRequestHeaders } from '../../src/lib/geminiRequest'

describe('geminiRequest', () => {
  it('builds model URLs without embedding the api key', () => {
    const url = geminiModelUrl('gemini-2.0-flash', 'generateContent')
    expect(url).toContain('gemini-2.0-flash:generateContent')
    expect(url).not.toContain('key=')
  })

  it('sends the api key in a header', () => {
    expect(geminiRequestHeaders('AIza_test')).toEqual({
      'Content-Type': 'application/json',
      'x-goog-api-key': 'AIza_test',
    })
  })
})
