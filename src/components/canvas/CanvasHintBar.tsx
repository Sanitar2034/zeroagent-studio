import { useEffect, useState } from 'react'
import {
  APP_STORAGE_CLEARED_EVENT,
  CANVAS_HINT_DISMISSED_KEY,
  EXAMPLE_TRY_PROMPT_HINT_KEY,
  EXAMPLE_LOADED_EVENT,
} from '../../lib/appStorage'

function readExampleHintFlag(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(EXAMPLE_TRY_PROMPT_HINT_KEY) === '1'
}

export default function CanvasHintBar({ hidden = false }: { hidden?: boolean }) {
  const [generalDismissed, setGeneralDismissed] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(CANVAS_HINT_DISMISSED_KEY) === '1'
  })
  const [exampleHint, setExampleHint] = useState(readExampleHintFlag)

  useEffect(() => {
    const onStorageCleared = (event: Event) => {
      const detail = (event as CustomEvent<{ categories: string[] }>).detail
      if (detail.categories.includes('ui-preferences')) {
        setGeneralDismissed(false)
      }
    }
    window.addEventListener(APP_STORAGE_CLEARED_EVENT, onStorageCleared)
    return () => window.removeEventListener(APP_STORAGE_CLEARED_EVENT, onStorageCleared)
  }, [])

  useEffect(() => {
    const onExampleLoaded = () => setExampleHint(readExampleHintFlag())
    window.addEventListener(EXAMPLE_LOADED_EVENT, onExampleLoaded)
    return () => window.removeEventListener(EXAMPLE_LOADED_EVENT, onExampleLoaded)
  }, [])

  if (hidden) return null
  if (generalDismissed && !exampleHint) return null

  const dismiss = () => {
    if (exampleHint) {
      sessionStorage.removeItem(EXAMPLE_TRY_PROMPT_HINT_KEY)
      setExampleHint(false)
      return
    }
    setGeneralDismissed(true)
    localStorage.setItem(CANVAS_HINT_DISMISSED_KEY, '1')
  }

  return (
    <div className="canvas-hint-bar">
      <span>
        {exampleHint
          ? 'Try the pre-filled prompt in Chat and press Send.'
          : 'Click to select · Del to remove · Drag colored ports to connect compatible types'}
      </span>
      <button type="button" className="canvas-hint-dismiss" aria-label="Dismiss hint" onClick={dismiss}>
        ✕
      </button>
    </div>
  )
}
