import { suggestLocation } from '#/api/locations/locations'
import type { MultiPolygon } from '#/api/model'
import { Button } from '#/components/ui/button'
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
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

const TOP_LEVEL = ''

const INDENT_REM = 1.25

function useSuggestedLocation(area: MultiPolygon | undefined) {
  const { data } = useQuery({
    queryKey: ['suggestLocation', area],
    queryFn: async () => {
      const res = await suggestLocation({ area: area! })

      return res.status === 200 ? res.data : null
    },
    enabled: Boolean(area),
  })

  return data ?? undefined
}

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
  /**
   * The shape being drawn, if there is one. The location it overlaps the most
   * fills the field in, until someone picks for themselves.
   */
  suggestFor,
}: {
  id: string
  value: string | undefined
  onChange: (locationId: string | undefined) => void
  label?: string
  emptyLabel?: string
  excludeSubtreeOf?: string
  suggestFor?: MultiPolygon
}) {
  const { data } = useAllLocations()
  const all = data?.status === 200 ? data.data : undefined

  const suggestion = useSuggestedLocation(suggestFor)
  const [picked, setPicked] = useState(false)
  const filledIn = useRef<string>(undefined)

  useEffect(() => {
    if (picked || !suggestion || suggestion.id === value) return
    if (value && value !== filledIn.current) return

    filledIn.current = suggestion.id
    onChange(suggestion.id)
  }, [picked, suggestion, value, onChange])

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
        onValueChange={(next) => {
          setPicked(true)
          onChange(next === TOP_LEVEL ? undefined : (next as string))
        }}
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

      {suggestion &&
        (suggestion.id === value ? (
          <p className="text-sm text-muted-foreground">
            From the shape drawn on the map
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              The shape sits in {suggestion.name}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPicked(true)
                onChange(suggestion.id)
              }}
            >
              Use
            </Button>
          </div>
        ))}
    </Field>
  )
}
