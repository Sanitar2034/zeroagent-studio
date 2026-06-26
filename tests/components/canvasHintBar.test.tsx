import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CanvasHintBar from '../../src/components/canvas/CanvasHintBar'
import {
  CANVAS_HINT_DISMISSED_KEY,
  EXAMPLE_TRY_PROMPT_HINT_KEY,
  EXAMPLE_LOADED_EVENT,
} from '../../src/lib/appStorage'

describe('CanvasHintBar', () => {
  beforeEach(() => {
    localStorage.removeItem(CANVAS_HINT_DISMISSED_KEY)
    sessionStorage.removeItem(EXAMPLE_TRY_PROMPT_HINT_KEY)
  })

  it('renders canvas hints by default', () => {
    render(<CanvasHintBar />)
    expect(screen.getByText(/Click to select/i)).toBeInTheDocument()
  })

  it('shows example try-prompt hint when session flag is set', () => {
    sessionStorage.setItem(EXAMPLE_TRY_PROMPT_HINT_KEY, '1')
    render(<CanvasHintBar />)
    expect(screen.getByText(/pre-filled prompt/i)).toBeInTheDocument()
  })

  it('updates hint text when example loaded event fires', async () => {
    const { findByText } = render(<CanvasHintBar />)
    expect(screen.getByText(/Click to select/i)).toBeInTheDocument()
    sessionStorage.setItem(EXAMPLE_TRY_PROMPT_HINT_KEY, '1')
    window.dispatchEvent(new CustomEvent(EXAMPLE_LOADED_EVENT))
    expect(await findByText(/pre-filled prompt/i)).toBeInTheDocument()
  })

  it('shows example hint even when general canvas hints were dismissed', () => {
    localStorage.setItem(CANVAS_HINT_DISMISSED_KEY, '1')
    sessionStorage.setItem(EXAMPLE_TRY_PROMPT_HINT_KEY, '1')
    render(<CanvasHintBar />)
    expect(screen.getByText(/pre-filled prompt/i)).toBeInTheDocument()
  })

  it('dismisses only the example hint without hiding future general hints', () => {
    sessionStorage.setItem(EXAMPLE_TRY_PROMPT_HINT_KEY, '1')
    render(<CanvasHintBar />)
    fireEvent.click(screen.getByLabelText('Dismiss hint'))
    expect(sessionStorage.getItem(EXAMPLE_TRY_PROMPT_HINT_KEY)).toBeNull()
    expect(localStorage.getItem(CANVAS_HINT_DISMISSED_KEY)).toBeNull()
  })

  it('hides when hidden prop is set', () => {
    render(<CanvasHintBar hidden />)
    expect(screen.queryByText(/Click to select/i)).not.toBeInTheDocument()
  })
})
