import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppRoute } from '../../src/hooks/useAppRoute'

describe('useAppRoute', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  afterEach(() => {
    window.location.hash = ''
  })

  it('returns studio by default and updates on hashchange', () => {
    const { result } = renderHook(() => useAppRoute())
    expect(result.current).toBe('studio')

    act(() => {
      window.location.hash = '#/guide'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(result.current).toBe('guide')
  })
})
