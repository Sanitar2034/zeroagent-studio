import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HeaderQuestMenu from '../../src/components/header/HeaderQuestMenu'
import { useTutorialStore } from '../../src/stores/tutorialStore'
import * as startQuestModule from '../../src/lib/startQuestWithGuard'

vi.mock('../../src/lib/startQuestWithGuard', () => ({
  startQuestWithGuard: vi.fn(async () => {}),
}))

describe('HeaderQuestMenu', () => {
  beforeEach(() => {
    useTutorialStore.setState({ active: false, questId: 'snack', stepIndex: 0 })
    vi.mocked(startQuestModule.startQuestWithGuard).mockClear()
  })

  it('opens menu and starts a quest', () => {
    render(<HeaderQuestMenu />)

    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: /Pipeline Apprentice/i }))
    expect(startQuestModule.startQuestWithGuard).toHaveBeenCalledWith('pipeline')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on outside click and Escape', () => {
    render(<HeaderQuestMenu />)
    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('respects disabled state', () => {
    render(<HeaderQuestMenu disabled />)
    expect(screen.getByRole('button', { name: /Quests/i })).toBeDisabled()
  })

  it('starts snack and encoding quests', () => {
    render(<HeaderQuestMenu />)
    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Snack Investigator/i }))
    expect(startQuestModule.startQuestWithGuard).toHaveBeenCalledWith('snack')

    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Encoding Chain/i }))
    expect(startQuestModule.startQuestWithGuard).toHaveBeenCalledWith('encoding')
  })

  it('starts advanced capture desk quest', () => {
    render(<HeaderQuestMenu />)
    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Capture Desk/i }))
    expect(startQuestModule.startQuestWithGuard).toHaveBeenCalledWith('capture-desk')
  })

  it('keeps menu open when clicking inside the dropdown', () => {
    render(<HeaderQuestMenu />)
    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    fireEvent.mouseDown(screen.getByRole('menu'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('ignores non-Escape keys while open', () => {
    render(<HeaderQuestMenu />)
    fireEvent.click(screen.getByRole('button', { name: /Quests/i }))
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })
})
