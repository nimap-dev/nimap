import * as zod from 'zod'

/**
 * A website the app shows as a link, so it has to be a full address: "ui.com"
 * alone would turn into a link relative to this application. Empty is allowed,
 * every website field is optional.
 */
export const websiteSchema = zod.union([
  zod.literal(''),
  zod.url({ message: 'Enter a full address, such as https://www.example.com' }),
])
