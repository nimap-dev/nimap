import { toast } from '#/components/ui/toast'
import { cn } from '#/lib/utils'
import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * A value that copies itself to the clipboard when clicked, such as an IP
 * address or a hostname someone is about to paste into a terminal.
 */
export function CopyValue({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const { t } = useTranslation('common')

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.add({
        type: 'success',
        description: t('actions.copied', { value }),
      })
    } catch {
      toast.add({
        type: 'error',
        description: t('actions.copyFailed', { value }),
      })
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={t('actions.copy', { value })}
      aria-label={t('actions.copy', { value })}
      className={cn(
        'group inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        className,
      )}
    >
      <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      {value}
    </button>
  )
}
