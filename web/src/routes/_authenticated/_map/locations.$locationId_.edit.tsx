import {
  getGetLocationQueryKey,
  getListLocationTreeQueryKey,
  getListLocationsQueryKey,
  useGetLocation,
  useUpdateLocation,
} from '#/api/locations/locations'
import { UpdateLocationBody } from '#/api/endpoints/locations/locations.zod'
import type { LocationResponse } from '#/api/model'
import { AddressFields } from '#/components/address-fields'
import { AreaField } from '#/components/area-field'
import { LocationParentSelect } from '#/components/location-parent-select'
import { RepresentativePointField } from '#/components/representative-point-field'
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
import { multiPolygonBounds, useWorldMap } from '#/lib/map'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Panel } from '#/components/panel'
import { can } from '#/lib/auth'

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
  const { locationId } = Route.useParams()
  const { data, isPending } = useGetLocation(locationId)

  const location = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <Panel
        title={<Skeleton className="h-4 w-40" />}
        back={<Link to="/locations" />}
        backLabel="Back to locations"
      >
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </Panel>
    )
  }

  if (!location) {
    return (
      <Panel
        title="Not found"
        back={<Link to="/locations" />}
        backLabel="Back to locations"
      >
        <p className="text-sm text-muted-foreground">
          This location doesn't exist, or you don't have access to it.
        </p>
        <Button variant="outline" size="sm" render={<Link to="/locations" />}>
          Back to locations
        </Button>
      </Panel>
    )
  }

  return <EditLocationForm location={location} />
}

function EditLocationForm({ location }: { location: LocationResponse }) {
  const {
    fitBounds,
    drawPolygon,
    cancelDrawing,
    polygon,
    isDrawing,
    pickPoint,
    cancelPicking,
    seedPoint,
    point,
    isPicking,
  } = useWorldMap()
  const updateLocation = useUpdateLocation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      parentId: location.parentId,
      name: location.name,
      address: addressToValue(location.address),
      notes: location.notes ?? '',
      area: location.area,
      // Only a point somebody placed by hand is an edit to keep. A derived one
      // must stay out of the form, or saving would freeze it into an override
      // that stops following the boundary.
      representativePoint: location.representativePointManual
        ? location.representativePoint
        : undefined,
    },
    onSubmit: async ({ value }) => {
      const res = await updateLocation.mutateAsync({
        id: location.id,
        data: {
          parentId: value.parentId,
          name: value.name,
          address: addressToRequest(value.address),
          area: value.area,
          representativePoint: value.representativePoint,
          notes: value.notes.trim() || undefined,
        },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: 'Could not save',
          description: res.data.detail ?? 'The location was not updated',
        })
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getListLocationTreeQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getGetLocationQueryKey(location.id),
        }),
      ])
      toast.add({ type: 'success', description: 'Location updated' })
      navigate({
        to: '/locations/$locationId',
        params: { locationId: location.id },
        replace: true,
      })
    },
  })

  // Seed the map with the boundary as it stood when the page opened. Reading it
  // from a ref keeps a background refetch from wiping edits in progress. A
  // location with no boundary starts with drawing off, same as a new one.
  const initialArea = useRef(location.area)
  useEffect(() => {
    if (initialArea.current) drawPolygon(initialArea.current)
    return () => cancelDrawing()
  }, [drawPolygon, cancelDrawing])

  useEffect(() => {
    form.setFieldValue('area', polygon)
  }, [form, polygon])

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
    form.setFieldValue('representativePoint', point)
  }, [form, point])

  useEffect(() => {
    const bounds =
      initialArea.current && multiPolygonBounds(initialArea.current)
    if (bounds) fitBounds(bounds)
  }, [fitBounds])

  return (
    <Panel
      title={location.name}
      back={
        <Link
          to="/locations/$locationId"
          params={{ locationId: location.id }}
        />
      }
      backLabel="Back to location"
    >
      <form
        id="edit-location-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name="name"
            validators={{ onChange: UpdateLocationBody.shape.name }}
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
            name="parentId"
            children={(field) => (
              <LocationParentSelect
                id="edit-location-parent"
                value={field.state.value}
                onChange={field.handleChange}
                excludeSubtreeOf={location.id}
              />
            )}
          />

          <form.Field
            name="address"
            children={(field) => (
              <AddressFields
                idPrefix="edit-location-address"
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

          <AreaField
            polygon={polygon}
            isDrawing={isDrawing}
            isSuspended={isPicking}
            onDraw={() => drawPolygon()}
            onStop={cancelDrawing}
          />

          <RepresentativePointField
            point={point}
            isPicking={isPicking}
            hasArea={Boolean(polygon)}
            onPick={() => pickPoint()}
            onClear={cancelPicking}
          />
        </FieldGroup>
      </form>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              form="edit-location-form"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              render={
                <Link
                  to="/locations/$locationId"
                  params={{ locationId: location.id }}
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
