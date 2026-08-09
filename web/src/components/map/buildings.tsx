import { useListBuildings, type listBuildingsResponse } from "#/api/buildings/buildings"
import { Layer, Source } from "react-map-gl/maplibre"

function convertBuildings(data: listBuildingsResponse) {
  if (data.status !== 200) return;

  return {
    type: 'FeatureCollection' as const,
    features: data.data.map((building) => ({
      type: 'Feature' as const,
      properties: {
        name: building.name,
        id: building.id,
      },
      geometry: building.footprint,
    })),
  };
}

export function BuildingsSource() {
  const { data } = useListBuildings({
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
          "fill-color": "#ff0000",
          "fill-opacity": 0.4,
        }}
      />
    </Source>
  )
}