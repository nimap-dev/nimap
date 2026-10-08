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
import {
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '#/components/ui/field'
import { mountingOptions, poeStandardOptions } from '#/lib/device-models'
import { websiteSchema } from '#/lib/website'
import { wholeNumberSchema } from '#/lib/whole-number'
import type { DeviceModelFormValues } from '#/lib/device-models'
import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import * as zod from 'zod'

const requiredChoice = (message: string) => zod.string().min(1, { message })

const positiveWholeNumber = wholeNumberSchema()
const rackUnitsNumber = wholeNumberSchema({ max: 32767 })

const standardOptions = poeStandardOptions.map(([value, label]) => ({
  value,
  label,
}))

const dimensionLabels = {
  widthMm: 'Width',
  heightMm: 'Height',
  depthMm: 'Depth',
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
  onSubmit,
}: {
  formId: string
  defaultValues: DeviceModelFormValues
  withStatus?: boolean
  submit: string
  submitting: string
  cancel: ReactElement
  onSubmit: (values: DeviceModelFormValues) => Promise<void>
}) {
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Model</FieldLegend>
            <FieldGroup>
              <form.Field
                name="manufacturerId"
                validators={{
                  onChange: requiredChoice('Pick a manufacturer'),
                  onSubmit: requiredChoice('Pick a manufacturer'),
                }}
                children={(field) => (
                  <SelectField
                    field={field}
                    label="Manufacturer"
                    emptyLabel="Pick a manufacturer"
                    options={manufacturerOptions}
                    description={
                      <>
                        Not listed?{' '}
                        <Link to="/devices/manufacturers/new">
                          Add a manufacturer
                        </Link>{' '}
                        first.
                      </>
                    }
                  />
                )}
              />
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <form.Field
                  name="name"
                  validators={{
                    onChange: CreateDeviceModelBody.shape.name,
                    onSubmit: CreateDeviceModelBody.shape.name,
                  }}
                  children={(field) => (
                    <TextField
                      field={field}
                      label="Name"
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
                      label="Variant"
                      placeholder="rev2, EU…"
                      autoComplete="off"
                    />
                  )}
                />
              </div>
              <form.Field
                name="deviceTypeId"
                validators={{
                  onChange: requiredChoice('Pick a device type'),
                  onSubmit: requiredChoice('Pick a device type'),
                }}
                children={(field) => (
                  <SelectField
                    field={field}
                    label="Type"
                    emptyLabel="Pick a device type"
                    options={typeOptions}
                  />
                )}
              />
              <form.Field
                name="partNumber"
                children={(field) => (
                  <TextField
                    field={field}
                    label="Part number"
                    placeholder="Optional"
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
                    label="Product page"
                    inputMode="url"
                    placeholder="https://www.example.com/products/…"
                    autoComplete="off"
                  />
                )}
              />
              {withStatus && (
                <form.Field
                  name="status"
                  children={(field) => <StatusField field={field} />}
                />
              )}
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend>Physical</FieldLegend>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-3">
                {(['widthMm', 'heightMm', 'depthMm'] as const).map((name) => (
                  <form.Field
                    key={name}
                    name={name}
                    validators={{ onChange: positiveWholeNumber }}
                    children={(field) => (
                      <NumberField
                        field={field}
                        label={dimensionLabels[name]}
                        placeholder="mm"
                        autoComplete="off"
                      />
                    )}
                  />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field
                  name="mounting"
                  children={(field) => (
                    <SelectField
                      field={field}
                      label="Mounting"
                      emptyLabel="Not specified"
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
                      label="Rack units"
                      placeholder="U"
                      autoComplete="off"
                    />
                  )}
                />
              </div>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend>Power</FieldLegend>
            <FieldGroup>
              <form.Field
                name="powerWattsMax"
                validators={{ onChange: positiveWholeNumber }}
                children={(field) => (
                  <NumberField
                    field={field}
                    label="Maximum power draw"
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
                    label="Powered over Ethernet"
                    description="The model can run from a PoE port."
                  />
                )}
              />
              {/* The details only appear once the box is ticked; leaving them
                  empty records PoE with the standard still unknown. */}
              <form.Subscribe
                selector={(state) => state.values.poeIn}
                children={(poeIn) =>
                  poeIn && (
                    <form.Field
                      name="poeInStandard"
                      children={(field) => (
                        <SelectField
                          field={field}
                          label="Standard it needs"
                          emptyLabel="Unknown"
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
                    label="Supplies PoE"
                    description="The model can power other devices over Ethernet."
                  />
                )}
              />
              <form.Subscribe
                selector={(state) => state.values.poeOut}
                children={(poeOut) =>
                  poeOut && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <form.Field
                        name="poeOutStandard"
                        children={(field) => (
                          <SelectField
                            field={field}
                            label="Highest standard supplied"
                            emptyLabel="Unknown"
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
                            label="PoE budget"
                            placeholder="W, all ports together"
                            autoComplete="off"
                          />
                        )}
                      />
                    </div>
                  )
                }
              />
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          <form.Field
            name="notes"
            children={(field) => (
              <TextareaField
                field={field}
                label="Notes"
                placeholder="Firmware quirks, accessories, where the manual lives…"
                rows={4}
              />
            )}
          />
        </FieldGroup>
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
    </div>
  )
}
