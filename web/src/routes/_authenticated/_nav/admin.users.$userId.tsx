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
import { DetailColumn, DetailGrid, DetailMeta } from '#/components/detail-list'
import { FormSection } from '#/components/form-section'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from '#/components/ui/toast'
import { useAuth } from '#/lib/auth'
import { asRole, roles, useRoleLabels } from '#/lib/roles'
import type { Role } from '#/lib/roles'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import * as zod from 'zod'
import { useTranslation } from 'react-i18next'
import i18n from '#/lib/i18n'

export const Route = createFileRoute(
  '/_authenticated/_nav/admin/users/$userId',
)({ component: ManageUser })

function ManageUser() {
  const { userId } = Route.useParams()
  const { data, isPending } = useGetUser(userId)
  const { t } = useTranslation('admin')

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/admin/users" />}
        backLabel={t('users.back')}
      />
    )
  }

  const user = data?.status === 200 ? data.data : undefined

  if (!user) {
    return (
      <PanelNotFound
        description={t('users.notFound')}
        back={<Link to="/admin/users" />}
        backLabel={t('users.back')}
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
  const { t } = useTranslation(['admin', 'common'])
  const roleLabels = useRoleLabels()

  const isSelf = actor?.id === user.id

  async function handleDelete() {
    try {
      const res = await deleteUser.mutateAsync({ id: user.id })

      if (res.status !== 204) {
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotDelete'),
          description:
            res.data.detail ??
            t('delete.stillThere', { username: user.username }),
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: t('common:errors.couldNotDelete'),
        description: t('delete.requestFailed'),
      })
      return
    }

    setConfirmingDelete(false)
    queryClient.removeQueries({ queryKey: getGetUserQueryKey(user.id) })
    await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })
    toast.add({
      type: 'success',
      description: t('delete.deleted', { username: user.username }),
    })
    navigate({ to: '/admin/users', replace: true })
  }

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={user.username}
        back={<Link to="/admin/users" />}
        backLabel={t('users.back')}
        action={
          !isSelf && (
            <AlertDialogTrigger
              aria-label={t('delete.label')}
              render={<Button variant="ghost" size="icon" />}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </AlertDialogTrigger>
          )
        }
      >
        <DetailGrid>
          {isSelf ? (
            <OwnAccountNotice />
          ) : (
            <>
              <DetailColumn>
                <UserAccountForm user={user} />
              </DetailColumn>
              <DetailColumn>
                <UserRoleSection user={user} />
                <UserPasswordForm user={user} />
              </DetailColumn>
            </>
          )}

          <DetailMeta
            id={user.id}
            createdAt={user.createdAt}
            updatedAt={user.updatedAt}
          />
        </DetailGrid>
      </Panel>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {t('delete.title', { username: user.username })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description', { viewer: roleLabels.viewer })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={deleteUser.isPending}>
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteUser.isPending}
            onClick={handleDelete}
          >
            {deleteUser.isPending
              ? t('common:actions.deleting')
              : t('delete.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// What the page shows an admin looking at their own row.
function OwnAccountNotice() {
  const { t } = useTranslation('admin')

  return (
    <FormSection
      title={t('self.title')}
      description={t('self.description')}
      className="@3xl/grid:col-span-2"
      footer={
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/auth/account" />}
          nativeButton={false}
        >
          {t('self.goToAccount')}
        </Button>
      }
    />
  )
}

function UserAccountForm({ user }: { user: User }) {
  const updateUser = useUpdateUser()
  const queryClient = useQueryClient()
  const { t } = useTranslation(['admin', 'common'])

  const form = useForm({
    defaultValues: { username: user.username, email: user.email },
    validators: { onSubmit: UpdateUserBody },
    onSubmit: async ({ value }) => {
      const res = await updateUser.mutateAsync({ id: user.id, data: value })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotSave'),
          description: res.data.detail ?? t('account.notUpdated'),
        })
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetUserQueryKey(user.id),
        }),
      ])
      toast.add({ type: 'success', description: t('account.updated') })
    },
  })

  return (
    <FormSection
      title={t('account.title')}
      description={t('account.description')}
      footer={
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              form="user-account-form"
              size="sm"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting
                ? t('common:actions.saving')
                : t('common:actions.saveChanges')}
            </Button>
          )}
        />
      }
    >
      <form
        id="user-account-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="grid gap-4">
          <form.Field
            name="username"
            children={(field) => (
              <TextField
                field={field}
                label={t('fields.username')}
                autoComplete="off"
              />
            )}
          />
          <form.Field
            name="email"
            children={(field) => (
              <TextField
                field={field}
                label={t('fields.email')}
                type="email"
                autoComplete="off"
              />
            )}
          />
        </div>
      </form>
    </FormSection>
  )
}

function UserRoleSection({ user }: { user: User }) {
  const updateRole = useUpdateUserRole()
  const queryClient = useQueryClient()
  const { t } = useTranslation(['admin', 'common'])
  const roleLabels = useRoleLabels()

  async function handleRoleChange(role: Role) {
    try {
      const res = await updateRole.mutateAsync({
        id: user.id,
        data: { role },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: t('role.couldNotChange'),
          description:
            res.data.detail ?? t('role.unchanged', { username: user.username }),
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: t('role.couldNotChange'),
        description: t('common:errors.requestFailed'),
      })
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(user.id) }),
    ])
    toast.add({
      type: 'success',
      description: t('role.changed', {
        username: user.username,
        role: roleLabels[role].toLowerCase(),
      }),
    })
  }

  return (
    <FormSection
      title={t('common:roles.label')}
      description={t('role.description')}
    >
      <Select
        items={roleLabels}
        value={asRole(user.role)}
        onValueChange={(value) => handleRoleChange(value as Role)}
        disabled={updateRole.isPending}
      >
        <SelectTrigger className="w-full" aria-label={t('role.selectLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {roleLabels[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormSection>
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
  error: () => i18n.t('common:validation.passwordsMismatch'),
  path: ['confirmPassword'],
})

function UserPasswordForm({ user }: { user: User }) {
  const resetPassword = useResetUserPassword()
  const { t } = useTranslation('admin')

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
          title: t('password.couldNotReset'),
          description: res.data.detail ?? t('password.notChanged'),
        })
        return
      }

      form.reset()
      toast.add({
        type: 'success',
        description: t('password.reset', { username: user.username }),
      })
    },
  })

  return (
    <FormSection
      title={t('password.title')}
      description={t('password.description')}
      footer={
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              form="user-password-form"
              size="sm"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? t('password.submitting') : t('password.submit')}
            </Button>
          )}
        />
      }
    >
      <form
        id="user-password-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="grid gap-4">
          <form.Field
            name="newPassword"
            children={(field) => (
              <TextField
                field={field}
                label={t('fields.newPassword')}
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
                label={t('fields.confirmPassword')}
                type="password"
                autoComplete="new-password"
              />
            )}
          />
        </div>
      </form>
    </FormSection>
  )
}
