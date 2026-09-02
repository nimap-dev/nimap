import { Field, FieldLabel } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { roleLabels, roleOptions } from '#/lib/roles'
import type { Role } from '#/lib/roles'

type RoleFieldApi = {
  name: string
  state: { value: Role }
  handleChange: (value: Role) => void
}

// The role picker as a form field.
export function RoleField({ field }: { field: RoleFieldApi }) {
  return (
    <Field>
      <FieldLabel htmlFor={field.name}>Role</FieldLabel>
      <Select
        items={roleLabels}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value as Role)}
      >
        <SelectTrigger id={field.name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
