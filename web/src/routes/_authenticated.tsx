import { SidebarProvider } from '#/components/ui/sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import type { CSSProperties } from 'react'

export const Route = createFileRoute('/_authenticated')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "30rem", } as CSSProperties}>
      <Outlet />
    </SidebarProvider >
  )
}
