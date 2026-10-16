import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import type { AddressValue } from '#/lib/address'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('form')

  function set(part: keyof AddressValue) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [part]: event.target.value })
  }

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-street`}>
          {t('address.street')}
        </FieldLabel>
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
          <FieldLabel htmlFor={`${idPrefix}-zip`}>
            {t('address.zip')}
          </FieldLabel>
          <Input
            id={`${idPrefix}-zip`}
            value={value.zip}
            onChange={set('zip')}
            placeholder="110 00"
            autoComplete="postal-code"
          />
        </Field>

        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor={`${idPrefix}-city`}>
            {t('address.city')}
          </FieldLabel>
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
        <FieldLabel htmlFor={`${idPrefix}-country`}>
          {t('address.country')}
        </FieldLabel>
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
          {t('address.countryHint')}
        </span>
      </Field>
    </>
  )
}
