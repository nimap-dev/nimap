import { DataTable } from '#/components/data-table/data-table'
import { LifecycleBadge } from '#/components/lifecycle-badge'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { Button } from '#/components/ui/button'
import { formatAddress } from '#/lib/address'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { DEFAULT_LIFECYCLE_STATUSES } from '#/lib/lifecycle'
import {
  buildLocationTree,
  flattenLocationTree,
  useAllLocations,
} from '#/lib/location-tree'
import type { LocationTreeRow } from '#/lib/location-tree'
import { cn } from '#/lib/utils'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusFilter } from '#/components/status-filter'
import { Panel } from '#/components/panel'
import { TableSkeleton } from '#/components/data-table/table-skeleton'
import { useCan } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated/_nav/locations/')({
  component: AllLocations,
})

/** One step of nesting, in the same units the guide elbow is drawn in. */
const INDENT_REM = 1.25

const columnHelper = createColumnHelper<DataTableFeatures, LocationTreeRow>()

// No sortable headers anywhere in this table on purpose: the rows arrive in
// tree order and sorting any column would scatter children away from parents,
// leaving the indentation describing a shape that is no longer on screen.
function makeColumns(onToggle: (id: string) => void) {
  return columnHelper.columns([
    columnHelper.accessor((row) => row.location.name, {
      id: 'name',
      header: () => 'Name',
      cell: ({ row, getValue }) => {
        const { location, depth, isMatch, hasChildren, isCollapsed } =
          row.original
        const line = formatAddress(location.address)
        const Chevron = isCollapsed ? ChevronRight : ChevronDown

        return (
          <div
            className="flex items-start gap-1.5"
            style={{ paddingInlineStart: `${depth * INDENT_REM}rem` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(location.id)}
                aria-expanded={!isCollapsed}
                aria-label={
                  isCollapsed
                    ? `Show what is inside ${location.name}`
                    : `Hide what is inside ${location.name}`
                }
                className="-ml-1 mt-0.5 shrink-0 rounded text-muted-foreground hover:text-foreground"
              >
                <Chevron className="size-4" />
              </button>
            ) : (
              depth > 0 && (
                <span
                  aria-hidden
                  className="mt-1.5 -ml-3 size-3 shrink-0 rounded-bl border-b border-l border-border"
                />
              )
            )}
            <div className="grid min-w-0 gap-0.5">
              <Link
                to="/locations/$locationId"
                params={{ locationId: location.id }}
                className={cn(
                  'block truncate hover:underline',
                  // A row kept only to hold up its children reads as a signpost
                  // rather than as an answer to what was asked for.
                  isMatch ? 'font-medium' : 'text-muted-foreground',
                )}
              >
                {getValue()}
              </Link>
              {line && (
                <span
                  className="block truncate text-xs text-muted-foreground"
                  title={line}
                >
                  {line}
                </span>
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor((row) => row.location.status, {
      id: 'status',
      header: () => 'Status',
      meta: { width: '9rem' },
      cell: ({ getValue }) => <LifecycleBadge status={getValue()} />,
    }),
    columnHelper.accessor((row) => row.location.updatedAt, {
      id: 'updatedAt',
      header: () => 'Updated',
      meta: { width: '7.5rem' },
      cell: ({ getValue }) => (
        <span
          className="text-muted-foreground"
          title={formatAbsoluteDate(getValue())}
        >
          {formatRelativeDate(getValue())}
        </span>
      ),
    }),
  ])
}

function AllLocations() {
  const canWrite = useCan('records:write')
  const [statuses, setStatuses] = useState(DEFAULT_LIFECYCLE_STATUSES)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const { data: locations, isPending } = useAllLocations()
  const navigate = useNavigate()

  const all = locations?.status === 200 ? locations.data : undefined
  const tree = useMemo(() => buildLocationTree(all ?? []), [all])
  const rows = useMemo(
    () => flattenLocationTree(tree, { statuses, query, collapsed }),
    [tree, statuses, query, collapsed],
  )

  const columns = useMemo(
    () =>
      makeColumns((id) =>
        setCollapsed((current) => {
          const next = new Set(current)
          if (!next.delete(id)) next.add(id)
          return next
        }),
      ),
    [],
  )

  if (isPending)
    return (
      <Panel title="All Locations">
        <TableSkeleton />
      </Panel>
    )

  if (!all) return <Panel title="All Locations">Failed to load locations</Panel>

  return (
    <Panel
      title="All Locations"
      action={
        canWrite && (
          <Button
            size="icon"
            aria-label="New location"
            render={<Link to="/locations/new" />}
          >
            <Plus />
          </Button>
        )
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        search={{ value: query, onChange: setQuery }}
        searchPlaceholder="Search locations…"
        actions={<StatusFilter value={statuses} onChange={setStatuses} />}
        onRowClick={(row) =>
          navigate({
            to: '/locations/$locationId',
            params: { locationId: row.location.id },
          })
        }
      />
    </Panel>
  )
}
