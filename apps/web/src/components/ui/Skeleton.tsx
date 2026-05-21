import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-pill" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}
