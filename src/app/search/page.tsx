"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { VideoCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/core";

const SORT_IDS = ["relevance", "newest", "views"] as const;

function SearchInner() {
  const { t, tp } = useT();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "relevance";
  const [items, setItems] = useState<CardVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/videos?q=${encodeURIComponent(q)}&sort=${sort}&limit=18`);
      const j = await r.json();
      setItems(j.items ?? []);
      setTotal(j.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [q, sort]);

  useEffect(() => {
    load();
  }, [load]);

  // Qidiruv navbar'da — natija sahifasidagi ikkinchi search olib tashlangan
  const sortLabel = (id: string) =>
    id === "newest" ? t('search.sortNewest') : id === "views" ? t('search.sortViews') : t('search.sortRelevance');
  return (
    <div className="fade-up">
      <div className="flex flex-wrap items-center gap-2">
        {SORT_IDS.map((id) => (
          <Link
            key={id}
            href={`/search?q=${encodeURIComponent(q)}&sort=${id}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-medium transition",
              sort === id
                ? "bg-white text-black border-transparent"
                : "border-[rgb(var(--tint)/0.09)] text-(--tx3) hover:text-(--tx1) hover:bg-[rgb(var(--tint)/0.06)]"
            )}
          >
            {sortLabel(id)}
          </Link>
        ))}
        <span className="ml-auto text-[13px] text-(--tx4)">
          {loading ? t('search.searching') : q ? tp('search.results', total, { q }) : tp('search.resultsNoQ', total)}
        </span>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={SearchX} title={t('search.emptyTitle')} hint={t('search.emptyHint')} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}

export function ChannelRow({ c }: { c: { handle: string; name: string; avatarUrl?: string | null } }) {
  return (
    <Link href={`/channel/${c.handle}`} className="flex items-center gap-3">
      <Avatar src={c.avatarUrl} name={c.name} size={40} />
      <span className="font-medium">{c.name}</span>
    </Link>
  );
}
