import { roleLabels } from '#/lib/roles'
import type { Role } from '#/lib/roles'
import { cn } from '#/lib/utils'

const roleStyles: Record<Role, string> = {
  viewer: 'bg-muted text-muted-foreground',
  editor: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
  admin:
    'bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
}

export function RoleBadge({
  role,
  className,
}: {
  role: Role
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium',
        roleStyles[role],
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {roleLabels[role]}
    </span>
  )
}
