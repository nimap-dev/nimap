---
title: Device models
description: A catalog of the products you use, shared by all devices of the same model.
sidebar:
  order: 3
---

A device model describes a product, such as a MikroTik CRS326-24G-2S+RM: what type of equipment it is, who makes it, how big it is and how it is powered. You enter it once, and every [device](../devices/) of that model takes these details from it.

Open **Device models** in the sidebar. Anyone who can sign in can view models. Creating, editing and deleting them needs the editor or administrator role.

## Details

| Section | Fields |
|---|---|
| Model | Manufacturer, name, variant and type. All but the variant are required. |
| Identification | Part number and a link to the product page. |
| Sale and support | The day the manufacturer stops selling the model (EOS) and stops supporting it (EOL). End of support cannot come before end of sale. |
| Physical | Width, height and depth in millimeters, mounting (rack, wall, desktop, DIN rail, ceiling, pole, embedded or other) and height in rack units. |
| Power | Maximum power draw in watts and Power over Ethernet. |
| Notes | Firmware quirks, accessories, where the manual lives. |

For Power over Ethernet, tick what the model can do:

- **Powered over Ethernet:** the model can run from a PoE port. Optionally say which standard it needs.
- **Supplies PoE:** the model can power other devices. Optionally give the highest standard it supplies and its total PoE budget in watts.

The standards are 802.3af (PoE), 802.3at (PoE+), 802.3bt (PoE++) and passive PoE.

The type decides the prefix of the codes that devices of this model get, such as `SW` for a switch. See [Devices](../devices/#codes).

### Variants

A manufacturer can sell different hardware under the same name, such as a second revision or a regional version. Put that difference in **Variant**, for example `rev2`. A manufacturer can have the same name and variant only once.

To add a variant of an existing model, open the model and use **Duplicate**. Everything is copied except the variant and the part number.

## The list

The list shows the type, model with its part number, manufacturer, form factor, PoE, status and last change. The search box matches names, variants, part numbers, manufacturers and types. Filter by type, manufacturer, mounting or status. The filters stay in the address, so you can bookmark or share a filtered list.

By default the list shows planned and active models. Use the status filter to include decommissioned and archived ones.

## The model's page

- **Overview** shows all the details. Sale and support dates that have already passed are marked.
- **Devices** lists every device of this model, in any status.
- **Files** holds datasheets, manuals and photos: PDF documents up to 100 MB and JPEG, PNG, GIF or WebP images up to 25 MB.

## Retiring and deleting

When a model is no longer sold or used, set its status to **Decommissioned** or **Archived**. It stays on record, and devices of it keep pointing at it.

Delete a model only to fix a mistake, such as a duplicate. It cannot be deleted while any device uses it. Its attached files are detached when it is deleted.
