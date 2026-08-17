import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { TerraDraw } from 'terra-draw'
import type { MultiPolygon, Point } from '#/api/model'

/** Terra Draw's built-in do-nothing mode: drawing off, map interaction normal. */
const STATIC_MODE = 'static'
const POLYGON_MODE = 'polygon'

/**
 * A footprint is a MultiPolygon, but Terra Draw draws one polygon at a time, so
 * every completed shape on the map becomes one part of it.
 */
function readFootprint(draw: TerraDraw): MultiPolygon | undefined {
  const parts = draw
    .getSnapshot()
    .filter((feature) => feature.geometry.type === 'Polygon')
    .map((feature) => feature.geometry.coordinates as number[][][])

  if (parts.length === 0) return undefined

  return { type: 'MultiPolygon', coordinates: parts }
}

/** Corners as `[west, south, east, north]`. */
export type Bounds = [number, number, number, number]

/** The box a polygon fits in, for framing it on the map. */
export function multiPolygonBounds(area: MultiPolygon): Bounds | undefined {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const polygon of area.coordinates) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        west = Math.min(west, longitude)
        south = Math.min(south, latitude)
        east = Math.max(east, longitude)
        north = Math.max(north, latitude)
      }
    }
  }

  if (west === Infinity) return undefined

  return [west, south, east, north]
}

type CameraMove =
  | { kind: 'center'; longitude: number; latitude: number; zoom: number }
  | { kind: 'bounds'; bounds: Bounds; maxZoom: number }

type MapContextValue = {
  mapRef: React.RefObject<MapRef | null>
  flyTo: (longitude: number, latitude: number, zoom?: number) => void
  /** Frame an area, stopping short of `maxZoom` for the very small ones. */
  fitBounds: (bounds: Bounds, maxZoom?: number) => void
  /**
   * `WorldMap` reports when the map is usable. A camera move asked for before
   * that is held back and replayed here, so deep links land on their building.
   */
  setMapReady: (ready: boolean) => void
  /**
   * Handing the draw instance over is `WorldMap`'s job — it owns the map the
   * adapter binds to. Pass `null` when the map unmounts.
   */
  registerDraw: (draw: TerraDraw | null) => void
  /** Enter polygon mode, optionally seeded with an existing footprint. */
  drawPolygon: (initial?: MultiPolygon) => void
  /** Leave polygon mode and discard whatever was drawn. */
  cancelDrawing: () => void
  /** Every completed polygon on the map, as one footprint. */
  polygon: MultiPolygon | undefined
  isDrawing: boolean
  /**
   * Picking a single point is its own small mode, separate from drawing: the
   * next click on the map lands the point instead of doing whatever it would
   * normally do. `WorldMap` reports the click through `placePoint`.
   */
  pickPoint: () => void
  cancelPicking: () => void
  /** Show a point that already exists, without arming the next map click. */
  seedPoint: (point: Point | undefined) => void
  placePoint: (longitude: number, latitude: number) => void
  point: Point | undefined
  isPicking: boolean
}

const MapContext = createContext<MapContextValue | null>(null)

export function MapProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<MapRef | null>(null)
  const drawRef = useRef<TerraDraw | null>(null)

  const [polygon, setPolygon] = useState<MultiPolygon | undefined>(undefined)
  const [isDrawing, setIsDrawing] = useState(false)

  const [point, setPoint] = useState<Point | undefined>(undefined)
  const [isPicking, setIsPicking] = useState(false)

  const intentRef = useRef<{ drawing: boolean; initial?: MultiPolygon }>({
    drawing: false,
  })

  // Read inside the mode callbacks, which are stable and would otherwise close
  // over a stale `isPicking`.
  const pickingRef = useRef(false)

  const applyMode = useCallback(() => {
    const draw = drawRef.current
    if (!draw) return

    const drawable = intentRef.current.drawing && !pickingRef.current

    draw.setMode(drawable ? POLYGON_MODE : STATIC_MODE)
  }, [])

  const applyIntent = useCallback(() => {
    const draw = drawRef.current
    if (!draw) return

    const { drawing, initial } = intentRef.current

    draw.clear()

    if (drawing && initial) {
      draw.addFeatures(
        initial.coordinates.map((coordinates) => ({
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates },
          properties: { mode: POLYGON_MODE },
        })),
      )
    }

    applyMode()
  }, [applyMode])

  const registerDraw = useCallback(
    (draw: TerraDraw | null) => {
      drawRef.current = draw

      if (!draw) return

      draw.on('finish', () => {
        setPolygon(readFootprint(draw))
      })

      applyIntent()
    },
    [applyIntent],
  )

  const isMapReadyRef = useRef(false)
  const pendingMoveRef = useRef<CameraMove | null>(null)

  const runMove = useCallback((move: CameraMove) => {
    const map = mapRef.current

    if (!map) return

    if (move.kind === 'center') {
      map.flyTo({
        center: [move.longitude, move.latitude],
        zoom: move.zoom,
        duration: 1500,
      })
      return
    }

    const [west, south, east, north] = move.bounds

    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      {
        maxZoom: move.maxZoom,
        padding: 48,
        duration: 1500,
      },
    )
  }, [])

  const queueMove = useCallback(
    (move: CameraMove) => {
      if (!isMapReadyRef.current) {
        pendingMoveRef.current = move
        return
      }

      runMove(move)
    },
    [runMove],
  )

  const flyTo = useCallback(
    (longitude: number, latitude: number, zoom = 12) => {
      queueMove({ kind: 'center', longitude, latitude, zoom })
    },
    [queueMove],
  )

  const fitBounds = useCallback(
    (bounds: Bounds, maxZoom = 17) => {
      queueMove({ kind: 'bounds', bounds, maxZoom })
    },
    [queueMove],
  )

  const setMapReady = useCallback(
    (ready: boolean) => {
      isMapReadyRef.current = ready

      if (!ready) return

      const pending = pendingMoveRef.current
      pendingMoveRef.current = null

      if (pending) runMove(pending)
    },
    [runMove],
  )

  const drawPolygon = useCallback(
    (initial?: MultiPolygon) => {
      pickingRef.current = false
      setIsPicking(false)

      intentRef.current = { drawing: true, initial }
      setPolygon(initial)
      setIsDrawing(true)
      applyIntent()
    },
    [applyIntent],
  )

  const cancelDrawing = useCallback(() => {
    intentRef.current = { drawing: false }
    setPolygon(undefined)
    setIsDrawing(false)
    applyIntent()
  }, [applyIntent])

  const pickPoint = useCallback(() => {
    pickingRef.current = true
    setIsPicking(true)
    applyMode()
  }, [applyMode])

  const seedPoint = useCallback((next: Point | undefined) => {
    setPoint(next)
  }, [])

  const cancelPicking = useCallback(() => {
    pickingRef.current = false
    setPoint(undefined)
    setIsPicking(false)
    applyMode()
  }, [applyMode])

  const placePoint = useCallback(
    (longitude: number, latitude: number) => {
      pickingRef.current = false
      setPoint({ type: 'Point', coordinates: [longitude, latitude] })
      setIsPicking(false)
      applyMode()
    },
    [applyMode],
  )

  const value = useMemo(
    () => ({
      mapRef,
      flyTo,
      fitBounds,
      setMapReady,
      registerDraw,
      drawPolygon,
      cancelDrawing,
      polygon,
      isDrawing,
      pickPoint,
      cancelPicking,
      seedPoint,
      placePoint,
      point,
      isPicking,
    }),
    [
      flyTo,
      fitBounds,
      setMapReady,
      registerDraw,
      drawPolygon,
      cancelDrawing,
      polygon,
      isDrawing,
      pickPoint,
      cancelPicking,
      seedPoint,
      placePoint,
      point,
      isPicking,
    ],
  )

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export function useWorldMap() {
  const context = useContext(MapContext)

  if (!context) {
    throw new Error('useWorldMap must be used inside MapProvider')
  }

  return context
}
