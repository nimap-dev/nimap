import { SignInBadges } from '#/components/identity-list'
import { useListUsers } from '#/api/admin/admin'
import type { User } from '#/api/model'
import { DataTable } from '#/components/data-table/data-table'
import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import type { DataTableFeatures } from '#/components/data-table/data-table-features'
import { TableSkeleton } from '#/components/data-table/table-skeleton'
import { Panel } from '#/components/panel'
import { RoleBadge } from '#/components/role-badge'
import { Button } from '#/components/ui/button'
import { formatAbsoluteDate, formatRelativeDate } from '#/lib/format-date'
import { asRole } from '#/lib/roles'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/_nav/admin/users/')({
  component: AllUsers,
})

const columnHelper = createColumnHelper<DataTableFeatures, User>()

// Built in a hook so the headers follow the interface language.
function useColumns() {
  const { t } = useTranslation(['admin', 'common'])

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('username', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.username')}
            </DataTableColumnHeader>
          ),
          filterFn: (row, _columnId, filterValue) => {
            const needle = String(filterValue).toLowerCase()

            return (
              row.original.username.toLowerCase().includes(needle) ||
              row.original.email.toLowerCase().includes(needle)
            )
          },
          cell: ({ row, getValue }) => (
            <Link
              to="/admin/users/$userId"
              params={{ userId: row.original.id }}
              className="block truncate font-medium hover:underline"
            >
              {getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor('email', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.email')}
            </DataTableColumnHeader>
          ),
          sortFn: 'text',
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue()}</span>
          ),
        }),
        columnHelper.accessor('role', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('common:roles.label')}
            </DataTableColumnHeader>
          ),
          meta: { width: '8rem' },
          cell: ({ getValue }) => <RoleBadge role={asRole(getValue())} />,
        }),
        columnHelper.display({
          id: 'signIn',
          header: () => t('common:identities.signIn'),
          meta: { width: '8rem' },
          cell: ({ row }) => <SignInBadges user={row.original} />,
        }),
        columnHelper.accessor('updatedAt', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column}>
              {t('fields.updated')}
            </DataTableColumnHeader>
          ),
          sortFn: 'datetime',
          sortDescFirst: true,
          meta: { width: '9rem' },
          cell: ({ getValue }) => (
            <span
              className="text-muted-foreground"
              title={formatAbsoluteDate(getValue())}
            >
              {formatRelativeDate(getValue())}
            </span>
          ),
        }),
      ]),
    [t],
  )
}

function AllUsers() {
  const { data: users, isPending } = useListUsers()
  const navigate = useNavigate()
  const { t } = useTranslation('admin')
  const columns = useColumns()

  if (isPending)
    return (
      <Panel title={t('users.title')}>
        <TableSkeleton />
      </Panel>
    )

  if (!users || users.status != 200)
    return <Panel title={t('users.title')}>{t('users.loadFailed')}</Panel>

  return (
    <Panel
      title={t('users.title')}
      action={
        <Button
          size="icon"
          aria-label={t('newUser.title')}
          render={<Link to="/admin/users/new" />}
          nativeButton={false}
        >
          <Plus />
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={users.data}
        searchColumn="username"
        searchPlaceholder={t('users.search')}
        onRowClick={(user) =>
          navigate({ to: '/admin/users/$userId', params: { userId: user.id } })
        }
      />
    </Panel>
  )
}
