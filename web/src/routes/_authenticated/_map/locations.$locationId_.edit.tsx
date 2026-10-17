import {
  getGetLocationQueryKey,
  getListLocationsQueryKey,
  useGetLocation,
  useUpdateLocation,
} from '#/api/locations/locations'
import type { LocationResponse } from '#/api/model'
import { LocationForm, locationToValues } from '#/components/location-form'
import type { LocationFormValues } from '#/components/location-form'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import { addressToRequest } from '#/lib/address'
import { can } from '#/lib/auth'
import { multiPolygonBounds, useWorldMap } from '#/lib/map'
import { optional } from '#/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_map/locations/$locationId_/edit',
)({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/locations' })
    }
  },
  component: EditLocation,
})

function EditLocation() {
  const { t } = useTranslation('locations')
  const { locationId } = Route.useParams()
  const { data, isPending } = useGetLocation(locationId)

  const location = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/locations" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!location) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/locations" />}
        backLabel={t('detail.back')}
      />
    )
  }

  return <EditLocationForm location={location} />
}

function EditLocationForm({ location }: { location: LocationResponse }) {
  const { t } = useTranslation(['locations', 'common'])
  const { fitBounds, drawPolygon, cancelDrawing, cancelPicking, seedPoint } =
    useWorldMap()
  const updateLocation = useUpdateLocation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Seed the map with the boundary as it stood when the page opened. Reading it
  // from a ref keeps a background refetch from wiping edits in progress. A
  // location with no boundary starts with drawing off, same as a new one.
  const initialArea = useRef(location.area)
  useEffect(() => {
    if (initialArea.current) drawPolygon(initialArea.current)
    return () => cancelDrawing()
  }, [drawPolygon, cancelDrawing])

  const initialPoint = useRef(
    location.representativePointManual
      ? location.representativePoint
      : undefined,
  )
  useEffect(() => {
    seedPoint(initialPoint.current)
    return () => cancelPicking()
  }, [seedPoint, cancelPicking])

  useEffect(() => {
    const bounds =
      initialArea.current && multiPolygonBounds(initialArea.current)
    if (bounds) fitBounds(bounds)
  }, [fitBounds])

  async function handleSubmit(value: LocationFormValues) {
    try {
      const res = await updateLocation.mutateAsync({
        id: location.id,
        data: {
          parentId: value.parentId,
          name: value.name,
          address: addressToRequest(value.address),
          area: value.area,
          representativePoint: value.representativePoint,
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
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetLocationQueryKey(location.id),
        }),
      ])
      toast.add({ type: 'success', description: t('edit.updated') })
      navigate({
        to: '/locations/$locationId',
        params: { locationId: location.id },
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
    <Link to="/locations/$locationId" params={{ locationId: location.id }} />
  )

  return (
    <Panel
      title={t('edit.title', { name: location.name })}
      back={backToDetail}
      backLabel={t('detail.backToLocation')}
    >
      <LocationForm
        formId="edit-location-form"
        defaultValues={locationToValues(location)}
        excludeSubtreeOf={location.id}
        submit={t('common:actions.saveChanges')}
        submitting={t('common:actions.saving')}
        cancel={backToDetail}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
