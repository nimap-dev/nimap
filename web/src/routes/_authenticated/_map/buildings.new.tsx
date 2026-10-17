import {
  getListBuildingsQueryKey,
  useCreateBuilding,
} from '#/api/buildings/buildings'
import { BuildingForm, emptyBuildingValues } from '#/components/building-form'
import type { BuildingFormValues } from '#/components/building-form'
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

export const Route = createFileRoute('/_authenticated/_map/buildings/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/buildings' })
    }
  },
  component: NewBuilding,
})

function NewBuilding() {
  const { t } = useTranslation(['buildings', 'common'])
  const { drawPolygon, cancelDrawing } = useWorldMap()
  const createBuilding = useCreateBuilding()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    drawPolygon()
    return () => cancelDrawing()
  }, [drawPolygon, cancelDrawing])

  async function handleSubmit(value: BuildingFormValues) {
    if (!value.footprint) return

    try {
      const res = await createBuilding.mutateAsync({
        data: {
          name: value.name,
          locationId: value.locationId,
          address: addressToRequest(value.address),
          footprint: value.footprint,
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
        queryKey: getListBuildingsQueryKey(),
      })
      toast.add({
        type: 'success',
        description: t('new.created', { name: res.data.name }),
      })
      navigate({
        to: '/buildings/$buildingId',
        params: { buildingId: res.data.id },
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
      back={<Link to="/buildings" />}
      backLabel={t('detail.back')}
    >
      <BuildingForm
        formId="new-building-form"
        defaultValues={emptyBuildingValues}
        mode="create"
        autoFocus
        submit={t('new.submit')}
        submitting={t('new.submitting')}
        cancel={<Link to="/buildings" />}
        onSubmit={handleSubmit}
      />
    </Panel>
  )
}
