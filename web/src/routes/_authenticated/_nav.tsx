import { AppSidebarNav } from '#/components/app-sidebar'
import {
  SidebarInset,
} from '#/components/ui/sidebar'
import {
  createFileRoute,
  Outlet,
} from '@tanstack/react-router'


export const Route = createFileRoute('/_authenticated/_nav')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <AppSidebarNav />
      <SidebarInset className="min-h-0 overflow-hidden md:h-svh">
        <Outlet />
      </SidebarInset>
    </>
  )
}
