import {
  getListLocationTreeQueryKey,
  getListLocationsQueryKey,
  useCreateLocation,
} from '#/api/locations/locations'
import { CreateLocationBody } from '#/api/endpoints/locations/locations.zod'
import { CreateLocationRequestStatus } from '#/api/model'
import type { MultiPolygon, Point } from '#/api/model'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from '#/components/ui/toast'
import { addressToRequest, emptyAddress } from '#/lib/address'
import { lifecycleStatusLabels, lifecycleStatusOptions } from '#/lib/lifecycle'
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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getListLocationTreeQueryKey(),
        }),
      ])
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
                    placeholder="Areál Sever"
                    autoFocus
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
                id="new-location-parent"
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          />

          <form.Field
            name="status"
            validators={{ onChange: CreateLocationBody.shape.status }}
            children={(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                <Select
                  items={lifecycleStatusLabels}
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as CreateLocationRequestStatus)
                  }
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lifecycleStatusOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
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
              form="new-location-form"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create location'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              render={<Link to="/locations" />}
            >
              Cancel
            </Button>
          </div>
        )}
      />
    </Panel>
  )
}
