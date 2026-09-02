import { getListUsersQueryKey, useCreateUser } from '#/api/admin/admin'
import { CreateUserBody } from '#/api/endpoints/admin/admin.zod'
import { FormActions } from '#/components/form/form-actions'
import { RoleField } from '#/components/form/role-field'
import { TextField } from '#/components/form/text-field'
import { Panel } from '#/components/panel'
import { FieldGroup } from '#/components/ui/field'
import { toast } from '#/components/ui/toast'
import type { Role } from '#/lib/roles'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_nav/admin/users/new')({
  component: NewUser,
})

function NewUser() {
  const createUser = useCreateUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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
          title: 'Could not create user',
          description: res.data.detail ?? 'The account was not created',
        })
        return
      }

      await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })
      toast.add({ type: 'success', description: 'User created' })
      navigate({
        to: '/admin/users/$userId',
        params: { userId: res.data.id },
        replace: true,
      })
    },
  })

  return (
    <Panel
      title="New user"
      back={<Link to="/admin/users" />}
      backLabel="Back to users"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <form
          id="new-user-form"
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
            <form.Field
              name="password"
              children={(field) => (
                <TextField
                  field={field}
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                />
              )}
            />
            <form.Field
              name="role"
              children={(field) => <RoleField field={field} />}
            />
          </FieldGroup>
        </form>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <FormActions
              formId="new-user-form"
              submit="Create user"
              submitting="Creating…"
              isSubmitting={isSubmitting}
              disabled={!canSubmit}
              cancel={<Link to="/admin/users" />}
            />
          )}
        />
      </div>
    </Panel>
  )
}
