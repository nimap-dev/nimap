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

export const Route = createFileRoute('/_authenticated/_nav/admin/users/')({
  component: AllUsers,
})

const columnHelper = createColumnHelper<DataTableFeatures, User>()

export const columns = columnHelper.columns([
  columnHelper.accessor('username', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Username</DataTableColumnHeader>
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
      <DataTableColumnHeader column={column}>Email</DataTableColumnHeader>
    ),
    sortFn: 'text',
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue()}</span>
    ),
  }),
  columnHelper.accessor('role', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Role</DataTableColumnHeader>
    ),
    meta: { width: '8rem' },
    cell: ({ getValue }) => <RoleBadge role={asRole(getValue())} />,
  }),
  columnHelper.accessor('updated_at', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column}>Updated</DataTableColumnHeader>
    ),
    sortFn: 'datetime',
    sortDescFirst: true,
    meta: { width: '7.5rem' },
    cell: ({ getValue }) => (
      <span
        className="text-muted-foreground"
        title={formatAbsoluteDate(getValue())}
      >
        {formatRelativeDate(getValue())}
      </span>
    ),
  }),
])

function AllUsers() {
  const { data: users, isPending } = useListUsers()
  const navigate = useNavigate()

  if (isPending)
    return (
      <Panel title="Users">
        <TableSkeleton />
      </Panel>
    )

  if (!users || users.status != 200)
    return <Panel title="Users">Failed to load users</Panel>

  return (
    <Panel
      title="Users"
      action={
        <Button
          size="icon"
          aria-label="New user"
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
        searchPlaceholder="Search users…"
        onRowClick={(user) =>
          navigate({ to: '/admin/users/$userId', params: { userId: user.id } })
        }
      />
    </Panel>
  )
}
