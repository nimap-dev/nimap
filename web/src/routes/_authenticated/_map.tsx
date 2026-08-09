import { AppSidebar } from '#/components/app-sidebar'
import { WorldMap } from '#/components/map/world-map'
import {
  SidebarInset,
} from '#/components/ui/sidebar'
import { MapProvider } from '#/lib/map'
import {
  createFileRoute,
} from '@tanstack/react-router'


export const Route = createFileRoute('/_authenticated/_map')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MapProvider>
      <AppSidebar />
      <SidebarInset>
        <WorldMap />
      </SidebarInset>
    </MapProvider>
  )
}
