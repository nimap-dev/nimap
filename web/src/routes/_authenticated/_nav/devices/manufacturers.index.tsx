import { useListManufacturers } from '#/api/manufacturers/manufacturers'
import type { ManufacturerResponse } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { MutedCell } from '#/components/data-table/muted-cell'
import { TableSkeleton } from '#/components/data-table/table-skeleton'
import { Panel } from '#/components/panel'
import { Button } from '#/components/ui/button'
import { useCan } from '#/lib/auth'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/manufacturers/',
)({
  component: RouteComponent,
})

const columnHelper = createColumnHelper<
  DataTableFeatures,
  ManufacturerResponse
>()

// Built in a hook so the headers follow the interface language.
function useColumns() {
  const { t } = useTranslation('manufacturers')

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.name')}
            </DataTableColumnHeader>
          ),
          sortFn: 'text',
          filterFn: (row, _columnId, filterValue) => {
            const needle = String(filterValue).toLowerCase()

            return (
              row.original.name.toLowerCase().includes(needle) ||
              (row.original.website?.toLowerCase().includes(needle) ?? false)
            )
          },
          cell: ({ row, getValue }) => (
            <Link
              to="/devices/manufacturers/$manufacturerId"
              params={{ manufacturerId: row.original.id }}
              className="block truncate font-medium hover:underline"
            >
              {getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor('website', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.website')}
            </DataTableColumnHeader>
          ),
          sortFn: 'text',
          cell: ({ getValue }) => {
            if (getValue()) {
              return (
                <a
                  className="block truncate text-muted-foreground hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={getValue()}
                >
                  {getValue()}
                </a>
              )
            }

            return <MutedCell />
          },
        }),
        columnHelper.accessor('updatedAt', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.updated')}
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

function RouteComponent() {
  const { t } = useTranslation('manufacturers')
  const columns = useColumns()
  const canWrite = useCan('records:write')
  const { data: manufacturers, isPending } = useListManufacturers()
  const navigate = useNavigate()

  if (isPending)
    return (
      <Panel title={t('list.title')}>
        <TableSkeleton />
      </Panel>
    )

  if (!manufacturers || manufacturers.status != 200)
    return <Panel title={t('list.title')}>{t('list.loadFailed')}</Panel>

  return (
    <Panel
      title={t('list.title')}
      action={
        canWrite && (
          <Button
            size="icon"
            aria-label={t('list.new')}
            render={<Link to="/devices/manufacturers/new" />}
            nativeButton={false}
          >
            <Plus />
          </Button>
        )
      }
    >
      <DataTable
        columns={columns}
        data={manufacturers.data}
        searchColumn="name"
        searchPlaceholder={t('list.search')}
        onRowClick={(manufacturer) =>
          navigate({
            to: '/devices/manufacturers/$manufacturerId',
            params: { manufacturerId: manufacturer.id },
          })
        }
      />
    </Panel>
  )
}
