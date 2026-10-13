import type { Translation } from '#/lib/i18n'
import type en from '../en'
import common from './common'
import nav from './nav'

export default {
  common,
  nav,
} satisfies Translation<typeof en>
