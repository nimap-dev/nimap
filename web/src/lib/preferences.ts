import {
  PreferencesDateFormat,
  PreferencesLanguage,
  PreferencesTheme,
  PreferencesTimeFormat,
  PreferencesTimezone,
} from '#/api/model'
import type { TFunction } from 'i18next'
import type { ChoiceFieldOption } from '#/components/form/choice-field'
import type { SelectFieldOption } from '#/components/form/select-field'

export type Language = PreferencesLanguage
export type DateFormat = PreferencesDateFormat
export type TimeFormat = PreferencesTimeFormat
export type Theme = PreferencesTheme
export type Timezone = PreferencesTimezone

/** Each language under its own name, so it can be found by whoever reads it. */
export const languageOptions: Array<SelectFieldOption<Language>> = [
  { value: PreferencesLanguage.en, label: 'English' },
  { value: PreferencesLanguage.cs, label: 'Čeština' },
]

export const dateFormatOptions = (
  t: TFunction<'account'>,
): Array<SelectFieldOption<DateFormat>> => [
  {
    value: PreferencesDateFormat.auto,
    label: t('preferences.dateFormats.auto'),
  },
  { value: PreferencesDateFormat.dmy_dot, label: '31.12.2026' },
  { value: PreferencesDateFormat.iso, label: '2026-12-31' },
  { value: PreferencesDateFormat.mdy_slash, label: '12/31/2026' },
  { value: PreferencesDateFormat.d_mmm_y, label: '31 Dec 2026' },
  { value: PreferencesDateFormat.mmm_d_y, label: 'Dec 31, 2026' },
]

export const timeFormatOptions = (
  t: TFunction<'account'>,
): Array<ChoiceFieldOption<TimeFormat>> => [
  {
    value: PreferencesTimeFormat.auto,
    label: t('preferences.timeFormats.auto'),
    hint: t('preferences.timeFormats.autoHint'),
  },
  {
    value: PreferencesTimeFormat.h24,
    label: t('preferences.timeFormats.h24'),
    hint: '14:30',
  },
  {
    value: PreferencesTimeFormat.h12,
    label: t('preferences.timeFormats.h12'),
    hint: '2:30 PM',
  },
]

export const themeOptions = (
  t: TFunction<'account'>,
): Array<ChoiceFieldOption<Theme>> =>
  Object.values(PreferencesTheme).map((theme) => ({
    value: theme,
    label: t(`preferences.themes.${theme}`),
  }))

/** The time zone the browser runs in, which an unset preference falls back to. */
export const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * The zone's offset from UTC right now, in minutes and as "UTC+05:30". It is
 * taken at load, so a zone observing daylight saving shows its current offset.
 */
function utcOffset(timeZone: string): { minutes: number; label: string } {
  const name =
    new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'

  // "GMT" alone is UTC itself, otherwise "GMT+05:30" or "GMT-03:00".
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name)
  if (!match) return { minutes: 0, label: 'UTC' }

  const [, sign, hours, minutes] = match
  const total = Number(hours) * 60 + Number(minutes)

  return {
    minutes: sign === '-' ? -total : total,
    label: `UTC${sign}${hours}:${minutes}`,
  }
}

/** The offered zones from west to east, each labelled with its offset. */
export const timezoneOptions: Array<SelectFieldOption<Timezone>> =
  Object.values(PreferencesTimezone)
    .map((zone) => ({ zone, offset: utcOffset(zone) }))
    .sort(
      (a, b) =>
        a.offset.minutes - b.offset.minutes || a.zone.localeCompare(b.zone),
    )
    .map(({ zone, offset }) => ({
      value: zone,
      label: `(${offset.label}) ${zone.replaceAll('_', ' ')}`,
    }))
