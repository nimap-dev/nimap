import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'

/**
 * The label-and-value list every detail page shows under its title. Values sit
 * against the right edge so the column of labels stays scannable down the left.
 */
export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="grid gap-2 text-sm">{children}</dl>
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
        'flex justify-between gap-3',
        align === 'center' ? 'items-center' : 'items-baseline',
      )}
    >
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right" title={title}>
        {children}
      </dd>
    </div>
  )
}

/** A value nobody has filled in, said in words rather than left blank. */
export function DetailEmpty({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>
}
