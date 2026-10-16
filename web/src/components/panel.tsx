import { Button } from '#/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { Skeleton } from '#/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

/**
 * The frame every page in the side panel and the nav pane shares: a fixed
 * header with an optional way back, and a scrolling body underneath.
 *
 * It was nine near-identical copies before this existed, which is how the
 * scroll container ended up subtly different on the pages that were written
 * last.
 */
export function Panel({
  title,
  back,
  backLabel,
  action,
  children,
  summary,
  tabs,
}: {
  title: ReactNode
  /** A `<Link>` to render as the back button. */
  back?: ReactElement
  backLabel?: string
  action?: ReactNode
  children: ReactNode
  summary?: ReactNode
  tabs?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center gap-1 border-b p-2">
        {back && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={backLabel ?? t('actions.back')}
            render={back}
            nativeButton={false}
          >
            <ArrowLeft />
          </Button>
        )}
        <h2 className="min-w-0 flex-1 truncate font-medium">{title}</h2>
        {action}
      </div>
      {(summary || tabs) && (
        <div className="border-b">
          {summary && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-sm text-muted-foreground">
              {summary}
            </div>
          )}
          {tabs && <div className="overflow-x-auto px-3">{tabs}</div>}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  )
}

// What a record page shows while it is loading.
export function PanelPending({
  back,
  backLabel,
}: {
  back: ReactElement
  backLabel: string
}) {
  return (
    <Panel
      title={<Skeleton className="h-4 w-40" />}
      back={back}
      backLabel={backLabel}
    >
      <Skeleton className="h-4 w-full" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Panel>
  )
}

/**
 * What it shows when the record is not there. `description` names the kind of
 * record in the page's own words; without one it falls back to the generic
 * sentence.
 */
export function PanelNotFound({
  description,
  back,
  backLabel,
}: {
  description?: string
  back: ReactElement
  backLabel: string
}) {
  const { t } = useTranslation()

  return (
    <Panel title={t('notFound.title')} back={back} backLabel={backLabel}>
      <p className="text-sm text-muted-foreground">
        {description ?? t('notFound.description')}
      </p>
      <Button variant="outline" size="sm" render={back} nativeButton={false}>
        {backLabel}
      </Button>
    </Panel>
  )
}
