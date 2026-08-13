import { BuildingResponseStatus } from "#/api/model"

// Orval mints a separate enum per schema, but every one of them carries the
// same lifecycle values, so a single table of labels covers all of them.
export const lifecycleStatusLabels: Record<BuildingResponseStatus, string> = {
  [BuildingResponseStatus.planned]: "Planned",
  [BuildingResponseStatus.active]: "Active",
  [BuildingResponseStatus.decommissioned]: "Decommissioned",
  [BuildingResponseStatus.archived]: "Archived",
}

// Listed in lifecycle order rather than the order the generated enum happens to
// sit in, so the options read planned → active → out of service.
export const lifecycleStatusOptions = Object.entries(
  lifecycleStatusLabels,
) as Array<[BuildingResponseStatus, string]>
