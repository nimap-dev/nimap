import { cn } from '#/lib/utils'
import { createLink } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ComponentPropsWithRef, ReactNode } from 'react'

/**
 * The records hanging off this one, each a row linking to its own page. The
 * same card as a `DetailList`, so a tab of related records reads as part of
 * the same page rather than a table dropped into it.
 */
export function RelatedList({
  title,
  count,
  /** Beside the heading, a way to the full list, say. */
  action,
  /** Said in the card when there is nothing to list. */
  empty,
  className,
  children,
}: {
  title?: ReactNode
  count?: number
  action?: ReactNode
  empty?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <section className={cn('grid content-start gap-1.5', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 px-1">
          <h3 className="text-xs font-medium text-muted-foreground">
            {title}
            {title && count !== undefined && (
              <span className="ml-1.5 tabular-nums">{count}</span>
            )}
          </h3>
          {action}
        </div>
      )}
      {count === 0 && empty ? (
        <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {children}
        </ul>
      )}
    </section>
  )
}

function RelatedRow({
  icon,
  meta,
  /** How deep in a tree the row sits; each level indents it a step. */
  depth = 0,
  className,
  style,
  children,
  ...props
}: ComponentPropsWithRef<'a'> & {
  icon?: ReactNode
  meta?: ReactNode
  depth?: number
}) {
  return (
    <a
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      style={{ paddingInlineStart: `${0.75 + depth * 0.75}rem`, ...style }}
      {...props}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta && <span className="shrink-0 text-xs">{meta}</span>}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </a>
  )
}

/** One row of a `RelatedList`: a typed router link, put inside an `<li>`. */
export const RelatedLink = createLink(RelatedRow)
