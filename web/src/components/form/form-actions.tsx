import type { ReactElement } from 'react'
import { Button } from '#/components/ui/button'
import { useTranslation } from 'react-i18next'

/**
 * The submit-and-cancel pair every write form ends with. It takes the two flags
 * rather than the form itself, so the call site keeps its own `form.Subscribe`
 * and this stays usable from any of them.
 */
export function FormActions({
  formId,
  submit,
  submitting,
  isSubmitting,
  disabled = false,
  cancel,
}: {
  /** The `<form id>` this submits, since the buttons sit outside it. */
  formId: string
  submit: string
  /** Shown in place of `submit` while the request is in flight. */
  submitting: string
  isSubmitting: boolean
  /** Anything beyond being mid-submit that should block the save. */
  disabled?: boolean
  /** A `<Link>` back to wherever abandoning the form should land. */
  cancel: ReactElement
}) {
  const { t } = useTranslation()

  return (
    <div className="sticky bottom-0 -mx-3 -mb-3 mt-auto border-t bg-(--panel-bg,var(--color-background)) px-3 py-2">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2">
        <Button type="submit" form={formId} disabled={disabled || isSubmitting}>
          {isSubmitting ? submitting : submit}
        </Button>
        <Button variant="ghost" render={cancel} nativeButton={false}>
          {t('actions.cancel')}
        </Button>
      </div>
    </div>
  )
}
