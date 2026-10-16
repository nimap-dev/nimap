import { BadgeSelect } from '#/components/badge-select'
import type { BadgeSelectStyle } from '#/components/badge-select'
import {
  LifecycleBadge,
  lifecycleStatusStyles,
} from '#/components/lifecycle-badge'
import { useLifecycleStatusOptions } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'

const styles: Record<LifecycleStatus, BadgeSelectStyle> = {
  planned: {
    badge: lifecycleStatusStyles.planned,
    trigger: 'hover:bg-sky-500/15 dark:hover:bg-sky-400/15',
    dot: 'bg-sky-500',
  },
  active: {
    badge: lifecycleStatusStyles.active,
    trigger: 'hover:bg-emerald-500/15 dark:hover:bg-emerald-400/15',
    dot: 'bg-emerald-500',
  },
  decommissioned: {
    badge: lifecycleStatusStyles.decommissioned,
    trigger: 'hover:bg-amber-500/20 dark:hover:bg-amber-400/15',
    dot: 'bg-amber-500',
  },
  archived: {
    badge: lifecycleStatusStyles.archived,
    trigger: 'hover:bg-muted/70 dark:bg-muted dark:hover:bg-muted/70',
    dot: 'bg-muted-foreground',
  },
}

/** A record's lifecycle status, changed in place. */
export function LifecycleStatusSelect({
  value,
  ...props
}: {
  value: LifecycleStatus
  onValueChange: (status: LifecycleStatus) => void
  readOnly?: boolean
  disabled?: boolean
  'aria-label': string
}) {
  const options = useLifecycleStatusOptions()

  return (
    <BadgeSelect
      value={value}
      options={options}
      styles={styles}
      badge={<LifecycleBadge status={value} />}
      {...props}
    />
  )
}
