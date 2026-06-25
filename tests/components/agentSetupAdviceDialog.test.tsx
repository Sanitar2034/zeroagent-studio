import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AgentSetupAdviceDialog from '../../src/components/privacy/AgentSetupAdviceDialog'

describe('AgentSetupAdviceDialog', () => {
  it('renders WebLLM warning, links, and actions', () => {
    render(<AgentSetupAdviceDialog onAccept={vi.fn()} onOpenSettings={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Want fast Agent results/i)).toBeInTheDocument()
    expect(screen.getByText(/not using WebLLM for Agent blocks/i)).toBeInTheDocument()
    expect(screen.getByText(/snappy multi-step workflows/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /openrouter\.ai\/keys/i })).toHaveAttribute(
      'href',
      'https://openrouter.ai/keys'
    )
    expect(screen.getByRole('link', { name: /^console\.groq\.com$/i })).toHaveAttribute(
      'href',
      'https://console.groq.com'
    )
    expect(screen.getByRole('link', { name: /^aistudio\.google\.com$/i })).toHaveAttribute(
      'href',
      'https://aistudio.google.com/apikey'
    )
    expect(screen.getByRole('button', { name: /Got it/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open Privacy & keys/i })).toBeInTheDocument()
    expect(screen.getByText(/Forget when I close the browser/i)).toBeInTheDocument()
  })

  it('calls onAccept when Got it is clicked', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    render(<AgentSetupAdviceDialog onAccept={onAccept} onOpenSettings={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Got it/i }))
    expect(onAccept).toHaveBeenCalled()
  })

  it('calls onOpenSettings from secondary action', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()
    render(<AgentSetupAdviceDialog onAccept={vi.fn()} onOpenSettings={onOpenSettings} />)
    await user.click(screen.getByRole('button', { name: /Open Privacy & keys/i }))
    expect(onOpenSettings).toHaveBeenCalled()
  })
})
