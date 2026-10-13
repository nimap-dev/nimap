import { CreateUserInputBodyRole } from '#/api/model'
import { useTranslation } from 'react-i18next'

/**
 * Orval mints a separate enum type per schema, one for creating a user and one
 * for changing their role, but both are the same union of the same three
 * strings. This is the name to use when the code means "a role" rather than
 * "the role field of that particular request".
 */
export type Role = CreateUserInputBodyRole

// Listed least privileged first, matching auth.RoleNames on the server, so the
// options read the way the permissions stack up rather than alphabetically.
export const roles = Object.values(CreateUserInputBodyRole)

/** Each role's name in the interface language. */
export function useRoleLabels(): Record<Role, string> {
  const { t } = useTranslation()

  return {
    viewer: t('roles.viewer'),
    editor: t('roles.editor'),
    admin: t('roles.admin'),
  }
}

/**
 * The role of an account as it arrives on `User`, where it is a plain string:
 * the response schema does not carry the enum, only the request bodies do.
 */
export function asRole(role: string): Role {
  return role as Role
}
