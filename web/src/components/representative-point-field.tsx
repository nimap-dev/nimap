import type { Point } from '#/api/model'
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'

export function formatCoordinates(point: Point): string {
  const [longitude, latitude] = point.coordinates

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export function RepresentativePointField({
  point,
  isPicking,
  hasArea,
  onPick,
  onClear,
}: {
  point: Point | undefined
  isPicking: boolean
  hasArea: boolean
  onPick: () => void
  onClear: () => void
}) {
  return (
    <Field>
      <FieldLabel>Map point</FieldLabel>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        <span className={point ? undefined : 'text-muted-foreground'}>
          {point
            ? formatCoordinates(point)
            : isPicking
              ? 'Click on the map to place it'
              : hasArea
                ? 'Derived from the boundary'
                : 'Not placed — optional'}
        </span>
        {point || isPicking ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {point ? 'Clear' : 'Cancel'}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onPick}>
            Place
          </Button>
        )}
      </div>
    </Field>
  )
}
