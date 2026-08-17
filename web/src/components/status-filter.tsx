import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { lifecycleStatusOptions } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { ListFilter } from 'lucide-react'

/**
 * Which lifecycle statuses a listing shows. Filters server-side wherever it is
 * used: decommissioned and archived records are left out of the response until
 * they are asked for, so this is the only way to see them.
 */
export function StatusFilter({
  value,
  onChange,
}: {
  value: LifecycleStatus[]
  onChange: (statuses: LifecycleStatus[]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Filter by status"
        render={<Button variant="outline" />}
      >
        <ListFilter />
        Status
        <span className="text-muted-foreground">{value.length}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        {lifecycleStatusOptions.map(([status, label]) => {
          const checked = value.includes(status)

          return (
            <DropdownMenuCheckboxItem
              key={status}
              checked={checked}
              // Something has to stay shown: an empty filter would send the API
              // no statuses at all, and it would answer with its own default.
              disabled={checked && value.length === 1}
              onCheckedChange={(next) => {
                const selected = new Set(value)
                if (next) selected.add(status)
                else selected.delete(status)

                onChange(
                  lifecycleStatusOptions
                    .map(([item]) => item)
                    .filter((item) => selected.has(item)),
                )
              }}
            >
              {label}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
