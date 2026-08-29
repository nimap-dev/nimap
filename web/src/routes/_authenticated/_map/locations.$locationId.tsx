import {
  getGetLocationQueryKey,
  getListLocationTreeQueryKey,
  getListLocationsQueryKey,
  useDeleteLocation,
  useGetLocation,
  useListLocations,
  useUpdateLocationStatus,
} from '#/api/locations/locations'
import { Detail, DetailEmpty, DetailList } from '#/components/detail-list'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { useCan } from '#/lib/auth'
import { formatCoordinates } from '#/components/form/representative-point-field'
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
} from '#/components/ui/alert-dialog'
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
import type { LifecycleStatus } from '#/lib/lifecycle'
import { multiPolygonBounds, useWorldMap } from '#/lib/map'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Crosshair, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute(
  '/_authenticated/_map/locations/$locationId',
)({
  component: ViewLocation,
})

function ViewLocation() {
  const { locationId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetLocation(locationId)
  const { flyTo, fitBounds } = useWorldMap()
  const updateStatus = useUpdateLocationStatus()
  const deleteLocation = useDeleteLocation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const location = data?.status === 200 ? data.data : undefined

  const { data: siblings } = useListLocations()
  const all = siblings?.status === 200 ? siblings.data : []
  const children = all.filter((item) => item.parentId === locationId)
  const parent = all.find((item) => item.id === location?.parentId)

  const area = location?.area
  const point = location?.representativePoint

  function frame() {
    const bounds = area && multiPolygonBounds(area)

    if (bounds) {
      fitBounds(bounds)
      return
    }

    const [longitude, latitude] = point?.coordinates ?? []

    flyTo(longitude, latitude, 15)
  }

  useEffect(frame, [area, point, fitBounds, flyTo])

  async function refreshLists() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }),
      queryClient.invalidateQueries({
        queryKey: getListLocationTreeQueryKey(),
      }),
    ])
  }

  // Reversible, so it applies straight away rather than behind a confirmation.
  async function handleStatusChange(status: LifecycleStatus) {
    try {
      const res = await updateStatus.mutateAsync({
        id: locationId,
        data: { status },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: 'Could not change the status',
          description: res.data.detail ?? 'The location stayed as it was',
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
      queryKey: getGetLocationQueryKey(locationId),
    })
    await refreshLists()
    toast.add({
      type: 'success',
      description: `Now ${lifecycleStatusLabels[status].toLowerCase()}`,
    })
  }

  async function handleDelete() {
    const name = location?.name ?? 'The location'

    try {
      const res = await deleteLocation.mutateAsync({ id: locationId })

      if (res.status !== 204) {
        // A 409 carries how many locations are still nested inside this one.
        toast.add({
          type: 'error',
          title: 'Could not delete',
          description: res.data.detail ?? `${name} is still there`,
        })
        setConfirmingDelete(false)
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
    queryClient.removeQueries({ queryKey: getGetLocationQueryKey(locationId) })
    await refreshLists()
    toast.add({ type: 'success', description: `${name} was deleted` })
    navigate({ to: '/locations', replace: true })
  }

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/locations" />}
        backLabel="Back to locations"
      />
    )
  }

  if (!location) {
    return (
      <PanelNotFound
        noun="location"
        back={<Link to="/locations" />}
        backLabel="Back to locations"
      />
    )
  }

  const address = formatAddress(location.address)

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={location.name}
        back={<Link to="/locations" />}
        backLabel="Back to locations"
        action={
          <>
            {(area || point) && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Frame this location"
                onClick={frame}
              >
                <Crosshair />
              </Button>
            )}
            {canWrite && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit location"
                  render={
                    <Link
                      to="/locations/$locationId/edit"
                      params={{ locationId }}
                    />
                  }
                >
                  <Pencil />
                </Button>
                <AlertDialogTrigger
                  aria-label="Delete location"
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
        {location.notes && (
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {location.notes}
          </p>
        )}

        <DetailList>
          <Detail label="Status" align="center">
            <Select
              items={lifecycleStatusLabels}
              value={location.status}
              onValueChange={(value) =>
                handleStatusChange(value as LifecycleStatus)
              }
              disabled={!canWrite || updateStatus.isPending}
            >
              <SelectTrigger size="sm" aria-label="Location status">
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

          <Detail label="Address" title={address}>
            {address || <DetailEmpty>Not recorded</DetailEmpty>}
          </Detail>

          <Detail label="Inside">
            {parent ? (
              <Link
                to="/locations/$locationId"
                params={{ locationId: parent.id }}
                className="hover:underline"
              >
                {parent.name}
              </Link>
            ) : (
              <DetailEmpty>Nothing</DetailEmpty>
            )}
          </Detail>

          <Detail label="Boundary">
            {area ? (
              `${area.coordinates.length} ${area.coordinates.length === 1 ? 'part' : 'parts'}`
            ) : (
              <DetailEmpty>Not drawn</DetailEmpty>
            )}
          </Detail>

          <Detail label="Map point">
            {point ? (
              <>
                {formatCoordinates(point)}
                {!location.representativePointManual && (
                  <span className="text-muted-foreground"> · derived</span>
                )}
              </>
            ) : (
              <DetailEmpty>Not placed</DetailEmpty>
            )}
          </Detail>

          <Detail
            label="Updated"
            title={formatAbsoluteDate(location.updatedAt)}
          >
            {formatRelativeDate(location.updatedAt)}
          </Detail>
        </DetailList>

        {children.length > 0 && (
          <section className="grid gap-2">
            <h3 className="text-sm font-medium">
              Inside this location
              <span className="ml-1.5 text-muted-foreground">
                {children.length}
              </span>
            </h3>
            <ul className="grid gap-px overflow-hidden rounded-lg border">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    to="/locations/$locationId"
                    params={{ locationId: child.id }}
                    className="flex items-center gap-2 bg-background px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {child.name}
                      {!child.area && (
                        <span className="text-muted-foreground">
                          {' · no boundary'}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {lifecycleStatusLabels[child.status]}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Panel>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {location.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting is for fixing mistakes: a duplicate, or one added by
            accident. If the location went out of service, set its status to
            Decommissioned instead: it keeps its history, stays searchable, and
            only drops off the map. Deletion is refused while other locations
            are still nested inside this one, and you can't undo it from here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={deleteLocation.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteLocation.isPending}
            onClick={handleDelete}
          >
            {deleteLocation.isPending ? 'Deleting…' : 'Delete location'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
