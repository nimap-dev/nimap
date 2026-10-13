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
}: {
  title: ReactNode
  /** A `<Link>` to render as the back button. */
  back?: ReactElement
  backLabel?: string
  action?: ReactNode
  children: ReactNode
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
 * What it shows when the record is not there. `description` says so in the
 * interface language; `noun` is the English sentence of the pages not yet
 * translated, and goes once they all pass a description.
 */
export function PanelNotFound({
  noun,
  description,
  back,
  backLabel,
}: {
  noun?: string
  description?: string
  back: ReactElement
  backLabel: string
}) {
  const { t } = useTranslation()

  return (
    <Panel title={t('notFound.title')} back={back} backLabel={backLabel}>
      <p className="text-sm text-muted-foreground">
        {description ??
          (noun
            ? `This ${noun} doesn't exist, or you don't have access to it.`
            : t('notFound.description'))}
      </p>
      <Button variant="outline" size="sm" render={back} nativeButton={false}>
        {backLabel}
      </Button>
    </Panel>
  )
}
