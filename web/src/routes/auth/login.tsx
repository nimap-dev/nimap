import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { LoginBody } from '#/api/endpoints/auth/auth.zod'
import { toast } from '#/components/ui/toast'
import { useLogin } from '#/api/auth/auth'
import { currentUserQueryOptions } from '#/lib/auth'
import { TextField } from '#/components/form/text-field'
import { Button } from '#/components/ui/button'
import { Field, FieldGroup } from '#/components/ui/field'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const raw = search.redirect

    const path =
      typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
        ? raw
        : undefined

    return path ? { redirect: path } : {}
  },
  // Already logged in: there is nothing to show here.
  beforeLoad: async ({ context }) => {
    const response = await context.queryClient.ensureQueryData(
      currentUserQueryOptions,
    )

    if (response.status === 200) {
      throw redirect({ to: '/' })
    }
  },
  component: Login,
})

function Login() {
  const loginMutation = useLogin()
  const router = useRouter()
  const queryClient = useQueryClient()
  const search = Route.useSearch()

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
    validators: {
      onSubmit: LoginBody,
    },
    onSubmit: async ({ value }) => {
      const res = await loginMutation.mutateAsync({ data: value })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          description: res.data.detail ?? 'Invalid username or password',
        })
        return
      }

      queryClient.setQueryData(currentUserQueryOptions.queryKey, res)
      toast.add({ type: 'success', description: 'Logged in successfully' })

      router.history.replace(search.redirect ?? '/')
    },
  })
  return (
    <div className="flex min-h-screen w-full items-center">
      <Card className="mx-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Login by providing your username and password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="login-form"
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
                    placeholder="admin"
                    autoComplete="username"
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
                    placeholder="my-secure-password"
                    autoComplete="current-password"
                  />
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Field orientation="horizontal">
            <Button type="submit" form="login-form">
              Login
            </Button>
          </Field>
        </CardFooter>
      </Card>
    </div>
  )
}
