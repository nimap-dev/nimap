import type { MultiPolygon } from '#/api/model'
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation(['form', 'common'])
  const parts = polygon?.coordinates.length ?? 0

  return (
    <Field>
      <FieldLabel>{t('footprint.label')}</FieldLabel>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        {parts > 0 ? (
          <span>
            {mode === 'reshape'
              ? t('shape.parts', { count: parts }) + t('footprint.reshape')
              : t('shape.partsDrawn', { count: parts })}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {t('shape.clickToDraw')}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={parts === 0}
          onClick={onClear}
        >
          {t('common:actions.clear')}
        </Button>
      </div>
    </Field>
  )
}
