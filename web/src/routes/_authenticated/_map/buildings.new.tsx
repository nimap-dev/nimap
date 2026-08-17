import {
  getListBuildingsQueryKey,
  useCreateBuilding,
} from '#/api/buildings/buildings'
import { CreateBuildingBody } from '#/api/endpoints/buildings/buildings.zod'
import { CreateBuildingRequestStatus } from '#/api/model'
import type { MultiPolygon } from '#/api/model'
import { AddressFields } from '#/components/address-fields'
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
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Panel } from '#/components/panel'

export const Route = createFileRoute('/_authenticated/_map/buildings/new')({
  component: NewBuilding,
})

function NewBuilding() {
  const { drawPolygon, cancelDrawing, polygon } = useWorldMap()
  const createBuilding = useCreateBuilding()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      name: '',
      address: emptyAddress,
      notes: '',
      status: CreateBuildingRequestStatus.active as CreateBuildingRequestStatus,
      footprint: undefined as MultiPolygon | undefined,
    },
    onSubmit: async ({ value }) => {
      if (!value.footprint) return

      const res = await createBuilding.mutateAsync({
        data: {
          name: value.name,
          address: addressToRequest(value.address),
          footprint: value.footprint,
          notes: value.notes.trim() || undefined,
          status: value.status,
        },
      })

      if (res.status !== 201) {
        toast.add({
          type: 'error',
          description: res.data.detail ?? 'Could not create the building',
        })
        return
      }

      await queryClient.invalidateQueries({
        queryKey: getListBuildingsQueryKey(),
      })
      toast.add({ type: 'success', description: 'Building created' })
      navigate({
        to: '/buildings/$buildingId',
        params: { buildingId: res.data.id },
        replace: true,
      })
    },
  })

  // Drawing is on for as long as this page is open, and anything left unsaved
  // is discarded on the way out.
  useEffect(() => {
    drawPolygon()
    return () => cancelDrawing()
  }, [drawPolygon, cancelDrawing])

  useEffect(() => {
    form.setFieldValue('footprint', polygon)
  }, [form, polygon])

  return (
    <Panel
      title="New building"
      back={<Link to="/buildings" />}
      backLabel="Back to buildings"
    >
      <form
        id="new-building-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name="name"
            validators={{ onChange: CreateBuildingBody.shape.name }}
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
                    placeholder="Prague 1"
                    autoFocus
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="status"
            validators={{ onChange: CreateBuildingBody.shape.status }}
            children={(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                <Select
                  items={lifecycleStatusLabels}
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as CreateBuildingRequestStatus)
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
                idPrefix="new-building-address"
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

          <form.Field
            name="footprint"
            children={() => {
              const parts = polygon?.coordinates.length ?? 0
              return (
                <Field>
                  <FieldLabel>Footprint</FieldLabel>
                  <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                    {parts > 0 ? (
                      <span>
                        {parts} {parts === 1 ? 'part' : 'parts'} drawn
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
              )
            }}
          />
        </FieldGroup>
      </form>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              form="new-building-form"
              disabled={!canSubmit || isSubmitting || !polygon}
            >
              {isSubmitting ? 'Creating…' : 'Create building'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              render={<Link to="/buildings" />}
            >
              Cancel
            </Button>
          </div>
        )}
      />
    </Panel>
  )
}
