import { useListAssets } from '#/api/assets/assets'
import { useListBuildings } from '#/api/buildings/buildings'
import {
  getGetLocationQueryKey,
  getListLocationsQueryKey,
  useDeleteLocation,
  useGetLocation,
  useUpdateLocationStatus,
} from '#/api/locations/locations'
import { AssetList } from '#/components/asset-list'
import {
  Detail,
  DetailEmpty,
  DetailGrid,
  DetailList,
  DetailMeta,
  DetailNote,
} from '#/components/detail-list'
import { formatCoordinates } from '#/components/form/representative-point-field'
import { LifecycleBadge } from '#/components/lifecycle-badge'
import { LifecycleStatusSelect } from '#/components/lifecycle-status-select'
import { Panel, PanelNotFound, PanelPending } from '#/components/panel'
import { RecordTab, RecordTabs, RecordTabsList } from '#/components/record-tabs'
import { RelatedLink, RelatedList } from '#/components/related-list'
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
import { formatAddress } from '#/lib/address'
import { useCan } from '#/lib/auth'
import {
  ALL_LIFECYCLE_STATUSES,
  useLifecycleStatusLabels,
} from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'
import {
  buildLocationTree,
  descendantsOf,
  useAllLocations,
} from '#/lib/location-tree'
import { multiPolygonBounds, useWorldMap } from '#/lib/map'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Crosshair, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as zod from 'zod'

/** The tabs this page has; anything else in the address falls back to the first. */
const TABS = ['overview', 'inside', 'files'] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute(
  '/_authenticated/_map/locations/$locationId',
)({
  validateSearch: zod.object({
    tab: zod.enum(TABS).optional().catch(undefined),
  }),
  component: ViewLocation,
})

function ViewLocation() {
  const { t } = useTranslation(['locations', 'common', 'form'])
  const lifecycleStatusLabels = useLifecycleStatusLabels()
  const { locationId } = Route.useParams()
  const canWrite = useCan('records:write')
  const { data, isPending } = useGetLocation(locationId)
  const { flyTo, fitBounds } = useWorldMap()
  const updateStatus = useUpdateLocationStatus()
  const deleteLocation = useDeleteLocation()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { tab = 'overview' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const location = data?.status === 200 ? data.data : undefined

  const { data: siblings } = useAllLocations()
  const all = siblings?.status === 200 ? siblings.data : []
  const parent = all.find((item) => item.id === location?.parentId)

  const { data: buildingList } = useListBuildings({
    locationId,
    status: ALL_LIFECYCLE_STATUSES,
  })
  const buildings = buildingList?.status === 200 ? buildingList.data : []

  const { data: assetsData } = useListAssets({
    resourceType: 'location',
    resourceId: locationId,
  })
  const assets = assetsData?.status === 200 ? assetsData.data : undefined

  const inside = useMemo(
    () =>
      descendantsOf(buildLocationTree(all), locationId, {
        statuses: ALL_LIFECYCLE_STATUSES,
      }),
    [all, locationId],
  )

  const area = location?.area
  const point = location?.representativePoint

  function frame() {
    const bounds = area && multiPolygonBounds(area)

    if (bounds) {
      fitBounds(bounds)
      return
    }

    const [longitude, latitude] = point?.coordinates ?? []

    flyTo(longitude, latitude, 15)
  }

  useEffect(frame, [area, point, fitBounds, flyTo])

  if (isPending) {
    return (
      <PanelPending
        back={<Link to="/locations" />}
        backLabel={t('detail.back')}
      />
    )
  }

  if (!location) {
    return (
      <PanelNotFound
        description={t('detail.notFound')}
        back={<Link to="/locations" />}
        backLabel={t('detail.back')}
      />
    )
  }

  // Captured before the request: after a successful delete the query is gone.
  const name = location.name
  const address = formatAddress(location.address)

  async function refreshLists() {
    await queryClient.invalidateQueries({
      queryKey: getListLocationsQueryKey(),
    })
  }

  // Reversible, so it applies straight away rather than behind a confirmation.
  async function handleStatusChange(status: LifecycleStatus) {
    try {
      const res = await updateStatus.mutateAsync({
        id: locationId,
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
        queryKey: getGetLocationQueryKey(locationId),
      }),
      refreshLists(),
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
      const res = await deleteLocation.mutateAsync({ id: locationId })

      if (res.status !== 204) {
        // A 409 carries how many locations are still nested inside this one.
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
    queryClient.removeQueries({ queryKey: getGetLocationQueryKey(locationId) })
    await refreshLists()
    toast.add({ type: 'success', description: t('delete.deleted', { name }) })
    navigate({ to: '/locations', replace: true })
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
          title={location.name}
          back={<Link to="/locations" />}
          backLabel={t('detail.back')}
          action={
            <>
              {(area || point) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('detail.frame')}
                  title={t('detail.frame')}
                  onClick={frame}
                >
                  <Crosshair />
                </Button>
              )}
              {canWrite && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('detail.edit')}
                    render={
                      <Link
                        to="/locations/$locationId/edit"
                        params={{ locationId }}
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
              value={location.status}
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
              <RecordTab
                value="inside"
                count={inside.length + buildings.length}
              >
                {t('tabs.inside')}
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
                <Detail label={t('fields.address')} title={address}>
                  {address || (
                    <DetailEmpty>{t('common:states.notRecorded')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.parent')}>
                  {parent ? (
                    <Link
                      to="/locations/$locationId"
                      params={{ locationId: parent.id }}
                      className="hover:underline"
                    >
                      {parent.name}
                    </Link>
                  ) : (
                    <DetailEmpty>{t('detail.noParent')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.boundary')}>
                  {area ? (
                    t('form:shape.parts', { count: area.coordinates.length })
                  ) : (
                    <DetailEmpty>{t('detail.notDrawn')}</DetailEmpty>
                  )}
                </Detail>
                <Detail label={t('fields.point')}>
                  {point ? (
                    <>
                      {formatCoordinates(point)}
                      {!location.representativePointManual && (
                        <DetailEmpty>{t('detail.derived')}</DetailEmpty>
                      )}
                    </>
                  ) : (
                    <DetailEmpty>{t('detail.notPlaced')}</DetailEmpty>
                  )}
                </Detail>
              </DetailList>

              {location.notes && (
                <DetailNote title={t('fields.notes')}>
                  {location.notes}
                </DetailNote>
              )}

              <DetailMeta
                createdAt={location.createdAt}
                updatedAt={location.updatedAt}
              />
            </DetailGrid>
          </TabsContent>

          <TabsContent value="inside">
            <DetailGrid>
              <RelatedList
                title={t('inside.locations')}
                count={inside.length}
                empty={t('inside.noLocations')}
              >
                {inside.map((row) => (
                  <li key={row.location.id}>
                    <RelatedLink
                      to="/locations/$locationId"
                      params={{ locationId: row.location.id }}
                      depth={row.depth}
                      meta={<LifecycleBadge status={row.location.status} />}
                    >
                      {row.location.name}
                      {!row.location.area && (
                        <span className="text-muted-foreground">
                          {t('detail.noBoundary')}
                        </span>
                      )}
                    </RelatedLink>
                  </li>
                ))}
              </RelatedList>

              <RelatedList
                title={t('inside.buildings')}
                count={buildings.length}
                empty={t('inside.noBuildings')}
              >
                {buildings.map((building) => (
                  <li key={building.id}>
                    <RelatedLink
                      to="/buildings/$buildingId"
                      params={{ buildingId: building.id }}
                      meta={<LifecycleBadge status={building.status} />}
                    >
                      {building.name}
                      {building.address?.street && (
                        <span className="text-muted-foreground">
                          {` · ${building.address.street}`}
                        </span>
                      )}
                    </RelatedLink>
                  </li>
                ))}
              </RelatedList>
            </DetailGrid>
          </TabsContent>

          <TabsContent value="files">
            <div className="mx-auto w-full max-w-4xl">
              <AssetList resourceType="location" resourceId={locationId} />
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
            disabled={deleteLocation.isPending}
          >
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteLocation.isPending}
            onClick={handleDelete}
          >
            {deleteLocation.isPending
              ? t('common:actions.deleting')
              : t('delete.label')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
