/** Manufacturers: the list, the detail page, creating and editing one. */
export default {
  fields: {
    name: 'Name',
    website: 'Website',
    contact: 'Contact',
    notes: 'Notes',
    notesPlaceholder: 'Support contacts, distributor, warranty terms…',
    updated: 'Updated',
  },
  list: {
    title: 'Manufacturers',
    loadFailed: 'Failed to load manufacturers',
    new: 'New manufacturer',
    search: 'Search manufacturers…',
  },
  detail: {
    back: 'Back to manufacturers',
    backToManufacturer: 'Back to manufacturer',
    notFound:
      "This manufacturer doesn't exist, or you don't have access to it.",
    edit: 'Edit manufacturer',
    noWebsite: 'No website',
  },
  tabs: {
    models: 'Models',
  },
  models: {
    empty: 'No device models from this manufacturer yet.',
    openList: 'Open in the model list',
  },
  delete: {
    label: 'Delete manufacturer',
    title: 'Delete {{name}}?',
    description:
      "Deleting is for fixing mistakes, such as a duplicate or a misspelled name that should be merged into another. It is refused while any device model is made by this manufacturer, and you can't undo it from here.",
    stillThere: '{{name}} is still there',
    deleted: '{{name}} was deleted',
  },
  new: {
    title: 'New manufacturer',
    submit: 'Create manufacturer',
    submitting: 'Creating…',
    couldNotCreate: 'Could not create the manufacturer',
    notCreated: 'The manufacturer was not created',
    created: '{{name}} was created',
  },
  edit: {
    title: 'Edit {{name}}',
    notUpdated: 'The manufacturer was not updated',
    updated: 'Manufacturer updated',
  },
}
