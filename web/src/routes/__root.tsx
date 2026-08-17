import { Outlet, createRootRoute } from '@tanstack/react-router'

import '../styles.css'
import { Toaster } from '#/components/ui/toast'
import { AuthProvider } from '#/lib/auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '#/components/ui/tooltip'

export const Route = createRootRoute({
  component: RootComponent,
})

const queryClient = new QueryClient()

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
