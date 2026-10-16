import { BadgeCheck, ChevronsUpDown, LogOut, Users } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth, useCan } from '#/lib/auth'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { getGetCurrentUserQueryKey, useLogout } from '#/api/auth/auth'
import { useTranslation } from 'react-i18next'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user } = useAuth()
  const { t } = useTranslation(['nav', 'common'])
  const canManageUsers = useCan('users:manage')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: async () => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), undefined)
        await queryClient.invalidateQueries({
          queryKey: getGetCurrentUserQueryKey(),
        })
        navigate({ to: '/auth/login', replace: true })
      },
    },
  })

  if (!user) return
  return (
    <SidebarMenu className="w-8 max-md:w-10">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="size-8 p-0 max-md:size-10 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg max-md:size-10">
              <AvatarFallback className="rounded-lg">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.username}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.username}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/auth/account" />}>
                <BadgeCheck />
                {t('account')}
              </DropdownMenuItem>
              {canManageUsers && (
                <DropdownMenuItem render={<Link to="/admin/users" />}>
                  <Users />
                  {t('manageUsers')}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logoutMutation.mutate()
              }}
            >
              <LogOut />
              {t('common:actions.logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
