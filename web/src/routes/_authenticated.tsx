import { SidebarProvider } from '#/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { currentUserQueryOptions } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const response = await context.queryClient.ensureQueryData(
      currentUserQueryOptions,
    )

    if (response.status !== 200) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.href },
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SidebarProvider
      className="max-md:h-svh max-md:flex-col"
      style={{ '--sidebar-width': '25rem' } as CSSProperties}
    >
      <Outlet />
    </SidebarProvider>
  )
}
