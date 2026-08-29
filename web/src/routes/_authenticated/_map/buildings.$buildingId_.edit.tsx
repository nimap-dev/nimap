import {
  getGetBuildingQueryKey,
  getListBuildingsQueryKey,
  useGetBuilding,
  useUpdateBuilding,
} from '#/api/buildings/buildings'
import { UpdateBuildingBody } from '#/api/endpoints/buildings/buildings.zod'
import type { BuildingResponse } from '#/api/model'
import { AddressFields } from '#/components/address-fields'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
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
import { Panel } from '#/components/panel'
import { can } from '#/lib/auth'

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
      <Panel
        title={<Skeleton className="h-4 w-40" />}
        back={<Link to="/buildings" />}
        backLabel="Back to buildings"
      >
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </Panel>
    )
  }

  if (!building) {
    return (
      <Panel
        title="Not found"
        back={<Link to="/buildings" />}
        backLabel="Back to buildings"
      >
        <p className="text-sm text-muted-foreground">
          This building doesn't exist, or you don't have access to it.
        </p>
        <Button variant="outline" size="sm" render={<Link to="/buildings" />}>
          Back to buildings
        </Button>
      </Panel>
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
      address: addressToValue(building.address),
      notes: building.notes ?? '',
      footprint: building.footprint,
    },
    onSubmit: async ({ value }) => {
      const res = await updateBuilding.mutateAsync({
        id: building.id,
        data: {
          name: value.name,
          address: addressToRequest(value.address),
          footprint: value.footprint,
          notes: value.notes.trim() || undefined,
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

  const parts = polygon?.coordinates.length ?? 0

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
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
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
              <Field>
                <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            )}
          />

          <Field>
            <FieldLabel>Footprint</FieldLabel>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
              {parts > 0 ? (
                <span>
                  {parts} {parts === 1 ? 'part' : 'parts'} — drag a point to
                  reshape
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Click on the map to draw
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={parts === 0}
                onClick={() => drawPolygon()}
              >
                Clear
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </form>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              form="edit-building-form"
              disabled={!canSubmit || isSubmitting || !polygon}
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              render={
                <Link
                  to="/buildings/$buildingId"
                  params={{ buildingId: building.id }}
                />
              }
            >
              Cancel
            </Button>
          </div>
        )}
      />
    </Panel>
  )
}
