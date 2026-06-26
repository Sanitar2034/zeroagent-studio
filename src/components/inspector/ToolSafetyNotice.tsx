import type { ToolSafetyNotice as ToolSafetyNoticeType } from '../../lib/toolSafety'
import { navigateToGuideSection } from '../../lib/appRoute'

export function ToolSafetyNotice({ notice }: { notice: ToolSafetyNoticeType }) {
  return (
    <aside
      className={`inspector-safety inspector-safety--${notice.level}`}
      aria-label={`Safety notice: ${notice.title}`}
    >
      <p className="inspector-safety-title">{notice.title}</p>
      <p className="inspector-safety-summary">{notice.summary}</p>
      <ul className="inspector-safety-list">
        {notice.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <button
        type="button"
        className="inspector-safety-link"
        onClick={() => navigateToGuideSection('staying-safe')}
      >
        Full tool safety guide →
      </button>
    </aside>
  )
}
