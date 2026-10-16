import {
  getGetManufacturerQueryKey,
  getListManufacturersQueryKey,
  useDeleteManufacturer,
  useGetManufacturer,
} from '#/api/manufacturers/manufacturers'
import { Detail, DetailEmpty, DetailList } from '#/components/detail-list'
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
import { toast } from '#/components/ui/toast'
import { useCan } from '#/lib/auth'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/manufacturers/$manufacturerId',
)({ component: ViewManufacturer })

function ViewManufacturer() {
  const { t } = useTranslation(['manufacturers', 'common'])
  const { manufacturerId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetManufacturer(manufacturerId)
  const deleteManufacturer = useDeleteManufacturer()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

  const name = manufacturer.name

  async function handleDelete() {
    try {
      const res = await deleteManufacturer.mutateAsync({ id: manufacturerId })

      if (res.status !== 204) {
        setConfirmingDelete(false)
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotDelete'),
          description: res.data.detail ?? t('delete.stillThere', { name }),
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: t('common:errors.couldNotDelete'),
        description: t('common:errors.requestFailed'),
      })
      return
    }

    setConfirmingDelete(false)
    queryClient.removeQueries({
      queryKey: getGetManufacturerQueryKey(manufacturerId),
    })
    await queryClient.invalidateQueries({
      queryKey: getListManufacturersQueryKey(),
    })
    toast.add({ type: 'success', description: t('delete.deleted', { name }) })
    navigate({ to: '/devices/manufacturers', replace: true })
  }

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <Panel
        title={manufacturer.name}
        back={<Link to="/devices/manufacturers" />}
        backLabel={t('detail.back')}
        action={
          canWrite && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('detail.edit')}
                render={
                  <Link
                    to="/devices/manufacturers/$manufacturerId/edit"
                    params={{ manufacturerId }}
                  />
                }
                nativeButton={false}
              >
                <Pencil />
              </Button>
              <AlertDialogTrigger
                aria-label={t('delete.label')}
                render={<Button variant="ghost" size="icon" />}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
              </AlertDialogTrigger>
            </>
          )
        }
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {manufacturer.notes && (
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {manufacturer.notes}
            </p>
          )}

          <DetailList>
            <Detail label={t('fields.website')}>
              {manufacturer.website ? (
                <a
                  href={manufacturer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {manufacturer.website}
                </a>
              ) : (
                <DetailEmpty>{t('detail.noWebsite')}</DetailEmpty>
              )}
            </Detail>
            <Detail
              label={t('fields.updated')}
              title={formatAbsoluteDate(manufacturer.updatedAt)}
            >
              {formatRelativeDate(manufacturer.updatedAt)}
            </Detail>
            <Detail
              label={t('fields.created')}
              title={formatAbsoluteDate(manufacturer.createdAt)}
            >
              {formatRelativeDate(manufacturer.createdAt)}
            </Detail>
          </DetailList>
        </div>
      </Panel>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {t('delete.title', { name: manufacturer.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={deleteManufacturer.isPending}
          >
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteManufacturer.isPending}
            onClick={handleDelete}
          >
            {deleteManufacturer.isPending
              ? t('common:actions.deleting')
              : t('delete.label')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
