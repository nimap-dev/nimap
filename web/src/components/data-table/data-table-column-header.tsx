import { type Column, type RowData } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { type DataTableFeatures } from "./data-table-features"

interface DataTableColumnHeaderProps<TData extends RowData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<DataTableFeatures, TData, TValue>
  children: React.ReactNode
}

export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  children,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{children}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 data-[sorted=true]:text-foreground"
        data-sorted={!!sorted}
        aria-label={`Sort by ${column.id}`}
        onClick={column.getToggleSortingHandler()}
      >
        <span>{children}</span>
        {sorted === "desc" ? (
          <ArrowDown />
        ) : sorted === "asc" ? (
          <ArrowUp />
        ) : (
          <ChevronsUpDown className="opacity-50" />
        )}
      </Button>
    </div>
  )
}
