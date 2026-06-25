import { describe, it, expect } from 'vitest'
import {
  getToolSafetyNotice,
  listToolsWithSafetyNotices,
} from '../../src/lib/toolSafety'

describe('toolSafety', () => {
  it('returns web scraper notice with network level', () => {
    const notice = getToolSafetyNotice('web-scraper')
    expect(notice).not.toBeNull()
    expect(notice?.level).toBe('network')
    expect(notice?.title).toMatch(/web fetching/i)
    expect(notice?.bullets.some((b) => /403|forbid|terms/i.test(b))).toBe(true)
  })

  it('returns generic cloud notice for unknown cloud tools', () => {
    const notice = getToolSafetyNotice('some-future-cloud-tool', 'cloud')
    expect(notice?.level).toBe('cloud')
    expect(notice?.summary).toMatch(/leaves your browser/i)
  })

  it('returns null for benign browser manifest tools', () => {
    expect(getToolSafetyNotice('base64-encode', 'browser')).toBeNull()
  })

  it('lists all curated tools with explicit notices', () => {
    const ids = listToolsWithSafetyNotices()
    expect(ids).toContain('web-scraper')
    expect(ids).toContain('custom-script')
    expect(ids.length).toBeGreaterThanOrEqual(10)
  })
})
