import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { currentUserQueryOptions, useAuth } from '#/lib/auth'
import type { User } from '#/api/model'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import * as zod from 'zod'
import { useUpdateAccount, useUpdatePassword } from '#/api/auth/auth'
import {
  UpdateAccountBody,
  UpdatePasswordBody,
} from '#/api/endpoints/auth/auth.zod'
import { Panel } from '#/components/panel'
import { TextField } from '#/components/form/text-field'
import { Button } from '#/components/ui/button'
import { FieldGroup } from '#/components/ui/field'
import { toast } from '#/components/ui/toast'

export const Route = createFileRoute('/_authenticated/_nav/auth/account')({
  component: Account,
})

function Account() {
  const { user, isLoading } = useAuth()

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Account
          {user && (
            <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
              {user.role}
            </span>
          )}
        </span>
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {isLoading ? (
          <AccountSkeleton />
        ) : (
          user && (
            <>
              <AccountForm user={user} />
              <PasswordForm />
              <AccountMeta user={user} />
            </>
          )
        )}
      </div>
    </Panel>
  )
}

function AccountMeta({ user }: { user: User }) {
  return (
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
  )
}

function AccountForm({ user }: { user: User }) {
  const updateAccount = useUpdateAccount()
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      username: user.username,
      email: user.email,
      currentPassword: '',
    },
    validators: { onSubmit: UpdateAccountBody },
    onSubmit: async ({ value }) => {
      const res = await updateAccount.mutateAsync({ data: value })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: 'Could not save',
          description: res.data.detail ?? 'Your account was not updated',
        })
        return
      }

      queryClient.setQueryData(currentUserQueryOptions.queryKey, res)

      // Re-seed from what was actually saved, and drop the spent password.
      form.reset({
        username: res.data.username,
        email: res.data.email,
        currentPassword: '',
      })
      toast.add({ type: 'success', description: 'Account updated' })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Change your username and email. Confirm with your current password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="account-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="username"
              children={(field) => (
                <TextField
                  field={field}
                  label="Username"
                  autoComplete="username"
                />
              )}
            />
            <form.Field
              name="email"
              children={(field) => (
                <TextField
                  field={field}
                  label="Email"
                  type="email"
                  autoComplete="email"
                />
              )}
            />
            <form.Field
              name="currentPassword"
              children={(field) => (
                <TextField
                  field={field}
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
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
              form="account-form"
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

/**
 * The generated body plus the confirmation field, which never leaves the
 * browser
 */
const PasswordFormBody = UpdatePasswordBody.extend({
  confirmPassword: zod.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function PasswordForm() {
  const updatePassword = useUpdatePassword()

  const form = useForm({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validators: { onSubmit: PasswordFormBody },
    onSubmit: async ({ value }) => {
      const res = await updatePassword.mutateAsync({
        data: {
          oldPassword: value.oldPassword,
          newPassword: value.newPassword,
        },
      })

      if (res.status !== 204) {
        toast.add({
          type: 'error',
          title: 'Could not change password',
          description: res.data.detail ?? 'Your password was not changed',
        })
        return
      }

      form.reset()
      toast.add({ type: 'success', description: 'Password changed' })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Choose a new password of at least 8 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="password-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="oldPassword"
              children={(field) => (
                <TextField
                  field={field}
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                />
              )}
            />
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
              form="password-form"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Changing…' : 'Change password'}
            </Button>
          )}
        />
      </CardFooter>
    </Card>
  )
}

function AccountSkeleton() {
  return (
    <>
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[0, 1, 2].map((field) => (
              <div className="grid gap-2" key={field}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Skeleton className="h-3 w-72" />
    </>
  )
}
