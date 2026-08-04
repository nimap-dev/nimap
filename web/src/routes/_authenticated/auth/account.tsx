import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { useRequireAuth } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated/auth/account')({ component: Account })

function Account() {
  const { user, isLoading } = useRequireAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen w-full items-center">
      <Card className="mx-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your current account information.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <InfoRow label="Username" value={user.username} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="User ID" value={user.id} />
          <InfoRow
            label="Created"
            value={new Date(user.created_at).toLocaleString()}
          />
          <InfoRow
            label="Updated"
            value={new Date(user.updated_at).toLocaleString()}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
