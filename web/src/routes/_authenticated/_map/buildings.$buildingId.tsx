import { useListAssets } from '#/api/assets/assets'
import {
  getGetBuildingQueryKey,
  getListBuildingsQueryKey,
  useDeleteBuilding,
  useGetBuilding,
  useUpdateBuildingStatus,
} from '#/api/buildings/buildings'
import { useGetLocation } from '#/api/locations/locations'
import { AssetList } from '#/components/asset-list'
import {
  Detail,
  DetailEmpty,
  DetailGrid,
  DetailList,
  DetailMeta,
  DetailNote,
} from '#/components/detail-list'
import { LifecycleStatusSelect } from '#/components/lifecycle-status-select'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { RecordTab, RecordTabs, RecordTabsList } from '#/components/record-tabs'
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
import { Skeleton } from '#/components/ui/skeleton'
import { TabsContent } from '#/components/ui/tabs'
import { toast } from '#/components/ui/toast'
import { formatAddress } from '#/lib/address'
import { useCan } from '#/lib/auth'
import { useLifecycleStatusLabels } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import { useWorldMap } from '#/lib/map'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Crosshair, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as zod from 'zod'

/** The tabs this page has; anything else in the address falls back to the first. */
const TABS = ['overview', 'files'] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute(
  '/_authenticated/_map/buildings/$buildingId',
)({
  validateSearch: zod.object({
    tab: zod.enum(TABS).optional().catch(undefined),
  }),
  component: ViewBuilding,
})

function ViewBuilding() {
  const { t } = useTranslation(['buildings', 'common'])
  const lifecycleStatusLabels = useLifecycleStatusLabels()
  const { buildingId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetBuilding(buildingId)
  const deleteBuilding = useDeleteBuilding()
  const updateStatus = useUpdateBuildingStatus()
  const queryClient = useQueryClient()
  const { flyTo } = useWorldMap()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { tab = 'overview' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: assetsData } = useListAssets({
    resourceType: 'building',
    resourceId: buildingId,
  })
  const assets = assetsData?.status === 200 ? assetsData.data : undefined

  const building = data?.status === 200 ? data.data : undefined
  const [longitude, latitude] = building?.representativePoint.coordinates ?? []

  useEffect(() => {
    flyTo(longitude, latitude, 17)
  }, [longitude, latitude, flyTo])

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/buildings" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!building) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/buildings" />}
        backLabel={t('detail.back')}
      />
    )
  }

  // Captured before the request: after a successful delete the query is gone.
  const name = building.name
  const address = formatAddress(building.address)

  async function handleStatusChange(status: LifecycleStatus) {
    try {
      const res = await updateStatus.mutateAsync({
        id: buildingId,
        data: { status },
      })

      if (res.status !== 200) {
        toast.add({
          type: 'error',
          title: t('common:errors.couldNotChangeStatus'),
          description: res.data.detail ?? t('detail.stayed', { name }),
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
        queryKey: getGetBuildingQueryKey(buildingId),
      }),
      queryClient.invalidateQueries({
        queryKey: getListBuildingsQueryKey(),
      }),
    ])
    toast.add({
      type: 'success',
      description: t('detail.statusChanged', {
        name,
        status: lifecycleStatusLabels[status].toLowerCase(),
      }),
    })
  }

  async function handleDelete() {
    try {
      const res = await deleteBuilding.mutateAsync({ id: buildingId })

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
    queryClient.removeQueries({ queryKey: getGetBuildingQueryKey(buildingId) })
    await queryClient.invalidateQueries({
      queryKey: getListBuildingsQueryKey(),
    })
    toast.add({ type: 'success', description: t('delete.deleted', { name }) })
    navigate({ to: '/buildings', replace: true })
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
          title={building.name}
          back={<Link to="/buildings" />}
          backLabel={t('detail.back')}
          action={
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('detail.frame')}
                title={t('detail.frame')}
                onClick={() => flyTo(longitude, latitude, 17)}
              >
                <Crosshair />
              </Button>
              {canWrite && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('detail.edit')}
                    render={
                      <Link
                        to="/buildings/$buildingId/edit"
                        params={{ buildingId }}
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
              )}
            </>
          }
          summary={
            <LifecycleStatusSelect
              value={building.status}
              onValueChange={handleStatusChange}
              readOnly={!canWrite}
              disabled={updateStatus.isPending}
              aria-label={t('detail.status')}
            />
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
              <DetailList title={t('fields.placement')}>
                <Detail label={t('fields.location')}>
                  {building.locationId ? (
                    <BuildingLocation locationId={building.locationId} />
                  ) : (
                    <DetailEmpty>{t('detail.noLocation')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.address')} title={address}>
                  {address || (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.position')}>
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </Detail>
              </DetailList>

              {building.notes && (
                <DetailNote title={t('fields.notes')}>
                  {building.notes}
                </DetailNote>
              )}

              <DetailMeta
                createdAt={building.createdAt}
                updatedAt={building.updatedAt}
              />
            </DetailGrid>
          </TabsContent>

          <TabsContent value="files">
            <div className="mx-auto w-full max-w-4xl">
              <AssetList resourceType="building" resourceId={buildingId} />
            </div>
          </TabsContent>
        </Panel>
      </RecordTabs>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('delete.title', { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description', {
              decommissioned: lifecycleStatusLabels.decommissioned,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={deleteBuilding.isPending}
          >
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteBuilding.isPending}
            onClick={handleDelete}
          >
            {deleteBuilding.isPending
              ? t('common:actions.deleting')
              : t('delete.label')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * The location a building stands in. Only the id comes back on the building, so
 * the name is fetched here rather than at the top of the page: the request is
 * the one the location page itself makes, and it is skipped entirely for a
 * building that has not been placed.
 */
function BuildingLocation({ locationId }: { locationId: string }) {
  const { t } = useTranslation('buildings')
  const { data, isPending } = useGetLocation(locationId)
  const location = data?.status === 200 ? data.data : undefined

  if (isPending) return <Skeleton className="h-4 w-24" />

  // A location the building points at but nobody can read is still worth
  // linking: the link says where to look, the id says which one.
  return (
    <Link
      to="/locations/$locationId"
      params={{ locationId }}
      className="truncate hover:text-foreground hover:underline"
    >
      {location?.name ?? t('detail.viewLocation')}
    </Link>
  )
}
