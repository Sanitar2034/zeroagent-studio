import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

describe('extract-changelog-section.mjs', () => {
  it('extracts the 0.1.0 section', () => {
    const out = execSync('node scripts/extract-changelog-section.mjs 0.1.0 --stdout', {
      encoding: 'utf8',
    })
    expect(out).toContain('203 chainable tools')
    expect(out).toContain('First public open-source release')
    const changelog = readFileSync('CHANGELOG.md', 'utf8')
    expect(changelog).toContain('## [0.1.0]')
  })
})
