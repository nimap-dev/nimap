import {
  getGetBuildingQueryKey,
  getListBuildingsQueryKey,
  useDeleteBuilding,
  useGetBuilding,
} from '#/api/buildings/buildings'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { toast } from '#/components/ui/toast'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/formate-date'
import { useWorldMap } from '#/lib/map'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Crosshair, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
} from "@/components/ui/alert-dialog"

export const Route = createFileRoute('/_authenticated/_map/buildings/$buildingId',)({ component: ViewBuilding })

function ViewBuilding() {
  const { buildingId } = Route.useParams()
  const { data, isPending } = useGetBuilding(buildingId)
  const deleteBuilding = useDeleteBuilding()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { flyTo } = useWorldMap()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const building = data?.status === 200 ? data.data : undefined
  const [longitude, latitude] = building?.representativePoint.coordinates ?? []

  useEffect(() => {
    if (longitude === undefined || latitude === undefined) return
    flyTo(longitude, latitude, 17)
  }, [longitude, latitude, flyTo])

  if (isPending) {
    return (
      <Panel title={<Skeleton className="h-4 w-40" />}>
        <Skeleton className="h-4 w-full" />
        <div className="grid gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Panel>
    )
  }

  if (!building) {
    return (
      <Panel title="Not found">
        <p className="text-sm text-muted-foreground">
          This building doesn't exist, or you don't have access to it.
        </p>
        <Button variant="outline" size="sm" render={<Link to="/buildings" />}>
          Back to buildings
        </Button>
      </Panel>
    )
  }

  // Captured before the request: after a successful delete the query is gone.
  const name = building.name

  async function handleDelete() {
    try {
      const res = await deleteBuilding.mutateAsync({ id: buildingId })

      if (res.status !== 204) {
        toast.add({
          type: "error",
          title: "Could not delete",
          description: res.data?.detail ?? `${name} is still there`,
        })
        return
      }
    } catch {
      toast.add({
        type: "error",
        title: "Could not delete",
        description: "The request failed, check your connection and retry",
      })
      return
    }

    setConfirmingDelete(false)
    queryClient.removeQueries({ queryKey: getGetBuildingQueryKey(buildingId) })
    await queryClient.invalidateQueries({
      queryKey: getListBuildingsQueryKey(),
    })
    toast.add({ type: "success", description: `${name} was deleted` })
    navigate({ to: "/buildings", replace: true })
  }

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={building.name}
        action={
          <>
            {longitude !== undefined && latitude !== undefined && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => flyTo(longitude, latitude, 17)}
              >
                <Crosshair />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit building"
              render={<Link to="/buildings/$buildingId/edit" params={{ buildingId }} />}
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
          </>}
      >
        {building.notes && (
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {building.notes}
          </p>
        )}
        <dl className="grid gap-2 text-sm">
          {longitude !== undefined && latitude !== undefined && (
            <Detail label="Position">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Detail>
          )}
          <Detail label="Updated" title={formatAbsoluteDate(building.updatedAt)}>
            {formatRelativeDate(building.updatedAt)}
          </Detail>
          <Detail label="Created" title={formatAbsoluteDate(building.createdAt)}>
            {formatRelativeDate(building.createdAt)}
          </Detail>
        </dl>
      </Panel>
      <AlertDialogContent size='sm'>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {building.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its footprint and notes disappear from the map and the buildings
            list. You can't undo this from here.
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
            {deleteBuilding.isPending ? "Deleting…" : "Delete building"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog >
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to buildings"
          render={<Link to="/buildings" />}
        >
          <ArrowLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate font-medium">{title}</h2>
        {action}
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto p-3">{children}</div>
    </div>
  )
}

function Detail({
  label,
  title,
  children,
}: {
  label: string
  title?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="truncate" title={title}>
        {children}
      </dd>
    </div>
  )
}