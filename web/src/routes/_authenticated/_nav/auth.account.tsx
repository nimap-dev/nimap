import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { useRequireAuth } from '#/lib/auth'
import type { User } from '#/api/model'
import { createFileRoute } from '@tanstack/react-router'
import { Detail, DetailList } from '#/components/detail-list'

export const Route = createFileRoute('/_authenticated/_nav/auth/account')({
  component: Account,
})

function Account() {
  const { user, isLoading } = useRequireAuth()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b p-2">
        <h2 className="min-w-0 flex-1 truncate font-medium">Account</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {isLoading ? (
            <AccountSkeleton />
          ) : (
            user && <AccountDetails user={user} />
          )}
        </div>
      </div>
    </div>
  )
}

function AccountDetails({ user }: { user: User }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="size-14 rounded-xl after:rounded-xl">
          <AvatarFallback className="rounded-xl text-lg">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 gap-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-medium">{user.username}</h3>
            <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
              {user.role}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Username">{user.username}</Detail>
            <Detail label="Email">{user.email}</Detail>
            <Detail label="Role">
              <span className="capitalize">{user.role}</span>
            </Detail>
            <Detail label="User ID">
              <span className="font-mono text-xs select-all">{user.id}</span>
            </Detail>
            <Detail label="Created" title={formatAbsoluteDate(user.created_at)}>
              {formatRelativeDate(user.created_at)}
            </Detail>
            <Detail label="Updated" title={formatAbsoluteDate(user.updated_at)}>
              {formatRelativeDate(user.updated_at)}
            </Detail>
          </DetailList>
        </CardContent>
      </Card>
    </>
  )
}

function AccountSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 py-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="flex justify-between gap-4" key={index}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
