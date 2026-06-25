import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DataInventorySection from '../../src/components/settings/DataInventorySection'

const confirm = vi.fn(async () => true)
const clearApiKeys = vi.fn(async () => undefined)
const loadSettings = vi.fn(async () => undefined)
const setKeyPersistence = vi.fn(async () => undefined)
const newWorkflow = vi.fn()
const onReplayPrivacyConsent = vi.fn()
const onReplayAgentAdvice = vi.fn()
let keyPersistence: 'local' | 'session' = 'local'

vi.mock('../../src/stores/confirmStore', () => ({
  useConfirmStore: (selector: (s: { confirm: typeof confirm }) => unknown) =>
    selector({ confirm }),
}))

vi.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      get keyPersistence() {
        return keyPersistence
      },
      clearApiKeys,
      loadSettings,
      setKeyPersistence,
    }),
}))

vi.mock('../../src/stores/workflowStore', () => ({
  useWorkflowStore: (selector: (s: { newWorkflow: typeof newWorkflow }) => unknown) =>
    selector({ newWorkflow }),
}))

vi.mock('../../src/lib/appStorage', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/appStorage')>(
    '../../src/lib/appStorage'
  )
  return {
    ...actual,
    clearAppStorageCategory: vi.fn(async (id, options) => {
      options?.resetWorkflowCanvas?.()
      if (id === 'key-preference') {
        await options?.resetKeyPersistence?.()
      }
      if (id === 'api-keys') {
        await options?.clearApiKeys?.()
      }
    }),
    clearAllAppData: vi.fn(async (options) => {
      options?.resetWorkflowCanvas?.()
      await options?.resetKeyPersistence?.()
      await options?.clearApiKeys?.()
    }),
  }
})

describe('DataInventorySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirm.mockResolvedValue(true)
    keyPersistence = 'local'
  })

  it('renders inventory rows and privacy replay link', () => {
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    expect(screen.getByText(/never on our servers/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Badge meanings/i)).toBeInTheDocument()
    expect(screen.getByText(/^API keys$/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /View startup privacy notice/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /View startup performance advice/i })).toBeInTheDocument()
  })

  it('shows session badge when keys use session storage', () => {
    keyPersistence = 'session'
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    const apiRow = screen.getByText(/^API keys$/).closest('li')
    expect(apiRow).toHaveTextContent('Closes with browser')
  })

  it('shows until-clear badge when keys use persistent storage', () => {
    keyPersistence = 'local'
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    const apiRow = screen.getByText(/^API keys$/).closest('li')
    expect(apiRow).toHaveTextContent('Until you clear')
  })

  it('clears api keys and reloads settings after confirmation', async () => {
    const { clearAppStorageCategory } = await import('../../src/lib/appStorage')
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    const apiRow = screen.getByText(/^API keys$/).closest('li')
    const apiClear = apiRow?.querySelector('button')
    expect(apiClear).toBeTruthy()
    fireEvent.click(apiClear!)
    await vi.waitFor(() => {
      expect(confirm).toHaveBeenCalled()
      expect(clearAppStorageCategory).toHaveBeenCalledWith('api-keys', expect.any(Object))
      expect(clearApiKeys).toHaveBeenCalled()
      expect(loadSettings).toHaveBeenCalled()
    })
  })

  it('reloads settings after clearing key preference', async () => {
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    const keyPrefRow = screen.getByText('Key save mode').closest('li')
    const keyPrefClear = keyPrefRow?.querySelector('button')
    expect(keyPrefClear).toBeTruthy()
    fireEvent.click(keyPrefClear!)
    await vi.waitFor(() => {
      expect(setKeyPersistence).toHaveBeenCalledWith('session')
      expect(loadSettings).toHaveBeenCalled()
    })
  })

  it('does not reload settings when clearing unrelated categories', async () => {
    const { clearAppStorageCategory } = await import('../../src/lib/appStorage')
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    const workflowRow = screen.getByText('Saved workflows').closest('li')
    const workflowClear = workflowRow?.querySelector('button')
    expect(workflowClear).toBeTruthy()
    fireEvent.click(workflowClear!)
    await vi.waitFor(() =>
      expect(clearAppStorageCategory).toHaveBeenCalledWith('workflows', expect.any(Object))
    )
    expect(loadSettings).not.toHaveBeenCalled()
  })

  it('skips clear when confirmation is declined', async () => {
    confirm.mockResolvedValueOnce(false)
    const { clearAppStorageCategory } = await import('../../src/lib/appStorage')
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    fireEvent.click(screen.getAllByRole('button', { name: /^Clear$/i })[0]!)
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled())
    expect(clearAppStorageCategory).not.toHaveBeenCalled()
  })

  it('skips clear all when confirmation is declined', async () => {
    confirm.mockResolvedValueOnce(false)
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Clear everything/i }))
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled())
    expect(newWorkflow).not.toHaveBeenCalled()
  })

  it('clears everything and replays onboarding notices', async () => {
    render(
      <DataInventorySection
        onReplayPrivacyConsent={onReplayPrivacyConsent}
        onReplayAgentAdvice={onReplayAgentAdvice}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Clear everything/i }))
    await vi.waitFor(() => {
      expect(newWorkflow).toHaveBeenCalled()
      expect(setKeyPersistence).toHaveBeenCalledWith('session')
      expect(loadSettings).toHaveBeenCalled()
    })
    fireEvent.click(screen.getByRole('button', { name: /View startup privacy notice/i }))
    expect(onReplayPrivacyConsent).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /View startup performance advice/i }))
    expect(onReplayAgentAdvice).toHaveBeenCalled()
  })
})
