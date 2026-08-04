import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#/components/ui/card'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { LoginBody } from '#/api/endpoints/auth/auth.zod'
import { toast } from '#/components/ui/toast'
import { getGetCurrentUserQueryKey, useLogin } from '#/api/auth/auth'
import { useAuth } from '#/lib/auth'
import { Button } from '#/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'


export const Route = createFileRoute('/auth/login')({ component: Login })

function Login() {
  const loginMutation = useLogin()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading } = useAuth()

  // If the user is already logged in, don't show the login form.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/", replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  const form = useForm({
    defaultValues: {
      username: "",
      password: ""
    },
    validators: {
      onSubmit: LoginBody,
    },
    onSubmit: async ({ value }) => {
      const res = await loginMutation.mutateAsync({ data: value })
      if (res.status === 200) {
        await queryClient.invalidateQueries({
          queryKey: getGetCurrentUserQueryKey(),
        })
        toast.add({ type: "success", description: "Logged in successfully" })
        navigate({ to: "/auth/account", replace: true })
      } else {
        toast.add({
          type: "error",
          description: res.data?.detail ?? "Invalid username or password",
        })
      }
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
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="admin"
                        autoComplete="username"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              />
              <form.Field
                name="password"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        type="password"
                        placeholder="my-secure-password"
                        autoComplete="current-password"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
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
