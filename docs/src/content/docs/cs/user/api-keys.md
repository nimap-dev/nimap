---
title: API klíče
description: Umožněte skriptům a dalším nástrojům volat API nimapu za vás.
sidebar:
  order: 5
---

API klíč umožní skriptu nebo jinému nástroji volat API nimapu bez přihlášení. Klíč patří jednomu uživateli a chová se přesně jako on: má stejnou roli, takže může číst a měnit to, co uživatel může číst a měnit ve webovém rozhraní.

## Vytvoření klíče

1. Otevřete svůj účet z uživatelského menu.
2. V sekci **API klíče** pojmenujte klíč podle toho, co ho používá, třeba `Ansible`.
3. Vyberte, kdy vyprší, nebo nechte **Nikdy**.
4. Zvolte **Vytvořit klíč**.

Celý klíč se zobrazí jen jednou, hned po vytvoření. Tehdy si ho zkopírujte a uložte na bezpečné místo, třeba do správce hesel nebo do úložiště tajemství vašeho nástroje. nimap si drží jen hash klíče a znovu ho ukázat neumí. Když klíč ztratíte, zrušte ho a vytvořte nový.

## Použití klíče

Klíč posílejte v hlavičce `Authorization` u každého požadavku:

```sh
curl -H "Authorization: Bearer nimap_…" https://nimap.example.com/api/devices
```

Požadavek s neznámým, zrušeným nebo prošlým klíčem skončí chybou `401`, i když je ve stejném prohlížeči někdo přihlášený.

## Co klíč neumí

Aby uniklý klíč nemohl převzít účet, některé věci vyžadují přihlášení do webového rozhraní a s klíčem skončí chybou `403`:

- vytvoření, výpis a zrušení API klíčů,
- změna hesla,
- změna uživatelského jména nebo e-mailu,
- správa uživatelů, a to ani s klíčem administrátora.

## Změna role a zrušení klíče

Klíč má vždy aktuální roli uživatele. Když vám administrátor změní roli, vaše klíče ji dostanou okamžitě. Když je váš účet smazán, jeho klíče přestanou fungovat.

Klíč zrušíte tak, že otevřete svůj účet a u klíče zvolíte **Zrušit**. Vše, co klíč ještě používá, okamžitě přestane fungovat. Seznam ukazuje i to, kdy byl každý klíč naposledy použit, takže snadno najdete klíče, které už nic nepoužívá.
