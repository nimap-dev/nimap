import { useListLocationTree } from '#/api/locations/locations'
import { Field, FieldLabel } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

/** The value the select carries for "this one is not inside anything". */
const TOP_LEVEL = ''

/** One step of nesting, matching the indent the locations table uses. */
const INDENT_REM = 0.75

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
  const { data } = useListLocationTree()
  const rows = data?.status === 200 ? data.data : []

  const excluded = new Set<string>()
  if (excludeSubtreeOf) {
    excluded.add(excludeSubtreeOf)
    // The rows arrive parents-first, so one pass is enough to carry the
    // exclusion all the way down a branch.
    for (const row of rows) {
      if (row.parentId && excluded.has(row.parentId)) excluded.add(row.id)
    }
  }

  const options = rows.filter((row) => !excluded.has(row.id))

  const labels: Record<string, string> = { [TOP_LEVEL]: 'Not inside anything' }
  for (const row of options) labels[row.id] = row.name

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
            <SelectItem key={row.id} value={row.id}>
              <span
                style={{ paddingInlineStart: `${row.depth * INDENT_REM}rem` }}
              >
                {row.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
