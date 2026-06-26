import { describe, it, expect, vi } from 'vitest'
import { readLocalFile, readFileContent } from '../../src/tools/fileReader'

vi.mock('browser-fs-access', () => ({
  fileOpen: vi.fn(),
}))

import { fileOpen } from 'browser-fs-access'

describe('fileReader — local files never leave the machine', () => {
  it('reads user-selected file via browser API', async () => {
    vi.mocked(fileOpen).mockResolvedValue({
      name: 'homework.md',
      size: 12,
      type: 'text/markdown',
      text: async () => '# Essay draft',
    } as unknown as File)

    const result = await readLocalFile()
    expect(result.name).toBe('homework.md')
    expect(result.content).toBe('# Essay draft')
    expect(result.type).toBe('text/markdown')
  })

  it('defaults type to text/plain when browser omits MIME', async () => {
    const file = new File(['data'], 'raw', { type: '' })
    const result = await readFileContent(file)
    expect(result.type).toBe('text/plain')
  })

  it('defaults type in fileOpen picker when MIME missing', async () => {
    vi.mocked(fileOpen).mockResolvedValue({
      name: 'legacy.txt',
      size: 4,
      type: '',
      text: async () => 'data',
    } as unknown as File)

    const result = await readLocalFile()
    expect(result.type).toBe('text/plain')
  })

  it('propagates user cancellation from file picker', async () => {
    vi.mocked(fileOpen).mockRejectedValue(new Error('The user aborted a request'))
    await expect(readLocalFile()).rejects.toThrow(/aborted/)
  })
})
