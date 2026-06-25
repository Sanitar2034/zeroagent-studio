import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PrivacyConsentDialog from '../../src/components/privacy/PrivacyConsentDialog'

let keyPersistence: 'local' | 'session' = 'session'
let isLoaded = true

vi.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      get keyPersistence() {
        return keyPersistence
      },
      get isLoaded() {
        return isLoaded
      },
    }),
}))

describe('PrivacyConsentDialog', () => {
  beforeEach(() => {
    keyPersistence = 'session'
    isLoaded = true
  })

  it('renders storage summary and actions', () => {
    render(<PrivacyConsentDialog onAccept={vi.fn()} onOpenSettings={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Your data stays in your browser/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Badge meanings/i)).toBeInTheDocument()
    expect(screen.getByText(/^API keys$/)).toBeInTheDocument()
    expect(screen.getByText(/Default: keys close with the browser/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Got it/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open Privacy & keys/i })).toBeInTheDocument()
  })

  it('shows session retention for API keys by default', () => {
    render(<PrivacyConsentDialog onAccept={vi.fn()} onOpenSettings={vi.fn()} />)
    const apiKeysRow = screen.getByText(/^API keys$/).closest('li')
    expect(apiKeysRow).toHaveTextContent('Closes with browser')
  })

  it('shows local retention for API keys when remember mode is active', () => {
    keyPersistence = 'local'
    render(<PrivacyConsentDialog onAccept={vi.fn()} onOpenSettings={vi.fn()} />)
    const apiKeysRow = screen.getByText(/^API keys$/).closest('li')
    expect(apiKeysRow).toHaveTextContent('Until you clear')
  })

  it('uses default session badge before settings load', () => {
    isLoaded = false
    keyPersistence = 'local'
    render(<PrivacyConsentDialog onAccept={vi.fn()} onOpenSettings={vi.fn()} />)
    const apiKeysRow = screen.getByText(/^API keys$/).closest('li')
    expect(apiKeysRow).toHaveTextContent('Closes with browser')
  })

  it('calls onAccept when Got it is clicked', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    render(<PrivacyConsentDialog onAccept={onAccept} onOpenSettings={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Got it/i }))
    expect(onAccept).toHaveBeenCalled()
  })

  it('calls onOpenSettings from secondary action', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()
    render(<PrivacyConsentDialog onAccept={vi.fn()} onOpenSettings={onOpenSettings} />)
    await user.click(screen.getByRole('button', { name: /Open Privacy & keys/i }))
    expect(onOpenSettings).toHaveBeenCalled()
  })
})
