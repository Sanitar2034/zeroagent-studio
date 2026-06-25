export default function StorageRetentionLegend({ className }: { className?: string }) {
  return (
    <ul className={className ?? 'data-inventory-legend'} aria-label="Badge meanings">
      <li>
        <span className="data-inventory-badge">Closes with browser</span>
        <span>Removed when you close the tab or quit the browser.</span>
      </li>
      <li>
        <span className="data-inventory-badge">Until you clear</span>
        <span>Stays in the browser until you tap Clear here or wipe this site&apos;s data.</span>
      </li>
    </ul>
  )
}
