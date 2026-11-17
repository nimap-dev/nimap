---
title: Zařízení
description: Evidence zařízení s modelem nebo typem a krátkým kódem, třeba SW-001.
sidebar:
  order: 4
---

Zařízení je jeden konkrétní kus: switch v racku, přístupový bod na stropě, UPS v rozvaděči. Model zařízení popisuje produkt. Zařízení je jeden jeho kus s vlastním sériovým číslem a kódem.

Seznam otevřete v postranním panelu pod **Zařízení**. Zařízení vidí každý přihlášený uživatel. Vytvářet, upravovat a mazat je může editor nebo správce.

## Model, nebo typ

Každé zařízení je buď:

- **model z katalogu.** Typ a výrobce se berou z modelu. Pokud model v seznamu není, nejdřív ho přidejte v **Modely zařízení**.
- **jen typ.** Pro vybavení, které nechcete katalogizovat, třeba levný převodník médií. Zařízení pak nemá výrobce.

Mezi oběma možnostmi lze později přepnout. Kód zařízení se tím nezmění.

## Kódy

Každé zařízení dostane krátký kód z prefixu svého typu a čísla, třeba `SW-001` nebo `AP-014`. Za `999` číslo jen roste dál: `SW-1000`.

Když při vytváření necháte pole **Kód** prázdné, přidělí se při uložení další volný kód. Pole ho ukazuje jako nápovědu. Kód můžete zadat i ručně, třeba aby odpovídal štítku, který už na zařízení je:

- Kód je jedinečný bez ohledu na velikost písmen: `sw-001` a `SW-001` je stejný kód.
- Ručně zadaný kód číslování neposouvá. Automatické číslování obsazené kódy přeskočí.
- Čísla se nikdy znovu nepoužijí. Smazáním `SW-003` se kód neuvolní, takže starý štítek nikdy neukáže na jiné zařízení.
- Změna modelu nebo typu kód nikdy nemění, protože kód už může být na štítku. Ručně ho upravit lze, prázdný ale být nemůže.

Prefixy jsou pevné:

| Typ | Prefix | Typ | Prefix |
|---|---|---|---|
| Switch | `SW` | Převodník médií | `MC` |
| Router | `RT` | UPS | `UPS` |
| Firewall | `FW` | PDU | `PDU` |
| Přístupový bod | `AP` | Kamera | `CAM` |
| Anténa | `ANT` | Telefon | `TEL` |
| Server | `SRV` | Tiskárna | `PRN` |
| Úložiště | `STO` | Pracovní stanice | `PC` |
| Patch panel | `PP` | Senzor | `SEN` |
| Optická vana | `ODF` | IoT zařízení | `IOT` |
| Síťová zásuvka | `NO` | Jiné | `X` |

## Údaje

| Pole | Význam |
|---|---|
| Název | Povinný. Jak se zařízení jmenuje v nimapu. |
| Fyzický štítek | Co je na zařízení skutečně napsané, pokud se liší od názvu. |
| Sériové a inventární číslo | Nepovinné. |
| Management IP | Jedna adresa IPv4 nebo IPv6, na které se zařízení spravuje. |
| Hostname | DNS jméno zařízení. Ukládá se malými písmeny. |
| Poznámky | Cokoli dalšího. |

Dvě zařízení mohou mít stejnou management IP, třeba za různými NATy nebo při výměně kusu. Formulář upozorní, že adresu už má jiné zařízení, ale uložit je dovolí.

## Seznam

Seznam ukazuje kód, název, typ, model, sériové a inventární číslo, stav a poslední změnu. Vyhledávání prochází kódy, názvy, štítky, modely, výrobce, sériová a inventární čísla, IP adresy a hostname. Filtrovat lze podle typu, výrobce a stavu. Filtry se drží v adrese, takže filtrovaný seznam jde uložit do záložek nebo poslat.

Ve výchozím stavu seznam ukazuje plánovaná a aktivní zařízení. Vyřazená a archivovaná přidáte filtrem stavu.

## Vyřazení a smazání

Když zařízení přestane sloužit, nastavte mu na detailu stav **Vyřazeno** nebo **Archivováno**. Zůstane v evidenci a jen zmizí z výchozího seznamu.

Mazání slouží jen k opravě chyb, třeba duplicity. Kód smazaného zařízení se znovu nepřidělí. Model zařízení nejde smazat, dokud ho nějaké zařízení používá.
