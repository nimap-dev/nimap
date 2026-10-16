import type { Point } from '#/api/model'
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation(['form', 'common'])

  return (
    <Field>
      <FieldLabel>{t('point.label')}</FieldLabel>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        <span className={point ? undefined : 'text-muted-foreground'}>
          {point
            ? formatCoordinates(point)
            : isPicking
              ? t('point.clickToPlace')
              : hasArea
                ? t('point.derived')
                : t('point.notPlaced')}
        </span>
        {point || isPicking ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {point ? t('common:actions.clear') : t('common:actions.cancel')}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onPick}>
            {t('point.place')}
          </Button>
        )}
      </div>
    </Field>
  )
}
