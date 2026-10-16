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
import { useTranslation } from 'react-i18next'

type PaletteEntry = {
  label: string
  to: LinkProps['to']
  icon: LucideIcon
  permission?: Permission
}

function useGroups(): { heading: string; entries: PaletteEntry[] }[] {
  const { t } = useTranslation('nav')

  return [
    {
      heading: t('palette.goTo'),
      entries: [
        { label: t('map'), to: '/', icon: Map },
        { label: t('locations'), to: '/locations', icon: LandPlot },
        { label: t('buildings'), to: '/buildings', icon: Building2 },
        {
          label: t('manufacturers'),
          to: '/devices/manufacturers',
          icon: Factory,
        },
        { label: t('deviceModels'), to: '/devices/models', icon: Boxes },
        { label: t('devices'), to: '/devices', icon: Server },
        { label: t('account'), to: '/auth/account', icon: User },
        {
          label: t('users'),
          to: '/admin/users',
          icon: Users,
          permission: 'users:manage',
        },
      ],
    },
    {
      heading: t('palette.create'),
      entries: [
        {
          label: t('palette.newLocation'),
          to: '/locations/new',
          icon: Plus,
          permission: 'records:write',
        },
        {
          label: t('palette.newBuilding'),
          to: '/buildings/new',
          icon: Plus,
          permission: 'records:write',
        },
        {
          label: t('palette.newManufacturer'),
          to: '/devices/manufacturers/new',
          icon: Plus,
          permission: 'records:write',
        },
        {
          label: t('palette.newDeviceModel'),
          to: '/devices/models/new',
          icon: Plus,
          permission: 'records:write',
        },
        {
          label: t('palette.newUser'),
          to: '/admin/users/new',
          icon: Plus,
          permission: 'users:manage',
        },
      ],
    },
  ]
}

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

  const { t } = useTranslation('nav')
  const groups = useGroups()
  const navigate = useNavigate()
  const permitted: Record<Permission, boolean> = {
    'records:read': useCan('records:read'),
    'records:write': useCan('records:write'),
    'users:manage': useCan('users:manage'),
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder={t('palette.placeholder')} />
        <CommandList>
          <CommandEmpty>{t('palette.empty')}</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.entries
                .filter(
                  (entry) => !entry.permission || permitted[entry.permission],
                )
                .map((entry) => (
                  <CommandItem
                    key={entry.to}
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
