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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LoginBody } from '#/api/endpoints/auth/auth.zod'
import { toast } from '#/components/ui/toast'
import { getListAuthProvidersQueryOptions, useLogin } from '#/api/auth/auth'
import { currentUserQueryOptions } from '#/lib/auth'
import { TextField } from '#/components/form/text-field'
import { Button } from '#/components/ui/button'
import { Field, FieldGroup, FieldSeparator } from '#/components/ui/field'
import { applyLanguage, browserLanguage } from '#/lib/i18n'
import { useTranslation } from 'react-i18next'

/** The ?error= codes a failed single sign-on comes back with. */
const ssoErrors = ['oidc', 'oidc_no_account'] as const
type SsoError = (typeof ssoErrors)[number]

type LoginSearch = { redirect?: string; error?: SsoError }

const authProvidersQueryOptions = getListAuthProvidersQueryOptions({
  query: { retry: false, staleTime: Infinity },
})

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const raw = search.redirect

    const path =
      typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
        ? raw
        : undefined

    const error = ssoErrors.find((code) => code === search.error)

    return {
      ...(path ? { redirect: path } : {}),
      ...(error ? { error } : {}),
    }
  },
  // Already logged in: there is nothing to show here.
  beforeLoad: async ({ context }) => {
    const response = await context.queryClient.ensureQueryData(
      currentUserQueryOptions,
    )

    if (response.status === 200) {
      throw redirect({ to: '/' })
    }
    applyLanguage(browserLanguage())
  },
  component: Login,
})

function Login() {
  const { t } = useTranslation('auth')
  const loginMutation = useLogin()
  const router = useRouter()
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const { data: providers } = useQuery(authProvidersQueryOptions)
  const sso = providers?.status === 200 ? providers.data.oidc : undefined

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
          description: res.data.detail ?? t('login.invalid'),
        })
        return
      }

      queryClient.setQueryData(currentUserQueryOptions.queryKey, res)
      toast.add({ type: 'success', description: t('login.success') })

      router.history.replace(search.redirect ?? '/')
    },
  })
  return (
    <div className="flex min-h-screen w-full items-center">
      <Card className="mx-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>{t('login.title')}</CardTitle>
          <CardDescription>{t('login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {search.error && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {t(`login.ssoErrors.${search.error}`)}
            </p>
          )}
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
                    label={t('login.username')}
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
                    label={t('login.password')}
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
          <FieldGroup>
            <Field orientation="horizontal">
              <Button type="submit" form="login-form">
                {t('login.submit')}
              </Button>
            </Field>
            {sso && (
              <>
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                  {t('login.or')}
                </FieldSeparator>
                <Field>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={`${sso.loginUrl}?next=${encodeURIComponent(search.redirect ?? '/')}`}
                      />
                    }
                  >
                    {t('login.sso', { name: sso.name })}
                  </Button>
                </Field>
              </>
            )}
          </FieldGroup>
        </CardFooter>
      </Card>
    </div>
  )
}
