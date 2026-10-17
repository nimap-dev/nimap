import {
  getListDeviceModelsQueryKey,
  useCreateDeviceModel,
  useGetDeviceModel,
} from '#/api/device-models/device-models'
import { DeviceModelForm } from '#/components/device-model-form'
import { Panel, PanelPending } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import { can } from '#/lib/auth'
import {
  deviceModelToCopyValues,
  deviceModelToRequest,
  emptyDeviceModelValues,
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
import * as zod from 'zod'

export const Route = createFileRoute('/_authenticated/_nav/devices/models/new')(
  {
    beforeLoad: ({ context }) => {
      if (!can(context.queryClient, 'records:write')) {
        throw redirect({ to: '/devices/models' })
      }
    },
    // ?from=<id> starts the form as a copy of that model, which is how the
    // detail page's Duplicate works.
    validateSearch: zod.object({
      from: zod.string().optional().catch(undefined),
    }),
    component: NewDeviceModel,
  },
)

function NewDeviceModel() {
  const { t } = useTranslation('deviceModels')
  const { from } = Route.useSearch()
  const { data: source, isPending } = useGetDeviceModel(from ?? '', {
    query: { enabled: Boolean(from) },
  })

  if (from && isPending) {
    return (
      <PanelPending
        back={<Link to="/devices/models" />}
        backLabel={t('detail.back')}
      />
    )
  }

  const copied = from && source?.status === 200 ? source.data : undefined

  return (
    <NewDeviceModelForm
      key={copied?.id ?? 'blank'}
      defaultValues={
        copied ? deviceModelToCopyValues(copied) : emptyDeviceModelValues
      }
      copiedFrom={
        copied
          ? `${copied.manufacturer.name} ${formatModelName(copied)}`
          : undefined
      }
    />
  )
}

function NewDeviceModelForm({
  defaultValues,
  copiedFrom,
}: {
  defaultValues: DeviceModelFormValues
  copiedFrom: string | undefined
}) {
  const { t } = useTranslation(['deviceModels', 'common'])
  const createDeviceModel = useCreateDeviceModel()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function handleSubmit(values: DeviceModelFormValues) {
    try {
      const res = await createDeviceModel.mutateAsync({
        data: { ...deviceModelToRequest(values), status: values.status },
      })

      if (res.status !== 201) {
        toast.add({
          type: 'error',
          title: t('new.couldNotCreate'),
          description: res.data.detail ?? t('new.notCreated'),
        })
        return
      }

      await queryClient.invalidateQueries({
        queryKey: getListDeviceModelsQueryKey(),
      })
      toast.add({
        type: 'success',
        description: t('new.created', {
          name: `${res.data.manufacturer.name} ${formatModelName(res.data)}`,
        }),
      })
      navigate({
        to: '/devices/models/$modelId',
        params: { modelId: res.data.id },
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
      title={
        copiedFrom ? t('new.copyOf', { name: copiedFrom }) : t('new.title')
      }
      back={<Link to="/devices/models" />}
      backLabel={t('detail.back')}
    >
      <DeviceModelForm
        formId="new-device-model-form"
        defaultValues={defaultValues}
        withStatus
        submit={t('new.submit')}
        submitting={t('new.submitting')}
        cancel={<Link to="/devices/models" />}
        intro={copiedFrom && t('new.copyNote')}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
