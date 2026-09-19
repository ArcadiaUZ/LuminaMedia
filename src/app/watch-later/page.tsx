"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { VideoCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { useT } from "@/i18n/core";

export default function WatchLaterPage() {
  const { t } = useT();
  const [items, setItems] = useState<CardVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/me/watch-later")
      .then((r) => r.json())
      .then((j) => setItems(j.watchLater ?? []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="fade-up">
      <h1 className="text-[22px] font-bold tracking-tight">{t('wlater.title')}</h1>
      <p className="text-sm text-(--tx3)">{t('wlater.sub')}</p>
      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={Clock} title={t('wlater.emptyTitle')} hint={t('wlater.emptyHint')} action={<Link href="/" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">{t('wlater.browse')}</Link>} />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}