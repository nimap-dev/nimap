import type { MultiPolygon } from '#/api/model'
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation(['form', 'common'])
  const parts = polygon?.coordinates.length ?? 0

  return (
    <Field>
      <FieldLabel>{t('area.label')}</FieldLabel>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        {parts > 0 ? (
          <span>
            {t('shape.partsDrawn', { count: parts })}
            {isDrawing && isSuspended && (
              <span className="text-muted-foreground">
                {t('area.pausedSuffix')}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {!isDrawing
              ? t('area.notDrawn')
              : isSuspended
                ? t('area.paused')
                : t('shape.clickToDraw')}
          </span>
        )}
        {isDrawing ? (
          <Button type="button" variant="ghost" size="sm" onClick={onStop}>
            {parts > 0 ? t('shape.discard') : t('common:actions.cancel')}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onDraw}>
            {t('shape.draw')}
          </Button>
        )}
      </div>
    </Field>
  )
}
