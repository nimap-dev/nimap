export default {
  fields: {
    name: 'Název',
    manufacturer: 'Výrobce',
    website: 'Web',
    contact: 'Kontakt',
    notes: 'Poznámky',
    notesPlaceholder: 'Kontakty na podporu, distributor, záruční podmínky…',
    updated: 'Upraveno',
  },
  list: {
    title: 'Výrobci',
    loadFailed: 'Výrobce se nepodařilo načíst',
    new: 'Nový výrobce',
    search: 'Hledat výrobce…',
  },
  detail: {
    back: 'Zpět na výrobce',
    backToManufacturer: 'Zpět na výrobce',
    notFound: 'Tento výrobce neexistuje, nebo k němu nemáte přístup.',
    edit: 'Upravit výrobce',
    noWebsite: 'Bez webu',
  },
  tabs: {
    models: 'Modely',
  },
  models: {
    empty: 'Od tohoto výrobce zatím není žádný model zařízení.',
    openList: 'Otevřít v seznamu modelů',
  },
  delete: {
    label: 'Smazat výrobce',
    title: 'Smazat {{name}}?',
    description:
      'Mazání slouží k opravě chyb, třeba duplicity nebo překlepu v názvu, který se má sloučit s jiným. Dokud od tohoto výrobce existuje nějaký model zařízení, smazání se odmítne. Odsud to nelze vrátit.',
    stillThere: 'Výrobce {{name}} stále existuje',
    deleted: 'Výrobce {{name}} byl smazán',
  },
  new: {
    title: 'Nový výrobce',
    submit: 'Vytvořit výrobce',
    submitting: 'Vytvářím…',
    couldNotCreate: 'Výrobce se nepodařilo vytvořit',
    notCreated: 'Výrobce nebyl vytvořen',
    created: 'Výrobce {{name}} byl vytvořen',
  },
  edit: {
    title: 'Upravit {{name}}',
    notUpdated: 'Výrobce se nepodařilo upravit',
    updated: 'Výrobce upraven',
  },
}
