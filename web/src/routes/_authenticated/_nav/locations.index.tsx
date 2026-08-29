import { useListLocationTree } from '#/api/locations/locations'
import type { LocationTreeResponse } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { formatAddress } from '#/lib/address'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import {
  lifecycleStatusLabels,
  DEFAULT_LIFECYCLE_STATUSES,
} from '#/lib/lifecycle'
import { keepPreviousData } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { StatusFilter } from '#/components/status-filter'
import { Panel } from '#/components/panel'
import { useCan } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated/_nav/locations/')({
  component: AllLocations,
})

/** One step of nesting, in the same units the guide elbow is drawn in. */
const INDENT_REM = 1.25

const columnHelper = createColumnHelper<
  DataTableFeatures,
  LocationTreeResponse
>()

// No sortable headers anywhere in this table on purpose: the rows arrive in
// tree order and sorting any column would scatter children away from parents,
// leaving the indentation describing a shape that is no longer on screen.
export const columns = columnHelper.columns([
  columnHelper.accessor('name', {
    header: () => 'Name',
    cell: ({ row, getValue }) => {
      const { depth, address } = row.original
      const line = formatAddress(address)

      return (
        <div
          className="flex items-start gap-1.5"
          style={{ paddingInlineStart: `${depth * INDENT_REM}rem` }}
        >
          {depth > 0 && (
            <span
              aria-hidden
              className="mt-1.5 -ml-3 size-3 shrink-0 rounded-bl border-b border-l border-border"
            />
          )}
          <div className="grid min-w-0 gap-0.5">
            <Link
              to="/locations/$locationId"
              params={{ locationId: row.original.id }}
              className="block truncate font-medium hover:underline"
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
  columnHelper.accessor('status', {
    header: () => 'Status',
    meta: { width: '9rem' },
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {lifecycleStatusLabels[getValue()]}
      </span>
    ),
  }),
  columnHelper.accessor('updatedAt', {
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

function AllLocations() {
  const canWrite = useCan('records:write')
  const [statuses, setStatuses] = useState(DEFAULT_LIFECYCLE_STATUSES)
  const { data: locations, isPending } = useListLocationTree(
    { status: statuses },
    { query: { placeholderData: keepPreviousData } },
  )
  const navigate = useNavigate()

  if (isPending)
    return (
      <Panel title="All Locations">
        <TableSkeleton />
      </Panel>
    )

  if (!locations || locations.status != 200)
    return <Panel title="All Locations">Failed to load locations</Panel>

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
        data={locations.data}
        searchColumn="name"
        searchPlaceholder="Search locations…"
        actions={<StatusFilter value={statuses} onChange={setStatuses} />}
        onRowClick={(location) =>
          navigate({
            to: '/locations/$locationId',
            params: { locationId: location.id },
          })
        }
      />
    </Panel>
  )
}

function TableSkeleton() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="flex gap-4" key={index}>
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
