import { useLifecycleStatusLabels } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { cn } from '#/lib/utils'

/** Each status's tint, shared with the status picker so the two always match. */
export const lifecycleStatusStyles: Record<LifecycleStatus, string> = {
  planned: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
  active:
    'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  decommissioned:
    'bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  archived: 'bg-muted text-muted-foreground',
}

export function LifecycleBadge({
  status,
  className,
}: {
  status: LifecycleStatus
  className?: string
}) {
  const lifecycleStatusLabels = useLifecycleStatusLabels()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium',
        lifecycleStatusStyles[status],
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {lifecycleStatusLabels[status]}
    </span>
  )
}
