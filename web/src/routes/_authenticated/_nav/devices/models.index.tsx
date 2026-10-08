import { useListDeviceModels } from '#/api/device-models/device-models'
import { useListDeviceTypes } from '#/api/device-types/device-types'
import { useListManufacturers } from '#/api/manufacturers/manufacturers'
import {
  DeviceModelResponseMounting,
  DeviceModelResponseStatus,
} from '#/api/model'
import type { DeviceModelResponse } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { MutedCell } from '#/components/data-table/muted-cell'
import { TableSkeleton } from '#/components/data-table/table-skeleton'
import { DeviceTypeIcon } from '#/components/device-type-icon'
import { FilterSelect } from '#/components/filter-select'
import { LifecycleBadge } from '#/components/lifecycle-badge'
import { Panel } from '#/components/panel'
import { StatusFilter } from '#/components/status-filter'
import { Button } from '#/components/ui/button'
import { useCan } from '#/lib/auth'
import {
  formatFormFactor,
  formatModelName,
  formatPoe,
  mountingOptions,
} from '#/lib/device-models'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import {
  DEFAULT_LIFECYCLE_STATUSES,
  isDefaultLifecycleStatuses,
} from '#/lib/lifecycle'
import { keepPreviousData } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import * as zod from 'zod'

/**
 * The filters live in the URL, so a filtered list can be linked, bookmarked
 * and reached again with the back button. The names match the API's query
 * parameters. A value that does not parse is dropped rather than failing the
 * page, and the default statuses are never written, so the plain list stays
 * at a plain /devices/models.
 */
const searchSchema = zod.object({
  status: zod
    .array(zod.enum(DeviceModelResponseStatus))
    .min(1)
    .optional()
    .catch(undefined),
  deviceTypeId: zod.string().optional().catch(undefined),
  manufacturerId: zod.string().optional().catch(undefined),
  mounting: zod.enum(DeviceModelResponseMounting).optional().catch(undefined),
})

type ModelListSearch = zod.infer<typeof searchSchema>

export const Route = createFileRoute('/_authenticated/_nav/devices/models/')({
  validateSearch: searchSchema,
  component: AllDeviceModels,
})

const columnHelper = createColumnHelper<
  DataTableFeatures,
  DeviceModelResponse
>()

const columns = columnHelper.columns([
  columnHelper.accessor((model) => model.deviceType.name, {
    id: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Type</DataTableColumnHeader>
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
  columnHelper.accessor('name', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Model</DataTableColumnHeader>
    ),
    sortFn: 'text',
    filterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).toLowerCase()
      const model = row.original

      return [
        model.name,
        model.variant,
        model.partNumber,
        model.manufacturer.name,
        model.deviceType.name,
      ].some((text) => text?.toLowerCase().includes(needle))
    },
    cell: ({ row }) => (
      <div className="grid gap-0.5">
        <Link
          to="/devices/models/$modelId"
          params={{ modelId: row.original.id }}
          className="block truncate font-medium hover:underline"
        >
          {formatModelName(row.original)}
        </Link>
        {row.original.partNumber && (
          <span
            className="block truncate text-xs text-muted-foreground"
            title={row.original.partNumber}
          >
            {row.original.partNumber}
          </span>
        )}
      </div>
    ),
  }),
  columnHelper.accessor((model) => model.manufacturer.name, {
    id: 'manufacturer',
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>
        Manufacturer
      </DataTableColumnHeader>
    ),
    sortFn: 'text',
    meta: { width: '10rem' },
    cell: ({ getValue }) => (
      <span className="block truncate">{getValue()}</span>
    ),
  }),
  columnHelper.accessor((model) => formatFormFactor(model), {
    id: 'formFactor',
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Form factor</DataTableColumnHeader>
    ),
    sortFn: 'text',
    meta: { width: '8rem' },
    cell: ({ getValue }) => <MutedCell>{getValue()}</MutedCell>,
  }),
  columnHelper.accessor((model) => formatPoe(model), {
    id: 'poe',
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>PoE</DataTableColumnHeader>
    ),
    sortFn: 'text',
    meta: { width: '6rem' },
    cell: ({ getValue }) => <MutedCell>{getValue()}</MutedCell>,
  }),
  columnHelper.accessor('status', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Status</DataTableColumnHeader>
    ),
    meta: { width: '9rem' },
    cell: ({ getValue }) => <LifecycleBadge status={getValue()} />,
  }),
  columnHelper.accessor('updatedAt', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Updated</DataTableColumnHeader>
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
])

function AllDeviceModels() {
  const canWrite = useCan('records:write')
  const navigate = useNavigate()
  const search = Route.useSearch()
  const navigateSearch = Route.useNavigate()
  const { deviceTypeId, manufacturerId, mounting } = search
  const statuses = search.status ?? DEFAULT_LIFECYCLE_STATUSES

  // Replacing rather than pushing: each pick is a refinement of the same view,
  // and the back button should leave the list, not undo filters one by one.
  function setFilter(patch: Partial<ModelListSearch>) {
    navigateSearch({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    })
  }

  const { data: models, isPending } = useListDeviceModels(
    { status: statuses, deviceTypeId, manufacturerId, mounting },
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

  const newModel = canWrite && (
    <Button
      size="icon"
      aria-label="New device model"
      render={<Link to="/devices/models/new" />}
      nativeButton={false}
    >
      <Plus />
    </Button>
  )

  if (isPending) {
    return (
      <Panel title="Device models" action={newModel}>
        <TableSkeleton />
      </Panel>
    )
  }

  if (!models || models.status !== 200) {
    return (
      <Panel title="Device models" action={newModel}>
        Failed to load device models
      </Panel>
    )
  }

  return (
    <Panel title="Device models" action={newModel}>
      <DataTable
        columns={columns}
        data={models.data}
        searchColumn="name"
        searchPlaceholder="Search models, part numbers, manufacturers…"
        actions={
          <>
            <FilterSelect
              label="Filter by type"
              anyLabel="Any type"
              value={deviceTypeId}
              onChange={(value) => setFilter({ deviceTypeId: value })}
              options={typeOptions}
            />
            <FilterSelect
              label="Filter by manufacturer"
              anyLabel="Any manufacturer"
              value={manufacturerId}
              onChange={(value) => setFilter({ manufacturerId: value })}
              options={manufacturerOptions}
            />
            <FilterSelect
              label="Filter by mounting"
              anyLabel="Any mounting"
              value={mounting}
              onChange={(value) => setFilter({ mounting: value })}
              options={mountingOptions.map(([value, label]) => ({
                value,
                label,
              }))}
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
        onRowClick={(model) =>
          navigate({
            to: '/devices/models/$modelId',
            params: { modelId: model.id },
          })
        }
      />
    </Panel>
  )
}
