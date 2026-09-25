import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton-shimmer rounded-2xl", className)} style={style} aria-hidden />;
}

export function VideoCardSkeleton() {
  return (
    <div className="glass-min overflow-hidden rounded-2xl">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex gap-3 p-3.5">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 py-0.5">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChipsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-9 shrink-0 rounded-full" style={{ width: 64 + ((i * 37) % 48) }} />
      ))}
    </div>
  );
}

export function ChannelRowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-4 flex gap-4 overflow-hidden pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// Har sahifa o'z layout'iga mos skeleton ko'rsatadi
export function HomePageSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-hidden>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-4">
        <ChipsSkeleton />
      </div>
      <VideoGridSkeleton count={count} />
    </div>
  );
}

export function ExplorePageSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-hidden>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <ChipsSkeleton />
        </div>
        <Skeleton className="h-10 w-40 shrink-0 rounded-full" />
      </div>
      <VideoGridSkeleton count={count} />
    </div>
  );
}

export function SubscriptionsPageSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-hidden>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-4 w-60" />
      <ChannelRowSkeleton />
      <VideoGridSkeleton count={count} />
    </div>
  );
}
export function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}
