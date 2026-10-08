import {
  getGetDeviceModelQueryKey,
  getListDeviceModelsQueryKey,
  useDeleteDeviceModel,
  useGetDeviceModel,
  useUpdateDeviceModelStatus,
} from '#/api/device-models/device-models'
import { Detail, DetailEmpty, DetailList } from '#/components/detail-list'
import { DeviceTypeIcon } from '#/components/device-type-icon'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
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
import { useCan } from '#/lib/auth'
import {
  formatDimensions,
  formatModelName,
  mountingLabels,
  poeStandardLabels,
} from '#/lib/device-models'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { lifecycleStatusLabels, lifecycleStatusOptions } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/models/$modelId',
)({ component: ViewDeviceModel })

function ViewDeviceModel() {
  const { modelId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetDeviceModel(modelId)
  const updateStatus = useUpdateDeviceModelStatus()
  const deleteDeviceModel = useDeleteDeviceModel()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const model = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/devices/models" />}
        backLabel="Back to device models"
      />
    )
  }

  if (!model) {
    return (
      <PanelNotFound
        noun="device model"
        back={<Link to="/devices/models" />}
        backLabel="Back to device models"
      />
    )
  }

  // Captured before the request: after a successful delete the query is gone.
  const fullName = `${model.manufacturer.name} ${formatModelName(model)}`

  async function handleStatusChange(status: LifecycleStatus) {
    try {
      const res = await updateStatus.mutateAsync({
        id: modelId,
        data: { status },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: 'Could not change the status',
          description: res.data.detail ?? `${fullName} stayed as it was`,
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

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getGetDeviceModelQueryKey(modelId),
      }),
      queryClient.invalidateQueries({
        queryKey: getListDeviceModelsQueryKey(),
      }),
    ])
    toast.add({
      type: 'success',
      description: `${fullName} is now ${lifecycleStatusLabels[status].toLowerCase()}`,
    })
  }

  async function handleDelete() {
    try {
      const res = await deleteDeviceModel.mutateAsync({ id: modelId })

      if (res.status !== 204) {
        setConfirmingDelete(false)
        toast.add({
          type: 'error',
          title: 'Could not delete',
          description: res.data.detail ?? `${fullName} is still there`,
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
    queryClient.removeQueries({ queryKey: getGetDeviceModelQueryKey(modelId) })
    await queryClient.invalidateQueries({
      queryKey: getListDeviceModelsQueryKey(),
    })
    toast.add({ type: 'success', description: `${fullName} was deleted` })
    navigate({ to: '/devices/models', replace: true })
  }

  const dimensions = formatDimensions(model)

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={fullName}
        back={<Link to="/devices/models" />}
        backLabel="Back to device models"
        action={
          canWrite && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit device model"
                render={
                  <Link
                    to="/devices/models/$modelId/edit"
                    params={{ modelId }}
                  />
                }
                nativeButton={false}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Duplicate device model"
                title="Duplicate"
                render={
                  <Link to="/devices/models/new" search={{ from: modelId }} />
                }
                nativeButton={false}
              >
                <Copy />
              </Button>
              <AlertDialogTrigger
                aria-label="Delete device model"
                render={<Button variant="ghost" size="icon" />}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
              </AlertDialogTrigger>
            </>
          )
        }
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {model.notes && (
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {model.notes}
            </p>
          )}

          <DetailList>
            <Detail label="Status" align="center">
              <Select
                items={lifecycleStatusLabels}
                value={model.status}
                onValueChange={(value) =>
                  handleStatusChange(value as LifecycleStatus)
                }
                disabled={!canWrite || updateStatus.isPending}
              >
                <SelectTrigger size="sm" aria-label="Device model status">
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
            <Detail label="Manufacturer">
              <Link
                to="/devices/manufacturers/$manufacturerId"
                params={{ manufacturerId: model.manufacturer.id }}
                className="hover:underline"
              >
                {model.manufacturer.name}
              </Link>
            </Detail>
            <Detail label="Type" align="center">
              <span className="inline-flex items-center gap-2">
                <DeviceTypeIcon type={model.deviceType} />
                {model.deviceType.name}
              </span>
            </Detail>
            <Detail label="Variant">
              {model.variant ?? <DetailEmpty>None</DetailEmpty>}
            </Detail>
            <Detail label="Part number">
              {model.partNumber ?? <DetailEmpty>Not recorded</DetailEmpty>}
            </Detail>
            <Detail label="Product page" title={model.website}>
              {model.website ? (
                <a
                  href={model.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {model.website}
                </a>
              ) : (
                <DetailEmpty>Not recorded</DetailEmpty>
              )}
            </Detail>
          </DetailList>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium">Physical</h3>
            <DetailList>
              <Detail label="Dimensions">
                {dimensions || <DetailEmpty>Not recorded</DetailEmpty>}
              </Detail>
              <Detail label="Rack units">
                {model.rackUnits ? (
                  `${model.rackUnits}U`
                ) : (
                  <DetailEmpty>Not recorded</DetailEmpty>
                )}
              </Detail>
              <Detail label="Mounting">
                {model.mounting ? (
                  mountingLabels[model.mounting]
                ) : (
                  <DetailEmpty>Not specified</DetailEmpty>
                )}
              </Detail>
            </DetailList>
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium">Power</h3>
            <DetailList>
              <Detail label="Maximum draw">
                {model.powerWattsMax ? (
                  `${model.powerWattsMax} W`
                ) : (
                  <DetailEmpty>Not recorded</DetailEmpty>
                )}
              </Detail>
              <Detail label="Powered over Ethernet">
                {model.poeIn ? (
                  model.poeInStandard ? (
                    `Yes, ${poeStandardLabels[model.poeInStandard]}`
                  ) : (
                    <>
                      Yes <DetailEmpty>· standard unknown</DetailEmpty>
                    </>
                  )
                ) : (
                  'No'
                )}
              </Detail>
              <Detail label="Supplies PoE">
                {model.poeOut ? (
                  model.poeOutStandard ? (
                    `Yes, up to ${poeStandardLabels[model.poeOutStandard]}`
                  ) : (
                    <>
                      Yes <DetailEmpty>· standard unknown</DetailEmpty>
                    </>
                  )
                ) : (
                  'No'
                )}
              </Detail>
              {model.poeOut && (
                <Detail label="PoE budget">
                  {model.poeBudgetWatts ? (
                    `${model.poeBudgetWatts} W`
                  ) : (
                    <DetailEmpty>Not recorded</DetailEmpty>
                  )}
                </Detail>
              )}
            </DetailList>
          </section>

          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span title={formatAbsoluteDate(model.createdAt)}>
              created {formatRelativeDate(model.createdAt)}
            </span>
            <span aria-hidden="true">·</span>
            <span title={formatAbsoluteDate(model.updatedAt)}>
              updated {formatRelativeDate(model.updatedAt)}
            </span>
          </p>
        </div>
      </Panel>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting is for fixing mistakes, such as a duplicate or a model
            entered by accident. If the model is no longer sold or used, set its
            status to Decommissioned instead: it stays on record and only drops
            out of the default lists. You can't undo this from here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={deleteDeviceModel.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteDeviceModel.isPending}
            onClick={handleDelete}
          >
            {deleteDeviceModel.isPending ? 'Deleting…' : 'Delete device model'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
