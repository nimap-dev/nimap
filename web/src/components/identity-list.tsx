import type { Identity, User } from '#/api/model'
import { Detail, DetailEmpty, DetailList } from '#/components/detail-list'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** An issuer short enough for a row: its host and path, no scheme. */
function issuerLabel(issuer: string) {
  try {
    const url = new URL(issuer)
    return (url.host + url.pathname).replace(/\/$/, '')
  } catch {
    return issuer
  }
}

function When({ value }: { value: string }) {
  return (
    <span title={formatAbsoluteDate(value)}>{formatRelativeDate(value)}</span>
  )
}

export function IdentityList({
  identities,
  hideEmpty = false,
  action,
  className,
}: {
  identities: Identity[]
  hideEmpty?: boolean
  action?: (identity: Identity) => ReactNode
  className?: string
}) {
  const { t } = useTranslation()

  if (identities.length === 0) {
    if (hideEmpty) return null

    return (
      <DetailList title={t('identities.title')} className={className}>
        <Detail label={t('identities.provider')}>
          <DetailEmpty>{t('identities.none')}</DetailEmpty>
        </Detail>
      </DetailList>
    )
  }

  return (
    <div className={cn('grid content-start gap-3', className)}>
      {identities.map((identity, index) => (
        <DetailList
          key={identity.id}
          title={index === 0 ? t('identities.title') : undefined}
        >
          <Detail label={t('identities.provider')} title={identity.issuer}>
            {issuerLabel(identity.issuer)}
          </Detail>
          <Detail label={t('identities.email')}>
            {identity.email ?? (
              <DetailEmpty>{t('identities.noEmail')}</DetailEmpty>
            )}
          </Detail>
          <Detail label={t('identities.linkedAt')}>
            <When value={identity.linkedAt} />
          </Detail>
          <Detail label={t('identities.lastLoginAt')}>
            <When value={identity.lastLoginAt} />
          </Detail>
          {action && (
            <div className="flex justify-end px-3 py-2">{action(identity)}</div>
          )}
        </DetailList>
      ))}
    </div>
  )
}

const badgeClass =
  'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium'

/** How a user can log in, as small badges for a table cell. */
export function SignInBadges({ user }: { user: User }) {
  const { t } = useTranslation()

  return (
    <span className="flex flex-wrap gap-1">
      {user.hasPassword && (
        <span className={cn(badgeClass, 'bg-muted text-muted-foreground')}>
          {t('identities.password')}
        </span>
      )}
      {user.identities.length > 0 && (
        <span
          className={cn(
            badgeClass,
            'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
          )}
          title={user.identities.map((i) => issuerLabel(i.issuer)).join(', ')}
        >
          {t('identities.sso')}
        </span>
      )}
    </span>
  )
}
