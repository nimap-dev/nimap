import type { DeviceResponse } from '#/api/model'
import { formatModelName } from '#/lib/device-models'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { optional } from '#/lib/utils'

/**
 * A device as its form holds it. Text and choices are strings, "" meaning not
 * filled in. `kind` says which of the model and the type the device names; the
 * other one is kept while the form is open but not sent.
 */
export type DeviceFormValues = {
  kind: 'model' | 'type'
  deviceModelId: string
  deviceTypeId: string
  code: string
  name: string
  physicalLabel: string
  serialNumber: string
  inventoryNumber: string
  managementIp: string
  hostname: string
  notes: string
  status: LifecycleStatus
}

export const emptyDeviceValues: DeviceFormValues = {
  kind: 'model',
  deviceModelId: '',
  deviceTypeId: '',
  code: '',
  name: '',
  physicalLabel: '',
  serialNumber: '',
  inventoryNumber: '',
  managementIp: '',
  hostname: '',
  notes: '',
  status: 'active',
}

export function deviceToValues(device: DeviceResponse): DeviceFormValues {
  return {
    kind: device.model ? 'model' : 'type',
    deviceModelId: device.model?.id ?? '',
    deviceTypeId: device.model ? '' : device.deviceType.id,
    code: device.code,
    name: device.name,
    physicalLabel: device.physicalLabel ?? '',
    serialNumber: device.serialNumber ?? '',
    inventoryNumber: device.inventoryNumber ?? '',
    managementIp: device.managementIp ?? '',
    hostname: device.hostname ?? '',
    notes: device.notes ?? '',
    status: device.status,
  }
}

/** The fields create and update share; an empty field is left out. */
export function deviceToRequest(values: DeviceFormValues) {
  return {
    code: optional(values.code.trim()),
    name: values.name,
    physicalLabel: optional(values.physicalLabel),
    deviceModelId: values.kind === 'model' ? values.deviceModelId : undefined,
    deviceTypeId: values.kind === 'type' ? values.deviceTypeId : undefined,
    serialNumber: optional(values.serialNumber),
    inventoryNumber: optional(values.inventoryNumber),
    managementIp: optional(values.managementIp.trim()),
    hostname: optional(values.hostname.trim()),
    notes: optional(values.notes),
  }
}

/** "SW-001 Core switch": how a device is named in titles and messages. */
export function formatDeviceName(
  device: Pick<DeviceResponse, 'code' | 'name'>,
): string {
  return `${device.code} ${device.name}`
}

/** "MikroTik CRS326 (rev2)", or undefined for a device without a model. */
export function formatDeviceModel(
  device: Pick<DeviceResponse, 'model' | 'manufacturer'>,
): string | undefined {
  if (!device.model) return undefined

  return [device.manufacturer?.name, formatModelName(device.model)]
    .filter(Boolean)
    .join(' ')
}

const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)'
const IPV4 = new RegExp(`^(${IPV4_OCTET}\\.){3}${IPV4_OCTET}$`)

/** One IPv4 or IPv6 address, as the server accepts it. */
export function isIpAddress(value: string): boolean {
  if (IPV4.test(value)) return true
  if (!value.includes(':') || value.includes('%')) return false

  try {
    // Only a valid IPv6 address parses as a bracketed URL host.
    new URL(`http://[${value}]/`)
    return true
  } catch {
    return false
  }
}

const HOSTNAME_LABEL = '[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?'
const HOSTNAME = new RegExp(
  `^${HOSTNAME_LABEL}(\\.${HOSTNAME_LABEL})*\\.?$`,
  'i',
)

export function isHostname(value: string): boolean {
  return value.length <= 254 && HOSTNAME.test(value)
}
