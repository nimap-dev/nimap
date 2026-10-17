import { CreateLocationBody } from '#/api/endpoints/locations/locations.zod'
import type {
  CreateLocationRequestStatus,
  LocationResponse,
  MultiPolygon,
  Point,
} from '#/api/model'
import { DetailGrid } from '#/components/detail-list'
import { AddressFields } from '#/components/form/address-fields'
import type { AddressValue } from '#/lib/address'
import { AreaField } from '#/components/form/area-field'
import { FormActions } from '#/components/form/form-actions'
import { LocationSelect } from '#/components/form/location-select'
import { RepresentativePointField } from '#/components/form/representative-point-field'
import { StatusField } from '#/components/form/status-field'
import { TextField } from '#/components/form/text-field'
import { TextareaField } from '#/components/form/textarea-field'
import { FormSection } from '#/components/form-section'
import { addressToValue, emptyAddress } from '#/lib/address'
import { useWorldMap } from '#/lib/map'
import { useForm } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export type LocationFormValues = {
  parentId: string | undefined
  name: string
  address: AddressValue
  notes: string
  status: CreateLocationRequestStatus
  area: MultiPolygon | undefined
  representativePoint: Point | undefined
}

export const emptyLocationValues: LocationFormValues = {
  parentId: undefined,
  name: '',
  address: emptyAddress,
  notes: '',
  status: 'active',
  area: undefined,
  representativePoint: undefined,
}

/** A saved location as the form's values. */
export function locationToValues(
  location: LocationResponse,
): LocationFormValues {
  return {
    parentId: location.parentId,
    name: location.name,
    address: addressToValue(location.address),
    notes: location.notes ?? '',
    status: location.status,
    area: location.area,
    // Only a point somebody placed by hand is an edit to keep. A derived one
    // must stay out of the form, or saving would freeze it into an override
    // that stops following the boundary.
    representativePoint: location.representativePointManual
      ? location.representativePoint
      : undefined,
  }
}

/**
 * The location form, shared by create and edit. The boundary and the map
 * point are drawn on the map, so the form follows the map's drawing state
 * into its values; what the map starts with (an existing boundary to edit,
 * or nothing) is the page's to seed. One column: it lives in the map panel.
 */
export function LocationForm({
  formId,
  defaultValues,
  withStatus = false,
  autoFocus = false,
  excludeSubtreeOf,
  submit,
  submitting,
  cancel,
  onSubmit,
}: {
  formId: string
  defaultValues: LocationFormValues
  /** Only asked on create; the detail page has its own control for it. */
  withStatus?: boolean
  autoFocus?: boolean
  /**
   * The location being edited: it and everything inside it can't be its own
   * parent. Left out on create, where the drawn boundary suggests a parent.
   */
  excludeSubtreeOf?: string
  submit: string
  submitting: string
  cancel: ReactElement
  onSubmit: (values: LocationFormValues) => Promise<void>
}) {
  const { t } = useTranslation('locations')
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

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value),
  })

  useEffect(() => {
    form.setFieldValue('area', polygon)
  }, [form, polygon])

  useEffect(() => {
    form.setFieldValue('representativePoint', point)
  }, [form, point])

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
          <FormSection title={t('form.location')}>
            <form.Field
              name="name"
              validators={{ onChange: CreateLocationBody.shape.name }}
              children={(field) => (
                <TextField
                  field={field}
                  label={t('fields.name')}
                  placeholder="Areál Sever"
                  autoComplete="off"
                  autoFocus={autoFocus}
                />
              )}
            />
            {withStatus && (
              <form.Field
                name="status"
                children={(field) => <StatusField field={field} />}
              />
            )}
            <form.Field
              name="parentId"
              children={(field) => (
                <LocationSelect
                  id={`${formId}-parent`}
                  value={field.state.value}
                  onChange={field.handleChange}
                  excludeSubtreeOf={excludeSubtreeOf}
                  suggestFor={excludeSubtreeOf ? undefined : polygon}
                />
              )}
            />
          </FormSection>

          <FormSection title={t('form.map')}>
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
          </FormSection>

          <FormSection title={t('fields.address')}>
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
            disabled={!canSubmit}
            cancel={cancel}
          />
        )}
      />
    </>
  )
}
