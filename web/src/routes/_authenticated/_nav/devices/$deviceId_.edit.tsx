import {
  getGetDeviceQueryKey,
  getListDevicesQueryKey,
  useGetDevice,
  useUpdateDevice,
} from '#/api/devices/devices'
import type { DeviceResponse } from '#/api/model'
import { DeviceForm } from '#/components/device-form'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import { can } from '#/lib/auth'
import {
  deviceToRequest,
  deviceToValues,
  formatDeviceName,
} from '#/lib/devices'
import type { DeviceFormValues } from '#/lib/devices'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/$deviceId_/edit',
)({
  beforeLoad: ({ context, params }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({
        to: '/devices/$deviceId',
        params: { deviceId: params.deviceId },
      })
    }
  },
  component: EditDevice,
})

function EditDevice() {
  const { t } = useTranslation('devices')
  const { deviceId } = Route.useParams()
  const { data, isPending } = useGetDevice(deviceId)

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

  return <EditDeviceForm device={device} />
}

function EditDeviceForm({ device }: { device: DeviceResponse }) {
  const { t } = useTranslation(['devices', 'common'])
  const updateDevice = useUpdateDevice()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const backToDetail = (
    <Link to="/devices/$deviceId" params={{ deviceId: device.id }} />
  )

  async function handleSubmit(values: DeviceFormValues) {
    try {
      const res = await updateDevice.mutateAsync({
        id: device.id,
        data: { ...deviceToRequest(values), code: values.code.trim() },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotSave'),
          description: res.data.detail ?? t('edit.notUpdated'),
        })
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetDeviceQueryKey(device.id),
        }),
      ])
      toast.add({ type: 'success', description: t('edit.updated') })
      navigate({
        to: '/devices/$deviceId',
        params: { deviceId: device.id },
        replace: true,
      })
    } catch {
      toast.add({
        type: 'error',
        title: t('common:errors.couldNotSave'),
        description: t('common:errors.requestFailed'),
      })
    }
  }

  return (
    <Panel
      title={t('edit.title', { name: formatDeviceName(device) })}
      back={backToDetail}
      backLabel={t('detail.backToDevice')}
    >
      <DeviceForm
        formId="edit-device-form"
        defaultValues={deviceToValues(device)}
        deviceId={device.id}
        submit={t('common:actions.saveChanges')}
        submitting={t('common:actions.saving')}
        cancel={backToDetail}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
