import { useListDeviceModels } from '#/api/device-models/device-models'
import { useListDeviceTypes } from '#/api/device-types/device-types'
import { useListDevices } from '#/api/devices/devices'
import { CreateDeviceBody } from '#/api/endpoints/devices/devices.zod'
import { DetailColumn, DetailGrid } from '#/components/detail-list'
import { DeviceTypeIcon } from '#/components/device-type-icon'
import { ChoiceField } from '#/components/form/choice-field'
import { FormActions } from '#/components/form/form-actions'
import { SelectField } from '#/components/form/select-field'
import { StatusField } from '#/components/form/status-field'
import { TextField } from '#/components/form/text-field'
import { TextareaField } from '#/components/form/textarea-field'
import { FormRow, FormSection } from '#/components/form-section'
import { formatModelName } from '#/lib/device-models'
import { isHostname, isIpAddress } from '#/lib/devices'
import type { DeviceFormValues } from '#/lib/devices'
import { ALL_LIFECYCLE_STATUSES } from '#/lib/lifecycle'
import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { Boxes, Shapes } from 'lucide-react'
import type { ReactElement } from 'react'
import { Trans, useTranslation } from 'react-i18next'

/**
 * The device form, shared by create and edit. On create the code may stay
 * empty, and the server assigns the next code of the device's type; on edit it
 * is required, since a device always has one. The status is only asked for on
 * create: changing it later has its own control on the detail page.
 */
export function DeviceForm({
  formId,
  defaultValues,
  deviceId,
  submit,
  submitting,
  cancel,
  onSubmit,
}: {
  formId: string
  defaultValues: DeviceFormValues
  /** The device being edited; leave it out on create. */
  deviceId?: string
  submit: string
  submitting: string
  cancel: ReactElement
  onSubmit: (values: DeviceFormValues) => Promise<void>
}) {
  const { t } = useTranslation(['devices', 'common'])
  const creating = deviceId === undefined
  const { data: types } = useListDeviceTypes()
  const { data: models } = useListDeviceModels({
    status: ALL_LIFECYCLE_STATUSES,
  })
  const { data: devices } = useListDevices({ status: ALL_LIFECYCLE_STATUSES })

  const typeList = types?.status === 200 ? types.data : []
  const modelList = models?.status === 200 ? models.data : []
  const deviceList = devices?.status === 200 ? devices.data : []

  const typeOptions = typeList.map((type) => ({
    value: type.id,
    label: type.name,
    icon: <DeviceTypeIcon type={type} />,
  }))
  const modelOptions = modelList.map((model) => ({
    value: model.id,
    label: `${model.manufacturer.name} ${formatModelName(model)}`,
    icon: <DeviceTypeIcon type={model.deviceType} />,
  }))

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value),
  })

  /** The next code of the type the form currently points at, as a preview. */
  function nextCode(values: DeviceFormValues): string | undefined {
    const typeId =
      values.kind === 'model'
        ? modelList.find((model) => model.id === values.deviceModelId)
            ?.deviceType.id
        : values.deviceTypeId

    return typeList.find((type) => type.id === typeId)?.nextCode
  }

  /** Codes of the other devices managed on this address, for a warning. */
  function devicesOnIp(ip: string): string[] {
    const address = ip.trim().toLowerCase()
    if (!address) return []

    return deviceList
      .filter(
        (device) =>
          device.id !== deviceId &&
          device.managementIp?.toLowerCase() === address,
      )
      .map((device) => device.code)
  }

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
            <FormSection title={t('form.device')}>
              <form.Field
                name="kind"
                children={(field) => (
                  <ChoiceField
                    field={field}
                    label={t('form.kind')}
                    options={[
                      {
                        value: 'model',
                        label: t('form.withModel'),
                        icon: <Boxes />,
                      },
                      {
                        value: 'type',
                        label: t('form.withoutModel'),
                        hint: t('form.withoutModelHint'),
                        icon: <Shapes />,
                      },
                    ]}
                  />
                )}
              />
              <form.Subscribe
                selector={(state) => state.values.kind}
                children={(kind) => (
                  <>
                    <div hidden={kind !== 'model'}>
                      <form.Field
                        name="deviceModelId"
                        validators={{
                          onChangeListenTo: ['kind'],
                          onChange: ({ value, fieldApi }) =>
                            fieldApi.form.getFieldValue('kind') === 'model' &&
                            !value
                              ? { message: t('form.pickModel') }
                              : undefined,
                          onSubmit: ({ value, fieldApi }) =>
                            fieldApi.form.getFieldValue('kind') === 'model' &&
                            !value
                              ? { message: t('form.pickModel') }
                              : undefined,
                        }}
                        children={(field) => (
                          <SelectField
                            field={field}
                            label={t('fields.model')}
                            emptyLabel={t('form.pickModel')}
                            options={modelOptions}
                            description={
                              <Trans
                                t={t}
                                i18nKey="form.modelNotListed"
                                components={{
                                  link: <Link to="/devices/models/new" />,
                                }}
                              />
                            }
                          />
                        )}
                      />
                    </div>
                    <div hidden={kind !== 'type'}>
                      <form.Field
                        name="deviceTypeId"
                        validators={{
                          onChangeListenTo: ['kind'],
                          onChange: ({ value, fieldApi }) =>
                            fieldApi.form.getFieldValue('kind') === 'type' &&
                            !value
                              ? { message: t('form.pickType') }
                              : undefined,
                          onSubmit: ({ value, fieldApi }) =>
                            fieldApi.form.getFieldValue('kind') === 'type' &&
                            !value
                              ? { message: t('form.pickType') }
                              : undefined,
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
                    </div>
                  </>
                )}
              />
              <form.Field
                name="name"
                validators={{
                  onChange: CreateDeviceBody.shape.name,
                  onSubmit: CreateDeviceBody.shape.name,
                }}
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.name')}
                    placeholder="Core switch"
                    autoComplete="off"
                  />
                )}
              />
              <form.Subscribe
                selector={(state) => nextCode(state.values)}
                children={(next) => (
                  <form.Field
                    name="code"
                    validators={
                      creating
                        ? undefined
                        : {
                            onChange: ({ value }) =>
                              value.trim()
                                ? undefined
                                : { message: t('form.codeRequired') },
                          }
                    }
                    children={(field) => (
                      <TextField
                        field={field}
                        label={t('fields.code')}
                        placeholder={
                          creating ? (next ?? t('form.codeAuto')) : undefined
                        }
                        description={
                          creating
                            ? t('form.codeDescription')
                            : t('form.codeEditDescription')
                        }
                        autoComplete="off"
                      />
                    )}
                  />
                )}
              />
              {creating && (
                <form.Field
                  name="status"
                  children={(field) => <StatusField field={field} />}
                />
              )}
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
            <FormSection title={t('fields.identification')}>
              <form.Field
                name="physicalLabel"
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.physicalLabel')}
                    placeholder={t('common:states.optional')}
                    description={t('form.physicalLabelDescription')}
                    autoComplete="off"
                  />
                )}
              />
              <FormRow>
                <form.Field
                  name="serialNumber"
                  children={(field) => (
                    <TextField
                      field={field}
                      label={t('fields.serialNumber')}
                      placeholder={t('common:states.optional')}
                      autoComplete="off"
                    />
                  )}
                />
                <form.Field
                  name="inventoryNumber"
                  children={(field) => (
                    <TextField
                      field={field}
                      label={t('fields.inventoryNumber')}
                      placeholder={t('common:states.optional')}
                      autoComplete="off"
                    />
                  )}
                />
              </FormRow>
            </FormSection>

            <FormSection title={t('fields.network')}>
              <form.Field
                name="managementIp"
                validators={{
                  onChange: ({ value }) =>
                    value.trim() && !isIpAddress(value.trim())
                      ? { message: t('form.invalidIp') }
                      : undefined,
                }}
                children={(field) => {
                  const others = devicesOnIp(field.state.value)

                  return (
                    <TextField
                      field={field}
                      label={t('fields.managementIp')}
                      placeholder="192.168.1.10"
                      inputMode="url"
                      autoComplete="off"
                      description={
                        others.length > 0 && (
                          <span className="text-amber-700 dark:text-amber-400">
                            {t('form.ipInUse', { devices: others.join(', ') })}
                          </span>
                        )
                      }
                    />
                  )
                }}
              />
              <form.Field
                name="hostname"
                validators={{
                  onChange: ({ value }) =>
                    value.trim() && !isHostname(value.trim())
                      ? { message: t('form.invalidHostname') }
                      : undefined,
                }}
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.hostname')}
                    placeholder="sw1.example.com"
                    inputMode="url"
                    autoComplete="off"
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
