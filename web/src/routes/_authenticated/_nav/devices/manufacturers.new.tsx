import {
  getListManufacturersQueryKey,
  useCreateManufacturer,
} from '#/api/manufacturers/manufacturers'
import {
  emptyManufacturerValues,
  ManufacturerForm,
} from '#/components/manufacturer-form'
import type { ManufacturerFormValues } from '#/components/manufacturer-form'
import { Panel } from '#/components/panel'
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
  '/_authenticated/_nav/devices/manufacturers/new',
)({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/devices/manufacturers' })
    }
  },
  component: NewManufacturer,
})

function NewManufacturer() {
  const { t } = useTranslation(['manufacturers', 'common'])
  const createManufacturer = useCreateManufacturer()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function handleSubmit(value: ManufacturerFormValues) {
    try {
      const res = await createManufacturer.mutateAsync({
        data: {
          name: value.name,
          website: optional(value.website),
          notes: optional(value.notes),
        },
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
        queryKey: getListManufacturersQueryKey(),
      })
      toast.add({
        type: 'success',
        description: t('new.created', { name: res.data.name }),
      })
      navigate({
        to: '/devices/manufacturers/$manufacturerId',
        params: { manufacturerId: res.data.id },
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
      back={<Link to="/devices/manufacturers" />}
      backLabel={t('detail.back')}
    >
      <ManufacturerForm
        formId="new-manufacturer-form"
        defaultValues={emptyManufacturerValues}
        autoFocus
        submit={t('new.submit')}
        submitting={t('new.submitting')}
        cancel={<Link to="/devices/manufacturers" />}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
