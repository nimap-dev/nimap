import { UpdateManufacturerBody } from '#/api/endpoints/manufacturers/manufacturers.zod'
import {
  getGetManufacturerQueryKey,
  getListManufacturersQueryKey,
  useGetManufacturer,
  useUpdateManufacturer,
} from '#/api/manufacturers/manufacturers'
import type { ManufacturerResponse } from '#/api/model'
import { FormActions } from '#/components/form/form-actions'
import { TextField } from '#/components/form/text-field'
import { TextareaField } from '#/components/form/textarea-field'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
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
  '/_authenticated/_nav/devices/manufacturers/$manufacturerId_/edit',
)({
  beforeLoad: ({ context, params }) => {
    if (!can(context.queryClient, 'records:write')) {
      throw redirect({
        to: '/devices/manufacturers/$manufacturerId',
        params: { manufacturerId: params.manufacturerId },
      })
    }
  },
  component: EditManufacturer,
})

function EditManufacturer() {
  const { t } = useTranslation('manufacturers')
  const { manufacturerId } = Route.useParams()
  const { data, isPending } = useGetManufacturer(manufacturerId)

  const manufacturer = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/devices/manufacturers" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!manufacturer) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/devices/manufacturers" />}
        backLabel={t('detail.back')}
      />
    )
  }

  // Mounted only once the manufacturer is loaded, so the form can take its
  // default values straight from it: `useForm` captures those on first render.
  return <EditManufacturerForm manufacturer={manufacturer} />
}

function EditManufacturerForm({
  manufacturer,
}: {
  manufacturer: ManufacturerResponse
}) {
  const { t } = useTranslation(['manufacturers', 'common'])
  const updateManufacturer = useUpdateManufacturer()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      name: manufacturer.name,
      website: manufacturer.website ?? '',
      notes: manufacturer.notes ?? '',
    },
    onSubmit: async ({ value }) => {
      try {
        const res = await updateManufacturer.mutateAsync({
          id: manufacturer.id,
          data: {
            name: value.name,
            website: optional(value.website),
            notes: optional(value.notes),
          },
        })

        if (res.status !== 200) {
          toast.add({
            type: 'error',
            title: t('common:errors.couldNotSave'),
            description: res.data.detail ?? t('edit.notUpdated'),
          })
          return
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getListManufacturersQueryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: getGetManufacturerQueryKey(manufacturer.id),
          }),
        ])
        toast.add({ type: 'success', description: t('edit.updated') })
        navigate({
          to: '/devices/manufacturers/$manufacturerId',
          params: { manufacturerId: manufacturer.id },
          replace: true,
        })
      } catch {
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotSave'),
          description: t('common:errors.requestFailed'),
        })
      }
    },
  })

  return (
    <Panel
      title={t('edit.title', { name: manufacturer.name })}
      back={
        <Link
          to="/devices/manufacturers/$manufacturerId"
          params={{ manufacturerId: manufacturer.id }}
        />
      }
      backLabel={t('detail.backToManufacturer')}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <form
          id="edit-manufacturer-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              validators={{ onChange: UpdateManufacturerBody.shape.name }}
              children={(field) => (
                <TextField
                  field={field}
                  label={t('fields.name')}
                  placeholder="MikroTik"
                  autoComplete="off"
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
              formId="edit-manufacturer-form"
              submit={t('common:actions.saveChanges')}
              submitting={t('common:actions.saving')}
              isSubmitting={isSubmitting}
              disabled={!canSubmit}
              cancel={
                <Link
                  to="/devices/manufacturers/$manufacturerId"
                  params={{ manufacturerId: manufacturer.id }}
                />
              }
            />
          )}
        />
      </div>
    </Panel>
  )
}
