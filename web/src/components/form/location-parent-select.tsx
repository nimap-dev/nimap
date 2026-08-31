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

/** The value the select carries for "this one is not inside anything". */
const TOP_LEVEL = ''

/** One step of nesting, matching the indent the locations table uses. */
const INDENT_REM = 1.25

export function LocationParentSelect({
  id,
  value,
  onChange,
  /**
   * The location being edited. It and everything nested inside it drop out of
   * the options: the server refuses those anyway, and a list that offers moves
   * it will reject is worse than one that doesn't.
   */
  excludeSubtreeOf,
}: {
  id: string
  value: string | undefined
  onChange: (parentId: string | undefined) => void
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
    // The rows arrive parents-first, so one pass is enough to carry the
    // exclusion all the way down a branch.
    for (const row of rows) {
      const { id: rowId, parentId } = row.location
      if (parentId && excluded.has(parentId)) excluded.add(rowId)
    }
  }

  const options = rows.filter((row) => !excluded.has(row.location.id))

  const labels: Record<string, string> = { [TOP_LEVEL]: 'Not inside anything' }
  for (const row of options) labels[row.location.id] = row.location.name

  if (value && !(value in labels)) labels[value] = ''

  return (
    <Field>
      <FieldLabel htmlFor={id}>Inside</FieldLabel>
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
            <span className="text-muted-foreground">Not inside anything</span>
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
