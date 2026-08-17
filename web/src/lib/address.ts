import type { Address } from '#/api/model'

/** The address as a form holds it: four strings, never undefined. */
export type AddressValue = {
  street: string
  city: string
  zip: string
  country: string
}

export const emptyAddress: AddressValue = {
  street: '',
  city: '',
  zip: '',
  country: '',
}

export function addressToValue(address: Address | undefined): AddressValue {
  return {
    street: address?.street ?? '',
    city: address?.city ?? '',
    zip: address?.zip ?? '',
    country: address?.country ?? '',
  }
}

/**
 * Blank parts are left out entirely, and an address that is blank all the way
 * through is no address at all, the server would only store four nulls.
 */
export function addressToRequest(value: AddressValue): Address | undefined {
  const address: Address = {
    street: value.street.trim() || undefined,
    city: value.city.trim() || undefined,
    zip: value.zip.trim() || undefined,
    country: value.country.trim().toUpperCase() || undefined,
  }

  const hasAnything = Object.values(address).some((part) => part !== undefined)

  return hasAnything ? address : undefined
}

/**
 * One line, in the order the address is written on an envelope, skipping
 * whatever is missing. Used for display and for matching in search, so that
 * what you can read is also what you can search for.
 */
export function formatAddress(address: Address | undefined): string {
  if (!address) return ''

  const cityLine = [address.zip, address.city].filter(Boolean).join(' ')

  return [address.street, cityLine, address.country]
    .filter((part) => part && part.length > 0)
    .join(', ')
}
