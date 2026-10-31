import {
  formatAbsoluteDate,
  formatDay,
  formatRelativeDate,
  useDateTimePreferences,
} from '#/lib/format-date'

/**
 * A timestamp as "2 hours ago", with the full date and time on hover.
 * `children` can wrap the relative text, as in "Created 2 hours ago".
 */
export function RelativeDate({
  value,
  className,
  children = (when) => when,
}: {
  value: string
  className?: string
  children?: (when: string) => string
}) {
  useDateTimePreferences()

  return (
    <span className={className} title={formatAbsoluteDate(value)}>
      {children(formatRelativeDate(value))}
    </span>
  )
}

/** A calendar day sent as YYYY-MM-DD, in the preferred date format. */
export function FormattedDay({ value }: { value: string }) {
  useDateTimePreferences()

  return formatDay(value)
}
