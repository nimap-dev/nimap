import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { ReactNode } from 'react'

type SelectFieldApi<TValue extends string> = {
  name: string
  state: {
    value: TValue
    meta: {
      isTouched: boolean
      isValid: boolean
      errors: Array<{ message?: string } | undefined>
    }
  }
  handleBlur: () => void
  handleChange: (value: TValue) => void
}

export type SelectFieldOption<T extends string = string> = {
  value: T
  label: string
  icon?: ReactNode
}

/**
 * A labelled single choice bound to a form field whose value is a string, or a
 * union of string literals. A field that may hold "" means nothing picked:
 * `emptyLabel` is what the trigger shows in that state; with `allowEmpty` it
 * is also an option, so an optional choice can be cleared. A field typed
 * without "" is a required choice and needs neither.
 */
export function SelectField<TValue extends string>({
  field,
  label,
  options,
  emptyLabel = '',
  allowEmpty = false,
  description,
}: {
  field: SelectFieldApi<TValue>
  label: string
  options: Array<SelectFieldOption<Exclude<TValue, ''>>>
  emptyLabel?: string
  allowEmpty?: boolean
  description?: ReactNode
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  const labels: Record<string, string> = { '': emptyLabel }
  for (const option of options) labels[option.value] = option.label

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select<TValue>
        items={labels}
        value={field.state.value}
        onValueChange={(next) => field.handleChange((next ?? '') as TValue)}
        onOpenChange={(open) => {
          if (!open) field.handleBlur()
        }}
      >
        <SelectTrigger
          id={field.name}
          className="w-full"
          aria-invalid={isInvalid}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value="">
              <span className="text-muted-foreground">{emptyLabel}</span>
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.icon}
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
