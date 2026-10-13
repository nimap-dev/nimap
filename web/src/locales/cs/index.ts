import type { Translation } from '#/lib/i18n'
import type en from '../en'
import common from './common'
import nav from './nav'
import account from './account'
import admin from './admin'

export default {
  common,
  nav,
  account,
  admin,
} satisfies Translation<typeof en>
