import {
  getGetManufacturerQueryKey,
  getListManufacturersQueryKey,
  useDeleteManufacturer,
  useGetManufacturer,
} from '#/api/manufacturers/manufacturers'
import { useListDeviceModels } from '#/api/device-models/device-models'
import {
  Detail,
  DetailEmpty,
  DetailGrid,
  DetailList,
  DetailMeta,
  DetailNote,
} from '#/components/detail-list'
import { DeviceTypeIcon } from '#/components/device-type-icon'
import { LifecycleBadge } from '#/components/lifecycle-badge'
import { RecordTab, RecordTabs, RecordTabsList } from '#/components/record-tabs'
import { RelatedLink, RelatedList } from '#/components/related-list'
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
import { TabsContent } from '#/components/ui/tabs'
import { toast } from '#/components/ui/toast'
import { useCan } from '#/lib/auth'
import { formatModelName } from '#/lib/device-models'
import { ALL_LIFECYCLE_STATUSES } from '#/lib/lifecycle'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as zod from 'zod'

/** The tabs this page has; anything else in the address falls back to the first. */
const TABS = ['overview', 'models'] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/manufacturers/$manufacturerId',
)({
  validateSearch: zod.object({
    tab: zod.enum(TABS).optional().catch(undefined),
  }),
  component: ViewManufacturer,
})

function ViewManufacturer() {
  const { t } = useTranslation(['manufacturers', 'common'])
  const { manufacturerId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetManufacturer(manufacturerId)
  const deleteManufacturer = useDeleteManufacturer()
  const queryClient = useQueryClient()
  const { tab = 'overview' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: modelsData } = useListDeviceModels({
    manufacturerId,
    status: ALL_LIFECYCLE_STATUSES,
  })
  const models = modelsData?.status === 200 ? modelsData.data : undefined
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
      <RecordTabs
        value={tab}
        onValueChange={(value) =>
          navigate({
            search: {
              tab: value === 'overview' ? undefined : (value as Tab),
            },
            replace: true,
          })
        }
      >
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
          tabs={
            <RecordTabsList>
              <RecordTab value="overview">
                {t('common:tabs.overview')}
              </RecordTab>
              <RecordTab value="models" count={models?.length}>
                {t('tabs.models')}
              </RecordTab>
            </RecordTabsList>
          }
        >
          <TabsContent value="overview">
            <DetailGrid>
              <DetailList title={t('fields.contact')}>
                <Detail
                  label={t('fields.website')}
                  title={manufacturer.website}
                >
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
              </DetailList>

              {manufacturer.notes && (
                <DetailNote title={t('fields.notes')}>
                  {manufacturer.notes}
                </DetailNote>
              )}

              <DetailMeta
                createdAt={manufacturer.createdAt}
                updatedAt={manufacturer.updatedAt}
              />
            </DetailGrid>
          </TabsContent>

          <TabsContent value="models">
            <div className="mx-auto w-full max-w-4xl">
              <RelatedList
                count={models?.length}
                empty={t('models.empty')}
                action={
                  <Link
                    to="/devices/models"
                    search={{ manufacturerId }}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {t('models.openList')}
                  </Link>
                }
              >
                {models?.map((model) => (
                  <li key={model.id}>
                    <RelatedLink
                      to="/devices/models/$modelId"
                      params={{ modelId: model.id }}
                      icon={<DeviceTypeIcon type={model.deviceType} />}
                      meta={<LifecycleBadge status={model.status} />}
                    >
                      {formatModelName(model)}
                      {model.partNumber && (
                        <span className="text-muted-foreground">
                          {` · ${model.partNumber}`}
                        </span>
                      )}
                    </RelatedLink>
                  </li>
                ))}
              </RelatedList>
            </div>
          </TabsContent>
        </Panel>
      </RecordTabs>

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
