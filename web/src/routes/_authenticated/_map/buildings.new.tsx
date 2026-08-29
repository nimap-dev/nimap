import {
  getListBuildingsQueryKey,
  useCreateBuilding,
} from '#/api/buildings/buildings'
import { CreateBuildingBody } from '#/api/endpoints/buildings/buildings.zod'
import { CreateBuildingRequestStatus } from '#/api/model'
import type { MultiPolygon } from '#/api/model'
import { AddressFields } from '#/components/form/address-fields'
import { FootprintField } from '#/components/form/footprint-field'
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

export const Route = createFileRoute('/_authenticated/_map/buildings/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/buildings' })
    }
  },
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
            children={(field) => (
              <TextField
                field={field}
                label="Name"
                placeholder="Prague 1"
                autoFocus
              />
            )}
          />

          <form.Field
            name="status"
            validators={{ onChange: CreateBuildingBody.shape.status }}
            children={(field) => <StatusField field={field} />}
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
              <TextField field={field} label="Notes" placeholder="Optional" />
            )}
          />

          <FootprintField
            polygon={polygon}
            mode="draw"
            onClear={() => drawPolygon()}
          />
        </FieldGroup>
      </form>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <FormActions
            formId="new-building-form"
            submit="Create building"
            submitting="Creating…"
            isSubmitting={isSubmitting}
            disabled={!canSubmit || !polygon}
            cancel={<Link to="/buildings" />}
          />
        )}
      />
    </Panel>
  )
}
