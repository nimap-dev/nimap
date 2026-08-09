import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { TerraDraw } from "terra-draw";
import type { MultiPolygon } from "#/api/model";

/** Terra Draw's built-in do-nothing mode: drawing off, map interaction normal. */
const STATIC_MODE = "static";
const POLYGON_MODE = "polygon";

/**
 * A footprint is a MultiPolygon, but Terra Draw draws one polygon at a time, so
 * every completed shape on the map becomes one part of it.
 */
function readFootprint(draw: TerraDraw): MultiPolygon | undefined {
  const parts = draw
    .getSnapshot()
    .filter((feature) => feature.geometry.type === "Polygon")
    .map((feature) => feature.geometry.coordinates as number[][][]);

  if (parts.length === 0) return undefined;

  return { type: "MultiPolygon", coordinates: parts };
}

type MapContextValue = {
  mapRef: React.RefObject<MapRef | null>
  flyTo: (
    longitude: number,
    latitude: number,
    zoom?: number
  ) => void
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
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({
  children,
}: {
  children: ReactNode;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);

  const [polygon, setPolygon] = useState<MultiPolygon | undefined>(undefined);
  const [isDrawing, setIsDrawing] = useState(false);

  const intentRef = useRef<{ drawing: boolean; initial?: MultiPolygon }>({
    drawing: false,
  });

  const applyIntent = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const { drawing, initial } = intentRef.current;

    draw.clear();

    if (!drawing) {
      draw.setMode(STATIC_MODE);
      return;
    }

    if (initial) {
      draw.addFeatures(
        initial.coordinates.map((coordinates) => ({
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates },
          properties: { mode: POLYGON_MODE },
        }))
      );
    }

    draw.setMode(POLYGON_MODE);
  }, []);

  const registerDraw = useCallback((draw: TerraDraw | null) => {
    drawRef.current = draw;

    if (!draw) return;

    draw.on("finish", () => {
      setPolygon(readFootprint(draw));
    });

    applyIntent();
  }, [applyIntent]);

  const flyTo = useCallback((
    longitude: number,
    latitude: number,
    zoom = 12
  ) => {
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom,
      duration: 1500,
    });
  }, []);

  const drawPolygon = useCallback((initial?: MultiPolygon) => {
    intentRef.current = { drawing: true, initial };
    setPolygon(initial);
    setIsDrawing(true);
    applyIntent();
  }, [applyIntent]);

  const cancelDrawing = useCallback(() => {
    intentRef.current = { drawing: false };
    setPolygon(undefined);
    setIsDrawing(false);
    applyIntent();
  }, [applyIntent]);

  const value = useMemo(
    () => ({
      mapRef,
      flyTo,
      registerDraw,
      drawPolygon,
      cancelDrawing,
      polygon,
      isDrawing,
    }),
    [flyTo, registerDraw, drawPolygon, cancelDrawing, polygon, isDrawing]
  );

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export function useWorldMap() {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error(
      "useWorldMap must be used inside MapProvider"
    );
  }

  return context;
}
