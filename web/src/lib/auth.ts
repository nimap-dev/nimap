import { useQuery } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { getGetCurrentUserQueryOptions } from '#/api/auth/auth'
import type { getCurrentUserResponse } from '#/api/auth/auth'
import type { User } from '#/api/model'

/**
 * What an account may do. The names mirror `internal/auth/roles.go`; only the
 * names live here. Which roles hold them is the server's business and arrives
 * on the user as `permissions`, so there is no second copy of the policy on
 * this side to drift out of step with the one being enforced.
 */
export type Permission = 'records:read' | 'records:write' | 'users:manage'

export const currentUserQueryOptions = getGetCurrentUserQueryOptions({
  query: { retry: false, staleTime: 5 * 60 * 1000 },
})

function userFrom(response: getCurrentUserResponse | undefined): User | null {
  return response?.status === 200 ? response.data : null
}

export function useAuth() {
  const { data, isLoading } = useQuery(currentUserQueryOptions)
  const user = userFrom(data)

  return { user, isLoading, isAuthenticated: user !== null }
}

// Whether the signed-in user may do something.
export function useCan(permission: Permission) {
  const { user } = useAuth()

  return user?.permissions.includes(permission) ?? false
}

// The same question from a route guard, where there are no hooks.
export function can(queryClient: QueryClient, permission: Permission) {
  const user = userFrom(
    queryClient.getQueryData(currentUserQueryOptions.queryKey),
  )

  return user?.permissions.includes(permission) ?? false
}
