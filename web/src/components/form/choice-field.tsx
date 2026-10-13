import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import type { ReactNode } from 'react'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import { cn } from '#/lib/utils'

type ChoiceFieldApi<TValue extends string> = {
  name: string
  state: { value: TValue }
  handleChange: (value: TValue) => void
}

export type ChoiceFieldOption<TValue extends string = string> = {
  value: TValue
  label: string
  /** A second, quieter line under the label, such as an example. */
  hint?: string
  icon?: ReactNode
}

/**
 * A required choice among a few options laid out side by side, each a tile
 * that is picked by clicking it. Meant for two to four short options; a longer
 * list belongs in a SelectField.
 */
export function ChoiceField<TValue extends string>({
  field,
  label,
  options,
  description,
}: {
  field: ChoiceFieldApi<TValue>
  label: string
  options: Array<ChoiceFieldOption<TValue>>
  description?: ReactNode
}) {
  const labelId = `${field.name}-label`

  return (
    <Field>
      <FieldLabel id={labelId}>{label}</FieldLabel>
      <RadioGroup<TValue>
        aria-labelledby={labelId}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-input px-3 py-2.5 text-center text-sm transition-colors outline-none select-none',
              'hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/50',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              'data-checked:border-primary data-checked:bg-primary/5 data-checked:ring-1 data-checked:ring-primary dark:data-checked:bg-primary/15',
            )}
          >
            {option.icon && (
              <span className="text-muted-foreground [&>svg]:size-4">
                {option.icon}
              </span>
            )}
            <span className="font-medium">{option.label}</span>
            {option.hint && (
              <span className="text-xs text-muted-foreground">
                {option.hint}
              </span>
            )}
          </Radio.Root>
        ))}
      </RadioGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}
