import {
  getGetBuildingQueryKey,
  getListBuildingsQueryKey,
  useGetBuilding,
  useUpdateBuilding,
} from '#/api/buildings/buildings'
import { UpdateBuildingBody } from '#/api/endpoints/buildings/buildings.zod'
import type { BuildingResponse, MultiPolygon } from '#/api/model'
import { Button } from '#/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { toast } from '#/components/ui/toast'
import { useWorldMap } from '#/lib/map'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Crosshair } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export const Route = createFileRoute(
  '/_authenticated/_map/buildings/$buildingId_/edit',
)({
  component: EditBuilding,
})

const BUILDING_ZOOM = 17

function EditBuilding() {
  const { buildingId } = Route.useParams()
  const { data, isPending } = useGetBuilding(buildingId)

  const building = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <Panel title={<Skeleton className="h-4 w-40" />}>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </Panel>
    )
  }

  if (!building) {
    return (
      <Panel title="Not found">
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
      notes: building.notes ?? "",
      footprint: building.footprint as MultiPolygon | undefined,
    },
    onSubmit: async ({ value }) => {
      if (!value.footprint) return

      const res = await updateBuilding.mutateAsync({
        id: building.id,
        data: {
          name: value.name,
          footprint: value.footprint,
          notes: value.notes.trim() || undefined,
        },
      })

      if (res.status !== 200) {
        toast.add({
          type: "error",
          title: "Could not save",
          description: res.data?.detail ?? "The building was not updated",
        })
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetBuildingQueryKey(building.id),
        }),
      ])
      toast.add({ type: "success", description: "Building updated" })
      navigate({
        to: "/buildings/$buildingId",
        params: { buildingId: building.id },
        replace: true,
      })
    },
  })

  useEffect(() => {
    if (longitude === undefined || latitude === undefined) return
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
    form.setFieldValue("footprint", polygon)
  }, [form, polygon])

  const parts = polygon?.coordinates.length ?? 0

  return (
    <Panel
      title={building.name}
      buildingId={building.id}
      action={
        longitude !== undefined && latitude !== undefined ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Recentre map"
            onClick={() => flyTo(longitude, latitude, BUILDING_ZOOM)}
          >
            <Crosshair />
          </Button>
        ) : undefined
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
                  {parts} {parts === 1 ? "part" : "parts"} — drag a point to
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
              {isSubmitting ? "Saving…" : "Save changes"}
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

function Panel({
  title,
  action,
  buildingId,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  buildingId?: string
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center gap-1 border-b p-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={buildingId ? "Back to building" : "Back to buildings"}
          render={
            buildingId ? (
              <Link to="/buildings/$buildingId" params={{ buildingId }} />
            ) : (
              <Link to="/buildings" />
            )
          }
        >
          <ArrowLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate font-medium">{title}</h2>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  )
}
