const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: "week", ms: WEEK },
  { unit: "day", ms: DAY },
  { unit: "hour", ms: HOUR },
  { unit: "minute", ms: MINUTE },
]

const relativeFormat = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
})
const absoluteFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

/**
 * Formats a timestamp as "2 hours ago" / "yesterday" / "last week", falling
 * back to an absolute date ("9 Aug 2026") once it is more than a month out.
 * Future timestamps read as "in 2 hours". Returns "" for unparseable input.
 */
export function formatRelativeDate(
  value: string | number | Date,
  now: number | Date = Date.now()
) {
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  if (Number.isNaN(time)) return ""

  const diff = time - (now instanceof Date ? now.getTime() : now)
  const elapsed = Math.abs(diff)

  if (elapsed >= MONTH) return absoluteFormat.format(date)
  if (elapsed < MINUTE) return "just now"

  const { unit, ms } = RELATIVE_UNITS.find(({ ms }) => elapsed >= ms)!
  // Truncate rather than round so 90 minutes reads "1 hour ago", not "2 hours ago".
  return relativeFormat.format(Math.trunc(diff / ms), unit)
}

export function formatAbsoluteDate(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString()
}
