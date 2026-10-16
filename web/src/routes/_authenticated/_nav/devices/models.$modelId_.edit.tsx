import {
  getGetDeviceModelQueryKey,
  getListDeviceModelsQueryKey,
  useGetDeviceModel,
  useUpdateDeviceModel,
} from '#/api/device-models/device-models'
import type { DeviceModelResponse } from '#/api/model'
import { DeviceModelForm } from '#/components/device-model-form'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import { can } from '#/lib/auth'
import {
  deviceModelToRequest,
  deviceModelToValues,
  formatModelName,
} from '#/lib/device-models'
import type { DeviceModelFormValues } from '#/lib/device-models'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/models/$modelId_/edit',
)({
  beforeLoad: ({ context, params }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({
        to: '/devices/models/$modelId',
        params: { modelId: params.modelId },
      })
    }
  },
  component: EditDeviceModel,
})

function EditDeviceModel() {
  const { t } = useTranslation('deviceModels')
  const { modelId } = Route.useParams()
  const { data, isPending } = useGetDeviceModel(modelId)

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

  return <EditDeviceModelForm model={model} />
}

function EditDeviceModelForm({ model }: { model: DeviceModelResponse }) {
  const { t } = useTranslation(['deviceModels', 'common'])
  const updateDeviceModel = useUpdateDeviceModel()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const backToDetail = (
    <Link to="/devices/models/$modelId" params={{ modelId: model.id }} />
  )

  async function handleSubmit(values: DeviceModelFormValues) {
    try {
      const res = await updateDeviceModel.mutateAsync({
        id: model.id,
        data: deviceModelToRequest(values),
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
        queryClient.invalidateQueries({
          queryKey: getListDeviceModelsQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getGetDeviceModelQueryKey(model.id),
        }),
      ])
      toast.add({ type: 'success', description: t('edit.updated') })
      navigate({
        to: '/devices/models/$modelId',
        params: { modelId: model.id },
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
      title={t('edit.title', {
        name: `${model.manufacturer.name} ${formatModelName(model)}`,
      })}
      back={backToDetail}
      backLabel={t('detail.backToModel')}
    >
      <DeviceModelForm
        formId="edit-device-model-form"
        defaultValues={deviceModelToValues(model)}
        submit={t('common:actions.saveChanges')}
        submitting={t('common:actions.saving')}
        cancel={backToDetail}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
