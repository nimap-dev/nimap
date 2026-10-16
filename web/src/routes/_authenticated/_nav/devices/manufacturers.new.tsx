import {
  getListManufacturersQueryKey,
  useCreateManufacturer,
} from '#/api/manufacturers/manufacturers'
import { CreateManufacturerBody } from '#/api/endpoints/manufacturers/manufacturers.zod'
import { FormActions } from '#/components/form/form-actions'
import { TextField } from '#/components/form/text-field'
import { TextareaField } from '#/components/form/textarea-field'
import { Panel } from '#/components/panel'
import { FieldGroup } from '#/components/ui/field'
import { toast } from '#/components/ui/toast'
import { can } from '#/lib/auth'
import { websiteSchema } from '#/lib/website'
import { optional } from '#/lib/utils'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/manufacturers/new',
)({
  beforeLoad: ({ context }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({ to: '/devices/manufacturers' })
    }
  },
  component: NewManufacturer,
})

function NewManufacturer() {
  const { t } = useTranslation(['manufacturers', 'common'])
  const createManufacturer = useCreateManufacturer()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      name: '',
      website: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      try {
        const res = await createManufacturer.mutateAsync({
          data: {
            name: value.name,
            website: optional(value.website),
            notes: optional(value.notes),
          },
        })

        if (res.status !== 201) {
          toast.add({
            type: 'error',
            title: t('new.couldNotCreate'),
            description: res.data.detail ?? t('new.notCreated'),
          })
          return
        }

        await queryClient.invalidateQueries({
          queryKey: getListManufacturersQueryKey(),
        })
        toast.add({
          type: 'success',
          description: t('new.created', { name: res.data.name }),
        })
        navigate({
          to: '/devices/manufacturers/$manufacturerId',
          params: { manufacturerId: res.data.id },
          replace: true,
        })
      } catch {
        toast.add({
          type: 'error',
          title: t('new.couldNotCreate'),
          description: t('common:errors.requestFailed'),
        })
      }
    },
  })

  return (
    <Panel
      title={t('new.title')}
      back={<Link to="/devices/manufacturers" />}
      backLabel={t('detail.back')}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <form
          id="new-manufacturer-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              validators={{ onChange: CreateManufacturerBody.shape.name }}
              children={(field) => (
                <TextField
                  field={field}
                  label={t('fields.name')}
                  placeholder="MikroTik"
                  autoComplete="off"
                  autoFocus
                />
              )}
            />
            <form.Field
              name="website"
              validators={{ onChange: websiteSchema }}
              children={(field) => (
                <TextField
                  field={field}
                  label={t('fields.website')}
                  inputMode="url"
                  placeholder="https://www.example.com"
                  autoComplete="off"
                />
              )}
            />
            <form.Field
              name="notes"
              children={(field) => (
                <TextareaField
                  field={field}
                  label={t('fields.notes')}
                  placeholder={t('fields.notesPlaceholder')}
                  rows={4}
                />
              )}
            />
          </FieldGroup>
        </form>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <FormActions
              formId="new-manufacturer-form"
              submit={t('new.submit')}
              submitting={t('new.submitting')}
              isSubmitting={isSubmitting}
              disabled={!canSubmit}
              cancel={<Link to="/devices/manufacturers" />}
            />
          )}
        />
      </div>
    </Panel>
  )
}
