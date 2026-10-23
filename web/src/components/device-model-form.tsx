import { useListDeviceTypes } from '#/api/device-types/device-types'
import { CreateDeviceModelBody } from '#/api/endpoints/device-models/device-models.zod'
import { useListManufacturers } from '#/api/manufacturers/manufacturers'
import { DeviceTypeIcon } from '#/components/device-type-icon'
import { CheckboxField } from '#/components/form/checkbox-field'
import { FormActions } from '#/components/form/form-actions'
import { SelectField } from '#/components/form/select-field'
import { StatusField } from '#/components/form/status-field'
import { NumberField } from '#/components/form/number-field'
import { TextField } from '#/components/form/text-field'
import { TextareaField } from '#/components/form/textarea-field'
import { useMountingOptions, usePoeStandardOptions } from '#/lib/device-models'
import { websiteSchema } from '#/lib/website'
import { wholeNumberSchema } from '#/lib/whole-number'
import type { DeviceModelFormValues } from '#/lib/device-models'
import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import type { ReactElement, ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import * as zod from 'zod'
import { DetailColumn, DetailGrid } from '#/components/detail-list'
import { FormRow, FormSection } from '#/components/form-section'

const requiredChoice = (message: string) => zod.string().min(1, { message })

const positiveWholeNumber = wholeNumberSchema()
const rackUnitsNumber = wholeNumberSchema({ max: 32767 })

const dimensionKeys = {
  widthMm: 'fields.width',
  heightMm: 'fields.height',
  depthMm: 'fields.depth',
} as const

/**
 * The device model form, shared by create and edit. It owns the fields and
 * their validation; the page decides what saving means. The status is only
 * asked for on create: changing it later has its own control on the detail
 * page, as it does for buildings and locations.
 */
export function DeviceModelForm({
  formId,
  defaultValues,
  withStatus = false,
  submit,
  submitting,
  cancel,
  intro,
  onSubmit,
}: {
  formId: string
  defaultValues: DeviceModelFormValues
  withStatus?: boolean
  submit: string
  submitting: string
  cancel: ReactElement
  /** Said above the sections, across the whole form (what a copy keeps). */
  intro?: ReactNode
  onSubmit: (values: DeviceModelFormValues) => Promise<void>
}) {
  const { t } = useTranslation(['deviceModels', 'common'])
  const mountingOptions = useMountingOptions()
  const standardOptions = usePoeStandardOptions().map(([value, label]) => ({
    value,
    label,
  }))
  const { data: types } = useListDeviceTypes()
  const { data: manufacturers } = useListManufacturers()

  const typeOptions =
    types?.status === 200
      ? types.data.map((type) => ({
          value: type.id,
          label: type.name,
          icon: <DeviceTypeIcon type={type} />,
        }))
      : []
  const manufacturerOptions =
    manufacturers?.status === 200
      ? manufacturers.data.map((manufacturer) => ({
          value: manufacturer.id,
          label: manufacturer.name,
        }))
      : []

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
          {intro && (
            <p className="col-span-full px-1 text-sm text-muted-foreground">
              {intro}
            </p>
          )}

          <DetailColumn>
            <FormSection title={t('fields.model')}>
              <form.Field
                name="manufacturerId"
                validators={{
                  onChange: requiredChoice(t('form.pickManufacturer')),
                  onSubmit: requiredChoice(t('form.pickManufacturer')),
                }}
                children={(field) => (
                  <SelectField
                    field={field}
                    label={t('fields.manufacturer')}
                    emptyLabel={t('form.pickManufacturer')}
                    options={manufacturerOptions}
                    description={
                      <Trans
                        t={t}
                        i18nKey="form.notListed"
                        components={{
                          link: <Link to="/devices/manufacturers/new" />,
                        }}
                      />
                    }
                  />
                )}
              />
              <FormRow className="@sm/section:grid-cols-[2fr_1fr]">
                <form.Field
                  name="name"
                  validators={{
                    onChange: CreateDeviceModelBody.shape.name,
                    onSubmit: CreateDeviceModelBody.shape.name,
                  }}
                  children={(field) => (
                    <TextField
                      field={field}
                      label={t('fields.name')}
                      placeholder="CRS326-24G-2S+RM"
                      autoComplete="off"
                    />
                  )}
                />
                <form.Field
                  name="variant"
                  children={(field) => (
                    <TextField
                      field={field}
                      label={t('fields.variant')}
                      placeholder="rev2, EU…"
                      autoComplete="off"
                    />
                  )}
                />
              </FormRow>
              <form.Field
                name="deviceTypeId"
                validators={{
                  onChange: requiredChoice(t('form.pickType')),
                  onSubmit: requiredChoice(t('form.pickType')),
                }}
                children={(field) => (
                  <SelectField
                    field={field}
                    label={t('fields.type')}
                    emptyLabel={t('form.pickType')}
                    options={typeOptions}
                  />
                )}
              />
              {withStatus && (
                <form.Field
                  name="status"
                  children={(field) => <StatusField field={field} />}
                />
              )}
            </FormSection>

            <FormSection title={t('fields.identification')}>
              <form.Field
                name="partNumber"
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.partNumber')}
                    placeholder={t('common:states.optional')}
                    autoComplete="off"
                  />
                )}
              />
              <form.Field
                name="website"
                validators={{ onChange: websiteSchema }}
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.productPage')}
                    inputMode="url"
                    placeholder="https://www.example.com/products/…"
                    autoComplete="off"
                  />
                )}
              />
            </FormSection>
            <FormSection
              title={t('fields.support')}
              description={t('form.supportDescription')}
            >
              <FormRow>
                <form.Field
                  name="endOfSale"
                  children={(field) => (
                    <TextField
                      field={field}
                      label={t('fields.endOfSale')}
                      type="date"
                    />
                  )}
                />
                <form.Field
                  name="endOfSupport"
                  validators={{
                    onChangeListenTo: ['endOfSale'],
                    onChange: ({ value, fieldApi }) => {
                      const endOfSale = fieldApi.form.getFieldValue('endOfSale')
                      return value && endOfSale && value < endOfSale
                        ? { message: t('form.supportOrder') }
                        : undefined
                    },
                  }}
                  children={(field) => (
                    <TextField
                      field={field}
                      label={t('fields.endOfSupport')}
                      type="date"
                    />
                  )}
                />
              </FormRow>
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
                    rows={4}
                  />
                )}
              />
            </FormSection>
          </DetailColumn>
          <DetailColumn>
            <FormSection title={t('fields.physical')}>
              <FormRow columns={3}>
                {(['widthMm', 'heightMm', 'depthMm'] as const).map((name) => (
                  <form.Field
                    key={name}
                    name={name}
                    validators={{ onChange: positiveWholeNumber }}
                    children={(field) => (
                      <NumberField
                        field={field}
                        label={t(dimensionKeys[name])}
                        placeholder="mm"
                        autoComplete="off"
                      />
                    )}
                  />
                ))}
              </FormRow>
              <FormRow>
                <form.Field
                  name="mounting"
                  children={(field) => (
                    <SelectField
                      field={field}
                      label={t('fields.mounting')}
                      emptyLabel={t('common:states.notSpecified')}
                      allowEmpty
                      options={mountingOptions.map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  )}
                />
                <form.Field
                  name="rackUnits"
                  validators={{ onChange: rackUnitsNumber }}
                  children={(field) => (
                    <NumberField
                      field={field}
                      label={t('fields.rackUnits')}
                      placeholder="U"
                      autoComplete="off"
                    />
                  )}
                />
              </FormRow>
            </FormSection>

            <FormSection title={t('fields.power')}>
              <form.Field
                name="powerWattsMax"
                validators={{ onChange: positiveWholeNumber }}
                children={(field) => (
                  <NumberField
                    field={field}
                    label={t('fields.maxPowerDraw')}
                    placeholder="W"
                    autoComplete="off"
                  />
                )}
              />
              <form.Field
                name="poeIn"
                children={(field) => (
                  <CheckboxField
                    field={field}
                    label={t('fields.poeIn')}
                    description={t('form.poeInDescription')}
                  />
                )}
              />
              <form.Subscribe
                selector={(state) => state.values.poeIn}
                children={(poeIn) =>
                  poeIn && (
                    <form.Field
                      name="poeInStandard"
                      children={(field) => (
                        <SelectField
                          field={field}
                          label={t('fields.poeInStandard')}
                          emptyLabel={t('common:states.unknown')}
                          allowEmpty
                          options={standardOptions}
                        />
                      )}
                    />
                  )
                }
              />
              <form.Field
                name="poeOut"
                children={(field) => (
                  <CheckboxField
                    field={field}
                    label={t('fields.poeOut')}
                    description={t('form.poeOutDescription')}
                  />
                )}
              />
              <form.Subscribe
                selector={(state) => state.values.poeOut}
                children={(poeOut) =>
                  poeOut && (
                    <FormRow>
                      <form.Field
                        name="poeOutStandard"
                        children={(field) => (
                          <SelectField
                            field={field}
                            label={t('fields.poeOutStandard')}
                            emptyLabel={t('common:states.unknown')}
                            allowEmpty
                            options={standardOptions}
                          />
                        )}
                      />
                      <form.Field
                        name="poeBudgetWatts"
                        validators={{ onChange: positiveWholeNumber }}
                        children={(field) => (
                          <NumberField
                            field={field}
                            label={t('fields.poeBudget')}
                            placeholder={t('form.poeBudgetPlaceholder')}
                            autoComplete="off"
                          />
                        )}
                      />
                    </FormRow>
                  )
                }
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
