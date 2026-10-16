import { AppSidebarNav, MapPanel } from '#/components/app-sidebar'
import { WorldMap } from '#/components/map/world-map'
import { Button } from '#/components/ui/button'
import { SidebarInset } from '#/components/ui/sidebar'
import { cn } from '#/lib/utils'
import { MapProvider } from '#/lib/map'
import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/_map')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation('map')
  const matchRoute = useMatchRoute()
  const withPanel = !matchRoute({ to: '/' })
  const [panelOpen, setPanelOpen] = useState(true)

  // Arriving from the bare map opens the panel again, whatever the last
  // collapse left it at.
  useEffect(() => {
    if (withPanel) setPanelOpen(true)
  }, [withPanel])

  return (
    <MapProvider>
      <AppSidebarNav />
      {withPanel && (
        <MapPanel open={panelOpen} onClose={() => setPanelOpen(false)}>
          <Outlet />
        </MapPanel>
      )}
      <SidebarInset>
        <WorldMap />
        {withPanel && (
          <Button
            variant="outline"
            size="icon"
            aria-label={panelOpen ? t('panel.collapse') : t('panel.expand')}
            onClick={() => setPanelOpen((open) => !open)}
            className={cn(
              'absolute top-2 left-2 z-30 bg-background shadow-sm',
              panelOpen && 'max-md:hidden',
            )}
          >
            {panelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
        )}
      </SidebarInset>
    </MapProvider>
  )
}
