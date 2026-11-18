import {
  getListApiKeysQueryKey,
  useCreateApiKey,
  useDeleteApiKey,
  useListApiKeys,
} from '#/api/auth/auth'
import { CreateApiKeyBody } from '#/api/endpoints/auth/auth.zod'
import type { APIKey } from '#/api/model'
import { FormSection } from '#/components/form-section'
import { SelectField } from '#/components/form/select-field'
import { TextField } from '#/components/form/text-field'
import { RelativeDate } from '#/components/formatted-date'
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
import { toast } from '#/components/ui/toast'
import { cn } from '#/lib/utils'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type Expiry = '' | '30' | '90' | '365'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The current user's API keys, across the whole page: a one-line form to
 * create one, the new key shown once in its place, and a row per key with a
 * way to revoke it.
 */
export function ApiKeys() {
  const { data } = useListApiKeys()
  const [created, setCreated] = useState<string>()
  const { t } = useTranslation('account')

  const keys = data?.status === 200 ? data.data : []

  return (
    <FormSection
      title={t('apiKeys.title')}
      description={t('apiKeys.description')}
      className="col-span-full"
    >
      {created ? (
        <NewApiKey token={created} onDone={() => setCreated(undefined)} />
      ) : (
        <CreateApiKeyForm onCreated={setCreated} />
      )}
      <ul className="-mx-3 -mb-3 divide-y border-t">
        {keys.length === 0 ? (
          <li className="px-3 py-2.5 text-muted-foreground">
            {t('apiKeys.empty')}
          </li>
        ) : (
          keys.map((key) => <ApiKeyRow key={key.id} apiKey={key} />)
        )}
      </ul>
    </FormSection>
  )
}

function CreateApiKeyForm({
  onCreated,
}: {
  onCreated: (token: string) => void
}) {
  const createKey = useCreateApiKey()
  const queryClient = useQueryClient()
  const { t } = useTranslation(['account', 'common'])

  const expiryOptions: Array<{ value: Exclude<Expiry, ''>; label: string }> = [
    { value: '30', label: t('apiKeys.expiryDays', { count: 30 }) },
    { value: '90', label: t('apiKeys.expiryDays', { count: 90 }) },
    { value: '365', label: t('apiKeys.expiryYear') },
  ]

  const form = useForm({
    defaultValues: { name: '', expiry: '' as Expiry },
    onSubmit: async ({ value }) => {
      const res = await createKey.mutateAsync({
        data: {
          name: value.name,
          expiresAt:
            value.expiry === ''
              ? undefined
              : new Date(
                  Date.now() + Number(value.expiry) * DAY_MS,
                ).toISOString(),
        },
      })

      if (res.status !== 201) {
        toast.add({
          type: 'error',
          title: t('apiKeys.couldNotCreate'),
          description: res.data.detail ?? t('apiKeys.notCreated'),
        })
        return
      }

      void queryClient.invalidateQueries({
        queryKey: getListApiKeysQueryKey(),
      })
      form.reset()
      onCreated(res.data.token)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="grid items-start gap-3 @lg/section:grid-cols-[minmax(0,1fr)_12rem_auto]"
    >
      <form.Field
        name="name"
        validators={{
          onChange: CreateApiKeyBody.shape.name,
          onSubmit: CreateApiKeyBody.shape.name,
        }}
        children={(field) => (
          <TextField
            field={field}
            label={t('apiKeys.name')}
            placeholder={t('apiKeys.namePlaceholder')}
            autoComplete="off"
          />
        )}
      />
      <form.Field
        name="expiry"
        children={(field) => (
          <SelectField
            field={field}
            label={t('apiKeys.expiry')}
            emptyLabel={t('apiKeys.never')}
            allowEmpty
            options={expiryOptions}
          />
        )}
      />
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            className="@lg/section:mt-5.5"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? t('apiKeys.submitting') : t('apiKeys.submit')}
          </Button>
        )}
      />
    </form>
  )
}

function NewApiKey({ token, onDone }: { token: string; onDone: () => void }) {
  const { t } = useTranslation('account')

  async function copy() {
    try {
      await navigator.clipboard.writeText(token)
      toast.add({ type: 'success', description: t('apiKeys.copied') })
    } catch {
      toast.add({ type: 'error', description: t('apiKeys.copyFailed') })
    }
  }

  return (
    <div className="grid gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
      <p>{t('apiKeys.createdDescription')}</p>
      <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all select-all">
        {token}
      </code>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={copy}>
          <Copy />
          {t('apiKeys.copy')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          {t('apiKeys.done')}
        </Button>
      </div>
    </div>
  )
}

function ApiKeyRow({ apiKey }: { apiKey: APIKey }) {
  const { t } = useTranslation('account')
  const expired =
    apiKey.expiresAt !== undefined && new Date(apiKey.expiresAt) <= new Date()

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <KeyRound className="size-4 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="truncate font-medium">{apiKey.name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {apiKey.prefix}…
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <RelativeDate value={apiKey.createdAt}>
            {(when) => t('apiKeys.createdWhen', { when })}
          </RelativeDate>
          {apiKey.lastUsedAt ? (
            <RelativeDate value={apiKey.lastUsedAt}>
              {(when) => t('apiKeys.lastUsedWhen', { when })}
            </RelativeDate>
          ) : (
            <span>{t('apiKeys.neverUsed')}</span>
          )}
          {apiKey.expiresAt ? (
            <RelativeDate
              value={apiKey.expiresAt}
              className={cn(expired && 'text-destructive')}
            >
              {(when) =>
                expired
                  ? t('apiKeys.expiredWhen', { when })
                  : t('apiKeys.expiresWhen', { when })
              }
            </RelativeDate>
          ) : (
            <span>{t('apiKeys.noExpiry')}</span>
          )}
        </div>
      </div>
      <RevokeApiKeyButton apiKey={apiKey} />
    </li>
  )
}

function RevokeApiKeyButton({ apiKey }: { apiKey: APIKey }) {
  const revoke = useDeleteApiKey()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const { t } = useTranslation(['account', 'common'])

  async function handleRevoke() {
    try {
      const res = await revoke.mutateAsync({ id: apiKey.id })

      if (res.status !== 204) {
        toast.add({
          type: 'error',
          title: t('apiKeys.couldNotRevoke'),
          description: res.data.detail ?? t('apiKeys.notRevoked'),
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: t('apiKeys.couldNotRevoke'),
        description: t('common:errors.requestFailed'),
      })
      return
    }

    setOpen(false)
    void queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() })
    toast.add({
      type: 'success',
      description: t('apiKeys.revoked', { name: apiKey.name }),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" />}
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {t('apiKeys.revoke')}
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <KeyRound />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {t('apiKeys.revokeTitle', { name: apiKey.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('apiKeys.revokeDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={revoke.isPending}>
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={revoke.isPending}
            onClick={handleRevoke}
          >
            {revoke.isPending
              ? t('apiKeys.revoking')
              : t('apiKeys.revokeSubmit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
