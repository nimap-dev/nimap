import { getListUsersQueryKey, useCreateUser } from '#/api/admin/admin'
import { CreateUserBody } from '#/api/endpoints/admin/admin.zod'
import { FormActions } from '#/components/form/form-actions'
import { RoleField } from '#/components/form/role-field'
import { TextField } from '#/components/form/text-field'
import { DetailColumn, DetailGrid } from '#/components/detail-list'
import { FormSection } from '#/components/form-section'
import { Panel } from '#/components/panel'
import { toast } from '#/components/ui/toast'
import type { Role } from '#/lib/roles'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/_nav/admin/users/new')({
  component: NewUser,
})

function NewUser() {
  const createUser = useCreateUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation(['admin', 'common'])

  const form = useForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'viewer' as Role,
    },
    validators: { onSubmit: CreateUserBody },
    onSubmit: async ({ value }) => {
      const res = await createUser.mutateAsync({ data: value })

      if (res.status !== 201) {
        toast.add({
          type: 'error',
          title: t('newUser.couldNotCreate'),
          description: res.data.detail ?? t('newUser.notCreated'),
        })
        return
      }

      await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })
      toast.add({ type: 'success', description: t('newUser.created') })
      navigate({
        to: '/admin/users/$userId',
        params: { userId: res.data.id },
        replace: true,
      })
    },
  })

  return (
    <Panel
      title={t('newUser.title')}
      back={<Link to="/admin/users" />}
      backLabel={t('users.back')}
    >
      <form
        id="new-user-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <DetailGrid>
          <DetailColumn>
            <FormSection title={t('account.title')}>
              <form.Field
                name="username"
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.username')}
                    autoComplete="off"
                    autoFocus
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
            </FormSection>
          </DetailColumn>

          <DetailColumn>
            <FormSection
              title={t('common:roles.label')}
              description={t('newUser.roleDescription')}
            >
              <form.Field
                name="role"
                children={(field) => <RoleField field={field} hideLabel />}
              />
            </FormSection>

            <FormSection
              title={t('password.title')}
              description={t('newUser.passwordDescription')}
            >
              <form.Field
                name="password"
                children={(field) => (
                  <TextField
                    field={field}
                    label={t('fields.password')}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              />
            </FormSection>
          </DetailColumn>
        </DetailGrid>
      </form>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <FormActions
            formId="new-user-form"
            submit={t('newUser.submit')}
            submitting={t('newUser.submitting')}
            isSubmitting={isSubmitting}
            disabled={!canSubmit}
            cancel={<Link to="/admin/users" />}
          />
        )}
      />
    </Panel>
  )
}
