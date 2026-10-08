/**
 * A secondary table cell: muted text that truncates, or a dash when nobody has
 * filled the value in, so an empty cell reads as "unknown" rather than as a
 * rendering gap.
 */
export function MutedCell({ children }: { children?: string }) {
  return (
    <span className="block truncate text-muted-foreground">
      {children || '-'}
    </span>
  )
}
