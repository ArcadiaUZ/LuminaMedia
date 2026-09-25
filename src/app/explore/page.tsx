"use client";
import { useCallback, useEffect, useState } from "react";
import { useIsoLayoutEffect } from "@/lib/iso-layout";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { ExplorePageSkeleton } from "@/components/ui/Skeleton";
import { Chips } from "@/components/ui/Tabs";
import { GlassSelect } from "@/components/ui/Select";
import { CATEGORIES } from "@/lib/constants";
import { feedKey, getFeed, setFeed } from "@/lib/feed-cache";
import { useT } from "@/i18n/core";

const keyFor = (c: string, s: string) => feedKey("explore", c, s);

export default function ExplorePage() {
  const { t } = useT();
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("views");
  const [items, setItems] = useState<CardVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // Mount'da keshni paint'dan oldin tiklash — skeleton miltillamaydi
  useIsoLayoutEffect(() => {
    const cached = getFeed(keyFor("All", "views"));
    if (cached) {
      setItems(cached.items as CardVideo[]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const key = keyFor(cat, sort);
    // Kesh bo'lsa — eski ro'yxat ekranda qoladi, orqa fonda yangilanadi (miltillash yo'q)
    const cached = getFeed(key);
    if (cached) {
      setItems(cached.items as CardVideo[]);
    } else {
      setLoading(true);
    }
    (async () => {
      try {
        const timer = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch(
          `/api/videos?category=${encodeURIComponent(cat)}&sort=${sort}&limit=20`,
          { signal: ctrl.signal }
        );
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (ctrl.signal.aborted) return;
        setItems(j.items ?? []);
        setFeed(key, j.items ?? []);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          console.error("Explore load failed:", e);
          // Kesh ko'rinib turgan bo'lsa bo'shatib yubormaymiz
          if (!cached) setItems([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [cat, sort]);

  const refreshing = loading && items.length > 0;

  // Sichqoncha kategoriya ustiga borganda oldindan keshlash —
  // bosilganda ro'yxat darhol (miltillashsiz) almashadi
  const prefetch = useCallback(
    (c: string) => {
      const key = keyFor(c, sort);
      if (getFeed(key)) return;
      fetch(`/api/videos?category=${encodeURIComponent(c)}&sort=${sort}&limit=20`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j) setFeed(key, j.items ?? []);
        })
        .catch(() => {});
    },
    [sort]
  );

  return (
    <div className="fade-up">
      <h1 className="text-[22px] font-bold tracking-tight">{t('explore.title')}</h1>
      <p className="text-sm text-(--tx3)">{t('explore.sub')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <Chips items={CATEGORIES} active={cat} onChange={setCat} onPrefetch={prefetch} />
        </div>
        <GlassSelect
          label={t('explore.sortLabel')}
          variant="pill"
          value={sort}
          onChange={setSort}
          options={[
            { value: "views", label: t('explore.sortViews') },
            { value: "newest", label: t('explore.sortNewest') },
          ]}
          className="w-40 shrink-0"
        />
      </div>
      {loading && items.length === 0 ? (
        <ExplorePageSkeleton />
      ) : items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-(--tx3)">
          {t('explore.empty')}
        </p>
      ) : (
        <div
          className={`mt-5 grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${refreshing ? "opacity-60" : "opacity-100"}`}
        >
          {items.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}
