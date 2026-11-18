---
title: Modely zařízení
description: Katalog produktů, které používáte, společný pro všechna zařízení stejného modelu.
sidebar:
  order: 3
---

Model zařízení popisuje produkt, třeba MikroTik CRS326-24G-2S+RM: o jaký typ vybavení jde, kdo ho vyrábí, jak je velký a jak se napájí. Zadáte ho jednou a každé [zařízení](../devices/) tohoto modelu si údaje bere z něj.

Seznam otevřete v postranním panelu pod **Modely zařízení**. Modely vidí každý přihlášený uživatel. Vytvářet, upravovat a mazat je může editor nebo správce.

## Údaje

| Sekce | Pole |
|---|---|
| Model | Výrobce, název, varianta, zobrazovaný název a typ. Varianta a zobrazovaný název jsou nepovinné. |
| Identifikace | Katalogové číslo a odkaz na stránku produktu. |
| Prodej a podpora | Den, kdy výrobce model přestane prodávat (EOS) a podporovat (EOL). Konec podpory nemůže být dřív než konec prodeje. |
| Fyzické parametry | Šířka, výška a hloubka v milimetrech, montáž (rack, na zeď, na stůl, DIN lišta, na strop, na sloup, vestavěné nebo jiné) a výška v U. |
| Napájení | Maximální příkon ve wattech a napájení přes Ethernet (PoE). |
| Poznámky | Zvláštnosti firmwaru, příslušenství, kde je manuál. |

U PoE zaškrtněte, co model umí:

- **Napájení přes Ethernet:** model lze napájet z PoE portu. Volitelně uveďte, jaký standard potřebuje.
- **Poskytuje PoE:** model umí napájet další zařízení. Volitelně uveďte nejvyšší poskytovaný standard a celkový PoE rozpočet ve wattech.

Standardy jsou 802.3af (PoE), 802.3at (PoE+), 802.3bt (PoE++) a pasivní PoE.

Typ určuje prefix kódů, které dostanou zařízení tohoto modelu, třeba `SW` u switche. Viz [Zařízení](../devices/#kódy).

### Zobrazovaný název

Některé názvy modelů se špatně čtou, třeba `C52iG-5HaxD2HaxD-TC`. Vyplňte modelu **Zobrazovaný název**, třeba `hAP ax²`, a všude se zobrazí místo názvu. Původní název zůstane na stránce modelu a v seznamu pod zobrazovaným názvem.

### Varianty

Výrobce může pod stejným názvem prodávat různý hardware, třeba druhou revizi nebo regionální verzi. Rozdíl zapište do pole **Varianta**, třeba `rev2`. Stejný název a varianta mohou u jednoho výrobce existovat jen jednou.

Variantu existujícího modelu přidáte tak, že model otevřete a použijete **Duplikovat**. Zkopíruje se vše kromě varianty a katalogového čísla.

## Seznam

Seznam ukazuje typ, model s katalogovým číslem, výrobce, provedení, PoE, stav a poslední změnu. Vyhledávání prochází názvy, zobrazované názvy, varianty, katalogová čísla, výrobce a typy. Filtrovat lze podle typu, výrobce, montáže a stavu. Filtry se drží v adrese, takže filtrovaný seznam jde uložit do záložek nebo poslat.

Ve výchozím stavu seznam ukazuje plánované a aktivní modely. Vyřazené a archivované přidáte filtrem stavu.

## Stránka modelu

- **Přehled** ukazuje všechny údaje. Data prodeje a podpory, která už nastala, jsou označená.
- **Zařízení** ukazuje všechna zařízení tohoto modelu v jakémkoli stavu.
- **Soubory** drží datasheety, manuály a fotky: dokumenty PDF do 100 MB a obrázky JPEG, PNG, GIF nebo WebP do 25 MB.

## Vyřazení a smazání

Když se model už neprodává nebo nepoužívá, nastavte mu stav **Vyřazeno** nebo **Archivováno**. Zůstane v evidenci a zařízení na něj dál odkazují.

Model mažte jen při opravě chyby, třeba duplicity. Smazat nejde, dokud ho používá nějaké zařízení. Přiložené soubory se při smazání odpojí.
