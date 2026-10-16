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
  useMountingLabels,
  usePoeStandardLabels,
} from '#/lib/device-models'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import {
  useLifecycleStatusLabels,
  useLifecycleStatusOptions,
} from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/models/$modelId',
)({ component: ViewDeviceModel })

function ViewDeviceModel() {
  const { t } = useTranslation(['deviceModels', 'common'])
  const mountingLabels = useMountingLabels()
  const poeStandardLabels = usePoeStandardLabels()
  const lifecycleStatusLabels = useLifecycleStatusLabels()
  const lifecycleStatusOptions = useLifecycleStatusOptions()
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
        backLabel={t('detail.back')}
      />
    )
  }

  if (!model) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/devices/models" />}
        backLabel={t('detail.back')}
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
          title: t('common:errors.couldNotChangeStatus'),
          description:
            res.data.detail ?? t('detail.stayed', { name: fullName }),
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: t('common:errors.couldNotChangeStatus'),
        description: t('common:errors.requestFailed'),
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
      description: t('detail.statusChanged', {
        name: fullName,
        status: lifecycleStatusLabels[status].toLowerCase(),
      }),
    })
  }

  async function handleDelete() {
    try {
      const res = await deleteDeviceModel.mutateAsync({ id: modelId })

      if (res.status !== 204) {
        setConfirmingDelete(false)
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotDelete'),
          description:
            res.data.detail ?? t('delete.stillThere', { name: fullName }),
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: t('common:errors.couldNotDelete'),
        description: t('common:errors.requestFailed'),
      })
      return
    }

    setConfirmingDelete(false)
    queryClient.removeQueries({ queryKey: getGetDeviceModelQueryKey(modelId) })
    await queryClient.invalidateQueries({
      queryKey: getListDeviceModelsQueryKey(),
    })
    toast.add({
      type: 'success',
      description: t('delete.deleted', { name: fullName }),
    })
    navigate({ to: '/devices/models', replace: true })
  }

  const dimensions = formatDimensions(model)

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={fullName}
        back={<Link to="/devices/models" />}
        backLabel={t('detail.back')}
        action={
          canWrite && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('detail.edit')}
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
                aria-label={t('detail.duplicate')}
                title={t('detail.duplicateShort')}
                render={
                  <Link to="/devices/models/new" search={{ from: modelId }} />
                }
                nativeButton={false}
              >
                <Copy />
              </Button>
              <AlertDialogTrigger
                aria-label={t('delete.label')}
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
            <Detail label={t('common:lifecycle.label')} align="center">
              <Select
                items={lifecycleStatusLabels}
                value={model.status}
                onValueChange={(value) =>
                  handleStatusChange(value as LifecycleStatus)
                }
                disabled={!canWrite || updateStatus.isPending}
              >
                <SelectTrigger size="sm" aria-label={t('detail.status')}>
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
            <Detail label={t('fields.manufacturer')}>
              <Link
                to="/devices/manufacturers/$manufacturerId"
                params={{ manufacturerId: model.manufacturer.id }}
                className="hover:underline"
              >
                {model.manufacturer.name}
              </Link>
            </Detail>
            <Detail label={t('fields.type')} align="center">
              <span className="inline-flex items-center gap-2">
                <DeviceTypeIcon type={model.deviceType} />
                {model.deviceType.name}
              </span>
            </Detail>
            <Detail label={t('fields.variant')}>
              {model.variant ?? (
                <DetailEmpty>{t('common:states.none')}</DetailEmpty>
              )}
            </Detail>
            <Detail label={t('fields.partNumber')}>
              {model.partNumber ?? (
                <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
              )}
            </Detail>
            <Detail label={t('fields.productPage')} title={model.website}>
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
                <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
              )}
            </Detail>
          </DetailList>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium">{t('fields.physical')}</h3>
            <DetailList>
              <Detail label={t('fields.dimensions')}>
                {dimensions || (
                  <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                )}
              </Detail>
              <Detail label={t('fields.rackUnits')}>
                {model.rackUnits ? (
                  `${model.rackUnits}U`
                ) : (
                  <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                )}
              </Detail>
              <Detail label={t('fields.mounting')}>
                {model.mounting ? (
                  mountingLabels[model.mounting]
                ) : (
                  <DetailEmpty>{t('common:states.notSpecified')}</DetailEmpty>
                )}
              </Detail>
            </DetailList>
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium">{t('fields.power')}</h3>
            <DetailList>
              <Detail label={t('fields.maxDraw')}>
                {model.powerWattsMax ? (
                  `${model.powerWattsMax} W`
                ) : (
                  <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                )}
              </Detail>
              <Detail label={t('fields.poeIn')}>
                {model.poeIn ? (
                  model.poeInStandard ? (
                    t('detail.yesStandard', {
                      standard: poeStandardLabels[model.poeInStandard],
                    })
                  ) : (
                    <>
                      {t('common:states.yes')}{' '}
                      <DetailEmpty>{t('detail.standardUnknown')}</DetailEmpty>
                    </>
                  )
                ) : (
                  t('common:states.no')
                )}
              </Detail>
              <Detail label={t('fields.poeOut')}>
                {model.poeOut ? (
                  model.poeOutStandard ? (
                    t('detail.yesUpTo', {
                      standard: poeStandardLabels[model.poeOutStandard],
                    })
                  ) : (
                    <>
                      {t('common:states.yes')}{' '}
                      <DetailEmpty>{t('detail.standardUnknown')}</DetailEmpty>
                    </>
                  )
                ) : (
                  t('common:states.no')
                )}
              </Detail>
              {model.poeOut && (
                <Detail label={t('fields.poeBudget')}>
                  {model.poeBudgetWatts ? (
                    `${model.poeBudgetWatts} W`
                  ) : (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
              )}
            </DetailList>
          </section>

          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span title={formatAbsoluteDate(model.createdAt)}>
              {t('common:meta.created', {
                when: formatRelativeDate(model.createdAt),
              })}
            </span>
            <span aria-hidden="true">·</span>
            <span title={formatAbsoluteDate(model.updatedAt)}>
              {t('common:meta.updated', {
                when: formatRelativeDate(model.updatedAt),
              })}
            </span>
          </p>
        </div>
      </Panel>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {t('delete.title', { name: fullName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description', {
              decommissioned: lifecycleStatusLabels.decommissioned,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={deleteDeviceModel.isPending}
          >
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteDeviceModel.isPending}
            onClick={handleDelete}
          >
            {deleteDeviceModel.isPending
              ? t('common:actions.deleting')
              : t('delete.label')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
