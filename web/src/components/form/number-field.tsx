import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'

type NumberFieldApi = {
  name: string
  state: {
    value: number | undefined
    meta: {
      isTouched: boolean
      isValid: boolean
      errors: Array<{ message?: string } | undefined>
    }
  }
  handleBlur: () => void
  handleChange: (value: number | undefined) => void
}

function parseWholeNumber(text: string): number | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return undefined

  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

function formatNumber(value: number | undefined): string {
  return value === undefined || Number.isNaN(value) ? '' : String(value)
}

function sameNumber(a: number | undefined, b: number | undefined) {
  return a === b || (Number.isNaN(a) && Number.isNaN(b))
}

/**
 * A labelled whole-number input bound to a form field holding
 * `number | undefined`. It keeps what was typed as text, so a half-typed or
 * mistyped value stays on screen with its error instead of being wiped, and
 * hands the form a number, undefined for empty, or NaN for text that does not
 * parse. Pair it with a validator such as `wholeNumberSchema` to turn NaN and
 * out-of-range values into a message.
 *
 * A text input with a numeric keyboard rather than `type="number"`, which
 * reports unparsable text as empty, accepts "e", and changes value when
 * scrolled over.
 */
export function NumberField({
  field,
  label,
  ...input
}: Omit<
  ComponentProps<typeof Input>,
  | 'id'
  | 'name'
  | 'value'
  | 'onBlur'
  | 'onChange'
  | 'aria-invalid'
  | 'type'
  | 'inputMode'
> & {
  field: NumberFieldApi
  label: string
}) {
  const [text, setText] = useState(() => formatNumber(field.state.value))
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  const shown = sameNumber(parseWholeNumber(text), field.state.value)
    ? text
    : formatNumber(field.state.value)

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type="text"
        inputMode="numeric"
        value={shown}
        onBlur={field.handleBlur}
        onChange={(event) => {
          setText(event.target.value)
          field.handleChange(parseWholeNumber(event.target.value))
        }}
        aria-invalid={isInvalid}
        {...input}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
