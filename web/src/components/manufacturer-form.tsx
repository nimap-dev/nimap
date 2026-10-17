import { CreateManufacturerBody } from '#/api/endpoints/manufacturers/manufacturers.zod'
import type { ManufacturerResponse } from '#/api/model'
import { DetailColumn, DetailGrid } from '#/components/detail-list'
import { FormActions } from '#/components/form/form-actions'
import { TextField } from '#/components/form/text-field'
import { TextareaField } from '#/components/form/textarea-field'
import { FormSection } from '#/components/form-section'
import { websiteSchema } from '#/lib/website'
import { useForm } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

export type ManufacturerFormValues = {
  name: string
  website: string
  notes: string
}

export const emptyManufacturerValues: ManufacturerFormValues = {
  name: '',
  website: '',
  notes: '',
}

/** A saved manufacturer as the form's values, absent fields as empty text. */
export function manufacturerToValues(
  manufacturer: ManufacturerResponse,
): ManufacturerFormValues {
  return {
    name: manufacturer.name,
    website: manufacturer.website ?? '',
    notes: manufacturer.notes ?? '',
  }
}

/**
 * The manufacturer form, shared by create and edit. It owns the fields and
 * their validation; the page decides what saving means. Its sections follow
 * the detail page, so a field is where it was a click ago.
 */
export function ManufacturerForm({
  formId,
  defaultValues,
  autoFocus = false,
  submit,
  submitting,
  cancel,
  onSubmit,
}: {
  formId: string
  defaultValues: ManufacturerFormValues
  /** Starts typing in the name, for a new record where nothing is filled yet. */
  autoFocus?: boolean
  submit: string
  submitting: string
  cancel: ReactElement
  onSubmit: (values: ManufacturerFormValues) => Promise<void>
}) {
  const { t } = useTranslation('manufacturers')

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value),
  })
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
          <DetailColumn>
            <FormSection title={t('fields.manufacturer')}>
              <form.Field
                name="name"
                validators={{ onChange: CreateManufacturerBody.shape.name }}
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.name')}
                    placeholder="MikroTik"
                    autoComplete="off"
                    autoFocus={autoFocus}
                  />
                )}
              />
            </FormSection>

            <FormSection title={t('fields.contact')}>
              <form.Field
                name="website"
                validators={{ onChange: websiteSchema }}
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.website')}
                    inputMode="url"
                    placeholder="https://www.example.com"
                    autoComplete="off"
                  />
                )}
              />
            </FormSection>
          </DetailColumn>

          <DetailColumn>
            <FormSection title={t('fields.notes')}>
              <form.Field
                name="notes"
                children={(field) => (
                  <TextareaField
                    field={field}
                    label={t('fields.notes')}
                    hideLabel
                    placeholder={t('fields.notesPlaceholder')}
                    rows={6}
                  />
                )}
              />
            </FormSection>
          </DetailColumn>
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
