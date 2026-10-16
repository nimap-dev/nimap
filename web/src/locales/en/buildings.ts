export default {
  fields: {
    placement: 'Placement',
    location: 'Location',
    address: 'Address',
    position: 'Position',
    notes: 'Notes',
  },
  list: {
    title: 'Buildings',
    new: 'New building',
    loadFailed: 'Could not load the buildings',
    search: 'Search buildings and addresses…',
    name: 'Name',
    city: 'City',
    updated: 'Updated',
  },
  detail: {
    back: 'Back to buildings',
    notFound: "This building doesn't exist, or you don't have access to it.",
    edit: 'Edit building',
    frame: 'Show on the map',
    status: 'Building status',
    noLocation: 'No location',
    viewLocation: 'View location',
    stayed: '{{name}} stayed as it was',
    statusChanged: '{{name}} is now {{status}}',
  },
  delete: {
    label: 'Delete building',
    title: 'Delete {{name}}?',
    description:
      "Deleting is for fixing mistakes: a duplicate, or a footprint drawn by accident. If the building went out of service, set its status to {{decommissioned}} instead: it keeps its history, stays searchable, and only drops off the map. Deletion is refused once floors, devices or cables reference this building, and you can't undo it from here.",
    stillThere: '{{name}} is still there',
    deleted: '{{name}} was deleted',
  },
}
