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
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import * as zod from 'zod'
import {
  getGetAccountPreferencesQueryKey,
  useGetAccountPreferences,
  useUpdateAccount,
  useUpdateAccountPreferences,
  useUpdatePassword,
} from '#/api/auth/auth'
import {
  UpdateAccountBody,
  UpdateAccountPreferencesBody,
  UpdatePasswordBody,
} from '#/api/endpoints/auth/auth.zod'
import { Panel } from '#/components/panel'
import { RoleBadge } from '#/components/role-badge'
import { asRole } from '#/lib/roles'
import { ChoiceField } from '#/components/form/choice-field'
import { SelectField } from '#/components/form/select-field'
import { TextField } from '#/components/form/text-field'
import { Button } from '#/components/ui/button'
import { FieldGroup } from '#/components/ui/field'
import { toast } from '#/components/ui/toast'
import {
  browserTimezone,
  dateFormatOptions,
  languageOptions,
  themeOptions,
  timeFormatOptions,
  timezoneOptions,
} from '#/lib/preferences'
import type {
  DateFormat,
  Language,
  Theme,
  TimeFormat,
  Timezone,
} from '#/lib/preferences'

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
          {user && <RoleBadge role={asRole(user.role)} />}
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
              <Preferences />
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
      <span title={formatAbsoluteDate(user.createdAt)}>
        created {formatRelativeDate(user.createdAt)}
      </span>
      <span aria-hidden="true">·</span>
      <span title={formatAbsoluteDate(user.updatedAt)}>
        updated {formatRelativeDate(user.updatedAt)}
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

type PreferencesFormValues = {
  language: Language
  timezone: Timezone | ''
  dateFormat: DateFormat
  timeFormat: TimeFormat
  theme: Theme
}

const themeIcons: Record<Theme, ReactNode> = {
  system: <MonitorIcon />,
  light: <SunIcon />,
  dark: <MoonIcon />,
}

const themeChoices = themeOptions.map((option) => ({
  ...option,
  icon: themeIcons[option.value],
}))

/** The generated body, with "" standing for a time zone left to the browser. */
const PreferencesFormBody = UpdateAccountPreferencesBody.extend({
  timezone: UpdateAccountPreferencesBody.shape.timezone
    .unwrap()
    .or(zod.literal('')),
})

function Preferences() {
  const { data, isLoading } = useGetAccountPreferences()

  if (isLoading) return <PreferencesSkeleton />
  if (data?.status !== 200) return null

  return (
    <PreferencesForm
      defaultValues={{
        language: data.data.language,
        timezone: data.data.timezone ?? '',
        dateFormat: data.data.dateFormat,
        timeFormat: data.data.timeFormat,
        theme: data.data.theme,
      }}
    />
  )
}

function PreferencesForm({
  defaultValues,
}: {
  defaultValues: PreferencesFormValues
}) {
  const updatePreferences = useUpdateAccountPreferences()
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues,
    validators: { onSubmit: PreferencesFormBody },
    onSubmit: async ({ value }) => {
      const res = await updatePreferences.mutateAsync({
        data: {
          ...value,
          timezone: value.timezone === '' ? undefined : value.timezone,
        },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: 'Could not save',
          description: res.data.detail ?? 'Your preferences were not updated',
        })
        return
      }

      queryClient.setQueryData(getGetAccountPreferencesQueryKey(), res)

      form.reset({
        language: res.data.language,
        timezone: res.data.timezone ?? '',
        dateFormat: res.data.dateFormat,
        timeFormat: res.data.timeFormat,
        theme: res.data.theme,
      })
      toast.add({ type: 'success', description: 'Preferences updated' })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Choose how the interface looks and how dates and times are shown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="preferences-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="language"
              children={(field) => (
                <SelectField
                  field={field}
                  label="Language"
                  options={languageOptions}
                />
              )}
            />
            <form.Field
              name="theme"
              children={(field) => (
                <ChoiceField
                  field={field}
                  label="Theme"
                  options={themeChoices}
                />
              )}
            />
            <form.Field
              name="timezone"
              children={(field) => (
                <SelectField
                  field={field}
                  label="Time zone"
                  emptyLabel={`Browser default (${browserTimezone.replaceAll('_', ' ')})`}
                  allowEmpty
                  options={timezoneOptions}
                />
              )}
            />
            <form.Field
              name="dateFormat"
              children={(field) => (
                <SelectField
                  field={field}
                  label="Date format"
                  options={dateFormatOptions}
                />
              )}
            />
            <form.Field
              name="timeFormat"
              children={(field) => (
                <ChoiceField
                  field={field}
                  label="Time format"
                  options={timeFormatOptions}
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
              form="preferences-form"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save preferences'}
            </Button>
          )}
        />
      </CardFooter>
    </Card>
  )
}

function PreferencesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {[0, 1, 2, 3, 4].map((field) => (
          <div className="grid gap-2" key={field}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </CardContent>
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
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validators: { onSubmit: PasswordFormBody },
    onSubmit: async ({ value }) => {
      const res = await updatePassword.mutateAsync({
        data: {
          currentPassword: value.currentPassword,
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
