import { Field, FieldLabel } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { roles, useRoleLabels } from '#/lib/roles'
import { useTranslation } from 'react-i18next'
import type { Role } from '#/lib/roles'

type RoleFieldApi = {
  name: string
  state: { value: Role }
  handleChange: (value: Role) => void
}

// The role picker as a form field.
export function RoleField({ field }: { field: RoleFieldApi }) {
  const { t } = useTranslation()
  const roleLabels = useRoleLabels()

  return (
    <Field>
      <FieldLabel htmlFor={field.name}>{t('roles.label')}</FieldLabel>
      <Select
        items={roleLabels}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value as Role)}
      >
        <SelectTrigger id={field.name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {roleLabels[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
