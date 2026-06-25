import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CanvasEmptyState from '../../src/components/canvas/CanvasEmptyState'
import { useWorkflowStore } from '../../src/stores/workflowStore'
import { useTutorialStore } from '../../src/stores/tutorialStore'
import { makeChat } from '../helpers/graphBuilders'

vi.mock('../../src/lib/appRoute', () => ({
  navigateTo: vi.fn(),
}))

vi.mock('../../src/lib/tutorialQuests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/tutorialQuests')>()
  return {
    ...actual,
    getQuestCatalog: vi.fn(() => [
      {
        id: 'snack',
        shortLabel: 'Snack Investigator',
        step: '1',
        title: 'Snack',
        flow: 'Chat → Scraper → Agent',
        description: 'Quest',
        featured: true,
      },
    ]),
  }
})

import { navigateTo } from '../../src/lib/appRoute'
import { getQuestCatalog } from '../../src/lib/tutorialQuests'

vi.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector: (s: { apiKeys: Record<string, string> }) => unknown) =>
      selector({ apiKeys: {} }),
    { getState: () => ({ apiKeys: {} }) }
  ),
}))

describe('CanvasEmptyState', () => {
  beforeEach(() => {
    useWorkflowStore.getState().newWorkflow()
    useTutorialStore.setState({ active: false, questId: 'snack', stepIndex: 0 })
  })

  it('renders when canvas is empty', () => {
    render(<CanvasEmptyState />)
    expect(screen.getByText(/Drag blocks here/i)).toBeInTheDocument()
  })

  it('hides when hidden, nodes exist, or tutorial is active', () => {
    const { rerender } = render(<CanvasEmptyState hidden />)
    expect(screen.queryByText(/Drag blocks here/i)).not.toBeInTheDocument()

    rerender(<CanvasEmptyState />)
    useWorkflowStore.getState().setNodes([makeChat('c')])
    rerender(<CanvasEmptyState />)
    expect(screen.queryByText(/Drag blocks here/i)).not.toBeInTheDocument()

    useWorkflowStore.getState().newWorkflow()
    useTutorialStore.setState({ active: true })
    rerender(<CanvasEmptyState />)
    expect(screen.queryByText(/Drag blocks here/i)).not.toBeInTheDocument()
  })

  it('starts snack quest from primary action', () => {
    const start = vi.spyOn(useTutorialStore.getState(), 'start')
    render(<CanvasEmptyState />)
    fireEvent.click(screen.getByText('Snack Investigator'))
    expect(start).toHaveBeenCalledWith({ resetCanvas: true, questId: 'snack' })
  })

  it('loads writer and editor example', () => {
    render(<CanvasEmptyState />)
    fireEvent.click(screen.getByRole('button', { name: /Writer & editor/i }))
    expect(useWorkflowStore.getState().nodes.filter((n) => n.type === 'agent')).toHaveLength(2)
  })

  it('loads hello agent example', () => {
    render(<CanvasEmptyState />)
    fireEvent.click(screen.getByRole('button', { name: 'Hello, Agent' }))
    expect(useWorkflowStore.getState().nodes).toHaveLength(2)
    expect(useWorkflowStore.getState().edges).toHaveLength(1)
    expect(useWorkflowStore.getState().workflowName).toContain('Hello, Agent')
  })

  it('falls back when snack quest is missing from catalog', () => {
    vi.mocked(getQuestCatalog).mockReturnValueOnce([])
    render(<CanvasEmptyState />)
    expect(screen.getByRole('button', { name: 'Snack Investigator' })).toBeInTheDocument()
  })

  it('opens the guide from ghost action', () => {
    render(<CanvasEmptyState />)
    fireEvent.click(screen.getByText('Read guide'))
    expect(navigateTo).toHaveBeenCalledWith('guide')
  })
})
