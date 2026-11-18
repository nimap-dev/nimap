---
title: User guide
description: How to work with locations, buildings and devices in nimap.
sidebar:
  label: Overview
  order: 1
---

nimap keeps track of where your network is and what it is made of. Everything you record has a lifecycle status, so you can retire things instead of deleting them.

## Devices

The device inventory builds up from general to specific:

1. [Manufacturers](../manufacturers/): the companies whose products you use.
2. [Device models](../device-models/): the products, with their type, size, power and PoE.
3. [Devices](../devices/): the individual pieces of equipment, each with a short code such as `SW-001`.

Start with the manufacturer, then add the model, then the devices. A device that is not worth cataloguing can skip the model and name only its type.

## Map, locations and buildings

The map shows your locations and buildings. You can draw their outlines, search them, and attach files to them. This part of the guide is still being written.

## Roles

What you can do depends on your role:

| Role | Can |
|---|---|
| Viewer | view everything |
| Editor | also create, edit and delete records |
| Administrator | also manage users |

Your own name, password, language, theme, time zone and date format are under your account in the user menu. That is also where you create [API keys](../api-keys/) for scripts and other tools.
