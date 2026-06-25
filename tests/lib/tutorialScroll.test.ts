import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  findTutorialTargetElement,
  scheduleTutorialTargetScroll,
  scrollTutorialTargetIntoView,
} from '../../src/lib/tutorialScroll'
import { fitWorkflowView, focusFlowNode, setFlowCanvasInstance } from '../../src/lib/flowCanvasRegistry'

vi.mock('../../src/lib/flowCanvasRegistry', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/flowCanvasRegistry')>(
    '../../src/lib/flowCanvasRegistry'
  )
  return {
    ...actual,
    fitWorkflowView: vi.fn(),
    focusFlowNode: vi.fn(),
  }
})

const mockedFitWorkflowView = vi.mocked(fitWorkflowView)
const mockedFocusFlowNode = vi.mocked(focusFlowNode)

describe('tutorialScroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setFlowCanvasInstance(null)
  })

  it('finds tutorial targets by data attribute', () => {
    const el = document.createElement('div')
    el.dataset.tutorialTarget = 'palette-chat'
    document.body.appendChild(el)
    expect(findTutorialTargetElement('palette-chat')).toBe(el)
    expect(findTutorialTargetElement('missing')).toBeNull()
  })

  it('scrolls canvas via fitWorkflowView', () => {
    scrollTutorialTargetIntoView('canvas')
    expect(mockedFitWorkflowView).toHaveBeenCalled()
  })

  it('scrolls palette targets into view', () => {
    const el = document.createElement('div')
    el.dataset.tutorialTarget = 'palette-scraper'
    el.scrollIntoView = vi.fn()
    document.body.appendChild(el)

    scrollTutorialTargetIntoView('palette-scraper')

    expect(el.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'center' })
    )
  })

  it('focuses flow nodes for chat targets', () => {
    const node = document.createElement('div')
    node.className = 'react-flow__node'
    node.setAttribute('data-id', 'chat-1')
    const input = document.createElement('textarea')
    input.dataset.tutorialTarget = 'chat-input'
    node.appendChild(input)
    document.body.appendChild(node)
    input.scrollIntoView = vi.fn()

    scrollTutorialTargetIntoView('chat-input')

    expect(mockedFocusFlowNode).toHaveBeenCalledWith('chat-1', expect.any(Object))
    expect(input.scrollIntoView).toHaveBeenCalled()
  })

  it('schedules retries and cancels them', () => {
    vi.useFakeTimers()
    const el = document.createElement('div')
    el.dataset.tutorialTarget = 'palette-agent'
    const scrollIntoView = vi.fn()
    el.scrollIntoView = scrollIntoView
    document.body.appendChild(el)

    const cancel = scheduleTutorialTargetScroll('palette-agent', true)
    vi.runAllTimers()
    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(1)

    scrollIntoView.mockClear()
    cancel()
    vi.runAllTimers()
    expect(scrollIntoView).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('no-ops when tutorial is inactive', () => {
    const cancel = scheduleTutorialTargetScroll('palette-chat', false)
    expect(cancel).toBeTypeOf('function')
    cancel()
  })

  it('honors prefers-reduced-motion for scroll behavior', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const el = document.createElement('div')
    el.dataset.tutorialTarget = 'palette-chat'
    const scrollIntoView = vi.fn()
    el.scrollIntoView = scrollIntoView
    document.body.appendChild(el)

    scrollTutorialTargetIntoView('palette-chat')

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    )
    expect(mockedFocusFlowNode).not.toHaveBeenCalled()
  })

  it('uses instant flow focus when reduced motion is enabled on canvas nodes', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const node = document.createElement('div')
    node.className = 'react-flow__node'
    node.setAttribute('data-id', 'chat-1')
    const input = document.createElement('textarea')
    input.dataset.tutorialTarget = 'chat-input'
    node.appendChild(input)
    document.body.appendChild(node)
    input.scrollIntoView = vi.fn()

    scrollTutorialTargetIntoView('chat-input')

    expect(mockedFocusFlowNode).toHaveBeenCalledWith('chat-1', {
      padding: 0.4,
      duration: 0,
    })
  })

  it('uses instant canvas fit when reduced motion is enabled', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    scrollTutorialTargetIntoView('canvas')
    expect(mockedFitWorkflowView).toHaveBeenCalledWith({ padding: 0.2, duration: 0 })
  })

  it('returns early when the target element is missing', () => {
    expect(() => scrollTutorialTargetIntoView('palette-missing')).not.toThrow()
  })

  it('no-ops when document is unavailable', () => {
    const doc = globalThis.document
    Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
    expect(findTutorialTargetElement('palette-chat')).toBeNull()
    expect(() => scrollTutorialTargetIntoView('canvas')).not.toThrow()
    Object.defineProperty(globalThis, 'document', { value: doc, configurable: true })
  })
})
