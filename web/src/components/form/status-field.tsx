import { Field, FieldLabel } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  useLifecycleStatusLabels,
  useLifecycleStatusOptions,
} from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { useTranslation } from 'react-i18next'

type StatusFieldApi = {
  name: string
  state: { value: LifecycleStatus }
  handleChange: (value: LifecycleStatus) => void
}

// The lifecycle status picker as a form field.
export function StatusField({ field }: { field: StatusFieldApi }) {
  const { t } = useTranslation()
  const lifecycleStatusLabels = useLifecycleStatusLabels()
  const lifecycleStatusOptions = useLifecycleStatusOptions()

  return (
    <Field>
      <FieldLabel htmlFor={field.name}>{t('lifecycle.label')}</FieldLabel>
      <Select
        items={lifecycleStatusLabels}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value as LifecycleStatus)}
      >
        <SelectTrigger id={field.name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {lifecycleStatusOptions.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
