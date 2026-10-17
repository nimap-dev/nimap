import {
  getListLocationsQueryKey,
  useCreateLocation,
} from '#/api/locations/locations'
import { emptyLocationValues, LocationForm } from '#/components/location-form'
import type { LocationFormValues } from '#/components/location-form'
import { Panel } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import { addressToRequest } from '#/lib/address'
import { can } from '#/lib/auth'
import { useWorldMap } from '#/lib/map'
import { optional } from '#/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/_map/locations/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/locations' })
    }
  },
  component: NewLocation,
})

function NewLocation() {
  const { t } = useTranslation(['locations', 'common'])
  const { cancelDrawing, cancelPicking } = useWorldMap()
  const createLocation = useCreateLocation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => cancelDrawing, [cancelDrawing])
  useEffect(() => cancelPicking, [cancelPicking])

  async function handleSubmit(value: LocationFormValues) {
    try {
      const res = await createLocation.mutateAsync({
        data: {
          parentId: value.parentId,
          name: value.name,
          address: addressToRequest(value.address),
          area: value.area,
          representativePoint: value.representativePoint,
          notes: optional(value.notes),
          status: value.status,
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
        queryKey: getListLocationsQueryKey(),
      })
      toast.add({
        type: 'success',
        description: t('new.created', { name: res.data.name }),
      })
      navigate({
        to: '/locations/$locationId',
        params: { locationId: res.data.id },
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
      back={<Link to="/locations" />}
      backLabel={t('detail.back')}
    >
      <LocationForm
        formId="new-location-form"
        defaultValues={emptyLocationValues}
        withStatus
        autoFocus
        submit={t('new.submit')}
        submitting={t('new.submitting')}
        cancel={<Link to="/locations" />}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
