import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as zod from 'zod'
import cs from '#/locales/cs'
import en from '#/locales/en'
import type { Language } from '#/lib/preferences'

// Lets t() suggest the keys and reject a typo, taking English as the source.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof en
  }
}

/**
 * A translation has the same keys as English, so a missing or misspelled one
 * fails the typecheck. Czech also has plural forms English lacks (2 výsledky,
 * 1,5 výsledku), so `_few` and `_many` keys are allowed on top.
 */
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>
} & { [key: `${string}_few` | `${string}_many`]: string }

/** Czech for a Czech browser, English otherwise; used until the saved preference is known. */
export function browserLanguage(): Language {
  return navigator.language.startsWith('cs') ? 'cs' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: { en, cs },
  lng: browserLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  // The translations are bundled, so the first render already has them.
  initAsync: false,
  interpolation: { escapeValue: false },
})

/** Switches the strings, `<html lang>` and zod's validation messages. */
export function applyLanguage(language: Language) {
  void i18n.changeLanguage(language)
  document.documentElement.lang = language
  zod.config(language === 'cs' ? zod.locales.cs() : zod.locales.en())
}

export default i18n
