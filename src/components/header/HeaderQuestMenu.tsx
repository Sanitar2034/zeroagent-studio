import { useEffect, useRef, useState } from 'react'
import { getQuestCatalog, type TutorialQuestId } from '../../lib/tutorialQuests'
import { startQuestWithGuard } from '../../lib/startQuestWithGuard'

interface HeaderQuestMenuProps {
  disabled?: boolean
}

export default function HeaderQuestMenu({ disabled }: HeaderQuestMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const quests = getQuestCatalog()
  const basics = quests.filter((q) => q.category === 'basics')
  const advanced = quests.filter((q) => q.category === 'advanced')

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const pickQuest = (questId: TutorialQuestId) => {
    setOpen(false)
    void startQuestWithGuard(questId)
  }

  const renderQuest = (q: (typeof quests)[number]) => (
    <button
      key={q.id}
      type="button"
      role="menuitem"
      className={`header-quest-option ${q.featured ? 'header-quest-option--featured' : ''}`}
      onClick={() => pickQuest(q.id)}
    >
      <span className={`header-quest-step ${q.featured ? 'header-quest-step--featured' : ''}`}>{q.step}</span>
      <span className="header-quest-option-text">
        <strong>{q.shortLabel}</strong>
        <span>{q.flow}</span>
      </span>
    </button>
  )

  return (
    <div className="header-quest-menu" ref={wrapRef}>
      <button
        type="button"
        className={`header-btn header-btn-quests game-btn-quests ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Guided walkthroughs"
      >
        Quests
        <span className="header-quest-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="header-quest-dropdown" role="menu">
          <p className="header-quest-dropdown-hint">Learn by doing — progress saves in your browser</p>
          <p className="header-quest-group-label">Basics</p>
          {basics.map(renderQuest)}
          <p className="header-quest-group-label">Advanced</p>
          {advanced.map(renderQuest)}
        </div>
      )}
    </div>
  )
}
