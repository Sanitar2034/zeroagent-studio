import { paletteSectionDomId } from '../../lib/paletteCollapse'

export function PaletteAccordionSection({
  sectionId,
  title,
  titleClassName = '',
  count,
  collapsed,
  onToggle,
  variant = 'group',
  children,
}: {
  sectionId: string
  title: string
  titleClassName?: string
  count: number
  collapsed: boolean
  onToggle: () => void
  variant?: 'group' | 'sub'
  children: React.ReactNode
}) {
  const panelId = paletteSectionDomId(sectionId)
  const action = collapsed ? 'Expand' : 'Collapse'

  return (
    <div className={`palette-accordion palette-accordion--${variant} ${collapsed ? 'palette-accordion--collapsed' : ''}`}>
      <button
        type="button"
        className={`palette-accordion-trigger palette-accordion-trigger--${variant} ${titleClassName}`}
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        aria-label={`${action} ${title}, ${count} tools`}
      >
        <span className="palette-accordion-chevron" aria-hidden>
          {collapsed ? '▸' : '▾'}
        </span>
        <span className="palette-accordion-label">{title}</span>
        <span className="palette-accordion-count" aria-hidden>
          {count}
        </span>
      </button>
      {!collapsed && (
        <div id={panelId} className="palette-accordion-panel" role="region" aria-label={title}>
          {children}
        </div>
      )}
    </div>
  )
}
