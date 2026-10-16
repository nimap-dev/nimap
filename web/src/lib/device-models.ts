import {
  DeviceModelResponseMounting,
  DeviceModelResponsePoeInStandard,
} from '#/api/model'
import type { DeviceModelResponse } from '#/api/model'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { optional } from '#/lib/utils'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Orval mints a mounting enum per schema (response, create, update), all with
 * the same values. This is the name to use for "a mounting type".
 */
export type MountingType = DeviceModelResponseMounting

/** Each mounting type's name in the interface language. */
export function useMountingLabels(): Record<MountingType, string> {
  const { t } = useTranslation('deviceModels')

  return {
    rack: t('mounting.rack'),
    wall: t('mounting.wall'),
    desktop: t('mounting.desktop'),
    din_rail: t('mounting.din_rail'),
    ceiling: t('mounting.ceiling'),
    pole: t('mounting.pole'),
    embedded: t('mounting.embedded'),
    other: t('mounting.other'),
  }
}

export function useMountingOptions() {
  return Object.entries(useMountingLabels()) as Array<[MountingType, string]>
}

/** Orval's per-schema enum again: one name for "a PoE standard". */
export type PoeStandard = DeviceModelResponsePoeInStandard

/** The standards keep their IEEE names; only "passive" is a word to translate. */
export function usePoeStandardLabels(): Record<PoeStandard, string> {
  const { t } = useTranslation('deviceModels')

  return {
    [DeviceModelResponsePoeInStandard.af]: '802.3af (PoE)',
    [DeviceModelResponsePoeInStandard.at]: '802.3at (PoE+)',
    [DeviceModelResponsePoeInStandard.bt]: '802.3bt (PoE++)',
    [DeviceModelResponsePoeInStandard.passive]: t('poeStandard.passive'),
  }
}

export function usePoeStandardOptions() {
  return Object.entries(usePoeStandardLabels()) as Array<[PoeStandard, string]>
}

/** The model's name with its variant, if it has one: "CRS326 (rev2)". */
export function formatModelName(
  model: Pick<DeviceModelResponse, 'name' | 'variant'>,
): string {
  return model.variant ? `${model.name} (${model.variant})` : model.name
}

/** The list's summaries of a model, in the interface language. */
export function useDeviceModelFormatters() {
  const { t } = useTranslation('deviceModels')

  // Kept stable per language, so a table's memoised columns can depend on it.
  return useMemo(
    () => ({
      /**
       * How the model sits in place, in as few words as the data allows: "1U
       * rack", "2U", "Wall", or an empty string when neither is known.
       */
      formatFormFactor(
        model: Pick<DeviceModelResponse, 'rackUnits' | 'mounting'>,
      ): string {
        const units = model.rackUnits ? `${model.rackUnits}U` : ''
        const mounting = model.mounting ? t(`mounting.${model.mounting}`) : ''

        if (units && model.mounting === DeviceModelResponseMounting.rack) {
          return t('rackFormFactor', { units: model.rackUnits })
        }

        return [units, mounting].filter(Boolean).join(' · ')
      },

      /**
       * Which way the model handles Power over Ethernet, under a "PoE"
       * heading: "In" when it can be powered, "Out" when it powers others, ""
       * for neither.
       */
      formatPoe(model: Pick<DeviceModelResponse, 'poeIn' | 'poeOut'>): string {
        return [model.poeIn && t('poeIn'), model.poeOut && t('poeOut')]
          .filter(Boolean)
          .join(' · ')
      },
    }),
    [t],
  )
}

/**
 * A device model as its form holds it. Text and choices are strings, "" meaning
 * not filled in; numbers are numbers, undefined meaning not filled in.
 */
export type DeviceModelFormValues = {
  deviceTypeId: string
  manufacturerId: string
  name: string
  variant: string
  partNumber: string
  website: string
  widthMm: number | undefined
  heightMm: number | undefined
  depthMm: number | undefined
  rackUnits: number | undefined
  mounting: MountingType | ''
  powerWattsMax: number | undefined
  poeIn: boolean
  poeInStandard: PoeStandard | ''
  poeOut: boolean
  poeOutStandard: PoeStandard | ''
  poeBudgetWatts: number | undefined
  notes: string
  status: LifecycleStatus
}

export const emptyDeviceModelValues: DeviceModelFormValues = {
  deviceTypeId: '',
  manufacturerId: '',
  name: '',
  variant: '',
  partNumber: '',
  website: '',
  widthMm: undefined,
  heightMm: undefined,
  depthMm: undefined,
  rackUnits: undefined,
  mounting: '',
  powerWattsMax: undefined,
  poeIn: false,
  poeInStandard: '',
  poeOut: false,
  poeOutStandard: '',
  poeBudgetWatts: undefined,
  notes: '',
  status: 'active',
}

export function deviceModelToValues(
  model: DeviceModelResponse,
): DeviceModelFormValues {
  return {
    deviceTypeId: model.deviceType.id,
    manufacturerId: model.manufacturer.id,
    name: model.name,
    variant: model.variant ?? '',
    partNumber: model.partNumber ?? '',
    website: model.website ?? '',
    widthMm: model.widthMm,
    heightMm: model.heightMm,
    depthMm: model.depthMm,
    rackUnits: model.rackUnits,
    mounting: model.mounting ?? '',
    powerWattsMax: model.powerWattsMax,
    poeIn: model.poeIn,
    poeInStandard: model.poeInStandard ?? '',
    poeOut: model.poeOut,
    poeOutStandard: model.poeOutStandard ?? '',
    poeBudgetWatts: model.poeBudgetWatts,
    notes: model.notes ?? '',
    status: model.status,
  }
}

/**
 * A copy of an existing model to start a new one from. The variant and part
 * number are what tells two otherwise identical models apart, so they start
 * empty rather than as a guaranteed duplicate.
 */
export function deviceModelToCopyValues(
  model: DeviceModelResponse,
): DeviceModelFormValues {
  return { ...deviceModelToValues(model), variant: '', partNumber: '' }
}

/**
 * The fields create and update share. Text goes out exactly as typed, an empty
 * field is left out; on update that clears it, since the request replaces the
 * whole model.
 */
export function deviceModelToRequest(values: DeviceModelFormValues) {
  return {
    deviceTypeId: values.deviceTypeId,
    manufacturerId: values.manufacturerId,
    name: values.name,
    variant: optional(values.variant),
    partNumber: optional(values.partNumber),
    website: optional(values.website),
    widthMm: values.widthMm,
    heightMm: values.heightMm,
    depthMm: values.depthMm,
    rackUnits: values.rackUnits,
    mounting: values.mounting === '' ? undefined : values.mounting,
    powerWattsMax: values.powerWattsMax,
    poeIn: values.poeIn,
    poeOut: values.poeOut,
    // The details only mean something on a side the model supports, and the
    // server refuses them otherwise; unticking a box drops what was under it.
    poeInStandard:
      values.poeIn && values.poeInStandard !== ''
        ? values.poeInStandard
        : undefined,
    poeOutStandard:
      values.poeOut && values.poeOutStandard !== ''
        ? values.poeOutStandard
        : undefined,
    poeBudgetWatts: values.poeOut ? values.poeBudgetWatts : undefined,
    notes: optional(values.notes),
  }
}

/** "442 × 44 × 285 mm", leaving out what is unknown; "" when nothing is. */
export function formatDimensions(
  model: Pick<DeviceModelResponse, 'widthMm' | 'heightMm' | 'depthMm'>,
): string {
  const known = [model.widthMm, model.heightMm, model.depthMm]
  if (known.every((value) => value === undefined)) return ''

  return `${known.map((value) => value ?? '?').join(' × ')} mm`
}
