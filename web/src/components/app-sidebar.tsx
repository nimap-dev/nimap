import * as React from 'react'
import { Building2, Command, LandPlot, Map } from 'lucide-react'

import { NavUser } from '@/components/nav-user'
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
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'

const navMain = [
  {
    title: 'Map',
    to: '/',
    icon: Map,
    isActive: true,
  },
  {
    title: 'Locations',
    to: '/locations',
    icon: LandPlot,
    isActive: true,
  },
  {
    title: 'Buildings',
    to: '/buildings',
    icon: Building2,
    isActive: true,
  },
]

// A rail down the left on desktop, a bottom bar on mobile: same items, and the
// logo drops out where the bar has no room for it.
export function AppSidebarNav() {
  return (
    <Sidebar
      collapsible="none"
      className="order-last h-14 w-full shrink-0 flex-row items-center justify-around border-t md:order-0 md:h-svh md:w-[calc(var(--sidebar-width-icon)+1px)]! md:flex-col md:items-stretch md:justify-start md:border-t-0 md:border-r"
    >
      <SidebarHeader className="hidden md:flex">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="md:h-8 md:p-0"
              render={<Link to="/" />}
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
      </SidebarHeader>
      <SidebarContent className="flex-none md:flex-1">
        <SidebarGroup className="p-0 md:p-2">
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu className="flex-row gap-2 md:flex-col md:gap-0">
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
                    className="size-10 justify-center p-0 md:h-8 md:w-full md:justify-start md:px-2"
                    render={<Link to={item.to} />}
                  >
                    <item.icon />
                    <span className="sr-only md:not-sr-only">{item.title}</span>
                  </SidebarMenuButton>
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
          className="fixed inset-x-0 top-0 bottom-14 z-10 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        data-state={open ? 'expanded' : 'collapsed'}
        inert={!open}
        className={cn(
          '[--map-panel-width:min(20rem,85vw)] md:[--map-panel-width:var(--sidebar-width)]',
          'fixed top-0 bottom-14 left-0 z-20 shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground shadow-lg transition-[width] duration-200 ease-linear',
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
