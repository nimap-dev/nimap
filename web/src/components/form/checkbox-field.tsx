import { Checkbox } from '#/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '#/components/ui/field'

type BooleanField = {
  name: string
  state: { value: boolean }
  handleChange: (value: boolean) => void
}

/** A checkbox with its label, and an optional line explaining it, bound to a form field. */
export function CheckboxField({
  field,
  label,
  description,
}: {
  field: BooleanField
  label: string
  description?: string
}) {
  return (
    <Field orientation="horizontal">
      <Checkbox
        id={field.name}
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
      />
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
    </Field>
  )
}
