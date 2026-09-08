import {
  getListLocationsQueryKey,
  useCreateLocation,
} from '#/api/locations/locations'
import { CreateLocationBody } from '#/api/endpoints/locations/locations.zod'
import { CreateLocationRequestStatus } from '#/api/model'
import type { MultiPolygon, Point } from '#/api/model'
import { AddressFields } from '#/components/form/address-fields'
import { AreaField } from '#/components/form/area-field'
import { LocationSelect } from '#/components/form/location-select'
import { RepresentativePointField } from '#/components/form/representative-point-field'
import { FormActions } from '#/components/form/form-actions'
import { StatusField } from '#/components/form/status-field'
import { TextField } from '#/components/form/text-field'
import { FieldGroup } from '#/components/ui/field'
import { toast } from '#/components/ui/toast'
import { addressToRequest, emptyAddress } from '#/lib/address'
import { useWorldMap } from '#/lib/map'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { Panel } from '#/components/panel'
import { can } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated/_map/locations/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/locations' })
    }
  },
  component: NewLocation,
})

function NewLocation() {
  const {
    drawPolygon,
    cancelDrawing,
    polygon,
    isDrawing,
    pickPoint,
    cancelPicking,
    point,
    isPicking,
  } = useWorldMap()
  const createLocation = useCreateLocation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      parentId: undefined as string | undefined,
      name: '',
      address: emptyAddress,
      notes: '',
      status: CreateLocationRequestStatus.active as CreateLocationRequestStatus,
      area: undefined as MultiPolygon | undefined,
      representativePoint: undefined as Point | undefined,
    },
    onSubmit: async ({ value }) => {
      const res = await createLocation.mutateAsync({
        data: {
          parentId: value.parentId,
          name: value.name,
          address: addressToRequest(value.address),
          area: value.area,
          representativePoint: value.representativePoint,
          notes: value.notes.trim() || undefined,
          status: value.status,
        },
      })

      if (res.status !== 201) {
        toast.add({
          type: 'error',
          description: res.data.detail ?? 'Could not create the location',
        })
        return
      }

      await queryClient.invalidateQueries({
        queryKey: getListLocationsQueryKey(),
      })
      toast.add({ type: 'success', description: 'Location created' })
      navigate({
        to: '/locations/$locationId',
        params: { locationId: res.data.id },
        replace: true,
      })
    },
  })

  useEffect(() => cancelDrawing, [cancelDrawing])
  useEffect(() => cancelPicking, [cancelPicking])

  useEffect(() => {
    form.setFieldValue('area', polygon)
  }, [form, polygon])

  useEffect(() => {
    form.setFieldValue('representativePoint', point)
  }, [form, point])

  return (
    <Panel
      title="New location"
      back={<Link to="/locations" />}
      backLabel="Back to locations"
    >
      <form
        id="new-location-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name="name"
            validators={{ onChange: CreateLocationBody.shape.name }}
            children={(field) => (
              <TextField
                field={field}
                label="Name"
                placeholder="Areál Sever"
                autoFocus
              />
            )}
          />

          <form.Field
            name="parentId"
            children={(field) => (
              <LocationSelect
                id="new-location-parent"
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          />

          <form.Field
            name="status"
            validators={{ onChange: CreateLocationBody.shape.status }}
            children={(field) => <StatusField field={field} />}
          />

          <form.Field
            name="address"
            children={(field) => (
              <AddressFields
                idPrefix="new-location-address"
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
            formId="new-location-form"
            submit="Create location"
            submitting="Creating…"
            isSubmitting={isSubmitting}
            disabled={!canSubmit}
            cancel={<Link to="/locations" />}
          />
        )}
      />
    </Panel>
  )
}
