import { useListBuildings } from '#/api/buildings/buildings'
import type { BuildingResponse } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/formate-date'
import { Button } from '#/components/ui/button'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import { Skeleton } from '#/components/ui/skeleton'
import type { ReactNode } from 'react'

export const Route = createFileRoute('/_authenticated/_nav/buildings/')({
  component: AllBuildings
})

const columnHelper = createColumnHelper<DataTableFeatures, BuildingResponse>()

export const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Name</DataTableColumnHeader>
    ),
    cell: ({ row, getValue }) => (
      <div className="grid gap-0.5">
        <Link
          to="/buildings/$buildingId"
          params={{ buildingId: row.original.id }}
          className="block truncate font-medium hover:underline"
        >
          {getValue()}
        </Link>
        {row.original.notes && (
          <span
            className="block truncate text-xs text-muted-foreground"
            title={row.original.notes}
          >
            {row.original.notes}
          </span>
        )}
      </div>
    ),
  }),
  columnHelper.accessor("updatedAt", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Updated</DataTableColumnHeader>
    ),
    sortFn: "datetime",
    sortDescFirst: true,
    meta: { width: "7.5rem" },
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

function AllBuildings() {
  const { data: buildings, isPending } = useListBuildings()
  const navigate = useNavigate()
  if (isPending) return (
    <Panel title="All Buildings">
      <TableSkeleton />
    </Panel>
  )
  if (!buildings || buildings.status != 200) return (
    <Panel title="All Buildings">
      Failed to load buildings
    </Panel>
  )

  return (
    <Panel
      title="All Buildings"
      action={
        <Button size="icon" aria-label="New building" render={<Link to="/buildings/new" />}>
          <Plus />
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={buildings.data}
        searchColumn="name"
        searchPlaceholder="Search buildings…"
        onRowClick={(building) =>
          navigate({
            to: "/buildings/$buildingId",
            params: { buildingId: building.id },
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

function Panel({
  title,
  action,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b p-2 h-12">
        <h2 className="min-w-0 flex-1 truncate font-medium">{title}</h2>
        {action}
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto p-3">{children}</div>
    </div>
  )
}