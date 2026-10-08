import type { DeviceTypeResponse } from '#/api/model'
import { cn } from '#/lib/utils'
import {
  BatteryCharging,
  Box,
  Cable,
  Camera,
  EthernetPort,
  HardDrive,
  Monitor,
  Network,
  Phone,
  Plug,
  Printer,
  Router,
  Server,
  Shield,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The icons the seeded device types name, keyed the way the database stores
 * them. A static map rather than lucide's dynamic loader: the set is fixed by
 * the migration, so only these icons end up in the bundle and they render
 * without a loading flash in every table row.
 */
const icons: Record<string, LucideIcon> = {
  network: Network,
  router: Router,
  shield: Shield,
  wifi: Wifi,
  server: Server,
  'hard-drive': HardDrive,
  'ethernet-port': EthernetPort,
  cable: Cable,
  'battery-charging': BatteryCharging,
  plug: Plug,
  camera: Camera,
  phone: Phone,
  printer: Printer,
  monitor: Monitor,
  box: Box,
}

/** A device type's icon in its colour, with the type's name for screen readers. */
export function DeviceTypeIcon({
  type,
  className,
}: {
  type: Pick<DeviceTypeResponse, 'name' | 'icon' | 'color'>
  className?: string
}) {
  const Icon = icons[type.icon] ?? Box

  return (
    <Icon
      role="img"
      aria-label={type.name}
      className={cn('size-4 shrink-0', className)}
      style={{ color: type.color }}
    />
  )
}
