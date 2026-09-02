import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { can } from '#/lib/auth'

// One guard for everything under /admin. Synchronous is safe: the parent
// _authenticated route has already awaited the user into the query cache.
export const Route = createFileRoute('/_authenticated/_nav/admin')({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'users:manage')) {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})
