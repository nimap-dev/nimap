export default {
  fields: {
    username: 'Uživatelské jméno',
    email: 'E-mail',
    password: 'Heslo',
    newPassword: 'Nové heslo',
    confirmPassword: 'Potvrzení nového hesla',
    updated: 'Upraveno',
  },
  users: {
    title: 'Uživatelé',
    loadFailed: 'Uživatele se nepodařilo načíst',
    search: 'Hledat uživatele…',
    back: 'Zpět na uživatele',
    notFound: 'Tento uživatel neexistuje, nebo k němu nemáte přístup.',
  },
  newUser: {
    title: 'Nový uživatel',
    submit: 'Vytvořit uživatele',
    submitting: 'Vytvářím…',
    couldNotCreate: 'Uživatele se nepodařilo vytvořit',
    notCreated: 'Účet nebyl vytvořen',
    created: 'Uživatel vytvořen',
    roleDescription:
      'Co smí uživatel dělat. Později ji můžete změnit na jeho stránce.',
    passwordDescription:
      'Alespoň 8 znaků. Předejte ho uživateli, heslo si pak může změnit v nastavení účtu.',
  },
  delete: {
    label: 'Smazat uživatele',
    title: 'Smazat uživatele {{username}}?',
    description:
      'Účet bude rovnou odstraněn a kdo ho používal, bude při dalším požadavku odhlášen. Pokud mu chcete jen odebrat přístup, nastavte mu raději roli {{viewer}}: účet mu zůstane a přístup mu můžete později vrátit. Odtud tuto akci nelze vrátit.',
    submit: 'Smazat uživatele',
    stillThere: 'Uživatel {{username}} nebyl smazán',
    requestFailed: 'Požadavek selhal, zkontrolujte připojení a zkuste to znovu',
    deleted: 'Uživatel {{username}} byl smazán',
  },
  unlink: {
    label: 'Odpojit',
    title: 'Odpojit jednotné přihlášení od {{username}}?',
    description:
      'S tímto účtem u poskytovatele se už nepřihlásí. Při dalším pokusu se to bere jako první přihlášení: účet se znovu propojí podle ověřeného e-mailu, nebo bude odmítnut.',
    descriptionLastWayIn:
      'Je to jeho jediný způsob přihlášení, heslo nemá. Dokud mu heslo nenastavíte nebo se účet znovu nepropojí, nepřihlásí se.',
    submit: 'Odpojit',
    submitting: 'Odpojuji…',
    couldNotUnlink: 'Odpojení se nezdařilo',
    notUnlinked: 'Účet zůstal propojený',
    unlinked: 'Jednotné přihlášení bylo od {{username}} odpojeno',
  },
  self: {
    title: 'Toto je váš účet',
    description:
      'Vlastní uživatelské jméno, e-mail, heslo a roli tady upravit nelze. Nastavení účtu před každou změnou vyžaduje aktuální heslo a administrátor, který by si mohl sám snížit roli, by mohl zablokovat všechny.',
    goToAccount: 'Přejít do nastavení účtu',
  },
  account: {
    title: 'Účet',
    description: 'Změňte uživatelské jméno a e-mail tohoto uživatele.',
    updated: 'Účet upraven',
    notUpdated: 'Účet se nepodařilo upravit',
  },
  role: {
    description:
      'Projeví se při dalším požadavku uživatele. Zůstane přihlášený.',
    selectLabel: 'Role uživatele',
    couldNotChange: 'Roli se nepodařilo změnit',
    unchanged: 'Uživatel {{username}} zůstal beze změny',
    changed: 'Uživatel {{username}} má nyní roli {{role}}',
  },
  password: {
    title: 'Heslo',
    description:
      'Nastavte nové heslo o délce alespoň 8 znaků a předejte ho uživateli. Jeho stávající přihlášení platí, dokud nevyprší.',
    submit: 'Obnovit heslo',
    submitting: 'Obnovuji…',
    couldNotReset: 'Heslo se nepodařilo obnovit',
    notChanged: 'Heslo nebylo změněno',
    reset: 'Uživatel {{username}} má nové heslo',
  },
}
