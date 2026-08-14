import { useListBuildings } from '#/api/buildings/buildings'
import type { BuildingResponse } from '#/api/model'
import { ListBuildingsStatusItem } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/formate-date'
import {
  lifecycleStatusLabels,
  lifecycleStatusOptions,
} from '#/lib/lifecycle'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { keepPreviousData } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ListFilter, Plus } from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import { Skeleton } from '#/components/ui/skeleton'
import { useState, type ReactNode } from 'react'

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
  columnHelper.accessor("status", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Status</DataTableColumnHeader>
    ),
    meta: { width: "9rem" },
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {lifecycleStatusLabels[getValue()]}
      </span>
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
  const [statuses, setStatuses] = useState<ListBuildingsStatusItem[]>([
    ListBuildingsStatusItem.planned,
    ListBuildingsStatusItem.active,
  ])
  const { data: buildings, isPending } = useListBuildings(
    { status: statuses },
    { query: { placeholderData: keepPreviousData } }
  )
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
        actions={<StatusFilter value={statuses} onChange={setStatuses} />}
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

function StatusFilter({
  value,
  onChange,
}: {
  value: ListBuildingsStatusItem[]
  onChange: (statuses: ListBuildingsStatusItem[]) => void
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
              disabled={checked && value.length === 1}
              onCheckedChange={(next) => {
                const selected = new Set(value)
                if (next) selected.add(status)
                else selected.delete(status)
                onChange(
                  lifecycleStatusOptions
                    .map(([item]) => item)
                    .filter((item) => selected.has(item))
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