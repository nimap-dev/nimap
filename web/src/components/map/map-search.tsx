import { useListBuildings } from "#/api/buildings/buildings"
import { Input } from "#/components/ui/input"
import type { Bounds } from "#/lib/map"
import { useWorldMap } from "#/lib/map"
import { cn } from "#/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Building2, LoaderCircle, MapPin, Search, X } from "lucide-react"
import { useId, useMemo, useRef, useState, useEffect } from "react"
import { Marker } from "react-map-gl/maplibre"

/** Your own buildings are already in memory, so one letter is enough for them. */
const MIN_QUERY_LENGTH = 1
/** Anything shorter would send Nominatim half-typed words. */
const MIN_PLACE_QUERY_LENGTH = 3
/** Nominatim's usage policy asks for at most one request a second. */
const DEBOUNCE_MS = 500
/** A house gets a bounding box a few metres across; don't fill the screen with it. */
const MAX_RESULT_ZOOM = 17
const MAX_BUILDING_RESULTS = 5

type BuildingResult = {
  kind: "building"
  key: string
  id: string
  label: string
  detail: string | undefined
  longitude: number
  latitude: number
}

type PlaceResult = {
  kind: "place"
  key: string
  label: string
  longitude: number
  latitude: number
  bounds: Bounds | undefined
}

type Result = BuildingResult | PlaceResult

type NominatimPlace = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  /** `[south, north, west, east]`, as strings. */
  boundingbox?: [string, string, string, string]
}

async function searchPlaces(
  query: string,
  signal: AbortSignal
): Promise<PlaceResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", query)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "6")

  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`Place search failed with ${response.status}`)
  }

  const places = (await response.json()) as NominatimPlace[]

  return places.map((place) => {
    const box = place.boundingbox?.map(Number)

    return {
      kind: "place" as const,
      key: `place-${place.place_id}`,
      label: place.display_name,
      longitude: Number(place.lon),
      latitude: Number(place.lat),
      bounds: box && ([box[2], box[0], box[3], box[1]] as Bounds),
    }
  })
}

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}

/**
 * Renders inside `<Map>`: the box floats over the canvas, and the pin for the
 * chosen place needs the map's context. It sits to the right of the panel
 * toggle, and clear of the navigation control on narrow screens.
 */
export function MapSearch() {
  const { flyTo, fitBounds, isDrawing } = useWorldMap()
  const navigate = useNavigate()

  const [query, setQuery] = useState("")
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const trimmedQuery = query.trim()
  const debouncedQuery = useDebounced(trimmedQuery, DEBOUNCE_MS)
  const hasQuery = trimmedQuery.length >= MIN_QUERY_LENGTH
  const isPlaceSearchable = debouncedQuery.length >= MIN_PLACE_QUERY_LENGTH

  const { data: buildingsResponse } = useListBuildings()

  const {
    data: places,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["places", debouncedQuery],
    queryFn: ({ signal }) => searchPlaces(debouncedQuery, signal),
    enabled: isPlaceSearchable,
    staleTime: 5 * 60 * 1000,
  })

  // Yours first, and without waiting on the network: the list is already cached.
  const buildingResults = useMemo<BuildingResult[]>(() => {
    const needle = trimmedQuery.toLowerCase()

    if (needle.length < MIN_QUERY_LENGTH) return []
    if (buildingsResponse?.status !== 200) return []

    return buildingsResponse.data
      .filter((building) => building.name.toLowerCase().includes(needle))
      .slice(0, MAX_BUILDING_RESULTS)
      .map((building) => {
        const [longitude, latitude] = building.representativePoint.coordinates

        return {
          kind: "building",
          key: `building-${building.id}`,
          id: building.id,
          label: building.name,
          detail: building.notes,
          longitude,
          latitude,
        }
      })
  }, [buildingsResponse, trimmedQuery])

  const results: Result[] = [
    ...buildingResults,
    ...(isPlaceSearchable ? (places ?? []) : []),
  ]
  const showResults = isOpen && hasQuery
  // Results shift under the cursor as places arrive, so keep the index in range.
  const active = Math.min(activeIndex, Math.max(results.length - 1, 0))

  function select(result: Result) {
    setIsOpen(false)

    if (result.kind === "building") {
      setSelectedPlace(null)

      if (isDrawing) {
        flyTo(result.longitude, result.latitude, MAX_RESULT_ZOOM)
        return
      }

      navigate({ to: "/buildings/$buildingId", params: { buildingId: result.id } })
      return
    }

    setSelectedPlace(result)

    // A city should frame the city, an address should frame the address.
    if (result.bounds) fitBounds(result.bounds, MAX_RESULT_ZOOM)
    else flyTo(result.longitude, result.latitude, MAX_RESULT_ZOOM)
  }

  function clear() {
    setQuery("")
    setSelectedPlace(null)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (isOpen) setIsOpen(false)
      else clear()
      return
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return
      event.preventDefault()
      setIsOpen(true)
      const next = event.key === "ArrowDown" ? active + 1 : active - 1
      setActiveIndex((next + results.length) % results.length)
      return
    }

    if (event.key === "Enter") {
      const result = results.at(active)
      if (!showResults || !result) return
      event.preventDefault()
      select(result)
    }
  }

  return (
    <>
      <div className="absolute top-2 right-14 left-11 z-10 md:right-auto md:w-80">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="Search buildings and places…"
            aria-label="Search buildings and places"
            role="combobox"
            aria-expanded={showResults}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showResults && results.at(active)
                ? `${listboxId}-${active}`
                : undefined
            }
            autoComplete="off"
            className="h-9 bg-background pr-9 pl-8 shadow-sm [&::-webkit-search-cancel-button]:hidden"
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
            {isFetching ? (
              <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
            ) : (
              query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  // Blur would close the list before the click lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clear}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )
            )}
          </div>
        </div>

        {showResults && (
          <ul
            id={listboxId}
            role="listbox"
            className="mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md"
          >
            {results.map((result, index) => (
              <li
                key={result.key}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(result)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-2.5 py-2 text-sm",
                  index === active && "bg-accent text-accent-foreground"
                )}
                title={result.label}
              >
                {result.kind === "building" ? (
                  // Red, like the footprints on the map.
                  <Building2 className="size-4 shrink-0 text-red-600 dark:text-red-500" />
                ) : (
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">{result.label}</span>
                {result.kind === "building" && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isDrawing ? "Show on map" : "Building"}
                  </span>
                )}
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-2.5 py-2 text-sm text-muted-foreground">
                {isError
                  ? "Place search is unavailable right now"
                  : isFetching
                    ? "Searching…"
                    : isPlaceSearchable
                      ? "Nothing found"
                      : "No building matches — keep typing to search places"}
              </li>
            )}
          </ul>
        )}
      </div>

      {selectedPlace && (
        <Marker
          longitude={selectedPlace.longitude}
          latitude={selectedPlace.latitude}
          anchor="bottom"
        >
          <MapPin className="size-7 fill-primary stroke-background drop-shadow-md" />
        </Marker>
      )}
    </>
  )
}
