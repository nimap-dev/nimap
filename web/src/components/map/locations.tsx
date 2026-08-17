import { useListLocations } from '#/api/locations/locations'
import type { listLocationsResponse } from '#/api/locations/locations'
import { useMatchRoute } from '@tanstack/react-router'
import type { ExpressionSpecification } from 'maplibre-gl'
import { Layer, Source } from 'react-map-gl/maplibre'

const OUTLINE_COLOR = '#0d9488'

/** Spelled out rather than a bare `get`, which would also accept "false". */
const SELECTED: ExpressionSpecification = ['==', ['get', 'selected'], true]

type LocationFeature = {
  type: 'Feature'
  properties: { id: string; name: string }
  geometry: NonNullable<
    Extract<listLocationsResponse, { status: 200 }>['data'][number]['area']
  >
}

function toFeatures(
  data: listLocationsResponse,
): LocationFeature[] | undefined {
  if (data.status !== 200) return

  return data.data.flatMap((location) =>
    location.area
      ? [
          {
            type: 'Feature' as const,
            properties: { id: location.id, name: location.name },
            geometry: location.area,
          },
        ]
      : [],
  )
}

export function LocationsSource() {
  const matchRoute = useMatchRoute()
  const viewed = matchRoute({ to: '/locations/$locationId' })
  const edited = matchRoute({ to: '/locations/$locationId/edit' })

  const selectedId = viewed ? viewed.locationId : undefined

  // The one being edited is the exception to "draw them all": Terra Draw
  // already renders is as ediable shape
  const hiddenId = edited ? edited.locationId : undefined

  const { data } = useListLocations(undefined, {
    query: { select: toFeatures },
  })

  if (!data) return null

  return (
    <Source
      type="geojson"
      data={{
        type: 'FeatureCollection',
        features: data
          .filter((feature) => feature.properties.id !== hiddenId)
          .map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              selected: feature.properties.id === selectedId,
            },
          })),
      }}
    >
      {/* Small fill: enough to read the area, but faint enough that the
          building footprints stay the thing you look at. Nested areas
          sit on top of their parent's, so the tint accumulates on its own. */}
      <Layer
        id="locations-fill"
        type="fill"
        paint={{ 'fill-color': OUTLINE_COLOR, 'fill-opacity': 0.05 }}
      />
      <Layer
        id="locations-outline"
        type="line"
        paint={{
          'line-color': OUTLINE_COLOR,
          // Width is the only thing marking the location you opened.
          'line-width': ['case', SELECTED, 3, 1.5],
        }}
      />
      {/* The name rides along the boundary rather than sitting in the middle,
          which is where the buildings are. A line label only renders where a
          stretch of boundary is longer than the text, so the names drop out as
          you zoom out. */}
      <Layer
        id="locations-label"
        type="symbol"
        layout={{
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-letter-spacing': 0.08,
          'text-offset': [0, -0.8],
          'symbol-spacing': 350,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{
          'text-color': OUTLINE_COLOR,
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        }}
      />
    </Source>
  )
}
