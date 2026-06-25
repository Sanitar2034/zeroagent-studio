import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRouteFromHash, navigateTo, navigateToGuideSection } from '../../src/lib/appRoute'

describe('appRoute', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('reads guide route from hash', () => {
    window.location.hash = '#/guide'
    expect(getRouteFromHash()).toBe('guide')
    window.location.hash = '#/'
    expect(getRouteFromHash()).toBe('studio')
  })

  it('navigates to guide', () => {
    navigateTo('guide')
    expect(window.location.hash).toBe('#/guide')
  })

  it('skips hash update when already on the target route', () => {
    window.location.hash = '#/guide'
    navigateTo('guide')
    expect(window.location.hash).toBe('#/guide')
    window.location.hash = '#/'
    navigateTo('studio')
    expect(window.location.hash).toBe('#/')
  })

  it('scrolls to a guide section after navigation', () => {
    vi.useFakeTimers()
    const scrollIntoView = vi.fn()
    vi.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as unknown as HTMLElement)

    navigateToGuideSection('staying-safe')
    expect(window.location.hash).toBe('#/guide')

    vi.advanceTimersByTime(120)
    expect(document.getElementById).toHaveBeenCalledWith('staying-safe')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })

    vi.useRealTimers()
  })
})
