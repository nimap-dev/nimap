import { CreateUserInputBodyRole } from '#/api/model'

/**
 * Orval mints a separate enum type per schema, one for creating a user and one
 * for changing their role, but both are the same union of the same three
 * strings. This is the name to use when the code means "a role" rather than
 * "the role field of that particular request".
 */
export type Role = CreateUserInputBodyRole

export const roleLabels: Record<CreateUserInputBodyRole, string> = {
  [CreateUserInputBodyRole.viewer]: 'Viewer',
  [CreateUserInputBodyRole.editor]: 'Editor',
  [CreateUserInputBodyRole.admin]: 'Admin',
}

// Listed least privileged first, matching auth.RoleNames on the server, so the
// options read the way the permissions stack up rather than alphabetically.
export const roleOptions = Object.entries(roleLabels) as Array<
  [CreateUserInputBodyRole, string]
>

/**
 * The role of an account as it arrives on `User`, where it is a plain string:
 * the response schema does not carry the enum, only the request bodies do.
 */
export function asRole(role: string): Role {
  return role as Role
}
