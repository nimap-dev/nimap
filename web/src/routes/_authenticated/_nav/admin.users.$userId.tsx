import {
  getGetUserQueryKey,
  getListUsersQueryKey,
  useDeleteUser,
  useGetUser,
  useResetUserPassword,
  useUpdateUser,
  useUpdateUserRole,
} from '#/api/admin/admin'
import {
  ResetUserPasswordBody,
  UpdateUserBody,
} from '#/api/endpoints/admin/admin.zod'
import type { User } from '#/api/model'
import { TextField } from '#/components/form/text-field'
import { Detail, DetailList } from '#/components/detail-list'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { RoleBadge } from '#/components/role-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { FieldGroup } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from '#/components/ui/toast'
import { useAuth } from '#/lib/auth'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { asRole, roleLabels, roleOptions } from '#/lib/roles'
import type { Role } from '#/lib/roles'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import * as zod from 'zod'

export const Route = createFileRoute(
  '/_authenticated/_nav/admin/users/$userId',
)({ component: ManageUser })

function ManageUser() {
  const { userId } = Route.useParams()
  const { data, isPending } = useGetUser(userId)

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/admin/users" />}
        backLabel="Back to users"
      />
    )
  }

  const user = data?.status === 200 ? data.data : undefined

  if (!user) {
    return (
      <PanelNotFound
        noun="user"
        back={<Link to="/admin/users" />}
        backLabel="Back to users"
      />
    )
  }

  return <ManageUserDetail user={user} />
}

function ManageUserDetail({ user }: { user: User }) {
  const { user: actor } = useAuth()
  const deleteUser = useDeleteUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isSelf = actor?.id === user.id

  async function handleDelete() {
    try {
      const res = await deleteUser.mutateAsync({ id: user.id })

      if (res.status !== 204) {
        toast.add({
          type: 'error',
          title: 'Could not delete',
          description: res.data.detail ?? `${user.username} is still there`,
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: 'Could not delete',
        description: 'The request failed, check your connection and retry',
      })
      return
    }

    setConfirmingDelete(false)
    queryClient.removeQueries({ queryKey: getGetUserQueryKey(user.id) })
    await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })
    toast.add({ type: 'success', description: `${user.username} was deleted` })
    navigate({ to: '/admin/users', replace: true })
  }

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={
          <span className="flex items-center gap-2">
            <span className="truncate">{user.username}</span>
            <RoleBadge role={asRole(user.role)} />
          </span>
        }
        back={<Link to="/admin/users" />}
        backLabel="Back to users"
        action={
          !isSelf && (
            <AlertDialogTrigger
              aria-label="Delete user"
              render={<Button variant="ghost" size="icon" />}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </AlertDialogTrigger>
          )
        }
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {isSelf ? (
            <OwnAccountNotice />
          ) : (
            <>
              <UserAccountForm user={user} />
              <UserRoleCard user={user} />
              <UserPasswordForm user={user} />
            </>
          )}

          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-mono select-all">{user.id}</span>
            <span aria-hidden="true">·</span>
            <span title={formatAbsoluteDate(user.created_at)}>
              created {formatRelativeDate(user.created_at)}
            </span>
            <span aria-hidden="true">·</span>
            <span title={formatAbsoluteDate(user.updated_at)}>
              updated {formatRelativeDate(user.updated_at)}
            </span>
          </p>
        </div>
      </Panel>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
          <AlertDialogDescription>
            The account is removed outright, and whoever was using it is signed
            out on their next request. If you only want to take their access
            away, set their role to Viewer instead: they keep the account and
            you keep the option of giving the access back. You can't undo this
            from here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={deleteUser.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteUser.isPending}
            onClick={handleDelete}
          >
            {deleteUser.isPending ? 'Deleting…' : 'Delete user'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// What the page shows an admin looking at their own row.
function OwnAccountNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This is your account</CardTitle>
        <CardDescription>
          Your own username, email, password and role are not editable here.
          Account settings asks for your current password before it changes
          anything, and an admin who could demote themselves could lock everyone
          out.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          variant="outline"
          render={<Link to="/auth/account" />}
          nativeButton={false}
        >
          Go to account settings
        </Button>
      </CardFooter>
    </Card>
  )
}

function UserAccountForm({ user }: { user: User }) {
  const updateUser = useUpdateUser()
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: { username: user.username, email: user.email },
    validators: { onSubmit: UpdateUserBody },
    onSubmit: async ({ value }) => {
      const res = await updateUser.mutateAsync({ id: user.id, data: value })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: 'Could not save',
          description: res.data.detail ?? 'The account was not updated',
        })
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetUserQueryKey(user.id),
        }),
      ])
      toast.add({ type: 'success', description: 'Account updated' })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Change this user's username and email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="user-account-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="username"
              children={(field) => (
                <TextField field={field} label="Username" autoComplete="off" />
              )}
            />
            <form.Field
              name="email"
              children={(field) => (
                <TextField
                  field={field}
                  label="Email"
                  type="email"
                  autoComplete="off"
                />
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              form="user-account-form"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        />
      </CardFooter>
    </Card>
  )
}

function UserRoleCard({ user }: { user: User }) {
  const updateRole = useUpdateUserRole()
  const queryClient = useQueryClient()

  async function handleRoleChange(role: Role) {
    const res = await updateRole.mutateAsync({
      id: user.id,
      data: { role },
    })

    if (res.status !== 200) {
      toast.add({
        type: 'error',
        title: 'Could not change role',
        description: res.data.detail ?? `${user.username} is unchanged`,
      })
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(user.id) }),
    ])
    toast.add({
      type: 'success',
      description: `${user.username} is now ${roleLabels[role].toLowerCase()}`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role</CardTitle>
        <CardDescription>
          Takes effect on this user's next request. They stay signed in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Role" align="center">
            <Select
              items={roleLabels}
              value={asRole(user.role)}
              onValueChange={(value) => handleRoleChange(value as Role)}
              disabled={updateRole.isPending}
            >
              <SelectTrigger size="sm" aria-label="User role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Detail>
        </DetailList>
      </CardContent>
    </Card>
  )
}

/**
 * The generated body plus the confirmation field, which never leaves the
 * browser: the server has no use for a value whose only job is catching a typo
 * before it is handed to someone as their password.
 */
const PasswordFormBody = ResetUserPasswordBody.extend({
  confirmPassword: zod.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function UserPasswordForm({ user }: { user: User }) {
  const resetPassword = useResetUserPassword()

  const form = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
    validators: { onSubmit: PasswordFormBody },
    onSubmit: async ({ value }) => {
      const res = await resetPassword.mutateAsync({
        id: user.id,
        data: { newPassword: value.newPassword },
      })

      if (res.status !== 204) {
        toast.add({
          type: 'error',
          title: 'Could not reset password',
          description: res.data.detail ?? 'The password was not changed',
        })
        return
      }

      form.reset()
      toast.add({
        type: 'success',
        description: `${user.username} has a new password`,
      })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Set a new password of at least 8 characters, then pass it on. Their
          existing sessions keep working until they expire.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="user-password-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="newPassword"
              children={(field) => (
                <TextField
                  field={field}
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                />
              )}
            />
            <form.Field
              name="confirmPassword"
              children={(field) => (
                <TextField
                  field={field}
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                />
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              form="user-password-form"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </Button>
          )}
        />
      </CardFooter>
    </Card>
  )
}
