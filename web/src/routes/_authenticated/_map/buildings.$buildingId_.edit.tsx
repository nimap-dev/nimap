import {
  getGetBuildingQueryKey,
  getListBuildingsQueryKey,
  useGetBuilding,
  useUpdateBuilding,
} from '#/api/buildings/buildings'
import { UpdateBuildingBody } from '#/api/endpoints/buildings/buildings.zod'
import type { BuildingResponse } from '#/api/model'
import { AddressFields } from '#/components/form/address-fields'
import { FootprintField } from '#/components/form/footprint-field'
import { FormActions } from '#/components/form/form-actions'
import { LocationSelect } from '#/components/form/location-select'
import { TextField } from '#/components/form/text-field'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { Button } from '#/components/ui/button'
import { FieldGroup } from '#/components/ui/field'
import { toast } from '#/components/ui/toast'
import { addressToRequest, addressToValue } from '#/lib/address'
import { useWorldMap } from '#/lib/map'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { Crosshair } from 'lucide-react'
import { useEffect, useRef } from 'react'
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
  const { buildingId } = Route.useParams()
  const { data, isPending } = useGetBuilding(buildingId)

  const building = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/buildings" />}
        backLabel="Back to buildings"
      />
    )
  }

  if (!building) {
    return (
      <PanelNotFound
        noun="building"
        back={<Link to="/buildings" />}
        backLabel="Back to buildings"
      />
    )
  }

  // Mounted only once the building is loaded, so the form can take its default
  // values straight from it, `useForm` captures those on first render.
  return <EditBuildingForm building={building} />
}

function EditBuildingForm({ building }: { building: BuildingResponse }) {
  const { flyTo, drawPolygon, cancelDrawing, polygon } = useWorldMap()
  const updateBuilding = useUpdateBuilding()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [longitude, latitude] = building.representativePoint.coordinates

  const form = useForm({
    defaultValues: {
      name: building.name,
      locationId: building.locationId,
      address: addressToValue(building.address),
      notes: building.notes ?? '',
      footprint: building.footprint,
    },
    onSubmit: async ({ value }) => {
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
          title: 'Could not save',
          description: res.data.detail ?? 'The building was not updated',
        })
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetBuildingQueryKey(building.id),
        }),
      ])
      toast.add({ type: 'success', description: 'Building updated' })
      navigate({
        to: '/buildings/$buildingId',
        params: { buildingId: building.id },
        replace: true,
      })
    },
  })

  useEffect(() => {
    flyTo(longitude, latitude, BUILDING_ZOOM)
  }, [flyTo, longitude, latitude])

  // Seed the map with the footprint as it was when the page opened. Reading it
  // from a ref keeps a background refetch from wiping edits in progress.
  const initialFootprint = useRef(building.footprint)
  useEffect(() => {
    drawPolygon(initialFootprint.current)
    return () => cancelDrawing()
  }, [drawPolygon, cancelDrawing])

  useEffect(() => {
    if (!polygon) return
    form.setFieldValue('footprint', polygon)
  }, [form, polygon])

  return (
    <Panel
      title={building.name}
      back={
        <Link
          to="/buildings/$buildingId"
          params={{ buildingId: building.id }}
        />
      }
      backLabel="Back to building"
      action={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Recentre map"
          onClick={() => flyTo(longitude, latitude, BUILDING_ZOOM)}
        >
          <Crosshair />
        </Button>
      }
    >
      <form
        id="edit-building-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name="name"
            validators={{ onChange: UpdateBuildingBody.shape.name }}
            children={(field) => <TextField field={field} label="Name" />}
          />

          <form.Field
            name="locationId"
            children={(field) => (
              <LocationSelect
                id="edit-building-location"
                value={field.state.value}
                onChange={field.handleChange}
                label="Location"
                emptyLabel="Not placed yet"
              />
            )}
          />

          <form.Field
            name="address"
            children={(field) => (
              <AddressFields
                idPrefix="edit-building-address"
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          />

          <form.Field
            name="notes"
            children={(field) => (
              <TextField field={field} label="Notes" placeholder="Optional" />
            )}
          />

          <FootprintField
            polygon={polygon}
            mode="reshape"
            onClear={() => drawPolygon()}
          />
        </FieldGroup>
      </form>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <FormActions
            formId="edit-building-form"
            submit="Save changes"
            submitting="Saving…"
            isSubmitting={isSubmitting}
            disabled={!canSubmit || !polygon}
            cancel={
              <Link
                to="/buildings/$buildingId"
                params={{ buildingId: building.id }}
              />
            }
          />
        )}
      />
    </Panel>
  )
}
