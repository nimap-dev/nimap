export default {
  actions: {
    save: 'Save',
    saving: 'Saving…',
    saveChanges: 'Save changes',
    cancel: 'Cancel',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    deleting: 'Deleting…',
    back: 'Back',
    close: 'Close',
    confirm: 'Confirm',
    search: 'Search',
    clear: 'Clear',
    logOut: 'Log out',
  },
  states: {
    loading: 'Loading…',
    empty: 'Nothing here yet',
    noResults: 'No results',
    unknown: 'Unknown',
    none: 'None',
  },
  results_one: '{{count}} result',
  results_other: '{{count}} results',
  errors: {
    generic: 'Something went wrong',
    couldNotSave: 'Could not save',
    couldNotLoad: 'Could not load',
    couldNotDelete: 'Could not delete',
    notFound: 'Not found',
  },
  confirmDelete: {
    title: 'Delete {{name}}?',
    description: 'This cannot be undone.',
  },
  notFound: {
    title: 'Not found',
    description: "This doesn't exist, or you don't have access to it.",
  },
  table: {
    search: 'Search…',
    noResults: 'No results.',
  },
  /** The created/updated line under a record. */
  meta: {
    created: 'created {{when}}',
    updated: 'updated {{when}}',
  },
  validation: {
    passwordsMismatch: 'Passwords do not match',
  },
  roles: {
    label: 'Role',
    viewer: 'Viewer',
    editor: 'Editor',
    admin: 'Admin',
  },
}
