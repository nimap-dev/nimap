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
  const { modelId } = Route.useParams()
  const { data, isPending } = useGetDeviceModel(modelId)

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

  return <EditDeviceModelForm model={model} />
}

function EditDeviceModelForm({ model }: { model: DeviceModelResponse }) {
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
          title: 'Could not save',
          description: res.data.detail ?? 'The device model was not updated',
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
      toast.add({ type: 'success', description: 'Device model updated' })
      navigate({
        to: '/devices/models/$modelId',
        params: { modelId: model.id },
        replace: true,
      })
    } catch {
      toast.add({
        type: 'error',
        title: 'Could not save',
        description: 'The request failed, check your connection and retry',
      })
    }
  }

  return (
    <Panel
      title={`Edit ${model.manufacturer.name} ${formatModelName(model)}`}
      back={backToDetail}
      backLabel="Back to device model"
    >
      <DeviceModelForm
        formId="edit-device-model-form"
        defaultValues={deviceModelToValues(model)}
        submit="Save changes"
        submitting="Saving…"
        cancel={backToDetail}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
