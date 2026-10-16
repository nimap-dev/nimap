import { Skeleton } from '#/components/ui/skeleton'

/**
 * Stand-in for a table that has not loaded yet, in the shape the table will
 * take: the toolbar, the card, a header and a few rows, so nothing jumps when
 * the data arrives.
 */
export function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-full max-w-sm" />
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="h-10 border-b bg-muted/40" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="flex gap-4 border-b px-2 py-3 last:border-0"
            key={index}
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
