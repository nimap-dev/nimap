import { Button } from '#/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'

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
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center gap-1 border-b p-2">
        {back && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={backLabel ?? 'Back'}
            render={back}
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
