import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { ReactNode } from 'react'

const ANY = ''

/**
 * A single-choice filter for a table toolbar: one option per record plus an
 * "any" option that clears the filter. It reports undefined for "any", which
 * is what the generated list hooks take for "don't filter on this".
 */
export function FilterSelect<T extends string>({
  label,
  anyLabel,
  value,
  onChange,
  options,
}: {
  /** Names the control for screen readers, e.g. "Filter by type". */
  label: string
  /** Shown when nothing is picked, e.g. "Any type". */
  anyLabel: string
  value: T | undefined
  onChange: (value: T | undefined) => void
  options: Array<{ value: T; label: string; icon?: ReactNode }>
}) {
  const labels: Record<string, string> = { [ANY]: anyLabel }
  for (const option of options) labels[option.value] = option.label

  return (
    <Select<T | typeof ANY>
      items={labels}
      value={value ?? ANY}
      onValueChange={(next) =>
        onChange(next === ANY || next === null ? undefined : next)
      }
    >
      <SelectTrigger aria-label={label} className="max-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>
          <span className="text-muted-foreground">{anyLabel}</span>
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.icon}
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
