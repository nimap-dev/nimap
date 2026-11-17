import { getListDeviceTypesQueryKey } from '#/api/device-types/device-types'
import { getListDevicesQueryKey, useCreateDevice } from '#/api/devices/devices'
import { DeviceForm } from '#/components/device-form'
import { Panel } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import { can } from '#/lib/auth'
import {
  deviceToRequest,
  emptyDeviceValues,
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

export const Route = createFileRoute('/_authenticated/_nav/devices/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/devices' })
    }
  },
  component: NewDevice,
})

function NewDevice() {
  const { t } = useTranslation(['devices', 'common'])
  const createDevice = useCreateDevice()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function handleSubmit(values: DeviceFormValues) {
    try {
      const res = await createDevice.mutateAsync({
        data: { ...deviceToRequest(values), status: values.status },
      })

      if (res.status !== 201) {
        toast.add({
          type: 'error',
          title: t('new.couldNotCreate'),
          description: res.data.detail ?? t('new.notCreated'),
        })
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getListDeviceTypesQueryKey(),
        }),
      ])
      toast.add({
        type: 'success',
        description: t('new.created', { name: formatDeviceName(res.data) }),
      })
      navigate({
        to: '/devices/$deviceId',
        params: { deviceId: res.data.id },
        replace: true,
      })
    } catch {
      toast.add({
        type: 'error',
        title: t('new.couldNotCreate'),
        description: t('common:errors.requestFailed'),
      })
    }
  }

  return (
    <Panel
      title={t('new.title')}
      back={<Link to="/devices" />}
      backLabel={t('detail.back')}
    >
      <DeviceForm
        formId="new-device-form"
        defaultValues={emptyDeviceValues}
        submit={t('new.submit')}
        submitting={t('new.submitting')}
        cancel={<Link to="/devices" />}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
