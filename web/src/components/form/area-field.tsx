import type { MultiPolygon } from '#/api/model'
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'

/**
 * The boundary is optional, so this reads as an invitation rather than as an
 * unfilled requirement.
 */
export function AreaField({
  polygon,
  isDrawing,
  isSuspended = false,
  onDraw,
  onStop,
}: {
  polygon: MultiPolygon | undefined
  isDrawing: boolean
  isSuspended?: boolean
  onDraw: () => void
  onStop: () => void
}) {
  const parts = polygon?.coordinates.length ?? 0

  return (
    <Field>
      <FieldLabel>Boundary</FieldLabel>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        {parts > 0 ? (
          <span>
            {parts} {parts === 1 ? 'part' : 'parts'} drawn
            {isDrawing && isSuspended && (
              <span className="text-muted-foreground">
                {' · paused while you place the point'}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {!isDrawing
              ? 'Not drawn — optional'
              : isSuspended
                ? 'Paused while you place the point'
                : 'Click on the map to draw'}
          </span>
        )}
        {isDrawing ? (
          <Button type="button" variant="ghost" size="sm" onClick={onStop}>
            {parts > 0 ? 'Discard' : 'Cancel'}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onDraw}>
            Draw
          </Button>
        )}
      </div>
    </Field>
  )
}
