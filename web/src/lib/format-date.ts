import i18n from '#/lib/i18n'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> =
  [
    { unit: 'week', ms: WEEK },
    { unit: 'day', ms: DAY },
    { unit: 'hour', ms: HOUR },
    { unit: 'minute', ms: MINUTE },
  ]

/**
 * The formatters for the interface language, not the browser's: a Czech
 * interface in an English browser should still say "minulý týden". Made once
 * per language, since a table formats a date on every row.
 */
const formatters = new Map<
  string,
  { relative: Intl.RelativeTimeFormat; absolute: Intl.DateTimeFormat }
>()

function formattersFor(language: string) {
  let found = formatters.get(language)
  if (!found) {
    found = {
      relative: new Intl.RelativeTimeFormat(language, { numeric: 'auto' }),
      absolute: new Intl.DateTimeFormat(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    }
    formatters.set(language, found)
  }
  return found
}

/**
 * Formats a timestamp as "2 hours ago" / "yesterday" / "last week", falling
 * back to an absolute date ("9 Aug 2026") once it is more than a month out.
 * Future timestamps read as "in 2 hours". Returns "" for unparseable input.
 */
export function formatRelativeDate(
  value: string | number | Date,
  now: number | Date = Date.now(),
) {
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  if (Number.isNaN(time)) return ''

  const diff = time - (now instanceof Date ? now.getTime() : now)
  const elapsed = Math.abs(diff)
  const { relative, absolute } = formattersFor(i18n.language)

  if (elapsed >= MONTH) return absolute.format(date)
  // "now" / "nyní", in whichever language the interface speaks.
  if (elapsed < MINUTE) return relative.format(0, 'second')

  const { unit, ms } = RELATIVE_UNITS.find(
    (candidate) => elapsed >= candidate.ms,
  )!
  // Truncate rather than round so 90 minutes reads "1 hour ago", not "2 hours ago".
  return relative.format(Math.trunc(diff / ms), unit)
}

export function formatAbsoluteDate(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(i18n.language)
}
