import {
  getGetDeviceModelQueryKey,
  getListDeviceModelsQueryKey,
  useDeleteDeviceModel,
  useGetDeviceModel,
  useUpdateDeviceModelStatus,
} from '#/api/device-models/device-models'
import { useListAssets } from '#/api/assets/assets'
import { AssetList } from '#/components/asset-list'
import {
  Detail,
  DetailEmpty,
  DetailGrid,
  DetailList,
  DetailMeta,
  DetailNote,
} from '#/components/detail-list'
import { DeviceTypeIcon } from '#/components/device-type-icon'
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
import { LifecycleStatusSelect } from '#/components/lifecycle-status-select'
import { toast } from '#/components/ui/toast'
import { useCan } from '#/lib/auth'
import {
  formatDimensions,
  formatModelName,
  useMountingLabels,
  usePoeStandardLabels,
} from '#/lib/device-models'
import { useLifecycleStatusLabels } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as zod from 'zod'
import { RecordTab, RecordTabs, RecordTabsList } from '#/components/record-tabs'
import { TabsContent } from '#/components/ui/tabs'

/** The tabs this page has; anything else in the address falls back to the first. */
const TABS = ['overview', 'files'] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute(
  '/_authenticated/_nav/devices/models/$modelId',
)({
  validateSearch: zod.object({
    tab: zod.enum(TABS).optional().catch(undefined),
  }),
  component: ViewDeviceModel,
})

function ViewDeviceModel() {
  const { t } = useTranslation(['deviceModels', 'common'])
  const mountingLabels = useMountingLabels()
  const poeStandardLabels = usePoeStandardLabels()
  const lifecycleStatusLabels = useLifecycleStatusLabels()
  const { modelId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetDeviceModel(modelId)
  const updateStatus = useUpdateDeviceModelStatus()
  const deleteDeviceModel = useDeleteDeviceModel()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { tab = 'overview' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: assetsData } = useListAssets({
    resourceType: 'device_model',
    resourceId: modelId,
  })
  const assets = assetsData?.status === 200 ? assetsData.data : undefined

  const model = data?.status === 200 ? data.data : undefined

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/devices/models" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!model) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/devices/models" />}
        backLabel={t('detail.back')}
      />
    )
  }

  // Captured before the request: after a successful delete the query is gone.
  const fullName = `${model.manufacturer.name} ${formatModelName(model)}`

  async function handleStatusChange(status: LifecycleStatus) {
    try {
      const res = await updateStatus.mutateAsync({
        id: modelId,
        data: { status },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotChangeStatus'),
          description:
            res.data.detail ?? t('detail.stayed', { name: fullName }),
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: t('common:errors.couldNotChangeStatus'),
        description: t('common:errors.requestFailed'),
      })
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getGetDeviceModelQueryKey(modelId),
      }),
      queryClient.invalidateQueries({
        queryKey: getListDeviceModelsQueryKey(),
      }),
    ])
    toast.add({
      type: 'success',
      description: t('detail.statusChanged', {
        name: fullName,
        status: lifecycleStatusLabels[status].toLowerCase(),
      }),
    })
  }

  async function handleDelete() {
    try {
      const res = await deleteDeviceModel.mutateAsync({ id: modelId })

      if (res.status !== 204) {
        setConfirmingDelete(false)
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotDelete'),
          description:
            res.data.detail ?? t('delete.stillThere', { name: fullName }),
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
    queryClient.removeQueries({ queryKey: getGetDeviceModelQueryKey(modelId) })
    await queryClient.invalidateQueries({
      queryKey: getListDeviceModelsQueryKey(),
    })
    toast.add({
      type: 'success',
      description: t('delete.deleted', { name: fullName }),
    })
    navigate({ to: '/devices/models', replace: true })
  }

  const dimensions = formatDimensions(model)

  return (
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <RecordTabs
        value={tab}
        onValueChange={(value) =>
          navigate({
            search: { tab: value === 'overview' ? undefined : (value as Tab) },
            replace: true,
          })
        }
      >
        <Panel
          title={fullName}
          back={<Link to="/devices/models" />}
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
                      to="/devices/models/$modelId/edit"
                      params={{ modelId }}
                    />
                  }
                  nativeButton={false}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('detail.duplicate')}
                  title={t('detail.duplicateShort')}
                  render={
                    <Link to="/devices/models/new" search={{ from: modelId }} />
                  }
                  nativeButton={false}
                >
                  <Copy />
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
          summary={
            <>
              <LifecycleStatusSelect
                value={model.status}
                onValueChange={handleStatusChange}
                readOnly={!canWrite}
                disabled={updateStatus.isPending}
                aria-label={t('detail.status')}
              />
              <span className="inline-flex items-center gap-1.5">
                <DeviceTypeIcon type={model.deviceType} />
                {model.deviceType.name}
              </span>
              <span aria-hidden="true">·</span>
              <Link
                to="/devices/manufacturers/$manufacturerId"
                params={{ manufacturerId: model.manufacturer.id }}
                className="hover:text-foreground hover:underline"
              >
                {model.manufacturer.name}
              </Link>
            </>
          }
          tabs={
            <RecordTabsList>
              <RecordTab value="overview">
                {t('common:tabs.overview')}
              </RecordTab>
              <RecordTab value="files" count={assets?.length}>
                {t('common:tabs.files')}
              </RecordTab>
            </RecordTabsList>
          }
        >
          <TabsContent value="overview">
            <DetailGrid>
              <DetailList title={t('fields.identification')}>
                <Detail label={t('fields.variant')}>
                  {model.variant ?? (
                    <DetailEmpty>{t('common:states.none')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.partNumber')}>
                  {model.partNumber ?? (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.productPage')} title={model.website}>
                  {model.website ? (
                    <a
                      href={model.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {model.website}
                    </a>
                  ) : (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
              </DetailList>

              <DetailList title={t('fields.physical')}>
                <Detail label={t('fields.dimensions')}>
                  {dimensions || (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.rackUnits')}>
                  {model.rackUnits ? (
                    `${model.rackUnits}U`
                  ) : (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.mounting')}>
                  {model.mounting ? (
                    mountingLabels[model.mounting]
                  ) : (
                    <DetailEmpty>{t('common:states.notSpecified')}</DetailEmpty>
                  )}
                </Detail>
              </DetailList>

              <DetailList title={t('fields.power')}>
                <Detail label={t('fields.maxDraw')}>
                  {model.powerWattsMax ? (
                    `${model.powerWattsMax} W`
                  ) : (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.poeIn')}>
                  {model.poeIn ? (
                    model.poeInStandard ? (
                      t('detail.yesStandard', {
                        standard: poeStandardLabels[model.poeInStandard],
                      })
                    ) : (
                      <>
                        {t('common:states.yes')}{' '}
                        <DetailEmpty>{t('detail.standardUnknown')}</DetailEmpty>
                      </>
                    )
                  ) : (
                    t('common:states.no')
                  )}
                </Detail>
                <Detail label={t('fields.poeOut')}>
                  {model.poeOut ? (
                    model.poeOutStandard ? (
                      t('detail.yesUpTo', {
                        standard: poeStandardLabels[model.poeOutStandard],
                      })
                    ) : (
                      <>
                        {t('common:states.yes')}{' '}
                        <DetailEmpty>{t('detail.standardUnknown')}</DetailEmpty>
                      </>
                    )
                  ) : (
                    t('common:states.no')
                  )}
                </Detail>
                {model.poeOut && (
                  <Detail label={t('fields.poeBudget')}>
                    {model.poeBudgetWatts ? (
                      `${model.poeBudgetWatts} W`
                    ) : (
                      <DetailEmpty>
                        {t('common:states.notRecorded')}
                      </DetailEmpty>
                    )}
                  </Detail>
                )}
              </DetailList>

              {model.notes && (
                <DetailNote title={t('fields.notes')}>{model.notes}</DetailNote>
              )}

              <DetailMeta
                createdAt={model.createdAt}
                updatedAt={model.updatedAt}
              />
            </DetailGrid>
          </TabsContent>

          <TabsContent value="files">
            <div className="mx-auto w-full max-w-4xl">
              <AssetList resourceType="device_model" resourceId={modelId} />
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
            {t('delete.title', { name: fullName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description', {
              decommissioned: lifecycleStatusLabels.decommissioned,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={deleteDeviceModel.isPending}
          >
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteDeviceModel.isPending}
            onClick={handleDelete}
          >
            {deleteDeviceModel.isPending
              ? t('common:actions.deleting')
              : t('delete.label')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
