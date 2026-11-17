import {
  getGetDeviceQueryKey,
  getListDevicesQueryKey,
  useDeleteDevice,
  useGetDevice,
  useUpdateDeviceStatus,
} from '#/api/devices/devices'
import {
  Detail,
  DetailEmpty,
  DetailGrid,
  DetailList,
  DetailMeta,
  DetailNote,
} from '#/components/detail-list'
import { CopyValue } from '#/components/copy-value'
import { DeviceTypeIcon } from '#/components/device-type-icon'
import { LifecycleStatusSelect } from '#/components/lifecycle-status-select'
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
import { toast } from '#/components/ui/toast'
import { useCan } from '#/lib/auth'
import { formatModelName } from '#/lib/device-models'
import { formatDeviceName } from '#/lib/devices'
import { useLifecycleStatusLabels } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/_nav/devices/$deviceId')({
  component: ViewDevice,
})

function ViewDevice() {
  const { t } = useTranslation(['devices', 'common'])
  const lifecycleStatusLabels = useLifecycleStatusLabels()
  const { deviceId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetDevice(deviceId)
  const updateStatus = useUpdateDeviceStatus()
  const deleteDevice = useDeleteDevice()
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const device = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/devices" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!device) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/devices" />}
        backLabel={t('detail.back')}
      />
    )
  }

  const fullName = formatDeviceName(device)

  async function handleStatusChange(status: LifecycleStatus) {
    try {
      const res = await updateStatus.mutateAsync({
        id: deviceId,
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
        queryKey: getGetDeviceQueryKey(deviceId),
      }),
      queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() }),
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
      const res = await deleteDevice.mutateAsync({ id: deviceId })

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
    queryClient.removeQueries({ queryKey: getGetDeviceQueryKey(deviceId) })
    await queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() })
    toast.add({
      type: 'success',
      description: t('delete.deleted', { name: fullName }),
    })
    navigate({ to: '/devices', replace: true })
  }

  const notRecorded = (
    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
  )

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={fullName}
        back={<Link to="/devices" />}
        backLabel={t('detail.back')}
        action={
          canWrite && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('detail.edit')}
                render={
                  <Link to="/devices/$deviceId/edit" params={{ deviceId }} />
                }
                nativeButton={false}
              >
                <Pencil />
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
        summary={
          <>
            <LifecycleStatusSelect
              value={device.status}
              onValueChange={handleStatusChange}
              readOnly={!canWrite}
              disabled={updateStatus.isPending}
              aria-label={t('detail.status')}
            />
            <span className="inline-flex items-center gap-1.5">
              <DeviceTypeIcon type={device.deviceType} />
              {device.deviceType.name}
            </span>
            <span aria-hidden="true">·</span>
            {device.model ? (
              <Link
                to="/devices/models/$modelId"
                params={{ modelId: device.model.id }}
                className="hover:text-foreground hover:underline"
              >
                {[device.manufacturer?.name, formatModelName(device.model)]
                  .filter(Boolean)
                  .join(' ')}
              </Link>
            ) : (
              <span>{t('detail.noModel')}</span>
            )}
          </>
        }
      >
        <DetailGrid>
          <DetailList title={t('fields.identification')}>
            <Detail label={t('fields.code')}>
              <span className="font-mono">{device.code}</span>
            </Detail>
            <Detail label={t('fields.physicalLabel')}>
              {device.physicalLabel ?? notRecorded}
            </Detail>
            <Detail label={t('fields.serialNumber')}>
              {device.serialNumber ?? notRecorded}
            </Detail>
            <Detail label={t('fields.inventoryNumber')}>
              {device.inventoryNumber ?? notRecorded}
            </Detail>
          </DetailList>

          <DetailList title={t('fields.network')}>
            <Detail label={t('fields.managementIp')}>
              {device.managementIp ? (
                <CopyValue value={device.managementIp} className="font-mono" />
              ) : (
                notRecorded
              )}
            </Detail>
            <Detail label={t('fields.hostname')}>
              {device.hostname ? (
                <CopyValue value={device.hostname} />
              ) : (
                notRecorded
              )}
            </Detail>
          </DetailList>

          {device.notes && (
            <DetailNote title={t('fields.notes')}>{device.notes}</DetailNote>
          )}

          <DetailMeta
            createdAt={device.createdAt}
            updatedAt={device.updatedAt}
          />
        </DetailGrid>
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
            disabled={deleteDevice.isPending}
          >
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteDevice.isPending}
            onClick={handleDelete}
          >
            {deleteDevice.isPending
              ? t('common:actions.deleting')
              : t('delete.label')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
