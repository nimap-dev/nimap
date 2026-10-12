import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import {
  Boxes,
  Building2,
  Factory,
  LandPlot,
  Map,
  Plus,
  Server,
  User,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import { useCan } from '#/lib/auth'
import type { Permission } from '#/lib/auth'

type PaletteEntry = {
  label: string
  to: LinkProps['to']
  icon: LucideIcon
  permission?: Permission
}

const groups: { heading: string; entries: PaletteEntry[] }[] = [
  {
    heading: 'Go to',
    entries: [
      { label: 'Map', to: '/', icon: Map },
      { label: 'Locations', to: '/locations', icon: LandPlot },
      { label: 'Buildings', to: '/buildings', icon: Building2 },
      { label: 'Manufacturers', to: '/devices/manufacturers', icon: Factory },
      { label: 'Device models', to: '/devices/models', icon: Boxes },
      { label: 'Devices', to: '/devices', icon: Server },
      { label: 'Account', to: '/auth/account', icon: User },
      {
        label: 'Users',
        to: '/admin/users',
        icon: Users,
        permission: 'users:manage',
      },
    ],
  },
  {
    heading: 'Create',
    entries: [
      {
        label: 'New location',
        to: '/locations/new',
        icon: Plus,
        permission: 'records:write',
      },
      {
        label: 'New building',
        to: '/buildings/new',
        icon: Plus,
        permission: 'records:write',
      },
      {
        label: 'New manufacturer',
        to: '/devices/manufacturers/new',
        icon: Plus,
        permission: 'records:write',
      },
      {
        label: 'New device model',
        to: '/devices/models/new',
        icon: Plus,
        permission: 'records:write',
      },
      {
        label: 'New user',
        to: '/admin/users/new',
        icon: Plus,
        permission: 'users:manage',
      },
    ],
  },
]

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const navigate = useNavigate()
  const permitted: Record<Permission, boolean> = {
    'records:read': useCan('records:read'),
    'records:write': useCan('records:write'),
    'users:manage': useCan('users:manage'),
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="Go to…" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.entries
                .filter(
                  (entry) => !entry.permission || permitted[entry.permission],
                )
                .map((entry) => (
                  <CommandItem
                    key={entry.label}
                    value={entry.label}
                    onSelect={() => {
                      onOpenChange(false)
                      void navigate({ to: entry.to })
                    }}
                  >
                    <entry.icon />
                    {entry.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
