import { CreateBuildingBody } from '#/api/endpoints/buildings/buildings.zod'
import type {
  BuildingResponse,
  CreateBuildingRequestStatus,
  MultiPolygon,
} from '#/api/model'
import { DetailGrid } from '#/components/detail-list'
import { AddressFields } from '#/components/form/address-fields'
import { FootprintField } from '#/components/form/footprint-field'
import { FormActions } from '#/components/form/form-actions'
import { LocationSelect } from '#/components/form/location-select'
import { StatusField } from '#/components/form/status-field'
import { TextField } from '#/components/form/text-field'
import { TextareaField } from '#/components/form/textarea-field'
import { FormSection } from '#/components/form-section'
import { addressToValue, emptyAddress } from '#/lib/address'
import type { AddressValue } from '#/lib/address'
import { useWorldMap } from '#/lib/map'
import { useForm } from '@tanstack/react-form'
import { useEffect } from 'react'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

export type BuildingFormValues = {
  name: string
  locationId: string | undefined
  address: AddressValue
  notes: string
  status: CreateBuildingRequestStatus
  footprint: MultiPolygon | undefined
}

export const emptyBuildingValues: BuildingFormValues = {
  name: '',
  locationId: undefined,
  address: emptyAddress,
  notes: '',
  status: 'active',
  footprint: undefined,
}

/** A saved building as the form's values. */
export function buildingToValues(
  building: BuildingResponse,
): BuildingFormValues {
  return {
    name: building.name,
    locationId: building.locationId,
    address: addressToValue(building.address),
    notes: building.notes ?? '',
    status: building.status,
    footprint: building.footprint,
  }
}

/**
 * The building form, shared by create and edit. The footprint is drawn on the
 * map and is required, so the map stays in drawing mode while this is open and
 * saving waits until something is drawn; what the map starts with (nothing, or
 * the footprint to reshape) is the page's to seed. One column: it lives in the
 * map panel.
 */
export function BuildingForm({
  formId,
  defaultValues,
  mode,
  autoFocus = false,
  submit,
  submitting,
  cancel,
  onSubmit,
}: {
  formId: string
  defaultValues: BuildingFormValues
  /**
   * `create` asks for the status and suggests a location from the drawn
   * footprint; `edit` lets the existing footprint be reshaped.
   */
  mode: 'create' | 'edit'
  autoFocus?: boolean
  submit: string
  submitting: string
  cancel: ReactElement
  onSubmit: (values: BuildingFormValues) => Promise<void>
}) {
  const { t } = useTranslation('buildings')
  const { drawPolygon, polygon } = useWorldMap()

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value),
  })

  // Only a drawn shape is taken: before the page seeds the map there is none,
  // and that must not wipe the footprint the form started with.
  useEffect(() => {
    if (polygon) form.setFieldValue('footprint', polygon)
  }, [form, polygon])

  return (
    <>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <DetailGrid>
          <FormSection title={t('form.building')}>
            <form.Field
              name="name"
              validators={{ onChange: CreateBuildingBody.shape.name }}
              children={(field) => (
                <TextField
                  field={field}
                  label={t('fields.name')}
                  placeholder="Budova A"
                  autoComplete="off"
                  autoFocus={autoFocus}
                />
              )}
            />
            {mode === 'create' && (
              <form.Field
                name="status"
                children={(field) => <StatusField field={field} />}
              />
            )}
          </FormSection>

          <FormSection title={t('form.map')}>
            <FootprintField
              polygon={polygon}
              mode={mode === 'edit' ? 'reshape' : 'draw'}
              onClear={() => drawPolygon()}
            />
          </FormSection>

          <FormSection title={t('fields.placement')}>
            <form.Field
              name="locationId"
              children={(field) => (
                <LocationSelect
                  id={`${formId}-location`}
                  value={field.state.value}
                  onChange={field.handleChange}
                  label={t('fields.location')}
                  emptyLabel={t('form.notPlaced')}
                  suggestFor={mode === 'create' ? polygon : undefined}
                />
              )}
            />
            <form.Field
              name="address"
              children={(field) => (
                <AddressFields
                  idPrefix={`${formId}-address`}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            />
          </FormSection>

          <FormSection title={t('fields.notes')}>
            <form.Field
              name="notes"
              children={(field) => (
                <TextareaField
                  field={field}
                  label={t('fields.notes')}
                  hideLabel
                  placeholder={t('form.notesPlaceholder')}
                  rows={3}
                />
              )}
            />
          </FormSection>
        </DetailGrid>
      </form>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <FormActions
            formId={formId}
            submit={submit}
            submitting={submitting}
            isSubmitting={isSubmitting}
            // A building without a footprint can't be saved at all.
            disabled={!canSubmit || !polygon}
            cancel={cancel}
          />
        )}
      />
    </>
  )
}
