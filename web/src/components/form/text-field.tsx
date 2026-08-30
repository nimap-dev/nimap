import type { ComponentProps } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'

/**
 * The part of a TanStack form field this needs, declared structurally rather
 * than imported: the field type is parameterised by the shape of the whole
 * form, which a component shared between five different forms cannot name.
 */
type StringField = {
  name: string
  state: {
    value: string
    meta: {
      isTouched: boolean
      isValid: boolean
      errors: Array<{ message?: string } | undefined>
    }
  }
  handleBlur: () => void
  handleChange: (value: string) => void
}

/**
 * A labelled text input bound to a form field, showing its error only once the
 * field has been touched. Everything an `<Input>` takes passes through, so a
 * password or an autocomplete hint needs no separate component.
 */
export function TextField({
  field,
  label,
  ...input
}: Omit<
  ComponentProps<typeof Input>,
  'id' | 'name' | 'value' | 'onBlur' | 'onChange' | 'aria-invalid'
> & {
  field: StringField
  label: string
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={isInvalid}
        {...input}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
