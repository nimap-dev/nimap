import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Turns an untouched optional input into a missing field. The API stores text
 * exactly as typed, spaces included, and refuses an optional field that is
 * present but blank, so "" is left out of the request rather than sent.
 */
export function optional(value: string): string | undefined {
  return value === '' ? undefined : value
}
