import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'

/** How one value of a `BadgeSelect` looks, at rest and as an option. */
export type BadgeSelectStyle = {
  /** The badge's own tint, the same classes its plain badge uses. */
  badge: string
  /**
   * What it does under the pointer, plus anything the select trigger would
   * otherwise paint over the badge (its dark-mode background, for one).
   */
  trigger: string
  /** The dot beside the value in the open list. */
  dot: string
}

/**
 * A value picked in place that looks like the badge the lists show, so it
 * reads as the record's state first and a control second. Someone who can't
 * change it gets `badge`, the plain one.
 */
export function BadgeSelect<T extends string>({
  value,
  options,
  styles,
  badge,
  onValueChange,
  readOnly = false,
  disabled = false,
  'aria-label': ariaLabel,
}: {
  value: T
  /** Every value with its label, in the order the list should show them. */
  options: [T, string][]
  styles: Record<T, BadgeSelectStyle>
  /** What a reader without the right to change it sees instead. */
  badge: ReactNode
  onValueChange: (value: T) => void
  /** No permission to change it: shows `badge` alone. */
  readOnly?: boolean
  /** A change is on its way: keeps the control, but holds it still. */
  disabled?: boolean
  'aria-label': string
}) {
  if (readOnly) return badge

  return (
    <Select
      items={Object.fromEntries(options)}
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          'gap-1 border-transparent py-0 pr-1 pl-1.5 text-xs font-medium data-[size=sm]:h-6 data-[size=sm]:rounded-md',
          '[&_svg]:size-3.5 [&_svg]:text-current [&_svg]:opacity-60',
          styles[value].badge,
          styles[value].trigger,
        )}
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-current opacity-70"
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {options.map(([option, label]) => (
          <SelectItem key={option} value={option}>
            <span
              aria-hidden
              className={cn(
                'size-1.5 shrink-0 self-center rounded-full',
                styles[option].dot,
              )}
            />
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
