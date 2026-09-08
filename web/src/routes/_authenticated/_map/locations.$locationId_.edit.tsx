import {
  getGetLocationQueryKey,
  getListLocationsQueryKey,
  useGetLocation,
  useUpdateLocation,
} from '#/api/locations/locations'
import { UpdateLocationBody } from '#/api/endpoints/locations/locations.zod'
import type { LocationResponse } from '#/api/model'
import { AddressFields } from '#/components/form/address-fields'
import { AreaField } from '#/components/form/area-field'
import { LocationSelect } from '#/components/form/location-select'
import { RepresentativePointField } from '#/components/form/representative-point-field'
import { FormActions } from '#/components/form/form-actions'
import { TextField } from '#/components/form/text-field'
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
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { can } from '#/lib/auth'
import { FieldGroup } from '#/components/ui/field'

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
      <PanelPending
        back={<Link to="/locations" />}
        backLabel="Back to locations"
      />
    )
  }

  if (!location) {
    return (
      <PanelNotFound
        noun="location"
        back={<Link to="/locations" />}
        backLabel="Back to locations"
      />
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
            children={(field) => <TextField field={field} label="Name" />}
          />

          <form.Field
            name="parentId"
            children={(field) => (
              <LocationSelect
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
              <TextField field={field} label="Notes" placeholder="Optional" />
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
          <FormActions
            formId="edit-location-form"
            submit="Save changes"
            submitting="Saving…"
            isSubmitting={isSubmitting}
            disabled={!canSubmit}
            cancel={
              <Link
                to="/locations/$locationId"
                params={{ locationId: location.id }}
              />
            }
          />
        )}
      />
    </Panel>
  )
}
