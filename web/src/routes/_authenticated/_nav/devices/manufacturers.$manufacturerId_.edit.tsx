import {
  getGetManufacturerQueryKey,
  getListManufacturersQueryKey,
  useGetManufacturer,
  useUpdateManufacturer,
} from '#/api/manufacturers/manufacturers'
import type { ManufacturerResponse } from '#/api/model'
import {
  ManufacturerForm,
  manufacturerToValues,
} from '#/components/manufacturer-form'
import type { ManufacturerFormValues } from '#/components/manufacturer-form'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import { can } from '#/lib/auth'
import { optional } from '#/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/manufacturers/$manufacturerId_/edit',
)({
  beforeLoad: ({ context, params }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({
        to: '/devices/manufacturers/$manufacturerId',
        params: { manufacturerId: params.manufacturerId },
      })
    }
  },
  component: EditManufacturer,
})

function EditManufacturer() {
  const { t } = useTranslation('manufacturers')
  const { manufacturerId } = Route.useParams()
  const { data, isPending } = useGetManufacturer(manufacturerId)

  const manufacturer = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/devices/manufacturers" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!manufacturer) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/devices/manufacturers" />}
        backLabel={t('detail.back')}
      />
    )
  }

  // Mounted only once the manufacturer is loaded, so the form can take its
  // default values straight from it: `useForm` captures those on first render.
  return <EditManufacturerForm manufacturer={manufacturer} />
}

function EditManufacturerForm({
  manufacturer,
}: {
  manufacturer: ManufacturerResponse
}) {
  const { t } = useTranslation(['manufacturers', 'common'])
  const updateManufacturer = useUpdateManufacturer()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function handleSubmit(value: ManufacturerFormValues) {
    try {
      const res = await updateManufacturer.mutateAsync({
        id: manufacturer.id,
        data: {
          name: value.name,
          website: optional(value.website),
          notes: optional(value.notes),
        },
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
          queryKey: getListManufacturersQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getGetManufacturerQueryKey(manufacturer.id),
        }),
      ])
      toast.add({ type: 'success', description: t('edit.updated') })
      navigate({
        to: '/devices/manufacturers/$manufacturerId',
        params: { manufacturerId: manufacturer.id },
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

  const backToDetail = (
    <Link
      to="/devices/manufacturers/$manufacturerId"
      params={{ manufacturerId: manufacturer.id }}
    />
  )

  return (
    <Panel
      title={t('edit.title', { name: manufacturer.name })}
      back={backToDetail}
      backLabel={t('detail.backToManufacturer')}
    >
      <ManufacturerForm
        formId="edit-manufacturer-form"
        defaultValues={manufacturerToValues(manufacturer)}
        submit={t('common:actions.saveChanges')}
        submitting={t('common:actions.saving')}
        cancel={backToDetail}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
