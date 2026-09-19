import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-2xl", className)} aria-hidden />;
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
