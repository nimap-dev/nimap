import { Field, FieldLabel } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { DEFAULT_LIFECYCLE_STATUSES } from '#/lib/lifecycle'
import {
  buildLocationTree,
  flattenLocationTree,
  useAllLocations,
} from '#/lib/location-tree'
import { useMemo } from 'react'

const TOP_LEVEL = ''

const INDENT_REM = 1.25

export function LocationSelect({
  id,
  value,
  onChange,
  label = 'Inside',
  emptyLabel = 'Not inside anything',
  /**
   * The location being edited. It and everything nested inside it drop out of
   * the options.
   */
  excludeSubtreeOf,
}: {
  id: string
  value: string | undefined
  onChange: (locationId: string | undefined) => void
  label?: string
  emptyLabel?: string
  excludeSubtreeOf?: string
}) {
  const { data } = useAllLocations()
  const all = data?.status === 200 ? data.data : undefined

  const rows = useMemo(() => {
    const current = all?.find((location) => location.id === value)

    return flattenLocationTree(buildLocationTree(all ?? []), {
      statuses: current
        ? [...DEFAULT_LIFECYCLE_STATUSES, current.status]
        : DEFAULT_LIFECYCLE_STATUSES,
    })
  }, [all, value])

  const excluded = new Set<string>()
  if (excludeSubtreeOf) {
    excluded.add(excludeSubtreeOf)
    for (const row of rows) {
      const { id: rowId, parentId } = row.location
      if (parentId && excluded.has(parentId)) excluded.add(rowId)
    }
  }

  const options = rows.filter((row) => !excluded.has(row.location.id))

  const labels: Record<string, string> = { [TOP_LEVEL]: emptyLabel }
  for (const row of options) labels[row.location.id] = row.location.name

  if (value && !(value in labels)) labels[value] = ''

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={labels}
        value={value ?? TOP_LEVEL}
        onValueChange={(next) =>
          onChange(next === TOP_LEVEL ? undefined : (next as string))
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TOP_LEVEL}>
            <span className="text-muted-foreground">{emptyLabel}</span>
          </SelectItem>
          {options.map((row) => (
            <SelectItem key={row.location.id} value={row.location.id}>
              <span
                style={{ paddingInlineStart: `${row.depth * INDENT_REM}rem` }}
              >
                {row.location.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
