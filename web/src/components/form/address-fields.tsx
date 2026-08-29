import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import type { AddressValue } from '#/lib/address'

/**
 * The four address inputs, driven as one value. Forms hold the address in a
 * single field rather than four, which keeps this easily reusable between
 * buildings and locations.
 */
export function AddressFields({
  idPrefix,
  value,
  onChange,
}: {
  /** Keeps the labels pointing at the right inputs when a page shows two. */
  idPrefix: string
  value: AddressValue
  onChange: (value: AddressValue) => void
}) {
  function set(part: keyof AddressValue) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [part]: event.target.value })
  }

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-street`}>Street</FieldLabel>
        <Input
          id={`${idPrefix}-street`}
          value={value.street}
          onChange={set('street')}
          placeholder="Dlouhá 123/45"
          autoComplete="street-address"
        />
      </Field>

      <div className="flex gap-2">
        <Field className="w-28 shrink-0">
          <FieldLabel htmlFor={`${idPrefix}-zip`}>ZIP</FieldLabel>
          <Input
            id={`${idPrefix}-zip`}
            value={value.zip}
            onChange={set('zip')}
            placeholder="110 00"
            autoComplete="postal-code"
          />
        </Field>

        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor={`${idPrefix}-city`}>City</FieldLabel>
          <Input
            id={`${idPrefix}-city`}
            value={value.city}
            onChange={set('city')}
            placeholder="Praha"
            autoComplete="address-level2"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-country`}>Country</FieldLabel>
        <Input
          id={`${idPrefix}-country`}
          value={value.country}
          onChange={(event) =>
            onChange({ ...value, country: event.target.value.toUpperCase() })
          }
          placeholder="CZ"
          maxLength={2}
          className="w-20"
          autoComplete="country"
          aria-describedby={`${idPrefix}-country-hint`}
        />
        <span
          id={`${idPrefix}-country-hint`}
          className="text-xs text-muted-foreground"
        >
          Two-letter code
        </span>
      </Field>
    </>
  )
}
