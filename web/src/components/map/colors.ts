import { useResolvedTheme } from '#/lib/theme'

/**
 * Colours of our own layers that have to read against the basemap, so they
 * flip along with it: dark text on a white halo over the light map, light text
 * on a dark halo over the dark one.
 */
const MAP_COLORS = {
  light: { label: '#1f2937', halo: '#ffffff', location: '#0d9488' },
  dark: { label: '#f4f4f5', halo: '#18181b', location: '#2dd4bf' },
}

export function useMapColors() {
  return MAP_COLORS[useResolvedTheme()]
}
