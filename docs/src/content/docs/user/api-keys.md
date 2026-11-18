---
title: API keys
description: Let scripts and other tools call the nimap API as you.
sidebar:
  order: 5
---

An API key lets a script or another tool call the nimap API without logging in. A key belongs to one user and acts exactly as that user: it has the same role, so it can read and change what the user can read and change in the web interface.

## Create a key

1. Open your account from the user menu.
2. Under **API keys**, give the key a name that says what uses it, such as `Ansible`.
3. Pick when it expires, or leave it at **Never**.
4. Select **Create key**.

The whole key is shown only once, right after you create it. Copy it then and store it somewhere safe, such as a password manager or your tool's secret store. nimap keeps only a hash of the key and cannot show it again. If you lose it, revoke it and create a new one.

## Use a key

Send the key in the `Authorization` header of every request:

```sh
curl -H "Authorization: Bearer nimap_…" https://nimap.example.com/api/devices
```

A request with a key that is unknown, revoked or expired is refused with `401`, even if the same browser is logged in.

## What a key cannot do

To keep a leaked key from taking over the account, some things need you to be logged in to the web interface and are refused with `403` when called with a key:

- creating, listing and revoking API keys,
- changing your password,
- changing your username or email,
- managing users, even with an administrator's key.

## Role changes and revoking

A key always has the user's current role. When an administrator changes your role, your keys get the new role straight away. When your account is deleted, its keys stop working.

To revoke a key, open your account and select **Revoke** next to it. Anything still using the key stops working right away. The list also shows when each key was last used, so you can spot keys nothing uses anymore.
