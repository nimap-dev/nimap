import {
  getGetBuildingQueryKey,
  getListBuildingsQueryKey,
  useDeleteBuilding,
  useGetBuilding,
  useUpdateBuildingStatus,
} from '#/api/buildings/buildings'
import type { BuildingResponseStatus } from '#/api/model'
import { AssetList } from '#/components/asset-list'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { Skeleton } from '#/components/ui/skeleton'
import { useCan } from '#/lib/auth'
import { Detail, DetailEmpty, DetailList } from '#/components/detail-list'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from '#/components/ui/toast'
import { formatAddress } from '#/lib/address'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { lifecycleStatusLabels, lifecycleStatusOptions } from '#/lib/lifecycle'
import { useWorldMap } from '#/lib/map'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Crosshair, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useGetLocation } from '#/api/locations/locations'

export const Route = createFileRoute(
  '/_authenticated/_map/buildings/$buildingId',
)({ component: ViewBuilding })

function ViewBuilding() {
  const { buildingId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetBuilding(buildingId)
  const deleteBuilding = useDeleteBuilding()
  const updateStatus = useUpdateBuildingStatus()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { flyTo } = useWorldMap()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const building = data?.status === 200 ? data.data : undefined
  const [longitude, latitude] = building?.representativePoint.coordinates ?? []

  useEffect(() => {
    flyTo(longitude, latitude, 17)
  }, [longitude, latitude, flyTo])

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/buildings" />}
        backLabel="Back to buildings"
      />
    )
  }

  if (!building) {
    return (
      <PanelNotFound
        noun="building"
        back={<Link to="/buildings" />}
        backLabel="Back to buildings"
      />
    )
  }

  // Captured before the request: after a successful delete the query is gone.
  const name = building.name

  async function handleStatusChange(status: BuildingResponseStatus) {
    try {
      const res = await updateStatus.mutateAsync({
        id: buildingId,
        data: { status },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: 'Could not change the status',
          description: res.data.detail ?? `${name} stayed as it was`,
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: 'Could not change the status',
        description: 'The request failed, check your connection and retry',
      })
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetBuildingQueryKey(buildingId),
    })
    await queryClient.invalidateQueries({
      queryKey: getListBuildingsQueryKey(),
    })
    toast.add({
      type: 'success',
      description: `${name} is now ${lifecycleStatusLabels[status].toLowerCase()}`,
    })
  }

  async function handleDelete() {
    try {
      const res = await deleteBuilding.mutateAsync({ id: buildingId })

      if (res.status !== 204) {
        toast.add({
          type: 'error',
          title: 'Could not delete',
          description: res.data.detail ?? `${name} is still there`,
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: 'Could not delete',
        description: 'The request failed, check your connection and retry',
      })
      return
    }

    setConfirmingDelete(false)
    queryClient.removeQueries({ queryKey: getGetBuildingQueryKey(buildingId) })
    await queryClient.invalidateQueries({
      queryKey: getListBuildingsQueryKey(),
    })
    toast.add({ type: 'success', description: `${name} was deleted` })
    navigate({ to: '/buildings', replace: true })
  }

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={building.name}
        back={<Link to="/buildings" />}
        backLabel="Back to buildings"
        action={
          <>
            {
              <Button
                variant="ghost"
                size="icon"
                onClick={() => flyTo(longitude, latitude, 17)}
              >
                <Crosshair />
              </Button>
            }
            {canWrite && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit building"
                  render={
                    <Link
                      to="/buildings/$buildingId/edit"
                      params={{ buildingId }}
                    />
                  }
                  nativeButton={false}
                >
                  <Pencil />
                </Button>
                <AlertDialogTrigger
                  aria-label="Delete building"
                  render={<Button variant="ghost" size="icon" />}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 />
                </AlertDialogTrigger>
              </>
            )}
          </>
        }
      >
        {building.notes && (
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {building.notes}
          </p>
        )}

        <DetailList>
          <Detail label="Status" align="center">
            <Select
              items={lifecycleStatusLabels}
              value={building.status}
              onValueChange={(value) =>
                handleStatusChange(value as BuildingResponseStatus)
              }
              disabled={!canWrite || updateStatus.isPending}
            >
              <SelectTrigger size="sm" aria-label="Building status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lifecycleStatusOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Detail>

          <Detail label="Location">
            {building.locationId ? (
              <BuildingLocation locationId={building.locationId} />
            ) : (
              <DetailEmpty>No location</DetailEmpty>
            )}
          </Detail>

          {formatAddress(building.address) && (
            <Detail label="Address">{formatAddress(building.address)}</Detail>
          )}

          <Detail label="Position">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Detail>

          <Detail
            label="Updated"
            title={formatAbsoluteDate(building.updatedAt)}
          >
            {formatRelativeDate(building.updatedAt)}
          </Detail>
          <Detail
            label="Created"
            title={formatAbsoluteDate(building.createdAt)}
          >
            {formatRelativeDate(building.createdAt)}
          </Detail>
        </DetailList>

        <AssetList resourceType="building" resourceId={buildingId} />
      </Panel>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {building.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting is for fixing mistakes: a duplicate, or a footprint drawn
            by accident. If the building went out of service, set its status to
            Decommissioned instead: it keeps its history, stays searchable, and
            only drops off the map. Deletion is refused once floors, devices or
            cables reference this building, and you can't undo it from here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={deleteBuilding.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteBuilding.isPending}
            onClick={handleDelete}
          >
            {deleteBuilding.isPending ? 'Deleting…' : 'Delete building'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * The location a building stands in. Only the id comes back on the building, so
 * the name is fetched here rather than at the top of the page: the request is
 * the one the location page itself makes, and it is skipped entirely for a
 * building that has not been placed.
 */
function BuildingLocation({ locationId }: { locationId: string }) {
  const { data, isPending } = useGetLocation(locationId)
  const location = data?.status === 200 ? data.data : undefined

  if (isPending) return <Skeleton className="h-4 w-24" />

  // A location the building points at but nobody can read is still worth
  // linking: the link says where to look, the id says which one.
  return (
    <Link
      to="/locations/$locationId"
      params={{ locationId }}
      className="truncate hover:underline"
    >
      {location?.name ?? 'View location'}
    </Link>
  )
}
