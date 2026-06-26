import { describe, it, expect } from 'vitest'
import { getManifestConfigFields } from '../../src/lib/manifestConfigFields'

describe('manifestConfigFields', () => {
  it('returns fields for tools that need config', () => {
    expect(getManifestConfigFields('json-get-path')[0]?.key).toBe('path')
    expect(getManifestConfigFields('join-lines')[0]?.key).toBe('separator')
    expect(getManifestConfigFields('matches-regex')).toHaveLength(2)
    expect(getManifestConfigFields('math-eval')[0]?.key).toBe('expression')
  })

  it('returns empty for simple presets', () => {
    expect(getManifestConfigFields('trim-text')).toEqual([])
    expect(getManifestConfigFields('base64-encode')).toEqual([])
  })
})
