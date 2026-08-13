import { SidebarProvider } from '#/components/ui/sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import type { CSSProperties } from 'react'

export const Route = createFileRoute('/_authenticated')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SidebarProvider
      className="max-md:h-svh max-md:flex-col"
      style={{ "--sidebar-width": "25rem", } as CSSProperties}
    >
      <Outlet />
    </SidebarProvider >
  )
}
