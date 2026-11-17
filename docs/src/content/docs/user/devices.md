---
title: Devices
description: Keep a list of your devices, each with a model or type and a short code such as SW-001.
sidebar:
  order: 4
---

A device is one physical piece of equipment: a switch in a rack, an access point on a ceiling, a UPS in a closet. Device models describe a product. A device is a particular unit of it, with its own serial number and code.

Open **Devices** in the sidebar to see the list. Anyone who can sign in can view devices. Creating, editing and deleting them needs the editor or administrator role.

## Model or type

Every device is either:

- **a catalogued model.** The device takes its type and manufacturer from the model. Add the model under **Device models** first if it is not listed.
- **just a type.** Use this for equipment you do not want to catalogue, such as a cheap media converter. The device then has no manufacturer.

You can switch between the two later. The device's code stays the same.

## Codes

Each device gets a short code made of its type's prefix and a number, such as `SW-001` or `AP-014`. After `999` the number simply grows: `SW-1000`.

When you create a device, leave **Code** empty and the next free code is assigned on save. The field shows that code as a hint. You can also type your own code, for example to match a label that is already on the device:

- A code is unique regardless of case: `sw-001` and `SW-001` are the same code.
- A code you type does not move the numbering. Automatic numbering skips any code already in use.
- Numbers are never reused. Deleting `SW-003` does not make it available again, so an old label cannot end up pointing at a different device.
- Changing the device's model or type never changes its code, because the code may already be printed on a label. You can still edit the code by hand. It cannot be empty.

The prefixes are fixed:

| Type | Prefix | Type | Prefix |
|---|---|---|---|
| Switch | `SW` | Media converter | `MC` |
| Router | `RT` | UPS | `UPS` |
| Firewall | `FW` | PDU | `PDU` |
| Access point | `AP` | Camera | `CAM` |
| Antenna | `ANT` | Phone | `TEL` |
| Server | `SRV` | Printer | `PRN` |
| Storage | `STO` | Workstation | `PC` |
| Patch panel | `PP` | Sensor | `SEN` |
| ODF | `ODF` | IoT device | `IOT` |
| Network outlet | `NO` | Other | `X` |

## Details

| Field | Meaning |
|---|---|
| Name | Required. What the device is called in nimap. |
| Physical label | What is actually written on the device, if it differs from the name. |
| Serial number, inventory number | Optional. |
| Management IP | One IPv4 or IPv6 address the device is managed on. |
| Hostname | The device's DNS name. It is stored in lowercase. |
| Notes | Anything else worth knowing. |

Two devices can have the same management IP, for example behind different NATs or while one replaces the other. The form warns you when another device already uses the address, but lets you save.

## The list

The list shows the code, name, type, model, serial and inventory numbers, status and last change. The search box matches codes, names, labels, models, manufacturers, serial and inventory numbers, IP addresses and hostnames. Filter by type, manufacturer or status. The filters stay in the address, so you can bookmark or share a filtered list.

By default the list shows planned and active devices. Use the status filter to include decommissioned and archived ones.

## Retiring and deleting

When a device leaves service, set its status to **Decommissioned** or **Archived** on its detail page. It stays on record and only drops out of the default list.

Delete a device only to fix a mistake, such as a duplicate. Its code is not handed out again. A device model cannot be deleted while any device uses it.
