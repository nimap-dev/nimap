import type { MultiPolygon } from '#/api/model'
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'

/**
 * A building's footprint, which unlike a location's boundary is required: the
 * map is always in drawing mode while one of these is on screen, so this
 * reports what has been drawn rather than offering to start.
 */
export function FootprintField({
  polygon,
  mode,
  onClear,
}: {
  polygon: MultiPolygon | undefined
  /** `reshape` says the drawn shape can be dragged, which only editing can. */
  mode: 'draw' | 'reshape'
  onClear: () => void
}) {
  const parts = polygon?.coordinates.length ?? 0

  return (
    <Field>
      <FieldLabel>Footprint</FieldLabel>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        {parts > 0 ? (
          <span>
            {parts} {parts === 1 ? 'part' : 'parts'}
            {mode === 'reshape' ? ' — drag a point to reshape' : ' drawn'}
          </span>
        ) : (
          <span className="text-muted-foreground">
            Click on the map to draw
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={parts === 0}
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
    </Field>
  )
}
