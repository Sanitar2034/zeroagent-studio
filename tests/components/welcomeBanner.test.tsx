import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WelcomeBanner from '../../src/components/onboarding/WelcomeBanner'
import { useWorkflowStore } from '../../src/stores/workflowStore'

const onDismiss = vi.fn()

vi.mock('../../src/lib/appRoute', () => ({
  navigateTo: vi.fn(),
}))

vi.mock('../../src/lib/startQuestWithGuard', () => ({
  startQuestWithGuard: vi.fn(),
}))

vi.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector: (s: { openSettings: () => void; apiKeys: Record<string, string> }) => unknown) =>
      selector({ openSettings: vi.fn(), apiKeys: {} }),
    { getState: () => ({ apiKeys: {} }) }
  ),
}))

describe('WelcomeBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWorkflowStore.getState().newWorkflow()
  })

  it('renders basics quest cards and advanced hint', () => {
    render(<WelcomeBanner onDismiss={onDismiss} />)
    expect(screen.getByText(/Recommended:/i)).toBeInTheDocument()
    expect(screen.getByText(/no local model download/i)).toBeInTheDocument()
    expect(screen.getByText(/Transformers\.js/i)).toBeInTheDocument()
    expect(screen.getByText(/Snack Investigator/i)).toBeInTheDocument()
    expect(screen.getByText(/Pipeline Apprentice/i)).toBeInTheDocument()
    expect(screen.getByText(/Encoding Chain/i)).toBeInTheDocument()
    expect(screen.getByText(/Parallel Context/i)).toBeInTheDocument()
    expect(screen.getByText(/\+4 more in header/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Capture Desk/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Try Hello, Agent/i })).toBeInTheDocument()
  })

  it('starts quests via startQuestWithGuard', async () => {
    const { startQuestWithGuard } = await import('../../src/lib/startQuestWithGuard')
    render(<WelcomeBanner onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText(/Pipeline Apprentice/i))
    expect(onDismiss).toHaveBeenCalled()
    expect(startQuestWithGuard).toHaveBeenCalledWith('pipeline')
  })

  it('dismisses from close control', () => {
    render(<WelcomeBanner onDismiss={onDismiss} />)
    fireEvent.click(screen.getByLabelText(/Dismiss welcome/i))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('loads hello agent example and dismisses', () => {
    render(<WelcomeBanner onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /Try Hello, Agent/i }))
    expect(useWorkflowStore.getState().nodes).toHaveLength(2)
    expect(useWorkflowStore.getState().workflowName).toContain('Hello, Agent')
    expect(onDismiss).toHaveBeenCalled()
  })
})
