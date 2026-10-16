export default {
  fields: {
    placement: 'Umístění',
    location: 'Lokalita',
    address: 'Adresa',
    position: 'Poloha',
    notes: 'Poznámky',
  },
  list: {
    title: 'Budovy',
    new: 'Nová budova',
    loadFailed: 'Budovy se nepodařilo načíst',
    search: 'Hledat budovy a adresy…',
    name: 'Název',
    city: 'Město',
    updated: 'Upraveno',
  },
  detail: {
    back: 'Zpět na budovy',
    notFound: 'Tato budova neexistuje, nebo k ní nemáte přístup.',
    edit: 'Upravit budovu',
    frame: 'Ukázat na mapě',
    status: 'Stav budovy',
    noLocation: 'Bez lokality',
    viewLocation: 'Zobrazit lokalitu',
    stayed: 'Budova {{name}} zůstala beze změny',
    statusChanged: 'Stav budovy {{name}} změněn na: {{status}}',
  },
  delete: {
    label: 'Smazat budovu',
    title: 'Smazat {{name}}?',
    description:
      'Mazání slouží k opravě chyb, třeba duplicity nebo omylem nakresleného půdorysu. Pokud budova přestala sloužit, nastavte jí raději stav {{decommissioned}}: zůstane jí historie, půjde dál vyhledat a jen zmizí z mapy. Jakmile na budovu odkazují podlaží, zařízení nebo kabely, smazání se odmítne. Odsud to nelze vrátit.',
    stillThere: 'Budova {{name}} stále existuje',
    deleted: 'Budova {{name}} byla smazána',
  },
}
