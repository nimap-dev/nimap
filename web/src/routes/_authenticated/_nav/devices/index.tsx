import { useListDevices } from '#/api/devices/devices'
import { useListDeviceTypes } from '#/api/device-types/device-types'
import { useListManufacturers } from '#/api/manufacturers/manufacturers'
import { DeviceResponseStatus } from '#/api/model'
import type { DeviceResponse } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { MutedCell } from '#/components/data-table/muted-cell'
import { TableSkeleton } from '#/components/data-table/table-skeleton'
import { DeviceTypeIcon } from '#/components/device-type-icon'
import { FilterSelect } from '#/components/filter-select'
import { RelativeDate } from '#/components/formatted-date'
import { LifecycleBadge } from '#/components/lifecycle-badge'
import { Panel } from '#/components/panel'
import { StatusFilter } from '#/components/status-filter'
import { Button } from '#/components/ui/button'
import { useCan } from '#/lib/auth'
import { formatDeviceModel } from '#/lib/devices'
import {
  DEFAULT_LIFECYCLE_STATUSES,
  isDefaultLifecycleStatuses,
} from '#/lib/lifecycle'
import { keepPreviousData } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as zod from 'zod'

/** The filters live in the URL, named like the API's query parameters. */
const searchSchema = zod.object({
  status: zod
    .array(zod.enum(DeviceResponseStatus))
    .min(1)
    .optional()
    .catch(undefined),
  deviceTypeId: zod.string().optional().catch(undefined),
  manufacturerId: zod.string().optional().catch(undefined),
})

type DeviceListSearch = zod.infer<typeof searchSchema>

export const Route = createFileRoute('/_authenticated/_nav/devices/')({
  validateSearch: searchSchema,
  component: AllDevices,
})

const columnHelper = createColumnHelper<DataTableFeatures, DeviceResponse>()

function useColumns() {
  const { t } = useTranslation(['devices', 'common'])

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('code', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.code')}
            </DataTableColumnHeader>
          ),
          sortFn: 'alphanumeric',
          meta: { width: '7rem' },
          cell: ({ getValue }) => (
            <span className="block truncate font-mono text-sm">
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor('name', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.name')}
            </DataTableColumnHeader>
          ),
          sortFn: 'text',
          filterFn: (row, _columnId, filterValue) => {
            const needle = String(filterValue).toLowerCase()
            const device = row.original

            return [
              device.code,
              device.name,
              device.physicalLabel,
              device.model?.name,
              device.manufacturer?.name,
              device.deviceType.name,
              device.serialNumber,
              device.inventoryNumber,
              device.managementIp,
              device.hostname,
            ].some((text) => text?.toLowerCase().includes(needle))
          },
          cell: ({ row }) => (
            <Link
              to="/devices/$deviceId"
              params={{ deviceId: row.original.id }}
              className="block truncate font-medium hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        }),
        columnHelper.accessor((device) => device.deviceType.name, {
          id: 'type',
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.type')}
            </DataTableColumnHeader>
          ),
          sortFn: 'text',
          meta: { width: '9rem' },
          cell: ({ row, getValue }) => (
            <span className="flex min-w-0 items-center gap-2">
              <DeviceTypeIcon type={row.original.deviceType} />
              <span className="truncate">{getValue()}</span>
            </span>
          ),
        }),
        columnHelper.accessor((device) => formatDeviceModel(device) ?? '', {
          id: 'model',
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.model')}
            </DataTableColumnHeader>
          ),
          sortFn: 'text',
          cell: ({ getValue }) =>
            getValue() ? (
              <span className="block truncate">{getValue()}</span>
            ) : (
              <MutedCell>{t('list.noModel')}</MutedCell>
            ),
        }),
        columnHelper.accessor((device) => device.serialNumber ?? '', {
          id: 'serialNumber',
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.serialNumber')}
            </DataTableColumnHeader>
          ),
          sortFn: 'alphanumeric',
          meta: { width: '9rem' },
          cell: ({ getValue }) => <MutedCell>{getValue()}</MutedCell>,
        }),
        columnHelper.accessor((device) => device.inventoryNumber ?? '', {
          id: 'inventoryNumber',
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.inventoryNumber')}
            </DataTableColumnHeader>
          ),
          sortFn: 'alphanumeric',
          meta: { width: '9rem' },
          cell: ({ getValue }) => <MutedCell>{getValue()}</MutedCell>,
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
              {t('fields.updated')}
            </DataTableColumnHeader>
          ),
          sortFn: 'datetime',
          sortDescFirst: true,
          meta: { width: '9rem' },
          cell: ({ getValue }) => (
            <RelativeDate
              value={getValue()}
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t],
  )
}

function AllDevices() {
  const { t } = useTranslation('devices')
  const columns = useColumns()
  const canWrite = useCan('records:write')
  const navigate = useNavigate()
  const search = Route.useSearch()
  const navigateSearch = Route.useNavigate()
  const { deviceTypeId, manufacturerId } = search
  const statuses = search.status ?? DEFAULT_LIFECYCLE_STATUSES

  function setFilter(patch: Partial<DeviceListSearch>) {
    navigateSearch({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    })
  }

  const { data: devices, isPending } = useListDevices(
    { status: statuses, deviceTypeId, manufacturerId },
    { query: { placeholderData: keepPreviousData } },
  )
  const { data: types } = useListDeviceTypes()
  const { data: manufacturers } = useListManufacturers()

  const typeOptions =
    types?.status === 200
      ? types.data.map((type) => ({
          value: type.id,
          label: type.name,
          icon: <DeviceTypeIcon type={type} />,
        }))
      : []
  const manufacturerOptions =
    manufacturers?.status === 200
      ? manufacturers.data.map((manufacturer) => ({
          value: manufacturer.id,
          label: manufacturer.name,
        }))
      : []

  const newDevice = canWrite && (
    <Button
      size="icon"
      aria-label={t('list.new')}
      render={<Link to="/devices/new" />}
      nativeButton={false}
    >
      <Plus />
    </Button>
  )

  if (isPending) {
    return (
      <Panel title={t('list.title')} action={newDevice}>
        <TableSkeleton />
      </Panel>
    )
  }

  if (!devices || devices.status !== 200) {
    return (
      <Panel title={t('list.title')} action={newDevice}>
        {t('list.loadFailed')}
      </Panel>
    )
  }

  return (
    <Panel title={t('list.title')} action={newDevice}>
      <DataTable
        columns={columns}
        data={devices.data}
        searchColumn="name"
        searchPlaceholder={t('list.search')}
        actions={
          <>
            <FilterSelect
              label={t('list.filterType')}
              anyLabel={t('list.anyType')}
              value={deviceTypeId}
              onChange={(value) => setFilter({ deviceTypeId: value })}
              options={typeOptions}
            />
            <FilterSelect
              label={t('list.filterManufacturer')}
              anyLabel={t('list.anyManufacturer')}
              value={manufacturerId}
              onChange={(value) => setFilter({ manufacturerId: value })}
              options={manufacturerOptions}
            />
            <StatusFilter
              value={statuses}
              onChange={(value) =>
                setFilter({
                  status: isDefaultLifecycleStatuses(value) ? undefined : value,
                })
              }
            />
          </>
        }
        onClearFilters={
          deviceTypeId || manufacturerId || search.status
            ? () => navigateSearch({ search: {}, replace: true })
            : undefined
        }
        onRowClick={(device) =>
          navigate({
            to: '/devices/$deviceId',
            params: { deviceId: device.id },
          })
        }
      />
    </Panel>
  )
}
