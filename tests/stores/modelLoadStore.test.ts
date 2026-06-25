import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useModelLoadStore, createModelLoadCallback } from '../../src/stores/modelLoadStore'

describe('modelLoadStore — download progress on slow connections', () => {
  beforeEach(() => {
    useModelLoadStore.getState().reset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tracks WebLLM download progress', () => {
    const cb = createModelLoadCallback('WebLLM')
    cb({ text: 'Fetching weights...', progress: 0.5 })
    expect(useModelLoadStore.getState().isLoading).toBe(true)
    expect(useModelLoadStore.getState().progress).toBe(0.5)
  })

  it('auto-resets banner after model fully loaded', () => {
    const cb = createModelLoadCallback('Transformers.js')
    cb({ text: 'Done', progress: 1 })
    vi.advanceTimersByTime(1500)
    expect(useModelLoadStore.getState().isLoading).toBe(false)
  })

  it('manual reset clears state', () => {
    useModelLoadStore.getState().setLoading(true, 'WebLLM')
    useModelLoadStore.getState().reset()
    expect(useModelLoadStore.getState().engineName).toBe('')
  })
})
