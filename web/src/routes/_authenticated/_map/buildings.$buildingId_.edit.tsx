import {
  getGetBuildingQueryKey,
  getListBuildingsQueryKey,
  useGetBuilding,
  useUpdateBuilding,
} from '#/api/buildings/buildings'
import type { BuildingResponse } from '#/api/model'
import { BuildingForm, buildingToValues } from '#/components/building-form'
import type { BuildingFormValues } from '#/components/building-form'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { Button } from '#/components/ui/button'
import { toast } from '#/components/ui/toast'
import { addressToRequest } from '#/lib/address'
import { useWorldMap } from '#/lib/map'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { Crosshair } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { can } from '#/lib/auth'
import { optional } from '#/lib/utils'

export const Route = createFileRoute(
  '/_authenticated/_map/buildings/$buildingId_/edit',
)({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/buildings' })
    }
  },
  component: EditBuilding,
})

const BUILDING_ZOOM = 17

function EditBuilding() {
  const { t } = useTranslation('buildings')
  const { buildingId } = Route.useParams()
  const { data, isPending } = useGetBuilding(buildingId)

  const building = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/buildings" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!building) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/buildings" />}
        backLabel={t('detail.back')}
      />
    )
  }

  return <EditBuildingForm building={building} />
}

function EditBuildingForm({ building }: { building: BuildingResponse }) {
  const { t } = useTranslation(['buildings', 'common'])
  const { flyTo, drawPolygon, cancelDrawing } = useWorldMap()
  const updateBuilding = useUpdateBuilding()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [longitude, latitude] = building.representativePoint.coordinates

  useEffect(() => {
    flyTo(longitude, latitude, BUILDING_ZOOM)
  }, [flyTo, longitude, latitude])

  const initialFootprint = useRef(building.footprint)
  useEffect(() => {
    drawPolygon(initialFootprint.current)
    return () => cancelDrawing()
  }, [drawPolygon, cancelDrawing])

  async function handleSubmit(value: BuildingFormValues) {
    if (!value.footprint) return

    try {
      const res = await updateBuilding.mutateAsync({
        id: building.id,
        data: {
          name: value.name,
          locationId: value.locationId,
          address: addressToRequest(value.address),
          footprint: value.footprint,
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
        queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetBuildingQueryKey(building.id),
        }),
      ])
      toast.add({ type: 'success', description: t('edit.updated') })
      navigate({
        to: '/buildings/$buildingId',
        params: { buildingId: building.id },
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
    <Link to="/buildings/$buildingId" params={{ buildingId: building.id }} />
  )

  return (
    <Panel
      title={t('edit.title', { name: building.name })}
      back={backToDetail}
      backLabel={t('detail.backToBuilding')}
      action={
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('detail.frame')}
          title={t('detail.frame')}
          onClick={() => flyTo(longitude, latitude, BUILDING_ZOOM)}
        >
          <Crosshair />
        </Button>
      }
    >
      <BuildingForm
        formId="edit-building-form"
        defaultValues={buildingToValues(building)}
        mode="edit"
        submit={t('common:actions.saveChanges')}
        submitting={t('common:actions.saving')}
        cancel={backToDetail}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
