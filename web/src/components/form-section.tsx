import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'

/**
 * A group of fields on the same card a `DetailList` uses, under the same kind
 * of heading, so a page mixing the two reads as one. `footer` is for a group
 * that saves on its own, its submit button on the card's bottom edge.
 *
 * The card is the container its `FormRow`s measure, so fields go side by side
 * only when this card has the room, not when the window does: the same form
 * sits in half of a wide page and in the narrow map panel.
 */
export function FormSection({
  title,
  description,
  footer,
  className,
  children,
}: {
  title: ReactNode
  /** What the group changes, or what changing it sets off. */
  description?: ReactNode
  footer?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <section className={cn('grid content-start gap-1.5', className)}>
      <h3 className="px-1 text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      <div className="@container/section rounded-lg border bg-card text-sm">
        <div className="grid gap-4 p-3">
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
          {children}
        </div>
        {footer && (
          <div className="flex items-center gap-2 border-t px-3 py-2">
            {footer}
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Short fields that belong together on one line (variant and part number, the
 * three dimensions), stacked again once the section is too narrow for them.
 * An uneven split goes in `className`, e.g. `@sm/section:grid-cols-[2fr_1fr]`.
 */
export function FormRow({
  columns = 2,
  className,
  children,
}: {
  columns?: 2 | 3
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'grid items-end gap-4',
        columns === 3 ? '@sm/section:grid-cols-3' : '@sm/section:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  )
}
