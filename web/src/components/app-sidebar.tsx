import * as React from 'react'
import {
  Boxes,
  Building2,
  ChevronRight,
  Command,
  Factory,
  LandPlot,
  Map,
  Router,
  Server,
} from 'lucide-react'

import { CommandPalette } from '@/components/command-palette'
import { NavUser } from '@/components/nav-user'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// Titles are keys in the nav namespace.
const navMain = [
  {
    title: 'map',
    to: '/',
    icon: Map,
  },
  {
    title: 'locations',
    to: '/locations',
    icon: LandPlot,
  },
  {
    title: 'buildings',
    to: '/buildings',
    icon: Building2,
  },
  {
    title: 'devices',
    to: '/devices',
    icon: Router,
    children: [
      {
        title: 'manufacturers',
        to: '/devices/manufacturers',
        icon: Factory,
      },
      {
        title: 'deviceModels',
        to: '/devices/models',
        icon: Boxes,
      },
      {
        title: 'devices',
        to: '/devices',
        icon: Server,
      },
    ],
  },
] as const

// A rail down the left on desktop, a bottom bar on mobile: same items, and the
// logo drops out where the bar has no room for it.
export function AppSidebarNav() {
  const { isMobile } = useSidebar()
  const { t } = useTranslation('nav')
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)

  return (
    <Sidebar
      collapsible="none"
      className="order-last h-16 w-full shrink-0 flex-row items-center justify-around border-t md:order-0 md:h-svh md:w-[calc(var(--sidebar-width-icon)+1px)]! md:flex-col md:items-stretch md:justify-start md:border-t-0 md:border-r"
    >
      <SidebarHeader className="hidden md:flex">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="md:h-8 md:p-0"
              tooltip={{
                children: `${t('commandPalette')} ⌘K`,
                hidden: false,
              }}
              onClick={() => setCommandPaletteOpen(true)}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Command className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">NIMAP</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      </SidebarHeader>
      <SidebarContent className="flex-none md:flex-1">
        <SidebarGroup className="p-0 md:p-2">
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu className="flex-row gap-2 md:flex-col md:gap-0">
              {navMain.map((item) => (
                <SidebarMenuItem key={item.to}>
                  {'children' in item ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        openOnHover
                        delay={50}
                        closeDelay={150}
                        render={
                          <SidebarMenuButton className="size-14 justify-center p-0 max-md:[&_svg]:size-6 data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground md:h-8 md:w-full md:justify-start md:px-2" />
                        }
                      >
                        <item.icon />
                        <span className="sr-only md:not-sr-only">
                          {t(item.title)}
                        </span>
                        <ChevronRight className="ml-auto hidden md:block" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="min-w-48"
                        side={isMobile ? 'top' : 'right'}
                        align={isMobile ? 'center' : 'start'}
                        sideOffset={8}
                      >
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>{t(item.title)}</DropdownMenuLabel>
                          {item.children.map((child) => (
                            <DropdownMenuItem
                              key={child.to}
                              render={<Link to={child.to} />}
                            >
                              <child.icon />
                              {t(child.title)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <SidebarMenuButton
                      tooltip={{
                        children: t(item.title),
                        hidden: false,
                      }}
                      className="size-14 justify-center p-0 max-md:[&_svg]:size-6 md:h-8 md:w-full md:justify-start md:px-2"
                      render={<Link to={item.to} />}
                    >
                      <item.icon />
                      <span className="sr-only md:not-sr-only">
                        {t(item.title)}
                      </span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

export function MapPanel({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-x-0 top-0 bottom-16 z-10 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        data-state={open ? 'expanded' : 'collapsed'}
        inert={!open}
        className={cn(
          '[--map-panel-width:min(20rem,85vw)] md:[--map-panel-width:var(--sidebar-width)]',
          'fixed top-0 bottom-16 left-0 z-20 shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground shadow-lg transition-[width] duration-200 ease-linear',
          'md:static md:h-svh md:border-r md:shadow-none',
          open ? 'w-(--map-panel-width)' : 'w-0',
        )}
      >
        <div className="flex h-full w-(--map-panel-width) flex-col">
          {children}
        </div>
      </div>
    </>
  )
}
