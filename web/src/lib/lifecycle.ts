import { BuildingResponseStatus } from '#/api/model'

/**
 * Orval mints a separate enum type per schema, one for buildings, one for
 * locations, one per query parameter, but they are all the same union of the
 * same four strings. This is the name to use when the code means "a lifecycle
 * status" rather than "the status field of that particular response".
 */
export type LifecycleStatus = BuildingResponseStatus

/** What the lists show until someone asks for more, per spec 32.2. */
export const DEFAULT_LIFECYCLE_STATUSES: LifecycleStatus[] = [
  BuildingResponseStatus.planned,
  BuildingResponseStatus.active,
]

/**
 * Everything, for the screens that filter on the client: they need the rows
 * they are not showing too, because a decommissioned location still has to
 * hold the place of the live ones nested inside it.
 */
export const ALL_LIFECYCLE_STATUSES: LifecycleStatus[] = [
  BuildingResponseStatus.planned,
  BuildingResponseStatus.active,
  BuildingResponseStatus.decommissioned,
  BuildingResponseStatus.archived,
]

// Orval mints a separate enum per schema, but every one of them carries the
// same lifecycle values, so a single table of labels covers all of them.
export const lifecycleStatusLabels: Record<BuildingResponseStatus, string> = {
  [BuildingResponseStatus.planned]: 'Planned',
  [BuildingResponseStatus.active]: 'Active',
  [BuildingResponseStatus.decommissioned]: 'Decommissioned',
  [BuildingResponseStatus.archived]: 'Archived',
}

// Listed in lifecycle order rather than the order the generated enum happens to
// sit in, so the options read planned → active → out of service.
export const lifecycleStatusOptions = Object.entries(
  lifecycleStatusLabels,
) as Array<[BuildingResponseStatus, string]>
