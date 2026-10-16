import { useListBuildings } from '#/api/buildings/buildings'
import type { BuildingResponse } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { LifecycleBadge } from '#/components/lifecycle-badge'
import { formatAddress } from '#/lib/address'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import {
  DEFAULT_LIFECYCLE_STATUSES,
  isDefaultLifecycleStatuses,
} from '#/lib/lifecycle'
import { Button } from '#/components/ui/button'
import { keepPreviousData } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusFilter } from '#/components/status-filter'
import { Panel } from '#/components/panel'
import { TableSkeleton } from '#/components/data-table/table-skeleton'
import { useCan } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated/_nav/buildings/')({
  component: AllBuildings,
})

const columnHelper = createColumnHelper<DataTableFeatures, BuildingResponse>()

// Built in a hook so the headers follow the interface language.
function useColumns() {
  const { t } = useTranslation(['buildings', 'common'])

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('list.name')}
            </DataTableColumnHeader>
          ),
          filterFn: (row, _columnId, filterValue) => {
            const needle = String(filterValue).toLowerCase()

            return (
              row.original.name.toLowerCase().includes(needle) ||
              formatAddress(row.original.address).toLowerCase().includes(needle)
            )
          },
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
        columnHelper.accessor((building) => building.address?.city ?? '', {
          id: 'city',
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('list.city')}
            </DataTableColumnHeader>
          ),
          sortFn: 'text',
          meta: { width: '10rem' },
          cell: ({ row, getValue }) => (
            <span
              className="text-muted-foreground"
              title={formatAddress(row.original.address)}
            >
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor('status', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('common:lifecycle.label')}
            </DataTableColumnHeader>
          ),
          meta: { width: '9rem' },
          cell: ({ getValue }) => <LifecycleBadge status={getValue()} />,
        }),
        columnHelper.accessor('updatedAt', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('list.updated')}
            </DataTableColumnHeader>
          ),
          sortFn: 'datetime',
          sortDescFirst: true,
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
      ]),
    [t],
  )
}

function AllBuildings() {
  const { t } = useTranslation('buildings')
  const columns = useColumns()
  const canWrite = useCan('records:write')
  const [statuses, setStatuses] = useState(DEFAULT_LIFECYCLE_STATUSES)
  const { data: buildings, isPending } = useListBuildings(
    { status: statuses },
    { query: { placeholderData: keepPreviousData } },
  )
  const navigate = useNavigate()

  const newBuilding = canWrite && (
    <Button
      size="icon"
      aria-label={t('list.new')}
      render={<Link to="/buildings/new" />}
      nativeButton={false}
    >
      <Plus />
    </Button>
  )

  if (isPending) {
    return (
      <Panel title={t('list.title')} action={newBuilding}>
        <TableSkeleton />
      </Panel>
    )
  }

  if (!buildings || buildings.status !== 200) {
    return (
      <Panel title={t('list.title')} action={newBuilding}>
        {t('list.loadFailed')}
      </Panel>
    )
  }

  return (
    <Panel title={t('list.title')} action={newBuilding}>
      <DataTable
        columns={columns}
        data={buildings.data}
        searchColumn="name"
        searchPlaceholder={t('list.search')}
        actions={<StatusFilter value={statuses} onChange={setStatuses} />}
        onClearFilters={
          isDefaultLifecycleStatuses(statuses)
            ? undefined
            : () => setStatuses(DEFAULT_LIFECYCLE_STATUSES)
        }
        onRowClick={(building) =>
          navigate({
            to: '/buildings/$buildingId',
            params: { buildingId: building.id },
          })
        }
      />
    </Panel>
  )
}
