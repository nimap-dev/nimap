import { useWorldMap } from "#/lib/map";
import Map, {
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import { BuildingsSource } from "./buildings";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { Map as MapLibreMap } from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';

export function WorldMap() {
  const { mapRef, registerDraw, isDrawing } = useWorldMap()
  const navigate = useNavigate()
  const drawRef = useRef<TerraDraw | null>(null)


  const setupDraw = useCallback((map: MapLibreMap) => {
    if (drawRef.current) return

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter<MapLibreMap>({ map }),
      modes: [
        new TerraDrawPolygonMode({
          editable: true,
          showCoordinatePoints: true,
          cursors: {
            dragStart: "grabbing",
            dragEnd: "grab",
          },
          styles: {
            fillColor: "#7c3aed",
            fillOpacity: 0.3,
            outlineColor: "#7c3aed",
            outlineWidth: 2,
            // The draggable vertices.
            coordinatePointWidth: 5,
            coordinatePointColor: "#ffffff",
            coordinatePointOutlineWidth: 2,
            coordinatePointOutlineColor: "#7c3aed",
            // The vertex currently under the cursor or being dragged.
            editedPointWidth: 7,
            editedPointColor: "#7c3aed",
            editedPointOutlineWidth: 2,
            editedPointOutlineColor: "#ffffff",
            // The point that closes the ring while drawing.
            closingPointWidth: 6,
            closingPointColor: "#ffffff",
            closingPointOutlineWidth: 2,
            closingPointOutlineColor: "#7c3aed",
          },
        }),
      ],
    })

    draw.start()
    draw.setMode("static")

    drawRef.current = draw
    registerDraw(draw)
  }, [registerDraw])

  useEffect(() => {
    return () => {
      drawRef.current?.stop()
      drawRef.current = null
      registerDraw(null)
    }
  }, [registerDraw])

  const [hoveredBuilding, setHoveredBuilding] = useState<{
    name: string
    longitude: number
    latitude: number
  } | null>(null)

  function handleClick(event: MapLayerMouseEvent) {
    if (isDrawing) return

    const feature = event.features?.[0]

    if (!feature) return

    const id = feature.properties?.id
    if (!id) return

    navigate({
      to: "/buildings/$buildingId",
      params: {
        buildingId: id,
      },
    })
  }

  function handleMouseMove(event: MapLayerMouseEvent) {
    if (isDrawing) return

    const feature = event.features?.[0]

    if (!feature) {
      setHoveredBuilding(null)
      return
    }

    setHoveredBuilding({
      name: feature.properties?.name,
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
    })
  }

  // Fires once the style is ready; `event.target` is the MapLibre instance, so
  // this path needs no ref at all.
  function onMapLoad(event: { target: MapLibreMap }) {
    setupDraw(event.target)
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 14.42085,
        latitude: 50.0872,
        zoom: 8,
      }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
      interactiveLayerIds={["buildings"]}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      cursor={isDrawing ? "crosshair" : hoveredBuilding ? "pointer" : "grab"}
      onLoad={onMapLoad}
    >
      <BuildingsSource />

      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" />
    </Map>
  )
}