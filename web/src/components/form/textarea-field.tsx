import type { ComponentProps } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import type { StringField } from '#/components/form/text-field'

/**
 * TextField for longer text: a labelled textarea bound to a form field, which
 * grows with its content and shows its error once the field has been touched.
 */
export function TextareaField({
  field,
  label,
  ...textarea
}: Omit<
  ComponentProps<typeof Textarea>,
  'id' | 'name' | 'value' | 'onBlur' | 'onChange' | 'aria-invalid'
> & {
  field: StringField
  label: string
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={isInvalid}
        {...textarea}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
