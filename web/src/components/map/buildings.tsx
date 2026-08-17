import { useListBuildings } from '#/api/buildings/buildings'
import type { listBuildingsResponse } from '#/api/buildings/buildings'
import { Layer, Source } from 'react-map-gl/maplibre'

function convertBuildings(data: listBuildingsResponse) {
  if (data.status !== 200) return

  return {
    type: 'FeatureCollection' as const,
    features: data.data.map((building) => ({
      type: 'Feature' as const,
      properties: {
        name: building.name,
        id: building.id,
        status: building.status,
      },
      geometry: building.footprint,
    })),
  }
}

export function BuildingsSource() {
  const { data } = useListBuildings(undefined, {
    query: {
      select: convertBuildings,
    },
  })

  if (!data) return null

  return (
    <Source type="geojson" data={data}>
      <Layer
        id="buildings"
        type="fill"
        paint={{
          'fill-color': [
            'match',
            ['get', 'status'],
            'planned',
            '#2563eb',
            'active',
            '#ff0000',
            // Decommissioned and archived are filtered out by the API, so grey
            // only shows if a caller ever asks for them by status.
            '#71717a',
          ],
          'fill-opacity': 0.4,
        }}
      />
      {/* Held back until the footprints are big enough to read a name off. */}
      <Layer
        id="buildings-label"
        type="symbol"
        minzoom={15}
        layout={{
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-max-width': 8,
          'text-padding': 4,
        }}
        paint={{
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  )
}
