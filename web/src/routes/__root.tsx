import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import '../styles.css'
import { Toaster } from '#/components/ui/toast'
import { TooltipProvider } from '#/components/ui/tooltip'

export type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Outlet />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
