import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * A group of label-and-value rows on a card, under an optional heading. The
 * card is also the container the rows measure: wide enough, and a label sits
 * left of its value so the column of labels stays scannable; too narrow (the
 * map panel), and the label goes above the value instead of truncating it.
 */
export function DetailList({
  title,
  /** Something small beside the heading, an edit link for this group alone. */
  action,
  className,
  children,
}: {
  title?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('grid content-start gap-1.5', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 px-1">
          <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
          {action}
        </div>
      )}
      <dl className="@container/detail divide-y rounded-lg border bg-card text-sm">
        {children}
      </dl>
    </section>
  )
}

export function Detail({
  label,
  title,
  /**
   * Rows of text read better on a shared baseline; a row holding a control
   * needs its label centred against it instead.
   */
  align = 'baseline',
  children,
}: {
  label: ReactNode
  title?: string
  align?: 'baseline' | 'center'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 px-3 py-2',
        '@xs/detail:flex-row @xs/detail:justify-between @xs/detail:gap-3',
        align === 'center'
          ? '@xs/detail:items-center'
          : '@xs/detail:items-baseline',
      )}
    >
      <dt className="shrink-0 text-xs text-muted-foreground @xs/detail:text-sm">
        {label}
      </dt>
      <dd className="min-w-0 truncate @xs/detail:text-right" title={title}>
        {children}
      </dd>
    </div>
  )
}

/** A value nobody has filled in, said in words rather than left blank. */
export function DetailEmpty({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>
}

/**
 * A record's free-text notes, as a section of their own rather than a grey
 * paragraph floating above the first list.
 */
export function DetailNote({
  title,
  className,
  children,
}: {
  title: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('grid content-start gap-1.5', className)}>
      <h3 className="px-1 text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      <p className="rounded-lg border bg-card px-3 py-2 text-sm whitespace-pre-line text-muted-foreground">
        {children}
      </p>
    </section>
  )
}

/**
 * When the record was created and last changed, the same on every page and
 * always last. It spans the whole grid so it never sits beside a section.
 */
export function DetailMeta({
  id,
  createdAt,
  updatedAt,
}: {
  /** Shown first and easy to select, for records people quote by id. */
  id?: string
  createdAt: string
  updatedAt: string
}) {
  const { t } = useTranslation()

  return (
    <p className="col-span-full flex flex-wrap items-center gap-x-2 px-1 text-xs text-muted-foreground">
      {id && (
        <>
          <span className="font-mono select-all">{id}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span title={formatAbsoluteDate(createdAt)}>
        {t('meta.created', { when: formatRelativeDate(createdAt) })}
      </span>
      <span aria-hidden="true">·</span>
      <span title={formatAbsoluteDate(updatedAt)}>
        {t('meta.updated', { when: formatRelativeDate(updatedAt) })}
      </span>
    </p>
  )
}

/**
 * How a record page lays out its sections: one column, two once the page is
 * wide enough. A section that should run the full width takes
 * `@3xl/grid:col-span-2`; in the map panel the grid never gets that wide.
 */
export function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <div className="@container/grid mx-auto w-full max-w-4xl">
      <div className="grid gap-5 @3xl/grid:grid-cols-2">{children}</div>
    </div>
  )
}

/**
 * One column of a `DetailGrid` that stacks its own sections. Sections of very
 * different heights side by side leave a hole under the shorter one, row after
 * row; two columns stacking independently close those holes, and on a narrow
 * screen they simply follow one another.
 */
export function DetailColumn({ children }: { children: ReactNode }) {
  return <div className="grid content-start gap-5">{children}</div>
}
