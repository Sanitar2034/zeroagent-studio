import { describe, it, expect, beforeEach } from 'vitest'
import { useConfirmStore } from '../../src/stores/confirmStore'

describe('confirmStore', () => {
  beforeEach(() => {
    useConfirmStore.setState({ pending: null })
  })

  it('resolves confirm with true or false', async () => {
    const promise = useConfirmStore.getState().confirm({
      title: 'Test',
      message: 'Sure?',
    })
    expect(useConfirmStore.getState().pending?.title).toBe('Test')
    useConfirmStore.getState().respond(true)
    await expect(promise).resolves.toBe(true)
  })

  it('alert resolves on OK', async () => {
    const promise = useConfirmStore.getState().alert({
      title: 'Oops',
      message: 'Bad file',
    })
    expect(useConfirmStore.getState().pending?.alertOnly).toBe(true)
    useConfirmStore.getState().respond(true)
    await expect(promise).resolves.toBeUndefined()
  })

  it('ignores respond when nothing is pending', () => {
    useConfirmStore.getState().respond(true)
    expect(useConfirmStore.getState().pending).toBeNull()
  })
})
