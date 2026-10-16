import * as zod from 'zod'
import i18n from '#/lib/i18n'

/**
 * A website the app shows as a link, so it has to be a full address: "ui.com"
 * alone would turn into a link relative to this application. Empty is allowed,
 * every website field is optional.
 */
export const websiteSchema = zod.union([
  zod.literal(''),
  // A function, so the message follows a language switch after import.
  zod.url({ error: () => i18n.t('common:validation.website') }),
])
