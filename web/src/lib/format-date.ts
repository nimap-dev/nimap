import { useSyncExternalStore } from 'react'
import i18n from '#/lib/i18n'
import type { DateFormat, TimeFormat, Timezone } from '#/lib/preferences'

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

/** The saved preferences. An unset zone is undefined: the browser's own. */
let preferences: {
  timezone?: Timezone
  dateFormat: DateFormat
  timeFormat: TimeFormat
} = { dateFormat: 'auto', timeFormat: 'auto' }

const listeners = new Set<() => void>()

export function applyDateTimePreferences({
  timezone,
  dateFormat,
  timeFormat,
}: typeof preferences) {
  if (
    timezone === preferences.timezone &&
    dateFormat === preferences.dateFormat &&
    timeFormat === preferences.timeFormat
  )
    return

  preferences = { timezone, dateFormat, timeFormat }
  cache.clear()
  listeners.forEach((listener) => listener())
}

/** Re-renders the component when the date and time preferences change. */
export function useDateTimePreferences() {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => preferences,
  )
}

/**
 * The formatters for the interface language, not the browser's: a Czech
 * interface in an English browser should still say "minulý týden". Made once
 * per language and zone, since a table formats a date on every row.
 */
const cache = new Map<string, ReturnType<typeof createFormatters>>()

function formatters(timeZone: string | undefined = preferences.timezone) {
  const key = `${i18n.language} ${timeZone}`
  let found = cache.get(key)
  if (!found) {
    found = createFormatters(i18n.language, timeZone)
    cache.set(key, found)
  }
  return found
}

function createFormatters(language: string, timeZone: string | undefined) {
  const { timeFormat } = preferences

  return {
    relative: new Intl.RelativeTimeFormat(language, { numeric: 'auto' }),
    date: new Intl.DateTimeFormat(language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
    }),
    // Alone, since Czech writes a short month next to a day as a number.
    month: new Intl.DateTimeFormat(language, { month: 'short', timeZone }),
    // Gregorian with Latin digits, for the formats built from numbers.
    numeric: new Intl.DateTimeFormat(language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone,
    }),
    time: new Intl.DateTimeFormat(language, {
      hour: timeFormat === 'h24' ? '2-digit' : 'numeric',
      minute: '2-digit',
      hourCycle: hourCycle(timeFormat),
      timeZone,
    }),
  }
}

/** The clock of a time format; "auto" leaves it to the language. */
function hourCycle(timeFormat: TimeFormat) {
  if (timeFormat === 'h24') return 'h23'
  if (timeFormat === 'h12') return 'h12'
  return undefined
}

function toDate(value: string | number | Date) {
  return value instanceof Date ? value : new Date(value)
}

/** The calendar day of `date` in `timeZone`, in the preferred format. */
function formatDate(date: Date, timeZone?: string) {
  const f = formatters(timeZone)
  const { day, month, year } = Object.fromEntries(
    f.numeric.formatToParts(date).map((part) => [part.type, part.value]),
  )

  switch (preferences.dateFormat) {
    case 'auto':
      return f.date.format(date)
    case 'dmy_dot':
      return `${day}.${month}.${year}`
    case 'iso':
      return `${year}-${month}-${day}`
    case 'mdy_slash':
      return `${month}/${day}/${year}`
    case 'd_mmm_y':
      return `${Number(day)} ${f.month.format(date)} ${year}`
    case 'mmm_d_y':
      return `${f.month.format(date)} ${Number(day)}, ${year}`
  }
}

/**
 * Formats a timestamp as "2 hours ago" / "yesterday" / "last week", falling
 * back to an absolute date once it is more than a month out. Future
 * timestamps read as "in 2 hours". Returns "" for unparseable input.
 */
export function formatRelativeDate(
  value: string | number | Date,
  now: number | Date = Date.now(),
) {
  const date = toDate(value)
  const time = date.getTime()
  if (Number.isNaN(time)) return ''

  const diff = time - (now instanceof Date ? now.getTime() : now)
  const elapsed = Math.abs(diff)
  const { relative } = formatters()

  if (elapsed >= MONTH) return formatDate(date)
  // "now" / "nyní", in whichever language the interface speaks.
  if (elapsed < MINUTE) return relative.format(0, 'second')

  const { unit, ms } = RELATIVE_UNITS.find(
    (candidate) => elapsed >= candidate.ms,
  )!
  // Truncate rather than round so 90 minutes reads "1 hour ago", not "2 hours ago".
  return relative.format(Math.trunc(diff / ms), unit)
}

/** Formats a timestamp as date and time ("31.12.2026 14:30"). */
export function formatAbsoluteDate(value: string | number | Date) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${formatDate(date)} ${formatters().time.format(date)}`
}

/**
 * Formats a calendar day sent as YYYY-MM-DD. The day is read and written in
 * UTC, so it never shifts by one in a zone behind or ahead of it.
 */
export function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''

  return formatDate(date, 'UTC')
}
