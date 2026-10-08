import * as zod from 'zod'

/**
 * An optional whole number between `min` and `max`, as NumberField reports it:
 * undefined when empty, NaN when the text does not parse.
 *
 * `max` defaults to the largest Postgres `int`; pass 32767 for a `smallint`
 * column so an oversized value is caught here and not as a server error.
 */
export function wholeNumberSchema({
  min = 1,
  max = 2_147_483_647,
}: { min?: number; max?: number } = {}) {
  const message =
    min === 1
      ? 'Enter a whole number above zero'
      : `Enter a whole number from ${min}`

  return zod
    .number({ error: message })
    .int({ error: message })
    .min(min, { error: message })
    .max(max, {
      error: `Enter a number no larger than ${max.toLocaleString()}`,
    })
    .optional()
}
