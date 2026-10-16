'use client'

import { useTable } from '@tanstack/react-table'
import type {
  ColumnDef,
  RowData,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { DEFAULT_MIN_COLUMN_WIDTH, features } from './data-table-features'
import type { DataTableFeatures } from './data-table-features'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  /**
   * Called when a row is clicked anywhere outside an interactive element.
   * Rows that use this should still render a real link in one of their cells
   * so the destination stays reachable by keyboard and openable in a new tab.
   */
  onRowClick?: (row: TData) => void
  /** Column id the search field filters on. Omit to hide the search field. */
  searchColumn?: string
  searchPlaceholder?: string
  search?: {
    value: string
    onChange: (value: string) => void
  }
  /** Rendered at the end of the toolbar row, e.g. a "new item" button. */
  actions?: React.ReactNode
  /**
   * Set while the list is narrowed by anything beyond the search box (a
   * status, a type), so the footer can say so and offer the way back.
   */
  onClearFilters?: () => void
  className?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  onRowClick,
  searchColumn,
  searchPlaceholder,
  search: controlledSearch,
  actions,
  onClearFilters,
  className,
}: DataTableProps<TData>) {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  const minTableWidth = `calc(${table
    .getVisibleLeafColumns()
    .map(
      ({ columnDef: { meta } }) =>
        meta?.width ?? meta?.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH,
    )
    .join(' + ')})`

  const column = searchColumn ? table.getColumn(searchColumn) : undefined
  const search =
    controlledSearch ??
    (column && {
      value: (column.getFilterValue() as string) || '',
      onChange: (value: string) => column.setFilterValue(value),
    })

  const shown = table.getRowModel().rows.length
  const clearFilters = onClearFilters && (
    <button
      type="button"
      onClick={onClearFilters}
      className="underline-offset-2 hover:text-foreground hover:underline"
    >
      {t('table.clearFilters')}
    </button>
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {(search || actions) && (
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <Input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={searchPlaceholder ?? t('table.search')}
              aria-label={searchPlaceholder ?? t('table.search')}
              className="min-w-48 flex-1"
            />
          )}
          {actions}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table className="table-fixed" style={{ minWidth: minTableWidth }}>
          <TableHeader className="bg-muted/40 text-xs text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={header.column.columnDef.meta?.className}
                      style={{ width: header.column.columnDef.meta?.width }}
                      aria-sort={
                        header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : header.column.getIsSorted() === 'desc'
                            ? 'descending'
                            : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={
                    onRowClick &&
                    ((event) => {
                      // Links and buttons inside the row handle their own clicks.
                      if (
                        (event.target as HTMLElement).closest(
                          "a, button, input, select, [role='button']",
                        )
                      ) {
                        return
                      }
                      onRowClick(row.original)
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.columnDef.meta?.className}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 px-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {shown < data.length
            ? t('table.shown', { count: shown, total: data.length })
            : t('results', { count: data.length })}
        </span>
        {clearFilters && (
          <>
            <span aria-hidden="true">·</span>
            {clearFilters}
          </>
        )}
      </p>
    </div>
  )
}
