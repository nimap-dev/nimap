import { cn } from '#/lib/utils'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import type { ComponentProps, ReactNode } from 'react'

export function RecordTabs({
  className,
  ...props
}: ComponentProps<typeof Tabs>) {
  return <Tabs className={cn('h-full min-h-0 gap-0', className)} {...props} />
}

export function RecordTabsList({ children }: { children: ReactNode }) {
  return (
    <TabsList variant="line" className="h-10">
      {children}
    </TabsList>
  )
}

export function RecordTab({
  value,
  count,
  children,
}: {
  value: string
  count?: number
  children: ReactNode
}) {
  return (
    <TabsTrigger value={value} className="flex-none px-2">
      {children}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
