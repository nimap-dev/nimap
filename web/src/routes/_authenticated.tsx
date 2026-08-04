import { AppSidebar } from '#/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <Outlet />
    </SidebarInset>
  </SidebarProvider>
}
